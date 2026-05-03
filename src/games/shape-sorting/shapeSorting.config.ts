import { ShapeConfig } from "./shapeSorting.types";

export const SHAPES: ShapeConfig[] = [
  { type: "circle", color: "#ef4444", emoji: "🔴" },
  { type: "square", color: "#3b82f6", emoji: "🟦" },
  { type: "triangle", color: "#22c55e", emoji: "🔺" },
  { type: "star", color: "#eab308", emoji: "⭐" },
  { type: "heart", color: "#ec4899", emoji: "💜" },
  { type: "pentagon", color: "#a855f7", emoji: "⬟" },
  { type: "hexagon", color: "#f97316", emoji: "⬢" },
  { type: "diamond", color: "#06b6d4", emoji: "🔷" },
];

export const TARGET_SIZE = 145;
export const DRAGGABLE_SIZE = 145;
export const HIT_THRESHOLD = 150;
