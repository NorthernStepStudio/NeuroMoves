export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'developer';

export interface Message {
  role: Role;
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type FinishReason = 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'null';

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentResult {
  content: string;
  finishReason: FinishReason;
  toolCalls?: ToolCall[];
  usage?: Usage;
}

export interface Budget {
  maxSteps: number;
  maxTotalTokens: number;
  currentSteps: number;
  currentTokens: number;
}

export interface RoutineStep {
  activity: string;
  time: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Routine {
  title: string;
  duration: string;
  steps: RoutineStep[];
  safetyNote: string;
  disclaimer: string;
}
