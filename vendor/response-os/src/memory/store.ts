import { createInitialConversationState, type ConversationState, type SessionState } from '../state/state-model.js';

export type ConversationStatePatch = Partial<Omit<ConversationState, 'session'>> & {
  session?: Partial<SessionState>;
};

export interface MemoryStore {
  getState(sessionId: string): Promise<ConversationState | null>;
  saveState(sessionId: string, patch: ConversationStatePatch): Promise<void>;
  queryFacts(userId: string, key: string): Promise<Array<{ sessionId: string; value: unknown }>>;
}

export class InMemoryStore implements MemoryStore {
  private readonly sessions = new Map<string, ConversationState>();
  private readonly userFacts = new Map<string, Map<string, Array<{ sessionId: string; value: unknown }>>>();

  async getState(sessionId: string): Promise<ConversationState | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async saveState(sessionId: string, patch: ConversationStatePatch): Promise<void> {
    const existing = this.sessions.get(sessionId) ?? createBlankConversationState();
    const merged = mergeConversationState(existing, patch);

    this.sessions.set(sessionId, redactConversationState(merged));
  }

  async queryFacts(userId: string, key: string): Promise<Array<{ sessionId: string; value: unknown }>> {
    const indexed = this.userFacts.get(userId)?.get(key);
    if (indexed && indexed.length > 0) {
      return indexed;
    }

    const output: Array<{ sessionId: string; value: unknown }> = [];
    for (const [sessionId, state] of this.sessions.entries()) {
      if (key in state.session.facts) {
        output.push({ sessionId, value: state.session.facts[key] });
      }
    }
    return output;
  }

  indexFact(userId: string, sessionId: string, key: string, value: unknown): void {
    const userMap = this.userFacts.get(userId) ?? new Map<string, Array<{ sessionId: string; value: unknown }>>();
    const items = userMap.get(key) ?? [];
    items.push({ sessionId, value: redactValue(value) });
    userMap.set(key, items);
    this.userFacts.set(userId, userMap);
  }
}

export function createBlankConversationState(): ConversationState {
  return createInitialConversationState();
}

export function mergeConversationState(current: ConversationState, patch: ConversationStatePatch): ConversationState {
  return {
    ...current,
    ...patch,
    shortMemory: patch.shortMemory ?? current.shortMemory,
    session: {
      ...current.session,
      ...patch.session,
      facts: {
        ...current.session.facts,
        ...(patch.session?.facts ?? {}),
      },
      preferences: {
        ...current.session.preferences,
        ...(patch.session?.preferences ?? {}),
      },
      openTasks: patch.session?.openTasks ?? current.session.openTasks,
      lastActions: patch.session?.lastActions ?? current.session.lastActions,
      toolResults: patch.session?.toolResults ?? current.session.toolResults,
    },
  };
}

const SENSITIVE_KEYS = ['token', 'secret', 'password', 'api_key', 'access_key', 'email'];

export function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  if (Array.isArray(value)) return value.map(redactValue);

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        output[key] = '[redacted]';
      } else {
        output[key] = redactValue(val);
      }
    }
    return output;
  }

  return value;
}

function redactConversationState(state: ConversationState): ConversationState {
  return redactValue(state) as ConversationState;
}
