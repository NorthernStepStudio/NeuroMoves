import { TTSManager } from "../../systems/audio/ttsManager";

export const BODY_PARTS_TTS_OWNER = "bodyParts";

export async function stopBodyPartsTTS() {
  await TTSManager.stopByOwner(BODY_PARTS_TTS_OWNER);
}

export async function speakBodyPartsPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: BODY_PARTS_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakBodyPartsFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: BODY_PARTS_TTS_OWNER,
    shouldLock: false,
  });
}
