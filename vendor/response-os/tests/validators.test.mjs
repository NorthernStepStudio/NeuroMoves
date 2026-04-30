import assert from 'node:assert/strict';
import test from 'node:test';

import { Validators } from '../dist/index.js';

test('Validators.isKidSafe detects unsafe terms', () => {
  assert.equal(Validators.isKidSafe('A calm and playful routine.'), true);
  assert.equal(Validators.isKidSafe('This is scary content.'), false);
});

test('Validators.hasDisclaimer and ensureDisclaimer are idempotent', () => {
  const input = 'These ideas support sensory regulation.';
  const withDisclaimer = Validators.ensureDisclaimer(input, 'Not medical advice.');

  assert.equal(Validators.hasDisclaimer(withDisclaimer), true);
  assert.equal(Validators.ensureDisclaimer(withDisclaimer, 'Not medical advice.'), withDisclaimer);
});
