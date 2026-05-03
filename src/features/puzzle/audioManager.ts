import { useGame } from '../../core/GameContext';

/**
 * A specialized hook for managing puzzle audio interactions.
 * It uses the central GameContext to ensure volume settings and 
 * caregiver muting rules are respected.
 */
export function usePuzzleAudioManager() {
  const { speak, playSuccess, playError, playPop, isBusy } = useGame();

  const playAnimalSound = (soundCue: string) => {
    // soundCue could be "moo", "baa", "woof woof"
    speak(soundCue, { shouldLock: true });
  };

  const playAnimalName = (name: string) => {
    // Using the "yes thats a..." prefix to trigger human voice assets from VoiceAssets.ts
    speak(`yes thats a ${name.toLowerCase()}`, { shouldLock: true });
  };

  const playFeedback = (type: 'success' | 'error' | 'pop') => {
    switch (type) {
      case 'success':
        playSuccess();
        break;
      case 'error':
        playError();
        break;
      case 'pop':
        playPop();
        break;
    }
  };

  return {
    playAnimalSound,
    playAnimalName,
    playFeedback,
  };
}
