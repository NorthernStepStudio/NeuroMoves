import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { GAME_REGISTRY, GameConfig, GAME_SCREEN_MAP } from '../core/gameTypes';
import { useGame } from '../core/GameContext';
import { borderRadius, colors, fontSize, shadows, spacing } from '../theme/colors';
import { SubscriptionService } from '../services/SubscriptionService';

const isFabricEnabled = Boolean((globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager);
if (Platform.OS === 'android' && !isFabricEnabled && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const CATEGORIES = [
  {
    key: 'motor',
    label: 'Motor Skills',
    description: 'Build coordination and movement',
    color: '#15803d',
    lightColor: '#dcfce7'
  },
  {
    key: 'cognitive',
    label: 'Thinking',
    description: 'Build matching and problem solving',
    color: '#1d4ed8',
    lightColor: '#dbeafe'
  },
  {
    key: 'sensory',
    label: 'Sensory',
    description: 'Build sensory awareness',
    color: '#c2410c',
    lightColor: '#ffedd5'
  }
];

interface GameCardProps {
  game: GameConfig;
  onPress: () => void;
  categoryColor: string;
  locked: boolean;
}

function GameCard({ game, onPress, categoryColor, locked }: GameCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gameCard,
        pressed && styles.gameCardPressed
      ]}
    >
      <View style={[styles.gameIconContainer, { backgroundColor: `${categoryColor}20` }]}>
        <Text style={styles.gameIcon}>{game.icon}</Text>
      </View>
      <Text style={styles.gameTitle} numberOfLines={2}>{t(`games.${game.id}.title`, { defaultValue: game.title })}</Text>
      <Text style={styles.gameDescription} numberOfLines={2}>{t(`games.${game.id}.description`, { defaultValue: game.description })}</Text>
      {locked ? <Text style={styles.lockedBadge}>{t('home.pro', { defaultValue: 'Pro' })}</Text> : null}
      <View style={styles.playIndicator}>
        <Text style={styles.playText}>{locked ? 'Unlock Pro' : 'Play ->'}</Text>
      </View>
    </Pressable>
  );
}

interface CategorySectionProps {
  category: typeof CATEGORIES[0];
  games: GameConfig[];
  isExpanded: boolean;
  onToggle: () => void;
  onGamePress: (game: GameConfig) => void;
  isGameLocked: (game: GameConfig) => boolean;
  t: any;
}

function CategorySection({
  category,
  games,
  isExpanded,
  onToggle,
  onGamePress,
  isGameLocked,
  t
}: CategorySectionProps) {
  return (
    <View style={styles.categorySection}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.categoryHeader,
          { backgroundColor: category.lightColor },
          pressed && { opacity: 0.9 }
        ]}
      >
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryLabel, { color: category.color }]}>{t(`categories.${category.key}`, { defaultValue: category.label })}</Text>
          <Text style={styles.categoryDescription}>{t(`categories.${category.key}Desc`, { defaultValue: category.description })}</Text>
        </View>
        <View style={styles.categoryRight}>
          <View style={[styles.gameCountBadge, { backgroundColor: category.color }]}>
            <Text style={styles.gameCountText}>{games.length}</Text>
          </View>
          <Text style={[styles.chevron, { color: category.color }]}>{isExpanded ? 'v' : '>'}</Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.gamesGrid}>
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onPress={() => onGamePress(game)}
              categoryColor={category.color}
              locked={isGameLocked(game)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function GamesScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { startGame } = useGame();
  const { t } = useTranslation();
  const [hasPro, setHasPro] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    motor: true,
    cognitive: false,
    sensory: false
  });

  useFocusEffect(
    useCallback(() => {
      SubscriptionService.hasProEntitlement().then(setHasPro);
    }, [])
  );

  const isGameLocked = useCallback((game: GameConfig) => {
    return !hasPro && SubscriptionService.isGameLockedForFreeTier(game.id);
  }, [hasPro]);

  const handleGamePress = async (game: GameConfig) => {
    if (isGameLocked(game)) {
      navigation.navigate('Paywall', { gameId: game.id });
      return;
    }

    await startGame(game.id);
    const screenName = GAME_SCREEN_MAP[game.id];
    navigation.navigate(screenName);
  };

  const toggleCategory = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const gamesByCategory = CATEGORIES
    .map(category => ({
      ...category,
      games: GAME_REGISTRY.filter(game => game.category === category.key)
    }))
    .filter(category => category.games.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('nav.activities', { defaultValue: 'Activities' })}</Text>
        <Text style={styles.headerSubtitle}>
          {GAME_REGISTRY.length} {t('activities.ready', { defaultValue: 'activities ready.' })} {hasPro ? t('activities.proActive', { defaultValue: 'Pro active.' }) : t('activities.freeActive', { defaultValue: 'Free tier active.' })}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gamesByCategory.map(category => (
          <CategorySection
            key={category.key}
            category={category}
            games={category.games}
            isExpanded={expandedCategories[category.key]}
            onToggle={() => toggleCategory(category.key)}
            onGamePress={handleGamePress}
            isGameLocked={isGameLocked}
            t={t}
          />
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary
  },
  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  categorySection: {
    marginBottom: spacing.lg
  },
  categoryHeader: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  categoryInfo: {
    flex: 1
  },
  categoryLabel: {
    fontWeight: '700',
    fontSize: fontSize.base
  },
  categoryDescription: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: fontSize.xs
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  gameCountBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  gameCountText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.xs
  },
  chevron: {
    fontWeight: '700'
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  gameCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card
  },
  gameCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }]
  },
  gameIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  gameIcon: {
    fontSize: 28
  },
  gameTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
    marginBottom: 4
  },
  gameDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm
  },
  lockedBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  playIndicator: {
    marginTop: 'auto'
  },
  playText: {
    color: colors.accentPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700'
  }
});
