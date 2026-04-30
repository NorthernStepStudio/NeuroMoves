import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryStore,
  createAppClient,
  createDefaultAppConfig,
  createFileExportTools,
  createHttpFetchTool,
  createStorageTools,
} from '../dist/index.js';

test('createAppClient.run returns structured output and persists session snapshot', async () => {
  const appConfig = createDefaultAppConfig('integration-app');
  const memoryStore = new InMemoryStore();
  const client = createAppClient({
    appConfig,
    memoryStore,
  });

  const result = await client.run({
    userId: 'user-1',
    sessionId: 'session-1',
    platform: 'web',
    userMessage: 'Help me get started',
    appState: { screen: 'home' },
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.metadata.appId, 'integration-app');
  assert.equal(result.metadata.sessionId, 'session-1');

  const state = await memoryStore.getState('session-1');
  assert.ok(state);
  assert.equal(state.shortMemory.length, 2);
  assert.equal(state.shortMemory[0].role, 'user');
  assert.equal(state.shortMemory[0].content, 'Help me get started');
  assert.equal(state.shortMemory[1].role, 'assistant');
  assert.deepEqual(state.session.facts.app_state, { screen: 'home' });
});

test('createAppClient auto-wires storage tools and executes requested tool', async () => {
  const appConfig = createDefaultAppConfig('tool-app');
  const storage = new Map();
  const client = createAppClient({
    appConfig,
    tools: createStorageTools({
      async get(key) {
        return storage.get(key);
      },
      async set(key, value) {
        storage.set(key, value);
      },
    }),
  });

  const result = await client.run({
    userId: 'user-2',
    sessionId: 'session-2',
    userMessage: 'Save this preference',
    requestedTool: {
      toolId: 'storage.set',
      input: {
        key: 'prefs.theme',
        payload: {
          mode: 'dark',
        },
      },
      idempotencyKey: 'prefs-theme-set',
    },
  });

  assert.equal(result.status, 'ok');
  assert.equal(storage.get('prefs.theme').mode, 'dark');
  assert.match(result.message, /Tool result from storage\.set is available\./);
});

test('runHelloBrain uses storage.set/get and returns actions payload', async () => {
  const appConfig = createDefaultAppConfig('hello-app');
  const storage = new Map();
  const client = createAppClient({
    appConfig,
    tools: createStorageTools({
      async get(key) {
        return storage.get(key);
      },
      async set(key, value) {
        storage.set(key, value);
      },
    }),
  });

  const result = await client.runHelloBrain({
    userId: 'user-3',
    sessionId: 'session-3',
    userMessage: 'Hello from app',
    platform: 'mobile',
  });

  assert.equal(result.status, 'ok');
  assert.ok(Array.isArray(result.actions));
  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].id, 'open_saved_hello');
  assert.equal(storage.get('hello.brain').value, 'Hello from app');

  const workflow = result.data.workflow;
  assert.equal(workflow.name, 'hello-brain');
  assert.equal(workflow.storageSetOk, true);
  assert.equal(workflow.storageValue.value, 'Hello from app');
});

test('runPlanSaveExport generates plan, saves it, and returns export artifact', async () => {
  const appConfig = createDefaultAppConfig('workflow-app');
  const storage = new Map();
  const client = createAppClient({
    appConfig,
    tools: [
      ...createStorageTools({
        async get(key) {
          return storage.get(key);
        },
        async set(key, value) {
          storage.set(key, value);
        },
      }),
      ...createFileExportTools({
        async exportCsv(request) {
          return {
            artifact: {
              id: 'artifact-csv-1',
              type: 'csv',
              uri: `memory://${request.filename ?? 'plan.csv'}`,
              data: request.rows,
            },
          };
        },
        async exportPdf(request) {
          return {
            artifact: {
              id: 'artifact-pdf-1',
              type: 'pdf',
              data: request.sections,
            },
          };
        },
      }),
    ],
  });

  const result = await client.runPlanSaveExport({
    userId: 'user-4',
    sessionId: 'session-4',
    platform: 'web',
    goal: 'Launch beta',
    exportFormat: 'csv',
  });

  assert.equal(result.status, 'ok');
  assert.ok(Array.isArray(result.artifacts));
  assert.equal(result.artifacts[0].type, 'csv');
  assert.equal(result.actions[0].id, 'open_export_artifact');

  const workflow = result.data.workflow;
  assert.equal(workflow.name, 'plan-save-export');
  assert.equal(workflow.storageSetOk, true);
  assert.equal(workflow.exportOk, true);

  const saved = storage.get('workflow.plan.session-4');
  assert.equal(saved.goal, 'Launch beta');
  assert.equal(saved.workflow, 'plan-save-export');
});

test('runPlanSaveExport returns inline artifact when export tools are not configured', async () => {
  const appConfig = createDefaultAppConfig('workflow-inline-app');
  const client = createAppClient({
    appConfig,
  });

  const result = await client.runPlanSaveExport({
    userId: 'user-5',
    sessionId: 'session-5',
    goal: 'Draft onboarding flow',
    exportFormat: 'pdf',
  });

  assert.equal(result.status, 'ok');
  assert.ok(Array.isArray(result.artifacts));
  assert.equal(result.artifacts[0].type, 'pdf');
  assert.equal(result.data.workflow.exportOk, false);
});

test('createHttpFetchTool delegates to provided adapter', async () => {
  const httpTool = createHttpFetchTool(async (request) => {
    return {
      status: 200,
      ok: true,
      headers: { 'x-test': '1' },
      data: { echoedUrl: request.url, method: request.method },
    };
  });

  const output = await httpTool.handler(
    {
      url: 'https://example.com/api/items',
      method: 'POST',
      body: { id: 1 },
    },
    {
      runtimeContext: {
        appId: 'tool-app',
        userId: 'user-9',
        sessionId: 'session-9',
        locale: 'en-US',
        timezone: 'UTC',
        platform: 'backend',
        capabilities: {},
        policyProfile: 'general',
        requestTraceId: 'trace-9',
        requestedAt: new Date().toISOString(),
      },
      traceId: 'trace-9',
    }
  );

  assert.equal(output.ok, true);
  assert.equal(output.status, 200);
  assert.deepEqual(output.data, {
    echoedUrl: 'https://example.com/api/items',
    method: 'POST',
  });
});

test('createAppClient uses mock provider when app config defaultProvider is mock', async () => {
  const appConfig = createDefaultAppConfig('mock-provider-app');
  appConfig.defaultProvider = 'mock';

  const client = createAppClient({
    appConfig,
  });

  const result = await client.run({
    userId: 'user-10',
    sessionId: 'session-10',
    userMessage:
      'Please analyze this request step by step with tradeoffs and compare at least three implementation options.',
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.route.pipeline, 'plan-tools');
  assert.match(result.message, /mock response/i);
});
