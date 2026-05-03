export interface BubbleData {
  id: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  floatSpeed: number;
}

export interface PopBubblesGameState {
  level: number;
  score: number;
  bubbleData: BubbleData[];
  poppedCount: number;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
    position?: "center" | "top";
    confetti?: boolean;
    transparent?: boolean;
  } | null;
}

export interface BubbleConfig {
  maxBubbles: number;
  moveStartLevel: number;
  minSize: number;
  maxSize: number;
  speedMultiplier: number;
  minDuration: number;
}
