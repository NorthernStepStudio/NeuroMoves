export interface Question {
  text: string;
  answer: "yes" | "no";
  color: string;
  emoji: string;
}

export interface YesNoGameState {
  level: number;
  score: number;
  questions: Question[];
  currentIndex: number;
  isAnimating: boolean;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
