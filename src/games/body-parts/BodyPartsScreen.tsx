import React from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useBodyPartsGame } from "./bodyParts.logic";
import { TOUCH_ZONES } from "./bodyParts.config";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");

export default function BodyPartsScreen() {
  const { t } = useTranslation();
  const { state, handleZoneTap, handleRestart } = useBodyPartsGame();

  return (
    <GameShell
      title={t("bodyParts.title", { defaultValue: "Body Parts" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <GameInstruction
          text={t("bodyParts.instruction", {
            part: t(`bodyParts.parts.${state.targetPart}`),
          }).toUpperCase()}
          subtext={`${t("bodyParts.level")} ${state.level}`}
        />

        <View style={styles.bodyContainer}>
          {/* Body outline (simplified stick figure) */}
          <View style={styles.body}>
            <View style={styles.headCircle} />
            <View style={styles.torso} />
            <View style={styles.armsContainer}>
              <View style={styles.arm} />
              <View style={styles.arm} />
            </View>
            <View style={styles.legsContainer}>
              <View style={styles.leg} />
              <View style={styles.leg} />
            </View>
          </View>

          {/* Touch zones */}
          {TOUCH_ZONES.map((zone) => (
            <Pressable
              key={zone.id}
              onPress={() => handleZoneTap(zone.name)}
              style={[
                styles.touchZone,
                {
                  left: `${zone.x - zone.w / 2}%`,
                  top: `${zone.y - zone.h / 2}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                },
                zone.name === state.targetPart && styles.touchZoneHighlight,
              ]}
            >
              <Text style={styles.zoneEmoji}>
                {zone.name === "head"
                  ? "😊"
                  : zone.name === "hands"
                    ? "✋"
                    : zone.name === "feet"
                      ? "🦶"
                      : zone.name === "tummy"
                        ? "🎯"
                        : ""}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  bodyContainer: {
    width: width * 0.7,
    aspectRatio: 0.5,
    position: "relative",
    marginTop: spacing.xl,
  },
  body: {
    flex: 1,
    alignItems: "center",
  },
  headCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 200, 150, 0.4)",
    borderWidth: 3,
    borderColor: "rgba(255, 200, 150, 0.8)",
  },
  torso: {
    width: 80,
    height: 120,
    backgroundColor: "rgba(100, 150, 255, 0.3)",
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "rgba(100, 150, 255, 0.6)",
  },
  armsContainer: {
    position: "absolute",
    top: 80,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  arm: {
    width: 50,
    height: 15,
    backgroundColor: "rgba(255, 200, 150, 0.3)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 200, 150, 0.6)",
  },
  legsContainer: {
    flexDirection: "row",
    gap: 20,
    marginTop: 10,
  },
  leg: {
    width: 25,
    height: 100,
    backgroundColor: "rgba(100, 100, 255, 0.3)",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(100, 100, 255, 0.6)",
  },
  touchZone: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  touchZoneHighlight: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
  },
  zoneEmoji: {
    fontSize: 24,
    opacity: 0.8,
  },
});
