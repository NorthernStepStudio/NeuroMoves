import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIntakePrompt, qualifyInboundMessage } from '../dist/index.js';

test('qualifyInboundMessage extracts service, urgency, and address', () => {
  const result = qualifyInboundMessage('Urgent plumbing leak at 123 Main St, water everywhere!');

  assert.equal(result.serviceCategory, 'plumbing');
  assert.ok(result.urgencyScore >= 70);
  assert.ok(result.extractedUrgencyLabel === 'medium' || result.extractedUrgencyLabel === 'high');
  assert.equal(typeof result.extractedAddress, 'string');
  assert.ok(result.tags.includes('plumbing'));
});

test('qualifyInboundMessage detects likely spam', () => {
  const result = qualifyInboundMessage('FREE MONEY click here https://x.io https://y.io !!!!');

  assert.equal(result.isSpam, true);
  assert.ok(result.spamScore >= 70);
  assert.ok(result.tags.includes('spam'));
});

test('buildIntakePrompt returns focused follow-up prompts', () => {
  const prompt = buildIntakePrompt(['service', 'address']);
  assert.match(prompt.toLowerCase(), /service type/);
  assert.match(prompt.toLowerCase(), /service address/);
});
