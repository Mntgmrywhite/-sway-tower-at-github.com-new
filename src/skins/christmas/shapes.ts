import { alpha, ink, type Ctx } from "../../base/draw";
import { INK, LAMP, LAMP_CORE, SNOW, SNOW_SHADE } from "./colors";

// Path builders and small drawing routines shared by the Christmas layers.
// Path builders only add subpaths (no beginPath), so callers can batch several shapes.

export const TAU = Math.PI * 2;

/** A five-point star as its own subpath. */
export function starPath(ctx: Ctx, x: number, y: number, r: number, inner = 0.42): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
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

/** A quadrilateral as its own subpath. */
export function quad(ctx: Ctx, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): void {
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
}

/**
 * A soft snow cap lying on a ledge from x0 to x1 at y: a flat underside with a lumpy top
 * `h` high and a little overhang at both ends, as its own subpath.
 */
export function snowCap(ctx: Ctx, x0: number, x1: number, y: number, h: number): void {
  const w = x1 - x0;
  const o = Math.min(h * 0.5, w * 0.08);
  ctx.moveTo(x0 - o, y + h * 0.25);
  ctx.quadraticCurveTo(x0 - o, y - h * 0.7, x0 + w * 0.2, y - h * 0.85);
  ctx.quadraticCurveTo(x0 + w * 0.45, y - h * 1.15, x0 + w * 0.62, y - h * 0.8);
  ctx.quadraticCurveTo(x0 + w * 0.85, y - h * 0.95, x1 + o, y + h * 0.15);
  ctx.quadraticCurveTo(x0 + w * 0.5, y + h * 0.45, x0 - o, y + h * 0.25);
  ctx.closePath();
}

/** Top edge of a snow drift from its left foot to its right foot: two soft, uneven humps. */
function moundTop(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.bezierCurveTo(x - w * 0.4, y - h * 0.75, x - w * 0.3, y - h * 1.05, x - w * 0.1, y - h);
  ctx.bezierCurveTo(x + w * 0.05, y - h * 0.95, x + w * 0.12, y - h * 0.78, x + w * 0.22, y - h * 0.8);
  ctx.bezierCurveTo(x + w * 0.34, y - h * 0.82, x + w * 0.42, y - h * 0.5, x + w / 2, y);
}

/**
 * A snow drift planted on the street: an uneven hump `w` wide and `h` tall with its feet at
 * y. Lit snow with a flat blue shade along its foot, inked along its top edge only, so it reads
 * as part of the snow rather than a sticker on it.
 */
export function mound(ctx: Ctx, x: number, y: number, w: number, h: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  moundTop(ctx, x, y, w, h);
  ctx.quadraticCurveTo(x, y + h * 0.6, x - w / 2, y);
  ctx.closePath();
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.42, y - h * 0.12);
  ctx.quadraticCurveTo(x, y - h * 0.4, x + w * 0.46, y - h * 0.08);
  ctx.quadraticCurveTo(x, y + h * 0.5, x - w * 0.42, y - h * 0.12);
  ctx.closePath();
  ctx.fillStyle = SNOW_SHADE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  moundTop(ctx, x, y, w, h);
  ink(ctx, lw, INK);
}

// ---------------------------------------------------------------- glows

/**
 * Soft round glows (lamps, lanterns, windows) without shadowBlur and without a new gradient
 * per frame: one unit radial gradient per canvas, scaled into place with the transform.
 */
const GLOW_STOPS = [
  [0, alpha(LAMP_CORE, 0.55)],
  [0.35, alpha(LAMP, 0.28)],
  [1, alpha(LAMP, 0)],
] as const;
let glowCtx: Ctx | null = null;
let glowFill: CanvasGradient | null = null;

/** A warm glow of radius r centered at (x, y), at `strength` (0..1) opacity. */
export function glow(ctx: Ctx, x: number, y: number, r: number, strength = 1): void {
  if (glowCtx !== ctx || !glowFill) {
    glowCtx = ctx;
    glowFill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [at, c] of GLOW_STOPS) glowFill.addColorStop(at, c);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.globalAlpha *= strength;
  ctx.fillStyle = glowFill;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}
