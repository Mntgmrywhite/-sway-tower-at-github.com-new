import type { Ctx } from "../../base/draw";

// A flapper's ostrich plume, built once in unit space: a quill at the bottom, a spine curling
// to the right at the tip, and a soft vane whose edges ripple in scallops so it reads as a
// feather (not a leaf) even when small. The drifting plumes, the feathers on the floor and the
// bar icon all draw from these outlines.

const N = 20;

function spine(t: number): [number, number] {
  return [0.16 * t * t, 0.42 - 0.92 * t];
}

function outline(side: -1 | 1, scallop: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [sx, sy] = spine(t);
    const tx = 0.32 * t;
    const ty = -0.92;
    const len = Math.hypot(tx, ty);
    const nx = -ty / len;
    const ny = tx / len;
    const w = 0.21 * Math.sin(Math.PI * Math.pow(t, 0.75)) * Math.min(1, t / 0.1);
    const wave = 1 + scallop * Math.sin(t * Math.PI * 8 + (side > 0 ? 0.9 : 0));
    out.push(sx + side * nx * w * wave, sy + side * ny * w * wave);
  }
  return out;
}

const LEFT = outline(-1, 0.16);
const RIGHT = outline(1, 0.16);

/** The whole vane, closed: up the left edge, down the right. */
export const PLUME = Float32Array.from([
  ...LEFT,
  ...RIGHT.flatMap((_, i, a) => (i % 2 ? [] : [a[a.length - 2 - i]!, a[a.length - 1 - i]!])),
]);

/** The right half of the vane (for its shaded side): down the spine, up the right edge. */
export const PLUME_HALF = Float32Array.from([
  ...Array.from({ length: N + 1 }, (_, i) => spine(i / N)).flat(),
  ...RIGHT.flatMap((_, i, a) => (i % 2 ? [] : [a[a.length - 2 - i]!, a[a.length - 1 - i]!])),
]);

/** Barbs: short strokes from the spine out toward each edge, as (x0, y0, x1, y1) segments. */
export const BARBS = (() => {
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.2 + i * 0.12;
    const [sx, sy] = spine(t);
    const tx = 0.32 * t;
    const len = Math.hypot(tx, 0.92);
    const nx = 0.92 / len;
    const ny = tx / len;
    const w = 0.21 * Math.sin(Math.PI * Math.pow(t, 0.75));
    for (const side of [-1, 1]) {
      out.push(sx, sy, sx + side * nx * w * 0.75 + tx * 0.06, sy + side * ny * w * 0.75 - 0.06);
    }
  }
  return Float32Array.from(out);
})();

/** Add the barb strokes to the current path with the same transform as plumePath. */
export function barbPath(ctx: Ctx, x: number, y: number, f: number, cos: number, sin: number, squash = 1): void {
  for (let i = 0; i < BARBS.length; i += 4) {
    for (let j = 0; j < 4; j += 2) {
      const px = BARBS[i + j]!;
      const py = BARBS[i + j + 1]!;
      const X = x + (px * cos - py * sin) * f;
      const Y = y + (px * sin + py * cos) * f * squash;
      if (j === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
  }
}

/** The quill below the vane, as two points. */
export const QUILL = [0, 0.42, -0.01, 0.58] as const;

/**
 * Add a plume outline to the current path at (x, y), unit length `f`, turned by the angle
 * whose cosine and sine are given, and squashed vertically by `squash` (1 upright; < 1 lying
 * on the floor).
 */
export function plumePath(ctx: Ctx, pts: Float32Array, x: number, y: number, f: number, cos: number, sin: number, squash = 1): void {
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i]!;
    const py = pts[i + 1]!;
    const X = x + (px * cos - py * sin) * f;
    const Y = y + (px * sin + py * cos) * f * squash;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
}

/** The quill as a segment on the current path, with the same transform. */
export function quillPath(ctx: Ctx, x: number, y: number, f: number, cos: number, sin: number, squash = 1): void {
  ctx.moveTo(x + (QUILL[0] * cos - QUILL[1] * sin) * f, y + (QUILL[0] * sin + QUILL[1] * cos) * f * squash);
  ctx.lineTo(x + (QUILL[2] * cos - QUILL[3] * sin) * f, y + (QUILL[2] * sin + QUILL[3] * cos) * f * squash);
}
