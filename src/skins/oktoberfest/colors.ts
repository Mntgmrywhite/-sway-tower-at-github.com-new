import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Oktoberfest colors: a Bavarian festival meadow under the Alps, in bright cartoon. Bavarian
// blue and white for the tent, the flags and the maypole, pretzel gold and gingerbread brown
// for the stalls, golden amber under white foam for the steins, oak and iron for the barrels,
// alpine green for the meadow and the pines, snow on the peaks, and one deep indigo ink for every
// outline up close. Near things use these as they are (flat, two-tone, inked); far things are
// mixed toward the sky of the hour (see tone.ts) and never outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#22233f";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

export function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1030", shade) };
}

// ---------------------------------------------------------------- Bavarian blue and white

export const BLUE = shades("#2f80e0", 0.4, 0.26);
export const WHITE: Shades = { light: "#ffffff", body: "#f6f7fb", shade: "#d3dae8" };
/** The tent's canvas: the white panels a touch warm, the blue a touch deeper. */
export const CANVAS_WHITE = "#f8f5ec";
export const CANVAS_WHITE_SHADE = "#e2dccd";
export const CANVAS_BLUE = "#3b86df";
export const CANVAS_BLUE_SHADE = "#2d6cbd";
/** Inside the tent: a shaded warm dark, the back wall, the far tables. */
export const TENT_INSIDE = "#5a4862";
export const TENT_INSIDE_DEEP = "#45364d";
export const TENT_BACK = "#6b5872";
export const TENT_TABLE = "#8a6a4a";
/** The sign over the tent's front: a deep blue board with gold letters. */
export const SIGN = "#1f4f9a";
export const SIGN_RIM = "#ffd447";

// ---------------------------------------------------------------- wood, gold, gingerbread

/** The bandstand's planks and the stalls' timbers. */
export const WOOD = shades("#b7793f", 0.4, 0.26);
export const WOOD_DARK = shades("#8c5a2b", 0.38, 0.26);
export const PLANK_GAP = "#5a3a22";
/** Pretzels and the maypole's gold. */
export const PRETZEL = shades("#c8862f", 0.42, 0.24);
export const SALT = "#fff6dc";
export const GOLD = shades("#ffc734", 0.45, 0.2);
/** Gingerbread hearts and their icing. */
export const GINGER = shades("#8a4a22", 0.36, 0.26);
export const ICING = "#ffffff";
export const ICING_PINK = "#ff7eb0";
/** Beer: golden amber under a white head of foam, in a dimpled glass stein with a clear glass handle; the waitress's pewter tray. */
export const AMBER = shades("#f6aa22", 0.45, 0.2);
export const FOAM = "#fffaf0";
export const FOAM_SHADE = "#efe4cc";
export const GLASS = "#fff3cf";
export const PEWTER = shades("#aeb6c8", 0.42, 0.26);
/** The barrels on the wagon: oak staves bound with iron hoops. */
export const BARREL = shades("#d48a3c", 0.42, 0.28);
/** Sausages on the grill, the roast chicken. */
export const SAUSAGE = shades("#c75a3a", 0.36, 0.26);
export const CHICKEN = shades("#d98a3a", 0.4, 0.26);
export const GRILL = shades("#4a4a5a", 0.34, 0.3);
/** Iron fittings: the wagon wheels' hubs, the barrels' hoops. */
export const IRON: Shades = { light: "#6a667e", body: "#3a3747", shade: "#26232f" };

// ---------------------------------------------------------------- the meadow and the folk

/** The festival meadow: lighter far off, deeper near; the trodden ground along the front. */
export const MEADOW_FAR = "#8ed66a";
export const MEADOW = "#62c45a";
export const GRASS = shades("#4fb84e", 0.4, 0.22);
export const TRODDEN = shades("#dcc088", 0.4, 0.22);
export const GRAVEL = "#e6d4a0";
export const GRAVEL_DARK = "#c9b27c";

/** Lederhosen and dirndls: leather, shirts, bodices, aprons. */
export const LEATHER = shades("#7a5230", 0.38, 0.26);
export const SHIRT_WHITE: Shades = { light: "#ffffff", body: "#f7f4ef", shade: "#cfd0dc" };
export const SHIRT_CHECK = "#d94c4c";
export const SHIRT_CHECK_BLUE = "#3f8fe8";
export const DIRNDL = shades("#d8415a", 0.38, 0.26);
export const DIRNDL_BLUE = shades("#3a7fd6", 0.38, 0.26);
export const DIRNDL_GREEN = shades("#3d9e5a", 0.38, 0.26);
export const APRON = "#f4f1e8";
export const APRON_BLUE = "#9fc7f4";
export const SKIN = shades("#ffd3b0", 0.4, 0.16);
export const CHEEK = "#ff9c8c";
export const HAIR = shades("#5a3a22", 0.38, 0.26);
export const HAIR_FAIR = shades("#e2b858", 0.4, 0.24);
export const HAT = shades("#4d6b3a", 0.4, 0.26);
export const FEATHER = "#f6f1dd";
export const BRASS = shades("#e9b73c", 0.45, 0.22);
export const SHOE = "#2b2838";
export const STOCKING = "#fff6e4";

/** The draft horses and their harness. */
export const HORSE = shades("#8b5a34", 0.38, 0.26);
export const HORSE_LIGHT = shades("#c8955a", 0.38, 0.26);
export const MANE = "#f1e3c6";
export const HARNESS = "#3a2a24";
export const WAGON = shades("#2f6fc4", 0.4, 0.26);
export const WHEEL = shades("#d8b14a", 0.4, 0.26);

/** Balloons in the lane and on the stalls. */
export const BALLOONS = ["#ff5a5a", "#ffd23f", "#3f8fe8", "#ffffff", "#ff8fc8"] as const;
/** Lanterns: paper, lit. */
export const LANTERN = shades("#ffb347", 0.4, 0.22);
export const LANTERN_LIT = "#fff0b0";
export const LANTERN_GLOW = "#ffd27a";
/** The maypole's wreath and ribbons. */
export const WREATH = shades("#3d9e4a", 0.4, 0.26);
export const RIBBON_WHITE = "#ffffff";
export const RIBBON_BLUE = "#3f8fe8";

// ---------------------------------------------------------------- near clouds

export const CLOUD: Shades = { light: "#ffffff", body: "#f6f9ff", shade: "#d5e2f4" };

/**
 * The base palette. Oktoberfest paints its own backdrop over the base sky, field and band
 * (see oktoberfest.ts), so these are the afternoon values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#3f8fe8",
  skyMid: "#79bdf3",
  skyBottom: "#d8f0fb",
  star: "#fff8e0",
  moon: "#fff4cf",
  cloudShadow: "#c6daf1",
  cloudBase: "#f5faff",
  cloudLight: "#ffffff",
  far: "#9fb8d6",
  fieldFar: MEADOW_FAR,
  fieldNear: MEADOW,
  // The base band in front is covered by the festival's fence and stalls; these match it.
  grass: GRASS.body,
  grassDark: GRASS.shade,
  stone: TRODDEN.body,
  stoneLight: TRODDEN.light,
  ink: INK,
};
