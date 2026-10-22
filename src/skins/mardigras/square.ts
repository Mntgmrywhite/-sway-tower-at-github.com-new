import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { streetLevel } from "./place";
import { block } from "./shapes";
import type { Tone } from "./tone";

// The cathedral's square, between the river and the street, which shows behind the row of
// cottages as you climb and the street drops away below: pale paving in front of the cathedral, a
// garden of lawns with soft paths crossing to a round fountain, round trees about it, gas
// lamps at its corners, and down either side, in the lanes, two long red-brick rows with two
// tiers of lacy galleries and a slate roof with dormers and chimneys (our own generic design),
// their windows lit by night. Far off, so flat and faded, with no outline, and still: it lies
// right behind the tower, and the garden in the middle is the calmest part of it.
//
// It all lies below the horizon on every screen and at every height: a thing standing at depth
// f is never taller than SKY_GAP * f, the least the gap between the horizon and the street ever
// is (at the start), so nothing of it ever stands against the sky, the river or the rooftops.
//
// Positions are in u from the screen's center; depth f runs from 0 on the horizon (the
// cathedral's steps) to 1 at the far sidewalk (the townhouses' feet).

/** The least the street ever lies below the horizon (u): at the start (place.ts STREET_UP 0.14 vs the horizon's 0.3). */
export const SKY_GAP = 0.16;

/** Screen y of a row of the square at depth f. */
function rowY(s: Scene, f: number): number {
  return s.horizonY + (streetLevel(s) - s.horizonY) * f;
}

/** The plaza's depth range; the garden's half width and depth range. */
const PLAZA = [0.04, 0.96] as const;
const GARDEN_HW = 0.24;
const GARDEN = [0.16, 0.84] as const;
/** The fountain's depth and half width (u). */
const FOUNTAIN_F = 0.5;
const FOUNTAIN_HW = 0.05;
/** Trees round the garden, back to front: [X (u), depth]. */
const TREES = [
  [-0.16, 0.12],
  [0.16, 0.12],
  [-0.27, 0.3],
  [0.27, 0.3],
  [-0.27, 0.55],
  [0.27, 0.55],
  [-0.27, 0.8],
  [0.27, 0.8],
  [-0.16, 0.92],
  [0.16, 0.92],
] as const;
/** The brick rows down either side: their inner edge (u from center), how far out they run, their depth and height (u, at most SKY_GAP times their depth). */
const ROW_IN = 0.33;
const ROW_OUT = 2.2;
const ROW_F = 0.62;
const ROW_H = 0.074;
/** How far apart their bays are (u). */
const BAY = 0.028;

/** A tree's crown radius at depth f: smaller further off, and short enough to stay under the horizon. */
function treeR(u: number, f: number): number {
  return u * Math.min(0.026 * (0.6 + f), (SKY_GAP * f) / 2.5);
}

/** The square: the plaza, the garden with its paths, fence, fountain and lamps, the trees and the brick rows. */
export function square(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  if (rowY(s, PLAZA[0]) > s.cssH) return;
  // The plaza, across the screen.
  const p0 = rowY(s, PLAZA[0]);
  const p1 = rowY(s, PLAZA[1]);
  ctx.fillStyle = tone.plaza;
  ctx.fillRect(0, p0, s.cssW, p1 - p0);
  // The garden: rounded lawns, with soft paths crossing corner to corner to a ring round the fountain.
  const g0 = rowY(s, GARDEN[0]);
  const g1 = rowY(s, GARDEN[1]);
  const gx0 = cx - GARDEN_HW * u;
  const gx1 = cx + GARDEN_HW * u;
  const corner = Math.min(u * 0.04, (g1 - g0) * 0.3);
  ctx.fillStyle = tone.lawn;
  ctx.beginPath();
  block(ctx, gx0, g0, gx1 - gx0, g1 - g0, corner);
  ctx.fill();
  const fy = rowY(s, FOUNTAIN_F);
  const ry = (g1 - g0) * 0.2;
  ctx.strokeStyle = tone.path;
  ctx.lineWidth = Math.max(1, u * 0.01);
  ctx.beginPath();
  ctx.moveTo(gx0 + corner * 0.6, g0 + corner * 0.3);
  ctx.lineTo(gx1 - corner * 0.6, g1 - corner * 0.3);
  ctx.moveTo(gx1 - corner * 0.6, g0 + corner * 0.3);
  ctx.lineTo(gx0 + corner * 0.6, g1 - corner * 0.3);
  oval(ctx, cx, fy, u * 0.09, ry);
  ctx.stroke();
  // The fountain: a round stone basin of water, a spout and its splash.
  ctx.fillStyle = tone.stoneShade;
  ctx.beginPath();
  oval(ctx, cx, fy, FOUNTAIN_HW * u, ry * 0.5);
  ctx.fill();
  ctx.fillStyle = tone.river;
  ctx.beginPath();
  oval(ctx, cx, fy - ry * 0.05, FOUNTAIN_HW * u * 0.8, ry * 0.36);
  ctx.fill();
  ctx.fillStyle = tone.stone;
  ctx.fillRect(cx - u * 0.004, fy - u * 0.02, u * 0.008, u * 0.02);
  ctx.fillStyle = tone.riverLit;
  ctx.beginPath();
  oval(ctx, cx, fy - u * 0.024, u * 0.012, u * 0.006);
  ctx.fill();
  // The brick rows either side: a long front under a slate roof with dormers and chimneys, two
  // tiers of galleries (their iron as a dark band with a lit rail), a row of tall windows behind
  // each, and doors at the foot, lit by night.
  const ry0 = rowY(s, ROW_F);
  const top = ry0 - ROW_H * u;
  const roofH = ROW_H * u * 0.16;
  const half = s.cssW / 2 / u + 0.05;
  const lit = tone.lit > 0.3;
  const each = (f: (x: number, m: number) => void) => {
    for (const m of [-1, 1]) {
      for (let X = ROW_IN + BAY * 0.5; X < Math.min(ROW_OUT, half); X += BAY) f(cx + m * X * u, m);
    }
  };
  for (const m of [-1, 1]) {
    const a = cx + m * ROW_IN * u;
    const b = cx + m * Math.min(ROW_OUT, half) * u;
    const x0 = Math.min(a, b);
    const w = Math.abs(b - a);
    ctx.fillStyle = tone.brick;
    ctx.fillRect(x0, top, w, ROW_H * u);
    ctx.fillStyle = tone.slate;
    ctx.fillRect(x0, top - roofH, w, roofH);
  }
  // Dormers and chimneys on the roofs.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  let i = 0;
  each((x) => {
    if (i++ % 3 === 0) ctx.rect(x - u * 0.004, top - roofH - u * 0.008, u * 0.008, u * 0.008);
  });
  ctx.fill();
  // The galleries: two dark bands of iron with a lit rail each.
  for (const m of [-1, 1]) {
    const a = cx + m * ROW_IN * u;
    const b = cx + m * Math.min(ROW_OUT, half) * u;
    const x0 = Math.min(a, b);
    const w = Math.abs(b - a);
    ctx.fillStyle = tone.stoneShade;
    ctx.fillRect(x0, top + ROW_H * u * 0.3, w, ROW_H * u * 0.07);
    ctx.fillRect(x0, top + ROW_H * u * 0.64, w, ROW_H * u * 0.07);
    ctx.fillStyle = tone.plaza;
    ctx.fillRect(x0, top + ROW_H * u * 0.3, w, Math.max(1, ROW_H * u * 0.025));
    ctx.fillRect(x0, top + ROW_H * u * 0.64, w, Math.max(1, ROW_H * u * 0.025));
  }
  // Windows and doors, a row per storey: dark by day, lit by night.
  ctx.fillStyle = lit ? tone.glow : tone.stoneShade;
  ctx.beginPath();
  each((x) => {
    ctx.rect(x - u * 0.005, top + ROW_H * u * 0.08, u * 0.01, ROW_H * u * 0.18);
    ctx.rect(x - u * 0.005, top + ROW_H * u * 0.42, u * 0.01, ROW_H * u * 0.2);
    ctx.rect(x - u * 0.006, top + ROW_H * u * 0.76, u * 0.012, ROW_H * u * 0.24);
  });
  ctx.fill();
  // Gas lamp posts at the garden's corners: thin slate strokes, too small out here for their glass.
  ctx.fillStyle = tone.slate;
  ctx.beginPath();
  for (const [X, f] of [
    [-GARDEN_HW, GARDEN[0]],
    [GARDEN_HW, GARDEN[0]],
    [-GARDEN_HW, GARDEN[1]],
    [GARDEN_HW, GARDEN[1]],
  ] as const) {
    const y = rowY(s, f);
    const h = u * Math.min(0.04, SKY_GAP * f * 0.8);
    ctx.rect(cx + X * u - u * 0.002, y - h, u * 0.004, h);
  }
  ctx.fill();
  // Trees round the garden, back to front: a short trunk and a round crown, lit on top.
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.stoneShade : pass === 1 ? tone.tree : tone.treeLit;
    ctx.beginPath();
    for (const [X, f] of TREES) {
      const r = treeR(u, f);
      const x = cx + X * u;
      const y = rowY(s, f);
      if (pass === 0) ctx.rect(x - r * 0.14, y - r * 1.1, r * 0.28, r * 1.1);
      else if (pass === 1) {
        circle(ctx, x - r * 0.5, y - r * 1.35, r * 0.62);
        circle(ctx, x + r * 0.5, y - r * 1.35, r * 0.62);
        circle(ctx, x, y - r * 1.75, r * 0.72);
      } else circle(ctx, x - r * 0.2, y - r * 2.0, r * 0.34);
    }
    ctx.fill();
  }
}
