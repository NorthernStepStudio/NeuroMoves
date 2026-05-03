export type ShapeType =
  | "circle"
  | "square"
  | "triangle"
  | "star"
  | "heart"
  | "pentagon"
  | "hexagon"
  | "diamond";

export interface ShapeConfig {
  type: ShapeType;
  color: string;
  emoji: string;
}

export interface LevelConfig {
  draggable: ShapeConfig;
  targets: ShapeConfig[];
}

export interface ShapeSortingState {
  level: number;
  score: number;
  levelConfig: LevelConfig | null;
  isDropped: boolean;
  floatingLabels: { id: number; text: string; x: number; y: number }[];
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
