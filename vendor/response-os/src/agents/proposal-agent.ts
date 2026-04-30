import type { AppConfig } from '../config/app-config.js';
import { createDefaultAppConfig } from '../config/app-config.js';
import type { RuntimeCapabilities, RuntimePlatform } from '../context/runtime-context.js';
import { createRuntimeContext } from '../context/runtime-context.js';
import type { RequestBudget } from '../core/budget.js';
import type { Message } from '../core/types.js';
import { createOutput, type AgentOutput } from '../output/contracts.js';
import type { Provider } from '../providers/provider.js';
import { OffProvider } from '../providers/off.provider.js';
import { AgentRuntime } from '../runtime/agent-runtime.js';
import type { ToolExecutor } from '../tools/executor.js';

export type ProposalTrade = 'hvac' | 'plumbing' | 'electrical' | 'renovation' | 'general-contractor' | 'remodeling';
export type CanonicalProposalTrade = 'hvac' | 'plumbing' | 'electrical' | 'renovation';
export type ProposalTone = 'formal' | 'simple' | 'bilingual';
export type ProposalMode = 'offline_generate' | 'refine' | 'translate' | 'qa' | 'deterministic' | 'ai' | 'hybrid';
export type ProposalRefinementType =
  | 'clarity'
  | 'persuasion'
  | 'executive_summary'
  | 'scope_tightening'
  | 'missing_info';
export type ProposalLanguage = 'en' | 'es' | 'it';

export interface ProposalIntake {
  clientName?: string;
  jobType?: string;
  trade?: ProposalTrade;
  squareFootage?: number;
  units?: number;
  materials?: string[];
  timeline?: string;
  specialConditions?: string[];
  tone?: ProposalTone;
  includePricing?: boolean;
  currency?: string;
}

export interface ProposalScopeSection {
  title: string;
  tasks: string[];
}

export interface ProposalLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface ProposalTotals {
  subtotal: number;
  permitAllowance: number;
  contingency: number;
  total: number;
  currency: string;
  pricingMode: 'estimated' | 'pending';
}

export interface ProposalDocument {
  proposalId: string;
  createdAt: string;
  clientName: string;
  trade: ProposalTrade;
  jobType: string;
  goal: string;
  tone: ProposalTone;
  intake: {
    squareFootage?: number;
    units?: number;
    materials: string[];
    timeline?: string;
    specialConditions: string[];
  };
  scopeSections: ProposalScopeSection[];
  lineItems: ProposalLineItem[];
  totals: ProposalTotals;
  exclusions: string[];
  riskLanguage: string[];
  termsAndConditions: string[];
  signature: {
    contractorLabel: string;
    clientLabel: string;
  };
  export: {
    title: string;
    fileName: string;
    markdown: string;
  };
}

export interface CpeProposalJson {
  meta: {
    tradeProfile: CanonicalProposalTrade;
    schemaVersion: string;
    language: ProposalLanguage;
    currency: string;
    location?: string;
    generatedAt: string;
    version: number;
    sourceMode: ProposalMode;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  project: {
    title: string;
    jobType: string;
    summary: string;
    roomsOrAreas?: string[];
  };
  sections: Array<{
    id: string;
    title: string;
    items: string[];
  }>;
  line_items: Array<{
    id: string;
    description: string;
    qty: number;
    unit: string;
    unit_cost: number;
    total: number;
  }>;
  allowances: Array<{
    description: string;
    amount?: number;
    notes?: string;
  }>;
  exclusions: string[];
  assumptions: string[];
  timeline: {
    summary: string;
    phases: Array<{
      name: string;
      durationDays?: number;
      notes?: string;
    }>;
  };
  payment_schedule: Array<{
    label: string;
    percentage: number;
    amount: number;
  }>;
  warranty_terms: string[];
  signature_block: {
    contractor_label: string;
    client_label: string;
    date_label: string;
  };
  warnings: string[];
  executive_summary?: string;
  missing_info_checklist?: string[];
}

export interface ProposalQaReport {
  missingInfo: string[];
  riskFlags: string[];
}

export interface ProposalAgentInput {
  goal: string;
  intake?: ProposalIntake;
  mode?: ProposalMode;
  refinementType?: ProposalRefinementType;
  targetLanguage?: ProposalLanguage;
  draftProposal?: CpeProposalJson;
  audience?: string;
  constraints?: string[];
  successCriteria?: string[];
  contextNotes?: string[];
  userId?: string;
  sessionId?: string;
  locale?: string;
  timezone?: string;
  platform?: RuntimePlatform;
  capabilities?: RuntimeCapabilities;
  budgetOverride?: Partial<RequestBudget>;
}

export interface ProposalAgentOptions {
  appConfig?: AppConfig;
  appId?: string;
  runtime?: AgentRuntime;
  provider?: Provider;
  fallbackProvider?: Provider;
  toolExecutor?: ToolExecutor;
}

const PROPOSAL_AGENT_ID = 'ProposalAgent';
const DEFAULT_APP_ID = 'proposal-agent';
const DEFAULT_CLIENT_NAME = 'Client';
const DEFAULT_JOB_TYPE = 'Service Project';
const DEFAULT_CURRENCY = 'USD';

interface TradeProfile {
  id: CanonicalProposalTrade;
  label: string;
  basePricing: {
    mobilization: number;
    laborPerSqFt: number;
    laborPerUnit: number;
    materialMultiplier: number;
  };
  scopeSections: Array<{
    title: string;
    tasks: string[];
  }>;
  lineItemTemplates: Array<{
    description: string;
    quantitySource: 'fixed' | 'sqft' | 'unit' | 'materials';
    fixedQuantity?: number;
    unit: string;
    priceKey: 'mobilization' | 'laborPerSqFt' | 'laborPerUnit' | 'materialMultiplier';
  }>;
  standardExclusions: string[];
  riskDisclaimers: string[];
  warrantyTerm: string;
}

const TRADE_PROFILES: Record<CanonicalProposalTrade, TradeProfile> = {
  hvac: {
    id: 'hvac',
    label: 'HVAC',
    basePricing: {
      mobilization: 300,
      laborPerSqFt: 3.1,
      laborPerUnit: 420,
      materialMultiplier: 240,
    },
    scopeSections: [
      {
        title: 'Equipment and System Review',
        tasks: [
          'Confirm equipment size assumptions and airflow requirements.',
          'Document existing thermostat, duct, and condenser conditions.',
        ],
      },
      {
        title: 'Installation Scope',
        tasks: [
          'Remove and replace listed HVAC equipment with startup checks.',
          'Seal connections, verify charge, and balance basic airflow.',
        ],
      },
      {
        title: 'Commissioning and Handover',
        tasks: [
          'Perform system test cycle and operating verification.',
          'Provide efficiency and maintenance summary for client handoff.',
        ],
      },
    ],
    lineItemTemplates: [
      {
        description: 'HVAC mobilization and site setup',
        quantitySource: 'fixed',
        fixedQuantity: 1,
        unit: 'lot',
        priceKey: 'mobilization',
      },
      {
        description: 'HVAC labor scope (sqft based)',
        quantitySource: 'sqft',
        unit: 'sqft',
        priceKey: 'laborPerSqFt',
      },
      {
        description: 'HVAC labor scope (unit based)',
        quantitySource: 'unit',
        unit: 'unit',
        priceKey: 'laborPerUnit',
      },
      {
        description: 'Equipment and materials package',
        quantitySource: 'materials',
        unit: 'bundle',
        priceKey: 'materialMultiplier',
      },
    ],
    standardExclusions: [
      'Duct replacement not listed in scope is excluded.',
      'Utility service upgrades are excluded unless stated.',
      'Permit fees beyond listed allowance are excluded.',
    ],
    riskDisclaimers: [
      'SEER and performance outcomes depend on full system compatibility.',
      'Existing duct integrity is assumed unless testing is explicitly scoped.',
      'Refrigerant recovery and disposal follow local environmental rules.',
    ],
    warrantyTerm: 'Workmanship warranty: 12 months from substantial completion.',
  },
  plumbing: {
    id: 'plumbing',
    label: 'Plumbing',
    basePricing: {
      mobilization: 220,
      laborPerSqFt: 2.4,
      laborPerUnit: 260,
      materialMultiplier: 180,
    },
    scopeSections: [
      {
        title: 'Access and Existing Conditions',
        tasks: [
          'Verify visible pipe routing, access points, and shutoff locations.',
          'Document known fixture and finish constraints before work starts.',
        ],
      },
      {
        title: 'Plumbing Scope',
        tasks: [
          'Perform listed plumbing rough-in and finish installation tasks.',
          'Pressure test and verify fixture operation after installation.',
        ],
      },
      {
        title: 'Closeout',
        tasks: [
          'Confirm leak-free operation at handover.',
          'Provide client guidance on maintenance and shutoff controls.',
        ],
      },
    ],
    lineItemTemplates: [
      {
        description: 'Plumbing mobilization and prep',
        quantitySource: 'fixed',
        fixedQuantity: 1,
        unit: 'lot',
        priceKey: 'mobilization',
      },
      {
        description: 'Plumbing labor scope (sqft based)',
        quantitySource: 'sqft',
        unit: 'sqft',
        priceKey: 'laborPerSqFt',
      },
      {
        description: 'Fixture and connection labor (unit based)',
        quantitySource: 'unit',
        unit: 'unit',
        priceKey: 'laborPerUnit',
      },
      {
        description: 'Pipe and fixture materials package',
        quantitySource: 'materials',
        unit: 'bundle',
        priceKey: 'materialMultiplier',
      },
    ],
    standardExclusions: [
      'Hidden pipe failures behind finished walls are excluded until exposed.',
      'Water damage remediation is excluded unless specifically scoped.',
      'Municipal utility upgrades are excluded.',
    ],
    riskDisclaimers: [
      'Existing conditions not visible during estimate may require change orders.',
      'Code upgrades discovered during inspection may change final scope.',
      'Client water shutoff access is required during scheduled work windows.',
    ],
    warrantyTerm: 'Workmanship warranty: 12 months from substantial completion.',
  },
  electrical: {
    id: 'electrical',
    label: 'Electrical',
    basePricing: {
      mobilization: 240,
      laborPerSqFt: 2.9,
      laborPerUnit: 290,
      materialMultiplier: 210,
    },
    scopeSections: [
      {
        title: 'Load and Panel Assessment',
        tasks: [
          'Review visible panel conditions and labeled circuit capacity.',
          'Confirm device count assumptions and access constraints.',
        ],
      },
      {
        title: 'Electrical Scope',
        tasks: [
          'Install listed wiring, devices, and panel work in scope.',
          'Test circuits and device functionality at project closeout.',
        ],
      },
      {
        title: 'Inspection and Handover',
        tasks: [
          'Coordinate required inspection steps when permits apply.',
          'Deliver as-built notes for installed devices and circuits.',
        ],
      },
    ],
    lineItemTemplates: [
      {
        description: 'Electrical mobilization and planning',
        quantitySource: 'fixed',
        fixedQuantity: 1,
        unit: 'lot',
        priceKey: 'mobilization',
      },
      {
        description: 'Electrical labor scope (sqft based)',
        quantitySource: 'sqft',
        unit: 'sqft',
        priceKey: 'laborPerSqFt',
      },
      {
        description: 'Device and panel labor (unit based)',
        quantitySource: 'unit',
        unit: 'unit',
        priceKey: 'laborPerUnit',
      },
      {
        description: 'Electrical materials package',
        quantitySource: 'materials',
        unit: 'bundle',
        priceKey: 'materialMultiplier',
      },
    ],
    standardExclusions: [
      'Service upgrades and utility coordination are excluded unless listed.',
      'Drywall patch and paint after electrical access are excluded.',
      'Permit fees beyond listed allowance are excluded.',
    ],
    riskDisclaimers: [
      'Panel capacity assumptions are based on visible inspection only.',
      'Code-driven corrections required by authority may affect final cost.',
      'Device counts above estimate require approved scope revision.',
    ],
    warrantyTerm: 'Workmanship warranty: 12 months from substantial completion.',
  },
  renovation: {
    id: 'renovation',
    label: 'General Renovation',
    basePricing: {
      mobilization: 340,
      laborPerSqFt: 8.4,
      laborPerUnit: 620,
      materialMultiplier: 420,
    },
    scopeSections: [
      {
        title: 'Room-by-Room Scope',
        tasks: [
          'Confirm room-level scope boundaries and access planning.',
          'Document finish protection and staging requirements.',
        ],
      },
      {
        title: 'Demolition and Build',
        tasks: [
          'Perform selective demolition and debris handling in scope.',
          'Complete renovation build scope by phase with quality checks.',
        ],
      },
      {
        title: 'Allowances and Closeout',
        tasks: [
          'Track allowance selections and update approved changes.',
          'Complete final walkthrough, punch list, and turnover notes.',
        ],
      },
    ],
    lineItemTemplates: [
      {
        description: 'Renovation mobilization and staging',
        quantitySource: 'fixed',
        fixedQuantity: 1,
        unit: 'lot',
        priceKey: 'mobilization',
      },
      {
        description: 'Renovation labor scope (sqft based)',
        quantitySource: 'sqft',
        unit: 'sqft',
        priceKey: 'laborPerSqFt',
      },
      {
        description: 'Renovation labor scope (unit based)',
        quantitySource: 'unit',
        unit: 'unit',
        priceKey: 'laborPerUnit',
      },
      {
        description: 'Renovation materials and finishes package',
        quantitySource: 'materials',
        unit: 'bundle',
        priceKey: 'materialMultiplier',
      },
    ],
    standardExclusions: [
      'Asbestos or lead remediation is excluded unless explicitly scoped.',
      'Unseen structural repairs are excluded until documented.',
      'Owner-direct specialty selections outside allowance are excluded.',
    ],
    riskDisclaimers: [
      'Renovation scope is based on visible and disclosed site conditions.',
      'Allowance overages require written client approval before purchase.',
      'Change order process governs any scope expansion after kickoff.',
    ],
    warrantyTerm: 'Workmanship warranty: 24 months from substantial completion.',
  },
};

const LEGAL_GUARDRAILS = {
  terms: [
    'Any out-of-scope request requires written change order approval before execution.',
    'Permit responsibility must be confirmed before start; permit delays can affect schedule.',
  ],
  assumptions: [
    'Unforeseen site conditions may require scope and pricing adjustments.',
    'Timeline depends on material availability, inspections, and client approvals.',
  ],
};

export class ProposalAgent {
  private readonly runtime: AgentRuntime;
  private readonly appConfig: AppConfig;

  constructor(options: ProposalAgentOptions = {}) {
    this.appConfig = options.appConfig ?? createDefaultAppConfig(options.appId ?? DEFAULT_APP_ID);
    this.runtime =
      options.runtime ??
      new AgentRuntime({
        provider: options.provider ?? new OffProvider(),
        fallbackProvider: options.fallbackProvider ?? new OffProvider(),
        toolExecutor: options.toolExecutor,
      });
  }

  async run(input: ProposalAgentInput): Promise<AgentOutput> {
    return this.propose(input);
  }

  async propose(input: ProposalAgentInput): Promise<AgentOutput> {
    const mode = normalizeMode(input.mode);
    const explicitGoal = input.goal.trim();
    const explicitJobType = input.intake?.jobType?.trim() ?? '';
    const hasPromptSeed = explicitGoal.length > 0 || explicitJobType.length > 0 || Boolean(input.draftProposal);
    const intake = normalizeIntake(input.intake);
    const goal = explicitGoal || `Create proposal for ${intake.jobType}`;
    const context = createRuntimeContext({
      appId: this.appConfig.appId,
      userId: input.userId,
      sessionId: input.sessionId,
      locale: input.locale,
      timezone: input.timezone,
      platform: input.platform,
      capabilities: input.capabilities,
      policyProfile: this.appConfig.policyProfile,
    });

    if (mode === 'refine' || mode === 'translate' || mode === 'qa') {
      if (!input.draftProposal || !isCpeProposalJson(input.draftProposal)) {
        return createOutput({
          status: 'needs_user',
          message: 'A draft proposal JSON payload is required for refine, translate, or qa mode.',
          context,
        });
      }

      const baseProposal = enforceLegalProtection(cloneProposalJson(input.draftProposal));

      if (mode === 'translate') {
        const targetLanguage = input.targetLanguage ?? detectLanguageFromLocale(input.locale);
        const translated = translateProposalJson(baseProposal, targetLanguage);
        return createOutput({
          status: 'ok',
          message: `Proposal translated to ${targetLanguage.toUpperCase()}.`,
          context,
          data: {
            route: {
              pipeline: 'proposal-translate',
              reason: 'Cloud boost translate mode.',
            },
            agent: {
              id: PROPOSAL_AGENT_ID,
              mode,
              goal,
            },
            proposal_json: translated,
          },
        });
      }

      if (mode === 'qa') {
        const qaReport = evaluateProposalQa(baseProposal, intake);
        const qaProposal: CpeProposalJson = {
          ...baseProposal,
          warnings: uniqueList([...baseProposal.warnings, ...qaReport.riskFlags]),
          missing_info_checklist: qaReport.missingInfo,
        };
        return createOutput({
          status: 'ok',
          message: `QA completed with ${qaReport.missingInfo.length} missing-info item(s).`,
          context,
          data: {
            route: {
              pipeline: 'proposal-qa',
              reason: 'Cloud boost QA mode.',
            },
            agent: {
              id: PROPOSAL_AGENT_ID,
              mode,
              goal,
            },
            proposal_json: qaProposal,
            qa_report: qaReport,
          },
        });
      }

      const refinement = refineProposalJson(
        baseProposal,
        input.refinementType ?? 'clarity',
        goal,
        intake
      );
      return createOutput({
        status: 'ok',
        message: `Proposal refined using ${input.refinementType ?? 'clarity'} mode.`,
        context,
        data: {
          route: {
            pipeline: 'proposal-refine',
            reason: 'Cloud boost refine mode.',
          },
          agent: {
            id: PROPOSAL_AGENT_ID,
            mode,
            goal,
          },
          proposal_json: refinement,
        },
      });
    }

    if (!hasPromptSeed) {
      return createOutput({
        status: 'needs_user',
        message: 'Please provide a goal or intake details so I can build the proposal.',
        context,
      });
    }

    const proposal = buildProposalDocument(goal, intake);
    const proposalJson = toCpeProposalJson(proposal, {
      mode,
      language: detectLanguageFromLocale(input.locale),
      location: extractLocationHint(intake.specialConditions),
    });
    const deterministicOutput = buildDeterministicOutput({
      context,
      goal,
      proposal,
      proposalJson,
      intake,
      input,
      mode,
    });

    if (mode === 'offline_generate' || mode === 'deterministic') {
      return deterministicOutput;
    }

    const messages = buildProposalMessages({
      goal,
      input,
      proposal,
      intake,
    });

    try {
      const output = await this.runtime.execute({
        context,
        appConfig: this.appConfig,
        messages,
        budgetOverride: input.budgetOverride,
      });

      const aiMessage = output.message;
      const finalMessage = mode === 'hybrid' ? `${deterministicOutput.message}\n\nAI refinement:\n${aiMessage}` : aiMessage;

      return createOutput({
        status: output.status,
        message: finalMessage,
        context,
        latencyMs: output.metadata.latencyMs,
        data: {
          ...(output.data ?? {}),
          route: {
            ...(output.data?.route ?? {}),
            pipeline: mode === 'hybrid' ? 'proposal-hybrid' : 'proposal-ai',
          },
          agent: {
            id: PROPOSAL_AGENT_ID,
            mode,
            goal,
          },
          proposal,
          proposal_json: proposalJson,
          proposalMarkdown: proposal.export.markdown,
        },
        actions: output.actions,
        artifacts: output.artifacts,
        debug: output.debug,
      });
    } catch (error) {
      if (mode === 'hybrid') {
        return {
          ...deterministicOutput,
          debug: {
            ...(deterministicOutput.debug ?? {}),
            aiFallback: true,
            aiError: normalizeError(error),
          },
        };
      }

      return createOutput({
        status: 'error',
        message: error instanceof Error ? error.message : 'ProposalAgent failed to generate an output.',
        context,
        debug: {
          agent: PROPOSAL_AGENT_ID,
          error: normalizeError(error),
        },
      });
    }
  }
}

function buildProposalMessages(args: {
  goal: string;
  input: ProposalAgentInput;
  intake: Required<ProposalIntake>;
  proposal: ProposalDocument;
}): Message[] {
  const systemMessage: Message = {
    role: 'system',
    content:
      'You are NSS ProposalAgent for contractors. Return concise, field-ready proposal copy. Keep legal language clear and reduce ambiguity.',
  };

  const details: string[] = [
    `Goal: ${args.goal}`,
    `Client: ${args.intake.clientName}`,
    `Trade: ${args.intake.trade}`,
    `Job type: ${args.intake.jobType}`,
    `Tone: ${args.intake.tone}`,
    `Timeline: ${args.intake.timeline}`,
    `Current deterministic proposal markdown:\n${args.proposal.export.markdown}`,
    'Improve clarity, tighten scope language, and keep output practical for service businesses.',
  ];

  if (args.input.audience?.trim()) {
    details.push(`Audience: ${args.input.audience.trim()}`);
  }

  const constraints = normalizeList(args.input.constraints);
  if (constraints.length > 0) {
    details.push(`Constraints: ${constraints.join('; ')}`);
  }

  const successCriteria = normalizeList(args.input.successCriteria);
  if (successCriteria.length > 0) {
    details.push(`Success criteria: ${successCriteria.join('; ')}`);
  }

  const contextNotes = normalizeList(args.input.contextNotes);
  if (contextNotes.length > 0) {
    details.push(`Context notes: ${contextNotes.join('; ')}`);
  }

  const userMessage: Message = {
    role: 'user',
    content: details.join('\n'),
  };

  return [systemMessage, userMessage];
}

function buildDeterministicOutput(args: {
  context: ReturnType<typeof createRuntimeContext>;
  goal: string;
  proposal: ProposalDocument;
  proposalJson: CpeProposalJson;
  intake: Required<ProposalIntake>;
  input: ProposalAgentInput;
  mode: ProposalMode;
}): AgentOutput {
  return createOutput({
    status: 'ok',
    message: buildDeterministicMessage(args.goal, args.proposal),
    context: args.context,
    data: {
      route: {
        pipeline: 'proposal-deterministic',
        reason: 'Deterministic proposal generation for low cost and predictable structure.',
      },
      agent: {
        id: PROPOSAL_AGENT_ID,
        mode: args.mode,
        goal: args.goal,
        ...(args.input.audience ? { audience: args.input.audience } : {}),
        ...(args.input.successCriteria?.length ? { successCriteria: normalizeList(args.input.successCriteria) } : {}),
      },
      proposal: args.proposal,
      proposal_json: args.proposalJson,
      proposalMarkdown: args.proposal.export.markdown,
    },
    actions: [
      {
        id: 'export_pdf',
        label: 'Export PDF',
        type: 'button',
        payload: {
          proposalId: args.proposal.proposalId,
          fileName: args.proposal.export.fileName,
        },
      },
      {
        id: 'edit_line_items',
        label: 'Edit Line Items',
        type: 'button',
      },
      {
        id: 'save_version',
        label: 'Save Version',
        type: 'button',
      },
    ],
  });
}

function buildProposalDocument(goal: string, intake: Required<ProposalIntake>): ProposalDocument {
  const trade = toCanonicalTrade(intake.trade);
  const profile = TRADE_PROFILES[trade];
  const createdAt = new Date().toISOString();
  const scopeSections = buildScopeSections(profile, intake.jobType, intake.specialConditions);
  const lineItems = buildLineItems(intake, profile);
  const totals = calculateTotals(lineItems, intake);
  const exclusions = buildExclusions(profile, intake.specialConditions);
  const riskLanguage = buildRiskLanguage(profile, intake.specialConditions);
  const termsAndConditions = buildTermsAndConditions(profile, intake.tone);

  const draft: ProposalDocument = {
    proposalId: generateProposalId(),
    createdAt,
    clientName: intake.clientName,
    trade,
    jobType: intake.jobType,
    goal,
    tone: intake.tone,
    intake: {
      squareFootage: intake.squareFootage,
      units: intake.units,
      materials: intake.materials,
      timeline: intake.timeline,
      specialConditions: intake.specialConditions,
    },
    scopeSections,
    lineItems,
    totals,
    exclusions,
    riskLanguage,
    termsAndConditions,
    signature: {
      contractorLabel: 'Contractor Signature',
      clientLabel: 'Client Signature',
    },
    export: {
      title: `${intake.clientName} - ${intake.jobType} Proposal`,
      fileName: `${toSlug(intake.clientName)}-${toSlug(intake.jobType)}-proposal.pdf`,
      markdown: '',
    },
  };

  draft.export.markdown = toProposalMarkdown(draft);
  return draft;
}

function buildScopeSections(profile: TradeProfile, jobType: string, specialConditions: string[]): ProposalScopeSection[] {
  const sections: ProposalScopeSection[] = profile.scopeSections.map((section) => ({
    title: section.title,
    tasks: [...section.tasks],
  }));

  sections.splice(1, 0, {
    title: 'Defined Job Scope',
    tasks: [
      `Execute ${jobType.toLowerCase()} scope according to code and manufacturer guidance.`,
      `Apply ${profile.label} completion checklist before sign-off.`,
    ],
  });

  if (specialConditions.length > 0) {
    sections.push({
      title: 'Special Conditions',
      tasks: specialConditions,
    });
  }

  return sections;
}

function buildLineItems(intake: Required<ProposalIntake>, profile: TradeProfile): ProposalLineItem[] {
  if (!intake.includePricing) {
    return [];
  }

  const pricing = profile.basePricing;
  const qtySqFt = Math.max(0, intake.squareFootage);
  const qtyUnits = Math.max(0, intake.units);
  const materialCount = Math.max(1, intake.materials.length);

  const items: ProposalLineItem[] = profile.lineItemTemplates.map((template) => {
    const quantity = resolveQuantitySource(template.quantitySource, {
      qtySqFt,
      qtyUnits,
      materialCount,
      fixedQuantity: template.fixedQuantity,
    });
    return createLineItem(template.description, quantity, template.unit, pricing[template.priceKey]);
  });

  return items.filter((item) => item.quantity > 0);
}

function calculateTotals(lineItems: ProposalLineItem[], intake: Required<ProposalIntake>): ProposalTotals {
  if (!intake.includePricing) {
    return {
      subtotal: 0,
      permitAllowance: 0,
      contingency: 0,
      total: 0,
      currency: intake.currency,
      pricingMode: 'pending',
    };
  }

  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const permitAllowance = roundMoney(subtotal * 0.08);
  const contingency = roundMoney(subtotal * 0.1);
  const total = roundMoney(subtotal + permitAllowance + contingency);

  return {
    subtotal,
    permitAllowance,
    contingency,
    total,
    currency: intake.currency,
    pricingMode: 'estimated',
  };
}

function buildExclusions(profile: TradeProfile, specialConditions: string[]): string[] {
  const exclusions = [...profile.standardExclusions];
  if (specialConditions.some((item) => /apartment|occupied|tenant/i.test(item))) {
    exclusions.push('After-hours or tenant coordination services are excluded unless listed.');
  }
  return uniqueList(exclusions);
}

function buildRiskLanguage(profile: TradeProfile, specialConditions: string[]): string[] {
  const clauses = [
    'Final pricing is subject to site verification and discovery of hidden conditions.',
    'Unforeseen code compliance requirements may require a signed change order.',
    ...profile.riskDisclaimers,
  ];

  if (specialConditions.some((item) => /permit|inspection/i.test(item))) {
    clauses.push('Permit and inspection timelines depend on local authority response times.');
  }

  return uniqueList(clauses);
}

function buildTermsAndConditions(profile: TradeProfile, tone: ProposalTone): string[] {
  const base = [
    'Payment terms: 40% deposit, 40% progress, 20% upon completion.',
    profile.warrantyTerm,
    'Any out-of-scope request requires written approval before execution.',
  ];

  if (tone === 'simple') {
    return base.map((line) => line.replace('substantial completion', 'project completion'));
  }

  if (tone === 'bilingual') {
    return [
      ...base,
      'Spanish support can be included in final customer-facing documents when requested.',
    ];
  }

  return uniqueList(base);
}

function buildDeterministicMessage(goal: string, proposal: ProposalDocument): string {
  const totalText =
    proposal.totals.pricingMode === 'estimated'
      ? `${proposal.totals.currency} ${proposal.totals.total.toFixed(2)} (estimated)`
      : 'Pricing pending review';

  return [
    `Proposal ready for "${goal}".`,
    `Client: ${proposal.clientName}.`,
    `Job: ${proposal.jobType} (${proposal.trade}).`,
    `Timeline: ${proposal.intake.timeline ?? 'To be confirmed'}.`,
    `Total: ${totalText}.`,
  ].join(' ');
}

function toProposalMarkdown(proposal: ProposalDocument): string {
  const lines: string[] = [
    `# ${proposal.export.title}`,
    '',
    `Date: ${proposal.createdAt}`,
    `Client: ${proposal.clientName}`,
    `Trade: ${proposal.trade}`,
    `Job type: ${proposal.jobType}`,
    '',
    '## Scope',
  ];

  for (const section of proposal.scopeSections) {
    lines.push(`### ${section.title}`);
    for (const task of section.tasks) {
      lines.push(`- ${task}`);
    }
    lines.push('');
  }

  lines.push('## Line Items');
  if (proposal.lineItems.length === 0) {
    lines.push('- Pricing pending. Enable pricing to generate line items.');
  } else {
    lines.push('| Item | Qty | Unit | Unit Price | Amount |');
    lines.push('| --- | ---: | --- | ---: | ---: |');
    for (const item of proposal.lineItems) {
      lines.push(
        `| ${item.description} | ${item.quantity} | ${item.unit} | ${item.unitPrice.toFixed(2)} | ${item.amount.toFixed(2)} |`
      );
    }
    lines.push(
      `| **Subtotal** |  |  |  | **${proposal.totals.subtotal.toFixed(2)}** |\n| **Permits** |  |  |  | **${proposal.totals.permitAllowance.toFixed(2)}** |\n| **Contingency** |  |  |  | **${proposal.totals.contingency.toFixed(2)}** |\n| **Total** |  |  |  | **${proposal.totals.total.toFixed(2)}** |`
    );
  }
  lines.push('');

  lines.push('## Standard Exclusions');
  for (const exclusion of proposal.exclusions) {
    lines.push(`- ${exclusion}`);
  }
  lines.push('');

  lines.push('## Risk Language');
  for (const clause of proposal.riskLanguage) {
    lines.push(`- ${clause}`);
  }
  lines.push('');

  lines.push('## Terms and Conditions');
  for (const term of proposal.termsAndConditions) {
    lines.push(`- ${term}`);
  }
  lines.push('');

  lines.push('## Signatures');
  lines.push(`- ${proposal.signature.contractorLabel}: ____________________`);
  lines.push(`- ${proposal.signature.clientLabel}: ____________________`);

  return lines.join('\n');
}

function normalizeMode(mode?: ProposalMode): ProposalMode {
  if (!mode || mode === 'deterministic') {
    return 'offline_generate';
  }
  return mode;
}

function detectLanguageFromLocale(locale?: string): ProposalLanguage {
  const value = (locale ?? '').toLowerCase();
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('it')) return 'it';
  return 'en';
}

function extractLocationHint(specialConditions: string[]): string | undefined {
  const fromSite = specialConditions.find((item) => /project site|location|address/i.test(item));
  if (!fromSite) {
    return undefined;
  }
  const parts = fromSite.split(':');
  if (parts.length < 2) {
    return undefined;
  }
  const value = parts.slice(1).join(':').trim();
  return value || undefined;
}

function buildPaymentSchedule(total: number): CpeProposalJson['payment_schedule'] {
  const deposit = roundMoney(total * 0.4);
  const progress = roundMoney(total * 0.4);
  const completion = roundMoney(total - deposit - progress);
  return [
    {
      label: 'Deposit',
      percentage: 40,
      amount: deposit,
    },
    {
      label: 'Progress',
      percentage: 40,
      amount: progress,
    },
    {
      label: 'Completion',
      percentage: 20,
      amount: completion,
    },
  ];
}

function inferTimelinePhaseDays(timeline: string | undefined): number | undefined {
  if (!timeline) return undefined;
  const match = timeline.match(/(\d{1,3})/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function toCpeProposalJson(
  proposal: ProposalDocument,
  options: {
    mode: ProposalMode;
    language: ProposalLanguage;
    location?: string;
  }
): CpeProposalJson {
  const summary = `Structured ${proposal.trade} proposal for ${proposal.jobType}.`;
  const phaseDays = inferTimelinePhaseDays(proposal.intake.timeline);
  const json: CpeProposalJson = {
    meta: {
      tradeProfile: toCanonicalTrade(proposal.trade),
      schemaVersion: '1.0.0',
      language: options.language,
      currency: proposal.totals.currency,
      location: options.location,
      generatedAt: proposal.createdAt,
      version: 1,
      sourceMode: options.mode,
    },
    client: {
      name: proposal.clientName,
    },
    project: {
      title: proposal.export.title,
      jobType: proposal.jobType,
      summary,
      roomsOrAreas: proposal.scopeSections
        .filter((section) => /room|area|site|scope/i.test(section.title))
        .map((section) => section.title),
    },
    sections: proposal.scopeSections.map((section, index) => ({
      id: `section_${index + 1}`,
      title: section.title,
      items: [...section.tasks],
    })),
    line_items: proposal.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      qty: item.quantity,
      unit: item.unit,
      unit_cost: item.unitPrice,
      total: item.amount,
    })),
    allowances: proposal.intake.specialConditions
      .filter((item) => /allowance/i.test(item))
      .map((item) => ({
        description: item,
      })),
    exclusions: [...proposal.exclusions],
    assumptions: [...proposal.riskLanguage],
    timeline: {
      summary: proposal.intake.timeline ?? 'To be scheduled',
      phases: [
        {
          name: 'Planning and mobilization',
          durationDays: phaseDays ? Math.max(1, Math.round(phaseDays * 0.25)) : undefined,
        },
        {
          name: 'Execution',
          durationDays: phaseDays ? Math.max(1, Math.round(phaseDays * 0.6)) : undefined,
        },
        {
          name: 'Closeout and handoff',
          durationDays: phaseDays ? Math.max(1, phaseDays - Math.round(phaseDays * 0.85)) : undefined,
        },
      ],
    },
    payment_schedule: buildPaymentSchedule(proposal.totals.total),
    warranty_terms: [...proposal.termsAndConditions.filter((term) => /warranty/i.test(term))],
    signature_block: {
      contractor_label: proposal.signature.contractorLabel,
      client_label: proposal.signature.clientLabel,
      date_label: 'Date',
    },
    warnings: [],
    executive_summary: `Objective: deliver ${proposal.jobType.toLowerCase()} with clear scope, controlled risk language, and structured payment milestones.`,
  };

  if (json.warranty_terms.length === 0) {
    json.warranty_terms = ['Workmanship warranty included per terms and conditions.'];
  }

  return enforceLegalProtection(json);
}

function cloneProposalJson(proposal: CpeProposalJson): CpeProposalJson {
  return JSON.parse(JSON.stringify(proposal)) as CpeProposalJson;
}

function isCpeProposalJson(value: unknown): value is CpeProposalJson {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proposal = value as Record<string, unknown>;
  if (typeof proposal.meta !== 'object' || proposal.meta === null) return false;
  if (typeof proposal.client !== 'object' || proposal.client === null) return false;
  if (typeof proposal.project !== 'object' || proposal.project === null) return false;
  if (!Array.isArray(proposal.sections)) return false;
  if (!Array.isArray(proposal.line_items)) return false;
  if (!Array.isArray(proposal.exclusions)) return false;
  if (!Array.isArray(proposal.assumptions)) return false;
  if (!Array.isArray(proposal.payment_schedule)) return false;
  if (typeof proposal.signature_block !== 'object' || proposal.signature_block === null) return false;
  return true;
}

function translatedGuardrails(language: ProposalLanguage): typeof LEGAL_GUARDRAILS {
  if (language === 'es') {
    return {
      terms: [
        'Cualquier solicitud fuera de alcance requiere aprobacion escrita de orden de cambio antes de ejecutar.',
        'La responsabilidad de permisos debe confirmarse antes del inicio; demoras de permisos afectan cronograma.',
      ],
      assumptions: [
        'Condiciones imprevistas del sitio pueden requerir ajustes de alcance y precio.',
        'El cronograma depende de materiales, inspecciones y aprobaciones del cliente.',
      ],
    };
  }
  if (language === 'it') {
    return {
      terms: [
        'Qualsiasi richiesta fuori ambito richiede ordine di variazione scritto prima dell esecuzione.',
        'La responsabilita dei permessi deve essere confermata prima dell avvio; ritardi permessi incidono sulla tempistica.',
      ],
      assumptions: [
        'Condizioni impreviste del sito possono richiedere adeguamenti di ambito e prezzo.',
        'La tempistica dipende da materiali, ispezioni e approvazioni del cliente.',
      ],
    };
  }
  return LEGAL_GUARDRAILS;
}

function enforceLegalProtection(proposal: CpeProposalJson): CpeProposalJson {
  const legal = translatedGuardrails(proposal.meta.language);
  const next: CpeProposalJson = {
    ...proposal,
    exclusions: uniqueList([...proposal.exclusions]),
    assumptions: uniqueList([...proposal.assumptions]),
    warranty_terms: uniqueList([...proposal.warranty_terms]),
    warnings: uniqueList([...proposal.warnings]),
  };

  next.assumptions = uniqueList([...next.assumptions, ...legal.assumptions]);
  next.warranty_terms = uniqueList([
    ...next.warranty_terms,
    ...legal.terms.filter((line) => /permit|permessi|permisos/i.test(line)),
  ]);

  const hasChangeOrderProtection = [...next.exclusions, ...next.assumptions].some((line) =>
    /change order|orden de cambio|variazione/i.test(line)
  );
  if (!hasChangeOrderProtection) {
    next.exclusions.push(legal.terms[0]);
  }

  const hasPermitProtection = [...next.exclusions, ...next.assumptions, ...next.warranty_terms].some((line) =>
    /permit|permiso|permessi/i.test(line)
  );
  if (!hasPermitProtection) {
    next.warranty_terms.push(legal.terms[1]);
  }

  const timelineText = `${next.timeline.summary} ${next.timeline.phases.map((phase) => phase.notes ?? '').join(' ')}`;
  if (!/material|inspection|approval|materiales|inspecciones|approvazioni/i.test(timelineText)) {
    next.timeline.summary = `${next.timeline.summary}. ${legal.assumptions[1]}`;
  }

  return {
    ...next,
    exclusions: uniqueList(next.exclusions),
    assumptions: uniqueList(next.assumptions),
    warranty_terms: uniqueList(next.warranty_terms),
  };
}

function translateProposalJson(proposal: CpeProposalJson, targetLanguage: ProposalLanguage): CpeProposalJson {
  if (targetLanguage === proposal.meta.language) {
    return enforceLegalProtection({
      ...proposal,
      warnings: uniqueList([...proposal.warnings, 'Translation skipped: source language already matches target.']),
    });
  }

  const translated: CpeProposalJson = {
    ...proposal,
    meta: {
      ...proposal.meta,
      language: targetLanguage,
      version: proposal.meta.version + 1,
      sourceMode: 'translate',
    },
    project: {
      ...proposal.project,
      summary: translateLine(proposal.project.summary, targetLanguage),
    },
    sections: proposal.sections.map((section) => ({
      ...section,
      title: translateLine(section.title, targetLanguage),
      items: section.items.map((item) => translateLine(item, targetLanguage)),
    })),
    line_items: proposal.line_items.map((item) => ({
      ...item,
      description: translateLine(item.description, targetLanguage),
    })),
    allowances: proposal.allowances.map((allowance) => ({
      ...allowance,
      description: translateLine(allowance.description, targetLanguage),
      notes: allowance.notes ? translateLine(allowance.notes, targetLanguage) : allowance.notes,
    })),
    exclusions: proposal.exclusions.map((line) => translateLine(line, targetLanguage)),
    assumptions: proposal.assumptions.map((line) => translateLine(line, targetLanguage)),
    timeline: {
      summary: translateLine(proposal.timeline.summary, targetLanguage),
      phases: proposal.timeline.phases.map((phase) => ({
        ...phase,
        name: translateLine(phase.name, targetLanguage),
        notes: phase.notes ? translateLine(phase.notes, targetLanguage) : phase.notes,
      })),
    },
    payment_schedule: proposal.payment_schedule.map((phase) => ({
      ...phase,
      label: translateLine(phase.label, targetLanguage),
    })),
    warranty_terms: proposal.warranty_terms.map((line) => translateLine(line, targetLanguage)),
    signature_block: {
      contractor_label: translateLine(proposal.signature_block.contractor_label, targetLanguage),
      client_label: translateLine(proposal.signature_block.client_label, targetLanguage),
      date_label: translateLine(proposal.signature_block.date_label, targetLanguage),
    },
    warnings: uniqueList([...proposal.warnings, `Translated to ${targetLanguage.toUpperCase()}.`]),
    executive_summary: proposal.executive_summary
      ? translateLine(proposal.executive_summary, targetLanguage)
      : proposal.executive_summary,
    missing_info_checklist: proposal.missing_info_checklist?.map((line) => translateLine(line, targetLanguage)),
  };

  return enforceLegalProtection(translated);
}

function refineProposalJson(
  proposal: CpeProposalJson,
  refinementType: ProposalRefinementType,
  goal: string,
  intake: Required<ProposalIntake>
): CpeProposalJson {
  const refined = cloneProposalJson(proposal);

  if (refinementType === 'executive_summary' || refinementType === 'clarity' || refinementType === 'persuasion') {
    refined.executive_summary = buildExecutiveSummary(refined, goal, refinementType);
  }

  if (refinementType === 'clarity' || refinementType === 'persuasion') {
    refined.sections = refined.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => normalizeSentence(item)),
    }));
  }

  if (refinementType === 'scope_tightening') {
    refined.exclusions = uniqueList([
      ...refined.exclusions,
      `Scope is limited to ${intake.jobType}; additional requests require approved change order.`,
      'Any allowance overages require written approval before procurement.',
    ]);
    refined.assumptions = uniqueList([
      ...refined.assumptions,
      'Client-provided selections and approvals affect schedule and final cost.',
    ]);
  }

  if (refinementType === 'missing_info') {
    const checklist = deriveMissingInfoChecklist(refined, intake);
    refined.missing_info_checklist = checklist;
    refined.warnings = uniqueList([...refined.warnings, `Missing info checklist generated (${checklist.length}).`]);
  }

  refined.meta.sourceMode = 'refine';
  refined.meta.version += 1;
  refined.warnings = uniqueList([...refined.warnings, `Refinement applied: ${refinementType}.`]);
  return enforceLegalProtection(refined);
}

function evaluateProposalQa(proposal: CpeProposalJson, intake: Required<ProposalIntake>): ProposalQaReport {
  const missingInfo = deriveMissingInfoChecklist(proposal, intake);
  const riskFlags: string[] = [];

  if (proposal.line_items.length === 0) {
    riskFlags.push('No pricing line items were found in proposal_json.');
  }
  if (proposal.payment_schedule.length === 0) {
    riskFlags.push('No payment schedule entries were found.');
  }
  if (proposal.exclusions.length < 2) {
    riskFlags.push('Exclusions are too short for construction risk control.');
  }
  if (proposal.assumptions.length < 2) {
    riskFlags.push('Assumptions section is too short; add site dependency notes.');
  }
  if (proposal.meta.tradeProfile === 'renovation' && !proposal.exclusions.some((line) => /allowance/i.test(line))) {
    riskFlags.push('Renovation profile should include allowance-related exclusion language.');
  }
  if (!/permit|inspection|permiso|permessi/i.test(`${proposal.assumptions.join(' ')} ${proposal.warranty_terms.join(' ')}`)) {
    riskFlags.push('Permit/inspection responsibility clause is missing.');
  }

  return {
    missingInfo,
    riskFlags: uniqueList(riskFlags),
  };
}

function deriveMissingInfoChecklist(proposal: CpeProposalJson, intake: Required<ProposalIntake>): string[] {
  const checklist: string[] = [];
  if (!proposal.client.name.trim()) {
    checklist.push('Client name is missing.');
  }
  if (!proposal.project.jobType.trim()) {
    checklist.push('Job type is missing.');
  }
  if (intake.squareFootage <= 0 && intake.units <= 0) {
    checklist.push('Square footage or unit count should be provided.');
  }
  if (proposal.line_items.some((line) => line.qty <= 0 || line.total <= 0)) {
    checklist.push('At least one line item has invalid quantity or total.');
  }
  if (!proposal.timeline.summary.trim()) {
    checklist.push('Timeline summary is missing.');
  }
  if (!proposal.signature_block.contractor_label.trim() || !proposal.signature_block.client_label.trim()) {
    checklist.push('Signature labels are incomplete.');
  }
  if (proposal.meta.tradeProfile === 'hvac' && !containsAnyText(proposal.sections, ['seer', 'duct', 'equipment'])) {
    checklist.push('HVAC proposal should confirm equipment/duct assumptions.');
  }
  if (proposal.meta.tradeProfile === 'plumbing' && !containsAnyText(proposal.assumptions, ['existing', 'wall', 'condition'])) {
    checklist.push('Plumbing proposal should mention hidden existing condition risk.');
  }
  if (proposal.meta.tradeProfile === 'electrical' && !containsAnyText(proposal.sections, ['panel', 'inspection', 'load'])) {
    checklist.push('Electrical proposal should include panel/load/inspection references.');
  }
  if (proposal.meta.tradeProfile === 'renovation' && !containsAnyText(proposal.sections, ['demolition', 'allowance', 'room'])) {
    checklist.push('Renovation proposal should include demolition or room-by-room/allowance structure.');
  }

  return uniqueList(checklist);
}

function containsAnyText(
  source: Array<{ title?: string; items?: string[] }> | string[],
  terms: string[]
): boolean {
  const text =
    typeof source[0] === 'string'
      ? (source as string[]).join(' ').toLowerCase()
      : (source as Array<{ title?: string; items?: string[] }>)
          .map((item) => `${item.title ?? ''} ${(item.items ?? []).join(' ')}`)
          .join(' ')
          .toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function buildExecutiveSummary(
  proposal: CpeProposalJson,
  goal: string,
  refinementType: ProposalRefinementType
): string {
  const base =
    `This ${proposal.meta.tradeProfile} proposal delivers ${proposal.project.jobType.toLowerCase()} ` +
    `with structured scope, controlled exclusions, and clear payment milestones.`;
  if (refinementType === 'persuasion') {
    return `${base} It is designed to improve client confidence and reduce approval friction while protecting project margin.`;
  }
  if (refinementType === 'executive_summary') {
    return `${base} Goal alignment: ${goal}.`;
  }
  return `${base} Goal alignment: ${goal}.`;
}

function normalizeSentence(text: string): string {
  const value = text.trim();
  if (!value) return value;
  const withPeriod = /[.!?]$/.test(value) ? value : `${value}.`;
  return withPeriod[0].toUpperCase() + withPeriod.slice(1);
}

function translateLine(text: string, language: ProposalLanguage): string {
  if (language === 'en') {
    return text;
  }

  const lookup = TRANSLATION_DICTIONARY[language];
  const exact = lookup[text.trim().toLowerCase()];
  if (exact) {
    return exact;
  }

  let translated = text;
  for (const [source, target] of Object.entries(lookup)) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    translated = translated.replace(new RegExp(escaped, 'gi'), target);
  }
  return translated;
}

const TRANSLATION_DICTIONARY: Record<Exclude<ProposalLanguage, 'en'>, Record<string, string>> = {
  es: {
    "deposit": 'Deposito',
    "progress": 'Avance',
    "completion": 'Finalizacion',
    "contractor signature": 'Firma del contratista',
    "client signature": 'Firma del cliente',
    "date": 'Fecha',
    "site preparation": 'Preparacion del sitio',
    "installation scope": 'Alcance de instalacion',
    "closeout": 'Cierre',
    "room-by-room scope": 'Alcance por habitacion',
    "demolition and build": 'Demolicion y construccion',
    "allowances and closeout": 'Asignaciones y cierre',
    "load and panel assessment": 'Evaluacion de carga y panel',
    "inspection and handover": 'Inspeccion y entrega',
    "assumptions": 'Supuestos',
    "exclusions": 'Exclusiones',
    "permit": 'permiso',
    "change order": 'orden de cambio',
    "timeline": 'cronograma',
    "warranty": 'garantia',
  },
  it: {
    "deposit": 'Acconto',
    "progress": 'Avanzamento',
    "completion": 'Completamento',
    "contractor signature": 'Firma appaltatore',
    "client signature": 'Firma cliente',
    "date": 'Data',
    "site preparation": 'Preparazione cantiere',
    "installation scope": 'Ambito installazione',
    "closeout": 'Chiusura',
    "room-by-room scope": 'Ambito stanza per stanza',
    "demolition and build": 'Demolizione e costruzione',
    "allowances and closeout": 'Voci in allowance e chiusura',
    "load and panel assessment": 'Valutazione carico e quadro',
    "inspection and handover": 'Ispezione e consegna',
    "assumptions": 'Assunzioni',
    "exclusions": 'Esclusioni',
    "permit": 'permesso',
    "change order": 'variazione',
    "timeline": 'tempistica',
    "warranty": 'garanzia',
  },
};

function normalizeIntake(input?: ProposalIntake): Required<ProposalIntake> {
  const jobType = input?.jobType?.trim() || DEFAULT_JOB_TYPE;
  const trade = toCanonicalTrade(input?.trade ?? inferTrade(jobType));
  return {
    clientName: input?.clientName?.trim() || DEFAULT_CLIENT_NAME,
    jobType,
    trade,
    squareFootage: Math.max(0, Number(input?.squareFootage ?? 0)),
    units: Math.max(0, Number(input?.units ?? 0)),
    materials: normalizeList(input?.materials),
    timeline: input?.timeline?.trim() || 'To be scheduled',
    specialConditions: normalizeList(input?.specialConditions),
    tone: input?.tone ?? 'formal',
    includePricing: input?.includePricing ?? true,
    currency: input?.currency?.trim() || DEFAULT_CURRENCY,
  };
}

function inferTrade(jobType: string): ProposalTrade {
  const value = jobType.toLowerCase();
  if (/\bhvac|furnace|ac|duct\b/.test(value)) return 'hvac';
  if (/\bplumb|pipe|drain|water heater\b/.test(value)) return 'plumbing';
  if (/\belectrical|panel|wiring|breaker\b/.test(value)) return 'electrical';
  if (/\bremodel|renovation|kitchen|bathroom|apartment\b/.test(value)) return 'renovation';
  return 'renovation';
}

function toCanonicalTrade(trade: ProposalTrade): CanonicalProposalTrade {
  if (trade === 'general-contractor' || trade === 'remodeling') {
    return 'renovation';
  }
  return trade;
}

function createLineItem(description: string, quantity: number, unit: string, unitPrice: number): ProposalLineItem {
  const safeQty = roundMoney(quantity);
  const safeUnitPrice = roundMoney(unitPrice);
  return {
    id: generateLineItemId(),
    description,
    quantity: safeQty,
    unit,
    unitPrice: safeUnitPrice,
    amount: roundMoney(safeQty * safeUnitPrice),
  };
}

function resolveQuantitySource(
  source: TradeProfile['lineItemTemplates'][number]['quantitySource'],
  quantities: {
    qtySqFt: number;
    qtyUnits: number;
    materialCount: number;
    fixedQuantity?: number;
  }
): number {
  if (source === 'fixed') {
    return quantities.fixedQuantity ?? 1;
  }
  if (source === 'sqft') {
    return quantities.qtySqFt || 1;
  }
  if (source === 'unit') {
    return quantities.qtyUnits;
  }
  return quantities.materialCount;
}

function normalizeList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateProposalId(): string {
  return `proposal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLineItemId(): string {
  return `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'proposal';
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}
