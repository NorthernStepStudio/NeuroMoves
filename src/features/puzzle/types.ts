export interface PuzzlePieceData {
  id: string;
  name: string;
  emoji?: string;
  imageUrl?: any;
  soundCue: string;
  slotId: string;
  initialX: number;
  initialY: number;
}

export interface PuzzleSlotData {
  id: string;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  expectedPieceId: string;
}
