import { circle, ink, oval, type Ctx } from "../../base/draw";
import {
  DISC,
  DISC_LIGHT,
  FROND,
  FROND_LIGHT,
  INK,
  PETAL,
  PETAL_SHADE,
  STEM,
  TRUNK,
  TRUNK_SHADE,
} from "./colors";

// Tropical plants for the valley: palms with ringed, leaning trunks and drooping serrated
// fronds, and giant sunflowers nodding on tall stems. Palms come as path builders so a whole
// row of them is filled and inked in a few calls; sunflowers are few and drawn one by one.

const TAU = Math.PI * 2;

/** Fronds: [direction angle (0 = right, -π/2 = up), length, droop] in crown radii. */
const FRONDS = [
  [-2.75, 1.25, 0.55],
  [-2.2, 1.05, 0.25],
  [-1.62, 0.8, 0.05],
  [-0.95, 1.05, 0.25],
  [-0.38, 1.25, 0.55],
  [0.25, 0.95, 0.75],
  [2.9, 0.95, 0.75],
] as const;
const FROND_DIR = FRONDS.map(([a]) => [Math.cos(a), Math.sin(a)] as const);

/** Height of a palm's crown above its foot, in crown radii. */
export const PALM_H = 2.9;

/** Where a palm's crown sits for a foot at (x, y), crown radius r, lean -1..1 (scratch, reused). */
const TOP = { x: 0, y: 0 };
export function palmTop(x: number, y: number, r: number, lean: number, sway: number): typeof TOP {
  TOP.x = x + lean * r * 0.9 + sway;
  TOP.y = y - r * PALM_H;
  return TOP;
}

/** A palm trunk as a tapered, curving subpath: foot at (x, y). */
export function palmTrunk(ctx: Ctx, x: number, y: number, r: number, lean: number, sway: number): void {
  const t = palmTop(x, y, r, lean, sway);
  const tx = t.x;
  const ty = t.y;
  const bw = r * 0.16;
  const tw = r * 0.09;
  // The bend: the trunk rises straight, then curves over toward its lean.
  const cx = x - lean * r * 0.15;
  const cy = y - r * PALM_H * 0.55;
  ctx.moveTo(x - bw, y);
  ctx.quadraticCurveTo(cx - bw * 0.8, cy, tx - tw, ty + r * 0.05);
  ctx.lineTo(tx + tw, ty + r * 0.05);
  ctx.quadraticCurveTo(cx + bw * 0.8, cy, x + bw, y);
  ctx.closePath();
}

/** Ring marks across a palm trunk, as open strokes (stroke them in a darker tone). */
export function palmRings(ctx: Ctx, x: number, y: number, r: number, lean: number, sway: number): void {
  const t = palmTop(x, y, r, lean, sway);
  const cx = x - lean * r * 0.15;
  const cy = y - r * PALM_H * 0.55;
  for (let i = 1; i < 6; i++) {
    const f = i / 6.2;
    // Point on the trunk's quadratic center line, and its half width there.
    const m = 1 - f;
    const px = m * m * x + 2 * m * f * cx + f * f * t.x;
    const py = m * m * y + 2 * m * f * cy + f * f * t.y;
    const hw = r * (0.16 - 0.07 * f) * 0.85;
    ctx.moveTo(px - hw, py);
    ctx.quadraticCurveTo(px, py + r * 0.06, px + hw, py);
  }
}

/** All fronds of a crown at (x, y) (from palmTop) as one subpath each: serrated, drooping leaves. */
export function palmFronds(ctx: Ctx, x: number, y: number, r: number, wave: number, serrate: boolean): void {
  for (let i = 0; i < FRONDS.length; i++) {
    const [, len, droop] = FRONDS[i]!;
    const [dx, dy] = FROND_DIR[i]!;
    const L = len * r;
    const flap = Math.sin(wave + i * 1.3) * 0.08;
    const tipX = x + dx * L;
    const tipY = y + dy * L + (droop + flap) * r;
    // Leaf spine bulges up and out, then droops to the tip.
    const mx = x + dx * L * 0.55;
    const my = y + dy * L * 0.55 - r * 0.28 + flap * r * 0.5;
    const nx = -dy;
    const ny = dx;
    const w = r * 0.2;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx - nx * w, my - Math.abs(ny) * w - w * 0.4, tipX, tipY);
    if (serrate) {
      // Back along the underside in three leaflet teeth.
      for (let k = 1; k <= 3; k++) {
        const f = 1 - k / 3.4;
        const sx = x + (mx - x) * 2 * f * (1 - f) + (tipX - x) * f * f;
        const sy = y + (my - y) * 2 * f * (1 - f) + (tipY - y) * f * f;
        ctx.lineTo(sx + nx * w * 1.25 + dx * w * 0.5, sy + Math.abs(ny) * w * 1.1 + w * 0.5);
        ctx.lineTo(sx + nx * w * 0.35, sy + w * 0.3);
      }
      ctx.lineTo(x, y + r * 0.04);
    } else {
      ctx.quadraticCurveTo(mx + nx * w * 0.6, my + w * 0.9, x, y + r * 0.04);
    }
    ctx.closePath();
  }
}

/** The lit spine strip along the upper fronds of a crown. */
export function palmFrondsLight(ctx: Ctx, x: number, y: number, r: number, wave: number): void {
  for (let i = 0; i < 5; i++) {
    const [, len, droop] = FRONDS[i]!;
    const [dx, dy] = FROND_DIR[i]!;
    const L = len * r * 0.8;
    const flap = Math.sin(wave + i * 1.3) * 0.08;
    const mx = x + dx * L * 0.55;
    const my = y + dy * L * 0.55 - r * 0.3 + flap * r * 0.5;
    const tipX = x + dx * L;
    const tipY = y + dy * L + (droop + flap) * r * 0.8 - r * 0.06;
    ctx.moveTo(x + dx * r * 0.15, y + dy * r * 0.15 - r * 0.06);
    ctx.quadraticCurveTo(mx, my - r * 0.1, tipX, tipY);
    ctx.quadraticCurveTo(mx, my + r * 0.02, x + dx * r * 0.15, y + dy * r * 0.15);
    ctx.closePath();
  }
}

/** Coconuts under a crown, as circles. */
export function coconuts(ctx: Ctx, x: number, y: number, r: number): void {
  circle(ctx, x - r * 0.12, y + r * 0.14, r * 0.12);
  circle(ctx, x + r * 0.12, y + r * 0.13, r * 0.12);
  circle(ctx, x, y + r * 0.24, r * 0.11);
}

/**
 * One complete inked palm, foot at (x, y), crown radius r. For a handful of feature palms;
 * rows of palms batch the builders above instead.
 */
export function palm(ctx: Ctx, x: number, y: number, r: number, lean: number, t: number, lw: number): void {
  const sway = Math.sin(t * 0.9 + x * 0.05) * r * 0.05;
  const wave = t * 1.6 + x * 0.1;
  const top = palmTop(x, y, r, lean, sway);
  const tx = top.x;
  const ty = top.y;
  // The trunk, inked then filled, its rings; then the whole crown inked then filled over its
  // top, so overlapping fronds merge into one silhouette. Each path is built once.
  ctx.beginPath();
  palmTrunk(ctx, x, y, r, lean, sway);
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = TRUNK;
  ctx.fill();
  ctx.beginPath();
  palmRings(ctx, x, y, r, lean, sway);
  ctx.strokeStyle = TRUNK_SHADE;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.stroke();
  ctx.beginPath();
  palmFronds(ctx, tx, ty, r, wave, true);
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = FROND;
  ctx.fill();
  ctx.beginPath();
  palmFrondsLight(ctx, tx, ty, r, wave);
  coconuts(ctx, tx, ty + r * 0.02, r * 0.9);
  ctx.fillStyle = FROND_LIGHT;
  ctx.fill();
}

// ---------------------------------------------------------------- sunflower

const PETALS = 12;

/** A ring of pointed petals around (x, y) as one closed subpath: inner radius ri, tips at ro. */
function petalRing(ctx: Ctx, x: number, y: number, ri: number, ro: number, off: number): void {
  const half = Math.PI / PETALS;
  for (let i = 0; i <= PETALS; i++) {
    const a = off + (i / PETALS) * TAU;
    const ia = a - half;
    if (i === 0) ctx.moveTo(x + Math.cos(ia) * ri, y + Math.sin(ia) * ri);
    if (i === PETALS) break;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cl = ro * 0.92;
    ctx.quadraticCurveTo(x + Math.cos(a - half * 0.95) * cl, y + Math.sin(a - half * 0.95) * cl, x + ca * ro, y + sa * ro);
    ctx.quadraticCurveTo(x + Math.cos(a + half * 0.95) * cl, y + Math.sin(a + half * 0.95) * cl, x + Math.cos(a + half) * ri, y + Math.sin(a + half) * ri);
  }
  ctx.closePath();
}

/**
 * A giant sunflower, foot at (x, y), `h` px tall to the middle of its head, nodding in the
 * breeze; `phase` staggers neighbors.
 */
export function sunflower(ctx: Ctx, x: number, y: number, h: number, t: number, phase: number, lw: number): void {
  const nod = Math.sin(t * 0.8 + phase) * h * 0.025;
  const hx = x + nod + h * 0.04;
  const hy = y - h;
  const R = h * 0.2;
  const sw = Math.sin(t * 1.1 + phase) * 0.08;
  const stem = Math.max(1, h * 0.025);
  // Stem (a thin tapered shape) and two leaves, inked together.
  ctx.beginPath();
  ctx.moveTo(x - stem, y);
  ctx.quadraticCurveTo(x - h * 0.05 - stem, y - h * 0.5, hx - stem * 0.7, hy);
  ctx.lineTo(hx + stem * 0.7, hy);
  ctx.quadraticCurveTo(x - h * 0.05 + stem, y - h * 0.5, x + stem, y);
  ctx.closePath();
  const ly = y - h * 0.42;
  oval(ctx, x - h * 0.11, ly, h * 0.11, h * 0.045, -0.5 + sw);
  oval(ctx, x + h * 0.1, ly - h * 0.12, h * 0.1, h * 0.04, 0.45 - sw);
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = STEM;
  ctx.fill();
  // Back ring of shaded petals, offset by half a petal, inked; the front ring over it.
  ctx.beginPath();
  petalRing(ctx, hx, hy, R * 0.4, R * 1.08, Math.PI / PETALS + phase);
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = PETAL_SHADE;
  ctx.fill();
  ctx.beginPath();
  petalRing(ctx, hx, hy, R * 0.4, R * 0.95, phase);
  ctx.fillStyle = PETAL;
  ctx.fill();
  // Seed disc with a lit crescent.
  ctx.beginPath();
  circle(ctx, hx, hy, R * 0.48);
  ctx.fillStyle = DISC;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  oval(ctx, hx - R * 0.12, hy - R * 0.14, R * 0.26, R * 0.18, -0.5);
  ctx.fillStyle = DISC_LIGHT;
  ctx.fill();
}
