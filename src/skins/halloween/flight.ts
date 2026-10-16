import { hash } from "../../base/draw";
import { fieldY, HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { spot } from "./common";
import { flyingBox } from "./crow";
import { moonAt } from "./sky";
import { houseBox } from "./town";

// The churchyard crow's flight. It keeps watch on its headstone, cawing now and then; once every
// half minute (earlier or later in it, by hash) it takes off, skims left under the tower's base
// over the graves, climbs steeply up the lane left of the tower, past the trick-or-treaters and
// the porch house on the tower's side of them, circles twice round in front of the harvest moon
// (crossing its face each time), between the HUD and the house's roof, then glides back down the
// same side, swoops in under the base, overshoots its stone and turns back onto it, facing the
// moon again.
//
// Its route is laid out in the start view from the scene's own landmarks (the perch, the tower's
// column, the screen's left edge, the moon, the porch house, the HUD), so it fits every screen: it
// never enters the tower's column above the floor line, never reaches a screen edge, only ever
// passes the kids and the house (never circles over them), and it is over the moon only while the
// Headless Horseman is off his ride (his loop is 10 s; the crow's is three of them). As the camera
// climbs, the whole flight rides down with the churchyard (it is a near thing) and leaves the view
// with it. All of it is a pure function of the scene: time, size, climb.

/** The headstone the crow sits on (see graveyard.ts), and its size there, in u at the tower's depth. */
export const PERCH = { kind: "stone", X: 0.09, z: 1.64, w: 0.06, h: 0.066, stone: "round", seed: 3 } as const;
export const CROW_SIZE = 0.06;

/** Seconds per flight cycle (one flight each): a whole number of the Horseman's 10 s rides. */
export const CYCLE = 30;
/** When it takes off and when it lands, seconds into the cycle. */
export const TAKE_OFF = 3.4;
export const LAND = 14.0;
/** A late flight starts this much later in its cycle: one of the Horseman's 10 s rides. */
const LATE = 10;
/** Below this sideways speed (u/s) it is squeezed, turning. */
const TURN_SPEED = 0.035;
/**
 * Where the route holds its facing (straight up or down the tower's side, where its sideways
 * speed is nearly nil and would flip it about), it is turned as if moving sideways at this
 * speed, u/s.
 */
const HOLD_FACE = 0.12;
/** Steepest it tilts climbing or diving, radians. */
const PITCH = 0.7;

/** Flying size: the body scale at depth z, as a fraction of u at the tower's depth. */
const FLY_SCALE = 0.042;
/** Half the flying crow's reach sideways (tail to beak), in body scales. */
export const FLY_REACH = 0.96;
/** Keep this far from the screen's edges and the tower's column, in u. */
const MARGIN = 0.012;
/** At most this wide a stretch of the lane is used (on a wide screen it keeps near the tower), in u. */
const LANE_SPAN = 0.22;
/** Highest the wings rise while it is under the tower's base (they beat low there). */
const CEIL_LOW = 0.1;
/** Depth round the loop in front of the moon: right, top, left, bottom. */
const LOOP_Z = [3.2, 3.6, 3.2, 2.9] as const;
/** Seconds per quarter of the loop, and how many quarters it flies (two whole turns). */
const QUARTER = 0.6;
const QUARTERS = 8;
/** The trick-or-treaters stand this tall above the floor line (the witch's hat), in u. */
const KIDS_TALL = 0.23;
/** The HUD covers the top of the screen down to this fraction of its height. */
const HUD = 0.32;
/** Half the crow's height (wings fully up or down) and its ink, in body scales. */
const HALF_TALL = 1.15;
/** Wingbeats (rad/s) and the wings' lift while gliding. */
const FLAP = 11;
const GLIDE_LIFT = 0.25;

/** What to draw this frame. */
export interface CrowPose {
  /** Perched: feet on the stone; flying: the body's middle. Screen px. */
  x: number;
  y: number;
  /** Perched: height; flying: body scale. Screen px. */
  size: number;
  /** Depth on the field (the tower's line is 3): what it is drawn in front of. */
  z: number;
  perched: boolean;
  /** Facing: -1 left .. 1 right (flying, in between while it turns). */
  dir: number;
  /** Wings: -1 down .. 1 up. */
  lift: number;
  /** Body tilt, radians (nose up < 0, in its own facing). */
  pitch: number;
  /** Legs let down for take-off and landing, 0..1. */
  legs: number;
  caw: number;
  look: number;
}

const POSE: CrowPose = {
  x: 0,
  y: 0,
  size: 0,
  z: PERCH.z,
  perched: true,
  dir: -1,
  lift: 0,
  pitch: 0,
  legs: 0,
  caw: 0,
  look: 0,
};

/**
 * A waypoint of the flight: time in the cycle, position at rest (no climb), depth, how hard it
 * flaps (0 glides), the highest its wings rise, and the way it holds its face (-1 left, 1 right,
 * 0 the way it flies).
 */
interface Way {
  t: number;
  x: number;
  y: number;
  z: number;
  flap: number;
  ceil: number;
  face: number;
}

const WAYS: Way[] = Array.from({ length: 24 }, () => ({ t: 0, x: 0, y: 0, z: 0, flap: 0, ceil: 1, face: 0 }));
let ways = 0;

function way(t: number, x: number, y: number, z: number, flap: number, ceil: number, face = 0): void {
  const w = WAYS[ways++]!;
  w.t = t;
  w.x = x;
  w.y = y;
  w.z = z;
  w.flap = flap;
  w.ceil = ceil;
  w.face = face;
}

/** Body scale at depth z. */
function scaleAt(s: Scene, z: number): number {
  return FLY_SCALE * s.u * (3 / z);
}

/** The rest view (camera at the ground) of a scene. */
const REST: Scene = {
  cssW: 0,
  cssH: 0,
  u: 0,
  scale: 0,
  t: 0,
  rise: 0,
  altitude: 0,
  groundY: 0,
  horizonY: 0,
  baseX: 0,
  baseW: 0,
};

function rest(s: Scene): Scene {
  Object.assign(REST, s);
  REST.rise = 0;
  REST.groundY = s.groundY - s.rise;
  REST.horizonY = s.horizonY - HORIZON_P * s.rise;
  return REST;
}

/** Scratch for the perch. */
const FEET = { x: 0, y: 0, size: 0 };

/** Where the crow's feet grip the headstone, and its perched height. */
export function perchFeet(s: Scene): typeof FEET {
  const { x, y, k } = spot(s, PERCH.X, PERCH.z);
  const h = PERCH.h * s.u * k;
  const tilt = (hash(PERCH.seed) - 0.5) * 0.2;
  FEET.x = x + Math.sin(tilt) * h;
  FEET.y = y - Math.cos(tilt) * h + s.u * 0.002;
  FEET.size = s.u * CROW_SIZE * k;
  return FEET;
}

/**
 * Lay out the flight in the rest view. x in the lane left of the tower is placed by
 * `lane(z, f)`: f = 1 against the tower's column, 0 at most LANE_SPAN farther left (or at the
 * screen's edge), keeping the crow's whole reach inside.
 */
function layout(R: Scene): void {
  const u = R.u;
  const feet = perchFeet(R);
  const homeX = feet.x;
  const homeY = feet.y - feet.size * 0.42;
  const floor = R.groundY;
  const column = R.baseX - u * 0.05;
  const m = moonAt(R);
  const roof = houseBox(R, -1).y0;
  const lane = (z: number, f: number) => {
    const reach = scaleAt(R, z) * FLY_REACH + u * MARGIN;
    const hi = column - reach;
    const lo = Math.max(reach, hi - u * LANE_SPAN);
    return lo + (hi - lo) * f;
  };
  // Half its height at depth z, with the margin kept to anything it passes.
  const half = (z: number) => scaleAt(R, z) * HALF_TALL + u * MARGIN;
  // Under the base its wings beat low (see CEIL_LOW), so its middle keeps this far below the floor.
  const under = (z: number) => floor + scaleAt(R, z) * 0.62 + u * MARGIN;
  // Just over the trick-or-treaters' heads.
  const overKids = (z: number) => floor - u * KIDS_TALL - half(z);
  // The loop in front of the moon: an oval in the lane, its right side over the moon's face, kept
  // between the HUD and the porch house's roof (on a short phone the moon sits right between them).
  const lo = lane(LOOP_Z[0], 0);
  const hi = lane(LOOP_Z[0], 1);
  const lx = (lo + hi) / 2;
  const rx = Math.max(0, (hi - lo) / 2);
  const ceiling = R.cssH * HUD + half(LOOP_Z[1]);
  const bottom = roof - half(LOOP_Z[3]);
  const ry = Math.max(0, Math.min(m.r * 0.78, (bottom - ceiling) / 2));
  const ly = Math.min(bottom - ry, Math.max(ceiling + ry, m.y - m.r * 0.08));
  const D = Math.PI / 2;
  const T0 = TAKE_OFF;

  ways = 0;
  // Off the stone and away left under the tower's base, wings beating low.
  way(T0, homeX, homeY, PERCH.z, 1, CEIL_LOW);
  way(T0 + 0.45, homeX - u * 0.07, under(1.75) + u * 0.004, 1.75, 1, CEIL_LOW);
  way(T0 + 1.1, R.cssW / 2 - u * 0.08, under(2.0), 2.0, 0, CEIL_LOW);
  way(T0 + 1.7, lane(2.4, 1), under(2.4), 2.4, 0.5, CEIL_LOW, -1);
  // Steeply up the tower's side of the lane, beating hard, still facing left (the way it turns
  // into the loop): over the kids' heads, past the house.
  way(T0 + 2.2, lane(2.8, 1), overKids(2.8), 2.8, 1, 1, -1);
  // Twice round the oval, crossing the moon each time: right (on the moon), top (farthest),
  // left, bottom (nearest). It comes in and leaves at the right, on the tower's side.
  for (let i = 0; i <= QUARTERS; i++) {
    const a = -i * D;
    const face = i === 0 ? -1 : i === QUARTERS ? 1 : 0;
    way(T0 + 2.75 + i * QUARTER, lx + rx * Math.cos(a), ly + ry * Math.sin(a), LOOP_Z[i % 4]!, i % 2 ? 0.7 : 1, 1, face);
  }
  // Down the same side, gliding, facing right (the way it goes on under the base), and in to land.
  const down = T0 + 2.75 + QUARTERS * QUARTER;
  way(down + 0.6, lane(2.9, 1), overKids(2.9), 2.9, 0, 1, 1);
  way(down + 1.2, lane(2.4, 1), under(2.4) + u * 0.01, 2.4, 0, CEIL_LOW, 1);
  way(down + 1.9, R.cssW / 2 - u * 0.08, under(2.1), 2.1, 0.4, CEIL_LOW);
  way(LAND - 0.45, homeX + u * 0.04, under(1.7), 1.7, 0.8, CEIL_LOW);
  way(LAND, homeX, homeY, PERCH.z, 1, CEIL_LOW);
}

/**
 * Hermite spline through the waypoints, with tangents from the neighbors (still at the ends). A
 * waypoint that is farthest left or right of its neighbors is passed with no sideways speed, so the
 * flight never swings past it sideways: how near it comes to the tower's column and the screen's
 * sides is set by the waypoints.
 */
const V = { x: 0, y: 0, z: 0, flap: 0, ceil: 1, face: 0, vx: 0, vy: 0 };

function tangent(i: number, key: "x" | "y"): number {
  if (i === 0 || i === ways - 1) return 0;
  const a = WAYS[i - 1]!;
  const w = WAYS[i]!;
  const b = WAYS[i + 1]!;
  if (key === "x" && (w.x - a.x) * (b.x - w.x) <= 0) return 0;
  return (b[key] - a[key]) / (b.t - a.t);
}

function sample(t: number): typeof V {
  let i = 0;
  while (i < ways - 2 && t > WAYS[i + 1]!.t) i++;
  const a = WAYS[i]!;
  const b = WAYS[i + 1]!;
  const dt = b.t - a.t;
  const k = Math.max(0, Math.min(1, (t - a.t) / dt));
  const k2 = k * k;
  const k3 = k2 * k;
  const h00 = 2 * k3 - 3 * k2 + 1;
  const h10 = k3 - 2 * k2 + k;
  const h01 = -2 * k3 + 3 * k2;
  const h11 = k3 - k2;
  const d00 = 6 * k2 - 6 * k;
  const d10 = 3 * k2 - 4 * k + 1;
  const d01 = -6 * k2 + 6 * k;
  const d11 = 3 * k2 - 2 * k;
  const ax = tangent(i, "x") * dt;
  const bx = tangent(i + 1, "x") * dt;
  const ay = tangent(i, "y") * dt;
  const by = tangent(i + 1, "y") * dt;
  V.x = h00 * a.x + h10 * ax + h01 * b.x + h11 * bx;
  V.y = h00 * a.y + h10 * ay + h01 * b.y + h11 * by;
  V.vx = (d00 * a.x + d10 * ax + d01 * b.x + d11 * bx) / dt;
  V.vy = (d00 * a.y + d10 * ay + d01 * b.y + d11 * by) / dt;
  const e = k2 * (3 - 2 * k);
  V.z = a.z + (b.z - a.z) * e;
  V.flap = a.flap + (b.flap - a.flap) * e;
  V.ceil = a.ceil + (b.ceil - a.ceil) * e;
  V.face = a.face + (b.face - a.face) * e;
  return V;
}

/** Caws in a little burst every few seconds; tips its head in between. */
function cawAt(t: number): number {
  const c = (t % 5.3) / 5.3;
  return c > 0.8 ? Math.abs(Math.sin((c - 0.8) * Math.PI * 10)) : 0;
}

/**
 * Seconds into this cycle's flight plan. The first cycle flies early (just after the start of a
 * run); after that each cycle's hash picks whether it flies in its first or second third, so the
 * crow sits on its stone for anything from 9 to 29 s between flights. Both keep its turn round
 * the moon in the Horseman's off time (they are a whole ride apart).
 */
export function cycleTime(t: number): number {
  const k = Math.floor(t / CYCLE);
  const late = k > 0 && hash(k * 7 + 3) >= 0.5 ? LATE : 0;
  return t - k * CYCLE - late;
}

/** The crow this frame: perched or flying, where, how big, which way, wings and beak. */
export function crowPose(s: Scene): CrowPose {
  const c = cycleTime(s.t);
  const P = POSE;
  P.caw = cawAt(s.t);
  P.look = Math.sin(s.t * 0.9);
  if (c < TAKE_OFF || c >= LAND) {
    const feet = perchFeet(s);
    P.perched = true;
    P.x = feet.x;
    P.y = feet.y;
    P.size = feet.size;
    P.z = PERCH.z;
    P.dir = -1;
    P.lift = 0;
    P.pitch = 0;
    P.legs = 0;
    return P;
  }

  const R = rest(s);
  layout(R);
  const v = sample(c);
  // The whole flight rides down with the churchyard as the camera climbs.
  const sink = fieldY(s, PERCH.z) - fieldY(R, PERCH.z);
  P.perched = false;
  P.x = v.x;
  P.y = v.y + sink;
  P.z = v.z;
  P.size = scaleAt(s, v.z);
  // Turning: squeezed sideways for the moment its heading crosses over (but not as it slows to
  // take off or land: it faces left on the stone, the way it leaves and comes back in).
  const speed = Math.hypot(v.vx, v.vy);
  const turn = TURN_SPEED * s.u * Math.min(1, speed / (TURN_SPEED * s.u * 3));
  const side = v.vx + v.face * HOLD_FACE * s.u;
  P.dir = speed < 1e-6 ? -1 : side / Math.sqrt(side * side + turn * turn);
  P.pitch = Math.max(-PITCH, Math.min(PITCH, Math.atan2(v.vy, Math.abs(v.vx) + s.u * 0.05) * 0.65));
  // Wingbeats between fully down and its ceiling; gliding, the wings held a little raised.
  const beat = -1 + (v.ceil + 1) * (0.5 + 0.5 * Math.sin((s.t - TAKE_OFF) * FLAP));
  P.lift = Math.min(v.ceil, GLIDE_LIFT) + (beat - Math.min(v.ceil, GLIDE_LIFT)) * v.flap;
  // Legs down for the leap and for the landing.
  P.legs = 1 - Math.min(1, (c - TAKE_OFF) / 0.5) * Math.min(1, (LAND - c) / 0.6);
  return P;
}

/** The flying crow's box this frame (screen px, ink included), or null while it is perched. */
export function crowBox(s: Scene): { x0: number; y0: number; x1: number; y1: number } | null {
  const p = crowPose(s);
  if (p.perched) return null;
  const b = flyingBox(p.x, p.y, p.size, p.dir, p.lift, p.pitch);
  const ink = s.u * 0.006;
  return { x0: b.x0 - ink, y0: b.y0 - ink, x1: b.x1 + ink, y1: b.y1 + ink };
}
