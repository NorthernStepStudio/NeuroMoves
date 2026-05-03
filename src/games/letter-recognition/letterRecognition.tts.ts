import { TTSManager } from "../../systems/audio/ttsManager";

export const LETTER_RECOGNITION_TTS_OWNER = "letterRecognition";

export async function stopLetterRecognitionTTS() {
  await TTSManager.stopByOwner(LETTER_RECOGNITION_TTS_OWNER);
}

export async function speakLetterRecognitionPrompt(letter: string) {
  // The prompt is purely the letter itself initially or "Find the letter X"
  await TTSManager.speak(letter, {
    owner: LETTER_RECOGNITION_TTS_OWNER,
    shouldLock: false, // Do not lock, so user can hit options quickly
  });
}

export async function speakLetterRecognitionFeedback(message: string) {
  await TTSManager.speak(message, {
    owner: LETTER_RECOGNITION_TTS_OWNER,
    shouldLock: false,
  });
}
