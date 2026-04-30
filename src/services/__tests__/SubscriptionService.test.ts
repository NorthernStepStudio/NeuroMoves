import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionService, EntitlementTier } from '../SubscriptionService';
import Purchases from 'react-native-purchases';

const ENTITLEMENT_KEY = 'reallife_subscription_entitlement_v1';

beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
});

describe('SubscriptionService', () => {
    describe('getEntitlement', () => {
        it('returns free tier by default from revenuecat', async () => {
            const ent = await SubscriptionService.getEntitlement();
            expect(ent.tier).toBe('free');
            expect(ent.source).toBe('revenuecat');
        });

        it('returns stored entitlement when set (offline fallback)', async () => {
            jest.spyOn(Purchases, 'getCustomerInfo').mockRejectedValueOnce(new Error('offline'));
            await SubscriptionService.setTier('pro');
            const ent = await SubscriptionService.getEntitlement();
            expect(ent.tier).toBe('pro');
        });

        it('returns free tier on corrupt data (offline fallback)', async () => {
            jest.spyOn(Purchases, 'getCustomerInfo').mockRejectedValueOnce(new Error('offline'));
            await AsyncStorage.setItem(ENTITLEMENT_KEY, 'not-json');
            const ent = await SubscriptionService.getEntitlement();
            expect(ent.tier).toBe('free');
        });

        it('returns free tier on missing tier field (offline fallback)', async () => {
            jest.spyOn(Purchases, 'getCustomerInfo').mockRejectedValueOnce(new Error('offline'));
            await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify({ source: 'local' }));
            const ent = await SubscriptionService.getEntitlement();
            expect(ent.tier).toBe('free');
        });
    });

    describe('setTier', () => {
        it('persists pro tier', async () => {
            await SubscriptionService.setTier('pro');
            const raw = await AsyncStorage.getItem(ENTITLEMENT_KEY);
            const parsed = JSON.parse(raw!);
            expect(parsed.tier).toBe('pro');
            expect(parsed.source).toBe('local');
            expect(parsed.updatedAt).toBeDefined();
        });

        it('can downgrade back to free', async () => {
            jest.spyOn(Purchases, 'getCustomerInfo').mockRejectedValueOnce(new Error('offline'));
            await SubscriptionService.setTier('pro');
            await SubscriptionService.setTier('free');
            const ent = await SubscriptionService.getEntitlement();
            expect(ent.tier).toBe('free');
        });
    });

    describe('hasProEntitlement', () => {
        it('returns false by default', async () => {
            expect(await SubscriptionService.hasProEntitlement()).toBe(false);
        });

        it('returns true when pro', async () => {
            jest.spyOn(Purchases, 'getCustomerInfo').mockResolvedValueOnce({
                entitlements: { active: { Pro: {} } }
            } as any);
            expect(await SubscriptionService.hasProEntitlement()).toBe(true);
        });
    });

    describe('isGameLockedForFreeTier', () => {
        const FREE_GAMES = ['pop-bubbles', 'color-match', 'stacking', 'tracing'];
        const PRO_GAMES = ['yes-no', 'point-it-out', 'shape-sorting', 'baby-signs',
            'magic-fingers', 'emotions', 'body-parts', 'animal-sounds',
            'size-ordering'];

        it('allows free games', () => {
            FREE_GAMES.forEach(id => {
                expect(SubscriptionService.isGameLockedForFreeTier(id)).toBe(false);
            });
        });

        it('locks pro games', () => {
            PRO_GAMES.forEach(id => {
                expect(SubscriptionService.isGameLockedForFreeTier(id)).toBe(true);
            });
        });
    });
});
