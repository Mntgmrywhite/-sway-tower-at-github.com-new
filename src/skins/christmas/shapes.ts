import { alpha, circle, type Ctx } from "../../base/draw";
import { INK, LAMP_CORE, SNOW, SNOW_SHADE } from "./colors";

// Path builders and small drawing routines shared by the Christmas layers, in the card's flat,
// geometric print: no soft gradients; far things without outlines, near things drawn round with
// a fine ink line. Path builders only add subpaths (no beginPath), so callers can batch several
// shapes.

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the ink line

/** The ink line round near things is this fraction of the street's fine line width. */
export const INKW = 0.55;

/** Stroke the current path as the ink line round a near shape, `w` wide (in the current frame's units). */
export function inked(ctx: Ctx, w: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

/** A four-point sparkle (concave diamond) as its own subpath. */
export function sparklePath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

/** Points of an atomic starburst: long on the axes, short on the diagonals, each this wide at its foot. */
const BURST_POINTS = 8;
const BURST_FOOT = 0.13;

/** A 1950s atomic starburst of radius r as its own subpath: eight needle points round a small hub. */
export function starburstPath(ctx: Ctx, x: number, y: number, r: number): void {
  const foot = r * BURST_FOOT;
  for (let i = 0; i < BURST_POINTS * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / BURST_POINTS;
    // Even steps are the points' tips (long, then short), odd steps the hub between them.
    const rr = i % 2 ? foot : i % 4 ? r * 0.5 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * A flat slab of snow lying on a ledge from x0 to x1 at y, `h` deep, with rounded ends that
 * overhang a little, as its own subpath.
 */
export function snowCap(ctx: Ctx, x0: number, x1: number, y: number, h: number): void {
  const o = Math.min(h * 0.5, (x1 - x0) * 0.08);
  const r = Math.min(h * 0.7, (x1 - x0) * 0.25);
  const l = x0 - o;
  const rt = x1 + o;
  ctx.moveTo(l, y + h * 0.25);
  ctx.lineTo(l, y - h + r);
  ctx.quadraticCurveTo(l, y - h, l + r, y - h);
  ctx.lineTo(rt - r, y - h);
  ctx.quadraticCurveTo(rt, y - h, rt, y - h + r);
  ctx.lineTo(rt, y + h * 0.25);
  ctx.closePath();
}

/**
 * Corners of a puff: a small round shape cut as an octagon. Used for everything round and only a
 * few pixels across (dots, berries, eyes, knobs, hooves): at that size it reads as round, and it
 * fills far more cheaply than an arc.
 */
const PUFF = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4 + Math.PI / 8), Math.sin((i * Math.PI) / 4 + Math.PI / 8)] as const);

/** A small round puff of radius r at (x, y) as its own subpath (smoke, a ball, a little round window). */
export function puff(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 8; i++) {
    const [cx, cy] = PUFF[i]!;
    if (i === 0) ctx.moveTo(x + cx * r, y + cy * r);
    else ctx.lineTo(x + cx * r, y + cy * r);
  }
  ctx.closePath();
}

/** A small oval puff of radii rx, ry at (x, y), turned `rot` radians, as its own subpath (boots, mouths, leaves, shadows). */
export function puffOval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  for (let i = 0; i < 8; i++) {
    const [px, py] = PUFF[i]!;
    const ax = px * rx;
    const ay = py * ry;
    if (i === 0) ctx.moveTo(x + ax * c - ay * sn, y + ax * sn + ay * c);
    else ctx.lineTo(x + ax * c - ay * sn, y + ax * sn + ay * c);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- firs

/** The card's three stylized firs: a tall cone, a stack of cones, a round lollipop tree. */
export const CONE = 0;
export const STACKED = 1;
export const LOLLIPOP = 2;
/** Half of a fir's widest part, as a fraction of its height (the lollipop's round crown). */
export const FIR_HALF = 0.31;

/** One fir of height h standing at (x, y) (canvas y, down), as its own subpath(s); far off, without its trunk. */
export function firPath(ctx: Ctx, x: number, y: number, h: number, kind: number, trunk = true): void {
  const w = h * 0.42;
  if (kind === LOLLIPOP) {
    // A round crown on a thin trunk.
    const r = h * 0.3;
    ctx.rect(x - h * 0.03, y - h * 0.45, h * 0.06, h * 0.45);
    ctx.moveTo(x + r, y - h + r);
    ctx.arc(x, y - h + r, r, 0, TAU);
    return;
  }
  if (trunk) ctx.rect(x - h * 0.04, y - h * 0.14, h * 0.08, h * 0.14);
  if (kind === CONE) {
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w / 2, y - h * 0.12);
    ctx.lineTo(x - w / 2, y - h * 0.12);
    ctx.closePath();
    return;
  }
  // Stacked cones, each tier a little wider, their hems swept up at the corners like a pagoda.
  for (let k = 0; k < 3; k++) {
    const top = y - h + k * h * 0.26;
    const tw = w * (0.62 + k * 0.22);
    const hem = top + h * 0.4;
    ctx.moveTo(x, top);
    ctx.lineTo(x + tw / 2, hem);
    ctx.quadraticCurveTo(x, hem - h * 0.07, x - tw / 2, hem);
    ctx.closePath();
  }
}

/** The snow on a fir of height h standing at (x, y): a cap over its tip, as its own subpath. */
export function firSnowPath(ctx: Ctx, x: number, y: number, h: number, kind: number): void {
  const w = h * 0.42;
  if (kind === LOLLIPOP) {
    const r = h * 0.3;
    const cy = y - h + r;
    ctx.moveTo(x + Math.cos(-0.75) * r, cy + Math.sin(-0.75) * r);
    ctx.arc(x, cy, r, -0.75, -Math.PI + 0.75, true);
    ctx.closePath();
    return;
  }
  // The top tier's tip: a cone's, or the narrower top cone of a stack.
  const half = kind === CONE ? (w / 2) * (0.3 / 0.88) : w * 0.31 * (0.16 / 0.4);
  const down = kind === CONE ? 0.3 : 0.16;
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + half, y - h + h * down);
  ctx.lineTo(x, y - h + h * down * 0.75);
  ctx.lineTo(x - half, y - h + h * down);
  ctx.closePath();
}

// ---------------------------------------------------------------- light

/** Candlelight round a lamp, a lantern or a window: two flat discs, the inner one doubling it. */
const GLOW = alpha(LAMP_CORE, 0.13);

/** A warm pool of light of radius r centered at (x, y), at `strength` (0..1). */
export function glow(ctx: Ctx, x: number, y: number, r: number, strength = 1): void {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * strength;
  ctx.fillStyle = GLOW;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.58);
  ctx.fill();
  ctx.globalAlpha = a;
}

// ---------------------------------------------------------------- drifts

/**
 * A snow drift planted on the street: a low flat hump `w` wide and `h` tall with its feet at y,
 * snow white over a band of aqua shade along its foot, so a prop stands in the snow.
 */
export function drift(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.42, y - h, x - w * 0.1, y - h);
  ctx.quadraticCurveTo(x + w * 0.38, y - h, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.44, y - h * 0.18);
  ctx.lineTo(x + w * 0.46, y - h * 0.18);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
  ctx.fillStyle = SNOW_SHADE;
  ctx.fill();
}
