import { AudioManager } from "../../systems/audio/audioManager";

export function playAnimalSoundsSuccess() {
  AudioManager.playSuccess();
}

export function playAnimalSoundsError() {
  AudioManager.playError();
}
