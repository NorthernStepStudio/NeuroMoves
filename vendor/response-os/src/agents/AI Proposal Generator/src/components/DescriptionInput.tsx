import { FileText, Wand2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "@nss/proposal-i18n";

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void | Promise<void>;
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onUseTemplate: (value: string) => void;
  missingFields: string[];
}

const TEMPLATE_SCOPES = [
  "Install 42 sq ft porcelain tile kitchen backsplash, including demolition, wall prep, grout, and final cleanup.",
  "Repaint 1,200 sq ft interior (living room, hallway, and bedrooms), including patching nail holes and two coats of premium paint.",
  "Install 380 sq ft luxury vinyl plank flooring in main level with baseboard reset and transitions."
];

const DescriptionInput = ({
  value,
  onChange,
  onGenerate,
  isGenerating,
  canGenerate,
  error,
  onUseTemplate,
  missingFields
}: DescriptionInputProps) => {
  const { t } = useTranslation();
  const wordCount = useMemo(() => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [value]);

  return (
    <section className="glass-card input-panel reveal">
      <h3 className="panel-title">
        <FileText size={20} /> {t("section.description")}
      </h3>
      <p className="panel-subtitle">
        Be specific about dimensions, materials, access, and timeline constraints.
      </p>

      <div className="template-row">
        {TEMPLATE_SCOPES.map((template) => (
          <button
            key={template}
            type="button"
            className="template-chip"
            onClick={() => onUseTemplate(template)}
          >
            {template.split(",")[0]}
          </button>
        ))}
      </div>

      <div className="description-input-wrap">
        <textarea
          className={`input-field description-input ${!value.trim() ? "input-required" : ""}`}
          placeholder="Example: Install 40 sq ft of white subway tile backsplash in kitchen, including removal of old tile, grout, and final cleanup."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      <button
        className="btn-primary"
        onClick={() => {
          void onGenerate();
        }}
        disabled={isGenerating || !canGenerate}
      >
        {isGenerating ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {t("action.generating")}
          </>
        ) : (
          <>
            <Wand2 size={20} /> {t("action.generate")}
          </>
        )}
      </button>

      <p className="input-meta">
        {wordCount} words | {t("hint.description")}
      </p>
      {missingFields.length > 0 ? (
        <p className="inline-warning">
          {t("hint.requiredBefore")} {missingFields.join(", ")}
        </p>
      ) : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};

export default DescriptionInput;

