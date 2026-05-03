import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ImageBackground,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { usePointItOutGame } from "./pointItOut.logic";
import { colors, spacing } from "../../theme/colors";

export default function PointItOutScreen() {
  const { t } = useTranslation();
  const {
    state,
    hintPulse,
    getLevelConfig,
    handleObjectTap,
    handleRestart,
    toggleSpeech,
    skipLevel,
  } = usePointItOutGame();

  const levelConfig = getLevelConfig(state.level);
  const foundCount = state.objects.filter((o) => o.found).length;

  const hintScale = hintPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <GameShell
      title={t("pointItOut.title", { defaultValue: "Point It Out" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.content}>
        <GameInstruction
          text={
            state.currentTarget
              ? t("pointItOut.instruction", {
                  object: t(`pointItOut.objects.${state.currentTarget.id}`),
                  emoji: state.currentTarget.emoji,
                })
              : "Loading..."
          }
          subtext={`${t("pointItOut.level")} ${state.level} • ${foundCount}/${state.objects.length} ${t("pointItOut.found")}`}
        />

        <View style={styles.debugActions}>
          <Pressable
            onPress={toggleSpeech}
            disabled={!state.speechAvailable}
            style={[
              styles.voiceButton,
              !state.speechAvailable && styles.voiceButtonDisabled,
              state.isListening && styles.voiceButtonActive,
            ]}
          >
            <MaterialCommunityIcons
              name={state.isListening ? "microphone" : "microphone-outline"}
              size={20}
              color={state.isListening ? "#fff" : colors.textPrimary}
            />
            <Text
              style={[styles.voiceText, state.isListening && { color: "#fff" }]}
            >
              {!state.speechAvailable
                ? t("pointItOut.voiceDisabled", { defaultValue: "Voice Off" })
                : state.isListening
                  ? t("pointItOut.listening")
                  : t("pointItOut.sayIt")}
            </Text>
          </Pressable>
          <Pressable onPress={skipLevel} style={styles.skipButton}>
            <Text style={styles.skipText}>⏭️ {t("pointItOut.skipRoom")}</Text>
          </Pressable>
        </View>

        <ImageBackground
          source={levelConfig.backgroundImage}
          style={styles.sceneContainer}
          imageStyle={{ borderRadius: 24 }}
          resizeMode="stretch"
        >
          <View style={styles.sceneHeader}>
            <Text style={styles.sceneEmoji}>{levelConfig.sceneEmoji}</Text>
            <Text style={styles.sceneName}>
              {t(`pointItOut.scenes.${levelConfig.scene.replace(" ", "")}`)}
            </Text>
          </View>

          {state.objects.map((obj) => {
            const isTarget = state.currentTarget?.id === obj.id;
            const showingHintForThis = state.showHint && isTarget && !obj.found;

            return (
              <Pressable
                key={obj.id}
                onPress={() => handleObjectTap(obj)}
                style={[
                  styles.objectContainer,
                  {
                    left: `${obj.x - obj.width / 2}%`,
                    top: `${obj.y - obj.height / 2}%`,
                    width: `${obj.width}%`,
                    height: `${obj.height}%`,
                  },
                ]}
              >
                {showingHintForThis && (
                  <Animated.View
                    style={[
                      styles.hintGlow,
                      {
                        width: "120%",
                        height: "120%",
                        borderRadius: 20,
                        transform: [{ scale: hintScale }],
                      },
                    ]}
                  />
                )}

                {obj.found && (
                  <View style={styles.foundCheck}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ImageBackground>

        {state.feedback && (
          <FeedbackOverlay
            visible={!!state.feedback}
            type={state.feedback.type}
            message={state.feedback.message}
            emoji={state.feedback.emoji}
            position="top"
            topOffset={130}
          />
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  sceneContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  sceneHeader: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  sceneEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  sceneName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  objectContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  hintGlow: {
    position: "absolute",
    backgroundColor: "rgba(254, 225, 64, 0.4)",
  },
  foundCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  debugActions: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSecondary,
  },
  skipButton: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: spacing.sm,
  },
  voiceButtonActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  voiceText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
});
