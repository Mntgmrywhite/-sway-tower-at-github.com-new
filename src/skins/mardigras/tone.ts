import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { clearOfBars } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels. A
// golden Carnival afternoon over the Quarter, the sky violet overhead and gold on the river;
// climb, and the sun goes down over the river in orange and rose while a floor of cloud gathers
// below you and covers the city (only the cathedral's spires, the towers downtown and the
// bridge's peaks stand out of it); dusk falls from the top of the sky down over a rose
// afterglow as the windows and the lanterns come on; the night parade, the clouds lit from
// beneath by the flambeaux and fireworks bursting over the river; then a calm, starry midnight.
// Past that the story loops for as long as you can climb: the night holds a while, a dawn mist
// rolls over the cloud floor in rose and lavender, the sun comes up where it set, and from the
// golden afternoon on the day runs exactly as the first one did. Every color that changes with
// the light is precomputed here in half-level steps, so drawing never mixes colors per frame.
//
// The night is a deep midnight indigo and its clouds a moonlit silver-blue, never the violets
// of the bars: the purple bars (and the plum ink round every bar) would sink into a violet
// night. Behind the tower, the sky and the cloud floor keep out of the band of tones the purple
// bars and their ink outline both vanish into (colors.ts, CLEAR) at every height: the lit sky
// (day, sunset, the afterglow, the dawn) and the clouds stay lighter than it, the night sky
// darker, and at dusk the night comes down over the lit sky from the top of the screen with a
// narrow soft edge (sky.ts) instead of fading through it; at dawn it lifts the same way. The
// Carnival colors live in the props and the lights.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
export const AFTERNOON = 10;
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
  /** The lit sky's gradient (where the night has not come over it): top, middle, the glow band low in the sky, and the bottom. */
  sky: [string, string, string, string];
  /** Clouds: shaded underside, body, lit caps. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
  /** What the lane's drifting things fade toward with distance. */
  lane: string;
}

/** What mid-distance things sink toward by night: midnight, so the cathedral's spires stand dark behind the tower's lowest bars. */
const NIGHT_SHADOW = "#0a0e30";
/** How far the lane's drifting things fade at most (tone.fade): they keep their colors by night. */
const LANE_DARK = 0.55;

/** The afternoon: violet overhead, lilac, then gold low over the river. */
const DAY: Omit<Key, "at"> = {
  sky: ["#5f6ad8", "#a597ee", "#ffcf8a", "#ffe8b4"],
  cloud: ["#cdb2ea", "#fff1e4", "#ffffff"],
  haze: "#efd2e2",
  dark: 0,
  lane: "#cdb2ea",
};

/** The afterglow the night comes down over at dusk: rose and coral low down, a peach glow on the clouds. */
const AFTERGLOW: Key["sky"] = ["#6a50b0", "#c066a6", "#f2869a", "#ffb48e"];

/**
 * The night sky, as it comes down over the lit one (sky.ts): deep indigo overhead to a midnight
 * blue low down, all of it darker than the purple bars (colors.ts, CLEAR).
 */
export const NIGHT_SKY = ["#0b0a2e", "#0c1240", "#0e184a", "#101d50"] as const;
/** The blue hour: a band of lavender-blue just under the night's edge as it comes down (and lifts). */
export const BLUE_HOUR_SKY = "#8e86d8";

/**
 * Midnight: the night sky has come all the way down (the lit sky under it is the afterglow,
 * unseen), the clouds silver-blue under the moon.
 */
const NIGHT_KEY: Omit<Key, "at"> = {
  sky: AFTERGLOW,
  cloud: ["#5664b4", "#8a97d8", "#c8d1f4"],
  haze: "#141a48",
  dark: 0.82,
  lane: "#232a66",
};

const KEYS: Key[] = [
  { at: 0, ...DAY },
  { at: AFTERNOON, ...DAY },
  {
    at: SUNSET,
    sky: ["#6458b4", "#b0609e", "#ff8a4a", "#ffc46a"],
    cloud: ["#b07aa4", "#ffc9a0", "#fff0d0"],
    haze: "#f0a070",
    dark: 0.1,
    lane: "#b07aa4",
  },
  {
    // The sun is down: the night comes over the top of the sky, a rose afterglow lingers below it.
    at: DUSK,
    sky: AFTERGLOW,
    cloud: ["#a06aa8", "#e2a6c4", "#fbdce6"],
    haze: "#7a5a9e",
    dark: 0.4,
    lane: "#5a4592",
  },
  { at: NIGHT, ...NIGHT_KEY },
  { at: DEEP, ...NIGHT_KEY },
];

/** The loop's dawn, in story levels (see storyLevel): the night, then a rose-and-lavender dawn with a mist over the clouds, then the day. */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
/** The dawn's lit sky, under the night as it lifts: lavender overhead, rose and cream low down. */
const DAWN_SKY: Key["sky"] = ["#5a5cb4", "#a08ac8", "#ffb8a8", "#ffe2cc"];
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY, sky: DAWN_SKY },
  {
    at: DAWN_PEAK,
    sky: DAWN_SKY,
    cloud: ["#c49cc0", "#ffe0dc", "#fff6f0"],
    haze: "#e6b6c8",
    dark: 0.16,
    lane: "#c49cc0",
  },
  { at: AFTERNOON, ...DAY },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  /** The lit sky's gradient, and how far down the screen the night sky has come over it (a fraction of the screen's height: under 0 none of it, over 1 all). */
  sky: [string, string, string, string];
  night: number;
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  /** The far bank across the river, its wharf and the bridge's truss. */
  farBank: string;
  bridge: string;
  /** The towers downtown, far off: their body, their sunlit side, and their lit windows by night. */
  tower: string;
  towerLit: string;
  /** The river and its glints. */
  river: string;
  riverLit: string;
  /** The cathedral and the square's buildings: body, lit side, shade. */
  stone: string;
  stoneLit: string;
  stoneShade: string;
  /** Spire roofs and the far street's rails. */
  slate: string;
  /** The rooftops of the Quarter stepping back: the far row, the near row, and the near row's lit roofs. */
  roofFar: string;
  roofMid: string;
  roofMidLit: string;
  /** The near row's walls, in four faded pastels. */
  walls: readonly [string, string, string, string];
  /** The live oaks. */
  oak: string;
  /** The square (square.ts): its paving, lawns, trees (body and lit crown) and the brick rows down its sides. */
  plaza: string;
  /** The garden's paths, a soft step from the lawn. */
  path: string;
  lawn: string;
  tree: string;
  treeLit: string;
  brick: string;
  /** The riverboat: white decks and its red trim. */
  boat: string;
  boatTrim: string;
  /** The streetcar's red and cream. */
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
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, flat halo, the bead ring round it. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  sunRing: string;
  /**
   * The night parade: fireworks over the river in the left lane (0..1), the right lane's show
   * over the King Gator (0..1), how far the show has built toward its finale (0..1: more shells,
   * more kinds), and the flambeaux's glow under the clouds (0..1).
   */
  fireworks: number;
  rightShow: number;
  finale: number;
  flambeau: number;
  /** The cloud floor's puffs at the sides lit warm by the flambeaux: body and cap. */
  flamCloud: string;
  flamLight: string;
  /** The dawn mist rolling over the cloud floor (0..1), and its color. */
  mist: number;
  mistColor: string;
  /** Lane things far off: they keep their own colors, faded this much toward `laneShade`. */
  fade: number;
  laneShade: string;
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
    lane: m(a.lane, b.lane),
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

/** How far each depth fades toward the haze: the far bank and the towers, the cathedral, the rooftops, the square. */
const FARTHEST = 0.66;
const FAR = 0.5;
const ROOFS = 0.3;
const MID = 0.34;

/** What the light does, apart from its colors. */
interface Light {
  night: number;
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the white-gold afternoon sun, 1 for the amber of evening and dawn. */
  warm: number;
  lit: number;
  fireworks: number;
  rightShow: number;
  finale: number;
  flambeau: number;
  mist: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm } = l;
  const roof = (c: string) => fade(c, k, ROOFS);
  /** The city hazes over a little as the evening comes on. */
  const eve = warm * 0.28;
  return {
    sky: k.sky,
    night: l.night,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    farBank: fade("#8a74b0", k, FARTHEST),
    bridge: fade("#5a4a8e", k, FARTHEST - 0.18),
    // The cathedral and the tower downtown stand behind the tower's lowest bars once the cloud
    // floor has covered the city: like the sky, they keep out of the band the purple bars sink into.
    tower: clearOfBars(fade("#7b78c4", k, FARTHEST - 0.22 + eve)),
    towerLit: clearOfBars(fade("#d6d0f6", k, FARTHEST - 0.3 + eve)),
    river: mix(fade("#4f86dc", k, 0.3), k.sky[2], warm * 0.5),
    riverLit: mix(fade("#c6e2fa", k, 0.3), k.sky[2], 0.4),
    stone: clearOfBars(fade("#f6eadc", k, FAR - 0.16 + eve)),
    stoneLit: clearOfBars(fade("#fffaf2", k, FAR - 0.2 + eve)),
    stoneShade: clearOfBars(fade("#cdbfe0", k, FAR - 0.12 + eve)),
    slate: clearOfBars(fade("#5a6098", k, FAR - 0.1 + eve)),
    roofFar: fade("#9575c4", k, FAR - 0.1),
    roofMid: roof("#6f5fa6"),
    roofMidLit: roof("#a596d6"),
    walls: [roof("#ff9fbf"), roof("#c4a0f2"), roof("#9fe3c3"), roof("#ffd66e")],
    oak: fade("#3f8a52", k, FAR),
    plaza: fade("#e2d2c0", k, 0.42),
    path: mix(fade("#e2d2c0", k, 0.42), fade("#7cc98a", k, MID), 0.62),
    lawn: fade("#7cc98a", k, MID),
    tree: fade("#3f9a54", k, MID),
    treeLit: fade("#79c977", k, MID),
    brick: fade("#d9675c", k, MID),
    boat: fade("#fbf7ef", k, MID),
    boatTrim: fade("#d6484e", k, MID),
    tram: fade("#c8463c", k, MID),
    tramLit: fade("#f4ecc8", k, MID),
    smoke: fade("#ece6f2", k, 0.4),
    lit: l.lit,
    glow: mix("#ffd67a", "#ffb84a", l.lit * 0.3),
    stars: l.stars,
    moon: l.moon,
    sunSet: l.sunSet,
    sunBody: mix("#ffe26a", "#ff9a52", warm),
    sunShade: mix("#ffbf3a", "#f4703f", warm),
    sunHalo: alpha(mix("#fff6c0", "#ffc49a", warm), 0.3),
    sunRing: mix("#fff3c4", "#ffd0a0", warm),
    fireworks: l.fireworks,
    rightShow: l.rightShow,
    finale: l.finale,
    flambeau: l.flambeau,
    flamCloud: mix(k.cloud[1], "#ff9a6a", 0.62),
    flamLight: mix(k.cloud[2], "#ffd29a", 0.74),
    mist: l.mist,
    mistColor: mix(k.cloud[2], "#ffd8e4", 0.4),
    fade: 0.3 + Math.min(k.dark, LANE_DARK) * 0.5,
    laneShade: k.lane,
  };
}

/**
 * Nightfall: the night sky's edge comes down from just above the top of the screen to just below
 * its bottom (NIGHT_OVER past either) as the camera climbs from NIGHTFALL to NIGHT_DOWN, after the
 * sun has begun to set and before the stars are all out; at the loop's dawn it lifts again (story
 * levels from DAWN_FROM, over the first NIGHT_LIFT of them), before the sun comes up.
 */
const NIGHTFALL = 31;
const NIGHT_DOWN = 64;
const NIGHT_LIFT = [1, 21] as const;
const NIGHT_OVER = 0.12;

/**
 * The moon hangs a quarter of the way down the screen (sky.ts): the night's edge comes down past
 * it at about level 42 and lifts past it about 14 levels into the dawn. It is all the way out by
 * MOON_FULL, and it fades over MOON_GOES (levels into the dawn), once the night has lifted off it.
 */
const MOON_FULL = 43.5;
const MOON_GOES = [14, 19] as const;

function nightEdge(k: number): number {
  return -NIGHT_OVER + (1 + NIGHT_OVER * 2) * k;
}

/** The first day's tone at a level (its night holds past DEEP). */
function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), {
    night: nightEdge(smooth(NIGHTFALL, NIGHT_DOWN, lvl)),
    stars: smooth(DUSK - 6, NIGHT - 2, lvl),
    // The moon comes out on the lit dusk sky as the sun goes down, and is all there by the time
    // the night's edge comes down past it (MOON_FULL): never a faint grey disc on the dark night.
    moon: smooth(DUSK - 15, MOON_FULL, lvl),
    sunSet: smooth(SUNSET - 6, DUSK - 8, lvl),
    warm: smooth(SUNSET - 16, SUNSET + 2, lvl),
    lit: smooth(SUNSET - 2, DUSK, lvl),
    fireworks: smooth(DUSK + 2, DUSK + 10, lvl) * (1 - smooth(DEEP - 10, DEEP - 2, lvl)),
    rightShow: smooth(DUSK + 3, DUSK + 9, lvl) * (1 - smooth(DEEP - 10, DEEP - 2, lvl)),
    finale: smooth(DUSK + 8, DEEP - 12, lvl) * (1 - smooth(DEEP - 4, DEEP + 4, lvl)),
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
    night: nightEdge(1 - smooth(NIGHT_LIFT[0], NIGHT_LIFT[1], x)),
    stars: 1 - smooth(3, 14, x),
    // The moon stays bright while the night is behind it, and fades only once the night has
    // lifted past it (MOON_GOES), on the dawn sky: never a faint grey disc on the dark night.
    moon: 1 - smooth(MOON_GOES[0], MOON_GOES[1], x),
    sunSet: 1 - smooth(9, DAWN_SPAN - 5, x),
    warm: 1 - smooth(16, DAWN_SPAN, x),
    lit: 1 - smooth(8, 20, x),
    fireworks: 0,
    rightShow: 0,
    finale: 0,
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
