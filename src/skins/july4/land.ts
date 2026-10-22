import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";

// The climb, row by row. The Fourth is a broad open town seen from its square, and as the tower
// rises you rise over it: the square drops away under you, then Main Street, and the town
// behind it opens out row by row, each row further back sinking slower, as a storybook's
// layers slide past one another: the tree-lined streets just behind Main Street (the front
// row), the neighborhood beyond them with the white church and the courthouse (the back row),
// and the rolling farm hills on the horizon. The far rows ease to rest low on the screen, the
// hills' crest, the rooftops among the treetops and the landmarks standing along the bottom of
// the sky, and there they stay for good (before the story's loop begins, tone.ts LOOP_START),
// so the sun sets behind the hills and the fireworks bloom above the rooftops on every turn of
// the loop, and the climb never runs out of town under it.
//
// Every row is placed from the start screen's own layout (its horizon as the camera stood before
// it moved) and from the screen's bottom at rest, so a phone, an iPad and the zoomed-out view
// all rise over the same town.

/** Levels the camera has climbed since it began to move (0 on the start screen and until the tower outgrows it). */
export function climbed(s: Scene): number {
  return s.rise / (BLOCK_HEIGHT * s.scale);
}

/** The horizon as the start screen has it, before the camera moved. */
export function horizon0(s: Scene): number {
  return s.groundY - s.rise - s.u * 0.3;
}

/** A far row: where it stands at the start (u below the start's horizon), where it rests (u above the screen's bottom), and how many levels of climb it takes to get there. */
interface Row {
  drop: number;
  rest: number;
  climb: number;
}

/** The far hills; the neighborhood with the landmarks; the tree-lined streets behind Main Street. */
export const HILLS: Row = { drop: 0, rest: 0.31, climb: 80 };
export const BACK: Row = { drop: 0.035, rest: 0.18, climb: 76 };
export const FRONT: Row = { drop: 0.1, rest: 0.055, climb: 72 };

/**
 * A far row's line: it sinks from its start as the camera climbs, fastest at first (the nearer
 * rows faster), and eases to rest. Never rises: its rest is below its start on every screen.
 */
function rowLine(s: Scene, r: Row): number {
  const start = horizon0(s) + r.drop * s.u;
  const rest = s.cssH - r.rest * s.u;
  const k = 1 - Math.min(1, climbed(s) / r.climb);
  return rest - (rest - start) * k * k;
}

/**
 * How tall the far hills stand, as a share of their height from the square: seen from the
 * square they rise round the town, and as you rise over it they flatten below you, easing to
 * HILLS_FLAT of it as the row comes to rest.
 */
export const HILLS_FLAT = 0.55;
export function hillScale(s: Scene): number {
  const k = 1 - Math.min(1, climbed(s) / HILLS.climb);
  return HILLS_FLAT + (1 - HILLS_FLAT) * k * k;
}

export function hillLine(s: Scene): number {
  return rowLine(s, HILLS);
}

export function backLine(s: Scene): number {
  return rowLine(s, BACK);
}

export function frontLine(s: Scene): number {
  return rowLine(s, FRONT);
}

/** Whether the far rows have all come to rest. */
export function settled(s: Scene): boolean {
  return climbed(s) >= Math.max(HILLS.climb, BACK.climb, FRONT.climb);
}

/** Main Street stands this far below the start's horizon (u), and sinks at this share of the tower's pace. */
export const MAIN_DROP = 0.09;
const MAIN_P = 0.55;

/** The line Main Street's fronts stand on (the far side of the square): it sinks past the screen's bottom and is gone. */
export function mainLine(s: Scene): number {
  return horizon0(s) + MAIN_DROP * s.u + MAIN_P * s.rise;
}

/** The tallest thing of Main Street (u above its line): past the screen's bottom by this, it is no longer drawn. */
export const MAIN_TOP = 0.36;

/** Whether Main Street (and the square in front of it) still shows. */
export function mainShows(s: Scene): boolean {
  return mainLine(s) - MAIN_TOP * s.u < s.cssH;
}
