import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  AvatarProfile,
  AvatarSlot,
  getAvatarOptionsBySlot,
  loadAvatarProfile,
  saveAvatarProfile
} from '../core/avatar';
import { evaluateAndStoreAchievements } from '../core/achievements';
import { loadJournalEntries } from '../core/journal';
import { loadAttempts, loadGameProgress } from '../core/storage';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme/colors';
import { useAuth } from '../core/AuthContext';
import { CompanionSyncService } from '../services/CompanionSyncService';

const SLOT_LABELS: Record<AvatarSlot, string> = {
  bodyColor: 'Body Color',
  face: 'Face',
  hat: 'Hat',
  accessory: 'Accessory',
  background: 'Backdrop'
};

export default function AvatarStudioScreen() {
  const { selectedChild } = useAuth();
  const [profile, setProfile] = useState<AvatarProfile>({
    bodyColor: '#fb923c',
    face: '🙂',
    hat: '',
    accessory: '',
    background: '#fff7ed'
  });
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (selectedChild?.id) {
      await CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }

    const [attempts, gameProgress, journalEntries, avatar] = await Promise.all([
      loadAttempts(),
      loadGameProgress(),
      loadJournalEntries(),
      loadAvatarProfile()
    ]);

    const achievementResult = await evaluateAndStoreAchievements({
      attempts,
      gameProgress,
      journalEntries
    });

    setUnlockedAchievementIds(achievementResult.statuses.filter(item => item.unlocked).map(item => item.id));
    setProfile(avatar);
  }, [selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const slotOptions = useMemo(() => ({
    bodyColor: getAvatarOptionsBySlot('bodyColor', unlockedAchievementIds),
    face: getAvatarOptionsBySlot('face', unlockedAchievementIds),
    hat: getAvatarOptionsBySlot('hat', unlockedAchievementIds),
    accessory: getAvatarOptionsBySlot('accessory', unlockedAchievementIds),
    background: getAvatarOptionsBySlot('background', unlockedAchievementIds)
  }), [unlockedAchievementIds]);

  const setSlot = async (slot: AvatarSlot, value: string) => {
    const updated = await saveAvatarProfile({ ...profile, [slot]: value }, unlockedAchievementIds);
    setProfile(updated);
    if (selectedChild?.id) {
      CompanionSyncService.sync(selectedChild.id).catch(() => undefined);
    }
  };

  const totalOptions = Object.values(slotOptions).flat().length;
  const unlockedOptions = Object.values(slotOptions).flat().filter(item => item.unlocked).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Avatar Studio</Text>
        <Text style={styles.headerSubtitle}>
          Reward {selectedChild?.name || 'your child'} with customizable companion styles.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{unlockedOptions}/{totalOptions}</Text>
          <Text style={styles.summaryLabel}>Cosmetics unlocked</Text>
        </View>

        <View style={[styles.previewCard, { backgroundColor: profile.background }]}>
          <Text style={styles.previewTitle}>Companion Preview</Text>
          <View style={[styles.avatarBody, { backgroundColor: profile.bodyColor }]}>
            {profile.hat ? <Text style={styles.avatarHat}>{profile.hat}</Text> : null}
            <Text style={styles.avatarFace}>{profile.face}</Text>
            {profile.accessory ? <Text style={styles.avatarAccessory}>{profile.accessory}</Text> : null}
          </View>
        </View>

        {(Object.keys(slotOptions) as AvatarSlot[]).map(slot => (
          <View key={slot} style={styles.slotSection}>
            <Text style={styles.slotTitle}>{SLOT_LABELS[slot]}</Text>
            <View style={styles.optionWrap}>
              {slotOptions[slot].map(option => {
                const selected = profile[slot] === option.value;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => option.unlocked && setSlot(slot, option.value)}
                    style={[
                      styles.optionPill,
                      selected && styles.optionPillSelected,
                      !option.unlocked && styles.optionPillLocked
                    ]}
                  >
                    <Text style={styles.optionPreview}>{option.preview}</Text>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {!option.unlocked ? <Text style={styles.lockLabel}>Locked</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
    fontWeight: '800',
    color: colors.textPrimary
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  summaryCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  previewCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm
  },
  previewTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  avatarBody: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  avatarFace: {
    fontSize: 54
  },
  avatarHat: {
    position: 'absolute',
    top: -20,
    fontSize: 34
  },
  avatarAccessory: {
    position: 'absolute',
    bottom: -18,
    fontSize: 30
  },
  slotSection: {
    marginBottom: spacing.md
  },
  slotTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  optionPill: {
    minWidth: 96,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center'
  },
  optionPillSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#fff7ed'
  },
  optionPillLocked: {
    opacity: 0.55
  },
  optionPreview: {
    fontSize: 24
  },
  optionLabel: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600'
  },
  lockLabel: {
    marginTop: 3,
    color: colors.error,
    fontSize: 10,
    fontWeight: '700'
  }
});
