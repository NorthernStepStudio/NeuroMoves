import { Building2, Calculator, UserRound } from "lucide-react";
import { useTranslation } from "@nss/proposal-i18n";
import {
  ClientProfile,
  ContractorProfile,
  ProposalSettings
} from "../types/proposal";
import type { CpeStructuredIntake } from "../types/cpe";
import StructuredIntakePanel from "./StructuredIntakePanel";

interface ProjectDetailsPanelProps {
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  cpeIntake: CpeStructuredIntake;
  onContractorChange: (value: ContractorProfile) => void;
  onClientChange: (value: ClientProfile) => void;
  onSettingsChange: (value: ProposalSettings) => void;
  onCpeIntakeChange: (value: CpeStructuredIntake) => void;
}

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ProjectDetailsPanel = ({
  contractor,
  client,
  settings,
  cpeIntake,
  onContractorChange,
  onClientChange,
  onSettingsChange,
  onCpeIntakeChange
}: ProjectDetailsPanelProps) => {
  const { t } = useTranslation();
  const missingIdentityFields =
    !contractor.companyName.trim() ||
    !contractor.contactName.trim() ||
    !client.name.trim();

  return (
    <section className="details-stack">
      <article className="glass-card details-card reveal">
        <h3 className="panel-title">
          <Building2 size={20} /> {t("section.contractor")}
        </h3>
        <p className="panel-subtitle">
          This information appears on the generated agreement and exports.
        </p>
        {missingIdentityFields ? (
          <p className="inline-warning">{t("hint.requiredIdentity")}</p>
        ) : null}
        <div className="field-grid">
          <label className="field">
            <span>
              {t("label.company")} <em className="required-field">{t("label.required")}</em>
            </span>
            <input
              className={`input-field ${!contractor.companyName.trim() ? "input-required" : ""}`}
              value={contractor.companyName}
              onChange={(event) =>
                onContractorChange({
                  ...contractor,
                  companyName: event.target.value
                })
              }
              placeholder="Enter company name"
            />
          </label>
          <label className="field">
            <span>
              {t("label.contact")} <em className="required-field">{t("label.required")}</em>
            </span>
            <input
              className={`input-field ${!contractor.contactName.trim() ? "input-required" : ""}`}
              value={contractor.contactName}
              onChange={(event) =>
                onContractorChange({
                  ...contractor,
                  contactName: event.target.value
                })
              }
              placeholder="Enter contact name"
            />
          </label>
          <label className="field">
            <span>{t("label.email")}</span>
            <input
              className="input-field"
              type="email"
              value={contractor.email}
              onChange={(event) =>
                onContractorChange({
                  ...contractor,
                  email: event.target.value
                })
              }
              placeholder="jordan@northstep.com"
            />
          </label>
          <label className="field">
            <span>{t("label.phone")}</span>
            <input
              className="input-field"
              value={contractor.phone}
              onChange={(event) =>
                onContractorChange({
                  ...contractor,
                  phone: event.target.value
                })
              }
              placeholder="(555) 010-1202"
            />
          </label>
          <label className="field">
            <span>{t("label.license")}</span>
            <input
              className="input-field"
              value={contractor.licenseNumber}
              onChange={(event) =>
                onContractorChange({
                  ...contractor,
                  licenseNumber: event.target.value
                })
              }
              placeholder="LIC-214982"
            />
          </label>
        </div>
      </article>

      <article className="glass-card details-card reveal">
        <h3 className="panel-title">
          <UserRound size={20} /> {t("section.client")}
        </h3>
        <p className="panel-subtitle">
          Use the project address for more accurate weather and schedule risk signals.
        </p>
        <div className="field-grid">
          <label className="field">
            <span>
              {t("label.clientName")} <em className="required-field">{t("label.required")}</em>
            </span>
            <input
              className={`input-field ${!client.name.trim() ? "input-required" : ""}`}
              value={client.name}
              onChange={(event) =>
                onClientChange({
                  ...client,
                  name: event.target.value
                })
              }
              placeholder="Enter client name"
            />
          </label>
          <label className="field">
            <span>{t("label.email")}</span>
            <input
              className="input-field"
              type="email"
              value={client.email}
              onChange={(event) =>
                onClientChange({
                  ...client,
                  email: event.target.value
                })
              }
              placeholder="alex@email.com"
            />
          </label>
          <label className="field">
            <span>{t("label.phone")}</span>
            <input
              className="input-field"
              value={client.phone}
              onChange={(event) =>
                onClientChange({
                  ...client,
                  phone: event.target.value
                })
              }
              placeholder="(555) 010-4478"
            />
          </label>
          <label className="field field-full">
            <span>{t("label.address")}</span>
            <input
              className="input-field"
              value={client.address}
              onChange={(event) =>
                onClientChange({
                  ...client,
                  address: event.target.value
                })
              }
              placeholder="1220 Main St, Denver, CO 80202"
            />
          </label>
        </div>
      </article>

      <article className="glass-card details-card reveal">
        <h3 className="panel-title">
          <Calculator size={20} /> {t("section.pricing")}
        </h3>
        <p className="panel-subtitle">
          Tune rates to match your market and preferred cash-flow profile.
        </p>
        <div className="field-grid settings-grid">
          <label className="field">
            <span>{t("label.tax")}</span>
            <input
              className="input-field"
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={settings.taxRate}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  taxRate: toNumber(event.target.value, settings.taxRate)
                })
              }
            />
          </label>
          <label className="field">
            <span>{t("label.contingency")}</span>
            <input
              className="input-field"
              type="number"
              min={0}
              max={30}
              step={0.1}
              value={settings.contingencyRate}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  contingencyRate: toNumber(
                    event.target.value,
                    settings.contingencyRate
                  )
                })
              }
            />
          </label>
          <label className="field">
            <span>{t("label.deposit")}</span>
            <input
              className="input-field"
              type="number"
              min={10}
              max={60}
              step={1}
              value={settings.depositRate}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  depositRate: toNumber(event.target.value, settings.depositRate)
                })
              }
            />
          </label>
          <label className="field">
            <span>{t("label.timeline")}</span>
            <input
              className="input-field"
              type="number"
              min={3}
              max={365}
              value={settings.timelineDays}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  timelineDays: toNumber(event.target.value, settings.timelineDays)
                })
              }
            />
          </label>
          <label className="field">
            <span>{t("label.validity")}</span>
            <input
              className="input-field"
              type="number"
              min={7}
              max={90}
              value={settings.validityDays}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  validityDays: toNumber(event.target.value, settings.validityDays)
                })
              }
            />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.includePermitAllowance}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                includePermitAllowance: event.target.checked
              })
            }
          />
          <span>{t("label.permitAllowance")}</span>
        </label>
      </article>

      <StructuredIntakePanel intake={cpeIntake} onChange={onCpeIntakeChange} />
    </section>
  );
};

export default ProjectDetailsPanel;

