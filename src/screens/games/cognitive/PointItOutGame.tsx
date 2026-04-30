import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    GameHeader,
    GameInstruction,
    FeedbackOverlay,
    GameButton,
    GameControlHeader
} from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius, fontSize } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { SpeechRecognitionService } from '../../../services/SpeechRecognitionService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface HiddenObject {
    id: string;
    name: string;
    emoji: string;
    voiceFile: string;
    x: number; // percentage from left (CENTER)
    y: number; // percentage from top (CENTER)
    width: number; // hit-zone width percentage
    height: number; // hit-zone height percentage
    found: boolean;
}

interface LevelConfig {
    scene: string;
    sceneEmoji: string;
    backgroundImage: any;
    objects: HiddenObject[];
}

const LEVELS: LevelConfig[] = [
    {
        scene: 'Living Room',
        sceneEmoji: '🛋️',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/living_room_full.png'),
        objects: [
            { id: 'lr_car', name: 'red car', emoji: '🚗', voiceFile: 'find_red_car.mp3', x: 24, y: 85, width: 22, height: 14, found: false },
            { id: 'lr_teddy', name: 'teddy bear', emoji: '🧸', voiceFile: 'find_teddy_bear.mp3', x: 54, y: 51, width: 20, height: 30, found: false },
            { id: 'lr_apple', name: 'green apple', emoji: '🍏', voiceFile: 'find_green_apple.mp3', x: 28, y: 24, width: 8, height: 12, found: false },
            { id: 'lr_ball', name: 'red ball', emoji: '⚽', voiceFile: 'find_red_ball.mp3', x: 81, y: 84, width: 16, height: 16, found: false },
            { id: 'lr_book', name: 'blue book', emoji: '📘', voiceFile: 'find_blue_book.mp3', x: 81, y: 37, width: 6, height: 13, found: false },
        ],
    },
    {
        scene: 'Kitchen',
        sceneEmoji: '🍳',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/kitchen_full.png'),
        objects: [
            { id: 'k_banana', name: 'yellow banana', emoji: '🍌', voiceFile: 'find_yellow_banana.mp3', x: 13, y: 57, width: 20, height: 15, found: false },
            { id: 'k_cup', name: 'blue cup', emoji: '🥤', voiceFile: 'find_blue_cup.mp3', x: 27, y: 42, width: 10, height: 12, found: false },
            { id: 'k_spoon', name: 'white spoon', emoji: '🥄', voiceFile: 'find_white_spoon.mp3', x: 68, y: 72, width: 18, height: 8, found: false },
            { id: 'k_jar', name: 'cookie jar', emoji: '🍪', voiceFile: 'find_cookie_jar.mp3', x: 64, y: 16, width: 15, height: 20, found: false },
        ],
    },
    {
        scene: 'Bedroom',
        sceneEmoji: '🛏️',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/bedroom_full.png'),
        objects: [
            { id: 'b_robot', name: 'toy robot', emoji: '🤖', voiceFile: 'find_toy_robot.mp3', x: 25, y: 73, width: 22, height: 30, found: false },
            { id: 'b_flashlight', name: 'flashlight', emoji: '🔦', voiceFile: 'find_flashlight.mp3', x: 21, y: 47, width: 15, height: 10, found: false },
            { id: 'b_slippers', name: 'slippers', emoji: '👟', voiceFile: 'find_slippers.mp3', x: 58, y: 80, width: 25, height: 15, found: false },
            { id: 'b_pillow', name: 'star pillow', emoji: '⭐', voiceFile: 'find_star_pillow.mp3', x: 50, y: 39, width: 18, height: 18, found: false },
        ],
    },
    {
        scene: 'Playroom',
        sceneEmoji: '🎨',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/playroom_full.png'),
        objects: [
            { id: 'p_block', name: 'purple block', emoji: '🧱', voiceFile: 'find_purple_block.mp3', x: 28, y: 75, width: 25, height: 22, found: false },
            { id: 'p_airplane', name: 'toy airplane', emoji: '✈️', voiceFile: 'find_toy_airplane.mp3', x: 71, y: 37, width: 20, height: 12, found: false },
            { id: 'p_top', name: 'spinning top', emoji: '🌀', voiceFile: 'find_spinning_top.mp3', x: 84, y: 62, width: 15, height: 15, found: false },
            { id: 'p_ball', name: 'colorful ball', emoji: '🏐', voiceFile: 'find_colorful_ball.mp3', x: 8, y: 57, width: 15, height: 15, found: false },
        ],
    },
    {
        scene: 'Garden',
        sceneEmoji: '🌻',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/garden_full.png'),
        objects: [
            { id: 'g_watering_can', name: 'watering can', emoji: '🚿', voiceFile: 'find_watering_can.mp3', x: 15, y: 65, width: 25, height: 18, found: false },
            { id: 'g_trowel', name: 'garden trowel', emoji: '⛏️', voiceFile: 'find_garden_trowel.mp3', x: 78, y: 47, width: 18, height: 10, found: false },
            { id: 'g_ladybug', name: 'ladybug', emoji: '🐞', voiceFile: 'find_ladybug.mp3', x: 75, y: 60, width: 12, height: 12, found: false },
            { id: 'g_hat', name: 'sun hat', emoji: '👒', voiceFile: 'find_sun_hat.mp3', x: 64, y: 75, width: 20, height: 18, found: false },
        ],
    },
    {
        scene: 'Bathroom',
        sceneEmoji: '🛁',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/bathroom_full.png'),
        objects: [
            { id: 'bath_duck', name: 'yellow duck', emoji: '🦆', voiceFile: 'find_yellow_duck.mp3', x: 13, y: 60, width: 15, height: 15, found: false },
            { id: 'bath_brush', name: 'blue toothbrush', emoji: '🪥', voiceFile: 'find_blue_toothbrush.mp3', x: 52, y: 39, width: 10, height: 15, found: false },
            { id: 'bath_shampoo', name: 'green shampoo', emoji: '🧴', voiceFile: 'find_green_shampoo.mp3', x: 41, y: 17, width: 10, height: 18, found: false },
            { id: 'bath_towel', name: 'blue towel', emoji: '🧣', voiceFile: 'find_blue_towel.mp3', x: 86, y: 62, width: 20, height: 25, found: false },
        ],
    },
    {
        scene: 'Garage',
        sceneEmoji: '🚗',
        backgroundImage: require('../../../../assets/images/games/point_it_out/backgrounds/garage_full.png'),
        objects: [
            { id: 'gar_bike', name: 'red bicycle', emoji: '🚲', voiceFile: 'find_red_bicycle.mp3', x: 16, y: 70, width: 30, height: 40, found: false },
            { id: 'gar_tools', name: 'blue toolbox', emoji: '🧰', voiceFile: 'find_blue_toolbox.mp3', x: 45, y: 42, width: 18, height: 20, found: false },
            { id: 'gar_ball', name: 'soccer ball', emoji: '⚽', voiceFile: 'find_soccer_ball.mp3', x: 58, y: 84, width: 15, height: 15, found: false },
            { id: 'gar_box', name: 'cardboard box', emoji: '📦', voiceFile: 'find_cardboard_box.mp3', x: 78, y: 79, width: 25, height: 28, found: false },
        ],
    },
];

export default function PointItOutGame() {
    const { gameState, resetCurrentGameProgress } = useGame();
    const [restartKey, setRestartKey] = useState(0);

    const level = Math.max(gameState.level, 1);
    // Remove individual level key to allow smooth state-based transition
    const gameKey = `point-it-out-${restartKey}`;

    const handleRestartGame = useCallback(async () => {
        await resetCurrentGameProgress();
        setRestartKey(k => k + 1);
    }, [resetCurrentGameProgress]);

    const handleResetLevel = useCallback(() => {
        setRestartKey(k => k + 1);
    }, []);

    return (
        <PointItOutGameInner
            key={gameKey}
            onRestartGame={handleRestartGame}
            onResetLevel={handleResetLevel}
        />
    );
}

interface InnerProps {
    onRestartGame: () => void;
    onResetLevel: () => void;
}

function PointItOutGameInner({ onRestartGame, onResetLevel }: InnerProps) {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, showFeedback, feedback, playSuccess, settings, speak, isBusy, lockInput } = useGame();
    const { t } = useTranslation();

    const [objects, setObjects] = useState<HiddenObject[]>([]);
    const [currentTarget, setCurrentTarget] = useState<HiddenObject | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const hintPulse = useRef(new Animated.Value(0)).current;

    // Get level config
    const getLevelConfig = useCallback((): LevelConfig => {
        // Use all available levels, looping back to start if needed
        const normalizedLevel = (gameState.level - 1) % LEVELS.length;
        return LEVELS[normalizedLevel];
    }, [gameState.level]);

    // Initialize level
    useEffect(() => {
        const config = getLevelConfig();
        const shuffledObjects = [...config.objects]
            .map(obj => ({ ...obj, found: false }))
            .sort(() => Math.random() - 0.5);

        setObjects(shuffledObjects);
        setCurrentTarget(shuffledObjects[0] || null);
        setShowHint(false);
    }, [gameState.level, getLevelConfig]);

    // Speak target when it changes
    useEffect(() => {
        if (currentTarget) {
            speak(t('pointItOut.findCommand', { object: t(`pointItOut.objects.${currentTarget.id}`) }));
        }
    }, [currentTarget, speak, t]);

    // Pulse animation for hint
    useEffect(() => {
        if (showHint && currentTarget) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(hintPulse, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(hintPulse, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            hintPulse.setValue(0);
        }
    }, [showHint, currentTarget, hintPulse]);

    const handleObjectFound = useCallback((obj: HiddenObject) => {
        lockInput(1300); // Lock for feedback
        recordSuccess();
        playSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newObjects = objects.map(o => o.id === obj.id ? { ...o, found: true } : o);
        setObjects(newObjects);

        const remainingObjects = newObjects.filter(o => !o.found);

        if (remainingObjects.length === 0) {
            showFeedback({
                type: 'success',
                message: t('pointItOut.allFound'),
                emoji: '🎉',
            });

            setTimeout(() => {
                nextLevel();
            }, 1200);
        } else {
            const nextT = remainingObjects[Math.floor(Math.random() * remainingObjects.length)];
            setCurrentTarget(nextT);

            showFeedback({
                type: 'success',
                message: t('pointItOut.foundIt'),
                emoji: '✨',
            }, 800);
        }

        setShowHint(false);
    }, [objects, lockInput, recordSuccess, playSuccess, nextLevel, showFeedback, t]);

    const handleObjectTap = useCallback((obj: HiddenObject) => {
        if (obj.found || isBusy) return;

        if (currentTarget && obj.id === currentTarget.id) {
            handleObjectFound(obj);
        }
    }, [currentTarget, isBusy, handleObjectFound]);

    const toggleSpeech = useCallback(async () => {
        if (isListening) {
            await SpeechRecognitionService.stopListening();
            setIsListening(false);
        } else {
            const hasPermission = await SpeechRecognitionService.requestPermissions();
            if (hasPermission) {
                setIsListening(true);
                await SpeechRecognitionService.startListening((result) => {
                    if (currentTarget && SpeechRecognitionService.isMatch(result.text, currentTarget.name)) {
                        handleObjectFound(currentTarget);
                        SpeechRecognitionService.stopListening();
                        setIsListening(false);
                    }
                });
            }
        }
    }, [isListening, currentTarget, handleObjectFound]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowHint(true);
        }, 8000);

        return () => clearTimeout(timer);
    }, [currentTarget]);

    const levelConfig = getLevelConfig();
    const foundCount = objects.filter(o => o.found).length;

    const hintScale = hintPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.3],
    });

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameControlHeader
                onExit={() => navigation.goBack()}
                onResetLevel={onResetLevel}
                onRestartGame={onRestartGame}
                forceShowControls={true}
            />

            <GameInstruction
                text={currentTarget ? t('pointItOut.instruction', { object: t(`pointItOut.objects.${currentTarget.id}`), emoji: currentTarget.emoji }) : 'Loading...'}
                subtext={`${t('pointItOut.level')} ${gameState.level} • ${foundCount}/${objects.length} ${t('pointItOut.found')}`}
            />

            <View style={styles.debugActions}>
                <Pressable
                    onPress={toggleSpeech}
                    style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                >
                    <MaterialCommunityIcons
                        name={isListening ? "microphone" : "microphone-outline"}
                        size={20}
                        color={isListening ? "#fff" : colors.textPrimary}
                    />
                    <Text style={[styles.voiceText, isListening && { color: '#fff' }]}>
                        {isListening ? t('pointItOut.listening') : t('pointItOut.sayIt')}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => nextLevel()}
                    style={styles.skipButton}
                >
                    <Text style={styles.skipText}>⏭️ {t('pointItOut.skipRoom')}</Text>
                </Pressable>
            </View>

            <ImageBackground
                source={levelConfig.backgroundImage}
                style={styles.sceneContainer}
                imageStyle={{ borderRadius: 24 }}
                resizeMode="stretch"
            >
                <View style={styles.sceneHeader}>
                    <Text style={styles.sceneEmoji}>{levelConfig.sceneEmoji}</Text>
                    <Text style={styles.sceneName}>{t(`pointItOut.scenes.${levelConfig.scene.replace(' ', '')}`)}</Text>
                </View>

                {objects.map((obj) => {
                    const isTarget = currentTarget?.id === obj.id;
                    const showingHintForThis = showHint && isTarget && !obj.found;

                    return (
                        <Pressable
                            key={obj.id}
                            onPress={() => handleObjectTap(obj)}
                            style={[
                                styles.objectContainer,
                                {
                                    left: `${obj.x - obj.width / 2}%`,
                                    top: `${obj.y - obj.height / 2}%`,
                                    width: `${obj.width}%`,
                                    height: `${obj.height}%`,
                                },
                            ]}
                        >
                            {showingHintForThis && (
                                <Animated.View
                                    style={[
                                        styles.hintGlow,
                                        {
                                            width: '120%',
                                            height: '120%',
                                            borderRadius: 20,
                                            transform: [{ scale: hintScale }],
                                        },
                                    ]}
                                />
                            )}

                            {obj.found && (
                                <View style={styles.foundCheck}>
                                    <Text style={styles.checkmark}>✓</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ImageBackground>

            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
                    position="top"
                    topOffset={130}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    sceneContainer: {
        flex: 1,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    sceneHeader: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    sceneEmoji: {
        fontSize: 20,
        marginRight: spacing.xs,
    },
    sceneName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    objectContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor: 'rgba(255,0,0,0.4)', // Debug: disabled
    },
    hintGlow: {
        position: 'absolute',
        backgroundColor: 'rgba(254, 225, 64, 0.4)',
    },
    foundCheck: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    checkmark: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    debugActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        backgroundColor: colors.bgSecondary,
    },
    skipButton: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    skipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    voiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginRight: spacing.sm,
    },
    voiceButtonActive: {
        backgroundColor: colors.accentPrimary,
        borderColor: colors.accentPrimary,
    },
    voiceText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
});
