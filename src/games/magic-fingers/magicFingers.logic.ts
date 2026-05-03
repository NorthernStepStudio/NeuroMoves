import { useState, useCallback, useEffect, useRef } from "react";
import { Animated, GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { MagicFingersGameState, LevelConfig } from "./magicFingers.types";
import { FINGERS } from "./magicFingers.config";
import {
  speakMagicFingersPrompt,
  stopMagicFingersTTS,
} from "./magicFingers.tts";
import { AudioManager } from "../../systems/audio/audioManager";

export function useMagicFingersGame(childAgeMonths: number = 48) {
  const { t } = useTranslation();

  const [state, setState] = useState<MagicFingersGameState>({
    level: 1,
    score: 0,
    levelConfig: { sequence: [1], description: "" },
    currentStep: 0,
    highlightedFinger: null,
    errors: 0,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);
  const [floatingLabels, setFloatingLabels] = useState<
    { id: number; text: string; x: number; y: number }[]
  >([]);

  const fingerScales = useRef(FINGERS.map(() => new Animated.Value(1))).current;

  const generateLevel = useCallback(
    (level: number): LevelConfig => {
      let maxSequenceLength = 5;
      if (childAgeMonths < 36) maxSequenceLength = 2;
      else if (childAgeMonths < 60) maxSequenceLength = 4;

      let targetLength = 1;
      if (level === 1) targetLength = 1;
      else if (level === 2) targetLength = 2;
      else {
        targetLength = Math.min(level, maxSequenceLength);
      }

      const newSequence: number[] = [];
      if (level === 1) {
        newSequence.push(1);
      } else if (level === 2) {
        newSequence.push(1, 2);
      } else {
        let lastFinger = -1;
        for (let i = 0; i < targetLength; i++) {
          let fingerId;
          do {
            fingerId = Math.floor(Math.random() * 5) + 1;
          } while (fingerId === lastFinger && targetLength > 1);
          newSequence.push(fingerId);
          lastFinger = fingerId;
        }
      }

      const desc =
        level <= 2
          ? level === 1
            ? t("magicFingers.descThumb")
            : t("magicFingers.descFingers")
          : t("magicFingers.descPattern");

      return {
        sequence: newSequence,
        description: desc,
      };
    },
    [childAgeMonths, t],
  );

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const config = generateLevel(level);

      setState((prev) => ({
        ...prev,
        level,
        levelConfig: config,
        currentStep: 0,
        highlightedFinger: null,
        errors: 0,
        feedback: null,
      }));

      setFloatingLabels([]);

      fingerScales.forEach((scale) => scale.setValue(1));

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          highlightedFinger: config.sequence[0],
        }));
      }, 500);

      stopMagicFingersTTS().then(() => {
        speakMagicFingersPrompt(config.description);
      });
    },
    [generateLevel, fingerScales],
  );

  const handleRestart = useCallback(() => {
    stopMagicFingersTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopMagicFingersTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFingerTap = useCallback(
    (fingerId: number, event: GestureResponderEvent) => {
      if (isBusy) return;

      const { sequence } = state.levelConfig;
      const expectedFinger = sequence[state.currentStep];
      const fingerIndex = FINGERS.findIndex((f) => f.id === fingerId);

      const { pageX, pageY } = event.nativeEvent;

      Animated.sequence([
        Animated.timing(fingerScales[fingerIndex], {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fingerScales[fingerIndex], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (fingerId === expectedFinger) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setFloatingLabels((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: fingerId.toString(),
            x: pageX - 20,
            y: pageY - 40,
          },
        ]);

        const newStep = state.currentStep + 1;

        if (newStep >= sequence.length) {
          setIsBusy(true);
          AudioManager.playSuccess();

          setState((prev) => ({
            ...prev,
            score: prev.score + 10,
            highlightedFinger: null,
            feedback: {
              type: "success",
              message: t("magicFingers.greatJob"),
              emoji: "🖐️",
            },
          }));

          setTimeout(() => {
            generateRound(state.level + 1);
          }, 1200);
        } else {
          setState((prev) => ({
            ...prev,
            currentStep: newStep,
            highlightedFinger: sequence[newStep],
          }));
        }
      } else {
        AudioManager.playError();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const newErrors = state.errors + 1;

        setState((prev) => ({
          ...prev,
          errors: newErrors,
        }));

        if (newErrors >= 1) {
          setState((prev) => ({
            ...prev,
            feedback: {
              type: "hint",
              message: t("magicFingers.tapFinger", { finger: expectedFinger }),
              emoji: "👆",
            },
          }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, feedback: null }));
          }, 1000);
        }
      }
    },
    [isBusy, state, fingerScales, generateRound, t],
  );

  const removeFloatingLabel = useCallback((id: number) => {
    setFloatingLabels((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return {
    state,
    fingerScales,
    floatingLabels,
    handleFingerTap,
    removeFloatingLabel,
    handleRestart,
  };
}
