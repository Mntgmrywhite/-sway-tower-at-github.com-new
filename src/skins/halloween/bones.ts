import { circle, oval, type Ctx } from "../../base/draw";
import { BONE, BONE_SHADE, INK } from "./common";

// Skeleton parts that climb out of the graves, in the cartoon style: bone-white shapes with one
// ink outline around the whole silhouette. Each is drawn in two passes over the same paths, a
// fat ink pass and then the bone pass on top, so joints merge with no inner seams.
//
// All three are drawn in local space with the soil line at y = 0 and up as -y. `up` 0..1 is
// how far the part has risen; the caller clips at the soil line, and every part runs on below
// it so the clip edge always cuts through bone, never through empty space.

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- hand

/** Path of the forearm, from below the soil up to the wrist at (wx, wy). */
function armPath(ctx: Ctx, len: number, a: number, wx: number, wy: number): void {
  ctx.beginPath();
  ctx.moveTo(wx - Math.sin(a) * len * 0.75, wy + Math.cos(a) * len * 0.75);
  ctx.lineTo(wx, wy);
}

/** Scratch geometry for the hand being drawn, reused so nothing allocates per frame. */
const HAND = { len: 0, wx: 0, wy: 0, kx: 0, ky: 0, ux: 0, uy: 0, ha: 0, side: 1, curl: 0 };

/** Four fingers fanned from the knuckles, three joints each, then the thumb off the palm. */
function fingersPath(ctx: Ctx): void {
  const { len, wx, wy, kx, ky, ux, uy, ha, side, curl } = HAND;
  ctx.beginPath();
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * len * 0.055;
    let fx = kx - uy * off;
    let fy = ky + ux * off;
    let ang = ha + (f - 1.5) * 0.26;
    const short = f === 0 || f === 3 ? 0.8 : 1;
    ctx.moveTo(fx, fy);
    for (let j = 0; j < 3; j++) {
      const seg = len * (0.12 - j * 0.026) * short;
      fx += Math.sin(ang) * seg;
      fy -= Math.cos(ang) * seg;
      ctx.lineTo(fx, fy);
      ang += side * (0.15 + curl * 0.55);
    }
  }
  let fx = wx - uy * side * len * 0.06;
  let fy = wy + ux * side * len * 0.06;
  let ang = ha - side * 0.95;
  ctx.moveTo(fx, fy);
  for (let j = 0; j < 2; j++) {
    fx += Math.sin(ang) * len * 0.09;
    fy -= Math.cos(ang) * len * 0.09;
    ctx.lineTo(fx, fy);
    ang += side * (0.35 + curl * 0.35);
  }
}

/** The palm: a wedge from the wrist out to the knuckle line. */
function palmPath(ctx: Ctx): void {
  const { len, wx, wy, kx, ky, ux, uy } = HAND;
  ctx.beginPath();
  ctx.moveTo(wx + uy * len * 0.05, wy - ux * len * 0.05);
  ctx.lineTo(kx + uy * len * 0.1, ky - ux * len * 0.1);
  ctx.lineTo(kx - uy * len * 0.1, ky + ux * len * 0.1);
  ctx.lineTo(wx - uy * len * 0.05, wy + ux * len * 0.05);
  ctx.closePath();
}

/**
 * A bony hand clawing up out of the soil. `len` is the reach from the soil to the fingertips;
 * `side` (1 or -1) picks which way the fingers curl. The forearm comes up first, then the
 * wrist bends and the fingers clench and open.
 */
export function boneHand(ctx: Ctx, len: number, up: number, t: number, side: 1 | -1, lw: number): void {
  const rise = (1 - up) * len * 1.05;
  const a = side * 0.12 + Math.sin(t * 2.1) * 0.16 * up;
  const h = HAND;
  h.len = len;
  h.side = side;
  h.wx = Math.sin(a) * len * 0.42;
  h.wy = -Math.cos(a) * len * 0.42 + rise;
  h.ha = a * 1.4 + side * 0.08 * Math.sin(t * 3.3);
  h.ux = Math.sin(h.ha);
  h.uy = -Math.cos(h.ha);
  h.kx = h.wx + h.ux * len * 0.17;
  h.ky = h.wy + h.uy * len * 0.17;
  h.curl = 0.5 + 0.5 * Math.sin(t * 3 + side);
  const { wx, wy } = h;
  const armW = Math.max(2.2, len * 0.11);
  const fingerW = Math.max(1.4, len * 0.055);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ink pass
  armPath(ctx, len, a, wx, wy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = armW + lw * 2;
  ctx.stroke();
  fingersPath(ctx);
  ctx.lineWidth = fingerW + lw * 2;
  ctx.stroke();
  palmPath(ctx);
  ctx.lineWidth = lw * 2;
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, wx, wy, len * 0.07 + lw);
  ctx.fillStyle = INK;
  ctx.fill();
  // Bone pass
  armPath(ctx, len, a, wx, wy);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = armW;
  ctx.stroke();
  fingersPath(ctx);
  ctx.lineWidth = fingerW;
  ctx.stroke();
  palmPath(ctx);
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, wx, wy, len * 0.07);
  ctx.fill();
  // A shaded groove down the forearm
  ctx.beginPath();
  ctx.moveTo(wx - Math.sin(a) * len * 0.12 + armW * 0.18, wy + Math.cos(a) * len * 0.12);
  ctx.lineTo(wx - Math.sin(a) * len * 0.4 + armW * 0.18, wy + Math.cos(a) * len * 0.4);
  ctx.strokeStyle = BONE_SHADE;
  ctx.lineWidth = Math.max(1, armW * 0.28);
  ctx.stroke();
}

// ---------------------------------------------------------------- skull

function cranium(ctx: Ctx, r: number, cy: number): void {
  ctx.beginPath();
  ctx.moveTo(-r * 0.98, cy + r * 0.1);
  ctx.arc(0, cy, r, Math.PI * 0.94, Math.PI * 2.06);
  ctx.quadraticCurveTo(r * 0.98, cy + r * 0.62, r * 0.56, cy + r * 0.86);
  ctx.lineTo(-r * 0.56, cy + r * 0.86);
  ctx.quadraticCurveTo(-r * 0.98, cy + r * 0.62, -r * 0.98, cy + r * 0.1);
  ctx.closePath();
}

/**
 * A skull pushing up out of the soil, rocking a little, jaw chattering. `size` is the
 * cranium's width.
 */
export function boneSkull(ctx: Ctx, size: number, up: number, t: number, lw: number): void {
  const r = size / 2;
  ctx.save();
  ctx.translate(0, (1 - up) * size * 1.45);
  ctx.rotate(Math.sin(t * 1.4) * 0.12 * up);
  const cy = -size * 0.84;
  const chat = Math.max(0, Math.sin(t * 8)) * size * 0.08;

  // Spine running down into the soil
  ctx.beginPath();
  ctx.moveTo(0, cy + size * 0.5);
  ctx.lineTo(0, size * 0.5);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.2 + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = size * 0.2;
  ctx.stroke();

  // Jaw, hanging below the cranium
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, cy + r * 0.72 + chat);
  ctx.lineTo(r * 0.6, cy + r * 0.72 + chat);
  ctx.quadraticCurveTo(r * 0.56, cy + r * 1.3 + chat, 0, cy + r * 1.34 + chat);
  ctx.quadraticCurveTo(-r * 0.56, cy + r * 1.3 + chat, -r * 0.6, cy + r * 0.72 + chat);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();

  // Cranium with cheekbones
  cranium(ctx, r, cy);
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = BONE_SHADE;
  ctx.beginPath();
  oval(ctx, r * 0.55, cy + r * 0.5, r * 0.75, r * 0.6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  oval(ctx, -r * 0.38, cy - r * 0.55, r * 0.28, r * 0.14, -0.4);
  ctx.fill();
  ctx.restore();
  cranium(ctx, r, cy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();

  // Sockets, nose, and a glint in each eye: separate subpaths so nothing joins up.
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, -r * 0.4, cy + r * 0.18, r * 0.27, r * 0.31);
  oval(ctx, r * 0.4, cy + r * 0.18, r * 0.27, r * 0.31);
  ctx.moveTo(0, cy + r * 0.46);
  ctx.lineTo(-r * 0.11, cy + r * 0.66);
  ctx.lineTo(r * 0.11, cy + r * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, -r * 0.33, cy + r * 0.1, r * 0.07);
  circle(ctx, r * 0.47, cy + r * 0.1, r * 0.07);
  ctx.fill();

  // Teeth along the top of the jaw and the bottom of the cranium
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * r * 0.2, cy + r * 0.86);
    ctx.lineTo(i * r * 0.2, cy + r * 0.98);
    ctx.moveTo(i * r * 0.2, cy + r * 0.74 + chat);
    ctx.lineTo(i * r * 0.2, cy + r * 0.92 + chat);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- feet

// Bony sole, in units of the foot's length: heel at the origin, toes up (-y), big toe at -x.
const SOLE = [
  [-0.08, 0.02, -0.07, -0.12, -0.06, -0.18],
  [-0.05, -0.26, -0.1, -0.31, -0.065, -0.36],
  [-0.025, -0.4, 0.07, -0.39, 0.095, -0.33],
  [0.115, -0.26, 0.075, -0.14, 0.068, -0.08],
  [0.062, 0.0, 0.04, 0.02, 0, 0.02],
] as const;
// Toes: x, y, radius.
const TOES = [
  [-0.052, -0.43, 0.036],
  [-0.002, -0.445, 0.026],
  [0.036, -0.43, 0.023],
  [0.068, -0.405, 0.02],
  [0.094, -0.37, 0.018],
] as const;

/** Scratch transform for one foot, reused so nothing allocates per frame. */
const F = { ax: 0, ay: 0, c: 0, sn: 0, kx: 0, ky: 0 };
function fx(lx: number, ly: number): number {
  return F.ax + lx * F.kx * F.c - ly * F.ky * F.sn;
}
function fy(lx: number, ly: number): number {
  return F.ay + lx * F.kx * F.sn + ly * F.ky * F.c;
}

function solePath(ctx: Ctx): void {
  ctx.moveTo(fx(0, 0.02), fy(0, 0.02));
  for (const [c1x, c1y, c2x, c2y, ex, ey] of SOLE) {
    ctx.bezierCurveTo(fx(c1x, c1y), fy(c1x, c1y), fx(c2x, c2y), fy(c2x, c2y), fx(ex, ey), fy(ex, ey));
  }
  ctx.closePath();
}

function toesPath(ctx: Ctx, len: number, t: number, side: number, grow: number): void {
  for (let i = 0; i < TOES.length; i++) {
    const toe = TOES[i]!;
    const wig = Math.sin(t * 7 + i * 1.1 + side) * 0.02;
    circle(ctx, fx(toe[0], toe[1] + wig), fy(toe[0], toe[1] + wig), toe[2] * len * 1.5 + grow);
  }
}

/** A pair of bony feet sticking up out of the soil, soles out, toes wiggling. */
export function boneFeet(ctx: Ctx, len: number, up: number, t: number, lw: number): void {
  const rise = (1 - up) * len * 1.08;
  const shinW = Math.max(2.2, len * 0.1);
  for (let side = -1; side <= 1; side += 2) {
    const sx = side * len * 0.24;
    const lean = side * 0.1 + Math.sin(t * 1.4 + side) * 0.06;
    const ax = sx + Math.sin(lean) * len * 0.36;
    const ay = -Math.cos(lean) * len * 0.36 + rise;
    // The foot, tipped outward. Local (lx, ly) maps to screen, mirrored so the big toe is inside.
    const r = lean * 1.8;
    F.ax = ax;
    F.ay = ay;
    F.c = Math.cos(r) * len;
    F.sn = Math.sin(r) * len;
    F.kx = side * 1.75;
    F.ky = 1.35;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Ink pass: shin, sole, toes
    ctx.beginPath();
    ctx.moveTo(sx - Math.sin(lean) * len * 0.3, len * 0.3 + rise);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = INK;
    ctx.lineWidth = shinW + lw * 2;
    ctx.stroke();
    ctx.beginPath();
    solePath(ctx);
    ctx.lineWidth = lw * 2;
    ctx.stroke();
    ctx.beginPath();
    toesPath(ctx, len, t, side, lw);
    ctx.fillStyle = INK;
    ctx.fill();
    // Bone pass
    ctx.beginPath();
    ctx.moveTo(sx - Math.sin(lean) * len * 0.3, len * 0.3 + rise);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = BONE;
    ctx.lineWidth = shinW;
    ctx.stroke();
    ctx.beginPath();
    solePath(ctx);
    ctx.fillStyle = BONE;
    ctx.fill();
    ctx.beginPath();
    toesPath(ctx, len, t, side, 0);
    ctx.fill();
    // Gaps between the long foot bones
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const tx = -0.03 + i * 0.033;
      const ty = -0.31 + Math.abs(i - 1) * 0.012;
      ctx.moveTo(fx(tx * 0.4, -0.12), fy(tx * 0.4, -0.12));
      ctx.lineTo(fx(tx, ty), fy(tx, ty));
    }
    ctx.strokeStyle = BONE_SHADE;
    ctx.lineWidth = Math.max(0.8, len * 0.016);
    ctx.stroke();
  }
}

/**
 * Clods of dirt flung out of the hole as a part bursts up, landing back on the mound.
 * `w` is the mound's half-width; `k` 0..1 runs through the burst.
 */
export function clods(ctx: Ctx, w: number, k: number, seed: number, fill: string, lw: number): void {
  if (k <= 0 || k >= 0.85) return;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const dir = (i - 1.5) * 0.7 + Math.sin(seed * 3.1 + i) * 0.2;
    const v = w * (0.55 + 0.2 * Math.sin(seed + i * 2.3));
    const x = Math.sin(dir) * v * k;
    const y = -v * 1.3 * k + v * 1.45 * k * k;
    const r = w * (0.06 + 0.02 * Math.sin(i * 1.7 + seed));
    oval(ctx, x, y, r, r * 0.8, (i + seed) % TAU);
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
}
