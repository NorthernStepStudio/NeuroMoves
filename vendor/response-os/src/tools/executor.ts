import { ResponseOSError } from '../core/errors.js';
import type { ToolContext, ToolContract, ToolExecutionResult, ToolSchemaField } from './contracts.js';
import { ToolRegistry } from './registry.js';

export interface ToolExecutorOptions {
  registry: ToolRegistry;
  allowedToolIds: string[];
}

export interface ExecuteToolInput {
  toolId: string;
  input: Record<string, unknown>;
  context: ToolContext;
  idempotencyKey?: string;
}

export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly allowed: Set<string>;
  private readonly idempotencyCache = new Map<string, unknown>();

  constructor(options: ToolExecutorOptions) {
    this.registry = options.registry;
    this.allowed = new Set(options.allowedToolIds);
  }

  async execute<TOutput = unknown>(request: ExecuteToolInput): Promise<ToolExecutionResult<TOutput>> {
    if (!this.allowed.has(request.toolId)) {
      return this.errorResult(request.toolId, 'TOOL_VALIDATION_FAILED', 'Tool is not allowed.', false, 0);
    }

    const tool = this.registry.get(request.toolId);
    if (!tool) {
      return this.errorResult(request.toolId, 'TOOL_VALIDATION_FAILED', 'Tool is not registered.', false, 0);
    }

    try {
      this.validateInput(request.input, tool);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool input validation failed.';
      return this.errorResult(request.toolId, 'TOOL_VALIDATION_FAILED', message, false, 0);
    }

    const idempotent = tool.metadata?.idempotent === true;
    if (idempotent && request.idempotencyKey && this.idempotencyCache.has(request.idempotencyKey)) {
      return {
        ok: true,
        toolId: request.toolId,
        output: this.idempotencyCache.get(request.idempotencyKey) as TOutput,
        attempts: 0,
      };
    }

    const retries = Math.max(0, tool.metadata?.retries ?? 0);
    let attempts = 0;

    while (attempts <= retries) {
      attempts += 1;
      try {
        const output = await this.runWithTimeout(tool, request.input, request.context);
        if (idempotent && request.idempotencyKey) {
          this.idempotencyCache.set(request.idempotencyKey, output);
        }
        return {
          ok: true,
          toolId: request.toolId,
          output: output as TOutput,
          attempts,
        };
      } catch (error) {
        if (attempts > retries) {
          const message = error instanceof Error ? error.message : 'Tool execution failed.';
          const retryable = error instanceof ResponseOSError ? error.retryable : false;
          const code = error instanceof ResponseOSError ? error.code : 'TOOL_FAILED';
          return this.errorResult(request.toolId, code, message, retryable, attempts);
        }
      }
    }

    return this.errorResult(request.toolId, 'TOOL_FAILED', 'Tool execution failed after retries.', true, attempts);
  }

  private validateInput(input: Record<string, unknown>, tool: ToolContract): void {
    for (const [field, schema] of Object.entries(tool.schema)) {
      const value = input[field];
      if (schema.required && (value === undefined || value === null)) {
        throw new ResponseOSError(`Missing required tool field "${field}".`, {
          code: 'TOOL_VALIDATION_FAILED',
        });
      }
      if (value !== undefined && value !== null) {
        this.assertType(field, value, schema);
      }
    }
  }

  private assertType(field: string, value: unknown, schema: ToolSchemaField): void {
    const actualType = Array.isArray(value) ? 'array' : (typeof value as ToolSchemaField['type']);
    if (actualType !== schema.type) {
      throw new ResponseOSError(`Tool field "${field}" must be ${schema.type}, got ${actualType}.`, {
        code: 'TOOL_VALIDATION_FAILED',
      });
    }
    if (schema.enum && !schema.enum.includes(value as never)) {
      throw new ResponseOSError(`Tool field "${field}" is not in the allowed enum.`, {
        code: 'TOOL_VALIDATION_FAILED',
      });
    }
  }

  private async runWithTimeout(
    tool: ToolContract,
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<unknown> {
    const timeoutMs = Math.max(1, tool.metadata?.timeoutMs ?? 10000);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new ResponseOSError(`Tool "${tool.toolId}" timed out after ${timeoutMs}ms.`, {
            code: 'TOOL_TIMEOUT',
            retryable: true,
          })
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([tool.handler(input, context), timeout]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private errorResult(
    toolId: string,
    code: string,
    message: string,
    retryable: boolean,
    attempts: number
  ): ToolExecutionResult<never> {
    return {
      ok: false,
      toolId,
      error: {
        code,
        message,
        retryable,
      },
      attempts,
    };
  }
}
