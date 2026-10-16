// All tunables in world units (playfield is WORLD_WIDTH wide) and seconds.

export const WORLD_WIDTH = 100;
export const BLOCK_HEIGHT = 8;
export const BASE_WIDTH = 60;

/** How far the slider's center travels either side of the tower top's center. */
export const SLIDE_RANGE = 55;
export const SLIDE_SPEED_START = 60; // units/sec
export const SLIDE_SPEED_PER_LEVEL = 1.2;
export const SLIDE_SPEED_MAX = 140;

/** A drop within this distance of the block below snaps to a perfect fit. */
export const PERFECT_TOLERANCE = 1.5;
