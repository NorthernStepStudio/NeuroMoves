import { TTSManager } from "../../systems/audio/ttsManager";

export const ANIMAL_MATCH_TTS_OWNER = "animalMatch";

export async function stopAnimalMatchTTS() {
  await TTSManager.stopByOwner(ANIMAL_MATCH_TTS_OWNER);
}

export async function speakAnimalMatchInstruction(translatedPrompt: string) {
  await TTSManager.speak(translatedPrompt, {
    owner: ANIMAL_MATCH_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakAnimalMatchFeedback(translatedFeedback: string) {
  await TTSManager.speak(translatedFeedback, {
    owner: ANIMAL_MATCH_TTS_OWNER,
    shouldLock: false,
  });
}
