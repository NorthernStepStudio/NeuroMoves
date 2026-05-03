export interface TouchZone {
  id: string;
  name: string;
  x: number; // percentage
  y: number; // percentage
  w: number; // width percentage
  h: number; // height percentage
}

export interface BodyPartsGameState {
  level: number;
  score: number;
  targetPart: string;
  roundComplete: boolean;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
