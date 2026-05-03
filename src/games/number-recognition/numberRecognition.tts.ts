import { TTSManager } from "../../systems/audio/ttsManager";

export const NUMBER_RECOGNITION_TTS_OWNER = "numberRecognition";

export async function stopNumberRecognitionTTS() {
  await TTSManager.stopByOwner(NUMBER_RECOGNITION_TTS_OWNER);
}

export async function speakNumberRecognitionPrompt(numberStr: string) {
  await TTSManager.speak(numberStr, {
    owner: NUMBER_RECOGNITION_TTS_OWNER,
    shouldLock: false,
  });
}

export async function speakNumberRecognitionFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: NUMBER_RECOGNITION_TTS_OWNER,
    shouldLock: false,
  });
}
