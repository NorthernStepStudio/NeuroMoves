
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Pressable,
    ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../core/GameContext';
import { colors, spacing, borderRadius, fontSize, shadows } from '../theme/colors';

const { width } = Dimensions.get('window');

interface GameHeaderProps {
    title: string;
    showLevel?: boolean;
    showScore?: boolean;
}

import { useTranslation } from 'react-i18next';

/**
 * Game header component showing title, level, and score
 */
export function GameHeader({ title, showLevel = true, showScore = true }: GameHeaderProps) {
    const { gameState } = useGame();
    const { t } = useTranslation();

    return (
        <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <View style={styles.statsContainer}>
                {showLevel && (
                    <View style={styles.statBadge}>
                        <Text style={styles.statLabel}>{t('game.level', { defaultValue: 'Level' })}</Text>
                        <Text style={styles.statValue}>{gameState.level}</Text>
                    </View>
                )}

                {showScore && (
                    <View style={styles.statBadge}>
                        <Text style={styles.statLabel}>{t('game.score', { defaultValue: 'Score' })}</Text>
                        <Text style={styles.statValue}>{gameState.score}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

/**
 * Shared Control Header for all games
 */
interface GameControlHeaderProps {
    onExit: () => void;
    onResetLevel?: () => void;
    onRestartGame?: () => void;
    showParentControls?: boolean;
    forceShowControls?: boolean;
}

export function GameControlHeader({
    onExit,
    onResetLevel,
    onRestartGame,
    showParentControls = true,
    forceShowControls = false
}: GameControlHeaderProps) {
    const { settings } = useGame();
    const isParentMode = (settings?.parentModeEnabled && showParentControls) || forceShowControls;

    return (
        <View style={styles.topControls}>
            <Pressable onPress={onExit} style={[styles.iconButton, styles.exitButton]}>
                <MaterialCommunityIcons name="keyboard-backspace" size={24} color={colors.textSecondary} />
            </Pressable>

            <View style={{ flex: 1 }} />

            {isParentMode && (
                <View style={styles.actionButtons}>
                    {onResetLevel && (
                        <Pressable onPress={onResetLevel} style={styles.iconButton} accessibilityLabel="Reset Level">
                            <MaterialCommunityIcons name="refresh" size={24} color={colors.accentPrimary} />
                        </Pressable>
                    )}
                    <View style={{ width: spacing.sm }} />
                    {onRestartGame && (
                        <Pressable
                            onPress={onRestartGame}
                            style={[styles.iconButton, { backgroundColor: colors.error + '15' }]}
                            accessibilityLabel="Restart Game"
                        >
                            <MaterialCommunityIcons name="replay" size={24} color={colors.error} />
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

interface GameInstructionProps {
    text: string;
    subtext?: string;
}

/**
 * Instruction display with optional subtext
 */
export function GameInstruction({ text, subtext }: GameInstructionProps) {
    return (
        <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>{text}</Text>
            {subtext && <Text style={styles.instructionSubtext}>{subtext}</Text>}
        </View>
    );
}

// ... (previous code)

interface FeedbackOverlayProps {
    visible: boolean;
    type: 'success' | 'error' | 'hint';
    message: string;
    emoji?: string;
    compact?: boolean;
    position?: 'center' | 'top' | 'bottom';
    confetti?: boolean;
    topOffset?: number;
}

import { Easing } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const UNIT = SCREEN_HEIGHT / 10;
const CONFETTI_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

function ConfettiParticle({ delay }: { delay: number }) {
    const anim = React.useRef(new Animated.Value(0)).current;

    // Geometry: 3 Units UP, 10 Units DOWN (Scaled for visual comfort)
    // Rise: 150px (3 units)
    // Fall: 500px (10 units) from Peak
    // Relative End Position: -Rise + Fall = -150 + 500 = +350.

    const riseY = -150;
    const endY = 350;

    const randomX = React.useRef(Math.random() * 400 - 200).current;

    // Varied rise slightly for natural look? No, user wants box accuracy.
    // Let's keep strict vertical physics, maybe slight variance in angle is X.

    const rotation = React.useRef(Math.random() * 360).current;
    const color = React.useRef(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
                toValue: 1,
                duration: 2000, // Speed up to ensure finish before level change (2500ms)
                useNativeDriver: true,
                easing: Easing.linear,
            })
        ]).start();
    }, []);

    // Physics Simulation via Interpolation
    // Smoothing the peak to create a "Curved" arc with zero-velocity turn.
    // By gradualizing the steps around the peak (0.3), we simulate gravity deceleration/acceleration.
    const translateY = anim.interpolate({
        inputRange: [0, 0.2, 0.25, 0.30, 0.35, 0.4, 1],
        outputRange: [0, -110, -135, -150, -135, -110, 500]
    });

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, randomX]
    });

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [`${rotation}deg`, `${rotation + 720}deg`]
    });

    const opacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1] // No fade out, stay valid until unmount
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                width: 10,
                height: 10,
                backgroundColor: color,
                borderRadius: 2,
                opacity,
                transform: [
                    { translateX },
                    { translateY },
                    { rotate },
                    { rotateX: rotate }, // 3D tumble
                ]
            }}
        />
    );
}

export function FeedbackOverlay({
    visible,
    type,
    message,
    emoji,
    compact = false,
    position = 'center',
    confetti = false,
    transparent = false,
    verticalPos, // Optional 0-1 float for vertical positioning (0 = Top, 1 = Bottom)
    topOffset,
}: FeedbackOverlayProps & { transparent?: boolean, verticalPos?: number, topOffset?: number }) {
    const opacity = React.useRef(new Animated.Value(0)).current;
    const scale = React.useRef(new Animated.Value(0.8)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const bgColor = 'transparent';
    // When transparent, use a visible text color (Accent Primary), otherwise White
    // Use semantic colors for text when background is gone
    const textColor = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.accentPrimary;

    const isTop = position === 'top';
    const isBottom = position === 'bottom';

    // Custom vertical positioning style removed to honor Center alignment

    return (
        <Animated.View
            style={[
                styles.feedbackOverlay,
                { opacity, backgroundColor: compact ? 'transparent' : bgColor },
                isTop && (topOffset !== undefined ? { paddingTop: topOffset, justifyContent: 'flex-start' } : styles.feedbackTop),
                isBottom && styles.feedbackBottom,
            ]}
            pointerEvents="none"
        >
            {/* Confetti Layer - Behind Content */}
            {confetti && type === 'success' && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        {Array.from({ length: 40 }).map((_, i) => (
                            <ConfettiParticle key={i} delay={i * 5} />
                        ))}
                    </View>
                </View>
            )}

            <Animated.View
                style={[
                    compact ? styles.compactContent : styles.centerContent,
                    (isTop || isBottom) && { flex: 0 },
                    compact && { backgroundColor: bgColor },
                    { transform: [{ scale }] }
                ]}
            >
                {emoji && (
                    <Text style={[compact ? styles.compactEmoji : styles.feedbackEmoji, { color: textColor }]}>
                        {emoji}
                    </Text>
                )}
                <Text style={[
                    compact ? styles.compactMessage : styles.feedbackMessage,
                    { color: textColor },
                    transparent && { textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 10 } // Subtle glow
                ]}>
                    {message}
                </Text>
            </Animated.View>
        </Animated.View>
    );
}

/**
 * Animated button for game actions
 */
interface GameButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    icon?: string;
}

export function GameButton({ title, onPress, variant = 'primary', disabled, icon }: GameButtonProps) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                style={[
                    styles.gameButton,
                    variant === 'secondary' && styles.gameButtonSecondary,
                    variant === 'danger' && styles.gameButtonDanger,
                    disabled && styles.gameButtonDisabled,
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                    if (!disabled) onPress();
                }}
            >
                {icon && (
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={20}
                        color={variant === 'secondary' ? colors.accentSecondary : '#fff'}
                        style={{ marginRight: spacing.xs }}
                    />
                )}
                <Text
                    style={[
                        styles.gameButtonText,
                        variant === 'secondary' && styles.gameButtonTextSecondary,
                    ]}
                >
                    {title}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        marginHorizontal: spacing.md,
        marginTop: spacing.xs,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.sm,
    },
    titleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
        alignItems: 'center',
        minWidth: 50,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    statLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.accentPrimary,
    },
    instructionContainer: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    instructionText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    instructionSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'center',
        fontWeight: '500',
    },
    feedbackOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    feedbackTop: {
        justifyContent: 'flex-start',
        paddingTop: 80,
    },
    feedbackBottom: {
        justifyContent: 'flex-end',
        paddingBottom: 80,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 30,
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    compactEmoji: {
        fontSize: 32,
    },
    compactMessage: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    feedbackEmoji: {
        fontSize: 72,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    feedbackMessage: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    gameButton: {
        backgroundColor: colors.accentPrimary,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
    },
    gameButtonSecondary: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: colors.accentSoft,
        shadowOpacity: 0.1,
    },
    gameButtonDanger: {
        backgroundColor: colors.error,
        shadowColor: colors.error,
    },
    gameButtonDisabled: {
        opacity: 0.5,
    },
    gameButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    gameButtonTextSecondary: {
        color: colors.accentSecondary,
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
        zIndex: 50,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        backgroundColor: '#fff',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.sm,
    },
    exitButton: {
        backgroundColor: colors.bgTertiary,
    }
});
