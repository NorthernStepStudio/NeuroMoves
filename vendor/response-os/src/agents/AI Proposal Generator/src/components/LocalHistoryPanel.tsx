import { BrainCircuit, Database, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "@nss/proposal-i18n";
import { localeFromLanguage } from "@nss/proposal-i18n";
import {
  LocalHistorySignals,
  SupportedLanguage
} from "../types/proposal";
import { confidenceLabelFromSampleSize } from "@nss/proposal-core";

interface LocalHistoryPanelProps {
  language: SupportedLanguage;
  signals?: LocalHistorySignals;
  onClear: () => void;
}

const LocalHistoryPanel = ({ language, signals, onClear }: LocalHistoryPanelProps) => {
  const { t } = useTranslation();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeFromLanguage(language), {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }),
    [language]
  );

  const confidence = confidenceLabelFromSampleSize(signals?.sampleSize ?? 0);

  return (
    <section className="glass-card intel-panel reveal">
      <h3 className="panel-title">
        <BrainCircuit size={20} /> {t("section.history")}
      </h3>
      <p className="panel-subtitle">{t("hint.localOnly")}</p>
      <div className="intel-grid">
        <article className="intel-item">
          <p className="party-heading">
            <Database size={14} /> {t("label.historySample")}
          </p>
          <p className="party-line">{signals?.sampleSize ?? 0}</p>
          <p className="proposal-meta">
            {t("label.historyConfidence")}: {confidence}
          </p>
        </article>
        <article className="intel-item">
          <p className="party-heading">
            <ShieldCheck size={14} /> Benchmarks
          </p>
          <p className="party-line">
            {t("label.historyMedianTotal")}:{" "}
            {signals?.projectTypeMedianTotal !== null &&
            signals?.projectTypeMedianTotal !== undefined
              ? currencyFormatter.format(signals.projectTypeMedianTotal)
              : t("status.na")}
          </p>
          <p className="party-line">
            {t("label.historyMedianRate")}:{" "}
            {signals?.projectTypeMedianPerSqFt !== null &&
            signals?.projectTypeMedianPerSqFt !== undefined
              ? `${currencyFormatter.format(signals.projectTypeMedianPerSqFt)} / sq ft`
              : t("status.na")}
          </p>
        </article>
      </div>
      {!signals ? <p className="proposal-meta">{t("hint.noHistory")}</p> : null}
      <div className="intel-action-row">
        <button type="button" className="ghost-btn" onClick={onClear}>
          {t("action.clearHistory")}
        </button>
      </div>
    </section>
  );
};

export default LocalHistoryPanel;

