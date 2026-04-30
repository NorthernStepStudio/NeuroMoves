import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Svg, Rect, Path, Defs, Mask, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// --- Camera Permission View ---
interface CameraPermissionViewProps {
    onRequestPermission: () => void;
}

export const CameraPermissionView: React.FC<CameraPermissionViewProps> = ({ onRequestPermission }) => {
    return (
        <View style={styles.permissionContainer}>
            <Text style={styles.permissionEmoji}>📸 🎙️</Text>
            <Text style={styles.permissionTitle}>Camera & Mic Access</Text>
            <Text style={styles.permissionText}>
                We need to see your hands and hear you to check if you're doing the sign correctly!
            </Text>
            <Text style={styles.privacyNote}>
                🔒 PRIVACY NOTICE: Your video and audio are processed 100% on-device. Nothing is ever saved or sent to the cloud.
            </Text>
            <Pressable onPress={onRequestPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Allow Access</Text>
            </Pressable>
        </View>
    );
};

// --- Camera Overlay ---
interface CameraOverlayProps {
    status: 'searching' | 'detected' | 'success';
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ status }) => {
    // Determine border color based on status
    const borderColor = status === 'success' ? '#22c55e' :
        status === 'detected' ? '#eab308' :
            'rgba(255, 255, 255, 0.5)';

    const strokeWidth = status === 'success' ? 8 : 4;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
                {/* Simple frame guide */}
                <Rect
                    x="15%"
                    y="20%"
                    width="70%"
                    height="50%"
                    rx="20"
                    stroke={borderColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={status === 'searching' ? "10, 10" : undefined}
                />

                {/* Hand silhouette hint (simplified) */}
                {status === 'searching' && (
                    <Path
                        d={`M${width / 2} ${height / 2} L${width / 2} ${height / 2 - 50}`} // Placeholder path
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="5"
                    />
                )}
            </Svg>

            {status === 'success' && (
                <View style={styles.successBadge}>
                    <Text style={styles.successEmoji}>✨</Text>
                    <Text style={styles.successText}>Great Job!</Text>
                </View>
            )}
        </View>
    );
};

// --- Real Sign Display (Placeholder for Video) ---
interface RealSignDisplayProps {
    signName: string;
    onStartPractice: () => void;
}

export const RealSignDisplay: React.FC<RealSignDisplayProps> = ({ signName, onStartPractice }) => {
    return (
        <View style={styles.videoContainer}>
            <View style={styles.placeholderVideo}>
                <Text style={styles.videoEmoji}>👐</Text>
                <Text style={styles.videoText}>Watch the sign for "{signName}"</Text>
                {/* This would be an actual <Video> component later */}
            </View>

            <Pressable onPress={onStartPractice} style={styles.practiceButton}>
                <Text style={styles.practiceButtonText}>Try it myself! 📸</Text>
            </Pressable>
        </View>
    );
};


const styles = StyleSheet.create({
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.bgPrimary,
    },
    permissionEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xs,
        lineHeight: 24,
    },
    privacyNote: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    permissionButton: {
        backgroundColor: colors.accentPrimary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: borderRadius.full,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },

    // Overlay
    successBadge: {
        position: 'absolute',
        top: '10%',
        alignSelf: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    successEmoji: {
        fontSize: 24,
    },
    successText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },

    // Video Display
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    placeholderVideo: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    videoEmoji: {
        fontSize: 48,
        marginBottom: spacing.sm,
    },
    videoText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    practiceButton: {
        backgroundColor: colors.accentPrimary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: borderRadius.full,
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    practiceButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },

    // Record Button
    recordButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    recordButtonInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#ef4444',
    },
    recordingActive: {
        backgroundColor: '#ef4444',
        width: 30,
        height: 30,
        borderRadius: 4, // Square when recording
    },
});

// --- Record Button ---
interface RecordButtonProps {
    isRecording: boolean;
    onToggle: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onToggle }) => {
    return (
        <Pressable onPress={onToggle} style={styles.recordButton}>
            <View style={[styles.recordButtonInner, isRecording && styles.recordingActive]} />
        </Pressable>
    );
};
