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
    waitForCompletion?: boolean;
    debugLabel?: string;
    onStatusChange?: (isBusy: boolean) => void;
    forceSystem?: boolean;
}

export class TTSManager {
    private static currentVoice: ExpoAudio.Audio.Sound | null = null;
    private static currentOwner: string | null = null;
    private static speakId = 0;
    private static warmupController: AbortController | null = null;
    private static pendingCompletion: (() => void) | null = null;
    // Queue to serialize TTS requests and enforce minimum spacing
    private static queue: Array<{
        text: string;
        options: TTSOptions;
        resolve: () => void;
        reject: (err?: any) => void;
    }> = [];
    private static processing = false;
    private static lastSpeakStart = 0; // timestamp ms of last speak start
    private static MIN_GAP_MS = 2000;

    static async ensureCacheDir() {
        const info = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }
    }

    static async stop(onStatusChange?: (isBusy: boolean) => void) {
        await this.stopInternal(onStatusChange);
        // clear any queued requests when explicitly stopped
        this.queue.forEach((q) => q.resolve());
        this.queue = [];
    }

    private static async stopInternal(onStatusChange?: (isBusy: boolean) => void) {
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
        if (this.pendingCompletion) {
            this.pendingCompletion();
            this.pendingCompletion = null;
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
        // Enqueue the request and process sequentially to enforce spacing
        return new Promise<void>((resolve, reject) => {
            this.queue.push({ text: speechText, options, resolve, reject });
            // start processing if not already
            if (!this.processing) this.processQueue().catch((err) => {
                // clear queue on unexpected error
                this.queue.forEach((q) => q.reject(err));
                this.queue = [];
            });
        });
    }

    private static async processQueue() {
        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            const speechText = item.text;
            const options = item.options || {};

            // Wait to enforce minimum gap between starts
            const now = Date.now();
            const since = now - this.lastSpeakStart;
            if (since < this.MIN_GAP_MS) {
                await new Promise((r) => setTimeout(r, this.MIN_GAP_MS - since));
            }

            const mySpeakId = ++this.speakId;
            if (options.shouldLock) options.onStatusChange?.(true);

            try {
                // Ensure any background warmup is aborted
                if (this.warmupController) {
                    this.warmupController.abort();
                    this.warmupController = null;
                }

                // Stop any current audio before starting (don't clear the queue)
                await this.stopInternal();
                this.currentOwner = options.owner || null;

                const waitForCompletion = options.waitForCompletion === true;
                let didComplete = false;
                const completionPromise = waitForCompletion
                    ? new Promise<void>((resolve) => {
                        this.pendingCompletion = () => {
                            if (didComplete) return;
                            didComplete = true;
                            resolve();
                        };
                    })
                    : null;

                const complete = () => {
                    if (didComplete) return;
                    didComplete = true;
                    if (this.pendingCompletion) {
                        const resolver = this.pendingCompletion;
                        this.pendingCompletion = null;
                        resolver();
                    }
                };

                if (options.debugLabel) {
                    console.log(`[TTS] start ${options.debugLabel}`, { speechText, speakId: mySpeakId });
                }

                const currentLang = i18n.language || 'en';
                const volume = options.volume ?? 1.0;

                // If caller explicitly requests system TTS, use expo-speech directly
                if (options.forceSystem) {
                    try {
                        const speechLang = currentLang.split('-')[0] || 'en';
                        Speech.speak(speechText, {
                            language: speechLang,
                            pitch: options.pitch ?? 1.0,
                            rate: options.rate ?? 0.9,
                            volume,
                            onDone: () => {
                                if (options.debugLabel && mySpeakId === this.speakId) {
                                    console.log(`[TTS] end ${options.debugLabel}`, { speakId: mySpeakId });
                                }
                                if (options.shouldLock && mySpeakId === this.speakId) {
                                    options.onStatusChange?.(false);
                                }
                                complete();
                            },
                            onError: () => {
                                if (options.shouldLock && mySpeakId === this.speakId) {
                                    options.onStatusChange?.(false);
                                }
                                complete();
                            }
                        });
                        // mark start time immediately for system TTS
                        this.lastSpeakStart = Date.now();
                        if (waitForCompletion && completionPromise) {
                            await completionPromise;
                        }
                        item.resolve();
                        continue;
                    } catch (err) {
                        // fallback to other methods if system TTS fails
                        item.resolve();
                        continue;
                    }
                }

                try {
                    const { getVoiceAsset } = require('../../core/VoiceAssets');
                    const assetData = getVoiceAsset(speechText);
                    if (assetData) {
                        const resolvedAsset = (assetData && assetData.asset) ? assetData.asset : assetData;
                        const assetRate = (assetData && assetData.rate) ? assetData.rate : options.rate;
                        const { sound } = await ExpoAudio.Audio.Sound.createAsync(resolvedAsset, { shouldPlay: false, volume });
                        if (assetRate) {
                            try { await sound.setRateAsync(assetRate, true); } catch (e) {}
                        }
                        if (mySpeakId !== this.speakId) {
                            sound.unloadAsync();
                            complete();
                            item.resolve();
                            continue;
                        }
                        this.currentVoice = sound;
                        sound.setOnPlaybackStatusUpdate((status) => {
                            if (!status.isLoaded) {
                                complete();
                                return;
                            }
                            if (status.didJustFinish) {
                                sound.unloadAsync();
                                if (this.currentVoice === sound) this.currentVoice = null;
                                if (options.debugLabel && mySpeakId === this.speakId) {
                                    console.log(`[TTS] end ${options.debugLabel}`, { speakId: mySpeakId });
                                }
                                if (options.shouldLock && mySpeakId === this.speakId) {
                                    options.onStatusChange?.(false);
                                }
                                complete();
                            }
                        });
                        await sound.playAsync();
                        // mark start time as soon as playback started
                        this.lastSpeakStart = Date.now();
                        if (waitForCompletion && completionPromise) {
                            await completionPromise;
                        }
                        item.resolve();
                        continue;
                    }
                } catch (err) {
                    console.warn('[TTSManager] Failed to load local asset', err);
                }

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
                                { shouldPlay: false, volume }
                            );
                            const rateForUri = options.rate ?? (filename && filename.includes('neuromoves_movement_coach') ? 1.25 : undefined);
                            if (rateForUri) {
                                try { await sound.setRateAsync(rateForUri, true); } catch (e) {}
                            }
                            
                            if (mySpeakId !== this.speakId) { 
                                sound.unloadAsync(); 
                                complete();
                                item.resolve();
                                continue; 
                            }
                            
                            this.currentVoice = sound;
                            sound.setOnPlaybackStatusUpdate((status) => {
                                if (!status.isLoaded) {
                                    complete();
                                    return;
                                }
                                if (status.didJustFinish) {
                                    sound.unloadAsync();
                                    if (this.currentVoice === sound) this.currentVoice = null;
                                    if (options.debugLabel && mySpeakId === this.speakId) {
                                        console.log(`[TTS] end ${options.debugLabel}`, { speakId: mySpeakId });
                                    }
                                    if (options.shouldLock && mySpeakId === this.speakId) {
                                        options.onStatusChange?.(false);
                                    }
                                    complete();
                                }
                            });
                            await sound.playAsync();
                            // mark start time
                            this.lastSpeakStart = Date.now();
                            if (waitForCompletion && completionPromise) {
                                await completionPromise;
                            }
                            item.resolve();
                            continue;
                        }
                    }
                } catch (e) {
                    // Fallback to system TTS
                }

                // System TTS Fallback
                if (mySpeakId !== this.speakId) {
                    item.resolve();
                    continue;
                }
                
                try {
                    const speechLang = currentLang.split('-')[0] || 'en';
                    Speech.speak(speechText, {
                        language: speechLang,
                        pitch: options.pitch ?? 1.0,
                        rate: options.rate ?? 0.9,
                        volume,
                        onDone: () => { 
                            if (options.debugLabel && mySpeakId === this.speakId) {
                                console.log(`[TTS] end ${options.debugLabel}`, { speakId: mySpeakId });
                            }
                            if (options.shouldLock && mySpeakId === this.speakId) {
                                options.onStatusChange?.(false);
                            } 
                            complete();
                        },
                        onError: () => { 
                            if (options.shouldLock && mySpeakId === this.speakId) {
                                options.onStatusChange?.(false);
                            } 
                            complete();
                        }
                    });
                    // mark start time immediately for system TTS
                    this.lastSpeakStart = Date.now();
                    if (waitForCompletion && completionPromise) {
                        await completionPromise;
                    }
                    item.resolve();
                } catch (err) {
                    if (options.shouldLock && mySpeakId === this.speakId) options.onStatusChange?.(false);
                    complete();
                    item.resolve();
                }
            } catch (err) {
                item.reject(err);
            }
        }

        this.processing = false;
    }
}
