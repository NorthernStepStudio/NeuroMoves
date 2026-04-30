import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the storage helpers and other dependencies
jest.mock('../../core/storage', () => ({
    loadAttempts: jest.fn().mockResolvedValue([]),
    loadGameProgress: jest.fn().mockResolvedValue({}),
    getAttemptsStorageKeyForActiveChild: jest.fn().mockResolvedValue('attempts_1'),
    getGameProgressStorageKeyForActiveChild: jest.fn().mockResolvedValue('progress_1'),
}));

jest.mock('../AccountService', () => ({
    AccountService: {
        getAccessToken: jest.fn().mockResolvedValue('test-token'),
        getActiveChildId: jest.fn().mockResolvedValue(1),
    },
}));

jest.mock('../ApiConfig', () => ({
    API_BASE_URL: 'http://localhost:5000/api',
}));

import { SyncService } from '../SyncService';
import { AccountService } from '../AccountService';
import { loadAttempts, loadGameProgress } from '../../core/storage';

beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
});

describe('SyncService', () => {
    describe('performSync', () => {
        it('returns early if no token', async () => {
            (AccountService.getAccessToken as jest.Mock).mockResolvedValueOnce(null);
            const result = await SyncService.performSync();
            expect(result.success).toBe(false);
            expect(result.error).toContain('No active session');
        });

        it('returns early with mock-dev-token', async () => {
            (AccountService.getAccessToken as jest.Mock).mockResolvedValueOnce('mock-dev-token-123');
            const result = await SyncService.performSync();
            expect(result.success).toBe(true);
            expect(result.progressSynced).toBe(0);
        });

        it('returns early if no child selected', async () => {
            (AccountService.getActiveChildId as jest.Mock).mockResolvedValueOnce(null);
            const result = await SyncService.performSync();
            expect(result.success).toBe(false);
            expect(result.error).toContain('No active child');
        });

        it('skips sync when nothing is unsynced', async () => {
            (loadAttempts as jest.Mock).mockResolvedValueOnce([]);
            (loadGameProgress as jest.Mock).mockResolvedValueOnce({});
            const result = await SyncService.performSync();
            expect(result.success).toBe(true);
            expect(result.progressSynced).toBe(0);
            expect(result.attemptsSynced).toBe(0);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('syncs unsynced data successfully', async () => {
            (loadAttempts as jest.Mock).mockResolvedValueOnce([
                { id: 'a1', activityId: 'color-match', dateISO: '2026-01-01', result: 'success', synced: false },
            ]);
            (loadGameProgress as jest.Mock).mockResolvedValueOnce({
                'A': { currentLevel: 2, attempts: 5, successes: 3, lastPlayedAt: '2026-01-01', synced: false },
            });

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    counts: { progress: 1, attempts: 1 },
                }),
            });

            const result = await SyncService.performSync();
            expect(result.success).toBe(true);
            expect(result.progressSynced).toBe(1);
            expect(result.attemptsSynced).toBe(1);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('handles network error gracefully', async () => {
            (loadAttempts as jest.Mock).mockResolvedValueOnce([
                { id: 'a1', activityId: 'test', dateISO: '2026-01-01', result: 'success', synced: false },
            ]);
            (loadGameProgress as jest.Mock).mockResolvedValueOnce({});

            const networkError = new TypeError('Network request failed');
            (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

            const result = await SyncService.performSync();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('handles 401 response', async () => {
            (loadAttempts as jest.Mock).mockResolvedValueOnce([
                { id: 'a1', activityId: 'test', dateISO: '2026-01-01', result: 'success', synced: false },
            ]);
            (loadGameProgress as jest.Mock).mockResolvedValueOnce({});

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: () => Promise.resolve('Invalid token'),
            });

            const result = await SyncService.performSync();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unauthorized');
        });

        it('deduplicates concurrent syncs', async () => {
            (loadAttempts as jest.Mock).mockResolvedValue([]);
            (loadGameProgress as jest.Mock).mockResolvedValue({});

            const [r1, r2] = await Promise.all([
                SyncService.performSync(),
                SyncService.performSync(),
            ]);

            // Both should succeed and return the same result
            expect(r1.success).toBe(true);
            expect(r2.success).toBe(true);
        });
    });
});
