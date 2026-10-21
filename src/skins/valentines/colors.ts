import { mix } from "../../base/draw";
import type { Palette } from "../skin";

// Valentine's Day colors: Paris at the golden hour, drawn as an Art Nouveau poster. The city in
// the colors of the owner's photo, warmed by a low sun: honey and cream limestone, blue-grey zinc
// mansard roofs, terracotta chimney pots, dark iron balconies, round green trees, a gilded dome
// and a bronze lattice tower; the boulevard's shops in rose, mint and gold with stained glass and
// striped awnings; the garden in rose red, leaf green, a turquoise pool and cream-pink marble. The
// dreamier Rococo pastels belong to the dusk and the dawn of the climb (tone.ts). Up close,
// everything is drawn with a fine contour in a warm plum, bolder round a silhouette than inside
// it, never the heavy ink of the other skins; far things are mixed toward the haze of the hour
// and drawn flat.

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

// ---------------------------------------------------------------- the city

/** Haussmann limestone: honey cream in the sun, its lit ledges, and the warm shade of its returns and recesses. */
export const LIMESTONE: Shades = { light: "#fff1cc", body: "#f2cf94", shade: "#c8916e" };
/** Zinc mansard roofs: blue-grey, their sunward slopes and ridges lit, their shaded sides. */
export const ZINC: Shades = { light: "#aebfe6", body: "#6f80b6", shade: "#4e598c" };
/** Window glass by day (the sky's blue in it), and lit from within at dusk. */
export const GLASS = "#4c5a8c";
export const GLOW = "#ffd27a";
/** Wrought-iron balconies and window rails. */
export const BALCONY = "#3c3454";
/** Terracotta chimney pots. */
export const POT = "#de7650";
/** Round avenue trees, and their trunks. */
export const TREE: Shades = { light: "#93c76b", body: "#62a052", shade: "#3f7646" };
export const TRUNK = "#7a5446";
/** The gilded dome. */
export const GILT: Shades = { light: "#ffe796", body: "#f2bd48", shade: "#c0832c" };
/** The lattice tower's bronze, lit on its sunward edges; its lamps at night. */
export const BRONZE: Shades = { light: "#e9a27a", body: "#b46a52", shade: "#7e4639" };
export const TOWER_LAMP = "#ffe08a";
/** The white basilica on its far hill. */
export const BASILICA = "#fff6ec";
/** The avenue's roadway. */
export const ROADWAY = "#d9c2b0";
/** The far hill on the horizon, and the shade on the basilica. */
export const FAR_HILL = "#b99cc9";
export const BASILICA_SHADE = "#d9c3cc";
/** The Ferris wheel's teal ironwork (and lit hub), its rose gondolas. */
export const WHEEL_IRON = "#2f7d72";
export const WHEEL_HUB = "#3f9284";
export const GONDOLA = "#f0627f";

// ---------------------------------------------------------------- the boulevard

/** The boulevard's pavement, and the kerb along its edge. */
export const PAVEMENT = "#ecd2b4";
export const KERB = "#cfa98f";
/** The chocolatier's rose woodwork (lit edge, body), the café's sage (lit edge, body), the awning's stripes. */
export const ROSE_WOOD_LIT = "#f590a8";
export const ROSE_WOOD = "#d24a6c";
export const SAGE_WOOD_LIT = "#9fd0b2";
export const SAGE_WOOD = "#4d8f72";
export const AWNING = "#e8486a";
export const AWNING_CREAM = "#fff2e0";
/** The canal's water and its lit ripples, the honey stone of its quays and the bridge (lit, body, shade). */
export const CANAL = "#5fbccb";
export const CANAL_LIT = "#d4f4ee";
export const QUAY: Shades = { light: "#fff0d0", body: "#ead1a8", shade: "#bf957c" };

// ---------------------------------------------------------------- the fountain and the garden

/** Cream-pink marble: the fountain's basin, pedestal and the cherub's plinth. */
export const MARBLE = shades("#f2dcd4", 0.5, 0.22);
/** The joints and carved lines in the marble, and the shadowed hollows of the pedestal's niches. */
export const CARVING = mix(MARBLE.body, "#7a4a5a", 0.3);
export const NICHE = mix(MARBLE.body, "#b48a96", 0.45);
/** The fountain's water, its lit ripples and foam. */
export const WATER = "#5fbfcb";
export const WATER_LIT = "#d4f6f0";
export const FOAM = "#ffffff";
/** The pedestal's reflection on the water under its foot. */
export const REFLECTION = mix(WATER, MARBLE.body, 0.42);
/** The lawn of the rose garden: the near band round the fountain, and the far one behind it. */
export const LAWN = shades("#74b35c", 0.4, 0.24);
export const LAWN_FAR = "#8ec173";
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

/** The plaza's fish-scale mosaic: warm sand, every other scale rose, and the joints round its scales (JOINT). */
export const PAVING = shades("#f1d4b4", 0.42, 0.2);
export const PAVING_ROSE = "#eebcae";
/** The mosaic in front of the railing, deeper: terracotta and rose, darker joints. */
export const TERRACOTTA = "#e3a98c";
export const TERRACOTTA_ROSE = "#d98a84";
export const TERRACOTTA_JOINT = "#a2645a";
export const JOINT = "#c38c7a";
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
