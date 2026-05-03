import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { FloatingFeedback } from "../../components/FloatingFeedback";
import { useMagicFingersGame } from "./magicFingers.logic";
import { FINGERS } from "./magicFingers.config";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");

export default function MagicFingersScreen() {
  const { t } = useTranslation();
  const {
    state,
    fingerScales,
    floatingLabels,
    handleFingerTap,
    removeFloatingLabel,
    handleRestart,
  } = useMagicFingersGame();

  const currentSequenceLength = state.levelConfig.sequence.length;

  return (
    <GameShell
      title={t("magicFingers.title", { defaultValue: "Magic Fingers" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <GameInstruction
          text={state.levelConfig.description}
          subtext={`${t("magicFingers.step")} ${state.currentStep + 1}/${currentSequenceLength} • ${t("magicFingers.level")} ${state.level}`}
        />

        {/* Hand Display */}
        <View style={styles.handContainer}>
          <View style={styles.palm}>
            <View style={styles.palmInner} />

            {FINGERS.map((finger, index) => {
              const isHighlighted = state.highlightedFinger === finger.id;
              const isCompleted =
                state.levelConfig.sequence.indexOf(finger.id) <
                state.currentStep;

              return (
                <Pressable
                  key={finger.id}
                  onPress={(e) => handleFingerTap(finger.id, e)}
                  style={[
                    styles.fingerZone,
                    {
                      left: `${finger.x}%`,
                      top: `${finger.y}%`,
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.fingerCircle,
                      isHighlighted && styles.fingerHighlighted,
                      isCompleted && styles.fingerCompleted,
                      { transform: [{ scale: fingerScales[index] }] },
                    ]}
                  >
                    <Text style={styles.fingerNumber}>{finger.id}</Text>
                    {isHighlighted && <View style={styles.pulseRing} />}
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sequence indicator */}
        <View style={styles.sequenceContainer}>
          <Text style={styles.sequenceLabel}>
            {t("magicFingers.sequence")}:
          </Text>
          <View style={styles.sequenceNumbers}>
            {state.levelConfig.sequence.map((num, index) => (
              <View
                key={index}
                style={[
                  styles.sequenceNumber,
                  index < state.currentStep && styles.sequenceNumberDone,
                  index === state.currentStep && styles.sequenceNumberCurrent,
                ]}
              >
                <Text style={styles.sequenceNumberText}>{num}</Text>
              </View>
            ))}
          </View>
        </View>

        {state.feedback && (
          <FeedbackOverlay
            visible={!!state.feedback}
            type={state.feedback.type}
            message={state.feedback.message}
            emoji={state.feedback.emoji}
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
  handContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  palm: {
    width: width * 0.8,
    aspectRatio: 1,
    position: "relative",
  },
  palmInner: {
    position: "absolute",
    left: "20%",
    top: "40%",
    width: "60%",
    height: "50%",
    backgroundColor: "rgba(255,200,150,0.2)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)",
  },
  fingerZone: {
    position: "absolute",
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  fingerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  fingerHighlighted: {
    backgroundColor: "rgba(59, 130, 246, 0.5)",
    borderColor: "#3b82f6",
    borderWidth: 3,
  },
  fingerCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.5)",
    borderColor: "#22c55e",
  },
  fingerNumber: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  pulseRing: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#3b82f6",
    opacity: 0.5,
  },
  sequenceContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  sequenceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  sequenceNumbers: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  sequenceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  sequenceNumberDone: {
    backgroundColor: "#22c55e",
  },
  sequenceNumberCurrent: {
    backgroundColor: "#3b82f6",
    transform: [{ scale: 1.1 }],
  },
  sequenceNumberText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
