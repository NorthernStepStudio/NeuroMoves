import { TTSManager, TTSOptions } from "../../systems/audio/ttsManager";

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

export async function speakStackingInstruction(prompt: string, options: TTSOptions = {}) {
  if (!prompt && prompt !== "0") return;
  const text = String(prompt).trim();
  // If this is a numeric count, prefer local single-digit assets for 0-9,
  // and speak words for 10+ so it is pronounced correctly ("ten" vs "one zero").
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    if (n >= 0 && n <= 9) {
      await TTSManager.speak(text, { owner: STACKING_TTS_OWNER, shouldLock: false, ...options });
      return;
    }

    const word = NUMBER_WORDS[n] ?? text;
    await TTSManager.speak(word, { owner: STACKING_TTS_OWNER, shouldLock: false, forceSystem: true, ...options });
    return;
  }

  await TTSManager.speak(text, { owner: STACKING_TTS_OWNER, shouldLock: false, ...options });
}
