import { buildDeterministicProposal, roundCurrency } from "@nss/proposal-core";
import type { CpeStructuredIntake, ContractorTradeProfile } from "../types/cpe";
import type {
  ClientProfile,
  ContractorProfile,
  GeminiDraft,
  ProposalData,
  ProposalSettings,
  SupportedLanguage
} from "../types/proposal";

type ProjectSize = "small" | "medium" | "large";

interface CostTemplate {
  description: string;
  base: number;
  perSqFt?: number;
  perUnit?: number;
}

interface TradeBlueprint {
  displayName: string;
  unitLabel: string;
  jobTypes: Record<ProjectSize, string[]>;
  areaRanges: Record<ProjectSize, [number, number]>;
  unitRanges: Record<ProjectSize, [number, number]>;
  timelineRanges: Record<ProjectSize, [number, number]>;
  taxRateRange: [number, number];
  contingencyRateRange: [number, number];
  depositRateRange: [number, number];
  validityDaysRange: [number, number];
  includePermitProbability: number;
  materials: string[];
  laborSteps: string[];
  allowanceLabels: string[];
  specialNotes: string[];
  assumptions: string[];
  exclusions: string[];
  terms: string[];
  lineItems: CostTemplate[];
}

interface MockProposalOptions {
  language: SupportedLanguage;
  tradeProfile?: ContractorTradeProfile;
  size?: ProjectSize;
}

export interface MockProposalBundle {
  description: string;
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  cpeIntake: CpeStructuredIntake;
  proposal: ProposalData;
  size: ProjectSize;
  tradeProfile: ContractorTradeProfile;
}

const SIZE_MULTIPLIER: Record<ProjectSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.35
};

const PRICE_SCALE_BY_TRADE: Record<
  ContractorTradeProfile,
  Record<ProjectSize, number>
> = {
  hvac: {
    small: 2.4,
    medium: 3.2,
    large: 4.8
  },
  plumbing: {
    small: 2.3,
    medium: 3.1,
    large: 4.6
  },
  electrical: {
    small: 2.4,
    medium: 3.3,
    large: 4.9
  },
  renovation: {
    small: 3.1,
    medium: 5.6,
    large: 8.8
  }
};

const TRADE_PROFILES: ContractorTradeProfile[] = [
  "renovation",
  "hvac",
  "plumbing",
  "electrical"
];

const COMPANY_PREFIXES = [
  "Summit",
  "Northline",
  "Metro",
  "Cobalt",
  "Evergreen",
  "Precision",
  "Atlas"
];

const CONTACT_FIRST_NAMES = [
  "Jordan",
  "Alex",
  "Taylor",
  "Morgan",
  "Riley",
  "Cameron",
  "Casey"
];

const CONTACT_LAST_NAMES = [
  "Martinez",
  "Rivera",
  "Nguyen",
  "Lopez",
  "Bennett",
  "Garcia",
  "Harris"
];

const ADDRESS_POOL = [
  { city: "Denver", state: "CO", zip: "80202", street: "Main St" },
  { city: "Phoenix", state: "AZ", zip: "85004", street: "Roosevelt St" },
  { city: "Austin", state: "TX", zip: "78701", street: "Congress Ave" },
  { city: "Orlando", state: "FL", zip: "32801", street: "Orange Ave" },
  { city: "Nashville", state: "TN", zip: "37203", street: "Demonbreun St" },
  { city: "Charlotte", state: "NC", zip: "28202", street: "Tryon St" }
];

const TRADE_BLUEPRINTS: Record<ContractorTradeProfile, TradeBlueprint> = {
  hvac: {
    displayName: "HVAC",
    unitLabel: "system(s)",
    jobTypes: {
      small: [
        "Single-zone heat pump replacement",
        "Condenser and air-handler swap"
      ],
      medium: [
        "Multi-zone mini-split installation",
        "Dual-system HVAC replacement"
      ],
      large: [
        "Whole-property HVAC modernization",
        "Large apartment HVAC and controls retrofit"
      ]
    },
    areaRanges: {
      small: [650, 1200],
      medium: [1200, 2600],
      large: [2600, 4800]
    },
    unitRanges: {
      small: [1, 1],
      medium: [2, 3],
      large: [3, 6]
    },
    timelineRanges: {
      small: [5, 14],
      medium: [14, 35],
      large: [35, 85]
    },
    taxRateRange: [6.2, 9.2],
    contingencyRateRange: [6.5, 12.5],
    depositRateRange: [30, 45],
    validityDaysRange: [14, 30],
    includePermitProbability: 0.92,
    materials: [
      "High-efficiency heat pump condenser",
      "Matching indoor air handler",
      "Programmable thermostat",
      "Refrigerant line set",
      "Condensate drain assembly",
      "Filter rack and start-up kit"
    ],
    laborSteps: [
      "Recover refrigerant and remove old equipment",
      "Set and secure new outdoor and indoor units",
      "Install, braze, and pressure test line sets",
      "Evacuate and charge system per manufacturer spec",
      "Balance airflow and commission controls"
    ],
    allowanceLabels: [
      "Permit and inspection allowance",
      "Electrical disconnect allowance",
      "Duct sealing allowance"
    ],
    specialNotes: [
      "System startup date depends on equipment lead times.",
      "Existing duct leakage beyond visible access is excluded.",
      "Tenant comfort scheduling windows required."
    ],
    assumptions: [
      "Existing power service is sufficient for selected equipment.",
      "Equipment placement has clear access for crane or lift as needed.",
      "Duct trunks are serviceable unless defects are discovered."
    ],
    exclusions: [
      "Major structural framing revisions for equipment placement.",
      "Utility service upgrades not listed in line items.",
      "Asbestos abatement or environmental remediation."
    ],
    terms: [
      "Refrigerant handling follows EPA and local code requirements.",
      "Permit closeout milestones may affect completion date.",
      "Any added zones or control devices require written change order."
    ],
    lineItems: [
      { description: "Equipment procurement and delivery", base: 1450, perUnit: 2400, perSqFt: 0.42 },
      { description: "Removal and compliant refrigerant recovery", base: 520, perUnit: 360, perSqFt: 0.16 },
      { description: "Line-set, drain, and controls installation", base: 980, perUnit: 680, perSqFt: 0.34 },
      { description: "Ductwork sealing and airflow balancing", base: 560, perUnit: 250, perSqFt: 0.44 },
      { description: "Startup commissioning and verification", base: 420, perUnit: 180, perSqFt: 0.14 }
    ]
  },
  plumbing: {
    displayName: "Plumbing",
    unitLabel: "fixture point(s)",
    jobTypes: {
      small: [
        "Bathroom fixture and valve replacement",
        "Kitchen and bath plumbing refresh"
      ],
      medium: [
        "Multi-room drain and supply rework",
        "Apartment stack and fixture modernization"
      ],
      large: [
        "Whole-building domestic water retrofit",
        "Large apartment plumbing system replacement"
      ]
    },
    areaRanges: {
      small: [150, 600],
      medium: [600, 1800],
      large: [1800, 3600]
    },
    unitRanges: {
      small: [2, 7],
      medium: [7, 16],
      large: [16, 34]
    },
    timelineRanges: {
      small: [4, 12],
      medium: [12, 34],
      large: [34, 90]
    },
    taxRateRange: [5.9, 9.1],
    contingencyRateRange: [7.5, 14],
    depositRateRange: [25, 40],
    validityDaysRange: [15, 30],
    includePermitProbability: 0.74,
    materials: [
      "Type L copper and PEX runs",
      "Quarter-turn shutoff valves",
      "Trap and vent fittings",
      "Fixture supply kits",
      "Pressure test and leak-check consumables"
    ],
    laborSteps: [
      "Isolate and drain affected plumbing zones",
      "Open access points and remove failed piping",
      "Install new supply and drain assemblies",
      "Reset fixtures and trim connections",
      "Pressure test, flush, and final leak check"
    ],
    allowanceLabels: [
      "Fixture finish allowance",
      "Drywall patch allowance",
      "Code upgrade allowance"
    ],
    specialNotes: [
      "Hidden wall conditions cannot be confirmed until demolition.",
      "Water shutoff coordination with property management is required.",
      "Final fixture model numbers must be approved before rough-in."
    ],
    assumptions: [
      "Main building shutoff and access are available during work hours.",
      "Existing drain routing is code-compliant unless noted otherwise.",
      "Owner-selected fixtures are available before trim phase."
    ],
    exclusions: [
      "Major concrete cutting beyond listed scope.",
      "Mold or water-damage remediation outside direct work area.",
      "Building-wide recirculation redesign."
    ],
    terms: [
      "Pressure test documentation will be provided at closeout.",
      "Code-required corrections identified by inspector are billable changes.",
      "Additional fixture relocations require signed change order."
    ],
    lineItems: [
      { description: "Access prep and selective demolition", base: 460, perUnit: 120, perSqFt: 0.22 },
      { description: "Supply and drain rough-in modifications", base: 980, perUnit: 340, perSqFt: 0.38 },
      { description: "Fixture setting and trim-out", base: 780, perUnit: 290, perSqFt: 0.14 },
      { description: "Pressure testing and code compliance", base: 320, perUnit: 95, perSqFt: 0.1 },
      { description: "Patch-back and final cleanup", base: 260, perUnit: 55, perSqFt: 0.16 }
    ]
  },
  electrical: {
    displayName: "Electrical",
    unitLabel: "device/circuit point(s)",
    jobTypes: {
      small: [
        "Panel tune-up and selective circuit additions",
        "Kitchen and bath electrical upgrade"
      ],
      medium: [
        "Subpanel and branch-circuit modernization",
        "Apartment electrical device replacement package"
      ],
      large: [
        "Full-service panel and wiring retrofit",
        "Multi-unit electrical system upgrade"
      ]
    },
    areaRanges: {
      small: [250, 900],
      medium: [900, 2400],
      large: [2400, 4200]
    },
    unitRanges: {
      small: [10, 24],
      medium: [24, 64],
      large: [64, 150]
    },
    timelineRanges: {
      small: [5, 14],
      medium: [14, 40],
      large: [40, 100]
    },
    taxRateRange: [6.1, 9.4],
    contingencyRateRange: [7, 13.5],
    depositRateRange: [25, 40],
    validityDaysRange: [14, 28],
    includePermitProbability: 0.95,
    materials: [
      "Breaker and panel hardware",
      "Copper THHN conductors",
      "Arc-fault and GFCI protective devices",
      "Switch and receptacle devices",
      "Labeling and test consumables"
    ],
    laborSteps: [
      "Perform load calculations and panel evaluation",
      "Install panel components and overcurrent protection",
      "Run branch wiring and device terminations",
      "Coordinate permit rough and final inspections",
      "Test, label, and document all installed circuits"
    ],
    allowanceLabels: [
      "Permit allowance",
      "Device finish allowance",
      "Panel accessories allowance"
    ],
    specialNotes: [
      "Service interruptions will be scheduled with occupants.",
      "Circuit counts are based on visible field conditions.",
      "Inspection availability can affect final completion date."
    ],
    assumptions: [
      "Existing service entrance equipment is structurally sound.",
      "Utility coordination is limited to normal service window.",
      "Existing concealed wiring is assumed compliant unless discovered otherwise."
    ],
    exclusions: [
      "Utility transformer or meter-base replacement.",
      "Low-voltage integration outside listed scope.",
      "Fire alarm system redesign."
    ],
    terms: [
      "Load calculations and as-built labels are included at closeout.",
      "Inspector-mandated modifications beyond scope are change-order work.",
      "Additional circuits or device counts require written approval."
    ],
    lineItems: [
      { description: "Load calculation and panel planning", base: 620, perUnit: 38, perSqFt: 0.18 },
      { description: "Panel hardware and protection upgrades", base: 1100, perUnit: 34, perSqFt: 0.31 },
      { description: "Branch wiring and device installation", base: 900, perUnit: 42, perSqFt: 0.36 },
      { description: "Permit, inspection, and compliance coordination", base: 480, perUnit: 12, perSqFt: 0.12 },
      { description: "Testing, labeling, and turnover package", base: 360, perUnit: 10, perSqFt: 0.08 }
    ]
  },
  renovation: {
    displayName: "General Renovation",
    unitLabel: "room zone(s)",
    jobTypes: {
      small: [
        "Single-room apartment refresh",
        "Kitchen backsplash and paint refresh"
      ],
      medium: [
        "Apartment kitchen and bath renovation",
        "Multi-room flooring and finish renovation"
      ],
      large: [
        "Full apartment interior renovation",
        "Large multi-room remodel with finish package"
      ]
    },
    areaRanges: {
      small: [120, 500],
      medium: [500, 1300],
      large: [1300, 2900]
    },
    unitRanges: {
      small: [1, 2],
      medium: [2, 5],
      large: [5, 10]
    },
    timelineRanges: {
      small: [7, 21],
      medium: [21, 65],
      large: [65, 150]
    },
    taxRateRange: [6.2, 9.3],
    contingencyRateRange: [8, 14],
    depositRateRange: [25, 35],
    validityDaysRange: [14, 30],
    includePermitProbability: 0.58,
    materials: [
      "Primer and paint package",
      "Tile and grout system",
      "Cabinet hardware set",
      "Finish carpentry consumables",
      "Flooring transition and trim package"
    ],
    laborSteps: [
      "Site protection, setup, and selective demolition",
      "Substrate prep and framing/drywall repairs",
      "Install finishes including tile, flooring, and paint",
      "Punch-list corrections and quality-control walk",
      "Final clean and handoff documentation"
    ],
    allowanceLabels: [
      "Tile allowance",
      "Cabinet hardware allowance",
      "Appliance hookup allowance"
    ],
    specialNotes: [
      "Building work-hour restrictions apply.",
      "Change orders required for owner-requested scope expansion.",
      "Material lead times may affect phase sequencing."
    ],
    assumptions: [
      "Existing concealed conditions are unknown before demolition.",
      "Building management provides access and staging approvals.",
      "Owner finalizes finish selections before procurement cutoff."
    ],
    exclusions: [
      "Structural engineering and major load-bearing alterations.",
      "Abatement and hazardous material remediation.",
      "Specialty custom fabrication not listed in estimate."
    ],
    terms: [
      "Room-by-room completion sequence will be documented before start.",
      "Allowance overages are billed at actual cost plus handling.",
      "Scope additions proceed only with signed change order."
    ],
    lineItems: [
      { description: "Site setup and selective demolition", base: 700, perUnit: 220, perSqFt: 0.55 },
      { description: "Framing, drywall, and substrate preparation", base: 860, perUnit: 180, perSqFt: 0.62 },
      { description: "Finish installation and material handling", base: 1180, perUnit: 260, perSqFt: 0.78 },
      { description: "Paint, trim, and detail carpentry", base: 760, perUnit: 140, perSqFt: 0.41 },
      { description: "Punch-list completion and final cleanup", base: 420, perUnit: 80, perSqFt: 0.22 }
    ]
  }
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number): number => min + Math.random() * (max - min);

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;

const pickOne = <T,>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

const pickMany = <T,>(items: readonly T[], min: number, max: number): T[] => {
  const target = randomInt(min, Math.min(max, items.length));
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy.slice(0, target);
};

const pickRangeInt = (range: [number, number]): number => randomInt(range[0], range[1]);

const randomSize = (): ProjectSize => {
  const roll = Math.random();
  if (roll < 0.34) {
    return "small";
  }
  if (roll < 0.74) {
    return "medium";
  }
  return "large";
};

const normalizeTrade = (tradeProfile?: ContractorTradeProfile): ContractorTradeProfile =>
  tradeProfile ?? pickOne(TRADE_PROFILES);

const buildContractorProfile = (trade: ContractorTradeProfile): ContractorProfile => {
  const tradeSuffix: Record<ContractorTradeProfile, string> = {
    hvac: "Mechanical Group",
    plumbing: "Plumbing Services",
    electrical: "Electric Solutions",
    renovation: "Renovation Studio"
  };
  const city = pickOne(ADDRESS_POOL);
  const firstName = pickOne(CONTACT_FIRST_NAMES);
  const lastName = pickOne(CONTACT_LAST_NAMES);
  return {
    companyName: `${pickOne(COMPANY_PREFIXES)} ${tradeSuffix[trade]}`,
    contactName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@northstep.local`,
    phone: `(555) 01${randomInt(0, 9)}-${randomInt(1000, 9999)}`,
    licenseNumber: `${city.state}-LIC-${randomInt(100000, 999999)}`
  };
};

const buildClientProfile = (): ClientProfile => {
  const firstName = pickOne(CONTACT_FIRST_NAMES);
  const lastName = pickOne(CONTACT_LAST_NAMES);
  const address = pickOne(ADDRESS_POOL);
  return {
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@clientmail.com`,
    phone: `(555) 02${randomInt(0, 9)}-${randomInt(1000, 9999)}`,
    address: `${randomInt(100, 1899)} ${address.street}, ${address.city}, ${address.state} ${address.zip}`
  };
};

const buildLineItems = (
  blueprint: TradeBlueprint,
  trade: ContractorTradeProfile,
  area: number,
  units: number,
  size: ProjectSize,
  jobType: string,
  materials: string[],
  labor: string[]
): GeminiDraft["lineItems"] => {
  const sizeMultiplier = SIZE_MULTIPLIER[size];
  const tradeScale = PRICE_SCALE_BY_TRADE[trade][size];
  const items = blueprint.lineItems.map((line) => {
    const rawAmount =
      (line.base + area * (line.perSqFt ?? 0) + units * (line.perUnit ?? 0)) *
      sizeMultiplier *
      tradeScale *
      randomFloat(0.95, 1.1);

    return {
      description: line.description,
      amount: Math.max(450, roundCurrency(rawAmount))
    };
  });

  const scopeCorpus = [jobType, ...materials, ...labor].join(" ").toLowerCase();
  const hasMillworkScope = /(millwork|cabinet|trim carpentry|built-?in|woodwork|finish carpentry)/.test(
    scopeCorpus
  );
  const shouldAddMillwork =
    trade === "renovation" && (hasMillworkScope || size === "large" || Math.random() < 0.35);

  if (shouldAddMillwork) {
    const minBySize: Record<ProjectSize, number> = {
      small: 4500,
      medium: 12000,
      large: 28000
    };
    const rawAmount =
      (1650 + area * 1.35 + units * 520) *
      sizeMultiplier *
      tradeScale *
      randomFloat(0.94, 1.1);
    items.push({
      description: "Millwork fabrication and finish carpentry package",
      amount: Math.max(minBySize[size], roundCurrency(rawAmount))
    });
  }

  return items;
};

const buildSettings = (
  blueprint: TradeBlueprint,
  size: ProjectSize,
  timelineDays: number
): ProposalSettings => {
  const permitBoost = size === "large" ? 0.12 : size === "medium" ? 0.04 : 0;
  const includePermitAllowance =
    Math.random() < Math.min(0.98, blueprint.includePermitProbability + permitBoost);

  return {
    taxRate: oneDecimal(randomFloat(blueprint.taxRateRange[0], blueprint.taxRateRange[1])),
    contingencyRate: oneDecimal(
      randomFloat(
        blueprint.contingencyRateRange[0],
        blueprint.contingencyRateRange[1]
      )
    ),
    depositRate: randomInt(
      Math.round(blueprint.depositRateRange[0]),
      Math.round(blueprint.depositRateRange[1])
    ),
    timelineDays,
    validityDays: pickRangeInt(blueprint.validityDaysRange),
    includePermitAllowance
  };
};

const buildAllowances = (blueprint: TradeBlueprint, size: ProjectSize): string[] => {
  const sizeFactor = size === "small" ? 1 : size === "medium" ? 1.35 : 1.8;
  return pickMany(blueprint.allowanceLabels, 2, 3).map((label) => {
    const amount = roundCurrency(randomFloat(220, 920) * sizeFactor);
    return `${label}: $${amount}`;
  });
};

const buildDescription = (
  blueprint: TradeBlueprint,
  jobType: string,
  area: number,
  units: number,
  materials: string[],
  labor: string[],
  includeMillwork: boolean
): string =>
  `${jobType} covering approximately ${area} sq ft with ${units} ${blueprint.unitLabel}. Materials include ${materials
    .slice(0, 3)
    .join(", ")}. Scope includes ${labor.slice(0, 3).join(", ")} with code-compliant closeout and cleanup.${
    includeMillwork ? " Includes millwork/cabinet fabrication and installation scope." : ""
  }`;

const ensureProposalDataIntegrity = (proposal: ProposalData): void => {
  const subtotal = proposal.quote.items.reduce((sum, item) => sum + item.amount, 0);
  if (subtotal !== proposal.quote.subtotal) {
    throw new Error("Mock proposal subtotal mismatch.");
  }

  const expectedTotal =
    proposal.quote.subtotal + proposal.quote.contingencyAmount + proposal.quote.taxAmount;
  if (expectedTotal !== proposal.quote.total) {
    throw new Error("Mock proposal total mismatch.");
  }

  const paymentTotal = proposal.paymentSchedule.reduce((sum, item) => sum + item.amount, 0);
  if (paymentTotal !== proposal.quote.total) {
    throw new Error("Mock proposal payment schedule mismatch.");
  }

  const percentTotal = proposal.paymentSchedule.reduce(
    (sum, item) => sum + item.percentage,
    0
  );
  if (percentTotal !== 100) {
    throw new Error("Mock proposal payment percentages do not sum to 100.");
  }

  const invalidLine = proposal.quote.items.some(
    (item) => !item.description.trim() || !Number.isFinite(item.amount) || item.amount <= 0
  );
  if (invalidLine) {
    throw new Error("Mock proposal contains invalid line items.");
  }
};

const ensureTimelinePlausibility = (size: ProjectSize, timelineDays: number): void => {
  const minimumBySize: Record<ProjectSize, number> = {
    small: 4,
    medium: 12,
    large: 30
  };
  if (timelineDays < minimumBySize[size]) {
    throw new Error(`Mock timeline is not plausible for a ${size} project.`);
  }
};

const buildStructuredIntake = (
  trade: ContractorTradeProfile,
  jobType: string,
  area: number,
  units: number,
  materials: string[],
  laborScope: string[],
  allowances: string[],
  timelineDays: number,
  specialNotes: string[]
): CpeStructuredIntake => ({
  tradeProfile: trade,
  projectInfo: {
    jobType,
    squareFootage: area,
    units
  },
  materialsEquipment: materials.join("\n"),
  laborScope: laborScope.join("\n"),
  allowances: allowances.join("\n"),
  timelineNotes: `Estimated ${timelineDays} working day(s), subject to material and inspection timing.`,
  specialNotes: specialNotes.join(" ")
});

const buildGeminiDraft = (
  blueprint: TradeBlueprint,
  jobType: string,
  area: number,
  units: number,
  lineItems: GeminiDraft["lineItems"],
  timelineDays: number,
  validityDays: number,
  includeMillwork: boolean
): GeminiDraft => ({
  projectType: blueprint.displayName,
  estimatedArea: area,
  lineItems,
  contractSummary:
    `Scope includes ${jobType.toLowerCase()} with itemized pricing, sequencing, and closeout requirements. ` +
    "Any unforeseen conditions or owner-requested additions require signed change-order approval before extra work begins.",
  assumptions: [
    ...blueprint.assumptions,
    `Field estimate is based on approximately ${area} sq ft and ${units} ${blueprint.unitLabel}.`
  ],
  inclusions: includeMillwork
    ? [
        ...blueprint.laborSteps,
        "Millwork/cabinet installation with field fit adjustments"
      ]
    : [...blueprint.laborSteps],
  exclusions: [...blueprint.exclusions],
  notesToClient: [
    `Estimated active construction duration is ${timelineDays} day(s).`,
    `Proposal pricing remains valid for ${validityDays} day(s).`,
    "Final schedule is confirmed after procurement and permit release."
  ],
  terms: [...blueprint.terms]
});

export const createRandomMockProposalBundle = (
  options: MockProposalOptions
): MockProposalBundle => {
  const tradeProfile = normalizeTrade(options.tradeProfile);
  const size = options.size ?? randomSize();
  const blueprint = TRADE_BLUEPRINTS[tradeProfile];

  const area = pickRangeInt(blueprint.areaRanges[size]);
  const units = pickRangeInt(blueprint.unitRanges[size]);
  const timelineDays = pickRangeInt(blueprint.timelineRanges[size]);
  ensureTimelinePlausibility(size, timelineDays);
  const jobType = pickOne(blueprint.jobTypes[size]);

  const materials = pickMany(blueprint.materials, 3, 5);
  const labor = pickMany(blueprint.laborSteps, 4, 5);
  const allowances = buildAllowances(blueprint, size);
  const specialNotes = pickMany(blueprint.specialNotes, 2, 3);

  const contractor = buildContractorProfile(tradeProfile);
  const client = buildClientProfile();
  const settings = buildSettings(blueprint, size, timelineDays);
  const lineItems = buildLineItems(
    blueprint,
    tradeProfile,
    area,
    units,
    size,
    jobType,
    materials,
    labor
  );
  const includeMillwork = lineItems.some((item) =>
    /millwork|cabinet|carpentry/i.test(item.description)
  );
  const description = buildDescription(
    blueprint,
    jobType,
    area,
    units,
    materials,
    labor,
    includeMillwork
  );
  const cpeIntake = buildStructuredIntake(
    tradeProfile,
    jobType,
    area,
    units,
    materials,
    labor,
    allowances,
    timelineDays,
    specialNotes
  );

  const geminiDraft = buildGeminiDraft(
    blueprint,
    jobType,
    area,
    units,
    lineItems,
    timelineDays,
    settings.validityDays,
    includeMillwork
  );

  const proposal = buildDeterministicProposal({
    description,
    photoCount: randomInt(0, 3),
    contractor,
    client,
    settings,
    intel: null,
    geminiDraft,
    language: options.language,
    platform: "web"
  });

  ensureProposalDataIntegrity(proposal);

  return {
    description,
    contractor,
    client,
    settings,
    cpeIntake,
    proposal,
    size,
    tradeProfile
  };
};
