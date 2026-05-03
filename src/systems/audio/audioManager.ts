import * as ExpoAudio from 'expo-av';
import * as Haptics from 'expo-haptics';

export class AudioManager {
    static async playAsset(asset: any, volume = 1.0) {
        try {
            const { sound } = await ExpoAudio.Audio.Sound.createAsync(asset, { volume });
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
            return sound;
        } catch (e) {
            console.warn('[AudioManager] Failed to play asset', e);
            return null;
        }
    }

    static async playSuccess(volume = 1.0) {
        try {
            await this.playAsset(require('../../../assets/sounds/success.mp3'), volume);
        } catch(e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }

    static async playError(volume = 1.0) {
        try {
            await this.playAsset(require('../../../assets/sounds/error.mp3'), volume);
        } catch(e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }

    static async playPop(volume = 1.0) {
        try {
            await this.playAsset(require('../../../assets/sounds/pop.mp3'), volume);
        } catch(e) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }
}
