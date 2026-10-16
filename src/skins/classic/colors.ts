import type { Palette } from "../skin";

// Sky Islands colors. A tight set of hues on top of the sky: cloud white, leaf green, warm
// earth for the island strata, coral and sunflower as the warm accents, and the deep plum ink
// every near thing is outlined in. Near things use these as they are (flat, two-tone, inked);
// far things are mixed toward the sky of the moment (see tone.ts) and never outlined.

/** Outline color for everything up close: the same deep plum as the bars' ink. */
export const INK = "#2a1f3d";

/**
 * The base palette. Classic paints its own backdrop over the base sky, field and band (see
 * classic.ts), so these are the day values the base would show, and the icon art's colors.
 */
export const PALETTE: Palette = {
  skyTop: "#3f8fe8",
  skyMid: "#66b2f2",
  skyBottom: "#c4e8fb",
  star: "#fff8e0",
  moon: "#fff4cf",
  cloudShadow: "#c3d8f2",
  cloudBase: "#f4f9ff",
  cloudLight: "#ffffff",
  far: "#9ccbe9",
  fieldFar: "#c4e6a6",
  fieldNear: "#a5d886",
  // The base band in front is covered by Classic's cloud lip; these match it.
  grass: "#f4f9ff",
  grassDark: "#c3d8f2",
  stone: "#c3d8f2",
  stoneLight: "#f4f9ff",
  ink: INK,
};

// ---------------------------------------------------------------- the home island

/** Grass: body, lit top, shaded scallops. */
export const GRASS = "#5ccb4c";
export const GRASS_LIGHT = "#9ee66a";
export const GRASS_SHADE = "#36a046";

/**
 * The strata under every island, top to bottom: dark topsoil, golden sand, terracotta clay,
 * umber, and a dusky plum bedrock at the tip. Each band has a lit top edge (`lit`).
 */
export const STRATA = [
  { body: "#b8703f", lit: "#d78f57" },
  { body: "#efb763", lit: "#fbd58e" },
  { body: "#d0663f", lit: "#e8875c" },
  { body: "#8c4f3a", lit: "#a96a52" },
  { body: "#6e5a8c", lit: "#8b78a8" },
] as const;
/** Pebbles set in the strata. */
export const PEBBLE = "#f3e3c2";
export const PEBBLE_SHADE = "#cdb48e";

/** Hanging roots and the vines that trail over the lip. */
export const ROOT = "#9a5d38";
export const VINE = "#3fae4a";
export const VINE_LEAF = "#74d65a";

/** The plinth under the base block: pale warm stone (also the icon art's stone). */
export const STONE = "#efe1c2";
export const STONE_LIGHT = "#fff6e0";
export const STONE_SHADE = "#cdb88e";

/** Round bush and tree canopies on the islands. */
export const LEAF = "#46b64a";
export const LEAF_LIGHT = "#86de5c";
export const LEAF_SHADE = "#2c8c40";
export const TRUNK = "#9a5d38";

// ---------------------------------------------------------------- accents

export const CORAL = "#ff6f61";
export const SUNNY = "#ffcd3c";
export const CREAM = "#fff3d6";

// ---------------------------------------------------------------- near clouds

/** The cloud lip in front: lit caps, body, shaded underside. */
export const CLOUD_LIGHT = "#ffffff";
export const CLOUD = "#f4f9ff";
export const CLOUD_SHADE = "#d3e3f6";
