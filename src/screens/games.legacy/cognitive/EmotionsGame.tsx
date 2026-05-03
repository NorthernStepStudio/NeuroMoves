import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameHeader, GameInstruction, FeedbackOverlay, GameButton, GameControlHeader } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface Emotion {
    name: string;
    emoji: string;
    color: string;
    image: any;
}

const EMOTIONS: Emotion[] = [
    { name: 'happy', emoji: '😊', color: '#22c55e', image: require('../../../../assets/images/games/cognitive/emotions/happy.jpg') },
    { name: 'sad', emoji: '😢', color: '#3b82f6', image: require('../../../../assets/images/games/cognitive/emotions/sad.jpg') },
    { name: 'angry', emoji: '😠', color: '#ef4444', image: require('../../../../assets/images/games/cognitive/emotions/angry.jpg') },
    { name: 'surprised', emoji: '😲', color: '#f59e0b', image: require('../../../../assets/images/games/cognitive/emotions/surprised.jpg') },
    { name: 'scared', emoji: '😨', color: '#8b5cf6', image: require('../../../../assets/images/games/cognitive/emotions/scared.jpg') },
    { name: 'sleepy', emoji: '😴', color: '#64748b', image: require('../../../../assets/images/games/cognitive/emotions/sleepy.jpg') },
    { name: 'silly', emoji: '😜', color: '#ec4899', image: require('../../../../assets/images/games/cognitive/emotions/silly.jpg') },
    { name: 'loving', emoji: '😍', color: '#f43f5e', image: require('../../../../assets/images/games/cognitive/emotions/loving.jpg') },
];

export default function EmotionsGame() {
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
        speak,
        resetCurrentGameProgress,
        startGame,
        isBusy,
        lockInput
    } = useGame();
    const { t } = useTranslation();

    const [targetEmotion, setTargetEmotion] = useState<Emotion>(EMOTIONS[0]);
    const [options, setOptions] = useState<Emotion[]>([]);
    const lastTargetRef = useRef<string | null>(null);

    // Initialize game on mount
    useEffect(() => {
        startGame('emotions');
    }, [startGame]);

    // Calculate number of options based on level
    const getOptionsCount = useCallback(() => {
        return Math.min(2 + Math.floor(gameState.level / 2), 6);
    }, [gameState.level]);

    // Generate round
    const generateRound = useCallback(() => {
        const numOptions = getOptionsCount();
        const shuffled = [...EMOTIONS].sort(() => Math.random() - 0.5);

        // Improve randomness: ensure target is different from previous
        let selectedOptions = shuffled.slice(0, numOptions);
        let target = selectedOptions[Math.floor(Math.random() * selectedOptions.length)];

        // If we have enough emotions, try to pick one that wasn't previous
        if (EMOTIONS.length > 2) {
            let attempts = 0;
            while (target.name === lastTargetRef.current && attempts < 10) {
                const newShuffled = [...EMOTIONS].sort(() => Math.random() - 0.5);
                selectedOptions = newShuffled.slice(0, numOptions);
                target = selectedOptions[Math.floor(Math.random() * selectedOptions.length)];
                attempts++;
            }
        }

        lastTargetRef.current = target.name;
        setTargetEmotion(target);
        setOptions(selectedOptions.sort(() => Math.random() - 0.5));

        setTimeout(() => {
            speak(t('emotions.instruction', { emotion: t(`emotions.list.${target.name}`) }));
        }, 300);
    }, [getOptionsCount, speak, t]);

    const lastProcessedLevelRef = useRef<number | null>(null);

    // Initialize on level change
    useEffect(() => {
        if (gameState.level !== undefined && gameState.level !== lastProcessedLevelRef.current) {
            lastProcessedLevelRef.current = gameState.level;
            generateRound();
        }
    }, [gameState.level, generateRound]);

    // Reset handlers
    const handleResetLevel = useCallback(() => {
        generateRound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [generateRound]);

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
    }, [resetCurrentGameProgress]);

    // Handle emotion selection
    const handleEmotionPress = useCallback((emotion: Emotion) => {
        if (isBusy) return; // Block input while processing

        lockInput(1300); // Lock for duration of feedback

        if (emotion.name === targetEmotion.name) {
            recordSuccess();
            playSuccess();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Voice feedback
            speak(t('emotions.successMessage', { emotion: t(`emotions.list.${emotion.name}`) }));

            showFeedback({
                type: 'success',
                message: t('emotions.successMessage', { emotion: t(`emotions.list.${emotion.name}`) }),
                emoji: emotion.emoji,
            });

            setTimeout(() => {
                nextLevel();
            }, 1200);
        } else {
            recordError();
            playError();

            // Voice feedback
            speak(t('emotions.tryAgain').replace('!', ''));

            showFeedback({
                type: 'error',
                message: t('emotions.tryAgain'),
                emoji: '🤔',
            }, 800);
        }
    }, [targetEmotion, isBusy, lockInput, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, speak, t]);

    const optionSize = Math.min((width - spacing.lg * 2 - spacing.md * 2) / Math.min(getOptionsCount(), 2.2), 160);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLevel}
                onRestartGame={handleRestartGame}
            />

            <GameInstruction
                text={t('emotions.instruction', { emotion: t(`emotions.list.${targetEmotion.name}`) }).toUpperCase()}
                subtext={`${t('emotions.level')} ${gameState.level}`}
            />

            <View style={styles.gameArea}>
                {/* Emotion options */}
                <View style={styles.optionsContainer}>
                    {options.map((emotion, index) => (
                        <Pressable
                            key={`${emotion.name}-${index}`}
                            onPress={() => handleEmotionPress(emotion)}
                            style={({ pressed }) => [
                                styles.emotionOption,
                                {
                                    width: optionSize,
                                    height: optionSize * 1.1,
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                },
                            ]}
                        >
                            <View style={[styles.imageContainer, { borderColor: emotion.color + '40' }]}>
                                <Image
                                    source={emotion.image}
                                    style={{
                                        width: optionSize * 0.85,
                                        height: optionSize * 0.85,
                                    }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.optionLabel}>{t(`emotions.list.${emotion.name}`)}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    transparent={true}
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
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.lg,
        maxWidth: width - spacing.lg * 2,
    },
    emotionOption: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    imageContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 18,
        padding: spacing.xs,
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
    optionLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
