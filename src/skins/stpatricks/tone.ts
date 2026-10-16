import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { RAINBOW as BANDS } from "./colors";

// Height tells the story: the weather and the light change with the camera's altitude, in
// tower levels. A bright spring morning over the green fields; up into the clouds, where a
// soft spring shower greys the sky and the side clouds let fall a few drops; above it the sun
// breaks through and a rainbow hangs in the lane opposite the sun; then a golden evening as
// the sun sinks into the cloud floor, a rosy dusk, and a calm starry night with a crescent
// moon. Past that the story loops for as long as you can climb: the night holds a while, a
// rose-and-peach dawn brings the sun back up out of the clouds, and from the spring morning on
// the day runs exactly as the first one did (shower, rainbow, golden evening, dusk) into the
// night again. Every color that changes with the light is precomputed here in half-level
// steps, so drawing never mixes colors per frame.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const MORNING = 12;
const SHOWER = 27;
const CLEAR = 44;
const GOLDEN = 62;
const DUSK = 80;
const NIGHT = 98;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, dawn breaks over the next DAWN_SPAN, and at the
 * spring morning the loop picks up the first day's story at MORNING and runs it again, up to
 * the night it began in (the first day's tone at LOOP_START), so its end flows into its start.
 */
export const LOOP_START = NIGHT + 6;
const NIGHT_HOLD = 8;
const DAWN_SPAN = 32;
/** Where the loop rejoins the first day's story: loop offset DAWN_END is the first day's MORNING. */
const DAWN_END = NIGHT_HOLD + DAWN_SPAN;
export const LOOP = DAWN_END + (LOOP_START - MORNING);

/**
 * The level of the first pass that tells the story at `lvl`: `lvl` itself below LOOP_START;
 * past it, in the loop, the matching level of the first day from its morning on, or (in the
 * night hold and the dawn, which the first pass has no match for) a level before MORNING,
 * counting back from it: LOOP_START - LOOP .. MORNING. Periodic past LOOP_START with period LOOP.
 */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return lvl;
  const x = (lvl - LOOP_START) % LOOP;
  return x < DAWN_END ? MORNING - DAWN_END + x : MORNING + x - DAWN_END;
}

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

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#111848", "#17225e", "#203074", "#2b4088"],
  cloud: ["#36428a", "#56649f", "#7886c4"],
  haze: "#2a3878",
  dark: 0.55,
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
  { at: NIGHT, ...NIGHT_KEY },
];

/**
 * The loop's dawn, in story levels (see storyLevel): the night, then a rose-and-peach dawn with
 * pink-lit clouds as the sun comes up out of the cloud floor, then the spring morning.
 */
const DAWN_FROM = MORNING - DAWN_SPAN;
const DAWN_PEAK = MORNING - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#3a4a9c", "#8a78c0", "#ff9f8e", "#ffd6a6"],
    cloud: ["#b98bb0", "#ffcfc6", "#fff1e4"],
    haze: "#e3a9b4",
    dark: 0.16,
  },
  { at: MORNING, ...SPRING },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The far mountains, faded blue, with the snow-pale lit flank and the holy mountain's path. */
  mountainFar: string;
  mountain: string;
  mountainLit: string;
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
  /** Whitewash far off: the chapel on the holy mountain, the far cottages. */
  white: string;
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
  /** Swans far off: white, warmed by the light. */
  swan: string;
  /** Stars and moon fade in at dusk (and out at dawn); the morning star lingers into the dawn. */
  stars: number;
  moon: number;
  morningStar: number;
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

function keyIn(keys: Key[], lvl: number): Key {
  const last = keys[keys.length - 1]!;
  if (lvl >= last.at) return last;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (lvl > b.at) continue;
    const a = keys[i - 1]!;
    return blendKeys(a, b, smooth(a.at, b.at, lvl));
  }
  return keys[0]!;
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
const PEAKS = 0.55;

/** What the light does, apart from its colors. */
interface Light {
  wet: number;
  bow: number;
  stars: number;
  moon: number;
  morningStar: number;
  sunSet: number;
  /** 0 for the white midday sun, 1 for the amber of evening and dawn. */
  warm: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { wet, warm } = l;
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    mountainFar: fade("#8fb4d6", k, 0.62),
    mountain: fade("#6f93be", k, PEAKS),
    mountainLit: fade("#a9c4e2", k, PEAKS),
    hillBack: fade("#6fb894", k, 0.5),
    fields: [fade("#4cc35e", k, HILL), fade("#8ed762", k, HILL), fade("#2fa653", k, HILL)],
    hedge: fade("#1d7a3e", k, HILL),
    wall: fade("#eeece2", k, HILL),
    stone: fade("#8e97a6", k, FAR),
    stoneLit: fade("#c4cad2", k, FAR),
    stoneShade: fade("#5f6878", k, FAR),
    white: fade("#fbfbf6", k, 0.3),
    sheep: fade("#ffffff", k, 0.12),
    water: fade("#3f9be8", k, 0.3),
    waterLit: fade("#b0e0fb", k, 0.3),
    meadowFar: fade("#86d872", k, 0.1),
    rain: wet,
    drop: mix(k.cloud[2], "#9fc4ea", 0.35),
    rainbow: l.bow,
    bands: [fade(BANDS[0], k, 0.22), fade(BANDS[1], k, 0.22), fade(BANDS[2], k, 0.22), fade(BANDS[3], k, 0.22), fade(BANDS[4], k, 0.22), fade(BANDS[5], k, 0.22)],
    bird: mix(k.sky[1], "#1a2050", 0.5),
    swan: mix(mix("#ffffff", "#ffd9b0", warm * 0.6), NIGHT_SHADOW, k.dark * 0.5),
    stars: l.stars,
    moon: l.moon,
    morningStar: l.morningStar,
    sunSet: l.sunSet,
    // In the shower the sun pales behind thin cloud; in the evening (and at dawn) it warms to amber.
    sunBody: mix(mix("#ffd94a", "#ff9a52", warm), "#fff4d6", wet * 0.5),
    sunShade: mix(mix("#ffbd36", "#f4703f", warm), "#f2e2c0", wet * 0.5),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.32 * (1 - wet * 0.6)),
  };
}

/** The first day's tone at a level (its night holds past NIGHT). */
function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), {
    wet: wetAt(lvl),
    bow: rainbowAt(lvl),
    stars: smooth(DUSK - 8, NIGHT - 4, lvl),
    moon: smooth(DUSK - 3, NIGHT - 6, lvl),
    morningStar: 0,
    sunSet: smooth(GOLDEN - 4, DUSK - 4, lvl),
    warm: smooth(GOLDEN - 14, GOLDEN + 4, lvl),
  });
}

/**
 * The loop's dawn at a story level from DAWN_FROM (the night) to MORNING: the moon and the
 * stars fade, the morning star lingers a little longer, and the sun comes up out of the clouds
 * amber and pales to its white midday self. Its ends match the first day's night and morning.
 */
function dawnTone(e: number): Tone {
  const x = e - DAWN_FROM;
  return toneFrom(keyIn(DAWN_KEYS, e), {
    wet: 0,
    bow: 0,
    stars: 1 - smooth(2, 13, x),
    moon: 1 - smooth(2, 11, x),
    morningStar: smooth(1, 6, x) * (1 - smooth(16, 24, x)),
    sunSet: 1 - smooth(8, DAWN_SPAN - 5, x),
    warm: 1 - smooth(14, DAWN_SPAN, x),
  });
}

/** Tones in half-level steps: the first pass up to LOOP_START, then one turn of the loop. */
const STEP = 0.5;
const FIRST: Tone[] = Array.from({ length: Math.round(LOOP_START / STEP) + 1 }, (_, i) => dayTone(i * STEP));
const LOOP_STEPS = Math.round(LOOP / STEP);
const TURN: Tone[] = Array.from({ length: LOOP_STEPS }, (_, i) => {
  const e = storyLevel(LOOP_START + i * STEP);
  if (e < DAWN_FROM) return FIRST[FIRST.length - 1]!;
  if (e < MORNING) return dawnTone(e);
  return FIRST[Math.round(e / STEP)]!;
});

/** Index of a level's tone step (for caching things built from a tone): unique per step. */
function indexAt(lvl: number): number {
  if (lvl < LOOP_START) return Math.max(0, Math.round(lvl / STEP));
  return FIRST.length + (Math.round((lvl - LOOP_START) / STEP) % LOOP_STEPS);
}

function toneAtIndex(i: number): Tone {
  return i < FIRST.length ? FIRST[i]! : TURN[i - FIRST.length]!;
}

/** The light at a level (camera altitude in levels). */
export function toneAtLevel(lvl: number): Tone {
  return toneAtIndex(indexAt(lvl));
}

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return indexAt(level(s));
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneAtIndex(toneIndex(s));
}
