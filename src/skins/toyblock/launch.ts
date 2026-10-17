import { circle, hash, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { NEAR_P } from "./drift";
import { climbed, HORIZON_UP, horizon, RISE1 } from "./place";
import { block, blockCloud, TALL_CLOUD } from "./shapes";
import { smooth, type Tone } from "./tone";

// The rocket launch: Toy Kingdom's one late action (the owner's call: after the mouse's run-down,
// at 10 s). The toy rocket stands on its pad beside the lattice launch tower up the right
// lane (far.ts). Just before IGNITE the service arm swings up out of the way; at IGNITE the
// engine lights (a flickering flame, the rocket trembling) and a launch cloud of round smoke
// puffs billows out over the pad; at LIFTOFF it climbs, slowly at first, then faster and
// faster, clears the launch tower and corkscrews up the lane, smaller and smaller as it goes,
// into a block cloud high above, and is gone.
//
// It leaves a corkscrew of smoke puffs that stays in the sky: the trail is anchored in the world
// at the near lanes' depth (NEAR_P), so as the tower climbs it comes down past you and you
// follow it up to the cloud the rocket flew into, a few dozen bars up. The smoke comes out of
// the rocket's nozzle: the nozzle rides the trail's tip, and the rocket leans into the corkscrew
// from there. On its way up from the pad (the land's depth) to the near lanes' depth the rocket
// and its fresh trail move over together (nearOf), so the trail's foot sits on the lift-off smoke
// even when the camera has already risen; once the rocket is gone the trail settles at the near
// lanes' depth. The launch cloud and the smoke of the lift-off stay with the pad (the land's
// depth) and thin away from the bottom up after half a minute, the trail's foot tapering after
// them; the trail's lowest puffs melt away as they come down to the land's skyline, so it never
// hangs in front of the land. The near side of the corkscrew is drawn in the clouds' own colors,
// the far side fainter and a little smaller, so it reads as a spiral, not a wave. Everything
// keeps to the right lane, clear of the tower's column and the screen's side, and is a function
// of the scene's clock and the camera's height alone.
//
// Heights here are "z": u above the near layer's ground, which at the start is the floor line
// (so at the start z = the land's height above its horizon + HORIZON_UP). Across, u right of the
// screen's center.

const TAU = Math.PI * 2;

/** When the engine lights, and when the rocket leaves the pad (s on the scene's clock). */
export const IGNITE = 10;
export const LIFTOFF = 11.2;

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

/** The rocket is drawn with the land (in front of the launch tower, behind the land's nearer hills) until its nozzle is this high above the horizon (u). */
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

/** The trail's puffs melt away as they come down to this band above the land's horizon (u): gone at the bottom (below THIN_CUT of their size), whole at the top. */
const MELT0 = 0.3;
const MELT1 = 0.4;

/**
 * The launch cloud and the lift-off smoke thin away from the bottom up: the lowest puffs from
 * THIN0 over THIN_EACH seconds, the highest THIN_SPREAD seconds later (all gone by
 * THIN0 + THIN_SPREAD + THIN_EACH); the trail's foot tapers away with the highest. A puff thinned
 * below THIN_CUT of its size, or smaller than MIN_PUFF (u), is left out, so thinning smoke never
 * leaves a dotted line of specks.
 */
const THIN0 = LIFTOFF + 10;
const THIN_SPREAD = 14;
const THIN_EACH = 8;
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

/** How far the lower trail has settled at the near lanes' depth (0: still where the rocket left it). */
function settledAt(s: Scene): number {
  return Math.max(smooth(GONE, GONE + SETTLE, s.t), smooth(RISE1 - SETTLE_CLIMB, RISE1, climbed(s)));
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
  /** "pad" until lift-off, "climb" on its way up, "gone" into the cloud. */
  phase: "pad" | "climb" | "gone";
  /** Its center's height (z): the climb. */
  z: number;
  /**
   * Its nozzle — the tip of its trail: the height (z), across (u right of the screen's center)
   * and where that height shows, as seen from a little below (z).
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
}

/**
 * Seconds after lift-off when the rocket is gone into the cloud: its flame's tip has passed the
 * cloud's flat bottom (the nozzle as seen sits within TILT × R_END of its height; the flame
 * reaches FLAME × its size below it, a little bigger on the near side of the corkscrew).
 */
export const GONE = LIFTOFF + passes(CLOUD_Z + 0.004 + TILT * R_END + FLAME * PAD_SQUASH * sizeAt(CLOUD_Z) * 1.08);

/** The nozzle's height on the pad. */
const PAD_NZ = HORIZON_UP + NOZZLE * PAD_SQUASH;

const NOW: Rocket = { phase: "pad", z: Z0, nz: PAD_NZ, x: PAD_ROCKET_X, y: PAD_NZ, k: 1, lean: 0, flame: 0, near: 0 };

/** The rocket at scene time t (the returned object is reused: copy it to keep it). */
export function rocketAt(t: number): Rocket {
  const r = NOW;
  if (t < LIFTOFF) {
    const lit = smooth(IGNITE, IGNITE + 0.5, t);
    r.phase = "pad";
    r.z = Z0;
    r.nz = PAD_NZ;
    // Trembling on the pad while the engine roars.
    r.x = PAD_ROCKET_X + (lit > 0 ? Math.sin(t * 53) * 0.0025 * lit : 0);
    r.y = PAD_NZ;
    r.k = 1;
    r.lean = 0;
    r.flame = FLAME * lit * flicker(t);
    r.near = 0;
    return r;
  }
  const z = climb(t - LIFTOFF);
  const nz = nozzleOf(z);
  r.phase = t >= GONE ? "gone" : "climb";
  r.z = z;
  r.nz = nz;
  // The nozzle rides the corkscrew, where the trail comes out of it.
  r.x = pathX(nz);
  r.y = pathZ(nz);
  r.k = sizeAt(z) * (1 + 0.08 * depthAt(nz));
  r.lean = leanAt(nz);
  r.flame = FLAME * flicker(t);
  r.near = nearOf(nz);
  return r;
}

// ---------------------------------------------------------------- the smoke

/**
 * A smoke puff: where (z, across), its full radius (u), when it appears (s after lift-off),
 * whether it is on the near side of the corkscrew, how far it is from the land's depth to the
 * near lanes' as it appears (nearOf), and how much it thins with the lift-off smoke (0: not at
 * all; for the lift-off smoke, its place in the bottom-up thinning).
 */
interface Puff {
  z: number;
  x: number;
  r: number;
  at: number;
  front: boolean;
  near: number;
  thin: number;
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
 * bottom-up thinning (0 the lowest, 1 the highest): 1 until it starts, 0 once it is done.
 */
function thinned(t: number, f: number): number {
  const t0 = THIN0 + f * THIN_SPREAD;
  return 1 - smooth(t0, t0 + THIN_EACH, t);
}

/** Whether the launch cloud and the lift-off smoke are all gone. */
function allThinned(t: number): boolean {
  return t >= THIN0 + THIN_SPREAD + THIN_EACH;
}

// ---------------------------------------------------------------- the rocket

/**
 * The toy rocket in its own frame: its nozzle's center at the origin, up is -y, in px for the
 * rocket at full size; with `flame` (px) a flame below the nozzle. A cream body (shaded right
 * side) with a red nose, fins and band and two round windows.
 */
function rocketShape(ctx: Ctx, u: number, tone: Tone, flame: number): void {
  const [red, , blue] = tone.land;
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
 * Where the rocket's nozzle shows on screen (px; the returned object is reused): on its trail's
 * tip, at the trail's depth (settled with it, if the camera is already that high), easing over
 * from the pad's (on the pad, it is on the pad).
 */
export function nozzleOnScreen(s: Scene, r: Rocket): { x: number; y: number } {
  const settled = settledAt(s) * smooth(PAD_NZ, TRAIL_FROM, r.nz);
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
  ctx.scale(r.k, r.k * PAD_SQUASH);
  rocketShape(ctx, u, tone, r.flame * u);
  ctx.restore();
}

/** Whether the rocket is drawn with the land now (on its pad, or still low beside the launch tower: at the land's depth either way). */
function withLand(r: Rocket): boolean {
  return r.phase === "pad" || (r.phase === "climb" && r.nz - HORIZON_UP < SKY_FROM);
}

// ---------------------------------------------------------------- at the pad (the land's depth)

/** How far the service arm has swung up out of the rocket's way (radians): just before ignition. */
export function armSwing(t: number): number {
  return 1.45 * smooth(IGNITE - 0.9, IGNITE - 0.1, t);
}

/**
 * At the pad, drawn with the land (launchPad calls these): behind the rocket, the smoke of its
 * lift-off; the rocket itself while it is on the pad or still low; in front of it, the launch
 * cloud. The smoke thins away from the bottom up half a minute after lift-off.
 */
export function padSmokeBehind(ctx: Ctx, s: Scene, tone: Tone): void {
  const tau = s.t - LIFTOFF;
  if (tau <= 0 || allThinned(s.t)) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const hz = horizon(s);
  BACK.n = 0;
  for (const p of COLUMN) {
    if (p.at > tau) break;
    const left = thinned(s.t, p.thin);
    if (left >= THIN_CUT) add(BACK, cx + p.x * u, hz - p.z * u, p.r * u * grown(tau - p.at) * left);
  }
  puffs(ctx, BACK, tone.cloudShade, tone.cloud, tone.cloudLight);
}

/** The rocket on its pad or still low (drawn with the land). */
export function padRocket(ctx: Ctx, s: Scene, tone: Tone): void {
  const r = rocketAt(s.t);
  if (withLand(r)) drawRocket(ctx, s, tone, r);
}

/**
 * The engine's fire at the rocket's foot, licking up out of the launch cloud: tongues of orange
 * flame with yellow hearts, flickering, from ignition until the rocket is clear of the pad. In
 * front of the smoke, so the fire shows at the bottom of it.
 */
export function padFlames(ctx: Ctx, s: Scene, tone: Tone): void {
  const t = s.t;
  const on = smooth(IGNITE, IGNITE + 0.35, t) * (1 - smooth(LIFTOFF + 0.4, LIFTOFF + 1.4, t));
  if (on <= 0.02) return;
  const u = s.u;
  const x0 = s.cssW / 2 + PAD_ROCKET_X * u;
  const y0 = horizon(s) - NOZZLE * PAD_SQUASH * u + 0.006 * u;
  for (let pass = 0; pass < 2; pass++) {
    const k = pass === 0 ? 1 : 0.55;
    ctx.beginPath();
    for (let i = 0; i < FIRE.length; i++) {
      const [dx, w, h] = FIRE[i]!;
      const f = on * (0.8 + 0.2 * Math.sin(t * 23 + i * 2.3));
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

/** The launch cloud billowing over the pad, in front of the rocket's foot. */
export function padSmokeFront(ctx: Ctx, s: Scene, tone: Tone): void {
  const t = s.t;
  if (t <= IGNITE || allThinned(t)) return;
  const u = s.u;
  const x0 = s.cssW / 2 + PAD_ROCKET_X * u;
  const y0 = horizon(s) - NOZZLE * PAD_SQUASH * u;
  const blast = smooth(LIFTOFF, LIFTOFF + 1.5, t);
  FRONT.n = 0;
  for (const [dx, dy, r, delay] of MOUND) {
    const b = smooth(IGNITE + delay, IGNITE + delay + 1.1, t);
    if (b <= 0) continue;
    const out = 0.35 + 0.65 * b + 0.12 * blast;
    // The launch cloud is the bottom of the lift-off smoke: it thins first, its top puffs last.
    const left = thinned(t, dy / COLUMN_TOP);
    if (left >= THIN_CUT) add(FRONT, x0 + dx * out * u, y0 - dy * out * u, r * u * (0.3 + 0.7 * b) * (1 + 0.12 * blast) * left);
  }
  puffs(ctx, FRONT, tone.cloudShade, tone.cloud, tone.cloudLight);
}

// ---------------------------------------------------------------- in the sky (the near lanes' depth)

/**
 * The rocket's corkscrew of smoke, the rocket once it is up in the sky, and the cloud it flies
 * into: drawn after the land, before the cloud sea, whether or not the land still shows.
 */
export function rocketSky(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const ground = layerGround(s, NEAR_P);
  const cloudY = ground - CLOUD_Z * u;
  // All of it is below the screen once the cloud is.
  if (cloudY - u * 0.2 > s.cssH) return;
  const tau = s.t - LIFTOFF;
  if (tau > 0) {
    const hz = horizon(s);
    // Screen y of z = 0 at the land's depth, and how much lower the near lanes' depth shows it.
    const land0 = hz + HORIZON_UP * u;
    const deeper = ground - land0;
    // The fresh trail is where the rocket was (nearOf); once it is gone the trail settles at the near lanes' depth.
    const settled = settledAt(s);
    // Its foot tapers away with the top of the lift-off smoke under it.
    const foot = thinned(s.t, 1);
    BACK.n = 0;
    FRONT.n = 0;
    for (const p of TRAIL) {
      if (p.at > tau) break;
      const y = land0 + deeper * (p.near + (1 - p.near) * settled) - p.z * u;
      if (y - u * 0.05 > s.cssH || y + u * 0.05 < 0) continue;
      // Melting away as it comes down to the land's skyline.
      const left = smooth(MELT0, MELT1, (hz - y) / u) * (1 - p.thin * (1 - foot));
      const r = p.r * u * grown(tau - p.at) * left;
      if (left < THIN_CUT || r < MIN_PUFF * u) continue;
      add(p.front ? FRONT : BACK, cx + p.x * u, y, p.front ? r : r * 0.84);
    }
    puffs(ctx, BACK, tone.farCloudShade, tone.farCloud, tone.farCloudLight);
    puffs(ctx, FRONT, tone.cloudShade, tone.cloud, tone.cloudLight);
    const r = rocketAt(s.t);
    if (r.phase === "climb" && !withLand(r)) drawRocket(ctx, s, tone, r);
  }
  if (cloudY < -u * 0.01) return;
  blockCloud(ctx, TALL_CLOUD, cx + AXIS * u, cloudY, CLOUD_S * u, tone.cloudShade, tone.cloud, tone.cloudLight);
}
