// Shared New Year's colors: a bright cartoon midnight party. Candy-bright fills for the props,
// fireworks and bars, one ink for every outline up close, and one faded violet for the
// distant city. Plus the year on the marquee and two small math helpers the layers share.

export const GOLD = "#ffd23f";
export const PINK = "#ff4f9a";
export const CYAN = "#45cfee";
export const VIOLET = "#a06cf0";
export const ORANGE = "#ffa630";
export const SILVER = "#dfe4f7";
export const RED = "#ff5a5f";
export const MINT = "#3fdcb4";
export const MAGENTA = "#e45ad8";
export const BLUE = "#5b8cff";
export const LIME = "#b6e65a";
export const CREAM = "#fff4d6";

/** Outline for everything up close. */
export const INK = "#21173a";
/** The distant city: one flat violet a little darker than the sky, no outlines. */
export const FAR = "#46388f";
/** The back row of the city, hazier still. */
export const FAR_BACK = "#5c4aa6";

/** Firework / confetti colors, in a fixed order so hash() can pick from them. */
export const PARTY = [GOLD, PINK, CYAN, MINT, VIOLET, ORANGE] as const;

/** The year being rung in: from July on it is next year's party. Fixed once per load. */
export const YEAR = (() => {
  const d = new Date();
  return String(d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear());
})();

export const TAU = Math.PI * 2;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
