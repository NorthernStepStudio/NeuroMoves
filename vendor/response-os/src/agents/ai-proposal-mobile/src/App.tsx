import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as ScreenCapture from "expo-screen-capture";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { localeFromLanguage } from "@nss/proposal-i18n";
import i18n from "./i18n";
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
  ThemeMode,
  appendHistoryEntry,
  buildDeterministicProposal,
  buildHistoryEntry,
  deriveHistorySignals,
  recalculateProposalFromItems
} from "@nss/proposal-core";
import { resolveThemeMode, tokensForResolvedTheme } from "@nss/proposal-theme";

interface PhotoItem {
  uri: string;
  name: string;
  type: string;
}

interface PersistedState {
  description: string;
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  preferences: AppPreferences;
  historyEntries: LocalHistoryEntry[];
  proposal: ProposalData | null;
  intel: ProposalIntel | null;
}

type ActiveScreen = "proposal" | "settings";

const STORAGE_KEY = "ai-proposal-mobile:v1";
const DEFAULT_API_BASE_URL = "http://10.0.2.2:8787";

const readRuntimeEnv = (): Record<string, string | undefined> => {
  try {
    const runtime = globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env ?? {};
  } catch {
    return {};
  }
};

const API_BASE_URL =
  readRuntimeEnv().EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

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
  timelineDays: 7,
  validityDays: 30,
  includePermitAllowance: false
};

const DEFAULT_ENTITLEMENT: EntitlementState = {
  tier: "free",
  source: "local-placeholder"
};

const MOCK_DESCRIPTION =
  "Install 42 sq ft porcelain subway tile backsplash in kitchen with old tile removal, substrate prep, grout, sealant, and cleanup.";

const MOCK_CONTRACTOR: ContractorProfile = {
  companyName: "Northern Step Studio",
  contactName: "Jordan Smith",
  email: "jordan@northernstep.com",
  phone: "(555) 010-1001",
  licenseNumber: "CO-LIC-214982"
};

const MOCK_CLIENT: ClientProfile = {
  name: "Alex Rivera",
  email: "alex.rivera@email.com",
  phone: "(555) 010-4478",
  address: "1220 Main St, Denver, CO 80202"
};

const safeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const loadState = async (): Promise<PersistedState | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      description: safeString(parsed.description),
      contractor: {
        companyName: safeString(parsed.contractor?.companyName),
        contactName: safeString(parsed.contractor?.contactName),
        email: safeString(parsed.contractor?.email),
        phone: safeString(parsed.contractor?.phone),
        licenseNumber: safeString(parsed.contractor?.licenseNumber)
      },
      client: {
        name: safeString(parsed.client?.name),
        email: safeString(parsed.client?.email),
        phone: safeString(parsed.client?.phone),
        address: safeString(parsed.client?.address)
      },
      settings: {
        taxRate: safeNumber(parsed.settings?.taxRate, DEFAULT_SETTINGS.taxRate),
        contingencyRate: safeNumber(
          parsed.settings?.contingencyRate,
          DEFAULT_SETTINGS.contingencyRate
        ),
        depositRate: safeNumber(parsed.settings?.depositRate, DEFAULT_SETTINGS.depositRate),
        timelineDays: safeNumber(parsed.settings?.timelineDays, DEFAULT_SETTINGS.timelineDays),
        validityDays: safeNumber(parsed.settings?.validityDays, DEFAULT_SETTINGS.validityDays),
        includePermitAllowance: Boolean(parsed.settings?.includePermitAllowance)
      },
      preferences: {
        language: parsed.preferences?.language === "es" ? "es" : "en",
        themeMode:
          parsed.preferences?.themeMode === "light" ||
          parsed.preferences?.themeMode === "dark"
            ? parsed.preferences.themeMode
            : "system",
        protectionEnabled:
          typeof parsed.preferences?.protectionEnabled === "boolean"
            ? parsed.preferences.protectionEnabled
            : true,
        entitlementState:
          parsed.preferences?.entitlementState &&
          (parsed.preferences.entitlementState.tier === "free" ||
            parsed.preferences.entitlementState.tier === "pro")
            ? parsed.preferences.entitlementState
            : DEFAULT_ENTITLEMENT
      },
      historyEntries: Array.isArray(parsed.historyEntries)
        ? (parsed.historyEntries.filter(Boolean) as LocalHistoryEntry[])
        : [],
      proposal: parsed.proposal ? (parsed.proposal as ProposalData) : null,
      intel: parsed.intel ? (parsed.intel as ProposalIntel) : null
    };
  } catch {
    return null;
  }
};

const sectionTitle = (text: string, color: string) => (
  <Text style={{ color, fontSize: 18, fontWeight: "800", marginBottom: 10 }}>{text}</Text>
);

const createMoneyFormatter = (locale: string) => {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
    return (value: number) => formatter.format(value);
  } catch {
    return (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
  }
};

export default function App() {
  const { t } = useTranslation();
  const systemScheme = useColorScheme();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("proposal");
  const [hydrated, setHydrated] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [description, setDescription] = useState("");
  const [contractor, setContractor] = useState<ContractorProfile>(DEFAULT_CONTRACTOR);
  const [client, setClient] = useState<ClientProfile>(DEFAULT_CLIENT);
  const [settings, setSettings] = useState<ProposalSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [entitlementState] = useState<EntitlementState>(DEFAULT_ENTITLEMENT);
  const [historyEntries, setHistoryEntries] = useState<LocalHistoryEntry[]>([]);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [intel, setIntel] = useState<ProposalIntel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingIntel, setIsFetchingIntel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState(false);

  const resolvedTheme = resolveThemeMode(themeMode, systemScheme === "dark");
  const theme = tokensForResolvedTheme(resolvedTheme);
  const formatMoney = useMemo(
    () => createMoneyFormatter(localeFromLanguage(language)),
    [language]
  );

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    void (async () => {
      const persisted = await loadState();
      if (persisted) {
        setDescription(persisted.description);
        setContractor(persisted.contractor);
        setClient(persisted.client);
        setSettings(persisted.settings);
        setLanguage(persisted.preferences.language);
        setThemeMode(persisted.preferences.themeMode);
        setProtectionEnabled(persisted.preferences.protectionEnabled);
        setHistoryEntries(persisted.historyEntries);
        setProposal(persisted.proposal);
        setIntel(persisted.intel);
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const state: PersistedState = {
      description,
      contractor,
      client,
      settings,
      preferences: {
        language,
        themeMode,
        protectionEnabled,
        entitlementState
      },
      historyEntries,
      proposal,
      intel
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    client,
    contractor,
    description,
    entitlementState,
    historyEntries,
    hydrated,
    intel,
    language,
    proposal,
    protectionEnabled,
    settings,
    themeMode
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setShieldActive(protectionEnabled && nextState !== "active");
    });
    return () => subscription.remove();
  }, [protectionEnabled]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let screenshotSub: { remove: () => void } | null = null;

    if (protectionEnabled && typeof ScreenCapture.addScreenshotListener === "function") {
      screenshotSub = ScreenCapture.addScreenshotListener(() => {
        setShieldActive(true);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => setShieldActive(false), 2000);
      });
    }

    return () => {
      screenshotSub?.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [protectionEnabled]);

  useEffect(() => {
    const syncProtection = async () => {
      try {
        if (protectionEnabled && proposal) {
          await ScreenCapture.preventScreenCaptureAsync();
        } else {
          await ScreenCapture.allowScreenCaptureAsync();
        }
      } catch {
        // no-op
      }
    };

    void syncProtection();
  }, [protectionEnabled, proposal]);

  const historySignals = useMemo(() => {
    const projectType =
      proposal?.metadata.projectType ??
      historyEntries[historyEntries.length - 1]?.projectType;
    if (!projectType) {
      return undefined;
    }
    return deriveHistorySignals(historyEntries, projectType);
  }, [historyEntries, proposal?.metadata.projectType]);

  const pickPhoto = async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t("error.mediaPermission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: 3
      });

      if (result.canceled) {
        return;
      }

      const next = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
        type: asset.mimeType ?? "image/jpeg"
      }));
      setPhotos((current) => [...current, ...next].slice(0, 6));
    } catch {
      setError(t("error.photoPick"));
    }
  };

  const fetchIntel = async () => {
    setIsFetchingIntel(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/intel/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationQuery: client.address || "United States",
          timelineDays: settings.timelineDays,
          language
        })
      });

      const payload = (await response.json()) as ProposalIntel | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "intel fetch failed");
      }
      setIntel(payload as ProposalIntel);
    } catch {
      setError(t("error.fetchIntel"));
    } finally {
      setIsFetchingIntel(false);
    }
  };

  const generateProposal = async () => {
    const missing: string[] = [];
    if (!description.trim()) {
      missing.push(t("section.description"));
    }
    if (!contractor.companyName.trim()) {
      missing.push(t("label.company"));
    }
    if (!client.name.trim()) {
      missing.push(t("label.clientName"));
    }
    if (missing.length > 0) {
      setError(t("error.requiredFields", { fields: missing.join(", ") }));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          description,
          contractor,
          client,
          settings,
          intel,
          language,
          entitlementState,
          historySignals
        })
      );

      photos.slice(0, 3).forEach((photo) => {
        form.append(
          "images",
          { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob
        );
      });

      const response = await fetch(`${API_BASE_URL}/v1/proposals/generate`, {
        method: "POST",
        body: form
      });

      const payload = (await response.json()) as ProposalData | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "generate failed");
      }

      const next = payload as ProposalData;
      const nextHistory = appendHistoryEntry(historyEntries, buildHistoryEntry(next));
      setHistoryEntries(nextHistory);
      setProposal({
        ...next,
        historySignals: deriveHistorySignals(nextHistory, next.metadata.projectType)
      });
      return;
    } catch {
      try {
        const fallback = buildDeterministicProposal({
          description,
          photoCount: photos.length,
          contractor,
          client,
          settings,
          intel,
          geminiDraft: null,
          language,
          platform: "android",
          historySignals
        });
        const nextHistory = appendHistoryEntry(historyEntries, buildHistoryEntry(fallback));
        setHistoryEntries(nextHistory);
        setProposal({
          ...fallback,
          historySignals: deriveHistorySignals(nextHistory, fallback.metadata.projectType)
        });
      } catch {
        setError(t("error.generate"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockProposal = () => {
    setError(null);

    const mockDescription = description.trim() || MOCK_DESCRIPTION;
    const mockContractor: ContractorProfile = {
      ...MOCK_CONTRACTOR,
      ...contractor,
      companyName: contractor.companyName.trim() || MOCK_CONTRACTOR.companyName,
      contactName: contractor.contactName.trim() || MOCK_CONTRACTOR.contactName
    };
    const mockClient: ClientProfile = {
      ...MOCK_CLIENT,
      ...client,
      name: client.name.trim() || MOCK_CLIENT.name,
      address: client.address.trim() || MOCK_CLIENT.address
    };

    try {
      const mock = buildDeterministicProposal({
        description: mockDescription,
        photoCount: 0,
        contractor: mockContractor,
        client: mockClient,
        settings,
        intel,
        geminiDraft: null,
        language,
        platform: "android",
        historySignals
      });

      const nextHistory = appendHistoryEntry(historyEntries, buildHistoryEntry(mock));
      setDescription(mockDescription);
      setContractor(mockContractor);
      setClient(mockClient);
      setHistoryEntries(nextHistory);
      setProposal({
        ...mock,
        historySignals: deriveHistorySignals(nextHistory, mock.metadata.projectType)
      });
    } catch {
      setError(t("error.generate"));
    }
  };

  const exportPdf = async () => {
    if (!proposal) {
      return;
    }

    const html = `
      <html><body style="font-family: Arial; padding: 20px;">
      <h1>${proposal.metadata.projectTitle}</h1>
      <p>${proposal.contractor.companyName} -> ${proposal.client.name}</p>
      <ul>${proposal.quote.items
        .map((item) => `<li>${item.description}: ${formatMoney(item.amount)}</li>`)
        .join("")}</ul>
      <p><strong>Total:</strong> ${formatMoney(proposal.quote.total)}</p>
      <p>${proposal.contract}</p>
      </body></html>
    `;

    const file = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri);
    }
  };

  const resetDraft = () => {
    setPhotos([]);
    setDescription("");
    setContractor(DEFAULT_CONTRACTOR);
    setClient(DEFAULT_CLIENT);
    setSettings(DEFAULT_SETTINGS);
    setProposal(null);
    setIntel(null);
    setHistoryEntries([]);
    setError(null);
    void AsyncStorage.removeItem(STORAGE_KEY);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.bgPrimary },
        header: {
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.glassBorder,
          backgroundColor: theme.surfaceStrong
        },
        title: { color: theme.textPrimary, fontSize: 24, fontWeight: "800" },
        tabs: { flexDirection: "row", gap: 8 },
        tab: {
          flex: 1,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          paddingVertical: 9,
          alignItems: "center",
          backgroundColor: theme.surface
        },
        tabActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
        tabText: { color: theme.textPrimary, fontWeight: "700" },
        tabTextActive: { color: "#fff" },
        container: { padding: 14, paddingBottom: 18, gap: 14 },
        footer: {
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: theme.glassBorder,
          backgroundColor: theme.surfaceStrong
        },
        card: {
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          backgroundColor: theme.surface,
          gap: 8
        },
        input: {
          borderWidth: 1,
          borderColor: theme.glassBorder,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
          color: theme.textPrimary,
          backgroundColor: theme.surfaceStrong
        },
        inputMulti: { minHeight: 104, textAlignVertical: "top" },
        row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
        button: {
          backgroundColor: theme.accentPrimary,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center"
        },
        ghost: {
          backgroundColor: theme.surfaceStrong,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center"
        },
        buttonText: { color: "#fff", fontWeight: "700" },
        ghostText: { color: theme.textPrimary, fontWeight: "700" },
        chip: {
          borderWidth: 1,
          borderColor: theme.glassBorder,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6
        },
        chipActive: { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
        chipText: { color: theme.textPrimary, fontWeight: "700", fontSize: 13 },
        chipTextActive: { color: "#fff" },
        label: { color: theme.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 },
        textSecondary: { color: theme.textSecondary, fontSize: 13 },
        photo: { width: 72, height: 72, borderRadius: 8 },
        error: { color: "#ffb4b4", fontWeight: "600" },
        statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        statLabel: { color: theme.textMuted, fontSize: 12 },
        statValue: { color: theme.textSecondary, fontSize: 12, fontWeight: "600" },
        sourceNote: { color: theme.textMuted, fontSize: 12 },
        proposalBlur: { opacity: 0.35 },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(8,12,18,0.62)",
          alignItems: "center",
          justifyContent: "center"
        },
        overlayText: {
          color: "#fff",
          fontWeight: "800",
          fontSize: 16,
          textAlign: "center",
          paddingHorizontal: 24
        }
      }),
    [theme]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

        <View style={styles.header}>
          <Text style={styles.title}>{t("app.title")}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
          {activeScreen === "proposal" ? (
            <>
              <View style={styles.card}>
                {sectionTitle(t("section.upload"), theme.textPrimary)}
                <Pressable style={styles.ghost} onPress={pickPhoto}>
                  <Text style={styles.ghostText}>+ Add Photos</Text>
                </Pressable>
                <View style={styles.row}>
                  {photos.map((photo) => (
                    <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.description"), theme.textPrimary)}
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  style={[styles.input, styles.inputMulti]}
                  placeholder={t("hint.description")}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.contractor"), theme.textPrimary)}
                <TextInput
                  value={contractor.companyName}
                  onChangeText={(value) => setContractor({ ...contractor, companyName: value })}
                  style={styles.input}
                  placeholder={t("label.company")}
                  placeholderTextColor={theme.textMuted}
                />
                <TextInput
                  value={contractor.contactName}
                  onChangeText={(value) => setContractor({ ...contractor, contactName: value })}
                  style={styles.input}
                  placeholder={t("label.contact")}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.client"), theme.textPrimary)}
                <TextInput
                  value={client.name}
                  onChangeText={(value) => setClient({ ...client, name: value })}
                  style={styles.input}
                  placeholder={t("label.clientName")}
                  placeholderTextColor={theme.textMuted}
                />
                <TextInput
                  value={client.address}
                  onChangeText={(value) => setClient({ ...client, address: value })}
                  style={styles.input}
                  placeholder={t("label.address")}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.pricing"), theme.textPrimary)}
                <Text style={styles.label}>{t("label.tax")}</Text>
                <TextInput
                  value={String(settings.taxRate)}
                  onChangeText={(value) =>
                    setSettings({ ...settings, taxRate: safeNumber(value, settings.taxRate) })
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.label}>{t("label.contingency")}</Text>
                <TextInput
                  value={String(settings.contingencyRate)}
                  onChangeText={(value) =>
                    setSettings({
                      ...settings,
                      contingencyRate: safeNumber(value, settings.contingencyRate)
                    })
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
                <View style={styles.row}>
                  <Text style={styles.textSecondary}>{t("label.permitAllowance")}</Text>
                  <Switch
                    value={settings.includePermitAllowance}
                    onValueChange={(value) =>
                      setSettings({ ...settings, includePermitAllowance: value })
                    }
                  />
                </View>
              </View>

              <View style={styles.card}>
                <Pressable style={styles.button} onPress={generateProposal}>
                  <Text style={styles.buttonText}>
                    {isGenerating ? t("action.generating") : t("action.generate")}
                  </Text>
                </Pressable>
                <Pressable style={styles.ghost} onPress={generateMockProposal}>
                  <Text style={styles.ghostText}>{t("action.generateMock")}</Text>
                </Pressable>
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>

              {proposal ? (
                <View style={[styles.card, shieldActive && protectionEnabled && styles.proposalBlur]}>
                  {sectionTitle(t("section.proposal"), theme.textPrimary)}
                  <Text selectable style={styles.textSecondary}>
                    {proposal.metadata.projectTitle}
                  </Text>
                  {proposal.quote.items.map((item, index) => (
                    <View key={`${item.description}-${index}`} style={{ gap: 6 }}>
                      <TextInput
                        value={item.description}
                        onChangeText={(value) => {
                          const nextItems = proposal.quote.items.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, description: value } : row
                          );
                          setProposal(recalculateProposalFromItems(proposal, nextItems));
                        }}
                        style={styles.input}
                      />
                      <TextInput
                        value={String(item.amount)}
                        onChangeText={(value) => {
                          const nextItems = proposal.quote.items.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, amount: safeNumber(value, row.amount) }
                              : row
                          );
                          setProposal(recalculateProposalFromItems(proposal, nextItems));
                        }}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                  ))}
                  <Text
                    selectable
                    style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "800" }}
                  >
                    Total: {formatMoney(proposal.quote.total)}
                  </Text>
                  {proposal.pricingDiagnostics ? (
                    <View style={{ gap: 4 }}>
                      <Text style={styles.label}>{t("section.pricingSignals")}</Text>
                      <Text style={styles.textSecondary}>
                        Labor x{proposal.pricingDiagnostics.laborMultiplier.toFixed(2)} | Material x
                        {proposal.pricingDiagnostics.materialMultiplier.toFixed(2)} | Weather x
                        {proposal.pricingDiagnostics.weatherRiskMultiplier.toFixed(2)}
                      </Text>
                      <Text style={styles.textSecondary}>
                        {t("label.floorSource")}:{" "}
                        {proposal.pricingDiagnostics.floorSource === "history"
                          ? t("status.sourceHistory")
                          : proposal.pricingDiagnostics.floorSource === "rule+history"
                            ? t("status.sourceRuleHistory")
                            : t("status.sourceRule")}{" "}
                        ({formatMoney(proposal.pricingDiagnostics.floorSubtotal)})
                      </Text>
                      {proposal.pricingDiagnostics.appliedFactors.map((factor) => (
                        <Text key={factor} style={styles.sourceNote}>
                          - {factor}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <TextInput
                    value={proposal.contract}
                    onChangeText={(value) =>
                      setProposal({
                        ...proposal,
                        contract: value
                      })
                    }
                    multiline
                    style={[styles.input, styles.inputMulti]}
                    placeholder="Contract text"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Pressable style={styles.ghost} onPress={exportPdf}>
                    <Text style={styles.ghostText}>{t("action.downloadPdf")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.card}>
                {sectionTitle(t("section.settings"), theme.textPrimary)}
                <Text style={styles.label}>{t("label.language")}</Text>
                <View style={styles.row}>
                  {(["en", "es"] as const).map((lang) => (
                    <Pressable
                      key={lang}
                      onPress={() => setLanguage(lang)}
                      style={[styles.chip, language === lang && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, language === lang && styles.chipTextActive]}>
                        {lang === "en" ? "English" : "Espanol"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>{t("label.theme")}</Text>
                <View style={styles.row}>
                  {(["system", "dark", "light"] as const).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      style={[styles.chip, themeMode === mode && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, themeMode === mode && styles.chipTextActive]}>
                        {mode === "system"
                          ? t("label.themeSystem")
                          : mode === "dark"
                            ? t("label.themeDark")
                            : t("label.themeLight")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.row}>
                  <Text style={styles.textSecondary}>{t("label.protection")}</Text>
                  <Switch value={protectionEnabled} onValueChange={setProtectionEnabled} />
                </View>
                <Text style={styles.textSecondary}>{t("hint.protectionNote")}</Text>
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.intel"), theme.textPrimary)}
                <Pressable style={styles.ghost} onPress={fetchIntel}>
                  <Text style={styles.ghostText}>
                    {isFetchingIntel ? t("action.fetchingSignals") : t("action.fetchSignals")}
                  </Text>
                </Pressable>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t("label.scheduleRisk")}</Text>
                  <Text style={styles.statValue}>{intel?.weather?.riskLevel ?? t("status.notFetched")}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t("status.highRiskDays")}</Text>
                  <Text style={styles.statValue}>
                    {intel?.weather?.highRiskDays ?? t("status.na")}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{t("label.marketSnapshot")}</Text>
                  <Text style={styles.statValue}>
                    {intel?.market?.referencePeriod ?? t("status.notFetched")}
                  </Text>
                </View>
                <Text style={styles.textSecondary}>API: {API_BASE_URL}</Text>
                {intel?.sourceNotes?.map((note) => (
                  <Text key={note} style={styles.sourceNote}>
                    - {note}
                  </Text>
                ))}
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>

              <View style={styles.card}>
                {sectionTitle(t("section.history"), theme.textPrimary)}
                {historySignals ? (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>{t("label.historySample")}</Text>
                      <Text style={styles.statValue}>{historySignals.sampleSize}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>{t("label.historyMedianTotal")}</Text>
                      <Text style={styles.statValue}>
                        {historySignals.projectTypeMedianTotal !== null
                          ? formatMoney(historySignals.projectTypeMedianTotal)
                          : t("status.na")}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.textSecondary}>{t("hint.noHistory")}</Text>
                )}
                <Text style={styles.textSecondary}>{t("hint.localOnly")}</Text>
                <Pressable
                  style={styles.ghost}
                  onPress={() => {
                    setHistoryEntries([]);
                    setProposal((current) =>
                      current ? { ...current, historySignals: undefined } : current
                    );
                  }}
                >
                  <Text style={styles.ghostText}>{t("action.clearHistory")}</Text>
                </Pressable>
                <Pressable style={styles.ghost} onPress={resetDraft}>
                  <Text style={styles.ghostText}>{t("action.resetDraft")}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeScreen === "proposal" && styles.tabActive]}
              onPress={() => setActiveScreen("proposal")}
            >
              <Text style={[styles.tabText, activeScreen === "proposal" && styles.tabTextActive]}>
                {t("section.proposal")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeScreen === "settings" && styles.tabActive]}
              onPress={() => setActiveScreen("settings")}
            >
              <Text style={[styles.tabText, activeScreen === "settings" && styles.tabTextActive]}>
                {t("section.settings")}
              </Text>
            </Pressable>
          </View>
        </View>

        {shieldActive && protectionEnabled ? (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.overlayText}>{t("status.captureDetected")}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
