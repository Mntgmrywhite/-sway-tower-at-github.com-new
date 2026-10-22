import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { smooth } from "./common";
import { level, LOOP_PERIOD, LOOP_START, MIST_GATHER, MIST_SETTLED, STRETCH } from "./tone";

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

/** The near edge (front.ts): its railing stands on this line (y), the grass tips this far (u) over it. */
export function nearTop(s: Scene): number {
  return layerGround(s, NEAR_P) + s.u * NEAR_DROP;
}
const NEAR_P = 1.6;
const NEAR_DROP = 0.36;
export const GRASS_TIPS = 0.026;

/** How far a big fill stopped short of the screen's bottom runs on under the next (px): seams stay shut on a screen drawn scaled down to 0.6. */
export const OVERLAP = 3;

/**
 * From here down the near edge paints the whole screen opaque (its flagstones), so nothing behind
 * it is drawn below this line: a big fill there is wasted time on a phone.
 */
export function coverTop(s: Scene): number {
  return nearTop(s) - s.u * GRASS_TIPS;
}

/** Whether Main Street (its floor, walls, lamps and kerb) still shows: once the mist has gathered over it, never again. */
export function streetShows(lvl: number): boolean {
  return lvl < MIST_GATHER[1];
}

// ---------------------------------------------------------------- the height story's placements

/** Pixels per level of the camera's climb on this screen. */
export function perLevel(s: Scene): number {
  return BLOCK_HEIGHT * s.scale;
}

/**
 * Screen y of something placed in the height story: at `at` (a fraction of the screen's height) when
 * the camera is at level L, moving with parallax p (0 fixed, 1 with the tower) as it climbs.
 */
export function storyY(s: Scene, L: number, p: number, at: number, lvl = level(s)): number {
  return at * s.cssH + (lvl - L) * perLevel(s) * p;
}

/**
 * The level of the copy of a loop thing (at `f` of the loop) nearest the camera, from the first that
 * shows (the loop's last stretch, E, shows on the first pass too: its things are there one loop
 * early). For things on a layer slow enough to be on screen at most once at a time.
 */
export function loopCopy(f: number, lvl: number): number {
  const L0 = LOOP_START + f * LOOP_PERIOD;
  const k = Math.round((lvl - L0) / LOOP_PERIOD);
  const first = L0 - LOOP_PERIOD >= STRETCH.E - LOOP_PERIOD * 0.02 ? -1 : 0;
  return L0 + Math.max(first, k) * LOOP_PERIOD;
}

/**
 * How far something in the left lane, below the moon, has come out of the dark (0..1): nothing may
 * cross the moon, so a thing coming down that lane fades in below its halo instead of passing it.
 * `top` is the thing's top (screen y); `haloBottom` the moon's halo's lowest point.
 */
export function belowMoon(s: Scene, top: number, haloBottom: number): number {
  return smooth(haloBottom + s.u * 0.01, haloBottom + s.u * 0.08, top);
}
