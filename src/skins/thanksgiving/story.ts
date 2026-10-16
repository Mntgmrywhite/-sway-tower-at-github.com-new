import { mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";

// Height tells the story. The first pass is the afternoon the skin was designed as: the base
// sky deepens toward night as you climb (all the way by NIGHT_LEVEL), the sun sets behind the
// hollow at the right and a pale moon rises at the left. Past LOOP_START the day comes round
// again, forever, every LOOP_LEVELS levels: the night holds a while, dawn turns the sky rose,
// the moon goes down at the left and the sun comes up at the right, a clear morning, the warm
// afternoon of the start, and then the same dusk into the same night, where the loop meets
// itself. Everything here is a function of the camera's level alone (no screen size, no time),
// so the loop repeats exactly; the seam sits inside the night, where nothing changes.

/** The base sky's night: what it mixes toward as you climb (src/base/world.ts). */
const NIGHT_INK = "#151640";
/** The base sky reaches its full night at camera altitude 600 (altitude01): in levels. */
export const NIGHT_LEVEL = 600 / BLOCK_HEIGHT;
/**
 * Where the loop starts, in levels: past the first pass's night (the backyard long gone, the sun
 * set, the moon up and every star out on any screen), early in the night that opens the loop.
 */
export const LOOP_START = 90;
/** One whole day, in levels. */
export const LOOP_LEVELS = 120;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** How far through the loop's day a level is (0..1), or -1 in the first pass. */
export function phase(lvl: number): number {
  if (lvl < LOOP_START) return -1;
  const k = (lvl - LOOP_START) / LOOP_LEVELS;
  return k - Math.floor(k);
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 0 below a, 1 above b, eased between. */
export function ease(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** The light at one level. */
export interface Tone {
  /** Sky gradient: top, middle (60% of the way down to the horizon), horizon. */
  sky: readonly [string, string, string];
  /** Stars show down to this fraction of the screen height (the base sky's rule: 0.4 + 0.5 a). */
  stars: number;
}

/** The base sky at night amount `a` (0..1), exactly as src/base/world.ts mixes it. */
function baseSky(a: number): [string, string, string] {
  return [mix(PALETTE.skyTop, NIGHT_INK, a * 0.5), mix(PALETTE.skyMid, NIGHT_INK, a * 0.4), mix(PALETTE.skyBottom, NIGHT_INK, a * 0.3)];
}

interface Key {
  /** Phase through the loop's day. */
  at: number;
  sky: readonly [string, string, string];
  stars: number;
}

/** The first pass's night, where the loop starts and ends: the base sky at its full night. */
const NIGHT: Omit<Key, "at"> = { sky: baseSky(1), stars: 0.9 };
/** The warm afternoon of the start (the base sky a little way up). */
const AFTERNOON = 0.15;

/** The loop's day. The sky's colors blend between keys, eased; the ends are the same night. */
const KEYS: readonly Key[] = [
  { at: 0, ...NIGHT },
  { at: 0.1, ...NIGHT },
  // Dawn: a periwinkle sky going rose, an apricot glow low down.
  { at: 0.24, sky: ["#5868b0", "#e597a8", "#ffc48a"], stars: 0.62 },
  // A clear, cool morning.
  { at: 0.36, sky: ["#5d93e4", "#a9c6ee", "#ffe6b8"], stars: 0.4 },
  // The afternoon of the start, then the first pass's dusk all over again.
  { at: 0.5, sky: baseSky(AFTERNOON), stars: 0.4 + 0.5 * AFTERNOON },
  { at: 0.9, ...NIGHT },
  { at: 1, ...NIGHT },
];

/** The sun fades in low in the right lane and comes up, holds its day spot, and goes down and fades out again. */
const SUN_RISE = [0.16, 0.34] as const;
const SUN_SET = [0.54, 0.72] as const;
/** The moon goes down the left lane at dawn, fading out at the low end of it, and fades in there and comes back up at dusk. */
const MOON_SET = [0.06, 0.24] as const;
const MOON_RISE = [0.66, 0.88] as const;

/** The light at a level (pure: any level, in the first pass too). */
export function toneAt(lvl: number): Tone {
  const p = phase(lvl);
  if (p < 0) {
    const a = Math.min(1, lvl / NIGHT_LEVEL);
    return { sky: baseSky(a), stars: 0.4 + a * 0.5 };
  }
  for (let i = 1; i < KEYS.length; i++) {
    const b = KEYS[i]!;
    if (p > b.at) continue;
    const a = KEYS[i - 1]!;
    const k = ease(a.at, b.at, p);
    return {
      sky: [mix(a.sky[0], b.sky[0], k), mix(a.sky[1], b.sky[1], k), mix(a.sky[2], b.sky[2], k)],
      stars: a.stars + (b.stars - a.stars) * k,
    };
  }
  return { ...NIGHT };
}

/** The loop's tones, precomputed in half-level steps so drawing never mixes colors per frame. */
const STEPS = LOOP_LEVELS * 2;
const TONES: readonly Tone[] = Array.from({ length: STEPS }, (_, i) => toneAt(LOOP_START + i / 2));

/** The light this frame, in the loop (null in the first pass: the base sky draws it). */
export function loopTone(s: Scene): Tone | null {
  const lvl = level(s);
  if (lvl < LOOP_START) return null;
  const i = Math.round((lvl - LOOP_START) * 2) % STEPS;
  return TONES[i]!;
}

/** In the loop: how far up the sun is (0 faded out at the low end of its lane, 1 at its day spot). */
export function sunUp(lvl: number): number {
  const p = phase(lvl);
  if (p < 0) return 0;
  return ease(SUN_RISE[0], SUN_RISE[1], p) * (1 - ease(SUN_SET[0], SUN_SET[1], p));
}

/** In the loop: how far down the moon is (0 high at the top left, 1 faded out at the low end of its lane). */
export function moonDown(lvl: number): number {
  const p = phase(lvl);
  if (p < 0) return 0;
  return ease(MOON_SET[0], MOON_SET[1], p) * (1 - ease(MOON_RISE[0], MOON_RISE[1], p));
}

/**
 * How far down the screen the sky reaches: the horizon, but in the loop never further than
 * this many screen heights. The horizon sinks forever as you climb; holding the sky's gradient
 * and the falling leaves to a fixed depth once it is well off screen keeps the loop repeating
 * exactly. (At LOOP_START the horizon is still on screen, so this changes nothing there.)
 */
export const SKY_DEPTH = 1.25;

export function skyFloor(s: Scene): number {
  if (level(s) < LOOP_START) return s.horizonY;
  return Math.min(s.horizonY, s.cssH * SKY_DEPTH);
}
