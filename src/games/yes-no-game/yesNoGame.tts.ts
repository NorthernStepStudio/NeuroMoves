import { TTSManager } from "../../systems/audio/ttsManager";

export const YES_NO_TTS_OWNER = "yesNoGame";

export async function stopYesNoTTS() {
  await TTSManager.stopByOwner(YES_NO_TTS_OWNER);
}

export async function speakYesNoPrompt(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: YES_NO_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakYesNoFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: YES_NO_TTS_OWNER,
    shouldLock: true,
  });
}
