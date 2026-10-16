import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { RAINBOW as BANDS } from "./colors";

// Height tells the story: the weather and the light change with the camera's altitude, in
// tower levels. A bright spring morning over the green fields; up into the clouds, where a
// soft spring shower greys the sky and the side clouds let fall a few drops; above it the sun
// breaks through and a rainbow hangs in the lane opposite the sun; then a golden evening as
// the sun sinks into the cloud floor, a rosy dusk, and a calm starry night with a crescent
// moon. Every color that changes with the light is precomputed here in half-level steps, so
// drawing never mixes colors per frame.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const MORNING = 12;
const SHOWER = 27;
const CLEAR = 44;
const GOLDEN = 62;
const DUSK = 80;
const NIGHT = 98;

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
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#141c4c";

const SPRING: Omit<Key, "at"> = {
  sky: ["#4596ea", "#72baf3", "#ade0f9", "#d3f1fb"],
  cloud: ["#c6daf1", "#f5faff", "#ffffff"],
  haze: "#b6e0f6",
  dark: 0,
};

const KEYS: Key[] = [
  { at: 0, ...SPRING },
  { at: MORNING, ...SPRING },
  {
    at: SHOWER,
    sky: ["#7a93bb", "#9cb2cf", "#c0d2e4", "#d8e4ee"],
    cloud: ["#a9b5c8", "#e0e6ee", "#f5f7fa"],
    haze: "#bccada",
    dark: 0.03,
  },
  {
    at: CLEAR,
    sky: ["#3d8fe6", "#68b4f1", "#a8dcf8", "#d0eefa"],
    cloud: ["#c2d6f0", "#f6faff", "#ffffff"],
    haze: "#acd8f4",
    dark: 0,
  },
  {
    at: GOLDEN,
    sky: ["#4c74c6", "#b29ec2", "#ffbf6c", "#ffe0a0"],
    cloud: ["#e6ae8e", "#ffe5c4", "#fff6e2"],
    haze: "#f0c69c",
    dark: 0.08,
  },
  {
    at: DUSK,
    sky: ["#272d76", "#4a3f9a", "#9c64a4", "#e6898a"],
    cloud: ["#7c68ae", "#b8a2d8", "#dccaf2"],
    haze: "#8a6aae",
    dark: 0.38,
  },
  {
    at: NIGHT,
    sky: ["#111848", "#17225e", "#203074", "#2b4088"],
    cloud: ["#36428a", "#56649f", "#7886c4"],
    haze: "#2a3878",
    dark: 0.55,
  },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** Back hills, faded blue-green. */
  hillBack: string;
  /** The front hills' patchwork of fields (three greens), hedgerows and dry-stone walls. */
  fields: [string, string, string];
  hedge: string;
  wall: string;
  /** Far stone: the hilltop round tower, the high cross and the bridge (body, lit side, shade). */
  stone: string;
  stoneLit: string;
  stoneShade: string;
  /** Sheep far off. */
  sheep: string;
  /** The stream. */
  water: string;
  waterLit: string;
  /** The meadow's far band, as it fades with the light. */
  meadowFar: string;
  /** How hard it rains (0 dry, 1 the heart of the shower), and the color of the drops. */
  rain: number;
  drop: string;
  /** How strongly the rainbow shows (0..1), and its bands faded with distance. */
  rainbow: number;
  bands: [string, string, string, string, string, string];
  /** Birds far off. */
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

/** The shower: it starts as you climb into the clouds and has passed by the time you are above them. */
function wetAt(lvl: number): number {
  return smooth(15, 22, lvl) * (1 - smooth(33, 39, lvl));
}

/** The rainbow, opposite the sun once the shower has passed, gone by the golden evening. */
function rainbowAt(lvl: number): number {
  return smooth(35, 41, lvl) * (1 - smooth(54, 60, lvl));
}

const HILL = 0.24;
const FAR = 0.4;

function toneAt(lvl: number): Tone {
  const k = keyAt(lvl);
  const warm = smooth(GOLDEN - 14, GOLDEN + 4, lvl);
  const wet = wetAt(lvl);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    hillBack: fade("#6fb894", k, 0.5),
    fields: [fade("#4cc35e", k, HILL), fade("#8ed762", k, HILL), fade("#2fa653", k, HILL)],
    hedge: fade("#1d7a3e", k, HILL),
    wall: fade("#eeece2", k, HILL),
    stone: fade("#8e97a6", k, FAR),
    stoneLit: fade("#c4cad2", k, FAR),
    stoneShade: fade("#5f6878", k, FAR),
    sheep: fade("#ffffff", k, 0.12),
    water: fade("#3f9be8", k, 0.3),
    waterLit: fade("#b0e0fb", k, 0.3),
    meadowFar: fade("#86d872", k, 0.1),
    rain: wet,
    drop: mix(k.cloud[2], "#9fc4ea", 0.35),
    rainbow: rainbowAt(lvl),
    bands: [fade(BANDS[0], k, 0.22), fade(BANDS[1], k, 0.22), fade(BANDS[2], k, 0.22), fade(BANDS[3], k, 0.22), fade(BANDS[4], k, 0.22), fade(BANDS[5], k, 0.22)],
    bird: mix(k.sky[1], "#1a2050", 0.5),
    stars: smooth(DUSK - 8, NIGHT - 4, lvl),
    moon: smooth(DUSK - 3, NIGHT - 6, lvl),
    sunSet: smooth(GOLDEN - 4, DUSK - 4, lvl),
    // In the shower the sun pales behind thin cloud; in the evening it warms to amber.
    sunBody: mix(mix("#ffd94a", "#ff9a52", warm), "#fff4d6", wet * 0.5),
    sunShade: mix(mix("#ffbd36", "#f4703f", warm), "#f2e2c0", wet * 0.5),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.32 * (1 - wet * 0.6)),
  };
}

/** Tones in half-level steps, from the ground to past nightfall. */
const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.ceil((NIGHT + 8) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(level(s) / STEP)));
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return TONES[toneIndex(s)]!;
}
