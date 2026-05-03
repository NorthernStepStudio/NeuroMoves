import { TTSManager } from "../../systems/audio/ttsManager";

export const SIZE_ORDERING_TTS_OWNER = "sizeOrdering";

export async function stopSizeOrderingTTS() {
  await TTSManager.stopByOwner(SIZE_ORDERING_TTS_OWNER);
}

export async function speakSizeOrderingPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: SIZE_ORDERING_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakSizeOrderingFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: SIZE_ORDERING_TTS_OWNER,
    shouldLock: false,
  });
}
