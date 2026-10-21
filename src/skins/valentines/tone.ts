import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";

// Height tells the story: the light changes with the camera's altitude, in tower levels, the way
// the hours change on a run of Art Nouveau panels. A golden afternoon over the boulevard in the
// muted, elegant colors of an 1890s Paris poster (a mauve sky warming to gold at the horizon,
// dusty rose, sage and parchment); up into the dreamier Rococo pastels of the climb: a rose-and-
// lavender dusk as the sun sinks into the cloud sea gathering below you and the string lights and
// stained glass come on; then a violet starry night with a crescent moon where the sun set and
// the Ferris wheel lit far off. Past that the story loops for as long as you can climb: the
// night holds a while, a blush-and-mint dawn brings the sun back up out of the clouds and puts the
// lights out, and from the golden afternoon on the day runs exactly as the first one did (dusk,
// the lights, night) into the night again. Every color that changes with the light is
// precomputed here in half-level steps, so drawing never mixes colors per frame. What moves or
// fades with the light (the sun setting and rising, the moon and the stars) is worked out for the
// exact level instead (`skyLightAt`): a half-level step in the sun's path is a jump of a dozen
// pixels and more (the owner saw it "shift jarringly" as the clouds came up), so the sun glides
// down and up with the camera.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
const AFTERNOON = 14;
const DUSK = 32;
const NIGHT = 60;
/** The cloud sea has covered the boulevard by here (far.ts). */
export const DAY_HIGH = 30;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, dawn breaks over the next DAWN_SPAN, and at the
 * golden afternoon the loop picks up the first day's story at AFTERNOON and runs it again, up to
 * the night it began in (the first day's tone at LOOP_START), so its end flows into its start.
 */
export const LOOP_START = 100;
const NIGHT_HOLD = 4;
const DAWN_SPAN = 30;
/** Where the loop rejoins the first day's story: loop offset DAWN_END is the first day's AFTERNOON. */
const DAWN_END = NIGHT_HOLD + DAWN_SPAN;
export const LOOP = DAWN_END + (LOOP_START - AFTERNOON);
/** The story level the loop begins at (its night hold), and the one the first day's story picks up at. */
export const LOOP_DAWN = AFTERNOON - DAWN_END;
export const DAY_FROM = AFTERNOON;

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

const NIGHT_SHADOW = "#1c1448";

/** The afternoon: a soft mauve sky warming through apricot to a honey-gold glow at the horizon (golden, still pastel). */
const GOLDEN: Omit<Key, "at"> = {
  sky: ["#c7a5c3", "#efc6b2", "#f6d08f", "#fae3b6"],
  cloud: ["#d9adbd", "#f6dcdc", "#fff4ea"],
  haze: "#ecd2c8",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#1b1449", "#2d1c6a", "#4a2a84", "#6c3a90"],
  cloud: ["#4a3180", "#7a54a8", "#a682c9"],
  haze: "#5b3c8c",
  dark: 0.58,
};

const KEYS: Key[] = [
  { at: 0, ...GOLDEN },
  { at: AFTERNOON, ...GOLDEN },
  {
    at: DUSK,
    sky: ["#5f4a9c", "#b878b2", "#f49aa0", "#ffcaa8"],
    cloud: ["#c07ca6", "#f9bccb", "#ffe8ec"],
    haze: "#e69cb3",
    dark: 0.28,
  },
  { at: NIGHT, ...NIGHT_KEY },
];

/**
 * The loop's dawn, in story levels (see storyLevel): the night, then a Rococo dawn (periwinkle
 * over lavender, a blush glow, the clouds lit blush with mint caps) as the sun comes up out of the
 * cloud sea, then the golden afternoon.
 */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#6f78ba", "#b9a9d8", "#ffb4ac", "#ffe0c0"],
    cloud: ["#b98fb8", "#fbd4da", "#e4f4ea"],
    haze: "#e3b0c0",
    dark: 0.2,
  },
  { at: AFTERNOON, ...GOLDEN },
];

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  /** The cloud sea's and the drifting clouds' shaded rows, body and lit caps, and the fine line along their scallops. */
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  cloudLine: string;
  /**
   * The frame down each side of the sky: its stained-glass panes (translucent over the sky), the
   * leading; the climbing rose's stem, its leaves, its roses (and their inner petals), the lily
   * buds, and the fine contour round them.
   */
  paneRose: string;
  paneMint: string;
  rule: string;
  vine: string;
  vineLeaf: string;
  bloom: string;
  bloomDeep: string;
  bud: string;
  vineLine: string;
  /** The far hills, faded lavender, the nearer ones and their lit slopes. */
  hillFar: string;
  hill: string;
  hillLit: string;
  /** The Ferris wheel's frame, its gondolas, and the bulbs along its spokes once lit. */
  wheel: string;
  gondola: string;
  wheelLit: string;
  /** The boulevard's paving (two tones). */
  pave: string;
  pave2: string;
  /** The canal and its lit ripples; the kissing bridge's stone, lit and shaded; the swans. */
  canal: string;
  canalLit: string;
  stone: string;
  stoneLit: string;
  stoneShade: string;
  swan: string;
  /** The facades: dusty rose, parchment, sage, and the quiet pale one behind the tower (and its windows and oculus); their slate roofs (and lit edge). */
  wallRose: string;
  wallCream: string;
  wallSage: string;
  wallPale: string;
  wallPaleLine: string;
  roof: string;
  roofLit: string;
  /** Guimard's green ironwork far off: the stall's arch, the café's brackets, the lamp. */
  iron: string;
  /** Stained glass: rose, amber and mint panes (glowing once the lights are on) and the leading between them. */
  glassRose: string;
  glassAmber: string;
  glassMint: string;
  lead: string;
  /** The flower stall's canopy (two colors in gores), doors, windows lit at dusk, sign boards. */
  canopy: string;
  canopy2: string;
  door: string;
  windowLit: string;
  sign: string;
  /** The flower stall's roses and tulips and their leaves; the chocolate shop's bonbons. */
  rose: string;
  tulipY: string;
  tulipP: string;
  leaf: string;
  bonbon: string;
  bonbonPink: string;
  /** The couple at the café: skin, her dress and hair, his jacket and cap, the card, the chairs. */
  skin: string;
  dress: string;
  hair: string;
  jacket: string;
  cap: string;
  card: string;
  chair: string;
  /** The lane: doves, petals (two tones), the heart balloons and their lit caps, the paper plane and its letter. */
  bird: string;
  petal: string;
  petalPale: string;
  balloon: string;
  balloonLit: string;
  plane: string;
  letter: string;
  /** The little hearts that float up (over the couple, in the lane). */
  heart: string;
  /** The string lights' wire, and their bulbs in three colors (dim by day, lit at dusk); the lamp's glass bud. */
  wire: string;
  bulb: string;
  bulbPink: string;
  bulbCream: string;
  lamp: string;
  /** How far the lights are on (0 by day, 1 at night): string lights, windows, the wheel, the glass. */
  lights: number;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The moon's halo medallion (opaque) and its ring. */
  moonHalo: string;
  moonRing: string;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, its halo medallion (opaque) and the ring and dots on it. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  sunRing: string;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night. */
function fade(c: string, k: Key, amount: number): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark);
}

/** A nearer color (the lane's things): a touch of haze, and only a little of the night. */
function near(c: string, k: Key): string {
  return mix(mix(c, k.haze, 0.1), NIGHT_SHADOW, k.dark * 0.35);
}

/** A color of the sky's own frame: mixed into the sky's middle, then a little of the night. */
function framed(c: string, k: Key, amount: number): string {
  return mix(mix(c, k.sky[1], amount), NIGHT_SHADOW, k.dark * 0.5);
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

/** How faded each depth is: the fronts either side, the quiet one behind the tower, the far fair, the hills. */
const SHOP = 0.2;
const QUIET = 0.5;
const FAR = 0.42;
const HILLS = 0.58;

/** What the light does, apart from its colors. */
export interface Light {
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the gold of the afternoon, 1 for the orange of sunset and dawn. */
  warm: number;
  lights: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm, lights } = l;
  const lit = (c: string, glow: string) => mix(c, glow, lights);
  const glass = (c: string, glow: string) => lit(fade(c, k, SHOP), glow);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    cloudLine: mix(k.cloud[0], "#7a4a78", 0.32),
    paneRose: alpha(mix("#e0708e", NIGHT_SHADOW, k.dark * 0.4), 0.3),
    paneMint: alpha(mix("#7cc4a4", NIGHT_SHADOW, k.dark * 0.4), 0.3),
    rule: framed("#8c5a80", k, 0.25),
    vine: framed("#6f8f62", k, 0.3),
    vineLeaf: framed("#87a677", k, 0.32),
    bloom: framed("#e28aa2", k, 0.22),
    bloomDeep: framed("#b9506f", k, 0.22),
    bud: framed("#fbead2", k, 0.2),
    vineLine: framed("#6a3558", k, 0.3),
    hillFar: fade("#c6a4d8", k, 0.66),
    hill: fade("#a983c4", k, HILLS),
    hillLit: fade("#cdb0de", k, HILLS),
    wheel: fade("#7d5c9c", k, FAR),
    gondola: fade("#e8738f", k, FAR),
    wheelLit: lit(fade("#8c6aa8", k, FAR), "#ffe08a"),
    pave: fade("#e3cdbd", k, SHOP),
    pave2: fade("#cfb3a4", k, SHOP),
    canal: fade("#7fc3cf", k, 0.3),
    canalLit: fade("#d4f0ee", k, 0.3),
    stone: fade("#d8c4c8", k, 0.3),
    stoneLit: fade("#f3e6e6", k, 0.3),
    stoneShade: fade("#a88a98", k, 0.3),
    swan: mix(mix("#ffffff", "#ffd9b0", warm * 0.5), NIGHT_SHADOW, k.dark * 0.45),
    wallRose: fade("#ecc0c4", k, SHOP),
    wallCream: fade("#f7e6cc", k, SHOP),
    wallSage: fade("#c9d8bc", k, SHOP),
    wallPale: fade("#ead2cf", k, QUIET),
    wallPaleLine: fade("#d6b4b6", k, QUIET),
    roof: fade("#7a5a7c", k, SHOP),
    roofLit: fade("#a888a6", k, SHOP),
    iron: fade("#4f7458", k, SHOP),
    glassRose: glass("#e58aa4", "#ffb0c6"),
    glassAmber: glass("#e9b86a", "#ffd890"),
    glassMint: glass("#8fc9b4", "#c4f2dc"),
    lead: fade("#5a3a52", k, SHOP),
    canopy: fade("#94c7ad", k, SHOP),
    canopy2: fade("#fbf0dc", k, SHOP),
    door: fade("#8a4a5e", k, SHOP),
    windowLit: lit(fade("#8c7cb0", k, SHOP), "#ffd980"),
    sign: fade("#fff3e4", k, SHOP),
    rose: fade("#e0405a", k, SHOP),
    tulipY: fade("#ffd23f", k, SHOP),
    tulipP: fade("#ff8ac0", k, SHOP),
    leaf: fade("#4f9a5c", k, SHOP),
    bonbon: fade("#6f3b2b", k, SHOP),
    bonbonPink: fade("#f4a7b9", k, SHOP),
    skin: fade("#ffd8b8", k, 0.14),
    dress: fade("#ff6fa5", k, 0.14),
    hair: fade("#5a3a2c", k, 0.14),
    jacket: fade("#4a6fb8", k, 0.14),
    cap: fade("#3a3a5a", k, 0.14),
    card: fade("#ffb3c6", k, 0.1),
    chair: fade("#45385a", k, 0.14),
    bird: mix(mix("#ffffff", "#ffe0c0", warm * 0.4), NIGHT_SHADOW, k.dark * 0.35),
    petal: near("#ff6f95", k),
    petalPale: near("#ffb6c8", k),
    balloon: near("#ff4f80", k),
    balloonLit: near("#ffa4bd", k),
    plane: mix(mix("#fffaf0", "#ffe3c8", warm * 0.3), NIGHT_SHADOW, k.dark * 0.3),
    letter: near("#ffb3c6", k),
    heart: near("#ff3b5c", k),
    wire: fade("#5a4660", k, SHOP),
    bulb: lit(fade("#c9b48a", k, SHOP), "#ffd34a"),
    bulbPink: lit(fade("#c9a0b0", k, SHOP), "#ff8fb8"),
    bulbCream: lit(fade("#d6cbb8", k, SHOP), "#fff3c4"),
    lamp: lit(fade("#d9774f", k, SHOP), "#ffb36b"),
    lights,
    stars: l.stars,
    moon: l.moon,
    moonHalo: mix(k.sky[0], "#d9c6f0", 0.32),
    moonRing: mix(k.sky[0], "#f3e6ff", 0.5),
    sunSet: l.sunSet,
    sunBody: mix("#ffd45a", "#ff9a52", warm),
    sunShade: mix("#f4b13e", "#f0703f", warm),
    sunHalo: mix(mix("#fff1c6", "#ffd2b0", warm), k.sky[0], 0.35),
    sunRing: mix(mix("#e6a24c", "#e8705a", warm), k.sky[0], 0.2),
  };
}

function newLight(): Light {
  return { stars: 0, moon: 0, sunSet: 0, warm: 0, lights: 0 };
}

/** What the light does on the first day at a level (its night holds past NIGHT), into `out`. */
function dayLight(lvl: number, out: Light): Light {
  out.stars = smooth(DUSK + 4, NIGHT - 4, lvl);
  out.moon = smooth(DUSK + 3, NIGHT - 8, lvl);
  out.sunSet = smooth(DUSK - 15, DUSK + 6, lvl);
  out.warm = smooth(AFTERNOON, DUSK - 4, lvl);
  out.lights = smooth(DUSK - 10, DUSK + 6, lvl);
  return out;
}

/**
 * What the light does in the loop's dawn at a story level from DAWN_FROM (the night) to
 * AFTERNOON, into `out`: the moon and the stars fade, the lights go out, and the sun comes up
 * out of the clouds orange and warms to the gold of the afternoon. Its ends match the first
 * day's night and afternoon.
 */
function dawnLight(e: number, out: Light): Light {
  const x = e - DAWN_FROM;
  out.stars = 1 - smooth(2, 20, x);
  out.moon = 1 - smooth(2, 18, x);
  out.sunSet = 1 - smooth(6, DAWN_SPAN - 2, x);
  out.warm = 1 - smooth(14, DAWN_SPAN, x);
  out.lights = 1 - smooth(6, 24, x);
  return out;
}

/** The first day's tone at a level (its night holds past NIGHT). */
function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), dayLight(lvl, newLight()));
}

/** The loop's dawn's tone at a story level from DAWN_FROM to AFTERNOON. */
function dawnTone(e: number): Tone {
  return toneFrom(keyIn(DAWN_KEYS, e), dawnLight(e, newLight()));
}

/**
 * What the light does at a level, exactly (not in the colors' half-level steps), into `out`:
 * the first day below LOOP_START; past it the loop's night hold, its dawn, then the first day's
 * story from its afternoon on. Continuous everywhere, and periodic past LOOP_START.
 */
export function skyLightAt(lvl: number, out: Light): Light {
  if (lvl < LOOP_START) return dayLight(Math.max(0, lvl), out);
  const e = storyLevel(lvl);
  if (e < DAWN_FROM) return dayLight(LOOP_START, out);
  if (e < AFTERNOON) return dawnLight(e, out);
  return dayLight(e, out);
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

/** Scratch for the exact light of `toneOf`. */
const LIGHT = newLight();

/** The step's colors at a level into `out`, with the sun's set, the moon and the stars for the exact level. */
function exactTone(lvl: number, out: Tone): Tone {
  Object.assign(out, toneAtIndex(indexAt(lvl)));
  skyLightAt(lvl, LIGHT);
  out.sunSet = LIGHT.sunSet;
  out.moon = LIGHT.moon;
  out.stars = LIGHT.stars;
  return out;
}

/** The light at a level (camera altitude in levels), as a fresh object. */
export function toneAtLevel(lvl: number): Tone {
  return exactTone(lvl, { ...FIRST[0]! });
}

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return indexAt(level(s));
}

/** The scene's tone, reused from call to call (every layer of a frame asks for it): filled in again only when the level changes. */
const NOW: Tone = { ...FIRST[0]! };
let nowLevel = NaN;

/** The light at the scene's altitude: the colors of its half-level step, the sun, moon and stars exactly where the level puts them. */
export function toneOf(s: Scene): Tone {
  const lvl = level(s);
  if (lvl !== nowLevel) {
    exactTone(lvl, NOW);
    nowLevel = lvl;
  }
  return NOW;
}
