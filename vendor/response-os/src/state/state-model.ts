import type { Message } from '../core/types.js';

export type MessageSource = 'user' | 'assistant' | 'system' | 'developer' | 'tool';

export interface MessageRecord extends Message {
  id: string;
  timestamp: string;
  source: MessageSource;
  metadata?: Record<string, unknown>;
}

export interface OpenTask {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface ActionRecord {
  id: string;
  type: string;
  at: string;
  summary: string;
}

export interface ToolResultRecord {
  toolId: string;
  at: string;
  ok: boolean;
  summary: string;
  data?: unknown;
}

export interface SessionState {
  facts: Record<string, unknown>;
  preferences: Record<string, unknown>;
  openTasks: OpenTask[];
  lastActions: ActionRecord[];
  toolResults: ToolResultRecord[];
}

export interface ConversationState {
  shortMemory: MessageRecord[];
  persistedMemoryRef?: string;
  session: SessionState;
}

export function createInitialConversationState(): ConversationState {
  return {
    shortMemory: [],
    session: {
      facts: {},
      preferences: {},
      openTasks: [],
      lastActions: [],
      toolResults: [],
    },
  };
}
