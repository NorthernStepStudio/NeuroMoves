import type { Policy } from '../policy/policy.js';
import type { Provider } from '../providers/provider.js';
import { BudgetManager } from './budget.js';
import { PolicyViolationError, ProviderExecutionError, ResponseOSError } from './errors.js';
import type { AgentResult, Message } from './types.js';

export interface RuntimeRunOptions {
  policies?: ReadonlyArray<Policy<string>>;
  policyContext?: Record<string, unknown>;
}

export class Runtime {
  private readonly budgetManager: BudgetManager;

  constructor(maxSteps = 5, maxTokens = 10000) {
    this.budgetManager = new BudgetManager(maxSteps, maxTokens);
  }

  async run(provider: Provider, messages: Message[], options: RuntimeRunOptions = {}): Promise<AgentResult> {
    this.assertProvider(provider);
    this.assertMessages(messages);

    this.budgetManager.reset();
    this.budgetManager.incrementStep();

    let result: AgentResult;
    try {
      result = await provider.generate({
        messages: [...messages],
        budget: this.budgetManager.getBudget(),
      });
    } catch (error) {
      throw new ProviderExecutionError('Provider failed during generate().', error);
    }

    this.assertAgentResult(result);
    const safeResult = await this.applyPolicies(result, options);

    const consumedTokens = safeResult.usage?.totalTokens ?? 0;
    if (consumedTokens > 0) {
      this.budgetManager.addTokens(consumedTokens);
    }

    return safeResult;
  }

  getBudgetSnapshot() {
    return this.budgetManager.getBudget();
  }

  private assertProvider(provider: Provider): void {
    if (!provider || typeof provider.generate !== 'function') {
      throw new ResponseOSError('Runtime requires a provider with a generate(options) function.', {
        code: 'INVALID_INPUT',
      });
    }
  }

  private assertMessages(messages: Message[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ResponseOSError('Runtime requires at least one message.', {
        code: 'INVALID_INPUT',
      });
    }
  }

  private assertAgentResult(result: AgentResult): void {
    if (!result || typeof result.content !== 'string') {
      throw new ResponseOSError('Provider returned an invalid result: content must be a string.', {
        code: 'PROVIDER_FAILED',
      });
    }
    if (typeof result.finishReason !== 'string') {
      throw new ResponseOSError('Provider returned an invalid result: finishReason is required.', {
        code: 'PROVIDER_FAILED',
      });
    }
  }

  private async applyPolicies(result: AgentResult, options: RuntimeRunOptions): Promise<AgentResult> {
    const policies = options.policies ?? [];
    if (policies.length === 0) {
      return result;
    }

    let content = result.content;
    for (const policy of policies) {
      const outcome = await policy.validate(content, options.policyContext ?? {});
      if (!outcome.allowed) {
        throw new PolicyViolationError(policy.id, outcome.reason ?? 'No reason provided.');
      }
      if (typeof outcome.modifiedContent === 'string') {
        content = outcome.modifiedContent;
      }
    }

    return {
      ...result,
      content,
    };
  }
}
