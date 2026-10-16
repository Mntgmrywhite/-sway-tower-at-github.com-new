import { hash, ink, oval, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import { INK, PALETTE, SHADOW } from "./colors";
import { fence } from "./fence";
import { rollingFields } from "./fields";
import { farmhouse } from "./house";
import { addLeaf, LEAF_COLORS } from "./leaves";
import { inkW, spot } from "./pen";
import { table } from "./table";
import { ORANGE_TREE, tree } from "./tree";
import { turkey } from "./turkey";

// The backyard on the lawn around the tower, with lots of open lawn: rolling patchwork
// hills on either side of the hollow, the farmhouse with its porch at the back left, a big
// orange tree with a swing at the back right letting go of its leaves, the Thanksgiving table
// set out in front with its mismatched chairs and a steaming pie, and the turkey yard on the
// right: one turkey behind the rail fence, a hen and her poult wandered out onto the lawn.
// Leaves lie about.
//
// Props stand on field rows (see `spot`): X in u from the center at the tower's depth, z the
// depth (3 = the tower's line). Props at or behind that line keep out of the tower's column;
// nearer ones stay low enough that they never rise past its floor line. Drawn back to front.

/** Farmhouse at the back left. */
const HOUSE = { X: -0.56, z: 4.5 } as const;
/** The big tree at the back right. */
const TREE = { X: 0.53, z: 4.2, size: 1 } as const;
/** The turkey yard's fence across the front right: one turkey inside, a hen and her poult
 * wandered out toward the table. */
const FENCE = { X0: 0.25, z0: 2.5, X1: 0.4, z1: 2.5, posts: 3 } as const;
/** Turkeys: X, z, size (turkey units in local units), facing, phase. */
const TURKEYS = [
  [0.355, 2.85, 0.1, -1, 0.0],
  [0.117, 1.95, 0.095, -1, 0.6],
  [0.222, 1.7, 0.058, -1, 1.7],
] as const;
/** The dinner table, front left. */
const TABLE = { X: -0.1, z: 1.62 } as const;

/** Leaves lying on the lawn: [X, z, angle, color, oak]. */
const LITTER = [
  [0.4, 3.1, 0.4, 0, 0],
  [0.5, 3.3, -1.1, 1, 1],
  [0.3, 3.25, 2.2, 2, 0],
  [0.06, 2.2, 0.9, 0, 0],
  [-0.05, 1.75, -0.5, 3, 0],
  [0.12, 1.62, 1.9, 1, 1],
  [-0.3, 2.3, 2.6, 2, 0],
  [-0.4, 2.0, -2.2, 0, 1],
  [0.36, 1.85, 1.2, 3, 0],
  [-0.4, 3.15, -0.7, 1, 1],
  [0.02, 1.95, 2.9, 2, 1],
  [-0.36, 3.6, 1.5, 3, 0],
  [0.22, 1.6, 0.3, 0, 0],
] as const;

function litter(ctx: Ctx, s: Scene, lw: number): void {
  for (let c = 0; c < LEAF_COLORS.length; c++) {
    ctx.beginPath();
    let any = false;
    for (const [X, z, ang, color, oak] of LITTER) {
      if (color !== c) continue;
      const p = spot(s, X, z);
      if (p.y > s.cssH + s.u * 0.1) continue;
      const rock = Math.sin(s.t * 1.7 + ang * 5) * 0.08;
      addLeaf(ctx, oak === 1, p.x, p.y, s.u * 0.04 * p.k, ang + rock, 1, 0.62, false);
      any = true;
    }
    if (!any) continue;
    ctx.fillStyle = LEAF_COLORS[c]!;
    ctx.fill();
    ink(ctx, Math.max(1, lw * 0.6), INK);
  }
}

/** Grass tufts across the lawn: [X, z]. */
const TUFTS = Array.from({ length: 46 }, (_, i) => [(hash(i + 700) - 0.5) * 1.5, 1.6 + hash(i + 760) * hash(i + 790) * 9] as const);
const TUFT = PALETTE.grassDark;

function tufts(ctx: Ctx, s: Scene): void {
  const left = s.baseX - s.u * 0.05;
  const right = s.baseX + s.baseW + s.u * 0.05;
  ctx.beginPath();
  for (const [X, z] of TUFTS) {
    const p = spot(s, X, z);
    const h = s.u * 0.014 * p.k;
    const w = h * 0.45;
    // Whole tufts only (none cut by the screen edges), and the tower's column clear above its
    // floor line.
    const reach = w * 1.4 + 1;
    if (p.y > s.cssH + 4 || p.x - reach < 0 || p.x + reach > s.cssW) continue;
    if (p.y - h < s.groundY && p.x + reach > left && p.x - reach < right) continue;
    ctx.moveTo(p.x - w, p.y);
    ctx.quadraticCurveTo(p.x - w, p.y - h * 0.5, p.x - w * 1.5, p.y - h * 0.8);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + w * 0.1, p.y - h);
    ctx.moveTo(p.x + w, p.y);
    ctx.quadraticCurveTo(p.x + w, p.y - h * 0.5, p.x + w * 1.5, p.y - h * 0.8);
  }
  ctx.strokeStyle = TUFT;
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Soft contact shadows: [X, z, half-width in u at the tower's depth]. */
const SHADOWS = [
  [HOUSE.X, HOUSE.z, 0.16],
  [TREE.X, TREE.z, 0.08],
  [TURKEYS[0][0], TURKEYS[0][1], 0.045],
  [TURKEYS[1][0], TURKEYS[1][1], 0.048],
  [TURKEYS[2][0], TURKEYS[2][1], 0.03],
  [TABLE.X, TABLE.z - 0.04, 0.13],
] as const;

function shadows(ctx: Ctx, s: Scene): void {
  ctx.beginPath();
  for (const [X, z, w] of SHADOWS) {
    const p = spot(s, X, z);
    oval(ctx, p.x, p.y, w * s.u * p.k, w * s.u * p.k * 0.16);
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();
}

export function backyard(ctx: Ctx, s: Scene): void {
  rollingFields(ctx, s);
  tufts(ctx, s);
  // Everything else stands near the tower; once that part of the lawn has dropped away, skip it.
  if (fieldY(s, 7) - s.u * 0.45 > s.cssH) return;
  const u = s.u;
  shadows(ctx, s);
  litter(ctx, s, inkW(s));

  let p = spot(s, HOUSE.X, HOUSE.z);
  farmhouse(ctx, s, p.x, p.y, u * p.k, inkW(s, p.k));
  p = spot(s, TREE.X, TREE.z);
  tree(ctx, s, p.x, p.y, u * p.k * TREE.size, inkW(s, p.k), ORANGE_TREE, 7, true);

  // The turkey in the yard, its fence, then the hen and her poult out on the lawn.
  for (let i = 0; i < TURKEYS.length; i++) {
    if (i === 1) fence(ctx, s, FENCE.X1, FENCE.z1, FENCE.X0, FENCE.z0, FENCE.posts, inkW(s, 1.2), 5);
    const [X, z, size, dir, phase] = TURKEYS[i]!;
    p = spot(s, X, z);
    turkey(ctx, s.t, p.x, p.y, size * u * p.k, dir, inkW(s, p.k * Math.min(1, size * 10)), phase);
  }
  p = spot(s, TABLE.X, TABLE.z);
  table(ctx, s.t, p.x, p.y, u * p.k, inkW(s, p.k));
}
