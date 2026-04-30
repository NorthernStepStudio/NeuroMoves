import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

export type HapticType =
    | 'success_gentle'
    | 'success_energetic'
    | 'error_buzz'
    | 'calm_pulse'
    | 'level_up'
    | 'tap_light';

export class HapticService {
    /**
     * Play a structured haptic pattern based on the type
     */
    static async trigger(type: HapticType) {
        switch (type) {
            case 'success_gentle':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;

            case 'success_energetic':
                // Double pulse for bigger success
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
                break;

            case 'error_buzz':
                if (Platform.OS === 'android') {
                    Vibration.vibrate([0, 100, 50, 100]);
                } else {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
                break;

            case 'calm_pulse':
                // Soft, rhythmic pulses for sensory regulation
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;

            case 'level_up':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
                setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
                break;

            case 'tap_light':
                await Haptics.selectionAsync();
                break;
        }
    }

    /**
     * Helper for continuous sensory pulses (e.g., during breathing activities)
     */
    static startCalmSequence(intervalMs = 2000) {
        return setInterval(() => {
            this.trigger('calm_pulse');
        }, intervalMs);
    }
}
