import assert from 'node:assert/strict';
import test from 'node:test';

import { NeuroMovesPolicy } from '../dist/index.js';

test('NeuroMovesPolicy blocks restricted medical language', async () => {
  const policy = new NeuroMovesPolicy();
  const result = await policy.validate('This routine can diagnose sensory issues.', {});

  assert.equal(result.allowed, false);
  assert.match(result.reason ?? '', /restricted medical terms/i);
});

test('NeuroMovesPolicy appends disclaimer for plain strings', async () => {
  const policy = new NeuroMovesPolicy();
  const result = await policy.validate('Try these calming activities at home.', {});

  assert.equal(result.allowed, true);
  assert.match(String(result.modifiedContent), /not medical advice/i);
});

test('NeuroMovesPolicy returns routine copy with disclaimer', async () => {
  const policy = new NeuroMovesPolicy();
  const routine = {
    title: 'Routine',
    duration: '5 mins',
    steps: [],
    safetyNote: 'Adult supervision required.',
    disclaimer: '',
  };

  const result = await policy.validate(routine, {});
  assert.equal(result.allowed, true);
  assert.notEqual(result.modifiedContent, routine);
  assert.match(result.modifiedContent.disclaimer, /not medical advice/i);
  assert.equal(routine.disclaimer, '');
});
