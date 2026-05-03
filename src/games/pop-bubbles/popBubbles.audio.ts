import { AudioManager } from "../../systems/audio/audioManager";
import { TTSManager } from "../../systems/audio/ttsManager";

export const POP_BUBBLES_TTS_OWNER = "popBubbles";

export function playBubblePop() {
  AudioManager.playPop();
}

export async function stopPopBubblesTTS() {
  await TTSManager.stopByOwner(POP_BUBBLES_TTS_OWNER);
}

export async function speakPopBubblesInstruction(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: POP_BUBBLES_TTS_OWNER,
    shouldLock: false,
  });
}
