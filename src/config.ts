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
/** Cap on kick amplitude (about the spring's rest point; trims velocity only, never position). */
export const SWAY_KICK_MAX = 30;
/** After a perfect drop the tower stays calm this long, seconds. */
export const CALM_TIME = 2;
/** How fast calm eases in and out, per second (smooth, so the tower never jumps). */
export const CALM_EASE = 3;
/** Kicks reach full effect by this level (linear), so early sloppy drops still visibly sway. */
export const SWAY_KICK_FULL_LEVEL = 8;
/** Spring integration substep, seconds. */
export const KICK_SUBSTEP = 1 / 240;

// --- Balance: lean, topple, gusts -------------------------------------------------
// Off-center drops move the top's center off the base's (drift); the tower leans that way
// and sways harder. Keep erring to one side and it goes WOBBLY, then a heavy-side sloppy drop
// ARMS it: if its top then reaches the rail it teeters and topples. A tower that was steady
// when you dropped never falls from that drop alone (LAST CHANCE). Windy bands send
// telegraphed gusts that lean the tower briefly. See CLAUDE.md "Game rules".

/** Lean eases toward its target at this rate, per second (63% in 0.25 s). */
export const LEAN_EASE = 4;
/** The lean visibly tilts this many top levels; everything below stays plumb. */
export const LEAN_SPAN = 12;
/** How fast the lean profile follows a new top block, per second. */
export const LEAN_TOP_EASE = 8;
/** |lean| at which leanSway reaches full effect, world units. */
export const LEAN_SWAY_REF = BASE_WIDTH / 2;
/** forecast/limit at which the tower is WOBBLY (and a heavy-side sloppy drop arms it). */
export const WARN_FRAC = 0.6;
/** |tilt|/limit at which the tower is in DANGER; gusts wait while forecast/limit is above it. */
export const DANGER_FRAC = 0.85;
/** Teeter drains this many times faster than it fills, so rail-scrapes are near-misses. */
export const TEETER_RECOVER = 2;
/** Longest an unarmed tower hangs past the rail before it goes anyway, game seconds. */
export const LAST_CHANCE_TIME = 3;
/** Below this |drift| a rebuild just takes the newest cut. */
export const DRIFT_EPS = 0.5;
/** Windy bands: from this level, GUST_BAND levels windy, GUST_BAND calm, alternating. */
export const GUST_START_LEVEL = 12;
export const GUST_BAND = 8;
/** First windy band blows at this fraction of gustPush; each later windy band adds GUST_STRENGTH_STEP. */
export const GUST_STRENGTH_FIRST = 0.5;
export const GUST_STRENGTH_STEP = 0.25;
/** Placed blocks between gust starts (inclusive range, picked by hash). */
export const GUST_GAP_MIN = 3;
export const GUST_GAP_MAX = 5;
/** Telegraph before the push, then the sin^2 push, seconds. */
export const GUST_WARN = 1.2;
export const GUST_BLOW = 1.6;

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

  // Balance (all switches off + perfectSteady = perfectBrace = 0 gives the pre-balance game)
  /** Off-center drops lean the tower toward its heavy side. */
  leanOn: boolean;
  /** Lean at the top per unit of drift, on a tower of level 8+. */
  leanGain: number;
  /** A leaning tower sways more: wave x (1 + leanSway * min(1, |lean| / 30)). */
  leanSway: number;
  /** The tower can teeter and topple. Off: gauge and warnings still run, nothing falls. */
  toppleOn: boolean;
  /** Tilt at the top (world units) where a full-width tower reaches the rail. */
  toppleLimit: number;
  /** A narrow top lowers the rail: limit * (1 - thinTippy * (1 - width / 60)). */
  thinTippy: number;
  /** Game-seconds an ARMED tower must stay past the rail before it topples. */
  teeterTime: number;
  /** Clock scale while teetering (slow motion). */
  teeterSlowmo: number;
  /** An unarmed tower past the rail hangs for LAST_CHANCE_TIME; the next drop decides. */
  lastChance: boolean;
  /** While calm after a perfect, kick damping rises toward critical by this much. */
  perfectSteady: number;
  /** Fraction of swing velocity a perfect removes instantly (the "catch"). */
  perfectBrace: number;
  /** A perfect rebuilds only once the tower is calm; otherwise it steadies and banks it. */
  regrowNeedsCalm: boolean;
  /** Largest top swing (world units) that counts as calm enough to rebuild. */
  regrowCalm: number;
  /** Telegraphed gusts in the windy height bands. */
  gustsOn: boolean;
  /** Peak lean (world units) a full-strength gust adds at the top. */
  gustPush: number;
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
  leanOn: true,
  leanGain: 2,
  leanSway: 0.5,
  toppleOn: true,
  toppleLimit: 30,
  thinTippy: 0.5,
  teeterTime: 0.6,
  teeterSlowmo: 0.5,
  lastChance: true,
  perfectSteady: 1,
  perfectBrace: 0.5,
  regrowNeedsCalm: true,
  regrowCalm: 2.5,
  gustsOn: true,
  gustPush: 8,
};

export const tuning: Tuning = { ...DEFAULT_TUNING };

export function resetTuning(): void {
  Object.assign(tuning, DEFAULT_TUNING);
}
