import type { Ctx } from "../../base/draw";

/**
 * A crescent outline as its own subpath: the disc of radius `r` at (cx, cy) with a bite taken
 * by a disc of radius `r * inner`, offset `r * off` toward angle `phi`. The lit side faces
 * away from `phi`. Needs (1 - inner) < off < (1 + inner).
 */
export function crescentPath(ctx: Ctx, cx: number, cy: number, r: number, inner: number, off: number, phi: number): void {
  const r2 = r * inner;
  const d = r * off;
  const a = (d * d + r * r - r2 * r2) / (2 * d);
  const half = Math.acos(Math.max(-1, Math.min(1, a / r)));
  const p1 = phi + half;
  const p2 = phi - half;
  const x1 = cx + Math.cos(p1) * r;
  const y1 = cy + Math.sin(p1) * r;
  const x2 = cx + Math.cos(p2) * r;
  const y2 = cy + Math.sin(p2) * r;
  const bx = cx + Math.cos(phi) * d;
  const by = cy + Math.sin(phi) * d;
  ctx.moveTo(x1, y1);
  // The long way round the outer disc (away from the bite), then back along the bite.
  ctx.arc(cx, cy, r, p1, p2 + Math.PI * 2, false);
  ctx.arc(bx, by, r2, Math.atan2(y2 - by, x2 - bx), Math.atan2(y1 - by, x1 - bx), true);
  ctx.closePath();
}

/** A pointed leaf from (bx, by) to (tx, ty), `w` wide at the middle, as its own subpath. */
export function leafPath(ctx: Ctx, bx: number, by: number, tx: number, ty: number, w: number): void {
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const nx = (-(ty - by) / len) * w;
  const ny = ((tx - bx) / len) * w;
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx, my - ny, bx, by);
}

/** A four-point sparkle (two crossed lines) as subpaths, arm length `r`. */
export function sparklePath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
}
