import assert from 'node:assert/strict';
import test from 'node:test';

import { appendLeadMessage, applyLeadStage, createLeadRecord, transitionLeadStage } from '../dist/index.js';

test('createLeadRecord initializes micro-CRM lead defaults', () => {
  const lead = createLeadRecord({
    phone: '+12025550140',
    serviceCategory: 'hvac',
    urgencyScore: 88,
    tags: ['HVAC Repair', 'Urgent'],
    atIso: '2026-03-02T15:00:00.000Z',
  });

  assert.equal(lead.stage, 'new');
  assert.equal(lead.serviceCategory, 'hvac');
  assert.equal(lead.urgencyScore, 88);
  assert.deepEqual(lead.tags, ['hvac repair', 'urgent']);
});

test('transitionLeadStage blocks invalid transitions and allows valid ones', () => {
  const lead = createLeadRecord({
    phone: '+12025550141',
  });

  const invalid = transitionLeadStage(lead, 'won', '2026-03-02T15:05:00.000Z');
  assert.equal(invalid.stage, 'new');
  assert.ok(invalid.conversation.some((item) => /Invalid stage transition blocked/i.test(item.body)));

  const next = transitionLeadStage(invalid, 'contacted', '2026-03-02T15:10:00.000Z');
  assert.equal(next.stage, 'contacted');
});

test('appendLeadMessage appends conversation timeline', () => {
  const lead = createLeadRecord({
    phone: '+12025550142',
  });
  const updated = appendLeadMessage(lead, {
    direction: 'inbound',
    channel: 'sms',
    body: 'Need plumbing help today',
    at: '2026-03-02T15:20:00.000Z',
  });

  assert.equal(updated.conversation.length, 1);
  assert.equal(updated.conversation[0].channel, 'sms');
});

test('applyLeadStage can progress through valid transition path', () => {
  const lead = createLeadRecord({
    phone: '+12025550143',
  });
  const progressed = applyLeadStage(lead, 'won', '2026-03-02T16:00:00.000Z');

  assert.equal(progressed.stage, 'won');
});
