import type { Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { drawArcade, type ArcadeSpot } from "./arcade";
import { drawCar } from "./car";
import { drawPalm, RIM, SOFT_RIM, type Palm } from "./palms";

// The floor around the tower: two tall palms framing the scene at the screen edges, a roadside
// arcade under the left one's crown and a young palm under the right one's, and the chrome car
// cruising past in front. All of it stays outside the tower's column.
//
// The side props share one depth so they slide down together as the camera climbs (props at
// different depths would drift into each other); only the car is nearer, and it sits below
// them, so it only ever drifts further away.

/** Depth of the side props. */
const SIDE_Z = 2;

export const ARCADE: ArcadeSpot = { x: -0.34, z: SIDE_Z };

/** Fronds for a tall framing palm (left-hand; mirrored on the right): fuller on the side
 *  toward the tower, short on the side toward the screen edge. As [angle, length, droop]. */
const TALL_FRONDS = [
  [-2.9, 0.05, 0.55],
  [-2.35, 0.065, 0.35],
  [-1.85, 0.072, 0.2],
  [-1.3, 0.082, 0.2],
  [-0.75, 0.095, 0.3],
  [-0.25, 0.09, 0.45],
  [0.25, 0.08, 0.55],
  [2.6, 0.048, 0.6],
] as const;

const SMALL_FRONDS = [
  [-2.75, 0.05, 0.5],
  [-2.15, 0.055, 0.3],
  [-1.6, 0.058, 0.15],
  [-1.0, 0.06, 0.25],
  [-0.45, 0.052, 0.4],
  [0.15, 0.046, 0.55],
  [2.5, 0.042, 0.6],
] as const;

/** A full, even crown for the extra palms that line the floor on wide screens. */
const WIDE_FRONDS = [
  [-2.85, 0.08, 0.5],
  [-2.3, 0.085, 0.3],
  [-1.8, 0.075, 0.15],
  [-1.3, 0.08, 0.2],
  [-0.8, 0.085, 0.3],
  [-0.3, 0.08, 0.5],
  [0.25, 0.07, 0.6],
  [2.85, 0.065, 0.6],
] as const;

/** Palms, back to front. */
export const PALMS: readonly Palm[] = [
  { x: 0.36, z: SIDE_Z, h: 0.15, lean: 0.015, bow: 0.3, w: 0.016, fronds: SMALL_FRONDS, phase: 1.7 },
  { x: -0.455, z: SIDE_Z, h: 0.38, lean: 0.035, bow: 0.12, w: 0.02, fronds: TALL_FRONDS, phase: 0 },
  { x: 0.455, z: SIDE_Z, h: 0.35, lean: 0.035, bow: 0.12, w: 0.02, fronds: TALL_FRONDS, phase: 2.4 },
];

/** Extra palms further out, drawn only where the screen is wide enough to show them whole. */
export const WIDE_PALMS: readonly Palm[] = [-0.78, 0.8, -1.12, 1.15, -1.46, 1.5, -1.8, 1.84].map((x, i) => ({
  x,
  z: SIDE_Z,
  h: [0.3, 0.33, 0.36, 0.29][i % 4]!,
  lean: 0.03,
  bow: 0.2,
  w: 0.02,
  fronds: WIDE_FRONDS,
  phase: i * 1.3,
}));
/** Half the width a wide palm needs, crown included (u at the tower's depth). */
const WIDE_REACH = 0.15;

export function ground(ctx: Ctx, s: Scene): void {
  drawArcade(ctx, s, ARCADE);
  const room = s.cssW / 2 / s.u;
  for (const p of WIDE_PALMS) {
    if (Math.abs(p.x) + WIDE_REACH * (TOWER_DEPTH / p.z) < room) drawPalm(ctx, s, p, RIM);
  }
  for (const p of PALMS) drawPalm(ctx, s, p, p.h < 0.2 ? SOFT_RIM : RIM);
  drawCar(ctx, s);
}
