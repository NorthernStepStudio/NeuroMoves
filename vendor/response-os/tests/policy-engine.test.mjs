import assert from 'node:assert/strict';
import test from 'node:test';

import { PolicyEngine, createRuntimeContext } from '../dist/index.js';

test('PolicyEngine blocks restricted medical claims on input', () => {
  const engine = new PolicyEngine();
  const context = createRuntimeContext({
    appId: 'app',
    policyProfile: 'kids-safe',
  });

  const result = engine.evaluateInput('Can you diagnose my child?', context);
  assert.equal(result.allowed, false);
});

test('PolicyEngine validates tool permission', () => {
  const engine = new PolicyEngine();
  const result = engine.evaluateToolCall({
    toolId: 'send_email',
    appId: 'app',
    policyProfile: 'general',
    allowedTools: ['read_profile'],
  });
  assert.equal(result.allowed, false);
});

test('PolicyEngine injects profile disclaimer on output when needed', () => {
  const engine = new PolicyEngine();
  const context = createRuntimeContext({
    appId: 'app',
    policyProfile: 'finance-safe',
  });

  const result = engine.evaluateOutput('You should buy this now.', context);
  assert.equal(result.allowed, true);
  assert.match(result.modifiedContent, /not financial advice/i);
});

test('PolicyEngine skips disclaimer injection for unrelated finance output', () => {
  const engine = new PolicyEngine();
  const context = createRuntimeContext({
    appId: 'app',
    policyProfile: 'finance-safe',
  });

  const result = engine.evaluateOutput('Here is your onboarding checklist.', context);
  assert.equal(result.allowed, true);
  assert.equal(result.modifiedContent, undefined);
});
