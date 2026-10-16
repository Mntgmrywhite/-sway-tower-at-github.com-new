import { mix, type Ctx } from "../../base/draw";

// Leaf outlines shared by the sky drift, the leaf litter on the floor and the maple-leaf bar icon.
// Unit space: about 1 tall, centered, tip up (-y), stem down (+y). Flat [x, y, x, y, ...] arrays,
// built once at load so drawing a leaf allocates nothing.

/** Maple: 5 lobes with teeth, as (degrees clockwise from up, radius) for the right half. */
const MAPLE_HALF: readonly [number, number][] = [
  [0, 0.52],
  [13, 0.3],
  [21, 0.36],
  [36, 0.16],
  [48, 0.33],
  [56, 0.29],
  [66, 0.49],
  [77, 0.3],
  [86, 0.34],
  [100, 0.19],
  [113, 0.14],
  [126, 0.3],
  [143, 0.15],
  [166, 0.1],
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

/** Autumn neons shared by the drifting leaves and the leaf litter, with their dark silhouette fills. */
export const LEAF_COLORS = ["#ffb02e", "#ff6a1a", "#ff2e4a", "#ffd84a"] as const;
export const LEAF_FILLS = LEAF_COLORS.map((c) => mix(c, "#000000", 0.7));

export const MAPLE = mapleOutline();
export const OAK = oakOutline();
/** Midrib + stem for each shape: x0, y0 (stem end), x1, y1 (rib end). */
const MAPLE_RIB = [0, 0.44, 0, -0.3] as const;
const OAK_RIB = [0, 0.46, 0, -0.38] as const;

/**
 * Add one leaf to the current path as its own closed subpath plus an open midrib.
 * `flip` scales across the leaf (negative mirrors it; near 0 it is edge-on, for tumbling),
 * `squash` flattens it vertically after rotating (for leaves lying on the floor).
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
): void {
  const pts = oak ? OAK : MAPLE;
  const rib = oak ? OAK_RIB : MAPLE_RIB;
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
  ctx.moveTo(x - rib[1] * sn, y + rib[1] * c * squash);
  ctx.lineTo(x - rib[3] * sn, y + rib[3] * c * squash);
}
