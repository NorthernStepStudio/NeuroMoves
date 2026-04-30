import {
  ProposalData,
  ProposalIntel,
  SupportedLanguage
} from "../types/proposal";
import {
  buildResponseOsRequest,
  mapCpeProposalJsonToProposalData,
  isResponseOsAgentOutput,
  mapResponseOsProposalToProposalData,
  type ProposalDataMappingSource,
  type ResponseOsBridgeInput
} from "./responseos";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
const DEFAULT_API_TIMEOUT_MS = (() => {
  const raw = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 2500);
  return Number.isFinite(raw) && raw > 0 ? raw : 2500;
})();

const isLocalHttpApiOnSecurePage = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const isSecurePage = window.location.protocol === "https:";
  const normalizedBase = API_BASE_URL.toLowerCase();
  const isLocalHttpApi =
    normalizedBase.startsWith("http://localhost") ||
    normalizedBase.startsWith("http://127.0.0.1");
  return isSecurePage && isLocalHttpApi;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error
        : "Request failed.";
    throw new Error(error || "Request failed.");
  }

  return payload as T;
};

export const fetchRemoteConfig = async (): Promise<{
  features: Record<string, boolean>;
  maxUploadImages: number;
  supportedLanguages: SupportedLanguage[];
  themeModes: Array<"system" | "light" | "dark">;
}> => {
  if (isLocalHttpApiOnSecurePage()) {
    return {
      features: {},
      maxUploadImages: 3,
      supportedLanguages: ["en", "es", "it"],
      themeModes: ["system", "light", "dark"]
    };
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/config`, undefined, 6000);
  return handleResponse(response);
};

export const fetchPublicIntelFromApi = async (
  locationQuery: string,
  timelineDays: number,
  language: SupportedLanguage
): Promise<ProposalIntel> => {
  if (isLocalHttpApiOnSecurePage()) {
    throw new Error(
      "Skipped intel fetch: secure page cannot call local HTTP API endpoint."
    );
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/intel/fetch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      locationQuery,
      timelineDays,
      language
    })
  });

  return handleResponse<ProposalIntel>(response);
};

export interface GenerateProposalInput extends ResponseOsBridgeInput {}
export type ProposalBoostRefinement =
  | "clarity"
  | "persuasion"
  | "executive_summary"
  | "scope_tightening"
  | "missing_info";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProposalData = (value: unknown): value is ProposalData => {
  if (!isObject(value)) {
    return false;
  }
  const quote = value.quote;
  const metadata = value.metadata;
  return (
    isObject(quote) &&
    Array.isArray(quote.items) &&
    typeof quote.total === "number" &&
    isObject(metadata) &&
    typeof metadata.projectTitle === "string"
  );
};

const normalizeGenerateProposalResponse = (
  payload: unknown,
  input: GenerateProposalInput
): ProposalData => {
  if (isProposalData(payload)) {
    return payload;
  }

  if (isObject(payload) && isProposalData(payload.proposal)) {
    return payload.proposal;
  }

  if (isResponseOsAgentOutput(payload)) {
    return mapResponseOsProposalToProposalData(payload, input);
  }

  if (isObject(payload) && isResponseOsAgentOutput(payload.output)) {
    return mapResponseOsProposalToProposalData(payload.output, input);
  }

  throw new Error("Proposal response did not match an expected output shape.");
};

export const generateProposalViaApi = async (
  input: GenerateProposalInput
): Promise<ProposalData> => {
  if (isLocalHttpApiOnSecurePage()) {
    throw new Error(
      "Skipped API generation: secure page cannot call local HTTP API endpoint."
    );
  }

  const form = new FormData();

  form.append(
    "payload",
    JSON.stringify({
      description: input.description,
      contractor: input.contractor,
      client: input.client,
      settings: input.settings,
      intel: input.intel,
      language: input.language,
      entitlementState: input.entitlementState,
      historySignals: input.historySignals,
      responseOs: buildResponseOsRequest(input, { preferAi: true })
    })
  );

  input.photos.slice(0, 3).forEach((photo) => {
    form.append("images", photo, photo.name);
  });

  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/proposals/generate`, {
    method: "POST",
    body: form
  });

  const payload = await handleResponse<unknown>(response);
  return normalizeGenerateProposalResponse(payload, input);
};

const toBoostProposalPayload = (proposal: ProposalData) => {
  const tradeProfile = /hvac/i.test(proposal.metadata.projectType)
    ? "hvac"
    : /plumb/i.test(proposal.metadata.projectType)
    ? "plumbing"
    : /electrical|panel|wiring/i.test(proposal.metadata.projectType)
    ? "electrical"
    : "renovation";

  return {
    meta: {
      tradeProfile,
      schemaVersion: "1.0.0",
      language: proposal.language,
      currency: "USD",
      generatedAt: proposal.metadata.generatedAt,
      version: 1,
      sourceMode: "offline_generate"
    },
    client: {
      name: proposal.client.name,
      email: proposal.client.email,
      phone: proposal.client.phone,
      address: proposal.client.address
    },
    project: {
      title: proposal.metadata.projectTitle,
      jobType: proposal.metadata.projectType,
      summary: proposal.contract
    },
    sections: [
      {
        id: "scope",
        title: "Scope",
        items: proposal.inclusions
      }
    ],
    line_items: proposal.quote.items.map((item, index) => ({
      id: `line_${index + 1}`,
      description: item.description,
      qty: 1,
      unit: "lot",
      unit_cost: item.amount,
      total: item.amount
    })),
    allowances: [],
    exclusions: proposal.exclusions,
    assumptions: proposal.assumptions,
    timeline: {
      summary: `${proposal.metadata.timelineDays} day(s) estimated`,
      phases: []
    },
    payment_schedule: proposal.paymentSchedule.map((phase) => ({
      label: phase.description,
      percentage: phase.percentage,
      amount: phase.amount
    })),
    warranty_terms: proposal.terms,
    signature_block: {
      contractor_label: "Contractor Signature",
      client_label: "Client Signature",
      date_label: "Date"
    },
    warnings: proposal.notesToClient
  };
};

const mapBoostResultToProposalData = (
  payload: unknown,
  source: ProposalData
): ProposalData => {
  if (!isObject(payload) || !("proposal" in payload) || !isObject(payload.proposal)) {
    throw new Error("Boost response is missing proposal payload.");
  }

  return mapCpeProposalJsonToProposalData(payload.proposal as unknown as Parameters<typeof mapCpeProposalJsonToProposalData>[0], {
    contractor: source.contractor,
    client: source.client,
    settings: source.settings,
    intel: source.intel,
    language: source.language,
    photoCount: source.metadata.photoCount,
    estimatedAreaHint: source.metadata.estimatedArea,
    historySignals: source.historySignals
  } satisfies ProposalDataMappingSource);
};

export const refineProposalViaApi = async (
  proposal: ProposalData,
  refinementType: ProposalBoostRefinement = "clarity"
): Promise<ProposalData> => {
  if (isLocalHttpApiOnSecurePage()) {
    throw new Error(
      "Skipped AI refine: secure page cannot call local HTTP API endpoint."
    );
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/ai/refine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      proposal: toBoostProposalPayload(proposal),
      refinementType
    })
  });

  const payload = await handleResponse<unknown>(response);
  return mapBoostResultToProposalData(payload, proposal);
};

export const translateProposalViaApi = async (
  proposal: ProposalData,
  targetLanguage: "en" | "es" | "it"
): Promise<ProposalData> => {
  if (isLocalHttpApiOnSecurePage()) {
    throw new Error(
      "Skipped AI translate: secure page cannot call local HTTP API endpoint."
    );
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/ai/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      proposal: toBoostProposalPayload(proposal),
      targetLanguage
    })
  });

  const payload = await handleResponse<unknown>(response);
  return mapBoostResultToProposalData(payload, proposal);
};

export const qaProposalViaApi = async (
  proposal: ProposalData
): Promise<{ proposal: ProposalData; qa: unknown }> => {
  if (isLocalHttpApiOnSecurePage()) {
    throw new Error(
      "Skipped AI QA: secure page cannot call local HTTP API endpoint."
    );
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/v1/ai/qa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      proposal: toBoostProposalPayload(proposal)
    })
  });

  const payload = await handleResponse<unknown>(response);
  const updated = mapBoostResultToProposalData(payload, proposal);
  const qa = isObject(payload) && "qa" in payload ? payload.qa : null;
  return {
    proposal: updated,
    qa
  };
};
