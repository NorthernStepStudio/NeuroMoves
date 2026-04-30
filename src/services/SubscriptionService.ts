import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { GameId } from '../core/gameTypes';

const ENTITLEMENT_KEY = 'reallife_subscription_entitlement_v1';
const PRO_ENTITLEMENT_ID = 'Pro'; // Ensure this matches your RevenueCat entitlement ID

export type EntitlementTier = 'free' | 'pro';

export interface EntitlementState {
  tier: EntitlementTier;
  source: 'local' | 'revenuecat';
  updatedAt: string;
}

const FREE_GAME_IDS: GameId[] = [
  'pop-bubbles',
  'color-match',
  'stacking',
  'tracing',
  'number-tracing',
  'letter-recognition',
  'number-recognition'
];

function defaultEntitlement(): EntitlementState {
  return {
    tier: 'free',
    source: 'local', // Fallback local source
    updatedAt: new Date(0).toISOString()
  };
}

export class SubscriptionService {
  static async init() {
    try {
      if (Platform.OS === 'ios') {
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
        if (apiKey) Purchases.configure({ apiKey });
      } else if (Platform.OS === 'android') {
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
        if (apiKey) Purchases.configure({ apiKey });
      }
    } catch (e) {
      console.warn('Failed to initialize RevenueCat:', e);
    }
  }

  static async getEntitlement(): Promise<EntitlementState> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';

      const newState: EntitlementState = {
        tier: isPro ? 'pro' : 'free',
        source: 'revenuecat',
        updatedAt: new Date().toISOString()
      };

      // Cache it locally just in case
      await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(newState));
      return newState;
    } catch (e) {
      console.warn('Failed to get entitlement from RevenueCat, falling back to local cache', e);
      // Fallback to local cache if offline
      const raw = await AsyncStorage.getItem(ENTITLEMENT_KEY);
      if (!raw) return defaultEntitlement();
      try {
        const parsed = JSON.parse(raw) as EntitlementState;
        if (!parsed?.tier) return defaultEntitlement();
        return parsed;
      } catch {
        return defaultEntitlement();
      }
    }
  }

  static async setTier(tier: EntitlementTier): Promise<void> {
    // This method is largely for local dev/testing now, as RevenueCat handles the actual truth
    const next: EntitlementState = {
      tier,
      source: 'local',
      updatedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(next));
  }

  static async hasProEntitlement(): Promise<boolean> {
    const entitlement = await this.getEntitlement();
    return entitlement.tier === 'pro';
  }

  static isGameLockedForFreeTier(gameId: string): boolean {
    return !FREE_GAME_IDS.includes(gameId as GameId);
  }
}
