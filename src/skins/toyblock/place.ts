import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { smooth } from "./tone";

// Where the big pieces of Toy Kingdom sit on screen, shared by every layer: the land's horizon,
// the cloud sea that swallows the land as you climb, and the tower's column.
//
// The land (block mountains, the toy town, the castle and the rocket on its launch tower, the
// railway hills) is far off and sinks slowly as the camera climbs (parallax P_FAR). After
// RISE0 levels of climbing a sea of block clouds billows up from below the screen, and by RISE1
// it has covered all of the land, up to the castle's flag; then it falls away below you as you
// climb above it, and from DROP1 it lies at the bottom of the screen for good (SEA u deep).
// These count levels climbed since the start (taller screens start a few levels up), so every
// screen sees the same climb. Past RISE1 the land is never drawn, and past DROP1 nothing here
// changes any more: the looping story (tone.ts) keeps it the same lap after lap.

/** How fast the land sinks as the camera climbs (1 moves with the tower). */
const P_FAR = 0.25;
/** Where the land's horizon sits at the start, in u above the floor line (as the base world's). */
export const HORIZON_UP = 0.3;
/** The highest point of the land (the castle's flag), in u above its horizon. */
const LAND_TOP = 0.385;
/** How far above the land's top the sea reaches when it covers it (u). */
const COVER_MARGIN = 0.03;
/** The sea billows up over these levels of climbing... */
const RISE0 = 2;
export const RISE1 = 20;
/** ...then falls away, and lies at the bottom of the screen from here on. */
export const DROP1 = 36;
/** How deep the sea lies at the bottom of the screen once you are above it (u). */
export const SEA = 0.2;

/** Half width of the tower's column (u): nothing moves in it, and the lanes stay out of it. */
export const COLUMN = 0.25;

/** Levels climbed since the start: 0 until the camera starts to rise. */
export function climbed(s: Scene): number {
  return s.rise / (s.scale * BLOCK_HEIGHT);
}

/** Screen y of the land's horizon: where the far land stands. */
export function horizon(s: Scene): number {
  return s.groundY - s.rise * (1 - P_FAR) - s.u * HORIZON_UP;
}

/**
 * Screen y of the cloud sea's top edge: below the screen at the start, billowing up over the
 * land, then falling away to lie SEA u deep at the bottom of the screen.
 */
export function seaTop(s: Scene): number {
  const lvl = climbed(s);
  const below = s.cssH + s.u * 0.25;
  const cover = horizon(s) - s.u * (LAND_TOP + COVER_MARGIN);
  const pin = s.cssH - s.u * SEA;
  const up = below + (cover - below) * smooth(RISE0, RISE1, lvl);
  return up + (pin - up) * smooth(RISE1, DROP1, lvl);
}

/**
 * Whether any of the land shows above the sea (`top` is the sea's top edge). Once the sea has
 * covered it (RISE1), it is gone for good: the sea falls away faster than the land sinks, but the
 * land stays hidden under it.
 */
export function landShows(s: Scene, top: number): boolean {
  const peak = horizon(s) - s.u * LAND_TOP;
  return climbed(s) < RISE1 && peak < top && peak < s.cssH;
}
