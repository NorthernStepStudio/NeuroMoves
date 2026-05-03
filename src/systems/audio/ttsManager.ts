import * as Speech from 'expo-speech';
import * as ExpoAudio from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../../services/ApiConfig';
import i18n from '../../i18n';

const CACHE_DIR = (FileSystem as any).documentDirectory ? `${(FileSystem as any).documentDirectory}audio_cache/` : '';

export interface TTSOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    owner?: string;
    shouldLock?: boolean;
    onStatusChange?: (isBusy: boolean) => void;
}

export class TTSManager {
    private static currentVoice: ExpoAudio.Audio.Sound | null = null;
    private static currentOwner: string | null = null;
    private static speakId = 0;
    private static warmupController: AbortController | null = null;

    static async ensureCacheDir() {
        const info = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }
    }

    static async stop(onStatusChange?: (isBusy: boolean) => void) {
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
        this.currentOwner = null;
        onStatusChange?.(false);
    }

    static async stopByOwner(owner: string) {
        if (this.currentOwner === owner) {
            await this.stop();
        }
    }

    static async speak(text: string, options: TTSOptions = {}) {
        if (!text) return;
        const speechText = String(text);
        
        const mySpeakId = ++this.speakId;
        this.currentOwner = options.owner || null;

        if (options.shouldLock) options.onStatusChange?.(true);

        await this.stop(); // Clean previous

        const currentLang = i18n.language || 'en';
        const volume = options.volume ?? 1.0;

        try {
            const controller = new AbortController();
            this.warmupController = controller;

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
                            await this.ensureCacheDir();
                            await FileSystem.downloadAsync(finalUri, localFile);
                            finalUri = localFile;
                        } catch (e) {}
                    } else {
                        finalUri = localFile;
                    }

                    const { sound } = await ExpoAudio.Audio.Sound.createAsync(
                        { uri: finalUri }, 
                        { shouldPlay: true, volume }
                    );
                    
                    if (mySpeakId !== this.speakId) { 
                        sound.unloadAsync(); 
                        return; 
                    }
                    
                    this.currentVoice = sound;
                    sound.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            sound.unloadAsync();
                            if (this.currentVoice === sound) this.currentVoice = null;
                            if (options.shouldLock && mySpeakId === this.speakId) {
                                options.onStatusChange?.(false);
                            }
                        }
                    });
                    return;
                }
            }
        } catch (e) {
            // Fallback to system TTS
        }

        // System TTS Fallback
        if (mySpeakId !== this.speakId) return;
        
        try {
            const speechLang = currentLang.split('-')[0] || 'en';
            Speech.speak(speechText, {
                language: speechLang,
                pitch: options.pitch ?? 1.0,
                rate: options.rate ?? 0.9,
                volume,
                onDone: () => { 
                    if (options.shouldLock && mySpeakId === this.speakId) {
                        options.onStatusChange?.(false);
                    } 
                },
                onError: () => { 
                    if (options.shouldLock && mySpeakId === this.speakId) {
                        options.onStatusChange?.(false);
                    } 
                }
            });
        } catch (err) {
            if (options.shouldLock && mySpeakId === this.speakId) options.onStatusChange?.(false);
        }
    }
}
