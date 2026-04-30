import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityAttempt, SettingsState, GameProgress } from './types';
import { ACTIVE_CHILD_ID_KEY, ATTEMPTS_KEY, GAME_PROGRESS_KEY, SETTINGS_KEY } from './storageKeys';

const defaultSettings: SettingsState = {
  childAgeMonths: 24,
  parentModeEnabled: true,
  audioMuted: false,
  voiceVolume: 1.0,
  sfxVolume: 1.0,
  voiceMuted: false,
  sfxMuted: false,
  hapticEnabled: true,
  hapticStrength: 'medium',
};

async function getActiveChildScope(): Promise<string> {
  const activeChildId = await AsyncStorage.getItem(ACTIVE_CHILD_ID_KEY);
  return activeChildId ? `child_${activeChildId}` : 'child_local';
}

async function scopedKey(baseKey: string): Promise<string> {
  return `${baseKey}_${await getActiveChildScope()}`;
}

export async function getScopedStorageKey(baseKey: string): Promise<string> {
  return scopedKey(baseKey);
}

export async function getAttemptsStorageKeyForActiveChild(): Promise<string> {
  return scopedKey(ATTEMPTS_KEY);
}

export async function getGameProgressStorageKeyForActiveChild(): Promise<string> {
  return scopedKey(GAME_PROGRESS_KEY);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function loadAttempts(): Promise<ActivityAttempt[]> {
  return readJson<ActivityAttempt[]>(await scopedKey(ATTEMPTS_KEY), []);
}

export async function saveAttempt(attempt: ActivityAttempt): Promise<void> {
  const key = await scopedKey(ATTEMPTS_KEY);
  const current = await readJson<ActivityAttempt[]>(key, []);
  const unsyncedAttempt = { ...attempt, synced: false };
  const next = [unsyncedAttempt, ...current];
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export async function loadGameProgress(): Promise<Record<string, GameProgress>> {
  const key = await scopedKey(GAME_PROGRESS_KEY);
  const parsed = await readJson<Record<string, GameProgress>>(key, {});

  let mutated = false;
  const cleaned: Record<string, GameProgress> = {};

  for (const [gameId, progress] of Object.entries(parsed)) {
    if (!gameId || gameId === 'undefined' || !progress) {
      mutated = true;
      continue;
    }

    const currentLevel = Math.max(1, Number((progress as any).currentLevel || 1));
    const highestLevel = Math.max(currentLevel, Number((progress as any).highestLevel || currentLevel));
    const attempts = Math.max(0, Number((progress as any).attempts || 0));
    const successes = Math.max(0, Number((progress as any).successes || 0));

    cleaned[gameId] = {
      currentLevel,
      highestLevel,
      attempts,
      successes,
      lastPlayedAt: progress.lastPlayedAt,
      synced: progress.synced
    };
  }

  if (mutated) {
    await AsyncStorage.setItem(key, JSON.stringify(cleaned));
  }

  return cleaned;
}

export async function saveGameProgress(gameId: string, progress: GameProgress): Promise<void> {
  const key = await scopedKey(GAME_PROGRESS_KEY);
  const current = await readJson<Record<string, GameProgress>>(key, {});
  const next = {
    ...current,
    [gameId]: { ...progress, synced: false }
  };
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export async function resetAttempts(): Promise<void> {
  await AsyncStorage.removeItem(await scopedKey(ATTEMPTS_KEY));
}

export async function resetAllProgress(): Promise<void> {
  await AsyncStorage.removeItem(await scopedKey(ATTEMPTS_KEY));
  await AsyncStorage.removeItem(await scopedKey(GAME_PROGRESS_KEY));
}

export async function resetGameProgress(gameId: string): Promise<void> {
  const key = await scopedKey(GAME_PROGRESS_KEY);
  const allProgress = await readJson<Record<string, GameProgress>>(key, {});
  delete allProgress[gameId];
  await AsyncStorage.setItem(key, JSON.stringify(allProgress));
}

export async function loadSettings(): Promise<SettingsState> {
  const key = await scopedKey(SETTINGS_KEY);
  const settings = await readJson<SettingsState | null>(key, null);
  if (!settings) return defaultSettings;
  return { ...defaultSettings, ...settings };
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await AsyncStorage.setItem(await scopedKey(SETTINGS_KEY), JSON.stringify(settings));
}
