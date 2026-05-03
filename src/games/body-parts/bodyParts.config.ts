import { TouchZone } from "./bodyParts.types";

export const TOUCH_ZONES: TouchZone[] = [
  { id: "head", name: "head", x: 50, y: 10, w: 25, h: 15 },
  { id: "tummy", name: "tummy", x: 50, y: 40, w: 30, h: 20 },
  { id: "left-hand", name: "hands", x: 20, y: 50, w: 15, h: 15 },
  { id: "right-hand", name: "hands", x: 80, y: 50, w: 15, h: 15 },
  { id: "left-foot", name: "feet", x: 35, y: 88, w: 15, h: 12 },
  { id: "right-foot", name: "feet", x: 65, y: 88, w: 15, h: 12 },
];

export const AVAILABLE_PARTS = ["head", "tummy", "hands", "feet"];
