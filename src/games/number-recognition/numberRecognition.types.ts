export interface NumberRecognitionState {
  level: number;
  score: number;
  targetNumber: number | null;
  options: number[];
  targetColor: string;
  optionColors: string[];
  answered: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    emoji: string;
  } | null;
}
