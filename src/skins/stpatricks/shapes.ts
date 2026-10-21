import { circle, type Ctx } from "../../base/draw";
import { curlPath } from "./knot";
import type { Tone } from "./tone";

// Shapes shared by the scenery: rounded blocks, flat-bottomed clouds curled with spirals,
// shamrocks, round-headed arches, far-off birds. Paths only (each starts its own subpath, so
// several can share one fill), or a fill with the caller's colors. Nothing here allocates.

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

/** A round-headed arch standing on y (left edge x, w wide, h tall), as its own subpath. */
export function archPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + r);
  ctx.arc(x + r, y - h + r, r, Math.PI, TAU);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- shamrocks

/** The three leaves point up, lower right and lower left; their unit directions. */
const LEAF_DIR = [0, 1, 2].map((i) => {
  const a = -Math.PI / 2 + (i * TAU) / 3;
  return [Math.cos(a), Math.sin(a), a] as const;
});

/**
 * A shamrock's three heart-shaped leaves round (x, y), about `s` across, as subpaths that all
 * wind the same way (so one nonzero fill unites them). Each leaf is two round lobes meeting in
 * a notch, its point at the center.
 */
export function shamrockPath(ctx: Ctx, x: number, y: number, s: number): void {
  const d = s * 0.2;
  const w = s * 0.11;
  const r = s * 0.15;
  for (const [dx, dy, a] of LEAF_DIR) {
    const px = -dy;
    const py = dx;
    const c1x = x + dx * d + px * w;
    const c1y = y + dy * d + py * w;
    const c2x = x + dx * d - px * w;
    const c2y = y + dy * d - py * w;
    ctx.moveTo(x, y);
    ctx.arc(c2x, c2y, r, a - Math.PI / 2 - 0.25, a + Math.PI / 2 + 0.2);
    ctx.arc(c1x, c1y, r, a - Math.PI / 2 - 0.2, a + Math.PI / 2 + 0.25);
    ctx.closePath();
  }
}

/** A shamrock's stem from its center, curving down to the right, as an open subpath (stroke it). */
export function stemPath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.04, y + s * 0.3, x + s * 0.2, y + s * 0.46);
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
/** A small cloud for the rainbow's feet. */
export const SMALL_CLOUD: CloudShape = [
  [-0.75, -0.18, 0.5],
  [-0.1, -0.5, 0.75],
  [0.65, -0.2, 0.55],
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
  [SMALL_CLOUD, baseOf(SMALL_CLOUD)],
]);

/** How far a cloud reaches either side of its center, in units of its size. */
export function cloudReach(shape: CloudShape): number {
  let reach = 0;
  for (const [dx, , dr] of shape) reach = Math.max(reach, Math.abs(dx) + dr);
  return reach;
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

/** The puffs of a cloud (scaled by k, shifted by dy radii, grown by `grow` all round) and its flat base, as subpaths. */
function cloudPath(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, k: number, dy: number, grow = 0): void {
  for (const [px, py, pr] of shape) circle(ctx, x + px * r, y + (py + dy) * r, pr * r * k + grow);
  const base = BASES.get(shape);
  if (base) {
    const h = r * 0.34 * k;
    pill(ctx, x + base[0] * r - grow, y + (0.3 + dy) * r - h - grow, (base[1] - base[0]) * r + grow * 2, h + grow * 2);
  }
}

/** The fine contour round far clouds (u). */
export function cloudLineWidth(u: number): number {
  return Math.max(1, u * 0.0028);
}

/**
 * The spiral curls drawn in a cloud's bigger puffs, as an illuminator draws clouds: each winds
 * in from the puff's left (or, by turns, its right), as open subpaths (stroke them).
 */
function cloudCurls(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number): void {
  let n = 0;
  for (const [px, py, pr] of shape) {
    if (pr < 0.6) continue;
    const side = n++ % 2 ? -1 : 1;
    curlPath(ctx, x + (px + side * pr * 0.08) * r, y + (py + 0.02) * r, pr * r * 0.52, side > 0 ? Math.PI : 0, -side);
  }
}

/**
 * A flat-bottomed cloud at (x, y) of size r, drawn as on an illuminated page: a fine contour all
 * round (the puffs a line wider, filled first), the shaded body, the lit body shifted up so a
 * shaded band shows along the bottom, and spiral curls in its bigger puffs.
 */
export function cloud(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, tone: Tone, lw: number): void {
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 1, 0, lw);
  ctx.fillStyle = tone.cloudLine;
  ctx.fill();
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 1, 0);
  ctx.fillStyle = tone.cloudShade;
  ctx.fill();
  ctx.beginPath();
  cloudPath(ctx, shape, x, y, r, 0.94, -0.12);
  ctx.fillStyle = tone.cloud;
  ctx.fill();
  ctx.beginPath();
  cloudCurls(ctx, shape, x, y, r);
  ctx.strokeStyle = tone.cloudLine;
  ctx.lineWidth = lw * 0.85;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- birds

/** A far-off bird as an open "m" stroke: half wingspan g, flap -1..1. Continues the path. */
export function birdStroke(ctx: Ctx, x: number, y: number, g: number, flap: number): void {
  const tip = y - flap * g * 0.5;
  ctx.moveTo(x - g, tip);
  ctx.quadraticCurveTo(x - g * 0.45, y - g * 0.5, x, y);
  ctx.quadraticCurveTo(x + g * 0.45, y - g * 0.5, x + g, tip);
}
