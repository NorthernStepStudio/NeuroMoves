import { TTSManager } from "../../systems/audio/ttsManager";

export const LETTER_TRACING_TTS_OWNER = "letterTracing";

export interface LetterTraceTTSOptions {
  waitForCompletion?: boolean;
  debugLabel?: string;
}

function normalizeLetter(letter: string): string {
  return letter.trim().toLowerCase();
}

export async function stopLetterTracingTTS() {
  await TTSManager.stopByOwner(LETTER_TRACING_TTS_OWNER);
}

export async function speakLetterTracingPrompt(
  letter: string,
  options: LetterTraceTTSOptions = {},
) {
  const key = normalizeLetter(letter);
  const speechText = key === "b" ? "yes thats a bee" : key;
  await TTSManager.speak(speechText, {
    owner: LETTER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}

export async function speakLetterTracingPraise(
  options: LetterTraceTTSOptions = {},
) {
  await TTSManager.speak("great job", {
    owner: LETTER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}

export async function speakLetterTracingFeedback(
  message: string,
  options: LetterTraceTTSOptions = {},
) {
  const key = normalizeLetter(message);
  const speechText = key === "b" ? "yes thats a bee" : key;
  await TTSManager.speak(speechText, {
    owner: LETTER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}
