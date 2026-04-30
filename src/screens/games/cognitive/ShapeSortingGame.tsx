import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    PanResponder,
    Alert,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameInstruction, FeedbackOverlay, GameButton, GameControlHeader } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { FloatingFeedback } from '../../../components/FloatingFeedback';
import { GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'pentagon' | 'hexagon' | 'diamond';

interface ShapeConfig {
    type: ShapeType;
    color: string;
    emoji: string;
}

const SHAPES: ShapeConfig[] = [
    { type: 'circle', color: '#ef4444', emoji: '🔴' },
    { type: 'square', color: '#3b82f6', emoji: '🟦' },
    { type: 'triangle', color: '#22c55e', emoji: '🔺' },
    { type: 'star', color: '#eab308', emoji: '⭐' },
    { type: 'heart', color: '#ec4899', emoji: '💜' },
    { type: 'pentagon', color: '#a855f7', emoji: '⬟' },
    { type: 'hexagon', color: '#f97316', emoji: '⬢' },
    { type: 'diamond', color: '#06b6d4', emoji: '🔷' },
];

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

interface LevelConfig {
    draggable: ShapeConfig;
    targets: ShapeConfig[];
}

export default function ShapeSortingGame() {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, resetCurrentGameProgress, settings, speak, startGame, currentGameId, isBusy, lockInput } = useGame();
    const { t } = useTranslation();

    const [levelConfig, setLevelConfig] = useState<LevelConfig | null>(null);
    const [isDropped, setIsDropped] = useState(false);
    const [floatingLabels, setFloatingLabels] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

    // Scale tracking
    const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const pan = useRef(new Animated.ValueXY()).current;
    const shapeScale = useRef(new Animated.Value(1)).current;

    // Use STATE for target positions so React guarantees they're available
    const [targetPositions, setTargetPositions] = useState<{ [key: string]: { x: number, y: number, w: number, h: number } }>({});
    const targetsContainerRef = useRef<View | null>(null);
    const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

    // Track draggable shape position - captured via onLayout (synchronous)
    const shapeRef = useRef<View | null>(null);
    const shapeLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Bag randomization to prevent shapes from repeating
    const availableShapesBag = useRef<typeof SHAPES>([]);

    // Replenish the bag with shuffled shapes
    const replenishBag = useCallback(() => {
        availableShapesBag.current = shuffleArray([...SHAPES]);
    }, []);

    // Generate level config
    const generateLevel = useCallback(() => {
        // Age-Based Difficulty Limits
        const ageMonths = settings?.childAgeMonths ?? 48;
        let maxTargets = 4;

        if (ageMonths < 36) {
            maxTargets = 2; // Toddlers get max 2 choices
        } else if (ageMonths < 60) {
            maxTargets = 3; // Preschool max 3
        }

        // Ensure maxTargets doesn't exceed 4 for screen space
        maxTargets = Math.min(maxTargets, 4);

        const numTargets = Math.min(2 + Math.floor(gameState.level / 2), maxTargets);

        // Replenish bag if empty or on level 1
        if (gameState.level === 1 || availableShapesBag.current.length < numTargets) {
            replenishBag();
        }

        // Pick unique draggable shape from bag (no repeats until bag is exhausted)
        const draggable = availableShapesBag.current.pop() || SHAPES[0];

        // Build targets: always include the draggable shape + random distractors
        const potentialDistractors = SHAPES.filter(s => s.type !== draggable.type);
        const shuffledDistractors = shuffleArray(potentialDistractors);
        const distractors = shuffledDistractors.slice(0, numTargets - 1);
        const targets = shuffleArray([draggable, ...distractors]);

        setLevelConfig({ draggable, targets });
        setIsDropped(false);
        setTargetPositions({}); // Reset target positions on new level
        pan.setValue({ x: 0, y: 0 });
        shapeScale.setValue(1);

        // Speak the shape to drag after a delay (ensures correct shape is spoken)
        setTimeout(() => {
            speak(t('shapeSorting.instruction', { shape: t(`shapes.${draggable.type}`) }));
        }, 300);
    }, [gameState.level, pan, shapeScale, settings?.childAgeMonths, speak, replenishBag, t]);

    // Capture refs to views for measurement
    const targetViewRefs = useRef<{ [key: string]: View | null }>({});

    // Measure targets container's absolute position on screen
    const measureContainer = useCallback(() => {
        if (targetsContainerRef.current) {
            targetsContainerRef.current.measureInWindow((x, y, w, h) => {
                console.log('Container offset:', { x, y });
                setContainerOffset({ x, y });
            });
        }
    }, []);

    // Handle individual target layout - store relative position immediately
    const handleTargetLayout = useCallback((type: string, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        console.log(`Target ${type} layout:`, { x, y, width, height });
        setTargetPositions(prev => ({
            ...prev,
            [type]: { x, y, w: width, h: height }
        }));
    }, []);

    // Initialize game context on mount
    useEffect(() => {
        if (currentGameId !== 'shape-sorting') {
            startGame('shape-sorting');
        }
    }, [currentGameId, startGame]);

    // Initialize level
    useEffect(() => {
        console.log('Level useEffect triggered, gameState.level:', gameState.level);
        generateLevel();
        // Measure container after a brief delay to ensure layout is complete
        setTimeout(measureContainer, 300);
    }, [gameState.level, generateLevel, measureContainer]);

    // Reset handlers for GameControlHeader
    const handleResetLevel = useCallback(() => {
        generateLevel();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [generateLevel]);

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
    }, [resetCurrentGameProgress]);

    // Distance Check function
    const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    // Check if drop is on correct target
    const checkDrop = useCallback((dropX: number, dropY: number) => {
        if (!levelConfig) return;

        const correctType = levelConfig.draggable.type;
        let bestHit: string | null = null;
        let minDistance = 10000;

        const HIT_THRESHOLD = 150;

        // Calculate absolute positions from relative + container offset
        for (const [type, relBounds] of Object.entries(targetPositions)) {
            const targetCenterX = containerOffset.x + relBounds.x + relBounds.w / 2;
            const targetCenterY = containerOffset.y + relBounds.y + relBounds.h / 2;

            const dist = getDistance(dropX, dropY, targetCenterX, targetCenterY);

            if (dist < HIT_THRESHOLD && dist < minDistance) {
                minDistance = dist;
                bestHit = type;
            }
        }

        if (bestHit) {
            if (bestHit === correctType) {
                // Correct drop!
                lockInput(1100); // Lock for success feedback
                setIsDropped(true);
                recordSuccess();
                playSuccess();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Add floating label using targetPositions
                const targetBounds = targetPositions[correctType];
                if (targetBounds) {
                    setFloatingLabels(prev => [
                        ...prev,
                        {
                            id: Date.now(),
                            text: '🎯',
                            x: containerOffset.x + targetBounds.x + targetBounds.w / 2 - 20,
                            y: containerOffset.y + targetBounds.y + targetBounds.h / 2 - 40
                        }
                    ]);
                }

                showFeedback({
                    type: 'success',
                    message: t('shapeSorting.perfect'),
                    emoji: '🎯',
                });

                // Voice feedback
                speak(t('shapeSorting.perfect'));

                Animated.timing(shapeScale, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }).start();

                setTimeout(() => {
                    nextLevel();
                }, 1000);
                return;
            } else {
                // Wrong target hit
                lockInput(700); // Lock for error feedback
                recordError();
                playError();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showFeedback({ type: 'error', message: t('shapeSorting.tryAgain'), emoji: '🤔' }, 600);
                speak(t('shapeSorting.tryAgain').replace('!', ''));
            }
        } else {
            // Missed everything
            recordError();
        }

        // Always spring back if not success

        Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            tension: 60,
            useNativeDriver: false,
        }).start();

    }, [levelConfig, containerOffset, targetPositions, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, pan, shapeScale]);

    // Store checkDrop in a ref to avoid stale closure in PanResponder
    const checkDropRef = useRef(checkDrop);
    checkDropRef.current = checkDrop;

    // Pan responder for dragging
    const customPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Re-measure container on touch start in case layout changed
                measureContainer();
                pan.setValue({ x: 0, y: 0 });

                Animated.spring(shapeScale, {
                    toValue: 1.1,
                    friction: 5,
                    useNativeDriver: false,
                }).start();
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (evt, gestureState) => {
                const dropX = evt.nativeEvent.pageX;
                const dropY = evt.nativeEvent.pageY;
                console.log(`DROP RELEASE at: ${dropX}, ${dropY}`);

                pan.flattenOffset();
                // Use ref to get latest checkDrop function
                checkDropRef.current(dropX, dropY);
            },
        })
    ).current;

    // Render shape - Clean solid fill, no borders
    const renderShape = (type: ShapeType, size: number, color: string) => {
        switch (type) {
            case 'circle':
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        borderRadius: size / 2,
                    }} />
                );
            case 'square':
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        borderRadius: 16,
                    }} />
                );
            case 'triangle':
                return (
                    <View style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: size / 2,
                        borderRightWidth: size / 2,
                        borderBottomWidth: size,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderBottomColor: color,
                    }} />
                );
            case 'diamond':
                return (
                    <View style={{
                        width: size * 0.7,
                        height: size * 0.7,
                        backgroundColor: color,
                        borderRadius: 8,
                        transform: [{ rotate: '45deg' }],
                    }} />
                );
            case 'star':
                return <Text style={{ fontSize: size * 0.95 }}>⭐</Text>;
            case 'heart':
                return <Text style={{ fontSize: size * 0.95 }}>❤️</Text>;
            case 'pentagon':
                return <Text style={{ fontSize: size * 0.95 }}>⬟</Text>;
            case 'hexagon':
                return <Text style={{ fontSize: size * 0.95 }}>⬢</Text>;
            default:
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        borderRadius: 16,
                    }} />
                );
        }
    };

    // Render hole - Same shape, semi-transparent (no borders)
    const renderHole = (type: ShapeType, size: number) => {
        const holeColor = 'rgba(255,255,255,0.15)';

        switch (type) {
            case 'circle':
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: holeColor,
                        borderRadius: size / 2,
                    }} />
                );
            case 'square':
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: holeColor,
                        borderRadius: 16,
                    }} />
                );
            case 'triangle':
                return (
                    <View style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: size / 2,
                        borderRightWidth: size / 2,
                        borderBottomWidth: size,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderBottomColor: holeColor,
                    }} />
                );
            case 'diamond':
                return (
                    <View style={{
                        width: size * 0.7,
                        height: size * 0.7,
                        backgroundColor: holeColor,
                        borderRadius: 8,
                        transform: [{ rotate: '45deg' }],
                    }} />
                );
            case 'star':
                return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⭐</Text>;
            case 'heart':
                return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>❤️</Text>;
            case 'pentagon':
                return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⬟</Text>;
            case 'hexagon':
                return <Text style={{ fontSize: size * 0.9, opacity: 0.3 }}>⬢</Text>;
            default:
                return (
                    <View style={{
                        width: size,
                        height: size,
                        backgroundColor: holeColor,
                        borderRadius: 16,
                    }} />
                );
        }
    };

    if (!levelConfig) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{t('shapeSorting.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // EQUAL SIZES as requested (User wanted them "equal")
    const TARGET_SIZE = 145;
    const DRAGGABLE_SIZE = 145;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLevel}
                onRestartGame={handleRestartGame}
            />


            <GameInstruction
                text={t('shapeSorting.instruction', { shape: t(`shapes.${levelConfig.draggable.type}`) })}
                subtext={`${t('shapeSorting.level')} ${gameState.level}`}
            />

            <View style={styles.gameArea} onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}>
                {/* Target Holes */}
                <View
                    style={styles.targetsContainer}
                    ref={ref => { targetsContainerRef.current = ref; }}
                    collapsable={false}
                >
                    {levelConfig.targets.map((target, index) => (
                        <View
                            key={`${target.type}-${index}`}
                            style={styles.targetWrapper}
                            collapsable={false}
                            onLayout={(e) => handleTargetLayout(target.type, e)}
                        >
                            {renderHole(target.type, TARGET_SIZE)}
                            <Text style={styles.targetLabel}>{t(`shapes.${target.type}`)}</Text>
                        </View>
                    ))}
                </View>

                {/* Draggable Shape */}
                {!isDropped && (
                    <Animated.View
                        style={[
                            styles.draggableContainer,
                            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: shapeScale }] }
                        ]}
                        {...customPanResponder.panHandlers}
                    >
                        <View
                            ref={(ref) => { shapeRef.current = ref; }}
                            collapsable={false}
                            style={styles.shapeWrapper}
                        >
                            {renderShape(levelConfig.draggable.type, DRAGGABLE_SIZE, levelConfig.draggable.color)}
                        </View>
                        <Text style={styles.dragHint}>{t('shapeSorting.dragHint')}</Text>
                    </Animated.View>
                )}
            </View>

            {/* Feedback Overlay */}
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
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
    },
    targetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: spacing.lg,
        minHeight: 140,
        flexWrap: 'wrap',
        gap: 10,
    },
    targetWrapper: {
        alignItems: 'center',
        padding: 5,
    },
    targetLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
        textTransform: 'capitalize',
    },
    draggableContainer: {
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: spacing.xl,
        zIndex: 100,
    },
    shapeWrapper: {
        // No background, clean shape
        padding: spacing.lg,
    },
    dragHint: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: spacing.sm,
        opacity: 0.7,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
