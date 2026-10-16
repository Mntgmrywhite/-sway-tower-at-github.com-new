import { mix, type Ctx } from "../../base/draw";
import { INK } from "./colors";

// Leaf outlines shared by the sky drift, the leaf litter on the floor and the maple-leaf bar icon.
// Unit space: about 1 tall, centered, tip up (-y), stem down (+y). Flat [x, y, x, y, ...] arrays,
// built once at load so drawing a leaf allocates nothing.

/** Maple: 5 lobes with a few bold teeth, as (degrees clockwise from up, radius) for the right half. */
const MAPLE_HALF: readonly [number, number][] = [
  [0, 0.53],
  [15, 0.27],
  [27, 0.35],
  [39, 0.21],
  [62, 0.49],
  [80, 0.27],
  [95, 0.31],
  [112, 0.15],
  [131, 0.29],
  [158, 0.1],
];

function mapleOutline(): number[] {
  const right = MAPLE_HALF.map(([deg, r]) => {
    const a = (deg * Math.PI) / 180;
    return [Math.sin(a) * r, -Math.cos(a) * r] as const;
  });
  const out: number[] = [];
  for (const [x, y] of right) out.push(x, y);
  out.push(0, 0.08); // stem notch
  for (let i = right.length - 1; i >= 1; i--) {
    const p = right[i]!;
    out.push(-p[0], p[1]);
  }
  // Recentre: the body spans -0.52..0.08 plus the stem to 0.4, so shift down a little.
  for (let i = 1; i < out.length; i += 2) out[i]! += 0.06;
  return out;
}

/** Oak: an elongated leaf with four rounded lobes a side. */
function oakOutline(): number[] {
  const N = 28;
  const right: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 = base, 1 = tip
    const y = 0.32 - t * 0.8;
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95)), 0.7);
    const lobes = 0.5 + 0.5 * Math.abs(Math.cos(t * Math.PI * 3.6));
    right.push([0.27 * env * lobes, y]);
  }
  const out: number[] = [];
  for (const [x, y] of right) out.push(x, y);
  for (let i = right.length - 2; i >= 1; i--) {
    const p = right[i]!;
    out.push(-p[0], p[1]);
  }
  return out;
}

/**
 * Autumn leaf colors shared by the drifting leaves and the leaf litter: bright fills (the face
 * you see) and a deeper shade for the back, shown when a tumbling leaf flips over.
 */
export const LEAF_COLORS = ["#ff9a2a", "#f2483a", "#ffcf33", "#d9692a"] as const;
export const LEAF_BACKS = LEAF_COLORS.map((c) => mix(c, INK, 0.22));

export const MAPLE = mapleOutline();
const OAK = oakOutline();
/** Midrib + stem for each shape: x0, y0 (stem end), x1, y1 (rib end). */
const MAPLE_RIB = [0, 0.44, 0, -0.3] as const;
const OAK_RIB = [0, 0.46, 0, -0.38] as const;

/**
 * Add one leaf to the current path as its own closed subpath plus an open midrib.
 * `flip` scales across the leaf (negative mirrors it; near 0 it is edge-on, for tumbling),
 * `squash` flattens it vertically after rotating (for leaves lying on the field); `rib` adds the
 * midrib and stem (skip it on small leaves, where it only darkens them).
 */
export function addLeaf(
  ctx: Ctx,
  oak: boolean,
  x: number,
  y: number,
  size: number,
  angle: number,
  flip: number,
  squash = 1,
  rib = true,
): void {
  const pts = oak ? OAK : MAPLE;
  const c = Math.cos(angle) * size;
  const sn = Math.sin(angle) * size;
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i]! * flip;
    const py = pts[i + 1]!;
    const X = x + px * c - py * sn;
    const Y = y + (px * sn + py * c) * squash;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  if (!rib) return;
  const r = oak ? OAK_RIB : MAPLE_RIB;
  ctx.moveTo(x - r[1] * sn, y + r[1] * c * squash);
  ctx.lineTo(x - r[3] * sn, y + r[3] * c * squash);
}
