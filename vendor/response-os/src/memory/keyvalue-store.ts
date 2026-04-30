import type { ConversationState } from '../state/state-model.js';
import { createBlankConversationState, mergeConversationState, redactValue, type ConversationStatePatch, type MemoryStore } from './store.js';

export interface StringKeyValueAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<ReadonlyArray<string>>;
  removeItem?(key: string): Promise<boolean>;
}

export interface KeyValueMemoryStoreOptions {
  namespace: string;
  adapter: StringKeyValueAdapter;
}

export class KeyValueMemoryStore implements MemoryStore {
  private readonly namespace: string;
  private readonly adapter: StringKeyValueAdapter;

  constructor(options: KeyValueMemoryStoreOptions) {
    this.namespace = options.namespace;
    this.adapter = options.adapter;
  }

  async getState(sessionId: string): Promise<ConversationState | null> {
    const raw = await this.adapter.getItem(this.stateKey(sessionId));
    return safeParse<ConversationState>(raw);
  }

  async saveState(sessionId: string, patch: ConversationStatePatch): Promise<void> {
    const existing = (await this.getState(sessionId)) ?? createBlankConversationState();
    const merged = mergeConversationState(existing, patch);
    const redacted = redactValue(merged) as ConversationState;
    await this.adapter.setItem(this.stateKey(sessionId), JSON.stringify(redacted));
  }

  async queryFacts(_userId: string, key: string): Promise<Array<{ sessionId: string; value: unknown }>> {
    const keys = await this.adapter.getAllKeys();
    const stateKeys = keys.filter((item) => item.startsWith(this.prefix()));
    const output: Array<{ sessionId: string; value: unknown }> = [];

    for (const stateKey of stateKeys) {
      const raw = await this.adapter.getItem(stateKey);
      const state = safeParse<ConversationState>(raw);
      if (!state) continue;
      if (!(key in state.session.facts)) continue;

      output.push({
        sessionId: stateKey.slice(this.prefix().length),
        value: state.session.facts[key],
      });
    }

    return output;
  }

  async exportState(sessionId: string): Promise<ConversationState | null> {
    return this.getState(sessionId);
  }

  async deleteState(sessionId: string): Promise<boolean> {
    if (typeof this.adapter.removeItem !== 'function') {
      return false;
    }
    return this.adapter.removeItem(this.stateKey(sessionId));
  }

  protected prefix(): string {
    return `responseos:state:${this.namespace}:`;
  }

  protected stateKey(sessionId: string): string {
    return `${this.prefix()}${sessionId}`;
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
