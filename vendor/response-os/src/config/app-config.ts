import type { PolicyProfileId } from '../context/runtime-context.js';
import type { RequestBudget } from '../core/budget.js';

export interface AppConfig {
  appId: string;
  enabledTools: string[];
  policyProfile: PolicyProfileId;
  defaultProvider: 'off' | 'mock' | 'gemini';
  budgetDefaults: RequestBudget;
  routingOverrides?: Partial<{
    forceTemplateMode: boolean;
    forceSafeMode: boolean;
  }>;
  allowedOutputFormats: Array<'text' | 'json' | 'markdown'>;
}

const DEFAULT_BUDGET: RequestBudget = {
  maxSteps: 6,
  maxLlmCalls: 2,
  maxTokensIn: 4000,
  maxTokensOut: 2000,
  maxToolCalls: 3,
  maxMs: 10000,
};

export function createDefaultAppConfig(appId: string): AppConfig {
  return {
    appId,
    enabledTools: [],
    policyProfile: 'general',
    defaultProvider: 'off',
    budgetDefaults: DEFAULT_BUDGET,
    allowedOutputFormats: ['text', 'json'],
  };
}
