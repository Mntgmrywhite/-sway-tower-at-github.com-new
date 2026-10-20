import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// golden Carnival afternoon in the Quarter; climb, and the sun goes down over the river in
// orange and rose while a floor of cloud gathers below you and covers the city (only the
// cathedral's spires stand out of it); a violet dusk as the lanterns come on; the night parade,
// the clouds lit from beneath by the flambeaux and fireworks bursting over the river; then a
// calm, starry purple night. Past that the story loops for as long as you can climb: the night
// holds a while, a dawn mist rolls over the cloud floor in rose and lavender, the sun comes up
// where it set, and from the golden afternoon on the day runs exactly as the first one did.
// Every color that changes with the light is precomputed here in half-level steps, so drawing
// never mixes colors per frame.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
const AFTERNOON = 10;
const SUNSET = 28;
/** By here the cloud floor has covered the city (far.ts gathers it over the levels before). */
export const DAY_HIGH = 36;
const DUSK = 50;
const NIGHT = 70;
const DEEP = 88;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, the dawn breaks over the next DAWN_SPAN, and at
 * the afternoon the loop picks up the first day's story at AFTERNOON and runs it again, up to
 * the night it began in, so its end flows into its start.
 */
export const LOOP_START = 100;
const NIGHT_HOLD = 8;
const DAWN_SPAN = 32;
const DAWN_END = NIGHT_HOLD + DAWN_SPAN;
export const LOOP = DAWN_END + (LOOP_START - AFTERNOON);

/**
 * The level of the first pass that tells the story at `lvl`: `lvl` itself below LOOP_START;
 * past it, in the loop, the matching level of the first day from its afternoon on, or (in the
 * night hold and the dawn, which the first pass has no match for) a level before AFTERNOON,
 * counting back from it. Periodic past LOOP_START with period LOOP.
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

const NIGHT_SHADOW = "#1a1446";

const DAY: Omit<Key, "at"> = {
  sky: ["#3f7fd9", "#6aa9ea", "#f7d58a", "#ffe9b0"],
  cloud: ["#d9c3e8", "#fff4e0", "#ffffff"],
  haze: "#f0d6a8",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#150f3c", "#251a5e", "#3b2a7c", "#4c3a90"],
  cloud: ["#3b2f7c", "#5a4ba0", "#7f6ec4"],
  haze: "#2f2568",
  dark: 0.55,
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
  {
    at: SUNSET,
    sky: ["#4a4f9e", "#b06aa8", "#ff8c4a", "#ffc46a"],
    cloud: ["#b07aa4", "#ffc9a0", "#fff0d0"],
    haze: "#f0a070",
    dark: 0.1,
  },
  {
    at: DUSK,
    sky: ["#2a2460", "#5a3a8c", "#9a5aa0", "#e0789a"],
    cloud: ["#6a4a9a", "#a07ec4", "#d0b4e4"],
    haze: "#8c62a8",
    dark: 0.36,
  },
  { at: NIGHT, ...NIGHT_KEY },
  { at: DEEP, ...NIGHT_KEY },
];

/** The loop's dawn, in story levels (see storyLevel): the night, then a rose-and-lavender dawn with a mist over the clouds, then the day. */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#4a4aa0", "#a08ac8", "#ffb8a8", "#ffe2cc"],
    cloud: ["#c49cc0", "#ffe0dc", "#fff6f0"],
    haze: "#e6b6c8",
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
  /** The far bank across the river and its warehouses, faded. */
  farBank: string;
  /** The river and its glints. */
  river: string;
  riverLit: string;
  /** The cathedral and the square's buildings: body, lit side, shade. */
  stone: string;
  stoneLit: string;
  stoneShade: string;
  /** Spire roofs and the far street's rails. */
  slate: string;
  /** The live oak at the square's corner. */
  oak: string;
  /** The square (square.ts): its paving, lawns, trees (body and lit crown) and the brick rows down its sides. */
  plaza: string;
  lawn: string;
  tree: string;
  treeLit: string;
  brick: string;
  /** The riverboat: white decks and its red trim. */
  boat: string;
  boatTrim: string;
  /** The streetcar's olive green and cream. */
  tram: string;
  tramLit: string;
  /** Smoke from the stacks. */
  smoke: string;
  /** Windows far off: lit from dusk on (0..1), and their glow. */
  lit: number;
  glow: string;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, flat halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  /** The night parade: fireworks over the river (0..1) and the flambeaux's glow under the clouds (0..1). */
  fireworks: number;
  flambeau: number;
  /** The cloud floor's puffs at the sides lit warm by the flambeaux: body and cap. */
  flamCloud: string;
  flamLight: string;
  /** The dawn mist rolling over the cloud floor (0..1), and its color. */
  mist: number;
  mistColor: string;
  /** Lane things far off: a flat shade for confetti and beads (they keep their own colors, faded this much toward the haze). */
  fade: number;
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

const FAR = 0.5;
const MID = 0.34;

/** What the light does, apart from its colors. */
interface Light {
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the white afternoon sun, 1 for the amber of evening and dawn. */
  warm: number;
  lit: number;
  fireworks: number;
  flambeau: number;
  mist: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    farBank: fade("#8c7aa8", k, 0.62),
    river: fade("#4a86c8", k, 0.36),
    riverLit: mix(fade("#bfe0f8", k, 0.3), k.sky[2], 0.4),
    stone: fade("#d8d2cc", k, FAR),
    stoneLit: fade("#f4f0ea", k, FAR),
    stoneShade: fade("#9a92a8", k, FAR),
    slate: fade("#5c6a8c", k, FAR),
    oak: fade("#3f8a52", k, FAR),
    plaza: fade("#dccfb8", k, 0.42),
    lawn: fade("#5cb865", k, MID),
    tree: fade("#3f9a54", k, MID),
    treeLit: fade("#79c977", k, MID),
    brick: fade("#d9775c", k, MID),
    boat: fade("#fbf7ef", k, MID),
    boatTrim: fade("#d6484e", k, MID),
    tram: fade("#5f8f4a", k, MID),
    tramLit: fade("#f4ecc8", k, MID),
    smoke: fade("#e8e4ee", k, 0.4),
    lit: l.lit,
    glow: mix("#ffd67a", "#ffb84a", l.lit * 0.3),
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#ffe26a", "#ff9a52", warm),
    sunShade: mix("#ffc63a", "#f4703f", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.3),
    fireworks: l.fireworks,
    flambeau: l.flambeau,
    flamCloud: mix(k.cloud[1], "#ff9a6a", 0.42),
    flamLight: mix(k.cloud[2], "#ffd29a", 0.6),
    mist: l.mist,
    mistColor: mix(k.cloud[2], "#ffd8e4", 0.4),
    fade: 0.3 + k.dark * 0.5,
  };
}

/** The first day's tone at a level (its night holds past DEEP). */
function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), {
    stars: smooth(DUSK - 6, NIGHT - 2, lvl),
    moon: smooth(DUSK - 2, NIGHT - 6, lvl),
    sunSet: smooth(SUNSET - 6, DUSK - 8, lvl),
    warm: smooth(SUNSET - 16, SUNSET + 2, lvl),
    lit: smooth(SUNSET - 2, DUSK, lvl),
    fireworks: smooth(DUSK + 2, DUSK + 10, lvl) * (1 - smooth(DEEP - 10, DEEP - 2, lvl)),
    flambeau: smooth(DUSK - 4, DUSK + 6, lvl) * (1 - smooth(DEEP - 8, DEEP, lvl)),
    mist: 0,
  });
}

/**
 * The loop's dawn at a story level from DAWN_FROM (the night) to AFTERNOON: the moon and the
 * stars fade, a mist rolls over the cloud floor, and the sun comes up out of the clouds amber
 * and pales to its afternoon self. Its ends match the first day's night and afternoon.
 */
function dawnTone(e: number): Tone {
  const x = e - DAWN_FROM;
  return toneFrom(keyIn(DAWN_KEYS, e), {
    stars: 1 - smooth(3, 14, x),
    moon: 1 - smooth(2, 12, x),
    sunSet: 1 - smooth(9, DAWN_SPAN - 5, x),
    warm: 1 - smooth(16, DAWN_SPAN, x),
    lit: 1 - smooth(8, 20, x),
    fireworks: 0,
    flambeau: 0,
    mist: smooth(2, 9, x) * (1 - smooth(18, 28, x)),
  });
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
