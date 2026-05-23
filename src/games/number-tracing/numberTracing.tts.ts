import { TTSManager } from "../../systems/audio/ttsManager";

export const NUMBER_TRACING_TTS_OWNER = "numberTracing";

export interface NumberTraceTTSOptions {
  waitForCompletion?: boolean;
  debugLabel?: string;
}

export async function stopNumberTracingTTS() {
  await TTSManager.stopByOwner(NUMBER_TRACING_TTS_OWNER);
}

export async function speakNumberTracingPrompt(
  numberStr: string,
  options: NumberTraceTTSOptions = {},
) {
  await TTSManager.speak(numberStr, {
    owner: NUMBER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}

export async function speakNumberTracingPraise(
  options: NumberTraceTTSOptions = {},
) {
  await TTSManager.speak("great job", {
    owner: NUMBER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}

export async function speakNumberTracingFeedback(
  message: string,
  options: NumberTraceTTSOptions = {},
) {
  await TTSManager.speak(message, {
    owner: NUMBER_TRACING_TTS_OWNER,
    shouldLock: false,
    waitForCompletion: options.waitForCompletion,
    debugLabel: options.debugLabel,
  });
}
