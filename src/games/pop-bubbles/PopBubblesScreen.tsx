import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { usePopBubblesGame } from "./popBubbles.logic";
import { BubbleData, BubbleConfig } from "./popBubbles.types";
import { colors, spacing } from "../../theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PopBubblesScreen() {
  const { t } = useTranslation();

  const [gameLayout, setGameLayout] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setGameLayout({ width, height });
  };

  const { state, config, handlePopComplete, handleRestart } = usePopBubblesGame(
    48,
    gameLayout,
  );

  const remaining = Math.max(0, state.bubbleData.length - state.poppedCount);

  return (
    <GameShell
      title={t("popBubbles.title", { defaultValue: "Pop Bubbles" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <GameInstruction
          text={`${t("popBubbles.instruction")} (${remaining} ${t("popBubbles.left")})`}
        />

        <View style={styles.gameContainer} onLayout={onLayout}>
          {state.bubbleData.map((data) => (
            <BubbleComponent
              key={`${state.level}-${data.id}`}
              data={data}
              gameLayout={gameLayout}
              config={config}
              level={state.level}
              onPop={() => handlePopComplete(data.id)}
            />
          ))}
        </View>

        {state.feedback && (
          <FeedbackOverlay
            visible={!!state.feedback}
            type={state.feedback.type}
            message={state.feedback.message}
            emoji={state.feedback.emoji}
            position={state.feedback.position || "center"}
            confetti={state.feedback.confetti}
            transparent={state.feedback.transparent}
          />
        )}
      </View>
    </GameShell>
  );
}

function BubbleComponent({
  data,
  gameLayout,
  config,
  level,
  onPop,
}: {
  data: BubbleData;
  gameLayout: { width: number; height: number };
  config: BubbleConfig;
  level: number;
  onPop: () => void;
}) {
  const x = useSharedValue(data.startX);
  const y = useSharedValue(data.startY);
  const floatOffset = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isPopped = useSharedValue(false);

  useEffect(() => {
    scale.value = withSpring(1);

    floatOffset.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: data.floatSpeed,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: data.floatSpeed,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    const move = () => {
      if (isPopped.value) return;
      const ageFactor = config.speedMultiplier;
      const levelPenalty = (level - 1) * 120 * ageFactor;
      const duration = Math.max(
        5500 / ageFactor - levelPenalty,
        config.minDuration,
      );

      x.value = withTiming(Math.random() * (gameLayout.width - data.size), {
        duration,
        easing: Easing.inOut(Easing.quad),
      });
      y.value = withTiming(
        Math.random() * (gameLayout.height - data.size),
        { duration, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(move)();
        },
      );
    };

    setTimeout(move, 600 + data.id * 120);
  }, []);

  const handlePress = () => {
    if (isPopped.value) return;
    isPopped.value = true;
    runOnJS(onPop)();

    scale.value = withTiming(2.5, { duration: 120 });
    opacity.value = withTiming(0, { duration: 250 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: x.value,
      top: y.value,
      opacity: opacity.value,
      transform: [
        { translateY: floatOffset.value * -18 },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        { width: data.size, height: data.size },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.bubble,
          { backgroundColor: data.color, borderRadius: data.size / 2 },
        ]}
      >
        <View style={styles.shine} />
        <View style={styles.innerGlow} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
  },
  gameContainer: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: "#fdfcfe",
    borderRadius: 40,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  bubbleWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    width: "100%",
    height: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  shine: {
    position: "absolute",
    top: "12%",
    left: "12%",
    width: "30%",
    height: "30%",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 25,
  },
  innerGlow: {
    position: "absolute",
    bottom: "10%",
    right: "10%",
    width: "25%",
    height: "25%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
});
