import { SharedValue } from "react-native-reanimated";

export interface BlockData {
  id: number;
  color: string;
  isPlaced: boolean;
}

export interface StackingGameState {
  level: number;
  score: number;
  blocks: BlockData[];
  currentBlockIndex: number;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
    compact?: boolean;
  } | null;
}

export interface DifficultyConfig {
  blockSize: number;
  tolerance: number;
}
