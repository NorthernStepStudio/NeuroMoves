import assert from 'node:assert/strict';
import test from 'node:test';

import { MockProvider, OffProvider, PolicyViolationError, ProviderExecutionError, Runtime } from '../dist/index.js';

test('OffProvider returns a deterministic AI_OFF response', async () => {
  const provider = new OffProvider();
  const result = await provider.generate({
    messages: [{ role: 'user', content: 'Hello' }],
    budget: {
      maxSteps: 5,
      maxTotalTokens: 1000,
      currentSteps: 0,
      currentTokens: 0,
    },
  });

  assert.equal(result.finishReason, 'stop');
  assert.match(result.content, /^\[AI_OFF\]/);
});

test('Runtime rejects empty message arrays', async () => {
  const runtime = new Runtime();
  const provider = new OffProvider();

  await assert.rejects(() => runtime.run(provider, []), /at least one message/i);
});

test('Runtime enforces max token budget', async () => {
  const runtime = new Runtime(5, 10);
  const provider = new MockProvider({
    response: 'Large response',
    usage: {
      promptTokens: 8,
      completionTokens: 8,
      totalTokens: 16,
    },
  });

  await assert.rejects(
    () => runtime.run(provider, [{ role: 'user', content: 'test' }]),
    /max tokens/i
  );
});

test('Runtime wraps provider errors with ProviderExecutionError', async () => {
  const runtime = new Runtime();
  const provider = {
    async generate() {
      throw new Error('boom');
    },
  };

  await assert.rejects(
    () => runtime.run(provider, [{ role: 'user', content: 'hello' }]),
    ProviderExecutionError
  );
});

test('Runtime applies policies and returns modified content', async () => {
  const runtime = new Runtime();
  const provider = new MockProvider('Original response');
  const policy = {
    id: 'append-tag',
    async validate(content) {
      return {
        allowed: true,
        modifiedContent: `${content} [safe]`,
      };
    },
  };

  const result = await runtime.run(provider, [{ role: 'user', content: 'hello' }], {
    policies: [policy],
  });

  assert.equal(result.content, 'Original response [safe]');
});

test('Runtime throws PolicyViolationError when policy denies content', async () => {
  const runtime = new Runtime();
  const provider = new MockProvider('forbidden text');
  const policy = {
    id: 'deny-all',
    async validate() {
      return {
        allowed: false,
        reason: 'blocked',
      };
    },
  };

  await assert.rejects(
    () => runtime.run(provider, [{ role: 'user', content: 'hello' }], { policies: [policy] }),
    PolicyViolationError
  );
});
