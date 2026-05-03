import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    LayoutChangeEvent,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    runOnJS
} from 'react-native-reanimated';
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

    const [bubbleData, setBubbleData] = useState<any[]>([]);
    const [poppedCount, setPoppedCount] = useState(0);
    const [showingFeedback, setShowingFeedback] = useState(false);
    const [gameLayout, setGameLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 });

    const mountedRef = useRef(true);
    const levelCompleteHandledRef = useRef(false);
    const poppedBubbleIdsRef = useRef<Set<number>>(new Set());
    const layoutReadyRef = useRef(false);
    const hasSpokenIntroRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!hasSpokenIntroRef.current) {
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
            conf.maxBubbles = 8;
            conf.moveStartLevel = 1;
            conf.minSize = 120;
            conf.maxSize = 170;
            conf.speedMultiplier = 0.7;
            conf.minDuration = 3000;
        } else if (ageMonths < 60) {
            conf.maxBubbles = 15;
            conf.moveStartLevel = 1;
            conf.minSize = 80;
            conf.maxSize = 130;
            conf.speedMultiplier = 0.8;
            conf.minDuration = 2000;
        } else {
            conf.maxBubbles = 20;
            conf.moveStartLevel = 1;
            conf.minSize = 70;
            conf.maxSize = 120;
            conf.speedMultiplier = 1.0;
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
        if (!layoutReadyRef.current) return;

        const level = gameState.level;
        let baseCount = 4 + (level - 1);
        let randomAdd = level >= 5 ? Math.floor(Math.random() * 4) + 1 : 0;
        const bubbleCount = Math.min(baseCount + randomAdd, config.maxBubbles);

        poppedBubbleIdsRef.current.clear();
        levelCompleteHandledRef.current = false;

        const newBubbles = [];
        for (let i = 0; i < bubbleCount; i++) {
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const startX = Math.random() * (gameLayout.width - size);
            const startY = Math.random() * (gameLayout.height - size);

            newBubbles.push({
                id: i,
                startX,
                startY,
                size,
                color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
                floatSpeed: 1000 + Math.random() * 1500,
            });
        }

        setBubbleData(newBubbles);
        setPoppedCount(0);
    }, [gameState.level, config, gameLayout]);

    const handlePopComplete = (id: number) => {
        if (poppedBubbleIdsRef.current.has(id)) return;
        poppedBubbleIdsRef.current.add(id);
        setPoppedCount(poppedBubbleIdsRef.current.size);
        
        playPop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        recordSuccess();
    };

    useEffect(() => {
        if (bubbleData.length > 0 && poppedCount >= bubbleData.length && !levelCompleteHandledRef.current) {
            levelCompleteHandledRef.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    }, [poppedCount, bubbleData.length]);

    const remaining = Math.max(0, bubbleData.length - poppedCount);

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
                {bubbleData.map((data) => (
                    <BubbleComponent
                        key={data.id}
                        data={data}
                        gameLayout={gameLayout}
                        config={config}
                        level={gameState.level}
                        onPop={() => handlePopComplete(data.id)}
                    />
                ))}
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={showingFeedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    position={feedback.position || 'center'}
                    confetti={feedback.confetti}
                    transparent={feedback.transparent}
                />
            )}
        </SafeAreaView>
    );
}

function BubbleComponent({ data, gameLayout, config, level, onPop }: any) {
    const x = useSharedValue(data.startX);
    const y = useSharedValue(data.startY);
    const floatOffset = useSharedValue(0);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(1);
    const isPopped = useSharedValue(false);

    useEffect(() => {
        scale.value = withSpring(1);
        
        floatOffset.value = withRepeat(
            withSequence(
                withTiming(1, { duration: data.floatSpeed, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: data.floatSpeed, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        );

        const move = () => {
            if (isPopped.value) return;
            const ageFactor = config.speedMultiplier;
            const levelPenalty = (level - 1) * 120 * ageFactor;
            const duration = Math.max(5500 / ageFactor - levelPenalty, config.minDuration);
            
            x.value = withTiming(Math.random() * (gameLayout.width - data.size), { duration, easing: Easing.inOut(Easing.quad) });
            y.value = withTiming(Math.random() * (gameLayout.height - data.size), { duration, easing: Easing.inOut(Easing.quad) }, (finished) => {
                if (finished) runOnJS(move)();
            });
        };
        
        setTimeout(move, 600 + data.id * 120);
    }, []);

    const handlePress = () => {
        if (isPopped.value) return;
        isPopped.value = true;
        runOnJS(onPop)();
        
        scale.value = withTiming(2.5, { duration: 120 });
        opacity.value = withTiming(0, { duration: 250 });
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            left: x.value,
            top: y.value,
            opacity: opacity.value,
            transform: [
                { translateY: floatOffset.value * -18 },
                { scale: scale.value }
            ],
        };
    });

    return (
        <Animated.View
            style={[
                styles.bubbleWrapper,
                { width: data.size, height: data.size },
                animatedStyle
            ]}
        >
            <Pressable
                onPress={handlePress}
                style={[styles.bubble, { backgroundColor: data.color, borderRadius: data.size / 2 }]}
            >
                <View style={styles.shine} />
                <View style={styles.innerGlow} />
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    gameContainer: { flex: 1, margin: spacing.md, backgroundColor: '#fdfcfe', borderRadius: 40, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
    bubbleWrapper: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
    bubble: { width: '100%', height: '100%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 5 },
    shine: { position: 'absolute', top: '12%', left: '12%', width: '30%', height: '30%', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 25 },
    innerGlow: { position: 'absolute', bottom: '10%', right: '10%', width: '25%', height: '25%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
});
