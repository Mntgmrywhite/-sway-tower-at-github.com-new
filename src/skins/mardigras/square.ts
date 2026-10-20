import { circle, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { streetLevel } from "./place";
import { block } from "./shapes";
import type { Tone } from "./tone";

// The cathedral's square, between the river and the street, which only shows as you climb and
// the townhouses drop away below: pale paving in front of the cathedral, a fenced garden of
// lawns with paths crossing to a round fountain, trees round it, and long brick rows with
// galleries down either side (our own generic design). Far off, so flat and faded, with no
// outline, and still: it lies right behind the tower.
//
// It all lies below the horizon on every screen and at every height: a thing standing at depth
// f is never taller than SKY_GAP * f, the least the gap between the horizon and the street ever
// is (at the start), so nothing of it ever stands against the sky, the river, the riverboat,
// the streetcar or the live oak.
//
// Positions are in u from the screen's center; depth f runs from 0 on the horizon (the
// cathedral's steps) to 1 at the far sidewalk (the townhouses' feet).

/** The least the street ever lies below the horizon (u): at the start (place.ts STREET_UP 0.14 vs the horizon's 0.3). */
export const SKY_GAP = 0.16;

/** Screen y of a row of the square at depth f. */
function rowY(s: Scene, f: number): number {
  return s.horizonY + (streetLevel(s) - s.horizonY) * f;
}

/** The plaza's half width and depth range; the garden's. */
const PLAZA_HW = 0.42;
const PLAZA = [0.04, 0.96] as const;
const GARDEN_HW = 0.31;
const GARDEN = [0.16, 0.84] as const;
/** The fountain's depth and half width (u). */
const FOUNTAIN_F = 0.5;
const FOUNTAIN_HW = 0.05;
/** Trees round the garden, back to front: [X (u), depth]. */
const TREES = [
  [-0.2, 0.12],
  [0.2, 0.12],
  [-0.35, 0.24],
  [0.35, 0.24],
  [-0.35, 0.42],
  [0.35, 0.42],
  [-0.35, 0.6],
  [0.35, 0.6],
  [-0.35, 0.78],
  [0.35, 0.78],
  [-0.2, 0.9],
  [0.2, 0.9],
] as const;
/** The brick rows down either side: their inner edge (u from center), how far out they run, their depth and height (u). */
const ROW_IN = 0.44;
const ROW_OUT = 2.2;
const ROW_F = 0.56;
const ROW_H = 0.078;

/** A tree's crown radius at depth f: smaller further off, and short enough to stay under the horizon. */
function treeR(u: number, f: number): number {
  return u * Math.min(0.026 * (0.6 + f), (SKY_GAP * f) / 2.5);
}

/** The square: the plaza, the garden with its paths, fence and fountain, the trees and the brick rows. */
export function square(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  if (rowY(s, PLAZA[0]) > s.cssH) return;
  // The plaza.
  const p0 = rowY(s, PLAZA[0]);
  const p1 = rowY(s, PLAZA[1]);
  ctx.fillStyle = tone.plaza;
  ctx.fillRect(cx - PLAZA_HW * u, p0, PLAZA_HW * 2 * u, p1 - p0);
  // The garden: rounded lawns, with paths crossing corner to corner to a ring round the fountain.
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
  ctx.strokeStyle = tone.plaza;
  ctx.lineWidth = Math.max(1, u * 0.012);
  ctx.beginPath();
  ctx.moveTo(gx0 + corner * 0.6, g0 + corner * 0.3);
  ctx.lineTo(gx1 - corner * 0.6, g1 - corner * 0.3);
  ctx.moveTo(gx1 - corner * 0.6, g0 + corner * 0.3);
  ctx.lineTo(gx0 + corner * 0.6, g1 - corner * 0.3);
  oval(ctx, cx, fy, u * 0.11, ry);
  ctx.stroke();
  // The low iron fence round the garden.
  ctx.strokeStyle = tone.slate;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.beginPath();
  block(ctx, gx0, g0, gx1 - gx0, g1 - g0, corner);
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
  ctx.fillRect(cx - u * 0.004, fy - u * 0.03, u * 0.008, u * 0.03);
  ctx.fillStyle = tone.riverLit;
  ctx.beginPath();
  oval(ctx, cx, fy - u * 0.034, u * 0.014, u * 0.008);
  ctx.fill();
  // The brick rows either side, standing at ROW_F: a long front with two galleries and rows of windows, a slate roof edge.
  const ry0 = rowY(s, ROW_F);
  const top = ry0 - ROW_H * u;
  for (const m of [-1, 1]) {
    const a = cx + m * ROW_IN * u;
    const b = cx + m * ROW_OUT * u;
    const x0 = Math.min(a, b);
    const w = Math.abs(b - a);
    ctx.fillStyle = tone.brick;
    ctx.fillRect(x0, top, w, ROW_H * u);
    ctx.fillStyle = tone.slate;
    ctx.fillRect(x0, top, w, u * 0.008);
    ctx.fillStyle = tone.plaza;
    ctx.fillRect(x0, top + ROW_H * u * 0.36, w, u * 0.004);
    ctx.fillRect(x0, top + ROW_H * u * 0.68, w, u * 0.004);
    ctx.fillStyle = tone.stoneShade;
    ctx.beginPath();
    const step = u * 0.03;
    for (let x = a + m * step * 0.6; m > 0 ? x < b : x > b; x += m * step) {
      if (x < -step || x > s.cssW + step) continue;
      ctx.rect(x - u * 0.006, top + ROW_H * u * 0.14, u * 0.012, ROW_H * u * 0.18);
      ctx.rect(x - u * 0.006, top + ROW_H * u * 0.45, u * 0.012, ROW_H * u * 0.2);
      ctx.rect(x - u * 0.006, top + ROW_H * u * 0.76, u * 0.012, ROW_H * u * 0.24);
    }
    ctx.fill();
  }
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
