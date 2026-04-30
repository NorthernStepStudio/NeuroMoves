import { useState } from "react";
import { useTranslation } from "@nss/proposal-i18n";
import { Activity, CloudRain, Database, RefreshCw } from "lucide-react";
import { ProposalIntel, SupportedLanguage } from "../types/proposal";
import { fetchPublicProposalIntel } from "../services/publicIntel";

interface ProposalIntelPanelProps {
  locationQuery: string;
  timelineDays: number;
  language: SupportedLanguage;
  intel: ProposalIntel | null;
  onIntelUpdate: (intel: ProposalIntel | null) => void;
}

const formatMaybeNumber = (
  value: number | null,
  digits = 1,
  suffix = "",
  fallback = "N/A"
): string => {
  if (value === null) {
    return fallback;
  }

  return `${value.toFixed(digits)}${suffix}`;
};

const ProposalIntelPanel = ({
  locationQuery,
  timelineDays,
  language,
  intel,
  onIntelUpdate
}: ProposalIntelPanelProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPublicProposalIntel(locationQuery, timelineDays, language);
      onIntelUpdate(result);
    } catch {
      setError(t("error.fetchIntel"));
    } finally {
      setIsLoading(false);
    }
  };

  const weatherRiskLabel = intel?.weather
    ? `${intel.weather.riskLevel.toUpperCase()} risk`
    : t("status.weatherNoData");

  return (
    <section className="glass-card intel-panel reveal">
      <h3 className="panel-title">
        <Database size={20} /> {t("section.intel")}
      </h3>
      <p className="panel-subtitle">
        Pull legal public data to improve timeline and pricing decisions.
      </p>

      <div className="intel-action-row">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            void handleFetch();
          }}
          disabled={isLoading}
        >
          {isLoading ? <RefreshCw size={16} className="spin-icon" /> : <RefreshCw size={16} />}
          {isLoading ? t("action.fetchingSignals") : t("action.fetchSignals")}
        </button>
        <p className="intel-location">
          {t("label.query")}: {(locationQuery || "United States").slice(0, 80)}
        </p>
      </div>

      <div className="intel-grid">
        <article className="intel-item">
          <p className="party-heading">
            <Activity size={14} /> {t("label.marketSnapshot")}
          </p>
          <p className="party-line">
            CPI index: {formatMaybeNumber(intel?.market?.cpiIndex ?? null, 3, "", t("status.na"))}
          </p>
          <p className="party-line">
            CPI YoY:{" "}
            {formatMaybeNumber(intel?.market?.cpiYearOverYear ?? null, 2, "%", t("status.na"))}
          </p>
          <p className="party-line">
            Unemployment:{" "}
            {formatMaybeNumber(intel?.market?.unemploymentRate ?? null, 1, "%", t("status.na"))}
          </p>
          <p className="proposal-meta">
            {t("status.ref")}: {intel?.market?.referencePeriod ?? t("status.notFetched")}
          </p>
        </article>

        <article className="intel-item">
          <p className="party-heading">
            <CloudRain size={14} /> {t("label.scheduleRisk")}
          </p>
          <p className="party-line">{weatherRiskLabel}</p>
          <p className="party-line">
            {t("status.highRiskDays")}: {intel?.weather?.highRiskDays ?? 0} /{" "}
            {Math.max(3, Math.min(7, timelineDays))}
          </p>
          <p className="party-line">
            Location: {intel?.weather?.locationName ?? t("status.notFetched")}
          </p>
          <p className="proposal-meta">{intel?.weather?.timezone ?? ""}</p>
        </article>
      </div>

      {intel?.sourceNotes?.length ? (
        <ul className="terms-list compact-list source-list">
          {intel.sourceNotes.map((source) => (
            <li key={source}>
              <span>{source}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};

export default ProposalIntelPanel;

