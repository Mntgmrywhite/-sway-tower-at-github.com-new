import { circle, ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, INK, PEARL, PURPLE, STAND, STAND_DARK, THREE } from "./colors";
import { centerX, inkW } from "./place";
import { block, fleurPath, swagPath } from "./shapes";
import { trumpet } from "./icons";
import { beadsOn, RAILS } from "./trim";

// The reviewing stand the bars are stacked on: a royal box set up at the curb for the parade,
// its front a purple velvet drape in deep pleats with a gold fringe along its foot, swags of
// purple, green and gold bunting under a cream-and-gold rail with gold rosettes where they meet,
// strings of beads hung over the rail between them, swinging, and in the middle a gold medallion
// with a fleur-de-lis over two crossed gold trumpets. Its top edge is the tower's floor. Everything here is near: flat two-tone
// fills and one ink weight, and nothing rises above the floor line (the parade passes in front
// of it).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The platform's half width, the rail's height, and the stand's foot. */
const STAND_HW = 0.235;
const RAIL_H = 0.03;
const STAND_FOOT = 0.2;
/** The bunting's swags along the front: how many, how deep they sag. */
const SWAGS = 5;
const SAG = 0.022;
/** The medallion's radius (u). */
const MEDAL_R = 0.042;

export function reviewingStand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const hw = STAND_HW * u;
  const top = g + RAIL_H * u;
  const foot = g + STAND_FOOT * u;

  // The drape: purple velvet in deep pleats, a gold fringe along its foot.
  ctx.beginPath();
  ctx.rect(cx - hw, top, hw * 2, foot - top);
  ctx.fillStyle = STAND_DARK.body;
  ctx.fill();
  const pleat = u * 0.03;
  ctx.fillStyle = STAND_DARK.light;
  ctx.beginPath();
  for (let x = cx - hw + pleat * 0.3; x < cx + hw - pleat * 0.3; x += pleat) {
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + pleat * 0.18, (top + foot) / 2, x + pleat * 0.06, foot);
    ctx.lineTo(x + pleat * 0.36, foot);
    ctx.quadraticCurveTo(x + pleat * 0.44, (top + foot) / 2, x + pleat * 0.3, top);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = STAND_DARK.shade;
  ctx.beginPath();
  for (let x = cx - hw + pleat * 0.75; x < cx + hw - pleat * 0.1; x += pleat) ctx.rect(x, top, Math.max(1, u * 0.004), foot - top);
  ctx.fill();
  const fringe = u * 0.022;
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.moveTo(cx - hw, foot - fringe);
  ctx.lineTo(cx + hw, foot - fringe);
  ctx.lineTo(cx + hw, foot);
  for (let x = cx + hw; x > cx - hw; x -= u * 0.009) {
    ctx.lineTo(x - u * 0.0045, foot - fringe * 0.55);
    ctx.lineTo(x - u * 0.009, foot);
  }
  ctx.lineTo(cx - hw, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(cx - hw, foot - fringe, hw * 2, u * 0.0025);
  ctx.beginPath();
  ctx.rect(cx - hw, top, hw * 2, foot - top);
  ink(ctx, lw, INK);

  // Beads hung over the rail between the swags, swinging (below the floor line, so they may).
  const span = (hw * 2) / SWAGS;
  const rail = RAILS[0]!;
  rail.x0 = cx - hw;
  rail.x1 = cx + hw;
  rail.y = top + u * 0.004;
  rail.first = 1;
  beadsOn(ctx, u, RAILS, 1, lw, s.t * 1.1, 0.07, span / u);

  // The bunting: swags along the rail's foot, each in its color with a lit top and a shaded fold.
  for (let i = 0; i < SWAGS; i++) {
    const c = THREE[i % 3]!;
    const x0 = cx - hw + i * span;
    ctx.beginPath();
    swagPath(ctx, x0, x0 + span, top, SAG * u);
    ctx.fillStyle = c.body;
    ctx.fill();
    ink(ctx, lw * 0.85, INK);
    ctx.fillStyle = c.shade;
    ctx.beginPath();
    ctx.moveTo(x0 + span * 0.2, top + SAG * u * 0.9);
    ctx.quadraticCurveTo(x0 + span * 0.5, top + SAG * u * 1.9, x0 + span * 0.8, top + SAG * u * 0.9);
    ctx.quadraticCurveTo(x0 + span * 0.5, top + SAG * u * 1.5, x0 + span * 0.2, top + SAG * u * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(x0 + span * 0.15, top + u * 0.003);
    ctx.quadraticCurveTo(x0 + span * 0.5, top + SAG * u, x0 + span * 0.85, top + u * 0.003);
    ctx.quadraticCurveTo(x0 + span * 0.5, top + SAG * u * 0.5, x0 + span * 0.15, top + u * 0.003);
    ctx.closePath();
    ctx.fill();
  }
  // Gold rosettes where the swags meet.
  ctx.beginPath();
  for (let i = 0; i <= SWAGS; i++) circle(ctx, cx - hw + i * span, top + u * 0.004, u * 0.01);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  for (let i = 0; i <= SWAGS; i++) circle(ctx, cx - hw + i * span, top + u * 0.004, u * 0.004);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();

  // The medallion: a gold ring round a purple disc with a gold fleur-de-lis, a ring of pearls,
  // and two gold trumpets crossed behind it, their bells flaring out either side.
  const my = top + u * 0.09;
  const r = MEDAL_R * u;
  for (const m of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + m * r * 1.15, my - r * 0.25);
    ctx.scale(m, 1);
    ctx.rotate(-0.42);
    const k = r * 1.5;
    // The outline first (the trumpet drawn a little bigger in ink), then the gold over it.
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 2;
    ctx.lineJoin = "round";
    trumpet(ctx, 0, 0, k);
    ctx.stroke();
    ctx.fillStyle = GOLD.body;
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = 1;
    trumpet(ctx, 0, 0, k);
    ctx.restore();
  }
  ctx.beginPath();
  circle(ctx, cx, my, r);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, cx, my, r * 0.78);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, my - r * 0.1);
  ctx.arc(cx, my, r * 0.7, Math.PI * 1.05, Math.PI * 1.55);
  ctx.lineTo(cx, my - r * 0.55);
  ctx.arc(cx, my, r * 0.55, Math.PI * 1.55, Math.PI * 1.05, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PEARL;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * r * 0.89, my + Math.sin(a) * r * 0.89, r * 0.055);
  }
  ctx.fill();
  ctx.beginPath();
  fleurPath(ctx, cx, my, r * 1.05);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fill();

  // The platform's top: a cream rail along the floor line, a gold edge and a shaded underside.
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g, hw * 2 + u * 0.012, RAIL_H * u, u * 0.005);
  ctx.fillStyle = STAND.body;
  ctx.fill();
  ctx.fillStyle = STAND.light;
  ctx.fillRect(cx - hw, g + lw * 0.5, hw * 2, RAIL_H * u * 0.3);
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(cx - hw, g + RAIL_H * u * 0.55, hw * 2, RAIL_H * u * 0.18);
  ctx.fillStyle = STAND.shade;
  ctx.fillRect(cx - hw, g + RAIL_H * u * 0.76, hw * 2, RAIL_H * u * 0.16);
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g, hw * 2 + u * 0.012, RAIL_H * u, u * 0.005);
  ink(ctx, lw, INK);
}
