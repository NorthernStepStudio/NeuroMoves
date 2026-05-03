import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GameHeader, GameInstruction, FeedbackOverlay, GameButton } from '../../../components/GameComponents';
import { useGame } from '../../../core/GameContext';
import { colors, spacing, borderRadius } from '../../../theme/colors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface BodyPart {
    id: string;
    name: string;
    x: number; // percentage
    y: number; // percentage
    size: number;
}

// Body diagram positions (front view)
const BODY_PARTS: BodyPart[] = [
    { id: 'head', name: 'head', x: 50, y: 8, size: 50 },
    { id: 'eyes', name: 'eyes', x: 50, y: 7, size: 35 },
    { id: 'nose', name: 'nose', x: 50, y: 10, size: 25 },
    { id: 'mouth', name: 'mouth', x: 50, y: 13, size: 30 },
    { id: 'ears', name: 'ears', x: 50, y: 8, size: 45 },
    { id: 'shoulders', name: 'shoulders', x: 50, y: 22, size: 80 },
    { id: 'arms', name: 'arms', x: 50, y: 35, size: 100 },
    { id: 'hands', name: 'hands', x: 50, y: 50, size: 80 },
    { id: 'tummy', name: 'tummy', x: 50, y: 40, size: 50 },
    { id: 'legs', name: 'legs', x: 50, y: 65, size: 60 },
    { id: 'feet', name: 'feet', x: 50, y: 85, size: 50 },
];

// Simplified touch zones for the body
const TOUCH_ZONES = [
    { id: 'head', name: 'head', x: 50, y: 10, w: 25, h: 15 },
    { id: 'tummy', name: 'tummy', x: 50, y: 40, w: 30, h: 20 },
    { id: 'left-hand', name: 'hands', x: 20, y: 50, w: 15, h: 15 },
    { id: 'right-hand', name: 'hands', x: 80, y: 50, w: 15, h: 15 },
    { id: 'left-foot', name: 'feet', x: 35, y: 88, w: 15, h: 12 },
    { id: 'right-foot', name: 'feet', x: 65, y: 88, w: 15, h: 12 },
];

export default function BodyPartsGame() {
    const navigation = useNavigation();
    const { gameState, nextLevel, recordSuccess, recordError, showFeedback, feedback, playSuccess, playError, isBusy, lockInput } = useGame();
    const { t } = useTranslation();

    const [targetPart, setTargetPart] = useState<string>('head');
    const [roundComplete, setRoundComplete] = useState(false);

    // Get parts for current level
    const getPartsForLevel = useCallback(() => {
        const partNames = ['head', 'tummy', 'hands', 'feet'];
        const numParts = Math.min(1 + Math.floor(gameState.level / 2), partNames.length);
        return partNames.slice(0, numParts);
    }, [gameState.level]);

    // Generate new target
    const generateTarget = useCallback(() => {
        const availableParts = getPartsForLevel();
        const newTarget = availableParts[Math.floor(Math.random() * availableParts.length)];
        setTargetPart(newTarget);
        setRoundComplete(false);
    }, [getPartsForLevel]);

    // Initialize on level change
    useEffect(() => {
        generateTarget();
    }, [gameState.level, generateTarget]);

    // Handle zone tap
    const handleZoneTap = useCallback((zoneName: string) => {
        if (roundComplete || isBusy) return;

        lockInput(1300); // Lock for feedback duration

        if (zoneName === targetPart) {
            setRoundComplete(true);
            recordSuccess();
            playSuccess();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            showFeedback({
                type: 'success',
                message: t('bodyParts.successMessage', { part: t(`bodyParts.parts.${zoneName}`) }),
                emoji: '🎯',
            });

            setTimeout(() => {
                nextLevel();
            }, 1200);
        } else {
            recordError();
            playError();

            showFeedback({
                type: 'hint',
                message: t('bodyParts.hintMessage', { part: t(`bodyParts.parts.${targetPart}`) }),
                emoji: '👆',
            }, 1000);
        }
    }, [targetPart, roundComplete, isBusy, lockInput, recordSuccess, recordError, nextLevel, showFeedback, playSuccess, playError, t]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <GameHeader title={t('bodyParts.title')} />

            <GameInstruction
                text={t('bodyParts.instruction', { part: t(`bodyParts.parts.${targetPart}`) }).toUpperCase()}
                subtext={`${t('bodyParts.level')} ${gameState.level}`}
            />

            <View style={styles.gameArea}>
                {/* Body diagram */}
                <View style={styles.bodyContainer}>
                    {/* Body outline (simplified stick figure) */}
                    <View style={styles.body}>
                        {/* Head */}
                        <View style={styles.headCircle} />

                        {/* Body */}
                        <View style={styles.torso} />

                        {/* Arms */}
                        <View style={styles.armsContainer}>
                            <View style={styles.arm} />
                            <View style={styles.arm} />
                        </View>

                        {/* Legs */}
                        <View style={styles.legsContainer}>
                            <View style={styles.leg} />
                            <View style={styles.leg} />
                        </View>
                    </View>

                    {/* Touch zones */}
                    {TOUCH_ZONES.map((zone) => (
                        <Pressable
                            key={zone.id}
                            onPress={() => handleZoneTap(zone.name)}
                            style={[
                                styles.touchZone,
                                {
                                    left: `${zone.x - zone.w / 2}%`,
                                    top: `${zone.y - zone.h / 2}%`,
                                    width: `${zone.w}%`,
                                    height: `${zone.h}%`,
                                },
                                zone.name === targetPart && styles.touchZoneHighlight,
                            ]}
                        >
                            <Text style={styles.zoneEmoji}>
                                {zone.name === 'head' ? '😊' :
                                    zone.name === 'hands' ? '✋' :
                                        zone.name === 'feet' ? '🦶' :
                                            zone.name === 'tummy' ? '🎯' : ''}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <GameButton
                    title={t('bodyParts.exitGame')}
                    variant="secondary"
                    onPress={() => navigation.goBack()}
                />
            </View>

            {feedback && (
                <FeedbackOverlay
                    visible={!!feedback}
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
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    bodyContainer: {
        width: width * 0.7,
        aspectRatio: 0.5,
        position: 'relative',
    },
    body: {
        flex: 1,
        alignItems: 'center',
    },
    headCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 200, 150, 0.4)',
        borderWidth: 3,
        borderColor: 'rgba(255, 200, 150, 0.8)',
    },
    torso: {
        width: 80,
        height: 120,
        backgroundColor: 'rgba(100, 150, 255, 0.3)',
        borderRadius: 10,
        marginTop: 10,
        borderWidth: 2,
        borderColor: 'rgba(100, 150, 255, 0.6)',
    },
    armsContainer: {
        position: 'absolute',
        top: 80,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    arm: {
        width: 50,
        height: 15,
        backgroundColor: 'rgba(255, 200, 150, 0.3)',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 200, 150, 0.6)',
    },
    legsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 10,
    },
    leg: {
        width: 25,
        height: 100,
        backgroundColor: 'rgba(100, 100, 255, 0.3)',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(100, 100, 255, 0.6)',
    },
    touchZone: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    touchZoneHighlight: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
    },
    zoneEmoji: {
        fontSize: 24,
        opacity: 0.8,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
