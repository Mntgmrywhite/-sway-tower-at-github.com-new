import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { RAINBOW as BANDS, VERMILION } from "./colors";

// Height tells the story: the weather and the light change with the camera's altitude, in
// tower levels. The sky is one smooth wash, a clear Atlantic blue deep at the top and paling to
// the horizon (never stepped bands), and it changes with the hour. A bright spring morning over
// the green fields and the sea; up into the clouds, where a
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
  /** Clouds: shaded underside, body, lit caps, and their fine contour and curls. */
  cloud: [string, string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#141c4c";

const SPRING: Omit<Key, "at"> = {
  sky: ["#2558bb", "#4584d8", "#8cbfeb", "#cce6f6"],
  cloud: ["#c4d6ee", "#fbfdff", "#ffffff", "#6f8fc0"],
  haze: "#b4d2ee",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#0e1640", "#152059", "#1d2a6d", "#27367c"],
  cloud: ["#333f86", "#525f9c", "#7480bf", "#1c2458"],
  haze: "#273573",
  dark: 0.55,
};

const KEYS: Key[] = [
  { at: 0, ...SPRING },
  { at: MORNING, ...SPRING },
  {
    at: SHOWER,
    sky: ["#5a6c98", "#8292b4", "#adbbd0", "#cfd8e3"],
    cloud: ["#adb8cb", "#e8ecf2", "#f7f8fb", "#66748f"],
    haze: "#bcc7d6",
    dark: 0.03,
  },
  {
    at: CLEAR,
    sky: ["#2254b8", "#4080d6", "#88bbea", "#c8e3f5"],
    cloud: ["#c1d4ee", "#fbfdff", "#ffffff", "#6c8cbe"],
    haze: "#b0cfec",
    dark: 0,
  },
  {
    at: GOLDEN,
    sky: ["#3d58a8", "#9488bf", "#f2b45c", "#fadb9a"],
    cloud: ["#e5aa86", "#ffe2bf", "#fff4e0", "#a8684a"],
    haze: "#efc596",
    dark: 0.08,
  },
  {
    at: DUSK,
    sky: ["#29296c", "#56397f", "#a8557a", "#e0816a"],
    cloud: ["#7a62a6", "#b39fd2", "#d8c8ef", "#47367a"],
    haze: "#8a68aa",
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
    sky: ["#36479a", "#8670b4", "#f19f80", "#f8d5a6"],
    cloud: ["#b689ad", "#ffcdc2", "#fff0e2", "#865877"],
    haze: "#e2a8b2",
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
  /** The clouds' fine contour, and the curls drawn in them. */
  cloudLine: string;
  /** The far range, a lapis haze along the horizon. */
  mountainFar: string;
  /** The holy mountain: its quartzite scree, the sunlit face, the fine contours, and the pilgrims' path. */
  mountain: string;
  mountainLit: string;
  mountainLine: string;
  /** The table mountain: its plateau, the limestone cliff and the shadows in its flutes, the grey talus under it, the green scree slopes and their gullies. */
  tableTop: string;
  tableCliff: string;
  tableFlute: string;
  tableTalus: string;
  tableSlope: string;
  tableGully: string;
  /** Back hills, a faded verdigris. */
  hillBack: string;
  /** The front hills' patchwork of fields (three greens), hedgerows, dry-stone walls (rows of pale dots), fences, and the fine contour along the hills' tops. */
  fields: [string, string, string];
  hedge: string;
  wall: string;
  fence: string;
  hillLine: string;
  /** Far stone: the castle, the round tower, the high cross, the huts and the bridge (body, lit side, shade); slate roofs; dark windows. */
  stone: string;
  stoneLit: string;
  stoneShade: string;
  slate: string;
  window: string;
  /** The Atlantic: deep blue, paler out toward the far shore, the lines of its waves, and the surf. */
  sea: string;
  seaFar: string;
  seaLine: string;
  surf: string;
  /** The sea cliffs: dark layered rock, the lit edges of its strata, the deep shadow at its foot. */
  cliff: string;
  cliffLit: string;
  cliffShade: string;
  /** Yellow lichen on the cliff's ledges; the sand along the bay's shore. */
  lichen: string;
  sand: string;
  /** The hooker at anchor on the bay: its rust-red sails (lit and shaded), its tarred hull, its mast. */
  sail: string;
  sailShade: string;
  hull: string;
  mast: string;
  /** Whitewash far off: the chapel on the holy mountain, the far cottages. */
  white: string;
  /** Sheep far off. */
  sheep: string;
  /** The stream. */
  water: string;
  waterLit: string;
  /** The meadow's far band, as it fades with the light, and the trefoils of dots strewn on it. */
  meadowFar: string;
  meadowDot: string;
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
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), its disc, the triskele in it, its contour, its flat halo and its ring of dots. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunLine: string;
  sunHalo: string;
  sunDots: string;
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
    cloud: [m(a.cloud[0], b.cloud[0]), m(a.cloud[1], b.cloud[1]), m(a.cloud[2], b.cloud[2]), m(a.cloud[3], b.cloud[3])],
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

/** How far each depth fades toward the haze: the fields, the far stone, the sea and its cliffs, the hooker (its rust-red sails kept bright), the table mountain, the holy mountain. */
const HILL = 0.2;
const FAR = 0.3;
const SEA = 0.18;
const BOAT = 0.08;
const TABLE = 0.26;
const PEAKS = 0.32;

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
    cloudLine: k.cloud[3],
    mountainFar: fade("#7896cf", k, 0.55),
    mountain: fade("#7179c0", k, PEAKS),
    mountainLit: fade("#b3b9ea", k, PEAKS),
    mountainLine: fade("#3d4389", k, PEAKS),
    tableTop: fade("#4f8a52", k, TABLE),
    tableCliff: fade("#e2dbe0", k, TABLE),
    tableFlute: fade("#8c84a8", k, TABLE),
    tableTalus: fade("#8fa889", k, TABLE),
    tableSlope: fade("#5aa65a", k, TABLE),
    tableGully: fade("#3f7c4f", k, TABLE),
    hillBack: fade("#4fa77a", k, 0.36),
    fields: [fade("#5fbf3a", k, HILL), fade("#94d64e", k, HILL), fade("#3aa23c", k, HILL)],
    hedge: fade("#25703a", k, HILL),
    wall: fade("#f6f0dc", k, HILL),
    fence: fade("#6a5a48", k, HILL),
    hillLine: fade("#1d5631", k, HILL),
    stone: fade("#a69e92", k, FAR),
    stoneLit: fade("#e2dccd", k, FAR),
    stoneShade: fade("#6a6470", k, FAR),
    slate: fade("#45506e", k, FAR),
    window: fade("#262535", k, FAR),
    sea: fade("#1a50aa", k, SEA),
    seaFar: fade("#3f84d4", k, SEA),
    seaLine: fade("#9fcdf3", k, SEA),
    surf: fade("#ffffff", k, SEA),
    cliff: fade("#4b3d3b", k, SEA),
    cliffLit: fade("#8a7666", k, SEA),
    cliffShade: fade("#2b2329", k, SEA),
    lichen: fade("#e8c440", k, SEA),
    sand: fade("#d9d6a2", k, SEA),
    sail: fade("#c4562a", k, BOAT),
    sailShade: fade("#983c1f", k, BOAT),
    hull: fade("#2b2630", k, BOAT),
    mast: fade("#5a4434", k, BOAT),
    white: fade("#fbfbf6", k, 0.3),
    sheep: fade("#ffffff", k, 0.12),
    water: fade("#2f7fd8", k, 0.24),
    waterLit: fade("#b6daf6", k, 0.24),
    meadowFar: fade("#86cc56", k, 0.08),
    meadowDot: fade("#6cb84a", k, 0.08),
    rain: wet,
    drop: mix(k.cloud[2], "#9fc4ea", 0.35),
    rainbow: l.bow,
    bands: [fade(BANDS[0], k, 0.22), fade(BANDS[1], k, 0.22), fade(BANDS[2], k, 0.22), fade(BANDS[3], k, 0.22), fade(BANDS[4], k, 0.22), fade(BANDS[5], k, 0.22)],
    bird: mix(k.sky[1], "#2a1c2a", 0.55),
    swan: mix(mix("#ffffff", "#ffd9b0", warm * 0.6), NIGHT_SHADOW, k.dark * 0.5),
    stars: l.stars,
    moon: l.moon,
    morningStar: l.morningStar,
    sunSet: l.sunSet,
    // In the shower the sun pales behind thin cloud; in the evening (and at dawn) it warms to amber.
    sunBody: mix(mix("#f8cd3e", "#ff9a52", warm), "#fbf0d2", wet * 0.5),
    sunShade: mix(mix("#e39a22", "#d9572e", warm), "#e6cf9e", wet * 0.5),
    sunLine: mix(mix("#a8661c", "#9a3a22", warm), "#b8a888", wet * 0.5),
    sunHalo: alpha(mix("#fff3c4", "#ffc49a", warm), 0.3 * (1 - wet * 0.6)),
    sunDots: mix(mix(VERMILION, "#c2304a", warm), "#c9a89a", wet * 0.6),
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
