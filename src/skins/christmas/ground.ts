import { alpha, circle, hash, mix, neonStroke, oval, type Ctx } from "../../neon/draw";
import { horizonFor } from "../../neon/world";
import type { Scene } from "../skin";
import { GOLD, GREEN, ICE, LIGHTS, NIGHT, ORANGE, PINE, RED, SNOW, WHITE } from "./colors";
import { drawBulbs, drawMounds, firOutline, firPath, starPath } from "./shapes";
import { snow } from "./sky";

// Props on the floor beside the tower: a decorated tree with presents underneath on the
// left, a snowman and candy canes on the right, all sunk into snow drifts.
// Props stand on grid rows: depth z = 3 is the tower's own row (groundY); smaller z is
// nearer the viewer, lower on screen and larger, and slides away faster as you climb,
// exactly like the grid lines it stands on.

/** Screen y of the floor row at depth z. */
function rowY(s: Scene, z: number): number {
  return s.horizonY + ((s.groundY - s.horizonY) * 3) / z;
}

/** Screen x of a point `dx` pixels (at tower depth) from the center line, on row z. */
function rowX(s: Scene, dx: number, z: number): number {
  return s.cssW / 2 + (dx * 3) / z;
}

// ---------------------------------------------------------------- the tree

const TREE = firOutline(
  [
    { top: -1, bottom: -0.68, half: 0.11 },
    { top: -0.8, bottom: -0.47, half: 0.155 },
    { top: -0.6, bottom: -0.26, half: 0.2 },
    { top: -0.4, bottom: -0.05, half: 0.24 },
  ],
  0.035,
);

/** Snow ledges on the tree's lower tiers: [tier top, tier half width]. */
const TREE_LEDGES = [
  [-0.8, 0.155],
  [-0.6, 0.2],
  [-0.4, 0.24],
] as const;

/** Half width of the tree's envelope at height fraction y (-1 apex .. 0 base). */
function treeHalf(y: number): number {
  return 0.24 * Math.min(1, Math.max(0, (y + 1) / 0.95));
}

/** Bulbs on the tree, as [x, y] fractions of its height. */
const TREE_BULBS: number[] = (() => {
  const out: number[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const y = -0.86 + (0.78 * (i + hash(i + 50) * 0.6)) / n;
    const x = (hash(i + 80) * 2 - 1) * treeHalf(y) * 0.78;
    out.push(x, y);
  }
  return out;
})();

/** Baubles: [x, y, colorIndex] fractions of the height. */
const BAUBLES: [number, number, number][] = [
  [-0.07, -0.62, 0],
  [0.09, -0.44, 2],
  [-0.12, -0.3, 3],
  [0.05, -0.2, 0],
  [0.16, -0.13, 2],
  [-0.03, -0.75, 2],
  [-0.17, -0.13, 1],
];

/** Garlands: start and end heights (fractions) — they swoop across the tree. */
const GARLANDS: [number, number][] = [
  [-0.74, -0.62],
  [-0.53, -0.4],
  [-0.32, -0.18],
];

const bulbBuf: number[] = [];

/** The decorated tree standing at (x, base), `h` tall without its star. */
function christmasTree(ctx: Ctx, s: Scene, x: number, base: number, h: number): void {
  const lw = Math.max(1.2, s.u * 0.0045);
  // Silhouette and rim
  ctx.beginPath();
  firPath(ctx, TREE, x, base, h);
  neonStroke(ctx, GREEN, lw, 3);
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, "#06301c");
  g.addColorStop(1, PINE);
  ctx.fillStyle = g;
  ctx.fill();

  // Snow along the tier edges
  ctx.beginPath();
  for (const [top, half] of TREE_LEDGES) {
    const y0 = base + (top + 0.1) * h;
    const y1 = base + (top + 0.31) * h;
    for (let dir = -1; dir <= 1; dir += 2) {
      ctx.moveTo(x + dir * half * 0.32 * h, y0);
      ctx.lineTo(x + dir * half * 0.92 * h, y1);
      ctx.lineTo(x + dir * half * 0.84 * h, y1 + h * 0.022);
      ctx.lineTo(x + dir * half * 0.3 * h, y0 + h * 0.03);
      ctx.closePath();
    }
  }
  ctx.fillStyle = alpha(SNOW, 0.85);
  ctx.fill();

  // Gold garlands
  ctx.beginPath();
  for (const [a, b] of GARLANDS) {
    const ax = x - treeHalf(a) * h * 0.92;
    const bx = x + treeHalf(b) * h * 0.92;
    ctx.moveTo(ax, base + a * h);
    ctx.quadraticCurveTo(x, base + (Math.max(a, b) + 0.1) * h, bx, base + b * h);
  }
  neonStroke(ctx, GOLD, Math.max(0.8, s.u * 0.0025), 2.6);

  // Baubles
  for (let c = 0; c < LIGHTS.length; c++) {
    ctx.beginPath();
    for (const [bx, by, ci] of BAUBLES) if (ci === c) circle(ctx, x + bx * h, base + by * h, h * 0.026);
    ctx.fillStyle = mix(LIGHTS[c]!, "#000000", 0.25);
    ctx.fill();
  }
  ctx.beginPath();
  for (const [bx, by] of BAUBLES) circle(ctx, x + bx * h - h * 0.008, base + by * h - h * 0.009, h * 0.008);
  ctx.fillStyle = alpha("#ffffff", 0.85);
  ctx.fill();

  // Twinkling lights
  bulbBuf.length = 0;
  for (let i = 0; i + 1 < TREE_BULBS.length; i += 2) bulbBuf.push(x + TREE_BULBS[i]! * h, base + TREE_BULBS[i + 1]! * h);
  drawBulbs(ctx, bulbBuf, Math.max(1, h * 0.011), s.t, 2.4);

  // Star on top
  const sy = base - h * 1.02;
  const r = h * 0.075;
  const tw = 0.75 + 0.25 * Math.sin(s.t * 2.2);
  const halo = ctx.createRadialGradient(x, sy, 0, x, sy, r * 4);
  halo.addColorStop(0, alpha(GOLD, 0.5 * tw));
  halo.addColorStop(1, alpha(GOLD, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 4, sy - r * 4, r * 8, r * 8);
  // Sparkle rays
  const ray = r * (1.8 + 0.6 * tw);
  ctx.beginPath();
  ctx.moveTo(x - ray, sy);
  ctx.lineTo(x + ray, sy);
  ctx.moveTo(x, sy - ray);
  ctx.lineTo(x, sy + ray * 0.6);
  ctx.strokeStyle = alpha("#fff6d0", 0.6 * tw);
  ctx.lineWidth = Math.max(1, s.u * 0.003);
  ctx.stroke();
  ctx.beginPath();
  starPath(ctx, x, sy, r, 0.45);
  ctx.fillStyle = "#fff1b8";
  ctx.fill();
  neonStroke(ctx, GOLD, Math.max(1, s.u * 0.0035), 2.8);
}

// ---------------------------------------------------------------- presents

interface Box {
  x: number; // center, in k units
  y: number; // bottom (negative is up)
  w: number;
  h: number;
  color: string;
  ribbon: string;
  tilt: number;
}

const PRESENTS: Box[] = [
  { x: -6.9, y: 0, w: 4.6, h: 3.4, color: GOLD, ribbon: GREEN, tilt: 0 },
  { x: 7.4, y: 0, w: 5.6, h: 4.4, color: ICE, ribbon: WHITE, tilt: 0 },
  { x: 0, y: 0, w: 8.4, h: 6.2, color: RED, ribbon: GOLD, tilt: 0 },
  { x: -0.6, y: -6.2, w: 5.8, h: 4.4, color: GREEN, ribbon: RED, tilt: -0.07 },
];

/** One wrapped box, drawn relative to the pile's origin (already translated), k px per unit. */
function present(ctx: Ctx, b: Box, k: number, lw: number): void {
  const w = b.w * k;
  const h = b.h * k;
  ctx.save();
  ctx.translate(b.x * k, b.y * k);
  ctx.rotate(b.tilt);
  // Box with a neon edge
  ctx.beginPath();
  ctx.rect(-w / 2, -h, w, h);
  ctx.fillStyle = mix(b.color, "#000000", 0.72);
  ctx.fill();
  neonStroke(ctx, b.color, lw, 2.8);
  // Lid seam
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.78);
  ctx.lineTo(w / 2, -h * 0.78);
  ctx.strokeStyle = alpha(b.color, 0.8);
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  // Ribbon and bow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -h);
  ctx.moveTo(-w / 2, -h * 0.4);
  ctx.lineTo(w / 2, -h * 0.4);
  const bw = Math.min(w, h) * 0.24;
  oval(ctx, -bw * 0.9, -h - bw * 0.45, bw, bw * 0.55, 0.45);
  oval(ctx, bw * 0.9, -h - bw * 0.45, bw, bw * 0.55, -0.45);
  neonStroke(ctx, b.ribbon, lw * 0.85, 2.6);
  // A little snow on the lid
  ctx.beginPath();
  ctx.moveTo(-w / 2 - lw * 0.3, -h);
  ctx.quadraticCurveTo(-w * 0.25, -h - k * 0.9, -w * 0.05, -h - lw * 0.2);
  ctx.lineTo(-w * 0.05, -h + k * 0.5);
  ctx.quadraticCurveTo(-w * 0.3, -h + k * 0.9, -w / 2 - lw * 0.3, -h + k * 0.3);
  ctx.closePath();
  ctx.fillStyle = alpha(SNOW, 0.9);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- candy canes

/**
 * Add a candy cane: shaft from its foot (x, base) up `h`, hook bending toward `dir`
 * (1 right, -1 left), the whole cane leaning by `tilt` radians (positive leans right).
 */
function canePath(ctx: Ctx, x: number, base: number, h: number, dir: number, tilt: number): void {
  const r = h * 0.18;
  const sin = Math.sin(tilt);
  const cos = Math.cos(tilt);
  const top = -h + r;
  ctx.moveTo(x, base);
  ctx.lineTo(x - top * sin, base + top * cos);
  const ax = dir * r;
  ctx.arc(x + ax * cos - top * sin, base + ax * sin + top * cos, r, (dir > 0 ? Math.PI : 0) + tilt, (dir > 0 ? 0 : Math.PI) + tilt, dir < 0);
  const tx = dir * r * 2;
  const ty = top + r * 0.75;
  ctx.lineTo(x + tx * cos - ty * sin, base + tx * sin + ty * cos);
}

/** Reused dash pattern for the cane stripes. */
const STRIPES = [0, 0];

/** Stroke the current path as a red-and-white striped neon tube. */
function caneStroke(ctx: Ctx, w: number): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(RED, 0.25);
  ctx.lineWidth = w * 2.8;
  ctx.stroke();
  ctx.strokeStyle = "#fff2f4";
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.lineCap = "butt";
  STRIPES[0] = STRIPES[1] = w * 0.9;
  ctx.setLineDash(STRIPES);
  ctx.strokeStyle = RED;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- snowman

/** Snowballs: [center height, radius] in k units, bottom to top. */
const SNOWBALLS = [
  [6.5, 7.6],
  [16.6, 5.6],
  [24.6, 4.1],
] as const;

/** A snowman standing at (x, base), k px per unit (about 35 units tall with his hat). */
function snowman(ctx: Ctx, s: Scene, x: number, base: number, k: number): void {
  const lw = Math.max(1.2, s.u * 0.0045);
  // Twig arms behind the body
  ctx.beginPath();
  ctx.moveTo(x - 4.6 * k, base - 17 * k);
  ctx.lineTo(x - 10.5 * k, base - 21.5 * k);
  ctx.moveTo(x - 9 * k, base - 20.4 * k);
  ctx.lineTo(x - 10.4 * k, base - 23.6 * k);
  ctx.moveTo(x + 4.6 * k, base - 17 * k);
  ctx.lineTo(x + 10.2 * k, base - 20 * k);
  ctx.moveTo(x + 8.6 * k, base - 19.2 * k);
  ctx.lineTo(x + 10.6 * k, base - 22.4 * k);
  neonStroke(ctx, "#d79a5a", Math.max(1, s.u * 0.003), 2.4);

  // Three snowballs, each drawn over the one below so the seams show.
  for (const [cy, cr] of SNOWBALLS) {
    const by = base - cy * k;
    const r = cr * k;
    ctx.beginPath();
    circle(ctx, x, by, r);
    neonStroke(ctx, WHITE, lw, 3);
    const g = ctx.createRadialGradient(x - r * 0.4, by - r * 0.45, r * 0.1, x, by, r);
    g.addColorStop(0, "#7fa8dd");
    g.addColorStop(0.6, "#2a4579");
    g.addColorStop(1, "#111f44");
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Scarf
  ctx.beginPath();
  ctx.moveTo(x - 4.2 * k, base - 21.2 * k);
  ctx.quadraticCurveTo(x, base - 19 * k, x + 4.2 * k, base - 21.2 * k);
  ctx.moveTo(x + 2.4 * k, base - 20.4 * k);
  ctx.lineTo(x + 3.6 * k, base - 15.6 * k);
  neonStroke(ctx, RED, Math.max(1.4, 1.3 * k), 2.4);

  // Hat
  ctx.beginPath();
  ctx.rect(x - 5 * k, base - 28.7 * k, 10 * k, 1.3 * k);
  ctx.rect(x - 3.3 * k, base - 34.6 * k, 6.6 * k, 6 * k);
  neonStroke(ctx, ICE, lw * 0.9, 2.8);
  ctx.fillStyle = NIGHT;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 3.3 * k, base - 29.9 * k);
  ctx.lineTo(x + 3.3 * k, base - 29.9 * k);
  neonStroke(ctx, GREEN, Math.max(1, 0.8 * k), 2.2);

  // Eyes (bright, since coal would vanish on the dark snowballs), carrot nose, buttons
  ctx.beginPath();
  circle(ctx, x - 1.4 * k, base - 25.8 * k, 0.55 * k);
  circle(ctx, x + 1.4 * k, base - 25.8 * k, 0.55 * k);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 0.2 * k, base - 24.8 * k);
  ctx.lineTo(x + 4.4 * k, base - 23.9 * k);
  ctx.lineTo(x + 0.2 * k, base - 23.5 * k);
  ctx.closePath();
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) circle(ctx, x, base - (18.6 - i * 2.2) * k, 0.55 * k);
  ctx.fillStyle = GOLD;
  ctx.fill();
}

// ---------------------------------------------------------------- glints

/** Sparkles on the snowfield: [depth z, x as a fraction of the half width, phase group]. */
const GLINTS = Array.from({ length: 30 }, (_, i) => [1.15 + hash(i + 2000) * 6, hash(i + 2100) * 2 - 1, i % 3] as const);

/** Tiny four-point glints twinkling on the snowfield, in three alternating groups. */
function glints(ctx: Ctx, s: Scene): void {
  const cx = s.cssW / 2;
  for (let g = 0; g < 3; g++) {
    const tw = Math.max(0, Math.sin(s.t * 1.9 + g * 2.1));
    if (tw < 0.05) continue;
    ctx.beginPath();
    for (const [z, fx, group] of GLINTS) {
      if (group !== g) continue;
      const y = rowY(s, z);
      if (y < s.horizonY + 2 || y > s.cssH) continue;
      const x = cx + fx * cx;
      const r = s.u * 0.012 * Math.min(1.6, 3 / z) * (0.4 + 0.6 * tw);
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r * 0.8);
      ctx.lineTo(x, y + r * 0.8);
    }
    ctx.strokeStyle = alpha("#ffffff", 0.75 * tw);
    ctx.lineWidth = Math.max(1, s.u * 0.0025);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- layer

/** Reused snow-drift buffer: x, y, w, h per drift. */
const drifts: number[] = [];

/** One snow drift (see drawMounds) with its feet at y. */
function drift(ctx: Ctx, x: number, y: number, w: number, h: number, lw: number): void {
  drifts.length = 0;
  drifts.push(x, y, w, h);
  drawMounds(ctx, drifts, lw);
}

/** Floor layer: glints, the props while the floor is in view, and snow falling over it. */
export function ground(ctx: Ctx, s: Scene): void {
  glints(ctx, s);
  if (s.groundY - s.u * 0.6 < s.cssH) props(ctx, s);
  // Snow falling over the floor (still behind the tower).
  snow(ctx, s, s.horizonY, s.cssH + s.u * 0.1);
}

/** The tree and presents left of the tower, the snowman and a cane right of it. */
function props(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const gy = rowY(s, 3);
  const lw = Math.max(1.2, u * 0.0045);

  // Left: the tree sunk in a drift, presents piled in front of it on a nearer row.
  // The tree, its drift and the presents' drift all stay inside the screen's left edge.
  const treeX = rowX(s, -u * 0.375, 3);
  christmasTree(ctx, s, treeX, gy + u * 0.03, u * 0.47);
  drift(ctx, treeX, gy + u * 0.02, u * 0.22, u * 0.05, lw * 0.7);

  const pz = 2.55;
  const py = rowY(s, pz);
  const pk = (u * 0.01 * 3) / pz;
  const px = rowX(s, -u * 0.305, pz);
  ctx.save();
  ctx.translate(px, py + pk * 0.8);
  for (const b of PRESENTS) present(ctx, b, pk, lw);
  ctx.restore();
  drift(ctx, px, py + pk * 0.9, pk * 21.5, pk * 2.4, lw * 0.7);

  // Right: the snowman in his own drift, a candy cane stuck in beside him, clear of his
  // body and arm, and the cane's glow still inside the screen's right edge.
  const manX = rowX(s, u * 0.365, 3);
  snowman(ctx, s, manX, gy + u * 0.018, u * 0.0088);
  ctx.beginPath();
  canePath(ctx, manX + u * 0.1, gy + u * 0.02, u * 0.11, -1, 0.14);
  caneStroke(ctx, Math.max(1.6, u * 0.009));
  drift(ctx, manX + u * 0.01, gy + u * 0.024, u * 0.23, u * 0.05, lw * 0.7);
}

/** Floor row (depth z) of the foreground drift. */
const FORE_Z = 1.08;

/** Top edge of the foreground drift at screen x. */
function driftTop(s: Scene, y: number, x: number): number {
  const f = x / s.u;
  return y - s.u * (0.024 + 0.014 * Math.sin(f * 5.3 + 1.2) + 0.008 * Math.sin(f * 13.1 + 0.4));
}

/**
 * A low snow drift along the bottom edge on the nearest grid row, with candy canes stuck in
 * the corners. Everything here stays below the floor line, so it never covers the tower,
 * and it drops away quickly as you climb.
 */
export function foreground(ctx: Ctx, s: Scene): void {
  const u = s.u;
  // At rest the drift sits on the nearest grid row; on wide or short screens that row is
  // below the bottom edge, so lift it until the drift (and the canes in it) show whole.
  const ground0 = s.groundY - s.rise;
  const horizon0 = horizonFor(ground0, 0, u);
  const rest = horizon0 + ((ground0 - horizon0) * 3) / FORE_Z;
  const y = rowY(s, FORE_Z) - Math.max(0, rest - (s.cssH - u * 0.03));
  if (y - u * 0.2 > s.cssH) return;
  const lw = Math.max(1.2, u * 0.0045);

  // Candy canes, planted before the drift so their feet are buried.
  const lx = s.cssW / 2 - u * 0.43;
  const rx = s.cssW / 2 + u * 0.44;
  const lx2 = lx + u * 0.05;
  ctx.beginPath();
  canePath(ctx, lx, driftTop(s, y, lx) + u * 0.03, u * 0.17, 1, 0.24);
  canePath(ctx, lx2, driftTop(s, y, lx2) + u * 0.03, u * 0.16, -1, -0.24);
  canePath(ctx, rx, driftTop(s, y, rx) + u * 0.03, u * 0.15, -1, 0.1);
  caneStroke(ctx, Math.max(2, u * 0.012));

  const step = u * 0.04;
  const n = Math.ceil(s.cssW / step) + 1;
  ctx.beginPath();
  ctx.moveTo(-4, s.cssH + 4);
  for (let i = 0; i <= n; i++) ctx.lineTo(i * step, driftTop(s, y, i * step));
  ctx.lineTo(s.cssW + 4, s.cssH + 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - u * 0.05, 0, y + u * 0.12);
  g.addColorStop(0, "#9cc8f2");
  g.addColorStop(0.35, "#355a99");
  g.addColorStop(1, "#0c1736");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    if (i === 0) ctx.moveTo(0, driftTop(s, y, 0));
    else ctx.lineTo(i * step, driftTop(s, y, i * step));
  }
  neonStroke(ctx, WHITE, lw * 0.7, 2.6);
}
