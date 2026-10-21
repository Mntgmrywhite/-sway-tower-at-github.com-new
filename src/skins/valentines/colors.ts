import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Valentine's Day colors, Art Nouveau: the muted, elegant palette of a Mucha poster for the
// boulevard and the garden (dusty rose, sage, parchment, Guimard's green ironwork, a turquoise
// pool, cream-pink marble), and the Rococo pastels of the climb (blush, rose, mint, cream,
// lavender, soft gold) in the light of each hour (tone.ts). Up close, everything is drawn with a
// fine contour in a warm plum, bolder round a silhouette than inside it, never the heavy ink of
// the other skins; far things are mixed toward the sky of the moment and drawn flat.

/** The bars' ink. */
export const INK = "#3a1d36";
/** The fine warm-plum contour round everything up close. */
export const CONTOUR = "#5c2b48";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

export function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#2a1030", shade) };
}

// ---------------------------------------------------------------- the fountain and the garden

/** Cream-pink marble: the fountain's basin, pedestal and the cherub's plinth. */
export const MARBLE = shades("#f2dcd4", 0.5, 0.22);
/** The joints and carved lines in the marble. */
export const CARVING = mix(MARBLE.body, "#7a4a5a", 0.3);
/** The fountain's water, its lit ripples and foam. */
export const WATER = "#7fc6cc";
export const WATER_LIT = "#d2f0ec";
export const FOAM = "#ffffff";
/** The lawn of the rose garden: the near band round the fountain, and the far one behind it. */
export const LAWN = shades("#8dbc7c", 0.4, 0.24);
export const LAWN_FAR = "#a3cb92";
/** Rose bushes: leaves, red roses, pink roses. */
export const LEAF = shades("#5b9862", 0.4, 0.26);
export const ROSE = shades("#e9314f", 0.4, 0.24);
export const ROSE_PINK = shades("#ff7fb3", 0.4, 0.24);
/** Guimard's green ironwork: the railing, its gateposts. */
export const IRON = shades("#3e6a56", 0.36, 0.3);
/** Brass and gold: the gateposts' finials, the locks' shackles, the cherub's bow. */
export const BRASS = shades("#ffc94a", 0.46, 0.22);
/** The chocolate box and its bonbons. */
export const CHOCOLATE = shades("#6f3b2b", 0.36, 0.3);
export const BOX = shades("#e63c5e", 0.4, 0.24);
export const RIBBON = shades("#ffd166", 0.44, 0.22);
/** Cream: paper, the bouquet's wrap, the bench's cushion. */
export const CREAM: Shades = { light: "#ffffff", body: "#fff3e3", shade: "#e8cfc3" };
/** The heart balloons: body, their highlight, the string. */
export const BALLOON = shades("#ff4f80", 0.46, 0.22);
export const STRING = "#f0e0d8";

// ---------------------------------------------------------------- the cherub

/** His skin and cheeks, golden curls, his little sky-blue tunic and the sash over it, little wings, the stone he is carved from. */
export const SKIN = shades("#ffd8b8", 0.4, 0.18);
export const CHEEK = "#ff9eaa";
export const CURLS = shades("#f2b640", 0.42, 0.24);
export const TUNIC = shades("#7cc6ff", 0.44, 0.22);
export const SASH = shades("#ff6fa5", 0.42, 0.24);
export const WING: Shades = { light: "#ffffff", body: "#fff6f0", shade: "#e6d0d8" };
export const STONE = shades("#e4d4d8", 0.4, 0.2);

// ---------------------------------------------------------------- the front

/** The plaza's fish-scale paving: parchment, and the joints round its scales. */
export const PAVING = shades("#efdccb", 0.42, 0.2);
export const JOINT = "#c99f93";
/** The love locks: five bright enamels. */
export const LOCKS = ["#ff4f80", "#ffc94a", "#4fd6b0", "#5fb6f5", "#b48cf2"] as const;
/** Petals scattered on the pavement. */
export const PETAL = "#ff6f95";
export const PETAL_PALE = "#ffb6c8";

/**
 * The base palette. Valentine's paints its own backdrop over the base sky, field and band (see
 * valentines.ts), so these are the golden-hour values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#4d9ce8",
  skyMid: "#8ac4f3",
  skyBottom: "#ffeac2",
  star: "#fff6e0",
  moon: "#fff2d2",
  cloudShadow: "#eab8b4",
  cloudBase: "#ffe2df",
  cloudLight: "#fff8f3",
  far: "#c9a6d6",
  fieldFar: LAWN_FAR,
  fieldNear: LAWN.body,
  // The base band in front is covered by the pavement and the railing; these match it.
  grass: LAWN.body,
  grassDark: LAWN.shade,
  stone: PAVING.body,
  stoneLight: PAVING.light,
  ink: INK,
};
