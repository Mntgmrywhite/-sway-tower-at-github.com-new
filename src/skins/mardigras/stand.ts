import { ink, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CREST, GOLD, GREEN, INK, PURPLE, STAND, STAND_DARK } from "./colors";
import { centerX, inkW } from "./place";
import { block, fleurPath, swagPath } from "./shapes";

// The reviewing stand the bars are stacked on: a wooden platform set up at the curb for the
// parade, its front hung with swags of purple, green and gold bunting under a cream rail, a
// gold fleur-de-lis crest of our own on a purple shield in the middle, and a striped skirt
// down to the street. Its top edge is the tower's floor. Everything here is near: flat
// two-tone fills and one ink weight, and nothing rises above the floor line (the parade passes
// in front of it).
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/** The platform's half width, the rail's height, and the stand's foot. */
const STAND_HW = 0.235;
const RAIL_H = 0.03;
const STAND_FOOT = 0.2;
/** The bunting's swags along the front: how many, how deep they sag. */
const SWAGS = 5;
const SAG = 0.022;
/** The crest: the shield's half width and height, the fleur-de-lis's size. */
const SHIELD_HW = 0.04;
const SHIELD_H = 0.07;

/** The three colors of the bunting, in order along the front. */
const SWAG_COLORS = [PURPLE, GREEN, GOLD] as const;

export function reviewingStand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const g = s.groundY;
  if (g - u * 0.02 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const hw = STAND_HW * u;
  const top = g + RAIL_H * u;
  const foot = g + STAND_FOOT * u;

  // The skirt: a striped drape from under the rail to the street, purple and gold.
  ctx.beginPath();
  ctx.rect(cx - hw, top, hw * 2, foot - top);
  ctx.fillStyle = STAND_DARK.body;
  ctx.fill();
  ctx.fillStyle = STAND_DARK.light;
  ctx.beginPath();
  const stripe = u * 0.032;
  for (let x = cx - hw + stripe * 0.5; x < cx + hw - stripe * 0.4; x += stripe * 2) ctx.rect(x, top, stripe, foot - top);
  ctx.fill();
  ctx.fillStyle = STAND_DARK.shade;
  ctx.fillRect(cx - hw, foot - u * 0.02, hw * 2, u * 0.02);
  ctx.beginPath();
  ctx.rect(cx - hw, top, hw * 2, foot - top);
  ink(ctx, lw, INK);

  // The bunting: swags along the rail's foot, each in its color with a lit top and a shaded fold.
  const span = (hw * 2) / SWAGS;
  for (let i = 0; i < SWAGS; i++) {
    const c = SWAG_COLORS[i % SWAG_COLORS.length]!;
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
    // A gold rosette where the swags meet.
    ctx.beginPath();
    ctx.moveTo(x0 + u * 0.009, top + u * 0.004);
    ctx.arc(x0, top + u * 0.004, u * 0.009, 0, Math.PI * 2);
    ctx.fillStyle = GOLD.body;
    ctx.fill();
    ink(ctx, lw * 0.7, INK);
  }
  ctx.beginPath();
  ctx.moveTo(cx + hw + u * 0.009, top + u * 0.004);
  ctx.arc(cx + hw, top + u * 0.004, u * 0.009, 0, Math.PI * 2);
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);

  // The crest: a purple shield with a gold fleur-de-lis, hung in the middle of the skirt.
  const sy = top + u * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - SHIELD_HW * u, sy);
  ctx.lineTo(cx + SHIELD_HW * u, sy);
  ctx.lineTo(cx + SHIELD_HW * u, sy + SHIELD_H * u * 0.55);
  ctx.quadraticCurveTo(cx + SHIELD_HW * u * 0.9, sy + SHIELD_H * u, cx, sy + SHIELD_H * u);
  ctx.quadraticCurveTo(cx - SHIELD_HW * u * 0.9, sy + SHIELD_H * u, cx - SHIELD_HW * u, sy + SHIELD_H * u * 0.55);
  ctx.closePath();
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = PURPLE.light;
  ctx.fillRect(cx - SHIELD_HW * u + lw, sy + lw, SHIELD_HW * u * 0.5, SHIELD_H * u * 0.5);
  ctx.beginPath();
  fleurPath(ctx, cx, sy + SHIELD_H * u * 0.5, SHIELD_H * u * 0.72);
  ctx.fillStyle = CREST.body;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.fill();

  // The platform's top: a cream rail along the floor line, a lit edge and a shaded underside.
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g, hw * 2 + u * 0.012, RAIL_H * u, u * 0.005);
  ctx.fillStyle = STAND.body;
  ctx.fill();
  ctx.fillStyle = STAND.light;
  ctx.fillRect(cx - hw, g + lw * 0.5, hw * 2, RAIL_H * u * 0.3);
  ctx.fillStyle = STAND.shade;
  ctx.fillRect(cx - hw, g + RAIL_H * u * 0.72, hw * 2, RAIL_H * u * 0.2);
  ctx.beginPath();
  block(ctx, cx - hw - u * 0.006, g, hw * 2 + u * 0.012, RAIL_H * u, u * 0.005);
  ink(ctx, lw, INK);
}
