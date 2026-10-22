import type { Ctx } from "../../base/draw";
import { GOLD, INK, MOON_RIM, NIGHT, SHEEN } from "./cast/palette";

// Crows, drawn the Burton way: ragged, shaggy and long-beaked. In the sky they are faded
// silhouettes: the "M" of spread wings ending in five ragged fingers, a wedge of a tail with a
// curled centre feather and a long hooked beak, all one closed subpath so a whole flock shares a
// fill. Up close one keeps watch on the RIP stone: night black with a violet sheen, moonlight on
// its upper edges, a shaggy throat ruff, a long curved beak, a gold eye, and every few seconds a
// "caw"; now and then it takes wing (flight.ts), drawn in profile with its ragged wings beating.

/** One side of the far "M": x, y at lift 0, y change per unit of lift (wingtips up when lift > 0). */
const WING = [
  [0.2, -0.1, -0.12],
  [0.5, -0.1, -0.33],
  [0.96, -0.05, -0.6],
  [0.86, -0.0, -0.52],
  [0.92, 0.05, -0.54],
  [0.8, 0.05, -0.46],
  [0.84, 0.1, -0.46],
  [0.71, 0.09, -0.38],
  [0.72, 0.14, -0.36],
  [0.58, 0.1, -0.28],
  [0.5, 0.15, -0.24],
  [0.36, 0.1, -0.14],
  [0.24, 0.14, -0.06],
  [0.09, 0.11, 0],
] as const;

/**
 * One flying crow as a closed subpath, centered at (x, y), `s` = half its wingspan, flying
 * toward `dir` (1 right, -1 left). `lift` -1..1 sweeps the wings down and up.
 */
export function crowFly(ctx: Ctx, x: number, y: number, s: number, dir: number, lift: number): void {
  // Head and the long hooked beak, on the leading side
  ctx.moveTo(x - dir * s * 0.05, y - s * 0.07);
  ctx.lineTo(x - dir * s * 0.06, y - s * 0.14);
  ctx.lineTo(x + dir * s * 0.02, y - s * 0.18);
  ctx.lineTo(x + dir * s * 0.09, y - s * 0.15);
  ctx.lineTo(x + dir * s * 0.24, y - s * 0.09);
  ctx.lineTo(x + dir * s * 0.08, y - s * 0.07);
  // Leading-side wing out and back
  for (const [wx, wy, dy] of WING) ctx.lineTo(x + dir * s * wx, y + s * (wy + dy * lift));
  // Wedge tail with a curled centre feather
  ctx.lineTo(x + dir * s * 0.1, y + s * 0.3);
  ctx.lineTo(x + dir * s * 0.03, y + s * 0.36);
  ctx.lineTo(x + dir * s * 0.06, y + s * 0.42);
  ctx.lineTo(x, y + s * 0.4);
  ctx.lineTo(x - dir * s * 0.05, y + s * 0.34);
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
const T = { x: 0, y: 0, s: 0, dir: 1, cos: 1, sin: 0, ox: 0, oy: 0 };

function tx(lx: number, ly: number): number {
  return T.x + T.ox + T.dir * T.s * (lx * T.cos - ly * T.sin);
}
function ty(lx: number, ly: number): number {
  return T.y + T.oy + T.s * (lx * T.sin + ly * T.cos);
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
function quadTo(ctx: Ctx, ax: number, ay: number, x: number, y: number): void {
  ctx.quadraticCurveTo(tx(ax, ay), ty(ax, ay), tx(x, y), ty(x, y));
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
// the body) and lowered. A wingbeat bends smoothly through them (see wingPath). Five ragged
// primaries splay at the tip; the secondaries trail in jags.
const WING_UP = [
  [0.22, -0.12], [0.14, -0.62], [0.0, -1.1], [-0.08, -0.92], [-0.16, -1.07], [-0.22, -0.88],
  [-0.32, -1.01], [-0.37, -0.83], [-0.47, -0.92], [-0.5, -0.76], [-0.62, -0.8], [-0.55, -0.6],
  [-0.53, -0.42], [-0.42, -0.3], [-0.26, -0.06],
] as const;
const WING_MID = [
  [0.22, -0.12], [0.06, -0.26], [-0.36, -0.42], [-0.38, -0.33], [-0.48, -0.4], [-0.48, -0.31],
  [-0.6, -0.35], [-0.58, -0.26], [-0.7, -0.27], [-0.64, -0.19], [-0.74, -0.15], [-0.6, -0.1],
  [-0.54, -0.03], [-0.42, -0.06], [-0.26, -0.02],
] as const;
const WING_DOWN = [
  [0.22, -0.1], [0.15, 0.46], [0.0, 0.98], [-0.07, 0.82], [-0.15, 0.95], [-0.21, 0.78],
  [-0.3, 0.9], [-0.35, 0.73], [-0.45, 0.82], [-0.48, 0.66], [-0.6, 0.66], [-0.52, 0.48],
  [-0.48, 0.3], [-0.36, 0.16], [-0.26, 0.02],
] as const;

/** Blend of the three wing poses at `lift`: weights for up, down and mid. */
const WB = { a: 0, b: 0, c: 1 };
function weights(lift: number): void {
  const L = Math.max(-1, Math.min(1, lift));
  WB.a = (L * L + L) / 2;
  WB.b = (L * L - L) / 2;
  WB.c = 1 - L * L;
}
function wx(i: number): number {
  return WING_UP[i]![0] * WB.a + WING_DOWN[i]![0] * WB.b + WING_MID[i]![0] * WB.c;
}
function wy(i: number): number {
  return WING_UP[i]![1] * WB.a + WING_DOWN[i]![1] * WB.b + WING_MID[i]![1] * WB.c;
}

/**
 * A wing from the shoulder, seen from the side: raised (lift 1) it sweeps up and back from the
 * crow's back, lowered (-1) it hangs below, and at 0 it lies back along the body, fingered tip
 * trailing. Offset by (ox, oy) for the far wing.
 */
function wingPath(ctx: Ctx, ox: number, oy: number, lift: number): void {
  weights(lift);
  for (let i = 0; i < WING_MID.length; i++) {
    if (i === 0) moveTo(ctx, ox + wx(i), oy + wy(i));
    else lineTo(ctx, ox + wx(i), oy + wy(i));
  }
  ctx.closePath();
}

/** The far wing: offset from the near one, and how much of its beat it makes. */
const FAR_WING = [0.1, -0.05, 0.9] as const;

/** Outline points of the flying crow besides its wings (beak, head, ruff, tail, body, feet), local units. */
const HULL = [
  [0.98, -0.14], [0.92, -0.03], [0.91, 0.08], [0.84, -0.26], [0.64, -0.36], [0.44, -0.39], [0.6, 0.1], [0.44, 0.15],
  [-0.88, -0.15], [-0.94, 0.06], [-0.84, 0.21], [0.0, 0.28], [-0.42, 0.17], [-0.17, 0.47], [0.0, 0.48],
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
  for (let w = 0; w < 2; w++) {
    const ox = w ? FAR_WING[0] : 0;
    const oy = w ? FAR_WING[1] : 0;
    weights(lift * (w ? FAR_WING[2] : 1));
    for (let i = 0; i < WING_MID.length; i++) grow(ox + wx(i), oy + wy(i));
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
  T.ox = 0;
  T.oy = 0;
}

function stroke(ctx: Ctx, color: string, w: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function fillInk(ctx: Ctx, fill: string, w: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, INK, w);
}

/** The body, the ruff under the throat and the head, as one shape. */
function bodyPath(ctx: Ctx, caw: number): void {
  moveTo(ctx, 0.42, -0.04);
  // The shaggy throat ruff hanging in points under the beak.
  lineTo(ctx, 0.58, 0.0);
  lineTo(ctx, 0.5, 0.04);
  lineTo(ctx, 0.56, 0.1 + caw * 0.02);
  lineTo(ctx, 0.44, 0.09);
  lineTo(ctx, 0.46, 0.14);
  lineTo(ctx, 0.34, 0.14);
  curveTo(ctx, 0.2, 0.27, 0.06, 0.27, 0.0, 0.27);
  curveTo(ctx, -0.24, 0.26, -0.42, 0.16, -0.42, 0.06);
  curveTo(ctx, -0.42, -0.08, -0.2, -0.2, 0.04, -0.2);
  curveTo(ctx, 0.2, -0.22, 0.24, -0.34, 0.42, -0.36);
  curveTo(ctx, 0.6, -0.37, 0.66, -0.24, 0.62, -0.14);
  ctx.closePath();
}

/** Wedge tail with a curled centre feather. */
function tailPath(ctx: Ctx): void {
  moveTo(ctx, -0.3, -0.03);
  lineTo(ctx, -0.84, -0.14);
  lineTo(ctx, -0.78, -0.05);
  lineTo(ctx, -0.9, 0.0);
  quadTo(ctx, -0.94, 0.08, -0.86, 0.09);
  quadTo(ctx, -0.82, 0.06, -0.86, 0.04);
  lineTo(ctx, -0.8, 0.08);
  lineTo(ctx, -0.84, 0.2);
  lineTo(ctx, -0.3, 0.14);
  ctx.closePath();
}

/**
 * The churchyard crow flying, up close: an ink-outlined Burton crow in profile, centered at
 * (x, y), `s` = its body scale (about 1.9 s from tail to beak, wings up to 1.1 s above and below).
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
  const rim = Math.max(1, lw * 0.9);

  // Far wing behind the body, a little ahead of the near one
  ctx.beginPath();
  wingPath(ctx, FAR_WING[0], FAR_WING[1], lift * FAR_WING[2]);
  fillInk(ctx, NIGHT, thin);

  ctx.beginPath();
  tailPath(ctx);
  fillInk(ctx, NIGHT, lw);

  // Feet let down for take-off and landing, toes curled
  if (legs > 0.05) {
    const d = 0.26 * legs;
    ctx.beginPath();
    moveTo(ctx, -0.04, 0.16);
    lineTo(ctx, -0.04 - d * 0.45, 0.16 + d);
    lineTo(ctx, -0.04 - d * 0.2, 0.16 + d * 1.1);
    moveTo(ctx, 0.07, 0.16);
    lineTo(ctx, 0.07 - d * 0.35, 0.16 + d * 1.05);
    lineTo(ctx, 0.07 - d * 0.1, 0.16 + d * 1.15);
    stroke(ctx, INK, Math.max(1, lw * 0.9));
  }

  // Body, ruff and head, lit along the top by the moon
  T.ox = -rim;
  T.oy = -rim;
  ctx.beginPath();
  bodyPath(ctx, caw);
  ctx.fillStyle = MOON_RIM;
  ctx.fill();
  T.ox = 0;
  T.oy = 0;
  ctx.beginPath();
  bodyPath(ctx, caw);
  fillInk(ctx, NIGHT, lw);

  // Near wing, its sheen along the leading edge
  ctx.beginPath();
  wingPath(ctx, 0, 0, lift);
  fillInk(ctx, NIGHT, thin);
  weights(lift);
  ctx.beginPath();
  moveTo(ctx, wx(0), wy(0));
  lineTo(ctx, wx(1), wy(1));
  lineTo(ctx, wx(2) * 0.6 + wx(1) * 0.4, wy(2) * 0.6 + wy(1) * 0.4);
  stroke(ctx, SHEEN, Math.max(0.8, lw * 0.6));

  // The long curved beak (gaping when it caws), the gold eye
  const gape = caw * 0.12;
  ctx.beginPath();
  moveTo(ctx, 0.58, -0.25);
  quadTo(ctx, 0.84, -0.27, 0.98, -0.12 - gape * 0.3);
  quadTo(ctx, 0.84, -0.18, 0.62, -0.12);
  ctx.closePath();
  moveTo(ctx, 0.62, -0.12);
  quadTo(ctx, 0.78, -0.1 + gape * 0.5, 0.9, -0.05 + gape);
  lineTo(ctx, 0.58, -0.05);
  ctx.closePath();
  fillInk(ctx, SHEEN, thin);
  ctx.beginPath();
  disc(ctx, 0.5, -0.22, 0.07);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.beginPath();
  disc(ctx, 0.52, -0.215, 0.032);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** The perched crow's hunched body with its ragged belly, local units (feet at the origin, facing right). */
function perchBody(ctx: Ctx): void {
  moveTo(ctx, 0.17, -0.67);
  quadTo(ctx, 0.3, -0.56, 0.22, -0.4);
  lineTo(ctx, 0.15, -0.31);
  lineTo(ctx, 0.17, -0.25);
  lineTo(ctx, 0.08, -0.27);
  lineTo(ctx, 0.07, -0.2);
  lineTo(ctx, -0.02, -0.25);
  lineTo(ctx, -0.06, -0.19);
  lineTo(ctx, -0.12, -0.26);
  quadTo(ctx, -0.26, -0.3, -0.27, -0.42);
  quadTo(ctx, -0.2, -0.62, 0.17, -0.67);
  ctx.closePath();
}

/** The perched crow's head (a little shaggy at the crown), local units about its middle. */
function perchHead(ctx: Ctx): void {
  moveTo(ctx, 0.17, 0);
  curveTo(ctx, 0.17, 0.1, 0.09, 0.17, 0, 0.17);
  curveTo(ctx, -0.1, 0.17, -0.17, 0.09, -0.17, -0.01);
  lineTo(ctx, -0.22, -0.1);
  lineTo(ctx, -0.14, -0.1);
  lineTo(ctx, -0.17, -0.18);
  lineTo(ctx, -0.07, -0.14);
  lineTo(ctx, -0.07, -0.2);
  lineTo(ctx, 0.0, -0.17);
  curveTo(ctx, 0.1, -0.17, 0.17, -0.1, 0.17, 0);
  ctx.closePath();
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
  const d = dir < 0 ? -1 : 1;
  const lean = caw * 0.12;
  const hx = 0.2 + lean * 0.9;
  const hy = -(0.73 - lean * 0.6) + look * 0.02;
  const thin = Math.max(1, lw * 0.8);
  const rim = Math.max(1, lw * 0.9);
  setTransform(x, y, s, d, 0);

  // Legs and long toes gripping the perch
  ctx.beginPath();
  moveTo(ctx, -0.06, -0.28);
  lineTo(ctx, -0.04, 0);
  moveTo(ctx, 0.06, -0.28);
  lineTo(ctx, 0.08, 0);
  moveTo(ctx, -0.14, 0);
  lineTo(ctx, 0.22, 0);
  stroke(ctx, INK, Math.max(1, lw * 0.9));

  // A ragged wedge tail with a curled centre feather, hanging down behind
  ctx.beginPath();
  moveTo(ctx, -0.16, -0.42);
  lineTo(ctx, -0.5, -0.16);
  lineTo(ctx, -0.45, -0.12);
  lineTo(ctx, -0.55, -0.05);
  quadTo(ctx, -0.55, 0.0, -0.5, -0.02);
  quadTo(ctx, -0.49, -0.06, -0.46, -0.03);
  lineTo(ctx, -0.4, -0.03);
  lineTo(ctx, -0.06, -0.3);
  ctx.closePath();
  fillInk(ctx, NIGHT, lw);

  // The hunched body, moonlit along its back
  T.ox = -rim;
  T.oy = -rim;
  ctx.beginPath();
  perchBody(ctx);
  ctx.fillStyle = MOON_RIM;
  ctx.fill();
  T.ox = 0;
  T.oy = 0;
  ctx.beginPath();
  perchBody(ctx);
  fillInk(ctx, NIGHT, lw);
  // Folded wing, its ragged primaries crossing over the tail, a violet sheen in its feathers
  ctx.beginPath();
  moveTo(ctx, 0.16, -0.56);
  quadTo(ctx, -0.12, -0.63, -0.42, -0.22);
  lineTo(ctx, -0.33, -0.25);
  lineTo(ctx, -0.37, -0.16);
  lineTo(ctx, -0.27, -0.23);
  lineTo(ctx, -0.28, -0.15);
  lineTo(ctx, -0.19, -0.24);
  quadTo(ctx, -0.02, -0.32, 0.16, -0.56);
  ctx.closePath();
  fillInk(ctx, NIGHT, thin);
  ctx.beginPath();
  moveTo(ctx, 0.1, -0.56);
  quadTo(ctx, -0.1, -0.58, -0.3, -0.32);
  moveTo(ctx, 0.04, -0.47);
  quadTo(ctx, -0.1, -0.47, -0.22, -0.31);
  stroke(ctx, SHEEN, Math.max(0.8, lw * 0.5));

  // The shaggy throat ruff
  ctx.beginPath();
  moveTo(ctx, hx - 0.08, hy + 0.08);
  lineTo(ctx, hx + 0.1, hy + 0.12);
  lineTo(ctx, hx + 0.03, hy + 0.16);
  lineTo(ctx, hx + 0.08, hy + 0.22);
  lineTo(ctx, hx - 0.02, hy + 0.2);
  lineTo(ctx, hx - 0.01, hy + 0.27);
  lineTo(ctx, hx - 0.12, hy + 0.2);
  ctx.closePath();
  fillInk(ctx, NIGHT, thin);

  // The long curved beak (upper and lower, gaping when it caws)
  const bx = hx + 0.12;
  const gape = caw * 0.09;
  ctx.beginPath();
  moveTo(ctx, bx - 0.02, hy - 0.07);
  quadTo(ctx, bx + 0.2, hy - 0.09, bx + 0.27, hy + 0.03 - gape * 0.3);
  quadTo(ctx, bx + 0.18, hy - 0.01, bx, hy + 0.02);
  ctx.closePath();
  moveTo(ctx, bx, hy + 0.01);
  quadTo(ctx, bx + 0.14, hy + 0.02 + gape * 0.6, bx + 0.24, hy + 0.05 + gape);
  lineTo(ctx, bx - 0.01, hy + 0.07);
  ctx.closePath();
  fillInk(ctx, SHEEN, thin);
  // The head, moonlit, a little shaggy, and its gold eye
  T.x = x + d * s * hx - rim;
  T.y = y + s * hy - rim;
  ctx.beginPath();
  perchHead(ctx);
  ctx.fillStyle = MOON_RIM;
  ctx.fill();
  T.x += rim;
  T.y += rim;
  ctx.beginPath();
  perchHead(ctx);
  fillInk(ctx, NIGHT, lw);
  ctx.beginPath();
  disc(ctx, 0.06, -0.04, 0.06);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.beginPath();
  disc(ctx, 0.075, -0.035, 0.026);
  ctx.fillStyle = INK;
  ctx.fill();
}
