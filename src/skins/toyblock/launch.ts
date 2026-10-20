import { circle, hash, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { NEAR_P } from "./drift";
import { climbed, HORIZON_UP, horizon, landShows, RISE1, seaTop } from "./place";
import { block, blockCloud, TALL_CLOUD } from "./shapes";
import { smooth, type Tone } from "./tone";

// The rocket's round trip: Toy Kingdom's one late action (the owner's call: after the mouse's
// run-down, at 10 s), and it comes round again for as long as the scene runs (the owner: "if
// there is an action it needs to repeat again — the rocket can land"). The toy rocket stands on
// its pad beside the lattice launch tower up the right lane (far.ts). The tower's three lamps count
// down, red, yellow, green; just before IGNITE the service arm swings up out of the way; at
// IGNITE the engine lights (a flickering flame, the rocket trembling) and a launch cloud of round
// smoke puffs billows out over the pad; at LIFTOFF it climbs, slowly at first, then faster and
// faster, clears the launch tower and corkscrews up the lane, smaller and smaller as it goes,
// into a block cloud high above, and is gone. A few seconds later it comes back out of the
// cloud tail first, like a booster coming home: it falls down the lane, folds out its landing
// legs, lights its engine again for the landing burn, slows, and sets down on its pad in a puff
// of smoke that makes the launch tower bounce; it settles onto its fins as its legs fold away,
// the arm swings back to it, and it stands venting a wisp. Then its old trail clears from the sky
// and the lamps count down again: every trip after the first replays it, PERIOD seconds on.
//
// It leaves a corkscrew of smoke puffs that stays in the sky: the trail is anchored in the world
// at the near lanes' depth (NEAR_P), so as the tower climbs it comes down past you and you
// follow it up to the cloud the rocket flew into, a few dozen bars up. The smoke comes out of
// the rocket's nozzle: the nozzle rides the trail's tip, and the rocket leans into the corkscrew
// from there. On its way up from the pad (the land's depth) to the near lanes' depth the rocket
// and its fresh trail move over together (nearOf), so the trail's foot sits on the lift-off smoke
// even when the camera has already risen; once the rocket is gone the trail settles at the near
// lanes' depth. The launch cloud and the smoke of the lift-off stay with the pad (the land's
// depth) and thin away from the bottom up before the rocket comes back down, the trail's foot
// tapering after them; the trail's lowest puffs melt away as they come down to the land's
// skyline, so it never hangs in front of the land. The trail itself stays until the next trip
// begins, then clears from the bottom up before the next ignition, so every launch lays a fresh
// one. The near side of the corkscrew is drawn in the clouds' own colors, the far side fainter
// and a little smaller, so it reads as a spiral, not a wave. The way down runs down the middle
// of the old corkscrew, the rocket in front of all of it, so the landing always reads; landed, it
// stays in front of the smoke hanging over it (rocketSky draws it again over the smoke, above the
// land's nearer rows), and the vent's wisp is let out in front of it. From high
// above, once the cloud sea has covered the land, all of it is at the near lanes' depth, so the
// rocket rises out of the sea and sinks back into it, never popping up in mid-air. Everything
// keeps to the right lane, clear of the tower's column and the screen's side, and is a function
// of the scene's clock and the camera's height alone.
//
// Heights here are "z": u above the near layer's ground, which at the start is the floor line
// (so at the start z = the land's height above its horizon + HORIZON_UP). Across, u right of the
// screen's center. Times are the first trip's, on the scene's clock (tripTime maps any moment
// onto them).

const TAU = Math.PI * 2;

/** When the engine lights, and when the rocket leaves the pad (s on the scene's clock). */
export const IGNITE = 10;
export const LIFTOFF = 11.2;

/**
 * The round trip comes round every PERIOD seconds. The first trip runs from 0 on the scene's
 * clock; every later one runs from TRIP_START on its own clock (the rocket standing on its pad,
 * as at the start), PERIOD seconds after the one before's.
 */
export const PERIOD = 36;
export const TRIP_START = IGNITE - 4.5;
/**
 * At the start of every later trip the last trip's trail clears from the sky, bottom up, over
 * CLEAR s, each puff shrinking over CLEAR_EACH s and gone at CLEAR_CUT of its size: only a short
 * stretch shrinks at once, and it goes before it is small, so it never leaves a string of beads.
 */
const CLEAR = 3.5;
const CLEAR_EACH = 0.7;
const CLEAR_CUT = 0.55;
/** The launch tower's countdown lamps light one a second from here: red, yellow, green; then the engine lights. */
export const COUNTDOWN = IGNITE - 3;

/** Which trip a moment of the scene falls in (0 the first). */
export function tripIndex(t: number): number {
  return t < TRIP_START + PERIOD ? 0 : Math.floor((t - TRIP_START) / PERIOD);
}

/** A moment on its trip's own clock: the first trip's times, which every trip replays. */
export function tripTime(t: number): number {
  return t - tripIndex(t) * PERIOD;
}

/** The pad's center (u right of the screen's center), and how squat the pad and all on it are drawn. */
export const PAD_X = 0.37;
export const PAD_SQUASH = 0.95;
/** The launch tower's height (u above the horizon, before the squash). */
export const GANTRY_TOP = 0.36;

/** The rocket on its pad: its center line (u from the pad's center), its nozzle (u up, before the squash) and its size. */
const ROCKET_DX = -0.025;
const NOZZLE = 0.035;
/** Half the rocket's length, nozzle to nose tip (u at full size). */
const HALF = 0.18;
const ROCKET_HW = 0.027;
/** Its flame's length below the nozzle (u at full size). */
const FLAME = 0.09;

/** The rocket's center on the pad: across, and its z. */
const PAD_ROCKET_X = PAD_X + ROCKET_DX;
const Z0 = HORIZON_UP + (NOZZLE + HALF) * PAD_SQUASH;

/** The climb: z = Z0 + V0 τ + A τ² / 2, τ seconds after lift-off (u, s). */
const V0 = 0.02;
const A = 0.1;

/** The corkscrew: its axis (u right of center), its widest radius and its last, its pitch (u a turn), and where it starts (z). */
const AXIS = 0.375;
const R_MAX = 0.055;
const R_END = 0.01;
const PITCH = 0.24;
const SPIRAL_Z = 0.66;
/** How far the rocket leans into the corkscrew (a fraction of the slope of its path). */
const LEAN = 0.52;
/**
 * We see the corkscrew from a little below: its near side dips and its far side rises by this
 * much of its radius, so the trail coils like a spring instead of waving like a snake (never so
 * much that the rocket would have to come back down).
 */
const TILT = 0.5;

/** The cloud it flies into: its flat bottom (z) and its size (u). Just above the top of the tallest phone's start view. */
export const CLOUD_Z = 1.535;
const CLOUD_S = 0.08;

/** The rocket is drawn with the land (in front of the launch tower, behind the land's nearer hills) while its nozzle is below this height above the horizon (u), on its way up or back down. */
const SKY_FROM = 0.24;

/** The trail starts here (z): just under the launch tower's top; below it is the lift-off smoke, at the land's depth. */
const TRAIL_FROM = HORIZON_UP + 0.38;
/** By this height (z) the climb has moved from the land's depth over to the near lanes'. */
const NEAR_AT = 1.2;
/**
 * After the rocket is gone, the lower trail settles at the near lanes' depth over SETTLE seconds;
 * and whatever the clock, it has settled by the time the sea has covered the land (starting
 * SETTLE_CLIMB levels of climbing before that), so none of it lingers at the land's depth once the
 * land is gone.
 */
const SETTLE = 8;
const SETTLE_CLIMB = 6;

/**
 * The trail's puffs melt away as they come down to this band above the land's horizon (u): gone
 * at the bottom (below MELT_CUT of their size: a young trail's puffs are still small, and a
 * smaller one would hang below it on its own), whole at the top.
 */
const MELT0 = 0.3;
const MELT1 = 0.4;
const MELT_CUT = 0.45;

/**
 * The launch cloud and the lift-off smoke thin away from the bottom up: the lowest puffs from
 * THIN0 over THIN_EACH seconds, the highest THIN_SPREAD seconds later (all gone by
 * THIN0 + THIN_SPREAD + THIN_EACH, before the rocket comes back down through there); the trail's
 * foot tapers away with the highest. A puff thinned below THIN_CUT of its size, or smaller than
 * MIN_PUFF (u), is left out, so thinning smoke never leaves a dotted line of specks.
 */
const THIN0 = LIFTOFF + 5;
const THIN_SPREAD = 4.5;
const THIN_EACH = 3;
const THIN_CUT = 0.3;
const MIN_PUFF = 0.004;
/** How far up the trail its foot tapers away as the lift-off smoke under it thins (u of z). */
const TAPER = 0.14;

/** The rocket's size as it climbs: full on the pad, smaller and smaller as it goes up and away. */
function sizeAt(z: number): number {
  return 1 - 0.58 * smooth(0.55, 1.05, z) - 0.17 * smooth(1.05, 1.55, z);
}

/** The corkscrew's radius at a height: none off the pad, widest in the middle, narrowing into the cloud. */
function radiusAt(z: number): number {
  return R_MAX * smooth(SPIRAL_Z, 0.98, z) - (R_MAX - R_END) * smooth(1.2, 1.5, z);
}

/** The path's axis: from the pad over to the middle of the lane. */
function axisAt(z: number): number {
  return PAD_ROCKET_X + (AXIS - PAD_ROCKET_X) * smooth(0.6, 1, z);
}

/** How far round the corkscrew the rocket is at a height (radians). */
function turnAt(z: number): number {
  return (TAU * (z - SPIRAL_Z)) / PITCH;
}

/** The climb across (u right of the screen's center) at height z: the trail, and the rocket's nozzle on it. */
export function pathX(z: number): number {
  return axisAt(z) + radiusAt(z) * Math.sin(turnAt(z));
}

/** Where height z on the corkscrew shows on screen (z, as seen from a little below). */
export function pathZ(z: number): number {
  return z - TILT * radiusAt(z) * Math.cos(turnAt(z));
}

/**
 * Its lean (radians, clockwise) at height z: into the corkscrew, along the slope of its path
 * across (as seen square on: smooth all the way round, where the view from below has cusps).
 */
function leanAt(z: number): number {
  const e = 0.004;
  return LEAN * Math.atan((pathX(z + e) - pathX(z - e)) / (2 * e));
}

/** Toward us (1) or away (-1) on the corkscrew at height z; 0 where it runs straight. */
function depthAt(z: number): number {
  return Math.cos(turnAt(z)) * (radiusAt(z) / R_MAX);
}

/**
 * How far height z on the climb has moved from the land's depth (0) to the near lanes' (1):
 * the rocket's nozzle and its trail share it, so the smoke always comes out of the nozzle and
 * the trail's foot meets the lift-off smoke, wherever the camera is.
 */
function nearOf(z: number): number {
  return smooth(TRAIL_FROM, NEAR_AT, z);
}

/**
 * How far the lower trail of the trip whose clock reads `c` has settled at the near lanes' depth
 * (0: still where the rocket left it).
 */
function settledAt(s: Scene, c: number): number {
  return Math.max(smooth(GONE, GONE + SETTLE, c), climbSettled(s));
}

/**
 * How far everything of the rocket's has moved over to the near lanes' depth for the camera's
 * height: none of it lingers at the land's depth once the cloud sea has covered the land, so from
 * up there the rocket rises out of the sea and sinks back into it (and on its pad it is under it).
 */
function climbSettled(s: Scene): number {
  return smooth(RISE1 - SETTLE_CLIMB, RISE1, climbed(s));
}

/** How much lower on screen the rocket's things at the pad show than the land's depth would put them (px): they settle with the camera (climbSettled). */
function padShift(s: Scene): number {
  const k = climbSettled(s);
  return k > 0 ? (layerGround(s, NEAR_P) - horizon(s) - HORIZON_UP * s.u) * k : 0;
}

/** The rocket's center's height τ seconds after lift-off. */
function climb(tau: number): number {
  return Z0 + V0 * tau + 0.5 * A * tau * tau;
}

/** Its nozzle's height with its center at z (its length shrinks with it). */
function nozzleOf(z: number): number {
  return z - HALF * PAD_SQUASH * sizeAt(z);
}

/** Seconds after lift-off when the nozzle passes height z (the nozzle only ever climbs). */
function passes(z: number): number {
  if (nozzleOf(Z0) >= z) return 0;
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (nozzleOf(climb(mid)) < z) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The flame's flicker. */
function flicker(t: number): number {
  return 0.86 + 0.08 * Math.sin(t * 31) + 0.06 * Math.sin(t * 17 + 1.3);
}

/** Where the rocket is and how it looks at a moment. */
export interface Rocket {
  /** "pad" standing on its pad, "climb" on its way up, "gone" into the cloud, "down" on its way back to the pad. */
  phase: "pad" | "climb" | "gone" | "down";
  /** Its center's height (z). */
  z: number;
  /**
   * Its nozzle — the tip of its trail on the way up: the height (z), across (u right of the
   * screen's center) and where that height shows, as seen from a little below (z).
   */
  nz: number;
  x: number;
  y: number;
  /** Its size (1 on the pad), lean (radians, clockwise) and flame (u at full size, 0 when off). */
  k: number;
  lean: number;
  flame: number;
  /** How far its nozzle has moved from the land's depth to the near lanes' (0 on the pad, 1 well up; nearOf). */
  near: number;
  /** How far its landing legs are folded out (0 folded away, 1 down). */
  legs: number;
  /** How tall it stands as it bounces on its legs at touchdown (1 at rest). */
  squash: number;
}

/**
 * Seconds after lift-off when the rocket is gone into the cloud: its flame's tip has passed the
 * cloud's flat bottom (the nozzle as seen sits within TILT × R_END of its height; the flame
 * reaches FLAME × its size below it, a little bigger on the near side of the corkscrew).
 */
export const GONE = LIFTOFF + passes(CLOUD_Z + 0.004 + TILT * R_END + FLAME * PAD_SQUASH * sizeAt(CLOUD_Z) * 1.08);

/** The nozzle's height on the pad. */
const PAD_NZ = HORIZON_UP + NOZZLE * PAD_SQUASH;

// ---------------------------------------------------------------- the way back down

/**
 * Its landing legs, two telescoping struts hinged on its sides LEG_HINGE above the nozzle, LEG
 * long when out (u at full size): they slide out of their hinges pointing up along the body
 * (fully out of them by LEG_GROW of the way), swing out and down through LEG_OUT radians (from
 * pointing straight up), lengthening, until their feet stand LEG_DROP below the nozzle, so it
 * lands on them, standing that much higher than on its fins; folding away, they go back into
 * their hinges, so they never pop in or out. Short as they swing past level, they never reach
 * out toward the tower's column.
 */
const LEG_HINGE = 0.03;
const LEG = 0.06;
const LEG_DROP = 0.022;
const LEG_OUT = Math.acos(-(LEG_HINGE + LEG_DROP) / LEG);
const LEG_GROW = 0.3;

/** How far a leg has slid out of its hinge `d` of the way out (0 none of it, 1 all). */
function legGrown(d: number): number {
  return smooth(0, LEG_GROW, d);
}

/** A leg's length `d` of the way out (u at full size). */
function legLength(d: number): number {
  return LEG * (0.5 + 0.5 * d) * legGrown(d);
}

/** How far below the nozzle its feet stand with the legs `d` of the way out (u at full size; below 0 they clear the pad and it stands on its fins). */
function legDrop(d: number): number {
  return -LEG_HINGE - legLength(d) * Math.cos(d * LEG_OUT);
}

/** It comes back out of its cloud tail first here; it falls FALL seconds, then its landing burn slows it to a stop on its legs over BURN_T seconds, at TOUCHDOWN. */
export const DESCEND = 19.8;
const FALL = 4.3;
const BURN_T = 3.2;
export const BURN = DESCEND + FALL;
export const TOUCHDOWN = BURN + BURN_T;
/** Its center's height as it starts down (where it was as it went into the cloud), and standing on its legs on the pad. */
const Z_TOP = climb(GONE - LIFTOFF);
const Z_LEGS = Z0 + LEG_DROP * PAD_SQUASH;
/** How fast it comes out of the cloud (u/s), and how fast it gathers speed falling (u/s²): just so the burn stops it on the pad. */
const V_OUT = 0.06;
const G_FALL = (Z_TOP - Z_LEGS - V_OUT * (FALL + BURN_T / 2)) / (FALL * FALL / 2 + (FALL * BURN_T) / 2);
const V_BURN = V_OUT + G_FALL * FALL;
const Z_BURN = Z_TOP - V_OUT * FALL - 0.5 * G_FALL * FALL * FALL;
/** Its nozzle's height as it starts down, and standing on its legs. */
const NZ_TOP = nozzleOf(Z_TOP);
const NZ_LEGS = nozzleOf(Z_LEGS);

/** Its center's height τ seconds into the way down: falling ever faster, then braking evenly to a stop on its legs. */
function descent(tau: number): number {
  if (tau <= FALL) return Z_TOP - V_OUT * tau - 0.5 * G_FALL * tau * tau;
  const b = Math.min(tau - FALL, BURN_T);
  return Z_BURN - V_BURN * b + ((0.5 * V_BURN) / BURN_T) * b * b;
}

/** Its lean on the way down (radians, clockwise): along the slope of its path as it eases over to the pad. */
function downLean(z: number): number {
  const e = 0.004;
  return LEAN * Math.atan((axisAt(z + e) - axisAt(z - e)) / (2 * e));
}

/** After touchdown: it bounces on its legs (1.2 s), stops venting, folds its legs and settles onto its fins, and the arm swings back to it. */
const LEGS_IN = TOUCHDOWN + 3;
const LEGS_FOLD = 1.6;
const ARM_BACK = TOUCHDOWN + 5;

/** How tall it stands as it bounces on its legs, s seconds after touchdown (1 at rest; a squash first). */
function bounce(s: number): number {
  if (s <= 0 || s >= 1.2) return 1;
  return 1 - 0.07 * Math.exp(-5 * s) * Math.sin(s * 16);
}

/**
 * The launch tower's bounce at touchdown (a fraction of its height, up or down), at scene time t:
 * a toy's boing, quickly damped.
 */
export function gantryBounce(t: number): number {
  const s = tripTime(t) - TOUCHDOWN;
  if (s <= 0 || s >= 1.6) return 0;
  return 0.045 * Math.exp(-4.5 * s) * Math.sin(s * 19);
}

const NOW: Rocket = { phase: "pad", z: Z0, nz: PAD_NZ, x: PAD_ROCKET_X, y: PAD_NZ, k: 1, lean: 0, flame: 0, near: 0, legs: 0, squash: 1 };

/** The rocket at scene time t (the returned object is reused: copy it to keep it). */
export function rocketAt(t: number): Rocket {
  const r = NOW;
  const c = tripTime(t);
  r.legs = 0;
  r.squash = 1;
  if (c < LIFTOFF || c >= TOUCHDOWN) {
    const lit = c < LIFTOFF ? smooth(IGNITE, IGNITE + 0.5, c) : 0;
    r.phase = "pad";
    r.nz = PAD_NZ;
    // Trembling on the pad while the engine roars.
    r.x = PAD_ROCKET_X + (lit > 0 ? Math.sin(c * 53) * 0.0025 * lit : 0);
    r.k = 1;
    r.lean = 0;
    r.flame = FLAME * lit * flicker(c);
    r.near = 0;
    if (c >= TOUCHDOWN) {
      // Landed: the landing burn dies away, it bounces on its legs, then folds them and settles onto its fins.
      const after = c - TOUCHDOWN;
      r.flame = FLAME * 0.85 * flicker(c) * (1 - smooth(0, 0.3, after));
      r.legs = 1 - smooth(LEGS_IN, LEGS_IN + LEGS_FOLD, c);
      r.squash = bounce(after);
      r.nz = PAD_NZ + Math.max(0, legDrop(r.legs)) * PAD_SQUASH;
    }
    r.z = r.nz + (Z0 - PAD_NZ);
    r.y = r.nz;
    return r;
  }
  if (c >= DESCEND) {
    // Back down, tail first: out of the cloud, falling, legs out, the landing burn, onto the pad.
    const z = descent(c - DESCEND);
    const nz = nozzleOf(z);
    r.phase = "down";
    r.z = z;
    r.nz = nz;
    r.x = axisAt(nz);
    r.y = nz;
    r.k = sizeAt(z);
    r.lean = downLean(nz);
    r.flame = FLAME * 0.85 * flicker(c) * smooth(BURN - 0.3, BURN + 0.15, c);
    // From its cloud's depth back to the pad's, gently all the way down, so it never seems to rise as it comes down.
    r.near = smooth(NZ_LEGS, NZ_TOP, nz);
    r.legs = smooth(BURN - 1.1, BURN + 0.5, c);
    return r;
  }
  const z = climb(c - LIFTOFF);
  const nz = nozzleOf(z);
  r.phase = c >= GONE ? "gone" : "climb";
  r.z = z;
  r.nz = nz;
  // The nozzle rides the corkscrew, where the trail comes out of it.
  r.x = pathX(nz);
  r.y = pathZ(nz);
  r.k = sizeAt(z) * (1 + 0.08 * depthAt(nz));
  r.lean = leanAt(nz);
  r.flame = FLAME * flicker(c);
  r.near = nearOf(nz);
  return r;
}

// ---------------------------------------------------------------- the smoke

/**
 * A smoke puff: where (z, across), its full radius (u), when it appears (s after lift-off),
 * whether it is on the near side of the corkscrew, how far it is from the land's depth to the
 * near lanes' as it appears (nearOf), how much it thins with the lift-off smoke (0: not at
 * all; for the lift-off smoke, its place in the bottom-up thinning), and how far up the trail it
 * is (0 at its foot, 1 in the cloud: its place as the trail clears, bottom up).
 */
interface Puff {
  z: number;
  x: number;
  r: number;
  at: number;
  front: boolean;
  near: number;
  thin: number;
  up: number;
}

/** The trail, bottom up: a puff every TRAIL_STEP u from just under the launch tower's top into the cloud. */
const TRAIL_STEP = 0.012;
const TRAIL: readonly Puff[] = (() => {
  const out: Puff[] = [];
  for (let i = 0, z = TRAIL_FROM; z < CLOUD_Z + 0.03; i++, z += TRAIL_STEP) {
    const k = sizeAt(z);
    out.push({
      z: pathZ(z) + (hash(i + 7100) - 0.5) * 0.005,
      x: pathX(z) + (hash(i + 7200) - 0.5) * 0.008 * k,
      r: (0.009 + 0.024 * k) * (0.88 + 0.24 * hash(i + 7300)),
      at: passes(z),
      front: depthAt(z) > -0.2,
      near: nearOf(z),
      // Its foot tapers away as the lift-off smoke under it thins.
      thin: 1 - smooth(TRAIL_FROM, TRAIL_FROM + TAPER, z),
      up: (z - TRAIL_FROM) / (CLOUD_Z + 0.03 - TRAIL_FROM),
    });
  }
  return out;
})();

/** The lift-off smoke from the pad up to the launch tower's top (heights above the horizon, u): stays with the land. */
const COLUMN_TOP = 0.39;
const COLUMN: readonly Puff[] = (() => {
  const out: Puff[] = [];
  const h0 = NOZZLE * PAD_SQUASH + 0.014;
  for (let i = 0, h = h0; h < COLUMN_TOP; i++, h += 0.017) {
    const z = h + HORIZON_UP;
    out.push({
      z: h,
      x: pathX(z) + (hash(i + 7400) - 0.5) * 0.012,
      r: (0.024 + 0.008 * hash(i + 7500)) * (1 - h * 0.5),
      at: passes(z),
      front: true,
      near: 0,
      thin: (h - h0) / (COLUMN_TOP - h0),
      up: 0,
    });
  }
  return out;
})();

/**
 * The launch cloud over the pad: where each puff billows out to from the nozzle (u across and
 * up), its radius (u) and how long after ignition it starts (s). Lopsided toward the screen's
 * side: the tower's column is close on the left.
 */
const MOUND = [
  [-0.036, 0.012, 0.025, 0.2],
  [-0.016, 0.034, 0.029, 0.45],
  [0, 0.006, 0.033, 0.1],
  [0.026, 0.03, 0.03, 0.3],
  [0.05, 0.008, 0.031, 0.25],
  [0.074, 0.026, 0.027, 0.5],
  [0.088, 0.006, 0.025, 0.4],
  [-0.004, 0.056, 0.024, 0.75],
  [0.044, 0.054, 0.025, 0.65],
] as const;

/**
 * The landing's smoke: as the landing burn's flame reaches the pad (SPLASH), a low cloud billows
 * out over it, each puff to (u across and up from the nozzle on the pad), its radius (u) and how
 * long after SPLASH it starts (s); at touchdown it puffs out a little further. Lopsided toward the
 * screen's side, like the launch cloud. It thins away from the bottom up from LAND_THIN0, the
 * highest puffs LAND_SPREAD s after the lowest, each over LAND_EACH s.
 */
const LANDING = [
  [-0.024, 0.008, 0.019, 0.3],
  [0, 0.004, 0.024, 0],
  [0.026, 0.01, 0.022, 0.12],
  [0.052, 0.005, 0.022, 0.22],
  [0.076, 0.012, 0.019, 0.4],
  [0.012, 0.028, 0.018, 0.55],
  [0.048, 0.03, 0.017, 0.65],
] as const;
const LANDING_TOP = 0.03;
const SPLASH = TOUCHDOWN - 0.9;
const LAND_THIN0 = TOUCHDOWN + 1.4;
const LAND_SPREAD = 1.6;
const LAND_EACH = 2.4;
/** A puff of it thinned below this much of its size is left out: it dissolves without breaking up into beads. */
const LAND_CUT = 0.55;

/**
 * The vent on the landed rocket's shoulder, on the side away from the launch tower: a wisp of
 * vapour, one puff every VENT_EVERY s from VENT_FROM, each curling up and away and gone after
 * VENT_LIFE s; the last one is let out at VENT_TO, so it has stopped well before the next trip.
 */
const VENT_FROM = TOUCHDOWN + 1.5;
const VENT_EVERY = 0.5;
const VENT_LIFE = 3;
const VENT_TO = TRIP_START + PERIOD - 1.5 - VENT_LIFE;
/** The vent: up from the nozzle on the pad (u, before the squash). */
const VENT_UP = 0.215;

/** Scratch lists of puffs to draw (x, y, r in px), so a frame allocates nothing. */
const MAX_PUFFS = 128;
const BACK = { n: 0, x: new Float64Array(MAX_PUFFS), y: new Float64Array(MAX_PUFFS), r: new Float64Array(MAX_PUFFS) };
const FRONT = { n: 0, x: new Float64Array(MAX_PUFFS), y: new Float64Array(MAX_PUFFS), r: new Float64Array(MAX_PUFFS) };
type Batch = typeof BACK;

function add(b: Batch, x: number, y: number, r: number): void {
  if (b.n >= MAX_PUFFS) return;
  b.x[b.n] = x;
  b.y[b.n] = y;
  b.r[b.n] = r;
  b.n++;
}

/** A batch of puffs as one soft cloud: all the shaded undersides, then the bodies, then the lit caps. Three fills. */
function puffs(ctx: Ctx, b: Batch, shade: string, body: string, light: string): void {
  if (b.n === 0) return;
  ctx.fillStyle = shade;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) circle(ctx, b.x[i]!, b.y[i]!, b.r[i]!);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    const r = b.r[i]!;
    circle(ctx, b.x[i]! - r * 0.07, b.y[i]! - r * 0.1, r * 0.86);
  }
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    const r = b.r[i]!;
    circle(ctx, b.x[i]! - r * 0.3, b.y[i]! - r * 0.36, r * 0.34);
  }
  ctx.fill();
}

/** How a puff grows: from a small burst to its full size in under a second, then swelling a little more. */
function grown(age: number): number {
  return (0.45 + 0.55 * smooth(0, 0.9, age)) * (1 + 0.18 * smooth(0.5, 20, age));
}

/**
 * How much is left of a puff of the launch cloud or the lift-off smoke at `f` of the way up the
 * bottom-up thinning (0 the lowest, 1 the highest), with the trip's clock at `c`: 1 until it
 * starts, 0 once it is done.
 */
function thinned(c: number, f: number): number {
  const t0 = THIN0 + f * THIN_SPREAD;
  return 1 - smooth(t0, t0 + THIN_EACH, c);
}

/** Whether the launch cloud and the lift-off smoke are all gone (or not yet there). */
function allThinned(c: number): boolean {
  return c >= THIN0 + THIN_SPREAD + THIN_EACH;
}

/** How much is left of a puff of the landing's smoke at `f` of the way up it, with the trip's clock at `c`. */
function landThinned(c: number, f: number): number {
  const t0 = LAND_THIN0 + f * LAND_SPREAD;
  return 1 - smooth(t0, t0 + LAND_EACH, c);
}

/** How much is left of the last trip's trail at `up` of the way up it, as it clears at the start of a trip (the trip's clock at `c`). */
function cleared(c: number, up: number): number {
  const t0 = TRIP_START + up * (CLEAR - CLEAR_EACH);
  return 1 - smooth(t0, t0 + CLEAR_EACH, c);
}

// ---------------------------------------------------------------- the rocket

/**
 * The toy rocket in its own frame: its nozzle's center at the origin, up is -y, in px for the
 * rocket at full size; with `flame` (px) a flame below the nozzle and its landing legs `legs` of
 * the way out (0: folded away, not drawn). A cream body (shaded right side) with a red nose,
 * fins and band and two round windows; blue legs with yellow feet.
 */
function rocketShape(ctx: Ctx, u: number, tone: Tone, flame: number, legs: number): void {
  const [red, yellow, blue] = tone.land;
  const hw = ROCKET_HW * u;
  if (flame > 0) {
    // An orange teardrop with a yellow heart.
    ctx.beginPath();
    ctx.moveTo(-hw * 0.62, -u * 0.004);
    ctx.quadraticCurveTo(-hw * 0.62, flame * 0.62, 0, flame);
    ctx.quadraticCurveTo(hw * 0.62, flame * 0.62, hw * 0.62, -u * 0.004);
    ctx.closePath();
    fill(ctx, tone.toys[4].body);
    ctx.beginPath();
    ctx.moveTo(-hw * 0.34, -u * 0.004);
    ctx.quadraticCurveTo(-hw * 0.3, flame * 0.42, 0, flame * 0.66);
    ctx.quadraticCurveTo(hw * 0.3, flame * 0.42, hw * 0.34, -u * 0.004);
    ctx.closePath();
    fill(ctx, tone.toys[1].light);
  }
  // Fins.
  ctx.beginPath();
  ctx.moveTo(-hw, -0.085 * u);
  ctx.lineTo(-hw - 0.024 * u, 0);
  ctx.lineTo(-hw, 0);
  ctx.closePath();
  ctx.moveTo(hw, -0.085 * u);
  ctx.lineTo(hw + 0.024 * u, 0);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  fill(ctx, red.shade);
  // Body: shade, body, band.
  ctx.beginPath();
  block(ctx, -hw, -0.265 * u, hw * 2, 0.265 * u, hw * 0.5);
  fill(ctx, tone.landCream.shade);
  ctx.beginPath();
  block(ctx, -hw, -0.265 * u, hw * 1.45, 0.265 * u, hw * 0.5);
  fill(ctx, tone.landCream.body);
  ctx.fillStyle = red.body;
  ctx.fillRect(-hw, -0.065 * u, hw * 2, 0.014 * u);
  // Nose cone.
  ctx.beginPath();
  ctx.moveTo(-hw, -0.255 * u);
  ctx.quadraticCurveTo(-hw * 0.9, -0.335 * u, 0, -0.36 * u);
  ctx.quadraticCurveTo(hw * 0.9, -0.335 * u, hw, -0.255 * u);
  ctx.closePath();
  fill(ctx, red.body);
  // Windows.
  ctx.beginPath();
  circle(ctx, 0, -0.2 * u, u * 0.012);
  circle(ctx, 0, -0.145 * u, u * 0.01);
  fill(ctx, blue.light);
  if (legs > 0.01) {
    // The landing legs, in front of the fins: struts sliding out of the body's sides and swinging
    // out and down, a round foot on each (all of it thinner while it is still in its hinge).
    const grown = legGrown(legs);
    const a = legs * LEG_OUT;
    const len = legLength(legs) * u;
    const fx = hw + Math.sin(a) * len;
    const fy = -LEG_HINGE * u - Math.cos(a) * len;
    ctx.strokeStyle = blue.shade;
    ctx.lineWidth = u * 0.009 * grown;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-hw, -LEG_HINGE * u);
    ctx.lineTo(-fx, fy);
    ctx.moveTo(hw, -LEG_HINGE * u);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath();
    circle(ctx, -fx, fy, u * 0.0075 * grown);
    circle(ctx, fx, fy, u * 0.0075 * grown);
    fill(ctx, yellow.body);
  }
}

function fill(ctx: Ctx, c: string): void {
  ctx.fillStyle = c;
  ctx.fill();
}

/** Screen y of height z for something `near` of the way from the land's depth to the near lanes'. */
function yAt(s: Scene, z: number, near: number): number {
  const land = horizon(s) - (z - HORIZON_UP) * s.u;
  if (near <= 0) return land;
  const nearY = layerGround(s, NEAR_P) - z * s.u;
  return land + (nearY - land) * near;
}

const AT = { x: 0, y: 0 };

/**
 * Where the rocket's nozzle shows on screen (px; the returned object is reused): on the way up,
 * on its trail's tip, at the trail's depth (settled with it, if the camera is already that high),
 * easing over from the pad's (on the pad, it is on the pad); on the way down, easing from the
 * near lanes' depth (its cloud's) back to the pad's. From high above, where the sea has covered
 * the land, all of it is at the near lanes' depth (climbSettled).
 */
export function nozzleOnScreen(s: Scene, r: Rocket): { x: number; y: number } {
  let settled = climbSettled(s);
  if (r.phase === "climb" || r.phase === "gone") settled = Math.max(settled, smooth(GONE, GONE + SETTLE, tripTime(s.t)) * smooth(PAD_NZ, TRAIL_FROM, r.nz));
  AT.x = s.cssW / 2 + r.x * s.u;
  AT.y = yAt(s, r.y, r.near + (1 - r.near) * settled);
  return AT;
}

/** Draw the rocket as it is now, its nozzle on its trail's tip. */
function drawRocket(ctx: Ctx, s: Scene, tone: Tone, r: Rocket): void {
  const u = s.u;
  const at = nozzleOnScreen(s, r);
  ctx.save();
  ctx.translate(at.x, at.y);
  if (r.lean !== 0) ctx.rotate(r.lean);
  ctx.scale(r.k, r.k * PAD_SQUASH * r.squash);
  rocketShape(ctx, u, tone, r.flame * u, r.legs);
  ctx.restore();
}

/** Whether the rocket is drawn with the land now (on its pad, or still low beside the launch tower: at the land's depth either way). */
function withLand(r: Rocket): boolean {
  return r.phase === "pad" || ((r.phase === "climb" || r.phase === "down") && r.nz - HORIZON_UP < SKY_FROM);
}

/** Whether the rocket is up in the sky now (drawn with its trail, in front of it). */
function inSky(r: Rocket): boolean {
  return (r.phase === "climb" || r.phase === "down") && !withLand(r);
}

/** Up to this height above the land's horizon (u) the land's nearer rows stand in front of the rocket on its pad. */
const LAND_FRONT = 0.12;

/**
 * Whether the rocket, drawn with the land now, is drawn again in front of the smoke in the sky
 * (rocketSky): on its way down, and on its pad from its landing until the last trip's trail has
 * cleared away (not while it lights up and lifts off: the launch cloud stays in front of it).
 */
function overSmoke(s: Scene, r: Rocket, c: number): boolean {
  if (!withLand(r)) return false;
  const after = r.phase === "down" || (r.phase === "pad" && (c >= TOUCHDOWN || (tripIndex(s.t) > 0 && c < TRIP_START + CLEAR)));
  return after && landShows(s, seaTop(s));
}

// ---------------------------------------------------------------- at the pad (the land's depth)

/**
 * How far the service arm has swung up out of the rocket's way (radians), at scene time t: just
 * before ignition, and back down to the rocket once it has landed and settled on its fins.
 */
export function armSwing(t: number): number {
  const c = tripTime(t);
  return 1.45 * smooth(IGNITE - 0.9, IGNITE - 0.1, c) * (1 - smooth(ARM_BACK, ARM_BACK + 1, c));
}

/**
 * Whether the launch tower's countdown lamp i (0 red, 1 yellow, 2 green) is lit at scene time t:
 * in the countdown, one more each second, each blinking once as it comes on; out again soon
 * after lift-off.
 */
export function lampLit(t: number, i: number): boolean {
  const c = tripTime(t) - (COUNTDOWN + i);
  return c >= 0 && c < LIFTOFF + 1.5 - (COUNTDOWN + i) && !(c > 0.22 && c < 0.36);
}

/**
 * At the pad, drawn with the land (launchPad calls these): behind the rocket, the smoke of its
 * lift-off; the rocket itself while it is on the pad or still low; in front of it, the launch
 * cloud and the landing's smoke. The smoke thins away from the bottom up a few seconds after
 * lift-off, before the rocket comes back down.
 */
export function padSmokeBehind(ctx: Ctx, s: Scene, tone: Tone): void {
  const c = tripTime(s.t);
  const tau = c - LIFTOFF;
  if (tau <= 0 || allThinned(c)) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = horizon(s);
  const shift = padShift(s);
  BACK.n = 0;
  for (const p of COLUMN) {
    if (p.at > tau) break;
    const left = thinned(c, p.thin);
    if (left >= THIN_CUT) add(BACK, cx + p.x * u, hz + shift - p.z * u, p.r * u * grown(tau - p.at) * left);
  }
  puffs(ctx, BACK, tone.cloudShade, tone.cloud, tone.cloudLight);
}

/** The rocket on its pad or still low (drawn with the land). */
export function padRocket(ctx: Ctx, s: Scene, tone: Tone): void {
  const r = rocketAt(s.t);
  if (withLand(r)) drawRocket(ctx, s, tone, r);
}

/**
 * The engine's fire at the rocket's foot, licking up out of the smoke: tongues of orange flame
 * with yellow hearts, flickering, from ignition until the rocket is clear of the pad, and again,
 * smaller, as the landing burn reaches the pad until it dies at touchdown. In front of the smoke,
 * so the fire shows at the bottom of it.
 */
export function padFlames(ctx: Ctx, s: Scene, tone: Tone): void {
  const c = tripTime(s.t);
  const on =
    smooth(IGNITE, IGNITE + 0.35, c) * (1 - smooth(LIFTOFF + 0.4, LIFTOFF + 1.4, c)) +
    0.6 * smooth(SPLASH, SPLASH + 0.5, c) * (1 - smooth(TOUCHDOWN, TOUCHDOWN + 0.35, c));
  if (on <= 0.02) return;
  const u = s.u;
  const x0 = s.cssW / 2 + PAD_ROCKET_X * u;
  const y0 = horizon(s) + padShift(s) - NOZZLE * PAD_SQUASH * u + 0.006 * u;
  for (let pass = 0; pass < 2; pass++) {
    const k = pass === 0 ? 1 : 0.55;
    ctx.beginPath();
    for (let i = 0; i < FIRE.length; i++) {
      const [dx, w, h] = FIRE[i]!;
      const f = on * (0.8 + 0.2 * Math.sin(c * 23 + i * 2.3));
      tongue(ctx, x0 + dx * u * (0.55 + 0.45 * on), y0, w * k * u * on, h * k * f * u);
    }
    fill(ctx, pass === 0 ? tone.toys[4].body : tone.toys[1].light);
  }
}

/** The fire's tongues: across from the nozzle, half-width and height (u). */
const FIRE = [
  [0, 0.017, 0.062],
  [-0.026, 0.012, 0.04],
  [0.029, 0.013, 0.044],
  [-0.045, 0.009, 0.024],
  [0.05, 0.009, 0.026],
] as const;

/** A flame tongue standing on (x, y): a round foot `w` wide each side, its tip `h` up. Its own subpath. */
function tongue(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  if (w <= 0 || h <= 0) return;
  ctx.moveTo(x + w, y);
  ctx.arc(x, y, w, 0, Math.PI);
  ctx.quadraticCurveTo(x - w, y - h * 0.5, x, y - h);
  ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w, y);
  ctx.closePath();
}

/** The launch cloud billowing over the pad and the landing's smoke, in front of the rocket's foot. */
export function padSmokeFront(ctx: Ctx, s: Scene, tone: Tone): void {
  const c = tripTime(s.t);
  const u = s.u;
  const x0 = s.cssW / 2 + PAD_ROCKET_X * u;
  const y0 = horizon(s) + padShift(s) - NOZZLE * PAD_SQUASH * u;
  FRONT.n = 0;
  if (c > IGNITE && !allThinned(c)) {
    const blast = smooth(LIFTOFF, LIFTOFF + 1.5, c);
    for (const [dx, dy, r, delay] of MOUND) {
      const b = smooth(IGNITE + delay, IGNITE + delay + 1.1, c);
      if (b <= 0) continue;
      const out = 0.35 + 0.65 * b + 0.12 * blast;
      // The launch cloud is the bottom of the lift-off smoke: it thins first, its top puffs last.
      const left = thinned(c, dy / COLUMN_TOP);
      if (left >= THIN_CUT) add(FRONT, x0 + dx * out * u, y0 - dy * out * u, r * u * (0.3 + 0.7 * b) * (1 + 0.12 * blast) * left);
    }
  }
  if (c > SPLASH && c < LAND_THIN0 + LAND_SPREAD + LAND_EACH) {
    // The landing burn's smoke spreading over the pad, puffing out at touchdown.
    const puff = smooth(TOUCHDOWN, TOUCHDOWN + 0.9, c);
    for (const [dx, dy, r, delay] of LANDING) {
      const b = smooth(SPLASH + delay, SPLASH + delay + 0.8, c);
      if (b <= 0) continue;
      const out = 0.4 + 0.6 * b + 0.22 * puff;
      const left = landThinned(c, dy / LANDING_TOP);
      if (left >= LAND_CUT) add(FRONT, x0 + dx * out * u, y0 - dy * out * u, r * u * (0.3 + 0.7 * b) * (1 + 0.15 * puff) * left);
    }
  }
  puffs(ctx, FRONT, tone.cloudShade, tone.cloud, tone.cloudLight);
}

/**
 * The vent's wisp: puffs let out of the rocket's shoulder (on its left), curling up and away,
 * swelling, then shrinking away. Drawn in front of the rocket (rocketSky draws it, after the
 * rocket), at the pad's depth.
 */
function vent(ctx: Ctx, s: Scene, tone: Tone, c: number): void {
  const u = s.u;
  const vx = s.cssW / 2 + PAD_ROCKET_X * u - ROCKET_HW * u;
  const vy = horizon(s) + padShift(s) - NOZZLE * PAD_SQUASH * u - VENT_UP * PAD_SQUASH * u;
  FRONT.n = 0;
  const first = Math.max(0, Math.ceil((c - VENT_LIFE - VENT_FROM) / VENT_EVERY));
  const last = Math.floor((Math.min(c, VENT_TO) - VENT_FROM) / VENT_EVERY);
  for (let k = first; k <= last; k++) {
    const a = (c - VENT_FROM - k * VENT_EVERY) / VENT_LIFE;
    if (a < 0 || a >= 1) continue;
    const r = (0.007 + 0.014 * a) * (1 - 0.45 * smooth(0.65, 1, a));
    const curl = Math.sin(a * 4 + k * 1.7) * 0.006 * a;
    add(FRONT, vx - (-0.003 + 0.03 * a + 0.012 * a * a + curl) * u, vy - 0.075 * a * u, r * u);
  }
  puffs(ctx, FRONT, tone.cloudShade, tone.cloud, tone.cloudLight);
}

// ---------------------------------------------------------------- in the sky (the near lanes' depth)

/**
 * The trail laid by a launch `tau` seconds ago into the puff batches: `c` is its trip's clock
 * for the tapering of its foot and its settling, or NaN for the last trip's trail, long settled,
 * its foot long gone, clearing away with the trip's clock at `clear`.
 */
function trail(s: Scene, tau: number, c: number, clear: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = horizon(s);
  const ground = layerGround(s, NEAR_P);
  // Screen y of z = 0 at the land's depth, and how much lower the near lanes' depth shows it.
  const land0 = hz + HORIZON_UP * u;
  const deeper = ground - land0;
  const old = Number.isNaN(c);
  // The fresh trail is where the rocket was (nearOf); once it is gone the trail settles at the near lanes' depth.
  const settled = old ? 1 : settledAt(s, c);
  // Its foot tapers away with the top of the lift-off smoke under it.
  const foot = old ? 0 : thinned(c, 1);
  for (const p of TRAIL) {
    if (p.at > tau) break;
    const y = land0 + deeper * (p.near + (1 - p.near) * settled) - p.z * u;
    if (y - u * 0.05 > s.cssH || y + u * 0.05 < 0) continue;
    // Melting away as it comes down to the land's skyline.
    const melt = smooth(MELT0, MELT1, (hz - y) / u);
    if (melt < MELT_CUT) continue;
    const left = melt * (1 - p.thin * (1 - foot));
    const gone = old ? cleared(clear, p.up) : 1;
    if (gone < CLEAR_CUT) continue;
    const r = p.r * u * grown(tau - p.at) * left * gone;
    if (left < THIN_CUT || r < MIN_PUFF * u) continue;
    add(p.front ? FRONT : BACK, cx + p.x * u, y, p.front ? r : r * 0.84);
  }
}

/**
 * The rocket's corkscrew of smoke, the rocket in front of it (up in the sky on its way up or back
 * down; low and landed, again over the drawing with the land: overSmoke), the vent's wisp while it
 * stands landed, and the cloud it flies into and comes back out of: drawn after the land, before
 * the cloud sea, whether or not the land still shows.
 */
export function rocketSky(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const ground = layerGround(s, NEAR_P);
  const cloudY = ground - CLOUD_Z * u;
  // All of it is below the screen once the cloud is.
  if (cloudY - u * 0.2 > s.cssH) return;
  const c = tripTime(s.t);
  const r = rocketAt(s.t);
  BACK.n = 0;
  FRONT.n = 0;
  // This trip's trail; before its launch, the last trip's, clearing away.
  if (c > LIFTOFF) trail(s, c - LIFTOFF, c, c);
  else if (tripIndex(s.t) > 0 && c < TRIP_START + CLEAR) trail(s, c + PERIOD - LIFTOFF, NaN, c);
  puffs(ctx, BACK, tone.farCloudShade, tone.farCloud, tone.farCloudLight);
  puffs(ctx, FRONT, tone.cloudShade, tone.cloud, tone.cloudLight);
  // The rocket is in front of its smoke, so it always reads: on its way up, the trail coming out
  // of its nozzle; on its way back down through its old corkscrew; and landed, standing on its
  // pad while the smoke hangs over it. Where it is drawn with the land (low, or on its pad) this
  // is a second drawing of it, over the first, only above the land's nearer rows (LAND_FRONT),
  // which stand in front of its foot.
  if (inSky(r)) drawRocket(ctx, s, tone, r);
  else if (overSmoke(s, r, c)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, s.cssW, horizon(s) - LAND_FRONT * u);
    ctx.clip();
    drawRocket(ctx, s, tone, r);
    ctx.restore();
  }
  if (r.phase === "pad" && c > VENT_FROM && c < VENT_TO + VENT_LIFE && landShows(s, seaTop(s))) vent(ctx, s, tone, c);
  if (cloudY < -u * 0.01) return;
  blockCloud(ctx, TALL_CLOUD, cx + AXIS * u, cloudY, CLOUD_S * u, tone.cloudShade, tone.cloud, tone.cloudLight);
}
