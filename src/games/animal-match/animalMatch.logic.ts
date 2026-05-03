import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePuzzleGame } from "../../features/puzzle/usePuzzleGame";
import { FARM_PIECES, FARM_SLOTS } from "./gameData/farmAnimals";
import {
  speakAnimalMatchInstruction,
  speakAnimalMatchFeedback,
  stopAnimalMatchTTS,
} from "./animalMatch.tts";
import { playAnimalMatchSound } from "./animalMatch.audio";

export function useAnimalMatchGame() {
  const { t } = useTranslation();
  const {
    placedPieces,
    isComplete,
    showCongrats,
    handlePieceDrop,
    resetPuzzle,
    scheduleTimer,
    clearAudioTimers,
  } = usePuzzleGame(FARM_PIECES, FARM_SLOTS);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      scheduleTimer(() => {
        speakAnimalMatchInstruction(t("animalMatch.instruction"));
      }, 200);
    }
    return () => {
      mounted = false;
      stopAnimalMatchTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isComplete) {
      scheduleTimer(async () => {
        await stopAnimalMatchTTS();
        speakAnimalMatchFeedback(t("animalMatch.greatJob"));
      }, 3500);
    }
  }, [isComplete, t, scheduleTimer]);

  const handleRestart = useCallback(() => {
    resetPuzzle();
    stopAnimalMatchTTS();
    scheduleTimer(
      () => speakAnimalMatchInstruction(t("animalMatch.instruction")),
      100,
    );
  }, [resetPuzzle, t, scheduleTimer]);

  const playSound = useCallback((animalName: string) => {
    // e.g. "cow", "pig" maps to our animalMatch.audio.ts keys
    playAnimalMatchSound(animalName.toLowerCase() as any);
  }, []);

  return {
    placedPieces,
    isComplete,
    showCongrats,
    handlePieceDrop,
    handleRestart,
    playSound,
  };
}
