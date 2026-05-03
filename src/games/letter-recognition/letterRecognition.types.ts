export type LetterCase = "upper" | "lower";

export interface LetterRecognitionState {
  level: number;
  score: number;
  targetLetter: string;
  options: string[];
  targetColor: string;
  optionColors: string[];
  answered: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    emoji: string;
  } | null;
}
