export interface AnimalPiece {
  id: string;
  slotId: string;
  image: any;
  name: string;
  soundCue: any;
}

export interface AnimalMatchState {
  placedPieces: string[];
  isComplete: boolean;
  showCongrats: boolean;
}
