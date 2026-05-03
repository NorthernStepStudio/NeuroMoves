export type LetterCase = "upper" | "lower";

export interface TracePoint {
  x: number;
  y: number;
}

export interface TraceStrokeData {
  points: TracePoint[];
}

export interface GlyphData {
  strokes: TraceStrokeData[];
  viewBox: string;
}

export interface LetterTracingState {
  level: number;
  score: number;
  targetLetter: string;
  completedStrokes: number;
  isComplete: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    emoji: string;
  } | null;
}
