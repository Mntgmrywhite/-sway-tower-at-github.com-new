import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { GREEN_LIGHT, HAZE, LEAF, LEAF_DARK, MAGENTA, PURPLE, SLAB, SLAB_EDGE } from "./colors";

// Height tells the story. Down on the street the sky is a low ceiling of smog lit purple by the
// city, the megacity's towers vanish up into it, and it rains. Climb past their lit faces and
// the rooftops of the lower towers while the rain thins, rise into the smog itself (everything
// goes to a soft violet murk), and come out above it: the smog lies below as a sea glowing with
// the city's light, the giant towers' crowns and the far skyline's spires poke through, and the
// sky clears to a deep night with stars and a crisp moon.
// Everything that changes with height is precomputed here in half-level steps, so drawing never
// mixes colors per frame.
//
// Then it loops, forever: from LOOP_FROM on, every LOOP levels you climb through a high, thin
// layer of smog (the sky pales to the violet it had coming out of the smog, a soft murk closes
// in, strata slide down past you, the stars fade and the moon dims to a glow) and come out into
// the clear night again. The loop runs the sky story back down to LAYER and up again
// (`storyLevel`), easing in and out at both ends, so it starts and ends on the night the first
// pass ended on: no seam. What happened once and for good (the rain stopped, the searchlights
// and the ceiling's banks were left below, the sea settled over the city) stays done.

/** Where each stage of the climb peaks, in levels (camera altitude / BLOCK_HEIGHT). */
const STREET = 0;
const FACADES = 22;
/** The smog starts to close in; you pass through it (below it before, above it after); it is left behind. */
const SMOG_IN = 32;
export const SMOG_SWITCH = 43;
const SMOG_OUT = 54;
const CLEAR = 68;
const HIGH = 105;

/** The loop: it starts here (the night is settled, the city has sunk out of view), and repeats every LOOP levels. */
export const LOOP_FROM = 150;
export const LOOP = 120;
/** How far back down the story the loop's smog layer reaches: just over the smog's top. */
const LAYER = SMOG_OUT - 2;
/** The layer, as fractions of the loop: closing in from IN, at its thickest between them, clearing by OUT. */
const LAYER_IN = [0.15, 0.45] as const;
const LAYER_OUT = [0.6, 0.85] as const;
/** At its thickest the loop's layer is this murky (the smog you climbed out of reached 0.92). */
const LAYER_MURK = 0.55;
const LAYER_GLOW = 0.4;

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

/** 0..1..0 over the loop: how deep in its smog layer you are at this many levels into a loop. */
export function layer(intoLoop: number): number {
  const f = (((intoLoop % LOOP) + LOOP) % LOOP) / LOOP;
  return smooth(LAYER_IN[0], LAYER_IN[1], f) * (1 - smooth(LAYER_OUT[0], LAYER_OUT[1], f));
}

/** The story level whose sky shows at `lvl`: the level itself on the first pass, then the loop's. */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_FROM) return lvl;
  return HIGH - (HIGH - LAYER) * layer(lvl - LOOP_FROM);
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
  /** What distance and smog fade toward. */
  haze: string;
}

const KEYS: Key[] = [
  { at: STREET, sky: ["#06050d", "#100b21", "#26143f", "#43205e"], haze: "#2a1c48" },
  { at: FACADES, sky: ["#08060f", "#130d27", "#2a1650", "#47216a"], haze: "#2c1d4c" },
  { at: SMOG_IN, sky: ["#130e26", "#22163e", "#371e58", "#4a2470"], haze: "#33224f" },
  { at: SMOG_SWITCH, sky: ["#251a40", "#2f1e4a", "#3c2358", "#46275f"], haze: "#3a2756" },
  { at: SMOG_OUT, sky: ["#0b0d26", "#151b40", "#272456", "#3e2266"], haze: "#251f4a" },
  { at: CLEAR, sky: ["#03050f", "#070c22", "#111a3c", "#2c1a52"], haze: "#141a3a" },
  { at: HIGH, sky: ["#020309", "#050a1c", "#0c1534", "#24154a"], haze: "#0e1430" },
];

/** Everything that changes with the climb, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  /** Above the smog (the sea lies below, the towers' crowns poke out of it) rather than under it. */
  above: boolean;
  /** Smog banks hanging under the ceiling, and how thick they are. */
  smog: string;
  smogA: number;
  /** The far skyline: body, its lit rim, how much its lights show, and its windows' fill. */
  far: string;
  farEdge: string;
  farLights: number;
  farWindows: string;
  /** The megacity's towers: body and rim; the roof gardens' leaves (lit tops, and shade). */
  slab: string;
  slabEdge: string;
  leaf: string;
  leafShade: string;
  /** The murk you climb through: a deep violet veil over the whole backdrop, and its strength. */
  murk: string;
  murkA: number;
  /** Strata of denser smog you rise through (how much they show), their body and lit underside. */
  strata: number;
  strataBody: string;
  strataLit: string;
  /** Rain: 1 on the street, thinning to nothing as the smog closes in. */
  rain: number;
  /** The searchlights fade as the smog closes in. */
  beams: number;
  /** Stars and the moon come out above the smog; under it the moon is only a glow. */
  stars: number;
  moon: number;
  moonGlow: number;
  /** The smog sea: how far it has settled over the far city (0..1), its lit top, body, and the city's glow under it. */
  seaRise: number;
  seaTop: string;
  sea: string;
  seaDeep: string;
}

function blendKeys(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    sky: [m(a.sky[0], b.sky[0]), m(a.sky[1], b.sky[1]), m(a.sky[2], b.sky[2]), m(a.sky[3], b.sky[3])],
    haze: m(a.haze, b.haze),
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

function toneAt(lvl: number): Tone {
  // The sky's colors, the stars and the moon follow the story (looping); the rest is done for good.
  const st = storyLevel(lvl);
  const loop = lvl < LOOP_FROM ? 0 : layer(lvl - LOOP_FROM);
  const k = keyAt(st);
  // How deep in the smog: thickest where you pass through it. The dense part is short (about
  // L38 to L48); the strata you rise through show over a wider stretch around it.
  const into = smooth(SMOG_IN + 1, SMOG_SWITCH - 1, lvl) * (1 - smooth(SMOG_SWITCH + 1, SMOG_OUT - 2, lvl));
  const layers = smooth(SMOG_IN - 5, SMOG_IN + 3, lvl) * (1 - smooth(SMOG_SWITCH + 2, SMOG_OUT + 1, lvl));
  const fade = 0.1 + 0.4 * smooth(FACADES - 6, SMOG_SWITCH, lvl);
  const far = mix(HAZE, k.haze, fade);
  const farLights = 1 - 0.8 * into;
  const slab = mix(SLAB, k.haze, fade * 0.8);
  // Tech noir, not lilac: the murk is a deep violet, darker than the haze it is made of.
  const murk = mix(mix(k.haze, PURPLE, 0.1), "#000000", 0.3);
  return {
    sky: k.sky,
    above: lvl >= SMOG_SWITCH,
    smog: mix(k.sky[2], PURPLE, 0.14),
    // The banks under the ceiling give way to the strata as you rise into the smog.
    smogA: 1 - smooth(SMOG_IN - 2, SMOG_IN + 5, lvl),
    far,
    farEdge: mix(mix(HAZE, PURPLE, 0.3), k.haze, fade),
    farLights,
    farWindows: alpha(mix(far, "#9aa0e0", 0.55), 0.5 * farLights),
    slab,
    slabEdge: mix(SLAB_EDGE, k.haze, fade * 0.8),
    leaf: mix(mix(LEAF, GREEN_LIGHT, 0.2), murk, 0.25),
    leafShade: mix(LEAF_DARK, slab, 0.3),
    murk,
    murkA: lvl < LOOP_FROM ? 0.92 * into : LAYER_MURK * loop * loop,
    strata: lvl < LOOP_FROM ? layers : loop,
    strataBody: mix(mix(k.haze, PURPLE, 0.25), "#ffffff", 0.06),
    strataLit: mix(MAGENTA, PURPLE, 0.35),
    rain: 1 - smooth(FACADES - 2, SMOG_IN + 6, lvl),
    beams: 1 - smooth(SMOG_IN - 6, SMOG_SWITCH - 3, lvl),
    stars: smooth(SMOG_OUT - 4, CLEAR, st),
    moon: smooth(SMOG_OUT, CLEAR - 4, st),
    moonGlow: lvl < LOOP_FROM ? 0.45 * (1 - smooth(SMOG_IN - 4, SMOG_IN + 6, lvl)) : LAYER_GLOW * loop,
    seaRise: smooth(SMOG_SWITCH, SMOG_OUT + 4, lvl),
    seaTop: mix(k.sky[3], "#b48cff", 0.22),
    sea: mix("#120a24", k.sky[3], 0.45),
    seaDeep: mix(k.sky[3], MAGENTA, 0.12),
  };
}

/** Tones in half-level steps: the first pass up to the loop, then one loop (indices FIRST on). */
const STEP = 0.5;
const FIRST = Math.round(LOOP_FROM / STEP);
const PER_LOOP = Math.round(LOOP / STEP);
const TONES: Tone[] = Array.from({ length: FIRST + PER_LOOP }, (_, i) => toneAt(i * STEP));

/** Index of the scene's tone step (for caching things built from a tone): the same at L and L + LOOP past LOOP_FROM. */
export function toneIndex(s: Scene): number {
  const i = Math.max(0, Math.round(level(s) / STEP));
  return i < FIRST ? i : FIRST + ((i - FIRST) % PER_LOOP);
}

/** The light at the scene's altitude. */
export function toneOf(s: Scene): Tone {
  return TONES[toneIndex(s)]!;
}
