import { TTSManager, TTSOptions } from "../../systems/audio/ttsManager";
import { resolveEvaVoiceId } from "../../audio/tts/evaVoiceResolver";

export const STACKING_TTS_OWNER = "stacking";

export async function stopStackingTTS() {
  await TTSManager.stopByOwner(STACKING_TTS_OWNER);
}

const NUMBER_WORDS: Record<number, string> = {
  10: "ten",
  11: "eleven",
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
  15: "fifteen",
  16: "sixteen",
  17: "seventeen",
  18: "eighteen",
  19: "nineteen",
  20: "twenty",
};

export async function preloadStackingSounds() {
  const ids = [
    "say_1", "say_2", "say_3", "say_4", "say_5",
    "say_6", "say_7", "say_8", "say_9", "say_10",
    "stack_the_blocks", "start_here", "tower_built", "stack_fall"
  ];
  try {
    await TTSManager.preloadVoiceIds(ids);
  } catch (e) {
    console.warn("[StackingTTS] Failed to preload sounds", e);
  }
}

export async function speakStackingInstruction(prompt: string, options: TTSOptions = {}) {
  if (!prompt && prompt !== "0") return;
  const text = String(prompt).trim();
  
  const isNumber10 = text === "10";
  if (isNumber10) {
    console.log(`[StackingTTS] requested number: 10`);
    const word = "ten";
    const voiceId = resolveEvaVoiceId(word);
    console.log(`[StackingTTS] resolved asset/id for 10: ${voiceId}`);
    console.log(`[StackingTTS] playback started: 10`);
    await TTSManager.speak(word, { owner: STACKING_TTS_OWNER, shouldLock: false, ...options, waitForCompletion: true });
    console.log(`[StackingTTS] playback finished: 10`);
    return;
  }

  // Speak words for 10+ so EVA pronounces the count correctly ("ten" vs "one zero").
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    const word = NUMBER_WORDS[n] ?? text;
    await TTSManager.speak(word, { owner: STACKING_TTS_OWNER, shouldLock: false, ...options });
    return;
  }

  await TTSManager.speak(text, { owner: STACKING_TTS_OWNER, shouldLock: false, ...options });
}
