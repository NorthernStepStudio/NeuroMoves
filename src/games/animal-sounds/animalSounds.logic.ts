import { useState, useCallback, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { AnimalSoundsGameState, Animal } from "./animalSounds.types";
import { ANIMALS } from "./animalSounds.config";
import {
  speakAnimalInstruction,
  stopAnimalSoundsTTS,
} from "./animalSounds.tts";
import {
  playAnimalSoundsSuccess,
  playAnimalSoundsError,
} from "./animalSounds.audio";

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function useAnimalSoundsGame(childAgeMonths: number = 48) {
  const [state, setState] = useState<AnimalSoundsGameState>({
    level: 1,
    score: 0,
    targetAnimal: null,
    options: [],
    feedback: null,
  });

  const [isBusy, setIsBusy] = useState(false);

  const animalBagRef = useRef<Animal[]>([]);

  const getOptionsCount = useCallback(
    (level: number) => {
      let maxOptions = 6;
      if (childAgeMonths < 36)
        maxOptions = 3; // Toddler
      else if (childAgeMonths < 48)
        maxOptions = 4; // Early Preschool
      else if (childAgeMonths < 60) maxOptions = 5; // Late Preschool

      return Math.min(2 + Math.floor(level / 2), maxOptions);
    },
    [childAgeMonths],
  );

  const replenishBag = useCallback(() => {
    let availableAnimals = ANIMALS;
    if (childAgeMonths < 36) {
      availableAnimals = ANIMALS.filter(
        (a) => a.category === "farm" || a.category === "pet",
      );
    } else if (childAgeMonths < 48) {
      availableAnimals = ANIMALS.filter((a) => a.category !== "sea");
    }
    animalBagRef.current = shuffleArray(availableAnimals);
  }, [childAgeMonths]);

  const generateRound = useCallback(
    (level: number, triggerSound: boolean = true) => {
      if (animalBagRef.current.length < getOptionsCount(level)) {
        replenishBag();
      }

      const numOptions = getOptionsCount(level);
      const selectedOptions: Animal[] = [];

      for (let i = 0; i < numOptions && animalBagRef.current.length > 0; i++) {
        selectedOptions.push(animalBagRef.current.pop()!);
      }

      const target =
        selectedOptions[Math.floor(Math.random() * selectedOptions.length)];

      setState((prev) => ({
        ...prev,
        level,
        targetAnimal: target,
        options: shuffleArray(selectedOptions),
        feedback: null,
      }));

      setIsBusy(false);

      if (triggerSound) {
        stopAnimalSoundsTTS().then(() => {
          setTimeout(() => {
            speakAnimalInstruction(target.voiceKey);
          }, 500);
        });
      }
    },
    [getOptionsCount, replenishBag],
  );

  const handleRestart = useCallback(() => {
    stopAnimalSoundsTTS();
    animalBagRef.current = [];
    setState((prev) => ({ ...prev, level: 1, score: 0 }));
    generateRound(1);
  }, [generateRound]);

  useEffect(() => {
    generateRound(1);
    return () => {
      stopAnimalSoundsTTS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlaySound = useCallback(() => {
    if (state.targetAnimal) {
      speakAnimalInstruction(state.targetAnimal.voiceKey);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [state.targetAnimal]);

  const handleAnimalPress = useCallback(
    (animal: Animal) => {
      if (isBusy || !state.targetAnimal) return;

      setIsBusy(true);

      if (animal.name === state.targetAnimal.name) {
        playAnimalSoundsSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const article = ["elephant", "owl", "eagle"].includes(animal.name)
          ? "an"
          : "a";
        speakAnimalInstruction(`yes thats ${article} ${animal.name}`);

        setState((prev) => ({
          ...prev,
          score: prev.score + 10,
          feedback: {
            type: "success",
            message: `Yes! ${animal.emoji} says "${animal.sound}"`,
            emoji: animal.emoji,
          },
        }));

        setTimeout(() => {
          generateRound(state.level + 1);
        }, 1500);
      } else {
        playAnimalSoundsError();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        speakAnimalInstruction(animal.soundKey);

        setState((prev) => ({
          ...prev,
          feedback: {
            type: "error",
            message: `That's a ${animal.name}! Try again!`,
            emoji: animal.emoji,
          },
        }));

        setTimeout(() => {
          setState((prev) => ({ ...prev, feedback: null }));
          setIsBusy(false);
        }, 1500);
      }
    },
    [isBusy, state.targetAnimal, state.level, generateRound],
  );

  return {
    state,
    optionsCount: getOptionsCount(state.level),
    handlePlaySound,
    handleAnimalPress,
    handleRestart,
    generateRound,
  };
}
