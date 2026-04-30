import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryBusinessProfileStore,
  InMemoryPatchDedupeStore,
  InMemoryRevenueMetricsStore,
  RevenueRuntime,
  ToolExecutor,
  ToolRegistry,
  createRevenueToolset,
} from '../dist/index.js';

function createToolExecutor(tools) {
  const registry = new ToolRegistry();
  for (const tool of tools) {
    registry.register(tool);
  }
  return new ToolExecutor({
    registry,
    allowedToolIds: tools.map((tool) => tool.toolId),
  });
}

test('RevenueRuntime processes missed call end-to-end and persists lead', async () => {
  const { tools, leadRepository } = createRevenueToolset();
  const metricsStore = new InMemoryRevenueMetricsStore();
  const runtime = new RevenueRuntime({
    profileStore: new InMemoryBusinessProfileStore({
      defaultProfile: {
        businessName: 'NSS HVAC',
        callbackNumber: '+12025550999',
      },
    }),
    toolExecutor: createToolExecutor(tools),
    dedupeStore: new InMemoryPatchDedupeStore(),
    metricsStore,
  });

  const result = await runtime.process({
    event: {
      eventId: 'evt_call_1',
      type: 'call.missed',
      occurredAt: '2026-03-02T15:00:00.000Z',
      source: 'twilio',
      tenantId: 'hvac-main',
      payload: {
        fromNumber: '+12025550100',
        toNumber: '+12025550999',
        callSid: 'CA100',
      },
    },
    nowIso: '2026-03-02T15:00:05.000Z',
  });

  assert.equal(result.patch.patchId, 'missed-call-recovery');
  assert.equal(result.patch.status, 'completed');
  assert.ok(result.actionResults.length >= 3);
  assert.ok(result.actionResults.every((item) => item.ok));
  assert.equal(result.metrics?.missedCallsRecovered, 1);

  const lead = await leadRepository.getByPhone('+12025550100', 'hvac-main');
  assert.ok(lead);
  assert.equal(lead.stage, 'new');
});

test('RevenueRuntime routes booking SMS to appointment booking patch', async () => {
  const { tools } = createRevenueToolset();
  const runtime = new RevenueRuntime({
    profileStore: new InMemoryBusinessProfileStore({
      defaultProfile: {
        businessName: 'NSS Electrical',
      },
    }),
    toolExecutor: createToolExecutor(tools),
  });

  const result = await runtime.process({
    event: {
      eventId: 'evt_sms_book',
      type: 'sms.received',
      occurredAt: '2026-03-02T15:10:00.000Z',
      source: 'twilio',
      payload: {
        fromNumber: '+12025550101',
        toNumber: '+12025550998',
        body: 'I want to schedule an appointment tomorrow',
        messageSid: 'SMBOOK100',
      },
    },
  });

  assert.equal(result.patch.patchId, 'appointment-booking');
  assert.ok(result.patch.actions.some((action) => action.tool === 'calendar.create_event'));
  assert.ok(result.actionResults.some((action) => action.toolId === 'calendar.create_event' && action.ok));
});

test('RevenueRuntime routes non-booking SMS to auto reply patch', async () => {
  const { tools, leadRepository } = createRevenueToolset();
  const runtime = new RevenueRuntime({
    profileStore: new InMemoryBusinessProfileStore({
      defaultProfile: {
        businessName: 'NSS Plumbing',
      },
    }),
    toolExecutor: createToolExecutor(tools),
  });

  const result = await runtime.process({
    event: {
      eventId: 'evt_sms_general_1',
      type: 'sms.received',
      occurredAt: '2026-03-02T15:12:00.000Z',
      source: 'twilio',
      tenantId: 'plumbing-main',
      payload: {
        fromNumber: '+12025550102',
        toNumber: '+12025550997',
        body: 'Leak under sink and water everywhere asap',
        messageSid: 'SMGENERAL100',
      },
    },
  });

  assert.equal(result.patch.patchId, 'auto-reply-inbound-sms');
  assert.ok(result.patch.actions.some((action) => action.tool === 'sms.send'));

  const lead = await leadRepository.getByPhone('+12025550102', 'plumbing-main');
  assert.ok(lead);
  assert.equal(lead.stage, 'contacted');
});

test('RevenueRuntime triggers review booster only for won leads', async () => {
  const { tools } = createRevenueToolset();
  const runtime = new RevenueRuntime({
    profileStore: new InMemoryBusinessProfileStore({
      defaultProfile: {
        businessName: 'NSS Renovation',
      },
    }),
    toolExecutor: createToolExecutor(tools),
  });

  const skipped = await runtime.process({
    event: {
      eventId: 'evt_job_lost',
      type: 'job.completed',
      occurredAt: '2026-03-02T15:20:00.000Z',
      source: 'gateway',
      payload: {
        leadId: 'lead_lost_1',
        leadPhone: '+12025550103',
        leadStatus: 'lost',
        completedAt: '2026-03-02T15:00:00.000Z',
      },
    },
  });
  assert.equal(skipped.patch.status, 'ignored');

  const sent = await runtime.process({
    event: {
      eventId: 'evt_job_won',
      type: 'job.completed',
      occurredAt: '2026-03-02T15:22:00.000Z',
      source: 'gateway',
      payload: {
        leadId: 'lead_won_1',
        leadPhone: '+12025550104',
        leadStatus: 'won',
        completedAt: '2026-03-02T15:05:00.000Z',
        reviewUrl: 'https://example.com/review',
      },
    },
  });

  assert.equal(sent.patch.patchId, 'review-booster');
  assert.equal(sent.patch.status, 'completed');
});

test('PatchEngine remains available for direct patch-only use', async () => {
  const { tools } = createRevenueToolset();
  const runtime = new RevenueRuntime({
    profileStore: new InMemoryBusinessProfileStore(),
    toolExecutor: createToolExecutor(tools),
    dedupeStore: new InMemoryPatchDedupeStore(),
  });

  const first = await runtime.process({
    event: {
      eventId: 'evt_call_dedupe_1',
      type: 'call.missed',
      occurredAt: '2026-03-02T15:30:00.000Z',
      source: 'twilio',
      payload: {
        fromNumber: '+12025550105',
        toNumber: '+12025550996',
        callSid: 'CADEDUP200',
      },
    },
  });
  assert.equal(first.patch.status, 'completed');

  const second = await runtime.process({
    event: {
      eventId: 'evt_call_dedupe_2',
      type: 'call.missed',
      occurredAt: '2026-03-02T15:31:00.000Z',
      source: 'twilio',
      payload: {
        fromNumber: '+12025550105',
        toNumber: '+12025550996',
        callSid: 'CADEDUP200',
      },
    },
  });
  assert.equal(second.patch.status, 'ignored');
  assert.match(second.patch.summary, /Duplicate event ignored/i);
});
