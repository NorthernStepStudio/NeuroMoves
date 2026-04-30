import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    LayoutChangeEvent,
    Easing
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
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_COLORS = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#22c55e', // green
    '#eab308', // yellow
    '#a855f7', // purple
    '#f97316', // orange
    '#ec4899', // pink
    '#06b6d4', // cyan
];

interface Bubble {
    id: number;
    x: Animated.Value;
    y: Animated.Value;
    size: number;
    color: string;
    floatOffset: Animated.Value;
    floatSpeed: number; // For extra randomness
    scale: Animated.Value;
    opacity: Animated.Value;
    popped: boolean;
}

export default function PopBubblesGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'pop-bubbles') {
                startGame('pop-bubbles');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `pop-bubbles-${level}-${restartKey}`;

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
        setRestartKey(k => k + 1);
    }, [resetCurrentGameProgress]);

    const handleResetLevel = useCallback(() => {
        setRestartKey(k => k + 1);
    }, []);

    if (currentGameId !== 'pop-bubbles') {
        return <View style={styles.container} />;
    }

    return <PopBubblesGameInner
        key={gameKey}
        onRestartGame={handleRestartGame}
        onResetLevel={handleResetLevel}
    />;
}

interface InnerProps {
    onRestartGame: () => void;
    onResetLevel: () => void;
}

function PopBubblesGameInner({ onRestartGame, onResetLevel }: InnerProps) {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, showFeedback, feedback, playPop, settings, speak } = useGame();
    const { t } = useTranslation();

    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    const [poppedCount, setPoppedCount] = useState(0);
    const [showingFeedback, setShowingFeedback] = useState(false);
    const [gameLayout, setGameLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 });

    const bubbleIdRef = useRef(0);
    const mountedRef = useRef(true);
    const levelCompleteHandledRef = useRef(false);
    const poppedBubbleIdsRef = useRef<Set<number>>(new Set());
    const generationRef = useRef(0);
    const layoutReadyRef = useRef(false);
    const hasSpokenIntroRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!hasSpokenIntroRef.current) {
            // Speak instruction
            speak(t('popBubbles.instruction'));
            hasSpokenIntroRef.current = true;
        }
    }, [speak, t]);

    const ageMonths = settings?.childAgeMonths ?? 48;
    const config = React.useMemo(() => {
        let conf = {
            maxBubbles: 20,
            moveStartLevel: 1,
            minSize: 60,
            maxSize: 100,
            speedMultiplier: 1.0,
            minDuration: 1000,
        };

        if (ageMonths < 36) {
            // Baby/Toddler: Big & Chunky
            conf.maxBubbles = 8;
            conf.moveStartLevel = 1; // User request: move earlier (was 4)
            conf.minSize = 120;
            conf.maxSize = 170;
            conf.speedMultiplier = 0.7; // User request: 0.7
            conf.minDuration = 3000;
        } else if (ageMonths < 60) {
            // Preschool
            conf.maxBubbles = 15;
            conf.moveStartLevel = 1;
            conf.minSize = 80;
            conf.maxSize = 130;
            conf.speedMultiplier = 0.8; // Increased from 0.5
            conf.minDuration = 2000;
        } else {
            // School
            conf.maxBubbles = 20;
            conf.moveStartLevel = 1;
            conf.minSize = 70;
            conf.maxSize = 120;
            conf.speedMultiplier = 1.0; // Increased from 0.6
            conf.minDuration = 1500;
        }
        return conf;
    }, [ageMonths]);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setGameLayout({ width, height });
        layoutReadyRef.current = true;
    };

    useEffect(() => {
        if (!layoutReadyRef.current && bubbles.length === 0) return;

        const level = gameState.level;
        const hasMoving = level >= config.moveStartLevel;

        let baseCount = 4 + (level - 1);
        let randomAdd = level >= 5 ? Math.floor(Math.random() * 4) + 1 : 0;
        const bubbleCount = Math.min(baseCount + randomAdd, config.maxBubbles);

        generationRef.current++;
        poppedBubbleIdsRef.current.clear();
        levelCompleteHandledRef.current = false;

        const newBubbles: Bubble[] = [];
        const { width: areaW, height: areaH } = gameLayout;

        for (let i = 0; i < bubbleCount; i++) {
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const margin = size / 2;
            const startX = Math.random() * (areaW - size);
            const startY = Math.random() * (areaH - size);

            newBubbles.push({
                id: bubbleIdRef.current++,
                x: new Animated.Value(startX),
                y: new Animated.Value(startY),
                size,
                color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
                floatOffset: new Animated.Value(0),
                floatSpeed: 1000 + Math.random() * 1500, // Varied float speed
                scale: new Animated.Value(0),
                opacity: new Animated.Value(1),
                popped: false,
            });
        }

        setBubbles(newBubbles);
        setPoppedCount(0);

        newBubbles.forEach((bubble, index) => {
            Animated.spring(bubble.scale, {
                toValue: 1,
                delay: index * 50,
                friction: 5,
                useNativeDriver: false,
            }).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(bubble.floatOffset, {
                        toValue: 1,
                        duration: bubble.floatSpeed,
                        useNativeDriver: false,
                        easing: Easing.inOut(Easing.sin)
                    }),
                    Animated.timing(bubble.floatOffset, {
                        toValue: 0,
                        duration: bubble.floatSpeed,
                        useNativeDriver: false,
                        easing: Easing.inOut(Easing.sin)
                    }),
                ])
            ).start();

            if (hasMoving) {
                const currentGen = generationRef.current;
                const move = () => {
                    if (generationRef.current !== currentGen || !mountedRef.current || poppedBubbleIdsRef.current.has(bubble.id)) return;

                    const ageFactor = config.speedMultiplier;
                    const levelPenalty = (level - 1) * 120 * ageFactor;
                    const duration = Math.max(5500 / ageFactor - levelPenalty, config.minDuration);

                    // RANDOMNESS: Use a bit of easing and varied targets
                    const targetX = Math.random() * (gameLayout.width - bubble.size);
                    const targetY = Math.random() * (gameLayout.height - bubble.size);

                    Animated.parallel([
                        Animated.timing(bubble.x, {
                            toValue: targetX,
                            duration,
                            useNativeDriver: false,
                            easing: Easing.inOut(Easing.quad)
                        }),
                        Animated.timing(bubble.y, {
                            toValue: targetY,
                            duration,
                            useNativeDriver: false,
                            easing: Easing.inOut(Easing.quad)
                        }),
                    ]).start(({ finished }) => {
                        if (finished) move();
                    });
                };
                setTimeout(move, 600 + index * 120);
            }
        });
    }, [gameState.level, config, gameLayout]);

    useEffect(() => {
        if (bubbles.length > 0 && poppedCount >= bubbles.length && !levelCompleteHandledRef.current) {
            levelCompleteHandledRef.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // VOICE SUCCESS
            speak(t('popBubbles.allPoppedText'));

            showFeedback({
                type: 'success',
                message: t('popBubbles.allPopped'),
                position: 'center',
                confetti: true,
                transparent: true
            });
            setShowingFeedback(true);

            setTimeout(() => {
                if (mountedRef.current) {
                    setShowingFeedback(false);
                    nextLevel();
                }
            }, 2500);
        }
    }, [poppedCount, bubbles.length]);

    const handlePop = useCallback((bubble: Bubble) => {
        if (bubble.popped) return;
        poppedBubbleIdsRef.current.add(bubble.id);
        setPoppedCount(poppedBubbleIdsRef.current.size);

        setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, popped: true } : b));

        playPop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Heavier impact for bigger bubbles
        recordSuccess();

        Animated.parallel([
            Animated.timing(bubble.scale, { toValue: 2.5, duration: 120, useNativeDriver: false }),
            Animated.timing(bubble.opacity, { toValue: 0, duration: 250, useNativeDriver: false }),
        ]).start();
    }, [playPop, recordSuccess]);

    const remaining = Math.max(0, bubbles.length - poppedCount);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
            />

            <GameHeader title={t('popBubbles.title')} />
            <GameInstruction text={`${t('popBubbles.instruction')} (${remaining} ${t('popBubbles.left')})`} />

            <View style={styles.gameContainer} onLayout={onLayout}>
                {bubbles.map((bubble) => {
                    const translateY = bubble.floatOffset.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -18], // More floaty vertical move
                    });

                    return (
                        <Animated.View
                            key={bubble.id}
                            style={[
                                styles.bubbleWrapper,
                                {
                                    left: bubble.x,
                                    top: bubble.y,
                                    transform: [{ translateY }, { scale: bubble.scale }],
                                    opacity: bubble.opacity,
                                    width: bubble.size,
                                    height: bubble.size,
                                },
                            ]}
                            pointerEvents={bubble.popped ? 'none' : 'auto'}
                        >
                            <Pressable
                                onPress={() => handlePop(bubble)}
                                style={[styles.bubble, { backgroundColor: bubble.color, borderRadius: bubble.size / 2 }]}
                            >
                                <View style={styles.shine} />
                                <View style={styles.innerGlow} />
                            </Pressable>
                        </Animated.View>
                    );
                })}
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={showingFeedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    position={feedback.position || 'center'}
                    verticalPos={feedback.verticalPos}
                    confetti={feedback.confetti}
                    transparent={feedback.transparent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    gameContainer: { flex: 1, margin: spacing.md, backgroundColor: '#fdfcfe', borderRadius: 40, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
    bubbleWrapper: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
    bubble: { width: '100%', height: '100%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 5 },
    shine: { position: 'absolute', top: '12%', left: '12%', width: '30%', height: '30%', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 25 },
    innerGlow: { position: 'absolute', bottom: '10%', right: '10%', width: '25%', height: '25%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    // Footer removed
});
