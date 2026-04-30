import type { PolicyProfileId } from '../context/runtime-context.js';
import type { Message } from '../core/types.js';
import type { RequestBudget } from '../core/budget.js';

export type RouteDomain = 'finance' | 'support' | 'content' | 'routines' | 'dev-help' | 'general';
export type RouteComplexity = 'simple' | 'complex' | 'high-risk';
export type RoutePipeline = 'template' | 'plan-tools' | 'safe-mode' | 'deterministic-fallback';

export interface RouteDecision {
  intent: string;
  domain: RouteDomain;
  complexity: RouteComplexity;
  pipeline: RoutePipeline;
  reason: string;
}

export interface RouterInput {
  message: string;
  messages?: Message[];
  policyProfile: PolicyProfileId;
  providerEnabled?: boolean;
  budget: RequestBudget;
}

const DOMAIN_KEYWORDS: Array<{ domain: RouteDomain; keywords: string[] }> = [
  { domain: 'finance', keywords: ['budget', 'price', 'cost', 'invoice', 'payment', 'tax'] },
  { domain: 'support', keywords: ['help', 'issue', 'bug', 'support', 'error', 'broken'] },
  { domain: 'content', keywords: ['write', 'draft', 'summarize', 'copy', 'content'] },
  { domain: 'routines', keywords: ['routine', 'schedule', 'steps', 'plan', 'therapy'] },
  { domain: 'dev-help', keywords: ['code', 'api', 'debug', 'typescript', 'python', 'build'] },
];

const HIGH_RISK_WORDS = ['diagnose', 'prescribe', 'investment advice', 'legal advice'];

export class Router {
  route(input: RouterInput): RouteDecision {
    const text = input.message.toLowerCase();
    const domain = classifyDomain(text);
    const complexity = classifyComplexity(text, input.messages ?? []);

    if (isHighRisk(text, input.policyProfile)) {
      return {
        intent: detectIntent(text),
        domain,
        complexity: 'high-risk',
        pipeline: 'safe-mode',
        reason: 'High-risk language detected for current policy profile.',
      };
    }

    if (input.providerEnabled === false) {
      return {
        intent: detectIntent(text),
        domain,
        complexity,
        pipeline: 'deterministic-fallback',
        reason: 'Provider is disabled.',
      };
    }

    if (shouldUseTemplate(input.budget, text, complexity)) {
      return {
        intent: detectIntent(text),
        domain,
        complexity,
        pipeline: 'template',
        reason: 'Low complexity or constrained budget.',
      };
    }

    return {
      intent: detectIntent(text),
      domain,
      complexity,
      pipeline: 'plan-tools',
      reason: 'Complex request requires planning and potential tool use.',
    };
  }
}

function classifyDomain(text: string): RouteDomain {
  for (const entry of DOMAIN_KEYWORDS) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) {
      return entry.domain;
    }
  }
  return 'general';
}

function classifyComplexity(text: string, messages: Message[]): RouteComplexity {
  const tokens = text.split(/\s+/).filter(Boolean).length;
  const priorTurns = messages.length;
  if (tokens > 80 || priorTurns > 10 || /\b(step by step|compare|analyze|multi-step)\b/i.test(text)) {
    return 'complex';
  }
  return 'simple';
}

function isHighRisk(text: string, profile: PolicyProfileId): boolean {
  if (profile === 'general') {
    return false;
  }
  return HIGH_RISK_WORDS.some((word) => text.includes(word));
}

function shouldUseTemplate(budget: RequestBudget, text: string, complexity: RouteComplexity): boolean {
  if (complexity === 'simple' && text.length < 300) {
    return true;
  }
  return budget.maxLlmCalls <= 1 || budget.maxMs <= 1500;
}

function detectIntent(text: string): string {
  if (/\b(help|support|issue|bug)\b/.test(text)) return 'support_request';
  if (/\b(plan|routine|schedule)\b/.test(text)) return 'planning_request';
  if (/\b(write|draft|summarize)\b/.test(text)) return 'content_request';
  if (/\b(price|budget|cost)\b/.test(text)) return 'finance_request';
  if (/\bcode|debug|api\b/.test(text)) return 'developer_request';
  return 'general_request';
}
