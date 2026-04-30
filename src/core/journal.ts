import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedStorageKey } from './storage';
import { JOURNAL_KEY } from './storageKeys';

export interface JournalEntry {
  id: string;
  text: string;
  photoUri?: string;
  createdAt: string;
}

async function journalStorageKey(): Promise<string> {
  return getScopedStorageKey(JOURNAL_KEY);
}

export async function loadJournalEntries(): Promise<JournalEntry[]> {
  const key = await journalStorageKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function saveJournalEntries(entries: JournalEntry[]): Promise<void> {
  const key = await journalStorageKey();
  await AsyncStorage.setItem(key, JSON.stringify(entries));
}

export async function addJournalEntry(payload: { text: string; photoUri?: string }): Promise<JournalEntry> {
  const current = await loadJournalEntries();
  const nextEntry: JournalEntry = {
    id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: payload.text.trim(),
    photoUri: payload.photoUri,
    createdAt: new Date().toISOString()
  };

  const next = [nextEntry, ...current];
  await saveJournalEntries(next);
  return nextEntry;
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  const current = await loadJournalEntries();
  const next = current.filter(entry => entry.id !== entryId);
  await saveJournalEntries(next);
}
