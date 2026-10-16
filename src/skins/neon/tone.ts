import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { CYAN, HOT, MAGENTA, ORANGE, PINK, VIOLET } from "./colors";

// Height tells the story, by the camera's altitude in tower levels: the sunset drive on the
// grid at the start; the sun sinking into the horizon as you climb past the palms; a violet
// hour of neon clouds while a bank of night cloud rolls in over the grid; then the starry synth
// sky, with a wireframe moon and, high up, a ringed planet. Every color that changes with the
// height is precomputed here in half-level steps, so drawing never mixes colors per frame.
//
// Then it loops, forever: from LOOP_FROM on, every LOOP levels the synth night warms into an
// afterglow (the planet, the moon and the constellations fade, the clouds light up pink from
// below as at sunset, a warm glow rises from under the screen), turns back through a violet
// dusk, and the starry night with its moon and planet comes out again. The loop runs the sky
// story back down to AFTERGLOW and up again (`storyLevel`), easing in and out at both ends, so
// it starts and ends on the night the first pass ended on: no seam. What happened once and for
// good (the sun set, the cloud bank rolled in and rose, the city's lights came on) stays done.

/** Where the stages sit, in levels (camera altitude / BLOCK_HEIGHT; the start view is ~11-13). */
const SUNSET = 14;
const SUN_DOWN = 50;
const DUSK = 54;
const NIGHT = 84;
const HIGH = 104;

/** The loop: it starts here (the night is settled), and repeats every LOOP levels. */
export const LOOP_FROM = 120;
export const LOOP = 120;
/** How far back down the story the loop's afterglow reaches: just after the sun went down. */
const AFTERGLOW = 46;
/** The loop's afterglow, as fractions of it: warming from WARM_IN to its peak, cooling back down
 *  from WARM_OUT to the night (which holds across the loop's seam). */
const WARM_IN = [0.1, 0.45] as const;
const WARM_OUT = [0.55, 0.9] as const;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** 0..1..0 over the loop: how far into the afterglow it is at this many levels into a loop. */
export function afterglow(intoLoop: number): number {
  const f = (((intoLoop % LOOP) + LOOP) % LOOP) / LOOP;
  return smooth(WARM_IN[0], WARM_IN[1], f) * (1 - smooth(WARM_OUT[0], WARM_OUT[1], f));
}

/** The story level whose sky shows at `lvl`: the level itself on the first pass, then the loop's. */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_FROM) return lvl;
  return HIGH - (HIGH - AFTERGLOW) * afterglow(lvl - LOOP_FROM);
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
  /** Neon clouds in the side lanes: dark body, the light on their undersides, the tube on top. */
  cloud: [body: string, lit: string, rim: string];
  /** The night cloud bank over the grid: its top row, the row below, and its rim. */
  deck: [body: string, deep: string, rim: string];
  /** The wireframe range's rim. */
  ridge: string;
}

const KEYS: Key[] = [
  {
    at: SUNSET,
    cloud: ["#4a1660", mix(HOT, ORANGE, 0.3), mix(ORANGE, PINK, 0.35)],
    deck: ["#3c1462", "#2a0d4a", PINK],
    ridge: mix(VIOLET, MAGENTA, 0.3),
  },
  {
    at: SUN_DOWN,
    cloud: ["#3e1462", mix(HOT, MAGENTA, 0.4), PINK],
    deck: ["#35135e", "#240b45", mix(PINK, MAGENTA, 0.5)],
    ridge: mix(VIOLET, MAGENTA, 0.4),
  },
  {
    at: DUSK,
    cloud: ["#32125c", mix(MAGENTA, VIOLET, 0.25), MAGENTA],
    deck: ["#2c1158", "#1d0a3e", MAGENTA],
    ridge: VIOLET,
  },
  {
    at: NIGHT,
    cloud: ["#1f1248", mix(VIOLET, CYAN, 0.45), mix(CYAN, VIOLET, 0.25)],
    deck: ["#1f1248", "#140b33", mix(CYAN, VIOLET, 0.35)],
    ridge: mix(VIOLET, CYAN, 0.4),
  },
  {
    at: HIGH,
    cloud: ["#1a1142", mix(VIOLET, CYAN, 0.6), CYAN],
    deck: ["#1b1142", "#110a2e", mix(CYAN, VIOLET, 0.2)],
    ridge: mix(VIOLET, CYAN, 0.5),
  },
];

function blend(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    cloud: [m(a.cloud[0], b.cloud[0]), m(a.cloud[1], b.cloud[1]), m(a.cloud[2], b.cloud[2])],
    deck: [m(a.deck[0], b.deck[0]), m(a.deck[1], b.deck[1]), m(a.deck[2], b.deck[2])],
    ridge: m(a.ridge, b.ridge),
  };
}

function keyAt(lvl: number): Key {
  const last = KEYS[KEYS.length - 1]!;
  if (lvl >= last.at) return last;
  for (let i = 1; i < KEYS.length; i++) {
    const b = KEYS[i]!;
    if (lvl > b.at) continue;
    const a = KEYS[i - 1]!;
    return blend(a, b, smooth(a.at, b.at, lvl));
  }
  return KEYS[0]!;
}

/** Everything that changes with the height, at one altitude. */
export interface Tone {
  /** How far the sun has set: 0 on the horizon at the start, 1 gone below it. */
  sunSet: number;
  /** The sun's halo (inner stop; it fades to clear) and its glow on the clouds. */
  halo: string;
  haloClear: string;
  cloudBody: string;
  cloudLit: string;
  cloudRim: string;
  deckBody: string;
  deckDeep: string;
  deckRim: string;
  /** The bank of night cloud: 0 below the screen, 1 just over the horizon line (covering the
   *  grid), and `deckHigh` 0..1 as it rises further to swallow the skyline. */
  deck: number;
  deckHigh: number;
  ridge: string;
  ridgeMesh: string;
  /** City windows: how many of the evening lights are on (0..1), and their brightness. */
  lights: number;
  /** Night-sky extras (sparkles, constellations), the moon and the planet fade in. */
  stars: number;
  moon: number;
  planet: number;
  /** Shooting stars per lane slot unlocked at this height (0..4). */
  meteors: number;
  /** The loop's afterglow (0 on the first pass): a warm glow rising from under the screen. */
  glow: number;
}

function toneAt(lvl: number): Tone {
  // The sky's colors and the night things follow the story (looping); the rest is done for good.
  const st = storyLevel(lvl);
  const k = keyAt(st);
  const set = smooth(SUNSET + 2, SUN_DOWN, lvl);
  const haloA = 0.3 * (1 - set);
  const haloC = mix(HOT, MAGENTA, set * 0.6);
  return {
    sunSet: set,
    halo: alpha(haloC, Math.round(haloA * 1000) / 1000),
    haloClear: alpha(haloC, 0),
    cloudBody: k.cloud[0],
    cloudLit: k.cloud[1],
    cloudRim: k.cloud[2],
    deckBody: k.deck[0],
    deckDeep: k.deck[1],
    deckRim: k.deck[2],
    deck: smooth(SUN_DOWN - 18, SUN_DOWN + 2, lvl),
    deckHigh: smooth(NIGHT - 18, HIGH - 6, lvl),
    ridge: k.ridge,
    ridgeMesh: alpha(k.ridge, 0.36),
    lights: smooth(SUNSET + 4, DUSK, lvl),
    stars: smooth(DUSK, NIGHT, st),
    moon: smooth(SUN_DOWN, DUSK + 6, st),
    planet: smooth(NIGHT, HIGH - 2, st),
    meteors: st < SUNSET + 6 ? 0 : st < SUN_DOWN ? 1 : st < DUSK + 10 ? 2 : st < NIGHT ? 3 : 4,
    glow: lvl < LOOP_FROM ? 0 : afterglow(lvl - LOOP_FROM),
  };
}

/** Tones in half-level steps: the first pass up to the loop, then one loop (indices FIRST on). */
const STEP = 0.5;
const FIRST = Math.round(LOOP_FROM / STEP);
const PER_LOOP = Math.round(LOOP / STEP);
const TONES: Tone[] = Array.from({ length: FIRST + PER_LOOP }, (_, i) => toneAt(i * STEP));

/** Index of the scene's tone step (for caches built from a tone): the same at L and L + LOOP past LOOP_FROM. */
export function toneIndex(s: Scene): number {
  const i = Math.max(0, Math.round(level(s) / STEP));
  return i < FIRST ? i : FIRST + ((i - FIRST) % PER_LOOP);
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return TONES[toneIndex(s)]!;
}
