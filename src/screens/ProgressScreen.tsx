import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { loadAttempts, loadGameProgress } from '../core/storage';
import { ActivityAttempt, GameProgress } from '../core/types';
import { getDailyStreak } from '../core/progress';
import { ACTIVITIES } from '../data/activities';
import { GAME_REGISTRY } from '../core/gameTypes';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme/colors';
import { useAuth } from '../core/AuthContext';
import { JournalEntry, loadJournalEntries } from '../core/journal';
import { AchievementStatus, evaluateAndStoreAchievements } from '../core/achievements';
import { exportProgressReport, shareProgressReportPdf } from '../services/ReportService';
import { CompanionSyncService } from '../services/CompanionSyncService';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  { key: 'motor', label: 'Motor Skills', color: '#22c55e' },
  { key: 'cognitive', label: 'Cognitive', color: '#3b82f6' },
  { key: 'speech', label: 'Speech', color: '#a855f7' },
  { key: 'sensory', label: 'Sensory', color: '#f97316' },
];

export default function ProgressScreen() {
  const { selectedChild, parent } = useAuth();
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState<ActivityAttempt[]>([]);
  const [gameProgress, setGameProgress] = useState<Record<string, GameProgress>>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (selectedChild?.id) {
          await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
        }

        const [loadedAttempts, loadedProgress, loadedJournal] = await Promise.all([
          loadAttempts(),
          loadGameProgress(),
          loadJournalEntries()
        ]);

        const achievementResult = await evaluateAndStoreAchievements({
          attempts: loadedAttempts,
          gameProgress: loadedProgress,
          journalEntries: loadedJournal
        });

        if (selectedChild?.id && achievementResult.newlyUnlocked.length > 0) {
          await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
        }

        if (!active) return;
        setAttempts(loadedAttempts);
        setGameProgress(loadedProgress);
        setJournalEntries(loadedJournal);
        setAchievements(achievementResult.statuses);
      })();

      return () => {
        active = false;
      };
    }, [selectedChild?.id])
  );

  const streak = getDailyStreak(attempts);

  const totals = useMemo(() => {
    const activityMap = new Map(ACTIVITIES.map(activity => [activity.id, activity]));
    const gameMap = new Map(GAME_REGISTRY.map(game => [game.id, game]));
    return attempts.reduce(
      (acc, attempt) => {
        const activity = activityMap.get(attempt.activityId);
        const game = gameMap.get(attempt.activityId as any);

        if (activity?.category === 'speech' || game?.category === 'speech') {
          acc.speech += 1;
        } else if (activity?.category === 'ot' || game) {
          // All non-speech games roll up into OT practice totals.
          acc.ot += 1;
        }

        acc[attempt.result] += 1;
        return acc;
      },
      { speech: 0, ot: 0, success: 0, tried: 0, skipped: 0 }
    );
  }, [attempts]);

  const totalActivities = totals.success + totals.tried + totals.skipped;
  const successRate = totalActivities > 0 ? Math.round((totals.success / totalActivities) * 100) : 0;
  const unlockedAchievements = achievements.filter(item => item.unlocked);

  const categoryProgress = CATEGORIES.map(cat => {
    const categoryGames = GAME_REGISTRY.filter(game => game.category === cat.key);
    const totalLevels = categoryGames.reduce((sum, game) => sum + game.maxLevels, 0);
    const completedLevels = categoryGames.reduce((sum, game) => {
      const progress = gameProgress[game.id];
      return sum + (progress?.highestLevel || 0);
    }, 0);

    return {
      ...cat,
      progress: totalLevels > 0 ? completedLevels / totalLevels : 0,
      completed: completedLevels,
      total: totalLevels,
    };
  });

  const handleExportReport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const report = await exportProgressReport({
        childName: selectedChild?.name || 'Child',
        childAgeMonths: selectedChild?.age_months,
        parentEmail: parent?.email,
        attempts,
        gameProgress,
        journalEntries,
        achievements
      });

      const sharedPdf = await shareProgressReportPdf(report.uri);
      const templateMessage = `Subject: ${report.emailTemplate.subject}\n\n${report.emailTemplate.body}`;

      if (!sharedPdf) {
        await Share.share({
          title: report.emailTemplate.subject,
          message: templateMessage
        });
        Alert.alert('PDF ready', `PDF generated at:\n${report.uri}`);
        return;
      }

      Alert.alert(
        'PDF shared',
        'Share the pre-filled email text with your OT/SLP?',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Share template',
            onPress: () => {
              void Share.share({
                title: report.emailTemplate.subject,
                message: templateMessage
              });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Could not generate report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('progress.title', { defaultValue: 'Progress' })}</Text>
          <Text style={styles.headerSubtitle}>{t('progress.subtitle', { defaultValue: 'Track your child profile over time.' })}</Text>
        </View>

        <Pressable
          onPress={handleExportReport}
          style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.9 }]}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.reportButtonTitle}>{t('progress.exportPdf', { defaultValue: 'Export PDF Report' })}</Text>
              <Text style={styles.reportButtonSubtitle}>{t('progress.shareOt', { defaultValue: 'Share with OT/SLP' })}</Text>
            </>
          )}
        </Pressable>

        <View style={styles.streakCard}>
          <View>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>{t('progress.dayStreak', { defaultValue: 'Day Streak' })}</Text>
          </View>
          <Text style={styles.streakMessage}>
            {streak === 0 ? t('progress.startToday', { defaultValue: 'Start today.' }) : streak < 7 ? t('progress.greatConsistency', { defaultValue: 'Great consistency.' }) : t('progress.excellentMomentum', { defaultValue: 'Excellent momentum.' })}
          </Text>
        </View>

        <View style={styles.achievementCard}>
          <Text style={styles.achievementTitle}>{t('progress.stickers', { defaultValue: 'Achievement Stickers' })}</Text>
          <Text style={styles.achievementValue}>{unlockedAchievements.length}/{achievements.length} {t('progress.unlocked', { defaultValue: 'unlocked' })}</Text>
          <Text style={styles.achievementSubtitle}>
            {unlockedAchievements.length > 0
              ? unlockedAchievements.slice(0, 4).map(item => item.sticker).join(' ')
              : t('progress.noStickers', { defaultValue: 'No stickers yet. Keep practicing and journaling.' })}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <Text style={styles.statValue}>{successRate}%</Text>
            <Text style={styles.statLabel}>{t('progress.successRate', { defaultValue: 'Success Rate' })}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.success}</Text>
            <Text style={styles.statLabel}>{t('progress.successes', { defaultValue: 'Successes' })}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.tried}</Text>
            <Text style={styles.statLabel}>{t('progress.tried', { defaultValue: 'Tried' })}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.speech}</Text>
            <Text style={styles.statLabel}>{t('progress.speechAttempts', { defaultValue: 'Speech Attempts' })}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.ot}</Text>
            <Text style={styles.statLabel}>{t('progress.otAttempts', { defaultValue: 'OT Attempts' })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.skillProgress', { defaultValue: 'Skill Progress' })}</Text>
          <View style={styles.progressGrid}>
            {categoryProgress.map(cat => (
              <View key={cat.key} style={styles.progressCard}>
                <Text style={styles.progressLabel}>{t(`categories.${cat.key}`, { defaultValue: cat.label })}</Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(cat.progress * 100, 100)}%`, backgroundColor: cat.color }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{cat.completed}/{cat.total} {t('progress.levels', { defaultValue: 'levels' })}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.recentActivity', { defaultValue: 'Recent Activity' })}</Text>
          {attempts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('progress.noActivity', { defaultValue: 'No activity yet' })}</Text>
              <Text style={styles.emptyText}>{t('progress.completeToPopulate', { defaultValue: 'Complete activities to populate this timeline.' })}</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {attempts.slice(0, 8).map((attempt, index) => {
                const activity = ACTIVITIES.find(item => item.id === attempt.activityId);
                const game = GAME_REGISTRY.find(item => item.id === (attempt.activityId as any));
                const timeAgo = getTimeAgo(new Date(attempt.dateISO));
                const isLast = index === Math.min(8, attempts.length) - 1;

                return (
                  <View
                    key={attempt.id}
                    style={[styles.activityItem, isLast && { borderBottomWidth: 0 }]}
                  >
                    <View style={styles.activityContent}>
                      <Text style={styles.activityName}>{activity ? t(`games.${activity.id}.title`, { defaultValue: activity.title }) : (game ? t(`games.${game.id}.title`, { defaultValue: game.title }) : attempt.activityId)}</Text>
                      <Text style={styles.activityTime}>{timeAgo}</Text>
                    </View>
                    <Text style={styles.resultText}>{attempt.result}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: 2
  },
  reportButton: {
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.button
  },
  reportButtonTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.base
  },
  reportButtonSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontSize: fontSize.xs
  },
  streakCard: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1d4ed8'
  },
  streakLabel: {
    fontSize: fontSize.sm,
    color: '#1e40af'
  },
  streakMessage: {
    maxWidth: '45%',
    textAlign: 'right',
    color: '#1e3a8a',
    fontWeight: '600'
  },
  achievementCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  achievementTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  achievementValue: {
    color: '#9a3412',
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  achievementSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: fontSize.xs
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    ...shadows.sm,
  },
  statCardLarge: {
    width: '100%',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700'
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 3
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  progressCard: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md
  },
  progressLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  progressText: {
    color: colors.textMuted,
    fontSize: fontSize.xs
  },
  activityList: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    ...shadows.sm
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    padding: spacing.md
  },
  activityContent: {
    flex: 1
  },
  activityName: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  activityTime: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2
  },
  resultText: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: spacing.xs
  }
});
