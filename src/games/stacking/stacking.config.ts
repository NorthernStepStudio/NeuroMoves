// Distance from the bottom of the screen to the platform.
// Restored to original so vertical layout behaves consistently across devices.
export const PLATFORM_BOTTOM = 64;
// Make the platform wider so blocks have more surface to land on
export const PLATFORM_WIDTH = 340;

export const DIFFICULTY_CONFIG = {
  // Increased block sizes to be easier for kids to tap/stack
  // Increased block sizes to be easier for kids to tap/stack (≈+25%)
  1: { blockSize: 188, tolerance: 44 },
  2: { blockSize: 180, tolerance: 42 },
  3: { blockSize: 173, tolerance: 39 },
  4: { blockSize: 163, tolerance: 35 },
  5: { blockSize: 154, tolerance: 33 },
  6: { blockSize: 154, tolerance: 31 },
  7: { blockSize: 154, tolerance: 28 },
  8: { blockSize: 154, tolerance: 24 },
  9: { blockSize: 154, tolerance: 22 },
  10: { blockSize: 154, tolerance: 20 },
};

export const BLOCK_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
];
