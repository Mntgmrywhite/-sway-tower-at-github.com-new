import type { Ctx } from "../../base/draw";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { ARCADE, drawArcade } from "./arcade";
import { carAt, drawCar } from "./car";
import { deck } from "./deck";
import { drawDriver, drawDriverInDoor } from "./driver";
import { drifters } from "./drift";
import { drawPalm, RIM, type Palm } from "./palms";
import { toneOf } from "./tone";

// The floor around the tower, then what you climb into. Two tall palms frame the sunset at the
// screen edges, their crowns up beside the tower top at the start, so you rise past them; a
// roadside arcade stands under the left one, and the chrome car is parked on the grid under the
// other. Every half minute or so they put on a show (show.ts): the driver comes out of the
// arcade and walks over to the car (driver.ts), which burns out, peels out into the distance,
// does three donuts far out, zooms off to the city on the horizon and comes back in from the
// bottom of the screen to park (car.ts); then the driver walks back into the arcade.
// All of it stays outside the tower's column. As you climb, the floor drops away, a bank of
// night cloud rolls in over the grid (deck.ts), and things drift past in the side lanes
// (drift.ts).
//
// The palms and the arcade share one depth so they slide down together as the camera climbs
// (props at different depths would drift into each other); only the car is nearer, and it
// sits below them, so it only ever drifts further away. Its show takes it far beyond their
// depth (up its lane between the tower and the right palm), and it is drawn behind them while it
// is there. The driver walks the floor in front of them all; in the arcade's doorway they are drawn
// by the arcade (behind its sliding door), and at the car between its open door and its body (so
// they step in behind it).

/** Depth of the side props: the arcade's. */
const SIDE_Z = ARCADE.z;

export { ARCADE };

/** Fronds for a tall framing palm (left-hand; mirrored on the right): fuller on the side
 *  toward the tower, short on the side toward the screen edge. As [angle, length, droop]. */
const TALL_FRONDS = [
  [-2.9, 0.05, 0.55],
  [-2.35, 0.065, 0.35],
  [-1.85, 0.072, 0.2],
  [-1.3, 0.082, 0.2],
  [-0.75, 0.09, 0.3],
  [-0.25, 0.085, 0.45],
  [0.25, 0.075, 0.55],
  [2.6, 0.048, 0.6],
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

/** The two framing palms: tall, the left one taller, so their crowns stagger. */
export const PALMS: readonly Palm[] = [
  { x: -0.455, z: SIDE_Z, h: 0.54, lean: 0.035, bow: 0.1, w: 0.02, fronds: TALL_FRONDS, phase: 0 },
  { x: 0.455, z: SIDE_Z, h: 0.44, lean: 0.035, bow: 0.12, w: 0.02, fronds: TALL_FRONDS, phase: 2.4 },
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

/** The props planted on the floor: the arcade, the palms, the car (behind them while it is
 *  further away than they stand) and its driver (in front of them). */
export function floorProps(ctx: Ctx, s: Scene): void {
  const far = carAt(s).z > SIDE_Z;
  if (far) drawCar(ctx, s);
  drawArcade(ctx, s, ARCADE, drawDriverInDoor);
  const room = s.cssW / 2 / s.u;
  for (const p of WIDE_PALMS) {
    if (Math.abs(p.x) + WIDE_REACH * (TOWER_DEPTH / p.z) < room) drawPalm(ctx, s, p, RIM);
  }
  for (const p of PALMS) drawPalm(ctx, s, p, RIM);
  if (far) drawDriver(ctx, s);
  else drawCar(ctx, s, drawDriver);
}

/** The ground hook: floor props, the cloud bank over them, then the side lanes in front. */
export function ground(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  floorProps(ctx, s);
  deck(ctx, s, tone);
  drifters(ctx, s, tone);
}
