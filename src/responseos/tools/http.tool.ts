import { createHttpFetchTool, type ToolContract } from '@nss/response-os';

export function createNeuromovesHttpTools(): ToolContract[] {
  return [createHttpFetchTool()];
}
