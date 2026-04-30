import type { AgentResult } from '../core/types.js';
import type { Provider, ProviderOptions } from './provider.js';

export class OffProvider implements Provider {
  readonly capabilities = {
    functionCalling: false,
    jsonMode: false,
    vision: false,
    streaming: false,
  } as const;

  async generate(options: ProviderOptions): Promise<AgentResult> {
    const lastMessage =
      [...options.messages].reverse().find((message) => message.role === 'user')?.content ??
      'No user input provided.';

    return {
      content: `[AI_OFF] Rule-based mode active. Received: "${lastMessage}"`,
      finishReason: 'stop',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }
}
