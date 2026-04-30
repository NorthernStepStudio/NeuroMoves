import type { AgentResult, Message, Usage } from '../core/types.js';
import { ResponseOSError } from '../core/errors.js';
import type { Provider, ProviderOptions } from './provider.js';

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  usageMetadata?: GeminiUsageMetadata;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

export interface GeminiProviderConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  apiBaseUrl?: string;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements Provider {
  readonly capabilities = {
    functionCalling: false,
    jsonMode: false,
    vision: false,
    streaming: false,
  } as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly apiBaseUrl: string;

  constructor(config: GeminiProviderConfig | string, model = DEFAULT_MODEL) {
    if (typeof config === 'string') {
      this.apiKey = this.assertApiKey(config);
      this.model = model;
      this.timeoutMs = DEFAULT_TIMEOUT_MS;
      this.apiBaseUrl = DEFAULT_API_BASE_URL;
      return;
    }

    this.apiKey = this.assertApiKey(config.apiKey);
    this.model = config.model ?? DEFAULT_MODEL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  }

  async generate(options: ProviderOptions): Promise<AgentResult> {
    const endpoint = `${this.apiBaseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const body = this.toRequestBody(options.messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await response.text();
        if (response.status === 429) {
          throw new ResponseOSError('Gemini request was rate-limited.', {
            code: 'PROVIDER_RATE_LIMIT',
            retryable: true,
            details: {
              status: response.status,
              body: details.slice(0, 200),
            },
          });
        }

        throw new ResponseOSError(`Gemini request failed (${response.status}).`, {
          code: 'PROVIDER_FAILED',
          retryable: response.status >= 500,
          details: {
            status: response.status,
            body: details.slice(0, 200),
          },
        });
      }

      const payload = (await response.json()) as GeminiResponse;
      const content = this.extractText(payload);
      const usage = this.toUsage(payload.usageMetadata);
      const finishReason = this.normalizeFinishReason(payload.candidates?.[0]?.finishReason);

      return {
        content: content || 'No response generated.',
        finishReason,
        usage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertApiKey(apiKey: string): string {
    const value = apiKey.trim();
    if (!value) {
      throw new Error('GeminiProvider requires a non-empty API key.');
    }
    return value;
  }

  private toRequestBody(messages: ReadonlyArray<Message>): GeminiRequestBody {
    if (messages.length === 0) {
      return {
        contents: [{ role: 'user', parts: [{ text: 'No messages supplied.' }] }],
      };
    }

    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversational = messages.filter((m) => m.role !== 'system');

    const contents: GeminiContent[] = conversational.length
      ? conversational.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))
      : [{ role: 'user', parts: [{ text: 'No user messages supplied.' }] }];

    const systemText = systemMessages.map((m) => m.content.trim()).filter(Boolean).join('\n');
    if (!systemText) return { contents };

    return {
      contents,
      systemInstruction: {
        parts: [{ text: systemText }],
      },
    };
  }

  private extractText(payload: GeminiResponse): string {
    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? '').join('').trim();
  }

  private toUsage(metadata?: GeminiUsageMetadata): Usage {
    return {
      promptTokens: metadata?.promptTokenCount ?? 0,
      completionTokens: metadata?.candidatesTokenCount ?? 0,
      totalTokens: metadata?.totalTokenCount ?? 0,
    };
  }

  private normalizeFinishReason(reason?: string): AgentResult['finishReason'] {
    switch ((reason ?? '').toUpperCase()) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
