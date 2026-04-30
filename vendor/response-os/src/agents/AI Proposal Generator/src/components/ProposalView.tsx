import { useEffect, useMemo, useState, type ClipboardEvent, type MouseEvent } from "react";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  Languages,
  Layout,
  PencilLine,
  Plus,
  Save,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@nss/proposal-i18n";
import { localeFromLanguage } from "@nss/proposal-i18n";
import { ProposalData, ProposalLineItem, SupportedLanguage } from "../types/proposal";
import { recalculateProposalFromItems } from "../services/proposalMath";
import {
  qaProposalViaApi,
  refineProposalViaApi,
  translateProposalViaApi
} from "../services/api";

interface ProposalViewProps {
  data: ProposalData;
  protectionEnabled: boolean;
  onProtectionChange: (enabled: boolean) => void;
  onChange: (proposal: ProposalData) => void;
}

const sanitizeFileName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "proposal";

const normalizeDraftItems = (
  items: ProposalLineItem[]
): Array<{ description: string; amount: number }> =>
  items.map((item) => ({
    description: item.description.trim(),
    amount: Number(item.amount)
  }));

const hasValidDraftItems = (
  items: Array<{ description: string; amount: number }>
): boolean =>
  items.length > 0 &&
  items.every(
    (item) =>
      item.description.length > 0 &&
      Number.isFinite(item.amount) &&
      item.amount > 0
  );

const draftDiffersFromProposal = (
  draft: Array<{ description: string; amount: number }>,
  proposalItems: ProposalLineItem[]
): boolean => {
  if (draft.length !== proposalItems.length) {
    return true;
  }

  return draft.some(
    (item, index) =>
      item.description !== proposalItems[index].description ||
      item.amount !== proposalItems[index].amount
  );
};

const ProposalView = ({
  data,
  protectionEnabled,
  onProtectionChange,
  onChange
}: ProposalViewProps) => {
  const { t } = useTranslation();
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [itemDraft, setItemDraft] = useState<ProposalLineItem[]>(data.quote.items);
  const [itemError, setItemError] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostError, setBoostError] = useState<string | null>(null);
  const [boostInfo, setBoostInfo] = useState<string | null>(null);

  const locale = localeFromLanguage(data.language);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }),
    [locale]
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const watermarkText = useMemo(() => {
    const client = data.client.name || "Confidential Client";
    const company = data.contractor.companyName || "Proposal";
    return `${client} | ${company} | ${new Date().toISOString().slice(0, 16)}`;
  }, [data.client.name, data.contractor.companyName]);

  const watermarks = useMemo(
    () => Array.from({ length: 24 }, (_, index) => `${watermarkText} #${index + 1}`),
    [watermarkText]
  );

  const draftPreview = useMemo(
    () => recalculateProposalFromItems(data, itemDraft),
    [data, itemDraft]
  );

  useEffect(() => {
    if (!isEditingItems) {
      setItemDraft(data.quote.items);
      setItemError(null);
    }
  }, [data.quote.items, isEditingItems]);

  useEffect(() => {
    setBoostError(null);
  }, [data]);

  useEffect(() => {
    if (!protectionEnabled) {
      setShieldActive(false);
      return;
    }

    const hideSensitive = () => {
      setShieldActive(true);
    };

    const revealSensitive = () => {
      if (document.visibilityState === "visible") {
        setShieldActive(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setShieldActive(true);
      } else {
        setShieldActive(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") {
        setShieldActive(true);
        window.setTimeout(() => setShieldActive(false), 1300);

        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText("").catch(() => undefined);
        }
      }
    };

    window.addEventListener("blur", hideSensitive);
    window.addEventListener("focus", revealSensitive);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", hideSensitive);
      window.removeEventListener("focus", revealSensitive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [protectionEnabled]);

  const handleDownload = () => {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFileName(data.metadata.projectTitle)}-proposal.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const handlePdfDownload = async () => {
    const pdfModule = await import("../services/pdf");
    pdfModule.downloadProposalPdf(data);
  };

  const handleAiBoostRefine = async () => {
    setIsBoosting(true);
    setBoostError(null);
    setBoostInfo(null);
    try {
      const boosted = await refineProposalViaApi(data, "clarity");
      onChange(boosted);
      setBoostInfo("AI Boost applied: clarity refinement complete.");
    } catch (error) {
      setBoostError(error instanceof Error ? error.message : t("error.boostRefine"));
    } finally {
      setIsBoosting(false);
    }
  };

  const handleTranslate = async () => {
    setIsBoosting(true);
    setBoostError(null);
    setBoostInfo(null);
    const targetByLanguage: Record<SupportedLanguage, "en" | "es" | "it"> = {
      en: "es",
      es: "it",
      it: "en"
    };
    const target = targetByLanguage[data.language];
    try {
      const translated = await translateProposalViaApi(data, target);
      onChange(translated);
      setBoostInfo(`Translation complete: ${target.toUpperCase()}.`);
    } catch (error) {
      setBoostError(error instanceof Error ? error.message : t("error.boostTranslate"));
    } finally {
      setIsBoosting(false);
    }
  };

  const handleQaCheck = async () => {
    setIsBoosting(true);
    setBoostError(null);
    setBoostInfo(null);
    try {
      const result = await qaProposalViaApi(data);
      onChange(result.proposal);
      const qa = (result.qa ?? {}) as { missingInfo?: unknown; riskFlags?: unknown };
      const missingCount = Array.isArray(qa.missingInfo) ? qa.missingInfo.length : 0;
      const riskCount = Array.isArray(qa.riskFlags) ? qa.riskFlags.length : 0;
      setBoostInfo(`QA completed: ${missingCount} missing info item(s), ${riskCount} risk flag(s).`);
    } catch (error) {
      setBoostError(error instanceof Error ? error.message : t("error.boostQa"));
    } finally {
      setIsBoosting(false);
    }
  };

  const updateDraftItem = (
    index: number,
    patch: Partial<ProposalLineItem>
  ) => {
    setItemDraft((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const handleSaveItems = () => {
    const normalized = normalizeDraftItems(itemDraft);
    if (!hasValidDraftItems(normalized)) {
      setItemError("Each item needs a description and amount above zero.");
      return;
    }

    if (draftDiffersFromProposal(normalized, data.quote.items)) {
      onChange(recalculateProposalFromItems(data, normalized));
    }
    setIsEditingItems(false);
    setItemError(null);
  };

  const handleProtectedAction = (
    event: ClipboardEvent<HTMLElement> | MouseEvent<HTMLElement>
  ) => {
    if (protectionEnabled) {
      event.preventDefault();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`proposal-wrap ${protectionEnabled ? "proposal-protected" : ""}`}
    >
      {protectionEnabled ? (
        <div className="capture-guard" aria-hidden="true">
          {watermarks.map((entry) => (
            <span key={entry}>{entry}</span>
          ))}
        </div>
      ) : null}

      {protectionEnabled && shieldActive ? (
        <div className="privacy-shield">
          <Shield size={20} /> {t("status.captureDetected")}
        </div>
      ) : null}

      <div
        className={`proposal-content ${protectionEnabled && shieldActive ? "capture-blur" : ""}`}
        onCopy={handleProtectedAction}
        onCut={handleProtectedAction}
        onContextMenu={handleProtectedAction}
      >
        <div className="proposal-header">
          <div>
            <h2 className="proposal-title">{t("section.proposal")}</h2>
            <p className="proposal-meta">
              {data.metadata.projectType} | {data.metadata.estimatedArea} sq ft |{" "}
              {data.metadata.photoCount} photo(s)
            </p>
            <p className="proposal-meta">
              {t("status.generated")}{" "}
              {dateFormatter.format(new Date(data.metadata.generatedAt))} | {t("status.valid")}{" "}
              {data.metadata.validityDays} days
            </p>
            <p className="proposal-meta">
              {t("status.engine")}:{" "}
              {data.metadata.generationSource === "gemini"
                ? `${t("engine.gemini")} (${data.metadata.aiModel ?? "configured model"})`
                : t("engine.fallback")}
            </p>
            {protectionEnabled ? (
              <p className="proposal-meta privacy-note">
                <AlertTriangle size={14} /> {t("hint.protectionNote")}
              </p>
            ) : null}
          </div>

          <div className="proposal-actions">
            <button
              type="button"
              className="ghost-btn action-btn"
              onClick={() => onProtectionChange(!protectionEnabled)}
            >
              <ShieldCheck size={16} />
              {protectionEnabled ? t("status.protectionOn") : t("status.protectionOff")}
            </button>
            <button type="button" className="ghost-btn action-btn" onClick={handleDownload}>
              <Download size={16} /> {t("action.downloadJson")}
            </button>
            <button
              type="button"
              className="btn-primary download-btn"
              onClick={() => {
                void handlePdfDownload();
              }}
            >
              <Download size={18} /> {t("action.downloadPdf")}
            </button>
            <button
              type="button"
              className="ghost-btn action-btn"
              onClick={() => {
                window.print();
              }}
            >
              <Download size={16} /> {t("action.printPreview")}
            </button>
            <button
              type="button"
              className="ghost-btn action-btn"
              disabled={isBoosting}
              onClick={() => {
                void handleAiBoostRefine();
              }}
            >
              <Sparkles size={16} /> AI Boost
            </button>
            <button
              type="button"
              className="ghost-btn action-btn"
              disabled={isBoosting}
              onClick={() => {
                void handleTranslate();
              }}
            >
              <Languages size={16} /> Translate
            </button>
            <button
              type="button"
              className="ghost-btn action-btn"
              disabled={isBoosting}
              onClick={() => {
                void handleQaCheck();
              }}
            >
              <ShieldAlert size={16} /> QA Check
            </button>
          </div>
        </div>

        {boostInfo ? <p className="proposal-meta">{boostInfo}</p> : null}
        {boostError ? <p className="inline-error">{boostError}</p> : null}

        <div className="proposal-grid">
          <article className="glass-card proposal-card">
            <h3 className="panel-title">
              <UserRound size={20} color="var(--accent-primary)" /> {t("section.projectParties")}
            </h3>
            <div className="party-grid">
              <div>
                <p className="party-heading">{t("label.contractor")}</p>
                <p className="party-line strong">{data.contractor.companyName}</p>
                <p className="party-line">{data.contractor.contactName}</p>
                <p className="party-line">{data.contractor.email}</p>
                <p className="party-line">{data.contractor.phone}</p>
                <p className="party-line">
                  {t("label.license")}: {data.contractor.licenseNumber || t("status.na")}
                </p>
              </div>
              <div>
                <p className="party-heading">{t("label.client")}</p>
                <p className="party-line strong">{data.client.name}</p>
                <p className="party-line">{data.client.email || t("status.noEmail")}</p>
                <p className="party-line">{data.client.phone || t("status.noPhone")}</p>
                <p className="party-line">{data.client.address || t("status.noAddress")}</p>
              </div>
            </div>
          </article>

          <article className="glass-card proposal-card">
            <div className="quote-heading-row">
              <h3 className="panel-title">
                <Layout size={20} color="var(--accent-primary)" /> {t("section.itemizedQuote")}
              </h3>
              {!isEditingItems ? (
                <button
                  type="button"
                  className="ghost-btn mini-btn"
                  onClick={() => setIsEditingItems(true)}
                >
                  <PencilLine size={14} /> {t("action.editItems")}
                </button>
              ) : null}
            </div>

            {isEditingItems ? (
              <div className="line-edit-wrap">
                <div className="line-edit-list">
                  {itemDraft.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="line-edit-row">
                      <input
                        className="input-field line-item-input"
                        value={item.description}
                        onChange={(event) =>
                          updateDraftItem(index, { description: event.target.value })
                        }
                        placeholder="Line item description"
                      />
                      <input
                        className="input-field line-item-amount"
                        type="number"
                        min={0}
                        step={5}
                        value={item.amount}
                        onChange={(event) =>
                          updateDraftItem(index, {
                            amount: Number(event.target.value)
                          })
                        }
                        placeholder="0"
                      />
                      <button
                        type="button"
                        className="ghost-btn mini-btn danger-mini"
                        onClick={() =>
                          setItemDraft((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="line-edit-actions">
                  <button
                    type="button"
                    className="ghost-btn mini-btn"
                    onClick={() =>
                      setItemDraft((current) => [
                        ...current,
                        {
                          description: "New line item",
                          amount: 100
                        }
                      ])
                    }
                  >
                    <Plus size={14} /> {t("action.addItem")}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn mini-btn"
                    onClick={() => {
                      setItemDraft(data.quote.items);
                      setIsEditingItems(false);
                      setItemError(null);
                    }}
                  >
                    <X size={14} /> {t("action.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary mini-btn save-mini"
                    onClick={handleSaveItems}
                  >
                    <Save size={14} /> {t("action.saveItems")}
                  </button>
                </div>
                {itemError ? <p className="inline-error">{itemError}</p> : null}
              </div>
            ) : (
              <div className="quote-items">
                {data.quote.items.map((item) => (
                  <div key={item.description} className="quote-row">
                    <span>{item.description}</span>
                    <strong>{currencyFormatter.format(item.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="quote-items quote-summary">
              <div className="quote-row breakdown-row">
                <span>{t("label.subtotal")}</span>
                <strong>
                  {currencyFormatter.format(
                    isEditingItems ? draftPreview.quote.subtotal : data.quote.subtotal
                  )}
                </strong>
              </div>
              <div className="quote-row breakdown-row">
                <span>{t("label.contingencyAmount")}</span>
                <strong>
                  {currencyFormatter.format(
                    isEditingItems
                      ? draftPreview.quote.contingencyAmount
                      : data.quote.contingencyAmount
                  )}
                </strong>
              </div>
              <div className="quote-row breakdown-row">
                <span>{t("label.taxAmount")}</span>
                <strong>
                  {currencyFormatter.format(
                    isEditingItems ? draftPreview.quote.taxAmount : data.quote.taxAmount
                  )}
                </strong>
              </div>
              <div className="quote-total">
                <span>{isEditingItems ? t("label.previewTotal") : t("label.totalEstimate")}</span>
                <strong>
                  {currencyFormatter.format(
                    isEditingItems ? draftPreview.quote.total : data.quote.total
                  )}
                </strong>
              </div>
            </div>
          </article>

          <article className="glass-card proposal-card">
            <h3 className="panel-title">
              <CreditCard size={20} color="#22c55e" /> {t("section.paymentSchedule")}
            </h3>
            <div className="payment-list">
              {(isEditingItems ? draftPreview.paymentSchedule : data.paymentSchedule).map(
                (phase) => (
                  <div key={phase.description} className="payment-item">
                    <div className="payment-row">
                      <span>{phase.description}</span>
                      <strong>{phase.percentage}%</strong>
                    </div>
                    <p>{currencyFormatter.format(phase.amount)}</p>
                  </div>
                )
              )}
            </div>
            <p className="proposal-meta">
              {t("label.estimatedTimeline")}: {data.metadata.timelineDays} day(s)
            </p>
          </article>

          <article className="glass-card proposal-card">
            <h3 className="panel-title">
              <FileText size={20} color="#f59e0b" /> {t("section.scopeBoundaries")}
            </h3>
            <div className="scope-columns">
              <div>
                <p className="party-heading">{t("label.included")}</p>
                <ul className="terms-list compact-list">
                  {data.inclusions.map((item) => (
                    <li key={item}>
                      <CheckCircle size={18} color="#22c55e" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="party-heading">{t("label.excluded")}</p>
                <ul className="terms-list compact-list">
                  {data.exclusions.map((item) => (
                    <li key={item}>
                      <CheckCircle size={18} color="#f97316" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="glass-card proposal-card full-width">
            <h3 className="panel-title">
              <ShieldCheck size={20} color="#ef4444" /> {t("section.assumptionsTermsContract")}
            </h3>

            <div className="content-group">
              <p className="party-heading">{t("label.assumptions")}</p>
              <ul className="terms-list">
                {data.assumptions.map((item) => (
                  <li key={item}>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="content-group">
              <p className="party-heading">{t("label.contractLanguage")}</p>
              <p className="contract-copy">{data.contract}</p>
            </div>

            <div className="content-group">
              <p className="party-heading">{t("label.termsConditions")}</p>
              <ul className="terms-list">
                {data.terms.map((term) => (
                  <li key={term}>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="content-group">
              <p className="party-heading">{t("label.clientNotes")}</p>
              <ul className="terms-list">
                {data.notesToClient.map((note) => (
                  <li key={note}>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {data.intel ? (
              <div className="content-group">
                <p className="party-heading">{t("label.publicSignalsUsed")}</p>
                <ul className="terms-list">
                  <li>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>
                      {t("label.marketReferencePeriod")}: {data.intel.market?.referencePeriod ?? t("status.na")}
                    </span>
                  </li>
                  <li>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>
                      {t("label.weatherRisk")}: {data.intel.weather?.riskLevel ?? "unknown"} in{" "}
                      {data.intel.weather?.locationName ?? data.intel.locationQuery}
                    </span>
                  </li>
                  <li>
                    <CheckCircle size={18} color="#22c55e" />
                    <span>{t("label.signalsFetched")}: {dateFormatter.format(new Date(data.intel.fetchedAt))}</span>
                  </li>
                </ul>
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </motion.section>
  );
};

export default ProposalView;

