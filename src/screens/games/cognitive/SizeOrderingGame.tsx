import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    Image,
    ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameControlHeader, GameInstruction, FeedbackOverlay, GameButton } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, shadows } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface SizeItem {
    id: number;
    size: number;
    color: string;
    image: ImageSourcePropType;
    name: string;
}

const CATEGORIES = [
    {
        name: 'Fruit',
        items: [
            { name: 'Apple', image: require('../../../../assets/images/games/cognitive/size_ordering/apple.jpg'), color: '#ef4444' },
            { name: 'Banana', image: require('../../../../assets/images/games/cognitive/size_ordering/banana.jpg'), color: '#eab308' },
            { name: 'Watermelon', image: require('../../../../assets/images/games/cognitive/size_ordering/watermelon.jpg'), color: '#22c55e' },
        ]
    },
    {
        name: 'Toys',
        items: [
            { name: 'Car', image: require('../../../../assets/images/games/cognitive/size_ordering/car.jpg'), color: '#3b82f6' },
            { name: 'Ball', image: require('../../../../assets/images/games/cognitive/size_ordering/ball.jpg'), color: '#ef4444' },
            { name: 'Teddy Bear', image: require('../../../../assets/images/games/cognitive/size_ordering/teddy.jpg'), color: '#b45309' },
            { name: 'Robot', image: require('../../../../assets/images/games/cognitive/size_ordering/robot.jpg'), color: '#6366f1' },
        ]
    },
    {
        name: 'Nature',
        items: [
            { name: 'Sun', image: require('../../../../assets/images/games/cognitive/size_ordering/sun.jpg'), color: '#f59e0b' },
            { name: 'Cloud', image: require('../../../../assets/images/games/cognitive/size_ordering/cloud.jpg'), color: '#38bdf8' },
            { name: 'Star', image: require('../../../../assets/images/games/cognitive/size_ordering/star.jpg'), color: '#eab308' },
        ]
    },
    {
        name: 'Emotions',
        items: [
            { name: 'Happy', image: require('../../../../assets/images/games/cognitive/emotions/happy.jpg'), color: '#facc15' },
            { name: 'Sad', image: require('../../../../assets/images/games/cognitive/emotions/sad.jpg'), color: '#3b82f6' },
            { name: 'Angry', image: require('../../../../assets/images/games/cognitive/emotions/angry.jpg'), color: '#ef4444' },
            { name: 'Loved', image: require('../../../../assets/images/games/cognitive/emotions/loving.jpg'), color: '#f472b6' },
        ]
    }
];

export default function SizeOrderingGame() {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, settings, speak, resetCurrentGameProgress, startGame, isBusy, lockInput } = useGame();
    const { t } = useTranslation();

    const [items, setItems] = useState<SizeItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<SizeItem[]>([]);

    // Track last spoken level to prevent double voice
    const lastSpokenLevelRef = useRef<number>(-1);

    // Register game on mount - CRITICAL for level progression
    useEffect(() => {
        startGame('size-ordering');
    }, [startGame]);

    // Get number of items based on level & age
    const getItemCount = useCallback(() => {
        const ageMonths = settings?.childAgeMonths ?? 48;
        let maxItems = 6;

        if (ageMonths < 36) maxItems = 3;      // Toddler: Max 3
        else if (ageMonths < 48) maxItems = 4; // Early Preschool: Max 4
        else if (ageMonths < 60) maxItems = 5; // Late Preschool: Max 5
        else maxItems = 6;                     // School: Max 6

        // Increase starting item count to 3
        return Math.min(3 + Math.floor(gameState.level / 2), maxItems);
    }, [gameState.level, settings?.childAgeMonths]);

    // Generate items for the level
    const generateItems = useCallback(() => {
        const count = getItemCount();
        const baseSize = 65;
        const sizeIncrement = 30; // Slightly smaller increment to fit more items

        const category = CATEGORIES[gameState.level % CATEGORIES.length];
        const itemTemplate = category.items[Math.floor(Math.random() * category.items.length)];

        const newItems: SizeItem[] = [];
        for (let i = 0; i < count; i++) {
            newItems.push({
                id: i,
                size: baseSize + i * sizeIncrement,
                color: itemTemplate.color,
                image: itemTemplate.image,
                name: itemTemplate.name,
            });
        }

        // Shuffle for display
        setItems([...newItems].sort(() => Math.random() - 0.5));
        setSelectedItems([]);
    }, [gameState.level, getItemCount]);

    // Initialize on level change - Voice ONLY plays once per level
    useEffect(() => {
        generateItems();

        // Prevent double speak
        if (lastSpokenLevelRef.current !== gameState.level) {
            lastSpokenLevelRef.current = gameState.level;
            setTimeout(() => {
                speak(t('sizeOrdering.instruction'));
            }, 500);
        }
    }, [gameState.level, generateItems, speak, t]);

    // Handle item selection
    const handleItemSelect = useCallback((item: SizeItem) => {
        if (isBusy) return; // Prevent interaction while feedback is showing or input is locked

        const targetCount = getItemCount();

        setSelectedItems(prev => {
            // Check if already selected
            if (prev.some(s => s.id === item.id)) return prev;

            const newSelected = [...prev, item];

            // Remove from available items
            setItems(available => available.filter(i => i.id !== item.id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Speak the number (1, 2, 3...)
            speak(String(newSelected.length));

            // Check if all items are selected
            if (newSelected.length === targetCount) {
                // Verify order (should be smallest to largest)
                const isCorrect = newSelected.every((sItem, index) => {
                    if (index === 0) return true;
                    return sItem.size > newSelected[index - 1].size;
                });

                if (isCorrect) {
                    lockInput(1300); // Lock for success feedback
                    recordSuccess();
                    playSuccess();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                    showFeedback({
                        type: 'success',
                        message: t('sizeOrdering.perfectOrder'),
                        emoji: '🌟',
                    });
                    speak(t('sizeOrdering.perfectOrder'));

                    setTimeout(() => {
                        nextLevel();
                    }, 1200);
                } else {
                    lockInput(1600); // Lock for error feedback
                    recordError();
                    playError();

                    showFeedback({
                        type: 'error',
                        message: t('sizeOrdering.tryAgainMessage'),
                        emoji: '☝️',
                    }, 1500);
                    speak(t('sizeOrdering.tryAgainMessage').replace('!', ''));

                    setTimeout(() => {
                        // Reset
                        generateItems();
                    }, 1500);
                }
            }
            return newSelected;
        });
    }, [getItemCount, isBusy, lockInput, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, generateItems, speak]);

    // Reset handlers
    const handleResetLevel = useCallback(() => {
        generateItems();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [generateItems]);

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
    }, [resetCurrentGameProgress]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLevel}
                onRestartGame={handleRestartGame}
            />

            <GameInstruction
                text={t('sizeOrdering.instruction')}
                subtext={`${selectedItems.length}/${getItemCount()} ${t('sizeOrdering.selected')} • ${t('sizeOrdering.level')} ${gameState.level}`}
            />

            <View style={styles.gameArea}>
                {/* Selected items area */}
                <View style={styles.selectedArea}>
                    <View style={styles.selectedContainer}>
                        {selectedItems.length === 0 ? (
                            <View style={styles.placeholderContainer}>
                                <MaterialCommunityIcons name="gesture-tap" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                                <Text style={styles.placeholder}>{t('sizeOrdering.placeholder')}</Text>
                            </View>
                        ) : (
                            selectedItems.map((item, index) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.selectedItem,
                                        {
                                            width: item.size * 0.75 + 10,
                                            height: item.size * 0.75 + 10,
                                            borderColor: item.color + '60',
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
                                    <View style={[styles.orderBadge, { backgroundColor: item.color }]}>
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
                        {items.map((item) => (
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
                                <View style={[styles.imageContainer, { borderColor: item.color + '40' }]}>
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


            </View>

            <View style={styles.footer}>
                <GameButton
                    title={t('common.exitGame', 'Exit Game')}
                    variant="secondary"
                    onPress={() => navigation.goBack()}
                />
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    position="top"
                    topOffset={130}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    gameArea: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    selectedArea: {
        marginBottom: spacing.xxl,
    },
    selectedContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexWrap: 'wrap',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: spacing.lg,
        minHeight: 140,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.card,
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholder: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
        marginTop: spacing.sm,
        opacity: 0.7,
    },
    selectedItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        position: 'relative',
    },
    orderBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        ...shadows.sm,
    },
    orderNumber: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
    },
    itemsArea: {
        marginBottom: spacing.lg,
    },
    itemsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.lg,
        padding: spacing.md,
    },
    item: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.card,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xs,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    resetText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
});
