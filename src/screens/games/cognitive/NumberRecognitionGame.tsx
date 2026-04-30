import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
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
import { colors, spacing, fontSize } from '../../../theme/colors';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min((width - spacing.lg * 3) / 2, 160);

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const OPTION_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function NumberRecognitionGame() {
    const { gameState, startGame, currentGameId, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (currentGameId !== 'number-recognition') {
                startGame('number-recognition');
            }
        }, [startGame, currentGameId])
    );

    const level = Math.max(gameState.level, 1);
    const gameKey = `number-recog-${level}-${restartKey}`;

    return (
        <NumberRecognitionInner
            key={gameKey}
            onResetLevel={() => setRestartKey(k => k + 1)}
            onRestartGame={async () => { await resetCurrentGameProgress(); setRestartKey(k => k + 1); }}
        />
    );
}

function NumberRecognitionInner({ onResetLevel, onRestartGame }: { onResetLevel: () => void; onRestartGame: () => void }) {
    const navigation = useNavigation();
    const {
        gameState, nextLevel, recordSuccess, showFeedback, feedback,
        playSuccess, playError, speak
    } = useGame();
    const { t } = useTranslation();

    const level = Math.max(gameState.level, 1);
    const targetNum = NUMBERS[(level - 1) % NUMBERS.length];
    const [answered, setAnswered] = useState(false);

    // Generate 4 options including the target
    const options = useMemo(() => {
        const others = NUMBERS.filter(n => n !== targetNum);
        const distractors = shuffle(others).slice(0, 3);
        return shuffle([targetNum, ...distractors]);
    }, [targetNum]);

    // Speak the target number on mount
    const hasSpoken = useRef(false);
    React.useEffect(() => {
        if (!hasSpoken.current) {
            hasSpoken.current = true;
            const timer = setTimeout(() => speak(t('numberRecognition.instruction', { number: targetNum })), 400);
            return () => clearTimeout(timer);
        }
    }, [targetNum, speak]);

    const handleChoice = (chosen: string) => {
        if (answered) return;

        if (chosen === targetNum) {
            setAnswered(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSuccess();
            recordSuccess();
            speak(targetNum);
            setTimeout(() => speak(`yes, that's ${targetNum}`), 500);
            showFeedback({ type: 'success', message: `${targetNum} ✓`, emoji: '⭐' });
            setTimeout(nextLevel, 2500);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playError();
            speak(t('numberRecognition.tryAgain').replace('!', ''));
            showFeedback({ type: 'error', message: t('numberRecognition.tryAgain'), emoji: '🤔' });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
            />
            <GameHeader title={t('numberRecognition.title')} />
            <View style={styles.content}>
                <GameInstruction text={t('numberRecognition.instruction', { number: targetNum })} />

                {/* Prompt display */}
                <View style={styles.promptCard}>
                    <Text style={styles.promptText}>{targetNum}</Text>
                </View>

                {/* Options grid */}
                <View style={styles.optionsGrid}>
                    {options.map((num, index) => (
                        <Pressable
                            key={`${num}-${index}`}
                            onPress={() => handleChoice(num)}
                            style={({ pressed }) => [
                                styles.optionCard,
                                { borderColor: OPTION_COLORS[index % OPTION_COLORS.length] },
                                pressed && styles.optionPressed,
                            ]}
                            accessibilityLabel={`Choose number ${num}`}
                        >
                            <Text style={[styles.optionText, { color: OPTION_COLORS[index % OPTION_COLORS.length] }]}>
                                {num}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.hintText}>{t('numberRecognition.hint')}</Text>
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
    promptCard: {
        width: 120, height: 120, borderRadius: 24, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', marginVertical: spacing.md,
        borderWidth: 4, borderColor: colors.teal || colors.accentPrimary,
        elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    },
    promptText: { fontSize: 64, fontWeight: 'bold', color: colors.teal || colors.accentPrimary },
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
