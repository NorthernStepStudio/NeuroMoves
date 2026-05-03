import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import {
  PopBubblesGameState,
  BubbleConfig,
  BubbleData,
} from "./popBubbles.types";
import { BUBBLE_COLORS } from "./popBubbles.config";
import {
  playBubblePop,
  speakPopBubblesInstruction,
  stopPopBubblesTTS,
} from "./popBubbles.audio";

export function usePopBubblesGame(
  childAgeMonths: number = 48,
  gameLayout: { width: number; height: number },
) {
  const { t } = useTranslation();

  const [state, setState] = useState<PopBubblesGameState>({
    level: 1,
    score: 0,
    bubbleData: [],
    poppedCount: 0,
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const poppedBubbleIdsRef = useRef<Set<number>>(new Set());
  const layoutReadyRef = useRef(false);

  const config = useRef<BubbleConfig>({
    maxBubbles: 20,
    moveStartLevel: 1,
    minSize: 60,
    maxSize: 100,
    speedMultiplier: 1.0,
    minDuration: 1000,
  });

  useEffect(() => {
    let conf = { ...config.current };
    if (childAgeMonths < 36) {
      conf.maxBubbles = 8;
      conf.moveStartLevel = 1;
      conf.minSize = 120;
      conf.maxSize = 170;
      conf.speedMultiplier = 0.7;
      conf.minDuration = 3000;
    } else if (childAgeMonths < 60) {
      conf.maxBubbles = 15;
      conf.moveStartLevel = 1;
      conf.minSize = 80;
      conf.maxSize = 130;
      conf.speedMultiplier = 0.8;
      conf.minDuration = 2000;
    } else {
      conf.maxBubbles = 20;
      conf.moveStartLevel = 1;
      conf.minSize = 70;
      conf.maxSize = 120;
      conf.speedMultiplier = 1.0;
      conf.minDuration = 1500;
    }
    config.current = conf;
  }, [childAgeMonths]);

  useEffect(() => {
    if (gameLayout.width > 0 && gameLayout.height > 0) {
      layoutReadyRef.current = true;
    }
  }, [gameLayout]);

  const generateRound = useCallback(
    (level: number) => {
      if (!layoutReadyRef.current) return;
      setIsBusy(false);

      let baseCount = 4 + (level - 1);
      let randomAdd = level >= 5 ? Math.floor(Math.random() * 4) + 1 : 0;
      const bubbleCount = Math.min(
        baseCount + randomAdd,
        config.current.maxBubbles,
      );

      poppedBubbleIdsRef.current.clear();

      const newBubbles: BubbleData[] = [];
      for (let i = 0; i < bubbleCount; i++) {
        const size =
          config.current.minSize +
          Math.random() * (config.current.maxSize - config.current.minSize);
        const startX = Math.random() * (gameLayout.width - size);
        const startY = Math.random() * (gameLayout.height - size);

        newBubbles.push({
          id: i,
          startX,
          startY,
          size,
          color:
            BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
          floatSpeed: 1000 + Math.random() * 1500,
        });
      }

      setState((prev) => ({
        ...prev,
        level,
        bubbleData: newBubbles,
        poppedCount: 0,
        feedback: null,
      }));
    },
    [gameLayout],
  );

  const handleRestart = useCallback(() => {
    stopPopBubblesTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    if (layoutReadyRef.current) {
      generateRound(1);
    }
  }, [generateRound]);

  useEffect(() => {
    if (layoutReadyRef.current) {
      generateRound(1);
    }
  }, [layoutReadyRef.current, generateRound]);

  useEffect(() => {
    stopPopBubblesTTS().then(() => {
      speakPopBubblesInstruction(t("popBubbles.instruction"));
    });
    return () => {
      stopPopBubblesTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePopComplete = useCallback((id: number) => {
    if (poppedBubbleIdsRef.current.has(id)) return;
    poppedBubbleIdsRef.current.add(id);

    const newPoppedCount = poppedBubbleIdsRef.current.size;

    setState((prev) => ({
      ...prev,
      poppedCount: newPoppedCount,
      score: prev.score + 10,
    }));

    playBubblePop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  useEffect(() => {
    if (
      state.bubbleData.length > 0 &&
      state.poppedCount >= state.bubbleData.length &&
      !isBusy
    ) {
      setIsBusy(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      speakPopBubblesInstruction(t("popBubbles.allPoppedText"));

      setState((prev) => ({
        ...prev,
        feedback: {
          type: "success",
          message: t("popBubbles.allPopped"),
          position: "center",
          confetti: true,
          transparent: true,
        },
      }));

      setTimeout(() => {
        generateRound(state.level + 1);
      }, 2500);
    }
  }, [
    state.poppedCount,
    state.bubbleData.length,
    state.level,
    isBusy,
    generateRound,
    t,
  ]);

  return {
    state,
    config: config.current,
    handlePopComplete,
    handleRestart,
  };
}
