import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { GameShell } from "../../systems/game/GameShell";
import {
  GameInstruction,
  FeedbackOverlay,
} from "../../components/GameComponents";
import { useSizeOrderingGame } from "./sizeOrdering.logic";
import { colors, spacing, shadows } from "../../theme/colors";

export default function SizeOrderingScreen() {
  const { t } = useTranslation();
  const { state, getItemCount, handleItemSelect, handleRestart } =
    useSizeOrderingGame();

  return (
    <GameShell
      title={t("sizeOrdering.title", { defaultValue: "Size Ordering" })}
      level={state.level}
      score={state.score}
      onRestart={handleRestart}
    >
      <View style={styles.gameArea}>
        <GameInstruction
          text={t("sizeOrdering.instruction")}
          subtext={`${state.selectedItems.length}/${getItemCount(state.level)} ${t("sizeOrdering.selected")} • ${t("sizeOrdering.level")} ${state.level}`}
        />

        {/* Selected items area */}
        <View style={styles.selectedArea}>
          <View style={styles.selectedContainer}>
            {state.selectedItems.length === 0 ? (
              <View style={styles.placeholderContainer}>
                <MaterialCommunityIcons
                  name="gesture-tap"
                  size={32}
                  color={colors.textSecondary}
                  style={{ opacity: 0.5 }}
                />
                <Text style={styles.placeholder}>
                  {t("sizeOrdering.placeholder")}
                </Text>
              </View>
            ) : (
              state.selectedItems.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.selectedItem,
                    {
                      width: item.size * 0.75 + 10,
                      height: item.size * 0.75 + 10,
                      borderColor: item.color + "60",
                    },
                  ]}
                >
                  <Image
                    source={item.image}
                    style={{
                      width: item.size * 0.65,
                      height: item.size * 0.65,
                    }}
                    resizeMode="contain"
                  />
                  <View
                    style={[styles.orderBadge, { backgroundColor: item.color }]}
                  >
                    <Text style={styles.orderNumber}>{index + 1}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Available items */}
        <View style={styles.itemsArea}>
          <View style={styles.itemsContainer}>
            {state.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleItemSelect(item)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    width: item.size + 20,
                    height: item.size + 20,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.imageContainer,
                    { borderColor: item.color + "40" },
                  ]}
                >
                  <Image
                    source={item.image}
                    style={{
                      width: item.size * 0.9,
                      height: item.size * 0.9,
                    }}
                    resizeMode="contain"
                  />
                </View>
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
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  selectedArea: {
    marginBottom: spacing.xxl,
  },
  selectedContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    flexWrap: "wrap",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: spacing.lg,
    minHeight: 140,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
    marginTop: spacing.sm,
    opacity: 0.7,
  },
  selectedItem: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    position: "relative",
  },
  orderBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    ...shadows.sm,
  },
  orderNumber: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  itemsArea: {
    marginBottom: spacing.lg,
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.md,
  },
  item: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xs,
  },
});
