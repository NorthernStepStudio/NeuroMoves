import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryRevenueMetricsStore } from '../dist/index.js';

function makePatchResult(patchId, tags = [], status = 'completed') {
  return {
    patchId,
    status,
    summary: 'ok',
    actions: [
      {
        tool: 'lead.upsert',
        input: {
          lead: {
            tags,
          },
        },
      },
    ],
    warnings: [],
  };
}

test('InMemoryRevenueMetricsStore tracks patch and action outcomes', () => {
  const metricsStore = new InMemoryRevenueMetricsStore();

  metricsStore.record({
    tenantId: 'tenant_1',
    patch: makePatchResult('missed-call-recovery'),
    actionResults: [
      { ok: true, toolId: 'sms.send' },
      { ok: true, toolId: 'lead.upsert' },
    ],
  });

  metricsStore.record({
    tenantId: 'tenant_1',
    patch: makePatchResult('auto-reply-inbound-sms', ['hot_lead']),
    actionResults: [{ ok: false, toolId: 'followup.schedule' }],
  });

  const snapshot = metricsStore.get('tenant_1');
  assert.equal(snapshot.eventsProcessed, 2);
  assert.equal(snapshot.missedCallsRecovered, 1);
  assert.equal(snapshot.inboundAutoReplies, 1);
  assert.equal(snapshot.hotLeads, 1);
  assert.equal(snapshot.actionSuccess, 2);
  assert.equal(snapshot.actionFailures, 1);
});
