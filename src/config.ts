// All tunables in world units (playfield is WORLD_WIDTH wide) and seconds.

export const WORLD_WIDTH = 100;
export const BLOCK_HEIGHT = 8;
export const BASE_WIDTH = 60;

/** How far the slider's center travels either side of the tower top's center. */
export const SLIDE_RANGE = 55;
export const SLIDE_SPEED_PER_LEVEL = 1.2;
export const SLIDE_SPEED_MAX = 140;

/** A drop within this distance of the block below snaps to a perfect fit. */
export const PERFECT_TOLERANCE = 1.5;

/** Misses allowed before game over. */
export const LIVES = 3;

// Sway. Displacement of the block at `level`:
//   tuning.swayBase * sin(angle) * bend(level)  +  kick * kickBend(level)
// where angle advances 2π per tuning.swayPeriod seconds.
// bend(level) = min(1, level / SWAY_FULL_LEVEL) ^ SWAY_BEND_POWER, so perfect drops add
// no energy but taller towers move more at the top.
// `kick` is a damped spring (same period) pushed by sloppy drops toward the overhang side.
export const SWAY_FULL_LEVEL = 40;
export const SWAY_BEND_POWER = 2;
/** Cap on kick amplitude. */
export const SWAY_KICK_MAX = 30;
/** Kicks reach full effect by this level (linear), so early sloppy drops still visibly sway. */
export const SWAY_KICK_FULL_LEVEL = 8;

/** Live-tunable values, edited by the on-screen tuning panel. */
export interface Tuning {
  swayOn: boolean;
  /** Base sway amplitude at the top of a full-height tower, world units. */
  swayBase: number;
  /** Seconds per full sway cycle. */
  swayPeriod: number;
  /** Kick amplitude (world units) per world unit of overhang sliced off. */
  kickPerUnit: number;
  /** Kick amplitude decays like e^(-kickDecay * seconds): the sway calms after a chop. */
  kickDecay: number;
  /** Slider speed at level 0, units/sec. */
  slideSpeed: number;
}

export const DEFAULT_TUNING: Readonly<Tuning> = {
  swayOn: true,
  swayBase: 14,
  swayPeriod: 2.6,
  kickPerUnit: 1.2,
  kickDecay: 0.6,
  slideSpeed: 60,
};

export const tuning: Tuning = { ...DEFAULT_TUNING };

export function resetTuning(): void {
  Object.assign(tuning, DEFAULT_TUNING);
}
