import { TTSManager } from "../../systems/audio/ttsManager";

export const STACKING_TTS_OWNER = "stacking";

export async function stopStackingTTS() {
  await TTSManager.stopByOwner(STACKING_TTS_OWNER);
}

export async function speakStackingInstruction(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: STACKING_TTS_OWNER,
    shouldLock: false,
  });
}
