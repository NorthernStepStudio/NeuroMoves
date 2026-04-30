import { ResponseOSError } from '../core/errors.js';
import type { ToolContract } from './contracts.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolContract>();

  register<TInput = Record<string, unknown>, TOutput = unknown>(tool: ToolContract<TInput, TOutput>): void {
    if (!tool.toolId || typeof tool.toolId !== 'string') {
      throw new ResponseOSError('Tool registration requires a valid toolId.', {
        code: 'INVALID_INPUT',
      });
    }
    if (this.tools.has(tool.toolId)) {
      throw new ResponseOSError(`Tool "${tool.toolId}" is already registered.`, {
        code: 'INVALID_INPUT',
      });
    }
    this.tools.set(tool.toolId, tool as ToolContract);
  }

  get(toolId: string): ToolContract | undefined {
    return this.tools.get(toolId);
  }

  list(): ToolContract[] {
    return [...this.tools.values()];
  }
}
