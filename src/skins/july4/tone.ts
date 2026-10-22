import { mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import {
  AWNING,
  BRICK,
  BRICK_BLUE,
  BRICK_CREAM,
  BRICK_SAGE,
  BRICK_TAN,
  CLAPBOARD,
  CLOCK_LIT,
  DOT_INK,
  FAR_RANGE,
  FAR_TOWN,
  FIELD,
  FLAG,
  FURROW,
  GILT,
  HEDGEROW,
  HILL,
  RAY_CREAM,
  RAY_RED,
  RIDGE,
  ROOF_TOP,
  ROOF_WALL,
  SLATE,
  STEEL,
  STONE,
  STRIPE_BLUE,
  STRIPE_RED,
  STRIPE_WHITE,
  TANK,
  TREE,
  TREE_LIT,
  TREE_SHADE,
  TRUNK,
  WINDOW,
  WHEAT,
  WINDOW_LIT,
  WOODS,
} from "./colors";
import { smooth } from "./shapes";

// Height tells the story: the light changes with the camera's altitude, in tower levels, and
// every hour is a set of flat poster inks (the sky's five bands, the sunburst's rays, the
// clouds, the town and the country fading row by row into the haze). A bright sunny afternoon
// over the town square; up into a summer cumulus floor that covers the town, the cumulus
// towering out of it by day; a golden barbecue evening as the sun sinks into the clouds and the
// towers settle; a rose-and-violet dusk whose sunburst is printed as the flag's red and cream
// stripes, with the first stars and the moon, when the first shells go up; the night, when the
// burst is gone and the big fireworks show fills both sides of the sky, printed Pop Art over
// Ben-Day dots, and builds to its finale, lighting the cloud floor; then the show ends and the
// stars have the sky, with the smoke drifting off. Past that the story loops for as long as you
// can climb: the night holds a while, a peach dawn brings the sun back
// up out of the clouds, and from the afternoon on the day runs exactly as the first one did
// (evening, dusk, the show) into the night again. The light is worked out at the camera's exact
// level whenever it moves (about sixty color mixes, well under a millisecond): a table in
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
  /** The sky's flat bands, as a screen print lays them: top, upper, middle, low, and the glow on the horizon. */
  sky: [string, string, string, string, string];
  /** How far the sunburst's rays step from each band's ink toward the next band's (0..1)... */
  rays: number;
  /** ...and then how far toward the hour's burst ink (the paper by day, gold in the evening): how bold the burst prints. */
  burst: number;
  burstInk: string;
  /** Clouds: shaded underside, body, lit caps. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#121a44";
/** The paper the poster is printed on: the day's rays step toward it. */
const PAPER = "#fff8ea";

const DAY: Omit<Key, "at"> = {
  sky: ["#2a5fab", "#4682c5", "#6ca4d8", "#a0cae6", "#f4e2b6"],
  rays: 0.9,
  burst: 0.58,
  burstInk: PAPER,
  cloud: ["#a9c1da", "#f6eedb", "#fffaf0"],
  haze: "#b5d3e6",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#0f1640", "#141d50", "#19255e", "#1f2e6c", "#2a3b7e"],
  rays: 0,
  burst: 0,
  burstInk: PAPER,
  cloud: ["#28336f", "#45528f", "#6a79b4"],
  haze: "#263472",
  dark: 0.58,
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
  {
    at: GOLDEN,
    sky: ["#33569e", "#6a74b0", "#d6866a", "#f0a94a", "#f8d68c"],
    rays: 0.85,
    burst: 0.32,
    burstInk: "#ffd27a",
    cloud: ["#d79a78", "#fadcb4", "#fff3dc"],
    haze: "#eec493",
    dark: 0.08,
  },
  {
    at: DUSK,
    sky: ["#1f2667", "#3b3584", "#7e3f7f", "#c6505a", "#ee8c55"],
    rays: 0.8,
    burst: 0.14,
    burstInk: "#ffc59a",
    cloud: ["#674f9c", "#ad91cb", "#d6c0ea"],
    haze: "#86649f",
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
    sky: ["#33478f", "#6a63a8", "#b9779c", "#f19b80", "#fad7a0"],
    rays: 0.85,
    burst: 0.3,
    burstInk: "#ffe0bc",
    cloud: ["#b588ab", "#fccbbf", "#fff0e2"],
    haze: "#e2a6ae",
    dark: 0.16,
  },
  { at: AFTERNOON, ...DAY },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  /** The sky's flat bands, top to horizon. */
  sky: [string, string, string, string, string];
  /** The sunburst's ink over each band: its rays, and the lanes between them (the band itself but at dusk). */
  rays: [string, string, string, string, string];
  gaps: [string, string, string, string, string];
  /** How far the dusk prints the burst as the flag's red and cream stripes (0..1): the lanes between the rays are only printed while it does. */
  stripe: number;
  /** Whether the burst prints at all (0 in the night, when its rays are the bands' own inks: nothing to draw). */
  burst: number;
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The country beyond the town, faded row by row: the far range and the ridge (lit faces and shaded), the far town (and its shade), the farm hills' field, wheat and furrows and their hedgerows, the near hill, its woods and the park's trees. */
  farRange: string;
  farRangeShade: string;
  ridge: string;
  ridgeShade: string;
  farTown: string;
  farTownShade: string;
  field: string;
  wheat: string;
  furrow: string;
  hedgerow: string;
  hill: string;
  treeFar: string;
  woods: string;
  /** The water tower: its steel, its tank (lit, and its shadow plane), and its cap (lit and shaded). */
  steel: string;
  tank: string;
  tankDark: string;
  tankShade: string;
  capShade: string;
  /** The rooftops behind Main Street, two rows: walls and their shadow planes, roofs, and the near row's windows. */
  roofBack: string;
  roofBackShade: string;
  roofBackTop: string;
  roofFar: string;
  roofFarShade: string;
  roofFarTop: string;
  roofWindow: string;
  /** Main Street: brick in five tones and their shadow planes, stone (lit and shaded), clapboard, slate roofs and their shade, gilt and its shade, windows (lit at dusk), trim, awnings. */
  brick: string;
  tan: string;
  cream: string;
  sage: string;
  blueWall: string;
  wallShade: [string, string, string, string, string];
  stone: string;
  stoneLit: string;
  stoneShade: string;
  clapboard: string;
  clapShade: string;
  slate: string;
  slateShade: string;
  gilt: string;
  giltShade: string;
  window: string;
  trim: string;
  awnings: [string, string, string];
  /** The center block behind the tower, printed faint: its wall and its windows. */
  quiet: string;
  quietWindow: string;
  /** Bunting on the far buildings, and the lane's things (and their shaded sides); a row further back, the far bunting and the tank's paint. */
  red: string;
  white: string;
  blue: string;
  redShade: string;
  whiteShade: string;
  blueShade: string;
  farRed: string;
  farWhite: string;
  farBlue: string;
  /** The courthouse flag: lit by its floodlight after dark, so it reads as the flag all night. */
  flagRed: string;
  flagWhite: string;
  flagBlue: string;
  /** The floodlight's beam up the flagpole after dark (0..1). */
  flood: number;
  /** The big summer trees on the square's far side: canopy, its lit crown, its shade, trunk. */
  tree: string;
  treeLit: string;
  treeShade: string;
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
  /** The fireworks show: how many launchers fire (0..1), and the finale (0..1), whose bursts light the sky's low bands and the cloud floor. */
  show: number;
  finale: number;
  /** The show's night printed Pop Art: how big the halftone dots in the lanes are (0..1), and their ink. */
  dots: number;
  dot: string;
  /** The smoke the show leaves drifting (0..1). */
  smoke: number;
  /** How high the summer cumulus tower over the cloud sea (1 by day, 0 by night, when they settle to low banks and leave the sky to the show). */
  towers: number;
  /** The cloud floor's body and lit caps, warmed by the finale's bursts (the cloud colors otherwise). */
  floorCloud: string;
  floorCap: string;
}

/** A color's shadow plane: the poster's navy printed thin over it (opaque, so it costs what a plain fill does). */
function shade(c: string): string {
  return mix(c, "#141c42", 0.24);
}

/** Mid-distance color: faded toward the haze, then sunk toward the night (`night` scales how far). */
function fade(c: string, k: Key, amount: number, night = 1): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark * night);
}

function blendKeys(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    sky: [m(a.sky[0], b.sky[0]), m(a.sky[1], b.sky[1]), m(a.sky[2], b.sky[2]), m(a.sky[3], b.sky[3]), m(a.sky[4], b.sky[4])],
    rays: a.rays + (b.rays - a.rays) * t,
    burst: a.burst + (b.burst - a.burst) * t,
    burstInk: m(a.burstInk, b.burstInk),
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

/** How far the town's things fade toward the haze, row by row back from Main Street; the center block behind the tower much further. */
const ROW = 0.14;
const BACK = 0.24;
const FAR = 0.34;
const FARM_FADE = 0.4;
const TOWN_FADE = 0.5;
const RIDGE_FADE = 0.56;
const RANGE_FADE = 0.7;
const QUIET = 0.5;

/** The lanes between the sunburst's rays print as the flag's cream stripes only once the stripes are this strong (sky.ts). */
export const STRIPE_LANES = 0.45;

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
  stripe: number;
  towers: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  const lit = smooth(0.2, 0.45, k.dark);
  const sil = smooth(0.25, 0.55, k.dark);
  const glow = l.finale * 0.5;
  // The finale's bursts light the low bands rose and violet.
  const sky: Tone["sky"] = [k.sky[0], k.sky[1], k.sky[2], mix(k.sky[3], "#5e3a86", glow), mix(k.sky[4], "#8a4a86", glow)];
  const ray = (i: number, next: string) => mix(mix(mix(sky[i]!, next, k.rays), k.burstInk, k.burst), RAY_RED, l.stripe * 0.78);
  // The lanes print cream only near the stripes' height (their panel's edge would show as a pale bar while they come and go).
  const gap = (i: number) => mix(sky[i]!, RAY_CREAM, smooth(STRIPE_LANES, 1, l.stripe) * 0.62);
  // The courthouse flag: by day as the far bunting; after dark, lit by its floodlight, it keeps its colors.
  const flagFade = (c: string) => mix(mix(c, k.haze, ROW * 0.6), NIGHT_SHADOW, k.dark * 0.28);
  return {
    sky,
    rays: [ray(0, sky[1]), ray(1, sky[2]), ray(2, sky[3]), ray(3, sky[4]), ray(4, mix(sky[4], PAPER, 0.6 * (1 - k.dark)))],
    gaps: [gap(0), gap(1), gap(2), gap(3), gap(4)],
    stripe: l.stripe,
    burst: Math.max(k.rays, k.burst, l.stripe),
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    farRange: fade(FAR_RANGE, k, RANGE_FADE),
    farRangeShade: fade(mix(FAR_RANGE, SLATE, 0.22), k, RANGE_FADE),
    ridge: fade(RIDGE, k, RIDGE_FADE),
    ridgeShade: fade(mix(RIDGE, SLATE, 0.3), k, RIDGE_FADE),
    farTown: fade(FAR_TOWN, k, TOWN_FADE),
    farTownShade: fade(mix(FAR_TOWN, SLATE, 0.28), k, TOWN_FADE),
    field: fade(FIELD, k, FARM_FADE),
    wheat: fade(WHEAT, k, FARM_FADE),
    furrow: fade(FURROW, k, FARM_FADE),
    hedgerow: fade(HEDGEROW, k, FARM_FADE - 0.04),
    hill: fade(HILL, k, 0.26),
    treeFar: fade("#4e8f52", k, 0.24),
    woods: fade(WOODS, k, 0.3),
    steel: fade(STEEL, k, BACK),
    tank: fade(TANK, k, BACK),
    tankDark: fade(shade(TANK), k, BACK),
    tankShade: fade(mix(TANK, SLATE, 0.3), k, BACK),
    capShade: fade(shade(mix(TANK, SLATE, 0.3)), k, BACK),
    roofBack: fade(ROOF_WALL, k, BACK),
    roofBackShade: fade(shade(ROOF_WALL), k, BACK),
    roofBackTop: fade(ROOF_TOP, k, BACK),
    roofFar: fade(mix(ROOF_WALL, HILL, 0.25), k, FAR),
    roofFarShade: fade(shade(mix(ROOF_WALL, HILL, 0.25)), k, FAR),
    roofFarTop: fade(ROOF_TOP, k, FAR),
    roofWindow: mix(fade(mix(WINDOW, ROOF_WALL, 0.3), k, BACK), WINDOW_LIT, lit * 0.8),
    brick: fade(BRICK, k, ROW),
    tan: fade(BRICK_TAN, k, ROW),
    cream: fade(BRICK_CREAM, k, ROW),
    sage: fade(BRICK_SAGE, k, ROW),
    blueWall: fade(BRICK_BLUE, k, ROW),
    wallShade: [fade(shade(BRICK), k, ROW), fade(shade(BRICK_TAN), k, ROW), fade(shade(BRICK_CREAM), k, ROW), fade(shade(BRICK_SAGE), k, ROW), fade(shade(BRICK_BLUE), k, ROW)],
    // From dusk the steeple and the courthouse tower standing out of the cloud sea are printed as
    // the poster's skyline silhouettes: one dark ink (a trace of the lit side left), their windows
    // and the clock face lit.
    stone: mix(fade(STONE, k, ROW, 0.65), NIGHT_SHADOW, sil * 0.9),
    stoneLit: mix(fade(mix(STONE, PAPER, 0.45), k, ROW, 0.65), NIGHT_SHADOW, sil * 0.84),
    stoneShade: mix(fade(mix(STONE, SLATE, 0.32), k, ROW, 0.65), NIGHT_SHADOW, sil * 0.94),
    clapboard: mix(fade(CLAPBOARD, k, ROW, 0.65), NIGHT_SHADOW, sil * 0.86),
    clapShade: mix(fade(mix(CLAPBOARD, SLATE, 0.25), k, ROW, 0.65), NIGHT_SHADOW, sil * 0.94),
    slate: mix(fade(SLATE, k, ROW), NIGHT_SHADOW, sil * 0.6),
    slateShade: mix(fade(shade(SLATE), k, ROW), NIGHT_SHADOW, sil * 0.6),
    gilt: mix(fade(GILT, k, ROW * 0.6), "#7a5a2a", sil * 0.55),
    giltShade: mix(fade(shade(GILT), k, ROW * 0.6), "#5e4420", sil * 0.55),
    window: mix(fade(WINDOW, k, ROW), WINDOW_LIT, lit),
    trim: mix(fade(STRIPE_WHITE, k, ROW), CLOCK_LIT, lit * 0.8),
    awnings: [fade(AWNING[0], k, ROW), fade(AWNING[1], k, ROW), fade(AWNING[2], k, ROW)],
    quiet: fade(BRICK_CREAM, k, QUIET),
    quietWindow: mix(fade(WINDOW, k, QUIET + 0.1), WINDOW_LIT, lit * 0.5),
    red: fade(STRIPE_RED, k, ROW * 0.8),
    white: fade(STRIPE_WHITE, k, ROW * 0.8),
    blue: fade(STRIPE_BLUE, k, ROW * 0.8),
    redShade: fade(shade(STRIPE_RED), k, ROW * 0.8),
    whiteShade: fade(shade(STRIPE_WHITE), k, ROW * 0.8),
    blueShade: fade(shade(STRIPE_BLUE), k, ROW * 0.8),
    farRed: fade(STRIPE_RED, k, BACK),
    farWhite: fade(STRIPE_WHITE, k, BACK),
    farBlue: fade(STRIPE_BLUE, k, BACK),
    flagRed: flagFade(FLAG.red),
    flagWhite: flagFade(FLAG.white),
    flagBlue: flagFade(FLAG.blue),
    flood: lit,
    tree: fade(TREE, k, 0.3),
    treeLit: fade(TREE_LIT, k, 0.3),
    treeShade: fade(TREE_SHADE, k, 0.3),
    trunk: fade(TRUNK, k, 0.3),
    lawnFar: fade("#8fc46a", k, 0.1),
    bird: mix(k.sky[1], NIGHT_SHADOW, 0.55),
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#ffd24a", "#ff9a4c", warm),
    sunShade: mix("#f6b52e", "#ef6c3c", warm),
    // The halo is printed solid (a see-through one let the bands and rays show across it, tearing the sun).
    sunHalo: mix(sky[4], mix("#fff4c4", "#ffc496", warm), 0.5),
    show: l.show,
    finale: l.finale,
    // The halftone dots come and go with the show.
    dots: l.show,
    dot: mix(k.sky[3], DOT_INK, 0.62),
    smoke: l.smoke,
    towers: l.towers,
    floorCloud: mix(k.cloud[1], "#c98a9c", l.finale * 0.4),
    floorCap: mix(k.cloud[2], "#ffe2b4", l.finale * 0.65),
  };
}

/** The flag-stripe burst: it comes up as the golden evening turns to dusk and gives way to the night's dots. */
const STRIPE_FROM = GOLDEN + 2;
const STRIPE_FULL = DUSK - 6;
const STRIPE_END = SHOW_FULL - 2;
const STRIPE_GONE = NIGHT - 4;

/** The cumulus settle from towers to low banks through the golden evening, before the first shells go up, and build again through the loop's dawn. */
const TOWERS_END = GOLDEN + 6;
const TOWERS_GONE = SHOW_FROM;
const TOWERS_RISE = 10;

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
    stripe: smooth(STRIPE_FROM, STRIPE_FULL, lvl) * (1 - smooth(STRIPE_END, STRIPE_GONE, lvl)),
    towers: 1 - smooth(TOWERS_END, TOWERS_GONE, lvl),
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
    stripe: 0,
    towers: smooth(TOWERS_RISE, DAWN_SPAN, x),
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
