import { hash, type Ctx } from "../../../base/draw";
import { BONE, GHOST_GREEN, INK } from "./palette";
import { C, L, M, pen, Q, stroke } from "./pen";
import { bump, Rhythm, smooth, VISIT } from "./time";

// Skeletal birds: a beaked bird's skull, a little cage of ribs, wings of finger bones and three
// tail bones, on stick legs. One keeps to a perch (a cage, a dead tree): it hops round and pecks
// every few seconds and now and then flutters up off it, jerky flaps rattling. Out in the lanes,
// little V-flights of three to five cross on stiff wingbeats every 9-20 s. Bone white, inked, a
// pin-prick of ghost green in each socket.
//
// Drawn in its own units (one unit = its size, `size` px), feet at (x, y), facing `dir`.

/** Size in u at k = 1. */
export const BONEBIRD_SIZE = 0.028;

export interface BonebirdPose {
  flying: boolean;
  /** Wings -1 down .. 1 up (only while it flutters). */
  lift: number;
  /** 0..1 head down, pecking. */
  peck: number;
  /** 0..1 off its feet, hopping (fluttering, how high it is). */
  hop: number;
}

const POSE: BonebirdPose = { flying: false, lift: 0, peck: 0, hop: 0 };
/** Pecks and hops every 2-6 s; flutters up every 8-15 s (first ones in the opening seconds). */
const PECKS = new Rhythm(1.0, 0.7, 2, 6, 53);
const FLUTTERS = new Rhythm(3.4, 1.2, 8, 15, 59);
const FLUTTER = 1.4;

/** The perched bird at time t on the perch anchored `seed` (pure; the result is reused scratch). */
export function bonebirdAt(t: number, seed: number, sinceLand: number): Readonly<BonebirdPose> {
  const p = POSE;
  p.flying = false;
  p.lift = 0;
  p.peck = 0;
  p.hop = 0;
  const f = FLUTTERS.at(t, seed);
  const startle = sinceLand >= 0 ? bump(0, 0.05, 0.5, 0.7, sinceLand) : 0;
  if ((f >= 0 && f < FLUTTER) || startle > 0.01) {
    const k = f >= 0 && f < FLUTTER ? bump(0, 0.2, FLUTTER - 0.3, FLUTTER, f) : 0;
    p.hop = Math.max(k, startle * 0.7);
    p.flying = p.hop > 0.05;
    // Jerky flaps: the wings snap between up and down.
    const beat = Math.sin(t * 22);
    p.lift = Math.sign(beat) * Math.min(1, Math.abs(beat) * 3);
    return p;
  }
  const a = PECKS.at(t, seed);
  if (a >= 0 && a < 1.2) {
    p.peck = bump(0.1, 0.18, 0.3, 0.42, a) + bump(0.5, 0.58, 0.7, 0.82, a);
    p.hop = bump(0.85, 0.95, 0.95, 1.15, a) * 0.5;
  }
  return p;
}

function skull(ctx: Ctx, hx: number, hy: number, peck: number): void {
  C(ctx, hx, hy, 0.15);
  // The long beak
  M(ctx, hx + 0.1, hy - 0.06 + peck * 0.04);
  L(ctx, hx + 0.44, hy + 0.02 + peck * 0.2);
  L(ctx, hx + 0.1, hy + 0.06);
  ctx.closePath();
}

/** Head position of a pose (local units). */
function headX(p: Readonly<BonebirdPose>): number {
  return 0.26 + p.peck * 0.08;
}
function headY(p: Readonly<BonebirdPose>): number {
  return -0.62 + p.peck * 0.22;
}

/** The bird's bones as lines (no beginPath): legs, spine and neck, tail bones, ribs, a wing of finger bones. */
function boneLines(ctx: Ctx, p: Readonly<BonebirdPose>): void {
  const hx = headX(p);
  const hy = headY(p);
  // Legs (tucked when it flies), feet on the perch
  const leg = p.flying ? 0.12 : 0.3;
  M(ctx, -0.04, -0.3);
  L(ctx, -0.06, -0.3 + leg);
  M(ctx, 0.05, -0.3);
  L(ctx, 0.06, -0.3 + leg);
  if (!p.flying) {
    M(ctx, -0.16, 0);
    L(ctx, 0.18, 0);
  }
  // Spine and neck in one curve, tail bones fanned at its end
  M(ctx, -0.5, -0.36);
  Q(ctx, -0.1, -0.5, hx - 0.06, hy + 0.08);
  M(ctx, -0.36, -0.42);
  L(ctx, -0.62, -0.5);
  M(ctx, -0.36, -0.42);
  L(ctx, -0.64, -0.38);
  M(ctx, -0.36, -0.42);
  L(ctx, -0.6, -0.26);
  // Rib cage: three arcs hanging under the spine
  for (let i = 0; i < 3; i++) {
    const rx = -0.18 + i * 0.13;
    M(ctx, rx, -0.46 + i * 0.01);
    Q(ctx, rx + 0.1, -0.3, rx + 0.02, -0.24);
  }
  // A wing of finger bones from the shoulder: folded along the back, or beating
  const up = p.flying ? -0.5 * p.lift : 0;
  for (let i = 0; i < 3; i++) {
    const sp = i * 0.12;
    M(ctx, 0.02, -0.46);
    if (p.flying) {
      L(ctx, -0.12 - sp * 0.5, -0.46 + up * 0.7);
      L(ctx, -0.34 - sp, -0.46 + up * (1.05 - sp));
    } else {
      L(ctx, -0.2, -0.56 - sp * 0.2);
      L(ctx, -0.46 - sp * 0.6, -0.5 - sp * 0.4);
    }
  }
}

/** One bird up close: its bones inked, the skull and beak, a socket glinting ghost green. */
function bird(ctx: Ctx, p: Readonly<BonebirdPose>, lw: number, s: number): void {
  const bw = Math.max(0.9, s * 0.05);
  const hx = headX(p);
  const hy = headY(p);
  ctx.beginPath();
  boneLines(ctx, p);
  stroke(ctx, INK, bw + lw * 1.2);
  stroke(ctx, BONE, bw);
  ctx.beginPath();
  skull(ctx, hx, hy, p.peck);
  ctx.fillStyle = BONE;
  ctx.fill();
  stroke(ctx, INK, lw * 0.8);
  ctx.beginPath();
  C(ctx, hx + 0.02, hy - 0.02, 0.065);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  C(ctx, hx + 0.03, hy - 0.02, 0.022);
  ctx.fillStyle = GHOST_GREEN;
  ctx.fill();
}

/** The perched skeletal bird at (x, y) (its feet), `size` px, facing `dir`. */
export function bonebird(ctx: Ctx, x: number, y: number, size: number, dir: -1 | 1, p: Readonly<BonebirdPose>, lw: number): void {
  pen(x, y - p.hop * size * 0.5, size, dir);
  bird(ctx, p, lw, size);
}

/** Scratch box of `bonebirdBox`. */
const PBOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box of the perched bird (hopping or fluttering), feet at (x, y). */
export function bonebirdBox(x: number, y: number, size: number, _dir: -1 | 1, p: Readonly<BonebirdPose>): Readonly<typeof PBOX> {
  const lift = p.hop * size * 0.5;
  PBOX.x0 = x - size * 0.78;
  PBOX.x1 = x + size * 0.78;
  PBOX.y0 = y - lift - size * 1.05;
  PBOX.y1 = y - lift + size * 0.12;
  return PBOX;
}

/** Scratch result of `boneVAt`. */
const VFLIGHT = { k: 0, vis: 0, n: 3, dir: 1 as -1 | 1 };
/** V-flights: one every 9-20 s, the first at 3.0 s; 6 s across. */
const FLIGHTS = new Rhythm(3.0, 2.0, 9, 20, 61);
const CROSS = 6;

/** A V-flight crossing the lane anchored `seed`, if one is under way: progress, opacity, size, direction. */
export function boneVAt(t: number, seed: number): Readonly<typeof VFLIGHT> | null {
  const a = FLIGHTS.at(t, seed);
  if (!(a >= 0 && a < CROSS)) return null;
  const k = a / CROSS;
  VFLIGHT.k = k;
  const v = VISIT.k;
  VFLIGHT.vis = smooth(0, 0.12, k) * (1 - smooth(0.88, 1, k));
  VFLIGHT.n = 3 + Math.floor(hash(seed * 13 + v * 7 + 1) * 2.999);
  VFLIGHT.dir = hash(seed * 17 + v * 5 + 2) < 0.5 ? 1 : -1;
  return VFLIGHT;
}

/** Scratch pose for the birds of a V. */
const FLY: BonebirdPose = { flying: true, lift: 0, peck: 0, hop: 1 };

/**
 * A V-flight of n birds crossing `box` (k 0 → 1 from one side to the other, toward `dir`), each
 * `size` px, at time t for their jerky wingbeats.
 */
export function bonebirdV(
  ctx: Ctx,
  box: Readonly<{ x0: number; y0: number; x1: number; y1: number }>,
  k: number,
  n: number,
  size: number,
  dir: -1 | 1,
  t: number,
  lw: number,
): void {
  const span = size * 0.8;
  const w = box.x1 - box.x0;
  const R = size * 1.2 * Math.floor(n / 2);
  const lead = dir > 0 ? box.x0 + span + R + (w - 2 * span - R) * k : box.x1 - span - R - (w - 2 * span - R) * k;
  const midY = (box.y0 + box.y1) / 2 + Math.sin(k * Math.PI * 2) * (box.y1 - box.y0) * 0.12;
  const bw = Math.max(0.8, size * 0.05);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const rank = Math.ceil(i / 2);
      const side = i % 2 ? -1 : 1;
      const beat = Math.sin(t * 20 + i * 1.9);
      FLY.lift = Math.sign(beat) * Math.min(1, Math.abs(beat) * 3);
      pen(lead - dir * rank * size * 1.2, midY + side * rank * size * 0.55 + size * 0.45, size, dir);
      if (pass === 0) boneLines(ctx, FLY);
      else skull(ctx, headX(FLY), headY(FLY), 0);
    }
    if (pass === 0) {
      stroke(ctx, INK, bw + lw);
      stroke(ctx, BONE, bw);
    } else {
      ctx.fillStyle = BONE;
      ctx.fill();
      stroke(ctx, INK, lw * 0.6);
    }
  }
}

/** Scratch box of `bonebirdVBox`. */
const VBOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box of a V of n birds (whatever their beat), for keeping it inside its lane. */
export function bonebirdVBox(
  box: Readonly<{ x0: number; y0: number; x1: number; y1: number }>,
  k: number,
  n: number,
  size: number,
  dir: -1 | 1,
): Readonly<typeof VBOX> {
  const span = size * 0.8;
  const w = box.x1 - box.x0;
  const ranks = Math.floor(n / 2);
  const lead = dir > 0 ? box.x0 + span + size * 1.2 * ranks + (w - 2 * span - size * 1.2 * ranks) * k : box.x1 - span - size * 1.2 * ranks - (w - 2 * span - size * 1.2 * ranks) * k;
  const tail = lead - dir * ranks * size * 1.2;
  const midY = (box.y0 + box.y1) / 2 + Math.sin(k * Math.PI * 2) * (box.y1 - box.y0) * 0.12;
  VBOX.x0 = Math.min(lead, tail) - size * 0.78;
  VBOX.x1 = Math.max(lead, tail) + size * 0.78;
  VBOX.y0 = midY - ranks * size * 0.55 - size * 0.62;
  VBOX.y1 = midY + ranks * size * 0.55 + size * 0.62;
  return VBOX;
}
