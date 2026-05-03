import { TTSManager } from "../../systems/audio/ttsManager";

export const POINT_IT_OUT_TTS_OWNER = "pointItOut";

export async function stopPointItOutTTS() {
  await TTSManager.stopByOwner(POINT_IT_OUT_TTS_OWNER);
}

export async function speakPointItOutPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: POINT_IT_OUT_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakPointItOutFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: POINT_IT_OUT_TTS_OWNER,
    shouldLock: false,
  });
}
