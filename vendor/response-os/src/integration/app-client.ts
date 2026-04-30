import type { AppConfig } from '../config/app-config.js';
import { ResponseOSError } from '../core/errors.js';
import { createRuntimeContext } from '../context/runtime-context.js';
import type { Message } from '../core/types.js';
import { InMemoryStore, type MemoryStore } from '../memory/store.js';
import { createOutput, type AgentOutput, type Artifact, type SuggestedAction } from '../output/contracts.js';
import type { Provider } from '../providers/provider.js';
import { GeminiProvider } from '../providers/gemini.provider.js';
import { MockProvider } from '../providers/mock.js';
import { OffProvider } from '../providers/off.provider.js';
import { AgentRuntime } from '../runtime/agent-runtime.js';
import type { ToolContract } from '../tools/contracts.js';
import { ToolExecutor } from '../tools/executor.js';
import { ToolRegistry } from '../tools/registry.js';
import type {
  AppClient,
  AppClientOptions,
  AppClientRunInput,
  HelloBrainInput,
  PlanSaveExportInput,
} from './types.js';

export function createAppClient(options: AppClientOptions): AppClient;
export function createAppClient(appConfig: AppConfig, tools?: ToolContract[], memoryStore?: MemoryStore): AppClient;
export function createAppClient(
  optionsOrConfig: AppClientOptions | AppConfig,
  tools: ToolContract[] = [],
  memoryStoreOverride?: MemoryStore
): AppClient {
  const options = normalizeClientOptions(optionsOrConfig, tools, memoryStoreOverride);
  const appConfig = options.appConfig;
  const provider = options.provider ?? resolveProviderFromConfig(appConfig);
  const fallbackProvider = options.fallbackProvider ?? new OffProvider();
  const memoryStore = options.memoryStore ?? new InMemoryStore();
  const toolExecutor = resolveToolExecutor(options, appConfig);
  const runtime = new AgentRuntime({
    provider,
    fallbackProvider,
    toolExecutor,
  });

  return {
    run: (input) => runRequest({ input, runtime, appConfig, memoryStore }),
    runHelloBrain: (input) =>
      runHelloBrainWorkflow({
        input: input ?? {},
        runtime,
        appConfig,
        memoryStore,
        toolExecutor,
      }),
    runPlanSaveExport: (input) =>
      runPlanSaveExportWorkflow({
        input,
        runtime,
        appConfig,
        memoryStore,
        toolExecutor,
      }),
  };
}

export function registerTools(registry: ToolRegistry, tools: ToolContract[]): void {
  for (const tool of tools) {
    if (!registry.get(tool.toolId)) {
      registry.register(tool);
    }
  }
}

async function runRequest({
  input,
  runtime,
  appConfig,
  memoryStore,
}: {
  input: AppClientRunInput;
  runtime: AgentRuntime;
  appConfig: AppConfig;
  memoryStore: MemoryStore;
}): Promise<AgentOutput> {
  const context = createRuntimeContext({
    appId: appConfig.appId,
    userId: input.userId,
    sessionId: input.sessionId,
    locale: input.locale,
    timezone: input.timezone,
    platform: input.platform,
    capabilities: input.capabilities,
    policyProfile: appConfig.policyProfile,
  });

  const priorState = await memoryStore.getState(context.sessionId);
  const history = input.messageHistory ?? toMessages(priorState?.shortMemory ?? []);
  const messages: Message[] = [...history, { role: 'user', content: input.userMessage }];

  const output = await executeWithRecovery({
    runtime,
    context,
    appConfig,
    messages,
    state: priorState ?? undefined,
    budgetOverride: input.budgetOverride,
    requestedTool: input.requestedTool,
  });

  if (output.status !== 'error') {
    await persistConversationSnapshot({
      memoryStore,
      sessionId: context.sessionId,
      userMessage: input.userMessage,
      assistantMessage: output.message,
      appState: input.appState,
    });
  }

  return attachDefaultUiActions(output);
}

async function runHelloBrainWorkflow({
  input,
  runtime,
  appConfig,
  memoryStore,
  toolExecutor,
}: {
  input: HelloBrainInput;
  runtime: AgentRuntime;
  appConfig: AppConfig;
  memoryStore: MemoryStore;
  toolExecutor?: ToolExecutor | undefined;
}): Promise<AgentOutput> {
  const message = input.userMessage ?? 'Hello Brain';
  const context = createRuntimeContext({
    appId: appConfig.appId,
    userId: input.userId,
    sessionId: input.sessionId,
    locale: input.locale,
    timezone: input.timezone,
    platform: input.platform,
    policyProfile: appConfig.policyProfile,
  });

  let setOk = false;
  let getValue: unknown = null;

  if (toolExecutor) {
    const setResult = await toolExecutor.execute({
      toolId: 'storage.set',
      input: {
        key: 'hello.brain',
        payload: {
          value: message,
          at: new Date().toISOString(),
        },
      },
      context: {
        runtimeContext: context,
        traceId: context.requestTraceId,
      },
      idempotencyKey: `hello-set-${context.sessionId}`,
    });
    setOk = setResult.ok;

    const getResult = await toolExecutor.execute({
      toolId: 'storage.get',
      input: {
        key: 'hello.brain',
      },
      context: {
        runtimeContext: context,
        traceId: context.requestTraceId,
      },
      idempotencyKey: `hello-get-${context.sessionId}`,
    });

    if (getResult.ok && isObject(getResult.output)) {
      getValue = (getResult.output as Record<string, unknown>).value ?? null;
    }
  }

  const baseOutput = await executeWithRecovery({
    runtime,
    context,
    appConfig,
    messages: [{ role: 'user', content: message }],
  });

  if (baseOutput.status === 'error') {
    return baseOutput;
  }

  await persistConversationSnapshot({
    memoryStore,
    sessionId: context.sessionId,
    userMessage: message,
    assistantMessage: baseOutput.message,
    appState: { workflow: 'hello-brain' },
  });

  return createOutput({
    status: baseOutput.status,
    message: `${baseOutput.message}\n\nHello Brain workflow is ready.`,
    context,
    latencyMs: baseOutput.metadata.latencyMs,
    data: {
      ...(baseOutput.data ?? {}),
      workflow: {
        name: 'hello-brain',
        storageSetOk: setOk,
        storageValue: getValue,
      },
    },
    actions: [
      { id: 'open_saved_hello', label: 'Open Saved Hello', type: 'button', payload: { key: 'hello.brain' } },
      { id: 'run_hello_again', label: 'Run Again', type: 'retry' },
    ],
    debug: baseOutput.debug,
  });
}

async function runPlanSaveExportWorkflow({
  input,
  runtime,
  appConfig,
  memoryStore,
  toolExecutor,
}: {
  input: PlanSaveExportInput;
  runtime: AgentRuntime;
  appConfig: AppConfig;
  memoryStore: MemoryStore;
  toolExecutor?: ToolExecutor | undefined;
}): Promise<AgentOutput> {
  const format = input.exportFormat ?? 'csv';
  const goal = input.goal.trim();
  const userMessage = input.userMessage ?? `Create a practical plan for: ${goal}`;
  const context = createRuntimeContext({
    appId: appConfig.appId,
    userId: input.userId,
    sessionId: input.sessionId,
    locale: input.locale,
    timezone: input.timezone,
    platform: input.platform,
    policyProfile: appConfig.policyProfile,
  });

  const plan = buildWorkflowPlan(goal, input.planSteps);
  const storageKey = `workflow.plan.${context.sessionId}`;
  const artifacts: Artifact[] = [];

  let storageSetOk = false;
  let exportOk = false;
  let saveError: string | undefined;
  let exportError: string | undefined;

  if (toolExecutor) {
    const saveResult = await toolExecutor.execute({
      toolId: 'storage.set',
      input: {
        key: storageKey,
        payload: {
          workflow: 'plan-save-export',
          goal,
          format,
          steps: plan,
          updatedAt: new Date().toISOString(),
        },
      },
      context: {
        runtimeContext: context,
        traceId: context.requestTraceId,
      },
      idempotencyKey: `plan-save-${context.sessionId}`,
    });

    storageSetOk = saveResult.ok;
    if (!saveResult.ok) {
      saveError = saveResult.error?.message ?? 'Could not save workflow state.';
    }

    const exportToolId = format === 'pdf' ? 'file.export_pdf' : 'file.export_csv';
    const exportResult = await toolExecutor.execute({
      toolId: exportToolId,
      input:
        format === 'pdf'
          ? {
              filename: input.filename ?? `${toSlug(goal)}-plan.pdf`,
              title: `Plan: ${goal}`,
              sections: toPlanSections(plan),
            }
          : {
              filename: input.filename ?? `${toSlug(goal)}-plan.csv`,
              rows: toPlanRows(plan),
            },
      context: {
        runtimeContext: context,
        traceId: context.requestTraceId,
      },
      idempotencyKey: `plan-export-${format}-${context.sessionId}`,
    });

    if (exportResult.ok) {
      exportOk = true;
      const artifact = extractArtifactFromToolOutput(exportResult.output);
      if (artifact) {
        artifacts.push(artifact);
      }
    } else {
      exportError = exportResult.error?.message ?? 'Could not export artifact.';
    }
  }

  if (artifacts.length === 0) {
    artifacts.push(createInlineArtifact({
      format,
      goal,
      plan,
      filename: input.filename,
    }));
  }

  const baseOutput = await executeWithRecovery({
    runtime,
    context,
    appConfig,
    messages: [{ role: 'user', content: userMessage }],
  });

  if (baseOutput.status === 'error') {
    return baseOutput;
  }

  await persistConversationSnapshot({
    memoryStore,
    sessionId: context.sessionId,
    userMessage,
    assistantMessage: baseOutput.message,
    appState: input.appState ?? {
      workflow: 'plan-save-export',
      goal,
      format,
    },
  });

  const status = toolExecutor && !exportOk ? 'needs_user' : baseOutput.status;
  const notes = [
    `${baseOutput.message}`,
    '',
    `Plan generated for "${goal}".`,
    storageSetOk ? `Saved to "${storageKey}".` : toolExecutor ? 'Storage save is not configured or failed.' : 'Storage tool not configured.',
    exportOk
      ? `Export completed as ${format.toUpperCase()}.`
      : toolExecutor
      ? 'Export tool needs configuration or permissions.'
      : 'Export tool not configured. Returning inline artifact.',
  ];

  return createOutput({
    status,
    message: notes.join('\n'),
    context,
    latencyMs: baseOutput.metadata.latencyMs,
    data: {
      ...(baseOutput.data ?? {}),
      workflow: {
        name: 'plan-save-export',
        goal,
        format,
        steps: plan,
        storageKey,
        storageSetOk,
        exportOk,
        ...(saveError ? { saveError } : {}),
        ...(exportError ? { exportError } : {}),
      },
    },
    actions: buildPlanSaveExportActions({
      artifacts,
      format,
      toolConfigured: Boolean(toolExecutor),
      exportOk,
    }),
    artifacts,
    debug: baseOutput.debug,
  });
}

async function persistConversationSnapshot({
  memoryStore,
  sessionId,
  userMessage,
  assistantMessage,
  appState,
}: {
  memoryStore: MemoryStore;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  appState?: Record<string, unknown>;
}): Promise<void> {
  const prior = await memoryStore.getState(sessionId);
  const shortMemory = [
    ...(prior?.shortMemory ?? []),
    toRecord('user', userMessage),
    toRecord('assistant', assistantMessage),
  ].slice(-20);

  const patch: Parameters<MemoryStore['saveState']>[1] = {
    shortMemory,
  };

  if (appState) {
    patch.session = {
      facts: {
        app_state: appState,
      },
    };
  }

  await memoryStore.saveState(sessionId, patch);
}

function toRecord(source: 'user' | 'assistant', content: string) {
  return {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    role: source,
    source,
    content,
    timestamp: new Date().toISOString(),
  };
}

function toMessages(shortMemory: Array<{ role: Message['role']; content: string }>): Message[] {
  return shortMemory.map((item) => ({
    role: item.role,
    content: item.content,
  }));
}

function attachDefaultUiActions(output: AgentOutput): AgentOutput {
  if (output.actions && output.actions.length > 0) {
    return output;
  }

  const actions: SuggestedAction[] = [];
  if (output.status === 'needs_user') {
    actions.push({ id: 'provide_more_context', label: 'Provide More Context', type: 'button' });
  } else if (output.status === 'error') {
    actions.push({ id: 'retry_request', label: 'Retry', type: 'retry' });
  }

  if (actions.length === 0) {
    return output;
  }

  return {
    ...output,
    actions,
  };
}

function resolveProviderFromConfig(appConfig: AppConfig): Provider {
  switch (appConfig.defaultProvider) {
    case 'off':
      return new OffProvider();
    case 'mock':
      return new MockProvider();
    case 'gemini': {
      const apiKey = readEnv('GEMINI_API_KEY');
      if (!apiKey) {
        return new OffProvider();
      }
      return new GeminiProvider({ apiKey });
    }
    default:
      return new OffProvider();
  }
}

function normalizeClientOptions(
  optionsOrConfig: AppClientOptions | AppConfig,
  tools: ToolContract[],
  memoryStore?: MemoryStore
): AppClientOptions {
  if ('appConfig' in optionsOrConfig) {
    return optionsOrConfig;
  }

  return {
    appConfig: optionsOrConfig,
    tools,
    memoryStore,
  };
}

function resolveToolExecutor(options: AppClientOptions, appConfig: AppConfig): ToolExecutor | undefined {
  if (options.toolExecutor) {
    return options.toolExecutor;
  }

  const registry = options.toolRegistry ?? new ToolRegistry();
  if (options.tools && options.tools.length > 0) {
    registerTools(registry, options.tools);
  }

  const registered = registry.list();
  if (registered.length === 0) {
    return undefined;
  }

  const allowedToolIds = appConfig.enabledTools.length > 0 ? appConfig.enabledTools : registered.map((tool) => tool.toolId);
  if (appConfig.enabledTools.length === 0) {
    appConfig.enabledTools = [...allowedToolIds];
  }
  return new ToolExecutor({
    registry,
    allowedToolIds,
  });
}

interface WorkflowPlanStep {
  order: number;
  title: string;
  detail: string;
}

function buildWorkflowPlan(goal: string, customSteps?: string[]): WorkflowPlanStep[] {
  if (customSteps && customSteps.length > 0) {
    return customSteps.map((step, index) => ({
      order: index + 1,
      title: `Step ${index + 1}`,
      detail: step,
    }));
  }

  return [
    {
      order: 1,
      title: 'Define Outcome',
      detail: `Write one measurable outcome for "${goal}".`,
    },
    {
      order: 2,
      title: 'Prepare Inputs',
      detail: 'Gather tools, references, and constraints needed before execution.',
    },
    {
      order: 3,
      title: 'Execute Milestone',
      detail: 'Complete the first milestone and capture concrete progress.',
    },
    {
      order: 4,
      title: 'Review And Adjust',
      detail: 'Evaluate results, adjust the next milestone, and schedule follow-up.',
    },
  ];
}

function toPlanRows(plan: WorkflowPlanStep[]): Array<Record<string, unknown>> {
  return plan.map((step) => ({
    order: step.order,
    title: step.title,
    detail: step.detail,
  }));
}

function toPlanSections(plan: WorkflowPlanStep[]): Array<{ heading: string; content: string }> {
  return plan.map((step) => ({
    heading: `${step.order}. ${step.title}`,
    content: step.detail,
  }));
}

function buildPlanSaveExportActions({
  artifacts,
  format,
  toolConfigured,
  exportOk,
}: {
  artifacts: Artifact[];
  format: 'csv' | 'pdf';
  toolConfigured: boolean;
  exportOk: boolean;
}): SuggestedAction[] {
  const actions: SuggestedAction[] = [
    {
      id: 'open_export_artifact',
      label: `Open ${format.toUpperCase()}`,
      type: 'link',
      payload: {
        artifactId: artifacts[0]?.id,
      },
    },
    {
      id: 'view_plan_steps',
      label: 'View Plan Steps',
      type: 'button',
      payload: {
        workflow: 'plan-save-export',
      },
    },
    {
      id: 'rerun_plan_export',
      label: 'Run Again',
      type: 'retry',
    },
  ];

  if (toolConfigured && !exportOk) {
    actions.push({
      id: 'configure_export_tool',
      label: 'Fix Export Tool',
      type: 'button',
    });
  }

  return actions;
}

function extractArtifactFromToolOutput(output: unknown): Artifact | undefined {
  if (!isObject(output)) {
    return undefined;
  }

  const artifactRaw = isObject(output.artifact) ? output.artifact : output;
  const type = typeof artifactRaw.type === 'string' ? artifactRaw.type : 'file';
  const artifact: Artifact = {
    id: typeof artifactRaw.id === 'string' ? artifactRaw.id : generateArtifactId(type),
    type,
  };

  if (typeof artifactRaw.uri === 'string') {
    artifact.uri = artifactRaw.uri;
  }
  if ('data' in artifactRaw) {
    artifact.data = artifactRaw.data;
  }

  return artifact;
}

function createInlineArtifact({
  format,
  goal,
  plan,
  filename,
}: {
  format: 'csv' | 'pdf';
  goal: string;
  plan: WorkflowPlanStep[];
  filename?: string;
}): Artifact {
  if (format === 'pdf') {
    const sections = toPlanSections(plan);
    return {
      id: generateArtifactId('pdf'),
      type: 'pdf',
      data: {
        title: `Plan: ${goal}`,
        sections,
        filename: filename ?? `${toSlug(goal)}-plan.pdf`,
      },
    };
  }

  const rows = toPlanRows(plan);
  const csv = toCsv(rows);
  return {
    id: generateArtifactId('csv'),
    type: 'csv',
    uri: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
    data: csv,
  };
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
      return set;
    }, new Set<string>())
  );

  const header = columns.map(escapeCsv).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column];
          return escapeCsv(value === undefined || value === null ? '' : String(value));
        })
        .join(',')
    )
    .join('\n');

  return `${header}\n${body}`;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'responseos';
}

function generateArtifactId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `artifact_${prefix}_${Date.now().toString(36)}_${rand}`;
}

async function executeWithRecovery(
  request: Parameters<AgentRuntime['execute']>[0] & {
    runtime: AgentRuntime;
  }
): Promise<AgentOutput> {
  const { runtime, ...runtimeRequest } = request;
  const startedAt = Date.now();

  try {
    return await runtime.execute(runtimeRequest);
  } catch (error) {
    const message = error instanceof ResponseOSError ? error.message : 'Something went wrong. Please try again.';
    return createOutput({
      status: 'error',
      message,
      context: runtimeRequest.context,
      latencyMs: Date.now() - startedAt,
      debug: {
        error: normalizeError(error),
      },
    });
  }
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof ResponseOSError) {
    return {
      name: error.name,
      code: error.code,
      retryable: error.retryable,
      message: error.message,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    message: String(error),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEnv(key: string): string | undefined {
  const scope = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return scope.process?.env?.[key];
}
