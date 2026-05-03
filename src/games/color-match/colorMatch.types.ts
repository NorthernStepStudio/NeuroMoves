export interface ColorOption {
  name: string;
  value: string;
}

export interface ColorMatchState {
  level: number;
  score: number;
  targetColor: ColorOption | null;
  options: ColorOption[];
  roundComplete: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    emoji: string;
  } | null;
}
