import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import {
  AWNING,
  BRICK,
  BRICK_CREAM,
  BRICK_SAGE,
  BRICK_TAN,
  HILL,
  HILL_FAR,
  SLATE,
  STONE,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TREE,
  TREE_LIT,
  TRUNK,
  WINDOW,
  WINDOW_LIT,
} from "./colors";
import { smooth } from "./shapes";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// bright sunny afternoon over the town square; up into a summer cumulus floor that covers the
// town; a golden barbecue evening as the sun sinks into the clouds; a rose-and-violet dusk with
// the first stars and the moon, when the first shells go up; the night, when the big fireworks
// show fills both sides of the sky and builds to its finale, lighting the cloud floor; then
// the show ends and the stars have the sky, with the smoke drifting off. Past that the story
// loops for as long as you can climb: the night holds a while, a peach dawn brings the sun back
// up out of the clouds, and from the afternoon on the day runs exactly as the first one did
// (evening, dusk, the show) into the night again. The light is worked out at the camera's exact
// level whenever it moves (about fifty color mixes, well under a millisecond): a table in
// half-level steps made the sun jump a half level's worth at a time (the owner saw it "shift
// jarringly" above the clouds) and the sky and the cloud floor change color in little pops.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 14;
const GOLDEN = 42;
const DUSK = 60;
const NIGHT = 76;
/** The show: the first shells at dusk, the finale deep in the night, over before the stars' calm. */
export const SHOW_FROM = 56;
const SHOW_FULL = 64;
const FINALE_FROM = 72;
const FINALE_FULL = 80;
const FINALE_END = 90;
const FINALE_GONE = 96;
const SHOW_END = 96;
const SHOW_GONE = 104;
/**
 * The sun sinks into the cloud floor from SUNSET_FROM to SUNSET_TO: over 24 levels, so it goes
 * down at about the pace the bars scroll past, and it is down before the first shell goes up.
 */
const SUNSET_FROM = GOLDEN - 10;
const SUNSET_TO = SHOW_FROM;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, dawn breaks over the next DAWN_SPAN, and at the
 * afternoon the loop picks up the first day's story at AFTERNOON and runs it again, up to the
 * night it began in (the first day's tone at LOOP_START), so its end flows into its start.
 */
export const LOOP_START = 108;
const NIGHT_HOLD = 8;
const DAWN_SPAN = 28;
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
  return x < DAWN_END ? AFTERNOON - DAWN_END + x : AFTERNOON + x - DAWN_END;
}

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
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

const NIGHT_SHADOW = "#121a48";

const DAY: Omit<Key, "at"> = {
  sky: ["#2f7fe0", "#5cb0f2", "#9ad8fb", "#cdeefc"],
  cloud: ["#bcd4ee", "#f4f9ff", "#ffffff"],
  haze: "#b8dcf5",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#0c1140", "#131b58", "#1c2a72", "#2a3c8c"],
  cloud: ["#2c377c", "#4b589a", "#7080bd"],
  haze: "#283776",
  dark: 0.58,
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
  {
    at: GOLDEN,
    sky: ["#3c6cc8", "#8c9dd2", "#ffb964", "#ffe3a2"],
    cloud: ["#e4a984", "#ffe0bc", "#fff5e0"],
    haze: "#f1c698",
    dark: 0.08,
  },
  {
    at: DUSK,
    sky: ["#252a74", "#574396", "#b2639c", "#ee8e86"],
    cloud: ["#6e5ea8", "#b39ad4", "#d9c7f0"],
    haze: "#8a6cae",
    dark: 0.4,
  },
  { at: NIGHT, ...NIGHT_KEY },
];

/**
 * The loop's dawn, in story levels (see storyLevel): the night, then a peach-and-rose dawn
 * with pink-lit clouds as the sun comes up out of the cloud floor, then the afternoon.
 */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#384a9c", "#8e7cc4", "#ff9c88", "#ffd7a2"],
    cloud: ["#b98bb0", "#ffcfc4", "#fff1e4"],
    haze: "#e6aab2",
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
  /** The far hills, faded, and their tree line. */
  hillFar: string;
  hill: string;
  treeFar: string;
  /** Main Street: brick in four tones, stone, slate roofs, windows (lit at dusk), trim, awnings. */
  brick: string;
  tan: string;
  cream: string;
  sage: string;
  stone: string;
  stoneLit: string;
  slate: string;
  window: string;
  trim: string;
  awnings: [string, string, string];
  /** Bunting and flags on the far buildings, and the lane's things. */
  red: string;
  white: string;
  blue: string;
  yellow: string;
  /** The big summer trees on the square's far side. */
  tree: string;
  treeLit: string;
  trunk: string;
  /** The lawn's far band, as it fades with the light. */
  lawnFar: string;
  /** Birds and balloons far off. */
  bird: string;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, flat halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  /** The fireworks show: how many launchers fire (0..1), the finale (0..1), and the glow its bursts put on the sky and the cloud floor. */
  show: number;
  finale: number;
  glow: number;
  /** The smoke the show leaves drifting (0..1). */
  smoke: number;
  /** The cloud floor's body and lit caps, warmed by the finale's bursts (the cloud colors otherwise). */
  floorCloud: string;
  floorCap: string;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night (`night` scales how far). */
function fade(c: string, k: Key, amount: number, night = 1): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark * night);
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

/** How far the town's things fade toward the haze. */
const ROW = 0.14;
const FAR = 0.45;

/** What the light does, apart from its colors. */
interface Light {
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the white afternoon sun, 1 for the amber of evening and dawn. */
  warm: number;
  show: number;
  finale: number;
  smoke: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  const lit = smooth(0.2, 0.45, k.dark);
  const glow = l.finale * 0.5;
  return {
    // The finale's bursts light the haze low in the sky rose and violet.
    sky: [k.sky[0], k.sky[1], mix(k.sky[2], "#6a3d8c", glow), mix(k.sky[3], "#8c4a86", glow)],
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    hillFar: fade(HILL_FAR, k, FAR),
    hill: fade(HILL, k, 0.32),
    treeFar: fade("#4f9e58", k, 0.36),
    brick: fade(BRICK, k, ROW),
    tan: fade(BRICK_TAN, k, ROW),
    cream: fade(BRICK_CREAM, k, ROW),
    sage: fade(BRICK_SAGE, k, ROW),
    // The steeple and the dome stand out of the cloud sea by night too: they keep more of their light.
    stone: fade(STONE, k, ROW, 0.65),
    stoneLit: fade("#ffffff", k, ROW, 0.65),
    slate: fade(SLATE, k, ROW),
    window: mix(fade(WINDOW, k, ROW), WINDOW_LIT, lit),
    trim: fade("#fbfaf4", k, ROW),
    awnings: [fade(AWNING[0], k, ROW), fade(AWNING[1], k, ROW), fade(AWNING[2], k, ROW)],
    red: fade(STRIPE_RED, k, ROW * 0.8),
    white: fade(STRIPE_WHITE, k, ROW * 0.8),
    blue: fade(STRIPE_BLUE, k, ROW * 0.8),
    yellow: fade("#ffd23f", k, ROW * 0.8),
    tree: fade(TREE, k, ROW * 0.6),
    treeLit: fade(TREE_LIT, k, ROW * 0.6),
    trunk: fade(TRUNK, k, ROW * 0.6),
    lawnFar: fade("#96dc6e", k, 0.1),
    bird: mix(k.sky[1], "#1a2050", 0.55),
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#ffd94a", "#ff9a52", warm),
    sunShade: mix("#ffbd36", "#f4703f", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.32),
    show: l.show,
    finale: l.finale,
    glow: l.finale,
    smoke: l.smoke,
    floorCloud: mix(k.cloud[1], "#c98a9c", l.finale * 0.4),
    floorCap: mix(k.cloud[2], "#ffe2b4", l.finale * 0.65),
  };
}

/** The first day's light at a level (its night holds past NIGHT). */
function dayLight(lvl: number): Light {
  return {
    stars: smooth(DUSK - 6, NIGHT - 2, lvl),
    moon: smooth(DUSK - 4, DUSK + 8, lvl),
    sunSet: smooth(SUNSET_FROM, SUNSET_TO, lvl),
    warm: smooth(GOLDEN - 14, GOLDEN + 4, lvl),
    show: smooth(SHOW_FROM, SHOW_FULL, lvl) * (1 - smooth(SHOW_END, SHOW_GONE, lvl)),
    finale: smooth(FINALE_FROM, FINALE_FULL, lvl) * (1 - smooth(FINALE_END, FINALE_GONE, lvl)),
    smoke: smooth(SHOW_FULL, FINALE_FROM, lvl),
  };
}

/** The sun comes up through the loop's dawn from RISE_FROM levels into it until the afternoon (about as long as it takes to set). */
const RISE_FROM = 3;
const RISE_TO = DAWN_SPAN;

/**
 * The loop's dawn at a story level from DAWN_FROM (the night) to AFTERNOON: the moon and the
 * stars fade, the last smoke clears, and the sun comes up out of the clouds amber and pales to
 * its white afternoon self. Its ends match the first day's night and afternoon.
 */
function dawnLight(e: number): Light {
  const x = e - DAWN_FROM;
  return {
    stars: 1 - smooth(2, 13, x),
    moon: 1 - smooth(2, 11, x),
    sunSet: 1 - smooth(RISE_FROM, RISE_TO, x),
    warm: 1 - smooth(14, DAWN_SPAN, x),
    show: 0,
    finale: 0,
    smoke: 1 - smooth(0, 6, x),
  };
}

/** The light's amounts at any level, worked out at the level itself: the first day, then the loop's night hold, dawn and day. */
function lightAt(lvl: number): Light {
  if (lvl < LOOP_START) return dayLight(lvl);
  const e = storyLevel(lvl);
  if (e < DAWN_FROM) return dayLight(LOOP_START);
  return e < AFTERNOON ? dawnLight(e) : dayLight(e);
}

/** The light's colors at a level: the first day's keys, or, in the loop, the keys of its story level (the dawn has its own). */
function keyAt(lvl: number): Key {
  if (lvl < LOOP_START) return keyIn(KEYS, lvl);
  const e = storyLevel(lvl);
  if (e < DAWN_FROM) return keyIn(KEYS, LOOP_START);
  return e < AFTERNOON ? keyIn(DAWN_KEYS, e) : keyIn(KEYS, e);
}

/** The last tone worked out: a frame whose camera has not moved (most of them) reuses it. */
const last = { lvl: NaN, tone: null as Tone | null };

/**
 * The light at a level (camera altitude in levels), worked out at the level itself, so the sun
 * sinks and rises, the moon and the stars fade and every color turns as smoothly as the camera
 * climbs (sun.test.ts holds every step of the climb to a sliver).
 */
export function toneAtLevel(lvl: number): Tone {
  if (!last.tone || lvl !== last.lvl) {
    last.lvl = lvl;
    last.tone = toneFrom(keyAt(lvl), lightAt(lvl));
  }
  return last.tone;
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return toneAtLevel(level(s));
}
