import { mix } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Palette, Scene } from "../skin";

// Colors and small helpers shared by every Classic layer: a bright summer day in the spirit of
// a classic 16-bit "green hill" stage, seen from the top of a sandstone castle keep: saturated
// blue sky, rolling bright-green hills over checker-banded earth, waterfalls into a deep-blue
// lake, palms and giant sunflowers at the forest edge. Never grey, never industrial.

/** Outline color for everything up close: a deep plum, like the bars' ink. */
export const INK = "#2a1f3d";

export const PALETTE: Palette = {
  skyTop: "#1a5fdc",
  skyMid: "#3a98f4",
  skyBottom: "#a8e6ff",
  // Stars blend into the day sky; they only show once the sky deepens as the tower climbs.
  star: "#4a92ee",
  moon: "#fff3c4",
  cloudShadow: "#a6cdf2",
  cloudBase: "#eef8ff",
  cloudLight: "#ffffff",
  far: "#7fb2e8",
  fieldFar: "#9ee070",
  fieldNear: "#3db23a",
  // The base band in front: a grass lip over warm checkered earth (Classic paints its own
  // checker over it in the foreground layer, so these only show for a frame of fallback).
  grass: "#5ccf3c",
  grassDark: "#2f9a2c",
  stone: "#b9622b",
  stoneLight: "#eaa244",
  ink: INK,
};

// ---------------------------------------------------------------- grass and checkered earth

export const GRASS = "#5ccf3c";
export const GRASS_LIGHT = "#a2f062";
export const GRASS_DARK = "#2f9a2c";
/** The two earth tones of the checker, a lit edge on the light cells, and the seams between bands. */
export const EARTH_LIGHT = "#eda348";
export const EARTH_DARK = "#b85f2a";
export const EARTH_LIT = "#ffc970";
export const EARTH_SEAM = "#7c3a20";

// ---------------------------------------------------------------- sandstone castle

export const STONE = "#f2c98a";
export const STONE_LIGHT = "#ffe7b6";
export const STONE_SHADE = "#d99f5e";
export const STONE_DEEP = "#a96a3f";
/** Joints between sandstone blocks: warm brown lines, not ink, so the walls stay soft. */
export const JOINT = "#b77a48";
/** Dark openings: arrow loops, crenel backs, windows. */
export const HOLE = "#4a2840";
export const VINE = "#3cb83a";
export const VINE_LIGHT = "#8be35c";
export const VINE_DARK = "#23862e";

/** Terracotta cone roofs, a royal-blue heraldic banner, gold trim. */
export const ROOF = "#ee5a3c";
export const ROOF_LIGHT = "#ff9064";
export const ROOF_SHADE = "#c03c2c";
export const ROYAL = "#2f62e6";
export const ROYAL_SHADE = "#1f45b4";
export const CRIMSON = "#e2364f";
export const GOLD = "#ffc93a";
export const GOLD_SHADE = "#e09a1c";
export const WOOD = "#8a5a3a";
export const SHUTTER = "#3fb0d8";
/** Window-box blooms. */
export const BLOOMS = ["#ff4f7e", "#ffffff", "#ffd23a", "#b46cff"] as const;

// ---------------------------------------------------------------- the valley

export const WATER_FAR = "#6cc6ff";
export const WATER = "#2b86ec";
export const WATER_NEAR = "#1a58c6";
export const SHORE = "#f3dc96";
export const RIPPLE = "#ffffff";
/** Falling water: body, bright streaks, shaded edge. */
export const FALL = "#bdeaff";
export const FALL_SHADE = "#78c4f4";
export const FOAM = "#ffffff";

/** Haze the valley fades into toward the horizon. */
export const HAZE = mix(PALETTE.fieldFar, PALETTE.skyBottom, 0.4);

/** Treetops: a few lush greens, lit cap and shaded underside per tone. */
export const LEAF = ["#45bb45", "#33a856", "#6cc93a"] as const;
export const PINE = "#2a9458";

/** Palms and sunflowers. */
export const TRUNK = "#d0924e";
export const TRUNK_SHADE = "#a1683a";
export const FROND = "#36b648";
export const FROND_LIGHT = "#86e45a";
export const PETAL = "#ffd22e";
export const PETAL_SHADE = "#f3a51c";
export const DISC = "#7a4420";
export const DISC_LIGHT = "#a9652d";
export const STEM = "#3aa83a";

/** Animals. */
export const DEER = "#c7834a";
export const DEER_SHADE = "#9c6136";
export const CREAM = "#fff4dc";
export const FOX = "#ff8a2e";
export const FOX_SHADE = "#d9661a";
export const BUNNY = "#c9b8a8";
export const BUNNY_SHADE = "#a89482";
export const DUCK = "#ffffff";
export const DUCKLING = "#ffd84a";
export const BILL = "#ff9a2e";
export const OWL = "#b07a4e";
export const OWL_LIGHT = "#e6c497";

// ---------------------------------------------------------------- helpers

/** Ink width for something drawn at perspective scale `k` (1 on the tower's line). */
export function inkW(s: Scene, k = 1): number {
  return Math.max(1, s.u * 0.0056 * Math.sqrt(k));
}

/** Scratch point for `spot()`, reused so placing props allocates nothing per frame. */
const P = { x: 0, y: 0, k: 1 };

/**
 * A spot on the valley floor. `X` is the sideways offset from the screen center measured at
 * the tower's depth, in u (so it is a true ground coordinate); `z` is depth (TOWER_DEPTH is the
 * tower's own line, bigger is farther). `k` is the perspective scale for anything standing there.
 */
export function spot(s: Scene, X: number, z: number): typeof P {
  const k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = fieldY(s, z);
  P.k = k;
  return P;
}

/** Depth of the field row at screen y (inverse of fieldY); Infinity at or above the horizon. */
export function depthAt(s: Scene, y: number): number {
  const d = y - s.horizonY;
  return d <= 0 ? Infinity : ((s.groundY - s.horizonY) * TOWER_DEPTH) / d;
}
