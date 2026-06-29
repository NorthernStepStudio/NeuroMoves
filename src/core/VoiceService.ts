import { TTSManager } from '../systems/audio/ttsManager';

export interface VoiceOptions {
    shouldLock?: boolean;
    shouldOnlyCache?: boolean;
}

export interface VoiceSettings {
    voiceMuted?: boolean;
    audioMuted?: boolean;
    voiceVolume?: number;
}

/**
 * VoiceService delegates directly to TTSManager to ensure a unified
 * audio queue, safety timeouts, and robust offline fallback chains.
 */
export class VoiceService {
    static async stop(onBusyChange?: (isBusy: boolean) => void, keepBusy = false) {
        await TTSManager.stop(onBusyChange);
    }

    static async speak(
        text: any, 
        settings: VoiceSettings | null, 
        options: VoiceOptions = {},
        onBusyChange?: (isBusy: boolean) => void
    ) {
        const isMuted = settings?.voiceMuted || settings?.audioMuted || false;
        if (isMuted) return;

        const volume = settings?.voiceVolume ?? 1.0;
        await TTSManager.speak(text, {
            volume,
            shouldLock: options.shouldLock,
            shouldOnlyCache: options.shouldOnlyCache,
            onStatusChange: onBusyChange
        });
    }
}
