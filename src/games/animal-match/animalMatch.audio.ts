import { TTSManager } from "../../systems/audio/ttsManager";

export const animalSounds: Record<string, string> = {
  cow: "moo",
  sheep: "baa",
  horse: "neigh",
  duck: "quack",
  dog: "woof woof",
  cat: "meow",
  pig: "oink oink",
  rooster: "cock a doodle doo",
};

export async function playAnimalMatchSound(
  animalKey: keyof typeof animalSounds,
) {
  const soundText = animalSounds[animalKey];
  if (!soundText) return;

  try {
    await TTSManager.speak(soundText, {
      owner: "animalMatchSound",
      shouldLock: false,
    });
  } catch (e) {
    console.warn(`[AnimalMatch] Failed to play sound for ${animalKey}`, e);
  }
}
