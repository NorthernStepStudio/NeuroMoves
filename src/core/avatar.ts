import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedStorageKey } from './storage';
import { AVATAR_PROFILE_KEY } from './storageKeys';

export type AvatarSlot = 'bodyColor' | 'face' | 'hat' | 'accessory' | 'background';

export interface AvatarOption {
  id: string;
  label: string;
  slot: AvatarSlot;
  preview: string;
  value: string;
  unlockAchievementId?: string;
}

export interface AvatarProfile {
  bodyColor: string;
  face: string;
  hat: string;
  accessory: string;
  background: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'body-sunrise', label: 'Sunrise', slot: 'bodyColor', preview: '🟠', value: '#fb923c' },
  { id: 'body-ocean', label: 'Ocean', slot: 'bodyColor', preview: '🔵', value: '#38bdf8', unlockAchievementId: 'first-steps' },
  { id: 'body-forest', label: 'Forest', slot: 'bodyColor', preview: '🟢', value: '#34d399', unlockAchievementId: 'streak-3' },
  { id: 'body-royal', label: 'Royal', slot: 'bodyColor', preview: '🟣', value: '#a78bfa', unlockAchievementId: 'success-25' },

  { id: 'face-smile', label: 'Smile', slot: 'face', preview: '🙂', value: '🙂' },
  { id: 'face-star', label: 'Star Eyes', slot: 'face', preview: '🤩', value: '🤩', unlockAchievementId: 'streak-5' },
  { id: 'face-cool', label: 'Cool', slot: 'face', preview: '😎', value: '😎', unlockAchievementId: 'attempts-50' },

  { id: 'hat-none', label: 'No Hat', slot: 'hat', preview: '—', value: '' },
  { id: 'hat-crown', label: 'Crown', slot: 'hat', preview: '👑', value: '👑', unlockAchievementId: 'streak-5' },
  { id: 'hat-rocket', label: 'Rocket', slot: 'hat', preview: '🚀', value: '🚀', unlockAchievementId: 'explorer-6' },

  { id: 'acc-none', label: 'No Accessory', slot: 'accessory', preview: '—', value: '' },
  { id: 'acc-cape', label: 'Cape', slot: 'accessory', preview: '🦸', value: '🦸', unlockAchievementId: 'success-25' },
  { id: 'acc-book', label: 'Book', slot: 'accessory', preview: '📖', value: '📖', unlockAchievementId: 'journal-3' },
  { id: 'acc-magic', label: 'Magic', slot: 'accessory', preview: '🪄', value: '🪄', unlockAchievementId: 'journal-7' },

  { id: 'bg-soft', label: 'Soft', slot: 'background', preview: '☁️', value: '#fff7ed' },
  { id: 'bg-sky', label: 'Sky', slot: 'background', preview: '🌤️', value: '#e0f2fe', unlockAchievementId: 'streak-3' },
  { id: 'bg-garden', label: 'Garden', slot: 'background', preview: '🌿', value: '#ecfdf5', unlockAchievementId: 'journal-3' },
  { id: 'bg-night', label: 'Night', slot: 'background', preview: '🌌', value: '#ede9fe', unlockAchievementId: 'streak-10' },
];

const defaultProfile: AvatarProfile = {
  bodyColor: '#fb923c',
  face: '🙂',
  hat: '',
  accessory: '',
  background: '#fff7ed'
};

async function avatarStorageKey(): Promise<string> {
  return getScopedStorageKey(AVATAR_PROFILE_KEY);
}

export async function loadAvatarProfile(): Promise<AvatarProfile> {
  const key = await avatarStorageKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return defaultProfile;

  try {
    const parsed = JSON.parse(raw) as AvatarProfile;
    return {
      ...defaultProfile,
      ...parsed
    };
  } catch {
    return defaultProfile;
  }
}

export async function saveAvatarProfileRaw(profile: AvatarProfile): Promise<AvatarProfile> {
  const next = {
    ...defaultProfile,
    ...profile
  };
  const key = await avatarStorageKey();
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

function isOptionUnlocked(option: AvatarOption, unlockedAchievementIds: string[]): boolean {
  if (!option.unlockAchievementId) return true;
  return unlockedAchievementIds.includes(option.unlockAchievementId);
}

export function getAvatarOptionsBySlot(slot: AvatarSlot, unlockedAchievementIds: string[]): Array<AvatarOption & { unlocked: boolean }> {
  return AVATAR_OPTIONS.filter(option => option.slot === slot).map(option => ({
    ...option,
    unlocked: isOptionUnlocked(option, unlockedAchievementIds)
  }));
}

export async function saveAvatarProfile(
  profile: AvatarProfile,
  unlockedAchievementIds: string[]
): Promise<AvatarProfile> {
  const validated: AvatarProfile = { ...profile };

  (['bodyColor', 'face', 'hat', 'accessory', 'background'] as AvatarSlot[]).forEach(slot => {
    const selected = AVATAR_OPTIONS.find(option => option.slot === slot && option.value === profile[slot]);
    const fallback = AVATAR_OPTIONS.find(option => option.slot === slot && !option.unlockAchievementId);
    if (!selected || !isOptionUnlocked(selected, unlockedAchievementIds)) {
      validated[slot] = fallback?.value || defaultProfile[slot];
    }
  });

  return saveAvatarProfileRaw(validated);
}
