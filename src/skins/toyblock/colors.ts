import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Toy Kingdom colors: the bright primaries of a wooden block set (red, yellow, blue, green,
// orange, purple) on a soft sky, warm natural wood for pegs and planks, and one deep plum ink
// for every outline up close. Near things use these as they are (flat, two-tone, inked); far
// things are mixed toward the sky of the moment (see tone.ts) and never outlined.

/** Outline color for everything up close: the same deep plum as the bars' ink. */
export const INK = "#2b2142";

/** A toy color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string): Shades {
  return { light: mix(body, "#ffffff", 0.42), body, shade: mix(body, "#1a1030", 0.26) };
}

export const RED = shades("#f2504b");
export const YELLOW = shades("#ffc93a");
export const BLUE = shades("#3f86ea");
export const GREEN = shades("#3fbf62");
export const ORANGE = shades("#ff9433");
export const PURPLE = shades("#9767e8");
export const TEAL = shades("#2ec4b6");
export const PINK = shades("#ff7eb3");
/** Natural wood: pegs, planks, the shelf in front. */
export const WOOD = shades("#e8b273");

/** The doorway and windows of the fort. */
export const DOORWAY = "#3b2a5c";

/** The meadow the fort stands on: a soft felt green, lighter toward the hills. */
export const MEADOW = "#8fd477";
export const MEADOW_LIGHT = "#a9e08d";
export const MEADOW_SHADE = "#78c463";

/** Lollipop and ring trees: canopy body, lit cap, shade. */
export const LEAF = shades("#47c25a");
export const LIME = shades("#9fd84a");

/**
 * The base palette. Toy Kingdom paints its own backdrop over the base sky, field and band (see
 * toyblock.ts), so these are the day values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#4f9eec",
  skyMid: "#7cbff4",
  skyBottom: "#cdebfb",
  star: "#fff8e0",
  moon: "#fff4cf",
  cloudShadow: "#c9dcf4",
  cloudBase: "#f6faff",
  cloudLight: "#ffffff",
  far: "#a3cbe9",
  fieldFar: "#b9e3a2",
  fieldNear: MEADOW,
  // The base band in front is covered by the shelf of letter blocks; these match it.
  grass: WOOD.light,
  grassDark: WOOD.body,
  stone: WOOD.body,
  stoneLight: WOOD.light,
  ink: INK,
};
