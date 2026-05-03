export interface HiddenObject {
  id: string;
  name: string;
  emoji: string;
  voiceFile: string;
  x: number; // percentage from left (CENTER)
  y: number; // percentage from top (CENTER)
  width: number; // hit-zone width percentage
  height: number; // hit-zone height percentage
  found: boolean;
}

export interface LevelConfig {
  scene: string;
  sceneEmoji: string;
  backgroundImage: any;
  objects: HiddenObject[];
}

export interface PointItOutState {
  level: number;
  score: number;
  objects: HiddenObject[];
  currentTarget: HiddenObject | null;
  showHint: boolean;
  isListening: boolean;
  speechAvailable: boolean;
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
