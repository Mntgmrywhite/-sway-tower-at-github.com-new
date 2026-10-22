import type { Ctx } from "../../../base/draw";
import { GOLD, INK, NIGHT, RIM_SOFT } from "./palette";
import { C, L, M, P, pen, Q, stroke, sx, sy } from "./pen";
import { bump, clamp01, Rhythm, smooth } from "./time";

// The black cat on the rooftops: a skinny Burton cat on long thin legs, its big head and tall ears
// on a slender arched body, gold slit eyes, and a very long tail that curls into a spiral. Every
// half minute or so (24-40 s apart) it steps out from behind its hiding place (a turret, a chimney
// stack), walks along the ridge, sits, and looks up at the moon; washes a paw; then gets up and
// walks back out of sight. When a floor lands on the tower it arches its back for a moment, tail
// straight up. Night black, lit along its upper-left edges by the moon.
//
// Drawn in its own units (one unit = its body length, `size` px), feet on the ridge at (x, y),
// facing `dir`.

/** Body length in u at k = 1 (its ears stand about 0.034 u above its feet). */
export const CAT_LEN = 0.05;

/** A visit, seconds from its start: out, settle, look, wash, turn, back. */
const OUT = 2.0;
const SETTLE = 0.4;
const LOOK = 2.0;
const WASH = 1.5;
const TURN = 0.3;
const BACK = 1.6;
const VISIT = OUT + SETTLE + LOOK + WASH + TURN + BACK;
/** Where along the ridge it sits (0 at the hiding end, 1 at the open end). */
const SIT_AT = 0.77;
/** Seconds per stride. */
const GAIT = 0.8;
/** First visit out at 5.6 s (earlier by 1.6 s for each step of its anchor's id mod 3), then every 24-40 s. */
const RHYTHM = new Rhythm(5.6, -1.6, 24, 40, 11);

export interface CatPose {
  /** Opacity: 0 while it is hidden. */
  vis: number;
  /** How far along its ridge: 0 at the hiding end, 1 at the open end. */
  along: number;
  /** Walking out (true) or back (false): it faces the way it walks. */
  out: boolean;
  /** Stride phase, 0..1. */
  gait: number;
  /** 0 standing .. 1 sitting. */
  sit: number;
  /** 0..1 looking up at the moon (lookX, lookY). */
  look: number;
  /** 0..1 a paw raised to its mouth, washing. */
  wash: number;
  /** The tail's swish, -1..1. */
  tail: number;
  /** 0..1 its back arched, tail up (a floor just landed). */
  startle: number;
}

const POSE: CatPose = { vis: 0, along: 0, out: true, gait: 0, sit: 0, look: 0, wash: 0, tail: 0, startle: 0 };

/** The cat at time t on the ridge anchored `seed` (pure; the result is reused scratch). */
export function catAt(t: number, seed: number, sinceLand: number): Readonly<CatPose> {
  const a = RHYTHM.at(t, seed);
  const p = POSE;
  p.tail = Math.sin(t * 2.1 + seed * 1.7);
  p.vis = 0;
  p.along = 0;
  p.out = true;
  p.gait = 0;
  p.sit = 0;
  p.look = 0;
  p.wash = 0;
  p.startle = 0;
  if (!(a >= 0 && a < VISIT)) return p;
  const backAt = OUT + SETTLE + LOOK + WASH + TURN;
  if (a < OUT) {
    const f = a / OUT;
    p.along = SIT_AT * (f < 0.85 ? f / 0.85 - 0.06 * Math.sin((f / 0.85) * Math.PI) : 1 - 0.0 * f);
    p.along = Math.min(SIT_AT, Math.max(0, p.along));
    p.gait = (a / GAIT) % 1;
  } else if (a < backAt) {
    p.along = SIT_AT;
    const b = a - OUT;
    p.sit = smooth(0, SETTLE, b) * (1 - smooth(backAt - OUT - TURN - 0.1, backAt - OUT, b));
    p.look = bump(SETTLE, SETTLE + 0.35, SETTLE + LOOK - 0.2, SETTLE + LOOK + 0.1, b);
    p.wash = bump(SETTLE + LOOK, SETTLE + LOOK + 0.25, SETTLE + LOOK + WASH - 0.25, SETTLE + LOOK + WASH, b) * (0.8 + 0.2 * Math.sin(t * 9));
    p.out = b < SETTLE + LOOK + WASH + TURN * 0.5;
  } else {
    const f = (a - backAt) / BACK;
    p.along = SIT_AT * (1 - f);
    p.out = false;
    p.gait = ((a - backAt) / (GAIT * 0.8)) % 1;
  }
  p.vis = smooth(0, 0.12, p.along);
  p.startle = p.vis > 0 ? bump(0, 0.06, 0.35, 0.5, sinceLand) * (sinceLand >= 0 ? 1 : 0) : 0;
  return p;
}

// ---------------------------------------------------------------- drawing

/** Scratch skeleton of the pose being drawn (local units). */
const S = { hx: 0, hy: 0, sx: 0, sy: 0, kx: 0, ky: 0, tx: 0, ty: 0, tilt: 0, face: 1 };

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

// The body's outline as six points, standing / sitting / arched (x, y pairs, local units): rump
// top, back, shoulder, chest, belly, thigh.
const STAND = [-0.34, -0.46, -0.03, -0.53, 0.25, -0.5, 0.32, -0.37, 0.0, -0.33, -0.36, -0.31] as const;
const SIT = [-0.24, -0.22, -0.1, -0.42, 0.08, -0.53, 0.2, -0.4, 0.16, -0.05, -0.24, -0.02] as const;
const ARCH = [-0.32, -0.5, -0.04, -0.82, 0.22, -0.52, 0.29, -0.41, 0.0, -0.52, -0.34, -0.36] as const;
const BODY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** The body: a smooth closed curve through the six points of the pose (BODY). */
function mid(i: number, k: 0 | 1): number {
  return (BODY[(i % 6) * 2 + k]! + BODY[((i + 1) % 6) * 2 + k]!) / 2;
}
function bodyShape(ctx: Ctx): void {
  M(ctx, mid(5, 0), mid(5, 1));
  for (let i = 0; i < 6; i++) Q(ctx, BODY[i * 2]!, BODY[i * 2 + 1]!, mid(i, 0), mid(i, 1));
  ctx.closePath();
}

/** Head space: local units about the head's center, facing S.face, turned by S.tilt (nose up < 0). */
function hX(lx: number, ly: number): number {
  const ang = S.tilt * S.face;
  return S.kx + S.face * lx * Math.cos(ang) - ly * Math.sin(ang);
}
function hY(lx: number, ly: number): number {
  const ang = S.tilt * S.face;
  return S.ky + S.face * lx * Math.sin(ang) + ly * Math.cos(ang);
}
function hM(ctx: Ctx, lx: number, ly: number): void {
  M(ctx, hX(lx, ly), hY(lx, ly));
}
function hL(ctx: Ctx, lx: number, ly: number): void {
  L(ctx, hX(lx, ly), hY(lx, ly));
}

/** The head (a round skull, a short muzzle, two tall ears), about its center, facing `S.face`. */
function headShape(ctx: Ctx): void {
  C(ctx, S.kx, S.ky, 0.095);
  hM(ctx, 0.05, -0.03);
  hL(ctx, 0.14, 0.01);
  hL(ctx, 0.05, 0.06);
  ctx.closePath();
  hM(ctx, -0.085, -0.03);
  hL(ctx, -0.08, -0.2);
  hL(ctx, -0.01, -0.08);
  ctx.closePath();
  hM(ctx, 0.0, -0.09);
  hL(ctx, 0.06, -0.19);
  hL(ctx, 0.08, -0.04);
  ctx.closePath();
}

/** The long tail: from its root, sweeping back and up and curling into a spiral at the tip. */
function tailPath(ctx: Ctx, a0: number, swish: number, curl: number): void {
  let x = S.tx;
  let y = S.ty;
  let ang = a0;
  let seg = 0.075;
  M(ctx, x, y);
  for (let i = 0; i < 12; i++) {
    x += Math.cos(ang) * seg;
    y += Math.sin(ang) * seg;
    L(ctx, x, y);
    ang += (i < 4 ? 0.05 + swish * 0.06 : 0.42 + (i - 4) * 0.07) * curl;
    seg *= i < 4 ? 1 : 0.84;
  }
}

/**
 * The black cat with its feet at (x, y), `size` px long, facing `dir`, in pose `p`; when it looks
 * up, it looks at (lookX, lookY) (the moon), over its shoulder if the moon is behind it.
 */
export function blackCat(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  dir: -1 | 1,
  p: Readonly<CatPose>,
  lookX: number,
  lookY: number,
  lw: number,
): void {
  if (p.vis <= 0.01) return;
  const sit = clamp01(p.sit);
  const arch = clamp01(p.startle) * (1 - sit);
  const step = Math.sin(p.gait * Math.PI * 2);
  const walking = sit < 0.05 && arch < 0.5 && p.gait > 0 ? 1 : 0;
  const bob = walking * 0.015 * Math.abs(Math.cos(p.gait * Math.PI * 2));
  pen(x, y, size, dir);
  // The skeleton: hip, shoulder, the back's apex, head.
  S.hx = lerp(-0.28, -0.14, sit);
  S.hy = lerp(-0.38, -0.13, sit) - arch * 0.06 - bob;
  S.sx = lerp(0.22, 0.12, sit);
  S.sy = lerp(-0.4, -0.42, sit) - arch * 0.04 - bob;
  S.kx = lerp(0.36, 0.17, sit) + arch * -0.02;
  S.ky = lerp(-0.52, -0.6, sit) + arch * 0.1 - bob + p.wash * 0.06;
  for (let i = 0; i < 12; i++) BODY[i] = lerp(lerp(STAND[i]!, SIT[i]!, sit), ARCH[i]!, arch) - (i % 2 ? bob : 0);
  S.tx = BODY[0]! - 0.02;
  S.ty = BODY[1]! + 0.04;
  // Its head: looking at the moon (over its shoulder if the moon is behind it), else ahead.
  S.face = 1;
  S.tilt = -0.15 * sit;
  if (p.look > 0.01) {
    const dx = (lookX - sx(S.kx, S.ky)) * dir;
    const dy = lookY - sy(S.kx, S.ky);
    if (dx < 0 && p.look > 0.5) S.face = -1;
    const up = Math.max(-1.0, Math.min(0.2, Math.atan2(dy, Math.abs(dx) + 1e-6)));
    S.tilt = lerp(S.tilt, up, p.look);
  }
  if (p.wash > 0.01) S.tilt = lerp(S.tilt, 0.35, p.wash);
  const legW = Math.max(1, size * 0.045);
  const rim = Math.max(0.4, Math.min(lw * 0.6, size * 0.03));

  // Tail behind everything, curling: back and up walking, straight up when startled, a tall
  // spiral when it sits.
  ctx.beginPath();
  const a0 = lerp(lerp(-2.6, -2.0, sit), -1.62, arch);
  tailPath(ctx, a0 + p.tail * 0.12, p.tail, lerp(1, 0.7, arch));
  stroke(ctx, NIGHT, Math.max(1, size * 0.05));

  // Legs: front pair from the shoulder, hind pair from the hip, striding when it walks.
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const ph = i === 0 ? step : -step;
    const fsw = 0.09 * ph * walking;
    // Front
    const fx = lerp(S.sx + fsw + (i ? -0.04 : 0.02), S.sx + (i ? 0.0 : 0.05), sit);
    M(ctx, S.sx, S.sy);
    if (p.wash > 0.3 && i === 0) {
      L(ctx, S.sx + 0.08, S.sy - 0.04);
      L(ctx, S.kx + 0.08, S.ky + 0.07);
    } else {
      L(ctx, lerp(S.sx + fsw * 0.5, fx, 0.5), lerp(S.sy, 0, 0.5) + 0.01);
      L(ctx, fx, 0);
    }
    // Hind: a knee forward, folded flat when it sits
    const hsw = -0.09 * ph * walking;
    M(ctx, S.hx, S.hy);
    L(ctx, lerp(S.hx + 0.05 + hsw * 0.5, S.hx + 0.14, sit), lerp(-0.2, -0.06, sit));
    L(ctx, lerp(S.hx - 0.02 + hsw + (i ? 0.04 : 0), S.hx + 0.2 + (i ? 0.03 : 0), sit), 0);
  }
  stroke(ctx, NIGHT, legW);

  // Body and head, moonlit along the top
  P.ox = -rim;
  P.oy = -rim;
  ctx.beginPath();
  bodyShape(ctx);
  headShape(ctx);
  ctx.fillStyle = RIM_SOFT;
  ctx.fill();
  P.ox = 0;
  P.oy = 0;
  ctx.beginPath();
  bodyShape(ctx);
  headShape(ctx);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  // Its neck
  ctx.beginPath();
  M(ctx, S.sx, S.sy);
  L(ctx, lerp(S.sx, S.kx, 0.8), lerp(S.sy, S.ky, 0.8));
  stroke(ctx, NIGHT, Math.max(1.2, size * 0.1));

  // Gold eyes, slit pupils (shut while it washes)
  if (p.wash < 0.5) {
    const ex = hX(0.045, -0.02);
    const ey = hY(0.045, -0.02);
    ctx.beginPath();
    C(ctx, ex, ey, 0.024);
    C(ctx, hX(-0.01, -0.022), hY(-0.01, -0.022), 0.016);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.beginPath();
    M(ctx, ex, ey - 0.02);
    L(ctx, ex, ey + 0.02);
    stroke(ctx, INK, Math.max(0.6, size * 0.012));
  }
}

/** Scratch box of `catBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box the cat covers in pose `p` (its tail held high when it is startled or sits), ink included. */
export function catBox(x: number, y: number, size: number, dir: -1 | 1, p: Readonly<CatPose>): Readonly<typeof BOX> {
  const back = 0.92 * size;
  const front = 0.56 * size;
  BOX.x0 = x - (dir > 0 ? back : front) - 1;
  BOX.x1 = x + (dir > 0 ? front : back) + 1;
  BOX.y0 = y - (p.startle > 0.01 || p.sit > 0.01 ? 1.0 : 0.9) * size - 1;
  BOX.y1 = y + Math.max(1, size * 0.03) + 1;
  return BOX;
}
