import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { CORAL, CREAM, GRASS, GRASS_SHADE, LEAF, LEAF_SHADE, ROOF, STRATA, SUNNY, TRUNK, WALL } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// bright day over the countryside, a deeper blue up among the clouds and islands, the
// afternoon warming low in the sky, a warm sunset, dusk with the first stars and lit windows,
// a calm starry night with lanterns, then the aurora, the first light, a pink dawn as the sun
// comes back up out of the cloud sea, a fresh morning, and the high day again: from DAY_HIGH
// on, the story loops every LOOP levels, so a tower can climb forever and the sky keeps
// turning. Every color and weight that changes with the light is worked out here once per
// quarter-level step of the story and kept, so drawing never mixes colors per frame.

/** Where each stage of the light peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 46;
const SUNSET = 62;
const DUSK = 78;
const NIGHT = 96;
const DEEP_NIGHT = 112;
const PREDAWN = 126;
const DAWN = 140;
const MORNING = 150;

/** The story loops from LOOP_FROM on: the light at level L + LOOP is the light at L. */
export const LOOP_FROM = DAY_HIGH;
/** One turn of the sky, levels: the high day, sunset, night, dawn, and the high day again. */
export const LOOP = 128;

/**
 * From this level on the whole scene repeats every LOOP levels on a phone, not just the light:
 * the home island, the countryside and the first pass's drifters have left the view, and the
 * cloud sea has settled on its floor (see far.ts and drift.ts).
 */
export const SCENE_LOOP_FROM = 104;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** Where a level falls in the story: itself on the first pass, then wrapped into [LOOP_FROM, LOOP_FROM + LOOP). */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_FROM) return lvl;
  return LOOP_FROM + ((((lvl - LOOP_FROM) % LOOP) + LOOP) % LOOP);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between. */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** 0 outside [a, d], 1 inside [b, c], eased in between. */
function span(a: number, b: number, c: number, d: number, x: number): number {
  return smooth(a, b, x) * (1 - smooth(c, d, x));
}

/** The light at one stage. */
interface Key {
  at: number;
  /** Sky gradient: top, middle, the glow band low in the sky, and the bottom. */
  sky: [string, string, string, string];
  /** Clouds: shaded underside, body, lit caps. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** Faded silhouettes on the horizon. */
  far: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#161c4e";

const DAY_HIGH_KEY: Omit<Key, "at"> = {
  sky: ["#3a80e2", "#5aa6ee", "#9fd2f8", "#c0e4fa"],
  cloud: ["#bfd3f0", "#f4f9ff", "#ffffff"],
  haze: "#a8d4f6",
  far: "#94bfe4",
  dark: 0,
};

const KEYS: Key[] = [
  {
    at: 0,
    sky: ["#3f8fe8", "#66b2f2", "#a9dafa", "#c8ebfc"],
    cloud: ["#c3d8f2", "#f4f9ff", "#ffffff"],
    haze: "#b4def8",
    far: "#9cc8e8",
    dark: 0,
  },
  { at: DAY_HIGH, ...DAY_HIGH_KEY },
  {
    at: AFTERNOON,
    sky: ["#3b7cdc", "#5fa2ea", "#a8d0f0", "#e6dcc4"],
    cloud: ["#c4cfe8", "#f8f8fc", "#ffffff"],
    haze: "#b0cdec",
    far: "#9ab8dc",
    dark: 0.02,
  },
  {
    at: SUNSET,
    sky: ["#5a6cd2", "#b07cc4", "#ff9f7e", "#ffcf86"],
    cloud: ["#e59aa6", "#ffe0d0", "#fff4e6"],
    haze: "#f2a9a0",
    far: "#c98aa8",
    dark: 0.12,
  },
  {
    at: DUSK,
    sky: ["#252c74", "#47409a", "#9a62a6", "#e08890"],
    cloud: ["#7a68ae", "#b6a0d8", "#dccaf2"],
    haze: "#8a6aae",
    far: "#5e5298",
    dark: 0.38,
  },
  {
    at: NIGHT,
    sky: ["#121848", "#18225e", "#223074", "#2e4088"],
    cloud: ["#36428a", "#56649f", "#7886c4"],
    haze: "#2a3878",
    far: "#27306c",
    dark: 0.55,
  },
  {
    // The aurora's hour: a touch deeper, with a teal cast low in the sky.
    at: DEEP_NIGHT,
    sky: ["#0f1542", "#152058", "#1b316e", "#24467e"],
    cloud: ["#323f86", "#4f5f9c", "#7287c2"],
    haze: "#263873",
    far: "#222c66",
    dark: 0.58,
  },
  {
    // First light: violet up high, a rose band over the cloud sea.
    at: PREDAWN,
    sky: ["#1f2864", "#3a3c88", "#76609e", "#c98096"],
    cloud: ["#5e5c9c", "#9d90c8", "#d2c2e8"],
    haze: "#7469a6",
    far: "#524b8e",
    dark: 0.36,
  },
  {
    // Dawn: the sun comes up out of the cloud sea, everything pink and peach.
    at: DAWN,
    sky: ["#4d70cc", "#a08ece", "#ffac8c", "#ffdaa2"],
    cloud: ["#e2a2b4", "#ffe4dc", "#fff7ee"],
    haze: "#ecb4b6",
    far: "#b99cbc",
    dark: 0.08,
  },
  {
    // A fresh morning: clear blue with a pale gold haze low down.
    at: MORNING,
    sky: ["#4188e2", "#6cb0f0", "#bce0f6", "#ecedd4"],
    cloud: ["#c6d6ee", "#f8fafe", "#ffffff"],
    haze: "#b4d8f2",
    far: "#9cc2e4",
    dark: 0,
  },
  // ...and the high day again, where the loop began.
  { at: LOOP_FROM + LOOP, ...DAY_HIGH_KEY },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  far: string;
  /** What distance fades toward. */
  haze: string;
  /** The countryside far below (the first pass only): see far.ts. */
  mountain: string;
  mountainShade: string;
  snow: string;
  hillFar: string;
  hillNear: string;
  fields: [string, string, string, string, string];
  hedge: string;
  river: string;
  riverLight: string;
  /** Treetops down on the meadow. */
  grove: string;
  groveShade: string;
  /** Tiny houses far below: walls and roofs. */
  village: string;
  villageRoof: string;
  /** Far balloons over the village. */
  farBalloon: string;
  /** Mid-distance islands: grass, grass shade, strata, roots and trees. */
  isleGrass: string;
  isleGrassShade: string;
  isleBands: [string, string, string];
  isleBandsLit: [string, string, string];
  isleLeaf: string;
  isleLeafShade: string;
  isleTrunk: string;
  /** Little buildings on the mid islands: walls (lit and shaded), roofs (lit and shaded). */
  wall: string;
  wallShade: string;
  roof: string;
  roofShade: string;
  /** The far islands on the cloud sea: a fainter set of the same. */
  farGrass: string;
  farLeaf: string;
  farBands: [string, string];
  farWall: string;
  farRoof: string;
  /** How much the far islands show (they come out of the haze as the cloud sea gathers). */
  farIsles: number;
  /** The balloon's two gore colors and its basket. */
  balloonA: string;
  balloonB: string;
  basket: string;
  /** Mid-distance accents for balloons and the airship (warm, cool, cream). */
  accentWarm: string;
  accentCool: string;
  accentCream: string;
  /** Birds far off: a shade darker than the sky. */
  bird: string;
  /** Stars and moon fade in at dusk and out at dawn. */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, flat halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  /** The sun's light as a flat color (its path on the cloud sea). */
  sunGlow: string;
  /** Windows and lamps lit (dusk to dawn) and their color. */
  lit: number;
  window: string;
  /** Sky lanterns: only while the sun is down. */
  lanterns: number;
  /** The aurora, in the deep of the night. */
  aurora: number;
  /** Shooting stars. */
  meteors: number;
  /** The morning star, low over the cloud sea before dawn. */
  dawnStar: number;
  /** Rainbows in the waterfalls' mist: only in full daylight. */
  rainbow: number;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night. */
function fade(c: string, k: Key, amount: number): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark);
}

function blendKeys(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    sky: [m(a.sky[0], b.sky[0]), m(a.sky[1], b.sky[1]), m(a.sky[2], b.sky[2]), m(a.sky[3], b.sky[3])],
    cloud: [m(a.cloud[0], b.cloud[0]), m(a.cloud[1], b.cloud[1]), m(a.cloud[2], b.cloud[2])],
    haze: m(a.haze, b.haze),
    far: m(a.far, b.far),
    dark: a.dark + (b.dark - a.dark) * t,
  };
}

function keyAt(lvl: number): Key {
  const last = KEYS[KEYS.length - 1]!;
  if (lvl >= last.at) return last;
  for (let i = 1; i < KEYS.length; i++) {
    const b = KEYS[i]!;
    if (lvl > b.at) continue;
    const a = KEYS[i - 1]!;
    return blendKeys(a, b, smooth(a.at, b.at, lvl));
  }
  return KEYS[0]!;
}

/** The sun sinks into the cloud sea at sunset and comes back up out of it at dawn. */
function sunSet(m: number): number {
  return m < NIGHT ? smooth(SUNSET - 4, DUSK - 4, m) : 1 - smooth(DAWN - 6, DAWN + 8, m);
}

/** How warm the sun is: 0 by day, 1 low and orange at sunset and sunrise. */
function sunWarm(m: number): number {
  return m < NIGHT ? smooth(AFTERNOON - 6, SUNSET + 4, m) : 1 - smooth(DAWN + 2, MORNING + 4, m);
}

/** The light at a story level (see storyLevel). */
function toneAt(m: number): Tone {
  const k = keyAt(m);
  const isle = 0.42;
  const far = 0.66;
  const warm = sunWarm(m);
  const lit = span(SUNSET + 4, DUSK, DAWN - 4, DAWN + 6, m);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    far: k.far,
    haze: k.haze,
    mountain: mix("#8fb8e0", k.haze, 0.35),
    mountainShade: mix("#7ea6d4", k.haze, 0.3),
    snow: mix("#f4faff", k.haze, 0.25),
    hillFar: mix("#a4cfa0", k.haze, 0.5),
    hillNear: mix("#98d07e", k.haze, 0.36),
    fields: [
      mix("#b2df8a", k.haze, 0.3),
      mix("#a2d47e", k.haze, 0.3),
      mix("#e6d98a", k.haze, 0.34),
      mix("#c4e49c", k.haze, 0.3),
      mix("#d4e6a0", k.haze, 0.32),
    ],
    hedge: mix("#7cbc6c", k.haze, 0.3),
    river: mix("#7cc4ee", k.haze, 0.2),
    riverLight: mix("#e8f8ff", k.haze, 0.15),
    grove: mix("#6cbf62", k.haze, 0.3),
    groveShade: mix("#56a858", k.haze, 0.3),
    village: mix(WALL, k.haze, 0.3),
    villageRoof: mix(ROOF, k.haze, 0.3),
    farBalloon: mix(SUNNY, k.haze, 0.3),
    isleGrass: fade(GRASS, k, isle),
    isleGrassShade: fade(GRASS_SHADE, k, isle),
    isleBands: [fade(STRATA[0].body, k, isle), fade(STRATA[1].body, k, isle), fade(STRATA[4].body, k, isle)],
    isleBandsLit: [fade(STRATA[0].lit, k, isle), fade(STRATA[1].lit, k, isle), fade(STRATA[4].lit, k, isle)],
    isleLeaf: fade(LEAF, k, isle),
    isleLeafShade: fade(LEAF_SHADE, k, isle),
    isleTrunk: fade(TRUNK, k, isle),
    wall: fade(WALL, k, 0.3),
    wallShade: fade(mix(WALL, "#c9a98a", 0.6), k, 0.3),
    roof: fade(ROOF, k, 0.32),
    roofShade: fade(mix(ROOF, "#7a2c3a", 0.35), k, 0.32),
    farGrass: fade(GRASS_SHADE, k, far),
    farLeaf: fade(GRASS, k, far),
    farBands: [fade(STRATA[0].body, k, far), fade(STRATA[4].body, k, far)],
    farWall: fade(WALL, k, 0.55),
    farRoof: fade(ROOF, k, 0.58),
    farIsles: smooth(26, LOOP_FROM, m),
    balloonA: fade(CORAL, k, 0.3),
    balloonB: fade(CREAM, k, 0.3),
    basket: fade(SUNNY, k, 0.45),
    accentWarm: fade(SUNNY, k, 0.3),
    accentCool: fade("#4f86f0", k, 0.3),
    accentCream: fade(CREAM, k, 0.3),
    bird: mix(k.sky[1], "#1a2050", 0.45),
    stars: span(DUSK - 8, NIGHT - 4, PREDAWN + 2, DAWN - 2, m),
    moon: span(DUSK - 3, NIGHT - 6, PREDAWN + 2, DAWN - 4, m),
    sunSet: sunSet(m),
    sunBody: mix("#ffd94a", "#ff9a52", warm),
    sunShade: mix("#ffbd36", "#f4703f", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.32),
    sunGlow: mix("#fff6c0", "#ffb48a", warm),
    lit,
    window: mix(fade("#c8b48a", k, 0.3), "#ffd86a", lit),
    lanterns: span(DUSK - 2, NIGHT - 8, PREDAWN - 4, PREDAWN + 4, m),
    aurora: span(NIGHT + 2, DEEP_NIGHT - 4, DEEP_NIGHT + 8, PREDAWN + 2, m),
    meteors: span(NIGHT - 4, NIGHT + 4, PREDAWN - 2, PREDAWN + 4, m),
    dawnStar: span(PREDAWN - 6, PREDAWN + 2, DAWN - 6, DAWN, m),
    rainbow: m < NIGHT ? 1 - smooth(AFTERNOON + 4, SUNSET - 2, m) : smooth(DAWN + 4, MORNING + 2, m),
  };
}

/**
 * Tones in quarter-level steps over the first pass and one turn of the loop, each worked out
 * the first time it is needed. Steps this fine keep the quickest change of the light (the
 * deep night turning to first light) to a few shades a step, so the sky never visibly ticks.
 */
const STEP = 0.25;
const FIRST = LOOP_FROM / STEP;
const TURN = LOOP / STEP;
const TONES: (Tone | undefined)[] = [];

function toneStep(i: number): Tone {
  return (TONES[i] ??= toneAt(i * STEP));
}

/** Index of the tone step for a level (the loop wraps it). */
function stepOf(lvl: number): number {
  const i = Math.max(0, Math.round(lvl / STEP));
  return i < FIRST ? i : FIRST + ((i - FIRST) % TURN);
}

/** The light at a level. */
export function toneAtLevel(lvl: number): Tone {
  return toneStep(stepOf(lvl));
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneStep(stepOf(level(s)));
}

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return stepOf(level(s));
}
