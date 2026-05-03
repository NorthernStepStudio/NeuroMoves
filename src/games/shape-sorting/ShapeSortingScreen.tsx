import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { FloatingFeedback } from "../../components/FloatingFeedback";
import { useShapeSortingGame } from "./shapeSorting.logic";
import { ShapeType } from "./shapeSorting.types";
import { TARGET_SIZE, DRAGGABLE_SIZE } from "./shapeSorting.config";
import { colors, spacing } from "../../theme/colors";

export default function ShapeSortingScreen() {
  const { t } = useTranslation();
  const {
    state,
    pan,
    shapeScale,
    panResponder,
    setContainerOffset,
    handleTargetLayout,
    handleRestart,
    removeFloatingLabel,
  } = useShapeSortingGame();

  const targetsContainerRef = useRef<View | null>(null);

  const measureContainer = useCallback(() => {
    if (targetsContainerRef.current) {
      targetsContainerRef.current.measureInWindow((x, y, w, h) => {
        setContainerOffset({ x, y });
      });
    }
  }, [setContainerOffset]);

  const renderShape = (type: ShapeType, size: number, color: string) => {
    switch (type) {
      case "circle":
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: size / 2,
            }}
          />
        );
      case "square":
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: 16,
            }}
          />
        );
      case "triangle":
        return (
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size / 2,
              borderRightWidth: size / 2,
              borderBottomWidth: size,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: color,
            }}
          />
        );
      case "diamond":
        return (
          <View
            style={{
              width: size * 0.7,
              height: size * 0.7,
              backgroundColor: color,
              borderRadius: 8,
              transform: [{ rotate: "45deg" }],
            }}
          />
        );
      case "star":
        return <Text style={{ fontSize: size * 0.95 }}>⭐</Text>;
      case "heart":
        return <Text style={{ fontSize: size * 0.95 }}>❤️</Text>;
      case "pentagon":
        return <Text style={{ fontSize: size * 0.95 }}>⬟</Text>;
      case "hexagon":
        return <Text style={{ fontSize: size * 0.95 }}>⬢</Text>;
      default:
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: 16,
            }}
          />
        );
    }
  };

  const renderHole = (type: ShapeType, size: number) => {
    const holeColor = "rgba(255,255,255,0.15)";
    switch (type) {
      case "circle":
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: holeColor,
              borderRadius: size / 2,
            }}
          />
        );
      case "square":
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: holeColor,
              borderRadius: 16,
            }}
          />
        );
      case "triangle":
        return (
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size / 2,
              borderRightWidth: size / 2,
              borderBottomWidth: size,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: holeColor,
            }}
          />
        );
      case "diamond":
        return (
          <View
            style={{
              width: size * 0.7,
              height: size * 0.7,
              backgroundColor: holeColor,
              borderRadius: 8,
              transform: [{ rotate: "45deg" }],
            }}
          />
        );
      case "star":
        return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⭐</Text>;
      case "heart":
        return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>❤️</Text>;
      case "pentagon":
        return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⬟</Text>;
      case "hexagon":
        return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⬢</Text>;
      default:
        return (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: holeColor,
              borderRadius: 16,
            }}
          />
        );
    }
  };

  if (!state.levelConfig) return null;

  return (
    <GameShell
      title={t("shapeSorting.title", { defaultValue: "Shape Sorting" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea} onLayout={measureContainer}>
        <GameInstruction
          text={t("shapeSorting.instruction", {
            shape: t(`shapes.${state.levelConfig.draggable.type}`),
          })}
        />

        {/* Target Holes */}
        <View
          style={styles.targetsContainer}
          ref={(ref) => {
            targetsContainerRef.current = ref;
          }}
          collapsable={false}
        >
          {state.levelConfig.targets.map((target, index) => (
            <View
              key={`${target.type}-${index}`}
              style={styles.targetWrapper}
              collapsable={false}
              onLayout={(e) => handleTargetLayout(target.type, e)}
            >
              {renderHole(target.type, TARGET_SIZE)}
              <Text style={styles.targetLabel}>
                {t(`shapes.${target.type}`)}
              </Text>
            </View>
          ))}
        </View>

        {/* Draggable Shape */}
        {!state.isDropped && (
          <Animated.View
            style={[
              styles.draggableContainer,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: shapeScale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View collapsable={false} style={styles.shapeWrapper}>
              {renderShape(
                state.levelConfig.draggable.type,
                DRAGGABLE_SIZE,
                state.levelConfig.draggable.color,
              )}
            </View>
            <Text style={styles.dragHint}>{t("shapeSorting.dragHint")}</Text>
          </Animated.View>
        )}
      </View>

      {/* Feedback Overlay */}
      {state.feedback && (
        <FeedbackOverlay
          visible={!!state.feedback}
          type={state.feedback.type}
          message={state.feedback.message}
          emoji={state.feedback.emoji}
          transparent={true}
          position="top"
          topOffset={130}
        />
      )}

      {/* Floating Labels */}
      {state.floatingLabels.map((label) => (
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

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  targetsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: spacing.lg,
    minHeight: 140,
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.md,
  },
  targetWrapper: {
    alignItems: "center",
    padding: 5,
  },
  targetLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  draggableContainer: {
    alignItems: "center",
    alignSelf: "center",
    marginTop: spacing.xl,
    zIndex: 100,
  },
  shapeWrapper: {
    padding: spacing.lg,
  },
  dragHint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});
