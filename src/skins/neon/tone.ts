import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { CYAN, HOT, MAGENTA, ORANGE, PINK, VIOLET } from "./colors";

// Height tells the story, by the camera's altitude in tower levels: the sunset drive on the
// grid at the start; the sun sinking into the horizon as you climb past the palms; a violet
// hour of neon clouds while a bank of night cloud rolls in over the grid; then the starry synth
// sky, with a wireframe moon and, high up, a ringed planet. Every color that changes with the
// height is precomputed here in half-level steps, so drawing never mixes colors per frame.

/** Where the stages sit, in levels (camera altitude / BLOCK_HEIGHT; the start view is ~11-13). */
const SUNSET = 14;
const SUN_DOWN = 50;
const DUSK = 54;
const NIGHT = 84;
const HIGH = 104;

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
}

function toneAt(lvl: number): Tone {
  const k = keyAt(lvl);
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
    stars: smooth(DUSK, NIGHT, lvl),
    moon: smooth(SUN_DOWN, DUSK + 6, lvl),
    planet: smooth(NIGHT, HIGH - 2, lvl),
    meteors: lvl < SUNSET + 6 ? 0 : lvl < SUN_DOWN ? 1 : lvl < DUSK + 10 ? 2 : lvl < NIGHT ? 3 : 4,
  };
}

/** Tones in half-level steps, from the ground to past the planet. */
const STEP = 0.5;
const TONES: Tone[] = Array.from({ length: Math.ceil((HIGH + 8) / STEP) + 1 }, (_, i) => toneAt(i * STEP));

/** Index of the scene's tone step (for caches built from a tone). */
export function toneIndex(s: Scene): number {
  return Math.max(0, Math.min(TONES.length - 1, Math.round(level(s) / STEP)));
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return TONES[toneIndex(s)]!;
}
