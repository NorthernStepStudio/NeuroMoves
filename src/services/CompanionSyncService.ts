import { loadAchievementStore, mergeAchievementUnlocksFromRemote } from '../core/achievements';
import { loadAvatarProfile, saveAvatarProfileRaw } from '../core/avatar';
import { JournalEntry, loadJournalEntries, saveJournalEntries } from '../core/journal';
import { AccountService } from './AccountService';

export interface CompanionSyncResult {
  success: boolean;
  journalEntriesSynced: number;
  achievementUnlocksSynced: number;
  error?: string;
}

function toRemoteJournal(entries: JournalEntry[]) {
  return entries.map(entry => ({
    id: entry.id,
    text: entry.text,
    photo_uri: entry.photoUri,
    created_at: entry.createdAt,
  }));
}

function fromRemoteJournal(entries: Array<{ id: string; text: string; photo_uri?: string; created_at: string }>): JournalEntry[] {
  return entries.map(entry => ({
    id: entry.id,
    text: entry.text,
    photoUri: entry.photo_uri,
    createdAt: entry.created_at,
  }));
}

export class CompanionSyncService {
  private static inFlight: Promise<CompanionSyncResult> | null = null;

  static async sync(childId?: number): Promise<CompanionSyncResult> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.syncInternal(childId).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private static async syncInternal(childId?: number): Promise<CompanionSyncResult> {
    const token = await AccountService.getAccessToken();
    const activeChildId = childId ?? await AccountService.getActiveChildId();

    if (!token || !activeChildId) {
      return {
        success: false,
        journalEntriesSynced: 0,
        achievementUnlocksSynced: 0,
        error: 'Missing auth token or active child profile',
      };
    }

    try {
      const [localJournal, localAvatar, localAchievements] = await Promise.all([
        loadJournalEntries(),
        loadAvatarProfile(),
        loadAchievementStore()
      ]);

      const response = await AccountService.syncCompanionData(token, activeChildId, {
        journal_entries: toRemoteJournal(localJournal),
        avatar_profile: {
          bodyColor: localAvatar.bodyColor,
          face: localAvatar.face,
          hat: localAvatar.hat,
          accessory: localAvatar.accessory,
          background: localAvatar.background,
        },
        achievement_unlocks: localAchievements.unlockedAtById,
      });

      await Promise.all([
        saveJournalEntries(fromRemoteJournal(response.journal_entries || [])),
        saveAvatarProfileRaw({
          bodyColor: response.avatar_profile?.bodyColor || localAvatar.bodyColor,
          face: response.avatar_profile?.face || localAvatar.face,
          hat: response.avatar_profile?.hat || localAvatar.hat,
          accessory: response.avatar_profile?.accessory || localAvatar.accessory,
          background: response.avatar_profile?.background || localAvatar.background,
        }),
        mergeAchievementUnlocksFromRemote(response.achievement_unlocks || {}),
      ]);

      return {
        success: true,
        journalEntriesSynced: response.counts?.journal_entries_synced || 0,
        achievementUnlocksSynced: response.counts?.achievement_unlocks_synced || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        journalEntriesSynced: 0,
        achievementUnlocksSynced: 0,
        error: error?.message || 'Companion sync failed'
      };
    }
  }

  static async deleteJournalEntryRemote(entryId: string, childId?: number): Promise<void> {
    const token = await AccountService.getAccessToken();
    const activeChildId = childId ?? await AccountService.getActiveChildId();
    if (!token || !activeChildId) return;

    try {
      await AccountService.deleteJournalEntry(token, activeChildId, entryId);
    } catch {
      // Keep local delete even if remote delete fails; next sync reconciles.
    }
  }
}
