import type { AppConfig } from '../config/app-config.js';
import type { RuntimeCapabilities, RuntimePlatform } from '../context/runtime-context.js';
import type { RequestBudget } from '../core/budget.js';
import type { Message } from '../core/types.js';
import type { MemoryStore } from '../memory/store.js';
import type { AgentOutput } from '../output/contracts.js';
import type { Provider } from '../providers/provider.js';
import type { ToolContract } from '../tools/contracts.js';
import type { ToolExecutor } from '../tools/executor.js';
import type { ToolRegistry } from '../tools/registry.js';

export interface AppClientRunInput {
  userMessage: string;
  userId?: string;
  sessionId?: string;
  locale?: string;
  timezone?: string;
  platform?: RuntimePlatform;
  capabilities?: RuntimeCapabilities;
  messageHistory?: Message[];
  appState?: Record<string, unknown>;
  requestedTool?: {
    toolId: string;
    input: Record<string, unknown>;
    idempotencyKey?: string;
  };
  budgetOverride?: Partial<RequestBudget>;
}

export interface HelloBrainInput {
  userMessage?: string;
  userId?: string;
  sessionId?: string;
  locale?: string;
  timezone?: string;
  platform?: RuntimePlatform;
}

export type PlanExportFormat = 'csv' | 'pdf';

export interface PlanSaveExportInput {
  goal: string;
  userMessage?: string;
  userId?: string;
  sessionId?: string;
  locale?: string;
  timezone?: string;
  platform?: RuntimePlatform;
  planSteps?: string[];
  exportFormat?: PlanExportFormat;
  filename?: string;
  appState?: Record<string, unknown>;
}

export interface AppClient {
  run(input: AppClientRunInput): Promise<AgentOutput>;
  runHelloBrain(input?: HelloBrainInput): Promise<AgentOutput>;
  runPlanSaveExport(input: PlanSaveExportInput): Promise<AgentOutput>;
}

export interface AppClientOptions {
  appConfig: AppConfig;
  provider?: Provider;
  fallbackProvider?: Provider;
  memoryStore?: MemoryStore;
  tools?: ToolContract[];
  toolRegistry?: ToolRegistry;
  toolExecutor?: ToolExecutor;
}
