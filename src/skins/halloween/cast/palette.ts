import { alpha } from "../../../base/draw";

// The cast's colors: every character and creature of the Halloween skin is painted from this
// list (and alpha variants of it), so the whole cast reads as one Burton family against the
// night. Ink and night black for the silhouettes, a cool moonlight rim on their upper-left
// edges, pale skin and bone, muted purples, reds and blues for the costumes, ghost green and
// ghost white, and the warm glow (pumpkin, gold, flame) only where a lantern, candle, eye or
// jack-o'-lantern shines. A test holds every fill and stroke to this list.

export const INK = "#0e0a16";
export const NIGHT = "#15121d";
export const CHARCOAL = "#2a2733";
export const MIDNIGHT = "#1c2347";
export const PURPLE = "#5b3f7a";
export const PURPLE_DEEP = "#3a2752";
export const GHOST_GREEN = "#9fe0b8";
export const GHOST_WHITE = "#eef4ff";
export const PUMPKIN = "#ff8a1e";
export const PUMPKIN_LIGHT = "#ffb04f";
export const PUMPKIN_DARK = "#c95a12";
export const GOLD = "#ffd25e";
export const FLAME_HOT = "#fff0a0";
export const BONE = "#efe8d6";
export const BONE_SHADE = "#c3bba6";
export const SKIN = "#efe6ee";
export const SKIN_SHADE = "#cfc3d8";
export const EYE_RING = "#3a2d4a";
export const STRIPE_BLACK = "#1b1724";
export const STRIPE_WHITE = "#e9e4ef";
export const MOON_RIM = "#c9c3ec";
export const RED = "#9e3346";
export const BLUE = "#3f5aa8";
export const MOSS = "#6f7f4a";
export const RAT = "#4a4258";
export const RAT_BELLY = "#6e6684";
export const RAT_PINK = "#c98a9a";
export const SILK = "#d8d2ec";
export const SILHOUETTE = "#0b0818";
/** The crow's and the raven's violet sheen. */
export const SHEEN = "#4b3d6e";
/** The Headless Horseman's horse: its faint rib lines. */
export const RIB = "#2a2236";
/** The spider's body. */
export const SPIDER = "#1a1424";
/** A lit curtain, its folds, and the shadow passing behind it. */
export const CURTAIN = "#ffc65a";
export const CURTAIN_FOLD = "#e09a3a";
export const SHADOW = "#3a1f2a";
/** The pumpkin costume's stitched seams, and a ghost's hollow eyes and mouth. */
export const STITCH = "#e0781e";
export const HOLLOW = "#2a2440";

/** Every color the cast paints with (alpha variants of these are allowed too). */
export const CAST_PALETTE: readonly string[] = [
  INK, NIGHT, CHARCOAL, MIDNIGHT, PURPLE, PURPLE_DEEP, GHOST_GREEN, GHOST_WHITE, PUMPKIN,
  PUMPKIN_LIGHT, PUMPKIN_DARK, GOLD, FLAME_HOT, BONE, BONE_SHADE, SKIN, SKIN_SHADE, EYE_RING,
  STRIPE_BLACK, STRIPE_WHITE, MOON_RIM, RED, BLUE, MOSS, RAT, RAT_BELLY, RAT_PINK, SILK,
  SILHOUETTE, SHEEN, RIB, SPIDER, CURTAIN, CURTAIN_FOLD, SHADOW, STITCH, HOLLOW,
];

// Precomputed translucent colors (never built per frame).
export const SILK_A = alpha(SILK, 0.55);
export const GHOST_BODY = alpha(GHOST_WHITE, 0.55);
export const GHOST_RIM = alpha(GHOST_GREEN, 0.25);
export const GOLD_HALO = alpha(GOLD, 0.25);
export const GREEN_HALO = alpha(GHOST_GREEN, 0.25);
export const PUMPKIN_GLOW = alpha(PUMPKIN, 0.2);
export const SHADOW_A = alpha(SHADOW, 0.85);
export const CARRIAGE_BODY = alpha(GHOST_GREEN, 0.4);
export const CARRIAGE_LIGHT = alpha(GHOST_WHITE, 0.4);
export const DUST = alpha(BONE, 0.5);
/** Moonlight on the edge of a small dark creature: softer than the full rim. */
export const RIM_SOFT = alpha(MOON_RIM, 0.6);
