import { circle, ink, outlined, type Ctx } from "../../base/draw";
import { INK } from "./common";

// Crows. In the sky they are faded silhouettes: the classic "M" of spread wings with fingered
// wingtips, a fanned tail below and a small head with its beak turned the way it flies, all as
// one closed subpath so a whole flock shares one fill. Up close one perches on a headstone as
// an ink-outlined cartoon: glossy blue-black, a pale eye, and every few seconds a "caw"; now
// and then it takes wing (flight.ts), drawn in profile with its wings beating.

const CROW_BODY = "#2c2546";
const CROW_SHEEN = "#4c4377";
const CROW_BEAK = "#59506f";
const CROW_EYE = "#fff3d2";

/** Scratch for one side of the "M", mirrored for the other side. */
const WING = [
  // x, y at lift 0, y change per unit of lift (wingtips up when lift > 0)
  [0.24, -0.11, -0.16],
  [0.55, -0.09, -0.36],
  [0.97, -0.04, -0.62],
  [0.83, 0.0, -0.5],
  [0.89, 0.06, -0.52],
  [0.74, 0.05, -0.42],
  [0.76, 0.11, -0.42],
  [0.48, 0.09, -0.25],
  [0.2, 0.09, -0.06],
  [0.09, 0.11, 0],
] as const;

/**
 * One flying crow as a closed subpath, centered at (x, y), `s` = half its wingspan, flying
 * toward `dir` (1 right, -1 left). `lift` -1..1 sweeps the wings down and up.
 */
export function crowFly(ctx: Ctx, x: number, y: number, s: number, dir: number, lift: number): void {
  // Head and beak, on the leading side
  ctx.moveTo(x - dir * s * 0.05, y - s * 0.07);
  ctx.lineTo(x - dir * s * 0.06, y - s * 0.13);
  ctx.lineTo(x, y - s * 0.17);
  ctx.lineTo(x + dir * s * 0.07, y - s * 0.15);
  ctx.lineTo(x + dir * s * 0.18, y - s * 0.11);
  ctx.lineTo(x + dir * s * 0.07, y - s * 0.085);
  // Leading-side wing out and back
  for (const [wx, wy, dy] of WING) ctx.lineTo(x + dir * s * wx, y + s * (wy + dy * lift));
  // Fanned tail
  ctx.lineTo(x + dir * s * 0.12, y + s * 0.3);
  ctx.lineTo(x, y + s * 0.34);
  ctx.lineTo(x - dir * s * 0.12, y + s * 0.3);
  // Trailing-side wing, mirrored, from its root out to the tip and back to the head
  for (let i = WING.length - 1; i >= 0; i--) {
    const [wx, wy, dy] = WING[i]!;
    ctx.lineTo(x - dir * s * wx, y + s * (wy + dy * lift));
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- the near crow in flight

/** Scratch transform for `crowFlying`: local (facing right, y down, in body scales) to screen. */
const T = { x: 0, y: 0, s: 0, dir: 1, cos: 1, sin: 0 };

function tx(lx: number, ly: number): number {
  return T.x + T.dir * T.s * (lx * T.cos - ly * T.sin);
}
function ty(lx: number, ly: number): number {
  return T.y + T.s * (lx * T.sin + ly * T.cos);
}
function moveTo(ctx: Ctx, lx: number, ly: number): void {
  ctx.moveTo(tx(lx, ly), ty(lx, ly));
}
function lineTo(ctx: Ctx, lx: number, ly: number): void {
  ctx.lineTo(tx(lx, ly), ty(lx, ly));
}
function curveTo(ctx: Ctx, ax: number, ay: number, bx: number, by: number, x: number, y: number): void {
  ctx.bezierCurveTo(tx(ax, ay), ty(ax, ay), tx(bx, by), ty(bx, by), tx(x, y), ty(x, y));
}
/** A circle in local space (an upright ellipse on screen while it turns). */
function disc(ctx: Ctx, lx: number, ly: number, r: number): void {
  const x = tx(lx, ly);
  const y = ty(lx, ly);
  const rx = Math.max(0.01, r * T.s * Math.abs(T.dir));
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, r * T.s, 0, 0, Math.PI * 2);
}

// The wing's outline, root to tip and back, in three poses: raised, gliding (laid back along
// the body) and lowered. A wingbeat bends smoothly through them (see wingPath).
const WING_UP = [
  [0.22, -0.12], [0.16, -0.6], [-0.02, -1.1], [-0.14, -0.94], [-0.26, -1.07], [-0.35, -0.89],
  [-0.5, -0.98], [-0.56, -0.8], [-0.66, -0.78], [-0.52, -0.4], [-0.26, -0.06],
] as const;
const WING_MID = [
  [0.22, -0.12], [0.06, -0.25], [-0.4, -0.4], [-0.44, -0.3], [-0.56, -0.34], [-0.56, -0.25],
  [-0.68, -0.25], [-0.62, -0.17], [-0.7, -0.12], [-0.46, -0.04], [-0.26, -0.02],
] as const;
const WING_DOWN = [
  [0.22, -0.1], [0.15, 0.46], [-0.02, 0.98], [-0.13, 0.82], [-0.25, 0.94], [-0.33, 0.76],
  [-0.47, 0.84], [-0.52, 0.66], [-0.62, 0.62], [-0.48, 0.3], [-0.26, 0.02],
] as const;

/**
 * A wing from the shoulder, seen from the side: raised (lift 1) it sweeps up and back from the
 * crow's back, lowered (-1) it hangs below, and at 0 it lies back along the body, fingered tip
 * trailing. Offset by (ox, oy) for the far wing.
 */
function wingPath(ctx: Ctx, ox: number, oy: number, lift: number): void {
  const L = Math.max(-1, Math.min(1, lift));
  const a = (L * L + L) / 2;
  const b = (L * L - L) / 2;
  const c = 1 - L * L;
  for (let i = 0; i < WING_MID.length; i++) {
    const x = WING_UP[i]![0] * a + WING_DOWN[i]![0] * b + WING_MID[i]![0] * c;
    const y = WING_UP[i]![1] * a + WING_DOWN[i]![1] * b + WING_MID[i]![1] * c;
    if (i === 0) moveTo(ctx, ox + x, oy + y);
    else lineTo(ctx, ox + x, oy + y);
  }
  ctx.closePath();
}

/** The far wing: offset from the near one, and how much of its beat it makes. */
const FAR_WING = [0.1, -0.05, 0.9] as const;

/** Outline points of the flying crow besides its wings (beak, head, tail, body, feet), local units. */
const HULL = [
  [0.98, -0.2], [0.9, 0.06], [0.44, -0.39], [0.44, 0.07], [-0.86, -0.12], [-0.9, 0.1], [-0.82, 0.2],
  [0.0, 0.26], [-0.42, 0.16], [-0.17, 0.42], [0.0, 0.42],
] as const;

/** Scratch box of `flyingBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

function grow(lx: number, ly: number): void {
  const x = tx(lx, ly);
  const y = ty(lx, ly);
  if (x < BOX.x0) BOX.x0 = x;
  if (x > BOX.x1) BOX.x1 = x;
  if (y < BOX.y0) BOX.y0 = y;
  if (y > BOX.y1) BOX.y1 = y;
}

/** The screen box `crowFlying` would cover with these arguments (before its ink outline). */
export function flyingBox(x: number, y: number, s: number, dir: number, lift: number, pitch: number): typeof BOX {
  setTransform(x, y, s, dir, pitch);
  BOX.x0 = BOX.y0 = Infinity;
  BOX.x1 = BOX.y1 = -Infinity;
  for (const [lx, ly] of HULL) grow(lx, ly);
  const L = Math.max(-1, Math.min(1, lift));
  for (const [ox, oy, k] of [[0, 0, 1], FAR_WING] as const) {
    const l = L * k;
    const a = (l * l + l) / 2;
    const b = (l * l - l) / 2;
    const c = 1 - l * l;
    for (let i = 0; i < WING_MID.length; i++) {
      grow(
        ox + WING_UP[i]![0] * a + WING_DOWN[i]![0] * b + WING_MID[i]![0] * c,
        oy + WING_UP[i]![1] * a + WING_DOWN[i]![1] * b + WING_MID[i]![1] * c,
      );
    }
  }
  return BOX;
}

function setTransform(x: number, y: number, s: number, dir: number, pitch: number): void {
  T.x = x;
  T.y = y;
  T.s = s;
  T.dir = Math.abs(dir) < 0.06 ? (dir < 0 ? -0.06 : 0.06) : dir;
  T.cos = Math.cos(pitch);
  T.sin = Math.sin(pitch);
}

/**
 * The churchyard crow flying, up close: an ink-outlined cartoon in profile, centered at (x, y),
 * `s` = its body scale (about 1.9 s from tail to beak, wings up to 1.1 s above and below).
 * `dir` -1..1 faces it left or right (in between it is turning, squeezed sideways); `lift` -1..1
 * beats the wings; `pitch` tilts it nose up (< 0) or down; `legs` 0..1 lets its feet down; `caw`
 * 0..1 opens the beak.
 */
export function crowFlying(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  dir: number,
  lift: number,
  pitch: number,
  legs: number,
  caw: number,
  lw: number,
): void {
  setTransform(x, y, s, dir, pitch);
  const thin = Math.max(1, lw * 0.8);

  // Far wing behind the body, a little ahead of the near one
  ctx.beginPath();
  wingPath(ctx, FAR_WING[0], FAR_WING[1], lift * FAR_WING[2]);
  outlined(ctx, CROW_BODY, thin, INK);

  // Fanned tail with a notch
  ctx.beginPath();
  moveTo(ctx, -0.3, -0.02);
  lineTo(ctx, -0.86, -0.12);
  lineTo(ctx, -0.8, 0.0);
  lineTo(ctx, -0.9, 0.1);
  lineTo(ctx, -0.82, 0.2);
  lineTo(ctx, -0.3, 0.14);
  ctx.closePath();
  outlined(ctx, CROW_BODY, lw, INK);

  // Feet let down for take-off and landing
  if (legs > 0.05) {
    const d = 0.26 * legs;
    ctx.beginPath();
    moveTo(ctx, -0.04, 0.16);
    lineTo(ctx, -0.04 - d * 0.45, 0.16 + d);
    moveTo(ctx, 0.07, 0.16);
    lineTo(ctx, 0.07 - d * 0.35, 0.16 + d * 1.05);
    ink(ctx, Math.max(1, lw * 0.9), INK);
  }

  // Body: a long oval
  ctx.beginPath();
  moveTo(ctx, 0.42, -0.02);
  curveTo(ctx, 0.42, 0.16, 0.22, 0.26, 0.0, 0.26);
  curveTo(ctx, -0.24, 0.26, -0.42, 0.16, -0.42, 0.06);
  curveTo(ctx, -0.42, -0.08, -0.2, -0.2, 0.04, -0.2);
  curveTo(ctx, 0.26, -0.2, 0.42, -0.16, 0.42, -0.02);
  ctx.closePath();
  outlined(ctx, CROW_BODY, lw, INK);

  // Near wing, glossy
  ctx.beginPath();
  wingPath(ctx, 0, 0, lift);
  outlined(ctx, CROW_SHEEN, thin, INK);

  // Head, beak (gaping when it caws), eye
  const gape = caw * 0.12;
  ctx.beginPath();
  moveTo(ctx, 0.6, -0.24);
  lineTo(ctx, 0.98, -0.15 - gape * 0.3);
  lineTo(ctx, 0.62, -0.1);
  ctx.closePath();
  moveTo(ctx, 0.62, -0.11);
  lineTo(ctx, 0.9, -0.08 + gape);
  lineTo(ctx, 0.58, -0.03);
  ctx.closePath();
  outlined(ctx, CROW_BEAK, thin, INK);
  ctx.beginPath();
  disc(ctx, 0.44, -0.16, 0.23);
  outlined(ctx, CROW_BODY, lw, INK);
  ctx.beginPath();
  disc(ctx, 0.52, -0.21, 0.075);
  ctx.fillStyle = CROW_EYE;
  ctx.fill();
  ctx.beginPath();
  disc(ctx, 0.54, -0.205, 0.037);
  ctx.fillStyle = INK;
  ctx.fill();
}

/**
 * A crow perched at (x, y) (its feet), facing `dir`, `s` tall. `caw` 0..1 opens the beak and
 * leans it forward; `look` -1..1 tips its head.
 */
export function crowPerched(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  dir: number,
  caw: number,
  look: number,
  lw: number,
): void {
  const lean = caw * 0.12;
  const hx = x + dir * s * (0.2 + lean * 0.9);
  const hy = y - s * (0.78 - lean * 0.6) + look * s * 0.02;

  // Legs and toes gripping the perch
  ctx.beginPath();
  ctx.moveTo(x - dir * s * 0.06, y - s * 0.28);
  ctx.lineTo(x - dir * s * 0.04, y);
  ctx.moveTo(x + dir * s * 0.06, y - s * 0.28);
  ctx.lineTo(x + dir * s * 0.08, y);
  ctx.moveTo(x - dir * s * 0.12, y);
  ctx.lineTo(x + dir * s * 0.2, y);
  ink(ctx, Math.max(1, lw * 0.9), INK);

  // Tail, then the body as one teardrop leaning forward
  ctx.beginPath();
  ctx.moveTo(x - dir * s * 0.18, y - s * 0.42);
  ctx.lineTo(x - dir * s * 0.55, y - s * 0.12);
  ctx.lineTo(x - dir * s * 0.46, y - s * 0.04);
  ctx.lineTo(x - dir * s * 0.08, y - s * 0.3);
  ctx.closePath();
  outlined(ctx, CROW_BODY, lw, INK);
  ctx.beginPath();
  ctx.ellipse(x + dir * s * 0.02, y - s * 0.45, s * 0.3, s * 0.21, dir * (-0.5 - lean), 0, Math.PI * 2);
  outlined(ctx, CROW_BODY, lw, INK);
  // Folded wing with a glossy sheen along its top
  ctx.beginPath();
  ctx.moveTo(x + dir * s * 0.16, y - s * 0.55);
  ctx.quadraticCurveTo(x - dir * s * 0.12, y - s * 0.62, x - dir * s * 0.4, y - s * 0.2);
  ctx.quadraticCurveTo(x - dir * s * 0.05, y - s * 0.32, x + dir * s * 0.16, y - s * 0.55);
  ctx.closePath();
  outlined(ctx, CROW_SHEEN, Math.max(1, lw * 0.8), INK);

  // Head, beak (upper and lower, gaping when it caws), eye
  const bx = hx + dir * s * 0.14;
  const gape = caw * s * 0.09;
  ctx.beginPath();
  ctx.moveTo(bx, hy - s * 0.06);
  ctx.lineTo(bx + dir * s * 0.26, hy - s * 0.01 - gape * 0.3);
  ctx.lineTo(bx, hy + s * 0.02);
  ctx.closePath();
  ctx.moveTo(bx, hy + s * 0.01);
  ctx.lineTo(bx + dir * s * 0.2, hy + s * 0.03 + gape);
  ctx.lineTo(bx - dir * s * 0.01, hy + s * 0.07);
  ctx.closePath();
  outlined(ctx, CROW_BEAK, Math.max(1, lw * 0.8), INK);
  ctx.beginPath();
  circle(ctx, hx, hy, s * 0.17);
  outlined(ctx, CROW_BODY, lw, INK);
  ctx.beginPath();
  circle(ctx, hx + dir * s * 0.06, hy - s * 0.04, s * 0.055);
  ctx.fillStyle = CROW_EYE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx + dir * s * 0.075, hy - s * 0.035, s * 0.028);
  ctx.fillStyle = INK;
  ctx.fill();
}
