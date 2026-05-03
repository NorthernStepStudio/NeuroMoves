import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, G, Defs, ClipPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameButton,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, fontSize } from '../../../theme/colors';
import * as Speech from 'expo-speech';
import { TracePoint, generateCheckpoints, updateCheckpoints, checkTracingProgress } from './tracingValidation';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - spacing.lg * 2;

// SVG guide paths for each digit
const NUMBER_GUIDES: Record<string, (s: number) => string> = {
    '1': (s) => `M${s * 0.4},${s * 0.25} L${s * 0.5},${s * 0.15} L${s * 0.5},${s * 0.85} M${s * 0.35},${s * 0.85} L${s * 0.65},${s * 0.85}`,
    '2': (s) => `M${s * 0.25},${s * 0.3} Q${s * 0.25},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.75},${s * 0.15} ${s * 0.75},${s * 0.35} Q${s * 0.75},${s * 0.5} ${s * 0.25},${s * 0.85} L${s * 0.75},${s * 0.85}`,
    '3': (s) => `M${s * 0.25},${s * 0.2} Q${s * 0.25},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.75},${s * 0.15} ${s * 0.75},${s * 0.33} Q${s * 0.75},${s * 0.5} ${s * 0.5},${s * 0.5} Q${s * 0.75},${s * 0.5} ${s * 0.75},${s * 0.68} Q${s * 0.75},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.25},${s * 0.85} ${s * 0.25},${s * 0.75}`,
    '4': (s) => `M${s * 0.65},${s * 0.85} L${s * 0.65},${s * 0.15} L${s * 0.2},${s * 0.6} L${s * 0.8},${s * 0.6}`,
    '5': (s) => `M${s * 0.7},${s * 0.15} L${s * 0.3},${s * 0.15} L${s * 0.25},${s * 0.45} Q${s * 0.5},${s * 0.4} ${s * 0.75},${s * 0.55} Q${s * 0.8},${s * 0.75} ${s * 0.5},${s * 0.85} Q${s * 0.25},${s * 0.85} ${s * 0.2},${s * 0.75}`,
    '6': (s) => `M${s * 0.65},${s * 0.15} Q${s * 0.25},${s * 0.25} ${s * 0.25},${s * 0.6} Q${s * 0.25},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.75},${s * 0.85} ${s * 0.75},${s * 0.6} Q${s * 0.75},${s * 0.45} ${s * 0.5},${s * 0.45} Q${s * 0.25},${s * 0.45} ${s * 0.25},${s * 0.6}`,
    '7': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.8},${s * 0.15} L${s * 0.4},${s * 0.85}`,
    '8': (s) => `M${s * 0.5},${s * 0.5} Q${s * 0.25},${s * 0.5} ${s * 0.25},${s * 0.33} Q${s * 0.25},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.75},${s * 0.15} ${s * 0.75},${s * 0.33} Q${s * 0.75},${s * 0.5} ${s * 0.5},${s * 0.5} Q${s * 0.25},${s * 0.5} ${s * 0.25},${s * 0.68} Q${s * 0.25},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.75},${s * 0.85} ${s * 0.75},${s * 0.68} Q${s * 0.75},${s * 0.5} ${s * 0.5},${s * 0.5}`,
    '9': (s) => `M${s * 0.75},${s * 0.4} Q${s * 0.75},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.25},${s * 0.15} ${s * 0.25},${s * 0.35} Q${s * 0.25},${s * 0.5} ${s * 0.5},${s * 0.5} Q${s * 0.75},${s * 0.5} ${s * 0.75},${s * 0.4} L${s * 0.75},${s * 0.85}`,
    '0': (s) => `M${s * 0.5},${s * 0.15} Q${s * 0.8},${s * 0.15} ${s * 0.8},${s * 0.5} Q${s * 0.8},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.2},${s * 0.85} ${s * 0.2},${s * 0.5} Q${s * 0.2},${s * 0.15} ${s * 0.5},${s * 0.15}`,
    '10': (s) => `M${s * 0.25},${s * 0.25} L${s * 0.35},${s * 0.15} L${s * 0.35},${s * 0.85} M${s * 0.65},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.5} Q${s * 0.85},${s * 0.85} ${s * 0.65},${s * 0.85} Q${s * 0.45},${s * 0.85} ${s * 0.45},${s * 0.5} Q${s * 0.45},${s * 0.15} ${s * 0.65},${s * 0.15}`,
};

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function NumberTracingGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'number-tracing') {
                startGame('number-tracing');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `number-tracing-${level}-${restartKey}`;

    return (
        <NumberTracingGameInner
            key={gameKey}
            onResetLevel={() => setRestartKey(k => k + 1)}
            onRestartGame={async () => { await resetCurrentGameProgress(); setRestartKey(k => k + 1); }}
        />
    );
}

function NumberTracingGameInner({ onResetLevel, onRestartGame }: { onResetLevel: () => void; onRestartGame: () => void }) {
    const navigation = useNavigation();
    const {
        gameState, nextLevel, recordSuccess, showFeedback, feedback,
        playSuccess, playError, speak, isBusy
    } = useGame();
    const { t } = useTranslation();

    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [done, setDone] = useState(false);
    const doneRef = useRef(false);

    const level = Math.max(gameState.level, 1);
    const targetNum = NUMBERS[(level - 1) % NUMBERS.length];
    const guideFn = NUMBER_GUIDES[targetNum] || NUMBER_GUIDES['1'];
    const guideDString = guideFn(CANVAS_SIZE);

    // Checkpoints for real-time progress
    const [checkpoints, setCheckpoints] = useState<{ point: TracePoint; visited: boolean }[]>([]);
    const checkpointsRef = useRef<{ point: TracePoint; visited: boolean }[]>([]);

    // Initialize checkpoints when guide path changes
    React.useEffect(() => {
        const points = generateCheckpoints(guideDString, 5);
        const cps = points.map(p => ({ point: p, visited: false }));
        setCheckpoints(cps);
        checkpointsRef.current = cps;
    }, [guideDString]);

    const startDot = useMemo(() => {
        const m = guideDString.match(/^M([\d.]+),([\d.]+)/);
        if (m) return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
        return { x: CANVAS_SIZE * 0.5, y: CANVAS_SIZE * 0.15 };
    }, [guideDString]);

    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const hasSpoken = useRef(false);

    // Stop all voices on unmount
    React.useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

    // Speak the target number whenever it changes (new level)
    React.useEffect(() => {
        // Delay to ensure UI is ready and engine cleanup is finished
        const timer = setTimeout(() => {
            speak(t('numberTracing.instruction', { number: targetNum }), { shouldLock: true });
        }, 300);
        return () => clearTimeout(timer);
    }, [targetNum, speak, t]);

    const handleSuccess = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSuccess();
        recordSuccess();
        // Speak the number clearly
        speak(targetNum, { shouldLock: true });
        
        // Give '10' more time since it's likely being fetched from the backend
        const gap = targetNum === '10' ? 2000 : 1200;
        setTimeout(() => speak(t('numberTracing.successMessage')), gap);
        showFeedback({ type: 'success', message: t('numberTracing.greatTracing'), emoji: '🔟' });
        setTimeout(nextLevel, gap + 1500);
    }, [done, nextLevel, playSuccess, recordSuccess, showFeedback, speak, targetNum, t]);

    const panResponder = useMemo(() => 
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isBusy,
            onMoveShouldSetPanResponder: () => !isBusy,
            onPanResponderGrant: (evt) => {
                if (done || isBusy) return;
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(`M${locationX},${locationY}`);
                
                const newlyVisited = updateCheckpoints(checkpointsRef.current, { x: locationX, y: locationY }, 30);
                if (newlyVisited > 0) {
                    setCheckpoints([...checkpointsRef.current]);
                    Haptics.selectionAsync();
                }
            },
            onPanResponderMove: (evt) => {
                if (done || isBusy) return;
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(prev => prev + ` L${locationX},${locationY}`);

                const newlyVisited = updateCheckpoints(checkpointsRef.current, { x: locationX, y: locationY }, 30);
                if (newlyVisited > 0) {
                    setCheckpoints([...checkpointsRef.current]);
                    Haptics.selectionAsync();

                    const result = checkTracingProgress(checkpointsRef.current);
                    if (result.isValid) {
                        handleSuccess();
                    }
                }
            },
            onPanResponderRelease: () => {
                if (done || isBusy) return;
                setCurrentPath('');
                setPaths(prev => [...prev, currentPath]);
            },
        }), [isBusy, done, handleSuccess, guideDString]);

    const clearBoard = () => {
        setPaths([]);
        setCurrentPath('');
        const points = generateCheckpoints(guideDString, 20);
        const cps = points.map(p => ({ point: p, visited: false }));
        setCheckpoints(cps);
        checkpointsRef.current = cps;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
            />
            <GameHeader title={t('numberTracing.title')} />
            <View style={styles.content}>
                <GameInstruction text={t('numberTracing.instruction', { number: targetNum })} />

                <View style={styles.canvasContainer}>
                    <View style={styles.drawLayer} {...panResponder.panHandlers}>
                        <Svg height={CANVAS_SIZE} width={CANVAS_SIZE} pointerEvents="none">
                            <Defs>
                                <ClipPath id="numClip">
                                    <Path d={guideDString} stroke="black" strokeWidth={80} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </ClipPath>
                            </Defs>

                            {/* Base guide path */}
                            <Path d={guideDString} stroke="#d1fae5" strokeWidth={65} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d={guideDString} stroke="#6ee7b7" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,8" />

                            {/* Progress feedback - "Liner" made of dense overlapping dots */}
                            {checkpoints.map((cp, i) => cp.visited && (
                                <Circle key={i} cx={cp.point.x} cy={cp.point.y} r={20} fill={colors.teal || colors.accentPrimary} />
                            ))}

                            {/* Indicators */}
                            <Circle cx={startDot.x} cy={startDot.y} r={16} fill="#22c55e" />
                            <Circle cx={startDot.x} cy={startDot.y} r={8} fill="#fff" />
                        </Svg>
                    </View>
                </View>
                <View style={[styles.hintContainer, feedback?.type === 'success' && styles.successHint]}>
                    <Text style={styles.hintText}>
                        {feedback ? `${feedback.emoji} ${feedback.message}` : `👆 ${t('numberTracing.startGreen')}`}
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.buttonWrapper}>
                    <GameButton title={t('common.clean', { defaultValue: 'Clean' })} icon="broom" onPress={clearBoard} variant="primary" />
                </View>
            </View>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { flex: 1, alignItems: 'center' },
    canvasContainer: { width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: '#fff', borderRadius: 40, overflow: 'hidden', marginTop: spacing.md, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    guideContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    ghostLetter: { fontSize: CANVAS_SIZE * 0.65, fontWeight: 'bold', color: '#f3f4f6' },
    guideLayer: { ...StyleSheet.absoluteFillObject },
    drawLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    hintContainer: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#bbf7d0', minHeight: 60, justifyContent: 'center' },
    successHint: { backgroundColor: '#dcfce7', borderColor: '#4ade80' },
    hintText: { fontSize: fontSize.lg, color: '#166534', fontWeight: 'bold', textAlign: 'center' },
    footer: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'center' },
    buttonWrapper: { width: '50%' },
});

