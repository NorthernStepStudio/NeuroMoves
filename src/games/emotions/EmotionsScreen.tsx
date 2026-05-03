import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useEmotionsGame } from "./emotions.logic";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");

export default function EmotionsScreen() {
  const { t } = useTranslation();
  const { state, getOptionsCount, handleEmotionPress, handleRestart } =
    useEmotionsGame();

  if (!state.targetEmotion) return null;

  const optionSize = Math.min(
    (width - spacing.lg * 2 - spacing.md * 2) /
      Math.min(getOptionsCount(state.level), 2.2),
    160,
  );

  return (
    <GameShell
      title={t("emotions.title", { defaultValue: "Emotions" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <GameInstruction
          text={t("emotions.instruction", {
            emotion: t(`emotions.list.${state.targetEmotion.name}`),
          }).toUpperCase()}
          subtext={`${t("emotions.level")} ${state.level}`}
        />

        <View style={styles.optionsContainer}>
          {state.options.map((emotion, index) => (
            <Pressable
              key={`${emotion.name}-${index}`}
              onPress={() => handleEmotionPress(emotion)}
              style={({ pressed }) => [
                styles.emotionOption,
                {
                  width: optionSize,
                  height: optionSize * 1.1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.imageContainer,
                  { borderColor: emotion.color + "40" },
                ]}
              >
                <Image
                  source={emotion.image}
                  style={{
                    width: optionSize * 0.85,
                    height: optionSize * 0.85,
                  }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.optionLabel}>
                {t(`emotions.list.${emotion.name}`)}
              </Text>
            </Pressable>
          ))}
        </View>

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
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.lg,
    maxWidth: width - spacing.lg * 2,
    marginTop: spacing.xl,
  },
  emotionOption: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  imageContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: spacing.xs,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  optionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
