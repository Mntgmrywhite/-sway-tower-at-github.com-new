import { alpha, mix } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Palette, Scene } from "../skin";

// Colors and small helpers shared by the Halloween layers.
//
// A Main Street Halloween night in a Tim Burton style, all our own designs: a deep indigo sky
// sinking to purple, a huge flat cream moon, jagged teal-black hills, and a town of spindly,
// crooked, leaning Victorian storefronts in slate, plum and teal-grey, stitched and striped,
// inked in near-black. Glow is the only brightness: pumpkin orange and candle gold in the
// windows, the gas lamps, the jack-o'-lanterns, the string lights and the moon. Bone white and
// black stripes for the Burton trim; orange and purple bunting.

/** Ink for everything up close: a purple-black, so the dark facades still read against it. */
export const INK = "#0e0a16";

// ---------------------------------------------------------------- the night

export const SKY_TOP = "#1a1545";
export const SKY_MID = "#35206a";
export const SKY_LOW = "#5c2a78";
/** The last of the dusk on the horizon, behind the hollow: a pumpkin ember. */
export const DUSK_GLOW = "#c8573a";

export const MOON = "#f7ecc4";
export const STAR = "#fff2d0";

/** Faded silhouettes in the distance: the hollow's back hills, the Horseman's hill, the mansion's crag. */
export const HAZE = "#3a2a66";
export const HILL_BACK = "#2b2154";
export const HILL = "#1d1840";
/** The Headless Horseman: the darkest thing in the distance, so he reads against the moon and the hill. */
export const RIDER = "#0b0818";

/** Fog: its body and its lit top. */
export const FOG = "#6f62a6";
export const FOG_LIGHT = "#9c90cc";

// ---------------------------------------------------------------- glow

export const ORANGE = "#ff8a1e";
export const ORANGE_LIGHT = "#ffb04f";
export const ORANGE_DARK = "#c95a12";
export const STEM = "#5d7a2c";
export const CARVED = "#7a2a0c";
export const CANDLE = "#ffd25e";
export const CANDLE_HOT = "#fff3b8";
export const FLAME = "#ffa52e";
export const FLAME_HOT = "#fff0a0";

/** Window and lamp light, deep to bright. */
export const LAMP_DEEP = "#ff9f3a";
export const LAMP = "#ffc95e";
export const LAMP_CORE = "#fff0c2";
/** Warm light lying on the cobbles and the grass. */
export const POOL = alpha("#ffb04f", 0.22);
export const POOL_CORE = alpha("#ffd27a", 0.22);

// ---------------------------------------------------------------- the town

/** Facades: slate, plum and teal-grey, each with its lit and shaded side (derived in shops.ts). */
export const SLATE = "#454a6e";
export const PLUM = "#5a3a6a";
export const TEALGREY = "#2f5459";
export const MOSSGREY = "#4f5a3c";
export const ROOF = "#231c34";
export const ROOF_LIGHT = "#3a2f52";
/** Bone white: trims, stripes, stitches. */
export const BONE = "#efe8d6";
export const BONE_SHADE = "#c9bfa6";
/** Wrought iron and the stripes' black. */
export const IRON = "#16121f";
export const PURPLE = "#8a4fd0";
export const PURPLE_DARK = "#5e2f9a";

/** The cobbles of Main Street and the square. */
export const COBBLE = "#2d2a44";
export const COBBLE_LIGHT = "#3d3a5c";
export const COBBLE_SHADE = "#221f36";

// ---------------------------------------------------------------- the churchyard

export const GRASS = "#2f4a3a";
export const GRASS_LIGHT = "#44634c";
export const STONE = "#8f93ad";
export const STONE_LIGHT = "#b7bbd2";
export const STONE_SHADE = "#676b8a";
export const STONE_CUT = "#3f4360";
export const MOSS = "#5f8c4a";
export const MOSS_DARK = "#3f6a35";
export const DIRT = "#55382f";
export const DIRT_LIGHT = "#704c3c";
export const DIRT_DARK = "#352320";
export const HOLE = "#120b10";

/** Autumn leaves: orange, red, gold, russet. */
export const LEAVES = ["#ff8a2a", "#d8403a", "#f2b23a", "#a8582e"] as const;

// ---------------------------------------------------------------- the trick-or-treaters

export const SKIN = "#ffd2ad";
export const CHEEK = "#ff8f8f";
export const WITCH = "#9a5fe0";
export const WITCH_DARK = "#6c3cb0";
export const BLACK_SUIT = "#2b2540";
export const BLACK_SUIT_LIGHT = "#4a4170";
export const HERO = "#3f7cf0";
export const HERO_LIGHT = "#7aa6ff";
export const CAPE = "#e8414f";
export const CAPE_DARK = "#b52a3c";
export const STAR_GOLD = "#ffd23f";
export const PILLOWCASE = "#f4f0e4";
export const KRAFT = "#d9a066";
export const PINK = "#ff8fb8";
export const LEAF_GREEN = "#7cc443";

/**
 * The skin's palette. With a backdrop of its own it is only partly read: the bars' ink, the
 * blast's smoke (the cloud colors) and haze (skyMid), and the base band the foreground covers.
 */
export const PALETTE: Palette = {
  skyTop: SKY_TOP,
  skyMid: SKY_MID,
  skyBottom: SKY_LOW,
  star: STAR,
  moon: MOON,
  cloudShadow: "#5c5088",
  cloudBase: "#8a7fb8",
  cloudLight: "#c4bce6",
  far: HAZE,
  fieldFar: COBBLE_LIGHT,
  fieldNear: COBBLE,
  grass: GRASS_LIGHT,
  grassDark: GRASS,
  stone: COBBLE,
  stoneLight: COBBLE_LIGHT,
  ink: INK,
};

/** A shade of a color toward the ink, and toward the light. */
export function shade(c: string, k = 0.3): string {
  return mix(c, INK, k);
}
export function light(c: string, k = 0.2): string {
  return mix(c, "#ffffff", k);
}

/** Ink width for a prop drawn at perspective scale `k` (1 on the tower's line). */
export function inkW(s: Scene, k = 1): number {
  return Math.max(1.2, s.u * 0.0056 * Math.sqrt(k));
}

/** Scratch point for `spot()`, reused so placing props allocates nothing per frame. */
const P = { x: 0, y: 0, k: 1 };

/**
 * A spot on the field. `X` is the sideways offset from the tower's center measured at the
 * tower's depth, in units of u; `z` is depth (TOWER_DEPTH is the tower's own line, bigger is
 * farther back, smaller is closer). `k` is the perspective scale for anything standing there.
 */
export function spot(s: Scene, X: number, z: number): typeof P {
  const k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = fieldY(s, z);
  P.k = k;
  return P;
}

/** 0..1 smoothstep. */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
