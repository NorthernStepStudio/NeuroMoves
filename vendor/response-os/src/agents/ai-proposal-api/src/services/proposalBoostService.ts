import {
  GeminiProvider,
  OffProvider,
  ProposalAgent,
  type CpeProposalJson,
  type ProposalAgentInput,
  type ProposalMode,
  type ProposalRefinementType
} from "../../../../../dist/index.js";

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const extractProposalJson = (output: { data?: Record<string, unknown> }): CpeProposalJson | null => {
  if (!output.data || !("proposal_json" in output.data)) {
    return null;
  }
  const value = output.data.proposal_json;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as CpeProposalJson;
};

const inferGoalFromProposal = (proposal: unknown, fallback: string): string => {
  if (!isObject(proposal)) return fallback;
  const project = isObject(proposal.project) ? proposal.project : undefined;
  if (project && typeof project.jobType === "string" && project.jobType.trim()) {
    return project.jobType.trim();
  }
  if (project && typeof project.title === "string" && project.title.trim()) {
    return project.title.trim();
  }
  return fallback;
};

const createLocalBoostAgent = (): ProposalAgent => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();

  if (!apiKey) {
    return new ProposalAgent({
      appId: "nss-cpe-local-boost"
    });
  }

  return new ProposalAgent({
    appId: "nss-cpe-local-boost",
    provider: new GeminiProvider({
      apiKey,
      ...(model ? { model } : {})
    }),
    fallbackProvider: new OffProvider()
  });
};

export interface BoostPayloadInput {
  proposal: unknown;
  intake?: unknown;
  refinementType?: ProposalRefinementType;
  targetLanguage?: "en" | "es" | "it";
}

export const runBoostModeLocally = async (
  mode: ProposalMode,
  payload: BoostPayloadInput
) => {
  const agent = createLocalBoostAgent();
  const input: ProposalAgentInput = {
    goal: inferGoalFromProposal(payload.proposal, "Contractor proposal boost"),
    mode,
    draftProposal: payload.proposal as CpeProposalJson,
    refinementType: payload.refinementType,
    targetLanguage: payload.targetLanguage,
    intake: payload.intake as ProposalAgentInput["intake"]
  };
  return agent.propose(input);
};
