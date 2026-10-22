import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { DUSK_GLOW, FOG, HAZE, HILL, MOON, SKY_LOW, SKY_MID, SKY_TOP, smooth } from "./common";

// Height tells the story, and loops so a tall tower never runs out of it.
//
// The first pass: dusk on Main Street, the last pumpkin ember of the sunset glowing low behind
// the hollow, deepening into night as you climb (fully dark by NIGHTFALL), the moon swelling. The
// town falls away below; the Sleepy Hollow mist gathers and swallows it (MIST_GATHER), so that
// only the crooked mansion on its crag stands out of it, and the hollow and the Horseman's hill
// fade into it (HOLLOW_FADE). The mist then sinks to rest low on the screen (MIST_SETTLED),
// the mansion with it, before the loop begins.
//
// Then the night goes round, every LOOP_PERIOD levels from LOOP_START, forever: the moonlit
// night; the mist (the sky pales to a misty violet, the stars and the moon dim, banks of fog
// drift past in the right lane); the witching hour (a deep indigo sky full of stars, the moon
// burning orange, the mansion's clock striking twelve and its bats pouring out of the belfry);
// and back to the moonlit night, which is where the loop started. Everything that changes with
// height is read from here, by the camera's level, so the whole story repeats exactly with the
// loop. Colors are precomputed in half-level steps, so drawing never mixes colors per frame.

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

/** By this level the dusk has deepened into night. */
export const NIGHTFALL = 75;
/** The mist gathers over the town between these levels... */
export const MIST_GATHER = [10, 44] as const;
/** ...and has sunk to rest low on the screen by this one (before the loop). */
export const MIST_SETTLED = 110;
/** The hollow and the Horseman fade into the mist between these levels. */
export const HOLLOW_FADE = [94, 118] as const;

const NIGHT_SKY = ["#100d30", "#231753", "#3d1f62"] as const;
const NIGHT_GLOW = "#4a2468";

/** Everything that changes with height, at one level. */
export interface Tone {
  /** Sky gradient: top, at 60% of the way down, and on the horizon; then the glow on the horizon. */
  sky: [string, string, string];
  glow: string;
  /** The swirl clouds painted on the sky: a step lighter than it. */
  swirl: string;
  /** How tall the horizon's glow stands (0 none .. 1 dusk), as a fraction of its full height. */
  glowK: number;
  /** Star brightness 0..1, and the witching hour's extra stars. */
  starGlow: number;
  extraStars: number;
  /** The moon: radius (in u), disc, seas, craters, lit rim, halo. */
  moonR: number;
  moon: string;
  moonSea: string;
  moonCrater: string;
  moonRim: string;
  halo: string;
  /** Far silhouettes: the back hills (hazy), the near hill and the crag (dark). */
  haze: string;
  hill: string;
  /** Fog: its color and how thick the fog bands lie (0..1). */
  fog: string;
  fogK: number;
  /** The mist's banks drifting past in the lane (0 none .. 1 thick). */
  banks: number;
  /** Flyers against the sky: a shade darker than it. */
  flyer: string;
  /** How many of the flock circle over the mansion (a fraction fades the last one in). */
  crows: number;
  /** The bats round the mansion's towers, and the witching hour's swarm out of its belfry: opacity. */
  bats: number;
  swarm: number;
  /** The hollow (hill, Horseman, bridge, back hills): opacity. 1 at the start, 0 in the loop. */
  hollow: number;
}

// ---------------------------------------------------------------- the first pass

const MOON_R = 0.145;
const MOON_GROW = 0.02;
const CREAM = {
  moon: MOON,
  moonSea: mix(MOON, "#d9b98a", 0.32),
  moonCrater: mix(MOON, "#c9a07a", 0.38),
  moonRim: mix(MOON, "#ffffff", 0.65),
};

function firstPass(lvl: number): Tone {
  const a = smooth(0, NIGHTFALL, lvl);
  const dusk = 1 - smooth(0, 60, lvl);
  return {
    sky: [mix(SKY_TOP, NIGHT_SKY[0], a), mix(SKY_MID, NIGHT_SKY[1], a), mix(SKY_LOW, NIGHT_SKY[2], a)],
    glow: mix(DUSK_GLOW, NIGHT_GLOW, a),
    swirl: mix(mix(SKY_MID, "#7a5cb8", 0.45), mix(NIGHT_SKY[1], "#4a3a86", 0.6), a),
    glowK: 0.25 + 0.75 * dusk,
    starGlow: 0.55 + 0.45 * a,
    extraStars: 0,
    moonR: MOON_R + MOON_GROW * a,
    ...CREAM,
    halo: alpha("#fff1c8", 0.07 + 0.03 * a),
    haze: mix(HAZE, "#251a4c", a),
    hill: mix(HILL, "#130f2c", a),
    fog: mix(FOG, "#4f4688", a),
    fogK: 0.55 + 0.45 * smooth(20, 80, lvl),
    banks: 0,
    flyer: mix("#1a1238", "#0c0920", a),
    crows: 3 + Math.floor(a * 2.99),
    bats: 0.7 + 0.3 * a,
    swarm: 0,
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
/** The mansion's clock strikes twelve here, in the witching hour. */
export const MIDNIGHT = 0.65;

const NIGHT = firstPass(LOOP_START);

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

const SKY_TOP_K = stages(NIGHT.sky[0], "#2a2660", "#0b0a2a");
const SKY_MID_K = stages(NIGHT.sky[1], "#433b7c", "#1c1450");
const SKY_LOW_K = stages(NIGHT.sky[2], "#6a5f9c", "#4a1a5c");
const GLOW_K = stages(NIGHT.glow, "#8478b0", "#7a2a50");
const GLOW_H = stages(NIGHT.glowK, 0.6, 0.55);
const SWIRL_K = stages(NIGHT.swirl, "#6a62a0", "#3a2470");
const STAR_GLOW = stages(1, 0.2, 1);
const EXTRA_STARS: Keys<number> = [
  [0, 0],
  [MIST_OUT + 0.06, 0],
  [WITCHING, 1],
  [WITCHING_OUT, 1],
  [NIGHT_AGAIN - 0.04, 0],
  [1, 0],
];

const HARVEST = { moon: "#ffaa48", moonSea: "#f08a3a", moonCrater: "#e27a34", moonRim: "#ffe0a0" };
const MISTY = "#d8d2ee";
const MOON_BODY = stages(NIGHT.moon, mix(NIGHT.moon, MISTY, 0.45), HARVEST.moon);
const MOON_SEA = stages(NIGHT.moonSea, mix(NIGHT.moonSea, MISTY, 0.45), HARVEST.moonSea);
const MOON_CRATER = stages(NIGHT.moonCrater, mix(NIGHT.moonCrater, MISTY, 0.45), HARVEST.moonCrater);
const MOON_RIM = stages(NIGHT.moonRim, mix(NIGHT.moonRim, MISTY, 0.45), HARVEST.moonRim);
const HALO_COLOR = stages("#fff1c8", "#e6e0fa", "#ffaa48");
const HALO_ALPHA = stages(0.1, 0.16, 0.13);

const HAZE_K = stages(NIGHT.haze, "#4a4280", "#1e1446");
const HILL_K = stages(NIGHT.hill, "#2a2560", "#0d0a24");
const FOG_K = stages(NIGHT.fog, "#7d72b0", "#3c2c6c");
const FOG_THICK = stages(1, 1, 0.8);
const BANKS = stages(0, 1, 0);
const FLYER_K = stages(NIGHT.flyer, "#2c2560", "#07051a");
const CROWS = stages(5, 3, 4);
// The witching hour's swarm pours out of the belfry once the bats round the towers have roosted.
const BATS: Keys<number> = [
  [0, 1],
  [MIST_IN, 1],
  [MIST, 0.4],
  [MIST_OUT, 0.4],
  [WITCHING - 0.06, 0],
  [WITCHING_OUT + 0.06, 0],
  [NIGHT_AGAIN, 1],
  [1, 1],
];
const SWARM: Keys<number> = [
  [0, 0],
  [MIDNIGHT - 0.04, 0],
  [MIDNIGHT + 0.02, 1],
  [WITCHING_OUT, 1],
  [WITCHING_OUT + 0.06, 0],
  [1, 0],
];

function loopTone(f: number): Tone {
  const haloA = at(HALO_ALPHA, f, num);
  return {
    sky: [at(SKY_TOP_K, f, col), at(SKY_MID_K, f, col), at(SKY_LOW_K, f, col)],
    glow: at(GLOW_K, f, col),
    swirl: at(SWIRL_K, f, col),
    glowK: at(GLOW_H, f, num),
    starGlow: at(STAR_GLOW, f, num),
    extraStars: at(EXTRA_STARS, f, num),
    moonR: NIGHT.moonR,
    moon: at(MOON_BODY, f, col),
    moonSea: at(MOON_SEA, f, col),
    moonCrater: at(MOON_CRATER, f, col),
    moonRim: at(MOON_RIM, f, col),
    halo: alpha(at(HALO_COLOR, f, col), Math.round(haloA * 1000) / 1000),
    haze: at(HAZE_K, f, col),
    hill: at(HILL_K, f, col),
    fog: at(FOG_K, f, col),
    fogK: at(FOG_THICK, f, num),
    banks: at(BANKS, f, num),
    flyer: at(FLYER_K, f, col),
    crows: at(CROWS, f, num),
    bats: at(BATS, f, num),
    swarm: at(SWARM, f, num),
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

// ---------------------------------------------------------------- the mansion's clock

/** The clock reads this many hours (on a 12-hour face) at the start... */
const CLOCK_START = 7;
/** ...and midnight at MIDNIGHT in every turn of the loop: the hour it reads as the loop starts. */
const CLOCK_LOOP = 12 - MIDNIGHT * 12;
/** Hours per level on the first pass, so it reads CLOCK_LOOP (a few hours on) as the loop begins. */
const CLOCK_RATE = (CLOCK_LOOP + 12 - CLOCK_START) / LOOP_START;

/**
 * The time on the mansion's clock at a level, in hours on its 12-hour face (0..12): it runs on as
 * you climb, and every turn of the loop goes once round the face, striking twelve at MIDNIGHT.
 * Continuous at every level, the loop's start included.
 */
export function clockHours(lvl: number): number {
  const h =
    lvl < LOOP_START
      ? CLOCK_START + Math.max(0, lvl) * CLOCK_RATE
      : CLOCK_LOOP + (((lvl - LOOP_START) % LOOP_PERIOD) / LOOP_PERIOD) * 12;
  return ((h % 12) + 12) % 12;
}

/** Fraction of the way through the loop at a level (0 on the first pass). */
export function loopFraction(lvl: number): number {
  return lvl < LOOP_START ? 0 : (((lvl - LOOP_START) % LOOP_PERIOD) + LOOP_PERIOD) % LOOP_PERIOD / LOOP_PERIOD;
}

