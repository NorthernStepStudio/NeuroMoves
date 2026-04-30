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
import { TracePoint, validateTraceStroke } from './tracingValidation';

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
};

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

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
        playSuccess, playError, speak
    } = useGame();
    const { t } = useTranslation();

    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [done, setDone] = useState(false);

    const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
    const allPointsRef = useRef<TracePoint[]>([]);
    const currentPathRef = useRef('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastHintAtRef = useRef(0);

    const level = Math.max(gameState.level, 1);
    const targetNum = NUMBERS[(level - 1) % NUMBERS.length];
    const guideFn = NUMBER_GUIDES[targetNum] || NUMBER_GUIDES['1'];
    const guideDString = guideFn(CANVAS_SIZE);

    const startDot = useMemo(() => {
        const m = guideDString.match(/^M([\d.]+),([\d.]+)/);
        if (m) return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
        return { x: CANVAS_SIZE * 0.5, y: CANVAS_SIZE * 0.15 };
    }, [guideDString]);

    // Speak instruction on mount
    const hasSpoken = useRef(false);
    React.useEffect(() => {
        if (!hasSpoken.current) {
            hasSpoken.current = true;
            speak(t('numberTracing.instruction', { number: targetNum }));
        }
    }, [targetNum, speak]);

    const handleSuccess = useCallback(() => {
        if (done) return;
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSuccess();
        recordSuccess();
        speak(targetNum);
        setTimeout(() => speak(t('numberTracing.successMessage', { number: targetNum })), 500);
        showFeedback({ type: 'success', message: t('numberTracing.greatTracing'), emoji: '🔟' });
        setTimeout(nextLevel, 2500);
    }, [done, nextLevel, playSuccess, recordSuccess, showFeedback, speak, targetNum, t]);

    React.useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        []
    );

    const clearBoard = () => {
        setPaths([]);
        setCurrentPath('');
        currentPointsRef.current = [];
        allPointsRef.current = [];
        currentPathRef.current = '';
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                if (timerRef.current) clearTimeout(timerRef.current);

                currentPointsRef.current = [{ x: locationX, y: locationY }];
                allPointsRef.current.push({ x: locationX, y: locationY });
                currentPathRef.current = `M${locationX},${locationY}`;
                setCurrentPath(currentPathRef.current);
                Haptics.selectionAsync();
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentPointsRef.current.push({ x: locationX, y: locationY });
                allPointsRef.current.push({ x: locationX, y: locationY });
                if (allPointsRef.current.length > 2400) {
                    allPointsRef.current = allPointsRef.current.slice(-1600);
                }
                currentPathRef.current += ` L${locationX},${locationY}`;
                setCurrentPath(currentPathRef.current);
            },
            onPanResponderRelease: () => {
                const result = validateTraceStroke(allPointsRef.current, guideDString);

                if (result.isValid) {
                    if (currentPathRef.current) setPaths(prev => [...prev, currentPathRef.current]);
                    setCurrentPath('');
                    timerRef.current = setTimeout(handleSuccess, 500);
                    return;
                }

                if (result.reason === 'start_off_path') {
                    allPointsRef.current = allPointsRef.current.slice(0, allPointsRef.current.length - currentPointsRef.current.length);
                    setCurrentPath('');
                    const now = Date.now();
                    if (now - lastHintAtRef.current > 2000) {
                        lastHintAtRef.current = now;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        playError();
                        showFeedback({ type: 'hint', message: t('numberTracing.startGreen'), emoji: '🟢' }, 1200);
                    }
                } else if (result.reason === 'off_path') {
                    allPointsRef.current = allPointsRef.current.slice(0, allPointsRef.current.length - currentPointsRef.current.length);
                    setCurrentPath('');
                    const now = Date.now();
                    if (now - lastHintAtRef.current > 2000) {
                        lastHintAtRef.current = now;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        playError();
                        showFeedback({ type: 'hint', message: t('numberTracing.tryFollowing'), emoji: '✍️' }, 1200);
                    }
                } else {
                    if (currentPathRef.current) setPaths(prev => [...prev, currentPathRef.current]);
                    setCurrentPath('');
                }
            },
        })
    ).current;

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
                    {/* The drawing layer with clipPath constraint */}
                    <View style={styles.drawLayer} {...panResponder.panHandlers}>
                        <Svg height={CANVAS_SIZE} width={CANVAS_SIZE} pointerEvents="none">
                            <Defs>
                                <ClipPath id="numClip">
                                    <Path d={guideDString} stroke="black" strokeWidth={55} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </ClipPath>
                            </Defs>

                            {/* Dotted guide path - the "road" underneath */}
                            <Path d={guideDString} stroke="#d1fae5" strokeWidth={50} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d={guideDString} stroke="#6ee7b7" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,8" />

                            {/* User traces inside this group, which is clipped to the road */}
                            <G clipPath="url(#numClip)">
                                {paths.map((d, i) => (
                                    <Path key={i} d={d} stroke={colors.teal || colors.accentPrimary} strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                                ))}
                                <Path d={currentPath} stroke={colors.tealLight || colors.accentSecondary} strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </G>

                            {/* Start dot on top */}
                            <Circle cx={startDot.x} cy={startDot.y} r={16} fill="#22c55e" />
                            <Circle cx={startDot.x} cy={startDot.y} r={8} fill="#fff" />
                        </Svg>
                    </View>
                </View>
                <Text style={styles.hintText}>👆 {t('numberTracing.startGreen')}</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.buttonWrapper}>
                    <GameButton title={t('common.clean', 'Clean')} icon="broom" onPress={clearBoard} variant="primary" />
                </View>
            </View>

            {feedback && (
                <FeedbackOverlay visible={!!feedback} type={feedback.type} message={feedback.message} emoji={feedback.emoji} compact={feedback.type === 'success'} position="top" />
            )}
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
    hintText: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
    footer: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'center' },
    buttonWrapper: { width: '50%' },
});

