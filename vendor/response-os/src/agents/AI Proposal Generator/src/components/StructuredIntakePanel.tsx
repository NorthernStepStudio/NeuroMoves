import { useMemo, useState } from "react";
import { ClipboardList, Hammer, Settings2 } from "lucide-react";
import type { CpeStructuredIntake, ContractorTradeProfile } from "../types/cpe";

interface StructuredIntakePanelProps {
  intake: CpeStructuredIntake;
  onChange: (value: CpeStructuredIntake) => void;
}

type IntakeTab = "project" | "materials" | "labor" | "allowances" | "timeline" | "notes";

const TAB_ORDER: Array<{ id: IntakeTab; label: string }> = [
  { id: "project", label: "Project Info" },
  { id: "materials", label: "Materials / Equipment" },
  { id: "labor", label: "Labor Scope" },
  { id: "allowances", label: "Allowances" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Special Notes" }
];

const TRADE_OPTIONS: Array<{ id: ContractorTradeProfile; label: string }> = [
  { id: "renovation", label: "General Renovation (Apartments)" },
  { id: "hvac", label: "HVAC" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" }
];

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const StructuredIntakePanel = ({ intake, onChange }: StructuredIntakePanelProps) => {
  const [activeTab, setActiveTab] = useState<IntakeTab>("project");

  const tradeHint = useMemo(() => {
    if (intake.tradeProfile === "hvac") {
      return "Include equipment model, SEER goals, and duct assumptions.";
    }
    if (intake.tradeProfile === "plumbing") {
      return "Call out visible vs hidden plumbing conditions and fixture specs.";
    }
    if (intake.tradeProfile === "electrical") {
      return "Capture panel assumptions, device counts, and inspection notes.";
    }
    return "Use room-by-room scope and allowance notes to avoid scope creep.";
  }, [intake.tradeProfile]);

  return (
    <article className="glass-card details-card reveal">
      <h3 className="panel-title">
        <ClipboardList size={20} /> Contractor Proposal Engine Intake
      </h3>
      <p className="panel-subtitle">
        Structured intake drives deterministic proposal output. Choose trade profile first.
      </p>

      <div className="field-grid">
        <label className="field field-full">
          <span>Trade Profile</span>
          <select
            className="input-field"
            value={intake.tradeProfile}
            onChange={(event) =>
              onChange({
                ...intake,
                tradeProfile: event.target.value as ContractorTradeProfile
              })
            }
          >
            {TRADE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="proposal-meta">{tradeHint}</p>

      <div className="intake-tab-row">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`intake-tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "project" ? (
        <div className="field-grid">
          <label className="field field-full">
            <span>Job Type</span>
            <input
              className="input-field"
              value={intake.projectInfo.jobType}
              onChange={(event) =>
                onChange({
                  ...intake,
                  projectInfo: {
                    ...intake.projectInfo,
                    jobType: event.target.value
                  }
                })
              }
              placeholder="Example: Apartment kitchen electrical rewire"
            />
          </label>
          <label className="field">
            <span>Square Footage</span>
            <input
              className="input-field"
              type="number"
              min={0}
              value={intake.projectInfo.squareFootage}
              onChange={(event) =>
                onChange({
                  ...intake,
                  projectInfo: {
                    ...intake.projectInfo,
                    squareFootage: toNumber(event.target.value, intake.projectInfo.squareFootage)
                  }
                })
              }
            />
          </label>
          <label className="field">
            <span>Units / Fixtures</span>
            <input
              className="input-field"
              type="number"
              min={0}
              value={intake.projectInfo.units}
              onChange={(event) =>
                onChange({
                  ...intake,
                  projectInfo: {
                    ...intake.projectInfo,
                    units: toNumber(event.target.value, intake.projectInfo.units)
                  }
                })
              }
            />
          </label>
        </div>
      ) : null}

      {activeTab === "materials" ? (
        <div className="content-group">
          <p className="party-heading">
            <Settings2 size={14} /> Materials / Equipment
          </p>
          <textarea
            className="input-field intake-textarea"
            value={intake.materialsEquipment}
            onChange={(event) =>
              onChange({
                ...intake,
                materialsEquipment: event.target.value
              })
            }
            placeholder={"One item per line, e.g.\n- 2.5 ton condenser\n- Smart thermostat\n- Copper line set"}
          />
        </div>
      ) : null}

      {activeTab === "labor" ? (
        <div className="content-group">
          <p className="party-heading">
            <Hammer size={14} /> Labor Scope
          </p>
          <textarea
            className="input-field intake-textarea"
            value={intake.laborScope}
            onChange={(event) =>
              onChange({
                ...intake,
                laborScope: event.target.value
              })
            }
            placeholder={"One task per line, e.g.\n- Remove existing unit\n- Install new line set\n- Commission and test system"}
          />
        </div>
      ) : null}

      {activeTab === "allowances" ? (
        <div className="content-group">
          <p className="party-heading">Allowances</p>
          <textarea
            className="input-field intake-textarea"
            value={intake.allowances}
            onChange={(event) =>
              onChange({
                ...intake,
                allowances: event.target.value
              })
            }
            placeholder={"One allowance per line, e.g.\n- Fixture allowance: $650 each\n- Tile allowance: $8/sqft"}
          />
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <div className="content-group">
          <p className="party-heading">Timeline Notes</p>
          <textarea
            className="input-field intake-textarea"
            value={intake.timelineNotes}
            onChange={(event) =>
              onChange({
                ...intake,
                timelineNotes: event.target.value
              })
            }
            placeholder={"Example:\n- Start after permit approval\n- 2 phases over 14 days\n- Inspection on final day"}
          />
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <div className="content-group">
          <p className="party-heading">Special Notes</p>
          <textarea
            className="input-field intake-textarea"
            value={intake.specialNotes}
            onChange={(event) =>
              onChange({
                ...intake,
                specialNotes: event.target.value
              })
            }
            placeholder={"Call out risk conditions, client requests, apartment access, or compliance notes."}
          />
        </div>
      ) : null}
    </article>
  );
};

export default StructuredIntakePanel;
