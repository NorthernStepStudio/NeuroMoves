import { useState, useCallback, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { YesNoGameState } from "./yesNoGame.types";
import { QUESTIONS } from "./yesNoGame.config";
import {
  speakYesNoPrompt,
  speakYesNoFeedback,
  stopYesNoTTS,
} from "./yesNoGame.tts";
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

export function useYesNoGame() {
  const { t } = useTranslation();

  const [state, setState] = useState<YesNoGameState>({
    level: 1,
    score: 0,
    questions: [],
    currentIndex: 0,
    isAnimating: false,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const getQuestionsForLevel = useCallback((level: number) => {
    const levelIndex = Math.min(level - 1, QUESTIONS.length - 1);
    const shuffledPool = shuffleArray(QUESTIONS[levelIndex]);
    return shuffledPool.slice(0, 5);
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const newQuestions = getQuestionsForLevel(level);

      setState((prev) => ({
        ...prev,
        level,
        questions: newQuestions,
        currentIndex: 0,
        isAnimating: false,
        feedback: null,
      }));

      pan.setValue({ x: 0, y: 0 });
      cardOpacity.setValue(1);

      stopYesNoTTS().then(() => {
        if (newQuestions.length > 0) {
          speakYesNoPrompt(newQuestions[0].text);
        }
      });
    },
    [getQuestionsForLevel, pan, cardOpacity],
  );

  const handleRestart = useCallback(() => {
    stopYesNoTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopYesNoTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback(
    async (gesture: "yes" | "no") => {
      if (
        state.isAnimating ||
        isBusy ||
        state.currentIndex >= state.questions.length
      )
        return;

      setIsBusy(true);
      const currentQuestion = state.questions[state.currentIndex];
      const isCorrect = gesture === currentQuestion.answer;

      if (isCorrect) {
        AudioManager.playSuccess();
        // Only include the generic "great job" praise at end of the level
        const isLastInRound = state.currentIndex === state.questions.length - 1;
        const yesFeedback = isLastInRound ? [t("yesNo.yesCorrect"), t("yesNo.greatJob")] : [t("yesNo.yesCorrect")];
        const noFeedback = isLastInRound ? [t("yesNo.noCorrect"), t("yesNo.greatJob")] : [t("yesNo.noCorrect")];
        const phrase =
          gesture === "yes"
            ? yesFeedback[Math.floor(Math.random() * yesFeedback.length)]
            : noFeedback[Math.floor(Math.random() * noFeedback.length)];

        setState((prev) => ({
          ...prev,
          score: prev.score + 10,
          isAnimating: true,
          feedback: { type: "success", message: phrase, emoji: "✨" },
        }));

        await speakYesNoFeedback(phrase);

        setTimeout(() => {
          const nextIdx = state.currentIndex + 1;
          if (nextIdx >= state.questions.length) {
            generateRound(state.level + 1);
          } else {
            setState((prev) => ({
              ...prev,
              currentIndex: nextIdx,
              isAnimating: false,
              feedback: null,
            }));
            pan.setValue({ x: 0, y: 0 });
            cardOpacity.setValue(1);
            speakYesNoPrompt(state.questions[nextIdx].text);
            setIsBusy(false);
          }
        }, 1000);
      } else {
        AudioManager.playError();
        const errorPhrases = [t("yesNo.oopsTryAgain"), t("yesNo.tryAgain")];
        const phrase =
          errorPhrases[Math.floor(Math.random() * errorPhrases.length)];

        setState((prev) => ({
          ...prev,
          isAnimating: true,
          feedback: { type: "error", message: phrase, emoji: "🤔" },
        }));

        await speakYesNoFeedback(phrase);

        setTimeout(() => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();

          setState((prev) => ({ ...prev, isAnimating: false, feedback: null }));
          setIsBusy(false);
        }, 800);
      }
    },
    [state, isBusy, generateRound, pan, cardOpacity, t],
  );

  return {
    state,
    pan,
    cardOpacity,
    handleAnswer,
    handleRestart,
  };
}
