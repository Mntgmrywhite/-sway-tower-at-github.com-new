import type { Scene } from "../skin";
import { smooth } from "./common";
import { level, MIST_GATHER, MIST_SETTLED } from "./tone";

// The lines the climb is laid out on: where the sky ends, and where the mist floor's top lies as
// it gathers over the town, covers it, and sinks to rest low on the screen for the loop.

/** Once settled, the mist floor's top lies this far above the screen's bottom (u). */
export const MIST_REST = 0.3;
/** Gathered, its top lies this far above the horizon (u): over the far end of Main Street and the bridge's feet. */
const COVER = 0.05;
/** Before it gathers it lies this far below the screen (u): its lobes and caps wholly out of sight. */
const BELOW = 0.16;

/** The mist floor's top at rest. */
export function restLine(s: Scene): number {
  return s.cssH - s.u * MIST_REST;
}

/** The mist floor's top at a level: below the screen at the start, over the town once gathered, then at rest. */
export function mistTop(s: Scene, lvl = level(s)): number {
  // (On a short screen the horizon can sink past the rest line first: the mist then waits there.)
  const cover = Math.min(s.horizonY - s.u * COVER, restLine(s));
  const settled = cover + (restLine(s) - cover) * smooth(MIST_GATHER[1], MIST_SETTLED, lvl);
  const below = s.cssH + s.u * BELOW;
  return below + (settled - below) * smooth(MIST_GATHER[0], MIST_GATHER[1], lvl);
}

/** Where the sky's gradient ends: the horizon on the first pass, easing to the mist's rest line with it. */
export function skyEnd(s: Scene, lvl = level(s)): number {
  const k = smooth(MIST_GATHER[1], MIST_SETTLED, lvl);
  return Math.max(1, s.horizonY + (restLine(s) - s.horizonY) * k);
}

/**
 * How far down the far land's bodies (the hollow's hills, the mansion's ridge) must reach so no gap
 * ever opens under them: to the horizon while Main Street's floor lies below it, and once the mist
 * has swallowed the town (and the street is no longer drawn), on down under the mist's top, however
 * the horizon and the mist sink past each other as you climb (or on a zoomed-out screen).
 */
export function landBottom(s: Scene, lvl = level(s)): number {
  const under = lvl >= MIST_GATHER[1] ? mistTop(s, lvl) + s.u * 0.03 : s.horizonY;
  return Math.max(s.horizonY, under) + 1;
}

/** Whether Main Street (its floor, walls, lamps and kerb) still shows: once the mist has gathered over it, never again. */
export function streetShows(lvl: number): boolean {
  return lvl < MIST_GATHER[1];
}
