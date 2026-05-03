import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import { FeedbackOverlay } from "../../components/GameComponents";
import { useYesNoGame } from "./yesNoGame.logic";
import { colors, spacing, borderRadius } from "../../theme/colors";

const { width, height } = Dimensions.get("window");

export default function YesNoGameScreen() {
  const { t } = useTranslation();
  const { state, pan, cardOpacity, handleAnswer, handleRestart } =
    useYesNoGame();

  const currentQuestion = state.questions[state.currentIndex];

  // Store handleAnswer in a ref for panResponder closure
  const handleAnswerRef = useRef(handleAnswer);
  handleAnswerRef.current = handleAnswer;
  const isAnimatingRef = useRef(state.isAnimating);
  isAnimatingRef.current = state.isAnimating;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10
          );
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          if (isAnimatingRef.current) return;

          const { dx, dy } = gestureState;
          const swipeThreshold = 100;

          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe - NO
            if (Math.abs(dx) > swipeThreshold) {
              Animated.timing(pan, {
                toValue: { x: dx > 0 ? width : -width, y: 0 },
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                handleAnswerRef.current("no");
              });
              return;
            }
          } else {
            // Vertical swipe - YES
            if (Math.abs(dy) > swipeThreshold) {
              Animated.timing(pan, {
                toValue: { x: 0, y: dy > 0 ? height : -height },
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                handleAnswerRef.current("yes");
              });
              return;
            }
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        },
      }),
    [pan],
  );

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
    extrapolate: "clamp",
  });

  const yesOpacity = pan.y.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0.3],
    extrapolate: "clamp",
  });

  const noOpacity = pan.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1, 0.3, 1],
    extrapolate: "clamp",
  });

  if (!currentQuestion) return null;

  return (
    <GameShell
      title={t("yesNo.title")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        {/* Swipe Hints */}
        <Animated.View style={[styles.hintTop, { opacity: yesOpacity }]}>
          <Text style={styles.hintText}>⬆ {t("yesNo.yes")} ⬇</Text>
        </Animated.View>

        <Animated.View style={[styles.hintSides, { opacity: noOpacity }]}>
          <Text style={[styles.hintText, styles.hintLeft]}>
            ⬅ {t("yesNo.no")}
          </Text>
          <Text style={[styles.hintText, styles.hintRight]}>
            {t("yesNo.no")} ➡
          </Text>
        </Animated.View>

        {/* Question Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate },
              ],
              opacity: cardOpacity,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.emoji}>{currentQuestion.emoji}</Text>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: currentQuestion.color },
            ]}
          />
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {t("yesNo.question")} {state.currentIndex + 1} {t("yesNo.of")}{" "}
            {state.questions.length}
          </Text>
          <View style={styles.progressBar}>
            {state.questions.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressDot,
                  idx < state.currentIndex && styles.progressDotComplete,
                  idx === state.currentIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.instructionText}>
          {t("yesNo.swipeInstruction")}
        </Text>

        {state.feedback && (
          <FeedbackOverlay
            visible={!!state.feedback}
            type={state.feedback.type}
            message={state.feedback.message}
            emoji={state.feedback.emoji}
          />
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  hintTop: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
  },
  hintSides: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  hintText: {
    fontSize: 18,
    color: colors.accentPrimary,
    fontWeight: "600",
  },
  hintLeft: { textAlign: "left" },
  hintRight: { textAlign: "right" },
  card: {
    width: width * 0.8,
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  colorIndicator: {
    width: 40,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  progressContainer: {
    position: "absolute",
    bottom: 80,
    alignItems: "center",
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  progressBar: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bgTertiary,
  },
  progressDotComplete: {
    backgroundColor: colors.success,
  },
  progressDotCurrent: {
    backgroundColor: colors.accentPrimary,
  },
  instructionText: {
    position: "absolute",
    bottom: 40,
    color: colors.textMuted,
    fontSize: 13,
  },
});
