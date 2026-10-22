import { oval, type Ctx } from "../../base/draw";
import { dot } from "./cast/pen";
import { BONE, BONE_SHADE, INK, MOON_RIM } from "./cast/palette";

// Skeleton parts that climb out of the graves, drawn the Burton way: spindly and knobby, bone
// white with one ink outline round the whole silhouette and a cool line of moonlight on their
// upper-left edges. A long-fingered hand with knuckle knobs on two thin forearm bones; a round
// skull with big hollow sockets, a crack sewn shut with X-stitches and a chattering jaw; a pair
// of feet with long knobby toes on thin shins. Each is drawn in two passes over the same paths, a
// fat ink pass and then the bone pass on top, so joints merge with no inner seams. Silly-spooky,
// never gory.
//
// All three are drawn in local space with the soil line at y = 0 and up as -y. `up` 0..1 is
// how far the part has risen; the caller clips at the soil line, and every part runs on below
// it so the clip edge always cuts through bone, never through empty space.

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- hand

/** Path of the two forearm bones, from below the soil up to the wrist at (wx, wy). */
function armPath(ctx: Ctx, len: number, a: number, wx: number, wy: number): void {
  const ox = Math.cos(a) * len * 0.032;
  const oy = Math.sin(a) * len * 0.032;
  const bx = wx - Math.sin(a) * len * 0.75;
  const by = wy + Math.cos(a) * len * 0.75;
  ctx.moveTo(bx - ox, by - oy);
  ctx.lineTo(wx - ox * 0.6, wy - oy * 0.6);
  ctx.moveTo(bx + ox, by + oy);
  ctx.lineTo(wx + ox * 0.6, wy + oy * 0.6);
}

/** Scratch geometry for the hand being drawn, reused so nothing allocates per frame. */
const HAND = { len: 0, wx: 0, wy: 0, kx: 0, ky: 0, ux: 0, uy: 0, ha: 0, side: 1, curl: 0 };

/** Segment lengths of a finger, knuckle to tip, in units of the hand's reach. */
const PHALANX = [0.13, 0.1, 0.08] as const;

/**
 * Four long fingers fanned from the knuckles, three joints each, then the thumb off the palm.
 * With `knobs`, a circle at every joint (radius r) instead of the bones between them.
 */
function fingersPath(ctx: Ctx, knobs: boolean, r: number): void {
  const { len, wx, wy, kx, ky, ux, uy, ha, side, curl } = HAND;
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * len * 0.05;
    let fx = kx - uy * off;
    let fy = ky + ux * off;
    let ang = ha + (f - 1.5) * 0.24;
    const short = f === 0 || f === 3 ? 0.82 : 1;
    if (knobs) dot(ctx, fx, fy, r);
    else ctx.moveTo(fx, fy);
    for (let j = 0; j < 3; j++) {
      const seg = len * PHALANX[j]! * short;
      fx += Math.sin(ang) * seg;
      fy -= Math.cos(ang) * seg;
      if (knobs) {
        if (j === 0) dot(ctx, fx, fy, r * 0.85);
      } else ctx.lineTo(fx, fy);
      ang += side * (0.15 + curl * 0.55);
    }
  }
  let fx = wx - uy * side * len * 0.06;
  let fy = wy + ux * side * len * 0.06;
  let ang = ha - side * 0.95;
  if (!knobs) ctx.moveTo(fx, fy);
  for (let j = 0; j < 2; j++) {
    fx += Math.sin(ang) * len * 0.09;
    fy -= Math.cos(ang) * len * 0.09;
    if (knobs) {
      if (j === 0) dot(ctx, fx, fy, r * 0.85);
    } else ctx.lineTo(fx, fy);
    ang += side * (0.35 + curl * 0.35);
  }
}

/** The palm: a narrow wedge from the wrist out to the knuckle line. */
function palmPath(ctx: Ctx): void {
  const { len, wx, wy, kx, ky, ux, uy } = HAND;
  ctx.moveTo(wx + uy * len * 0.04, wy - ux * len * 0.04);
  ctx.lineTo(kx + uy * len * 0.085, ky - ux * len * 0.085);
  ctx.lineTo(kx - uy * len * 0.085, ky + ux * len * 0.085);
  ctx.lineTo(wx - uy * len * 0.04, wy + ux * len * 0.04);
  ctx.closePath();
}

/**
 * A bony hand clawing up out of the soil. `len` is the reach from the soil to the fingertips;
 * `side` (1 or -1) picks which way the fingers curl. The forearm comes up first, then the
 * wrist bends and the long fingers clench and open.
 */
export function boneHand(ctx: Ctx, len: number, up: number, t: number, side: 1 | -1, lw: number): void {
  const rise = (1 - up) * len * 1.05;
  const a = side * 0.12 + Math.sin(t * 2.1) * 0.16 * up;
  const h = HAND;
  h.len = len;
  h.side = side;
  h.wx = Math.sin(a) * len * 0.4;
  h.wy = -Math.cos(a) * len * 0.4 + rise;
  h.ha = a * 1.4 + side * 0.08 * Math.sin(t * 3.3);
  h.ux = Math.sin(h.ha);
  h.uy = -Math.cos(h.ha);
  h.kx = h.wx + h.ux * len * 0.16;
  h.ky = h.wy + h.uy * len * 0.16;
  h.curl = 0.5 + 0.5 * Math.sin(t * 3 + side);
  const { wx, wy } = h;
  const boneW = Math.max(1.4, len * 0.045);
  const knob = Math.max(1, boneW * 0.75);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ink pass: forearm, fingers and palm in one outline, then the knobs at the knuckles and joints
  ctx.beginPath();
  armPath(ctx, len, a, wx, wy);
  fingersPath(ctx, false, 0);
  palmPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = boneW + lw * 2;
  ctx.stroke();
  ctx.beginPath();
  fingersPath(ctx, true, knob + lw);
  dot(ctx, wx, wy, len * 0.06 + lw);
  ctx.fillStyle = INK;
  ctx.fill();
  // Bone pass
  ctx.beginPath();
  armPath(ctx, len, a, wx, wy);
  fingersPath(ctx, false, 0);
  palmPath(ctx);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = boneW;
  ctx.stroke();
  ctx.beginPath();
  palmPath(ctx);
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.beginPath();
  fingersPath(ctx, true, knob);
  dot(ctx, wx, wy, len * 0.06);
  ctx.fill();
  const armW = boneW;
  // Moonlight down the forearm's upper-left edge, a shaded groove on its other side
  const ox = Math.cos(a) * len * 0.032;
  ctx.beginPath();
  ctx.moveTo(wx - ox - Math.sin(a) * len * 0.1 - armW * 0.2, wy + Math.cos(a) * len * 0.1);
  ctx.lineTo(wx - ox - Math.sin(a) * len * 0.5 - armW * 0.2, wy + Math.cos(a) * len * 0.5);
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = Math.max(0.8, armW * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx + ox - Math.sin(a) * len * 0.1 + armW * 0.2, wy + Math.cos(a) * len * 0.1);
  ctx.lineTo(wx + ox - Math.sin(a) * len * 0.5 + armW * 0.2, wy + Math.cos(a) * len * 0.5);
  ctx.strokeStyle = BONE_SHADE;
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

/** The jaw's outline, hanging below the cranium, `chat` px open. */
function jaw(ctx: Ctx, r: number, cy: number, chat: number): void {
  ctx.moveTo(-r * 0.58, cy + r * 0.72 + chat);
  ctx.lineTo(r * 0.58, cy + r * 0.72 + chat);
  ctx.quadraticCurveTo(r * 0.52, cy + r * 1.28 + chat, 0, cy + r * 1.32 + chat);
  ctx.quadraticCurveTo(-r * 0.52, cy + r * 1.28 + chat, -r * 0.58, cy + r * 0.72 + chat);
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

  // A thin knobby spine running down into the soil
  ctx.beginPath();
  ctx.moveTo(0, cy + size * 0.5);
  ctx.lineTo(0, size * 0.5);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.12 + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = size * 0.12;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) oval(ctx, 0, cy + size * (0.62 + i * 0.22), size * 0.11, size * 0.05);
  ctx.fillStyle = BONE;
  ctx.fill();

  // Cranium and the jaw hanging below it, chattering; shaded on the lower right, moonlit on the upper left
  cranium(ctx, r, cy);
  jaw(ctx, r, cy, chat);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, cy, r, -0.1 * Math.PI, 0.55 * Math.PI);
  ctx.quadraticCurveTo(r * 0.2, cy + r * 0.5, r * 0.15, cy + r * 0.2);
  ctx.quadraticCurveTo(r * 0.5, cy - r * 0.05, r * 0.95, cy - r * 0.3);
  ctx.closePath();
  ctx.fillStyle = BONE_SHADE;
  ctx.fill();
  cranium(ctx, r, cy);
  jaw(ctx, r, cy, chat);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, cy, r - lw * 1.2, Math.PI * 1.08, Math.PI * 1.42);
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = Math.max(0.8, lw * 0.8);
  ctx.stroke();

  // Big hollow sockets and the nose: separate subpaths so nothing joins up.
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, -r * 0.4, cy + r * 0.2, r * 0.32, r * 0.36, 0.15);
  oval(ctx, r * 0.4, cy + r * 0.2, r * 0.32, r * 0.36, -0.15);
  ctx.moveTo(0, cy + r * 0.5);
  ctx.lineTo(-r * 0.12, cy + r * 0.7);
  ctx.lineTo(r * 0.12, cy + r * 0.7);
  ctx.closePath();
  ctx.fill();

  // A crack down from the crown, sewn shut with X-stitches
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, cy - r * 0.98);
  ctx.lineTo(-r * 0.05, cy - r * 0.7);
  ctx.lineTo(-r * 0.26, cy - r * 0.5);
  ctx.lineTo(-r * 0.1, cy - r * 0.24);
  for (let i = 0; i < 3; i++) {
    const y = cy - r * (0.82 - i * 0.25);
    const x = -r * (0.13 + (i % 2) * 0.06);
    const d = r * 0.09;
    ctx.moveTo(x - d, y - d);
    ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d);
    ctx.lineTo(x - d, y + d);
  }
  // Teeth along the top of the jaw and the bottom of the cranium (stroked with the crack)
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
  [-0.07, 0.02, -0.065, -0.12, -0.055, -0.18],
  [-0.045, -0.26, -0.085, -0.3, -0.06, -0.35],
  [-0.03, -0.39, 0.06, -0.38, 0.085, -0.33],
  [0.105, -0.26, 0.07, -0.14, 0.062, -0.08],
  [0.056, 0.0, 0.036, 0.02, 0, 0.02],
] as const;
// Long toes: base x, base y on the sole's top edge, then the toe's length and lean.
const TOES = [
  [-0.05, -0.36, 0.095, -0.1],
  [-0.016, -0.38, 0.093, -0.03],
  [0.016, -0.375, 0.09, 0.05],
  [0.044, -0.36, 0.08, 0.12],
  [0.068, -0.335, 0.07, 0.18],
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

/** The toes as bones (lines), or with `r` > 0 as knobs at their tips. */
function toesPath(ctx: Ctx, t: number, side: number, r: number): void {
  for (let i = 0; i < TOES.length; i++) {
    const [bx, by, l, lean] = TOES[i]!;
    const wig = Math.sin(t * 7 + i * 1.1 + side) * 0.08;
    const a = lean + wig;
    const mx = bx + Math.sin(a) * l * 0.5;
    const my = by - Math.cos(a) * l * 0.5;
    const ex = mx + Math.sin(a + wig) * l * 0.5;
    const ey = my - Math.cos(a + wig) * l * 0.5;
    if (r > 0) dot(ctx, fx(ex, ey), fy(ex, ey), r);
    else {
      ctx.moveTo(fx(bx, by), fy(bx, by));
      ctx.lineTo(fx(mx, my), fy(mx, my));
      ctx.lineTo(fx(ex, ey), fy(ex, ey));
    }
  }
}

/** Scratch: the shin bones of the foot being drawn (foot of the shins at b, ankle at a, the two bones ±o apart). */
const SHIN = { bx: 0, by: 0, ax: 0, ay: 0, ox: 0, oy: 0 };

/** Set up foot `side` (-1, 1): its transform F and its shins. */
function foot(side: number, len: number, up: number, t: number): void {
  const rise = (1 - up) * len * 1.08;
  const sx = side * len * 0.24;
  const lean = side * 0.1 + Math.sin(t * 1.4 + side) * 0.06;
  SHIN.ax = sx + Math.sin(lean) * len * 0.36;
  SHIN.ay = -Math.cos(lean) * len * 0.36 + rise;
  SHIN.bx = sx - Math.sin(lean) * len * 0.3;
  SHIN.by = len * 0.3 + rise;
  SHIN.ox = Math.cos(lean) * len * 0.028;
  SHIN.oy = Math.sin(lean) * len * 0.028;
  // The foot, tipped outward. Local (lx, ly) maps to screen, mirrored so the big toe is inside.
  const r = lean * 1.8;
  F.ax = SHIN.ax;
  F.ay = SHIN.ay;
  F.c = Math.cos(r) * len;
  F.sn = Math.sin(r) * len;
  F.kx = side * 1.75;
  F.ky = 1.35;
}

/** Both feet's shins and toes, as lines. */
function bonesPath(ctx: Ctx, len: number, up: number, t: number): void {
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    foot(side, len, up, t);
    const { bx, by, ax, ay, ox, oy } = SHIN;
    ctx.moveTo(bx - ox, by - oy);
    ctx.lineTo(ax - ox, ay - oy);
    ctx.moveTo(bx + ox, by + oy);
    ctx.lineTo(ax + ox, ay + oy);
    toesPath(ctx, t, side, 0);
  }
}
function solesPath(ctx: Ctx, len: number, up: number, t: number): void {
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    foot(side, len, up, t);
    solePath(ctx);
  }
}
function knobsPath(ctx: Ctx, len: number, up: number, t: number, r: number): void {
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    foot(side, len, up, t);
    toesPath(ctx, t, side, r);
  }
}

/** A pair of bony feet sticking up out of the soil, soles out, long knobby toes wiggling. */
export function boneFeet(ctx: Ctx, len: number, up: number, t: number, lw: number): void {
  const boneW = Math.max(1.3, len * 0.04);
  const knob = Math.max(0.9, len * 0.028);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ink pass: two thin shin bones and the toes, the soles, the knobs at the toes' tips
  bonesPath(ctx, len, up, t);
  ctx.strokeStyle = INK;
  ctx.lineWidth = boneW + lw * 2;
  ctx.stroke();
  solesPath(ctx, len, up, t);
  ctx.lineWidth = lw * 2;
  ctx.stroke();
  // Bone pass
  bonesPath(ctx, len, up, t);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = boneW;
  ctx.stroke();
  solesPath(ctx, len, up, t);
  ctx.fillStyle = BONE;
  ctx.fill();
  knobsPath(ctx, len, up, t, knob);
  ctx.fill();
  // Gaps between the long foot bones
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    foot(side, len, up, t);
    for (let i = 0; i < 4; i++) {
      const tx = -0.03 + i * 0.03;
      const ty = -0.3 + Math.abs(i - 1) * 0.012;
      ctx.moveTo(fx(tx * 0.4, -0.12), fy(tx * 0.4, -0.12));
      ctx.lineTo(fx(tx, ty), fy(tx, ty));
    }
  }
  ctx.strokeStyle = BONE_SHADE;
  ctx.lineWidth = Math.max(0.8, len * 0.016);
  ctx.stroke();
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
