import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Dices, Eraser, Sparkles } from "lucide-react";
import { useTranslation } from "@nss/proposal-i18n";
import {
  appendHistoryEntry,
  buildHistoryEntry,
  deriveHistorySignals,
  estimateTimelineDays,
  recalculateProposalFromItems,
  roundCurrency
} from "@nss/proposal-core";
import { i18n } from "@nss/proposal-i18n";
import {
  cssVariablesFromTokens,
  resolveThemeMode,
  tokensForResolvedTheme
} from "@nss/proposal-theme";
import Header from "./components/Header";
import UploadSection from "./components/UploadSection";
import DescriptionInput from "./components/DescriptionInput";
import ProposalView from "./components/ProposalView";
import ProposalGenerator from "./components/ProposalGenerator";
import ProjectDetailsPanel from "./components/ProjectDetailsPanel";
import ProposalIntelPanel from "./components/ProposalIntelPanel";
import LocalHistoryPanel from "./components/LocalHistoryPanel";
import { fetchRemoteConfig } from "./services/api";
import { createRandomMockProposalBundle } from "./services/mockProposal";
import {
  AppPreferences,
  ClientProfile,
  ContractorProfile,
  EntitlementState,
  LocalHistoryEntry,
  ProposalData,
  ProposalIntel,
  ProposalSettings,
  SupportedLanguage,
  ThemeMode
} from "./types/proposal";
import type { CpeStructuredIntake } from "./types/cpe";

interface PersistedDraft {
  description: string;
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  cpeIntake: CpeStructuredIntake;
  intel: ProposalIntel | null;
  proposal: ProposalData | null;
  preferences: AppPreferences;
  historyEntries: LocalHistoryEntry[];
}

const STORAGE_KEY = "ai-proposal-generator:draft:v3";

const DEFAULT_CONTRACTOR: ContractorProfile = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  licenseNumber: ""
};

const DEFAULT_CLIENT: ClientProfile = {
  name: "",
  email: "",
  phone: "",
  address: ""
};

const DEFAULT_SETTINGS: ProposalSettings = {
  taxRate: 6.5,
  contingencyRate: 7,
  depositRate: 30,
  timelineDays: 21,
  validityDays: 30,
  includePermitAllowance: false
};

const DEFAULT_CPE_INTAKE: CpeStructuredIntake = {
  tradeProfile: "renovation",
  projectInfo: {
    jobType: "",
    squareFootage: 0,
    units: 0
  },
  materialsEquipment: "",
  laborScope: "",
  allowances: "",
  timelineNotes: "",
  specialNotes: ""
};

const DEFAULT_ENTITLEMENT: EntitlementState = {
  tier: "free",
  source: "local-placeholder"
};

const SAMPLE_DESCRIPTION =
  "Install 42 sq ft porcelain subway tile backsplash in kitchen with old tile removal, substrate prep, grout, sealant, and final cleanup.";

const SAMPLE_CONTRACTOR: ContractorProfile = {
  companyName: "Northern Step Studio",
  contactName: "Jordan Smith",
  email: "jordan@northernstep.com",
  phone: "(555) 010-1001",
  licenseNumber: "CO-LIC-214982"
};

const SAMPLE_CLIENT: ClientProfile = {
  name: "Alex Rivera",
  email: "alex.rivera@email.com",
  phone: "(555) 010-4478",
  address: "1220 Main St, Denver, CO 80202"
};

const SAMPLE_SETTINGS: ProposalSettings = {
  taxRate: 8.1,
  contingencyRate: 8.5,
  depositRate: 30,
  timelineDays: 14,
  validityDays: 21,
  includePermitAllowance: true
};

const SAMPLE_CPE_INTAKE: CpeStructuredIntake = {
  tradeProfile: "renovation",
  projectInfo: {
    jobType: "Apartment kitchen backsplash renovation",
    squareFootage: 42,
    units: 1
  },
  materialsEquipment: "Porcelain subway tile\nUnsanded grout\nSealant",
  laborScope: "Demo old backsplash\nPrep substrate\nInstall tile and grout\nFinal cleanup",
  allowances: "Tile allowance: $8/sqft\nFixture protection allowance",
  timelineNotes: "Two workdays plus one day cure window.",
  specialNotes: "Apartment requires elevator reservation for material delivery."
};

const loadDraft = (): PersistedDraft | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedDraft;
  } catch {
    return null;
  }
};

const getSystemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const AREA_REGEX = /(\d{2,5})\s*(sq\s*ft|square feet|sqft|sf|ft2)/gi;

const settingsMatch = (left: ProposalSettings, right: ProposalSettings): boolean =>
  left.taxRate === right.taxRate &&
  left.contingencyRate === right.contingencyRate &&
  left.depositRate === right.depositRate &&
  left.timelineDays === right.timelineDays &&
  left.validityDays === right.validityDays &&
  left.includePermitAllowance === right.includePermitAllowance;

const timelinePriceMultiplier = (previousDays: number, nextDays: number): number => {
  if (previousDays <= 0 || nextDays <= 0 || previousDays === nextDays) {
    return 1;
  }

  const paceRatio = previousDays / nextDays;
  if (paceRatio > 1) {
    return 1 + clamp((paceRatio - 1) * 0.5, 0, 0.75);
  }

  return 1 - clamp((1 - paceRatio) * 0.12, 0, 0.18);
};

const applyTimelineMultiplierToItems = (
  items: ProposalData["quote"]["items"],
  multiplier: number
): ProposalData["quote"]["items"] =>
  items.map((item) => ({
    ...item,
    amount: Math.max(50, roundCurrency(item.amount * multiplier))
  }));

type RealityTrade = "renovation" | "hvac" | "plumbing" | "electrical" | "general";

const resolveRealityTrade = (projectType: string): RealityTrade => {
  const normalized = projectType.toLowerCase();
  if (/\bhvac|furnace|air handler|condenser|duct|mini-split\b/.test(normalized)) {
    return "hvac";
  }
  if (/\bplumb|pipe|drain|water heater|fixture|pex|copper\b/.test(normalized)) {
    return "plumbing";
  }
  if (/\belectrical|panel|wiring|breaker|circuit|outlet|switch\b/.test(normalized)) {
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

interface ScopePriceRule {
  itemPattern: RegExp;
  scopePattern: RegExp;
  description: string;
  ratePerSqFt: number;
  minimum: number;
  maximum: number;
}

const SCOPE_PRICE_RULES: ScopePriceRule[] = [
  {
    itemPattern: /\bmillwork|cabinet|trim carpentry|built-?in\b/i,
    scopePattern: /\bmillwork|cabinet|trim carpentry|built-?in|woodwork\b/i,
    description: "Millwork fabrication and finish carpentry package",
    ratePerSqFt: 30,
    minimum: 12000,
    maximum: 140000
  },
  {
    itemPattern: /\btile|backsplash|grout|porcelain|ceramic\b/i,
    scopePattern: /\btile|backsplash|grout|porcelain|ceramic|shower wall\b/i,
    description: "Tile scope execution and waterproofing package",
    ratePerSqFt: 22,
    minimum: 6500,
    maximum: 95000
  },
  {
    itemPattern: /\bplumb|pipe|drain|water heater|fixture\b/i,
    scopePattern: /\bplumb|pipe|drain|water heater|fixture|pex|copper\b/i,
    description: "Plumbing rough-in, fixture, and compliance package",
    ratePerSqFt: 26,
    minimum: 10000,
    maximum: 125000
  },
  {
    itemPattern: /\belectrical|panel|wiring|wire|breaker|circuit|outlet|switch\b/i,
    scopePattern: /\belectrical|panel|wiring|wire|breaker|circuit|outlet|switch\b/i,
    description: "Electrical rewiring, panel/device, and compliance package",
    ratePerSqFt: 24,
    minimum: 9500,
    maximum: 120000
  }
];

const timelineFloorByTradeArea = (trade: RealityTrade, area: number): number => {
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

const inferAreaFromText = (...values: string[]): number => {
  const corpus = values.join(" ").toLowerCase();
  const matches = corpus.matchAll(AREA_REGEX);
  let maxArea = 0;
  for (const match of matches) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      maxArea = Math.max(maxArea, parsed);
    }
  }
  return clamp(maxArea, 0, 12000);
};

const ensureScopeItemsPriced = (
  items: ProposalData["quote"]["items"],
  scopeCorpus: string,
  estimatedArea: number,
  complexityFactor: number
): ProposalData["quote"]["items"] => {
  const nextItems = [...items];
  for (const rule of SCOPE_PRICE_RULES) {
    const scopeRequested = rule.scopePattern.test(scopeCorpus);
    if (!scopeRequested) {
      continue;
    }
    const alreadyPriced = nextItems.some((item) => rule.itemPattern.test(item.description));
    if (alreadyPriced) {
      continue;
    }
    const amount = roundCurrency(
      clamp(
        estimatedArea * rule.ratePerSqFt * complexityFactor,
        rule.minimum,
        rule.maximum
      )
    );
    nextItems.push({
      description: rule.description,
      amount
    });
  }
  return nextItems;
};

const enforceProposalReality = (proposal: ProposalData): ProposalData => {
  const trade = resolveRealityTrade(proposal.metadata.projectType);
  const scopeCorpus = [
    proposal.metadata.projectTitle,
    proposal.contract,
    ...proposal.inclusions,
    ...proposal.assumptions,
    ...proposal.notesToClient
  ].join(" ");
  const inferredArea = inferAreaFromText(scopeCorpus);
  const rawSubtotal = proposal.quote.items.reduce((sum, item) => sum + item.amount, 0);
  const estimatedArea =
    proposal.metadata.estimatedArea > 0
      ? Math.max(proposal.metadata.estimatedArea, inferredArea)
      : Math.max(120, inferredArea, Math.round(rawSubtotal / BASE_RATE_PER_SQFT[trade]));
  const hasMillwork = proposal.quote.items.some((item) =>
    /\bmillwork|cabinet|trim carpentry|built-?in\b/i.test(item.description)
  );
  const hasMepMix =
    proposal.quote.items.some((item) => /\bplumb|pipe|drain\b/i.test(item.description)) ||
    proposal.quote.items.some((item) => /\belectrical|panel|wiring|circuit\b/i.test(item.description));
  const complexityFactor =
    1 +
    clamp((proposal.quote.items.length - 4) * 0.05, 0, 0.6) +
    (hasMillwork ? 0.12 : 0) +
    (hasMepMix ? 0.09 : 0);
  const itemsWithScopePricing = ensureScopeItemsPriced(
    proposal.quote.items,
    scopeCorpus.toLowerCase(),
    estimatedArea,
    complexityFactor
  );
  const baseItems = itemsWithScopePricing.filter(
    (item) => !/project scale and coordination allowance/i.test(item.description)
  );
  const subtotal = baseItems.reduce((sum, item) => sum + item.amount, 0);
  const areaDrivenFloor = roundCurrency(
    estimatedArea * BASE_RATE_PER_SQFT[trade] * complexityFactor
  );
  const floorSubtotal = Math.max(MIN_SUBTOTAL_BY_TRADE[trade], areaDrivenFloor);
  const withFloorItems =
    subtotal >= floorSubtotal
      ? baseItems
      : [
          ...baseItems,
          {
            description: "Project scale and coordination allowance",
            amount: roundCurrency(floorSubtotal - subtotal)
          }
        ];
  const timelineFloor = estimateTimelineDays({
    projectType: proposal.metadata.projectType,
    estimatedArea,
    complexity: Math.min(2.2, 1 + withFloorItems.length * 0.05),
    includePermitAllowance: proposal.settings.includePermitAllowance,
    weatherRiskLevel: proposal.intel?.weather?.riskLevel ?? "unknown",
    requestedTimelineDays: proposal.metadata.timelineDays
    });
  const timelineHardFloor = timelineFloorByTradeArea(trade, estimatedArea);
  const resolvedTimelineFloor = Math.max(timelineFloor, timelineHardFloor);
  const recalculated = recalculateProposalFromItems(
    {
      ...proposal,
      metadata: {
        ...proposal.metadata,
        estimatedArea,
        timelineDays: Math.max(proposal.metadata.timelineDays, resolvedTimelineFloor)
      }
    },
    withFloorItems
  );
  return recalculated;
};

function App() {
  const { t } = useTranslation();
  const initialDraft = useMemo(() => loadDraft(), []);

  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [contractor, setContractor] = useState<ContractorProfile>(
    initialDraft?.contractor ?? DEFAULT_CONTRACTOR
  );
  const [client, setClient] = useState<ClientProfile>(
    initialDraft?.client ?? DEFAULT_CLIENT
  );
  const [settings, setSettings] = useState<ProposalSettings>(
    initialDraft?.settings ?? DEFAULT_SETTINGS
  );
  const [cpeIntake, setCpeIntake] = useState<CpeStructuredIntake>(
    initialDraft?.cpeIntake ?? DEFAULT_CPE_INTAKE
  );
  const [intel, setIntel] = useState<ProposalIntel | null>(initialDraft?.intel ?? null);
  const [proposal, setProposal] = useState<ProposalData | null>(
    initialDraft?.proposal ?? null
  );
  const [language, setLanguage] = useState<SupportedLanguage>(
    initialDraft?.preferences?.language ?? "en"
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    initialDraft?.preferences?.themeMode ?? "system"
  );
  const [protectionEnabled, setProtectionEnabled] = useState<boolean>(
    initialDraft?.preferences?.protectionEnabled ?? true
  );
  const [entitlementState] = useState<EntitlementState>(
    initialDraft?.preferences?.entitlementState ?? DEFAULT_ENTITLEMENT
  );
  const [historyEntries, setHistoryEntries] = useState<LocalHistoryEntry[]>(
    initialDraft?.historyEntries ?? []
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark());
  const [remoteFeatures, setRemoteFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const resolvedTheme = resolveThemeMode(themeMode, systemPrefersDark);
    const tokens = tokensForResolvedTheme(resolvedTheme);
    const cssVars = cssVariablesFromTokens(tokens);

    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [themeMode, systemPrefersDark]);

  useEffect(() => {
    void (async () => {
      try {
        const config = await fetchRemoteConfig();
        setRemoteFeatures(config.features ?? {});
      } catch {
        setRemoteFeatures({});
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const preferences: AppPreferences = {
      language,
      themeMode,
      protectionEnabled,
      entitlementState
    };

    const draft: PersistedDraft = {
      description,
      contractor,
      client,
      settings,
      cpeIntake,
      intel,
      proposal,
      preferences,
      historyEntries
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    client,
    contractor,
    description,
    entitlementState,
    historyEntries,
    intel,
    language,
    cpeIntake,
    proposal,
    protectionEnabled,
    settings,
    themeMode
  ]);

  useEffect(() => {
    if (!proposal) {
      return;
    }

    const hasSettingsDelta = !settingsMatch(proposal.settings, settings);
    if (!hasSettingsDelta) {
      return;
    }

    const timelineChanged = settings.timelineDays !== proposal.settings.timelineDays;
    const multiplier = timelineChanged
      ? timelinePriceMultiplier(proposal.metadata.timelineDays, settings.timelineDays)
      : 1;
    const adjustedItems =
      multiplier === 1
        ? proposal.quote.items
        : applyTimelineMultiplierToItems(proposal.quote.items, multiplier);
    const timelineFloor = estimateTimelineDays({
      projectType: proposal.metadata.projectType,
      estimatedArea: Math.max(120, proposal.metadata.estimatedArea),
      complexity: Math.min(2.2, 1 + adjustedItems.length * 0.05),
      includePermitAllowance: settings.includePermitAllowance,
      weatherRiskLevel: proposal.intel?.weather?.riskLevel ?? "unknown",
      requestedTimelineDays: settings.timelineDays
    });
    const requestedTimelineDays = timelineChanged
      ? settings.timelineDays
      : proposal.metadata.timelineDays;
    const nextTimelineDays = Math.max(requestedTimelineDays, timelineFloor);

    if (timelineChanged && settings.timelineDays < timelineFloor) {
      setSettings((current) =>
        current.timelineDays === settings.timelineDays
          ? { ...current, timelineDays: timelineFloor }
          : current
      );
    }

    const updated = recalculateProposalFromItems(
      {
        ...proposal,
        settings,
        metadata: {
          ...proposal.metadata,
          timelineDays: nextTimelineDays,
          validityDays: settings.validityDays
        }
      },
      adjustedItems
    );

    setProposal(enforceProposalReality(updated));
  }, [proposal, settings]);

  const activeHistorySignals = useMemo(() => {
    const activeType =
      proposal?.metadata.projectType ?? historyEntries[historyEntries.length - 1]?.projectType;
    if (!activeType) {
      return undefined;
    }
    return deriveHistorySignals(historyEntries, activeType);
  }, [historyEntries, proposal?.metadata.projectType]);

  const handleUpload = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      return;
    }

    setPhotos((current) => [...current, ...imageFiles]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleProposalGenerated = (generated: ProposalData) => {
    const normalized = enforceProposalReality(generated);
    const nextEntries = appendHistoryEntry(historyEntries, buildHistoryEntry(normalized));
    const signals = deriveHistorySignals(nextEntries, normalized.metadata.projectType);
    setHistoryEntries(nextEntries);
    setProposal({
      ...normalized,
      historySignals: signals
    });
  };

  const handleLoadSample = () => {
    setDescription(SAMPLE_DESCRIPTION);
    setContractor(SAMPLE_CONTRACTOR);
    setClient(SAMPLE_CLIENT);
    setSettings(SAMPLE_SETTINGS);
    setCpeIntake(SAMPLE_CPE_INTAKE);
    setIntel(null);
    setProposal(null);
  };

  const handleGenerateMock = () => {
    const mock = createRandomMockProposalBundle({
      language,
      tradeProfile: cpeIntake.tradeProfile
    });
    setPhotos([]);
    setDescription(mock.description);
    setContractor(mock.contractor);
    setClient(mock.client);
    setSettings(mock.settings);
    setCpeIntake(mock.cpeIntake);
    setIntel(null);
    handleProposalGenerated(mock.proposal);
  };
  const handleReset = () => {
    setPhotos([]);
    setDescription("");
    setContractor(DEFAULT_CONTRACTOR);
    setClient(DEFAULT_CLIENT);
    setSettings(DEFAULT_SETTINGS);
    setCpeIntake(DEFAULT_CPE_INTAKE);
    setIntel(null);
    setProposal(null);
    setHistoryEntries([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="app-shell">
      <Header
        language={language}
        themeMode={themeMode}
        onLanguageChange={setLanguage}
        onThemeModeChange={setThemeMode}
      />
      <main className="app-main">
        <div className="actions-row toolbar-card glass-card reveal">
          <button type="button" className="ghost-btn" onClick={handleLoadSample}>
            <Sparkles size={16} /> {t("action.loadSample")}
          </button>
          <button type="button" className="ghost-btn" onClick={handleGenerateMock}>
            <Dices size={16} /> {t("action.generateMock")}
          </button>
          <button type="button" className="ghost-btn" onClick={handleReset}>
            <Eraser size={16} /> {t("action.resetDraft")}
          </button>
          <p className="draft-indicator">{t("app.autosave")}</p>
          {remoteFeatures.entitlementPlaceholder ? (
            <p className="draft-indicator">Tier: {entitlementState.tier.toUpperCase()}</p>
          ) : null}
        </div>

        <div className="app-grid app-grid-enhanced">
          <div className="workspace-left">
            <div className="compose-grid">
              <UploadSection
                photos={photos}
                onUpload={handleUpload}
                onRemove={handleRemovePhoto}
              />
              <ProposalGenerator
                description={description}
                photos={photos}
                contractor={contractor}
                client={client}
                settings={settings}
                cpeIntake={cpeIntake}
                intel={intel}
                language={language}
                entitlementState={entitlementState}
                historySignals={activeHistorySignals}
                onGenerated={handleProposalGenerated}
              >
                {({ generateProposal, isGenerating, canGenerate, error, missingFields }) => (
                  <DescriptionInput
                    value={description}
                    onChange={setDescription}
                    onUseTemplate={setDescription}
                    onGenerate={generateProposal}
                    isGenerating={isGenerating}
                    canGenerate={canGenerate}
                    error={error}
                    missingFields={missingFields}
                  />
                )}
              </ProposalGenerator>
            </div>

            <div className="insights-grid">
              <ProposalIntelPanel
                locationQuery={client.address}
                timelineDays={settings.timelineDays}
                language={language}
                intel={intel}
                onIntelUpdate={setIntel}
              />
              <LocalHistoryPanel
                language={language}
                signals={activeHistorySignals}
                onClear={() => setHistoryEntries([])}
              />
            </div>
          </div>

          <ProjectDetailsPanel
            contractor={contractor}
            client={client}
            settings={settings}
            cpeIntake={cpeIntake}
            onContractorChange={setContractor}
            onClientChange={setClient}
            onSettingsChange={setSettings}
            onCpeIntakeChange={setCpeIntake}
          />
        </div>

        <AnimatePresence>
          {proposal ? (
            <ProposalView
              data={proposal}
              protectionEnabled={protectionEnabled}
              onProtectionChange={setProtectionEnabled}
              onChange={(updatedProposal) => setProposal(enforceProposalReality(updatedProposal))}
            />
          ) : null}
        </AnimatePresence>
      </main>
      <footer className="app-footer">
        <p>&copy; 2026 Northern Step Studio - {t("footer")}</p>
      </footer>
    </div>
  );
}

export default App;


