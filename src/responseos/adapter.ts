import * as Sharing from 'expo-sharing';
import {
  createAppClient,
  type AgentOutput,
  type PlanSaveExportInput,
  type RuntimePlatform,
} from '@nss/response-os';
import { createNeuromovesResponseOsConfig } from './config';
import { AsyncStorageMemoryStore } from './memory-store';
import { createNeuromovesExportTools } from './tools/export.tool';
import { createNeuromovesHttpTools } from './tools/http.tool';
import { createNeuromovesStorageTools } from './tools/storage.tool';

const appConfig = createNeuromovesResponseOsConfig();
const memoryStore = new AsyncStorageMemoryStore('neuromoves-mobile');
const tools = [...createNeuromovesStorageTools(), ...createNeuromovesHttpTools(), ...createNeuromovesExportTools()];

const client = createAppClient(appConfig, tools, memoryStore);

export interface NeuromovesRunRequest {
  input: string;
  userId?: string;
  sessionId?: string;
  platform?: RuntimePlatform;
  appState?: Record<string, unknown>;
}

export interface NeuromovesPlanRequest {
  goal: string;
  userId?: string;
  sessionId?: string;
  exportFormat?: 'csv' | 'pdf';
  appState?: Record<string, unknown>;
}

export async function runNeuromovesResponse(request: NeuromovesRunRequest): Promise<AgentOutput> {
  const runtimeDefaults = getRuntimeDefaults();
  return client.run({
    userMessage: request.input,
    userId: request.userId,
    sessionId: request.sessionId,
    platform: request.platform ?? 'mobile',
    locale: runtimeDefaults.locale,
    timezone: runtimeDefaults.timezone,
    appState: request.appState,
  });
}

export async function runNeuromovesPlanSaveExport(request: NeuromovesPlanRequest): Promise<AgentOutput> {
  const runtimeDefaults = getRuntimeDefaults();
  const input: PlanSaveExportInput = {
    goal: request.goal,
    userId: request.userId,
    sessionId: request.sessionId,
    platform: 'mobile',
    locale: runtimeDefaults.locale,
    timezone: runtimeDefaults.timezone,
    exportFormat: request.exportFormat ?? 'csv',
    appState: request.appState,
  };

  return client.runPlanSaveExport(input);
}

export async function shareFirstArtifact(result: AgentOutput): Promise<boolean> {
  const artifact = result.artifacts?.[0];
  if (!artifact?.uri) return false;

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return false;

  await Sharing.shareAsync(artifact.uri);
  return true;
}

export function summarizeAgentResult(result: AgentOutput): string {
  const workflow = extractWorkflow(result);
  const lines = [
    statusLabel(result.status),
    workflow?.name ? `Workflow: ${String(workflow.name)}` : '',
    typeof workflow?.storageSetOk === 'boolean' ? `Saved: ${workflow.storageSetOk ? 'yes' : 'no'}` : '',
    typeof workflow?.exportOk === 'boolean' ? `Export: ${workflow.exportOk ? 'ok' : 'fallback'}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function extractWorkflow(result: AgentOutput): Record<string, unknown> | null {
  const workflow = result.data?.workflow;
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return null;
  }
  return workflow as Record<string, unknown>;
}

function statusLabel(status: AgentOutput['status']): string {
  if (status === 'ok') return 'ResponseOS completed successfully.';
  if (status === 'needs_user') return 'ResponseOS needs more input.';
  if (status === 'refused') return 'ResponseOS refused this request.';
  return 'ResponseOS encountered an error.';
}

function getRuntimeDefaults(): { locale: string; timezone: string } {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return {
      locale: resolved.locale ?? 'en-US',
      timezone: resolved.timeZone ?? 'UTC',
    };
  } catch {
    return { locale: 'en-US', timezone: 'UTC' };
  }
}
