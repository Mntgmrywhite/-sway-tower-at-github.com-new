import { mix } from "../../base/draw";
import type { NeonPalette } from "../skin";

// Tech-noir colors: neon blue, electric purple and magenta on charcoal, with a little cyan and
// a warm amber for the odd lit window. The scenery stays dark so the glowing bars are the
// brightest thing on screen.

export const PALETTE: NeonPalette = {
  skyTop: "#040409",
  skyMid: "#0c0b1a",
  skyBottom: "#23143d",
  horizon: "#9b3cf0",
  grid: "#2b3a70",
  floorFar: "#1d1236",
  floorNear: "#050508",
  sunTop: "#c9d2ff",
  sunBottom: "#7d6cff",
  star: "#7c87b8",
};

export const TAU = Math.PI * 2;

// Neon tubes
export const BLUE = "#2f8bff";
export const CYAN = "#38e8ff";
export const PURPLE = "#a04dff";
export const MAGENTA = "#ff2bd6";
export const PINK = "#ff4f9a";
export const AMBER = "#ffb03a";
export const RED = "#ff3355";

/** The first bar's color: the tower's base is always this bar, so its wet reflection is too. */
export const BASE_BAR = MAGENTA;

// Silhouettes, back to front: the smog-lit far skyline, the megacity's towers, the street.
export const HAZE = "#1f1a3a";
export const SLAB = "#0f0d1c";
export const SLAB_EDGE = "#2a2350";
export const NEAR = "#09080f";
export const NEAR_FACE = "#0d0c17";
export const NEAR_EDGE = "#3a2e66";

// Lit windows: cool white-blue, purple, cyan, and a rare warm amber.
export const WIN_COOL = "#7fb6ff";
export const WIN_PURPLE = "#b07cff";
export const WIN_CYAN = "#5ff0ff";
export const WIN_WARM = "#ffc46b";
export const WINDOW_COLORS = [WIN_COOL, WIN_PURPLE, WIN_CYAN, WIN_WARM] as const;

// Weather
export const RAIN = "#a9b8ff";
export const STEAM = "#9a93b8";
export const STEAM_LIT = mix(STEAM, MAGENTA, 0.18);

// Roof gardens: leaves lit by the grow lights.
export const LEAF = "#1f8a6e";
export const LEAF_DARK = "#0c3a34";
export const GREEN_LIGHT = "#39ffb0";

// Moon
export const MOON = "#c8cfee";
export const MOON_SHADE = "#9aa1c8";
