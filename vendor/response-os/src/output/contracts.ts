import type { RuntimeContext } from '../context/runtime-context.js';

export type AgentStatus = 'ok' | 'refused' | 'needs_user' | 'error';

export interface SuggestedAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'retry' | 'confirm';
  payload?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  type: string;
  uri?: string;
  data?: unknown;
}

export interface AgentOutput {
  status: AgentStatus;
  message: string;
  data?: Record<string, unknown>;
  actions?: SuggestedAction[];
  artifacts?: Artifact[];
  metadata: {
    traceId: string;
    appId: string;
    sessionId: string;
    policyProfile: string;
    latencyMs?: number;
  };
  debug?: Record<string, unknown>;
}

export interface OutputFactoryInput {
  status: AgentStatus;
  message: string;
  context: RuntimeContext;
  latencyMs?: number;
  data?: Record<string, unknown>;
  actions?: SuggestedAction[];
  artifacts?: Artifact[];
  debug?: Record<string, unknown>;
}

export function createOutput(input: OutputFactoryInput): AgentOutput {
  const output: AgentOutput = {
    status: input.status,
    message: input.message,
    data: input.data,
    actions: input.actions,
    artifacts: input.artifacts,
    metadata: {
      traceId: input.context.requestTraceId,
      appId: input.context.appId,
      sessionId: input.context.sessionId,
      policyProfile: input.context.policyProfile,
      latencyMs: input.latencyMs,
    },
    debug: input.debug,
  };
  assertAgentOutput(output, 'createOutput');
  return output;
}

const VALID_STATUSES = new Set<AgentStatus>(['ok', 'refused', 'needs_user', 'error']);
const VALID_ACTION_TYPES = new Set<SuggestedAction['type']>(['button', 'link', 'retry', 'confirm']);

export function isAgentOutput(value: unknown): value is AgentOutput {
  if (!isObject(value)) return false;
  if (!VALID_STATUSES.has(value.status as AgentStatus)) return false;
  if (typeof value.message !== 'string') return false;
  if (!isObject(value.metadata)) return false;

  if (typeof value.metadata.traceId !== 'string') return false;
  if (typeof value.metadata.appId !== 'string') return false;
  if (typeof value.metadata.sessionId !== 'string') return false;
  if (typeof value.metadata.policyProfile !== 'string') return false;
  if (value.metadata.latencyMs !== undefined && typeof value.metadata.latencyMs !== 'number') return false;

  if (value.actions !== undefined) {
    if (!Array.isArray(value.actions)) return false;
    for (const action of value.actions) {
      if (!isObject(action)) return false;
      if (typeof action.id !== 'string') return false;
      if (typeof action.label !== 'string') return false;
      if (!VALID_ACTION_TYPES.has(action.type as SuggestedAction['type'])) return false;
      if (action.payload !== undefined && !isObject(action.payload)) return false;
    }
  }

  if (value.artifacts !== undefined) {
    if (!Array.isArray(value.artifacts)) return false;
    for (const artifact of value.artifacts) {
      if (!isObject(artifact)) return false;
      if (typeof artifact.id !== 'string') return false;
      if (typeof artifact.type !== 'string') return false;
      if (artifact.uri !== undefined && typeof artifact.uri !== 'string') return false;
    }
  }

  if (value.data !== undefined && !isObject(value.data)) return false;
  if (value.debug !== undefined && !isObject(value.debug)) return false;

  return true;
}

export function assertAgentOutput(value: unknown, source = 'AgentOutput'): asserts value is AgentOutput {
  if (!isAgentOutput(value)) {
    throw new Error(`${source} is invalid. Output contract check failed.`);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
