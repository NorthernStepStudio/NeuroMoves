import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailyStreak } from './progress';
import { ActivityAttempt, GameProgress } from './types';
import { JournalEntry } from './journal';
import { getScopedStorageKey } from './storage';
import { ACHIEVEMENTS_KEY } from './storageKeys';

type AchievementMetric = 'attempts' | 'successes' | 'streak' | 'games' | 'journal';

export interface AchievementDefinition {
  id: string;
  sticker: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
}

export interface AchievementStatus extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  progressValue: number;
  progressPercent: number;
}

export interface AchievementStore {
  unlockedAtById: Record<string, string>;
}

export interface AchievementMetrics {
  attempts: ActivityAttempt[];
  gameProgress: Record<string, GameProgress>;
  journalEntries: JournalEntry[];
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-steps',
    sticker: '🌱',
    title: 'First Steps',
    description: 'Complete your first activity attempt.',
    metric: 'attempts',
    target: 1
  },
  {
    id: 'streak-3',
    sticker: '🔥',
    title: '3 Day Streak',
    description: 'Practice on 3 consecutive days.',
    metric: 'streak',
    target: 3
  },
  {
    id: 'streak-5',
    sticker: '🏅',
    title: '5 Day Streak',
    description: 'Practice on 5 consecutive days.',
    metric: 'streak',
    target: 5
  },
  {
    id: 'streak-10',
    sticker: '🏆',
    title: '10 Day Streak',
    description: 'Practice on 10 consecutive days.',
    metric: 'streak',
    target: 10
  },
  {
    id: 'success-25',
    sticker: '⭐',
    title: '25 Successes',
    description: 'Reach 25 successful attempts.',
    metric: 'successes',
    target: 25
  },
  {
    id: 'attempts-50',
    sticker: '🎯',
    title: '50 Attempts',
    description: 'Complete 50 total attempts.',
    metric: 'attempts',
    target: 50
  },
  {
    id: 'explorer-6',
    sticker: '🧭',
    title: 'Skill Explorer',
    description: 'Try 6 different game modules.',
    metric: 'games',
    target: 6
  },
  {
    id: 'journal-3',
    sticker: '📘',
    title: 'Journal Starter',
    description: 'Add 3 real-life journal entries.',
    metric: 'journal',
    target: 3
  },
  {
    id: 'journal-7',
    sticker: '📚',
    title: 'Journal Hero',
    description: 'Add 7 real-life journal entries.',
    metric: 'journal',
    target: 7
  }
];

async function achievementStorageKey(): Promise<string> {
  return getScopedStorageKey(ACHIEVEMENTS_KEY);
}

export async function loadAchievementStore(): Promise<AchievementStore> {
  const key = await achievementStorageKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { unlockedAtById: {} };

  try {
    const parsed = JSON.parse(raw) as AchievementStore;
    return {
      unlockedAtById: parsed.unlockedAtById || {}
    };
  } catch {
    return { unlockedAtById: {} };
  }
}

export async function saveAchievementStore(store: AchievementStore): Promise<void> {
  const key = await achievementStorageKey();
  await AsyncStorage.setItem(key, JSON.stringify(store));
}

export async function mergeAchievementUnlocksFromRemote(remoteUnlocks: Record<string, string>): Promise<AchievementStore> {
  const local = await loadAchievementStore();
  const merged: Record<string, string> = { ...local.unlockedAtById };

  for (const [id, remoteTime] of Object.entries(remoteUnlocks)) {
    if (!id || !remoteTime) continue;
    const localTime = merged[id];
    if (!localTime) {
      merged[id] = remoteTime;
      continue;
    }
    const localTs = new Date(localTime).getTime();
    const remoteTs = new Date(remoteTime).getTime();
    merged[id] = Number.isFinite(localTs) && Number.isFinite(remoteTs) && localTs <= remoteTs
      ? localTime
      : remoteTime;
  }

  const next = { unlockedAtById: merged };
  await saveAchievementStore(next);
  return next;
}

function getMetricValue(metric: AchievementMetric, metrics: AchievementMetrics): number {
  switch (metric) {
    case 'attempts':
      return metrics.attempts.length;
    case 'successes':
      return metrics.attempts.filter(a => a.result === 'success').length;
    case 'streak':
      return getDailyStreak(metrics.attempts);
    case 'games':
      return Object.keys(metrics.gameProgress).length;
    case 'journal':
      return metrics.journalEntries.length;
    default:
      return 0;
  }
}

export async function evaluateAndStoreAchievements(metrics: AchievementMetrics): Promise<{
  statuses: AchievementStatus[];
  newlyUnlocked: AchievementStatus[];
}> {
  const store = await loadAchievementStore();
  const unlockedAtById = { ...store.unlockedAtById };
  const now = new Date().toISOString();

  const statuses: AchievementStatus[] = ACHIEVEMENT_DEFINITIONS.map(def => {
    const value = getMetricValue(def.metric, metrics);
    const unlocked = value >= def.target;
    const existingUnlockAt = unlockedAtById[def.id];

    if (unlocked && !existingUnlockAt) {
      unlockedAtById[def.id] = now;
    }

    return {
      ...def,
      unlocked,
      unlockedAt: unlocked ? unlockedAtById[def.id] : undefined,
      progressValue: value,
      progressPercent: Math.min(100, Math.round((value / def.target) * 100))
    };
  });

  const newlyUnlocked = statuses.filter(
    status => status.unlocked && status.unlockedAt === now
  );

  await saveAchievementStore({ unlockedAtById });

  return { statuses, newlyUnlocked };
}

export async function getAchievementStatuses(metrics: AchievementMetrics): Promise<AchievementStatus[]> {
  const result = await evaluateAndStoreAchievements(metrics);
  return result.statuses;
}

export async function getUnlockedAchievementIds(metrics: AchievementMetrics): Promise<string[]> {
  const statuses = await getAchievementStatuses(metrics);
  return statuses.filter(item => item.unlocked).map(item => item.id);
}
