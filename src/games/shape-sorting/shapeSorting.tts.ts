import { TTSManager } from "../../systems/audio/ttsManager";

export const SHAPE_SORTING_TTS_OWNER = "shapeSorting";

export async function stopShapeSortingTTS() {
  await TTSManager.stopByOwner(SHAPE_SORTING_TTS_OWNER);
}

export async function speakShapeSortingPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: SHAPE_SORTING_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakShapeSortingFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: SHAPE_SORTING_TTS_OWNER,
    shouldLock: false,
  });
}
