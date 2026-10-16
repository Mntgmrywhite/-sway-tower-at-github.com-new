import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Palette, Scene } from "../skin";

// Colors and small helpers shared by the Halloween layers.

/** The skin's palette, kept here so every layer reads the same ink and distance colors. */
export const PALETTE: Palette = {
  skyTop: "#3a2a86",
  skyMid: "#6d52c4",
  skyBottom: "#b394ec",
  star: "#fff6dc",
  moon: "#fff3d2",
  cloudShadow: "#3f9fb0",
  cloudBase: "#5cc6bf",
  cloudLight: "#90ecd8",
  far: "#5e48aa",
  fieldFar: "#5f9a7e",
  fieldNear: "#3b6c58",
  grass: "#a2cc48",
  grassDark: "#668f2c",
  stone: "#6a6290",
  stoneLight: "#8279ab",
  ink: "#2a1f3d",
};

export const INK = PALETTE.ink;

/** Witches and bats against the sky: faded like the town, a shade darker so they read. */
export const FLYER = "#47378f";

export const ORANGE = "#ff9a2e";
export const ORANGE_LIGHT = "#ffc06a";
export const ORANGE_DARK = "#d8681a";
export const STEM = "#6f8f2c";
export const CARVED = "#9a3a10";
export const CANDLE = "#ffe46b";
export const CANDLE_HOT = "#fff7c2";

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
