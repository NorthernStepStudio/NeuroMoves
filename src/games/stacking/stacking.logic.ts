import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { StackingGameState, BlockData } from "./stacking.types";
import { DIFFICULTY_CONFIG, BLOCK_COLORS } from "./stacking.config";
import { speakStackingInstruction, stopStackingTTS } from "./stacking.tts";
import { AudioManager } from "../../systems/audio/audioManager";
import { useGame } from "../../core/GameContext";

export function useStackingGame(
  childAgeMonths: number = 48,
  parentModeEnabled: boolean = false,
) {
  const { t } = useTranslation();
  const { recordSuccess, recordError } = useGame();

  const [state, setState] = useState<StackingGameState>({
    level: 1,
    score: 0,
    blocks: [],
    currentBlockIndex: 0,
    feedback: null,
  });

  const [isHolding, setIsHolding] = useState(false);
  const [parentPrompt, setParentPrompt] = useState<string | null>(null);
  const [floatingLabels, setFloatingLabels] = useState<
    { id: number; text: string; x: number; y: number }[]
  >([]);

  const blockIdRef = useRef(0);
  const blockPositionsRef = useRef<{ [key: number]: { x: number; y: number } }>(
    {},
  );

  const isPermissive = childAgeMonths < 60;
  let ageMaxLevel = 10;
  if (childAgeMonths < 48) ageMaxLevel = 3;
  else if (childAgeMonths < 60) ageMaxLevel = 6;
  else if (childAgeMonths < 96) ageMaxLevel = 8;

  const effectiveLevel = Math.min(Math.max(state.level, 1), ageMaxLevel);
  const params =
    DIFFICULTY_CONFIG[effectiveLevel as keyof typeof DIFFICULTY_CONFIG];

  const showParentPrompt = useCallback(
    (type: "start" | "struggle" | "success") => {
      if (!parentModeEnabled) return;
      let message = "";
      switch (type) {
        case "start":
          message = t("stacking.parentStart");
          break;
        case "struggle":
          message = t("stacking.parentStruggle");
          break;
        case "success":
          message = t("stacking.parentSuccess");
          break;
      }
      setParentPrompt(message);
      setTimeout(() => setParentPrompt(null), 4000);
    },
    [parentModeEnabled, t],
  );

  const getBlocksForLevel = useCallback((level: number) => {
    // Platform starts moving side-to-side at level 7.
    // After that, gradually increase tower length up to 10 blocks.
    if (level < 7) {
      return 5;
    }
    return Math.min(10, 5 + (level - 6));
  }, []);

  const generateRound = useCallback(
    (level: number) => {
      const initialBlocks: BlockData[] = [];
      const blocksForRound = getBlocksForLevel(level);
      for (let i = 0; i < blocksForRound; i++) {
        initialBlocks.push({
          id: blockIdRef.current++,
          color: BLOCK_COLORS[i % BLOCK_COLORS.length],
          isPlaced: false,
        });
      }

      setState((prev) => ({
        ...prev,
        level,
        blocks: initialBlocks,
        currentBlockIndex: 0,
        feedback: null,
      }));

      blockPositionsRef.current = {};
      setFloatingLabels([]);
      setIsHolding(false);

      stopStackingTTS().then(() => {
        speakStackingInstruction(t("stacking.instruction"));
      });
    },
    [getBlocksForLevel, t],
  );

  const handleRestart = useCallback(() => {
    stopStackingTTS();
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopStackingTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = useCallback(
    (
      idx: number,
      targetXOffset: number,
      targetY: number,
      platformXValue: number,
      height: number,
    ) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AudioManager.playSuccess();

      const blocksForRound = state.blocks.length || 5;

      blockPositionsRef.current[idx] = { x: targetXOffset, y: targetY };

      setState((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b, i) =>
          i === idx ? { ...b, isPlaced: true } : b,
        ),
        score: prev.score + 10,
      }));

      setFloatingLabels((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: (idx + 1).toString(),
          x: platformXValue + targetXOffset + params.blockSize / 2 - 20,
          y: height - targetY - params.blockSize - 40,
        },
      ]);

      if (idx === blocksForRound - 1) {
        speakStackingInstruction(blocksForRound.toString());
        setTimeout(
          () => speakStackingInstruction(t("stacking.towerBuilt")),
          600,
        );

        setState((prev) => ({
          ...prev,
          feedback: {
            type: "success",
            message: t("stacking.towerBuilt"),
            emoji: "🗼",
          },
        }));
        showParentPrompt("success");

        setTimeout(() => {
          generateRound(state.level + 1);
        }, 3500);
      } else {
        speakStackingInstruction((idx + 1).toString());
        setState((prev) => ({ ...prev, currentBlockIndex: idx + 1 }));
      }
      recordSuccess();
    },
    [
      params.blockSize,
      state.level,
      state.blocks.length,
      generateRound,
      showParentPrompt,
      t,
      recordSuccess,
    ],
  );

  const handleError = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    AudioManager.playError();
    recordError();
  }, [recordError]);

  const removeFloatingLabel = useCallback((id: number) => {
    setFloatingLabels((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return {
    state,
    params,
    isPermissive,
    isHolding,
    setIsHolding,
    parentPrompt,
    floatingLabels,
    blockPositionsRef,
    handleSuccess,
    handleError,
    removeFloatingLabel,
    handleRestart,
  };
}
