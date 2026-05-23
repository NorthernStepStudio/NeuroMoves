import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, PanResponder } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useNumberTracingGame } from "./numberTracing.logic";
import {
  TRACE_WIDTH,
  STROKE_COLOR,
  DOT_COLOR,
} from "./numberTracing.config";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");
const CANVAS_SIZE = width - spacing.lg * 2;
const OFFSET = CANVAS_SIZE * 0.15;

export default function NumberTracingScreen() {
  const { t } = useTranslation();

  const {
    state,
    guideDString,
    tracePathD,
    hasTraceStarted,
    startDot,
    handleTraceStart,
    handleTraceMove,
    handleTraceEnd,
    handleRestart,
  } = useNumberTracingGame(CANVAS_SIZE);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          handleTraceStart(
            evt.nativeEvent.locationX,
            evt.nativeEvent.locationY,
          );
        },
        onPanResponderMove: (evt) => {
          handleTraceMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          handleTraceEnd();
        },
        onPanResponderTerminate: () => {
          handleTraceEnd();
        },
      }),
    [handleTraceStart, handleTraceMove, handleTraceEnd],
  );

  if (!guideDString) return null;

  return (
    <GameShell
      title={t("tracing.numberTitle")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.content}>
        <GameInstruction
          text={t("tracing.instruction", { letter: state.targetNumber })}
        />

        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={styles.svg}>
            <G>
              {/* The guide road */}
              <Path
                d={guideDString}
                stroke={STROKE_COLOR}
                strokeWidth={TRACE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                x={OFFSET}
                y={OFFSET}
              />

              {/* Path-locked tracing progress */}
              {hasTraceStarted && tracePathD ? (
                <Path
                  d={tracePathD}
                  stroke="#2563EB"
                  strokeWidth={TRACE_WIDTH * 0.55}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  x={OFFSET}
                  y={OFFSET}
                />
              ) : null}

              {/* Start indicator dot */}
              {!state.isComplete && !hasTraceStarted && (
                <Circle
                  cx={startDot.x}
                  cy={startDot.y}
                  r={10}
                  fill={DOT_COLOR}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
              )}
            </G>
          </Svg>
        </View>

        {state.feedback && (
          <FeedbackOverlay
            visible={!!state.feedback}
            type={state.feedback.type}
            message={state.feedback.message}
            emoji={state.feedback.emoji}
            compact={state.feedback.type === "success"}
            position="top"
            topOffset={-60}
          />
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center" },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginTop: spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
  svg: { flex: 1 },
});
