import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    PanResponder,
    GestureResponderEvent,
    PanResponderGestureState,
    Pressable,
    Alert,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameHeader, GameInstruction, FeedbackOverlay, GameButton, GameControlHeader } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { FloatingFeedback } from '../../../components/FloatingFeedback';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

// STABLE BOTTOM-ANCHORED COORDINATES
const GROUND_LEVEL = 0;
const PLATFORM_BOTTOM = 120;
const SPAWN_BOTTOM = height - 350;
const PLATFORM_WIDTH = 240;

const DIFFICULTY_CONFIG = {
    1: { blockSize: 100, tolerance: 40 },
    2: { blockSize: 95, tolerance: 38 },
    3: { blockSize: 90, tolerance: 35 },
    4: { blockSize: 85, tolerance: 32 },
    5: { blockSize: 80, tolerance: 30 },
    6: { blockSize: 75, tolerance: 28 },
    7: { blockSize: 70, tolerance: 25 },
    8: { blockSize: 65, tolerance: 22 },
    9: { blockSize: 60, tolerance: 20 },
    10: { blockSize: 55, tolerance: 18 },
};

const BLOCK_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#22c55e',
    '#eab308',
    '#a855f7',
];

interface Block {
    id: number;
    color: string;
    x: Animated.Value; // Absolute when unplaced, Relative when placed
    y: Animated.Value;
    rotation: Animated.Value;
    isPlaced: boolean;
}

export default function StackingGame() {
    const [restartKey, setRestartKey] = useState(0);
    const { gameState, resetCurrentGameProgress, startGame, currentGameId } = useGame();

    useEffect(() => {
        if (currentGameId !== 'stacking') {
            startGame('stacking');
        }
    }, [currentGameId]);

    const handleResetLevel = useCallback(() => {
        // RESET LEVEL: Just clear current blocks, stay on level
        setRestartKey(k => k + 1);
    }, []);

    const handleRestartGame = useCallback(async () => {
        // RESTART GAME: Go back to Level 1
        await resetCurrentGameProgress();
        setRestartKey(k => k + 1);
    }, [resetCurrentGameProgress]);

    const gameKey = `${restartKey}-${gameState.level}`;

    return (
        <StackingGameInner
            key={gameKey}
            onResetLevel={handleResetLevel}
            onRestartGame={handleRestartGame}
        />
    );
}

interface StackingGameInnerProps {
    onResetLevel: () => void;
    onRestartGame: () => void;
}

function StackingGameInner({ onResetLevel, onRestartGame }: StackingGameInnerProps) {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, settings, speak } = useGame();
    const { t } = useTranslation();

    const hasSpokenIntroRef = useRef(false);

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [parentPrompt, setParentPrompt] = useState<string | null>(null);
    const [floatingLabels, setFloatingLabels] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

    // Platform X is Animated
    const platformX = useRef(new Animated.Value(width / 2 - PLATFORM_WIDTH / 2)).current;
    const platformXRef = useRef(width / 2 - PLATFORM_WIDTH / 2);

    const levelCompleteHandledRef = useRef(false);
    const blockIdRef = useRef(0);
    const blockPositionsRef = useRef<{ [key: number]: { x: number, y: number } }>({});
    const currentBlock = blocks[currentBlockIndex];

    // Age-Based Max Level Logic
    const ageMonths = settings?.childAgeMonths ?? 48;
    let ageMaxLevel = 10;
    if (ageMonths < 48) ageMaxLevel = 3;
    else if (ageMonths < 60) ageMaxLevel = 6;
    else if (ageMonths < 96) ageMaxLevel = 8;

    const effectiveLevel = Math.min(Math.max(gameState.level, 1), ageMaxLevel);
    const params = DIFFICULTY_CONFIG[effectiveLevel as keyof typeof DIFFICULTY_CONFIG];

    useEffect(() => {
        const listenerId = platformX.addListener(({ value }) => {
            platformXRef.current = value;
        });

        // Platform Setup - Center point for oscillation
        const midX = width / 2 - PLATFORM_WIDTH / 2;
        const minX = 20;
        const maxX = width - PLATFORM_WIDTH - 20;

        if (gameState.level >= 7) {
            platformX.setValue(midX);
            const duration = Math.max(2000 - (gameState.level - 7) * 400, 1000);

            Animated.loop(
                Animated.sequence([
                    Animated.timing(platformX, {
                        toValue: maxX,
                        duration: duration / 2,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: false,
                    }),
                    Animated.timing(platformX, {
                        toValue: midX,
                        duration: duration / 2,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: false,
                    }),
                    Animated.timing(platformX, {
                        toValue: minX,
                        duration: duration / 2,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: false,
                    }),
                    Animated.timing(platformX, {
                        toValue: midX,
                        duration: duration / 2,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else if (gameState.level >= 3) {
            platformX.setValue(minX + Math.random() * (maxX - minX));
        } else {
            platformX.setValue(midX);
        }

        // Initialize blocks with ABSOLUTE mid-screen coordinates
        const initialBlocks: Block[] = [];
        for (let i = 0; i < 5; i++) {
            initialBlocks.push({
                id: blockIdRef.current++,
                color: BLOCK_COLORS[i % BLOCK_COLORS.length],
                x: new Animated.Value(width / 2 - params.blockSize / 2),
                y: new Animated.Value(SPAWN_BOTTOM),
                rotation: new Animated.Value(0),
                isPlaced: false,
            });
        }
        setBlocks(initialBlocks);
        setCurrentBlockIndex(0);
        setAttempts(0);
        showParentPrompt('start');
        blockPositionsRef.current = {};

        return () => {
            platformX.removeListener(listenerId);
            platformX.stopAnimation();
        };
    }, [gameState.level, params.blockSize]);

    // Voice instruction on mount
    useEffect(() => {
        if (!hasSpokenIntroRef.current) {
            speak(t('stacking.instruction'));
            hasSpokenIntroRef.current = true;
        }
    }, [speak, t]);

    const showParentPrompt = (type: 'start' | 'struggle' | 'success') => {
        if (!settings?.parentModeEnabled) return;
        let message = '';
        switch (type) {
            case 'start': message = t('stacking.parentStart'); break;
            case 'struggle': message = t('stacking.parentStruggle'); break;
            case 'success': message = t('stacking.parentSuccess'); break;
        }
        setParentPrompt(message);
        setTimeout(() => setParentPrompt(null), 4000);
    };

    const handleRelease = (gestureState: any) => {
        setIsHolding(false);
        const p = params;
        const idx = currentBlockIndex;
        const activeBlock = blocks[idx];
        if (!activeBlock) return;

        // Current ABSOLUTE drop position
        const absoluteDropX = width / 2 - p.blockSize / 2 + gestureState.dx;
        const dropY = SPAWN_BOTTOM - gestureState.dy;

        // Current RELATIVE offset (to determine success)
        const dropXOffset = absoluteDropX - platformXRef.current;

        // Reference point for stacking (RELATIVE OFFSETS)
        let refXOffset = PLATFORM_WIDTH / 2 - p.blockSize / 2;
        let refY = PLATFORM_BOTTOM + 30;

        if (idx > 0) {
            const prevPos = blockPositionsRef.current[idx - 1];
            if (prevPos) {
                refXOffset = prevPos.x;
                refY = prevPos.y + (p.blockSize * 0.7);
            }
        }

        const idealY = refY;
        const idealXOffset = refXOffset;

        let isSuccess = false;
        let targetXOffset = idealXOffset;
        let targetY = idealY;

        if (idx === 0) {
            const groundDiffY = Math.abs(dropY - idealY);
            const groundDiffX = Math.abs(dropXOffset - idealXOffset);
            const horizontalTolerance = (gameState.level >= 7) ? 180 : 150;

            if (groundDiffY < 120 && groundDiffX < horizontalTolerance) {
                isSuccess = true;
                // PRECISE PLACEMENT: Land exactly where dropped!
                targetXOffset = dropXOffset;
            }
        } else {
            const distY = Math.abs(dropY - idealY);
            const distX = Math.abs(dropXOffset - idealXOffset);
            if (distY < 80 && distX < p.blockSize * 0.9) {
                isSuccess = true;
                targetXOffset = dropXOffset;
            }
        }

        if (isSuccess) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSuccess();
            blockPositionsRef.current[idx] = { x: targetXOffset, y: targetY };

            // CONVERT TO RELATIVE: Set current value to (absolute - platformX) 
            // before switching isPlaced to true
            const currentRelativeX = absoluteDropX - platformXRef.current;
            activeBlock.x.setValue(currentRelativeX);

            setBlocks(prev => prev.map(b => b.id === activeBlock.id ? { ...b, isPlaced: true } : b));

            Animated.parallel([
                Animated.spring(activeBlock.y, { toValue: targetY, useNativeDriver: false }),
                Animated.spring(activeBlock.x, { toValue: targetXOffset, useNativeDriver: false }),
                Animated.spring(activeBlock.rotation, { toValue: 0, useNativeDriver: false })
            ]).start();

            // Add floating label indicator
            setFloatingLabels(prev => [
                ...prev,
                {
                    id: Date.now(),
                    text: (idx + 1).toString(),
                    x: platformXRef.current + targetXOffset + p.blockSize / 2 - 20,
                    y: height - targetY - p.blockSize - 40
                }
            ]);

            if (idx === 4) {
                if (!levelCompleteHandledRef.current) {
                    levelCompleteHandledRef.current = true;
                    recordSuccess();
                    speak('5'); // Speak count
                    setTimeout(() => speak(t('stacking.towerBuilt')), 600);
                    showFeedback({ type: 'success', message: t('stacking.towerBuilt'), emoji: '🗼' });
                    showParentPrompt('success');
                    setTimeout(() => {
                        nextLevel();
                    }, 3500);
                }
            } else {
                speak((idx + 1).toString()); // Speak block count: "1", "2", "3", "4"
                setCurrentBlockIndex(idx + 1);
                recordSuccess();
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playError();
            recordError();
            setAttempts(prev => {
                const newAttempts = prev + 1;
                if (newAttempts >= 3) showParentPrompt('struggle');
                return newAttempts;
            });

            // Return to Absolute Spawn
            Animated.parallel([
                Animated.spring(activeBlock.x, { toValue: width / 2 - p.blockSize / 2, useNativeDriver: false }),
                Animated.spring(activeBlock.y, { toValue: SPAWN_BOTTOM, useNativeDriver: false }),
                Animated.spring(activeBlock.rotation, { toValue: 0, useNativeDriver: false })
            ]).start();
        }
    };

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            setIsHolding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentBlock) {
                Animated.spring(currentBlock.rotation, {
                    toValue: (Math.random() - 0.5) * 10,
                    useNativeDriver: false,
                }).start();
            }
        },
        onPanResponderMove: (_, gestureState) => {
            if (currentBlock && !currentBlock.isPlaced) {
                // ABSOLUTE drag logic
                const absoluteX = width / 2 - params.blockSize / 2 + gestureState.dx;
                currentBlock.x.setValue(absoluteX);
                currentBlock.y.setValue(SPAWN_BOTTOM - gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => handleRelease(gestureState)
    }), [currentBlockIndex, blocks, params]);

    const handleResetLocal = () => {
        Alert.alert(t('common.resetLevel', 'Reset Level'), t('stacking.resetConfirm', 'Clear current blocks?'), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            { text: t('common.reset', 'Reset'), onPress: onResetLevel }
        ]);
    };

    const handleRestartLocal = () => {
        Alert.alert(t('common.restartGame', 'Restart Game'), t('stacking.restartConfirm', 'Go back to Level 1?'), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            { text: t('common.restart', 'Restart'), style: 'destructive', onPress: onRestartGame }
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={handleResetLocal}
                onRestartGame={handleRestartLocal}
            />

            <GameHeader title={t('stacking.title')} showScore={false} />

            <View style={styles.header}>
                <Text style={styles.subtitle}>{t('stacking.subtitle')}</Text>
            </View>

            <View style={styles.gameArea}>
                {parentPrompt && (
                    <View style={styles.parentPromptContainer}>
                        <Text style={styles.parentPromptLabel}>{t('common.parentTip', 'PARENT TIP:')}</Text>
                        <Text style={styles.parentPromptText}>{parentPrompt}</Text>
                    </View>
                )}
                <View style={styles.groundBase} />
                <Animated.View style={[styles.platform, { left: platformX, bottom: PLATFORM_BOTTOM, width: PLATFORM_WIDTH }]}>
                    <Text style={styles.platformText}>{t('stacking.startHere')}</Text>
                </Animated.View>

                {blocks.map((block, index) => {
                    if (!block.isPlaced && index !== currentBlockIndex) return null;
                    const isCurrent = index === currentBlockIndex && !block.isPlaced;

                    // The magic: Placed blocks = platformX + relativeX. Unplaced = absoluteX.
                    const animatedX = block.isPlaced ? Animated.add(platformX, block.x) : block.x;

                    return (
                        <Animated.View
                            key={block.id}
                            {...(isCurrent ? panResponder.panHandlers : {})}
                            style={[
                                styles.block,
                                isCurrent && styles.activeBlock,
                                {
                                    width: params.blockSize,
                                    height: params.blockSize * 0.7,
                                    backgroundColor: block.color,
                                    left: animatedX,
                                    bottom: block.y,
                                    transform: [{
                                        rotate: block.rotation.interpolate({
                                            inputRange: [-10, 10],
                                            outputRange: ['-10deg', '10deg']
                                        })
                                    }]
                                },
                            ]}
                        >
                            {isCurrent && isHolding && (
                                <View style={styles.holdIndicator}>
                                    <Text style={styles.holdText}>👆</Text>
                                </View>
                            )}
                        </Animated.View>
                    );
                })}
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    compact={feedback.type === 'success'}
                    position="top"
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
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: { alignItems: 'center', paddingVertical: spacing.md },
    subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
    parentPromptContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        zIndex: 100,
        marginHorizontal: spacing.lg,
        backgroundColor: '#fef3c7',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#fde68a'
    },
    parentPromptLabel: { fontSize: fontSize.xs, color: '#92400e', fontWeight: '600', marginBottom: 4 },
    parentPromptText: { fontSize: fontSize.base, color: '#78350f', fontWeight: '500' },
    gameArea: { flex: 1, position: 'relative' },
    platform: { position: 'absolute', height: 30, backgroundColor: '#4ade80', borderRadius: 15, borderWidth: 3, borderColor: '#22c55e', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 6, zIndex: 10 },
    platformText: { color: '#064e3b', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    groundBase: { position: 'absolute', bottom: 0, left: 0, right: 0, height: PLATFORM_BOTTOM + 15, backgroundColor: '#f1f5f9', borderTopWidth: 4, borderTopColor: '#e2e8f0', zIndex: 1 },
    block: { position: 'absolute', borderRadius: borderRadius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, zIndex: 20 },
    activeBlock: { shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
    holdIndicator: { position: 'absolute', top: -30, alignSelf: 'center' },
    holdText: { fontSize: 24 },
});
