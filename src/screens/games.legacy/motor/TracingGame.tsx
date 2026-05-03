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
import * as Speech from 'expo-speech';
import { TracePoint, generateCheckpoints, updateCheckpoints, checkTracingProgress } from './tracingValidation';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - spacing.lg * 2;

// Each letter has an SVG-style guide path that kids trace over.
// The path is rendered as a thick dotted "road" and the kid draws on top.
// Validation is kid-friendly but now checks path-following, not just random scribbles.
interface LetterGuide {
    char: string;
    guidePath: (s: number) => string;
}

/**
 * GLYPH SYSTEM REBUILD
 * Proportions for a 1.0 unit coordinate system (Optimized for 65px stroke):
 * Uppercase: Top=0.15, Base=0.85
 * Lowercase: Ascender=0.05, X-Height=0.35, Base=0.75, Descender=0.95
 * 
 * Each glyph is authored to follow standard preschool manuscript stroke order.
 */

const UPPERCASE_GLYPHS: Record<string, (s: number) => string> = {
    'A': (s) => `M${s * 0.15},${s * 0.85} L${s * 0.5},${s * 0.15} L${s * 0.85},${s * 0.85} M${s * 0.3},${s * 0.55} L${s * 0.7},${s * 0.55}`,
    'B': (s) => `M${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} M${s * 0.25},${s * 0.15} L${s * 0.65},${s * 0.15} Q${s * 0.85},${s * 0.15} ${s * 0.85},${s * 0.35} Q${s * 0.85},${s * 0.5} ${s * 0.65},${s * 0.5} L${s * 0.25},${s * 0.5} M${s * 0.25},${s * 0.5} L${s * 0.7},${s * 0.5} Q${s * 0.9},${s * 0.5} ${s * 0.9},${s * 0.68} Q${s * 0.9},${s * 0.85} ${s * 0.65},${s * 0.85} L${s * 0.25},${s * 0.85}`,
    'C': (s) => `M${s * 0.8},${s * 0.3} Q${s * 0.8},${s * 0.15} ${s * 0.5},${s * 0.15} Q${s * 0.2},${s * 0.15} ${s * 0.2},${s * 0.5} Q${s * 0.2},${s * 0.85} ${s * 0.5},${s * 0.85} Q${s * 0.8},${s * 0.85} ${s * 0.8},${s * 0.7}`,
    'D': (s) => `M${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} L${s * 0.55},${s * 0.85} Q${s * 0.85},${s * 0.85} ${s * 0.85},${s * 0.5} Q${s * 0.85},${s * 0.15} ${s * 0.55},${s * 0.15} L${s * 0.25},${s * 0.15}`,
    'E': (s) => `M${s * 0.75},${s * 0.15} L${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} L${s * 0.75},${s * 0.85} M${s * 0.25},${s * 0.5} L${s * 0.65},${s * 0.5}`,
    'F': (s) => `M${s * 0.75},${s * 0.15} L${s * 0.25},${s * 0.15} L${s * 0.25},${s * 0.85} M${s * 0.25},${s * 0.5} L${s * 0.65},${s * 0.5}`,
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

const LOWERCASE_GLYPHS: Record<string, (s: number) => string> = {
    // Standard Manuscript Grid (V6 - Final Centered): 
    // ASC=0.1, XTOP=0.3, BASE=0.7, DESC=0.95
    // Horizontal: 0.3 to 0.7 (Center: 0.5)
    // Vertical Body Midpoint: (0.3 + 0.7) / 2 = 0.5 (PERFECT CENTER)
    'a': (s) => `M${s*0.7},${s*0.5} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.5} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.5} M${s*0.7},${s*0.3} L${s*0.7},${s*0.7}`,
    'b': (s) => `M${s*0.3},${s*0.1} L${s*0.3},${s*0.7} M${s*0.3},${s*0.5} Q${s*0.3},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.7},${s*0.3} ${s*0.7},${s*0.5} Q${s*0.7},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.3},${s*0.7} ${s*0.3},${s*0.6}`,
    'c': (s) => `M${s*0.7},${s*0.4} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.5} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.6}`,
    'd': (s) => `M${s*0.7},${s*0.5} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.5} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.5} M${s*0.7},${s*0.1} L${s*0.7},${s*0.7}`,
    'e': (s) => `M${s*0.3},${s*0.5} L${s*0.7},${s*0.5} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.5} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.6}`,
    'f': (s) => `M${s*0.6},${s*0.1} Q${s*0.4},${s*0.1} ${s*0.4},${s*0.25} L${s*0.4},${s*0.7} M${s*0.25},${s*0.4} L${s*0.55},${s*0.4}`,
    'g': (s) => `M${s*0.7},${s*0.5} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.5} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.5} M${s*0.7},${s*0.3} L${s*0.7},${s*0.85} Q${s*0.7},${s*0.95} ${s*0.4},${s*0.95}`,
    'h': (s) => `M${s*0.3},${s*0.1} L${s*0.3},${s*0.7} M${s*0.3},${s*0.5} Q${s*0.5},${s*0.3} ${s*0.7},${s*0.5} L${s*0.7},${s*0.7}`,
    'i': (s) => `M${s*0.5},${s*0.3} L${s*0.5},${s*0.7} M${s*0.5},${s*0.15} L${s*0.51},${s*0.15}`,
    'j': (s) => `M${s*0.6},${s*0.3} L${s*0.6},${s*0.85} Q${s*0.6},${s*0.95} ${s*0.35},${s*0.95} M${s*0.6},${s*0.15} L${s*0.61},${s*0.15}`,
    'k': (s) => `M${s*0.3},${s*0.1} L${s*0.3},${s*0.7} M${s*0.65},${s*0.3} L${s*0.3},${s*0.5} L${s*0.65},${s*0.7}`,
    'l': (s) => `M${s*0.5},${s*0.1} L${s*0.5},${s*0.7}`,
    'm': (s) => `M${s*0.15},${s*0.3} L${s*0.15},${s*0.7} M${s*0.15},${s*0.5} Q${s*0.3},${s*0.3} ${s*0.45},${s*0.5} L${s*0.45},${s*0.7} M${s*0.45},${s*0.5} Q${s*0.6},${s*0.3} ${s*0.75},${s*0.5} L${s*0.75},${s*0.7}`,
    'n': (s) => `M${s*0.3},${s*0.3} L${s*0.3},${s*0.7} M${s*0.3},${s*0.5} Q${s*0.5},${s*0.3} ${s*0.7},${s*0.5} L${s*0.7},${s*0.7}`,
    'o': (s) => `M${s*0.5},${s*0.3} Q${s*0.75},${s*0.3} ${s*0.75},${s*0.5} Q${s*0.75},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.25},${s*0.7} ${s*0.25},${s*0.5} Q${s*0.25},${s*0.3} ${s*0.5},${s*0.3}`,
    'p': (s) => `M${s*0.3},${s*0.3} L${s*0.3},${s*0.95} M${s*0.3},${s*0.5} Q${s*0.3},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.7},${s*0.3} ${s*0.7},${s*0.5} Q${s*0.7},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.3},${s*0.7} ${s*0.3},${s*0.6}`,
    'q': (s) => `M${s*0.3},${s*0.5} Q${s*0.3},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.7},${s*0.3} ${s*0.7},${s*0.5} Q${s*0.7},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.3},${s*0.7} ${s*0.3},${s*0.5} M${s*0.7},${s*0.3} L${s*0.7},${s*0.95}`,
    'r': (s) => `M${s*0.3},${s*0.3} L${s*0.3},${s*0.7} M${s*0.3},${s*0.5} Q${s*0.45},${s*0.3} ${s*0.7},${s*0.3}`,
    's': (s) => `M${s*0.7},${s*0.4} Q${s*0.7},${s*0.3} ${s*0.5},${s*0.3} Q${s*0.3},${s*0.3} ${s*0.3},${s*0.4} Q${s*0.3},${s*0.5} ${s*0.5},${s*0.5} Q${s*0.7},${s*0.5} ${s*0.7},${s*0.6} Q${s*0.7},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.3},${s*0.7} ${s*0.3},${s*0.6}`,
    't': (s) => `M${s*0.45},${s*0.1} L${s*0.45},${s*0.65} Q${s*0.45},${s*0.7} ${s*0.6},${s*0.7} M${s*0.3},${s*0.3} L${s*0.6},${s*0.3}`,
    'u': (s) => `M${s*0.3},${s*0.3} L${s*0.3},${s*0.65} Q${s*0.3},${s*0.7} ${s*0.5},${s*0.7} Q${s*0.7},${s*0.7} ${s*0.7},${s*0.65} L${s*0.7},${s*0.3} L${s*0.7},${s*0.7}`,
    'v': (s) => `M${s*0.3},${s*0.3} L${s*0.5},${s*0.7} L${s*0.7},${s*0.3}`,
    'w': (s) => `M${s*0.2},${s*0.3} L${s*0.35},${s*0.7} L${s*0.5},${s*0.5} L${s*0.65},${s*0.7} L${s*0.8},${s*0.3}`,
    'x': (s) => `M${s*0.3},${s*0.3} L${s*0.7},${s*0.7} M${s*0.7},${s*0.3} L${s*0.3},${s*0.7}`,
    'y': (s) => `M${s*0.3},${s*0.3} L${s*0.5},${s*0.6} M${s*0.7},${s*0.3} L${s*0.3},${s*0.95}`,
    'z': (s) => `M${s*0.3},${s*0.3} L${s*0.7},${s*0.3} L${s*0.3},${s*0.7} L${s*0.7},${s*0.7}`,
};

const UPPER_GUIDES: LetterGuide[] = Object.keys(UPPERCASE_GLYPHS).map(char => ({
    char,
    guidePath: UPPERCASE_GLYPHS[char]
}));

const LOWER_GUIDES: LetterGuide[] = Object.keys(LOWERCASE_GLYPHS).map(char => ({
    char,
    guidePath: LOWERCASE_GLYPHS[char]
}));

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
        playSuccess, playError, speak, isBusy
    } = useGame();
    const { t } = useTranslation();

    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [done, setDone] = useState(false);
    const doneRef = useRef(false);

    const level = Math.max(gameState.level, 1);
    const guides = letterCase === 'upper' ? UPPER_GUIDES : LOWER_GUIDES;
    const guide = guides[(level - 1) % guides.length];
    const displayChar = letterCase === 'lower' ? guide.char.toLowerCase() : guide.char;
    const guideDString = guide.guidePath(CANVAS_SIZE * 0.7);
    const offset = CANVAS_SIZE * 0.15;

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
        if (m) return { x: parseFloat(m[1]) + offset, y: parseFloat(m[2]) + offset };
        return { x: CANVAS_SIZE * 0.5, y: CANVAS_SIZE * 0.15 };
    }, [guideDString, offset]);

    // Speak the target letter whenever it changes (new level)
    React.useEffect(() => {
        // Delay to ensure UI is ready and engine cleanup is finished
        const timer = setTimeout(() => {
            speak(t('tracing.instruction', { letter: displayChar }), { shouldLock: true });
        }, 300);
        return () => clearTimeout(timer);
    }, [displayChar, speak, t]);

    const handleSuccess = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSuccess();
        recordSuccess();
        // Speak the letter clearly using the professional asset
        speak(guide.char.toLowerCase());
        setTimeout(() => speak(t('tracing.successMessage')), 1200);
        showFeedback({ type: 'success', message: t('tracing.greatTracing'), emoji: '🎨' });
        setTimeout(nextLevel, 3000);
    }, [done, displayChar, nextLevel, playSuccess, recordSuccess, showFeedback, speak, t]);

    const panResponder = useMemo(() => 
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isBusy,
            onMoveShouldSetPanResponder: () => !isBusy,
            onPanResponderGrant: (evt) => {
                if (done || isBusy) return;
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(`M${locationX},${locationY}`);
                
                // Update checkpoints on start
                const newlyVisited = updateCheckpoints(checkpointsRef.current, { x: locationX - offset, y: locationY - offset }, 30);
                if (newlyVisited > 0) {
                    setCheckpoints([...checkpointsRef.current]);
                    Haptics.selectionAsync();
                }
            },
            onPanResponderMove: (evt) => {
                if (done || isBusy) return;
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPath(prev => prev + ` L${locationX},${locationY}`);

                // Real-time progress check
                const newlyVisited = updateCheckpoints(checkpointsRef.current, { x: locationX - offset, y: locationY - offset }, 30);
                if (newlyVisited > 0) {
                    setCheckpoints([...checkpointsRef.current]);
                    Haptics.selectionAsync();

                    // Check if finished
                    const result = checkTracingProgress(checkpointsRef.current);
                    if (result.isValid) {
                        handleSuccess();
                    }
                }
            },
            onPanResponderRelease: () => {
                if (done || isBusy) return;
                setCurrentPath('');
                // If they release but haven't finished, we keep their progress on screen
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
                    <View style={styles.drawLayer} {...panResponder.panHandlers}>
                        <Svg
                            height={CANVAS_SIZE}
                            width={CANVAS_SIZE}
                            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                            style={{ overflow: 'visible' }}
                            pointerEvents="none"
                        >
                            <G transform={`translate(${offset}, ${offset})`}>
                                <Defs>
                                    <ClipPath id="roadClip">
                                        <Path d={guideDString} stroke="black" strokeWidth={letterCase === 'lower' ? 65 : 80} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </ClipPath>
                                </Defs>

                                {/* Base guide path - Adjusted stroke for lowercase to prevent "blobs" */}
                                <Path
                                    d={guideDString}
                                    stroke="#e0e7ff"
                                    strokeWidth={letterCase === 'lower' ? 48 : 65}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <Path
                                    d={guideDString}
                                    stroke="#a5b4fc"
                                    strokeWidth={4}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="12,8"
                                />

                                {/* Progress feedback */}
                                {checkpoints.map((cp, i) => cp.visited && (
                                    <Circle
                                        key={i}
                                        cx={cp.point.x}
                                        cy={cp.point.y}
                                        r={letterCase === 'lower' ? 18 : 22}
                                        fill={colors.accentPrimary}
                                    />
                                ))}
                            </G>

                            {/* Indicators */}
                            <Circle cx={startDot.x} cy={startDot.y} r={16} fill="#22c55e" />
                            <Circle cx={startDot.x} cy={startDot.y} r={8} fill="#fff" />
                        </Svg>
                    </View>
                </View>

                <View style={[styles.hintContainer, feedback?.type === 'success' && styles.successHint]}>
                    <Text style={styles.hintText}>
                        {feedback ? `${feedback.emoji} ${feedback.message}` : `👆 ${t('tracing.startGreen')}`}
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
    hintContainer: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, backgroundColor: '#f0fdf4', borderRadius: 20, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#bbf7d0', minHeight: 60, justifyContent: 'center' },
    successHint: { backgroundColor: '#dcfce7', borderColor: '#4ade80' },
    hintText: { fontSize: fontSize.lg, color: '#166534', fontWeight: 'bold', textAlign: 'center' },
    footer: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'center' },
    buttonWrapper: { width: '50%' },
});

