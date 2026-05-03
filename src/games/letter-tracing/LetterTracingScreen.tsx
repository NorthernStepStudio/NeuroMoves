import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
} from "react-native";
import Svg, { Path, Circle, G, Defs, ClipPath } from "react-native-svg";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useLetterTracingGame } from "./letterTracing.logic";
import { LetterCase } from "./letterTracing.types";
import {
  TRACE_WIDTH,
  STROKE_COLOR,
  FILL_COLOR,
  ERROR_COLOR,
  DOT_COLOR,
} from "./letterTracing.config";
import { colors, spacing, borderRadius, fontSize } from "../../theme/colors";

const { width } = Dimensions.get("window");
const CANVAS_SIZE = width - spacing.lg * 2;
const OFFSET = CANVAS_SIZE * 0.15;

export default function LetterTracingScreen() {
  const { t } = useTranslation();
  const [letterCase, setLetterCase] = useState<LetterCase>("upper");

  const {
    state,
    guideDString,
    currentPath,
    checkpoints,
    startDot,
    handleTraceStart,
    handleTraceMove,
    handleTraceEnd,
    handleRestart,
    handleCaseChange,
  } = useLetterTracingGame(letterCase, CANVAS_SIZE);

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
      }),
    [handleTraceStart, handleTraceMove, handleTraceEnd],
  );

  const onToggleCase = (newCase: LetterCase) => {
    setLetterCase(newCase);
    handleCaseChange(newCase);
  };

  if (!guideDString) return null;

  return (
    <GameShell
      title={t("tracing.title")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.content}>
        <View style={styles.settingsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>{t("tracing.case")}:</Text>
              <Pressable
                style={[
                  styles.settingBtn,
                  letterCase === "upper" && styles.activeBtn,
                ]}
                onPress={() => onToggleCase("upper")}
              >
                <Text
                  style={[
                    styles.btnText,
                    letterCase === "upper" && styles.activeText,
                  ]}
                >
                  ABC
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.settingBtn,
                  letterCase === "lower" && styles.activeBtn,
                ]}
                onPress={() => onToggleCase("lower")}
              >
                <Text
                  style={[
                    styles.btnText,
                    letterCase === "lower" && styles.activeText,
                  ]}
                >
                  abc
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        <GameInstruction
          text={t("tracing.instruction", { letter: state.targetLetter })}
        />

        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={styles.svg}>
            <Defs>
              <ClipPath id="traceClip">
                <Path
                  d={guideDString}
                  stroke="black"
                  strokeWidth={TRACE_WIDTH * 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  x={OFFSET}
                  y={OFFSET}
                />
              </ClipPath>
            </Defs>

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

              {/* Dotted center line */}
              <Path
                d={guideDString}
                stroke="#FFFFFF"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="8, 12"
                x={OFFSET}
                y={OFFSET}
              />

              {/* Checkpoint dots */}
              {checkpoints.map((cp, idx) => (
                <Circle
                  key={`cp-${idx}`}
                  cx={cp.point.x + OFFSET}
                  cy={cp.point.y + OFFSET}
                  r={4}
                  fill={cp.visited ? FILL_COLOR : "#CBD5E1"}
                  opacity={cp.visited ? 1 : 0.4}
                />
              ))}

              {/* Start indicator dot */}
              {!state.isComplete && currentPath === "" && (
                <Circle
                  cx={startDot.x}
                  cy={startDot.y}
                  r={10}
                  fill={DOT_COLOR}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
              )}

              {/* The player's drawn path */}
              {currentPath !== "" && (
                <Path
                  d={currentPath}
                  stroke={FILL_COLOR}
                  strokeWidth={TRACE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  clipPath="url(#traceClip)"
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
  settingsBar: {
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: "100%",
    marginBottom: spacing.md,
  },
  settingGroup: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  settingLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    marginRight: 4,
  },
  settingBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  activeBtn: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  btnText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  activeText: { color: "#fff" },
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
