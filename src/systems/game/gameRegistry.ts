import { ColorMatchScreen } from "../../games/color-match/ColorMatchScreen";
import { AnimalMatchScreen } from "../../games/animal-match/AnimalMatchScreen";
import LetterTracingScreen from "../../games/letter-tracing/LetterTracingScreen";
import NumberTracingScreen from "../../games/number-tracing/NumberTracingScreen";
import LetterRecognitionScreen from "../../games/letter-recognition/LetterRecognitionScreen";
import NumberRecognitionScreen from "../../games/number-recognition/NumberRecognitionScreen";
import PointItOutScreen from "../../games/point-it-out/PointItOutScreen";
import ShapeSortingScreen from "../../games/shape-sorting/ShapeSortingScreen";
import SizeOrderingScreen from "../../games/size-ordering/SizeOrderingScreen";
import YesNoGameScreen from "../../games/yes-no-game/YesNoGameScreen";
import EmotionsScreen from "../../games/emotions/EmotionsScreen";
import BodyPartsScreen from "../../games/body-parts/BodyPartsScreen";
import MagicFingersScreen from "../../games/magic-fingers/MagicFingersScreen";
import PopBubblesScreen from "../../games/pop-bubbles/PopBubblesScreen";
import StackingScreen from "../../games/stacking/StackingScreen";
import AnimalSoundsScreen from "../../games/animal-sounds/AnimalSoundsScreen";

// We map the screens here so Navigation can pull them without hardcoding tangled imports
export const GAME_REGISTRY: Record<string, any> = {
  "letter-tracing": {
    id: "letter-tracing",
    title: "Letter Tracing",
    component: LetterTracingScreen,
    enabled: true,
    status: "active",
  },
  "number-tracing": {
    id: "number-tracing",
    title: "Number Tracing",
    component: NumberTracingScreen,
    enabled: true,
    status: "active",
  },
  "letter-recognition": {
    id: "letter-recognition",
    title: "Letter Recognition",
    component: LetterRecognitionScreen,
    enabled: true,
    status: "active",
  },
  "number-recognition": {
    id: "number-recognition",
    title: "Number Recognition",
    component: NumberRecognitionScreen,
    enabled: true,
    status: "active",
  },
  "animal-match": {
    id: "animal-match",
    title: "Animal Match",
    component: AnimalMatchScreen,
    enabled: true,
    status: "active",
  },
  "color-match": {
    id: "color-match",
    title: "Color Match",
    component: ColorMatchScreen,
    enabled: true,
    status: "active",
  },
  "point-it-out": {
    id: "point-it-out",
    title: "Point It Out",
    component: PointItOutScreen,
    enabled: true,
    status: "active",
  },
  "shape-sorting": {
    id: "shape-sorting",
    title: "Shape Sorting",
    component: ShapeSortingScreen,
    enabled: true,
    status: "active",
  },
  "size-ordering": {
    id: "size-ordering",
    title: "Size Ordering",
    component: SizeOrderingScreen,
    enabled: true,
    status: "active",
  },
  "yes-no-game": {
    id: "yes-no-game",
    title: "Yes/No Game",
    component: YesNoGameScreen,
    enabled: true,
    status: "active",
  },
  emotions: {
    id: "emotions",
    title: "Emotions",
    component: EmotionsScreen,
    enabled: true,
    status: "active",
  },
  "body-parts": {
    id: "body-parts",
    title: "Body Parts",
    component: BodyPartsScreen,
    enabled: false,
    status: "disabled",
    reason: "Temporarily disabled until mechanics are complete",
  },
  "magic-fingers": {
    id: "magic-fingers",
    title: "Magic Fingers",
    component: MagicFingersScreen,
    enabled: false,
    status: "disabled",
    reason: "Temporarily disabled until mechanics are complete",
  },
  "pop-bubbles": {
    id: "pop-bubbles",
    title: "Pop Bubbles",
    component: PopBubblesScreen,
    enabled: true,
    status: "active",
  },
  stacking: {
    id: "stacking",
    title: "Stacking",
    component: StackingScreen,
    enabled: true,
    status: "active",
  },
  "animal-sounds": {
    id: "animal-sounds",
    title: "Animal Sounds",
    component: AnimalSoundsScreen,
    enabled: true,
    status: "active",
  },
};
