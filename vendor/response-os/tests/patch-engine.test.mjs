import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AppointmentBookingPatch,
  AutoReplyInboundPatch,
  InMemoryPatchDedupeStore,
  MissedCallRecoveryPatch,
  PatchEngine,
  ReviewBoosterPatch,
} from '../dist/index.js';

function createMissedCallEvent(overrides = {}) {
  return {
    eventId: 'evt_123',
    type: 'call.missed',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'twilio',
    tenantId: 'tenant_1',
    payload: {
      fromNumber: '+12025550100',
      toNumber: '+12025550999',
      callSid: 'CA123456789',
      durationSeconds: 0,
      answered: false,
    },
    ...overrides,
  };
}

test('MissedCallRecoveryPatch generates immediate follow-up during business hours', () => {
  const patch = new MissedCallRecoveryPatch({
    businessName: 'NSS HVAC',
    callbackNumber: '+12025550999',
    timezone: 'America/New_York',
    followupDelayMinutes: 10,
  });

  const result = patch.run(createMissedCallEvent(), {
    nowIso: '2026-03-02T15:00:00.000Z',
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.patchId, 'missed-call-recovery');
  assert.ok(result.actions.some((action) => action.tool === 'sms.send'));
  assert.ok(
    result.actions.some(
      (action) => action.tool === 'followup.schedule' && action.input.strategy === 'no_reply_timeout'
    )
  );
  assert.ok(result.nextActionAt);
});

test('MissedCallRecoveryPatch schedules next-open follow-up after hours', () => {
  const patch = new MissedCallRecoveryPatch({
    businessName: 'NSS Electrical',
    timezone: 'America/New_York',
    schedule: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: null,
      sunday: null,
    },
  });

  const afterHoursEvent = createMissedCallEvent({
    occurredAt: '2026-03-02T02:00:00.000Z',
  });

  const result = patch.run(afterHoursEvent, {
    nowIso: '2026-03-02T02:05:00.000Z',
  });

  assert.equal(result.status, 'completed');
  assert.ok(
    result.actions.some(
      (action) =>
        action.tool === 'followup.schedule' &&
        action.input.strategy === 'next_open_window' &&
        action.input.day === 'monday'
    )
  );
  assert.ok(result.warnings.some((warning) => /closed/i.test(warning)));
});

test('PatchEngine routes call.missed event to missed-call patch', async () => {
  const patch = new MissedCallRecoveryPatch({
    businessName: 'NSS Plumbing',
  });
  const engine = new PatchEngine({
    patches: [patch],
  });

  const result = await engine.run(createMissedCallEvent());

  assert.equal(result.status, 'completed');
  assert.equal(result.patchId, 'missed-call-recovery');
  assert.ok(result.actions.length >= 2);
});

test('PatchEngine returns ignored result for unmapped event types', async () => {
  const patch = new MissedCallRecoveryPatch({
    businessName: 'NSS Renovation',
  });
  const engine = new PatchEngine({
    patches: [patch],
  });

  const result = await engine.run({
    eventId: 'evt_sms_1',
    type: 'sms.received',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'twilio',
    payload: {
      fromNumber: '+12025550100',
      toNumber: '+12025550999',
      body: 'Need help',
    },
  });

  assert.equal(result.status, 'ignored');
  assert.equal(result.patchId, 'none');
});

test('PatchEngine routes booking-intent SMS to appointment patch', async () => {
  const engine = new PatchEngine({
    patches: [
      new AutoReplyInboundPatch({
        profile: { businessName: 'NSS Services' },
      }),
      new AppointmentBookingPatch({
        profile: { businessName: 'NSS Services' },
      }),
    ],
  });

  const result = await engine.run({
    eventId: 'evt_sms_booking',
    type: 'sms.received',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'twilio',
    payload: {
      fromNumber: '+12025550123',
      toNumber: '+12025550999',
      body: 'Can I book an appointment tomorrow?',
      messageSid: 'SMBOOK1',
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.patchId, 'appointment-booking');
  assert.ok(result.actions.some((action) => action.tool === 'calendar.create_event'));
});

test('PatchEngine routes regular inbound SMS to auto-reply patch', async () => {
  const engine = new PatchEngine({
    patches: [
      new AutoReplyInboundPatch({
        profile: { businessName: 'NSS Services' },
      }),
      new AppointmentBookingPatch({
        profile: { businessName: 'NSS Services' },
      }),
    ],
  });

  const result = await engine.run({
    eventId: 'evt_sms_general',
    type: 'sms.received',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'twilio',
    payload: {
      fromNumber: '+12025550124',
      toNumber: '+12025550999',
      body: 'My AC is not cooling and I need help ASAP',
      messageSid: 'SMGEN1',
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.patchId, 'auto-reply-inbound-sms');
  assert.ok(result.actions.some((action) => action.tool === 'lead.upsert'));
  assert.ok(result.actions.some((action) => action.tool === 'sms.send'));
});

test('AutoReply patch suppresses SMS send for likely spam', async () => {
  const engine = new PatchEngine({
    patches: [
      new AutoReplyInboundPatch({
        profile: { businessName: 'NSS Services' },
      }),
    ],
  });

  const result = await engine.run({
    eventId: 'evt_sms_spam',
    type: 'sms.received',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'twilio',
    payload: {
      fromNumber: '+12025550144',
      toNumber: '+12025550999',
      body: 'FREE MONEY click here https://x.io https://y.io !!!!',
      messageSid: 'SMSPAM1',
    },
  });

  assert.equal(result.patchId, 'auto-reply-inbound-sms');
  assert.equal(result.status, 'completed');
  assert.ok(result.actions.some((action) => action.tool === 'lead.upsert'));
  assert.ok(!result.actions.some((action) => action.tool === 'sms.send'));
  assert.ok(result.warnings.some((warning) => /spam/i.test(warning)));
});

test('ReviewBoosterPatch only sends review request for won leads', async () => {
  const engine = new PatchEngine({
    patches: [
      new ReviewBoosterPatch({
        profile: { businessName: 'NSS Renovation' },
        defaultReviewUrl: 'https://example.com/review',
        delayHours: 24,
      }),
    ],
  });

  const ignored = await engine.run({
    eventId: 'evt_job_lost',
    type: 'job.completed',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'gateway',
    payload: {
      leadId: 'lead_1',
      leadPhone: '+12025550125',
      leadStatus: 'lost',
      completedAt: '2026-03-02T14:50:00.000Z',
    },
  });
  assert.equal(ignored.status, 'ignored');

  const won = await engine.run({
    eventId: 'evt_job_won',
    type: 'job.completed',
    occurredAt: '2026-03-02T15:00:00.000Z',
    source: 'gateway',
    payload: {
      leadId: 'lead_2',
      leadPhone: '+12025550126',
      leadStatus: 'won',
      completedAt: '2026-03-02T14:50:00.000Z',
    },
  });
  assert.equal(won.status, 'completed');
  assert.equal(won.patchId, 'review-booster');
  assert.ok(won.actions.some((action) => action.tool === 'followup.schedule'));
});

test('PatchEngine dedupe store prevents duplicate automation', async () => {
  const dedupeStore = new InMemoryPatchDedupeStore();
  const engine = new PatchEngine({
    patches: [new MissedCallRecoveryPatch({ businessName: 'NSS HVAC' })],
    dedupeStore,
    dedupeTtlSeconds: 300,
  });

  const first = await engine.run(createMissedCallEvent({ payload: { ...createMissedCallEvent().payload, callSid: 'CADEDUP' } }));
  assert.equal(first.status, 'completed');

  const second = await engine.run(createMissedCallEvent({ payload: { ...createMissedCallEvent().payload, callSid: 'CADEDUP' } }));
  assert.equal(second.status, 'ignored');
  assert.match(second.summary, /Duplicate event ignored/i);
});
