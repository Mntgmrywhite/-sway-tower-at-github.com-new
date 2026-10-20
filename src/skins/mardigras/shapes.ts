import { circle, type Ctx } from "../../base/draw";

// Shapes shared by the scenery and the bars: rounded blocks, pills, flat-bottomed puffy clouds,
// a fleur-de-lis, a star, a bead string, a bunting swag, a half mask. Paths only (each starts
// its own subpath, so several can share one fill), or a fill with the caller's colors. Nothing
// here allocates.

const TAU = Math.PI * 2;

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
function pill(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = Math.min(h, w) / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
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

// ---------------------------------------------------------------- Carnival symbols

/**
 * A fleur-de-lis of our own, centered at (x, y), about `s` tall: a central petal with a
 * pointed tip, two side petals curling out and down, and a band across the stems. Winds the
 * same way throughout, so one nonzero fill unites it.
 */
export function fleurPath(ctx: Ctx, x: number, y: number, s: number): void {
  const h = s / 2;
  // The center petal: a leaf from the band up to the point.
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + s * 0.2, y - h * 0.45, x + s * 0.11, y + h * 0.2);
  ctx.lineTo(x - s * 0.11, y + h * 0.2);
  ctx.quadraticCurveTo(x - s * 0.2, y - h * 0.45, x, y - h);
  ctx.closePath();
  // The side petals: out from the band and curling down into a scroll.
  for (let m = -1; m <= 1; m += 2) {
    ctx.moveTo(x + m * s * 0.1, y + h * 0.2);
    ctx.quadraticCurveTo(x + m * s * 0.18, y - h * 0.35, x + m * s * 0.46, y - h * 0.36);
    ctx.quadraticCurveTo(x + m * s * 0.5, y + h * 0.05, x + m * s * 0.3, y + h * 0.22);
    ctx.quadraticCurveTo(x + m * s * 0.36, y - h * 0.05, x + m * s * 0.24, y - h * 0.1);
    ctx.quadraticCurveTo(x + m * s * 0.16, y, x + m * s * 0.14, y + h * 0.2);
    ctx.closePath();
  }
  // The band, and the three stems under it.
  ctx.moveTo(x - s * 0.22, y + h * 0.2);
  ctx.lineTo(x + s * 0.22, y + h * 0.2);
  ctx.lineTo(x + s * 0.22, y + h * 0.38);
  ctx.lineTo(x - s * 0.22, y + h * 0.38);
  ctx.closePath();
  ctx.moveTo(x - s * 0.08, y + h * 0.38);
  ctx.lineTo(x + s * 0.08, y + h * 0.38);
  ctx.lineTo(x + s * 0.13, y + h);
  ctx.lineTo(x - s * 0.13, y + h);
  ctx.closePath();
  for (let m = -1; m <= 1; m += 2) {
    ctx.moveTo(x + m * s * 0.12, y + h * 0.38);
    ctx.lineTo(x + m * s * 0.21, y + h * 0.38);
    ctx.lineTo(x + m * s * 0.34, y + h * 0.95);
    ctx.lineTo(x + m * s * 0.24, y + h);
    ctx.closePath();
  }
}

/** A five-point star as its own subpath, `r` to its points. */
export function starPath(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.42 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    else ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
}

/**
 * A half mask (the eye mask of a masquerade), centered at (x, y), `w` wide: a wide shape
 * swept up into points at its outer corners, as one subpath; the eye holes are separate
 * (`maskEyes`), to cut or fill as the caller likes.
 */
export function maskPath(ctx: Ctx, x: number, y: number, w: number): void {
  const h = w * 0.42;
  ctx.moveTo(x, y + h * 0.1);
  ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.2, x + w * 0.5, y - h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.48, y + h * 0.15, x + w * 0.26, y + h * 0.45);
  ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.55, x, y + h * 0.35);
  ctx.quadraticCurveTo(x - w * 0.1, y + h * 0.55, x - w * 0.26, y + h * 0.45);
  ctx.quadraticCurveTo(x - w * 0.48, y + h * 0.15, x - w * 0.5, y - h * 0.55);
  ctx.quadraticCurveTo(x - w * 0.2, y - h * 0.2, x, y + h * 0.1);
  ctx.closePath();
}

/** The mask's two eye holes, as subpaths. */
export function maskEyes(ctx: Ctx, x: number, y: number, w: number): void {
  const h = w * 0.42;
  ctx.moveTo(x - w * 0.14, y);
  ctx.ellipse(x - w * 0.24, y, w * 0.1, h * 0.22, -0.3, 0, TAU);
  ctx.moveTo(x + w * 0.34, y);
  ctx.ellipse(x + w * 0.24, y, w * 0.1, h * 0.22, 0.3, 0, TAU);
}

/**
 * A string of beads hanging in a loop from (x, y): `n` beads round a U of half width `hw` and
 * depth `d`, each a circle of radius `r`, as subpaths (one fill).
 */
export function beadLoop(ctx: Ctx, x: number, y: number, hw: number, d: number, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const a = Math.PI * k;
    const bx = x - hw * Math.cos(a);
    const by = y + d * Math.sin(a);
    circle(ctx, bx, by, r);
  }
}

/**
 * A swag of bunting from (x0, y) to (x1, y), sagging `sag`, as a closed subpath (its top edge
 * straight, the bottom a curve), for one scallop of a fabric drape.
 */
export function swagPath(ctx: Ctx, x0: number, x1: number, y: number, sag: number): void {
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x0, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- clouds

/** A cloud's puffs as [dx, dy, r] in units of its size; the lowest sit on its flat bottom, dy = 0.3. */
export type CloudShape = readonly (readonly [number, number, number])[];

export const LONG_CLOUD: CloudShape = [
  [-1.3, -0.2, 0.5],
  [-0.7, -0.42, 0.72],
  [0.05, -0.6, 0.9],
  [0.8, -0.38, 0.68],
  [1.35, -0.16, 0.46],
];
export const TALL_CLOUD: CloudShape = [
  [-0.85, -0.25, 0.55],
  [-0.3, -0.62, 0.7],
  [0.32, -0.85, 0.8],
  [0.9, -0.28, 0.58],
  [0.25, -0.32, 0.62],
];

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

/** A flat-bottomed, cel-shaded cloud at (x, y) of size r: shaded body, lit body shifted up, light caps. No outline (it is far away). */
export function cloud(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, shade: string, body: string, light: string): void {
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 1, 0);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 0.94, -0.12);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, pr] of shape) {
    if (pr < 0.6) continue;
    circle(ctx, x + (px - pr * 0.22) * r, y + (py - pr * 0.42) * r, pr * r * 0.42);
  }
  ctx.fillStyle = light;
  ctx.fill();
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
