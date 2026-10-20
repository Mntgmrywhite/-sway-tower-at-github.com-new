import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// St. Patrick's Day colors: an Irish spring in bright cartoon. Emerald and shamrock greens for
// the grass, warm grey-tan limestone for the round tower and the dry-stone walls, whitewash and
// golden thatch for the cottage with its red half-door, cream wool, a black iron pot heaped
// with gold, and one deep indigo ink for every outline up close. Near things use these as they
// are (flat, two-tone, inked); far things are mixed toward the sky of the moment (see tone.ts)
// and never outlined.

/** Outline color for everything up close, and the bars' ink. */
export const INK = "#21263d";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1030", shade) };
}

// ---------------------------------------------------------------- the round tower and walls

/** Weathered limestone: the round tower under the bars. */
export const STONE = shades("#d6cdb9", 0.5, 0.2);
/** The courses and joints in the tower's stonework. */
export const JOINT = mix(STONE.body, "#5a4a3a", 0.32);
/** Dark openings: the tower's raised doorway and window, the cottage's panes. */
export const OPENING = "#2c2a40";
/** The dry-stone wall in front: three stone tones, and the shadow between the stones. */
export const WALL_STONES: readonly Shades[] = [shades("#c9c2b2", 0.45, 0.2), shades("#b4b4ac", 0.45, 0.2), shades("#d4c7ad", 0.45, 0.2)];
export const WALL_GAP = "#3a3644";
/** Ladder and gate wood. */
export const WOOD = shades("#b97a45");

// ---------------------------------------------------------------- grass

/** Grass up close: the mound round the tower's foot and the verge in the gateway. */
export const GRASS = shades("#45be55", 0.4, 0.22);
/** The meadow round the tower: lighter far off, deeper near. */
export const MEADOW_FAR = "#86d872";
export const MEADOW = "#62c95e";
/** Shamrock leaves. */
export const SHAMROCK = "#2fa84a";
/** The worn path through the gateway. */
export const PATH = "#a9d77a";

// ---------------------------------------------------------------- the cottage

export const WHITEWASH: Shades = { light: "#ffffff", body: "#f4f2ea", shade: "#cfd3de" };
export const THATCH = shades("#e2b052", 0.4, 0.22);
export const DOOR = shades("#df4437", 0.36, 0.22);
export const SILL = "#3a7fd0";

// ---------------------------------------------------------------- sheep, gold, rainbow

export const WOOL: Shades = { light: "#ffffff", body: "#f6f1e3", shade: "#d7cfbd" };
export const FACE = "#3a3542";
export const IRON: Shades = { light: "#6a667e", body: "#3a3747", shade: "#26232f" };
export const GOLD = shades("#ffc634", 0.48, 0.18);
/** The bands of the rainbow, outside in. */
export const RAINBOW = ["#ff5a50", "#ff9d3b", "#ffd93b", "#4cc85a", "#4a8ff0", "#9a6cf0"] as const;
/** The little green hat on the gatepost. */
export const HAT = shades("#2e9e4e", 0.4, 0.24);

// ---------------------------------------------------------------- the leprechaun

/** His frock coat and breeches, a fresh leaf green; his buckled hat a deeper bottle green. */
export const COAT = shades("#34a852", 0.4, 0.26);
export const LEP_HAT = shades("#1f7a3e", 0.36, 0.26);
/** Rosy face and nose, a big ginger beard and brows, cream stockings, black shoes. */
export const SKIN = shades("#ffd3b0", 0.4, 0.16);
export const CHEEK = "#ff9c8c";
export const BEARD = shades("#e8682e", 0.38, 0.2);
export const STOCKING = "#fff6e4";
export const SHOE = "#2b2838";
export const BELT = "#5b3a26";

// ---------------------------------------------------------------- the session outside

/** Pints of green brew: a bright lime green (it reads against the meadow behind it) under a creamy head. */
export const BREW = shades("#a5e046", 0.4, 0.2);
export const FOAM: Shades = { light: "#ffffff", body: "#fff4d8", shade: "#ead8ae" };
/** The box player: a cream Aran jumper, slate-blue trousers, a tweed flat cap, a short white beard. */
export const ARAN: Shades = { light: "#fffaf0", body: "#f0e4c8", shade: "#d3c29c" };
export const TROUSERS = shades("#4d5d92", 0.36, 0.24);
export const CAP = shades("#8c6c50", 0.36, 0.24);
export const WHISKERS: Shades = { light: "#ffffff", body: "#e4e1db", shade: "#aaa49a" };
/** His button accordion: a red box with a gold trim, black bellows with pale pleats. */
export const BOX = shades("#e0473d", 0.36, 0.24);
export const BELLOWS: Shades = { light: "#d9d6e4", body: "#33303f", shade: "#22202b" };

// ---------------------------------------------------------------- near clouds

export const CLOUD: Shades = { light: "#ffffff", body: "#f4f8ff", shade: "#d3e1f4" };

/**
 * The base palette. St. Patrick's paints its own backdrop over the base sky, field and band
 * (see stpatricks.ts), so these are the day values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#4596ea",
  skyMid: "#72baf3",
  skyBottom: "#d3f1fb",
  star: "#fff8e0",
  moon: "#fff4cf",
  cloudShadow: "#c6daf1",
  cloudBase: "#f5faff",
  cloudLight: "#ffffff",
  far: "#9ccab8",
  fieldFar: MEADOW_FAR,
  fieldNear: MEADOW,
  // The base band in front is covered by the dry-stone wall; these match it.
  grass: GRASS.body,
  grassDark: GRASS.shade,
  stone: WALL_STONES[0]!.body,
  stoneLight: WALL_STONES[0]!.light,
  ink: INK,
};
