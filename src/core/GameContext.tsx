import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { GameId, GameState, FeedbackResult, GameProgress, GAME_REGISTRY } from './gameTypes';
import { ActivityAttempt, SettingsState, AttemptResult } from './types';
import { loadSettings, resetGameProgress, loadGameProgress, saveGameProgress, saveAttempt } from './storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { getVoiceAsset } from './VoiceAssets';
import { HapticService } from '../services/HapticService';
import { API_BASE_URL } from '../services/ApiConfig';
import i18n from '../i18n';

interface GameContextValue {
    // Current game state
    currentGameId: GameId | null;
    gameState: GameState;

    // Input lock (prevents overlapping taps/sounds)
    isBusy: boolean;
    lockInput: (durationMs?: number) => void;
    unlockInput: () => void;

    // Actions
    startGame: (gameId: GameId) => Promise<void>;
    endGame: () => void;
    nextLevel: () => void;
    recordSuccess: () => void;
    recordError: () => void;
    resetGame: () => void;
    resetCurrentGameProgress: () => Promise<void>;

    // Feedback
    showFeedback: (result: FeedbackResult, duration?: number) => void;
    feedback: FeedbackResult | null;

    // Progress
    getProgress: (gameId: GameId) => Promise<GameProgress>;
    saveProgress: (progress: GameProgress) => Promise<void>;

    // Audio
    playSuccess: () => void;
    playError: () => void;
    playPop: () => void;
    speak: (text: string) => void;

    // Settings (for age-adaptive difficulty)
    settings: SettingsState | null;
    reloadSettings: () => Promise<void>;
}

const defaultGameState: GameState = {
    level: 1,
    score: 0,
    errors: 0,
    isComplete: false,
    isPaused: false,
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const [currentGameId, setCurrentGameId] = useState<GameId | null>(null);
    const [gameState, setGameState] = useState<GameState>(defaultGameState);
    const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const busyTimeoutRef = React.useRef<any>(null);

    // Lock input (prevents overlapping taps/sounds)
    const lockInput = useCallback((durationMs?: number) => {
        // Clear any existing timeout
        if (busyTimeoutRef.current) {
            clearTimeout(busyTimeoutRef.current);
            busyTimeoutRef.current = null;
        }
        setIsBusy(true);
        if (durationMs) {
            busyTimeoutRef.current = setTimeout(() => {
                setIsBusy(false);
                busyTimeoutRef.current = null;
            }, durationMs);
        }
    }, []);

    // Unlock input manually
    const unlockInput = useCallback(() => {
        if (busyTimeoutRef.current) {
            clearTimeout(busyTimeoutRef.current);
            busyTimeoutRef.current = null;
        }
        setIsBusy(false);
    }, []);

    // Load/reload settings
    const reloadSettings = useCallback(async () => {
        const loaded = await loadSettings();
        setSettings(loaded);
    }, []);

    // Load settings on mount
    useEffect(() => {
        reloadSettings();
    }, [reloadSettings]);

    function normalizeStoredProgress(gameId: GameId, raw: any): GameProgress {
        const currentLevel = Number(raw?.currentLevel ?? 1);
        const highestLevel = Number(raw?.highestLevel ?? currentLevel);
        const totalAttempts = Number(raw?.attempts ?? raw?.totalAttempts ?? 0);
        const successfulAttempts = Number(raw?.successes ?? raw?.successfulAttempts ?? 0);
        const lastPlayedAt = typeof raw?.lastPlayedAt === 'string' ? raw.lastPlayedAt : null;

        return {
            gameId,
            currentLevel: Number.isFinite(currentLevel) ? currentLevel : 1,
            highestLevel: Number.isFinite(highestLevel) ? highestLevel : 1,
            totalAttempts: Number.isFinite(totalAttempts) ? totalAttempts : 0,
            successfulAttempts: Number.isFinite(successfulAttempts) ? successfulAttempts : 0,
            lastPlayedAt,
        };
    }

    const saveGameAttempt = useCallback(async (result: AttemptResult) => {
        if (!currentGameId) return;
        const attempt: ActivityAttempt = {
            id: `${currentGameId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            activityId: currentGameId,
            dateISO: new Date().toISOString(),
            result,
        };
        await saveAttempt(attempt);
    }, [currentGameId]);

    // Load progress from storage
    const getProgress = useCallback(async (gameId: GameId): Promise<GameProgress> => {
        try {
            const allProgress = await loadGameProgress();
            if (allProgress[gameId as string]) {
                return normalizeStoredProgress(gameId, allProgress[gameId as string]);
            }
        } catch (e) {
            console.warn('Failed to load game progress:', e);
        }

        // Return default progress
        return {
            gameId,
            currentLevel: 1,
            highestLevel: 1,
            totalAttempts: 0,
            successfulAttempts: 0,
            lastPlayedAt: null,
        };
    }, []);

    // Save progress to storage
    const saveProgress = useCallback(async (progress: GameProgress) => {
        try {
            const normalizedProgress = {
                currentLevel: progress.currentLevel,
                highestLevel: progress.highestLevel,
                attempts: progress.totalAttempts,
                successes: progress.successfulAttempts,
                lastPlayedAt: progress.lastPlayedAt || new Date().toISOString()
            };
            await saveGameProgress(progress.gameId, normalizedProgress as any);
        } catch (e) {
            console.warn('Failed to save game progress:', e);
        }
    }, []);

    // Start a game
    const startGame = useCallback(async (gameId: GameId) => {
        const progress = await getProgress(gameId);
        setCurrentGameId(gameId);
        setGameState({
            level: progress.currentLevel,
            score: 0,
            errors: 0,
            isComplete: false,
            isPaused: false,
        });

        // Persist a "last played" heartbeat so progress cards stay current.
        await saveProgress({
            ...progress,
            gameId,
            lastPlayedAt: new Date().toISOString(),
        });
    }, [getProgress, saveProgress]);

    // End current game
    const endGame = useCallback(() => {
        setCurrentGameId(null);
        setGameState(defaultGameState);
        setFeedback(null);
    }, []);

    // Go to next level
    // Go to next level
    const nextLevel = useCallback(async () => {
        if (!currentGameId) return;

        const config = GAME_REGISTRY.find(g => g.id === currentGameId);
        const maxLevels = config?.maxLevels ?? 10;

        let nextLvl = 1;

        setGameState(prev => {
            nextLvl = prev.level + 1;
            if (nextLvl > maxLevels) nextLvl = 1;

            console.log(`[GameContext] Level Advancement: ${prev.level} -> ${nextLvl}`);

            return {
                ...prev,
                level: nextLvl,
                score: prev.score + 10,
                errors: 0,
                isComplete: false,
            };
        });

        try {
            const progress = await getProgress(currentGameId);
            await saveProgress({
                ...progress,
                gameId: currentGameId,
                currentLevel: nextLvl,
                highestLevel: Math.max(progress.highestLevel || 1, nextLvl),
                successfulAttempts: (progress.successfulAttempts || 0) + 1,
                totalAttempts: (progress.totalAttempts || 0) + 1,
                lastPlayedAt: new Date().toISOString(),
            });
            await saveGameAttempt('success');
        } catch (err) {
            console.warn('[GameContext] Failed to persist level progress:', err);
        }
    }, [currentGameId, getProgress, saveProgress, saveGameAttempt]);

    // Record successful attempt
    const recordSuccess = useCallback(() => {
        if (settings?.hapticEnabled) {
            HapticService.trigger('success_gentle');
        }
        setGameState(prev => ({
            ...prev,
            score: prev.score + 5,
        }));
    }, [settings?.hapticEnabled]);

    // Record error
    const recordError = useCallback(() => {
        if (settings?.hapticEnabled) {
            HapticService.trigger('error_buzz');
        }
        setGameState(prev => ({
            ...prev,
            errors: prev.errors + 1,
        }));
        saveGameAttempt('tried').catch(err => console.warn('[GameContext] Failed to save game attempt:', err));
    }, [settings?.hapticEnabled, saveGameAttempt]);

    // Reset current game
    const resetGame = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            score: 0,
            errors: 0,
            isComplete: false,
        }));
    }, []);

    // Reset current game's saved progress (for "start over" feature)
    const resetCurrentGameProgress = useCallback(async () => {
        if (!currentGameId) return;

        // Update UI immediately for instant feedback
        setGameState({
            level: 1,
            score: 0,
            errors: 0,
            isComplete: false,
            isPaused: false,
        });

        // Do storage cleanup in background (don't await)
        resetGameProgress(currentGameId).catch(console.warn);
    }, [currentGameId]);

    // Show feedback temporarily
    const showFeedback = useCallback((result: FeedbackResult, duration = 1500) => {
        setFeedback(result);
        setTimeout(() => setFeedback(null), duration);
    }, []);

    // Audio helpers - simple beeps
    const playSuccess = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const volume = settings?.sfxVolume ?? 1.0;
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/success.mp3'),
                { volume }
            );
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (e) {
            // Fallback to haptic if no audio
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [settings?.sfxMuted, settings?.sfxVolume, settings?.audioMuted]);

    const playError = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const volume = settings?.sfxVolume ?? 1.0;
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/error.mp3'),
                { volume }
            );
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [settings?.sfxMuted, settings?.sfxVolume, settings?.audioMuted]);

    const playPop = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const volume = settings?.sfxVolume ?? 1.0;
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/pop.mp3'),
                { volume }
            );
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (e) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [settings?.sfxMuted, settings?.sfxVolume, settings?.audioMuted]);

    const speak = useCallback(async (text: string) => {
        if (settings?.voiceMuted || settings?.audioMuted) return;

        const volume = settings?.voiceVolume ?? 1.0;

        // 1. Check for Studio Voice Asset (Only if English)
        const currentLang = i18n.language || 'en';
        if (currentLang === 'en') {
            const asset = getVoiceAsset(text);
            if (asset) {
                try {
                    // Play pre-recorded human voice
                    const { sound } = await Audio.Sound.createAsync(asset, { volume });
                    await sound.playAsync();

                    // Unload when done to free memory
                    sound.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            sound.unloadAsync();
                        }
                    });
                    return;
                } catch (e) {
                    console.warn('[Voice] Failed to play asset, trying backend TTS', e);
                }
            }
        }

        // 2. Try Backend TTS for full phrase
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased for local XTTS

            const response = await fetch(`${API_BASE_URL}/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: currentLang }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (data.success && data.audio_url) {
                // Determine base URL (API_BASE_URL minus /api)
                const baseBackendUrl = API_BASE_URL.replace(/\/api$/, '');
                const { sound } = await Audio.Sound.createAsync(
                    { uri: `${baseBackendUrl}${data.audio_url}` },
                    { shouldPlay: true }
                );
                await sound.playAsync();
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                    }
                });
                return;
            }
        } catch (e) {
            console.warn('[Voice] Backend TTS failed, attempting character fallback', e);
        }

        // 3. Last Resort: Fallback to human letter/number if possible
        const cleanText = text.toLowerCase().replace(/[!.,?]/g, '');
        let fallbackChar = '';

        if (cleanText.startsWith('find the letter ')) fallbackChar = cleanText.replace('find the letter ', '').trim();
        else if (cleanText.startsWith('find the number ')) fallbackChar = cleanText.replace('find the number ', '').trim();
        else if (cleanText.startsWith('trace the letter ')) fallbackChar = cleanText.replace('trace the letter ', '').trim();
        else if (cleanText.startsWith('trace the number ')) fallbackChar = cleanText.replace('trace the number ', '').trim();

        if (fallbackChar) {
            const charAsset = getVoiceAsset(fallbackChar);
            if (charAsset) {
                try {
                    const { sound } = await Audio.Sound.createAsync(charAsset, { volume });
                    await sound.playAsync();
                    sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
                    return;
                } catch (e) {
                    console.warn('[Voice] Final character fallback failed', e);
                }
            }
        }
    }, [settings?.audioMuted, settings?.voiceMuted, settings?.voiceVolume]);

    const value: GameContextValue = {
        currentGameId,
        gameState,
        isBusy,
        lockInput,
        unlockInput,
        startGame,
        endGame,
        nextLevel,
        recordSuccess,
        recordError,
        resetGame,
        resetCurrentGameProgress,
        showFeedback,
        feedback,
        getProgress,
        saveProgress,
        playSuccess,
        playError,
        playPop,
        speak,
        settings,
        reloadSettings,
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
