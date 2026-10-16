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

// Hard mode: one life, real balance (nothing is sliced; a tower whose upper part's center of mass
// passes a contact edge tips over), and the music's tempo follows the slider.
export const HARD_LIVES = 1;
/** The music never plays faster than this many times its written tempo. */
export const HARD_TEMPO_MAX = 1.35;
/** Float slack for the balance check: a center of mass exactly on a contact edge still stands. */
export const BALANCE_EPSILON = 1e-9;

// Hard mode turns every difficulty knob up ("all settings to 11"); Normal's numbers are untouched.
// The *_SCALE values multiply the live `tuning` (so the ⚙ panel still moves both modes); the rest
// replace Normal's constants. Measured by the seeded bots in hard.test.ts: blind tapping (random
// intervals, fixed rhythms, mashing) dies within a couple of dozen bars, a player aiming with human
// timing gets a moderate run (median ~36 bars), and perfect timing still climbs for hundreds.
/** Slider speed at level 0, × tuning.slideSpeed. */
export const HARD_SLIDE_SPEED_SCALE = 1.5;
export const HARD_SLIDE_SPEED_PER_LEVEL = 3.5;
export const HARD_SLIDE_SPEED_MAX = 200;
/**
 * Base sway, × tuning.swayBase. With HARD_SWAY_KICK_MAX, a straight tower's top bar and its whole
 * swing fit a phone's view (150 units); a leaning tower relies on the camera's sideways pan
 * (camera.ts), which stays off while the base is on screen.
 */
export const HARD_SWAY_SCALE = 1.4;
/** Sway period, × tuning.swayPeriod: a faster swing. */
export const HARD_SWAY_PERIOD_SCALE = 0.75;
/** The sway reaches full strength this low, and grows faster on the way. */
export const HARD_SWAY_FULL_LEVEL = 20;
export const HARD_SWAY_BEND_POWER = 1.5;
/** Kick per unit of overhang, × tuning.kickPerUnit. */
export const HARD_KICK_SCALE = 1.75;
/** Kick damping, × tuning.kickDecay: a kicked tower swings on longer. */
export const HARD_KICK_DECAY_SCALE = 0.5;
export const HARD_SWAY_KICK_FULL_LEVEL = 4;
export const HARD_SWAY_KICK_MAX = 25;
/**
 * Tighter than Normal's 1.5, but not so tight that 60 Hz frames skip over it: at Hard's top slider
 * speed plus sway the bar moves 4–5 units a frame, and at 1.0 even a bot tapping on the best frame
 * landed only about 55–60% perfects, so streaks (and their medals) came down to luck.
 */
export const HARD_PERFECT_TOLERANCE = 1.25;
/** Perfect calm, × tuning.perfectCalm, held for HARD_CALM_TIME. */
export const HARD_PERFECT_CALM_SCALE = 0.5;
export const HARD_CALM_TIME = 1.2;

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
/** After a perfect drop the tower stays calm this long, seconds. */
export const CALM_TIME = 2;
/** How fast calm eases in and out, per second (smooth, so the tower never jumps). */
export const CALM_EASE = 3;
/** Kicks reach full effect by this level (linear), so early sloppy drops still visibly sway. */
export const SWAY_KICK_FULL_LEVEL = 8;

/** Live-tunable values, edited by the on-screen tuning panel. */
export interface Tuning {
  /** Visual skin: "auto" (by date) or a skin id. No effect on gameplay. */
  skin: string;
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
  /** How much a perfect drop calms the sway: 0 = not at all, 1 = fully still. */
  perfectCalm: number;
}

export const DEFAULT_TUNING: Readonly<Tuning> = {
  skin: "auto",
  swayOn: true,
  swayBase: 14,
  swayPeriod: 2.6,
  kickPerUnit: 1.2,
  kickDecay: 0.6,
  slideSpeed: 48,
  perfectCalm: 0.6,
};

export const tuning: Tuning = { ...DEFAULT_TUNING };

export function resetTuning(): void {
  Object.assign(tuning, DEFAULT_TUNING);
}
