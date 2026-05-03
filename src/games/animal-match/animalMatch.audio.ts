import * as ExpoAudio from "expo-av";

export const animalSounds = {
  cow: require("../../../assets/sounds/voice/sound_moo.mp3"),
  sheep: require("../../../assets/sounds/voice/sound_baa.mp3"),
  horse: require("../../../assets/sounds/voice/sound_neigh.mp3"),
  duck: require("../../../assets/sounds/voice/sound_quack.mp3"),
  dog: require("../../../assets/sounds/voice/sound_woof.mp3"),
  cat: require("../../../assets/sounds/voice/sound_meow.mp3"),
  pig: require("../../../assets/sounds/voice/sound_oink.mp3"),
  rooster: require("../../../assets/sounds/voice/sound_cockadoodledoo.mp3"),
};

export async function playAnimalMatchSound(
  animalKey: keyof typeof animalSounds,
) {
  const asset = animalSounds[animalKey];
  if (!asset) return;

  try {
    const { sound } = await ExpoAudio.Audio.Sound.createAsync(asset, {
      volume: 1.0,
    });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    console.warn(`[AnimalMatch] Failed to play sound for ${animalKey}`, e);
  }
}
