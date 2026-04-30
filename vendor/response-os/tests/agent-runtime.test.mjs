import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentRuntime,
  MockProvider,
  ToolExecutor,
  ToolRegistry,
  createDefaultAppConfig,
  createRuntimeContext,
} from '../dist/index.js';

function baseMessages() {
  return [{ role: 'user', content: 'Help me plan a routine' }];
}

test('AgentRuntime returns structured output for template path', async () => {
  const appConfig = createDefaultAppConfig('neuromoves');
  const context = createRuntimeContext({
    appId: appConfig.appId,
    policyProfile: appConfig.policyProfile,
    platform: 'web',
  });

  const runtime = new AgentRuntime({
    provider: new MockProvider('Provider response'),
  });

  const result = await runtime.execute({
    context,
    appConfig,
    messages: baseMessages(),
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.metadata.appId, 'neuromoves');
  assert.ok(result.message.length > 0);
});

test('AgentRuntime executes allowed tools and returns ok', async () => {
  const appConfig = createDefaultAppConfig('nexusbuild');
  appConfig.enabledTools = ['echo'];
  appConfig.routingOverrides = { forceTemplateMode: true };
  const context = createRuntimeContext({
    appId: appConfig.appId,
    policyProfile: appConfig.policyProfile,
    platform: 'backend',
  });

  const registry = new ToolRegistry();
  registry.register({
    toolId: 'echo',
    schema: {
      text: { type: 'string', required: true },
    },
    handler: async (input) => ({ echoed: input.text }),
  });

  const toolExecutor = new ToolExecutor({
    registry,
    allowedToolIds: appConfig.enabledTools,
  });

  const runtime = new AgentRuntime({
    provider: new MockProvider('Provider response'),
    toolExecutor,
  });

  const result = await runtime.execute({
    context,
    appConfig,
    messages: [{ role: 'user', content: 'Echo this please' }],
    requestedTool: {
      toolId: 'echo',
      input: { text: 'hello' },
      idempotencyKey: 'k1',
    },
  });

  assert.equal(result.status, 'ok');
});

test('AgentRuntime can refuse unsafe requests', async () => {
  const appConfig = createDefaultAppConfig('safety-app');
  appConfig.policyProfile = 'kids-safe';
  const context = createRuntimeContext({
    appId: appConfig.appId,
    policyProfile: appConfig.policyProfile,
    platform: 'web',
  });

  const runtime = new AgentRuntime({
    provider: new MockProvider('Provider response'),
  });

  const result = await runtime.execute({
    context,
    appConfig,
    messages: [{ role: 'user', content: 'Please diagnose this now.' }],
  });

  assert.equal(result.status, 'refused');
});
