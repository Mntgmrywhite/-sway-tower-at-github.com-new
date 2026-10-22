import { smooth } from "./shapes";

// The town's breath: the things that come and go on their own clocks, shared by the layers that
// show them. Every so often a breeze runs through the square (first at BREEZE_AT, then every
// BREEZE_EVERY): the flags fly out, the bunting and the banners swing, the leaves shift, the
// pinwheels spin up, petals lift off the flower beds. Deterministic from the scene's clock.

/** The breeze: its first gust, how often it comes round, how long it blows. */
export const BREEZE_AT = 4;
export const BREEZE_EVERY = 17;
const GUST = 5;

/** How hard the breeze blows at scene time t: 0 still, up to 1 at a gust's height. */
export function breeze(t: number): number {
  if (t < BREEZE_AT) return 0;
  const k = ((t - BREEZE_AT) % BREEZE_EVERY) / GUST;
  if (k >= 1) return 0;
  return smooth(0, 0.25, k) * (1 - smooth(0.55, 1, k));
}
