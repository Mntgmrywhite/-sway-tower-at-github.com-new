import type { Ctx } from "../../../base/draw";

// A scratch pen for drawing a creature in its own local units: origin at its anchor, x toward
// where it faces, y down, one unit = its size. `pen()` places it (mirrored for facing left,
// turned by `rot`), and the path helpers below map local points to the screen. An offset lets the
// same shape be laid down twice, the second a little up and left: a sliver of moonlight along its
// upper-left edges (see `rimmed`). Nothing allocates.

export const P = { x: 0, y: 0, s: 1, d: 1, c: 1, n: 0, ox: 0, oy: 0 };

/** Place the pen: local origin at (x, y), unit `s` px, facing `d` (1 right, -1 left), turned `rot` radians. */
export function pen(x: number, y: number, s: number, d = 1, rot = 0): void {
  P.x = x;
  P.y = y;
  P.s = s;
  P.d = d < 0 ? -1 : 1;
  P.c = Math.cos(rot);
  P.n = Math.sin(rot);
  P.ox = 0;
  P.oy = 0;
}

/** Screen x and y of a local point. */
export function sx(lx: number, ly: number): number {
  return P.x + P.ox + P.d * P.s * (lx * P.c - ly * P.n);
}
export function sy(lx: number, ly: number): number {
  return P.y + P.oy + P.s * (lx * P.n + ly * P.c);
}

export function M(ctx: Ctx, lx: number, ly: number): void {
  ctx.moveTo(sx(lx, ly), sy(lx, ly));
}
export function L(ctx: Ctx, lx: number, ly: number): void {
  ctx.lineTo(sx(lx, ly), sy(lx, ly));
}
export function Q(ctx: Ctx, cx: number, cy: number, lx: number, ly: number): void {
  ctx.quadraticCurveTo(sx(cx, cy), sy(cx, cy), sx(lx, ly), sy(lx, ly));
}
export function B(ctx: Ctx, ax: number, ay: number, bx: number, by: number, lx: number, ly: number): void {
  ctx.bezierCurveTo(sx(ax, ay), sy(ax, ay), sx(bx, by), sy(bx, by), sx(lx, ly), sy(lx, ly));
}
/** A circle as its own subpath. */
export function C(ctx: Ctx, lx: number, ly: number, r: number): void {
  const x = sx(lx, ly);
  const y = sy(lx, ly);
  const rr = Math.max(0.01, r * P.s);
  ctx.moveTo(x + rr, y);
  ctx.arc(x, y, rr, 0, Math.PI * 2);
}
/** An ellipse as its own subpath, turned `rot` in local space. */
export function E(ctx: Ctx, lx: number, ly: number, rx: number, ry: number, rot = 0): void {
  const x = sx(lx, ly);
  const y = sy(lx, ly);
  const a = Math.atan2(P.n, P.c) + rot;
  const r = P.d < 0 ? Math.PI - a : a;
  const ax = Math.max(0.01, rx * P.s);
  ctx.moveTo(x + Math.cos(r) * ax, y + Math.sin(r) * ax);
  ctx.ellipse(x, y, ax, Math.max(0.01, ry * P.s), r, 0, Math.PI * 2);
}
/**
 * A small round dot (screen px) as its own subpath: an ellipse, which is cheaper to lay down than an
 * arc, or below 1.4 px a square, which at that size looks the same and is cheaper still.
 */
export function dot(ctx: Ctx, x: number, y: number, r: number): void {
  if (r < 1.4) {
    ctx.rect(x - r, y - r, r * 2, r * 2);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
}

/** A polyline through local points given flat (x0, y0, x1, y1, ...), starting a subpath. */
export function poly(ctx: Ctx, pts: readonly number[], close = true): void {
  M(ctx, pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) L(ctx, pts[i]!, pts[i + 1]!);
  if (close) ctx.closePath();
}

/**
 * Lay a shape down lit by the moon: once in the rim color shifted up and to the left by `off` px,
 * then in its own color in place, leaving a sliver of moonlight along its upper-left edges. `draw`
 * builds the shape's path with the pen (it is called twice; it must not begin a path itself).
 */
export function rimmed(ctx: Ctx, draw: (ctx: Ctx) => void, fill: string, rim: string, off: number): void {
  P.ox = -off;
  P.oy = -off;
  ctx.beginPath();
  draw(ctx);
  ctx.fillStyle = rim;
  ctx.fill();
  P.ox = 0;
  P.oy = 0;
  ctx.beginPath();
  draw(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Stroke the current path with round ends and joins. */
export function stroke(ctx: Ctx, color: string, width: number): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Fill the current path, then ink its outline. */
export function inked(ctx: Ctx, fill: string, ink: string, width: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, ink, width);
}
