import { useState, useCallback, useEffect, useRef } from "react";
import { Animated, PanResponder } from "react-native";
import { ShapeSortingState, ShapeConfig } from "./shapeSorting.types";
import { SHAPES, HIT_THRESHOLD } from "./shapeSorting.config";
import {
  speakShapeSortingPrompt,
  speakShapeSortingFeedback,
  stopShapeSortingTTS,
} from "./shapeSorting.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useTranslation } from "react-i18next";
import { useGame } from "../../core/GameContext"; // Only for settings, NOT state/TTS

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function useShapeSortingGame() {
  const { t } = useTranslation();
  const { settings } = useGame(); // Allowed to get childAgeMonths

  const [state, setState] = useState<ShapeSortingState>({
    level: 1,
    score: 0,
    levelConfig: null,
    isDropped: false,
    floatingLabels: [],
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const shapeScale = useRef(new Animated.Value(1)).current;

  const [targetPositions, setTargetPositions] = useState<{
    [key: string]: { x: number; y: number; w: number; h: number };
  }>({});
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  const availableShapesBag = useRef<ShapeConfig[]>([]);

  const replenishBag = useCallback(() => {
    availableShapesBag.current = shuffleArray([...SHAPES]);
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      setIsBusy(false);
      const ageMonths = settings?.childAgeMonths ?? 48;
      let maxTargets = 4;

      if (ageMonths < 36) {
        maxTargets = 2;
      } else if (ageMonths < 60) {
        maxTargets = 3;
      }

      maxTargets = Math.min(maxTargets, 4);
      const numTargets = Math.min(2 + Math.floor(level / 2), maxTargets);

      if (level === 1 || availableShapesBag.current.length < numTargets) {
        replenishBag();
      }

      const draggable = availableShapesBag.current.pop() || SHAPES[0];

      const potentialDistractors = SHAPES.filter(
        (s) => s.type !== draggable.type,
      );
      const shuffledDistractors = shuffleArray(potentialDistractors);
      const distractors = shuffledDistractors.slice(0, numTargets - 1);
      const targets = shuffleArray([draggable, ...distractors]);

      setState((prev) => ({
        ...prev,
        level,
        levelConfig: { draggable, targets },
        isDropped: false,
        feedback: null,
      }));

      setTargetPositions({});
      pan.setValue({ x: 0, y: 0 });
      shapeScale.setValue(1);

      stopShapeSortingTTS().then(() => {
        const prompt = t("shapeSorting.instruction", {
          shape: t(`shapes.${draggable.type}`),
        });
        speakShapeSortingPrompt(prompt);
      });
    },
    [settings?.childAgeMonths, pan, shapeScale, replenishBag, t],
  );

  const handleRestart = useCallback(() => {
    stopShapeSortingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0, floatingLabels: [] }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopShapeSortingTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  const checkDrop = useCallback(
    (dropX: number, dropY: number) => {
      if (!state.levelConfig || isBusy) return;

      const correctType = state.levelConfig.draggable.type;
      let bestHit: string | null = null;
      let minDistance = 10000;

      for (const [type, relBounds] of Object.entries(targetPositions)) {
        const targetCenterX = containerOffset.x + relBounds.x + relBounds.w / 2;
        const targetCenterY = containerOffset.y + relBounds.y + relBounds.h / 2;

        const dist = getDistance(dropX, dropY, targetCenterX, targetCenterY);

        if (dist < HIT_THRESHOLD && dist < minDistance) {
          minDistance = dist;
          bestHit = type;
        }
      }

      if (bestHit) {
        if (bestHit === correctType) {
          setIsBusy(true);
          setState((prev) => ({
            ...prev,
            isDropped: true,
            score: prev.score + 10,
          }));
          AudioManager.playSuccess();

          const targetBounds = targetPositions[correctType];
          if (targetBounds) {
            setState((prev) => ({
              ...prev,
              floatingLabels: [
                ...prev.floatingLabels,
                {
                  id: Date.now(),
                  text: "🎯",
                  x:
                    containerOffset.x +
                    targetBounds.x +
                    targetBounds.w / 2 -
                    20,
                  y:
                    containerOffset.y +
                    targetBounds.y +
                    targetBounds.h / 2 -
                    40,
                },
              ],
            }));
          }

          setState((prev) => ({
            ...prev,
            feedback: {
              type: "success",
              message: t("shapeSorting.perfect"),
              emoji: "🎯",
            },
          }));

          speakShapeSortingFeedback(t("shapeSorting.perfect"));

          Animated.timing(shapeScale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start();

          setTimeout(() => {
            generateRound(state.level + 1);
          }, 1500);
          return;
        } else {
          AudioManager.playError();
          setState((prev) => ({
            ...prev,
            feedback: {
              type: "error",
              message: t("shapeSorting.tryAgain"),
              emoji: "🤔",
            },
          }));
          speakShapeSortingFeedback(
            t("shapeSorting.tryAgain").replace("!", ""),
          );
          setTimeout(
            () => setState((prev) => ({ ...prev, feedback: null })),
            800,
          );
        }
      }

      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 5,
        tension: 60,
        useNativeDriver: false,
      }).start();
    },
    [
      state.levelConfig,
      state.level,
      isBusy,
      containerOffset,
      targetPositions,
      generateRound,
      t,
      pan,
      shapeScale,
    ],
  );

  const checkDropRef = useRef(checkDrop);
  checkDropRef.current = checkDrop;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(shapeScale, {
          toValue: 1.1,
          friction: 5,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt) => {
        const dropX = evt.nativeEvent.pageX;
        const dropY = evt.nativeEvent.pageY;
        pan.flattenOffset();
        checkDropRef.current(dropX, dropY);
      },
    }),
  ).current;

  const handleTargetLayout = useCallback((type: string, event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setTargetPositions((prev) => ({
      ...prev,
      [type]: { x, y, w: width, h: height },
    }));
  }, []);

  const removeFloatingLabel = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      floatingLabels: prev.floatingLabels.filter((l) => l.id !== id),
    }));
  }, []);

  return {
    state,
    pan,
    shapeScale,
    panResponder,
    setContainerOffset,
    handleTargetLayout,
    handleRestart,
    removeFloatingLabel,
  };
}
