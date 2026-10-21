import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import {
  AQUA,
  CREAM,
  FAR,
  FAR_BACK,
  FAR_BACK_SNOW,
  FAR_LIGHT,
  FAR_SNOW,
  FIR,
  FOG,
  MUSTARD,
  NAVY,
  NIGHT_GLOW,
  NIGHT_LOW,
  NIGHT_MID,
  NIGHT_TOP,
  NIGHT_TURN,
  ROSE,
  SKY_GLOW,
  SKY_LOW,
  SKY_MID,
  SKY_TOP,
  SKY_TURN,
  SNOW,
  SNOW_SHADE,
  TEAL,
  TEAL_DEEP,
  WHITE,
} from "./colors";

// Height tells the story, and the story loops. The first pass is the street at dusk on
// Christmas Eve, climbing into the night (the teal deepens to slate navy as you go). Past
// LOOP_START the night turns on, forever, through the rest of Dickens' story: the darkness
// lifting, Christmas morning ("no fog, no mist; clear, bright, jovial, stirring, cold"; a golden
// sky, the snow stopped), a bright winter day, the afternoon warming, dusk as rosy as the
// street's, and night again, which is where the loop began. Every turn of the loop is the same:
// everything that changes with height reads `storyLevel`, never the raw level. Colors are
// precomputed here in quarter-level steps, so drawing never mixes colors per frame.

/** Where the loop starts, in levels: night has fully fallen (NIGHTFALL) and the street is long gone. */
export const LOOP_START = 90;
/** One turn of the loop, in levels: night, morning, day, dusk and night again. */
export const LOOP_PERIOD = 120;
/** Tones are precomputed in steps of this many levels (fine enough that the sky never visibly steps). */
export const STEP = 0.25;
/** By this level of the first pass the dusk has deepened into the night. */
export const NIGHTFALL = 75;

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

// ---------------------------------------------------------------- the sky's print

/**
 * The sky is printed in flat bands, as on a 1950s card: where each band starts, as a fraction of
 * the way down from the top of the screen to the horizon (sky.ts), thinner toward the glow. The
 * last band runs on down behind the land.
 */
export const BANDS = [0, 0.3, 0.5, 0.64, 0.75, 0.84, 0.91] as const;

/**
 * A sky: its five inks from the top down to the glow on the horizon. The bands are those inks
 * and a half-tone between the first two and between the last two, so neighbouring bands are
 * always clean colors (never the grey halfway between a teal and a pink).
 */
type Sky = readonly [string, string, string, string, string];

function bandColors(sky: Sky): string[] {
  return [sky[0], mix(sky[0], sky[1], 0.5), sky[1], sky[2], sky[3], mix(sky[3], sky[4], 0.5), sky[4]];
}

// ---------------------------------------------------------------- the land's rows

/**
 * The snowy hills between the street and the city, near to far: each row's depth on the field
 * (z, as base/world.ts's fieldY; the tower stands at 3) and how far it fades into the haze.
 */
export const HILL_ROWS = [
  { z: 4.6, haze: 0 },
  { z: 7, haze: 0.08 },
  { z: 11, haze: 0.16 },
  { z: 17, haze: 0.24 },
  { z: 27, haze: 0.32 },
  { z: 45, haze: 0.4 },
  { z: 75, haze: 0.48 },
  { z: 130, haze: 0.56 },
  { z: 230, haze: 0.64 },
] as const;

// ---------------------------------------------------------------- the light

/** One stage of the light in the loop, `at` levels past LOOP_START. */
interface Key {
  at: number;
  sky: Sky;
  /** The small dot stars and the big atomic starbursts. */
  stars: number;
  sparkles: number;
  /** Snowfall: 1 as on the street, 0 clear. */
  snow: number;
  /** How far the skyline and the pigeons have turned from dusk colors to daylight. */
  day: number;
  /** How dark the night lies on the snow (1 deep night, 0 dusk or day). */
  night: number;
}

const DUSK_SKY: Sky = [SKY_TOP, SKY_MID, SKY_TURN, SKY_LOW, SKY_GLOW];
const NIGHT_SKY: Sky = [NIGHT_TOP, NIGHT_MID, NIGHT_TURN, NIGHT_LOW, NIGHT_GLOW];
const DAY_SKY: Sky = [mix(TEAL, AQUA, 0.35), mix(TEAL, AQUA, 0.62), AQUA, mix(AQUA, SNOW, 0.4), mix(AQUA, SNOW, 0.68)];

const NIGHT: Omit<Key, "at"> = { sky: NIGHT_SKY, stars: 1, sparkles: 1, snow: 1, day: 0, night: 1 };

const KEYS: Key[] = [
  { at: 0, ...NIGHT },
  { at: 16, ...NIGHT },
  // The darkness lifting: teal coming back, a rose glow low down, the snow easing.
  {
    at: 30,
    sky: [mix(NAVY, TEAL_DEEP, 0.6), TEAL_DEEP, mix(TEAL_DEEP, TEAL, 0.6), mix(ROSE, TEAL, 0.15), ROSE],
    stars: 0.4,
    sparkles: 0.2,
    snow: 0.5,
    day: 0.15,
    night: 0.55,
  },
  // Christmas morning: the sky turns gold, the snow has stopped.
  {
    at: 40,
    sky: [mix(TEAL, TEAL_DEEP, 0.3), TEAL, mix(TEAL, AQUA, 0.5), mix(ROSE, MUSTARD, 0.45), mix(MUSTARD, CREAM, 0.35)],
    stars: 0,
    sparkles: 0,
    snow: 0,
    day: 0.55,
    night: 0.1,
  },
  {
    at: 52,
    sky: [mix(TEAL, AQUA, 0.25), mix(TEAL, AQUA, 0.55), AQUA, mix(CREAM, MUSTARD, 0.3), mix(CREAM, MUSTARD, 0.15)],
    stars: 0,
    sparkles: 0,
    snow: 0,
    day: 0.9,
    night: 0,
  },
  // A bright, clear winter day.
  { at: 62, sky: DAY_SKY, stars: 0, sparkles: 0, snow: 0, day: 1, night: 0 },
  { at: 74, sky: DAY_SKY, stars: 0, sparkles: 0, snow: 0, day: 1, night: 0 },
  // The afternoon warming, a few flakes again.
  {
    at: 86,
    sky: [mix(TEAL, AQUA, 0.22), mix(TEAL, AQUA, 0.48), mix(AQUA, ROSE, 0.35), mix(ROSE, CREAM, 0.25), mix(CREAM, ROSE, 0.4)],
    stars: 0,
    sparkles: 0,
    snow: 0.35,
    day: 0.7,
    night: 0,
  },
  // Dusk as on the street: the skin's own sky, the moon up, the first stars, snowing.
  { at: 98, sky: DUSK_SKY, stars: 0.5, sparkles: 0, snow: 1, day: 0, night: 0 },
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
/** The sun's body and its rays: pale, then warm. */
const SUN_BODY = [mix(CREAM, MUSTARD, 0.3), MUSTARD] as const;
const SUN_SHADE = [mix(MUSTARD, CREAM, 0.25), mix(MUSTARD, ROSE, 0.5)] as const;

/** Snow under the night: moonlit teal, its shade deeper, and the firs on it. */
const SNOW_NIGHT = mix(TEAL, SNOW, 0.3);
const SNOW_NIGHT_SHADE = mix(TEAL_DEEP, AQUA, 0.3);
const FIR_NIGHT = mix(TEAL_DEEP, NAVY, 0.25);
/** The back row's windows are a little fainter than the landmarks' lights. */
const WINDOW_ALPHA = 0.7;
/** The skyline under the night: deeper, nearer the sky's own color. */
const FAR_NIGHT = mix(NAVY, TEAL_DEEP, 0.55);
/** Faded daylight colors for the skyline and the pigeons. */
const FAR_DAY = mix(TEAL, AQUA, 0.45);
const FLYER = mix(FAR, SKY_TOP, 0.35);
/**
 * The pigeons by day. They cross at the height of the tower's top, so against the bright sky they
 * stand out no more than they do at dusk on the street.
 */
const FLYER_DAY = mix(TEAL, AQUA, 0.3);
/** Up the climb the pigeons fly (37% down the screen) across the sky's second band. */
const FLOCK_BAND = 1;

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
function flockGlow(sky: Sky): number {
  return luminance(bandColors(sky)[FLOCK_BAND]!);
}
const NIGHT_FLOCK = flockGlow(NIGHT_SKY);
const DAY_FLOCK = flockGlow(DAY_SKY);

/** Everything that changes with the light, at one level of the story. */
export interface Tone {
  /** The sky's five inks, top down to the glow on the horizon. */
  sky: Sky;
  /** The sky's flat bands, top down (BANDS). */
  bands: readonly string[];
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
  /** The strips of fog across the city's feet. */
  fog: string;
  /** The street's snow under this light. */
  street: string;
  /** Each row of snowy hills (HILL_ROWS, near to far: shaded and lit by turns), the firs on it and the snow on their tips. */
  hills: readonly string[];
  firs: readonly string[];
  caps: readonly string[];
  /** The pigeon flock against the sky. */
  flyer: string;
  /** The sun's body, and its rays. */
  sunBody: string;
  sunShade: string;
}

function blend(a: Omit<Key, "at">, b: Omit<Key, "at">, t: number): Omit<Key, "at"> {
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    sky: [mix(a.sky[0], b.sky[0], t), mix(a.sky[1], b.sky[1], t), mix(a.sky[2], b.sky[2], t), mix(a.sky[3], b.sky[3], t), mix(a.sky[4], b.sky[4], t)],
    stars: n(a.stars, b.stars),
    sparkles: n(a.sparkles, b.sparkles),
    snow: n(a.snow, b.snow),
    day: n(a.day, b.day),
    night: n(a.night, b.night),
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

/** The street at dusk, as the first pass starts. */
const DUSK: Omit<Key, "at"> = { sky: DUSK_SKY, stars: 1, sparkles: 0, snow: 1, day: 0, night: 0 };

/** The first pass: the dusk deepening into the night as you climb, snowing all the way. */
function firstPass(lvl: number): Omit<Key, "at"> {
  const k = blend(DUSK, NIGHT, smooth(0, NIGHTFALL, lvl));
  // The big stars come out as the night falls.
  k.sparkles = clamp01((lvl / NIGHTFALL - 0.2) / 0.5);
  return k;
}

/** The light of a stage, worked out into everything the layers paint. */
function toneOfKey(k: Omit<Key, "at">, p: number): Tone {
  const farDay = mix(FAR_DAY, k.sky[2], 0.15);
  // At night the skyline sinks toward the night; by day the windows are dark and the belfry is
  // just a gap in the stone.
  const farDusk = mix(FAR, FAR_NIGHT, k.night);
  const farLight = mix(FAR_LIGHT, mix(farDay, WHITE, 0.3), k.day);
  const warm = clamp01(1 - smooth(SUN_PALE[0], SUN_PALE[1], p) + smooth(SUN_WARM[0], SUN_WARM[1], p));
  // Snow under this light: lit by the glow low in the sky, bluer and darker as the night lies on it.
  const glow = k.sky[4];
  const lit = mix(mix(SNOW, glow, 0.2), SNOW_NIGHT, k.night);
  const shade = mix(mix(SNOW_SHADE, glow, 0.12), SNOW_NIGHT_SHADE, k.night);
  const fir = mix(mix(FIR, glow, 0.1), FIR_NIGHT, k.night);
  const hills = HILL_ROWS.map((r, i) => mix(i % 2 ? lit : shade, glow, r.haze));
  return {
    sky: k.sky,
    bands: bandColors(k.sky),
    stars: k.stars,
    sparkles: k.sparkles,
    snow: k.snow,
    far: mix(farDusk, farDay, k.day),
    farBack: mix(mix(FAR_BACK, mix(FAR_NIGHT, glow, 0.35), k.night), mix(farDay, glow, 0.35), k.day),
    farLight,
    farWindow: alpha(farLight, WINDOW_ALPHA),
    farSnow: mix(mix(FAR_SNOW, mix(FAR_NIGHT, SNOW, 0.35), k.night), mix(farDay, WHITE, 0.55), k.day),
    farBackSnow: mix(mix(FAR_BACK_SNOW, mix(FAR_NIGHT, glow, 0.5), k.night), mix(farDay, WHITE, 0.45), k.day),
    fog: alpha(mix(mix(FOG, glow, 0.3), NIGHT_MID, 0.45 * k.night), 0.42),
    street: lit,
    hills,
    firs: HILL_ROWS.map((r, i) => mix(fir, hills[i]!, 0.15 + r.haze)),
    caps: HILL_ROWS.map((r) => mix(lit, glow, r.haze)),
    // The pigeons follow the sky's brightness where they fly rather than the skyline's daylight,
    // which lags the dawn: so they never stand out more than they do by day.
    flyer: mix(FLYER, FLYER_DAY, clamp01((flockGlow(k.sky) - NIGHT_FLOCK) / (DAY_FLOCK - NIGHT_FLOCK))),
    sunBody: mix(SUN_BODY[0], SUN_BODY[1], warm),
    sunShade: mix(SUN_SHADE[0], SUN_SHADE[1], warm),
  };
}

/** Tones in steps of STEP levels, from the ground to the end of the first turn of the loop. */
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_START + LOOP_PERIOD) / STEP) + 1 }, (_, i) => {
  const lvl = i * STEP;
  // No sun on the first pass: its colors are those it rises with (p = 0).
  return lvl < LOOP_START ? toneOfKey(firstPass(lvl), 0) : toneOfKey(keyAt(lvl - LOOP_START), lvl - LOOP_START);
});

/** The tone at a level (any height: past LOOP_START it repeats every LOOP_PERIOD). */
export function toneAt(lvl: number): Tone {
  return TONES[toneIndexAt(lvl)]!;
}

/** Index of the tone step at a level. */
function toneIndexAt(lvl: number): number {
  const i = Math.round(storyLevel(Math.max(0, lvl)) / STEP);
  return Math.min(TONES.length - 1, i);
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneAt(level(s));
}

/** The street's own dusk sky, which the loop's dusk comes back to. */
export const STREET_SKY = DUSK_SKY;

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
