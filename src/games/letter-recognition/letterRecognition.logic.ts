import { useState, useCallback, useEffect, useRef } from "react";
import { LetterRecognitionState, LetterCase } from "./letterRecognition.types";
import {
  UPPER_LETTERS,
  LOWER_LETTERS,
  OPTION_COLORS,
  OPTIONS_COUNT,
} from "./letterRecognition.config";
import {
  speakLetterRecognitionPrompt,
  speakLetterRecognitionFeedback,
  stopLetterRecognitionTTS,
} from "./letterRecognition.tts";
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

export function useLetterRecognitionGame(letterCase: LetterCase) {
  const { t } = useTranslation();
  const [state, setState] = useState<LetterRecognitionState>({
    level: 1,
    score: 0,
    targetLetter: "",
    options: [],
    targetColor: "",
    optionColors: [],
    answered: false,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const generateRound = useCallback(
    (level: number, overrideCase?: LetterCase) => {
      const activeCase = overrideCase || letterCase;
      const allLetters = activeCase === "upper" ? UPPER_LETTERS : LOWER_LETTERS;

      const targetLetter = allLetters[(level - 1) % allLetters.length];

      const others = allLetters.filter((l) => l !== targetLetter);
      const distractors = shuffle(others).slice(0, OPTIONS_COUNT - 1);
      const shuffledOptions = shuffle([targetLetter, ...distractors]);

      const targetColorIndex = Math.floor(Math.random() * OPTION_COLORS.length);
      const targetColor = OPTION_COLORS[targetColorIndex];

      const optionColors = shuffledOptions.map((letter, idx) =>
        letter === targetLetter
          ? targetColor
          : OPTION_COLORS[(targetColorIndex + idx + 1) % OPTION_COLORS.length],
      );

      setState((prev) => ({
        ...prev,
        level,
        targetLetter,
        options: shuffledOptions,
        targetColor,
        optionColors,
        answered: false,
        feedback: null,
      }));

      // Fire TTS immediately when round starts
      stopLetterRecognitionTTS().then(() => {
        const prompt = t("letterRecognition.instruction", {
          letter: targetLetter.toLowerCase(),
        });
        speakLetterRecognitionPrompt(prompt);
      });
    },
    [letterCase, t],
  );

  const handleRestart = useCallback(() => {
    stopLetterRecognitionTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  const handleCaseChange = useCallback(
    (newCase: LetterCase) => {
      stopLetterRecognitionTTS();
      setState((prev) => ({ ...prev, level: 1, score: 0 }));
      generateRound(1, newCase);
    },
    [generateRound],
  );

  // Initialize first round
  useEffect(() => {
    generateRound(1);
    return () => {
      stopLetterRecognitionTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleChoice = useCallback(
    async (chosen: string) => {
      if (state.answered || isBusy) return;

      setIsBusy(true);

      if (chosen === state.targetLetter) {
        setState((prev) => ({
          ...prev,
          answered: true,
          score: prev.score + 10,
          feedback: {
            type: "success",
            message: `${state.targetLetter} ✓`,
            emoji: "🌟",
          },
        }));

        AudioManager.playSuccess();
        await speakLetterRecognitionFeedback(state.targetLetter.toLowerCase());

        setTimeout(() => {
          generateRound(state.level + 1);
          setIsBusy(false);
        }, 2000);
      } else {
        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: t("letterRecognition.tryAgain"),
            emoji: "🤔",
          },
        }));

        AudioManager.playError();
        speakLetterRecognitionFeedback(
          t("letterRecognition.tryAgain").replace("!", ""),
        );

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 1000);
      }
    },
    [state.answered, isBusy, state.targetLetter, state.level, generateRound, t],
  );

  return {
    state,
    isBusy,
    handleChoice,
    handleRestart,
    handleCaseChange,
  };
}
