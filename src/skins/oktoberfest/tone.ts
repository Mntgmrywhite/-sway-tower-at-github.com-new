import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// sunny festival afternoon under the Alps; climbing, a golden evening as the sun sinks toward
// the mist gathering over the valley, and the tent's lanterns and the stalls' lights come on;
// a rosy dusk; then a calm night with stars over the snow peaks, a crescent moon where the sun
// set, the Ferris wheel lit and sky lanterns rising in the lane. Past that the story loops for
// as long as you can climb: the night holds a while, a pale dawn lays mist on the mountains
// and brings the sun back up out of the cloud sea, and from the afternoon on the day runs
// exactly as the first one did (golden evening, dusk) into the night again. Every color that
// changes with the light is precomputed here in half-level steps, so drawing never mixes
// colors per frame.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 28;
const AFTERNOON = 14;
const GOLDEN = 34;
const DUSK = 52;
const NIGHT = 70;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, dawn breaks over the next DAWN_SPAN, and at the
 * afternoon the loop picks up the first day's story at AFTERNOON and runs it again, up to the
 * night it began in (the first day's tone at LOOP_START), so its end flows into its start.
 */
export const LOOP_START = NIGHT + 6;
const NIGHT_HOLD = 8;
const DAWN_SPAN = 32;
/** Where the loop rejoins the first day's story: loop offset DAWN_END is the first day's AFTERNOON. */
const DAWN_END = NIGHT_HOLD + DAWN_SPAN;
export const LOOP = DAWN_END + (LOOP_START - AFTERNOON);

/**
 * The level of the first pass that tells the story at `lvl`: `lvl` itself below LOOP_START;
 * past it, in the loop, the matching level of the first day from its afternoon on, or (in the
 * night hold and the dawn, which the first pass has no match for) a level before AFTERNOON,
 * counting back from it: LOOP_START - LOOP .. AFTERNOON. Periodic past LOOP_START with period LOOP.
 */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return lvl;
  const x = (lvl - LOOP_START) % LOOP;
  return AFTERNOON - DAWN_END + x;
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

const DAY: Omit<Key, "at"> = {
  sky: ["#3c8ee8", "#6db5f2", "#a9dcf8", "#d8f0fb"],
  cloud: ["#c6daf1", "#f5faff", "#ffffff"],
  haze: "#b8def6",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#111848", "#17225e", "#203074", "#2b4088"],
  cloud: ["#36428a", "#56649f", "#7886c4"],
  haze: "#2a3878",
  dark: 0.55,
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
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
 * The loop's dawn, in story levels (see storyLevel): the night, then a pale rose dawn with mist
 * on the mountains as the sun comes up out of the cloud sea, then the festival afternoon.
 */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#4a5aa4", "#9a8cc4", "#ffb8a0", "#ffe2c4"],
    cloud: ["#bc98b4", "#f6d4ca", "#fff2e6"],
    haze: "#e8c2bc",
    dark: 0.16,
  },
  { at: AFTERNOON, ...DAY },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The far hazy range, the big peaks' rock (body, lit face) and their snow (lit, shaded). */
  peakFar: string;
  rock: string;
  rockLit: string;
  snow: string;
  snowShade: string;
  /** The pine forest on the foothills, and its lit tops. */
  pine: string;
  pineLit: string;
  /** The far meadow slopes, and the meadow's far band as it fades with the light. */
  hill: string;
  meadowFar: string;
  /** The village: cream walls, dark timbers, red roofs, the church's green onion dome, its whitewash. */
  wall: string;
  timber: string;
  roof: string;
  dome: string;
  white: string;
  /** The village windows: lit amount (0 by day) and the lit color. */
  windows: number;
  windowLit: string;
  /** The far picnic tables and the folk at them (wood, cloth, skin), and the hay bales, far off. */
  wood: string;
  bale: string;
  baleShade: string;
  cloth: [string, string, string];
  skinFar: string;
  /** Painted steel of the Ferris wheel and the swing ride, far off; its lit side. */
  steel: string;
  steelLit: string;
  /** The Ferris wheel's and the swing ride's bulbs: how bright (0 by day). */
  bulbs: number;
  /** The tent's lanterns and the stalls' lights: on (1) from the golden evening. */
  lights: number;
  /** Mist on the mountains at the loop's dawn (0..1) and its color. */
  mist: number;
  mistColor: string;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the mist), body, shade, flat halo. */
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

const VILLAGE = 0.3;
const PEAKS = 0.55;
const FAIR = 0.34;

/** What the light does, apart from its colors. */
export interface Light {
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the white midday sun, 1 for the amber of evening and dawn. */
  warm: number;
  lights: number;
  bulbs: number;
  windows: number;
  mist: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    peakFar: fade("#8fb4d6", k, 0.64),
    rock: fade("#6f8fb8", k, PEAKS),
    rockLit: fade("#a3bcda", k, PEAKS),
    snow: fade(mix("#ffffff", "#ffd9a8", warm * 0.5), k, 0.3),
    snowShade: fade(mix("#cfe0f4", "#e8b8a8", warm * 0.4), k, 0.42),
    pine: fade("#2f7a4e", k, 0.42),
    pineLit: fade("#4a9a62", k, 0.42),
    hill: fade("#6fbf74", k, 0.4),
    meadowFar: fade("#86d872", k, 0.1),
    wall: fade("#f6efe0", k, VILLAGE),
    timber: fade("#5a3a26", k, VILLAGE),
    roof: fade("#c9583e", k, VILLAGE),
    dome: fade("#3f9a6e", k, VILLAGE),
    white: fade("#fbfbf6", k, VILLAGE),
    windows: l.windows,
    windowLit: "#ffd98a",
    wood: fade("#b7793f", k, VILLAGE),
    bale: fade("#e8c463", k, VILLAGE),
    baleShade: fade("#b98a32", k, VILLAGE),
    cloth: [fade("#d8415a", k, VILLAGE), fade("#3a7fd6", k, VILLAGE), fade("#f4f1e8", k, VILLAGE)],
    skinFar: fade("#ffd3b0", k, VILLAGE),
    steel: fade("#8c6a5a", k, FAIR),
    steelLit: fade("#c9a48a", k, FAIR),
    bulbs: l.bulbs,
    lights: l.lights,
    mist: l.mist,
    mistColor: mix(k.cloud[1], k.sky[3], 0.4),
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#ffd94a", "#ff9a52", warm),
    sunShade: mix("#ffbd36", "#f4703f", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.32),
  };
}

/** The first day's light at a level (its night holds past NIGHT), written into `out`. */
function dayLight(lvl: number, out: Light): Light {
  out.stars = smooth(DUSK - 8, NIGHT - 4, lvl);
  out.moon = smooth(DUSK - 3, NIGHT - 6, lvl);
  out.sunSet = smooth(GOLDEN - 4, DUSK - 4, lvl);
  out.warm = smooth(GOLDEN - 14, GOLDEN + 4, lvl);
  out.lights = smooth(GOLDEN - 10, GOLDEN, lvl);
  out.bulbs = smooth(DUSK - 12, DUSK, lvl);
  out.windows = smooth(GOLDEN + 4, DUSK, lvl);
  out.mist = 0;
  return out;
}

/**
 * The loop's dawn at a story level from DAWN_FROM (the night) to AFTERNOON: the moon and the
 * stars fade, mist lies on the mountains, and the sun comes up out of the cloud sea amber and
 * pales to its white midday self as the lights go out. Its ends match the first day's night
 * and afternoon.
 */
function dawnLight(e: number, out: Light): Light {
  const x = e - DAWN_FROM;
  out.stars = 1 - smooth(2, 13, x);
  out.moon = 1 - smooth(2, 11, x);
  out.sunSet = 1 - smooth(8, DAWN_SPAN - 5, x);
  out.warm = 1 - smooth(14, DAWN_SPAN, x);
  out.lights = 1 - smooth(16, DAWN_SPAN - 2, x);
  out.bulbs = 1 - smooth(8, 18, x);
  out.windows = 1 - smooth(12, 24, x);
  out.mist = smooth(1, 9, x) * (1 - smooth(20, DAWN_SPAN, x));
  return out;
}

function newLight(): Light {
  return { stars: 0, moon: 0, sunSet: 0, warm: 0, lights: 0, bulbs: 0, windows: 0, mist: 0 };
}

function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), dayLight(lvl, newLight()));
}

function dawnTone(e: number): Tone {
  return toneFrom(keyIn(DAWN_KEYS, e), dawnLight(e, newLight()));
}

/** Scratch result of `lightAt`, reused so a frame allocates nothing. */
const LIGHT = newLight();

/**
 * The light's amounts at exactly this level (camera altitude in levels), not in the tone
 * table's half-level steps: whatever moves on screen with the light (the sun setting into the
 * mist and rising out of it, the moon and the stars fading in and out) is placed from this, so
 * it glides with the camera instead of stepping every half level. Periodic past LOOP_START,
 * like the tones. Returns a shared scratch object.
 */
export function lightAt(lvl: number): Readonly<Light> {
  if (lvl < LOOP_START) return dayLight(Math.max(0, lvl), LIGHT);
  const e = storyLevel(lvl);
  if (e < DAWN_FROM) return dayLight(LOOP_START, LIGHT);
  if (e < AFTERNOON) return dawnLight(e, LIGHT);
  return dayLight(e, LIGHT);
}

/** Tones in half-level steps: the first pass up to LOOP_START, then one turn of the loop. */
const STEP = 0.5;
const FIRST: Tone[] = Array.from({ length: Math.round(LOOP_START / STEP) + 1 }, (_, i) => dayTone(i * STEP));
const LOOP_STEPS = Math.round(LOOP / STEP);
const TURN: Tone[] = Array.from({ length: LOOP_STEPS }, (_, i) => {
  const e = storyLevel(LOOP_START + i * STEP);
  if (e < DAWN_FROM) return FIRST[FIRST.length - 1]!;
  if (e < AFTERNOON) return dawnTone(e);
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
