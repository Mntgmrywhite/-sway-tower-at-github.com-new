import { mix } from "../../base/draw";
import type { Palette } from "../skin";
import type { PlaitStyle, RoundelStyle } from "./knot";

// St. Patrick's Day colors: the west of Ireland in spring, after the owner's photos (vivid
// spring greens, a clear Atlantic blue), drawn like a page of the Book of Kells: its ornament in
// the manuscript's own pigments (lapis blue, verdigris green, orpiment yellow, vermilion, a dark
// folium purple ground) and one warm iron-gall ink for every outline up close and the
// knotwork's contours. Near things use these as they are (flat fills, a shaded underside,
// inked); far things take the light of the moment (see tone.ts), with at most a fine contour of
// their own, never the ink.

// ---------------------------------------------------------------- the pigments

const LAPIS = "#2d57a6";
const VERDIGRIS = "#2f9a72";
export const ORPIMENT = "#f3bf34";
export const VERMILION = "#d8472e";
/** Outline color for everything up close, the knotwork's contours, and the bars' ink: iron-gall ink, a warm brown-black. */
export const INK = "#2c1e1b";

/** A color in three tones: lit top, body, shaded underside. */
export interface Shades {
  light: string;
  body: string;
  shade: string;
}

function shades(body: string, light = 0.42, shade = 0.26): Shades {
  return { light: mix(body, "#ffffff", light), body, shade: mix(body, "#1a1030", shade) };
}

// ---------------------------------------------------------------- the knotwork

/** The dark folium-purple ground of the knotwork. */
const FOLIUM = "#2b1a35";
/**
 * The plaited bands of the border and its corners: strands of orpiment, verdigris and vermilion
 * on the folium ground, outlined in that same dark (so their contours show only where one strand
 * passes over another), an orpiment rule along each edge.
 */
export const KNOTWORK: PlaitStyle = { ground: FOLIUM, frame: ORPIMENT, strands: [ORPIMENT, VERDIGRIS, VERMILION], ink: FOLIUM, width: 0.5, contour: 0.07 };
/** The roundels with their triskeles: lapis ground, verdigris rim, orpiment arms, inked, ringed with vermilion dots. */
export const ROUNDEL: RoundelStyle = { ground: LAPIS, rim: VERDIGRIS, arms: ORPIMENT, ink: INK, dots: VERMILION };

// ---------------------------------------------------------------- the round tower and walls

/** Weathered limestone: the round tower under the bars. */
export const STONE = shades("#d8cbae", 0.5, 0.2);
/** The courses and joints in the tower's stonework, and the carved band's cut lines. */
export const JOINT = mix(STONE.body, "#5a4a3a", 0.32);
/** Dark openings: the tower's raised doorway and window, the cottage's panes. */
export const OPENING = "#2d2338";
/** The dry-stone wall in front: three stone tones, and the shadow between the stones. */
export const WALL_STONES: readonly Shades[] = [shades("#cdbfa3", 0.45, 0.2), shades("#b7b1a3", 0.45, 0.2), shades("#d8c6a3", 0.45, 0.2)];
export const WALL_GAP = "#3b3038";
/** Ladder and gate wood. */
export const WOOD = shades("#b67843");

// ---------------------------------------------------------------- grass

/** Grass up close: the mound round the tower's foot, the tufts and the verge in front. */
export const GRASS = shades("#54b04c", 0.4, 0.22);
/** The meadow round the tower: lighter far off, deeper near. */
export const MEADOW_FAR = "#9ccf6c";
export const MEADOW = "#74c15a";
/** The trefoils of dots strewn on the near meadow. */
export const MEADOW_DOT = "#5ead4c";
/** Shamrock leaves: a fresh, deep shamrock green. */
export const SHAMROCK = "#2fa84a";
/** Spring flowers in the meadow: white daisies with orpiment eyes, pale primroses with orange eyes. */
export const DAISY = "#ffffff";
export const PRIMROSE = "#fbe98a";
export const PRIMROSE_EYE = "#ee9a2a";
/** The worn path through the gateway. */
export const PATH = "#c9d98a";

// ---------------------------------------------------------------- the cottage

export const WHITEWASH: Shades = { light: "#fffcf2", body: "#f6efdc", shade: "#d8cfbb" };
export const THATCH = shades("#e3ac4a", 0.4, 0.22);
export const DOOR = shades(VERMILION, 0.36, 0.22);
export const SILL = LAPIS;

// ---------------------------------------------------------------- the moon

/** The crescent moon: its lit face, its shaded rim, and the ring of gold dots round it. */
export const MOON = "#fbf0cf";
export const MOON_SHADE = "#e5cf95";
export const MOON_DOTS = "#e9c86a";

// ---------------------------------------------------------------- sheep, gold, rainbow

export const WOOL: Shades = { light: "#fffdf6", body: "#f7f0de", shade: "#d9cdb4" };
export const FACE = "#3b3036";
export const IRON: Shades = { light: "#6b6475", body: "#3a3442", shade: "#27222d" };
export const GOLD = shades(ORPIMENT, 0.48, 0.18);
/** The bands of the rainbow, outside in, in the manuscript's pigments: vermilion, red lead, orpiment, verdigris, lapis, folium. */
export const RAINBOW = ["#e44b36", "#f28b36", "#f7cf3a", "#42b064", "#3d78d2", "#8251bb"] as const;
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
export const SHOE = "#2b2532";
export const BELT = "#5b3a26";

// ---------------------------------------------------------------- the session outside

/** Pints of green brew: a bright lime green (it reads against the meadow behind it) under a creamy head. */
export const BREW = shades("#a5e046", 0.4, 0.2);
export const FOAM: Shades = { light: "#ffffff", body: "#fff4d8", shade: "#ead8ae" };
/** The box player: a cream Aran jumper, lapis trousers, a tweed flat cap, a short white beard. */
export const ARAN: Shades = { light: "#fffaf0", body: "#f0e4c8", shade: "#d3c29c" };
export const TROUSERS = shades("#45599a", 0.36, 0.24);
export const CAP = shades("#8c6c50", 0.36, 0.24);
export const WHISKERS: Shades = { light: "#ffffff", body: "#e4e1db", shade: "#aaa49a" };
/** His button accordion: a vermilion box with a gold trim, black bellows with pale pleats. */
export const BOX = shades("#dc4a37", 0.36, 0.24);
export const BELLOWS: Shades = { light: "#d9d6e4", body: "#33303f", shade: "#22202b" };

/**
 * The base palette. St. Patrick's paints its own backdrop over the base sky, field and band
 * (see stpatricks.ts), so these are the day values the base would show.
 */
export const PALETTE: Palette = {
  skyTop: "#2558bb",
  skyMid: "#4584d8",
  skyBottom: "#cce6f6",
  star: "#fff3d6",
  moon: "#fbefcf",
  cloudShadow: "#c4d6ee",
  cloudBase: "#fbfdff",
  cloudLight: "#ffffff",
  far: "#7896cf",
  fieldFar: MEADOW_FAR,
  fieldNear: MEADOW,
  // The base band in front is covered by the dry-stone wall and the knotwork border; these match the wall.
  grass: GRASS.body,
  grassDark: GRASS.shade,
  stone: WALL_STONES[0]!.body,
  stoneLight: WALL_STONES[0]!.light,
  ink: INK,
};
