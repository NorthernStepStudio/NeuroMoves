import type { AgentResult, Budget, Message } from '../core/types.js';

export interface ProviderTool {
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface ProviderCapabilities {
  functionCalling: boolean;
  jsonMode: boolean;
  vision: boolean;
  streaming: boolean;
}

export interface ProviderOptions {
  messages: ReadonlyArray<Message>;
  budget: Budget;
  agentName?: string;
  tools?: ReadonlyArray<ProviderTool>;
}

export interface Provider {
  readonly capabilities?: ProviderCapabilities;
  generate(options: ProviderOptions): Promise<AgentResult>;
}
