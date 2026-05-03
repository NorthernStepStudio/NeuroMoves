export interface FingerPosition {
  id: number;
  name: string;
  emoji: string;
  x: number; // percentage
  y: number; // percentage
}

export interface LevelConfig {
  sequence: number[];
  description: string;
}

export interface MagicFingersGameState {
  level: number;
  score: number;
  levelConfig: LevelConfig;
  currentStep: number;
  highlightedFinger: number | null;
  errors: number;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
