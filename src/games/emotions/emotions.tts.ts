import { TTSManager } from "../../systems/audio/ttsManager";

export const EMOTIONS_TTS_OWNER = "emotions";

export async function stopEmotionsTTS() {
  await TTSManager.stopByOwner(EMOTIONS_TTS_OWNER);
}

export async function speakEmotionsPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: EMOTIONS_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakEmotionsFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: EMOTIONS_TTS_OWNER,
    shouldLock: false,
  });
}
