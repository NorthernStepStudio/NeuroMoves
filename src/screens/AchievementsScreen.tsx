import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { evaluateAndStoreAchievements, AchievementStatus } from '../core/achievements';
import { loadJournalEntries } from '../core/journal';
import { loadAttempts, loadGameProgress } from '../core/storage';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme/colors';
import { useAuth } from '../core/AuthContext';
import { CompanionSyncService } from '../services/CompanionSyncService';

export default function AchievementsScreen() {
  const { selectedChild } = useAuth();
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);

  const refresh = useCallback(async () => {
    if (selectedChild?.id) {
      await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }

    const [attempts, gameProgress, journalEntries] = await Promise.all([
      loadAttempts(),
      loadGameProgress(),
      loadJournalEntries()
    ]);

    const result = await evaluateAndStoreAchievements({
      attempts,
      gameProgress,
      journalEntries
    });

    if (selectedChild?.id && result.newlyUnlocked.length > 0) {
      await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }

    setAchievements(result.statuses);
  }, [selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const unlockedCount = achievements.filter(item => item.unlocked).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Sticker Wall</Text>
        <Text style={styles.headerSubtitle}>
          {selectedChild?.name ? `${selectedChild.name}'s` : 'Your'} achievements and milestones.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{unlockedCount}/{achievements.length}</Text>
          <Text style={styles.summaryLabel}>Unlocked badges</Text>
        </View>

        <View style={styles.grid}>
          {achievements.map(item => (
            <View
              key={item.id}
              style={[styles.badgeCard, item.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}
            >
              <Text style={styles.badgeSticker}>{item.unlocked ? item.sticker : '🔒'}</Text>
              <Text style={styles.badgeTitle}>{item.title}</Text>
              <Text style={styles.badgeDescription}>{item.description}</Text>
              <Text style={styles.badgeProgress}>
                {item.progressValue}/{item.target}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${item.progressPercent}%` }
                  ]}
                />
              </View>
              {item.unlockedAt ? (
                <Text style={styles.unlockedAt}>
                  Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    color: colors.textPrimary,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  summaryCard: {
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.button
  },
  summaryValue: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800'
  },
  summaryLabel: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600'
  },
  grid: {
    gap: spacing.sm
  },
  badgeCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md
  },
  badgeCardUnlocked: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74'
  },
  badgeCardLocked: {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder
  },
  badgeSticker: {
    fontSize: 32
  },
  badgeTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize.base
  },
  badgeDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fontSize.sm
  },
  badgeProgress: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.xs
  },
  progressTrack: {
    marginTop: spacing.xs,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentPrimary
  },
  unlockedAt: {
    marginTop: spacing.sm,
    color: '#9a3412',
    fontSize: fontSize.xs,
    fontWeight: '600'
  }
});
