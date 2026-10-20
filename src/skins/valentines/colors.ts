import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Valentine's Day colors: a candy-box boulevard at the golden hour, in bright cartoon. Rose
// pink, cherry red, cream, chocolate brown and gold, with cream-pink marble for the fountain,
// fresh lawn green for the rose garden, dark iron for the lamp post and the love-lock railing,
// and one deep plum ink for every outline up close. Near things use these as they are (flat,
// two-tone, inked); far things are mixed toward the sky of the moment (see tone.ts) and never
// outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#3a1d36";

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
export const WATER = "#79c8ea";
export const WATER_LIT = "#c6ebf8";
export const FOAM = "#ffffff";
/** The lawn of the rose garden: the near band round the fountain, and the far one behind it. */
export const LAWN = shades("#6cc868", 0.4, 0.24);
export const LAWN_FAR = "#8ed88a";
/** Rose bushes: leaves, red roses, pink roses. */
export const LEAF = shades("#3d9c53", 0.4, 0.26);
export const ROSE = shades("#e9314f", 0.4, 0.24);
export const ROSE_PINK = shades("#ff7fb3", 0.4, 0.24);
/** Wrought iron: the lamp post, the railing, the bench's ends. */
export const IRON = shades("#45385a", 0.36, 0.3);
/** Brass and gold: the lamp, the locks' shackles, the cherub's bow. */
export const BRASS = shades("#ffc94a", 0.46, 0.22);
/** The bench's slats. */
export const WOOD = shades("#c07a46", 0.4, 0.26);
/** The chocolate box and its bonbons. */
export const CHOCOLATE = shades("#6f3b2b", 0.36, 0.3);
export const BOX = shades("#e63c5e", 0.4, 0.24);
export const RIBBON = shades("#ffd166", 0.44, 0.22);
/** Cream: paper, the bouquet's wrap, the bench's cushion. */
export const CREAM: Shades = { light: "#ffffff", body: "#fff3e3", shade: "#e8cfc3" };
/** The string lights' bulbs and their glow. */
export const BULB = "#ffd96b";
export const BULB_GLOW = "#ffb347";
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

/** Pink-cream paving stones and the joints between them. */
export const PAVING: readonly Shades[] = [shades("#efd5c9", 0.42, 0.2), shades("#e6c6ba", 0.42, 0.2), shades("#f4ddd1", 0.42, 0.2)];
export const JOINT = "#cfa399";
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
  stone: PAVING[0]!.body,
  stoneLight: PAVING[0]!.light,
  ink: INK,
};
