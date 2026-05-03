import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withDelay 
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../../theme/colors';

interface Props {
  isVisible: boolean;
  onReplay: () => void;
  onNext: () => void;
}

export function RewardFeedback({ isVisible, onReplay, onNext }: Props) {
  const { t } = useTranslation();
  
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      scale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 90 }));
      opacity.value = withDelay(500, withTiming(1, { duration: 220 }));
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.container, animatedStyle]}>
        <Text style={styles.title}>{t('animalMatch.greatJob')}</Text>
        <Text style={styles.emoji}>{'\u{1F389}'}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onReplay}>
            <Text style={styles.secondaryButtonText}>{t('animalMatch.playAgain')}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onNext}>
            <Text style={styles.buttonText}>{t('animalMatch.done')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  container: {
    backgroundColor: colors.cardBg,
    padding: spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.bgTertiary,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
