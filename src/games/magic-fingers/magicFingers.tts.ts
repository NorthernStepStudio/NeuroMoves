import { TTSManager } from "../../systems/audio/ttsManager";

export const MAGIC_FINGERS_TTS_OWNER = "magicFingers";

export async function stopMagicFingersTTS() {
  await TTSManager.stopByOwner(MAGIC_FINGERS_TTS_OWNER);
}

export async function speakMagicFingersPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: MAGIC_FINGERS_TTS_OWNER,
    shouldLock: false,
  });
}
