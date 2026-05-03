export interface Animal {
  name: string;
  emoji: string;
  sound: string;
  voiceKey: string; // "who says woof woof" for questions
  soundKey: string; // "woof woof" for tap feedback (sound only)
  category: "farm" | "wild" | "bird" | "sea" | "pet";
}

export interface AnimalSoundsGameState {
  level: number;
  score: number;
  targetAnimal: Animal | null;
  options: Animal[];
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
