import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_RECORDS_KEY = 'reallife_onboarding_records_v1';

export type DevelopmentFocus = 'motor' | 'speech' | 'cognitive' | 'sensory';
export type BaselineDifficulty = 'easy' | 'standard' | 'challenge';

export interface InitialAssessmentAnswers {
  followsTwoStepInstructions: boolean;
  usesShortPhrases: boolean;
  completesSimplePuzzles: boolean;
}

export interface OnboardingRecord {
  childId: number;
  childName: string;
  ageMonths: number;
  language: string;
  developmentFocus: DevelopmentFocus;
  baselineDifficulty: BaselineDifficulty;
  assessment: InitialAssessmentAnswers;
  completedAt: string;
}

async function loadAll(): Promise<Record<string, OnboardingRecord>> {
  const raw = await AsyncStorage.getItem(ONBOARDING_RECORDS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, OnboardingRecord>;
    return parsed || {};
  } catch {
    return {};
  }
}

export async function saveOnboardingRecord(record: OnboardingRecord): Promise<void> {
  const current = await loadAll();
  current[String(record.childId)] = record;
  await AsyncStorage.setItem(ONBOARDING_RECORDS_KEY, JSON.stringify(current));
}

export async function getOnboardingRecord(childId: number): Promise<OnboardingRecord | null> {
  const all = await loadAll();
  return all[String(childId)] || null;
}

export function deriveBaselineDifficulty(answers: InitialAssessmentAnswers): BaselineDifficulty {
  const score = [
    answers.followsTwoStepInstructions,
    answers.usesShortPhrases,
    answers.completesSimplePuzzles,
  ].filter(Boolean).length;

  if (score <= 1) return 'easy';
  if (score === 2) return 'standard';
  return 'challenge';
}
