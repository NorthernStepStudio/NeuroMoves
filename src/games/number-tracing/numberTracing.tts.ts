import { TTSManager } from "../../systems/audio/ttsManager";

export const NUMBER_TRACING_TTS_OWNER = "numberTracing";

export async function stopNumberTracingTTS() {
  await TTSManager.stopByOwner(NUMBER_TRACING_TTS_OWNER);
}

export async function speakNumberTracingPrompt(numberStr: string) {
  await TTSManager.speak(numberStr, {
    owner: NUMBER_TRACING_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakNumberTracingFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: NUMBER_TRACING_TTS_OWNER,
    shouldLock: false,
  });
}
