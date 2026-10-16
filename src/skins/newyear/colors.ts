import { mix } from "../../base/draw";

// Shared New Year's colors: Manhattan and The Great Gatsby, Art Deco in black and gold, drawn
// in the bright cartoon style. A midnight-navy night (blue, never purple) with GOLD as the hero
// color — gilded crowns, lit windows, searchlights, confetti — champagne and ivory as the
// lights, a touch of emerald for the green light, and Deco black lacquer for the towers and
// props (a step lighter than the ink, so outlines still read).

/* ---------------------------------------------------------------- sky */

export const SKY_TOP = "#080e26";
export const SKY_MID = "#11234f";
/** The horizon: a clear royal navy, so the black towers stand out against it. */
export const SKY_BOTTOM = "#2b5296";

/* ---------------------------------------------------------------- jewels */

export const GOLD = "#ffc93c";
export const GOLD_LIGHT = "#ffe58f";
export const GOLD_DARK = "#c98a1e";
/** Deep bronze-gold for the shaded side of gilded crowns. */
export const GOLD_DEEP = "#9a6414";
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
export const LACQUER = "#1f2540";

/** Outline for everything up close. */
export const INK = "#0b0d1c";

/* ---------------------------------------------------------------- Manhattan */

/** The hazy back row of the city: a flat navy just under the horizon sky, no outlines. */
export const FAR_BACK = "#20407a";
/** palette.far, and the haze the mansion across the bay is mixed toward. */
export const FAR = "#152a57";
/** The middle row: dark shafts under gilded crowns, well clear of the navy sky behind them. */
export const MID_ROW = "#0f1f47";
/** The hero towers: black lacquer bodies with gold outlines. */
export const TOWER = "#0d1631";
/** Fluted piers up the hero towers, a shade off the lacquer. */
export const TOWER_PIER = "#1a2a52";

/* ---------------------------------------------------------------- water and terrace */

export const WATER_FAR = "#1c3a73";
export const WATER_NEAR = "#0b1736";
export const MARBLE_FAR = "#efe1c0";
export const MARBLE_NEAR = "#dcc69a";

/** Firework / confetti colors, in a fixed order so hash() can pick from them. Gold leads. */
export const PARTY = [GOLD, IVORY, EMERALD, GOLD_LIGHT, ROSE, CHAMPAGNE] as const;

export const TAU = Math.PI * 2;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** A prop color with its lit top and shaded bottom, mixed once at load. */
export function tones(color: string, light = 0.42, dark = 0.28): { base: string; light: string; dark: string } {
  return { base: color, light: mix(color, "#ffffff", light), dark: mix(color, INK, dark) };
}
