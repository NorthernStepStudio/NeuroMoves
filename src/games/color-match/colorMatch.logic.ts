import { useState, useCallback, useRef, useEffect } from "react";
import { ColorMatchState, ColorOption } from "./colorMatch.types";
import {
  COLORS,
  MAX_OPTIONS_TODDLER,
  MAX_OPTIONS_DEFAULT,
  MAX_OPTIONS_SCHOOL,
} from "./colorMatch.config";
import {
  speakColorMatchInstruction,
  speakColorMatchFeedback,
  stopColorMatchTTS,
} from "./colorMatch.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function useColorMatchGame(childAgeMonths: number = 48) {
  const { t } = useTranslation();
  const [state, setState] = useState<ColorMatchState>({
    level: 1,
    score: 0,
    targetColor: null,
    options: [],
    roundComplete: false,
    feedback: null,
  });
  const [isBusy, setIsBusy] = useState(false);

  const availableTargetsRaw = useRef<ColorOption[]>([]);

  let maxOptions = MAX_OPTIONS_DEFAULT;
  if (childAgeMonths < 36) maxOptions = MAX_OPTIONS_TODDLER;
  else if (childAgeMonths > 60) maxOptions = MAX_OPTIONS_SCHOOL;

  const getOptionsCount = useCallback(
    (level: number) => {
      return Math.min(2 + level, maxOptions);
    },
    [maxOptions],
  );

  const replenishBag = useCallback(() => {
    availableTargetsRaw.current = shuffleArray(COLORS);
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      if (level === 1 || availableTargetsRaw.current.length === 0) {
        replenishBag();
      }

      const target = availableTargetsRaw.current.pop() || COLORS[0];
      const numOptions = getOptionsCount(level);

      const potentialDistractors = COLORS.filter((c) => c.name !== target.name);
      const shuffledDistractors = shuffleArray(potentialDistractors);
      const selectedDistractors = shuffledDistractors.slice(0, numOptions - 1);

      const finalOptions = shuffleArray([target, ...selectedDistractors]);

      setState((prev) => ({
        ...prev,
        level,
        targetColor: target,
        options: finalOptions,
        roundComplete: false,
        feedback: null,
      }));

      // Voice Prompt
      setTimeout(() => {
        const prompt = t("colorMatch.instruction", {
          color: t(`colorMatch.voiceLabels.${target.name}`),
        });
        speakColorMatchInstruction(prompt, setIsBusy);
      }, 100);
    },
    [getOptionsCount, replenishBag, t],
  );

  const handleRestart = useCallback(() => {
    stopColorMatchTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  // Initialize first round
  useEffect(() => {
    generateRound(1);
    return () => {
      stopColorMatchTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleColorPress = useCallback(
    async (color: ColorOption) => {
      if (state.roundComplete || isBusy || !state.targetColor) return;

      setIsBusy(true);

      if (color.name === state.targetColor.name) {
        setState((prev) => ({
          ...prev,
          roundComplete: true,
          score: prev.score + 10,
          feedback: {
            type: "success",
            message: t("colorMatch.successMessage"),
            emoji: "🎉",
          },
        }));

        AudioManager.playSuccess();
        await speakColorMatchFeedback(t("colorMatch.successMessage"));

        setTimeout(() => {
          generateRound(state.level + 1);
          setIsBusy(false);
        }, 1200);
      } else {
        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: t("colorMatch.tryAgain"),
            emoji: "🤔",
          },
        }));

        AudioManager.playError();
        speakColorMatchFeedback(t("colorMatch.tryAgain").replace("!", ""));

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 1000);
      }
    },
    [
      state.roundComplete,
      isBusy,
      state.targetColor,
      state.level,
      t,
      generateRound,
    ],
  );

  return {
    state,
    isBusy,
    handleColorPress,
    handleRestart,
  };
}
