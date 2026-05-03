import { TTSManager } from "../../systems/audio/ttsManager";

export const LETTER_TRACING_TTS_OWNER = "letterTracing";

export async function stopLetterTracingTTS() {
  await TTSManager.stopByOwner(LETTER_TRACING_TTS_OWNER);
}

export async function speakLetterTracingPrompt(letter: string) {
  await TTSManager.speak(letter, {
    owner: LETTER_TRACING_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakLetterTracingFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: LETTER_TRACING_TTS_OWNER,
    shouldLock: false,
  });
}
