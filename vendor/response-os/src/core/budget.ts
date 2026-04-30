import { ResponseOSError } from './errors.js';
import type { Budget } from './types.js';

export class BudgetManager {
  private readonly maxStepsLimit: number;
  private readonly maxTokenLimit: number;
  private currentSteps: number;
  private currentTokens: number;

  constructor(maxSteps = 5, maxTotalTokens = 10000) {
    this.maxStepsLimit = this.assertPositiveInteger(maxSteps, 'maxSteps');
    this.maxTokenLimit = this.assertPositiveInteger(maxTotalTokens, 'maxTotalTokens');
    this.currentSteps = 0;
    this.currentTokens = 0;
  }

  reset(): void {
    this.currentSteps = 0;
    this.currentTokens = 0;
  }

  incrementStep(count = 1): void {
    const increment = this.assertPositiveInteger(count, 'count');
    this.currentSteps += increment;
    if (this.currentSteps > this.maxStepsLimit) {
      throw new ResponseOSError(`Execution budget exceeded: max steps (${this.maxStepsLimit}) reached.`, {
        code: 'BUDGET_EXCEEDED',
      });
    }
  }

  addTokens(tokens: number): void {
    if (!Number.isFinite(tokens) || tokens < 0) {
      throw new ResponseOSError('Tokens must be a finite number greater than or equal to 0.', {
        code: 'INVALID_INPUT',
        details: { tokens },
      });
    }

    this.currentTokens += Math.trunc(tokens);
    if (this.currentTokens > this.maxTokenLimit) {
      throw new ResponseOSError(`Execution budget exceeded: max tokens (${this.maxTokenLimit}) reached.`, {
        code: 'BUDGET_EXCEEDED',
      });
    }
  }

  getBudget(): Budget {
    return {
      maxSteps: this.maxStepsLimit,
      maxTotalTokens: this.maxTokenLimit,
      currentSteps: this.currentSteps,
      currentTokens: this.currentTokens,
    };
  }

  isExhausted(): boolean {
    return this.currentSteps >= this.maxStepsLimit || this.currentTokens >= this.maxTokenLimit;
  }

  private assertPositiveInteger(value: number, name: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ResponseOSError(`${name} must be a positive integer.`, {
        code: 'INVALID_INPUT',
        details: { name, value },
      });
    }
    return value;
  }
}

export interface RequestBudget {
  maxSteps: number;
  maxLlmCalls: number;
  maxTokensIn: number;
  maxTokensOut: number;
  maxToolCalls: number;
  maxMs: number;
}

export interface BudgetUsage {
  steps: number;
  llmCalls: number;
  tokensIn: number;
  tokensOut: number;
  toolCalls: number;
  elapsedMs: number;
}

export class BudgetController {
  private readonly budget: RequestBudget;
  private readonly startedAtMs: number;
  private usage: BudgetUsage;

  constructor(budget: RequestBudget, startedAtMs = Date.now()) {
    this.budget = budget;
    this.startedAtMs = startedAtMs;
    this.usage = {
      steps: 0,
      llmCalls: 0,
      tokensIn: 0,
      tokensOut: 0,
      toolCalls: 0,
      elapsedMs: 0,
    };
  }

  recordStep(): void {
    this.usage.steps += 1;
    this.updateElapsed();
    this.enforce('maxSteps', this.usage.steps);
    this.enforceTime();
  }

  recordLlmCall(tokensIn = 0, tokensOut = 0): void {
    this.usage.llmCalls += 1;
    this.usage.tokensIn += Math.max(0, Math.trunc(tokensIn));
    this.usage.tokensOut += Math.max(0, Math.trunc(tokensOut));
    this.updateElapsed();
    this.enforce('maxLlmCalls', this.usage.llmCalls);
    this.enforce('maxTokensIn', this.usage.tokensIn);
    this.enforce('maxTokensOut', this.usage.tokensOut);
    this.enforceTime();
  }

  recordToolCall(): void {
    this.usage.toolCalls += 1;
    this.updateElapsed();
    this.enforce('maxToolCalls', this.usage.toolCalls);
    this.enforceTime();
  }

  shouldPreferDeterministic(): boolean {
    this.updateElapsed();
    const elapsedRatio = this.usage.elapsedMs / Math.max(1, this.budget.maxMs);
    const toolRatio = this.usage.toolCalls / Math.max(1, this.budget.maxToolCalls);
    const llmRatio = this.usage.llmCalls / Math.max(1, this.budget.maxLlmCalls);
    return elapsedRatio >= 0.8 || toolRatio >= 0.8 || llmRatio >= 0.8;
  }

  getUsage(): BudgetUsage {
    this.updateElapsed();
    return { ...this.usage };
  }

  private enforce(limitKey: keyof RequestBudget, actual: number): void {
    const limit = this.budget[limitKey];
    if (actual > limit) {
      throw new ResponseOSError(`Budget exceeded for ${limitKey}: ${actual}/${limit}`, {
        code: 'BUDGET_EXCEEDED',
        details: { limitKey, actual, limit },
      });
    }
  }

  private enforceTime(): void {
    if (this.usage.elapsedMs > this.budget.maxMs) {
      throw new ResponseOSError(`Budget exceeded for maxMs: ${this.usage.elapsedMs}/${this.budget.maxMs}`, {
        code: 'BUDGET_EXCEEDED',
      });
    }
  }

  private updateElapsed(): void {
    this.usage.elapsedMs = Date.now() - this.startedAtMs;
  }
}
