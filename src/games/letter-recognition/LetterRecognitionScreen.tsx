import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useLetterRecognitionGame } from "./letterRecognition.logic";
import { LetterCase } from "./letterRecognition.types";
import { colors, spacing, borderRadius, fontSize } from "../../theme/colors";

const { width } = Dimensions.get("window");
const CARD_SIZE = Math.min((width - spacing.lg * 3) / 2, 160);

export default function LetterRecognitionScreen() {
  const { t } = useTranslation();
  const [letterCase, setLetterCase] = useState<LetterCase>("upper");

  const { state, handleChoice, handleRestart, handleCaseChange } =
    useLetterRecognitionGame(letterCase);

  const onToggleCase = (newCase: LetterCase) => {
    setLetterCase(newCase);
    handleCaseChange(newCase);
  };

  if (!state.targetLetter) return null;

  return (
    <GameShell
      title={t("letterRecognition.title")}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.content}>
        <View style={styles.settingsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>
                {t("letterRecognition.case")}:
              </Text>
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
          text={t("letterRecognition.instruction", {
            letter: state.targetLetter,
          })}
        />

        {/* Prompt display */}
        <View style={[styles.promptCard, { borderColor: state.targetColor }]}>
          <Text style={[styles.promptText, { color: state.targetColor }]}>
            {state.targetLetter}
          </Text>
        </View>

        {/* Options grid */}
        <View style={styles.optionsGrid}>
          {state.options.map((letter, index) => (
            <Pressable
              key={`${letter}-${index}`}
              onPress={() => handleChoice(letter)}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: state.optionColors[index] },
                pressed && styles.optionPressed,
              ]}
              accessibilityLabel={`Choose letter ${letter}`}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: state.optionColors[index] },
                ]}
              >
                {letter}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hintText}>{t("letterRecognition.hint")}</Text>
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
  settingsBar: {
    backgroundColor: colors.bgTertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: "100%",
    marginBottom: spacing.sm,
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
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
