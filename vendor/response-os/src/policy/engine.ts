import type { PolicyProfileId, RuntimeContext } from '../context/runtime-context.js';
import { Validators } from './validators.js';

export interface ToolPolicyInput {
  toolId: string;
  appId: string;
  policyProfile: PolicyProfileId;
  allowedTools: string[];
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  modifiedContent?: string;
}

interface PolicyProfile {
  id: PolicyProfileId;
  allowMedicalClaims: boolean;
  enforceKidSafeLanguage: boolean;
  disclaimer?: string;
}

const PROFILES: Record<PolicyProfileId, PolicyProfile> = {
  general: {
    id: 'general',
    allowMedicalClaims: false,
    enforceKidSafeLanguage: false,
  },
  'kids-safe': {
    id: 'kids-safe',
    allowMedicalClaims: false,
    enforceKidSafeLanguage: true,
    disclaimer: 'Content is educational and not medical advice.',
  },
  enterprise: {
    id: 'enterprise',
    allowMedicalClaims: false,
    enforceKidSafeLanguage: false,
  },
  'medical-safe': {
    id: 'medical-safe',
    allowMedicalClaims: false,
    enforceKidSafeLanguage: false,
    disclaimer: 'For informational use only; not a clinical diagnosis.',
  },
  'finance-safe': {
    id: 'finance-safe',
    allowMedicalClaims: false,
    enforceKidSafeLanguage: false,
    disclaimer: 'Not financial advice.',
  },
};

const MEDICAL_CLAIMS = ['diagnose', 'prescribe', 'cure', 'treat'];
const MEDICAL_DISCLOSURE_HINTS = ['diagnose', 'prescribe', 'symptom', 'treatment', 'condition', 'medical'];
const FINANCE_DISCLOSURE_HINTS = ['invest', 'investment', 'stock', 'trade', 'buy', 'sell', 'portfolio', 'financial'];

export class PolicyEngine {
  evaluateInput(content: string, context: RuntimeContext): PolicyDecision {
    const profile = PROFILES[context.policyProfile];
    if (!profile.allowMedicalClaims && containsWords(content, MEDICAL_CLAIMS)) {
      return {
        allowed: false,
        reason: 'Input contains restricted medical claims.',
      };
    }

    if (profile.enforceKidSafeLanguage && !Validators.isKidSafe(content)) {
      return {
        allowed: false,
        reason: 'Input violates kid-safe language rules.',
      };
    }

    return { allowed: true };
  }

  evaluateToolCall(input: ToolPolicyInput): PolicyDecision {
    if (!input.allowedTools.includes(input.toolId)) {
      return {
        allowed: false,
        reason: `Tool "${input.toolId}" is not allowed for app/profile.`,
      };
    }
    return { allowed: true };
  }

  evaluateOutput(content: string, context: RuntimeContext): PolicyDecision {
    const profile = PROFILES[context.policyProfile];
    if (!profile.allowMedicalClaims && containsWords(content, MEDICAL_CLAIMS)) {
      return {
        allowed: false,
        reason: 'Output contains restricted medical claims.',
      };
    }

    if (profile.enforceKidSafeLanguage && !Validators.isKidSafe(content)) {
      return {
        allowed: false,
        reason: 'Output violates kid-safe language rules.',
      };
    }

    if (profile.disclaimer && shouldInjectDisclaimer(profile.id, content)) {
      return {
        allowed: true,
        modifiedContent: Validators.ensureDisclaimer(content, profile.disclaimer),
      };
    }

    return { allowed: true };
  }
}

function containsWords(content: string, words: string[]): boolean {
  const lower = content.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function shouldInjectDisclaimer(profileId: PolicyProfileId, content: string): boolean {
  switch (profileId) {
    case 'kids-safe':
      return containsWords(content, MEDICAL_DISCLOSURE_HINTS);
    case 'medical-safe':
      return containsWords(content, MEDICAL_DISCLOSURE_HINTS);
    case 'finance-safe':
      return containsWords(content, FINANCE_DISCLOSURE_HINTS);
    default:
      return false;
  }
}
