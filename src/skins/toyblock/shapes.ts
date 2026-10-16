import { ink, type Ctx } from "../../base/draw";
import { INK, type Shades } from "./colors";

// Shapes shared by the fort, the scenery and the block clouds: everything in Toy Kingdom is
// built from the same rounded toy blocks as the tower. Paths only, or a fill with the caller's
// colors (inked up close, faded and flat far away). Nothing here allocates.

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

/**
 * A toy block up close, the way the bars are drawn but without a clip: the shaded block, the
 * body over it leaving a shaded bottom and right edge, a lit strip along the top, and the ink
 * outline. `r` is the corner radius.
 */
export function inkedBlock(ctx: Ctx, x: number, y: number, w: number, h: number, c: Shades, lw: number, r: number): void {
  const bevel = Math.min(h * 0.2, w * 0.14);
  ctx.beginPath();
  block(ctx, x, y, w, h, r);
  ctx.fillStyle = c.shade;
  ctx.fill();
  ctx.beginPath();
  block(ctx, x, y, w - bevel * 0.7, h - bevel, r);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.fillStyle = c.light;
  ctx.fillRect(x + r * 0.7, y + lw * 0.3, w - bevel * 0.7 - r * 1.4, bevel * 0.75);
  ctx.beginPath();
  block(ctx, x, y, w, h, r);
  ink(ctx, lw, INK);
}

/** One block of a block cloud: [dx, dy, w, h] in units of the cloud's size, dy up from its flat bottom. */
export type CloudShape = readonly (readonly [number, number, number, number])[];

/** A long, low cloud: a wide slab with a tall block and a small one on it. */
export const LOW_CLOUD: CloudShape = [
  [-1.4, 0, 2.8, 0.62],
  [-0.95, 0.5, 1.1, 0.62],
  [0.05, 0.5, 0.95, 0.88],
];
/** A taller cloud: a slab with a big block on it and a small one on top of that. */
export const TALL_CLOUD: CloudShape = [
  [-1.25, 0, 2.5, 0.62],
  [-0.75, 0.5, 1.6, 0.85],
  [-0.35, 1.25, 0.85, 0.55],
];

/**
 * A block cloud at (x, y) — y is its flat bottom — of size s, built bottom block first: each
 * block shaded, its body over that leaving a shaded band along its bottom (where it sits on the
 * block below, that band reads as a contact shadow), and a lit strip along its top. No outline:
 * it is far away.
 */
export function blockCloud(ctx: Ctx, shape: CloudShape, x: number, y: number, s: number, shade: string, body: string, light: string): void {
  const r = s * 0.28;
  for (const [dx, dy, w, h] of shape) {
    const bx = x + dx * s;
    const by = y - (dy + h) * s;
    ctx.beginPath();
    block(ctx, bx, by, w * s, h * s, r);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.beginPath();
    block(ctx, bx, by, (w - 0.08) * s, (h - 0.16) * s, r);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.fillStyle = light;
    ctx.fillRect(bx + r, by + s * 0.07, (w - 0.08) * s - r * 2, s * 0.1);
  }
}
