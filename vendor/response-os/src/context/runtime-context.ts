export type RuntimePlatform = 'mobile' | 'web' | 'backend' | 'cli' | 'unknown';

export interface RuntimeCapabilities {
  camera?: boolean;
  fileUpload?: boolean;
  notifications?: boolean;
  vision?: boolean;
  [key: string]: boolean | undefined;
}

export type PolicyProfileId = 'general' | 'kids-safe' | 'enterprise' | 'medical-safe' | 'finance-safe';

export interface RuntimeContext {
  appId: string;
  userId: string;
  sessionId: string;
  locale: string;
  timezone: string;
  platform: RuntimePlatform;
  capabilities: RuntimeCapabilities;
  policyProfile: PolicyProfileId;
  requestTraceId: string;
  requestedAt: string;
}

export interface RuntimeContextInput extends Partial<RuntimeContext> {
  appId: string;
}

export function createRuntimeContext(input: RuntimeContextInput): RuntimeContext {
  return {
    appId: input.appId,
    userId: input.userId ?? 'anonymous',
    sessionId: input.sessionId ?? generateId('session'),
    locale: input.locale ?? 'en-US',
    timezone: input.timezone ?? 'UTC',
    platform: input.platform ?? 'unknown',
    capabilities: input.capabilities ?? {},
    policyProfile: input.policyProfile ?? 'general',
    requestTraceId: input.requestTraceId ?? generateId('trace'),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
  };
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
