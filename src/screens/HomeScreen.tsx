import React, { useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityAttempt, SettingsState, GameProgress } from '../core/types';
import { loadAttempts, loadSettings, loadGameProgress } from '../core/storage';
import { SyncService } from '../services/SyncService';
import { CompanionSyncService } from '../services/CompanionSyncService';
import { SubscriptionService } from '../services/SubscriptionService';
import { useAuth } from '../core/AuthContext';
import { GAME_REGISTRY, GAME_SCREEN_MAP } from '../core/gameTypes';
import { colors, spacing, borderRadius, shadows, fontSize } from '../theme/colors';

// Category config
const CATEGORIES = [
  { key: 'motor', label: 'Motor Skills', icon: '🤸', color: '#22c55e' },
  { key: 'cognitive', label: 'Cognitive', icon: '🧠', color: '#3b82f6' },
  { key: 'sensory', label: 'Sensory', icon: '👂', color: '#f97316' },
];

// Format age for display
function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths}m`;
  if (remainingMonths === 0) return `${years}y`;
  return `${years}y ${remainingMonths}m`;
}

// Get age-appropriate activities
function getAgeAppropriateActivities(ageMonths: number) {
  // Filter games suitable for age
  return GAME_REGISTRY.filter(game => {
    if (!game.enabled) return false;
    // All activities are appropriate, but we can prioritize
    if (ageMonths < 24) {
      // Younger: focus on motor and simple cognitive
      return ['pop-bubbles', 'stacking', 'color-match', 'tracing', 'letter-recognition', 'number-recognition'].includes(game.id);
    } else if (ageMonths < 36) {
      // Toddlers: add more variety
      return ['pop-bubbles', 'stacking', 'color-match', 'tracing', 'number-tracing', 'yes-no', 'point-it-out', 'letter-recognition', 'number-recognition'].includes(game.id);
    }
    // Older: all activities
    return true;
  }).slice(0, 3);
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { selectedChild } = useAuth();
  const [attempts, setAttempts] = useState<ActivityAttempt[]>([]);
  const [settings, setSettings] = useState<SettingsState>({
    childAgeMonths: 24,
    parentModeEnabled: true,
    audioMuted: false,
    voiceVolume: 1.0,
    sfxVolume: 1.0,
    voiceMuted: false,
    sfxMuted: false,
    hapticEnabled: true,
    hapticStrength: 'medium'
  });
  const [gameProgress, setGameProgress] = useState<Record<string, GameProgress>>({});
  const [hasPro, setHasPro] = useState(false);

  // Load all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAttempts().then(setAttempts);
      loadSettings().then(setSettings);
      SubscriptionService.hasProEntitlement().then(setHasPro);

      // Load game progress for all games
      loadGameProgress().then(progress => {
        setGameProgress(progress as Record<string, GameProgress>);
      });

      // Trigger background sync (non-blocking) for the selected child profile.
      if (selectedChild?.id) {
        SyncService.performSync(selectedChild.id).then(result => {
          if (result.success && (result.attemptsSynced > 0 || result.progressSynced > 0)) {
            if (__DEV__) {
              console.log(`[HomeScreen] Sync complete: ${result.attemptsSynced} attempts, ${result.progressSynced} progress`);
            }
            loadAttempts().then(setAttempts);
            loadGameProgress().then(p => setGameProgress(p as Record<string, GameProgress>));
          }
        });
        CompanionSyncService.sync(selectedChild.id).catch(error => {
          if (__DEV__) {
            console.warn('[CompanionSync] Background sync skipped:', error);
          }
        });
      }
    }, [selectedChild?.id])
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t('home.goodMorning'), emoji: '🌅' };
    if (hour < 17) return { text: t('home.goodAfternoon'), emoji: '☀️' };
    return { text: t('home.goodEvening'), emoji: '🌙' };
  })();

  // Get suggested activities based on age
  const suggestedActivities = getAgeAppropriateActivities(settings.childAgeMonths);

  // Get recently played (games with lastPlayedAt)
  const recentlyPlayed = (Object.entries(gameProgress) as [string, GameProgress][])
    .filter(([_, progress]) => progress.lastPlayedAt)
    .sort((a, b) => new Date(b[1].lastPlayedAt!).getTime() - new Date(a[1].lastPlayedAt!).getTime())
    .map(([gameId, progress]) => {
      const game = GAME_REGISTRY.find(g => g.id === gameId);
      if (!game || !game.enabled) return null;
      return { ...game, progress };
    })
    .filter(g => g !== null);

  // Get last played for "Continue" card
  const lastPlayed = recentlyPlayed[0];

  // Calculate category progress
  const categoryProgress = CATEGORIES.map(cat => {
    const categoryGames = GAME_REGISTRY.filter(g => g.category === cat.key && g.enabled);
    const totalLevels = categoryGames.reduce((sum, g) => sum + g.maxLevels, 0);
    const completedLevels = categoryGames.reduce((sum, g) => {
      const progress = gameProgress[g.id];
      return sum + (progress?.highestLevel || 0);
    }, 0);
    return {
      ...cat,
      progress: totalLevels > 0 ? completedLevels / totalLevels : 0,
      completed: completedLevels,
      total: totalLevels,
    };
  });

  const isGameLocked = (gameId: string) => !hasPro && SubscriptionService.isGameLockedForFreeTier(gameId);

  const handleGamePress = (gameId: string) => {
    if (isGameLocked(gameId)) {
      (navigation.navigate as any)('Paywall', { gameId });
      return;
    }

    const screenName = GAME_SCREEN_MAP[gameId as keyof typeof GAME_SCREEN_MAP];
    if (screenName) {
      (navigation.navigate as any)(screenName);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with greeting */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
              <Text style={styles.greeting}>{greeting.text}!</Text>
              <Text style={styles.subtitle}>
                {t('home.readyPractice')}{selectedChild?.name ? `, ${selectedChild.name}` : ''}?
              </Text>
            </View>
            {settings.parentModeEnabled && (
              <View style={styles.parentModeBadge}>
                <Text style={styles.parentModeBadgeText}>👨‍👩‍👧 {t('home.parentMode')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{attempts.length}</Text>
            <Text style={styles.statLabel}>{t('home.done')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatAge(settings.childAgeMonths)}</Text>
            <Text style={styles.statLabel}>{t('home.childAge')}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statValueAccent}>{Object.keys(gameProgress).length}</Text>
            <Text style={styles.statLabelAccent}>{t('home.tried')}</Text>
          </View>
        </View>

        {/* Companion Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🧰 {t('home.companionTools')}</Text>
          </View>
          <View style={styles.toolsRow}>
            <Pressable
              onPress={() => navigation.navigate('DailyJournal' as never)}
              style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
            >
              <Text style={styles.toolIcon}>📘</Text>
              <Text style={styles.toolTitle}>{t('home.dailyJournal')}</Text>
              <Text style={styles.toolMeta}>{t('home.trackWins')}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Achievements' as never)}
              style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
            >
              <Text style={styles.toolIcon}>🏅</Text>
              <Text style={styles.toolTitle}>{t('home.badges')}</Text>
              <Text style={styles.toolMeta}>{t('home.milestones')}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('AvatarStudio' as never)}
              style={({ pressed }) => [styles.toolCard, pressed && styles.cardPressed]}
            >
              <Text style={styles.toolIcon}>🧸</Text>
              <Text style={styles.toolTitle}>{t('home.avatarStudio')}</Text>
              <Text style={styles.toolMeta}>{t('home.customize')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Continue Where You Left Off */}
        {lastPlayed && (
          <Pressable
            onPress={() => handleGamePress(lastPlayed.id)}
            style={({ pressed }) => [styles.continueCard, pressed && styles.cardPressed]}
          >
            <View style={styles.continueBadge}>
              <Text style={styles.continueBadgeText}>▶ {t('home.continue')}</Text>
            </View>
            <View style={styles.continueContent}>
              <Text style={styles.continueIcon}>{lastPlayed.icon}</Text>
              <View style={styles.continueTextContent}>
                <Text style={styles.continueTitle}>{t(`games.${lastPlayed.id}.title`, { defaultValue: lastPlayed.title })}</Text>
                <Text style={styles.continueMeta}>
                  {t('home.level')} {lastPlayed.progress.currentLevel} • {lastPlayed.category}
                </Text>
              </View>
              <View style={styles.continueButton}>
                <Text style={styles.continueButtonText}>{isGameLocked(lastPlayed.id) ? t('home.pro') : t('home.play')}</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Suggested Activities Based on Age */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 {t('home.suggestedFor')} {formatAge(settings.childAgeMonths)}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedScroll}
          >
            {suggestedActivities.map((game) => (
              <Pressable
                key={game.id}
                onPress={() => handleGamePress(game.id)}
                style={({ pressed }) => [
                  styles.suggestedCard,
                  isGameLocked(game.id) && styles.suggestedCardLocked,
                  pressed && styles.cardPressed
                ]}
              >
                <Text style={styles.suggestedIcon}>{game.icon}</Text>
                <Text style={styles.suggestedTitle}>{t(`games.${game.id}.title`, { defaultValue: game.title })}</Text>
                <Text style={styles.suggestedDesc} numberOfLines={2}>
                  {t(`games.${game.id}.description`, { defaultValue: game.description })}
                </Text>
                <View style={styles.suggestedPlayBtn}>
                  <Text style={styles.suggestedPlayText}>{isGameLocked(game.id) ? t('home.unlockPro') : t('home.play')}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Category Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 {t('home.skillProgress')}</Text>
          </View>
          <View style={styles.progressGrid}>
            {categoryProgress.map((cat) => (
              <Pressable
                key={cat.key}
                style={styles.progressCard}
                onPress={() => navigation.navigate('Activities' as never)}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressIcon}>{cat.icon}</Text>
                  <Text style={styles.progressLabel}>{cat.label}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(cat.progress * 100, 100)}%`,
                        backgroundColor: cat.color,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {cat.completed}/{cat.total} levels
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🕐 {t('home.recentActivity')}</Text>
            </View>
            {recentlyPlayed.map((game) => (
              <Pressable
                key={game.id}
                onPress={() => handleGamePress(game.id)}
                style={({ pressed }) => [styles.recentCard, pressed && styles.cardPressed]}
              >
                <View style={styles.recentIcon}>
                  <Text style={styles.recentIconText}>{game.icon}</Text>
                </View>
                <View style={styles.recentContent}>
                  <Text style={styles.recentTitle}>{game.title}</Text>
                  <Text style={styles.recentMeta}>
                    {t('home.levelReached', { level: game.progress.highestLevel })}
                  </Text>
                </View>
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>{isGameLocked(game.id) ? t('home.pro') : '▶'}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Explore All */}
        <Pressable
          onPress={() => navigation.navigate('Activities' as never)}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreText}>🎯 {t('home.exploreAll')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    marginTop: 2,
  },
  parentModeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  parentModeBadgeText: {
    fontSize: fontSize.xs,
    color: '#92400e',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  statCardAccent: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statValueAccent: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statLabelAccent: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  // Continue Card
  continueCard: {
    backgroundColor: '#dbeafe',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  continueBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  continueBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  continueTextContent: {
    flex: 1,
  },
  continueTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  continueMeta: {
    fontSize: fontSize.sm,
    color: '#1e40af',
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Suggested Cards
  suggestedScroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  suggestedCard: {
    width: 150,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  suggestedCardLocked: {
    opacity: 0.7
  },
  suggestedIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  suggestedTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  suggestedDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  suggestedPlayBtn: {
    backgroundColor: colors.accentPrimary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  suggestedPlayText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  // Companion tools
  toolsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center'
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 2
  },
  toolTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  toolMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center'
  },

  // Progress Grid
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  progressCard: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Recent Cards
  recentCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recentIconText: {
    fontSize: 22,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
  },

  // Explore Button
  exploreButton: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  exploreText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
