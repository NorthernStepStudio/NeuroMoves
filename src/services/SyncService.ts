import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAttemptsStorageKeyForActiveChild,
  getGameProgressStorageKeyForActiveChild,
  loadAttempts,
  loadGameProgress
} from '../core/storage';
import { API_BASE_URL } from './ApiConfig';
import { AccountService } from './AccountService';

export interface SyncResult {
  progressSynced: number;
  attemptsSynced: number;
  success: boolean;
  error?: string;
}

export class SyncService {
  private static inFlight: Promise<SyncResult> | null = null;
  private static readonly RETRY_QUEUE_KEY = 'reallife_sync_retry_queue_v1';

  static async performSync(childId?: number): Promise<SyncResult> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.performSyncInternal(childId).finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /**
   * Replay any queued sync payloads from previous failed attempts.
   */
  private static async replayQueue(token: string): Promise<number> {
    const raw = await AsyncStorage.getItem(this.RETRY_QUEUE_KEY);
    if (!raw) return 0;

    let queue: Array<{ childId: number; payload: any }>;
    try {
      queue = JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(this.RETRY_QUEUE_KEY);
      return 0;
    }

    if (!Array.isArray(queue) || queue.length === 0) return 0;

    const remaining: typeof queue = [];
    let replayed = 0;

    for (const item of queue) {
      try {
        const endpoint = `${API_BASE_URL}/users/${item.childId}/sync`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (response.ok) {
          replayed++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(this.RETRY_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(this.RETRY_QUEUE_KEY);
    }

    return replayed;
  }

  /**
   * Enqueue a failed sync payload for future retry (max 20 entries).
   */
  private static async enqueueForRetry(childId: number, payload: any): Promise<void> {
    const raw = await AsyncStorage.getItem(this.RETRY_QUEUE_KEY);
    let queue: Array<{ childId: number; payload: any }> = [];
    try {
      queue = raw ? JSON.parse(raw) : [];
    } catch {
      queue = [];
    }
    queue.push({ childId, payload });
    // Cap at 20 entries to avoid unbounded growth
    if (queue.length > 20) queue = queue.slice(-20);
    await AsyncStorage.setItem(this.RETRY_QUEUE_KEY, JSON.stringify(queue));
  }

  private static async performSyncInternal(childId?: number): Promise<SyncResult> {
    try {
      const token = await AccountService.getAccessToken();
      if (!token || token.startsWith('mock-dev-token')) {
        return {
          progressSynced: 0,
          attemptsSynced: 0,
          success: !token ? false : true,
          error: !token ? 'No active session token' : undefined
        };
      }

      // Replay any previously queued payloads first
      await this.replayQueue(token);

      const activeChildId = childId ?? await AccountService.getActiveChildId();
      if (!activeChildId) {
        return {
          progressSynced: 0,
          attemptsSynced: 0,
          success: false,
          error: 'No active child selected'
        };
      }

      const attempts = await loadAttempts();
      const progress = await loadGameProgress();

      const unsyncedAttempts = attempts.filter(a => !a.synced);
      const unsyncedProgressEntries = Object.entries(progress).filter(([, p]) => !p.synced);

      if (unsyncedAttempts.length === 0 && unsyncedProgressEntries.length === 0) {
        return { progressSynced: 0, attemptsSynced: 0, success: true };
      }

      const syncPayload = {
        progress: unsyncedProgressEntries.map(([moduleId, p]) => ({
          module: moduleId,
          level: p.currentLevel,
          attempts: p.attempts,
          successes: p.successes,
          last_played: p.lastPlayedAt
        })),
        attempts: unsyncedAttempts
      };

      const endpoint = `${API_BASE_URL}/users/${activeChildId}/sync`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // Shortened to 5s
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(syncPayload),
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeout);
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        const message = `Sync failed (${response.status} ${response.statusText})${responseText ? `: ${responseText}` : ''}`;
        if (response.status === 401 || response.status === 403) {
          return {
            progressSynced: 0,
            attemptsSynced: 0,
            success: false,
            error: 'Unauthorized sync request. Please sign in again.'
          };
        }
        // Queue for retry on server errors
        await this.enqueueForRetry(activeChildId, syncPayload);
        throw new Error(message);
      }

      const result = await response.json();
      if (!result.success) {
        return {
          progressSynced: 0,
          attemptsSynced: 0,
          success: false,
          error: 'Backend sync response was unsuccessful'
        };
      }

      const attemptsKey = await getAttemptsStorageKeyForActiveChild();
      const progressKey = await getGameProgressStorageKeyForActiveChild();

      const updatedAttempts = attempts.map(a => (a.synced ? a : { ...a, synced: true }));
      await AsyncStorage.setItem(attemptsKey, JSON.stringify(updatedAttempts));

      const updatedProgress = { ...progress };
      unsyncedProgressEntries.forEach(([moduleId]) => {
        updatedProgress[moduleId].synced = true;
      });
      await AsyncStorage.setItem(progressKey, JSON.stringify(updatedProgress));

      return {
        progressSynced: result.counts?.progress || 0,
        attemptsSynced: result.counts?.attempts || 0,
        success: true
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('[SyncService] Sync timeout after 5s');
        return {
          progressSynced: 0,
          attemptsSynced: 0,
          success: false,
          error: 'Sync timed out'
        };
      }

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(
          `[SyncService] Network request failed for ${API_BASE_URL}. ` +
          'Set EXPO_PUBLIC_API_BASE_URL when testing on a physical device ' +
          '(example: http://192.168.1.42:5000/api).'
        );
      }
      console.error('[SyncService] Sync Error:', error);
      return {
        progressSynced: 0,
        attemptsSynced: 0,
        success: false,
        error: error?.message || 'Unknown sync error'
      };
    }
  }
}

