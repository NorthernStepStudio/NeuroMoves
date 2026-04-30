import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameHeader, GameInstruction, FeedbackOverlay, GameButton } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface Question {
    text: string;
    answer: 'yes' | 'no';
    color: string;
    emoji: string;
}

// More questions per level
// Expanded Pools for Infinite Variety
const QUESTIONS: Question[][] = [
    // Level 1 - Simple Identification (Animals & Food) - POOL SIZE: ~20
    [
        // Correct Matches
        { text: 'Is this an apple?', answer: 'yes', color: '#ef4444', emoji: '🍎' },
        { text: 'Is this a dog?', answer: 'yes', color: '#78350f', emoji: '🐶' },
        { text: 'Is this a car?', answer: 'yes', color: '#dc2626', emoji: '🚗' },
        { text: 'Is this a fish?', answer: 'yes', color: '#3b82f6', emoji: '🐟' },
        // Distractor Permutations (Reuse voice assets)
        { text: 'Is this an apple?', answer: 'no', color: '#eab308', emoji: '🍌' }, // Banana
        { text: 'Is this an apple?', answer: 'no', color: '#dc2626', emoji: '🚗' }, // Car
        { text: 'Is this a dog?', answer: 'no', color: '#f97316', emoji: '🐱' }, // Cat
        { text: 'Is this a dog?', answer: 'no', color: '#16a34a', emoji: '🐢' }, // Turtle
        { text: 'Is this a car?', answer: 'no', color: '#78350f', emoji: '🐶' }, // Dog
        { text: 'Is this a car?', answer: 'no', color: '#3b82f6', emoji: '🐟' }, // Fish
        { text: 'Is this a fish?', answer: 'no', color: '#0ea5e9', emoji: '🐦' }, // Bird
        { text: 'Is this a fish?', answer: 'no', color: '#16a34a', emoji: '🐍' }, // Snake
        // Original Mix
        { text: 'Is this a bird?', answer: 'no', color: '#16a34a', emoji: '🐢' },
        { text: 'Is this a bird?', answer: 'yes', color: '#0ea5e9', emoji: '🐦' },
        { text: 'Is this a cat?', answer: 'no', color: '#eab308', emoji: '🍌' },
        { text: 'Is this a cat?', answer: 'yes', color: '#f97316', emoji: '🐱' },
    ],
    // Level 2 - Colors & basic mixing - POOL SIZE: ~6 (Reduced to avoid logic errors)
    [
        { text: 'Is the sun yellow?', answer: 'yes', color: '#eab308', emoji: '☀️' },
        { text: 'Is the grass green?', answer: 'yes', color: '#22c55e', emoji: '🌿' },
        { text: 'Is the sky blue?', answer: 'yes', color: '#3b82f6', emoji: '☁️' },
        { text: 'Is a strawberry red?', answer: 'yes', color: '#ef4444', emoji: '🍓' },
        { text: 'Is a lemon purple?', answer: 'no', color: '#a855f7', emoji: '🍋' },
        { text: 'Is snow black?', answer: 'no', color: '#000000', emoji: '❄️' },
    ],
    // Level 3 - Animal Actions - POOL SIZE: ~6
    [
        { text: 'Do cats meow?', answer: 'yes', color: '#f97316', emoji: '🐱' },
        { text: 'Do birds fly?', answer: 'yes', color: '#0ea5e9', emoji: '🐦' },
        { text: 'Do fish walk?', answer: 'no', color: '#3b82f6', emoji: '🐟' },
        { text: 'Do dogs quack?', answer: 'no', color: '#78350f', emoji: '🐶' },
        { text: 'Do cows moo?', answer: 'yes', color: '#1f2937', emoji: '🐮' },
        { text: 'Do snakes run?', answer: 'no', color: '#16a34a', emoji: '🐍' },
    ],
    // Level 4+ - Properties & Logic - POOL SIZE: ~6
    [
        { text: 'Is ice cold?', answer: 'yes', color: '#0ea5e9', emoji: '🧊' },
        { text: 'Is fire hot?', answer: 'yes', color: '#ef4444', emoji: '🔥' },
        { text: 'Is a rock soft?', answer: 'no', color: '#57534e', emoji: '🪨' },
        { text: 'Is candy sweet?', answer: 'yes', color: '#ec4899', emoji: '🍬' },
        { text: 'Do clean cars fly?', answer: 'no', color: '#2563eb', emoji: '🚗' },
        { text: 'Is rain dry?', answer: 'no', color: '#3b82f6', emoji: '🌧️' },
    ],
];

// Fisher-Yates Shuffle for unbiased randomization
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export default function YesNoGame() {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, speak, isBusy, lockInput } = useGame();
    const { t } = useTranslation();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const pan = useRef(new Animated.ValueXY()).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;

    // Use refs to avoid stale closure in panResponder
    const currentQuestionRef = useRef<Question | null>(null);
    const currentIndexRef = useRef(0);
    const questionsLengthRef = useRef(0);
    const isAnimatingRef = useRef(false);

    // Get questions for current level (SUBSET LOGIC)
    const getQuestionsForLevel = useCallback(() => {
        const levelIndex = Math.min(gameState.level - 1, QUESTIONS.length - 1);
        // Shuffle ALL available permutations, then pick 5
        const shuffledPool = shuffleArray(QUESTIONS[levelIndex]);
        return shuffledPool.slice(0, 5);
    }, [gameState.level]);

    // Initialize questions
    useEffect(() => {
        const newQuestions = getQuestionsForLevel();
        setQuestions(newQuestions);
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        questionsLengthRef.current = newQuestions.length;
        pan.setValue({ x: 0, y: 0 });
        cardOpacity.setValue(1);
    }, [gameState.level, getQuestionsForLevel, pan, cardOpacity]);

    // Speak question when it changes
    useEffect(() => {
        if (questions[currentIndex]) {
            // Slight delay to allow transition/animation
            const timer = setTimeout(() => {
                // Translation mapping not present in file, using question text directly
                // (Would normally translate `questions[currentIndex].text` based on ID/key)
                speak(questions[currentIndex].text);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [questions, currentIndex, speak]);

    // Update refs when state changes
    useEffect(() => {
        currentQuestionRef.current = questions[currentIndex] || null;
        currentIndexRef.current = currentIndex;
        questionsLengthRef.current = questions.length;
    }, [questions, currentIndex]);

    const currentQuestion = questions[currentIndex];

    // Handle answer with swipe
    const handleSwipeResult = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
        if (isBusy || isAnimatingRef.current || !currentQuestionRef.current) return;

        setIsAnimating(true);
        isAnimatingRef.current = true;

        const gesture = (direction === 'up' || direction === 'down') ? 'yes' : 'no';
        const isCorrect = gesture === currentQuestionRef.current.answer;

        if (isCorrect) {
            recordSuccess();
            playSuccess();

            // Randomize Feedback to reduce repetition
            // Note: Since questions come from an array, we could translate responses
            const yesFeedback = [t('yesNo.yesCorrect'), t('yesNo.greatJob')];
            const noFeedback = [t('yesNo.noCorrect'), t('yesNo.greatJob')];

            let phrase = '';
            if (gesture === 'yes') {
                phrase = yesFeedback[Math.floor(Math.random() * yesFeedback.length)];
            } else {
                phrase = noFeedback[Math.floor(Math.random() * noFeedback.length)];
            }

            lockInput(1100); // Lock for feedback duration
            speak(phrase);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            showFeedback({
                type: 'success',
                message: phrase,
                emoji: '✨',
            });

            setTimeout(() => {
                // Move to next question or next level
                const nextIdx = currentIndexRef.current + 1;
                if (nextIdx >= questionsLengthRef.current) {
                    // All questions answered, go to next level
                    nextLevel();
                } else {
                    setCurrentIndex(nextIdx);
                    pan.setValue({ x: 0, y: 0 });
                    cardOpacity.setValue(1);
                }

                setIsAnimating(false);
                isAnimatingRef.current = false;
            }, 1000);
        } else {
            recordError();
            playError();

            // Randomize Error Feedback
            const errorPhrases = [t('yesNo.oopsTryAgain'), t('yesNo.tryAgain')];
            const phrase = errorPhrases[Math.floor(Math.random() * errorPhrases.length)];

            lockInput(900); // Lock for error feedback
            speak(phrase);

            showFeedback({
                type: 'error',
                message: phrase,
                emoji: '🤔',
            }, 800);

            setTimeout(() => {
                // Reset card position
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                }).start();

                setIsAnimating(false);
                isAnimatingRef.current = false;
            }, 800);
        }
    }, [isBusy, lockInput, speak, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, pan, cardOpacity]);

    // Store handleSwipeResult in a ref for panResponder
    const handleSwipeResultRef = useRef(handleSwipeResult);
    useEffect(() => {
        handleSwipeResultRef.current = handleSwipeResult;
    }, [handleSwipeResult]);

    // Pan responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                if (isAnimatingRef.current) return;

                const { dx, dy } = gestureState;
                const swipeThreshold = 100;

                // Check horizontal vs vertical swipe
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe - NO
                    if (Math.abs(dx) > swipeThreshold) {
                        Animated.timing(pan, {
                            toValue: { x: dx > 0 ? width : -width, y: 0 },
                            duration: 200,
                            useNativeDriver: true,
                        }).start(() => {
                            handleSwipeResultRef.current(dx > 0 ? 'right' : 'left');
                        });
                        return;
                    }
                } else {
                    // Vertical swipe - YES
                    if (Math.abs(dy) > swipeThreshold) {
                        Animated.timing(pan, {
                            toValue: { x: 0, y: dy > 0 ? height : -height },
                            duration: 200,
                            useNativeDriver: true,
                        }).start(() => {
                            handleSwipeResultRef.current(dy > 0 ? 'down' : 'up');
                        });
                        return;
                    }
                }

                // Not a valid swipe, reset position
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    // Card rotation based on swipe
    const rotate = pan.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: ['-15deg', '0deg', '15deg'],
        extrapolate: 'clamp',
    });

    // Hint indicators
    const yesOpacity = pan.y.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0.3],
        extrapolate: 'clamp',
    });

    const noOpacity = pan.x.interpolate({
        inputRange: [-100, 0, 100],
        outputRange: [1, 0.3, 1],
        extrapolate: 'clamp',
    });

    if (!currentQuestion) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{t('yesNo.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameHeader title={t('yesNo.title')} />

            <View style={styles.gameArea}>
                {/* Level indicator */}
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{t('yesNo.level')} {gameState.level}</Text>
                </View>

                {/* Swipe Hints */}
                <Animated.View style={[styles.hintTop, { opacity: yesOpacity }]}>
                    <Text style={styles.hintText}>⬆ {t('yesNo.yes')} ⬇</Text>
                </Animated.View>

                <Animated.View style={[styles.hintSides, { opacity: noOpacity }]}>
                    <Text style={[styles.hintText, styles.hintLeft]}>⬅ {t('yesNo.no')}</Text>
                    <Text style={[styles.hintText, styles.hintRight]}>{t('yesNo.no')} ➡</Text>
                </Animated.View>

                {/* Question Card */}
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [
                                { translateX: pan.x },
                                { translateY: pan.y },
                                { rotate },
                            ],
                            opacity: cardOpacity,
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Text style={styles.emoji}>{currentQuestion.emoji}</Text>
                    <Text style={styles.questionText}>{currentQuestion.text}</Text>
                    <View style={[styles.colorIndicator, { backgroundColor: currentQuestion.color }]} />
                </Animated.View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        {t('yesNo.question')} {currentIndex + 1} {t('yesNo.of')} {questions.length}
                    </Text>
                    <View style={styles.progressBar}>
                        {questions.map((_, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.progressDot,
                                    idx < currentIndex && styles.progressDotComplete,
                                    idx === currentIndex && styles.progressDotCurrent,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <Text style={styles.instructionText}>
                    {t('yesNo.swipeInstruction')}
                </Text>
            </View>

            {/* Back Button */}
            <View style={styles.footer}>
                <GameButton
                    title={t('common.exitGame')}
                    variant="secondary"
                    onPress={() => navigation.goBack()}
                />
            </View>

            {/* Feedback Overlay */}
            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 18,
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    levelBadge: {
        position: 'absolute',
        top: 10,
        backgroundColor: colors.accentPrimary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
    },
    levelText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    hintTop: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
    },
    hintSides: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    hintText: {
        fontSize: 18,
        color: colors.accentPrimary,
        fontWeight: '600',
    },
    hintLeft: {
        textAlign: 'left',
    },
    hintRight: {
        textAlign: 'right',
    },
    card: {
        width: width * 0.8,
        backgroundColor: colors.cardBg,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    emoji: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    questionText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    colorIndicator: {
        width: 40,
        height: 8,
        borderRadius: 4,
        marginTop: spacing.sm,
    },
    progressContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    progressText: {
        color: colors.textSecondary,
        fontSize: 14,
        marginBottom: spacing.sm,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 6,
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.bgTertiary,
    },
    progressDotComplete: {
        backgroundColor: colors.success,
    },
    progressDotCurrent: {
        backgroundColor: colors.accentPrimary,
    },
    instructionText: {
        position: 'absolute',
        bottom: 40,
        color: colors.textMuted,
        fontSize: 13,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
