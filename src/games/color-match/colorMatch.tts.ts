import { TTSManager } from "../../systems/audio/ttsManager";

export const COLOR_MATCH_TTS_OWNER = "colorMatch";

export async function stopColorMatchTTS() {
  await TTSManager.stopByOwner(COLOR_MATCH_TTS_OWNER);
}

export async function speakColorMatchInstruction(
  translatedPrompt: string,
  onStatusChange?: (busy: boolean) => void,
) {
  await TTSManager.speak(translatedPrompt, {
    owner: COLOR_MATCH_TTS_OWNER,
    shouldLock: true,
    onStatusChange,
  });
}

export async function speakColorMatchFeedback(translatedFeedback: string) {
  await TTSManager.speak(translatedFeedback, {
    owner: COLOR_MATCH_TTS_OWNER,
    shouldLock: false,
  });
}
