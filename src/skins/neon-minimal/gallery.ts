import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CABLE, EDGE, HARDWARE, LABEL, LABEL_TEXT, N_GOLD, N_GREEN, N_ORANGE, N_PINK, PANEL, PLATE, PLINTH } from "./colors";
import { gallery, galleryTop, tubeW, type Gallery } from "./layout";
import { leafPath } from "./shapes";
import { beginMirror, breath, endMirror, glow, REAL, REFLECTION, type Pass } from "./tube";

// The far pieces, standing on the floor line like works in a gallery: left of the tower a
// freestanding arch (a dark backplate rimmed in orange neon, framing a gold horizon line and a
// pink sun); right of it a slate display panel with a green botanical sprig mounted on
// standoffs, with a little gallery label. Each piece is drawn by one function that also paints
// its reflection in the floor (see Pass in tube.ts).

// The sprig, in units of u from the foot of its stem: a gently curved stem (quadratic) with
// alternating leaves and one at the tip.
const STEM = { x0: 0, y0: 0, cx: -0.045, cy: -0.11, x1: 0.012, y1: -0.215 };

function stemAt(t: number): [number, number] {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * STEM.x0 + b * STEM.cx + c * STEM.x1, a * STEM.y0 + b * STEM.cy + c * STEM.y1];
}

function stemDir(t: number): number {
  const dx = 2 * (1 - t) * (STEM.cx - STEM.x0) + 2 * t * (STEM.x1 - STEM.cx);
  const dy = 2 * (1 - t) * (STEM.cy - STEM.y0) + 2 * t * (STEM.y1 - STEM.cy);
  return Math.atan2(dy, dx);
}

/** [baseX, baseY, tipX, tipY, halfWidth] per leaf, in u. */
const LEAVES: readonly (readonly [number, number, number, number, number])[] = [
  ...Array.from({ length: 7 }, (_, i) => {
    const t = 0.17 + i * 0.115;
    const side = i % 2 ? 1 : -1;
    const [x, y] = stemAt(t);
    const ang = stemDir(t) + side * 0.92;
    const len = 0.058 * (1 - 0.38 * t);
    return [x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, len * 0.34] as const;
  }),
  (() => {
    const [x, y] = stemAt(1);
    const ang = stemDir(1);
    const len = 0.036;
    return [x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, len * 0.34] as const;
  })(),
];
const STANDOFFS = [0.04, 0.5, 0.97].map((t) => stemAt(t));

function drawArch(ctx: Ctx, g: Gallery, t: number, pass: Pass): void {
  const u = g.u;
  const r = g.aw / 2;
  const yb = g.hy - g.plinthH;
  const ys = g.hy - g.ah + r;

  ctx.beginPath();
  ctx.rect(g.ax - g.plinthW / 2, yb, g.plinthW, g.plinthH);
  pass.fill(ctx, PLINTH);
  if (!pass.mirrored) {
    ctx.fillStyle = EDGE;
    ctx.fillRect(g.ax - g.plinthW / 2, yb, g.plinthW, Math.max(1, u * 0.003));
  }

  // Backplate, rimmed by the arch tube (open at the foot, where it plugs into the plinth).
  ctx.beginPath();
  ctx.moveTo(g.ax - r, yb);
  ctx.lineTo(g.ax - r, ys);
  ctx.arc(g.ax, ys, r, Math.PI, 0);
  ctx.lineTo(g.ax + r, yb);
  pass.fill(ctx, PLATE);
  pass.tube(ctx, N_ORANGE, tubeW(u, 1.15), breath(t, 0));

  // Inside: a gold horizon line and a pink sun that drifts a hair above it.
  const ly = yb - u * 0.1;
  const inset = u * 0.03;
  ctx.beginPath();
  ctx.moveTo(g.ax - r + inset, ly);
  ctx.lineTo(g.ax + r - inset, ly);
  pass.tube(ctx, N_GOLD, tubeW(u, 0.8), breath(t, 1.3));

  const sr = u * 0.03;
  const sy = ly - u * 0.068 + Math.sin(t * 0.19) * u * 0.006;
  if (!pass.mirrored) glow(ctx, N_PINK.wash, g.ax, sy, sr * 2.3, sr * 2.3, breath(t, 2.6));
  ctx.beginPath();
  circle(ctx, g.ax, sy, sr);
  if (!pass.mirrored) {
    ctx.fillStyle = N_PINK.ghost;
    ctx.fill();
  }
  pass.tube(ctx, N_PINK, tubeW(u, 0.9), breath(t, 2.6));
}

function drawPanel(ctx: Ctx, g: Gallery, t: number, pass: Pass): void {
  const u = g.u;
  const top = g.hy - g.ph;
  ctx.beginPath();
  ctx.rect(g.px, top, g.pw, g.ph);
  pass.fill(ctx, PANEL);

  const sx = g.px + g.pw / 2;
  const sy = g.hy - u * 0.045;
  if (!pass.mirrored) {
    ctx.fillStyle = EDGE;
    ctx.fillRect(g.px, top, g.pw, Math.max(1, u * 0.003));
    // The power lead runs from the foot of the sprig down to the floor.
    ctx.fillStyle = CABLE;
    ctx.fillRect(sx - u * 0.002, sy, Math.max(1, u * 0.004), g.hy - sy);
  }

  ctx.beginPath();
  ctx.moveTo(sx + STEM.x0 * u, sy + STEM.y0 * u);
  ctx.quadraticCurveTo(sx + STEM.cx * u, sy + STEM.cy * u, sx + STEM.x1 * u, sy + STEM.y1 * u);
  for (let i = 0; i < LEAVES.length; i++) {
    const [bx, by, tx, ty, w] = LEAVES[i]!;
    leafPath(ctx, sx + bx * u, sy + by * u, sx + tx * u, sy + ty * u, w * u);
  }
  pass.tube(ctx, N_GREEN, tubeW(u, 0.8), breath(t, 4.1));

  if (!pass.mirrored) {
    ctx.beginPath();
    for (let i = 0; i < STANDOFFS.length; i++) {
      const [x, y] = STANDOFFS[i]!;
      circle(ctx, sx + x * u, sy + y * u, Math.max(1, u * 0.0055));
    }
    ctx.fillStyle = HARDWARE;
    ctx.fill();
    // A small gallery label in the corner.
    const lw = u * 0.032;
    const lh = u * 0.019;
    const lx = g.px + g.pw - u * 0.014 - lw;
    const ly = g.hy - u * 0.016 - lh;
    ctx.fillStyle = LABEL;
    ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = LABEL_TEXT;
    ctx.fillRect(lx + lw * 0.15, ly + lh * 0.28, lw * 0.6, Math.max(0.6, lh * 0.14));
    ctx.fillRect(lx + lw * 0.15, ly + lh * 0.58, lw * 0.4, Math.max(0.6, lh * 0.12));
  }
}

/** The far layer: the arch and the panel, with their light spilling on the wall. */
export function far(ctx: Ctx, s: Scene): void {
  const g = gallery(s);
  if (g.hy - galleryTop(g) * 1.3 > s.cssH) return;
  const u = g.u;
  glow(ctx, N_ORANGE.wash, g.ax, g.hy - g.ah * 0.55, u * 0.125, g.ah * 0.5, breath(s.t, 0));
  glow(ctx, N_GREEN.wash, g.px + g.pw / 2, g.hy - g.ph * 0.5, u * 0.115, g.ph * 0.48, breath(s.t, 4.1));
  drawArch(ctx, g, s.t, REAL);
  drawPanel(ctx, g, s.t, REAL);
}

/** Their reflections and light pools in the polished floor (drawn in the ground layer). */
export function farReflections(ctx: Ctx, s: Scene): void {
  const g = gallery(s);
  if (g.hy > s.cssH) return;
  const u = g.u;
  glow(ctx, N_ORANGE.pool, g.ax, g.hy + u * 0.012, u * 0.12, u * 0.03, breath(s.t, 0));
  glow(ctx, N_GREEN.pool, g.px + g.pw / 2, g.hy + u * 0.012, u * 0.115, u * 0.028, breath(s.t, 4.1));
  beginMirror(ctx, g.hy, u * 0.24);
  drawArch(ctx, g, s.t, REFLECTION);
  drawPanel(ctx, g, s.t, REFLECTION);
  endMirror(ctx);
}
