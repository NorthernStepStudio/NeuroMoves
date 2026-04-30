import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GameHeader, GameInstruction, FeedbackOverlay, GameButton } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';
import { CameraPermissionView, CameraOverlay, RecordButton } from '../../../components/VisionComponents';
import { useHandDetector } from '../../../core/vision/HandDetector';

const { width } = Dimensions.get('window');

interface SignConfig {
    name: string;
    emoji: string;
    image?: any;
    description: string;
    beats: number[];
}

const SIGNS: SignConfig[] = [
    {
        name: 'more',
        emoji: '👐',
        image: require('../../../../assets/images/sign_more_real.png'),
        description: "Sign for 'more'",
        beats: [500, 1000, 1500]
    },
    { name: 'eat', emoji: '🤌', description: "Sign for 'eat'", beats: [600, 1200, 1800] },
    { name: 'drink', emoji: '🤏', description: "Sign for 'drink'", beats: [500, 1000, 1500, 2000] },
    { name: 'help', emoji: '👍', description: "Sign for 'help'", beats: [700, 1400, 2100] },
    { name: 'thank_you', emoji: '🙏', description: "Sign for 'thank you'", beats: [600, 1200, 1800, 2400] },
];

export default function BabySignsGame() {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError } = useGame();

    const [currentSign, setCurrentSign] = useState<SignConfig>(SIGNS[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [beatIndicators, setBeatIndicators] = useState<boolean[]>([]);
    const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
    const [hits, setHits] = useState(0);
    const [showingFeedback, setShowingFeedback] = useState(false);

    const demoAnimRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Get sign for current level
    const getSignForLevel = useCallback(() => {
        const signIndex = (gameState.level - 1) % SIGNS.length;
        return SIGNS[signIndex];
    }, [gameState.level]);

    // Initialize level
    useEffect(() => {
        const sign = getSignForLevel();
        setCurrentSign(sign);
        setBeatIndicators(new Array(sign.beats.length).fill(false));
        setCurrentBeatIndex(0);
        setHits(0);
        setIsPlaying(false);

        return () => {
            if (demoAnimRef.current) clearInterval(demoAnimRef.current);
        };
    }, [gameState.level, getSignForLevel]);

    // Start demo mode
    const startDemo = useCallback(() => {
        setIsPlaying(true);
        startTimeRef.current = Date.now();
        setCurrentBeatIndex(0);
        setBeatIndicators(new Array(currentSign.beats.length).fill(false));
        setHits(0);

        // Animate the hand emoji to show timing
        let beatIdx = 0;
        const animateBeat = () => {
            if (beatIdx >= currentSign.beats.length) {
                // Demo complete, check results after a delay
                setTimeout(() => {
                    checkResults();
                }, 500);
                return;
            }

            const nextBeat = currentSign.beats[beatIdx];
            const elapsed = Date.now() - startTimeRef.current;
            const delay = Math.max(0, nextBeat - elapsed);

            demoAnimRef.current = setTimeout(() => {
                // Pulse animation
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                ]).start();

                beatIdx++;
                animateBeat();
            }, delay);
        };

        animateBeat();
    }, [currentSign, pulseAnim]);

    // Handle tap during demo
    const handleTap = useCallback(() => {
        if (!isPlaying) {
            startDemo();
            return;
        }

        const tapTime = Date.now() - startTimeRef.current;
        const tolerance = 500; // ms

        // Find if tap matches any unmatched beat
        for (let i = 0; i < currentSign.beats.length; i++) {
            if (beatIndicators[i]) continue; // Already hit

            const beatTime = currentSign.beats[i];
            const diff = Math.abs(tapTime - beatTime);

            if (diff < tolerance) {
                // Hit!
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                setBeatIndicators(prev => {
                    const updated = [...prev];
                    updated[i] = true;
                    return updated;
                });
                setHits(prev => prev + 1);
                break;
            }
        }
    }, [isPlaying, currentSign, beatIndicators, startDemo]);

    // Check results
    const checkResults = useCallback(() => {
        setIsPlaying(false);

        const hitRate = hits / currentSign.beats.length;

        if (hitRate >= 0.5) {
            recordSuccess();
            playSuccess();

            showFeedback({
                type: 'success',
                message: hitRate >= 0.8 ? 'Perfect timing!' : 'Good rhythm!',
                emoji: '🎵',
            });
            setShowingFeedback(true);

            setTimeout(() => {
                setShowingFeedback(false);
                nextLevel();
            }, 1500);
        } else {
            recordError();
            playError();

            showFeedback({
                type: 'hint',
                message: 'Tap along with the beat!',
                emoji: '👆',
            }, 1500);
            setShowingFeedback(true);

            setTimeout(() => {
                setShowingFeedback(false);
            }, 1500);
        }
    }, [hits, currentSign, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError]);

    // Camera Hook
    const { device, hasPermission, requestPermission, CameraComponent, isDetecting, startRecording, stopRecording, isRecording } = useHandDetector();
    const [mode, setMode] = useState<'rhythm' | 'camera'>('rhythm');
    const [cameraStatus, setCameraStatus] = useState<'searching' | 'detected' | 'success'>('searching');

    // Simulate success for camera mode (TEMP testing)
    const handleCameraSuccess = useCallback(() => {
        setCameraStatus('success');
        recordSuccess();
        playSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        showFeedback({
            type: 'success',
            message: 'Perfect sign!',
            emoji: '✨',
        });
        setShowingFeedback(true);

        setTimeout(() => {
            setShowingFeedback(false);
            setCameraStatus('searching');
            nextLevel();
        }, 1500);
    }, [recordSuccess, playSuccess, showFeedback, nextLevel]);

    const renderRhythmMode = () => (
        <View style={styles.gameArea}>
            {/* Sign Display */}
            <Pressable onPress={handleTap} style={styles.signContainer}>
                <Animated.Text
                    style={[
                        styles.signEmoji,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    {currentSign.emoji}
                </Animated.Text>
                <Text style={styles.signName}>{currentSign.name.replace('_', ' ')}</Text>

                {!isPlaying && (
                    <View style={styles.playButton}>
                        <Text style={styles.playButtonText}>▶ TAP TO START</Text>
                    </View>
                )}
            </Pressable>

            {/* Beat Indicators */}
            <View style={styles.beatContainer}>
                {currentSign.beats.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.beatIndicator,
                            beatIndicators[index] && styles.beatIndicatorHit,
                        ]}
                    >
                        <Text style={styles.beatNumber}>{index + 1}</Text>
                    </View>
                ))}
            </View>

            {/* Tap Zone */}
            {isPlaying && (
                <Pressable onPress={handleTap} style={styles.tapZone}>
                    <Text style={styles.tapZoneText}>👆 TAP HERE</Text>
                </Pressable>
            )}
        </View>
    );

    const renderCameraMode = () => {
        if (!hasPermission) {
            return <CameraPermissionView onRequestPermission={requestPermission} />;
        }

        if (!device) {
            return (
                <View style={[styles.gameArea, { justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff' }}>No Camera Device Found</Text>
                </View>
            );
        }

        return (
            <View style={styles.cameraContainer}>
                {/* Real Video / Instruction Header */}
                <View style={styles.cameraHeader}>
                    <Text style={styles.cameraTitle}>Make the sign for "{currentSign.name}"</Text>
                    {currentSign.image ? (
                        <Image source={currentSign.image} style={{ width: 100, height: 100, resizeMode: 'contain' }} />
                    ) : (
                        <Text style={styles.cameraSubtitle}>{currentSign.emoji}</Text>
                    )}

                    <Pressable
                        style={{ position: 'absolute', right: 20, top: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        onPress={() => navigation.navigate('MomentsGallery' as never)}
                    >
                        <Text style={{ fontSize: 24 }}>📹</Text>
                    </Pressable>
                </View>

                {/* Camera View */}
                <View style={styles.cameraFrame}>
                    <CameraComponent
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                    // enableZoomGesture // removed for type safety if using old version
                    />
                    <CameraOverlay status={cameraStatus} />

                    <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center' }}>
                        <RecordButton
                            isRecording={isRecording}
                            onToggle={() => isRecording ? stopRecording() : startRecording()}
                        />
                    </View>

                    {/* Simulated Trigger for Testing without ML */}
                    <Pressable
                        style={styles.simulatedTrigger}
                        onPress={handleCameraSuccess}
                    >
                        <Text style={{ opacity: 0 }}>Debug Hit</Text>
                    </Pressable>
                </View>

                <Text style={styles.cameraHint}>Point the camera at your hands!</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameHeader title="Baby Signs" />

            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
                <Pressable
                    style={[styles.modeButton, mode === 'rhythm' && styles.modeButtonActive]}
                    onPress={() => { setIsPlaying(false); setMode('rhythm'); }}
                >
                    <Text style={[styles.modeText, mode === 'rhythm' && styles.modeTextActive]}>🎵 Rhythm</Text>
                </Pressable>
                <Pressable
                    style={[styles.modeButton, mode === 'camera' && styles.modeButtonActive]}
                    onPress={() => { setIsPlaying(false); setMode('camera'); }}
                >
                    <Text style={[styles.modeText, mode === 'camera' && styles.modeTextActive]}>📸 Camera</Text>
                </Pressable>
            </View>

            {mode === 'rhythm' ? (
                <GameInstruction
                    text={currentSign.description}
                    subtext={isPlaying ? 'Tap along with the rhythm!' : 'Tap to start'}
                />
            ) : null}

            {mode === 'rhythm' ? renderRhythmMode() : renderCameraMode()}

            {/* Back Button */}
            <View style={styles.footer}>
                <GameButton
                    title="Exit Game"
                    variant="secondary"
                    onPress={() => navigation.goBack()}
                />
            </View>

            {/* Feedback Overlay */}
            {feedback && (
                <FeedbackOverlay
                    visible={showingFeedback}
                    type={feedback.type}
                    message={feedback.message}
                    emoji={feedback.emoji}
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
    gameArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    signContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: spacing.xl,
        borderRadius: 30,
        minWidth: 200,
    },
    signEmoji: {
        fontSize: 100,
    },
    signName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.md,
        textTransform: 'capitalize',
    },
    playButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.accentPrimary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    playButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    beatContainer: {
        flexDirection: 'row',
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    beatIndicator: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    beatIndicatorHit: {
        backgroundColor: '#22c55e',
    },
    beatNumber: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    tapZone: {
        marginTop: spacing.xl,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        paddingHorizontal: spacing.xl * 2,
        paddingVertical: spacing.xl,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    tapZoneText: {
        color: '#3b82f6',
        fontWeight: '700',
        fontSize: 18,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    // Camera Mode Styles
    modeSwitcher: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    modeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modeButtonActive: {
        backgroundColor: colors.accentPrimary,
        borderColor: colors.accentPrimary,
    },
    modeText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modeTextActive: {
        color: '#fff',
    },
    cameraContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    cameraHeader: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    cameraTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    cameraSubtitle: {
        fontSize: 32,
    },
    cameraFrame: {
        width: width * 0.8,
        height: width * 1.0, // 4:5 aspect roughly
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: '#000',
        position: 'relative',
    },
    cameraHint: {
        color: colors.textMuted,
        marginTop: spacing.md,
        fontSize: 14,
    },
    simulatedTrigger: {
        ...StyleSheet.absoluteFillObject,
        // Invisible touch area to simulate detection for debugging
    }
});
