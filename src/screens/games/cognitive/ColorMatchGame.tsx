import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = [
    { name: 'red', value: '#ef4444' },
    { name: 'blue', value: '#3b82f6' },
    { name: 'green', value: '#22c55e' },
    { name: 'yellow', value: '#eab308' },
    { name: 'purple', value: '#a855f7' },
    { name: 'orange', value: '#f97316' },
    { name: 'pink', value: '#ec4899' },
    { name: 'cyan', value: '#06b6d4' },
    { name: 'lime', value: '#84cc16' },
    { name: 'teal', value: '#14b8a6' },
    { name: 'brown', value: '#795548' },
];

interface ColorOption {
    name: string;
    value: string;
}

// Fisher-Yates Shuffle for unbiased randomization
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export default function ColorMatchGame() {
    const navigation = useNavigation();
    const {
        gameState,
        nextLevel,
        recordSuccess,
        recordError,
        showFeedback,
        feedback,
        playSuccess,
        playError,
        resetCurrentGameProgress,
        settings,
        speak,
        startGame,
        currentGameId,
        isBusy,
        lockInput
    } = useGame();
    const { t } = useTranslation();

    const [targetColor, setTargetColor] = useState<ColorOption>(COLORS[0]);
    const [options, setOptions] = useState<ColorOption[]>([]);
    const [roundComplete, setRoundComplete] = useState(false);

    // Bag randomization to ensure no repeats for ~11 levels
    const availableTargetsRaw = React.useRef<ColorOption[]>([]);

    // Determine Age-Based Difficulty
    const ageMonths = settings?.childAgeMonths ?? 48; // Default 4yo
    let maxOptions = 6;

    if (ageMonths < 36) {
        // Toddler: Simple choices (2-3)
        maxOptions = 3;
    } else if (ageMonths > 60) {
        // School: Many choices (up to 8)
        maxOptions = 8;
    }

    // Calculate number of options based on level
    const getOptionsCount = useCallback(() => {
        // Match web: grows every level starting at 3 options (2 distractors)
        const base = 2 + gameState.level;
        return Math.min(base, maxOptions);
    }, [gameState.level, maxOptions]);

    // Initialize bag if empty or level 1
    const replenishBag = useCallback(() => {
        // Use proper shuffle
        availableTargetsRaw.current = shuffleArray(COLORS);
    }, []);

    // Generate a new round
    const generateRound = useCallback(() => {
        if (gameState.level === 1 || availableTargetsRaw.current.length === 0) {
            replenishBag();
        }

        // Pick unique target from bag
        const target = availableTargetsRaw.current.pop() || COLORS[0];

        const numOptions = getOptionsCount();
        // Filter out target to pick distractors
        const potentialDistractors = COLORS.filter(c => c.name !== target.name);
        // Shuffle distractors properly
        const shuffledDistractors = shuffleArray(potentialDistractors);
        const selectedDistractors = shuffledDistractors.slice(0, numOptions - 1);

        // Final shuffle of options
        const finalOptions = shuffleArray([target, ...selectedDistractors]);

        setTargetColor(target);
        setOptions(finalOptions);
        setRoundComplete(false);
    }, [getOptionsCount, replenishBag, gameState.level]);

    // Initialize game on mount and register it
    useEffect(() => {
        if (currentGameId !== 'color-match') {
            startGame('color-match');
        }
    }, [currentGameId, startGame]);

    // Track last spoken to avoid duplicates
    const lastSpokenLevel = React.useRef<number>(-1);

    // Generate round and speak when level changes
    useEffect(() => {
        // Avoid double-speaking same level
        if (lastSpokenLevel.current === gameState.level) return;
        lastSpokenLevel.current = gameState.level;

        // Generate new round
        if (gameState.level === 1 || availableTargetsRaw.current.length === 0) {
            replenishBag();
        }
        const target = availableTargetsRaw.current.pop() || COLORS[0];
        const numOptions = getOptionsCount();
        const potentialDistractors = COLORS.filter(c => c.name !== target.name);
        const shuffledDistractors = shuffleArray(potentialDistractors);
        const selectedDistractors = shuffledDistractors.slice(0, numOptions - 1);
        const finalOptions = shuffleArray([target, ...selectedDistractors]);

        setTargetColor(target);
        setOptions(finalOptions);
        setRoundComplete(false);

        // Speak after a short delay to ensure state is settled
        setTimeout(() => {
            speak(t('colorMatch.instruction', { color: t(`colors.${target.name}`) }));
        }, 100);
    }, [gameState.level, speak, replenishBag, getOptionsCount, t]);


    // Handle color selection
    const handleColorPress = useCallback(async (color: ColorOption) => {
        if (roundComplete || isBusy) return;

        lockInput(1300); // Lock for duration of feedback

        if (color.name === targetColor.name) {
            // Correct!
            setRoundComplete(true);
            recordSuccess();
            playSuccess();

            // VOICE FEEDBACK FIXED
            speak(t('colorMatch.successMessage'));

            showFeedback({
                type: 'success',
                message: t('colorMatch.successMessage'),
                emoji: '🎉',
            });

            setTimeout(() => {
                nextLevel();
            }, 1200);
        } else {
            // Wrong
            recordError();
            playError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            // VOICE FEEDBACK FIXED
            speak(t('colorMatch.tryAgain').replace('!', ''));

            showFeedback({
                type: 'error',
                message: t('colorMatch.tryAgain'),
                emoji: '🤔',
            });
        }
    }, [targetColor.name, roundComplete, isBusy, lockInput, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, speak, t]);

    const handleResetLevel = useCallback(() => {
        generateRound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [generateRound]);

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
        // Effect will handle regeneration
    }, [resetCurrentGameProgress]);

    const optionSize = Math.min((width - spacing.lg * 2 - spacing.md * (getOptionsCount() - 1)) / Math.min(getOptionsCount(), 3), 100);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLevel}
                onRestartGame={handleRestartGame}
            />

            <GameHeader title={t('colorMatch.title')} />

            <View style={styles.gameArea}>
                {/* Target Color Display */}
                <View style={styles.targetSection}>
                    <Text style={styles.findText}>{t('colorMatch.findText')}</Text>
                    <View style={[styles.targetCircle, { backgroundColor: targetColor.value }]}>
                        {/* Visual only challenge matches web - no text labels */}
                    </View>
                </View>

                {/* Instructions */}
                <GameInstruction
                    text={t('colorMatch.hintText')}
                    subtext={`${t('colorMatch.level')} ${gameState.level} • ${getOptionsCount()} ${t('colorMatch.colors')}`}
                />

                {/* Color Options Grid */}
                <View style={styles.optionsContainer}>
                    {options.map((color, index) => (
                        <Pressable
                            key={`${color.name}-${index}`}
                            onPress={() => handleColorPress(color)}
                            style={({ pressed }) => [
                                styles.colorOption,
                                {
                                    backgroundColor: color.value,
                                    width: optionSize,
                                    height: optionSize,
                                    transform: [{ scale: pressed ? 0.9 : 1 }],
                                },
                            ]}
                        >
                            <View style={styles.colorInner} />
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Feedback Overlay */}
            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    compact={feedback.type === 'success'}
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
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    targetSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    findText: {
        fontSize: 20,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    targetCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    targetName: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    colorNameText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.md,
        textTransform: 'capitalize',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
        marginTop: spacing.xl,
        maxWidth: width - spacing.lg * 2,
    },
    colorOption: {
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    colorInner: {
        width: '70%',
        height: '70%',
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
    }
});
