import assert from 'node:assert/strict';
import test from 'node:test';

import { Router } from '../dist/index.js';

const budget = {
  maxSteps: 6,
  maxLlmCalls: 2,
  maxTokensIn: 4000,
  maxTokensOut: 2000,
  maxToolCalls: 3,
  maxMs: 10000,
};

test('Router classifies routine domain and simple template path', () => {
  const router = new Router();
  const result = router.route({
    message: 'Create a quick routine for focus',
    policyProfile: 'general',
    budget,
    providerEnabled: true,
  });

  assert.equal(result.domain, 'routines');
  assert.equal(result.pipeline, 'template');
});

test('Router uses safe-mode for high-risk medical-like requests in strict profiles', () => {
  const router = new Router();
  const result = router.route({
    message: 'Please diagnose this issue for me',
    policyProfile: 'kids-safe',
    budget,
    providerEnabled: true,
  });

  assert.equal(result.pipeline, 'safe-mode');
  assert.equal(result.complexity, 'high-risk');
});

test('Router uses deterministic fallback when provider is off', () => {
  const router = new Router();
  const result = router.route({
    message: 'Help me debug an API error in production',
    policyProfile: 'general',
    budget,
    providerEnabled: false,
  });

  assert.equal(result.pipeline, 'deterministic-fallback');
});
