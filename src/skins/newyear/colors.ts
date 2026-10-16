// Shared New Year's colors (a black-and-gold party with magenta, cyan, silver and violet
// neon), plus the year on the marquee and two small math helpers the layers share.

export const GOLD = "#ffc93d";
export const CHAMPAGNE = "#fff1b8";
export const MAGENTA = "#ff2fa8";
export const CYAN = "#29e6ff";
export const VIOLET = "#a35cff";
export const SILVER = "#d9e0ff";
/** Silhouette fill: near-black violet so neon rims pop. */
export const INK = "#0a0416";

/** Firework / confetti colors, in a fixed order so hash() can pick from them. */
export const PARTY = [GOLD, MAGENTA, CYAN, SILVER, VIOLET] as const;

/** The year being rung in: from July on it is next year's party. Fixed once per load. */
export const YEAR = (() => {
  const d = new Date();
  return String(d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear());
})();

export const TAU = Math.PI * 2;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
