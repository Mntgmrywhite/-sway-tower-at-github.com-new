import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { BLUE, GREEN, ORANGE, PURPLE, RED, TEAL, WOOD, YELLOW } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// soft morning over the toy kingdom, a clear high day as the block clouds gather below, a warm
// afternoon, a candy sunset, a violet dusk with the first stars, and a calm night at the top.
// Every color that changes with the light is precomputed here in half-level steps, so drawing
// never mixes colors per frame.

/** Where each stage of the light peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 48;
const SUNSET = 64;
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
  /** Block clouds: shaded underside, body, lit caps. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#1a1c52";

const KEYS: Key[] = [
  {
    at: 0,
    sky: ["#4f9eec", "#7cbff4", "#b4e0fa", "#d6f0fc"],
    cloud: ["#c9dcf4", "#f6faff", "#ffffff"],
    haze: "#c0e2f8",
    dark: 0,
  },
  {
    at: DAY_HIGH,
    sky: ["#468fe6", "#6fb2f0", "#a8d8f8", "#cae9fa"],
    cloud: ["#c2d6f1", "#f6faff", "#ffffff"],
    haze: "#b2d9f6",
    dark: 0,
  },
  {
    at: AFTERNOON,
    sky: ["#4a88e0", "#74aeec", "#b4d6f2", "#efe0c8"],
    cloud: ["#cbd2ea", "#fbf8fa", "#ffffff"],
    haze: "#bcd2ec",
    dark: 0.02,
  },
  {
    at: SUNSET,
    sky: ["#6a70d4", "#c080c8", "#ffa486", "#ffd28a"],
    cloud: ["#eaa0b0", "#ffe2d6", "#fff5ea"],
    haze: "#f4b0a6",
    dark: 0.1,
  },
  {
    at: DUSK,
    sky: ["#2b2f7c", "#4d43a0", "#a066ac", "#e48e96"],
    cloud: ["#7e6cb2", "#baa4dc", "#e0cef4"],
    haze: "#8e6eb2",
    dark: 0.36,
  },
  {
    at: NIGHT,
    sky: ["#151a4c", "#1c2562", "#263478", "#32448c"],
    cloud: ["#3a468e", "#5a68a4", "#7c8ac8"],
    haze: "#2e3c7c",
    dark: 0.52,
  },
];

/** A toy color seen far off: its body and its lit top. */
interface FarToy {
  body: string;
  light: string;
}

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The back row of block mountains: body, lit slab tops, shaded slab bottoms. */
  hillBack: string;
  hillBackLit: string;
  hillBackShade: string;
  /** The front row of block hills: body, lit slab tops, shaded slab bottoms and seams. */
  hillFront: string;
  hillFrontLit: string;
  hillFrontShade: string;
  /** Far lollipop trees, the far bridge and the railway. */
  farLeaf: string;
  farLeafLit: string;
  farWood: string;
  water: string;
  waterLit: string;
  tunnel: string;
  /** Faded toy colors for far things: red, yellow, blue, green, orange, purple, teal. */
  toys: [FarToy, FarToy, FarToy, FarToy, FarToy, FarToy, FarToy];
  /** Strings and other thin dark lines far away. */
  line: string;
  /** Stars and moon fade in at dusk. */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, rays, flat halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunRay: string;
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

/** Drifting toys are a little closer than the hills: faded less. */
const TOY_FADE = 0.36;

function farToy(c: string, k: Key): FarToy {
  return { body: fade(c, k, TOY_FADE), light: fade(mix(c, "#ffffff", 0.4), k, TOY_FADE) };
}

function toneAt(lvl: number): Tone {
  const k = keyAt(lvl);
  const warm = smooth(AFTERNOON - 6, SUNSET + 4, lvl);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    hillBack: fade("#8c9fe6", k, 0.38),
    hillBackLit: fade("#b8c6f4", k, 0.38),
    hillBackShade: fade("#7889d6", k, 0.38),
    hillFront: fade("#5cc472", k, 0.3),
    hillFrontLit: fade("#a2e696", k, 0.3),
    hillFrontShade: fade("#45a862", k, 0.3),
    farLeaf: fade("#3faa58", k, 0.34),
    farLeafLit: fade("#7fd67a", k, 0.34),
    farWood: fade(WOOD.body, k, 0.34),
    water: fade("#3f9ee8", k, 0.36),
    waterLit: fade("#9ad6fa", k, 0.36),
    tunnel: fade("#4a4a8a", k, 0.3),
    toys: [
      farToy(RED.body, k),
      farToy(YELLOW.body, k),
      farToy(BLUE.body, k),
      farToy(GREEN.body, k),
      farToy(ORANGE.body, k),
      farToy(PURPLE.body, k),
      farToy(TEAL.body, k),
    ],
    line: mix(k.sky[1], "#1a2050", 0.5),
    stars: smooth(DUSK - 8, NIGHT - 4, lvl),
    moon: smooth(DUSK - 3, NIGHT - 6, lvl),
    sunSet: smooth(SUNSET - 4, DUSK - 4, lvl),
    sunBody: mix("#ffd84a", "#ff9a52", warm),
    sunShade: mix("#ffbb33", "#f4703f", warm),
    sunRay: mix("#ffe27a", "#ffb07a", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.3),
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
