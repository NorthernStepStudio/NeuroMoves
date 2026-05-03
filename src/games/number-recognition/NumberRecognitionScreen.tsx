import React from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useNumberRecognitionGame } from "./numberRecognition.logic";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");
const CARD_SIZE = Math.min((width - spacing.lg * 3) / 2, 160);

export default function NumberRecognitionScreen() {
  const { t } = useTranslation();
  const { state, handleChoice, handleRestart } = useNumberRecognitionGame();

  if (state.targetNumber === null) return null;

  return (
    <GameShell
      title={t("numberRecognition.title")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.content}>
        <GameInstruction
          text={t("numberRecognition.instruction", {
            number: state.targetNumber,
          })}
        />

        {/* Prompt display */}
        <View style={[styles.promptCard, { borderColor: state.targetColor }]}>
          <Text style={[styles.promptText, { color: state.targetColor }]}>
            {state.targetNumber}
          </Text>
        </View>

        {/* Options grid */}
        <View style={styles.optionsGrid}>
          {state.options.map((num, index) => (
            <Pressable
              key={`${num}-${index}`}
              onPress={() => handleChoice(num)}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: state.optionColors[index] },
                pressed && styles.optionPressed,
              ]}
              accessibilityLabel={`Choose number ${num}`}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: state.optionColors[index] },
                ]}
              >
                {num}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hintText}>{t("numberRecognition.hint")}</Text>
      </View>

      {state.feedback && (
        <FeedbackOverlay
          visible={!!state.feedback}
          type={state.feedback.type}
          message={state.feedback.message}
          emoji={state.feedback.emoji}
          compact={state.feedback.type === "success"}
          position="top"
        />
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center" },
  promptCard: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: spacing.md,
    borderWidth: 4,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  promptText: { fontSize: 64, fontWeight: "bold" },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  optionPressed: { transform: [{ scale: 0.95 }], opacity: 0.8 },
  optionText: { fontSize: CARD_SIZE * 0.5, fontWeight: "bold" },
  hintText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
