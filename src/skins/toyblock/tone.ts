import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { BLUE, GREEN, ORANGE, PURPLE, RED, TEAL, WOOD, YELLOW } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// soft morning over the toy kingdom, a clear high day as the block clouds gather below, a warm
// afternoon, a candy sunset, a violet dusk with the first stars, and a calm night.
//
// Then the story loops, so a tower can climb forever: from LOOP_START the light repeats every
// LOOP levels. The loop runs night → a deeper night → a violet pre-dawn → a rose dawn as the
// moon sets → sunrise → a fresh morning, and from DAY_HIGH + LOOP it is the first pass again
// (high day, afternoon, sunset, dusk, night), so its end (night) flows straight into its start.
// Everything here is a function of the story level (`storyLevel`), never of the raw level, and
// every color that changes with the light is precomputed in half-level steps, so drawing never
// mixes colors per frame.

/** Where each stage of the first pass peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 48;
const SUNSET = 64;
const DUSK = 80;
const NIGHT = 98;

/** From here the story repeats every LOOP levels (night at both ends). */
export const LOOP_START = 104;
export const LOOP = 130;
/** The loop's own stages, before it rejoins the first pass at DAY_HIGH + LOOP. */
const DEEP = 118;
const PREDAWN = 132;
const DAWN = 142;
const SUNRISE = 150;
const MORNING = 156;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** A level as the story sees it: the first pass as it is, then wrapped into [LOOP_START, LOOP_START + LOOP). */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return Math.max(0, lvl);
  return LOOP_START + ((lvl - LOOP_START) % LOOP);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between. */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** A value along the story: [story level, value] points, eased between, held past the ends. */
type Curve = readonly (readonly [number, number])[];

function evalCurve(c: Curve, x: number): number {
  if (x <= c[0]![0]) return c[0]![1];
  for (let i = 1; i < c.length; i++) {
    const [b, vb] = c[i]!;
    if (x > b) continue;
    const [a, va] = c[i - 1]!;
    return va + (vb - va) * smooth(a, b, x);
  }
  return c[c.length - 1]![1];
}

/**
 * A curve over the whole story: the first pass's points (up to LOOP_START), the loop's own
 * points (between LOOP_START and DAY_HIGH + LOOP), then the first pass again from DAY_HIGH, LOOP
 * levels on. So the value at LOOP_START + LOOP is the value at LOOP_START, and from DAY_HIGH +
 * LOOP on the curve repeats the first pass exactly.
 */
function storyCurve(first: Curve, loop: Curve): Curve {
  const at = evalCurve(first, DAY_HIGH);
  const again = [[DAY_HIGH, at] as const, ...first.filter(([x]) => x > DAY_HIGH)].map(([x, v]) => [x + LOOP, v] as const);
  return [...first, ...loop, ...again];
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

type Light = Omit<Key, "at">;

const L_MORNING: Light = {
  sky: ["#4f9eec", "#7cbff4", "#b4e0fa", "#d6f0fc"],
  cloud: ["#c9dcf4", "#f6faff", "#ffffff"],
  haze: "#c0e2f8",
  dark: 0,
};
const L_DAY: Light = {
  sky: ["#468fe6", "#6fb2f0", "#a8d8f8", "#cae9fa"],
  cloud: ["#c2d6f1", "#f6faff", "#ffffff"],
  haze: "#b2d9f6",
  dark: 0,
};
const L_AFTERNOON: Light = {
  sky: ["#4a88e0", "#74aeec", "#b4d6f2", "#efe0c8"],
  cloud: ["#cbd2ea", "#fbf8fa", "#ffffff"],
  haze: "#bcd2ec",
  dark: 0.02,
};
const L_SUNSET: Light = {
  sky: ["#6a70d4", "#c080c8", "#ffa486", "#ffd28a"],
  cloud: ["#eaa0b0", "#ffe2d6", "#fff5ea"],
  haze: "#f4b0a6",
  dark: 0.1,
};
const L_DUSK: Light = {
  sky: ["#2b2f7c", "#4d43a0", "#a066ac", "#e48e96"],
  cloud: ["#7e6cb2", "#baa4dc", "#e0cef4"],
  haze: "#8e6eb2",
  dark: 0.36,
};
const L_NIGHT: Light = {
  sky: ["#151a4c", "#1c2562", "#263478", "#32448c"],
  cloud: ["#3a468e", "#5a68a4", "#7c8ac8"],
  haze: "#2e3c7c",
  dark: 0.52,
};
const L_DEEP: Light = {
  sky: ["#10143e", "#161e56", "#1e2a6c", "#283a82"],
  cloud: ["#323e86", "#505e9e", "#7280c0"],
  haze: "#283678",
  dark: 0.56,
};
const L_PREDAWN: Light = {
  sky: ["#161b52", "#272d72", "#4c408e", "#7c5ca4"],
  cloud: ["#4c4a94", "#6c68ae", "#928aca"],
  haze: "#4c4890",
  dark: 0.46,
};
const L_DAWN: Light = {
  sky: ["#3c4c9e", "#7c6eba", "#ea92aa", "#ffc89c"],
  cloud: ["#c898ba", "#f4d0da", "#fff1ea"],
  haze: "#d8a8c2",
  dark: 0.16,
};
const L_SUNRISE: Light = {
  sky: ["#4c84d8", "#8ab2ec", "#f4c6b8", "#ffe2ba"],
  cloud: ["#d6c8e2", "#fcf3f2", "#ffffff"],
  haze: "#d4d8ee",
  dark: 0.04,
};

/** The first pass's stages, the loop's, and (from DAY_HIGH + LOOP) the first pass again. */
const FIRST: Key[] = [
  { at: 0, ...L_MORNING },
  { at: DAY_HIGH, ...L_DAY },
  { at: AFTERNOON, ...L_AFTERNOON },
  { at: SUNSET, ...L_SUNSET },
  { at: DUSK, ...L_DUSK },
  { at: NIGHT, ...L_NIGHT },
  { at: LOOP_START, ...L_NIGHT },
];
const KEYS: Key[] = [
  ...FIRST,
  { at: DEEP, ...L_DEEP },
  { at: PREDAWN, ...L_PREDAWN },
  { at: DAWN, ...L_DAWN },
  { at: SUNRISE, ...L_SUNRISE },
  { at: MORNING, ...L_MORNING },
  ...FIRST.filter((k) => k.at >= DAY_HIGH).map((k) => ({ ...k, at: k.at + LOOP })),
];

/** The sun above the clouds (1) or set below them (0): it sets at dusk and rises again at dawn. */
const SUN_UP = storyCurve(
  [
    [0, 1],
    [SUNSET - 4, 1],
    [DUSK - 4, 0],
    [LOOP_START, 0],
  ],
  [
    [DAWN, 0],
    [SUNRISE + 4, 1],
  ],
);
/** The moon: rises at dusk, sets before dawn. */
const MOON_UP = storyCurve(
  [
    [0, 0],
    [DUSK - 3, 0],
    [NIGHT - 6, 1],
    [LOOP_START, 1],
  ],
  [
    [PREDAWN - 4, 1],
    [DAWN - 2, 0],
  ],
);
/** Stars: out from dusk, gone by sunrise. */
const STARS = storyCurve(
  [
    [0, 0],
    [DUSK - 8, 0],
    [NIGHT - 4, 1],
    [LOOP_START, 1],
  ],
  [
    [PREDAWN, 1],
    [DAWN + 6, 0],
  ],
);
/** How warm the sun is: yellow by day, orange low in the sky at sunset and sunrise. */
const SUN_WARM = storyCurve(
  [
    [0, 0],
    [AFTERNOON - 6, 0],
    [SUNSET + 4, 1],
    [LOOP_START, 1],
  ],
  [
    [SUNRISE, 1],
    [MORNING + 4, 0],
  ],
);
/**
 * Which constellation is out: the sailboat (0) early in the night, the teddy (1) in the deep
 * night until the moon sets (sky.ts shows them only while the moon is up); back to the sailboat
 * by day, unseen.
 */
const TEDDY = storyCurve(
  [
    [0, 0],
    [LOOP_START, 0],
  ],
  [
    [LOOP_START + 1, 0],
    [DEEP - 3, 1],
    [DAWN, 1],
    [MORNING, 0],
  ],
);
/** Lit windows and lamps on the toys: on from dusk to dawn. */
const LAMPS = storyCurve(
  [
    [0, 0],
    [SUNSET, 0],
    [DUSK, 1],
    [LOOP_START, 1],
  ],
  [
    [PREDAWN + 4, 1],
    [SUNRISE, 0],
  ],
);

/** A toy color seen far off: its body and its lit top. */
export interface FarToy {
  body: string;
  light: string;
  shade: string;
}

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** Far clouds: fainter, toward the sky. */
  farCloudShade: string;
  farCloud: string;
  farCloudLight: string;
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
  /** Faded toy colors for the far land (the castle, the town, the rocket): red, yellow, blue, green, orange, purple, teal. */
  land: [FarToy, FarToy, FarToy, FarToy, FarToy, FarToy, FarToy];
  /** Faded toy colors for things in the sky lanes (a little closer than the land): same order. */
  toys: [FarToy, FarToy, FarToy, FarToy, FarToy, FarToy, FarToy];
  /** Cream for toys in the sky (rocket bodies, sails, paper), and for the land's. */
  cream: FarToy;
  landCream: FarToy;
  /** Doorways and windows far off. */
  hole: string;
  /** Strings and other thin dark lines far away. */
  line: string;
  /** Stars fade in at dusk and out at dawn. */
  stars: number;
  /** Which constellation is out: 0 the sailboat, 1 the teddy, between them a cross-fade. */
  teddy: number;
  /** The moon: 1 up at its spot, 0 set below the clouds. */
  moonUp: number;
  /** The sun: 1 up at its spot, 0 set below the clouds; its body, shade, rays and highlight. */
  sunUp: number;
  sunBody: string;
  sunShade: string;
  sunRay: string;
  sunHalo: string;
  /** Lit windows and lamps on the toys in the sky (0 by day, 1 at night). */
  lamps: number;
  lamp: string;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night (`night` of the way). */
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

/**
 * Things in the sky lanes are a little closer than the land: faded less, and moonlit at night
 * (sunk only part of the way toward the night shadow), so the night's toys still read.
 */
const TOY_FADE = 0.26;
const TOY_NIGHT = 0.42;
const LAND_FADE = 0.4;

function farToy(c: string, k: Key, amount: number, night = 1): FarToy {
  return {
    body: fade(c, k, amount, night),
    light: fade(mix(c, "#ffffff", 0.42), k, amount, night),
    shade: fade(mix(c, "#1a1030", 0.24), k, amount, night),
  };
}

const TOY_COLORS = [RED.body, YELLOW.body, BLUE.body, GREEN.body, ORANGE.body, PURPLE.body, TEAL.body] as const;

function palette(k: Key, amount: number, night = 1): Tone["toys"] {
  const [r, y, b, g, o, p, t] = TOY_COLORS.map((c) => farToy(c, k, amount, night));
  return [r!, y!, b!, g!, o!, p!, t!];
}

function toneAt(lvl: number): Tone {
  const k = keyAt(lvl);
  const warm = evalCurve(SUN_WARM, lvl);
  const lamps = evalCurve(LAMPS, lvl);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    farCloudShade: mix(k.cloud[0], k.sky[1], 0.5),
    farCloud: mix(k.cloud[1], k.sky[1], 0.48),
    farCloudLight: mix(k.cloud[2], k.sky[1], 0.42),
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
    land: palette(k, LAND_FADE),
    toys: palette(k, TOY_FADE * (1 - k.dark * 0.6), TOY_NIGHT),
    cream: farToy("#fff4dc", k, TOY_FADE * (1 - k.dark * 0.6), TOY_NIGHT),
    landCream: farToy("#fff4dc", k, LAND_FADE),
    hole: fade("#3b2a5c", k, 0.3),
    // Thin lines: dark against the day sky, pale against the night's.
    line: mix(mix(k.sky[1], "#1a2050", 0.5), mix(k.sky[1], "#c8d0ff", 0.42), smooth(0.12, 0.42, k.dark)),
    stars: evalCurve(STARS, lvl),
    teddy: evalCurve(TEDDY, lvl),
    moonUp: evalCurve(MOON_UP, lvl),
    sunUp: evalCurve(SUN_UP, lvl),
    sunBody: mix("#ffd84a", "#ff9a52", warm),
    sunShade: mix("#ffbb33", "#f4703f", warm),
    sunRay: mix("#ffe27a", "#ffb07a", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.3),
    lamps,
    lamp: mix(fade("#3b2a5c", k, 0.3), "#ffe08a", lamps),
  };
}

/** Tones in half-level steps over the whole story: the first pass and one turn of the loop. */
const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.round((LOOP_START + LOOP) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** Index of a level's tone step (for caching things built from a tone). */
export function toneStep(lvl: number): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(storyLevel(lvl) / STEP)));
}

/** Index of the scene's tone step. */
export function toneIndex(s: Scene): number {
  return toneStep(level(s));
}

/** The light at a level. */
export function toneAtLevel(lvl: number): Tone {
  return TONES[toneStep(lvl)]!;
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return TONES[toneIndex(s)]!;
}
