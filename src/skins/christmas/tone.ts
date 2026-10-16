import { alpha, mix } from "../../base/draw";
import { horizonFor } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { FAR, FAR_BACK, FAR_BACK_SNOW, FAR_LIGHT, FAR_SNOW, SKY_BOTTOM, SKY_MID, SKY_TOP } from "./colors";

// Height tells the story, and the story loops. The first pass is the street at dusk on
// Christmas Eve, climbing into the night (the base sky deepens as you go). Past LOOP_START the
// night turns on, forever, through the rest of Dickens' story: the darkness lifting, Christmas
// morning ("no fog, no mist; clear, bright, jovial, stirring, cold"; golden sunlight, the
// snow stopped), a bright winter day, the afternoon warming, dusk as rosy as the street's, and
// night again, which is where the loop began. Every turn of the loop is the same: everything
// that changes with height reads `storyLevel`, never the raw level. Colors are precomputed
// here in quarter-level steps, so drawing never mixes colors per frame.

/** Where the loop starts, in levels: night has fully fallen (75) and the street is long gone. */
export const LOOP_START = 90;
/** One turn of the loop, in levels: night, morning, day, dusk and night again. */
export const LOOP_PERIOD = 120;
/** Tones are precomputed in steps of this many levels (fine enough that the sky never visibly steps). */
export const STEP = 0.25;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** Where a level falls in the story: as it is on the first pass, folded into the loop past LOOP_START. */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return lvl;
  return LOOP_START + ((lvl - LOOP_START) % LOOP_PERIOD);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between (flat at both ends, so nothing jumps). */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

// ---------------------------------------------------------------- the light

/** The base world's night color, which its sky deepens toward as you climb (src/base/world.ts). */
const BASE_NIGHT = "#151640";
/** How far the base sky has sunk toward BASE_NIGHT at the top, middle and bottom once night has fallen. */
const BASE_NIGHT_MIX = [0.5, 0.4, 0.3] as const;
/** Altitude (world units) at which the base sky is fully night (altitude01 = 1). */
const BASE_NIGHT_ALTITUDE = 600;

/** The base sky's three colors (top, middle, horizon) at a level of the first pass. */
function baseSky(lvl: number): [string, string, string] {
  const a = Math.min(1, (lvl * BLOCK_HEIGHT) / BASE_NIGHT_ALTITUDE);
  return [
    mix(SKY_TOP, BASE_NIGHT, a * BASE_NIGHT_MIX[0]),
    mix(SKY_MID, BASE_NIGHT, a * BASE_NIGHT_MIX[1]),
    mix(SKY_BOTTOM, BASE_NIGHT, a * BASE_NIGHT_MIX[2]),
  ];
}

/** One stage of the light in the loop, `at` levels past LOOP_START. */
interface Key {
  at: number;
  /** Sky: top, middle (60% of the way down to the horizon) and at the horizon. */
  sky: [string, string, string];
  /** The small stars and the big twinkling ones. */
  stars: number;
  sparkles: number;
  /** Snowfall: 1 as on the street, 0 clear. */
  snow: number;
  /** How far the skyline and the pigeons have turned from dusk colors to daylight. */
  day: number;
}

const NIGHT_SKY = baseSky(LOOP_START);
const DUSK_SKY: [string, string, string] = [SKY_TOP, SKY_MID, SKY_BOTTOM];
const DAY_SKY: [string, string, string] = ["#4a82d4", "#8fbbec", "#e4f0fc"];

const NIGHT: Omit<Key, "at"> = { sky: NIGHT_SKY, stars: 1, sparkles: 1, snow: 1, day: 0 };

const KEYS: Key[] = [
  { at: 0, ...NIGHT },
  { at: 16, ...NIGHT },
  // The darkness lifting: deep blue, a rose glow low down, the snow easing.
  { at: 30, sky: ["#2f3f86", "#6670b4", "#d99aa8"], stars: 0.4, sparkles: 0.2, snow: 0.5, day: 0.15 },
  // Christmas morning: the sun comes up gold, the snow has stopped.
  { at: 40, sky: ["#4867b8", "#a29dd8", "#ffc8a0"], stars: 0, sparkles: 0, snow: 0, day: 0.55 },
  { at: 52, sky: ["#4f84d6", "#99c0ee", "#fff0d6"], stars: 0, sparkles: 0, snow: 0, day: 0.9 },
  // A bright, clear winter day.
  { at: 62, sky: DAY_SKY, stars: 0, sparkles: 0, snow: 0, day: 1 },
  { at: 74, sky: DAY_SKY, stars: 0, sparkles: 0, snow: 0, day: 1 },
  // The afternoon warming, a few flakes again.
  { at: 86, sky: ["#4c70c2", "#a6a6dc", "#ffd2b0"], stars: 0, sparkles: 0, snow: 0.35, day: 0.7 },
  // Dusk as on the street: the skin's own sky, the moon up, the first stars, snowing.
  { at: 98, sky: DUSK_SKY, stars: 0.5, sparkles: 0, snow: 1, day: 0 },
  { at: 110, ...NIGHT },
  { at: LOOP_PERIOD, ...NIGHT },
];

/** The moon sets as morning comes and rises again for dusk (levels past LOOP_START). */
const MOONSET = [20, 36] as const;
const MOONRISE = [82, 98] as const;
/** The sun rises on Christmas morning and sets in the late afternoon. */
const SUNRISE = [28, 46] as const;
const SUNSET = [74, 92] as const;
/** The sun is warm gold low down, pale at its height. */
const SUN_PALE = [40, 56] as const;
const SUN_WARM = [70, 86] as const;
/** The sun's body and its rim and rays: pale, then warm. */
const SUN_BODY = ["#fff4c8", "#ffd27a"] as const;
const SUN_SHADE = ["#ffe08a", "#ffa95a"] as const;

/** The back row's windows are a little fainter than the landmarks' lights. */
const WINDOW_ALPHA = 0.7;
/** Faded daylight colors for the skyline and the pigeons. */
const FAR_DAY = "#8b96c6";
const FLYER = mix(FAR, SKY_TOP, 0.3);
/**
 * The pigeons by day. They cross at the height of the tower's top, so against the bright sky they
 * stand out no more than they do at dusk on the street (about 1.5:1).
 */
const FLYER_DAY = "#7a8ac4";
/** Where the pigeons fly (37% down the screen), the sky is about this far from its top color to its middle one. */
const FLOCK_SKY = 0.78;

/** Relative luminance of a #rrggbb color (WCAG). */
function luminance(c: string): number {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** How bright the sky is where the pigeons fly. */
function flockGlow(sky: readonly [string, string, string]): number {
  return luminance(mix(sky[0], sky[1], FLOCK_SKY));
}
const NIGHT_GLOW = flockGlow(NIGHT_SKY);
const DAY_GLOW = flockGlow(DAY_SKY);

/** Everything that changes with the light, at one level of the story. */
export interface Tone {
  /** Whether the skin paints the sky itself (in the loop); on the first pass the base's sky shows. */
  loop: boolean;
  sky: readonly [string, string, string];
  stars: number;
  sparkles: number;
  snow: number;
  /** Skyline silhouettes: front landmarks, the hazy back row, their lights and snow. */
  far: string;
  farBack: string;
  farLight: string;
  /** The back row's lit windows (farLight, a little faded). */
  farWindow: string;
  farSnow: string;
  farBackSnow: string;
  /** The pigeon flock against the sky. */
  flyer: string;
  /** The sun's body, and its rim and rays. */
  sunBody: string;
  sunShade: string;
}

function blend(a: Key, b: Key, t: number): Omit<Key, "at"> {
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    sky: [mix(a.sky[0], b.sky[0], t), mix(a.sky[1], b.sky[1], t), mix(a.sky[2], b.sky[2], t)],
    stars: n(a.stars, b.stars),
    sparkles: n(a.sparkles, b.sparkles),
    snow: n(a.snow, b.snow),
    day: n(a.day, b.day),
  };
}

function keyAt(p: number): Omit<Key, "at"> {
  for (let i = 1; i < KEYS.length; i++) {
    const b = KEYS[i]!;
    if (p > b.at) continue;
    const a = KEYS[i - 1]!;
    return blend(a, b, smooth(a.at, b.at, p));
  }
  return KEYS[KEYS.length - 1]!;
}

/** The first pass: the base sky, the stars coming out as night falls, snow, dusk colors on the skyline. */
function firstPass(lvl: number): Tone {
  const a = Math.min(1, (lvl * BLOCK_HEIGHT) / BASE_NIGHT_ALTITUDE);
  return {
    loop: false,
    sky: baseSky(lvl),
    stars: 1,
    sparkles: clamp01((a - 0.2) / 0.5),
    snow: 1,
    far: FAR,
    farBack: FAR_BACK,
    farLight: FAR_LIGHT,
    farWindow: alpha(FAR_LIGHT, WINDOW_ALPHA),
    farSnow: FAR_SNOW,
    farBackSnow: FAR_BACK_SNOW,
    flyer: FLYER,
    // No sun on the first pass; its colors are those it rises with.
    sunBody: SUN_BODY[1],
    sunShade: SUN_SHADE[1],
  };
}

function loopTone(p: number): Tone {
  const k = keyAt(p);
  const farDay = mix(FAR_DAY, k.sky[2], 0.15);
  // By day the windows are dark and the belfry is just a gap in the stone.
  const farLight = mix(FAR_LIGHT, mix(farDay, "#ffffff", 0.3), k.day);
  const warm = clamp01(1 - smooth(SUN_PALE[0], SUN_PALE[1], p) + smooth(SUN_WARM[0], SUN_WARM[1], p));
  return {
    loop: true,
    sky: k.sky,
    stars: k.stars,
    sparkles: k.sparkles,
    snow: k.snow,
    far: mix(FAR, farDay, k.day),
    farBack: mix(FAR_BACK, mix(farDay, k.sky[2], 0.35), k.day),
    farLight,
    farWindow: alpha(farLight, WINDOW_ALPHA),
    farSnow: mix(FAR_SNOW, mix(farDay, "#ffffff", 0.55), k.day),
    farBackSnow: mix(FAR_BACK_SNOW, mix(farDay, "#ffffff", 0.45), k.day),
    // The pigeons follow the sky's brightness where they fly rather than the skyline's daylight,
    // which lags the dawn: so they never stand out more than they do by day.
    flyer: mix(FLYER, FLYER_DAY, clamp01((flockGlow(k.sky) - NIGHT_GLOW) / (DAY_GLOW - NIGHT_GLOW))),
    sunBody: mix(SUN_BODY[0], SUN_BODY[1], warm),
    sunShade: mix(SUN_SHADE[0], SUN_SHADE[1], warm),
  };
}

/** Tones in steps of STEP levels, from the ground to the end of the first turn of the loop. */
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_START + LOOP_PERIOD) / STEP) + 1 }, (_, i) => {
  const lvl = i * STEP;
  return lvl < LOOP_START ? firstPass(lvl) : loopTone(lvl - LOOP_START);
});

/** The tone at a level (any height: past LOOP_START it repeats every LOOP_PERIOD). */
export function toneAt(lvl: number): Tone {
  return TONES[toneIndexAt(lvl)]!;
}

/** Index of the tone step at a level, for caching things built from a tone. */
export function toneIndexAt(lvl: number): number {
  const i = Math.round(storyLevel(Math.max(0, lvl)) / STEP);
  return Math.min(TONES.length - 1, i);
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneAt(level(s));
}

// ---------------------------------------------------------------- sun and moon

/** How far the moon is up at a story level: 1 at its spot, 0 set below the screen. */
export function moonUp(lvl: number): number {
  const p = storyLevel(lvl) - LOOP_START;
  if (p < 0) return 1;
  return 1 - smooth(MOONSET[0], MOONSET[1], p) + smooth(MOONRISE[0], MOONRISE[1], p);
}

/** How far the sun is up at a story level: 1 at its spot, 0 below the screen (and all the first pass). */
export function sunUp(lvl: number): number {
  const p = storyLevel(lvl) - LOOP_START;
  if (p < 0) return 0;
  return smooth(SUNRISE[0], SUNRISE[1], p) - smooth(SUNSET[0], SUNSET[1], p);
}

/**
 * Screen y where the horizon stood at the loop's start, on this screen. The loop's sky hangs
 * from it, so the sky at LOOP_START is exactly the base's and every turn of the loop is the same.
 */
export function loopHorizon(s: Scene): number {
  const drop = (s.altitude - LOOP_START * BLOCK_HEIGHT) * s.scale;
  return horizonFor(s.groundY - drop, Math.max(0, s.rise - drop), s.u);
}
