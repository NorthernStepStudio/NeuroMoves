import * as Speech from 'expo-speech';
import * as ExpoAudio from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getVoiceAsset } from './VoiceAssets';
import { API_BASE_URL } from '../services/ApiConfig';
import i18n from '../i18n';

const CACHE_DIR = (FileSystem as any).documentDirectory ? `${(FileSystem as any).documentDirectory}audio_cache/` : '';

const ensureCacheDir = async () => {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
};

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
 * VoiceService handles all high-level audio logic including:
 * - Professional Backend TTS (Neural Studio)
 * - Persistent On-Device Caching
 * - Local Static Asset Fallbacks
 * - System TTS Fallbacks
 */
export class VoiceService {
    private static currentVoice: ExpoAudio.Audio.Sound | null = null;
    private static speakId = 0;
    private static warmupController: AbortController | null = null;

    static async stop(onBusyChange?: (isBusy: boolean) => void, keepBusy = false) {
        if (!keepBusy) onBusyChange?.(false);
        Speech.stop();
        if (this.currentVoice) {
            try {
                await this.currentVoice.stopAsync();
                await this.currentVoice.unloadAsync();
            } catch (e) {}
            this.currentVoice = null;
        }
        if (this.warmupController) {
            this.warmupController.abort();
            this.warmupController = null;
        }
    }

    static async speak(
        text: any, 
        settings: VoiceSettings | null, 
        options: VoiceOptions = {},
        onBusyChange?: (isBusy: boolean) => void
    ) {
        // Ensure text is a string (handles numbers like 10)
        const speechText = String(text || '');
        if (!speechText) return;

        // If settings aren't loaded, use defaults or wait
        const isMuted = settings?.voiceMuted || settings?.audioMuted || false;
        if (isMuted) return;

        const volume = settings?.voiceVolume ?? 1.0;
        const currentLang = i18n.language || 'en';

        // --- BACKGROUND CACHE PATH ---
        if (options.shouldOnlyCache) {
            try {
                if (getVoiceAsset(speechText)) return;
                const controller = new AbortController();
                this.warmupController = controller;

                const response = await fetch(`${API_BASE_URL}/speak`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: speechText, language: currentLang }),
                    signal: controller.signal
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.audio_url) {
                        const baseBackendUrl = API_BASE_URL.replace(/\/api$/, '');
                        const audioUrl = `${baseBackendUrl}${data.audio_url}`;
                        const filename = data.audio_url.split('/').pop();
                        const localFile = `${CACHE_DIR}${filename}`;
                        const fileInfo = await FileSystem.getInfoAsync(localFile);
                        if (!fileInfo.exists) {
                            await ensureCacheDir();
                            await FileSystem.downloadAsync(audioUrl, localFile);
                        }
                    }
                }
            } catch (e) {} finally {
                if (this.warmupController?.signal.aborted === false) this.warmupController = null;
            }
            return;
        }

        // --- INTERACTIVE PATH ---
        if (options.shouldLock) onBusyChange?.(true);
        const mySpeakId = ++this.speakId;

        // Force abort any pending background warmup
        if (this.warmupController) {
            this.warmupController.abort();
            this.warmupController = null;
        }

        // Kill current audio - but keep busy state if we are about to speak again
        await this.stop(onBusyChange, options.shouldLock);

        // A. Static Asset Check (Animal sounds, etc)
        const isShortCue = speechText.split(' ').length <= 12;
        const assetData = isShortCue ? getVoiceAsset(speechText) : null;
        if (assetData) {
            if (mySpeakId !== this.speakId) return;
            try {
                const resolvedAsset = (assetData && assetData.asset) ? assetData.asset : assetData;
                const assetRate = (assetData && assetData.rate) ? assetData.rate : undefined;
                const { sound } = await ExpoAudio.Audio.Sound.createAsync(resolvedAsset, { volume });
                if (assetRate) {
                    try { await sound.setRateAsync(assetRate, true); } catch (e) {}
                }
                if (mySpeakId !== this.speakId) { sound.unloadAsync(); return; }
                this.currentVoice = sound;
                await sound.playAsync();
                sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                        if (this.currentVoice === sound) this.currentVoice = null;
                        if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false);
                    }
                });
                return;
            } catch (e) {
                if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false);
            }
        }

        // B. Professional Backend
        try {
            const controller = new AbortController();
            this.warmupController = controller;

            // 3-second strict timeout for backend responsiveness
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${API_BASE_URL}/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: speechText, language: currentLang }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok && mySpeakId === this.speakId) {
                const data = await response.json();
                if (data.success && data.audio_url && mySpeakId === this.speakId) {
                    const baseBackendUrl = API_BASE_URL.replace(/\/api$/, '');
                    const filename = data.audio_url.split('/').pop();
                    const localFile = `${CACHE_DIR}${filename}`;
                    const fileInfo = await FileSystem.getInfoAsync(localFile);
                    let finalUri = `${baseBackendUrl}${data.audio_url}`;

                    if (!fileInfo.exists) {
                        try {
                            await ensureCacheDir();
                            await FileSystem.downloadAsync(finalUri, localFile);
                            finalUri = localFile;
                        } catch (e) {}
                    } else {
                        finalUri = localFile;
                    }

                    const { sound } = await ExpoAudio.Audio.Sound.createAsync({ uri: finalUri }, { shouldPlay: false, volume });
                    const rateForUri = (filename && filename.includes('neuromoves_movement_coach')) ? 1.25 : undefined;
                    if (rateForUri) {
                        try { await sound.setRateAsync(rateForUri, true); } catch (e) {}
                    }
                    if (mySpeakId !== this.speakId) { sound.unloadAsync(); return; }
                    this.currentVoice = sound;
                    await sound.playAsync();
                    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                        if (status.isLoaded && status.didJustFinish) {
                            sound.unloadAsync();
                            if (this.currentVoice === sound) this.currentVoice = null;
                            if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false);
                        }
                    });
                    return;
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError' && mySpeakId === this.speakId) {
                console.log('[VoiceService] Backend timed out or aborted, falling back...');
            } else {
                console.warn('[VoiceService] Backend error:', e);
            }
        }

        // C. Final Fallback (System TTS)
        if (mySpeakId !== this.speakId || options.shouldOnlyCache) return;
        
        try {
            // Normalize language for system TTS (e.g. en-US -> en)
            const speechLang = currentLang.split('-')[0] || 'en';
            
            Speech.speak(speechText, {
                language: speechLang,
                pitch: 1.0,
                rate: 0.9,
                volume,
                onDone: () => { if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false); },
                onError: (err) => { 
                    console.error('[VoiceService] Speech.speak error:', err);
                    if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false); 
                }
            });
        } catch (err) {
            console.error('[VoiceService] Fallback catch:', err);
            if (options.shouldLock && mySpeakId === this.speakId) onBusyChange?.(false);
        }
    }
}
