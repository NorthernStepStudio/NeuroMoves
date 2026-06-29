import * as ExpoAudio from 'expo-av';
import { getVoiceAsset } from '../../core/VoiceAssets';

export interface TTSOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    owner?: string;
    shouldLock?: boolean;
    waitForCompletion?: boolean;
    debugLabel?: string;
    shouldOnlyCache?: boolean;
    onStatusChange?: (isBusy: boolean) => void;
}

export class TTSManager {
    private static currentVoice: ExpoAudio.Audio.Sound | null = null;
    private static currentOwner: string | null = null;
    private static speakId = 0;
    private static pendingCompletion: (() => void) | null = null;
    private static activeSafetyTimeout: NodeJS.Timeout | null = null;
    private static lastSpokenText: string | null = null;
    private static lastSpokenTime = 0;

    // Queue to serialize TTS requests and enforce minimum spacing
    private static queue: Array<{
        text: string;
        options: TTSOptions;
        resolve: () => void;
        reject: (err?: any) => void;
    }> = [];
    private static processing = false;
    private static lastSpeakStart = 0; // timestamp ms of last speak start
    private static MIN_GAP_MS = 1200; // Adjusted for better responsiveness

    static async ensureCacheDir() {
        // No-op — all assets are bundled
    }

    static async stop(onStatusChange?: (isBusy: boolean) => void) {
        await this.stopInternal(onStatusChange);
        // clear any queued requests when explicitly stopped
        this.queue.forEach((q) => q.resolve());
        this.queue = [];
    }

    private static async stopInternal(onStatusChange?: (isBusy: boolean) => void) {
        if (this.activeSafetyTimeout) {
            clearTimeout(this.activeSafetyTimeout);
            this.activeSafetyTimeout = null;
        }
        if (this.currentVoice) {
            try {
                await this.currentVoice.stopAsync();
                await this.currentVoice.unloadAsync();
            } catch (e) {}
            this.currentVoice = null;
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

    /**
     * No-op — assets are bundled, no preloading needed.
     */
    static async preloadCommonLines() {
        console.log('[TTSManager] All voice assets are bundled — no preloading needed.');
    }

    /**
     * Helper to play the game prompt/instruction safely
     */
    static async playGamePrompt(gameId: string, text: string, options: TTSOptions = {}) {
        return this.speak(text, { owner: gameId, shouldLock: true, ...options });
    }

    /**
     * Helper to play success narration safely
     */
    static async playSuccess(gameId: string, text?: string, options: TTSOptions = {}) {
        const speechText = text || 'Great job!';
        return this.speak(speechText, { owner: gameId, shouldLock: false, ...options });
    }

    /**
     * Helper to play game completion narration safely
     */
    static async playFinish(gameId: string, text?: string, options: TTSOptions = {}) {
        let defaultText = 'Congratulations!';
        if (gameId === 'pop-bubbles') {
            defaultText = 'All popped hurray!';
        } else if (gameId === 'stacking') {
            defaultText = 'Tower built!';
        } else if (gameId === 'size-ordering') {
            defaultText = 'Perfect order!';
        } else if (gameId === 'shape-sorting') {
            defaultText = 'Perfect fit!';
        }
        const speechText = text || defaultText;
        return this.speak(speechText, { owner: gameId, shouldLock: false, ...options });
    }

    static async speak(text: string, options: TTSOptions = {}) {
        if (!text) return;
        const speechText = String(text);

        // Deduplicate identical speech requests within a 1000ms window
        const now = Date.now();
        if (speechText === this.lastSpokenText && (now - this.lastSpokenTime) < 1000) {
            console.log(`[TTSManager] speak ignored (deduplicated): "${speechText}"`);
            return Promise.resolve();
        }
        this.lastSpokenText = speechText;
        this.lastSpokenTime = now;

        // Background caching path — no-op for bundled assets
        if (options.shouldOnlyCache) {
            return;
        }

        // Enqueue interactive request
        return new Promise<void>((resolve, reject) => {
            this.queue.push({ text: speechText, options, resolve, reject });
            if (!this.processing) {
                this.processQueue().catch((err) => {
                    this.queue.forEach((q) => q.reject(err));
                    this.queue = [];
                });
            }
        });
    }

    private static async processQueue() {
        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            const speechText = item.text;
            const options = item.options || {};

            // Enforce minimum gap spacing between starts to prevent overlapping
            const now = Date.now();
            const since = now - this.lastSpeakStart;
            if (since < this.MIN_GAP_MS) {
                await new Promise((r) => setTimeout(r, this.MIN_GAP_MS - since));
            }

            const mySpeakId = ++this.speakId;
            if (options.shouldLock) options.onStatusChange?.(true);

            try {
                // Cancel previous voice before playing new voice
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
                    if (this.activeSafetyTimeout) {
                        clearTimeout(this.activeSafetyTimeout);
                        this.activeSafetyTimeout = null;
                    }
                    if (this.pendingCompletion) {
                        const resolver = this.pendingCompletion;
                        this.pendingCompletion = null;
                        resolver();
                    }
                };

                console.log(`[TTSManager] speak requested: "${speechText}"`);

                // Look up the bundled MP3 asset for this text
                const voiceAsset = getVoiceAsset(speechText);
                let playedSuccessfully = false;

                if (voiceAsset && mySpeakId === this.speakId) {
                    try {
                        await this.playAudioFile(voiceAsset, options, complete);
                        playedSuccessfully = true;
                    } catch (playerError: any) {
                        console.log(`[TTSManager] Playback failed: ${playerError.message || playerError}`);
                    }
                } else if (!voiceAsset) {
                    console.warn(`[TTSManager] No bundled MP3 found for: "${speechText}"`);
                }

                if (!playedSuccessfully) {
                    complete();
                }

                if (waitForCompletion && completionPromise) {
                    await completionPromise;
                }
                
                item.resolve();
            } catch (err) {
                if (options.shouldLock && mySpeakId === this.speakId) options.onStatusChange?.(false);
                item.reject(err);
            }
        }
        this.processing = false;
    }

    private static async playAudioFile(source: any, options: TTSOptions, completeCallback: () => void) {
        const volume = options.volume ?? 1.0;
        const sourceObject = typeof source === 'string' ? { uri: source } : source;

        const { sound } = await ExpoAudio.Audio.Sound.createAsync(
            sourceObject,
            { shouldPlay: false, volume }
        );

        if (options.rate) {
            try {
                await sound.setRateAsync(options.rate, true);
            } catch (e) {}
        }

        this.currentVoice = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) {
                completeCallback();
                return;
            }
            if (status.didJustFinish) {
                sound.unloadAsync();
                if (this.currentVoice === sound) this.currentVoice = null;
                console.log('[TTSManager] playback finished');
                if (options.shouldLock) {
                    options.onStatusChange?.(false);
                }
                completeCallback();
            }
        });

        console.log('[TTSManager] playback started');
        await sound.playAsync();
        this.lastSpeakStart = Date.now();

        // Safety timeout to unload and continue if playback hangs
        const duration = (sound as any)._status?.durationMillis || 5000;
        this.activeSafetyTimeout = setTimeout(() => {
            console.warn('[TTSManager] Safety playback timeout triggered.');
            sound.unloadAsync().catch(() => {});
            if (this.currentVoice === sound) this.currentVoice = null;
            if (options.shouldLock) {
                options.onStatusChange?.(false);
            }
            completeCallback();
        }, duration + 2000);
    }
}
