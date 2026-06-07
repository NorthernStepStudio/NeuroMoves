import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  SharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  useDerivedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import { FeedbackOverlay } from "../../components/GameComponents";
import { FloatingFeedback } from "../../components/FloatingFeedback";
import { useStackingGame } from "./stacking.logic";
import { PLATFORM_BOTTOM, PLATFORM_WIDTH } from "./stacking.config";
import { colors, spacing, borderRadius, fontSize } from "../../theme/colors";

const { width, height } = Dimensions.get("window");
const DEFAULT_GAME_AREA_HEIGHT = Math.round(height * 0.72);
const BLOCK_HEIGHT_RATIO = 0.7;
// Stack step: normal blocks use `BLOCK_HEIGHT_RATIO`, compact mode uses this smaller ratio
const STACK_STEP_RATIO_COMPACT = 0.5;

const getSpawnBottom = (
  gameAreaHeight: number,
  level: number,
  blockSize: number,
  totalBlocks: number,
) => {
  // Increase the vertical gap from the platform to the spawn area by ~50%
  // (previously +300 from PLATFORM_BOTTOM -> now +450)
  const baseSpawn = Math.max(
    PLATFORM_BOTTOM + 675,
    Math.round(gameAreaHeight * 0.82),
  );

  // After level 7 (when the platform starts side-to-side movement),
  // raise spawn height further to increase play space for taller towers.
  const postLevelSevenBoost =
    level >= 7 ? Math.min(160, 60 + (level - 7) * 24) : 0;

  const blockHeight = blockSize * BLOCK_HEIGHT_RATIO;

  // Keep the spawn inside the game area so touches remain reliable.
  const maxSpawnWithinArea = Math.max(
    // also increase the maximum-safe spawn offset so the spawn stays well above the platform
    PLATFORM_BOTTOM + 495,
    gameAreaHeight - blockHeight - 8,
  );

  // Compute the tower top *if stacked at the configured step* (no compression).
  // We use that to ensure the spawn starts a comfortable distance above the tower.
  const baseStackY = PLATFORM_BOTTOM + 40;
  const configuredStackStep = blockSize * (level >= 7 ? STACK_STEP_RATIO_COMPACT : BLOCK_HEIGHT_RATIO);
  const topTower = totalBlocks > 0 ? baseStackY + (totalBlocks - 1) * configuredStackStep : baseStackY;

  // Minimum desired gap above the tower before spawning a new block.
  // Use 1.5× block height to make the spawn clearly separated from the top block.
  const minGap = Math.round(blockHeight * 1.5);

  // Keep base spawn reasonable so smaller towers still spawn in view.
  const desiredSpawnCandidate = Math.max(baseSpawn + postLevelSevenBoost, topTower + minGap);
  return Math.min(desiredSpawnCandidate, maxSpawnWithinArea);
};

export default function StackingScreen() {
  const { t } = useTranslation();
  const [gameAreaHeight, setGameAreaHeight] = useState(DEFAULT_GAME_AREA_HEIGHT);
  const {
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
  } = useStackingGame(48, false); // Pass childAgeMonths and parentModeEnabled appropriately from context if needed

  const platformX = useSharedValue(width / 2 - PLATFORM_WIDTH / 2);

  useEffect(() => {
    const midX = width / 2 - PLATFORM_WIDTH / 2;
    const edgePadding = 8;
    const minX = edgePadding;
    const maxX = width - PLATFORM_WIDTH - edgePadding;

    if (state.level >= 7) {
      platformX.value = midX;
      const duration = Math.max(2000 - (state.level - 7) * 400, 1000);

      platformX.value = withRepeat(
        withSequence(
          withTiming(maxX, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(midX, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(minX, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(midX, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      );
    } else if (state.level >= 3) {
      // Lower levels should still feel calm, but avoid tiny center shifts.
      // Force position into a left or right zone farther from middle.
      const centerDeadZone = Math.max(42, (maxX - minX) * 0.24);
      const goRight = Math.random() > 0.5;

      const rightMin = Math.min(maxX, midX + centerDeadZone);
      const leftMax = Math.max(minX, midX - centerDeadZone);

      let nextX = midX;
      if (goRight && rightMin < maxX) {
        nextX = rightMin + Math.random() * (maxX - rightMin);
      } else if (!goRight && leftMax > minX) {
        nextX = minX + Math.random() * (leftMax - minX);
      } else {
        nextX = minX + Math.random() * (maxX - minX);
      }

      platformX.value = withSpring(nextX, { damping: 14, stiffness: 120 });
    } else {
      platformX.value = midX;
    }
  }, [state.level]);

  const platformStyle = useAnimatedStyle(() => {
    return {
      left: platformX.value,
    };
  });

  const spawnBottom = getSpawnBottom(
    gameAreaHeight,
    state.level,
    params.blockSize,
    state.blocks.length,
  );

  if (__DEV__) {
    try {
      console.log('[Stacking] spawnBottom', { spawnBottom, gameAreaHeight, level: state.level, totalBlocks: state.blocks.length, blockSize: params.blockSize });
    } catch (e) {}
  }

  const handleGameAreaLayout = (event: LayoutChangeEvent) => {
    const { height: nextHeight } = event.nativeEvent.layout;
    if (nextHeight > 0) {
      setGameAreaHeight(nextHeight);
    }
  };

  return (
    <GameShell
      title={t("stacking.title", { defaultValue: "Stacking" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t("stacking.subtitle")}</Text>
      </View>

      <View style={styles.gameArea} onLayout={handleGameAreaLayout}>
        {parentPrompt ? (
          <View style={styles.parentPromptContainer}>
            <Text style={styles.parentPromptLabel}>
              {t("common.parentTip", "PARENT TIP:")}
            </Text>
            <Text style={styles.parentPromptText}>{parentPrompt}</Text>
          </View>
        ) : null}
        <View style={styles.groundBase} />
        <Animated.View
          style={[
            styles.platform,
            platformStyle,
            { bottom: PLATFORM_BOTTOM, width: PLATFORM_WIDTH },
          ]}
        >
          <Text style={styles.platformText}>{t("stacking.startHere")}</Text>
        </Animated.View>

        {state.blocks.map((block, index) => (
          <StackingBlock
            key={`${state.level}-${block.id}`}
            index={index}
            color={block.color}
            blockSize={params.blockSize}
            totalBlocks={state.blocks.length}
            isCurrent={index === state.currentBlockIndex && !block.isPlaced}
            isPlaced={block.isPlaced}
            platformX={platformX}
            spawnBottom={spawnBottom}
            isPermissive={isPermissive}
            level={state.level}
            onSuccess={(x, y) =>
              handleSuccess(index, x, y, platformX.value, height, state.blocks.length)
            }
            onError={handleError}
            prevBlockPos={
              index > 0 ? blockPositionsRef.current[index - 1] : undefined
            }
            setIsHolding={setIsHolding}
            isHolding={isHolding && index === state.currentBlockIndex}
          />
        ))}
      </View>

      {state.feedback && (
        <FeedbackOverlay
          visible={!!state.feedback}
          type={state.feedback.type}
          message={state.feedback.message}
          emoji={state.feedback.emoji}
          compact={state.feedback.compact}
          position="top"
        />
      )}

      {floatingLabels.map((label) => (
        <FloatingFeedback
          key={label.id}
          text={label.text}
          x={label.x}
          y={label.y}
          onComplete={() => removeFloatingLabel(label.id)}
        />
      ))}
    </GameShell>
  );
}

interface BlockProps {
  index: number;
  color: string;
  blockSize: number;
  totalBlocks: number;
  isCurrent: boolean;
  isPlaced: boolean;
  platformX: SharedValue<number>;
  spawnBottom: number;
  isPermissive: boolean;
  level: number;
  onSuccess: (x: number, y: number, totalBlocks: number) => void;
  onError: () => void;
  prevBlockPos?: { x: number; y: number };
  setIsHolding: (h: boolean) => void;
  isHolding: boolean;
}
 

function StackingBlock({
  index,
  color,
  blockSize,
  totalBlocks,
  isCurrent,
  isPlaced,
  platformX,
  spawnBottom,
  isPermissive,
  level,
  onSuccess,
  onError,
  prevBlockPos,
  setIsHolding,
  isHolding,
}: BlockProps) {
  const blockHeight = blockSize * BLOCK_HEIGHT_RATIO;
  const configuredStackStep =
    blockSize * (level >= 7 ? STACK_STEP_RATIO_COMPACT : BLOCK_HEIGHT_RATIO);
  const baseStackY = PLATFORM_BOTTOM + 40;
  const requiredClearance = level >= 7 ? 140 : 110;
  const maxStepForClearance =
    totalBlocks > 1
      ? (spawnBottom - requiredClearance - baseStackY) / (totalBlocks - 1)
      : configuredStackStep;
  const minCompressedStep = blockSize * 0.3;
  const stackStep = Math.max(
    minCompressedStep,
    Math.min(configuredStackStep, maxStepForClearance),
  );

    if (__DEV__) {
      try {
        console.log('[Stacking] block spacing', {
          index,
          configuredStackStep,
          maxStepForClearance,
          minCompressedStep,
          stackStep,
          spawnBottom,
          baseStackY,
          totalBlocks,
        });
      } catch (e) {}
    }

  const translateX = useSharedValue(width / 2 - blockSize / 2);
  const translateY = useSharedValue(spawnBottom);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const hasPassedValidDropZone = useSharedValue(false);

  useEffect(() => {
    if (!isPlaced) {
      translateY.value = spawnBottom;
    }
  }, [isPlaced, spawnBottom, translateY]);

  const animatedX = useDerivedValue(() => {
    if (isPlaced) {
      return platformX.value + translateX.value;
    }
    return translateX.value;
  });

  const panGesture = Gesture.Pan()
    .enabled(isCurrent)
    .onStart(() => {
      runOnJS(setIsHolding)(true);
      hasPassedValidDropZone.value = false;
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      rotation.value = withSpring((Math.random() - 0.5) * 10);
      scale.value = withSpring(1.05);
    })
    .onUpdate((event) => {
      const currentX = contextX.value + event.translationX;
      const currentY = contextY.value - event.translationY;
      translateX.value = currentX;
      translateY.value = currentY;

        if (isPermissive) {
        const dropXOffset = currentX - platformX.value;
        const absoluteY = currentY;
        let refXOffset = PLATFORM_WIDTH / 2 - blockSize / 2;
        let refY = baseStackY;
        if (prevBlockPos) {
          refXOffset = prevBlockPos.x;
          refY = prevBlockPos.y + stackStep;
        }

        if (index === 0) {
          const groundDiffY = Math.abs(absoluteY - refY);
          const groundDiffX = Math.abs(dropXOffset - refXOffset);
          const horizontalTolerance = level >= 7 ? 180 : 150;
          if (groundDiffY < 120 && groundDiffX < horizontalTolerance) {
            hasPassedValidDropZone.value = true;
          }
        } else {
          const distY = Math.abs(absoluteY - refY);
          const distX = Math.abs(dropXOffset - refXOffset);
          if (distY < 90 && distX < blockSize * 0.95) {
            hasPassedValidDropZone.value = true;
          }
        }
      }
    })
    .onEnd((event) => {
      runOnJS(setIsHolding)(false);
      scale.value = withSpring(1);

      const dropXOffset = contextX.value + event.translationX - platformX.value;
      const dropY = contextY.value - event.translationY;

        let refXOffset = PLATFORM_WIDTH / 2 - blockSize / 2;
        let refY = baseStackY;
      if (prevBlockPos) {
        refXOffset = prevBlockPos.x;
        refY = prevBlockPos.y + stackStep;
      }

      let isSuccess = false;
      let targetXOffset = refXOffset;
      let targetY = refY;

      if (isPermissive && hasPassedValidDropZone.value) {
        isSuccess = true;
      } else if (index === 0) {
        const groundDiffY = Math.abs(dropY - refY);
        const groundDiffX = Math.abs(dropXOffset - refXOffset);
        const horizontalTolerance = level >= 7 ? 180 : 150;
        if (groundDiffY < 120 && groundDiffX < horizontalTolerance) {
          isSuccess = true;
          targetXOffset = dropXOffset;
        }
      } else {
        const distY = Math.abs(dropY - refY);
        const distX = Math.abs(dropXOffset - refXOffset);
        if (distY < 90 && distX < blockSize * 0.95) {
          isSuccess = true;
          targetXOffset = dropXOffset;
        }
      }

      if (isSuccess) {
        translateX.value = withSpring(targetXOffset);
        translateY.value = withSpring(targetY);
        rotation.value = withSpring(0);
        runOnJS(onSuccess)(targetXOffset, targetY, totalBlocks);
      } else {
        translateX.value = withSpring(width / 2 - blockSize / 2);
        translateY.value = withSpring(spawnBottom);
        rotation.value = withSpring(0);
        runOnJS(onError)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: animatedX.value,
      bottom: translateY.value,
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
      opacity: isCurrent || isPlaced ? 1 : 0,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.block,
          {
            width: blockSize,
            height: blockHeight,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      >
        {isCurrent && isHolding && (
          <View style={styles.holdIndicator}>
            <Text style={styles.holdText}>👆</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingVertical: spacing.xs },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  parentPromptContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    zIndex: 100,
    marginHorizontal: spacing.lg,
    backgroundColor: "#fef3c7",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  parentPromptLabel: {
    fontSize: fontSize.xs,
    color: "#92400e",
    fontWeight: "600",
    marginBottom: 4,
  },
  parentPromptText: {
    fontSize: fontSize.base,
    color: "#78350f",
    fontWeight: "500",
  },
  gameArea: { flex: 1, position: "relative" },
  platform: {
    position: "absolute",
    height: 44,
    backgroundColor: "#4ade80",
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  platformText: {
    color: "#064e3b",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  groundBase: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PLATFORM_BOTTOM + 15,
    backgroundColor: "#f1f5f9",
    borderTopWidth: 4,
    borderTopColor: "#e2e8f0",
    zIndex: 1,
  },
  block: {
    position: "absolute",
    borderRadius: borderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  holdIndicator: { position: "absolute", top: -30, alignSelf: "center" },
  holdText: { fontSize: 24 },
});
