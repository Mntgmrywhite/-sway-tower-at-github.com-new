import { circle, ink, inkedLine, oval, roundRectPath, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  CORAL,
  GRASS,
  GRASS_LIGHT,
  GRASS_SHADE,
  INK,
  LEAF,
  LEAF_LIGHT,
  LEAF_SHADE,
  PEBBLE,
  PEBBLE_SHADE,
  ROOT,
  STONE,
  STONE_LIGHT,
  STONE_SHADE,
  STRATA,
  SUNNY,
  TRUNK,
  VINE,
  VINE_LEAF,
} from "./colors";
import { capPath, strata, undersidePath, type Band } from "./shapes";

// The home island the tower grows from. A flat cap of bright grass with a low stone plinth for
// the base block and a little round tree at the edge, and underneath, the signature:
// the island's striped underside (topsoil, sand, clay, umber, plum bedrock) with roots hanging
// from it and a few vines trailing over the lip. It does not bob: the tower stands on rock.
// A kite on a long string is tied to a stake at the left edge. Everything here is near: flat
// two-tone fills and one ink outline weight.

/** Island proportions, in u. */
const CAP_HW = 0.33;
const CAP_H = 0.034;
const UNDER_HW = 0.31;
const UNDER_D = 0.18;
/** How far the grass sits below the floor line (the plinth stands proud of it). */
const GRASS_DROP = 0.016;
const PLINTH_H = 0.028;

const BANDS: Band[] = STRATA.map((b, i) => ({ ...b, at: [0, 0.2, 0.42, 0.63, 0.82][i]! }));

/** Roots: anchor (x in half widths, y in depths, inside the underside), length (u), bend (u), fork. */
const ROOTS = [
  { x: -0.7, y: 0.42, len: 0.085, bend: -0.014, fork: true },
  { x: -0.4, y: 0.78, len: 0.05, bend: 0.01, fork: false },
  { x: -0.06, y: 0.97, len: 0.045, bend: -0.008, fork: false },
  { x: 0.26, y: 0.8, len: 0.06, bend: 0.012, fork: true },
  { x: 0.6, y: 0.4, len: 0.075, bend: 0.014, fork: false },
] as const;

/** Vines over the lip: x (half widths of the cap), length (u). */
const VINES = [
  { x: -0.86, len: 0.075 },
  { x: -0.52, len: 0.1 },
  { x: 0.7, len: 0.065 },
] as const;

/** Pebbles in the strata: x (half widths), y (depths), size (u). */
const PEBBLES = [
  { x: -0.55, y: 0.3, r: 0.009 },
  { x: 0.4, y: 0.27, r: 0.008 },
  { x: -0.18, y: 0.56, r: 0.01 },
  { x: 0.14, y: 0.75, r: 0.008 },
] as const;

/** Ink width up close. */
export function inkW(s: Scene): number {
  return Math.max(1.5, s.u * 0.0058);
}

/** Center line of the island: under the base block. */
function centerX(s: Scene): number {
  return s.baseW > 0 ? s.baseX + s.baseW / 2 : s.cssW / 2;
}

/** Where things stand on the island's grass, in u from its center line. */
const TREE_X = 0.29;
const STAKE_X = -0.3;

export function homeIsland(ctx: Ctx, s: Scene): void {
  kite(ctx, s);
  if (s.groundY - s.u * 0.13 > s.cssH) return;
  islandBody(ctx, s);
  islandTree(ctx, s);
  plinth(ctx, s, centerX(s), inkW(s));
}

/** The island itself: roots, the striped underside, vines over the lip, the grass cap. */
export function islandBody(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = centerX(s);
  const lw = inkW(s);
  const grassTop = s.groundY + u * GRASS_DROP;
  const underTop = grassTop + u * CAP_H * 0.7;
  const hw = u * UNDER_HW;
  const d = u * UNDER_D;
  roots(ctx, s, cx, underTop, hw, d, lw);
  undersidePath(ctx, cx, underTop, hw, d);
  ctx.save();
  ctx.clip();
  strata(ctx, cx, underTop, hw, d, BANDS);
  pebbles(ctx, s, cx, underTop, hw, d);
  ctx.restore();
  undersidePath(ctx, cx, underTop, hw, d);
  ink(ctx, lw, INK);
  vines(ctx, s, cx, grassTop + u * CAP_H, lw);
  cap(ctx, s, cx, grassTop, lw);
}

/** The little tree on the grass right of the plinth. */
export function islandTree(ctx: Ctx, s: Scene): void {
  const u = s.u;
  tree(ctx, s, centerX(s) + u * TREE_X, s.groundY + u * (GRASS_DROP + 0.004), inkW(s));
}

/** The kite on its string, tied to a stake at the island's left edge. */
export function kite(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (kiteSpot(s).y - u * 0.06 > s.cssH) return;
  const x = centerX(s) + u * STAKE_X;
  const grassTop = s.groundY + u * GRASS_DROP;
  const lw = inkW(s);
  kiteFlying(ctx, s, x, grassTop, lw);
  stake(ctx, s, x, grassTop, lw);
}

// ---------------------------------------------------------------- island body

function cap(ctx: Ctx, s: Scene, cx: number, top: number, lw: number): void {
  const u = s.u;
  const hw = u * CAP_HW;
  const h = u * CAP_H;
  // Shaded scallops, then the lit body shifted up inside them, then a bright top edge.
  capPath(ctx, cx, top, hw, h, 9);
  ctx.fillStyle = GRASS_SHADE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  capPath(ctx, cx, top - h * 0.32, hw, h, 9);
  ctx.fillStyle = GRASS;
  ctx.fill();
  ctx.fillStyle = GRASS_LIGHT;
  ctx.fillRect(cx - hw, top, hw * 2, h * 0.24);
  ctx.restore();
  capPath(ctx, cx, top, hw, h, 9);
  ink(ctx, lw, INK);
}

function pebbles(ctx: Ctx, s: Scene, cx: number, top: number, hw: number, d: number): void {
  const u = s.u;
  ctx.fillStyle = PEBBLE_SHADE;
  ctx.beginPath();
  for (const p of PEBBLES) oval(ctx, cx + p.x * hw, top + p.y * d, p.r * u * 1.3, p.r * u);
  ctx.fill();
  ctx.fillStyle = PEBBLE;
  ctx.beginPath();
  for (const p of PEBBLES) oval(ctx, cx + p.x * hw - p.r * u * 0.1, top + p.y * d - p.r * u * 0.25, p.r * u * 1.12, p.r * u * 0.72);
  ctx.fill();
}

/** One tapered root hanging from (x, y), `len` long, curling in an S and swinging its tip by `swing`. Continues the path. */
function rootPath(ctx: Ctx, x: number, y: number, len: number, w: number, bend: number, swing: number): void {
  const tx = x + bend * 0.4 + swing;
  const ty = y + len;
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w / 2 + bend, y + len * 0.35, x - w * 0.2 - bend, y + len * 0.7, tx, ty);
  ctx.bezierCurveTo(x + w * 0.2 - bend, y + len * 0.65, x + w / 2 + bend, y + len * 0.3, x + w / 2, y);
  ctx.closePath();
}

function roots(ctx: Ctx, s: Scene, cx: number, top: number, hw: number, d: number, lw: number): void {
  const u = s.u;
  ctx.beginPath();
  for (let i = 0; i < ROOTS.length; i++) {
    const r = ROOTS[i]!;
    const x = cx + r.x * hw;
    const y = top + r.y * d - u * 0.014;
    const swing = Math.sin(s.t * 0.8 + i * 1.7) * u * 0.003;
    const len = r.len * u + u * 0.014;
    rootPath(ctx, x, y, len, u * 0.0105, r.bend * u, swing);
    if (r.fork) {
      const fy = y + len * 0.42;
      const fx = x + r.bend * u * 0.25;
      rootPath(ctx, fx, fy, len * 0.42, u * 0.006, -r.bend * u * 1.2, swing * 0.6);
    }
  }
  ctx.fillStyle = ROOT;
  ctx.fill();
  ink(ctx, lw, INK);
  // Fill again so the outline only shows outside (where a fork crosses its root).
  ctx.fill();
}

function vines(ctx: Ctx, s: Scene, cx: number, y: number, lw: number): void {
  const u = s.u;
  const hw = u * CAP_HW;
  const w = Math.max(1.5, u * 0.005);
  ctx.beginPath();
  for (let i = 0; i < VINES.length; i++) {
    const v = VINES[i]!;
    const x = cx + v.x * hw;
    const len = v.len * u;
    const sway = Math.sin(s.t * 0.9 + i * 2.3) * u * 0.005;
    ctx.moveTo(x, y - u * 0.01);
    ctx.quadraticCurveTo(x - u * 0.012, y + len * 0.5, x + sway, y + len);
  }
  inkedLine(ctx, VINE, w, lw * 0.5, INK);
  // Leaves in pairs along each vine.
  ctx.beginPath();
  for (let i = 0; i < VINES.length; i++) {
    const v = VINES[i]!;
    const x = cx + v.x * hw;
    const len = v.len * u;
    const sway = Math.sin(s.t * 0.9 + i * 2.3) * u * 0.005;
    for (let k = 1; k <= 3; k++) {
      const f = k / 3.2;
      // Along the vine's curve (quadratic with the control point at mid height).
      const lx = (1 - f) * (1 - f) * x + 2 * f * (1 - f) * (x - u * 0.012) + f * f * (x + sway);
      const ly = y - u * 0.01 + (len + u * 0.01) * f;
      const side = k % 2 ? -1 : 1;
      oval(ctx, lx + side * u * 0.009, ly, u * 0.009, u * 0.005, side * 0.5);
    }
  }
  ctx.fillStyle = VINE_LEAF;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fill();
}

// ---------------------------------------------------------------- on top

/** A low stone plinth under the base block, standing proud of the grass. */
function plinth(ctx: Ctx, s: Scene, cx: number, lw: number): void {
  const u = s.u;
  const w = (s.baseW > 0 ? s.baseW : u * 0.4) * 1.1;
  const h = u * PLINTH_H;
  const x = cx - w / 2;
  const y = s.groundY;
  const r = h * 0.3;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = STONE_LIGHT;
  ctx.fillRect(x, y, w, h * 0.3);
  ctx.fillStyle = STONE_SHADE;
  ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
  ctx.fillRect(x + w * 0.33, y + h * 0.3, lw * 0.8, h * 0.42);
  ctx.fillRect(x + w * 0.67, y + h * 0.3, lw * 0.8, h * 0.42);
  ctx.restore();
  roundRectPath(ctx, x, y, w, h, r);
  ink(ctx, lw, INK);
}

/** A cel-shaded clump of leaves: shade, lit body shifted up, a highlight. `cs` is [x, y, r] fractions of r. */
function leaves(ctx: Ctx, x: number, y: number, r: number, cs: readonly (readonly [number, number, number])[], lw: number): void {
  ctx.beginPath();
  for (const [dx, dy, k] of cs) circle(ctx, x + dx * r, y + dy * r, k * r);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = LEAF_SHADE;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, k] of cs) circle(ctx, x + dx * r - k * r * 0.05, y + dy * r - k * r * 0.14, k * r * 0.88);
  ctx.fillStyle = LEAF;
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy, k] of cs) {
    if (k < 0.8) continue;
    oval(ctx, x + (dx - 0.3 * k) * r, y + (dy - 0.42 * k) * r, k * r * 0.3, k * r * 0.18, -0.5);
  }
  ctx.fillStyle = LEAF_LIGHT;
  ctx.fill();
}

const CROWN = [
  [-0.62, 0.1, 0.72],
  [0.6, 0.12, 0.7],
  [0, -0.35, 1],
] as const;

/**
 * A little round tree: a short trunk under a three-ball crown. It stays lower than the base
 * block, so the slider's first pass and the first drops never sweep over it.
 */
function tree(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const tw = u * 0.008;
  const th = u * 0.026;
  ctx.beginPath();
  ctx.moveTo(x - tw, y);
  ctx.lineTo(x - tw * 0.6, y - th);
  ctx.lineTo(x + tw * 0.6, y - th);
  ctx.lineTo(x + tw, y);
  ctx.closePath();
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ink(ctx, lw, INK);
  leaves(ctx, x, y - th - u * 0.004, u * 0.02, CROWN, lw);
}

// ---------------------------------------------------------------- kite

/** Where the kite flies, relative to the island: up on the left, out of the tower's way. */
const KITE = { x: 0, y: 0 };
function kiteSpot(s: Scene): typeof KITE {
  KITE.x = centerX(s) - s.u * 0.4 + Math.sin(s.t * 0.5) * s.u * 0.006;
  KITE.y = s.groundY - s.u * 0.5 + Math.sin(s.t * 0.37 + 1) * s.u * 0.01;
  return KITE;
}

/** The stake the kite string is tied to, at x. */
function stake(ctx: Ctx, s: Scene, x: number, top: number, lw: number): void {
  const u = s.u;
  roundRectPath(ctx, x - u * 0.004, top - u * 0.026, u * 0.008, u * 0.03, u * 0.003);
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ink(ctx, lw, INK);
}

/** A diamond kite in coral and sunflower with a bowed tail, fluttering on its string from (sx, top). */
function kiteFlying(ctx: Ctx, s: Scene, sx: number, top: number, lw: number): void {
  const u = s.u;
  const { x, y } = kiteSpot(s);
  const sy = top - u * 0.024;
  // The string sags a little between the stake and the kite.
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + x) / 2 + u * 0.03, (sy + y) / 2 + u * 0.05, x, y + u * 0.004);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.45);
  ctx.stroke();

  const tilt = -0.35 + Math.sin(s.t * 1.6) * 0.06;
  const w = u * 0.034;
  const h = u * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Tail: a wavy line with three bows, hanging from the bottom point.
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 1; i <= 6; i++) {
    const wave = Math.sin(s.t * 2.2 - i * 0.9) * u * 0.01;
    ctx.lineTo(wave, h + i * u * 0.016);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw * 0.45);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const k = 2 + i * 2;
    const by = h + k * u * 0.016;
    const bx = Math.sin(s.t * 2.2 - k * 0.9) * u * 0.01;
    const b = u * 0.008;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - b * 1.4, by - b);
    ctx.lineTo(bx - b * 1.4, by + b);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + b * 1.4, by - b);
    ctx.lineTo(bx + b * 1.4, by + b);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? SUNNY : CORAL;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
  }
  // The sail: four panels, coral and sunflower, crossed by its spars.
  const top2 = -h * 0.75;
  const mid = -h * 0.1;
  for (let q = 0; q < 4; q++) {
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(0, q < 2 ? top2 : h);
    ctx.lineTo(q % 2 ? w : -w, mid);
    ctx.closePath();
    ctx.fillStyle = q === 0 || q === 3 ? CORAL : SUNNY;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, top2);
  ctx.lineTo(w, mid);
  ctx.lineTo(0, h);
  ctx.lineTo(-w, mid);
  ctx.closePath();
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(0, top2);
  ctx.lineTo(0, h);
  ctx.moveTo(-w, mid);
  ctx.lineTo(w, mid);
  ink(ctx, lw * 0.5, INK);
  ctx.restore();
}
