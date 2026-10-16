import { alpha, hash, mix, neonShape, neonStroke, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { addLeaf, LEAF_COLORS, LEAF_FILLS } from "./leaves";

// Harvest props on the neon floor, beside the tower: a scarecrow rising out of hay bales on
// the left, corn shocks and a pile of pumpkins and gourds on the right. Props are placed by
// floor depth so they sit on the grid's own perspective: z = 3 is the tower's row (groundY),
// smaller z is nearer the viewer (lower on screen, bigger, and dropping away faster on a climb).
// Paths are built in each prop's local units (1 = u at that depth) and stroked in screen space.

const HAY_RIM = "#ffc23a";
const HAY_FILL = "#2a1705";
const HAY_TOP = "#3d2507";
const TWINE = "#ff3b4e";
const PUMPKIN = "#ff7a1a";
const STEM = "#a8e04a";
const LITTER = "#ff6a1a";
const CORN_RIM = "#ffd24a";

// Constant detail positions in prop units, hoisted so drawing allocates nothing per frame.
const TWINE_X = [-0.045, 0.045] as const;
/** Corn tassels: tip x, tip y, control x, control y (all from the tie). */
const TASSELS = [
  [-0.075, -0.33, -0.03, -0.4],
  [-0.045, -0.4, -0.02, -0.42],
  [0.0, -0.44, -0.006, -0.4],
  [0.05, -0.41, 0.022, -0.43],
  [0.08, -0.34, 0.035, -0.41],
] as const;
const STALKS = [-0.7, -0.35, 0, 0.35, 0.7] as const;
/** Hanging corn leaves: root x, root y, side, length. */
const HANGING = [
  [-0.045, -0.2, -1, 0.09],
  [0.04, -0.23, 1, 0.085],
  [-0.072, -0.085, -1, 0.075],
  [0.068, -0.1, 1, 0.08],
] as const;
const PLAID_X = [-0.11, -0.025, 0.025, 0.11] as const;
const SIDES = [-1, 1] as const;
const CUFF_FAN = [-0.5, 0, 0.5] as const;
const ANKLE_FAN = [-0.4, 0.4] as const;
const EYES_X = [-0.016, 0.016] as const;

/** Dark silhouette fill for a neon rim color, memoized so frames don't re-mix colors. */
const darkCache = new Map<string, string>();
function dark(rim: string): string {
  let d = darkCache.get(rim);
  if (d === undefined) {
    d = mix(rim, "#000000", 0.78);
    darkCache.set(rim, d);
  }
  return d;
}

/** Screen position and scale of floor point X (u, from screen center, at the tower's depth) at depth z. */
const at = { x: 0, y: 0, k: 1 };
function place(s: Scene, X: number, z: number): typeof at {
  at.k = 3 / z;
  at.y = s.horizonY + (s.groundY - s.horizonY) * at.k;
  at.x = s.cssW / 2 + X * s.u * at.k;
  return at;
}

/** Start a path in local prop units; call ctx.restore() before stroking in screen space. */
function local(ctx: Ctx, x: number, y: number, sc: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.beginPath();
}

// Straw texture dashes on a bale face, as fractions of its width/height.
const STRAW = Array.from({ length: 9 }, (_, i) => [hash(i + 400) * 0.8 + 0.06, hash(i + 420) * 0.75 + 0.15] as const);

/** Square hay bale, base centered at (x, y). `lean` tilts the top face toward the vanishing point. */
function hayBale(ctx: Ctx, x: number, y: number, sc: number, lw: number, lean: number): void {
  const w = 0.17;
  const h = 0.085;
  const d = 0.028;
  const dx = lean * d * 0.7;
  local(ctx, x, y, sc);
  ctx.moveTo(-w / 2, -h);
  ctx.lineTo(-w / 2 + dx, -h - d);
  ctx.lineTo(w / 2 + dx, -h - d);
  ctx.lineTo(w / 2, -h);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, HAY_TOP, HAY_RIM, lw * 0.8);

  local(ctx, x, y, sc);
  ctx.rect(-w / 2, -h, w, h);
  ctx.restore();
  neonShape(ctx, HAY_FILL, HAY_RIM, lw);

  local(ctx, x, y, sc);
  for (const [fx, fy] of STRAW) {
    const sx = -w / 2 + fx * w;
    const sy = -h + fy * h;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * 0.12, sy - h * 0.06);
  }
  ctx.restore();
  ctx.strokeStyle = alpha(HAY_RIM, 0.4);
  ctx.lineWidth = Math.max(0.7, lw * 0.5);
  ctx.stroke();

  local(ctx, x, y, sc);
  for (const tx of TWINE_X) {
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx, -h);
    ctx.lineTo(tx + dx, -h - d);
  }
  ctx.restore();
  neonStroke(ctx, TWINE, lw * 0.55, 2.2);
}

/** Pumpkin of radius r (local units) sitting with its base at (x, y). */
function pumpkin(ctx: Ctx, x: number, y: number, sc: number, lw: number, r: number, rim: string, tilt: number): void {
  const ry = r * 0.74;
  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  oval(ctx, 0, -ry, r, ry);
  ctx.restore();
  neonShape(ctx, dark(rim), rim, lw);

  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  oval(ctx, 0, -ry, r * 0.42, ry * 0.98);
  ctx.moveTo(0, -ry * 1.98);
  ctx.lineTo(0, -ry * 0.04);
  ctx.restore();
  ctx.strokeStyle = alpha(rim, 0.55);
  ctx.lineWidth = Math.max(0.7, lw * 0.6);
  ctx.stroke();

  local(ctx, x, y, sc);
  ctx.rotate(tilt);
  ctx.moveTo(-r * 0.05, -ry * 1.9);
  ctx.quadraticCurveTo(-r * 0.02, -ry * 2.3, r * 0.2, -ry * 2.4);
  ctx.restore();
  neonStroke(ctx, STEM, lw * 1.1, 2.4);
}

/** Crookneck squash standing up: a round bulb with a neck curling over at the top. */
function gourd(ctx: Ctx, x: number, y: number, sc: number, lw: number, rim: string): void {
  local(ctx, x, y, sc);
  ctx.moveTo(-0.042, -0.03);
  ctx.bezierCurveTo(-0.046, 0.006, 0.046, 0.006, 0.042, -0.03);
  ctx.bezierCurveTo(0.04, -0.058, 0.014, -0.066, 0.013, -0.092);
  ctx.quadraticCurveTo(0.014, -0.118, 0.036, -0.124);
  ctx.quadraticCurveTo(0.046, -0.136, 0.03, -0.14);
  ctx.quadraticCurveTo(-0.008, -0.136, -0.012, -0.094);
  ctx.bezierCurveTo(-0.014, -0.066, -0.04, -0.058, -0.042, -0.03);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, dark(rim), rim, lw * 0.85);
  local(ctx, x, y, sc);
  ctx.moveTo(0.036, -0.134);
  ctx.lineTo(0.05, -0.142);
  ctx.restore();
  neonStroke(ctx, STEM, lw * 0.9, 2.2);
}

/** Corn shock: a teepee of stalks tied near the top, tassels fanning out, dry leaves hanging off. */
function cornShock(ctx: Ctx, x: number, y: number, sc: number, lw: number, phase: number): void {
  const stir = 0.006 * Math.sin(phase);
  // Tassels fountain out of the tie, behind the bundle.
  local(ctx, x, y, sc);
  for (const [tx, ty, cx, cy] of TASSELS) {
    ctx.moveTo(0, -0.29);
    ctx.quadraticCurveTo(cx, cy, tx + stir, ty);
  }
  ctx.restore();
  neonStroke(ctx, CORN_RIM, lw * 0.75, 2.4);

  local(ctx, x, y, sc);
  ctx.moveTo(-0.1, 0);
  ctx.quadraticCurveTo(-0.07, -0.15, -0.016, -0.3);
  ctx.lineTo(0.016, -0.3);
  ctx.quadraticCurveTo(0.07, -0.15, 0.1, 0);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, "#1f1606", CORN_RIM, lw);

  // Stalks converging on the tie.
  local(ctx, x, y, sc);
  for (const f of STALKS) {
    ctx.moveTo(f * 0.1, 0);
    ctx.quadraticCurveTo(f * 0.06, -0.16, f * 0.016, -0.3);
  }
  ctx.restore();
  ctx.strokeStyle = alpha(CORN_RIM, 0.42);
  ctx.lineWidth = Math.max(0.7, lw * 0.55);
  ctx.stroke();

  // Long dry leaves hanging off the sides, stirring in the wind.
  local(ctx, x, y, sc);
  for (const [rx, ry, side, len] of HANGING) {
    const tx = rx + side * len + stir;
    const ty = ry + len * 0.75;
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + side * len * 0.7, ry - len * 0.35, tx, ty);
    ctx.quadraticCurveTo(rx + side * len * 0.55, ry - len * 0.05, rx, ry + len * 0.16);
    ctx.closePath();
  }
  ctx.restore();
  neonShape(ctx, "#2a1d07", CORN_RIM, lw * 0.6);

  local(ctx, x, y, sc);
  ctx.moveTo(-0.026, -0.3);
  ctx.lineTo(0.026, -0.3);
  ctx.restore();
  neonStroke(ctx, TWINE, lw * 0.9, 2.2);
}

/** Ears of corn leaning on a shock: center x, center y, half-width, half-length, lean. */
const EARS = [
  [-0.02, -0.045, 0.016, 0.05, -0.35],
  [0.015, -0.042, 0.015, 0.046, 0.25],
] as const;
/** Kernel rows across each ear, as fractions of its half-length. */
const KERNEL_ROWS = [-0.5, -0.1, 0.3] as const;

function cornEars(ctx: Ctx, x: number, y: number, sc: number, lw: number): void {
  local(ctx, x, y, sc);
  for (const [ex, ey, rx, ry, rot] of EARS) oval(ctx, ex, ey, rx, ry, rot);
  ctx.restore();
  neonShape(ctx, "#2e2105", "#ffe04a", lw * 0.8);

  local(ctx, x, y, sc);
  for (const [ex, ey, rx, ry, rot] of EARS) {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    for (const f of KERNEL_ROWS) {
      const half = rx * 0.8 * Math.sqrt(1 - f * f);
      const px = ex - sn * f * ry;
      const py = ey + c * f * ry;
      ctx.moveTo(px - c * half, py - sn * half);
      ctx.lineTo(px + c * half, py + sn * half);
    }
  }
  ctx.restore();
  ctx.strokeStyle = alpha("#ffe04a", 0.55);
  ctx.lineWidth = Math.max(0.6, lw * 0.5);
  ctx.stroke();
}

/** Scarecrow on a post, base where the post enters the hay at (x, y). */
function scarecrow(ctx: Ctx, x: number, y: number, sc: number, lw: number, t: number): void {
  const flutter = Math.sin(t * 2.3) * 0.004;
  // Post
  local(ctx, x, y, sc);
  ctx.rect(-0.008, -0.37, 0.016, 0.37);
  ctx.restore();
  neonShape(ctx, "#1a0d06", "#8a4a22", lw * 0.6);

  // Overalls: two legs hanging from the waist.
  local(ctx, x, y, sc);
  ctx.moveTo(-0.046, -0.2);
  ctx.lineTo(-0.05 - flutter, -0.085);
  ctx.lineTo(-0.012, -0.085);
  ctx.lineTo(0, -0.17);
  ctx.lineTo(0.012, -0.085);
  ctx.lineTo(0.05 + flutter, -0.085);
  ctx.lineTo(0.046, -0.2);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, "#0b1030", "#5f8dff", lw);

  // Shirt with sleeves along the crossbar, ragged cuffs.
  local(ctx, x, y, sc);
  ctx.moveTo(-0.05, -0.318);
  ctx.lineTo(-0.15, -0.31);
  ctx.lineTo(-0.162, -0.3 + flutter);
  ctx.lineTo(-0.152, -0.29);
  ctx.lineTo(-0.16, -0.278 + flutter);
  ctx.lineTo(-0.145, -0.272);
  ctx.lineTo(-0.05, -0.265);
  ctx.lineTo(-0.048, -0.195);
  ctx.lineTo(0.048, -0.195);
  ctx.lineTo(0.05, -0.265);
  ctx.lineTo(0.145, -0.272);
  ctx.lineTo(0.16, -0.278 - flutter);
  ctx.lineTo(0.152, -0.29);
  ctx.lineTo(0.162, -0.3 - flutter);
  ctx.lineTo(0.15, -0.31);
  ctx.lineTo(0.05, -0.318);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, "#2a060c", "#ff3b4e", lw);

  // Plaid hints and straw tufts at the cuffs, waist and ankles.
  local(ctx, x, y, sc);
  for (const px of PLAID_X) {
    ctx.moveTo(px, -0.312);
    ctx.lineTo(px, px * px > 0.005 ? -0.27 : -0.2);
  }
  ctx.moveTo(-0.048, -0.24);
  ctx.lineTo(0.048, -0.24);
  ctx.restore();
  ctx.strokeStyle = alpha("#ff3b4e", 0.45);
  ctx.lineWidth = Math.max(0.6, lw * 0.5);
  ctx.stroke();

  local(ctx, x, y, sc);
  for (const side of SIDES) {
    for (const a of CUFF_FAN) {
      ctx.moveTo(side * 0.158, -0.29);
      ctx.lineTo(side * (0.158 + 0.024 * Math.cos(a)), -0.29 + 0.024 * Math.sin(a) + flutter);
    }
    for (const a of ANKLE_FAN) {
      ctx.moveTo(side * 0.032, -0.085);
      ctx.lineTo(side * 0.032 + 0.02 * Math.sin(a), -0.085 + 0.022 * Math.cos(a));
    }
  }
  ctx.restore();
  neonStroke(ctx, HAY_RIM, lw * 0.55, 2.2);

  // Burlap head with a stitched face.
  local(ctx, x, y, sc);
  oval(ctx, 0, -0.358, 0.04, 0.044);
  ctx.restore();
  neonShape(ctx, "#2b1a0a", "#ffb35a", lw);
  local(ctx, x, y, sc);
  for (const ex of EYES_X) {
    ctx.moveTo(ex - 0.008, -0.372);
    ctx.lineTo(ex + 0.008, -0.358);
    ctx.moveTo(ex + 0.008, -0.372);
    ctx.lineTo(ex - 0.008, -0.358);
  }
  ctx.moveTo(-0.02, -0.34);
  for (let i = 1; i <= 4; i++) ctx.lineTo(-0.02 + i * 0.01, i % 2 ? -0.334 : -0.341);
  ctx.restore();
  neonStroke(ctx, "#ffb35a", lw * 0.45, 2);

  // Straw hat
  local(ctx, x, y, sc);
  ctx.moveTo(-0.034, -0.392);
  ctx.lineTo(-0.024, -0.435);
  ctx.quadraticCurveTo(0, -0.448, 0.026, -0.432);
  ctx.lineTo(0.036, -0.392);
  ctx.closePath();
  oval(ctx, 0.002, -0.39, 0.078, 0.013, -0.08);
  ctx.restore();
  neonShape(ctx, "#2e1e05", HAY_RIM, lw);
  local(ctx, x, y, sc);
  ctx.moveTo(-0.031, -0.402);
  ctx.lineTo(0.033, -0.404);
  ctx.restore();
  neonStroke(ctx, TWINE, lw * 0.6, 2);

  // A crow perched on the left arm.
  local(ctx, x, y, sc);
  oval(ctx, -0.115, -0.333, 0.018, 0.012, -0.2);
  oval(ctx, -0.098, -0.347, 0.008, 0.008);
  ctx.moveTo(-0.091, -0.349);
  ctx.lineTo(-0.08, -0.345);
  ctx.lineTo(-0.091, -0.343);
  ctx.closePath();
  ctx.moveTo(-0.128, -0.33);
  ctx.lineTo(-0.15, -0.322);
  ctx.lineTo(-0.145, -0.334);
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, "#07040a", "#b07cff", lw * 0.6);
}

/** Low mound of fallen leaves (or straw) the props are sunk into. */
function mound(
  ctx: Ctx,
  x: number,
  y: number,
  sc: number,
  lw: number,
  w: number,
  seed: number,
  rim = LITTER,
  fill = "#1c0705",
): void {
  local(ctx, x, y, sc);
  ctx.moveTo(-w, 0.004);
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const fx = -w + (2 * w * i) / n;
    const peak = 0.014 + 0.012 * hash(seed + i);
    ctx.quadraticCurveTo(fx - w / n, -peak * 2 * Math.sin((Math.PI * (i - 0.5)) / n), fx, i === n ? 0.004 : -0.004);
  }
  ctx.closePath();
  ctx.restore();
  neonShape(ctx, fill, rim, lw * 0.8);
}

// Leaves scattered on the floor at the cluster bases: [X, z, angle, color, oak].
const LITTER_LEAVES = [
  [-0.44, 2.12, 0.4, 0, 0],
  [-0.17, 2.2, -1.1, 2, 1],
  [-0.33, 2.02, 2.2, 3, 0],
  [0.16, 2.2, 0.9, 3, 0],
  [0.45, 2.15, -0.5, 2, 0],
  [0.34, 2.0, 1.9, 0, 1],
  [-0.12, 2.35, 2.6, 1, 0],
  [0.13, 2.4, -2.2, 1, 1],
] as const;

function litter(ctx: Ctx, s: Scene, lw: number, list: readonly (readonly number[])[], size: number): void {
  for (let c = 0; c < LEAF_COLORS.length; c++) {
    ctx.beginPath();
    let any = false;
    for (const [X, z, ang, color, oak] of list) {
      if (color !== c) continue;
      const p = place(s, X!, z!);
      if (p.y > s.cssH + s.u * 0.1) continue;
      const rock = Math.sin(s.t * 1.7 + ang! * 5) * 0.12;
      addLeaf(ctx, oak === 1, p.x, p.y, s.u * size * p.k, ang! + rock, 1, 0.5);
      any = true;
    }
    if (any) neonShape(ctx, LEAF_FILLS[c]!, LEAF_COLORS[c]!, lw * 0.75);
  }
}

/** Prop size relative to u at the tower's depth: small enough that the tower stays the hero. */
const PROP = 0.7;
const BALE_H = 0.085;

export function harvest(ctx: Ctx, s: Scene): void {
  // Everything here is near the tower's row; once the floor has dropped away, skip it.
  if (s.groundY - s.u * 0.4 > s.cssH) return;
  const lw = Math.max(1.1, s.u * 0.004);
  const sc = s.u * PROP;

  // Left: a scarecrow on the tower's row behind a pyramid of hay bales. The bales hide its
  // foot at the start; as the floor spreads out on a climb, the straw heaped round it shows.
  let p = place(s, -0.39, 3);
  scarecrow(ctx, p.x, p.y, sc * p.k, lw, s.t);
  mound(ctx, p.x, p.y, sc * p.k, lw, 0.055, 19, HAY_RIM, HAY_FILL);
  p = place(s, -0.39, 2.3);
  hayBale(ctx, p.x, p.y, sc * p.k, lw, 1);
  p = place(s, -0.272, 2.3);
  hayBale(ctx, p.x, p.y, sc * p.k, lw, 1);
  p = place(s, -0.331, 2.3);
  hayBale(ctx, p.x, p.y - BALE_H * sc * p.k, sc * p.k, lw, 1);
  p = place(s, -0.33, 2.3);
  mound(ctx, p.x, p.y, sc * p.k, lw, 0.24, 7);
  p = place(s, -0.2, 2.1);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.045, "#ffb02e", -0.1);

  // Right: corn shocks behind a pile of pumpkins and gourds.
  p = place(s, 0.47, 3);
  cornShock(ctx, p.x, p.y, sc * p.k, lw, s.t * 1.1);
  p = place(s, 0.36, 3);
  cornShock(ctx, p.x, p.y, sc * p.k, lw, s.t * 1.3 + 1);
  p = place(s, 0.3, 2.85);
  cornEars(ctx, p.x, p.y, sc * p.k, lw);
  p = place(s, 0.34, 2.3);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.075, PUMPKIN, 0.05);
  p = place(s, 0.225, 2.3);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.058, "#ff8f2a", -0.12);
  p = place(s, 0.3, 2.25);
  mound(ctx, p.x, p.y, sc * p.k, lw, 0.24, 3);
  p = place(s, 0.19, 2.08);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.042, "#ffe9c8", 0.1);
  p = place(s, 0.29, 2.04);
  gourd(ctx, p.x, p.y, sc * p.k, lw, "#ffe04a");
  p = place(s, 0.4, 2.1);
  pumpkin(ctx, p.x, p.y, sc * p.k, lw, 0.04, "#a8e04a", 0.15);

  litter(ctx, s, lw, LITTER_LEAVES, 0.032);
}

// Big leaves lying on the floor in the bottom corners, in front of everything; they drop away
// fast as the camera climbs and never reach the tower or the "tap to drop" line.
const FRONT_LEAVES = [
  [-0.27, 1.62, 0.5, 2, 0],
  [-0.2, 1.75, -0.9, 0, 1],
  [-0.31, 1.85, 2.4, 3, 0],
  [0.27, 1.65, -0.6, 1, 0],
  [0.21, 1.8, 1.2, 3, 1],
  [0.3, 1.9, 2.8, 0, 0],
] as const;

export function leafLitter(ctx: Ctx, s: Scene): void {
  if (place(s, 0, 1.9).y - s.u * 0.1 > s.cssH) return;
  litter(ctx, s, Math.max(1.2, s.u * 0.0045), FRONT_LEAVES, 0.06);
}
