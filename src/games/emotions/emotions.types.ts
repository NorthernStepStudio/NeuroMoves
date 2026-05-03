export interface Emotion {
  name: string;
  emoji: string;
  color: string;
  image: any;
}

export interface EmotionsGameState {
  level: number;
  score: number;
  targetEmotion: Emotion | null;
  options: Emotion[];
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
