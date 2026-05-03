export interface TracePoint {
  x: number;
  y: number;
}

export interface NumberTracingState {
  level: number;
  score: number;
  targetNumber: string;
  isComplete: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    emoji: string;
  } | null;
}
