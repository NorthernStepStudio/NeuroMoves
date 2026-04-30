import assert from 'node:assert/strict';
import test from 'node:test';

import { ToolExecutor, ToolRegistry } from '../dist/index.js';

function buildContext() {
  return {
    runtimeContext: {
      appId: 'test-app',
      userId: 'user-1',
      sessionId: 'session-1',
      locale: 'en-US',
      timezone: 'UTC',
      platform: 'web',
      capabilities: {},
      policyProfile: 'general',
      requestTraceId: 'trace-1',
      requestedAt: new Date().toISOString(),
    },
    traceId: 'trace-1',
  };
}

test('ToolExecutor validates schema and executes allowed tool', async () => {
  const registry = new ToolRegistry();
  registry.register({
    toolId: 'echo',
    schema: {
      text: { type: 'string', required: true },
    },
    handler: async (input) => ({ echoed: input.text }),
  });

  const executor = new ToolExecutor({
    registry,
    allowedToolIds: ['echo'],
  });

  const result = await executor.execute({
    toolId: 'echo',
    input: { text: 'hello' },
    context: buildContext(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output, { echoed: 'hello' });
});

test('ToolExecutor blocks disallowed tools', async () => {
  const registry = new ToolRegistry();
  registry.register({
    toolId: 'echo',
    schema: { text: { type: 'string', required: true } },
    handler: async (input) => input,
  });

  const executor = new ToolExecutor({
    registry,
    allowedToolIds: [],
  });

  const result = await executor.execute({
    toolId: 'echo',
    input: { text: 'hello' },
    context: buildContext(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'TOOL_VALIDATION_FAILED');
});

test('ToolExecutor honors idempotency cache', async () => {
  const registry = new ToolRegistry();
  let calls = 0;
  registry.register({
    toolId: 'counter',
    schema: {},
    metadata: { idempotent: true },
    handler: async () => {
      calls += 1;
      return { calls };
    },
  });

  const executor = new ToolExecutor({
    registry,
    allowedToolIds: ['counter'],
  });

  const request = {
    toolId: 'counter',
    input: {},
    context: buildContext(),
    idempotencyKey: 'same-key',
  };

  const first = await executor.execute(request);
  const second = await executor.execute(request);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(calls, 1);
  assert.deepEqual(first.output, second.output);
});

test('ToolExecutor returns TOOL_TIMEOUT when handler exceeds timeout', async () => {
  const registry = new ToolRegistry();
  registry.register({
    toolId: 'slow',
    schema: {},
    metadata: { timeoutMs: 5, retries: 0 },
    handler: async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { ok: true };
    },
  });

  const executor = new ToolExecutor({
    registry,
    allowedToolIds: ['slow'],
  });

  const result = await executor.execute({
    toolId: 'slow',
    input: {},
    context: buildContext(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'TOOL_TIMEOUT');
  assert.equal(result.attempts, 1);
});
