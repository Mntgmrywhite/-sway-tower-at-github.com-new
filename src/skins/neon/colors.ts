import { mix } from "../../base/draw";

// Shared Synthwave colors: an 80s sunset in hot pink, neon orange, cyan and deep violet.
// Props are near-black violet silhouettes; only their thin neon rims and a few small accents
// (taillights, the arcade sign, lit windows) glow, so the bars stay the brightest thing.

export const PINK = "#ff2fa8";
export const HOT = "#ff4f8b";
export const ORANGE = "#ff8a2a";
export const GOLD = "#ffd84a";
export const CYAN = "#2de2ff";
export const VIOLET = "#9b5cff";
export const MAGENTA = "#e04bff";
export const RED = "#ff2a4f";

/** Silhouette fills: near-black violet, a little lighter far away (haze). */
export const SHADOW = "#0c0316";
export const SHADOW_MID = "#140624";
export const SHADOW_FAR = "#1d0a33";

/**
 * Sky gradient stops (top to horizon). The base deepens them toward night as you climb (see
 * src/base/neon-world.ts): a sunset glow low down at the start, a violet sky by mid-climb and a
 * near-black starry violet high up.
 */
export const SKY_TOP = "#070219";
export const SKY_MID = "#2a0a46";
export const SKY_BOTTOM = "#7a1468";

/** Smooth 0..1..0 window over [a, b], easing in and out over `edge` at each end. */
export function window01(x: number, a: number, b: number, edge: number): number {
  if (x <= a || x >= b) return 0;
  return Math.min(1, (x - a) / edge, (b - x) / edge);
}

/** Night-sky fills behind the moon and the planet's shadow side (hide the stars behind them). */
export const NIGHT_DISC = mix(SKY_TOP, SKY_MID, 0.45);
