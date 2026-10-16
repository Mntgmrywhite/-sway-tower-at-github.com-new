import { mix } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Palette, Scene } from "../skin";

// Colors and small helpers shared by the Halloween layers.
//
// The night is purple and orange: an indigo sky warming to a dusky rose glow behind the mist,
// a cream harvest moon, faded violet hills and woods in the hollow, lavender mist banks, and
// down in town the warm orange of porch lights and jack-o'-lanterns.

/** The skin's palette, kept here so every layer reads the same ink and distance colors. */
export const PALETTE: Palette = {
  skyTop: "#33267e",
  skyMid: "#6446b0",
  skyBottom: "#d98fb4",
  star: "#fff6dc",
  moon: "#fff2c9",
  cloudShadow: "#8a7bcc",
  cloudBase: "#b2a6e6",
  cloudLight: "#ded7fa",
  far: "#5a429e",
  fieldFar: "#6f9476",
  fieldNear: "#3d6650",
  grass: "#b4c94a",
  grassDark: "#7a8f2c",
  stone: "#6a6290",
  stoneLight: "#8279ab",
  ink: "#2a1f3d",
};

export const INK = PALETTE.ink;

/** Flyers against the sky (crows, bats): faded, a shade darker than the sky so they read. */
export const FLYER = "#3f2f86";
/** The far hill the Horseman rides along: hazier than the hollow in front of it. */
export const RIDGE = mix(PALETTE.far, PALETTE.skyBottom, 0.22);
/** The Headless Horseman: the darkest thing in the distance, so he reads against everything. */
export const RIDER = mix(PALETTE.far, INK, 0.62);

export const ORANGE = "#ff9a2e";
export const ORANGE_LIGHT = "#ffc06a";
export const ORANGE_DARK = "#d8681a";
export const STEM = "#6f8f2c";
export const CARVED = "#9a3a10";
export const CANDLE = "#ffe46b";
export const CANDLE_HOT = "#fff7c2";
export const FLAME = "#ffb02e";
export const FLAME_HOT = "#fff1a0";

export const BONE = "#f6f0dc";
export const BONE_SHADE = "#d6cbb0";

export const STONE = "#aca8cc";
export const STONE_LIGHT = "#d0cdea";
export const STONE_SHADE = "#8a85ae";
export const STONE_CUT = "#6c6792";

export const MOSS = "#8cc04a";
export const MOSS_DARK = "#5f9230";

export const DIRT = "#7c5641";
export const DIRT_LIGHT = "#9c7253";
export const DIRT_DARK = "#5a3b2e";
export const HOLE = "#2e1e2a";

export const GRASS = PALETTE.grass;

/** Autumn leaves: orange, red, gold, russet. */
export const LEAVES = ["#ff8a2a", "#e8483a", "#ffc23a", "#b8602e"] as const;

/** Window and porch light, deep to bright. */
export const LAMP_DEEP = "#ffad3b";
export const LAMP = "#ffd36b";
export const LAMP_CORE = "#fff3c0";

/** Skin tones and the kids' costume colors. */
export const SKIN = "#ffd2ad";
export const SKIN_SHADE = "#f0ad8a";
export const CHEEK = "#ff8f8f";
export const WITCH = "#9a5fe0";
export const WITCH_DARK = "#7440b8";
export const BLACK_SUIT = "#3b3158";
export const BLACK_SUIT_LIGHT = "#56497e";
export const HERO = "#3f7cf0";
export const HERO_LIGHT = "#7aa6ff";
export const CAPE = "#e8414f";
export const CAPE_DARK = "#b52a3c";
export const STAR_GOLD = "#ffd23f";
export const PILLOWCASE = "#f4f0e4";
export const KRAFT = "#d9a066";
export const PINK = "#ff8fb8";
export const LEAF_GREEN = "#7cc443";

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
