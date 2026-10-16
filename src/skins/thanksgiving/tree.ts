import { circle, hash, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BARK, INK, WOOD } from "./colors";
import { addLeaf } from "./leaves";
import { cel, L, len, M, pen, Q, R, X, Y } from "./pen";

// A round autumn tree in comic-strip style: a short forked trunk under a cloud of puffy
// canopy, cel-shaded (shade, body, light caps) inside one inked outline, with a few leaf ticks
// and leaves letting go of the canopy and spinning down to the lawn.

export interface Foliage {
  shade: string;
  body: string;
  light: string;
  /** The color of the leaves that fall from it. */
  leaf: string;
}

export const ORANGE_TREE: Foliage = { shade: "#d8642c", body: "#f3923a", light: "#ffc063", leaf: "#ff9a2a" };

/** Canopy puffs in local units (tree height ~0.42): x, y, r. */
const CANOPY = [
  [-0.075, -0.2, 0.058],
  [0.075, -0.205, 0.056],
  [0.0, -0.195, 0.066],
  [-0.05, -0.275, 0.07],
  [0.052, -0.28, 0.066],
  [0.0, -0.335, 0.062],
  [-0.1, -0.25, 0.045],
  [0.1, -0.255, 0.045],
] as const;

/** Leaves falling from the canopy: start x, start y, period, offset. */
const FALLING = Array.from({ length: 4 }, (_, i) => ({
  x: (hash(i + 300) - 0.5) * 0.17,
  y: -0.15 - hash(i + 310) * 0.012,
  period: 5 + hash(i + 320) * 4,
  off: hash(i + 330) * 20,
  drift: (hash(i + 340) - 0.5) * 0.12,
  oak: hash(i + 350) > 0.6,
}));

const SWING_ROPES = [0.034, 0.078] as const;
const ROPE = "#e9d3a6";
const PLANK = WOOD;

/**
 * Tree with its trunk base at (x, y); 1 local unit = `scale` px. With `swing`, a plank swing
 * hangs from its right-hand bough, rocking a little.
 */
export function tree(ctx: Ctx, s: Scene, x: number, y: number, scale: number, lw: number, f: Foliage, seed: number, swing = false): void {
  const sway = Math.sin(s.t * 0.9 + seed) * 0.004;

  // Trunk with two branches forking into the canopy.
  pen(x, y, scale, seed);
  ctx.beginPath();
  M(ctx, -0.02, 0);
  Q(ctx, -0.012, -0.08, -0.014, -0.15);
  L(ctx, -0.055 + sway, -0.215);
  L(ctx, -0.04 + sway, -0.225);
  L(ctx, -0.004, -0.175);
  L(ctx, 0.004, -0.25 + sway);
  L(ctx, 0.016, -0.25 + sway);
  L(ctx, 0.014, -0.17);
  L(ctx, 0.05 + sway, -0.22);
  L(ctx, 0.06 + sway, -0.21);
  Q(ctx, 0.016, -0.12, 0.02, 0);
  ctx.closePath();
  cel(ctx, BARK, -0.25, 0, lw, 0.0, 0.35);
  // A knot hole
  ctx.beginPath();
  M(ctx, -0.004, -0.085);
  Q(ctx, 0.006, -0.1, 0.008, -0.08);
  ink(ctx, Math.max(1, lw * 0.8), INK);

  // Canopy: an ink pass under everything (one outline round the union), then shade, body and
  // light caps, each a little up and to the left of the last.
  ctx.beginPath();
  for (const [px, py, r] of CANOPY) circle(ctx, X(px + sway), Y(py), len(r));
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = f.shade;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, r] of CANOPY) circle(ctx, X(px + sway - r * 0.06), Y(py - r * 0.1), len(r * 0.88));
  ctx.fillStyle = f.body;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, r] of CANOPY) circle(ctx, X(px + sway - r * 0.25), Y(py - r * 0.36), len(r * 0.46));
  ctx.fillStyle = f.light;
  ctx.fill();

  if (swing) {
    const rock = Math.sin(s.t * 1.3 + seed) * 0.01;
    ctx.beginPath();
    for (const rx of SWING_ROPES) {
      M(ctx, rx, -0.152);
      L(ctx, rx + rock, -0.05);
    }
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = len(0.004) + lw * 1.6;
    ctx.stroke();
    ctx.strokeStyle = ROPE;
    ctx.lineWidth = len(0.004);
    ctx.stroke();
    ctx.beginPath();
    R(ctx, 0.024 + rock, -0.052, 0.064, 0.01);
    cel(ctx, PLANK, -0.052, -0.042, lw, 0.35, 0.3);
  }

  // Leaves letting go: fall from the canopy to the lawn at the tree's foot, rocking.
  ctx.beginPath();
  let any = false;
  for (const lf of FALLING) {
    const p = (s.t + lf.off) / lf.period;
    const k = p - Math.floor(p);
    const ly = lf.y + k * (0.04 - lf.y);
    const lx = lf.x + lf.drift * k + Math.sin(s.t * 2.2 + lf.off) * 0.018;
    const flip = Math.cos(s.t * 2.4 + lf.off);
    const face = (flip < 0 ? -1 : 1) * (0.4 + 0.6 * Math.abs(flip));
    addLeaf(ctx, lf.oak, X(lx), Y(ly), len(0.04), Math.sin(s.t * 3 + lf.off) * 0.9, face, 1, false);
    any = true;
  }
  if (any) {
    ctx.fillStyle = f.leaf;
    ctx.fill();
    ink(ctx, Math.max(1, lw * 0.7), INK);
  }
}
