import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLUE, GOLD, GREEN, N_GOLD, N_PINK, PINK, WARM_WHITE } from "./colors";
import { gallery, gaugeBottom, START_GROUND, startHorizon, tubeW } from "./layout";
import { crescentPath, sparklePath } from "./shapes";
import { breath, glow, tube } from "./tube";

// The Minimal sky: a gold crescent-moon line (with the faint ring of its dark side) hung right
// of the HUD, one small pink sparkle beside it, and, as you climb, a few constellations
// traced as simple geometric figures (triangle, diamond, a dipper line) drifting slowly down
// the sides, clear of the tower column. All slow, all dim.

/**
 * Moon radius and center, fixed on screen (it bobs a hair): right of the HUD column, below
 * the tilt gauge's line, and clear of the gallery panel's top at the start view.
 */
const MOON: [number, number, number] = [0, 0, 0];

export function moon(s: Scene): readonly [number, number, number] {
  const u = s.u;
  const r = u * 0.062;
  let x = Math.min(s.cssW * 0.8 + r + u * 0.012, s.cssW - r - u * 0.045);
  const hy = startHorizon(s);
  const y = Math.max(gaugeBottom(s) + r, Math.min(s.cssH * 0.3, hy - u * 0.55));
  const g = gallery(s);
  if (y + r + u * 0.03 > hy - g.ph && x - r < g.px + g.pw) {
    x = Math.min(Math.max(x, g.px + g.pw + r + u * 0.02), s.cssW - r - u * 0.02);
  }
  MOON[0] = x;
  MOON[1] = y + Math.sin(s.t * 0.33) * u * 0.005;
  MOON[2] = r;
  return MOON;
}

export function celestial(ctx: Ctx, s: Scene): void {
  const [x, y, r] = moon(s);
  const b = breath(s.t, 0.7);
  glow(ctx, N_GOLD.wash, x, y, r * 2.1, r * 2.1, 0.8 * b);

  // The dark side, a whisper of a ring.
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.strokeStyle = N_GOLD.ghost;
  ctx.lineWidth = Math.max(1, s.u * 0.0028);
  ctx.stroke();

  ctx.beginPath();
  crescentPath(ctx, x, y, r, 0.9, 0.36, -0.72);
  tube(ctx, N_GOLD, tubeW(s.u, 1.05), b);

  // A small pink sparkle off the moon's dark side, twinkling slowly. Kept well in from the
  // screen edge: the teeter camera rolls and zooms the scene outward.
  const tw = 0.6 + 0.4 * Math.sin(s.t * 0.9 + 1.2);
  ctx.beginPath();
  sparklePath(ctx, Math.min(x + r * 0.8, s.cssW - s.u * 0.06), y - r * 1.4, s.u * (0.011 + 0.003 * tw));
  tube(ctx, N_PINK, Math.max(1, s.u * 0.003), tw);
}

/** Constellation figures: side (0 left, 1 right), height above the start ground (u), points (u), closed. */
const FIGURES: readonly { side: number; k: number; color: string; closed: boolean; pts: readonly (readonly [number, number])[] }[] = [
  {
    side: 1,
    k: 1.8,
    color: BLUE,
    closed: true,
    pts: [
      [-0.055, 0.045],
      [0.06, 0.035],
      [0.0, -0.055],
    ],
  },
  {
    side: 0,
    k: 2.45,
    color: PINK,
    closed: true,
    pts: [
      [0, -0.065],
      [0.04, 0],
      [0, 0.065],
      [-0.04, 0],
    ],
  },
  {
    side: 1,
    k: 3.1,
    color: GREEN,
    closed: false,
    pts: [
      [-0.07, 0.04],
      [-0.03, 0.012],
      [0.012, 0.02],
      [0.04, -0.012],
      [0.065, -0.05],
    ],
  },
  {
    // A little arch of stars.
    side: 0,
    k: 3.75,
    color: GOLD,
    closed: false,
    pts: [
      [-0.055, 0.04],
      [-0.048, -0.012],
      [-0.016, -0.046],
      [0.016, -0.046],
      [0.048, -0.012],
      [0.055, 0.04],
    ],
  },
];

/** Constellations scroll at this parallax and repeat every FIGURE_SPAN u, so the climb never runs out. */
const FIGURE_P = 0.18;
const FIGURE_SPAN = 3.2;

function figure(ctx: Ctx, s: Scene, i: number, x: number, y: number, a: number): void {
  const f = FIGURES[i]!;
  const u = s.u;
  ctx.beginPath();
  for (let j = 0; j < f.pts.length; j++) {
    const [px, py] = f.pts[j]!;
    if (j === 0) ctx.moveTo(x + px * u, y + py * u);
    else ctx.lineTo(x + px * u, y + py * u);
  }
  if (f.closed) ctx.closePath();
  ctx.globalAlpha = 0.3 * a;
  ctx.strokeStyle = f.color;
  ctx.lineWidth = Math.max(1, u * 0.0025);
  ctx.stroke();

  ctx.beginPath();
  for (const [px, py] of f.pts) sparklePath(ctx, x + px * u, y + py * u, u * 0.008);
  ctx.globalAlpha = a * (0.55 + 0.3 * Math.sin(s.t * 0.8 + i * 2.1));
  ctx.strokeStyle = WARM_WHITE;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function sky(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const span = FIGURE_SPAN * u;
  // Above the screen at the start (k >= 1.8); they slide into view as you climb.
  const off = (s.rise * FIGURE_P) % span;
  const half = s.baseW > 0 ? s.baseW / 2 + u * 0.05 : u * 0.25;
  const leftX = (s.cssW / 2 - half) / 2;
  const rightX = s.cssW - leftX;
  const my = moon(s)[1];
  for (let i = 0; i < FIGURES.length; i++) {
    const f = FIGURES[i]!;
    const y = s.cssH * START_GROUND - f.k * u + off;
    const x = f.side ? rightX : leftX;
    placeFigure(ctx, s, i, x, y, my);
    placeFigure(ctx, s, i, x, y - span, my);
  }
  ctx.globalAlpha = 1;
}

/** Fade in from the top edge, out well above the gallery pieces (and around the moon). */
function placeFigure(ctx: Ctx, s: Scene, i: number, x: number, y: number, moonY: number): void {
  const u = s.u;
  let a = Math.min(1, Math.max(0, (y + u * 0.05) / (u * 0.2)), Math.max(0, (s.horizonY - u * 0.5 - y) / (u * 0.25)));
  if (FIGURES[i]!.side) a = Math.min(a, Math.max(0, (Math.abs(y - moonY) - u * 0.19) / (u * 0.12)));
  if (a > 0.01) figure(ctx, s, i, x, y, a);
}
