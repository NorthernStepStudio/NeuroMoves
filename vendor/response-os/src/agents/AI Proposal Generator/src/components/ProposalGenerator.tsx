import { ReactNode, useCallback, useMemo, useState } from "react";
import { buildDeterministicProposal } from "@nss/proposal-core";
import {
  ClientProfile,
  ContractorProfile,
  EntitlementState,
  LocalHistorySignals,
  ProposalData,
  ProposalIntel,
  ProposalSettings,
  SupportedLanguage
} from "../types/proposal";
import { generateProposalViaApi } from "../services/api";
import { generateProposalViaResponseOS } from "../services/responseos";
import type { CpeStructuredIntake } from "../types/cpe";

interface ProposalGeneratorState {
  generateProposal: () => Promise<void>;
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  missingFields: string[];
}

interface ProposalGeneratorProps {
  description: string;
  photos: File[];
  contractor: ContractorProfile;
  client: ClientProfile;
  settings: ProposalSettings;
  cpeIntake: CpeStructuredIntake;
  intel: ProposalIntel | null;
  language: SupportedLanguage;
  entitlementState: EntitlementState;
  historySignals?: LocalHistorySignals;
  onGenerated: (proposal: ProposalData) => void;
  children: (state: ProposalGeneratorState) => ReactNode;
}

const composeFallbackDescription = (description: string, intake: CpeStructuredIntake): string => {
  const segments = [
    description.trim(),
    intake.projectInfo.jobType ? `Job type: ${intake.projectInfo.jobType}` : "",
    intake.projectInfo.squareFootage > 0 ? `Square footage: ${intake.projectInfo.squareFootage}` : "",
    intake.projectInfo.units > 0 ? `Units: ${intake.projectInfo.units}` : "",
    intake.materialsEquipment ? `Materials: ${intake.materialsEquipment}` : "",
    intake.laborScope ? `Labor scope: ${intake.laborScope}` : "",
    intake.allowances ? `Allowances: ${intake.allowances}` : "",
    intake.timelineNotes ? `Timeline: ${intake.timelineNotes}` : "",
    intake.specialNotes ? `Special notes: ${intake.specialNotes}` : ""
  ].filter(Boolean);

  return segments.join("\n");
};

const withTimeout = async <T,>(task: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const ProposalGenerator = ({
  description,
  photos,
  contractor,
  client,
  settings,
  cpeIntake,
  intel,
  language,
  entitlementState,
  historySignals,
  onGenerated,
  children
}: ProposalGeneratorProps): ReactNode => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingFields = useMemo(() => {
    const missing: string[] = [];

    if (!description.trim()) {
      missing.push("Scope description");
    }
    if (!contractor.companyName.trim()) {
      missing.push("Contractor company name");
    }
    if (!contractor.contactName.trim()) {
      missing.push("Contractor contact name");
    }
    if (!client.name.trim()) {
      missing.push("Client name");
    }

    return missing;
  }, [client.name, contractor.companyName, contractor.contactName, description]);

  const canGenerate = missingFields.length === 0;

  const generateProposal = useCallback(async () => {
    if (!canGenerate || isGenerating) {
      if (missingFields.length > 0) {
        setError(`Complete required fields: ${missingFields.join(", ")}.`);
      }
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let proposal: ProposalData | null = null;

      try {
        proposal = await withTimeout(
          generateProposalViaApi({
            description,
            photos,
            contractor,
            client,
            settings,
            cpeIntake,
            intel,
            language,
            entitlementState,
            historySignals
          }),
          2500
        );
      } catch {
        // Fall through to local ResponseOS fallback.
      }

      if (!proposal) {
        try {
          proposal = await withTimeout(
            generateProposalViaResponseOS({
              description,
              photos,
              contractor,
              client,
              settings,
              cpeIntake,
              intel,
              language,
              entitlementState,
              historySignals
            }),
            2500
          );
        } catch {
          // Fall through to deterministic fallback.
        }
      }

      if (!proposal) {
        proposal = buildDeterministicProposal({
          description: composeFallbackDescription(description, cpeIntake),
          photoCount: photos.length,
          contractor,
          client,
          settings,
          intel,
          geminiDraft: null,
          language,
          platform: "web",
          historySignals
        });
      }

      onGenerated(proposal);
    } catch {
      setError("Proposal generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    canGenerate,
    client,
    contractor,
    description,
    entitlementState,
    historySignals,
    intel,
    isGenerating,
    language,
    missingFields,
    onGenerated,
    photos,
    settings,
    cpeIntake
  ]);

  return children({
    generateProposal,
    isGenerating,
    canGenerate,
    error,
    missingFields
  });
};

export default ProposalGenerator;
