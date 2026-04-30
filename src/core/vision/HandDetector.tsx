import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Try to import vision-camera, fall back to mock if unavailable (Expo Go)
let VisionCamera: any = null;
/* 
// Temporarily disabled to fix Worklets mismatch crash in Expo Go
try {
    VisionCamera = require('react-native-vision-camera');
} catch (e) {
    console.warn("Vision Camera not available (expected in Expo Go)");
}
*/

const Camera = VisionCamera?.Camera;
const useCameraDevice = VisionCamera?.useCameraDevice || ((_: any) => null);
const useCameraPermission = VisionCamera?.useCameraPermission || (() => ({ hasPermission: false, requestPermission: async () => false }));
const useMicrophonePermission = VisionCamera?.useMicrophonePermission || (() => ({ hasPermission: false, requestPermission: async () => false }));

const MOMENTS_DIR = ((FileSystem as any).documentDirectory || '') + 'moments/';

export const useHandDetector = () => {
    const isNativeAvailable = !!Camera;

    const { hasPermission: hasCamPermission, requestPermission: requestCamPermission } = useCameraPermission();
    const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

    const device = useCameraDevice('front');
    const cameraRef = useRef<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);

    const checkPermission = useCallback(async () => {
        if (!isNativeAvailable) {
            alert("Camera requires a custom build. Use 'eas build' to create one.");
            return false;
        }
        const cam = await requestCamPermission();
        const mic = await requestMicPermission();
        return cam && mic;
    }, [requestCamPermission, requestMicPermission, isNativeAvailable]);

    const hasPermission = hasCamPermission && hasMicPermission;

    const startRecording = useCallback(() => {
        if (!isNativeAvailable || !cameraRef.current) {
            alert("Recording requires a custom build.");
            return;
        }
        setIsRecording(true);
        try {
            cameraRef.current.startRecording({
                onRecordingFinished: async (video: any) => {
                    console.log("Video captured:", video.path);
                    setIsRecording(false);
                    try {
                        const dirInfo = await FileSystem.getInfoAsync(MOMENTS_DIR);
                        if (!dirInfo.exists) {
                            await FileSystem.makeDirectoryAsync(MOMENTS_DIR, { intermediates: true });
                        }
                        const fileName = `sign_${Date.now()}.mp4`;
                        await FileSystem.moveAsync({ from: video.path, to: MOMENTS_DIR + fileName });
                        console.log("Saved to:", MOMENTS_DIR + fileName);
                    } catch (e) {
                        console.error("Save failed:", e);
                    }
                },
                onRecordingError: (e: any) => {
                    console.error("Recording error:", e);
                    setIsRecording(false);
                },
            });
        } catch (e) {
            console.error("Start recording failed:", e);
            setIsRecording(false);
        }
    }, [isNativeAvailable]);

    const stopRecording = useCallback(async () => {
        if (!isNativeAvailable || !cameraRef.current) return;
        try {
            await cameraRef.current.stopRecording();
        } catch (e) {
            console.error(e);
        }
        setIsRecording(false);
    }, [isNativeAvailable]);

    const CameraComponent = useCallback((props: any) => {
        if (!isNativeAvailable || !device) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.emoji}>📷</Text>
                    <Text style={styles.title}>Camera Unavailable</Text>
                    <Text style={styles.subtitle}>Build custom APK with 'eas build'</Text>
                </View>
            );
        }

        return (
            <Camera
                ref={cameraRef}
                device={device}
                isActive={true}
                video={true}
                audio={true}
                {...props}
            />
        );
    }, [device, isNativeAvailable]);

    return {
        hasPermission,
        requestPermission: checkPermission,
        device,
        isDetecting,
        setIsDetecting,
        CameraComponent,
        startRecording,
        stopRecording,
        isRecording,
    };
};

export const handDetectionProcessor = () => { };

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    emoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#888',
        fontSize: 12,
        marginTop: 8,
    },
});
