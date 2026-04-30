import type { AgentResult, FinishReason, ToolCall, Usage } from '../core/types.js';
import type { Provider, ProviderOptions } from './provider.js';

export interface MockProviderConfig {
  response?: string;
  finishReason?: FinishReason;
  usage?: Partial<Usage>;
  toolCalls?: ToolCall[];
}

export class MockProvider implements Provider {
  readonly capabilities = {
    functionCalling: true,
    jsonMode: true,
    vision: false,
    streaming: false,
  } as const;

  private readonly config: MockProviderConfig;

  constructor(config: MockProviderConfig | string = {}) {
    if (typeof config === 'string') {
      this.config = { response: config };
      return;
    }
    this.config = config;
  }

  async generate(_options: ProviderOptions): Promise<AgentResult> {
    const usage = this.config.usage ?? {};

    return {
      content: this.config.response ?? 'This is a mock response.',
      finishReason: this.config.finishReason ?? 'stop',
      toolCalls: this.config.toolCalls,
      usage: {
        promptTokens: usage.promptTokens ?? 0,
        completionTokens: usage.completionTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
      },
    };
  }
}
