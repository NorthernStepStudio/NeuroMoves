import { Dimensions } from "react-native";
import {
  PuzzlePieceData,
  PuzzleSlotData,
} from "../../../features/puzzle/types";

const { width, height: screenHeight } = Dimensions.get("window");
export const BOARD_PADDING = 16;
export const BORDER_WIDTH = 8;
export const BOARD_WIDTH = Math.min(width * 0.94, 600);
export const SLOT_SIZE = (BOARD_WIDTH - BOARD_PADDING * 2) / 4.6;
export const BOARD_HEIGHT = SLOT_SIZE * 2.5 + BOARD_PADDING * 2;
export const PIECE_SIZE = 70;

const BOARD_MARGIN_TOP = 20;
// Dynamic calculation based on screen height to prevent clipping at bottom
const PIECE_START_Y_TOP = Math.max(
  BOARD_MARGIN_TOP + BOARD_HEIGHT + 100,
  screenHeight * 0.65,
);
const PIECE_START_Y_BOTTOM = PIECE_START_Y_TOP + PIECE_SIZE + 20;

export const FARM_PIECES: PuzzlePieceData[] = [
  {
    id: "cow",
    name: "Cow",
    emoji: "\u{1F404}",
    soundCue: "moo",
    slotId: "slot_cow",
    initialX: width * 0.08,
    initialY: PIECE_START_Y_TOP,
  },
  {
    id: "sheep",
    name: "Sheep",
    emoji: "\u{1F411}",
    soundCue: "baa",
    slotId: "slot_sheep",
    initialX: width * 0.32,
    initialY: PIECE_START_Y_TOP,
  },
  {
    id: "horse",
    name: "Horse",
    emoji: "\u{1F40E}",
    soundCue: "neigh",
    slotId: "slot_horse",
    initialX: width * 0.56,
    initialY: PIECE_START_Y_TOP,
  },
  {
    id: "dog",
    name: "Dog",
    emoji: "\u{1F415}",
    soundCue: "woof woof",
    slotId: "slot_dog",
    initialX: width * 0.8,
    initialY: PIECE_START_Y_TOP,
  },
  {
    id: "pig",
    name: "Pig",
    emoji: "\u{1F416}",
    soundCue: "oink oink",
    slotId: "slot_pig",
    initialX: width * 0.08,
    initialY: PIECE_START_Y_BOTTOM,
  },
  {
    id: "duck",
    name: "Duck",
    emoji: "\u{1F986}",
    soundCue: "quack",
    slotId: "slot_duck",
    initialX: width * 0.32,
    initialY: PIECE_START_Y_BOTTOM,
  },
  {
    id: "rooster",
    name: "Rooster",
    emoji: "\u{1F413}",
    soundCue: "cock a doodle doo",
    slotId: "slot_rooster",
    initialX: width * 0.56,
    initialY: PIECE_START_Y_BOTTOM,
  },
  {
    id: "cat",
    name: "Cat",
    emoji: "\u{1F408}",
    soundCue: "meow",
    slotId: "slot_cat",
    initialX: width * 0.8,
    initialY: PIECE_START_Y_BOTTOM,
  },
];

export const FARM_SLOTS: PuzzleSlotData[] = [
  {
    id: "slot_cow",
    expectedPieceId: "cow",
    x: BOARD_PADDING + SLOT_SIZE * 0.1,
    y: BOARD_PADDING + SLOT_SIZE * 0.1,
    centerX: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_sheep",
    expectedPieceId: "sheep",
    x: BOARD_PADDING + SLOT_SIZE * 1.2,
    y: BOARD_PADDING + SLOT_SIZE * 0.1,
    centerX: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_horse",
    expectedPieceId: "horse",
    x: BOARD_PADDING + SLOT_SIZE * 2.3,
    y: BOARD_PADDING + SLOT_SIZE * 0.1,
    centerX: BOARD_PADDING + SLOT_SIZE * 2.3 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_dog",
    expectedPieceId: "dog",
    x: BOARD_PADDING + SLOT_SIZE * 3.4,
    y: BOARD_PADDING + SLOT_SIZE * 0.1,
    centerX: BOARD_PADDING + SLOT_SIZE * 3.4 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_pig",
    expectedPieceId: "pig",
    x: BOARD_PADDING + SLOT_SIZE * 0.1,
    y: BOARD_PADDING + SLOT_SIZE * 1.2,
    centerX: BOARD_PADDING + SLOT_SIZE * 0.1 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_duck",
    expectedPieceId: "duck",
    x: BOARD_PADDING + SLOT_SIZE * 1.2,
    y: BOARD_PADDING + SLOT_SIZE * 1.2,
    centerX: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_rooster",
    expectedPieceId: "rooster",
    x: BOARD_PADDING + SLOT_SIZE * 2.3,
    y: BOARD_PADDING + SLOT_SIZE * 1.2,
    centerX: BOARD_PADDING + SLOT_SIZE * 2.3 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  {
    id: "slot_cat",
    expectedPieceId: "cat",
    x: BOARD_PADDING + SLOT_SIZE * 3.4,
    y: BOARD_PADDING + SLOT_SIZE * 1.2,
    centerX: BOARD_PADDING + SLOT_SIZE * 3.4 + SLOT_SIZE / 2,
    centerY: BOARD_PADDING + SLOT_SIZE * 1.2 + SLOT_SIZE / 2,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
];
