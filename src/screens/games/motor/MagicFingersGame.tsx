import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { FloatingFeedback } from '../../../components/FloatingFeedback';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface FingerPosition {
    id: number;
    name: string;
    emoji: string;
    x: number; // percentage
    y: number; // percentage
}

// Hand fingers layout (palm facing viewer, right hand)
const FINGERS: FingerPosition[] = [
    { id: 1, name: 'thumb', emoji: '👍', x: 20, y: 60 },   // Lower & Tucked
    { id: 2, name: 'index', emoji: '☝️', x: 35, y: 30 },   // Arch starts
    { id: 3, name: 'middle', emoji: '🖕', x: 50, y: 20 },  // Peak
    { id: 4, name: 'ring', emoji: '💍', x: 65, y: 30 },    // Arch down
    { id: 5, name: 'pinky', emoji: '🤙', x: 80, y: 45 },   // Lower
];

interface LevelConfig {
    sequence: number[];
    description: string;
}

// Static LEVELS array removed in favor of procedural generation

export default function MagicFingersGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'magic-fingers') {
                startGame('magic-fingers');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `magic-fingers-${level}-${restartKey}`;

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
        setRestartKey(k => k + 1);
    }, [resetCurrentGameProgress]);

    const handleResetLevel = useCallback(() => {
        setRestartKey(k => k + 1);
    }, []);

    return <MagicFingersGameInner
        key={gameKey}
        onRestartGame={handleRestartGame}
        onResetLevel={handleResetLevel}
    />;
}

interface InnerProps {
    onRestartGame: () => void;
    onResetLevel: () => void;
}

function MagicFingersGameInner({ onRestartGame, onResetLevel }: InnerProps) {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, settings } = useGame();
    const { t } = useTranslation();

    const [levelConfig, setLevelConfig] = useState<LevelConfig>({ sequence: [1], description: t('magicFingers.descThumb') });
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightedFinger, setHighlightedFinger] = useState<number | null>(null);
    const [showingFeedback, setShowingFeedback] = useState(false);
    const [errors, setErrors] = useState(0);
    const [floatingLabels, setFloatingLabels] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

    const fingerScales = useRef(FINGERS.map(() => new Animated.Value(1))).current;

    /**
     * Procedural Level Generator
     * Creates infinite variations based on age and difficulty level
     */
    const generateLevel = useCallback(() => {
        const ageMonths = settings?.childAgeMonths ?? 48;
        const rawLevel = gameState.level;

        // 1. Determine Difficulty Parameters based on Age
        let maxSequenceLength = 5;
        if (ageMonths < 36) maxSequenceLength = 2;      // Toddler: Max 2 items
        else if (ageMonths < 60) maxSequenceLength = 4; // Preschool: Max 4 items

        // 2. Determine target length for this level
        // Level 1 = 1 item
        // Level 2 = 2 items
        // Level 3+ = Random length up to max
        let targetLength = 1;
        if (rawLevel === 1) targetLength = 1;
        else if (rawLevel === 2) targetLength = 2;
        else {
            targetLength = Math.min(rawLevel, maxSequenceLength);
        }

        // 3. Generate Sequence
        const newSequence: number[] = [];

        // Static Intro Levels (always same for learning)
        if (rawLevel === 1) {
            newSequence.push(1); // Thumb
        } else if (rawLevel === 2) {
            newSequence.push(1, 2); // Thumb, Index
        } else {
            // Dynamic Levels
            let lastFinger = -1;
            for (let i = 0; i < targetLength; i++) {
                let fingerId;
                do {
                    fingerId = Math.floor(Math.random() * 5) + 1;
                } while (fingerId === lastFinger && targetLength > 1); // Simple retry to avoid double taps

                newSequence.push(fingerId);
                lastFinger = fingerId;
            }
        }

        // 4. Create Description
        const desc = rawLevel <= 2 ? (rawLevel === 1 ? t('magicFingers.descThumb') : t('magicFingers.descFingers')) : t('magicFingers.descPattern');

        return {
            sequence: newSequence,
            description: desc
        };

    }, [gameState.level, settings?.childAgeMonths]);

    // Initialize level
    useEffect(() => {
        const config = generateLevel();
        setLevelConfig(config);
        setCurrentStep(0);
        setErrors(0);

        // Reset all finger scales
        fingerScales.forEach(scale => scale.setValue(1));

        // Highlight first finger after short delay
        setTimeout(() => {
            setHighlightedFinger(config.sequence[0]);
        }, 500);
    }, [generateLevel, fingerScales]);

    // Handle finger tap
    const handleFingerTap = useCallback((fingerId: number, event: GestureResponderEvent) => {
        const expectedFinger = levelConfig.sequence[currentStep];
        const fingerIndex = FINGERS.findIndex(f => f.id === fingerId);

        // Get touch coordinates for floating label
        const { pageX, pageY } = event.nativeEvent;

        // Animate the tapped finger
        Animated.sequence([
            Animated.timing(fingerScales[fingerIndex], {
                toValue: 1.3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(fingerScales[fingerIndex], {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        if (fingerId === expectedFinger) {
            // Correct tap!
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Add floating label
            setFloatingLabels(prev => [
                ...prev,
                { id: Date.now(), text: fingerId.toString(), x: pageX - 20, y: pageY - 40 }
            ]);

            const newStep = currentStep + 1;

            if (newStep >= levelConfig.sequence.length) {
                // Level complete!
                // Defer updates to next frame to prevent touch event conflicts/crashes
                requestAnimationFrame(() => {
                    recordSuccess();
                    playSuccess();
                    setHighlightedFinger(null);

                    showFeedback({
                        type: 'success',
                        message: t('magicFingers.greatJob'),
                        emoji: '🖐️',
                    });
                    setShowingFeedback(true);

                    setTimeout(() => {
                        setShowingFeedback(false);
                        nextLevel();
                    }, 1200);
                });
            } else {
                // Move to next finger
                setCurrentStep(newStep);
                setHighlightedFinger(levelConfig.sequence[newStep]);
            }
        } else {
            // Wrong finger
            recordError();
            playError();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            setErrors(prev => prev + 1);

            // Show hint more prominently after errors
            if (errors >= 1) {
                showFeedback({
                    type: 'hint',
                    message: t('magicFingers.tapFinger', { finger: expectedFinger }),
                    emoji: '👆',
                }, 1000);
                setShowingFeedback(true);
                setTimeout(() => setShowingFeedback(false), 1000);
            }
        }
    }, [levelConfig, currentStep, errors, fingerScales, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
            />

            <GameHeader title={t('magicFingers.title')} />

            <GameInstruction
                text={levelConfig.description}
                subtext={`${t('magicFingers.step')} ${currentStep + 1}/${levelConfig.sequence.length} • ${t('magicFingers.level')} ${gameState.level}`}
            />

            {/* Hand Display */}
            <View style={styles.handContainer}>
                <View style={styles.palm}>
                    {/* Palm background */}
                    <View style={styles.palmInner} />

                    {/* Finger touch zones */}
                    {FINGERS.map((finger, index) => {
                        const isHighlighted = highlightedFinger === finger.id;
                        const isCompleted = levelConfig.sequence.indexOf(finger.id) < currentStep;

                        return (
                            <Pressable
                                key={finger.id}
                                onPress={(e) => handleFingerTap(finger.id, e)}
                                style={[
                                    styles.fingerZone,
                                    {
                                        left: `${finger.x}%`,
                                        top: `${finger.y}%`,
                                    },
                                ]}
                            >
                                <Animated.View
                                    style={[
                                        styles.fingerCircle,
                                        isHighlighted && styles.fingerHighlighted,
                                        isCompleted && styles.fingerCompleted,
                                        { transform: [{ scale: fingerScales[index] }] },
                                    ]}
                                >
                                    <Text style={styles.fingerNumber}>{finger.id}</Text>
                                    {isHighlighted && (
                                        <View style={styles.pulseRing} />
                                    )}
                                </Animated.View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Sequence indicator */}
            <View style={styles.sequenceContainer}>
                <Text style={styles.sequenceLabel}>{t('magicFingers.sequence')}:</Text>
                <View style={styles.sequenceNumbers}>
                    {levelConfig.sequence.map((num, index) => (
                        <View
                            key={index}
                            style={[
                                styles.sequenceNumber,
                                index < currentStep && styles.sequenceNumberDone,
                                index === currentStep && styles.sequenceNumberCurrent,
                            ]}
                        >
                            <Text style={styles.sequenceNumberText}>{num}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Feedback Overlay */}
            {feedback && (
                <FeedbackOverlay
                    visible={showingFeedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                />
            )}

            {/* Floating Labels */}
            {floatingLabels.map(label => (
                <FloatingFeedback
                    key={label.id}
                    text={label.text}
                    x={label.x}
                    y={label.y}
                    onComplete={() => {
                        setFloatingLabels(prev => prev.filter(l => l.id !== label.id));
                    }}
                />
            ))}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    handContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    palm: {
        width: width * 0.8,
        aspectRatio: 1,
        position: 'relative',
    },
    palmInner: {
        position: 'absolute',
        left: '20%',
        top: '40%',
        width: '60%',
        height: '50%',
        backgroundColor: 'rgba(255,200,150,0.2)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    // palmEmoji removed to reduce visual clutter/misalignment
    fingerZone: {
        position: 'absolute',
        transform: [{ translateX: -30 }, { translateY: -30 }],
    },
    fingerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fingerHighlighted: {
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 3,
    },
    fingerCompleted: {
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: '#22c55e',
    },
    fingerNumber: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    pulseRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#3b82f6',
        opacity: 0.5,
    },
    sequenceContainer: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    sequenceLabel: {
        color: colors.textSecondary,
        fontSize: 14,
        marginBottom: spacing.xs,
    },
    sequenceNumbers: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    sequenceNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sequenceNumberDone: {
        backgroundColor: '#22c55e',
    },
    sequenceNumberCurrent: {
        backgroundColor: '#3b82f6',
        transform: [{ scale: 1.1 }],
    },
    sequenceNumberText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
