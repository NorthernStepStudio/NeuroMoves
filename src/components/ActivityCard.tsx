import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Activity } from '../core/types';
import { borderRadius, colors, spacing } from '../theme/colors';

interface Props {
  activity: Activity;
  onPress?: () => void;
}

export default function ActivityCard({ activity, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Text style={styles.category}>{activity.category.toUpperCase()}</Text>
        <Text style={styles.duration}>{activity.durationMinutes} min</Text>
      </View>
      <Text style={styles.title}>{activity.title}</Text>
      <Text style={styles.desc}>{activity.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.sm
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  category: {
    color: colors.accentSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  duration: {
    color: colors.textMuted,
    fontSize: 12
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  desc: {
    color: colors.textSecondary,
    marginTop: 6
  }
});
