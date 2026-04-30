import { buildPaymentSchedule, estimateTimelineDays, roundCurrency } from "@nss/proposal-core";
import { ProposalAgent } from "../../../../../dist/index.js";
import type {
  ProposalAgentInput,
  CpeProposalJson,
  ProposalDocument,
  ProposalIntake,
  ProposalMode,
  ProposalTone,
  ProposalTrade
} from "../../../../../dist/index.js";
import type {
  ClientProfile,
  ContractorProfile,
  EntitlementState,
  LocalHistorySignals,
  ProposalData,
  ProposalIntel,
  ProposalSettings,
  SupportedLanguage
} from "../types/proposal";
import type { CpeStructuredIntake, ContractorTradeProfile } from "../types/cpe";

export interface ResponseOsBridgeInput {
  description: string;
  photos: File[];
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  cpeIntake: CpeStructuredIntake;
  intel: ProposalIntel | null;
  language: SupportedLanguage;
  entitlementState: EntitlementState;
  historySignals?: LocalHistorySignals;
}

export interface ProposalDataMappingSource {
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  intel: ProposalIntel | null;
  language: SupportedLanguage;
  photoCount: number;
  estimatedAreaHint?: number;
  historySignals?: LocalHistorySignals;
}

interface BuildResponseOsRequestOptions {
  preferAi?: boolean;
}

interface ResponseOsAgentOutput {
  status: "ok" | "refused" | "needs_user" | "error";
  message: string;
  data?: {
    proposal?: ProposalDocument;
    route?: {
      pipeline?: string;
      reason?: string;
    };
    agent?: {
      id?: string;
      mode?: ProposalMode;
    };
  };
  debug?: Record<string, unknown>;
}

const AREA_REGEX = /(\d{2,5})\s*(sq\s*ft|square feet|ft2|sf|sqft)/i;
const AREA_GLOBAL_REGEX = /(\d{2,5})\s*(sq\s*ft|square feet|ft2|sf|sqft)/gi;
const UNIT_REGEX = /(\d{1,4})\s*(units?|fixtures?|rooms?)/i;
const MATERIAL_CATALOG: Array<{ token: RegExp; material: string }> = [
  { token: /\bporcelain|tile|backsplash|grout\b/i, material: "Tile and grout kit" },
  { token: /\bpaint|primer|coats?\b/i, material: "Paint and primer" },
  { token: /\blvp|laminate|hardwood|flooring\b/i, material: "Flooring package" },
  { token: /\bdrywall|joint compound|texture\b/i, material: "Drywall materials" },
  { token: /\bpvc|copper|pex|pipe|faucet|drain\b/i, material: "Plumbing materials" },
  { token: /\bpanel|wire|breaker|outlet|switch\b/i, material: "Electrical materials" },
  { token: /\bhvac|duct|thermostat|furnace|condenser\b/i, material: "HVAC equipment" }
];

const toNumberOrZero = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const inferAreaFromText = (...texts: string[]): number => {
  const corpus = texts.join(" ").toLowerCase();
  const matches = corpus.matchAll(AREA_GLOBAL_REGEX);
  let maxArea = 0;
  for (const match of matches) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      maxArea = Math.max(maxArea, parsed);
    }
  }
  return clamp(maxArea, 0, 12000);
};

const linesFromText = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

type RealityTrade = "renovation" | "hvac" | "plumbing" | "electrical" | "general";

const resolveRealityTrade = (projectType: string): RealityTrade => {
  const normalized = projectType.toLowerCase();
  if (/\bhvac|furnace|air handler|condenser|duct|mini-split\b/.test(normalized)) {
    return "hvac";
  }
  if (/\bplumb|pipe|drain|water heater|fixture|pex|copper\b/.test(normalized)) {
    return "plumbing";
  }
  if (/\belectrical|panel|wiring|wire|breaker|circuit|outlet|switch\b/.test(normalized)) {
    return "electrical";
  }
  if (/\brenovation|remodel|kitchen|bath|tile|millwork|cabinet|floor\b/.test(normalized)) {
    return "renovation";
  }
  return "general";
};

const BASE_RATE_PER_SQFT: Record<RealityTrade, number> = {
  renovation: 165,
  hvac: 72,
  plumbing: 78,
  electrical: 74,
  general: 118
};

const MIN_SUBTOTAL_BY_TRADE: Record<RealityTrade, number> = {
  renovation: 32000,
  hvac: 18000,
  plumbing: 17000,
  electrical: 17000,
  general: 22000
};

const minTimelineByTradeAndArea = (
  trade: RealityTrade,
  area: number
): number => {
  const effectiveArea = Math.max(120, area);
  if (trade === "renovation") {
    if (effectiveArea >= 3200) return 120;
    if (effectiveArea >= 2400) return 95;
    if (effectiveArea >= 1600) return 72;
    if (effectiveArea >= 1000) return 52;
    if (effectiveArea >= 600) return 36;
    if (effectiveArea >= 300) return 24;
    return 12;
  }
  if (trade === "hvac") {
    if (effectiveArea >= 3200) return 75;
    if (effectiveArea >= 2200) return 58;
    if (effectiveArea >= 1400) return 42;
    if (effectiveArea >= 800) return 28;
    return 14;
  }
  if (trade === "plumbing") {
    if (effectiveArea >= 3000) return 82;
    if (effectiveArea >= 2200) return 62;
    if (effectiveArea >= 1400) return 46;
    if (effectiveArea >= 800) return 30;
    return 14;
  }
  if (trade === "electrical") {
    if (effectiveArea >= 3000) return 80;
    if (effectiveArea >= 2200) return 60;
    if (effectiveArea >= 1400) return 44;
    if (effectiveArea >= 800) return 30;
    return 14;
  }
  if (effectiveArea >= 2600) return 90;
  if (effectiveArea >= 1700) return 68;
  if (effectiveArea >= 1000) return 48;
  if (effectiveArea >= 600) return 32;
  return 16;
};

interface RealityQuoteResult {
  items: ProposalData["quote"]["items"];
  subtotal: number;
  contingencyAmount: number;
  taxAmount: number;
  total: number;
}

const enforceRealityQuote = (
  input: {
    items: ProposalData["quote"]["items"];
    subtotal: number;
    estimatedArea: number;
    projectType: string;
    settings: ProposalSettings;
  }
): RealityQuoteResult => {
  const trade = resolveRealityTrade(input.projectType);
  const area = Math.max(120, Math.round(input.estimatedArea));
  const hasMillwork = input.items.some((item) =>
    /\bmillwork|cabinet|trim carpentry|built-?in\b/i.test(item.description)
  );
  const hasMepMix =
    input.items.some((item) => /\bplumb|pipe|drain\b/i.test(item.description)) ||
    input.items.some((item) => /\belectrical|panel|wiring|circuit\b/i.test(item.description));
  const complexityFactor =
    1 +
    clamp((input.items.length - 4) * 0.05, 0, 0.6) +
    (hasMillwork ? 0.12 : 0) +
    (hasMepMix ? 0.09 : 0);
  const areaDrivenFloor = roundCurrency(area * BASE_RATE_PER_SQFT[trade] * complexityFactor);
  const enforcedFloor = Math.max(MIN_SUBTOTAL_BY_TRADE[trade], areaDrivenFloor);
  const subtotal = input.subtotal;
  const items =
    subtotal >= enforcedFloor
      ? input.items
      : [
          ...input.items,
          {
            description: "Project scale and coordination allowance",
            amount: roundCurrency(enforcedFloor - subtotal)
          }
        ];

  const enforcedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const contingencyAmount = roundCurrency(
    (enforcedSubtotal * clamp(input.settings.contingencyRate, 0, 30)) / 100
  );
  const taxAmount = roundCurrency(
    ((enforcedSubtotal + contingencyAmount) * clamp(input.settings.taxRate, 0, 20)) / 100
  );
  const total = enforcedSubtotal + contingencyAmount + taxAmount;

  return {
    items,
    subtotal: enforcedSubtotal,
    contingencyAmount,
    taxAmount,
    total
  };
};

const inferJobType = (description: string, cpeIntake: CpeStructuredIntake): string => {
  if (cpeIntake.projectInfo.jobType.trim()) {
    return cpeIntake.projectInfo.jobType.trim();
  }
  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";
  if (!firstSentence) {
    return "Service Project";
  }
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
};

const mapTradeToProposalTrade = (trade: ContractorTradeProfile): ProposalTrade => {
  switch (trade) {
    case "hvac":
      return "hvac";
    case "plumbing":
      return "plumbing";
    case "electrical":
      return "electrical";
    case "renovation":
      return "renovation";
    default:
      return "general-contractor";
  }
};

const inferTrade = (description: string, cpeIntake: CpeStructuredIntake): ProposalTrade => {
  if (cpeIntake.tradeProfile) {
    return mapTradeToProposalTrade(cpeIntake.tradeProfile);
  }
  const value = description.toLowerCase();
  if (/\bhvac|furnace|ac|air conditioner|duct\b/.test(value)) {
    return "hvac";
  }
  if (/\bplumb|pipe|drain|water heater|faucet\b/.test(value)) {
    return "plumbing";
  }
  if (/\belectrical|panel|wiring|breaker|outlet|switch\b/.test(value)) {
    return "electrical";
  }
  if (/\bremodel|renovation|kitchen|bathroom|tile|backsplash\b/.test(value)) {
    return "remodeling";
  }
  return "general-contractor";
};

const inferSquareFootage = (description: string, cpeIntake: CpeStructuredIntake): number => {
  if (cpeIntake.projectInfo.squareFootage > 0) {
    return cpeIntake.projectInfo.squareFootage;
  }
  const match = description.match(AREA_REGEX);
  if (!match) {
    return 0;
  }
  return Math.max(0, toNumberOrZero(match[1]));
};

const inferUnits = (description: string, cpeIntake: CpeStructuredIntake): number => {
  if (cpeIntake.projectInfo.units > 0) {
    return cpeIntake.projectInfo.units;
  }
  const match = description.match(UNIT_REGEX);
  if (!match) {
    return 0;
  }
  return Math.max(0, toNumberOrZero(match[1]));
};

const inferMaterials = (description: string, cpeIntake: CpeStructuredIntake): string[] => {
  const structuredMaterials = linesFromText(cpeIntake.materialsEquipment);
  if (structuredMaterials.length > 0) {
    return unique(structuredMaterials);
  }
  const extracted = MATERIAL_CATALOG.filter((entry) => entry.token.test(description)).map(
    (entry) => entry.material
  );
  return unique(extracted);
};

const inferTone = (
  language: SupportedLanguage,
  entitlement: EntitlementState
): ProposalTone => {
  if (language === "es") {
    return "bilingual";
  }
  if (entitlement.tier === "pro") {
    return "formal";
  }
  return "simple";
};

const inferMode = (
  entitlement: EntitlementState,
  preferAi: boolean
): ProposalMode => {
  if (!preferAi) {
    return "offline_generate";
  }
  return entitlement.tier === "pro" ? "hybrid" : "offline_generate";
};

const buildSpecialConditions = (input: ResponseOsBridgeInput): string[] => {
  const conditions: string[] = linesFromText(input.cpeIntake.specialNotes);
  if (input.settings.includePermitAllowance) {
    conditions.push("Permit and inspection coordination may be required.");
  }
  if (input.intel?.weather?.highRiskDays && input.intel.weather.highRiskDays > 0) {
    conditions.push(
      `Weather schedule risk: ${input.intel.weather.highRiskDays} high-risk day(s) projected.`
    );
  }
  if (input.client.address.trim()) {
    conditions.push(`Project site: ${input.client.address.trim()}.`);
  }
  if (input.photos.length > 0) {
    conditions.push(`Scope informed by ${input.photos.length} uploaded site photo(s).`);
  }
  if (input.cpeIntake.allowances.trim()) {
    conditions.push(`Allowance notes: ${input.cpeIntake.allowances.trim()}.`);
  }
  if (input.cpeIntake.timelineNotes.trim()) {
    conditions.push(`Timeline notes: ${input.cpeIntake.timelineNotes.trim()}.`);
  }
  return unique(conditions);
};

const buildContextNotes = (input: ResponseOsBridgeInput): string[] => {
  const notes: string[] = linesFromText(input.cpeIntake.laborScope).map(
    (line) => `Labor step: ${line}`
  );
  if (input.intel?.market?.cpiYearOverYear !== null && input.intel?.market?.cpiYearOverYear !== undefined) {
    notes.push(`CPI YoY signal: ${input.intel.market.cpiYearOverYear.toFixed(2)}%.`);
  }
  if (input.intel?.market?.unemploymentRate !== null && input.intel?.market?.unemploymentRate !== undefined) {
    notes.push(`Unemployment signal: ${input.intel.market.unemploymentRate.toFixed(1)}%.`);
  }
  if (input.historySignals?.sampleSize) {
    notes.push(
      `Local history sample size: ${input.historySignals.sampleSize} similar proposal(s).`
    );
  }
  return unique(notes);
};

export const buildResponseOsRequest = (
  input: ResponseOsBridgeInput,
  options: BuildResponseOsRequestOptions = {}
): ProposalAgentInput => {
  const intake: ProposalIntake = {
    clientName: input.client.name.trim() || "Client",
    jobType: inferJobType(input.description, input.cpeIntake),
    trade: inferTrade(input.description, input.cpeIntake),
    squareFootage: inferSquareFootage(input.description, input.cpeIntake),
    units: inferUnits(input.description, input.cpeIntake),
    materials: inferMaterials(input.description, input.cpeIntake),
    timeline: input.cpeIntake.timelineNotes.trim() || `${input.settings.timelineDays} day(s)`,
    specialConditions: buildSpecialConditions(input),
    tone: inferTone(input.language, input.entitlementState),
    includePricing: true,
    currency: "USD"
  };

  const successCriteria: string[] = [
    "Clear scope language with minimal ambiguity.",
    "Itemized pricing and payment schedule for client sign-off.",
    `Proposal validity window: ${input.settings.validityDays} day(s).`
  ];

  return {
    goal: input.description.trim() || input.cpeIntake.projectInfo.jobType.trim(),
    mode: inferMode(input.entitlementState, options.preferAi ?? false),
    intake,
    audience: "Homeowner / property manager",
    constraints: [
      "Use practical contractor language.",
      "Reduce legal ambiguity in scope and terms.",
      "Keep output clean for PDF handoff."
    ],
    successCriteria,
    contextNotes: buildContextNotes(input)
  };
};

const mapLineItems = (proposal: ProposalDocument): ProposalData["quote"]["items"] => {
  return proposal.lineItems
    .map((item) => ({
      description: item.description,
      amount: roundCurrency(item.amount)
    }))
    .filter((item) => item.description.trim().length > 0 && item.amount > 0);
};

const toContractCopy = (
  proposal: ProposalDocument,
  contractor: ContractorProfile,
  client: ClientProfile
): string => {
  const sectionSummary = proposal.scopeSections
    .map((section) => `${section.title}: ${section.tasks.join("; ")}`)
    .join(" ");
  return `${contractor.companyName || "Contractor"} agrees to perform ${proposal.jobType.toLowerCase()} work for ${client.name || proposal.clientName}. ${sectionSummary} ${proposal.riskLanguage.join(" ")}`.trim();
};

const toGenerationSource = (output: ResponseOsAgentOutput): "gemini" | "heuristic" => {
  const pipeline = output.data?.route?.pipeline ?? "";
  if (pipeline.includes("ai") || pipeline.includes("hybrid")) {
    return "gemini";
  }
  return "heuristic";
};

export const mapResponseOsProposalToProposalData = (
  output: ResponseOsAgentOutput,
  source: ResponseOsBridgeInput
): ProposalData => {
  const proposal = output.data?.proposal;
  if (!proposal) {
    throw new Error("ResponseOS output is missing data.proposal.");
  }

  const quoteItems = mapLineItems(proposal);
  const subtotalFromItems = roundCurrency(
    quoteItems.reduce((sum, item) => sum + item.amount, 0)
  );
  const subtotalFromTotals = roundCurrency(proposal.totals.subtotal + proposal.totals.permitAllowance);
  const baseSubtotal = subtotalFromItems > 0 ? subtotalFromItems : subtotalFromTotals;
  const inclusions = unique(
    proposal.scopeSections.flatMap((section) => section.tasks)
  );
  const exclusions = unique(
    proposal.exclusions.length > 0
      ? proposal.exclusions
      : proposal.riskLanguage.map((line) => `Not included without change order: ${line}`)
  );
  const notesToClient = unique([
    `Timeline target: ${proposal.intake.timeline ?? `${source.settings.timelineDays} day(s)`}.`,
    `Proposal reference: ${proposal.proposalId}.`,
    output.message
  ]);
  const areaFromIntake = Math.max(0, toNumberOrZero(proposal.intake.squareFootage));
  const areaFromStructured = Math.max(0, toNumberOrZero(source.cpeIntake.projectInfo.squareFootage));
  const areaFromText = inferAreaFromText(
    source.description,
    source.cpeIntake.projectInfo.jobType,
    source.cpeIntake.materialsEquipment,
    source.cpeIntake.laborScope,
    source.cpeIntake.timelineNotes,
    source.cpeIntake.specialNotes
  );
  const estimatedArea = Math.max(areaFromIntake, areaFromStructured, areaFromText, 0);
  const realityQuote = enforceRealityQuote({
    items: quoteItems,
    subtotal: baseSubtotal,
    estimatedArea,
    projectType: proposal.jobType,
    settings: source.settings
  });
  const paymentSchedule = buildPaymentSchedule(
    realityQuote.total,
    source.settings.depositRate
  );
  const inferredComplexity = Math.min(2.1, 1 + proposal.lineItems.length * 0.04);
  const trade = resolveRealityTrade(proposal.jobType);
  const timelineFloor = minTimelineByTradeAndArea(trade, estimatedArea);
  const timelineDays = estimateTimelineDays({
    projectType: proposal.jobType,
    estimatedArea,
    complexity: inferredComplexity,
    includePermitAllowance: source.settings.includePermitAllowance,
    weatherRiskLevel: source.intel?.weather?.riskLevel ?? "unknown",
    requestedTimelineDays: Math.max(source.settings.timelineDays, timelineFloor)
  });

  return {
    quote: {
      items: realityQuote.items,
      subtotal: realityQuote.subtotal,
      contingencyAmount: realityQuote.contingencyAmount,
      taxAmount: realityQuote.taxAmount,
      total: realityQuote.total
    },
    contract: toContractCopy(proposal, source.contractor, source.client),
    paymentSchedule,
    terms: unique(proposal.termsAndConditions),
    assumptions: unique(proposal.riskLanguage),
    inclusions,
    exclusions,
    notesToClient,
    metadata: {
      generatedAt: proposal.createdAt,
      projectTitle: proposal.export.title,
      projectType: proposal.jobType,
      estimatedArea,
      photoCount: source.photos.length,
      timelineDays,
      validityDays: source.settings.validityDays,
      generationSource: toGenerationSource(output),
      aiModel: undefined,
      language: source.language,
      platform: "web"
    },
    contractor: source.contractor,
    client: source.client,
    settings: source.settings,
    intel: source.intel,
    language: source.language,
    historySignals: source.historySignals
  };
};

const toLegacyProjectTypeFromTrade = (trade: CpeProposalJson["meta"]["tradeProfile"]): string => {
  if (trade === "hvac") return "HVAC";
  if (trade === "plumbing") return "Plumbing";
  if (trade === "electrical") return "Electrical";
  return "General Renovation";
};

export const mapCpeProposalJsonToProposalData = (
  proposal: CpeProposalJson,
  source: ProposalDataMappingSource
): ProposalData => {
  const quoteItems = proposal.line_items
    .map((item) => ({
      description: item.description,
      amount: roundCurrency(item.total)
    }))
    .filter((item) => item.description.trim().length > 0 && item.amount > 0);

  const baseSubtotal = roundCurrency(quoteItems.reduce((sum, item) => sum + item.amount, 0));

  const assumptions = unique(
    proposal.assumptions.length > 0
      ? proposal.assumptions
      : ["Proposal generated without assumptions detail."]
  );
  const exclusions = unique(
    proposal.exclusions.length > 0
      ? proposal.exclusions
      : ["No exclusions provided."]
  );
  const inferredAreaFromItems = Math.max(
    0,
    Math.round(
      proposal.line_items.reduce((sum, item) => {
        const qty = Number(item.qty);
        return sum + (Number.isFinite(qty) ? qty : 0);
      }, 0)
    )
  );
  const projectType =
    proposal.project.jobType || toLegacyProjectTypeFromTrade(proposal.meta.tradeProfile);
  const areaFromText = inferAreaFromText(
    proposal.project.title,
    proposal.project.summary,
    ...proposal.sections.flatMap((section) => section.items),
    ...proposal.assumptions,
    ...proposal.exclusions
  );
  const estimatedArea = Math.max(
    inferredAreaFromItems >= 80 ? inferredAreaFromItems : 0,
    source.estimatedAreaHint ?? 0,
    areaFromText,
    Math.max(120, Math.round(source.settings.timelineDays * 40))
  );
  const realityQuote = enforceRealityQuote({
    items: quoteItems,
    subtotal: baseSubtotal,
    estimatedArea,
    projectType,
    settings: source.settings
  });
  const inferredComplexity = Math.min(2.1, 1 + proposal.line_items.length * 0.05);
  const trade = resolveRealityTrade(projectType);
  const timelineFloor = minTimelineByTradeAndArea(trade, estimatedArea);
  const timelineDays = estimateTimelineDays({
    projectType,
    estimatedArea: estimatedArea > 0 ? estimatedArea : source.settings.timelineDays * 40,
    complexity: inferredComplexity,
    includePermitAllowance: source.settings.includePermitAllowance,
    weatherRiskLevel: source.intel?.weather?.riskLevel ?? "unknown",
    requestedTimelineDays: Math.max(source.settings.timelineDays, timelineFloor)
  });
  const paymentSchedule =
    proposal.payment_schedule.length > 0
      ? proposal.payment_schedule.map((phase) => ({
          description: phase.label,
          percentage: phase.percentage,
          amount: roundCurrency(phase.amount)
        }))
      : buildPaymentSchedule(realityQuote.total, source.settings.depositRate);

  return {
    quote: {
      items: realityQuote.items,
      subtotal: realityQuote.subtotal,
      contingencyAmount: realityQuote.contingencyAmount,
      taxAmount: realityQuote.taxAmount,
      total: realityQuote.total
    },
    contract: proposal.project.summary || "Contract summary not provided.",
    paymentSchedule,
    terms: unique(proposal.warranty_terms),
    assumptions,
    inclusions: unique(proposal.sections.flatMap((section) => section.items)),
    exclusions,
    notesToClient: unique([
      proposal.executive_summary ?? "Executive summary not provided.",
      ...(proposal.warnings ?? [])
    ]),
    metadata: {
      generatedAt: proposal.meta.generatedAt,
      projectTitle: proposal.project.title,
      projectType,
      estimatedArea,
      photoCount: source.photoCount,
      timelineDays,
      validityDays: source.settings.validityDays,
      generationSource:
        proposal.meta.sourceMode === "refine" ||
        proposal.meta.sourceMode === "translate" ||
        proposal.meta.sourceMode === "qa"
          ? "gemini"
          : "heuristic",
      aiModel: undefined,
      language: source.language,
      platform: "web"
    },
    contractor: source.contractor,
    client: source.client,
    settings: source.settings,
    intel: source.intel,
    language: source.language,
    historySignals: source.historySignals
  };
};

export const isResponseOsAgentOutput = (value: unknown): value is ResponseOsAgentOutput => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const output = value as Record<string, unknown>;
  return (
    typeof output.status === "string" &&
    typeof output.message === "string" &&
    (!("data" in output) || typeof output.data === "object" || output.data === undefined)
  );
};

export const generateProposalViaResponseOS = async (
  input: ResponseOsBridgeInput
): Promise<ProposalData> => {
  const request = buildResponseOsRequest(input, { preferAi: false });
  const agent = new ProposalAgent({
    appId: "nss-contractor-proposal-engine"
  });
  const output = await agent.propose(request);

  if (output.status !== "ok") {
    throw new Error(output.message || "ResponseOS proposal generation did not complete.");
  }

  return mapResponseOsProposalToProposalData(output, input);
};
