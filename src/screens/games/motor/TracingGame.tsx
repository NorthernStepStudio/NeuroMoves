import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    PanResponder,
    Pressable,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, G, Defs, ClipPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameButton,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import { TracePoint, validateTraceStroke } from './tracingValidation';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - spacing.lg * 2;

// Each letter has an SVG-style guide path that kids trace over.
// The path is rendered as a thick dotted "road" and the kid draws on top.
// Validation is kid-friendly but now checks path-following, not just random scribbles.
interface LetterGuide {
    char: string;
    // Guide path as SVG d-string, scaled to CANVAS_SIZE
    guidePath: (s: number) => string;
}

function makeGuides(letters: string[]): LetterGuide[] {
    // Simple block-style guide paths for each letter
    // s = canvas size; paths are approximate and kid-friendly
    const p = (s: number) => s; // alias
    const guides: Record<string, (s: number) => string> = {
        'A': (s) => `M${s * 0.15},${s * 0.85} L${s * 0.5},${s * 0.15} L${s * 0.85},${s * 0.85} M${s * 0.3},${s * 0.55} L${s * 0.7},${s * 0.55}`,
        'B': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.2},${s * 0.85} M${s * 0.2},${s * 0.15} L${s * 0.65},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.35} Q${s * 0.85},${s * 0.5} ${s * 0.65},${s * 0.5} L${s * 0.2},${s * 0.5} L${s * 0.7},${s * 0.5} Q${s * 0.9},${s * 0.5} ${s * 0.9},${s * 0.68} Q${s * 0.9},${s * 0.85} ${s * 0.65},${s * 0.85} L${s * 0.2},${s * 0.85}`,
        'C': (s) => `M${s * 0.8},${s * 0.3} Q${s * 0.8},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.2},${s * 0.15} ${s * 0.2},${s * 0.5} Q${s * 0.2},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.8},${s * 0.85} ${s * 0.8},${s * 0.7}`,
        'D': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.2},${s * 0.85} L${s * 0.55},${s * 0.85} Q${s * 0.85},${s * 0.85} ${s * 0.85},${s * 0.5} Q${s * 0.85},${s * 0.15} ${s * 0.55},${s * 0.15} L${s * 0.2},${s * 0.15}`,
        'E': (s) => `M${s * 0.75},${s * 0.15} L${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.5} L${s * 0.65},${s * 0.5} M${s * 0.25},${s * 0.5} L${s * 0.25},${s * 0.85} L${s * 0.75},${s * 0.85}`,
        'F': (s) => `M${s * 0.75},${s * 0.15} L${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.5} L${s * 0.65},${s * 0.5} M${s * 0.25},${s * 0.5} L${s * 0.25},${s * 0.85}`,
        'G': (s) => `M${s * 0.8},${s * 0.3} Q${s * 0.8},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.2},${s * 0.15} ${s * 0.2},${s * 0.5} Q${s * 0.2},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.8},${s * 0.85} ${s * 0.8},${s * 0.55} L${s * 0.6},${s * 0.55}`,
        'H': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.2},${s * 0.85} M${s * 0.2},${s * 0.5} L${s * 0.8},${s * 0.5} M${s * 0.8},${s * 0.15} L${s * 0.8},${s * 0.85}`,
        'I': (s) => `M${s * 0.35},${s * 0.15} L${s * 0.65},${s * 0.15} M${s * 0.5},${s * 0.15} L${s * 0.5},${s * 0.85} M${s * 0.35},${s * 0.85} L${s * 0.65},${s * 0.85}`,
        'J': (s) => `M${s * 0.35},${s * 0.15} L${s * 0.7},${s * 0.15} M${s * 0.6},${s * 0.15} L${s * 0.6},${s * 0.7} Q${s * 0.6},${s * 0.85} ${s * 0.4},${s * 0.85} Q${s * 0.2},${s * 0.85} ${s * 0.2},${s * 0.7}`,
        'K': (s) => `M${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} M${s * 0.75},${s * 0.15} L${s * 0.25},${s * 0.5} L${s * 0.75},${s * 0.85}`,
        'L': (s) => `M${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} L${s * 0.75},${s * 0.85}`,
        'M': (s) => `M${s * 0.15},${s * 0.85} L${s * 0.15},${s * 0.15} L${s * 0.5},${s * 0.5} L${s * 0.85},${s * 0.15} L${s * 0.85},${s * 0.85}`,
        'N': (s) => `M${s * 0.2},${s * 0.85} L${s * 0.2},${s * 0.15} L${s * 0.8},${s * 0.85} L${s * 0.8},${s * 0.15}`,
        'O': (s) => `M${s * 0.5},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.5} Q${s * 0.85},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.15},${s * 0.85} ${s * 0.15},${s * 0.5} Q${s * 0.15},${s * 0.15} ${s * 0.5},${s * 0.15}`,
        'P': (s) => `M${s * 0.25},${s * 0.85} L${s * 0.25},${s * 0.15} L${s * 0.65},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.35} Q${s * 0.85},${s * 0.55} ${s * 0.65},${s * 0.55} L${s * 0.25},${s * 0.55}`,
        'Q': (s) => `M${s * 0.5},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.5} Q${s * 0.85},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.15},${s * 0.85} ${s * 0.15},${s * 0.5} Q${s * 0.15},${s * 0.15} ${s * 0.5},${s * 0.15} M${s * 0.6},${s * 0.7} L${s * 0.85},${s * 0.9}`,
        'R': (s) => `M${s * 0.25},${s * 0.85} L${s * 0.25},${s * 0.15} L${s * 0.65},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.35} Q${s * 0.85},${s * 0.55} ${s * 0.65},${s * 0.55} L${s * 0.25},${s * 0.55} M${s * 0.55},${s * 0.55} L${s * 0.8},${s * 0.85}`,
        'S': (s) => `M${s * 0.75},${s * 0.25} Q${s * 0.75},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.25},${s * 0.15} ${s * 0.25},${s * 0.35} Q${s * 0.25},${s * 0.5} ${s * 0.5},${s * 0.5} Q${s * 0.75},${s * 0.5} ${s * 0.75},${s * 0.68} Q${s * 0.75},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.25},${s * 0.85} ${s * 0.25},${s * 0.75}`,
        'T': (s) => `M${s * 0.15},${s * 0.15} L${s * 0.85},${s * 0.15} M${s * 0.5},${s * 0.15} L${s * 0.5},${s * 0.85}`,
        'U': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.2},${s * 0.65} Q${s * 0.2},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.8},${s * 0.85} ${s * 0.8},${s * 0.65} L${s * 0.8},${s * 0.15}`,
        'V': (s) => `M${s * 0.15},${s * 0.15} L${s * 0.5},${s * 0.85} L${s * 0.85},${s * 0.15}`,
        'W': (s) => `M${s * 0.1},${s * 0.15} L${s * 0.3},${s * 0.85} L${s * 0.5},${s * 0.4} L${s * 0.7},${s * 0.85} L${s * 0.9},${s * 0.15}`,
        'X': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.8},${s * 0.85} M${s * 0.8},${s * 0.15} L${s * 0.2},${s * 0.85}`,
        'Y': (s) => `M${s * 0.15},${s * 0.15} L${s * 0.5},${s * 0.5} L${s * 0.85},${s * 0.15} M${s * 0.5},${s * 0.5} L${s * 0.5},${s * 0.85}`,
        'Z': (s) => `M${s * 0.2},${s * 0.15} L${s * 0.8},${s * 0.15} L${s * 0.2},${s * 0.85} L${s * 0.8},${s * 0.85}`,
    };
    return letters.map(c => ({
        char: c,
        guidePath: guides[c.toUpperCase()] || guides['A'],
    }));
}

const UPPER_GUIDES = makeGuides('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
const LOWER_GUIDES = makeGuides('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
// For lowercase, we reuse the same shapes but display the lowercase char

export default function TracingGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);
    const [letterCase, setLetterCase] = useState<'upper' | 'lower'>('upper');

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'tracing') {
                startGame('tracing');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `tracing-${level}-${restartKey}-${letterCase}`;

    return (
        <TracingGameInner
            key={gameKey}
            onResetLevel={() => setRestartKey(k => k + 1)}
            onRestartGame={async () => { await resetCurrentGameProgress(); setRestartKey(k => k + 1); }}
            letterCase={letterCase}
            setLetterCase={setLetterCase}
        />
    );
}

interface InnerProps {
    onResetLevel: () => void;
    onRestartGame: () => void;
    letterCase: 'upper' | 'lower';
    setLetterCase: (c: 'upper' | 'lower') => void;
}

function TracingGameInner({ onResetLevel, onRestartGame, letterCase, setLetterCase }: InnerProps) {
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
    const guides = letterCase === 'upper' ? UPPER_GUIDES : LOWER_GUIDES;
    const guide = guides[(level - 1) % guides.length];
    const displayChar = letterCase === 'lower' ? guide.char.toLowerCase() : guide.char;
    const guideDString = guide.guidePath(CANVAS_SIZE);

    // Start dot position (first M command)
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
            speak(t('tracing.instruction', { letter: displayChar.toLowerCase() }));
        }
    }, [displayChar, speak, t]);

    const handleSuccess = useCallback(() => {
        if (done) return;
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSuccess();
        recordSuccess();
        speak(displayChar.toLowerCase());
        setTimeout(() => speak(t('tracing.successMessage')), 500);
        showFeedback({ type: 'success', message: t('tracing.greatTracing'), emoji: '🎨' });
        setTimeout(nextLevel, 2500);
    }, [done, displayChar, nextLevel, playSuccess, recordSuccess, showFeedback, speak, t]);

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
                const newPath = `M${locationX},${locationY}`;
                currentPathRef.current = newPath;
                setCurrentPath(newPath);
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
                        showFeedback({ type: 'hint', message: t('tracing.startGreen'), emoji: '🟢' }, 1200);
                    }
                } else if (result.reason === 'off_path') {
                    allPointsRef.current = allPointsRef.current.slice(0, allPointsRef.current.length - currentPointsRef.current.length);
                    setCurrentPath('');
                    const now = Date.now();
                    if (now - lastHintAtRef.current > 2000) {
                        lastHintAtRef.current = now;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        playError();
                        showFeedback({ type: 'hint', message: t('tracing.tryFollowing'), emoji: '✍️' }, 1200);
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
            <GameHeader title={t('tracing.title')} />
            <View style={styles.content}>
                <View style={styles.settingsBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.settingGroup}>
                            <Text style={styles.settingLabel}>{t('tracing.case', { defaultValue: 'Case' })}:</Text>
                            <Pressable style={[styles.settingBtn, letterCase === 'upper' && styles.activeBtn]} onPress={() => setLetterCase('upper')}>
                                <Text style={[styles.btnText, letterCase === 'upper' && styles.activeText]}>ABC</Text>
                            </Pressable>
                            <Pressable style={[styles.settingBtn, letterCase === 'lower' && styles.activeBtn]} onPress={() => setLetterCase('lower')}>
                                <Text style={[styles.btnText, letterCase === 'lower' && styles.activeText]}>abc</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>

                <GameInstruction text={t('tracing.instruction', { letter: displayChar })} />

                <View style={styles.canvasContainer}>
                    {/* The drawing layer with clipPath constraint */}
                    <View style={styles.drawLayer} {...panResponder.panHandlers}>
                        <Svg height={CANVAS_SIZE} width={CANVAS_SIZE} pointerEvents="none">
                            <Defs>
                                <ClipPath id="roadClip">
                                    <Path d={guideDString} stroke="black" strokeWidth={55} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </ClipPath>
                            </Defs>

                            {/* Dotted guide path - the "road" underneath */}
                            <Path d={guideDString} stroke="#e0e7ff" strokeWidth={50} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d={guideDString} stroke="#a5b4fc" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,8" />

                            {/* User traces inside this group, which is clipped to the road */}
                            <G clipPath="url(#roadClip)">
                                {paths.map((d, i) => (
                                    <Path key={i} d={d} stroke={colors.accentPrimary} strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                                ))}
                                <Path d={currentPath} stroke={colors.accentSecondary} strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </G>

                            {/* Start dot on top */}
                            <Circle cx={startDot.x} cy={startDot.y} r={16} fill="#22c55e" />
                            <Circle cx={startDot.x} cy={startDot.y} r={8} fill="#fff" />
                        </Svg>
                    </View>
                </View>

                <Text style={styles.hintText}>👆 {t('tracing.startGreen')}</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.buttonWrapper}>
                    <GameButton title={t('common.clean', { defaultValue: 'Clean' })} icon="broom" onPress={clearBoard} variant="primary" />
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
    settingsBar: { backgroundColor: colors.bgTertiary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, width: '100%', marginBottom: spacing.sm },
    settingGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    settingLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginRight: 4 },
    settingBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.full, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.glassBorder },
    activeBtn: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
    btnText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
    activeText: { color: '#fff' },
    canvasContainer: { width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: '#fff', borderRadius: 40, overflow: 'hidden', marginTop: spacing.md, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    guideContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    ghostLetter: { fontSize: CANVAS_SIZE * 0.65, fontWeight: 'bold', color: '#f3f4f6' },
    guideLayer: { ...StyleSheet.absoluteFillObject },
    drawLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    hintText: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
    footer: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'center' },
    buttonWrapper: { width: '50%' },
});

