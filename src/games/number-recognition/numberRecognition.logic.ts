import { useState, useCallback, useEffect } from "react";
import { NumberRecognitionState } from "./numberRecognition.types";
import {
  OPTION_COLORS,
  OPTIONS_COUNT,
  MAX_NUMBER,
} from "./numberRecognition.config";
import {
  speakNumberRecognitionPrompt,
  speakNumberRecognitionFeedback,
  stopNumberRecognitionTTS,
} from "./numberRecognition.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDistractors(
  target: number,
  count: number,
  max: number,
): number[] {
  const distractors = new Set<number>();
  while (distractors.size < count) {
    const n = Math.floor(Math.random() * max) + 1;
    if (n !== target) {
      distractors.add(n);
    }
  }
  return Array.from(distractors);
}

export function useNumberRecognitionGame() {
  const { t } = useTranslation();
  const [state, setState] = useState<NumberRecognitionState>({
    level: 1,
    score: 0,
    targetNumber: null,
    options: [],
    targetColor: "",
    optionColors: [],
    answered: false,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const generateRound = useCallback(
    (level: number) => {
      // Simple progression up to MAX_NUMBER
      const targetNumber = ((level - 1) % MAX_NUMBER) + 1;

      const distractors = generateDistractors(
        targetNumber,
        OPTIONS_COUNT - 1,
        MAX_NUMBER,
      );
      const shuffledOptions = shuffle([targetNumber, ...distractors]);

      const targetColorIndex = Math.floor(Math.random() * OPTION_COLORS.length);
      const targetColor = OPTION_COLORS[targetColorIndex];

      const optionColors = shuffledOptions.map((num, idx) =>
        num === targetNumber
          ? targetColor
          : OPTION_COLORS[(targetColorIndex + idx + 1) % OPTION_COLORS.length],
      );

      setState((prev) => ({
        ...prev,
        level,
        targetNumber,
        options: shuffledOptions,
        targetColor,
        optionColors,
        answered: false,
        feedback: null,
      }));

      // Fire TTS immediately when round starts
      stopNumberRecognitionTTS().then(() => {
        const prompt = t("numberRecognition.instruction", {
          number: targetNumber.toString(),
        });
        speakNumberRecognitionPrompt(prompt);
      });
    },
    [t],
  );

  const handleRestart = useCallback(() => {
    stopNumberRecognitionTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  // Initialize first round
  useEffect(() => {
    generateRound(1);
    return () => {
      stopNumberRecognitionTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleChoice = useCallback(
    async (chosen: number) => {
      if (state.answered || isBusy) return;

      setIsBusy(true);

      if (chosen === state.targetNumber) {
        setState((prev) => ({
          ...prev,
          answered: true,
          score: prev.score + 10,
          feedback: {
            type: "success",
            message: `${state.targetNumber} ✓`,
            emoji: "🌟",
          },
        }));

        AudioManager.playSuccess();
        await speakNumberRecognitionFeedback(state.targetNumber.toString());

        setTimeout(() => {
          generateRound(state.level + 1);
          setIsBusy(false);
        }, 2000);
      } else {
        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: t("numberRecognition.tryAgain"),
            emoji: "🤔",
          },
        }));

        AudioManager.playError();
        speakNumberRecognitionFeedback(
          t("numberRecognition.tryAgain").replace("!", ""),
        );

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 1000);
      }
    },
    [state.answered, isBusy, state.targetNumber, state.level, generateRound, t],
  );

  return {
    state,
    isBusy,
    handleChoice,
    handleRestart,
  };
}
