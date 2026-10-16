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

/** Misses allowed before game over. */
export const LIVES = 3;

// Sway. Displacement of the block at `level`:
//   SWAY_BASE * sin(2πt / SWAY_PERIOD) * bend(level)  +  kick * kickBend(level)
// bend(level) = min(1, level / SWAY_FULL_LEVEL) ^ SWAY_BEND_POWER, so perfect drops add
// no energy but taller towers move more at the top.
// `kick` is a damped spring (same period) pushed by sloppy drops toward the overhang side.
export const SWAY_BASE = 14;
export const SWAY_PERIOD = 2.6; // seconds per full cycle
export const SWAY_FULL_LEVEL = 40;
export const SWAY_BEND_POWER = 2;
/** Kick amplitude (world units) per world unit of overhang sliced off. */
export const SWAY_KICK_PER_UNIT = 1.2;
/** Cap on kick amplitude. */
export const SWAY_KICK_MAX = 30;
/** Kick amplitude decays like e^(-SWAY_KICK_DECAY * seconds): the sway calms after a chop. */
export const SWAY_KICK_DECAY = 0.6;
/** Kicks reach full effect by this level (linear), so early sloppy drops still visibly sway. */
export const SWAY_KICK_FULL_LEVEL = 8;
