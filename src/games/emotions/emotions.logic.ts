import { useState, useCallback, useEffect, useRef } from "react";
import { EmotionsGameState, Emotion } from "./emotions.types";
import { EMOTIONS } from "./emotions.config";
import {
  speakEmotionsPrompt,
  speakEmotionsFeedback,
  stopEmotionsTTS,
} from "./emotions.tts";
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

export function useEmotionsGame() {
  const { t } = useTranslation();

  const [state, setState] = useState<EmotionsGameState>({
    level: 1,
    score: 0,
    targetEmotion: null,
    options: [],
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);
  const lastTargetRef = useRef<string | null>(null);

  const getOptionsCount = useCallback((level: number) => {
    return Math.min(2 + Math.floor(level / 2), 6);
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const numOptions = getOptionsCount(level);
      const shuffled = shuffleArray([...EMOTIONS]);

      let selectedOptions = shuffled.slice(0, numOptions);
      let target =
        selectedOptions[Math.floor(Math.random() * selectedOptions.length)];

      if (EMOTIONS.length > 2) {
        let attempts = 0;
        while (target.name === lastTargetRef.current && attempts < 10) {
          const newShuffled = shuffleArray([...EMOTIONS]);
          selectedOptions = newShuffled.slice(0, numOptions);
          target =
            selectedOptions[Math.floor(Math.random() * selectedOptions.length)];
          attempts++;
        }
      }

      lastTargetRef.current = target.name;

      setState((prev) => ({
        ...prev,
        level,
        targetEmotion: target,
        options: shuffleArray(selectedOptions),
        feedback: null,
      }));

      stopEmotionsTTS().then(() => {
        speakEmotionsPrompt(
          t("emotions.instruction", {
            emotion: t(`emotions.list.${target.name}`),
          }),
        );
      });
    },
    [getOptionsCount, t],
  );

  const handleRestart = useCallback(() => {
    stopEmotionsTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopEmotionsTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmotionPress = useCallback(
    (emotion: Emotion) => {
      if (isBusy || !state.targetEmotion) return;

      setIsBusy(true);

      if (emotion.name === state.targetEmotion.name) {
        AudioManager.playSuccess();

        const msg = t("emotions.successMessage", {
          emotion: t(`emotions.list.${emotion.name}`),
        });
        setState((prev) => ({
          ...prev,
          score: prev.score + 10,
          feedback: { type: "success", message: msg, emoji: emotion.emoji },
        }));

        speakEmotionsFeedback(msg);

        setTimeout(() => {
          generateRound(state.level + 1);
        }, 1200);
      } else {
        AudioManager.playError();

        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: t("emotions.tryAgain"),
            emoji: "🤔",
          },
        }));

        speakEmotionsFeedback(t("emotions.tryAgain").replace("!", ""));

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 800);
      }
    },
    [isBusy, state.targetEmotion, state.level, generateRound, t],
  );

  return {
    state,
    isBusy,
    getOptionsCount,
    handleEmotionPress,
    handleRestart,
  };
}
