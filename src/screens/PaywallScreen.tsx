import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../core/GameContext';
import { GAME_SCREEN_MAP, GameId } from '../core/gameTypes';
import { borderRadius, colors, fontSize, spacing } from '../theme/colors';

interface PaywallParams {
  gameId?: GameId;
}

const FEATURES = [
  'Access all skill modules and future games',
  'Advanced challenge levels',
  'Expanded progression roadmap',
  'Priority updates for new OT tools'
];

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { startGame } = useGame();
  const [submitting, setSubmitting] = useState(false);

  const requestedGameId = (route.params as PaywallParams | undefined)?.gameId;

  const handleUnlock = async () => {
    try {
      setSubmitting(true);
      Alert.alert('All activities unlocked', 'Pro gating is disabled on this build.');

      if (requestedGameId) {
        await startGame(requestedGameId);
        const screenName = GAME_SCREEN_MAP[requestedGameId];
        navigation.replace(screenName);
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e?.message || 'Could not activate Pro.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.badge}>NSS Pro</Text>
        <Text style={styles.title}>Unlock your child's full potential</Text>
        <Text style={styles.subtitle}>
          Keep progress continuous with the full game catalog and advanced pathways.
        </Text>

        <View style={styles.featureCard}>
          {FEATURES.map(item => (
            <View key={item} style={styles.featureRow}>
              <Text style={styles.featureBullet}>-</Text>
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {requestedGameId ? (
          <View style={styles.lockedNote}>
            <Text style={styles.lockedNoteText}>
              You selected a Pro activity. Upgrade to continue with that activity now.
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleUnlock}
          disabled={submitting}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {requestedGameId ? 'Continue Activity' : 'Continue'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: fontSize.xs,
    fontWeight: '700'
  },
  title: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  featureCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardBg,
    padding: spacing.md
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm
  },
  featureBullet: {
    color: colors.accentPrimary,
    fontWeight: '700',
    marginRight: spacing.xs
  },
  featureText: {
    flex: 1,
    color: colors.textPrimary
  },
  lockedNote: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    borderRadius: borderRadius.md,
    padding: spacing.sm
  },
  lockedNoteText: {
    color: '#92400e'
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accentPrimary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.base
  },
  secondaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
