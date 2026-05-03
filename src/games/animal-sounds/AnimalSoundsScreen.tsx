import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useAnimalSoundsGame } from "./animalSounds.logic";
import { colors, spacing } from "../../theme/colors";

const { width } = Dimensions.get("window");

export default function AnimalSoundsScreen() {
  const {
    state,
    optionsCount,
    handlePlaySound,
    handleAnimalPress,
    handleRestart,
    generateRound,
  } = useAnimalSoundsGame(48); // Configurable via settings context normally

  const soundPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.targetAnimal) {
      soundPulse.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(soundPulse, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(soundPulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      soundPulse.stopAnimation();
    }
  }, [state.targetAnimal, soundPulse]);

  const optionSize = Math.min(
    (width - spacing.lg * 2 - spacing.md * 2) / Math.min(optionsCount, 3),
    130,
  );

  return (
    <GameShell
      title="Animal Sounds"
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <GameInstruction
        text="Which animal makes this sound?"
        subtext={`Level ${state.level} • ${optionsCount} animals`}
      />

      <View style={styles.gameArea}>
        {/* Sound display - tap to play */}
        {state.targetAnimal && (
          <Pressable onPress={handlePlaySound}>
            <Animated.View
              style={[styles.soundCard, { transform: [{ scale: soundPulse }] }]}
            >
              <Text style={styles.soundIcon}>🔊</Text>
              <Text style={styles.soundText}>"{state.targetAnimal.sound}"</Text>
              <Text style={styles.tapHint}>Tap to hear again</Text>
            </Animated.View>
          </Pressable>
        )}

        {/* Animal options */}
        <View style={styles.optionsContainer}>
          {state.options.map((animal, index) => (
            <Pressable
              key={`${state.level}-${animal.name}-${index}`}
              onPress={() => handleAnimalPress(animal)}
              style={({ pressed }) => [
                styles.animalOption,
                {
                  width: optionSize,
                  height: optionSize,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <Text
                style={[styles.animalEmoji, { fontSize: optionSize * 0.72 }]}
              >
                {animal.emoji}
              </Text>
              <Text style={styles.animalName}>{animal.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Feedback at top under level indicator */}
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
  soundCard: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 2,
    borderColor: "#8b5cf6",
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  soundIcon: {
    fontSize: 38,
    marginBottom: spacing.sm,
  },
  soundText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    fontStyle: "italic",
  },
  tapHint: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: spacing.sm,
    opacity: 0.8,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    maxWidth: width - spacing.lg * 2,
  },
  animalOption: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  animalEmoji: {
    textAlign: "center",
  },
  animalName: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
});
