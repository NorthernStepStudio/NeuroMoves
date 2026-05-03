import React from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
  GameHeader,
} from "../../components/GameComponents";
import { useColorMatchGame } from "./colorMatch.logic";
import { spacing, colors, borderRadius } from "../../theme/colors";

const { width } = Dimensions.get("window");

// We'll use the legacy GameInstruction/FeedbackOverlay until we move them.

export function ColorMatchScreen() {
  const { t } = useTranslation();
  const { state, handleColorPress, handleRestart } = useColorMatchGame(48); // Mocking child age for now

  const optionSize = Math.min(
    (width - spacing.lg * 2 - spacing.md * (state.options.length - 1)) /
      Math.min(state.options.length, 3),
    100,
  );

  return (
    <GameShell
      title={t("colorMatch.title")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <View style={styles.targetSection}>
          <Text style={styles.findText}>{t("colorMatch.findText")}</Text>
          {state.targetColor && (
            <View
              style={[
                styles.targetCircle,
                { backgroundColor: state.targetColor.value },
              ]}
            />
          )}
        </View>

        {/* Legacy component, to be moved to shared/components */}
        <GameInstruction
          text={t("colorMatch.hintText")}
          subtext={`${t("colorMatch.level")} ${state.level} • ${state.options.length} ${t("colorMatch.colors_plural")}`}
        />

        <View style={styles.optionsContainer}>
          {state.options.map((color, index) => (
            <Pressable
              key={`${color.name}-${index}`}
              onPress={() => handleColorPress(color)}
              style={({ pressed }) => [
                styles.colorOption,
                {
                  backgroundColor: color.value,
                  width: optionSize,
                  height: optionSize,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <View style={styles.colorInner} />
            </Pressable>
          ))}
        </View>
      </View>

      {state.feedback && (
        <FeedbackOverlay
          visible={!!state.feedback}
          type={state.feedback.type}
          message={state.feedback.message}
          emoji={state.feedback.emoji}
          compact={state.feedback.type === "success"}
          position="top"
          topOffset={130}
        />
      )}
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
  targetSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  findText: {
    fontSize: 20,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  targetCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    maxWidth: width - spacing.lg * 2,
  },
  colorOption: {
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  colorInner: {
    width: "70%",
    height: "70%",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
