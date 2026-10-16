import { mix } from "../../base/draw";

// Shared New Year's colors: Manhattan and The Great Gatsby, Art Deco in black and gold, drawn
// in the bright cartoon style. Gold, champagne, emerald and ivory on a deep indigo night;
// lacquer black for the Deco props (never as dark as the ink, so outlines still read); one
// faded indigo for the distant city; and the green light across the bay.

/* ---------------------------------------------------------------- sky */

export const SKY_TOP = "#29236b";
export const SKY_MID = "#3e3494";
export const SKY_BOTTOM = "#7a5fb4";

/* ---------------------------------------------------------------- jewels */

export const GOLD = "#ffc93c";
export const GOLD_LIGHT = "#ffe58f";
export const GOLD_DARK = "#c98a1e";
export const CHAMPAGNE = "#f7dc98";
export const IVORY = "#fbf3dc";
export const EMERALD = "#1fbf86";
export const EMERALD_DARK = "#138060";
export const ROSE = "#ff6b9a";
export const SAPPHIRE = "#4b84ff";
export const RUBY = "#ff4f5e";
export const AMBER = "#ff9b3d";
export const AQUA = "#3fd2e6";
export const LIME = "#b4e04a";
export const AMETHYST = "#a46cf2";
export const ORCHID = "#e15fd6";
export const SILVER = "#dde3f4";
/** The green light at the end of the dock: brighter than any emerald in the scene. */
export const GREEN_LIGHT = "#59ffaa";

/** Deco black: lacquer and patent leather, a step lighter than the ink so outlines read. */
export const LACQUER = "#3b3260";

/** Outline for everything up close. */
export const INK = "#1d1636";

/* ---------------------------------------------------------------- far city */

/** The distant city: one flat indigo a little darker than the sky at the horizon, no outlines. */
export const FAR = "#463b93";
/** The back row of the city, hazier still. */
export const FAR_BACK = "#5c4ca7";

/* ---------------------------------------------------------------- water and terrace */

export const WATER_FAR = "#4a3f9c";
export const WATER_NEAR = "#2c2a7a";
export const MARBLE_FAR = "#e6d6b4";
export const MARBLE_NEAR = "#d2bd92";

/** Firework / confetti colors, in a fixed order so hash() can pick from them. */
export const PARTY = [GOLD, IVORY, EMERALD, ROSE, SAPPHIRE, CHAMPAGNE] as const;

export const TAU = Math.PI * 2;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** A prop color with its lit top and shaded bottom, mixed once at load. */
export function tones(color: string, light = 0.42, dark = 0.28): { base: string; light: string; dark: string } {
  return { base: color, light: mix(color, "#ffffff", light), dark: mix(color, INK, dark) };
}
