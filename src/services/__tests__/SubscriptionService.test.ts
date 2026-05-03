import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionService } from '../SubscriptionService';

const ENTITLEMENT_KEY = 'reallife_subscription_entitlement_v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('SubscriptionService', () => {
  describe('getEntitlement', () => {
    it('returns pro tier by default from local unlock state', async () => {
      const ent = await SubscriptionService.getEntitlement();
      expect(ent.tier).toBe('pro');
      expect(ent.source).toBe('local');
    });

    it('returns pro tier when storage contains corrupt data', async () => {
      await AsyncStorage.setItem(ENTITLEMENT_KEY, 'not-json');
      const ent = await SubscriptionService.getEntitlement();
      expect(ent.tier).toBe('pro');
      expect(ent.source).toBe('local');
    });

    it('returns pro tier when storage is missing required fields', async () => {
      await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify({ source: 'local' }));
      const ent = await SubscriptionService.getEntitlement();
      expect(ent.tier).toBe('pro');
      expect(ent.source).toBe('local');
    });
  });

  describe('setTier', () => {
    it('persists pro tier when explicitly set to pro', async () => {
      await SubscriptionService.setTier('pro');
      const raw = await AsyncStorage.getItem(ENTITLEMENT_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.tier).toBe('pro');
      expect(parsed.source).toBe('local');
      expect(parsed.updatedAt).toBeDefined();
    });

    it('keeps pro tier even when free is requested', async () => {
      await SubscriptionService.setTier('free');
      const ent = await SubscriptionService.getEntitlement();
      expect(ent.tier).toBe('pro');
      expect(ent.source).toBe('local');
    });
  });

  describe('hasProEntitlement', () => {
    it('always returns true', async () => {
      expect(await SubscriptionService.hasProEntitlement()).toBe(true);
    });
  });

  describe('isGameLockedForFreeTier', () => {
    const GAME_IDS = [
      'pop-bubbles',
      'color-match',
      'stacking',
      'tracing',
      'yes-no',
      'point-it-out',
      'shape-sorting',
      'baby-signs',
      'magic-fingers',
      'emotions',
      'body-parts',
      'animal-sounds',
      'size-ordering',
    ];

    it('never locks any game', () => {
      GAME_IDS.forEach((id) => {
        expect(SubscriptionService.isGameLockedForFreeTier(id)).toBe(false);
      });
    });
  });
});
