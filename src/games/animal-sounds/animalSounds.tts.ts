import { TTSManager } from "../../systems/audio/ttsManager";

export const ANIMAL_SOUNDS_TTS_OWNER = "animalSounds";

export async function stopAnimalSoundsTTS() {
  await TTSManager.stopByOwner(ANIMAL_SOUNDS_TTS_OWNER);
}

export async function speakAnimalInstruction(prompt: string) {
  await TTSManager.speak(prompt, {
    owner: ANIMAL_SOUNDS_TTS_OWNER,
    shouldLock: false,
  });
}
