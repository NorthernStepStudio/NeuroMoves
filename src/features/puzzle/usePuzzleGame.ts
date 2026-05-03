import { useState, useCallback, useRef, useEffect } from 'react';
import { PuzzlePieceData, PuzzleSlotData } from './types';
import { useGame } from '../../core/GameContext';
import { usePuzzleAudioManager } from './audioManager';
import * as Haptics from 'expo-haptics';
import { BORDER_WIDTH } from '../../games/animal-match/gameData/farmAnimals';

export function usePuzzleGame(pieces: PuzzlePieceData[], slots: PuzzleSlotData[]) {
  const { recordSuccess, settings } = useGame();
  const { playAnimalSound, playAnimalName, playFeedback } = usePuzzleAudioManager();
  
  const [placedPieces, setPlacedPieces] = useState<string[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const audioTimersRef = useRef<NodeJS.Timeout[]>([]);
  
  const clearAudioTimers = useCallback(() => {
    audioTimersRef.current.forEach(clearTimeout);
    audioTimersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    audioTimersRef.current.push(timer);
    return timer;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAudioTimers();
  }, [clearAudioTimers]);
  
  const isComplete = placedPieces.length === pieces.length && pieces.length > 0;

  const handlePieceDrop = useCallback((pieceId: string, dropX: number, dropY: number, boardLayout: {x: number, y: number, width: number, height: number} | null) => {
    if (!boardLayout) return false;

    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return false;

    const slot = slots.find(s => s.id === piece.slotId);
    if (!slot) return false;

    const relativeX = dropX - (boardLayout.x + BORDER_WIDTH);
    const relativeY = dropY - (boardLayout.y + BORDER_WIDTH);

    const distance = Math.sqrt(Math.pow(relativeX - slot.centerX, 2) + Math.pow(relativeY - slot.centerY, 2));
    const snapRadius = 90; 

    if (distance <= snapRadius) {
      setPlacedPieces(prev => {
        if (!prev.includes(pieceId)) {
          const next = [...prev, pieceId];
          if (next.length === pieces.length) {
            // Track the congrats timer so it can be cleared on unmount/reset
            const congratsTimer = setTimeout(() => setShowCongrats(true), 3500);
            audioTimersRef.current.push(congratsTimer);
          }
          return next;
        }
        return prev;
      });
      
      if (settings?.hapticEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      playFeedback('success');
      
      // Clear any pending sounds from a previous match to prevent "audio pile-up"
      clearAudioTimers();
      
      // Schedule sounds and track them in the ref - One sound then the name for better pacing
      audioTimersRef.current.push(setTimeout(() => playAnimalSound(piece.soundCue), 250)); 
      audioTimersRef.current.push(setTimeout(() => playAnimalName(piece.name), 1500)); 
      
      recordSuccess();
      return true;
    } else {
      if (settings?.hapticEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      playFeedback('error');
      return false; 
    }
  }, [pieces, slots, playFeedback, playAnimalSound, playAnimalName, recordSuccess, settings?.hapticEnabled]);

  const resetPuzzle = useCallback(() => {
    clearAudioTimers();
    setPlacedPieces([]);
    setShowCongrats(false);
  }, [clearAudioTimers]);

  return {
    placedPieces,
    isComplete,
    showCongrats,
    handlePieceDrop,
    resetPuzzle,
    scheduleTimer,
    clearAudioTimers
  };
}
