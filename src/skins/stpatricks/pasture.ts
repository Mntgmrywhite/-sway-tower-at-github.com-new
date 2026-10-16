import { circle, hash, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { FACE, INK, WOOL } from "./colors";
import { inkW } from "./tower";

// The back pasture: beyond the brow of the meadow, out on the left behind the cottage, a little
// flock frolics in the spring grass. Two ewes graze, lift their heads to look about and now and
// then give a little bounce; their two lambs race each other round and round in a ring (one
// chasing the other half a lap behind), stop dead to graze, then pronk (straight up on stiff
// legs, all four at once) or skip about, turning in the air. Each spends most of its time
// grazing, so the bursts read as bursts. Everything is a function of the scene's time: each
// animal runs on its own cycle, and each cycle picks (by hash) what that burst is, so no two
// cycles look quite the same and nothing ever repeats in lockstep. All of it stays in the left
// side lane, clear of the tower's column, and no two animals ever touch: the ewes graze apart,
// and the lambs' ring keeps them half a lap apart and clear of both.
//
// Mid-distance, but they are characters: flat wool with a shaded underside and a lit cap, and a
// thin ink line (thinner than the near props'), so they read on the light grass.
//
// Positions are in u from the screen center; depths in u below the horizon.

/** One animal's pose this frame: body center x, ground, size (half body length), facing, lift off the ground, legs, head. */
interface Pose {
  x: number;
  foot: number;
  L: number;
  m: number;
  /** How far the whole animal is off the ground (a hop). */
  lift: number;
  /** Legs: 0 straight down, ±1 a running stride (front legs reach ahead, hind legs behind). */
  stride: number;
  /** 0 head up, 1 head down grazing; and its nod. */
  graze: number;
  nod: number;
}

const POSES: Pose[] = Array.from({ length: 4 }, () => ({ x: 0, foot: 0, L: 0, m: 1, lift: 0, stride: 0, graze: 0, nod: 0 }));

/** The ewes: home x, depth, size (u), facing, their cycle (s) and its offset. */
const EWES = [
  { X: -0.456, d: 0.14, L: 0.0195, m: 1, cycle: 17, off: 3.1 },
  { X: -0.288, d: 0.27, L: 0.023, m: -1, cycle: 19.5, off: 11.7 },
] as const;

/** The lambs' ring: center, half width and half depth (u), their size, cycle (s). */
const RING_X = -0.392;
const RING_D = 0.217;
const RING_RX = 0.05;
const RING_RD = 0.033;
const LAMB_L = 0.0155;
const LAMB_CYCLE = 13;
/** Seconds a lap of the race takes. */
const LAP = 2.4;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function ease(x: number): number {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
}

/** A run of `n` bounces over `dur` seconds starting at `t0`: 0..1 height (a parabola each). */
function bounces(t: number, t0: number, dur: number, n: number): number {
  const k = (t - t0) / dur;
  if (k <= 0 || k >= 1) return 0;
  const f = (k * n) % 1;
  return 4 * f * (1 - f);
}

/** Grazing nod: the head dips and lifts as it crops the grass. */
function nibble(t: number, ph: number): number {
  return 0.5 + 0.5 * Math.sin(t * 2.3 + ph);
}

function ewe(i: number, s: Scene, p: Pose): void {
  const e = EWES[i]!;
  const u = s.u;
  const t = s.t + e.off;
  const n = Math.floor(t / e.cycle);
  const k = t - n * e.cycle;
  const h = (j: number) => hash(n * 7 + i * 131 + j + 9300);
  p.L = e.L * u;
  p.m = e.m;
  p.foot = s.horizonY + e.d * u;
  // Mostly grazing; a few seconds looking up; and in some cycles a little bounce, or a few steps.
  const look0 = 4 + h(1) * 4;
  const up = ease((k - look0) / 0.5) * (1 - ease((k - look0 - 2.6) / 0.5));
  const bounce = h(2) < 0.55 ? 0.6 * bounces(k, look0 + 0.9, 1.1, 2) : 0;
  const step = h(3) < 0.5 ? Math.sin(Math.PI * clamp01((k - 11) / 3)) * 0.012 * e.m : 0;
  p.x = s.cssW / 2 + (e.X + step) * u;
  p.lift = bounce * p.L * 0.9;
  p.stride = step !== 0 ? Math.sin(k * 6) * 0.5 * Math.abs(Math.sin(Math.PI * clamp01((k - 11) / 3))) : 0;
  p.graze = 1 - up;
  p.nod = nibble(s.t, i * 2);
}

/** Scratch for the lambs' shared state this frame: where round the ring, which way, how hard they run, time to the start. */
const RACE = { theta: 0, dir: 1, running: 0, before: 0 };

/**
 * The lambs' race this cycle: graze, then race round the ring (one or two laps, either way
 * round), then pronk or skip, then graze again. Both lambs share the ring, half a lap apart.
 */
function race(s: Scene): number {
  const n = Math.floor(s.t / LAMB_CYCLE);
  const k = s.t - n * LAMB_CYCLE;
  const h = (j: number) => hash(n * 11 + j + 9400);
  const start = 2.5 + h(1) * 2;
  const laps = h(2) < 0.6 ? 1 : 2;
  RACE.dir = h(3) < 0.5 ? 1 : -1;
  const dur = laps * LAP;
  const q = clamp01((k - start) / dur);
  // An eased run: they start and stop over the first and last fifth of a lap.
  const e = q * q * q * (q * (q * 6 - 15) + 10);
  RACE.theta = Math.PI + RACE.dir * e * laps * Math.PI * 2;
  RACE.running = k > start && k < start + dur ? Math.min(1, Math.sin(Math.PI * q) * 2.5) : 0;
  RACE.before = start - k;
  return k - (start + dur);
}

function lamb(j: number, s: Scene, p: Pose, after: number): void {
  const u = s.u;
  const n = Math.floor(s.t / LAMB_CYCLE);
  const h = (i: number) => hash(n * 11 + j * 37 + i + 9500);
  const th = RACE.theta + j * Math.PI;
  p.L = LAMB_L * u;
  p.x = s.cssW / 2 + (RING_X + RING_RX * Math.cos(th)) * u;
  p.foot = s.horizonY + (RING_D + RING_RD * Math.sin(th)) * u;
  // Running: bounding along, facing the way round the ring it goes.
  const running = RACE.running;
  const vx = -Math.sin(th) * RACE.dir;
  const home = j === 0 ? 1 : -1;
  // After the race: a pronk (stiff-legged bounces straight up) or a skip (little hops, turning about).
  const pronk = h(1) < 0.55;
  const t0 = 0.4 + h(2) * 0.8 + j * 0.35;
  let lift = 0;
  let m = running > 0 ? (vx >= 0 ? 1 : -1) : home;
  if (running > 0) {
    lift = Math.abs(Math.sin(s.t * 9 + j)) * 0.8 * running;
  } else if (after > 0) {
    if (pronk) lift = bounces(after, t0, 1.5, 3) * 1.6;
    else {
      lift = bounces(after, t0, 1.6, 4) * 0.8;
      const hop = Math.floor(((after - t0) / 1.6) * 4);
      if (after > t0 && after < t0 + 1.6 && hop % 2 === 1) m = -m;
    }
  }
  p.m = m;
  p.lift = lift * p.L;
  p.stride = running > 0 ? Math.sin(s.t * 9 + j) * running : pronk && lift > 0 ? 0 : 0.3 * Math.sign(lift);
  // Heads come up just before the race, and go back down to the grass a while after it.
  if (RACE.before > 0) p.graze = ease(RACE.before / 0.5);
  else if (running > 0 || lift > 0 || after < 0) p.graze = 0;
  else p.graze = ease((after - 2.4) / 0.6);
  p.nod = nibble(s.t, 4 + j * 1.7);
}

/** Every animal's pose this frame (both ewes, both lambs). */
export function flockPoses(s: Scene): readonly Pose[] {
  ewe(0, s, POSES[0]!);
  ewe(1, s, POSES[1]!);
  const after = race(s);
  lamb(0, s, POSES[2]!, after);
  lamb(1, s, POSES[3]!, after);
  return POSES;
}

/** Where the legs stand, in units of the body's half length. */
const LEGS = [-0.55, -0.25, 0.3, 0.6] as const;

/** Wool puffs over the body: [dx, dy, r] in units of the body's half length. */
const FLEECE = [
  [-0.62, 0.05, 0.42],
  [-0.2, -0.22, 0.5],
  [0.28, -0.2, 0.48],
  [0.66, 0.06, 0.4],
  [0, 0.18, 0.55],
] as const;

/** Scratch head placement per animal: center and turn. */
const HEADS = POSES.map(() => ({ x: 0, y: 0, tilt: 0, c: 1, sn: 0, cy: 0 }));

/** Draw a set of posed sheep, every pass shared: legs, fleece (ink rim, shade, wool, lit caps), ears, heads, eyes. */
export function drawSheep(ctx: Ctx, poses: readonly Pose[], lw: number): void {
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const hd = HEADS[i]!;
    const L = p.L;
    hd.cy = p.foot - p.lift - L * 1.05;
    const g = p.graze;
    const nod = p.nod * g;
    // The head: up and looking about, or down in the grass nodding as it crops.
    hd.x = p.x + p.m * L * (1.08 - 0.06 * g);
    hd.y = hd.cy + L * (-0.32 + g * (0.74 + 0.12 * nod));
    hd.tilt = p.m * (0.25 + g * (0.65 + 0.12 * nod));
    hd.c = Math.cos(hd.tilt);
    hd.sn = Math.sin(hd.tilt);
  }
  // Legs: hips under the fleece, hooves a body-height below; striding ones reach out.
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const cy = HEADS[i]!.cy;
    for (const dx of LEGS) {
      const front = dx > 0 ? 1 : -1;
      const reach = p.stride * front * p.L * 0.38 * (dx > 0 ? 1 : 0.9);
      const hx = p.x + p.m * dx * p.L;
      ctx.moveTo(hx, cy + p.L * 0.2);
      ctx.lineTo(hx + p.m * reach, cy + p.L * 1.03);
    }
  }
  ctx.strokeStyle = FACE;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, poses[0]!.L * 0.22);
  ctx.stroke();
  // The fleece's ink rim is the same puffs a line wider, filled in ink under the wool.
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const cy = HEADS[i]!.cy;
    for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + p.m * dx * p.L, cy + dy * p.L, r * p.L + lw);
  }
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const cy = HEADS[i]!.cy;
    for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + p.m * dx * p.L, cy + dy * p.L, r * p.L);
  }
  ctx.fillStyle = WOOL.shade;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const cy = HEADS[i]!.cy;
    for (const [dx, dy, r] of FLEECE) circle(ctx, p.x + p.m * dx * p.L - r * p.L * 0.05, cy + dy * p.L - r * p.L * 0.16, r * p.L * 0.86);
  }
  ctx.fillStyle = WOOL.body;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const cy = HEADS[i]!.cy;
    for (const [dx, dy, r] of FLEECE) if (r > 0.45) circle(ctx, p.x + p.m * (dx - 0.18) * p.L, cy + (dy - 0.28) * p.L, r * p.L * 0.34);
  }
  ctx.fillStyle = WOOL.light;
  ctx.fill();
  // Ears, then the heads, in one ink each.
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const hd = HEADS[i]!;
    const ex = -p.m * p.L * 0.05;
    const ey = -p.L * 0.36;
    oval(ctx, hd.x + ex * hd.c - ey * hd.sn, hd.y + ex * hd.sn + ey * hd.c, p.L * 0.3, p.L * 0.12, hd.tilt - p.m * 0.5);
  }
  ctx.fillStyle = FACE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const hd = HEADS[i]!;
    oval(ctx, hd.x, hd.y, p.L * 0.3, p.L * 0.42, hd.tilt);
  }
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    const hd = HEADS[i]!;
    const ix = p.m * p.L * 0.1;
    const iy = -p.L * 0.1;
    circle(ctx, hd.x + ix * hd.c - iy * hd.sn, hd.y + ix * hd.sn + iy * hd.c, Math.max(0.6, p.L * 0.08));
  }
  ctx.fill();
  // A tuft of wool on the crown, over where the head joins the body.
  ctx.beginPath();
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]!;
    circle(ctx, p.x + p.m * p.L * 0.78, HEADS[i]!.cy - p.L * 0.15, p.L * 0.3);
  }
  ctx.fillStyle = WOOL.body;
  ctx.fill();
}

/** Ink up close is this much wider than the flock's. */
const FLOCK_INK = 0.6;

/** The flock in the back pasture, frolicking. Drawn after the meadow's far band, before the near props. */
export function flock(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (s.horizonY + u * 0.12 > s.cssH || s.horizonY + u * 0.3 < 0) return;
  drawSheep(ctx, flockPoses(s), Math.max(1, inkW(s) * FLOCK_INK));
}
