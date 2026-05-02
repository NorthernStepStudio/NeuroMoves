import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { GameId, GameState, FeedbackResult, GameProgress, GAME_REGISTRY } from './gameTypes';
import { ActivityAttempt, SettingsState, AttemptResult } from './types';
import { loadSettings, resetGameProgress, loadGameProgress, saveGameProgress, saveAttempt } from './storage';
import * as Haptics from 'expo-haptics';
import * as ExpoAudio from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';
import { HapticService } from '../services/HapticService';
import { WarmupService } from './WarmupService';
import { VoiceService } from './VoiceService';

interface GameContextValue {
    currentGameId: GameId | null;
    gameState: GameState;
    isBusy: boolean;
    lockInput: (durationMs?: number) => void;
    unlockInput: () => void;
    startGame: (gameId: GameId) => Promise<void>;
    endGame: () => void;
    nextLevel: () => void;
    recordSuccess: () => void;
    recordError: () => void;
    resetGame: () => void;
    resetCurrentGameProgress: () => Promise<void>;
    showFeedback: (result: FeedbackResult, duration?: number) => void;
    feedback: FeedbackResult | null;
    getProgress: (gameId: GameId) => Promise<GameProgress>;
    saveProgress: (progress: GameProgress) => Promise<void>;
    playSuccess: () => void;
    playError: () => void;
    playPop: () => void;
    speak: (text: string, options?: { shouldLock?: boolean; shouldOnlyCache?: boolean }) => Promise<void>;
    settings: SettingsState | null;
    reloadSettings: () => Promise<void>;
}

const defaultGameState: GameState = {
    level: 1, score: 0, errors: 0, isComplete: false, isPaused: false,
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const [currentGameId, setCurrentGameId] = useState<GameId | null>(null);
    const [gameState, setGameState] = useState<GameState>(defaultGameState);
    const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const busyTimeoutRef = useRef<any>(null);

    const reloadSettings = useCallback(async () => {
        const s = await loadSettings();
        setSettings(s);
    }, []);

    const speak = useCallback(async (text: string, options?: any) => {
        await VoiceService.speak(text, settings, options, setIsBusy);
    }, [settings]);

    const lockInput = useCallback((durationMs?: number) => {
        if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
        setIsBusy(true);
        if (durationMs) busyTimeoutRef.current = setTimeout(() => setIsBusy(false), durationMs);
    }, []);

    const unlockInput = useCallback(() => {
        if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
        setIsBusy(false);
    }, []);

    const getProgress = useCallback(async (gameId: GameId): Promise<GameProgress> => {
        try {
            const all = await loadGameProgress();
            const raw = all[gameId];
            if (raw) return {
                gameId,
                currentLevel: Number(raw.currentLevel || 1),
                highestLevel: Number(raw.highestLevel || 1),
                totalAttempts: Number(raw.attempts || 0),
                successfulAttempts: Number(raw.successes || 0),
                lastPlayedAt: raw.lastPlayedAt || null
            };
        } catch (e) {}
        return { gameId, currentLevel: 1, highestLevel: 1, totalAttempts: 0, successfulAttempts: 0, lastPlayedAt: null };
    }, []);

    const saveProgress = useCallback(async (p: GameProgress) => {
        try {
            await saveGameProgress(p.gameId, {
                currentLevel: p.currentLevel, highestLevel: p.highestLevel,
                attempts: p.totalAttempts, successes: p.successfulAttempts,
                lastPlayedAt: p.lastPlayedAt || new Date().toISOString()
            } as any);
        } catch (e) {}
    }, []);

    const saveGameAttempt = useCallback(async (result: AttemptResult) => {
        if (!currentGameId) return;
        await saveAttempt({
            id: `${currentGameId}-${Date.now()}`,
            activityId: currentGameId, dateISO: new Date().toISOString(), result
        });
    }, [currentGameId]);

    const startGame = useCallback(async (gameId: GameId) => {
        WarmupService.stop();
        await VoiceService.stop();
        const p = await getProgress(gameId);
        setCurrentGameId(gameId);
        setGameState({ level: p.currentLevel, score: 0, errors: 0, isComplete: false, isPaused: false });
        await saveProgress({ ...p, lastPlayedAt: new Date().toISOString() });
    }, [getProgress, saveProgress]);

    const endGame = useCallback(() => {
        setCurrentGameId(null);
        setGameState(defaultGameState);
        setFeedback(null);
    }, []);

    const nextLevel = useCallback(async () => {
        if (!currentGameId) return;
        await VoiceService.stop();
        const config = GAME_REGISTRY.find(g => g.id === currentGameId);
        const max = config?.maxLevels ?? 10;
        let nextLvl = 1;

        setGameState(prev => {
            nextLvl = prev.level + 1;
            if (nextLvl > max) nextLvl = 1;
            return { ...prev, level: nextLvl, score: prev.score + 10, errors: 0 };
        });

        const p = await getProgress(currentGameId);
        await saveProgress({
            ...p, currentLevel: nextLvl, highestLevel: Math.max(p.highestLevel, nextLvl),
            successfulAttempts: p.successfulAttempts + 1, totalAttempts: p.totalAttempts + 1,
            lastPlayedAt: new Date().toISOString()
        });
        await saveGameAttempt('success');
    }, [currentGameId, getProgress, saveProgress, saveGameAttempt]);

    const recordSuccess = useCallback(() => {
        if (settings?.hapticEnabled) HapticService.trigger('success_gentle');
        setGameState(prev => ({ ...prev, score: prev.score + 5 }));
    }, [settings]);

    const recordError = useCallback(() => {
        if (settings?.hapticEnabled) HapticService.trigger('error_buzz');
        setGameState(prev => ({ ...prev, errors: prev.errors + 1 }));
        saveGameAttempt('tried');
    }, [settings, saveGameAttempt]);

    const resetGame = useCallback(() => {
        setGameState(prev => ({ ...prev, score: 0, errors: 0, isComplete: false }));
    }, []);

    const resetCurrentGameProgress = useCallback(async () => {
        if (!currentGameId) return;
        await VoiceService.stop();
        setGameState({ level: 1, score: 0, errors: 0, isComplete: false, isPaused: false });
        resetGameProgress(currentGameId).catch(() => {});
    }, [currentGameId]);

    const showFeedback = useCallback((result: FeedbackResult, duration = 1500) => {
        setFeedback(result);
        setTimeout(() => setFeedback(null), duration);
    }, []);

    const playSuccess = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const { sound } = await ExpoAudio.Audio.Sound.createAsync(require('../../assets/sounds/success.mp3'), { volume: settings?.sfxVolume ?? 1.0 });
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
        } catch (e) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    }, [settings]);

    const playError = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const { sound } = await ExpoAudio.Audio.Sound.createAsync(require('../../assets/sounds/error.mp3'), { volume: settings?.sfxVolume ?? 1.0 });
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
        } catch (e) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    }, [settings]);

    const playPop = useCallback(async () => {
        if (settings?.sfxMuted || settings?.audioMuted) return;
        try {
            const { sound } = await ExpoAudio.Audio.Sound.createAsync(require('../../assets/sounds/pop.mp3'), { volume: settings?.sfxVolume ?? 1.0 });
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
        } catch (e) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
    }, [settings]);

    useEffect(() => {
        void reloadSettings();
        const timer = setTimeout(() => { WarmupService.warmup(speak).catch(() => {}); }, 2000);
        return () => clearTimeout(timer);
    }, [reloadSettings, speak]);

    const value: GameContextValue = {
        currentGameId, gameState, isBusy, lockInput, unlockInput, startGame, endGame, nextLevel,
        recordSuccess, recordError, resetGame, resetCurrentGameProgress, showFeedback, feedback,
        getProgress, saveProgress, playSuccess, playError, playPop, speak, settings, reloadSettings,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
}
