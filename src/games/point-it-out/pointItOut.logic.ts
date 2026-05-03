import { useState, useCallback, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { PointItOutState, HiddenObject, LevelConfig } from "./pointItOut.types";
import { LEVELS } from "./pointItOut.config";
import {
  speakPointItOutPrompt,
  speakPointItOutFeedback,
  stopPointItOutTTS,
} from "./pointItOut.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import { SpeechRecognitionService } from "../../services/SpeechRecognitionService";

export function usePointItOutGame() {
  const { t } = useTranslation();
  const [state, setState] = useState<PointItOutState>({
    level: 1,
    score: 0,
    objects: [],
    currentTarget: null,
    showHint: false,
    isListening: false,
    speechAvailable: SpeechRecognitionService.isAvailable(),
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);
  const hintPulse = useRef(new Animated.Value(0)).current;

  const getLevelConfig = useCallback((level: number): LevelConfig => {
    const normalizedLevel = (level - 1) % LEVELS.length;
    return LEVELS[normalizedLevel];
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      const config = getLevelConfig(level);
      const shuffledObjects = [...config.objects]
        .map((obj) => ({ ...obj, found: false }))
        .sort(() => Math.random() - 0.5);

      const target = shuffledObjects[0] || null;

      setState((prev) => ({
        ...prev,
        level,
        objects: shuffledObjects,
        currentTarget: target,
        showHint: false,
        feedback: null,
      }));

      stopPointItOutTTS().then(() => {
        if (target) {
          const prompt = t("pointItOut.findCommand", {
            object: t(`pointItOut.objects.${target.id}`),
          });
          speakPointItOutPrompt(prompt);
        }
      });
    },
    [getLevelConfig, t],
  );

  const handleRestart = useCallback(() => {
    stopPointItOutTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopPointItOutTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulse animation for hint
  useEffect(() => {
    if (state.showHint && state.currentTarget) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(hintPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(hintPulse, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      hintPulse.setValue(0);
    }
  }, [state.showHint, state.currentTarget, hintPulse]);

  // Hint timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, showHint: true }));
    }, 8000);
    return () => clearTimeout(timer);
  }, [state.currentTarget]);

  const handleObjectFound = useCallback(
    async (obj: HiddenObject) => {
      setIsBusy(true);
      AudioManager.playSuccess();

      setState((prev) => {
        const newObjects = prev.objects.map((o) =>
          o.id === obj.id ? { ...o, found: true } : o,
        );
        const remainingObjects = newObjects.filter((o) => !o.found);
        const isComplete = remainingObjects.length === 0;

        const nextTarget = isComplete
          ? null
          : remainingObjects[
              Math.floor(Math.random() * remainingObjects.length)
            ];

        // We set state now, but we will handle the next level transition in a timeout
        return {
          ...prev,
          score: prev.score + 10,
          objects: newObjects,
          currentTarget: nextTarget,
          showHint: false,
          feedback: isComplete
            ? {
                type: "success",
                message: t("pointItOut.allFound"),
                emoji: "🎉",
              }
            : {
                type: "success",
                message: t("pointItOut.foundIt"),
                emoji: "✨",
              },
        };
      });

      // After state update, speak
      const currentObjectsCount =
        state.objects.filter((o) => !o.found).length - 1; // -1 for the one just found

      if (currentObjectsCount === 0) {
        // Level complete
        setTimeout(() => {
          generateRound(state.level + 1);
          setIsBusy(false);
        }, 1200);
      } else {
        // Next object
        setTimeout(() => {
          setState((prev) => {
            if (prev.currentTarget) {
              const prompt = t("pointItOut.findCommand", {
                object: t(`pointItOut.objects.${prev.currentTarget.id}`),
              });
              speakPointItOutPrompt(prompt);
            }
            return { ...prev, feedback: null };
          });
          setIsBusy(false);
        }, 800);
      }
    },
    [state.objects, state.level, generateRound, t],
  );

  const handleObjectTap = useCallback(
    (obj: HiddenObject) => {
      if (obj.found || isBusy) return;

      if (state.currentTarget && obj.id === state.currentTarget.id) {
        handleObjectFound(obj);
      } else {
        // Wrong tap
        AudioManager.playError();
        // Don't show an error overlay, just let them try again. Maybe replay the prompt.
        if (state.currentTarget) {
          const prompt = t("pointItOut.findCommand", {
            object: t(`pointItOut.objects.${state.currentTarget.id}`),
          });
          speakPointItOutPrompt(prompt);
        }
      }
    },
    [state.currentTarget, isBusy, handleObjectFound, t],
  );

  const toggleSpeech = useCallback(async () => {
    if (!state.speechAvailable) {
      setState((prev) => ({
        ...prev,
        feedback: {
          type: "hint",
          message: t("pointItOut.voiceUnavailable", {
            defaultValue: "Voice input is unavailable on this build.",
          }),
        },
      }));
      setTimeout(() => setState((prev) => ({ ...prev, feedback: null })), 1200);
      return;
    }

    if (state.isListening) {
      await SpeechRecognitionService.stopListening();
      setState((prev) => ({ ...prev, isListening: false }));
    } else {
      const hasPermission = await SpeechRecognitionService.requestPermissions();
      if (hasPermission) {
        setState((prev) => ({ ...prev, isListening: true }));
        await SpeechRecognitionService.startListening((result) => {
          // Because of closures, we must ensure we get the latest target
          setState((prev) => {
            if (
              prev.currentTarget &&
              SpeechRecognitionService.isMatch(
                result.text,
                prev.currentTarget.name,
              )
            ) {
              handleObjectFound(prev.currentTarget);
              SpeechRecognitionService.stopListening();
              return { ...prev, isListening: false };
            }
            return prev;
          });
        });
      }
    }
  }, [state.isListening, state.speechAvailable, t, handleObjectFound]);

  const skipLevel = useCallback(() => {
    generateRound(state.level + 1);
  }, [state.level, generateRound]);

  return {
    state,
    isBusy,
    hintPulse,
    getLevelConfig,
    handleObjectTap,
    handleRestart,
    toggleSpeech,
    skipLevel,
  };
}
