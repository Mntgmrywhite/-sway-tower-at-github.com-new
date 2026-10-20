import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Independence Day colors: a small-town Fourth in bright cartoon. Red, white and royal blue
// are the heroes (bunting, flags, balloons, the fireworks), gold for the brass and the
// fireworks' willows, summer green for the lawn and the trees, a clear sky blue, and one deep
// navy ink for every outline up close. Near things use these as they are (flat, two-tone,
// inked); far things are mixed toward the sky of the moment (see tone.ts) and never outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#1f2342";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1a38", shade) };
}

// ---------------------------------------------------------------- the three colors

/** The bunting's and the flags' stripes, flat. */
export const STRIPE_RED = "#e23a3f";
export const STRIPE_WHITE = "#f8f6ef";
export const STRIPE_BLUE = "#2b52cc";
export const STAR_WHITE = "#ffffff";

// ---------------------------------------------------------------- the lawn and the street

/** The town square's lawn (its hazy far edge is in tone.ts), deeper near the street. */
export const LAWN = "#5fc55a";
export const LAWN_NEAR = "#4db24c";
/** The concrete path from the bandstand's steps to the street. */
export const PATH = "#e8e1cf";
export const PATH_EDGE = "#cfc7b3";
/** The street in front: asphalt, its painted center line, and the curb painted for the Fourth. */
export const ASPHALT = shades("#6a6e86", 0.2, 0.3);
export const LANE_LINE = "#ffd23f";
export const CURB = shades("#dcd8cc", 0.4, 0.26);
export const CONFETTI = ["#e63a40", "#ffffff", "#2f58d6", "#ffc93a"] as const;

// ---------------------------------------------------------------- the bandstand

export const PAINT: Shades = { light: "#ffffff", body: "#f6f3ea", shade: "#d2d6e3" };
export const DECK = "#eee8d8";
export const LATTICE_BACK = "#9aa0b8";
export const STEP = shades("#e6e0cf", 0.4, 0.24);

// ---------------------------------------------------------------- the barbecue corner

export const GRILL = shades("#2b2e45", 0.5, 0.3);
export const CHARCOAL_GLOW = "#ff7a2e";
export const TABLE = shades("#c98b4e", 0.4, 0.26);
export const CLOTH_RED = "#ef5a55";
export const CLOTH_WHITE = "#fff7ee";
export const MELON_RIND = "#3f9e45";
export const MELON_FLESH = "#ff5d6c";
export const MELON_SEED = "#2a2238";
export const PIE_CRUST = shades("#e2a85c", 0.4, 0.24);
export const PIE_FILLING = "#b8363f";
export const COOLER = shades("#3d8de0", 0.44, 0.28);
export const BUN = shades("#f0b870", 0.4, 0.22);
export const SAUSAGE = "#c9453e";
export const SMOKE = "#e9ecf3";

// ---------------------------------------------------------------- people

export const SKIN_FAIR = shades("#ffd3b0", 0.4, 0.16);
export const SKIN_TAN = shades("#d9a071", 0.38, 0.18);
export const SKIN_BROWN = shades("#8c5a3c", 0.38, 0.22);
export const HAIR_DARK = "#2e2436";
export const HAIR_BROWN = "#7a4b2a";
export const HAIR_BLONDE = "#f2c96a";
export const HAIR_WHITE = "#f6f3ec";
/** The band's uniforms: red jackets with white trim and gold braid, white trousers, red shakos. */
export const UNIFORM = shades("#d7343c", 0.4, 0.26);
export const UNIFORM_TRIM = "#fbf8f0";
export const BRAID = "#f0c24a";
export const TROUSERS = shades("#f4f1e8", 0.3, 0.22);
export const BRASS = shades("#f2c54c", 0.46, 0.24);
export const DRUM_SHELL = shades("#3f6ae0", 0.44, 0.28);
export const DRUM_HEAD = "#f6f1e2";
/** Uncle Sam: a blue tailcoat, striped trousers, a white vest and a starred top hat. */
export const SAM_COAT = shades("#2b4fd0", 0.44, 0.28);
export const SAM_HAT = shades("#f6f3ea", 0.3, 0.22);
export const SAM_BOW = "#e63a40";
/** The fire truck: red, with chrome and a wooden ladder. */
export const TRUCK = shades("#d9303a", 0.4, 0.26);
export const CHROME = shades("#dfe6f2", 0.4, 0.3);
export const LADDER = shades("#d8a860", 0.4, 0.24);
export const TIRE = "#2a2a3c";
export const HUBCAP = "#e4e6ee";
/** The girl's bike and dress. */
export const BIKE = shades("#ff7ab3", 0.4, 0.26);
export const DRESS = shades("#ffffff", 0.2, 0.2);
export const KID_SHIRTS = [shades("#ff8b3d"), shades("#3fb7e8"), shades("#9b6cf0")] as const;
export const DOG = shades("#f5f1e8", 0.3, 0.2);
export const DOG_SPOT = "#2c2a3c";
export const BANDANA = "#2b52cc";

// ---------------------------------------------------------------- the sky's things

/** The lane's balloons, kite and biplane take the tone's faded red, white, blue and yellow (tone.ts); the eagle's beak keeps its own. */
export const EAGLE_BEAK = "#ffb028";

/** Firework colors: red, white, blue and gold, in a fixed order so hash() can pick from them. */
export const FIREWORK = ["#ff4d55", "#ffffff", "#5a82ff", "#ffd24a"] as const;
export const FIREWORK_LIGHT = ["#ffb0b4", "#ffffff", "#b8caff", "#fff0a8"] as const;

// ---------------------------------------------------------------- the town behind

export const BRICK = "#c85a40";
export const BRICK_TAN = "#e4c893";
export const BRICK_CREAM = "#f2eadb";
export const BRICK_SAGE = "#9ec49a";
export const STONE = "#ece6d6";
export const SLATE = "#5b6482";
export const WINDOW = "#3b4474";
export const WINDOW_LIT = "#ffd978";
export const AWNING = ["#2f9e5a", "#e23a3f", "#2b52cc"] as const;
export const TREE = "#3fa74b";
export const TREE_LIT = "#7ed466";
export const TRUNK = "#7a4b2a";
export const HILL_FAR = "#8cc98a";
export const HILL = "#6bbb6a";

/**
 * The base palette. Independence Day paints its own backdrop over the base sky, field and
 * band (see july4.ts), so these are the afternoon values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#2f7fe0",
  skyMid: "#5cb0f2",
  skyBottom: "#cdeefc",
  star: "#fff8e0",
  moon: "#fff4cf",
  cloudShadow: "#bcd4ee",
  cloudBase: "#f4f9ff",
  cloudLight: "#ffffff",
  far: HILL_FAR,
  fieldFar: "#96dc6e",
  fieldNear: LAWN,
  // The base band in front is covered by the street; these match the curb and the asphalt.
  grass: CURB.body,
  grassDark: CURB.shade,
  stone: ASPHALT.body,
  stoneLight: ASPHALT.light,
  ink: INK,
};
