import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { CORAL, CREAM, GRASS, GRASS_SHADE, LEAF, LEAF_SHADE, STRATA, SUNNY, TRUNK } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// bright day over the meadow, a deeper blue up among the clouds and islands, the afternoon
// warming low in the sky, a warm sunset, dusk with the first stars, and a calm starry night at
// the top. Every color that changes with
// the light is precomputed here in half-level steps, so drawing never mixes colors per frame.

/** Where each stage of the light peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 46;
const SUNSET = 62;
const DUSK = 78;
const NIGHT = 96;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between. */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
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

const KEYS: Key[] = [
  {
    at: 0,
    sky: ["#3f8fe8", "#66b2f2", "#a9dafa", "#c8ebfc"],
    cloud: ["#c3d8f2", "#f4f9ff", "#ffffff"],
    haze: "#b4def8",
    far: "#9cc8e8",
    dark: 0,
  },
  {
    at: DAY_HIGH,
    sky: ["#3a80e2", "#5aa6ee", "#9fd2f8", "#c0e4fa"],
    cloud: ["#bfd3f0", "#f4f9ff", "#ffffff"],
    haze: "#a8d4f6",
    far: "#94bfe4",
    dark: 0,
  },
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
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  far: string;
  /** The meadow far below: far haze, field, and its shaded lower half. */
  meadowHaze: string;
  meadow: string;
  meadowShade: string;
  /** Treetops down on the meadow. */
  grove: string;
  groveShade: string;
  /** Mid-distance islands: grass, grass shade, strata, roots and trees. */
  isleGrass: string;
  isleGrassShade: string;
  isleBands: [string, string, string];
  isleBandsLit: [string, string, string];
  isleLeaf: string;
  isleLeafShade: string;
  isleTrunk: string;
  /** The balloon's two gore colors and its basket. */
  balloonA: string;
  balloonB: string;
  basket: string;
  /** Birds far off: a shade darker than the sky. */
  bird: string;
  /** Stars and moon fade in at dusk. */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, flat halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
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

/** The sun sinks from its day spot into the clouds between the high day and dusk. */
function sunSet(lvl: number): number {
  return smooth(SUNSET - 4, DUSK - 4, lvl);
}

function toneAt(lvl: number): Tone {
  const k = keyAt(lvl);
  const isle = 0.42;
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    far: k.far,
    meadowHaze: mix("#d6eec4", k.haze, 0.4),
    meadow: mix("#b2e08e", k.haze, 0.2),
    meadowShade: mix("#9bd47c", k.haze, 0.18),
    grove: mix("#6cbf62", k.haze, 0.3),
    groveShade: mix("#56a858", k.haze, 0.3),
    isleGrass: fade(GRASS, k, isle),
    isleGrassShade: fade(GRASS_SHADE, k, isle),
    isleBands: [fade(STRATA[0].body, k, isle), fade(STRATA[1].body, k, isle), fade(STRATA[4].body, k, isle)],
    isleBandsLit: [fade(STRATA[0].lit, k, isle), fade(STRATA[1].lit, k, isle), fade(STRATA[4].lit, k, isle)],
    isleLeaf: fade(LEAF, k, isle),
    isleLeafShade: fade(LEAF_SHADE, k, isle),
    isleTrunk: fade(TRUNK, k, isle),
    balloonA: fade(CORAL, k, 0.3),
    balloonB: fade(CREAM, k, 0.3),
    basket: fade(SUNNY, k, 0.45),
    bird: mix(k.sky[1], "#1a2050", 0.45),
    stars: smooth(DUSK - 8, NIGHT - 4, lvl),
    moon: smooth(DUSK - 3, NIGHT - 6, lvl),
    sunSet: sunSet(lvl),
    sunBody: mix("#ffd94a", "#ff9a52", smooth(AFTERNOON - 6, SUNSET + 4, lvl)),
    sunShade: mix("#ffbd36", "#f4703f", smooth(AFTERNOON - 6, SUNSET + 4, lvl)),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", smooth(AFTERNOON - 6, SUNSET, lvl)), 0.32),
  };
}

/** Tones in half-level steps, from the ground to past nightfall. */
const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.ceil((NIGHT + 8) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  const i = Math.round(level(s) / STEP);
  return TONES[Math.max(0, Math.min(TONES.length - 1, i))]!;
}

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(level(s) / STEP)));
}
