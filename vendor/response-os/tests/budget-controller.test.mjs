import assert from 'node:assert/strict';
import test from 'node:test';

import { BudgetController, ResponseOSError } from '../dist/index.js';

test('BudgetController tracks usage and deterministic hint', () => {
  const controller = new BudgetController({
    maxSteps: 3,
    maxLlmCalls: 1,
    maxTokensIn: 100,
    maxTokensOut: 100,
    maxToolCalls: 1,
    maxMs: 10000,
  });

  controller.recordStep();
  controller.recordLlmCall(10, 5);
  const usage = controller.getUsage();
  assert.equal(usage.steps, 1);
  assert.equal(usage.llmCalls, 1);
  assert.equal(usage.tokensIn, 10);
  assert.equal(usage.tokensOut, 5);
  assert.equal(controller.shouldPreferDeterministic(), true);
});

test('BudgetController throws ResponseOSError when exceeding budget', () => {
  const controller = new BudgetController({
    maxSteps: 1,
    maxLlmCalls: 1,
    maxTokensIn: 10,
    maxTokensOut: 10,
    maxToolCalls: 1,
    maxMs: 10000,
  });

  controller.recordStep();
  assert.throws(() => controller.recordStep(), (error) => {
    assert.ok(error instanceof ResponseOSError);
    assert.equal(error.code, 'BUDGET_EXCEEDED');
    return true;
  });
});
