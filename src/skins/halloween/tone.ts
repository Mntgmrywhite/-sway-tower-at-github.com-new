import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { FLYER, PALETTE, smooth } from "./common";

// Height tells the story, and loops so a tall tower never runs out of it.
//
// The first pass is the night as it was first drawn: dusk over the town with a rose glow behind
// the mist, deepening into night as you climb (fully dark by level 75), the moon swelling a
// little, the crows gathering to five and the bats coming out. Past it, the hollow and the
// Horseman's hill fade into the mist below.
//
// Then the night goes round, every LOOP_PERIOD levels from LOOP_START, forever: the moonlit night;
// the Sleepy Hollow mist (the sky pales to lavender, the stars and the moon veil over, the bats
// go to roost, banks of fog drift past in the side lanes); the witching hour (a deep indigo sky
// full of stars, the moon burning orange, a ring of bats flitting across its face); and back to
// the moonlit night, which is where the loop started. Everything that changes with height is
// read from here, by the camera's level, so the whole story repeats exactly with the loop.
// Colors are precomputed in half-level steps, so drawing never mixes colors per frame.

/** Where the loop starts and how long it is, in levels. */
export const LOOP_START = 120;
export const LOOP_PERIOD = 120;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** The level whose story shows at `lvl`: itself on the first pass, folded into the loop past it. */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return Math.max(0, lvl);
  return LOOP_START + ((((lvl - LOOP_START) % LOOP_PERIOD) + LOOP_PERIOD) % LOOP_PERIOD);
}

/** Where the first pass's night is complete (the old altitude01 reaching 1: 600 world units). */
const NIGHT_FALLS = 600 / BLOCK_HEIGHT;
/** The hollow and the Horseman fade into the mist between these levels. */
const HOLLOW_FADE = [94, 118] as const;

const NIGHT_INK = "#151640";

/** Everything that changes with height, at one level. */
export interface Tone {
  /** Sky gradient: top, at 60% of the way to the horizon, at the horizon. */
  sky: [string, string, string];
  /** Stars show down to this fraction of the screen height; their brightness 0..1. */
  starsTo: number;
  starGlow: number;
  /** The witching hour's extra stars, 0..1. */
  extraStars: number;
  /** The moon: radius (in u), disc, seas, craters, lit rim, halo rings. */
  moonR: number;
  moon: string;
  moonSea: string;
  moonCrater: string;
  moonRim: string;
  halo: string;
  /** How thickly the mist veils the moon, 0..1. */
  veil: number;
  veilColor: string;
  /** Flyers against the sky: a shade darker than it. */
  flyer: string;
  /** How many of the flock circle the steeple (a fraction fades the last one in). */
  crows: number;
  /** The two bats crossing the sky: opacity. */
  bats: number;
  /** The witching hour's bats around the moon: opacity. */
  ring: number;
  /** The hollow (hill, Horseman, bridge, tree, church): opacity. 1 at the start, 0 in the loop. */
  hollow: number;
}

// ---------------------------------------------------------------- the first pass

/** The first pass's moon, and the flyers deepening with the sky (as first drawn: 9 steps). */
const MOON_CREAM = {
  moon: PALETTE.moon,
  moonSea: mix(PALETTE.moon, "#d8a98a", 0.3),
  moonCrater: mix(PALETTE.moon, "#c8957a", 0.36),
  moonRim: mix(PALETTE.moon, "#ffffff", 0.6),
  halo: alpha("#ffeec8", 0.09),
};
const FLYER_STEPS = Array.from({ length: 9 }, (_, i) => mix(FLYER, "#140f3c", (0.55 * i) / 8));
const MOON_R = 0.125;

/** The mist's veil over the moon. */
const VEIL_COLOR = "#d6cff4";

function firstPass(lvl: number): Tone {
  const a = Math.min(1, lvl / NIGHT_FALLS);
  return {
    sky: [mix(PALETTE.skyTop, NIGHT_INK, a * 0.5), mix(PALETTE.skyMid, NIGHT_INK, a * 0.4), mix(PALETTE.skyBottom, NIGHT_INK, a * 0.3)],
    starsTo: 0.4 + a * 0.5,
    starGlow: 1,
    extraStars: 0,
    moonR: MOON_R + a * 0.02,
    ...MOON_CREAM,
    veil: 0,
    veilColor: VEIL_COLOR,
    flyer: FLYER_STEPS[Math.round(a * 8)]!,
    crows: 3 + Math.floor(a * 2.99),
    bats: a > 0.35 ? 1 : 0,
    ring: 0,
    hollow: 1 - smooth(HOLLOW_FADE[0], HOLLOW_FADE[1], lvl),
  };
}

// ---------------------------------------------------------------- the loop

/** Keyframes [loop fraction, value], eased between; the first and last values match. */
type Keys<T> = readonly (readonly [number, T])[];

function at<T>(keys: Keys<T>, f: number, blend: (a: T, b: T, k: number) => T): T {
  for (let i = 1; i < keys.length; i++) {
    const [fb, b] = keys[i]!;
    if (f > fb) continue;
    const [fa, a] = keys[i - 1]!;
    return blend(a, b, smooth(fa, fb, f));
  }
  return keys[keys.length - 1]![1];
}
const num = (a: number, b: number, k: number) => a + (b - a) * k;
const col = (a: string, b: string, k: number) => mix(a, b, k);

// Where each stage of the loop holds, as fractions of it.
const MIST_IN = 0.1;
const MIST = 0.24;
const MIST_OUT = 0.4;
const WITCHING = 0.54;
const WITCHING_OUT = 0.76;
const NIGHT_AGAIN = 0.9;

const NIGHT = firstPass(NIGHT_FALLS);

/** Hold `night` at both ends and `mist` / `witching` in their stages. */
function stages<T>(night: T, mist: T, witching: T): Keys<T> {
  return [
    [0, night],
    [MIST_IN, night],
    [MIST, mist],
    [MIST_OUT, mist],
    [WITCHING, witching],
    [WITCHING_OUT, witching],
    [NIGHT_AGAIN, night],
    [1, night],
  ];
}

const SKY_TOP = stages(NIGHT.sky[0], "#3d3680", "#1d2470");
const SKY_MID = stages(NIGHT.sky[1], "#6d62ad", "#33399a");
const SKY_LOW = stages(NIGHT.sky[2], "#a99bcd", "#7d4d9e");
const STAR_GLOW = stages(1, 0.18, 1);
const EXTRA_STARS: Keys<number> = [
  [0, 0],
  [MIST_OUT + 0.06, 0],
  [WITCHING, 1],
  [WITCHING_OUT, 1],
  [NIGHT_AGAIN - 0.04, 0],
  [1, 0],
];

const HARVEST = { moon: "#ffb24e", moonSea: "#f2913f", moonCrater: "#e8823a", moonRim: "#ffe3a8", halo: "#ffb24e" };
const MOON_BODY = stages(NIGHT.moon, mix(NIGHT.moon, "#e9e2f6", 0.35), HARVEST.moon);
const MOON_SEA = stages(NIGHT.moonSea, mix(NIGHT.moonSea, "#e9e2f6", 0.35), HARVEST.moonSea);
const MOON_CRATER = stages(NIGHT.moonCrater, mix(NIGHT.moonCrater, "#e9e2f6", 0.35), HARVEST.moonCrater);
const MOON_RIM = stages(NIGHT.moonRim, mix(NIGHT.moonRim, "#e9e2f6", 0.35), HARVEST.moonRim);
const HALO_COLOR = stages("#ffeec8", "#e6e0fa", HARVEST.halo);
const HALO_ALPHA = stages(0.09, 0.13, 0.12);
const VEIL = stages(0, 1, 0);

const FLYER_KEYS = stages(NIGHT.flyer, "#3b3079", "#17123c");
const CROWS = stages(5, 3, 4);
// The crossing bats roost before the ring comes out, and come back only once it has gone.
const BATS: Keys<number> = [
  [0, 1],
  [MIST_IN, 1],
  [MIST, 0],
  [WITCHING_OUT + 0.06, 0],
  [NIGHT_AGAIN, 1],
  [1, 1],
];
const RING: Keys<number> = [
  [0, 0],
  [MIST_OUT, 0],
  [WITCHING, 1],
  [WITCHING_OUT, 1],
  [WITCHING_OUT + 0.06, 0],
  [1, 0],
];
function loopTone(f: number): Tone {
  const haloA = at(HALO_ALPHA, f, num);
  return {
    sky: [at(SKY_TOP, f, col), at(SKY_MID, f, col), at(SKY_LOW, f, col)],
    starsTo: NIGHT.starsTo,
    starGlow: at(STAR_GLOW, f, num),
    extraStars: at(EXTRA_STARS, f, num),
    moonR: NIGHT.moonR,
    moon: at(MOON_BODY, f, col),
    moonSea: at(MOON_SEA, f, col),
    moonCrater: at(MOON_CRATER, f, col),
    moonRim: at(MOON_RIM, f, col),
    halo: alpha(at(HALO_COLOR, f, col), Math.round(haloA * 1000) / 1000),
    veil: at(VEIL, f, num),
    veilColor: VEIL_COLOR,
    flyer: at(FLYER_KEYS, f, col),
    crows: at(CROWS, f, num),
    bats: at(BATS, f, num),
    ring: at(RING, f, num),
    hollow: 0,
  };
}

/** The tone at a story level (see storyLevel). */
export function toneAt(lvl: number): Tone {
  return lvl < LOOP_START ? firstPass(lvl) : loopTone((lvl - LOOP_START) / LOOP_PERIOD);
}

/** Tones in half-level steps, from the ground to the end of the loop (which is its start again). */
export const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_START + LOOP_PERIOD) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** Index of the tone step at a level (for caching things built from a tone). */
export function toneIndexAt(lvl: number): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(storyLevel(lvl) / STEP)));
}

/** The tone at a level, from the precomputed steps. */
export function toneOfLevel(lvl: number): Tone {
  return TONES[toneIndexAt(lvl)]!;
}

/** The tone at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneOfLevel(level(s));
}
