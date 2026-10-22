import { mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import {
  AWNINGS,
  BARN,
  CLAPBOARD,
  CLOCK_LIT,
  FARM,
  FLAG,
  FRONTS,
  GILT,
  GLASS,
  HEDGEROW,
  MEADOW,
  RIDGE,
  ROOFS,
  SILO,
  SLATE,
  SLOPE,
  STEEL,
  STONE,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TANK,
  TREE,
  TREE_LIT,
  TREE_SHADE,
  TRIM,
  TRUNK,
  WALLS,
  WHEAT,
  WINDOW_LIT,
  WOODS,
} from "./colors";
import { smooth } from "./shapes";

// Height tells the story, as a storybook turns its pages: the light changes with the camera's
// altitude, in tower levels, and every hour is a set of painted colors (the sky's soft
// gradient, the clouds' lit tops and shaded bellies, the town and the country fading row by row
// into the haze). A bright July afternoon over the town square; up over the rooftops into the
// summer sky; a golden evening as the sun sinks behind the far hills; a warm twilight of rose
// and violet with the first stars and the moon, when the first shells go up; the night, a deep
// warm blue, when the fireworks bloom above the rooftops and build to their finale, lighting the
// clouds and the town; then the show ends and the stars have the sky, the smoke drifting off.
// Past that the story loops for as long as you can climb: the night holds a while, a rosy dawn
// brings the sun back up over the hills, and from the afternoon on the day runs exactly as the
// first one did (evening, twilight, the show) into the night again. The light is worked out at
// the camera's exact level whenever it moves (about a hundred color mixes, well under a
// millisecond), so the sun glides and the colors turn by a sliver a step (sun.test.ts).

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const DAY_HIGH = 30;
const AFTERNOON = 14;
const LATE = 29;
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
/** The sun sinks behind the far hills from SUNSET_FROM to SUNSET_TO, down before the first shell goes up. */
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
  /** The sky's gradient, top to the horizon: top, upper, middle, low, and the glow on the horizon. */
  sky: [string, string, string, string, string];
  /** Clouds: shaded belly, body, lit tops. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** The hour's light on lit faces: mixed in by `lit`. */
  sunlight: string;
  lit: number;
  /** How far things sink toward the night (0 by day). */
  dark: number;
}

/** The night's deepest blue: everything mid-distance sinks toward it after dark. */
const NIGHT_SHADOW = "#1c2654";

const DAY: Omit<Key, "at"> = {
  sky: ["#3c7ec3", "#5c9bd5", "#8ebee4", "#c3def0", "#f6e9c9"],
  cloud: ["#b7c7df", "#fbf6ea", "#ffffff"],
  haze: "#c6dbe6",
  sunlight: "#fff4d2",
  lit: 0.18,
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#17225a", "#1e2c6a", "#28397c", "#38488c", "#56559a"],
  cloud: ["#36407c", "#55609c", "#7d89c0"],
  haze: "#44509a",
  sunlight: "#9aa0dc",
  lit: 0.06,
  dark: 0.44,
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
  {
    // The late afternoon: the low sky warms to cream before it turns gold (a blue blended straight into the gold would go grey).
    at: LATE,
    sky: ["#3d78c0", "#6597cf", "#a7c6dd", "#e6e2c8", "#fde5b4"],
    cloud: ["#c4c4d4", "#fdf3e2", "#fffaf0"],
    haze: "#e2dcc4",
    sunlight: "#ffecc0",
    lit: 0.24,
    dark: 0.02,
  },
  {
    at: GOLDEN,
    sky: ["#4a6cad", "#8784b6", "#de9f7e", "#f4bf76", "#fde3a4"],
    cloud: ["#cf9a8a", "#fcdcb8", "#fff4de"],
    haze: "#f0c99a",
    sunlight: "#ffd27e",
    lit: 0.34,
    dark: 0.06,
  },
  {
    at: DUSK,
    sky: ["#2a336e", "#45407e", "#8b4f7d", "#cd6f62", "#f0a46a"],
    cloud: ["#6a5890", "#c09bb0", "#f2c8b4"],
    haze: "#8c6c98",
    sunlight: "#f0a58a",
    lit: 0.16,
    dark: 0.36,
  },
  { at: NIGHT, ...NIGHT_KEY },
];

/**
 * The loop's dawn, in story levels (see storyLevel): the night, then a rose-and-peach dawn with
 * pink-lit clouds as the sun comes up over the hills, then the afternoon.
 */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#3c4e94", "#7a6fae", "#d58ea2", "#f6b48c", "#fde2b0"],
    cloud: ["#b68ab0", "#fcd0c4", "#fff2e4"],
    haze: "#e3b0b4",
    sunlight: "#ffc9a8",
    lit: 0.3,
    dark: 0.14,
  },
  { at: AFTERNOON, ...DAY },
];

/** Three painted steps of a thing: shaded, body, lit. */
export type Steps = [shade: string, body: string, lit: string];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  /** The sky's gradient stops, top to horizon. */
  sky: [string, string, string, string, string];
  /** Clouds: belly, body, lit tops; and the warm rim the sun puts on their tops. */
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The country beyond the town, faded row by row: the far ridge (and its lit crest), the farm hills' fields, the near slopes, hedgerows and woods. */
  ridge: string;
  ridgeLit: string;
  farm: string;
  farmLit: string;
  wheat: string;
  /** The darker rows plowed across the wheat, the road's dust, the shade on the hills' right flanks. */
  wheatRow: string;
  roadway: string;
  hillShade: string;
  hillRim: string;
  meadow: string;
  hedgerow: string;
  slope: string;
  slopeLit: string;
  woods: Steps;
  /** The barn and silo on the far hill, the water tower. */
  barn: string;
  barnShade: string;
  silo: string;
  steel: string;
  tank: string;
  tankShade: string;
  /** The neighborhood beyond Main Street (back row): its trees, roofs, walls, windows. */
  canopyBack: Steps;
  roofsBack: [string, string, string, string];
  wallsBack: [string, string, string, string, string];
  windowBack: string;
  /** The tree-lined streets just behind Main Street (front row): the same, a row nearer. */
  canopyFront: Steps;
  roofsFront: [string, string, string, string];
  roofShadeFront: [string, string, string, string];
  wallsFront: [string, string, string, string, string];
  windowFront: string;
  /** The landmarks: the church's clapboard (lit and shaded), slate (and its shade), gilt, the courthouse's sandstone (lit, body, shade), its clock face, and their windows. */
  clapboard: string;
  clapShade: string;
  slate: string;
  slateShade: string;
  gilt: string;
  giltShade: string;
  stone: string;
  stoneLit: string;
  stoneShade: string;
  clock: string;
  window: string;
  /** The courthouse flag: lit by its floodlight after dark, so it reads as the flag all night; the floodlight's beam (0..1). */
  flagRed: string;
  flagWhite: string;
  flagBlue: string;
  flood: number;
  /** Main Street: the fronts (lit and shaded), trim, awning stripes, shop glass, the fine line round it all. */
  fronts: string[];
  frontsShade: string[];
  trim: string;
  awnings: [string, string, string, string];
  glass: string;
  mainLine: string;
  /** Mid-distance bunting and flags, and the lane's things (and their shaded sides). */
  red: string;
  white: string;
  blue: string;
  gold: string;
  redShade: string;
  whiteShade: string;
  blueShade: string;
  /** The big summer trees on the square's far side: shade, body, lit crown; trunk. */
  tree: Steps;
  trunk: string;
  /** Birds, strings and ropes far off. */
  bird: string;
  /** The hour's sunlight on lit faces (a tint laid over them) and how strong. */
  sunlight: string;
  lit: number;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The sun: how far it has set (0 at its day spot, 1 gone behind the hills), body, shade, halo. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  /** The fireworks show: how many launchers fire (0..1), and the finale (0..1), whose light warms the clouds and the town. */
  show: number;
  finale: number;
  /** The smoke the show leaves drifting (0..1). */
  smoke: number;
  /** How high the summer cumulus tower (1 by day, settled to a low bank under the show by night). */
  towers: number;
  /** Windows lit (0 by day, 1 at night). */
  lamps: number;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night (`night` scales how far). */
function fade(c: string, k: Key, amount: number, night = 1): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark * night);
}

/** A face in the hour's light: faded like `fade`, then warmed by the sunlight. */
function sunlit(c: string, k: Key, amount: number): string {
  return mix(fade(c, k, amount), k.sunlight, k.lit);
}

/** A face in shade: toward a cool violet-blue, then faded. */
function shaded(c: string, k: Key, amount: number, depth = 0.26): string {
  return fade(mix(c, "#3a3f6a", depth), k, amount);
}

function blendKeys(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    sky: [m(a.sky[0], b.sky[0]), m(a.sky[1], b.sky[1]), m(a.sky[2], b.sky[2]), m(a.sky[3], b.sky[3]), m(a.sky[4], b.sky[4])],
    cloud: [m(a.cloud[0], b.cloud[0]), m(a.cloud[1], b.cloud[1]), m(a.cloud[2], b.cloud[2])],
    haze: m(a.haze, b.haze),
    sunlight: m(a.sunlight, b.sunlight),
    lit: a.lit + (b.lit - a.lit) * t,
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

/** How far the town's things fade toward the haze, row by row back from Main Street. */
const MAIN = 0.1;
const FRONT = 0.2;
const BACK = 0.32;
const FARM_FADE = 0.26;
const RIDGE_FADE = 0.42;

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
  towers: number;
}

function steps(c: string, lit: string, shade: string, k: Key, amount: number): Steps {
  return [fade(shade, k, amount), fade(c, k, amount), sunlit(lit, k, amount)];
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  // The windows light through the golden evening's end and are all lit by dusk (and go out at dawn).
  const lamps = smooth(0.15, 0.34, k.dark);
  // The finale's bursts light the low sky rose and violet.
  const glow = l.finale * 0.45;
  const sky: Tone["sky"] = [k.sky[0], k.sky[1], k.sky[2], mix(k.sky[3], "#6a4a8e", glow), mix(k.sky[4], "#9a5a8a", glow)];
  // The courthouse flag: by day a step into the haze; after dark, lit by its floodlight, it keeps its colors.
  const flagFade = (c: string) => mix(mix(c, k.haze, BACK * 0.5), NIGHT_SHADOW, k.dark * 0.25);
  const lit = (c: string, amount: number) => mix(fade(c, k, amount), WINDOW_LIT, lamps * 0.85);
  // The clouds catch the finale's light: rosy bellies, gold-lit tops.
  const cloudShade = mix(k.cloud[0], "#8a5a8e", l.finale * 0.35);
  const cloud = mix(k.cloud[1], "#d79ab0", l.finale * 0.3);
  const cloudLight = mix(k.cloud[2], "#ffe2b4", l.finale * 0.55);
  return {
    sky,
    cloudShade,
    cloud,
    cloudLight,
    ridge: fade(RIDGE, k, RIDGE_FADE),
    ridgeLit: sunlit(mix(RIDGE, "#ffffff", 0.25), k, RIDGE_FADE),
    farm: fade(FARM, k, FARM_FADE),
    farmLit: sunlit(mix(FARM, "#f6f0b0", 0.3), k, FARM_FADE),
    wheat: sunlit(WHEAT, k, FARM_FADE),
    wheatRow: fade(mix(WHEAT, "#a8742e", 0.45), k, FARM_FADE),
    roadway: sunlit("#efdcae", k, FARM_FADE),
    hillShade: mix(mix("#2c4a6a", k.haze, 0.3), NIGHT_SHADOW, k.dark),
    hillRim: mix(mix("#fff4cf", k.sunlight, 0.5), NIGHT_SHADOW, k.dark * 0.8),
    meadow: sunlit(MEADOW, k, FARM_FADE),
    hedgerow: fade(HEDGEROW, k, FARM_FADE - 0.06),
    slope: fade(SLOPE, k, BACK),
    slopeLit: sunlit(mix(SLOPE, "#e8f0a0", 0.3), k, BACK),
    woods: steps(WOODS, TREE_LIT, TREE_SHADE, k, FARM_FADE - 0.04),
    barn: sunlit(BARN, k, FARM_FADE),
    barnShade: shaded(BARN, k, FARM_FADE),
    silo: sunlit(SILO, k, FARM_FADE),
    steel: fade(STEEL, k, BACK),
    tank: sunlit(TANK, k, BACK),
    tankShade: shaded(TANK, k, BACK, 0.3),
    canopyBack: steps(TREE, TREE_LIT, TREE_SHADE, k, BACK),
    roofsBack: [fade(ROOFS[0], k, BACK), fade(ROOFS[1], k, BACK), fade(ROOFS[2], k, BACK), fade(ROOFS[3], k, BACK)],
    wallsBack: [sunlit(WALLS[0], k, BACK), sunlit(WALLS[1], k, BACK), sunlit(WALLS[2], k, BACK), sunlit(WALLS[3], k, BACK), sunlit(WALLS[4], k, BACK)],
    windowBack: lit(mix(GLASS, WALLS[0], 0.2), BACK),
    canopyFront: steps(TREE, TREE_LIT, TREE_SHADE, k, FRONT),
    roofsFront: [sunlit(ROOFS[0], k, FRONT), sunlit(ROOFS[1], k, FRONT), sunlit(ROOFS[2], k, FRONT), sunlit(ROOFS[3], k, FRONT)],
    roofShadeFront: [shaded(ROOFS[0], k, FRONT), shaded(ROOFS[1], k, FRONT), shaded(ROOFS[2], k, FRONT), shaded(ROOFS[3], k, FRONT)],
    wallsFront: [sunlit(WALLS[0], k, FRONT), sunlit(WALLS[1], k, FRONT), sunlit(WALLS[2], k, FRONT), sunlit(WALLS[3], k, FRONT), sunlit(WALLS[4], k, FRONT)],
    windowFront: lit(GLASS, FRONT),
    clapboard: sunlit(CLAPBOARD, k, BACK * 0.7),
    clapShade: shaded(CLAPBOARD, k, BACK * 0.7, 0.2),
    slate: fade(SLATE, k, BACK * 0.7),
    slateShade: shaded(SLATE, k, BACK * 0.7),
    gilt: sunlit(GILT, k, BACK * 0.5),
    giltShade: shaded(GILT, k, BACK * 0.5, 0.32),
    stone: fade(STONE, k, BACK * 0.7),
    stoneLit: sunlit(mix(STONE, "#fff6e0", 0.4), k, BACK * 0.7),
    stoneShade: shaded(STONE, k, BACK * 0.7),
    clock: mix(fade(TRIM, k, BACK * 0.6), CLOCK_LIT, lamps),
    window: lit(mix(GLASS, SLATE, 0.3), BACK * 0.7),
    flagRed: flagFade(FLAG.red),
    flagWhite: flagFade(FLAG.white),
    flagBlue: flagFade(FLAG.blue),
    flood: lamps,
    fronts: FRONTS.map((c) => sunlit(c, k, MAIN)),
    frontsShade: FRONTS.map((c) => shaded(c, k, MAIN)),
    trim: sunlit(TRIM, k, MAIN),
    awnings: [sunlit(AWNINGS[0], k, MAIN), sunlit(AWNINGS[1], k, MAIN), sunlit(AWNINGS[2], k, MAIN), sunlit(AWNINGS[3], k, MAIN)],
    glass: lit(GLASS, MAIN),
    mainLine: fade("#5a3e30", k, MAIN),
    red: sunlit(STRIPE_RED, k, MAIN),
    white: sunlit(STRIPE_WHITE, k, MAIN),
    blue: sunlit(STRIPE_BLUE, k, MAIN),
    gold: sunlit(GILT, k, MAIN),
    redShade: shaded(STRIPE_RED, k, MAIN),
    whiteShade: shaded(STRIPE_WHITE, k, MAIN, 0.2),
    blueShade: shaded(STRIPE_BLUE, k, MAIN),
    tree: steps(TREE, TREE_LIT, TREE_SHADE, k, MAIN),
    trunk: fade(TRUNK, k, MAIN),
    bird: mix(mix(k.sky[1], "#3a2e40", 0.55), NIGHT_SHADOW, k.dark * 0.4),
    sunlight: k.sunlight,
    lit: k.lit,
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#fff0b0", "#ffb25a", warm),
    sunShade: mix("#ffd35a", "#f47c45", warm),
    // The halo is painted solid (a see-through one would let the sky's gradient show through, tearing the sun).
    sunHalo: mix(sky[3], mix("#fff7da", "#ffcf9a", warm), 0.55),
    show: l.show,
    finale: l.finale,
    smoke: l.smoke,
    towers: l.towers,
    lamps,
  };
}

/** The cumulus settle from towers to low banks through the golden evening, before the first shells go up, and build again through the loop's dawn. */
const TOWERS_END = GOLDEN + 6;
const TOWERS_GONE = SHOW_FROM;
const TOWERS_RISE = 10;
/** Over the square the banks lie low along the hills (TOWERS_LOW of their height); they build as you climb into the afternoon. */
const TOWERS_LOW = 0.3;
const TOWERS_BUILD = 24;

/** How high the banks stand on the first day: low over the square, towering by the afternoon, settling through the evening. */
function dayTowers(lvl: number): number {
  return (TOWERS_LOW + (1 - TOWERS_LOW) * smooth(2, TOWERS_BUILD, lvl)) * (1 - smooth(TOWERS_END, TOWERS_GONE, lvl));
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
    towers: dayTowers(lvl),
  };
}

/** The sun comes up through the loop's dawn from RISE_FROM levels into it until the afternoon (about as long as it takes to set). */
const RISE_FROM = 3;
const RISE_TO = DAWN_SPAN;

/**
 * The loop's dawn at a story level from DAWN_FROM (the night) to AFTERNOON: the moon and the
 * stars fade, the last smoke clears, and the sun comes up over the hills amber and pales to its
 * white afternoon self. Its ends match the first day's night and afternoon.
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
    towers: smooth(TOWERS_RISE, DAWN_SPAN, x) * dayTowers(AFTERNOON),
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
