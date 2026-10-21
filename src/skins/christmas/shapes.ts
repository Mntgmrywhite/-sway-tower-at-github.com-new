import { alpha, circle, type Ctx } from "../../base/draw";
import { LAMP_CORE, SNOW, SNOW_SHADE } from "./colors";

// Path builders and small drawing routines shared by the Christmas layers, in the card's flat,
// geometric print: no soft gradients, no outlines. Path builders only add subpaths (no
// beginPath), so callers can batch several shapes.

export const TAU = Math.PI * 2;

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
