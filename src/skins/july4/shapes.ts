import type { Ctx } from "../../base/draw";

// Shapes shared by the scenery: rounded blocks, pills, five-point stars, bunting swags, far-off
// birds, round dots and specks (cheaper than arcs where many are drawn), rows of scallops,
// sparkles. Paths only (each starts its own subpath, so several can share one fill). Nothing
// here allocates.

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between. */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** A rounded rectangle as its own subpath (no beginPath, so several can share one fill). */
export function block(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A horizontal pill as its own subpath. */
export function pill(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = Math.min(h, w) / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
}

/** The five points of a star and the dips between them, unit radius, point up. */
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 0.42 : 1;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});

/** A five-point star centered at (x, y) of outer radius r, as its own subpath. */
export function starPath(ctx: Ctx, x: number, y: number, r: number, rot = 0): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < STAR.length; i++) {
    const [px, py] = STAR[i]!;
    const dx = (px * c - py * s) * r;
    const dy = (px * s + py * c) * r;
    if (i === 0) ctx.moveTo(x + dx, y + dy);
    else ctx.lineTo(x + dx, y + dy);
  }
  ctx.closePath();
}

/**
 * One swag of bunting hung between (x0, y) and (x1, y) (x0 < x1), sagging `sag` below the line:
 * a pleated half-fan of stripes. Band `i` of `n` (0 outermost), as its own subpath.
 */
export function swagBand(ctx: Ctx, x0: number, x1: number, y: number, sag: number, i: number, n: number): void {
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const k0 = 1 - i / n;
  const k1 = 1 - (i + 1) / n;
  ctx.moveTo(cx - rx * k0, y);
  ctx.ellipse(cx, y, rx * k0, sag * k0, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx * k1, y);
  if (k1 > 0) ctx.ellipse(cx, y, rx * k1, sag * k1, 0, 0, Math.PI, false);
  ctx.closePath();
}

// ---------------------------------------------------------------- birds

/** A far-off bird as an open "m" stroke: half wingspan g, flap -1..1. Continues the path. */
export function birdStroke(ctx: Ctx, x: number, y: number, g: number, flap: number): void {
  const tip = y - flap * g * 0.5;
  ctx.moveTo(x - g, tip);
  ctx.quadraticCurveTo(x - g * 0.45, y - g * 0.5, x, y);
  ctx.quadraticCurveTo(x + g * 0.45, y - g * 0.5, x + g, tip);
}

/** The eight corners of a unit octagon. */
const OCTAGON = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)] as const);

/**
 * A small round dot as its own subpath: an octagon, which reads as round at the sizes it is
 * used (sparks, heads of light, buttons) and costs under half what an arc does to fill.
 */
export function dot(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  for (let i = 1; i < 8; i++) ctx.lineTo(x + OCTAGON[i]![0] * r, y + OCTAGON[i]![1] * r);
  ctx.closePath();
}

/** A speck as its own subpath: a square, for dots a pixel or two across (stars on a flag, eyes), where a square and a circle print alike. */
export function speck(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.rect(x - r, y - r, r * 2, r * 2);
}

/** A row of round scallops from x0 to x1 along `y` (each `step` wide, rising `bump` above it), filled down `depth` below it, as its own subpath. */
export function scallops(ctx: Ctx, x0: number, x1: number, y: number, step: number, bump: number, depth: number): void {
  if (x1 <= x0) return;
  ctx.moveTo(x0, y + depth);
  ctx.lineTo(x0, y);
  for (let x = x0; x < x1; x += step) ctx.quadraticCurveTo(x + step / 2, y - bump * 2, Math.min(x1, x + step), y);
  ctx.lineTo(x1, y + depth);
  ctx.closePath();
}

/** A four-point sparkle as its own subpath. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  const w = r * 0.24;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + w, y - w, x + r, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + r);
  ctx.quadraticCurveTo(x - w, y + w, x - r, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - r);
  ctx.closePath();
}

/**
 * A crescent as its own subpath: the disc (x, y, r) less the bite (bx, by, br), traced along the
 * disc's rim away from the bite and back along the bite's rim. One plain outline, so it fills
 * clean (a disc cut by a clip and an even-odd bite leaves a faint anti-aliased ring along the
 * bite). The two circles must cross.
 */
export function crescent(ctx: Ctx, x: number, y: number, r: number, bx: number, by: number, br: number): void {
  const d = Math.hypot(bx - x, by - y);
  const toward = Math.atan2(by - y, bx - x);
  // Where the rims cross: half the angle they span, seen from each center.
  const a = Math.acos((r * r + d * d - br * br) / (2 * r * d));
  const b = Math.acos((br * br + d * d - r * r) / (2 * br * d));
  const back = toward + Math.PI;
  ctx.moveTo(x + Math.cos(toward + a) * r, y + Math.sin(toward + a) * r);
  ctx.arc(x, y, r, toward + a, toward - a + Math.PI * 2);
  ctx.arc(bx, by, br, back + b, back - b, true);
  ctx.closePath();
}
