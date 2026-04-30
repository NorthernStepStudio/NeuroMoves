export type ActivityCategory = 'speech' | 'ot';
export type ActivityType = 'speech' | 'prompt' | 'tap' | 'drag' | 'trace' | 'sensory';
export type AttemptResult = 'success' | 'tried' | 'skipped';

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  type: ActivityType;
  durationMinutes: number;
  prompts: string[];
  tips: string[];
  benefits: string[];
}

export interface ActivityAttempt {
  id: string;
  activityId: string;
  dateISO: string;
  result: AttemptResult;
  audioUri?: string;
  synced?: boolean; // New sync marker
}

export interface GameProgress {
  currentLevel: number;
  highestLevel: number;
  attempts: number;
  successes: number;
  lastPlayedAt?: string;
  synced?: boolean; // New sync marker
}

export interface SettingsState {
  childAgeMonths: number;
  parentModeEnabled: boolean;
  audioMuted: boolean;
  voiceVolume: number;    // 0.0 to 1.0
  sfxVolume: number;      // 0.0 to 1.0
  voiceMuted: boolean;
  sfxMuted: boolean;
  hapticEnabled: boolean; // New setting
  hapticStrength: 'low' | 'medium' | 'high'; // New setting
}
