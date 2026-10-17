import { circle, hash, ink, inkedLine, oval, roundRectPath, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import {
  BLUEBIRD,
  BLUEBIRD_SHADE,
  CORAL,
  CREAM,
  GEM,
  GEM_LIGHT,
  GEM_SHADE,
  GRASS,
  GRASS_LIGHT,
  GRASS_SHADE,
  INK,
  LEAF,
  LEAF_LIGHT,
  LEAF_SHADE,
  PEBBLE,
  PEBBLE_SHADE,
  PETAL,
  ROOF,
  ROOF_SHADE,
  ROOT,
  STONE,
  STONE_LIGHT,
  STONE_SHADE,
  STRATA,
  SUNNY,
  TRUNK,
  VINE,
  VINE_LEAF,
  WATER,
  WATER_LIGHT,
} from "./colors";
import { capPath, strata, undersidePath, type Band } from "./shapes";

// The home island the tower grows from. A flat cap of bright grass with tufts and daisies, a
// low stone plinth for the base block and a little round tree at the edge, and underneath, the
// signature: the island's striped underside (topsoil, sand, clay, umber, plum bedrock) with
// roots hanging from it, vines trailing over the lip, a cluster of crystals glinting in the
// bedrock and a spring spilling out of its side in a waterfall that falls all the way down into
// the cloud bank in front. It does not bob: the tower stands on rock. A kite on a long string is
// tied to a stake at the left edge, a bluebird perched on top of it; on the right a rope bridge
// crosses to a little islet with a birdhouse. Everything here is near: flat two-tone fills and
// one ink weight.

/** Island proportions, in u. */
const CAP_HW = 0.33;
export const CAP_H = 0.034;
export const UNDER_HW = 0.31;
export const UNDER_D = 0.18;
/** How far the grass sits below the floor line (the plinth stands proud of it). */
export const GRASS_DROP = 0.016;
const PLINTH_H = 0.028;

export const BANDS: Band[] = STRATA.map((b, i) => ({ ...b, at: [0, 0.2, 0.42, 0.63, 0.82][i]! }));

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
  { x: -0.72, len: 0.075 },
  { x: -0.52, len: 0.1 },
  { x: 0.7, len: 0.065 },
] as const;

/** Pebbles in the strata: x (half widths), y (depths), size (u). */
const PEBBLES = [
  { x: -0.55, y: 0.3, r: 0.009 },
  { x: 0.4, y: 0.27, r: 0.008 },
  { x: -0.18, y: 0.56, r: 0.01 },
  { x: 0.34, y: 0.6, r: 0.008 },
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
export const TREE_X = 0.29;
const STAKE_X = -0.3;

export function homeIsland(ctx: Ctx, s: Scene): void {
  kite(ctx, s);
  if (s.groundY - s.u * 0.13 > s.cssH) return;
  islet(ctx, s);
  waterfall(ctx, s);
  islandBody(ctx, s);
  islandTree(ctx, s);
  plinth(ctx, s, centerX(s), inkW(s));
}

/**
 * The island itself: roots, the striped underside with its pebbles and crystals, vines over the
 * lip, the grass cap with its tufts and daisies.
 */
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
  crystals(ctx, s, cx + hw * 0.1, underTop + d * 0.97, lw);
  ctx.restore();
  undersidePath(ctx, cx, underTop, hw, d);
  ink(ctx, lw, INK);
  glint(ctx, s, cx + hw * 0.1, underTop + d * 0.97);
  vines(ctx, s, cx, grassTop + u * CAP_H, lw);
  cap(ctx, s, cx, grassTop, lw);
  flowers(ctx, s, cx, grassTop);
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
  bluebird(ctx, s, x, grassTop - u * 0.026, lw);
}

/** Seconds between the bluebird's dips, and how long one lasts (the first comes as the scene starts). */
export const DIP_EVERY = 4.6;
export const DIP_TIME = 0.5;

/** How far the bluebird has its head down at scene time `t` (0..1): a quick dip at the start of every DIP_EVERY. */
export function birdDip(t: number): number {
  const cycle = t % DIP_EVERY;
  return cycle < DIP_TIME ? Math.sin((cycle / DIP_TIME) * Math.PI) : 0;
}

/**
 * A bluebird perched on top of the kite's stake at (x, y), facing out: a round blue body with
 * a cream breast, a sunny beak and a dot of an eye. Now and then it dips its head.
 */
function bluebird(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const r = u * 0.0105;
  const dip = birdDip(s.t);
  const bx = x;
  const by = y - r * 0.85;
  // Tail, body, head.
  ctx.beginPath();
  ctx.moveTo(bx + r * 0.5, by + r * 0.1);
  ctx.lineTo(bx + r * 1.6, by + r * 0.5);
  ctx.lineTo(bx + r * 1.45, by + r * 0.9);
  ctx.lineTo(bx + r * 0.6, by + r * 0.75);
  ctx.closePath();
  ctx.fillStyle = BLUEBIRD_SHADE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  oval(ctx, bx, by + r * 0.2, r * 0.95, r * 0.78);
  const hx = bx - r * 0.55 - dip * r * 0.25;
  const hy = by - r * 0.55 + dip * r * 0.45;
  circle(ctx, hx, hy, r * 0.58);
  ctx.fillStyle = BLUEBIRD;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  oval(ctx, bx - r * 0.35, by + r * 0.4, r * 0.45, r * 0.4, -0.3);
  ctx.fill();
  ctx.fillStyle = BLUEBIRD_SHADE;
  ctx.beginPath();
  oval(ctx, bx + r * 0.25, by + r * 0.1, r * 0.5, r * 0.3, 0.4);
  ctx.fill();
  // Beak and eye.
  ctx.fillStyle = SUNNY;
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.5, hy - r * 0.08);
  ctx.lineTo(hx - r * 0.98, hy + r * 0.08);
  ctx.lineTo(hx - r * 0.48, hy + r * 0.2);
  ctx.closePath();
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, hx - r * 0.18, hy - r * 0.1, r * 0.13);
  ctx.fill();
}

// ---------------------------------------------------------------- island body

export function cap(ctx: Ctx, s: Scene, cx: number, top: number, lw: number): void {
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

export function roots(ctx: Ctx, s: Scene, cx: number, top: number, hw: number, d: number, lw: number): void {
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

export function vines(ctx: Ctx, s: Scene, cx: number, y: number, lw: number): void {
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


/** Crystals in the bedrock: x offset (u), length (u), lean (radians from straight up). */
const CRYSTALS = [
  [-0.014, 0.022, -0.55],
  [0, 0.032, -0.05],
  [0.014, 0.02, 0.5],
] as const;

/** A geode in the bedrock: a cluster of crystals growing up from (x, y), fanning out. */
export function crystals(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const w = u * 0.0075;
  // Each shard: base at (bx, y - w) pointing along its lean, as a five-point prism; `p` maps
  // (along, side) to the screen.
  const each = (draw: (p: (along: number, side: number) => readonly [number, number], L: number) => void): void => {
    for (const [dx, len, lean] of CRYSTALS) {
      const bx = x + dx * u;
      const sn = Math.sin(lean + Math.PI);
      const c = Math.cos(lean + Math.PI);
      draw((along, side) => [bx + sn * along + c * side, y - w + c * along - sn * side] as const, len * u);
    }
  };
  const poly = (pts: (readonly [number, number])[]) => {
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.closePath();
  };
  ctx.beginPath();
  each((p, L) => poly([p(-w, -w), p(L * 0.75, -w), p(L, 0), p(L * 0.75, w), p(-w, w)]));
  ctx.fillStyle = GEM;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fill();
  // The lit facet down one side, the shaded tip on the other.
  ctx.beginPath();
  each((p, L) => poly([p(-w, -w * 0.1), p(L * 0.75, -w * 0.1), p(L, 0), p(L * 0.75, -w), p(-w, -w)]));
  ctx.fillStyle = GEM_LIGHT;
  ctx.fill();
  ctx.beginPath();
  each((p, L) => poly([p(L * 0.75, w), p(L, 0), p(L * 0.75, w * 0.35)]));
  ctx.fillStyle = GEM_SHADE;
  ctx.fill();
}

/** Seconds between glints on the crystals, and how long one flashes (the first comes as the scene starts). */
export const GLINT_EVERY = 3.4;
export const GLINT_TIME = 0.5;

/** How far through its flash a glint is at scene time `t` (0..1), or -1 between glints. */
export function glintPhase(t: number): number {
  const n = Math.floor(t / GLINT_EVERY);
  const k = (t - n * GLINT_EVERY) / GLINT_TIME;
  return k < 0 || k > 1 ? -1 : k;
}

/** Now and then a glint flashes on a crystal's tip. */
function glint(ctx: Ctx, s: Scene, x: number, y: number): void {
  const k = glintPhase(s.t);
  if (k < 0) return;
  const n = Math.floor(s.t / GLINT_EVERY);
  const [dx, len, lean] = CRYSTALS[n % CRYSTALS.length]!;
  const u = s.u;
  const gx = x + dx * u + Math.sin(lean) * len * u * 0.8;
  const gy = y - Math.cos(lean) * len * u * 0.8 - u * 0.0075;
  const r = u * 0.014 * Math.sin(k * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  const w = r * 0.22;
  ctx.moveTo(gx, gy - r);
  ctx.quadraticCurveTo(gx + w, gy - w, gx + r, gy);
  ctx.quadraticCurveTo(gx + w, gy + w, gx, gy + r);
  ctx.quadraticCurveTo(gx - w, gy + w, gx - r, gy);
  ctx.quadraticCurveTo(gx - w, gy - w, gx, gy - r);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- the waterfall

/**
 * The cloud bank's line: the front row's puffs sit on it, solid cloud below (front.ts). It
 * drops away faster than the tower as the camera climbs (parallax 1.6, like the base band it
 * covers), so it only frames the start.
 */
export function bankLine(s: Scene): number {
  // The base band's top edge (its grass tips reach a little above it), a hair higher.
  return layerGround(s, 1.6) + s.u * 0.354;
}

/** How far below the bank's line the waterfall reaches, out of sight in the solid cloud (u). */
const INTO_BANK = 0.03;
/** How fast the streaks slide down the falling water (u/s), and how far apart they come (u). */
const STREAK_SPEED = 0.075;
const STREAK_GAP = 0.055;

/** Where the waterfall's water leaves the island: the crack in its left side. */
function springMouth(s: Scene): { x: number; y: number } {
  const u = s.u;
  const underTop = s.groundY + u * (GRASS_DROP + CAP_H * 0.7);
  return { x: centerX(s) - u * UNDER_HW * 0.97, y: underTop + u * UNDER_D * 0.16 };
}

/**
 * Where the waterfall's water ends: behind the cloud bank in front, so it pours into the clouds;
 * once the bank has dropped away below the screen (the camera climbing), past the screen's bottom.
 */
export function fallBottom(s: Scene): number {
  return Math.min(bankLine(s) + s.u * INTO_BANK, s.cssH + s.u * 0.02);
}

/**
 * A spring spilling out of a crack in the island's left side: a little stream gushing out to the
 * left, then falling all the way down into the cloud bank in front, fanning out a little as it
 * goes, a lighter core where it gushes and streaks sliding down it. Drawn behind the island.
 */
export function waterfall(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s) * 0.8;
  const { x, y } = springMouth(s);
  const w = u * 0.012;
  const out = u * 0.032;
  const top = y + u * 0.03;
  const bottom = fallBottom(s);
  if (bottom <= top) return;
  const wob = Math.sin(s.t * 2.2) * u * 0.0015;
  const fx = x - out;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.4, y - w * 0.75);
  ctx.bezierCurveTo(x - out * 0.45, y - w * 1.1, fx - w * 0.75, y - w * 0.2, fx - w * 0.55, top);
  // Down the left edge, fanning out over the first stretch, then down into the bank.
  ctx.bezierCurveTo(fx - w * 0.6 + wob, top + u * 0.05, fx - w * 1.05, top + u * 0.09, fx - w * 1.05, Math.min(bottom, top + u * 0.13));
  ctx.lineTo(fx - w * 1.05, bottom);
  ctx.lineTo(fx + w * 1.3, bottom);
  ctx.lineTo(fx + w * 1.3, Math.min(bottom, top + u * 0.13));
  ctx.bezierCurveTo(fx + w * 1.3, top + u * 0.09, fx + w * 0.75 - wob, top + u * 0.05, fx + w * 0.55, top + u * 0.004);
  ctx.bezierCurveTo(fx + w * 0.5, y + w * 0.4, x - out * 0.3, y + w * 0.3, x + w * 0.4, y + w * 0.75);
  ctx.closePath();
  ctx.fillStyle = WATER;
  ctx.fill();
  ink(ctx, lw, INK);
  // A lighter core where it gushes out.
  ctx.fillStyle = WATER_LIGHT;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(x - out * 0.2, y - w * 0.35);
  ctx.quadraticCurveTo(fx, y - w * 0.3, fx - w * 0.05, top + u * 0.006);
  ctx.lineTo(fx + w * 0.2, top + u * 0.006);
  ctx.quadraticCurveTo(fx + w * 0.3, y, x - out * 0.2, y + w * 0.05);
  ctx.closePath();
  ctx.fill();
  // Streaks sliding down the fall in three lanes that spread with it, each fading in as it
  // leaves the lip, so none pops; at the bottom they slide on behind the bank.
  const gap = u * STREAK_GAP;
  const sh = u * 0.018;
  for (let i = 0; i < 3; i++) {
    const phase = (s.t * u * STREAK_SPEED + (i * gap) / 3 + hash(i + 2300) * gap * 0.3) % gap;
    for (let sy = top + phase; sy < bottom; sy += gap) {
      const f = Math.min(1, (sy - top) / (u * 0.09));
      ctx.globalAlpha = Math.min(1, (sy - top) / (u * 0.025)) * 0.85;
      ctx.fillRect(fx + w * (0.05 + (i - 1) * (0.3 + 0.35 * f)) - w * 0.11, sy, w * 0.22, Math.min(sh, bottom - sy));
    }
  }
  ctx.globalAlpha = 1;
}

/** Grass tufts and daisies along the cap's top, clear of the plinth: x (u from the center line). */
const TUFTS = [-0.325, -0.28, -0.24, 0.235, 0.27, 0.315] as const;
const DAISIES = [
  [-0.258, 1],
  [-0.316, 0.8],
  [0.248, 0.9],
  [0.322, 1],
] as const;

/** Tufts of brighter grass and a few daisies standing on the cap's top edge at `top`. */
export function flowers(ctx: Ctx, s: Scene, cx: number, top: number): void {
  const u = s.u;
  ctx.fillStyle = GRASS_LIGHT;
  ctx.beginPath();
  for (let i = 0; i < TUFTS.length; i++) {
    const x = cx + TUFTS[i]! * u;
    const h = u * (0.009 + hash(i + 2100) * 0.004);
    const b = u * 0.004;
    for (const [dx, lean] of [
      [-b, -0.5],
      [0, 0],
      [b, 0.5],
    ] as const) {
      ctx.moveTo(x + dx - b * 0.6, top + u * 0.002);
      ctx.lineTo(x + dx + lean * b, top - h * (dx === 0 ? 1 : 0.75));
      ctx.lineTo(x + dx + b * 0.6, top + u * 0.002);
      ctx.closePath();
    }
  }
  ctx.fill();
  // Daisies: a stem, five white petals round a sunny middle.
  ctx.strokeStyle = GRASS_SHADE;
  ctx.lineWidth = Math.max(1, u * 0.0022);
  ctx.beginPath();
  for (const [dx, k] of DAISIES) {
    const x = cx + dx * u;
    ctx.moveTo(x, top + u * 0.003);
    ctx.lineTo(x, top - u * 0.008 * k);
  }
  ctx.stroke();
  ctx.fillStyle = PETAL;
  ctx.beginPath();
  for (const [dx, k] of DAISIES) {
    const x = cx + dx * u;
    const y = top - u * 0.009 * k;
    const r = u * 0.0042 * k;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      oval(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.5, a);
    }
  }
  ctx.fill();
  ctx.fillStyle = SUNNY;
  ctx.beginPath();
  for (const [dx, k] of DAISIES) circle(ctx, cx + dx * u, top - u * 0.009 * k, u * 0.0028 * k);
  ctx.fill();
}

// ---------------------------------------------------------------- the islet and its bridge

/** The islet: center (u right of the island's center line), cap half width and how far its grass sits below the floor (u). */
export const ISLET = { x: 0.43, hw: 0.045, drop: 0.05 } as const;
const ISLET_BANDS: Band[] = [BANDS[0]!, { ...BANDS[1]!, at: 0.3 }, { ...BANDS[2]!, at: 0.6 }, { ...BANDS[4]!, at: 0.85 }];

/**
 * A little islet off the home island's right edge, a step lower: its own grass cap and striped
 * underside with two roots, a birdhouse on a post, and a rope bridge sagging across to it.
 */
export function islet(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const lw = inkW(s);
  const cx = centerX(s);
  const ix = cx + ISLET.x * u;
  const top = s.groundY + ISLET.drop * u;
  const hw = ISLET.hw * u;
  const capH = u * 0.02;
  const underTop = top + capH * 0.7;
  const d = u * 0.065;
  // Two small roots.
  ctx.beginPath();
  for (const [rx, ry, len] of [
    [-0.4, 0.55, 0.03],
    [0.3, 0.75, 0.024],
  ] as const) {
    const x = ix + rx * hw;
    const y = underTop + ry * d - u * 0.006;
    const sw = Math.sin(s.t * 0.8 + rx * 5) * u * 0.002;
    ctx.moveTo(x - u * 0.004, y);
    ctx.quadraticCurveTo(x - u * 0.004, y + len * u * 0.6, x + sw, y + len * u);
    ctx.quadraticCurveTo(x + u * 0.004, y + len * u * 0.5, x + u * 0.004, y);
    ctx.closePath();
  }
  ctx.fillStyle = ROOT;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fill();
  undersidePath(ctx, ix, underTop, hw * 0.94, d, -1);
  ctx.save();
  ctx.clip();
  strata(ctx, ix, underTop, hw, d, ISLET_BANDS);
  ctx.restore();
  undersidePath(ctx, ix, underTop, hw * 0.94, d, -1);
  ink(ctx, lw, INK);
  // The rope bridge, from the home island's grass to the islet's.
  bridge(ctx, s, cx + u * (CAP_HW - 0.002), s.groundY + u * (GRASS_DROP + 0.008), ix - hw + u * 0.008, top + u * 0.006, lw);
  capPath(ctx, ix, top, hw, capH, 4);
  ctx.fillStyle = GRASS_SHADE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  capPath(ctx, ix, top - capH * 0.32, hw, capH, 4);
  ctx.fillStyle = GRASS;
  ctx.fill();
  ctx.fillStyle = GRASS_LIGHT;
  ctx.fillRect(ix - hw, top, hw * 2, capH * 0.24);
  ctx.restore();
  capPath(ctx, ix, top, hw, capH, 4);
  ink(ctx, lw, INK);
  birdhouse(ctx, s, ix + hw * 0.25, top + u * 0.002, lw);
}

/** A rope bridge between two grass edges: a sagging deck of planks under a hand rope. */
function bridge(ctx: Ctx, s: Scene, x0: number, y0: number, x1: number, y1: number, lw: number): void {
  const u = s.u;
  const sag = u * 0.014;
  const at = (k: number, lift: number) => {
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k + sag * 4 * k * (1 - k) - lift;
    return [x, y] as const;
  };
  // Planks hang from the deck rope.
  ctx.beginPath();
  const n = 5;
  for (let i = 1; i < n; i++) {
    const [x, y] = at(i / n, 0);
    ctx.rect(x - u * 0.0035, y - u * 0.002, u * 0.007, u * 0.008);
  }
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Ropes: the deck and the hand rope, with two uprights at each end.
  ctx.beginPath();
  for (const lift of [0, u * 0.016]) {
    const [ax, ay] = at(0, lift);
    ctx.moveTo(ax, ay);
    for (let i = 1; i <= 8; i++) {
      const [x, y] = at(i / 8, lift);
      ctx.lineTo(x, y);
    }
  }
  for (const k of [0, 1]) {
    const [x, y] = at(k, 0);
    ctx.moveTo(x, y + u * 0.002);
    ctx.lineTo(x, y - u * 0.019);
  }
  inkedLine(ctx, CREAM, Math.max(1, u * 0.0025), lw * 0.45, INK);
}

/** A birdhouse on a post standing at (x, y): a cream box with a round door under a red roof. */
function birdhouse(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
  const u = s.u;
  const postH = u * 0.03;
  roundRectPath(ctx, x - u * 0.003, y - postH, u * 0.006, postH, u * 0.002);
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  const w = u * 0.022;
  const h = u * 0.018;
  const by = y - postH - h;
  roundRectPath(ctx, x - w / 2, by, w, h, u * 0.002);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.fillStyle = STONE_SHADE;
  ctx.fillRect(x + w * 0.2, by, w * 0.3, h);
  roundRectPath(ctx, x - w / 2, by, w, h, u * 0.002);
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.68, by + u * 0.002);
  ctx.lineTo(x, by - h * 0.62);
  ctx.lineTo(x + w * 0.68, by + u * 0.002);
  ctx.closePath();
  ctx.fillStyle = ROOF;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = ROOF_SHADE;
  ctx.fillRect(x, by - h, w, h * 1.2);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.68, by + u * 0.002);
  ctx.lineTo(x, by - h * 0.62);
  ctx.lineTo(x + w * 0.68, by + u * 0.002);
  ctx.closePath();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, x - w * 0.08, by + h * 0.45, u * 0.0035);
  ctx.fill();
}

// ---------------------------------------------------------------- on top

/** A low stone plinth under the base block, standing proud of the grass. */
export function plinth(ctx: Ctx, s: Scene, cx: number, lw: number): void {
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
export function tree(ctx: Ctx, s: Scene, x: number, y: number, lw: number): void {
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
