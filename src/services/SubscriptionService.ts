import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTITLEMENT_KEY = 'reallife_subscription_entitlement_v1';

export type EntitlementTier = 'free' | 'pro';

export interface EntitlementState {
  tier: EntitlementTier;
  source: 'local' | 'revenuecat';
  updatedAt: string;
}

function defaultEntitlement(): EntitlementState {
  return {
    tier: 'pro',
    source: 'local', // Fallback local source
    updatedAt: new Date().toISOString()
  };
}

export class SubscriptionService {
  static async init() {
    // Pro gating is disabled in-app: all content is unlocked.
  }

  static async getEntitlement(): Promise<EntitlementState> {
    const unlocked = defaultEntitlement();
    await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(unlocked));
    return unlocked;
  }

  static async setTier(_tier: EntitlementTier): Promise<void> {
    // Ignore requested tier and keep all content unlocked.
    const next: EntitlementState = {
      tier: 'pro',
      source: 'local',
      updatedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(next));
  }

  static async hasProEntitlement(): Promise<boolean> {
    return true;
  }

  static isGameLockedForFreeTier(_gameId: string): boolean {
    return false;
  }
}
