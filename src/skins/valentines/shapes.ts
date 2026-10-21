import { circle, type Ctx } from "../../base/draw";

// Shapes shared by the scenery: rounded blocks, hearts, petals, round-headed arches, stylized
// roses, diamonds, heart-shaped leaves, sparkles, and the stylized Art Nouveau cloud. Paths only
// (each starts its own subpath, so several can share one fill), or a fill with the caller's
// colors; and a dash pattern for the rows of windows, balusters and bulbs drawn as dashed
// strokes. Nothing here allocates.

const TAU = Math.PI * 2;

/** A scratch dash pattern, [on, off], for `setLineDash` (the canvas copies it), so a frame allocates none; and none. */
const DASH = [0, 0];
export function dashes(on: number, off: number): number[] {
  DASH[0] = on;
  DASH[1] = off;
  return DASH;
}
export const NO_DASH: number[] = [];

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

/** A round-headed arch standing on y (left edge x, w wide, h tall), as its own subpath. */
export function archPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + r);
  ctx.arc(x + r, y - h + r, r, Math.PI, TAU);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

/** A horizontal pill as its own subpath. */
function pill(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = Math.min(h, w) / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
}

/** A plump heart as its own subpath (wound clockwise), centered on (cx, cy), about s tall. */
export function heartPath(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.bezierCurveTo(cx - s * 0.18, cy + s * 0.28, cx - s * 0.5, cy + s * 0.08, cx - s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx - s * 0.46, cy - s * 0.42, cx - s * 0.1, cy - s * 0.48, cx, cy - s * 0.24);
  ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.48, cx + s * 0.46, cy - s * 0.42, cx + s * 0.48, cy - s * 0.15);
  ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.08, cx + s * 0.18, cy + s * 0.28, cx, cy + s * 0.45);
  ctx.closePath();
}

/** A rose petal: a teardrop about s long, its point at (x, y), leaning by `rot` (radians), as its own subpath. */
export function petalPath(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  const c = Math.cos(rot);
  const n = Math.sin(rot);
  const p = (dx: number, dy: number) => [x + dx * c - dy * n, y + dx * n + dy * c] as const;
  const [ax, ay] = p(0, 0);
  const [bx, by] = p(-s * 0.42, -s * 0.55);
  const [tx, ty] = p(0, -s);
  const [dx, dy] = p(s * 0.42, -s * 0.55);
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(bx, by, tx, ty);
  ctx.quadraticCurveTo(dx, dy, ax, ay);
  ctx.closePath();
}

/**
 * A stylized rose as its own subpath: five round petals about (x, y), r to their tips, turned by
 * `rot` (Béziers, no arcs: these are drawn by the dozen).
 */
export function rosette(ctx: Ctx, x: number, y: number, r: number, rot = 0): void {
  for (let k = 0; k <= 5; k++) {
    const a = rot - Math.PI / 2 + ((k - 0.5) * Math.PI * 2) / 5;
    const px = x + Math.cos(a) * r * 0.62;
    const py = y + Math.sin(a) * r * 0.62;
    if (k === 0) {
      ctx.moveTo(px, py);
      continue;
    }
    const m = a - Math.PI / 5;
    ctx.quadraticCurveTo(x + Math.cos(m) * r * 1.3, y + Math.sin(m) * r * 1.3, px, py);
  }
  ctx.closePath();
}

/** The curl at a stylized rose's heart, as one open curve (continues the path). */
export function roseHeart(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x - r * 0.3, y + r * 0.1);
  ctx.quadraticCurveTo(x - r * 0.28, y - r * 0.32, x + r * 0.08, y - r * 0.28);
  ctx.quadraticCurveTo(x + r * 0.36, y - r * 0.2, x + r * 0.22, y + r * 0.1);
  ctx.quadraticCurveTo(x + r * 0.06, y + r * 0.28, x - r * 0.06, y + r * 0.02);
}

/** A diamond (a cut jewel) as its own subpath. */
export function diamond(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.7, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.7, y);
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

// ---------------------------------------------------------------- clouds

/** A cloud's puffs as [dx, dy, r] in units of its size; the lowest sit on its flat bottom, dy = 0.3. */
export type CloudShape = readonly (readonly [number, number, number])[];

/** A long low cloud. */
export const LONG_CLOUD: CloudShape = [
  [-1.3, -0.2, 0.5],
  [-0.7, -0.42, 0.72],
  [0.05, -0.6, 0.9],
  [0.8, -0.38, 0.68],
  [1.35, -0.16, 0.46],
];
/** A rounder, taller cloud. */
export const TALL_CLOUD: CloudShape = [
  [-0.85, -0.25, 0.55],
  [-0.3, -0.62, 0.7],
  [0.32, -0.85, 0.8],
  [0.9, -0.28, 0.58],
  [0.25, -0.32, 0.62],
];

/** The flat base of a cloud shape: [left, right] in units of its size. */
function baseOf(shape: CloudShape): readonly [number, number] {
  let l = Infinity;
  let r = -Infinity;
  for (const [dx, , dr] of shape) {
    l = Math.min(l, dx - dr * 0.6);
    r = Math.max(r, dx + dr * 0.6);
  }
  return [l, r];
}
const BASES = new Map<CloudShape, readonly [number, number]>([
  [LONG_CLOUD, baseOf(LONG_CLOUD)],
  [TALL_CLOUD, baseOf(TALL_CLOUD)],
]);

/** The puffs of a cloud (scaled by k, shifted by dy radii) and its flat base, as subpaths. */
function cloudPath(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, k: number, dy: number): void {
  for (const [px, py, pr] of shape) circle(ctx, x + px * r, y + (py + dy) * r, pr * r * k);
  const base = BASES.get(shape);
  if (base) {
    const h = r * 0.34 * k;
    pill(ctx, x + base[0] * r, y + (0.3 + dy) * r - h, (base[1] - base[0]) * r, h);
  }
}

/**
 * The inner scallop of a big puff at (cx, cy) of radius pr, as one open curve (continues the
 * path): a shell line inside the top of the puff, the stylized cloud's decoration.
 */
export function scallopArc(ctx: Ctx, cx: number, cy: number, pr: number): void {
  ctx.moveTo(cx - pr * 0.53, cy - pr * 0.17);
  ctx.quadraticCurveTo(cx, cy - pr * 0.79, cx + pr * 0.53, cy - pr * 0.17);
}

/**
 * A stylized cloud at (x, y) of size r, the Art Nouveau way: a flat pastel body with a fine
 * contour round its silhouette (stroked under the fill, so only the outer half shows), a shell
 * line inside each big puff, and a little curl at its left foot. No shading, no outline weight.
 */
export function cloud(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, body: string, line: string): void {
  const lw = Math.max(0.7, r * 0.06);
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 1, 0);
  ctx.strokeStyle = line;
  ctx.lineWidth = lw * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, pr] of shape) {
    if (pr < 0.6) continue;
    scallopArc(ctx, x + px * r, y + py * r, pr * r);
  }
  // The curl at the left foot.
  const base = BASES.get(shape);
  if (base) {
    const fx = x + base[0] * r + r * 0.28;
    const fy = y + 0.3 * r - r * 0.17;
    ctx.moveTo(fx + r * 0.16, fy + r * 0.04);
    ctx.quadraticCurveTo(fx + r * 0.02, fy + r * 0.24, fx - r * 0.14, fy + r * 0.04);
    ctx.quadraticCurveTo(fx - r * 0.16, fy - r * 0.16, fx + r * 0.02, fy - r * 0.12);
    ctx.quadraticCurveTo(fx + r * 0.1, fy - r * 0.04, fx + r * 0.02, fy + r * 0.02);
  }
  ctx.lineWidth = lw;
  ctx.stroke();
}

/**
 * A heart-shaped leaf as its own subpath: its stalk end at (x, y), reaching `size` along the unit
 * direction (dx, dy) to its point.
 */
export function heartLeaf(ctx: Ctx, x: number, y: number, size: number, dx: number, dy: number): void {
  // Leaf-local (along a, across b) to screen: x + (a dx - b dy) size, y + (a dy + b dx) size.
  const ax = dx * size;
  const ay = dy * size;
  const bx = -dy * size;
  const by = dx * size;
  ctx.moveTo(x + 0.1 * ax, y + 0.1 * ay);
  ctx.bezierCurveTo(x - 0.12 * ax + 0.34 * bx, y - 0.12 * ay + 0.34 * by, x + 0.42 * ax + 0.56 * bx, y + 0.42 * ay + 0.56 * by, x + ax, y + ay);
  ctx.bezierCurveTo(x + 0.42 * ax - 0.56 * bx, y + 0.42 * ay - 0.56 * by, x - 0.12 * ax - 0.34 * bx, y - 0.12 * ay - 0.34 * by, x + 0.1 * ax, y + 0.1 * ay);
  ctx.closePath();
}
