import type { RuntimeContext } from '../context/runtime-context.js';

export type ToolSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ToolSchemaField {
  type: ToolSchemaType;
  required?: boolean;
  enum?: Array<string | number | boolean>;
}

export type ToolSchema = Record<string, ToolSchemaField>;

export interface ToolExecutionMetadata {
  timeoutMs?: number;
  retries?: number;
  idempotent?: boolean;
}

export interface ToolContext {
  runtimeContext: RuntimeContext;
  traceId: string;
}

export interface ToolContract<TInput = Record<string, unknown>, TOutput = unknown> {
  toolId: string;
  description?: string;
  schema: ToolSchema;
  metadata?: ToolExecutionMetadata;
  handler: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

export interface ToolExecutionResult<TOutput = unknown> {
  ok: boolean;
  toolId: string;
  output?: TOutput;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  attempts: number;
}
