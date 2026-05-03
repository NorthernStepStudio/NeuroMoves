import { useState, useCallback, useEffect } from "react";
import { BodyPartsGameState } from "./bodyParts.types";
import { AVAILABLE_PARTS } from "./bodyParts.config";
import {
  speakBodyPartsPrompt,
  speakBodyPartsFeedback,
  stopBodyPartsTTS,
} from "./bodyParts.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";

export function useBodyPartsGame() {
  const { t } = useTranslation();

  const [state, setState] = useState<BodyPartsGameState>({
    level: 1,
    score: 0,
    targetPart: "head",
    roundComplete: false,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const getPartsForLevel = useCallback((level: number) => {
    const numParts = Math.min(
      1 + Math.floor(level / 2),
      AVAILABLE_PARTS.length,
    );
    return AVAILABLE_PARTS.slice(0, numParts);
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const availableParts = getPartsForLevel(level);
      const newTarget =
        availableParts[Math.floor(Math.random() * availableParts.length)];

      setState((prev) => ({
        ...prev,
        level,
        targetPart: newTarget,
        roundComplete: false,
        feedback: null,
      }));

      stopBodyPartsTTS().then(() => {
        speakBodyPartsPrompt(
          t("bodyParts.instruction", {
            part: t(`bodyParts.parts.${newTarget}`),
          }).toUpperCase(),
        );
      });
    },
    [getPartsForLevel, t],
  );

  const handleRestart = useCallback(() => {
    stopBodyPartsTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopBodyPartsTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoneTap = useCallback(
    (zoneName: string) => {
      if (state.roundComplete || isBusy) return;

      setIsBusy(true);

      if (zoneName === state.targetPart) {
        AudioManager.playSuccess();
        const msg = t("bodyParts.successMessage", {
          part: t(`bodyParts.parts.${zoneName}`),
        });

        setState((prev) => ({
          ...prev,
          score: prev.score + 10,
          roundComplete: true,
          feedback: { type: "success", message: msg, emoji: "🎯" },
        }));

        speakBodyPartsFeedback(msg);

        setTimeout(() => {
          generateRound(state.level + 1);
        }, 1200);
      } else {
        AudioManager.playError();
        const hintMsg = t("bodyParts.hintMessage", {
          part: t(`bodyParts.parts.${state.targetPart}`),
        });

        setState((prev) => ({
          ...prev,
          feedback: { type: "hint", message: hintMsg, emoji: "👆" },
        }));

        speakBodyPartsFeedback(hintMsg);

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 1000);
      }
    },
    [
      state.targetPart,
      state.roundComplete,
      state.level,
      isBusy,
      generateRound,
      t,
    ],
  );

  return {
    state,
    isBusy,
    handleZoneTap,
    handleRestart,
  };
}
