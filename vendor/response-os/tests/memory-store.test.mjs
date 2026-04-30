import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryStore, KeyValueMemoryStore } from '../dist/index.js';

class FakeKeyValueAdapter {
  constructor() {
    this.map = new Map();
  }

  async getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  async setItem(key, value) {
    this.map.set(key, value);
  }

  async getAllKeys() {
    return [...this.map.keys()];
  }
}

test('InMemoryStore queryFacts scans session facts when no user index exists', async () => {
  const store = new InMemoryStore();
  await store.saveState('session-1', {
    session: {
      facts: {
        locale: 'en-US',
      },
    },
  });

  const facts = await store.queryFacts('any-user', 'locale');
  assert.deepEqual(facts, [{ sessionId: 'session-1', value: 'en-US' }]);
});

test('KeyValueMemoryStore persists and loads session state', async () => {
  const adapter = new FakeKeyValueAdapter();
  const store = new KeyValueMemoryStore({
    namespace: 'test-app',
    adapter,
  });

  await store.saveState('session-a', {
    session: {
      preferences: {
        tone: 'friendly',
      },
      facts: {
        region: 'NA',
      },
    },
  });

  const loaded = await store.getState('session-a');
  assert.equal(loaded?.session.preferences.tone, 'friendly');
  assert.equal(loaded?.session.facts.region, 'NA');
});

test('KeyValueMemoryStore queryFacts returns values across sessions', async () => {
  const adapter = new FakeKeyValueAdapter();
  const store = new KeyValueMemoryStore({
    namespace: 'test-app',
    adapter,
  });

  await store.saveState('s1', {
    session: {
      facts: { plan: 'starter' },
    },
  });
  await store.saveState('s2', {
    session: {
      facts: { plan: 'pro' },
    },
  });

  const values = await store.queryFacts('ignored-user', 'plan');
  assert.equal(values.length, 2);
  assert.deepEqual(
    values.sort((a, b) => a.sessionId.localeCompare(b.sessionId)),
    [
      { sessionId: 's1', value: 'starter' },
      { sessionId: 's2', value: 'pro' },
    ]
  );
});

test('KeyValueMemoryStore redacts sensitive values before persistence', async () => {
  const adapter = new FakeKeyValueAdapter();
  const store = new KeyValueMemoryStore({
    namespace: 'test-app',
    adapter,
  });

  await store.saveState('s-sensitive', {
    session: {
      facts: {
        api_key: 'top-secret-value',
      },
    },
  });

  const raw = await adapter.getItem('responseos:state:test-app:s-sensitive');
  assert.match(raw, /"\[redacted\]"/);
});
