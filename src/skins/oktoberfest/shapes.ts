import { circle, type Ctx } from "../../base/draw";

// Shapes shared by the scenery: rounded blocks, pills, flat-bottomed puffy clouds, the
// Bavarian rhombus lattice, pretzels, hearts, a sparkle. Paths only (each starts its own
// subpath, so several can share one fill), or a fill with the caller's colors. Nothing here
// allocates.

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
export function pill(ctx: Ctx, x: number, y: number, w: number, h: number): void {
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

/** A diamond (rhombus) centered at (x, y), half width hw and half height hh, as its own subpath. */
export function diamond(ctx: Ctx, x: number, y: number, hw: number, hh: number): void {
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
}

/**
 * The Bavarian lattice: a field of blue diamonds on white, as the diamonds alone (fill them blue
 * over a white ground). Diamonds of half width hw and half height hh tile the rectangle from
 * (x, y), w by h, in staggered rows; the caller clips to the rectangle. One subpath each.
 */
export function lattice(ctx: Ctx, x: number, y: number, w: number, h: number, hw: number, hh: number): void {
  for (let row = 0, cy = y; cy < y + h + hh; row++, cy += hh) {
    const off = row % 2 ? hw : 0;
    for (let cx = x + off; cx < x + w + hw; cx += hw * 2) diamond(ctx, cx, cy, hw, hh);
  }
}

/** A heart pointing down, centered at (x, y), about `s` wide, as its own subpath. */
export function heartPath(ctx: Ctx, x: number, y: number, s: number): void {
  const r = s * 0.26;
  const top = y - s * 0.2;
  ctx.moveTo(x, y + s * 0.44);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.08, x - s * 0.52, top - r * 0.2, x - s * 0.25, top - r * 0.5);
  ctx.bezierCurveTo(x - s * 0.1, top - r * 0.7, x, top - r * 0.1, x, top + r * 0.2);
  ctx.bezierCurveTo(x, top - r * 0.1, x + s * 0.1, top - r * 0.7, x + s * 0.25, top - r * 0.5);
  ctx.bezierCurveTo(x + s * 0.52, top - r * 0.2, x + s * 0.5, y + s * 0.08, x, y + s * 0.44);
  ctx.closePath();
}

/**
 * A pretzel's loops as one open stroke path centered at (x, y), about `s` across: the two arms
 * rise from the bottom knot, cross over each other and curl out into the twin lobes. Stroke it
 * (ink wide, then the dough on top).
 */
export function pretzelPath(ctx: Ctx, x: number, y: number, s: number): void {
  const b = y + s * 0.3;
  // The left arm: from the bottom left, up through the crossing to the right lobe and round.
  ctx.moveTo(x - s * 0.42, b);
  ctx.bezierCurveTo(x - s * 0.2, b, x + s * 0.1, y - s * 0.1, x + s * 0.2, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.05, x + s * 0.22, y + s * 0.12);
  ctx.bezierCurveTo(x + s * 0.08, y + s * 0.16, x - s * 0.08, y + s * 0.16, x - s * 0.22, y + s * 0.12);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.05, x - s * 0.5, y - s * 0.5, x - s * 0.2, y - s * 0.2);
  ctx.bezierCurveTo(x - s * 0.1, y - s * 0.1, x + s * 0.2, b, x + s * 0.42, b);
  // The bottom bar joining the two ends.
  ctx.moveTo(x - s * 0.42, b);
  ctx.quadraticCurveTo(x, b + s * 0.1, x + s * 0.42, b);
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

/** A five-point star as its own subpath. */
export function starPath(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.42 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    else ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
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

/** How far a cloud reaches either side of its center, in units of its size. */
export function cloudReach(shape: CloudShape): number {
  let reach = 0;
  for (const [dx, , dr] of shape) reach = Math.max(reach, Math.abs(dx) + dr);
  return reach;
}

/** The puffs of a cloud (scaled by k, shifted by dy radii) and its flat base, as subpaths. */
export function cloudPath(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, k: number, dy: number): void {
  for (const [px, py, pr] of shape) circle(ctx, x + px * r, y + (py + dy) * r, pr * r * k);
  const base = BASES.get(shape);
  if (base) {
    const h = r * 0.34 * k;
    pill(ctx, x + base[0] * r, y + (0.3 + dy) * r - h, (base[1] - base[0]) * r, h);
  }
}

/**
 * A flat-bottomed, cel-shaded cloud at (x, y) of size r: the shaded body, the lit body shifted
 * up so a shaded band shows along the bottom, and light caps. No outline (it is far away).
 */
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
