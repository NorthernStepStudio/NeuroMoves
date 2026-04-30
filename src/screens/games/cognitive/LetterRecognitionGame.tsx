import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    Animated,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min((width - spacing.lg * 3) / 2, 160);

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');

const OPTION_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function LetterRecognitionGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);
    const [letterCase, setLetterCase] = useState<'upper' | 'lower'>('upper');

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'letter-recognition') {
                startGame('letter-recognition');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `letter-recog-${level}-${restartKey}-${letterCase}`;

    return (
        <LetterRecognitionInner
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

function LetterRecognitionInner({ onResetLevel, onRestartGame, letterCase, setLetterCase }: InnerProps) {
    const navigation = useNavigation();
    const {
        gameState, nextLevel, recordSuccess, showFeedback, feedback,
        playSuccess, playError, speak
    } = useGame();
    const { t } = useTranslation();

    const level = Math.max(gameState.level, 1);
    const allLetters = letterCase === 'upper' ? UPPER : LOWER;
    const targetLetter = allLetters[(level - 1) % allLetters.length];
    const [answered, setAnswered] = useState(false);

    // Generate 4 options including the target
    const options = useMemo(() => {
        const others = allLetters.filter(l => l !== targetLetter);
        const distractors = shuffle(others).slice(0, 3);
        return shuffle([targetLetter, ...distractors]);
    }, [targetLetter, allLetters]);

    // Speak the target letter on mount
    const hasSpoken = useRef(false);
    React.useEffect(() => {
        if (!hasSpoken.current) {
            hasSpoken.current = true;
            const timer = setTimeout(() => speak(t('letterRecognition.instruction', { letter: targetLetter.toLowerCase() })), 400);
            return () => clearTimeout(timer);
        }
    }, [targetLetter, speak, t]);

    const handleChoice = (chosen: string) => {
        if (answered) return;

        if (chosen === targetLetter) {
            setAnswered(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSuccess();
            recordSuccess();
            speak(targetLetter.toLowerCase());
            setTimeout(() => speak(t('letterRecognition.successMessage', { letter: targetLetter.toLowerCase() })), 500);
            showFeedback({ type: 'success', message: `${targetLetter} ✓`, emoji: '🌟' });
            setTimeout(nextLevel, 2500);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playError();
            speak(t('letterRecognition.tryAgain').replace('!', ''));
            showFeedback({ type: 'error', message: t('letterRecognition.tryAgain'), emoji: '🤔' });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
            />
            <GameHeader title={t('letterRecognition.title')} />
            <View style={styles.content}>
                <View style={styles.settingsBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.settingGroup}>
                            <Text style={styles.settingLabel}>{t('letterRecognition.case')}:</Text>
                            <Pressable style={[styles.settingBtn, letterCase === 'upper' && styles.activeBtn]} onPress={() => setLetterCase('upper')}>
                                <Text style={[styles.btnText, letterCase === 'upper' && styles.activeText]}>ABC</Text>
                            </Pressable>
                            <Pressable style={[styles.settingBtn, letterCase === 'lower' && styles.activeBtn]} onPress={() => setLetterCase('lower')}>
                                <Text style={[styles.btnText, letterCase === 'lower' && styles.activeText]}>abc</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>

                <GameInstruction text={t('letterRecognition.instruction', { letter: targetLetter })} />

                {/* Prompt display */}
                <View style={styles.promptCard}>
                    <Text style={styles.promptText}>{targetLetter}</Text>
                </View>

                {/* Options grid */}
                <View style={styles.optionsGrid}>
                    {options.map((letter, index) => (
                        <Pressable
                            key={`${letter}-${index}`}
                            onPress={() => handleChoice(letter)}
                            style={({ pressed }) => [
                                styles.optionCard,
                                { borderColor: OPTION_COLORS[index % OPTION_COLORS.length] },
                                pressed && styles.optionPressed,
                            ]}
                            accessibilityLabel={`Choose letter ${letter}`}
                        >
                            <Text style={[styles.optionText, { color: OPTION_COLORS[index % OPTION_COLORS.length] }]}>
                                {letter}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.hintText}>{t('letterRecognition.hint')}</Text>
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
    promptCard: {
        width: 120, height: 120, borderRadius: 24, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', marginVertical: spacing.md,
        borderWidth: 4, borderColor: colors.accentPrimary,
        elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    },
    promptText: { fontSize: 64, fontWeight: 'bold', color: colors.accentPrimary },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
    optionCard: {
        width: CARD_SIZE, height: CARD_SIZE, borderRadius: 24, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4,
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    },
    optionPressed: { transform: [{ scale: 0.95 }], opacity: 0.8 },
    optionText: { fontSize: CARD_SIZE * 0.5, fontWeight: 'bold' },
    hintText: { marginTop: spacing.lg, fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
});
