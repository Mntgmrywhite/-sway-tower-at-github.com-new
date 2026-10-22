import { oval, type Ctx } from "../../base/draw";
import { CHARCOAL, GHOST_GREEN, GHOST_WHITE, HOLLOW, INK, SKIN_SHADE, STRIPE_BLACK, STRIPE_WHITE } from "./cast/palette";

// A sheet ghost on a stake, the homemade yard decoration, drawn the Burton way: a ghost-white
// sheet draped over a round head on a crooked stake with a crossbar for arms, tied at the neck
// with a black-and-white striped ribbon, two big hollow drooping eyes and a little round "oo" of a
// mouth, a moth hole or two, its long tattered hem fluttering in the wind; lilac shade on its
// far side and a ghost-green glow round its edge. It stands planted in the churchyard's grass.
// Silly-spooky.

/** Scratch geometry of the sheet being drawn, so its path can be laid down twice without a closure. */
const G = { x: 0, y: 0, h: 0, r: 0, hy: 0, arm: 0, ay: 0, hem: 0, t: 0, seed: 0 };

function sheetPath(ctx: Ctx): void {
  const { x, h, r, hy, arm, ay, hem, t, seed } = G;
  ctx.beginPath();
  ctx.moveTo(x - r, hy);
  ctx.arc(x, hy, r, Math.PI, 0);
  ctx.quadraticCurveTo(x + r * 1.1, ay - r * 0.5, x + arm, ay - r * 0.1);
  ctx.lineTo(x + arm * 0.9, ay + r * 0.5);
  ctx.quadraticCurveTo(x + r * 1.2, ay + r * 0.4, x + r * 1.12, hem - h * 0.06);
  // The tattered hem: long uneven points, fluttering.
  const n = 6;
  for (let i = 0; i < n; i++) {
    const f = 1 - (i + 1) / n;
    const flap = Math.sin(t * 4 + i * 1.7 + seed) * h * 0.03;
    const px = x - r * 1.12 + f * r * 2.24;
    const deep = i % 3 === 1 ? 0.085 : i % 2 ? 0.03 : 0.06;
    ctx.lineTo(px + r * 0.2 + flap * 0.5, hem + h * deep + flap);
    ctx.lineTo(px, hem - h * 0.015);
  }
  ctx.quadraticCurveTo(x - r * 1.2, ay + r * 0.4, x - arm * 0.9, ay + r * 0.5);
  ctx.lineTo(x - arm, ay - r * 0.1);
  ctx.quadraticCurveTo(x - r * 1.1, ay - r * 0.5, x - r, hy);
  ctx.closePath();
}

/** A sheet ghost planted at (x, y) (the stake's foot), `h` px tall, its hem fluttering by time `t`. */
export function sheetGhost(ctx: Ctx, x: number, y: number, h: number, t: number, lw: number, seed: number): void {
  const r = h * 0.17;
  G.x = x;
  G.y = y;
  G.h = h;
  G.r = r;
  G.hy = y - h + r;
  G.arm = h * 0.29;
  G.ay = G.hy + r * 1.5;
  G.hem = y - h * 0.32;
  G.t = t;
  G.seed = seed;
  const { hy, ay, hem, arm } = G;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The crooked stake, into the ground, under the hem.
  ctx.beginPath();
  ctx.moveTo(x - h * 0.018, y);
  ctx.lineTo(x - h * 0.02, y - h * 0.34);
  ctx.lineTo(x + h * 0.025, y - h * 0.34);
  ctx.lineTo(x + h * 0.016, y);
  ctx.closePath();
  ctx.fillStyle = CHARCOAL;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  // The sheet, its far side in lilac shade, a ghost-green glow round its edge, inked.
  sheetPath(ctx);
  ctx.fillStyle = GHOST_WHITE;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.3, hy - r * 0.96);
  ctx.arc(x, hy, r, -0.4 * Math.PI, 0);
  ctx.quadraticCurveTo(x + r * 1.1, ay - r * 0.5, x + arm, ay - r * 0.1);
  ctx.lineTo(x + arm * 0.9, ay + r * 0.5);
  ctx.quadraticCurveTo(x + r * 1.2, ay + r * 0.4, x + r * 1.12, hem - h * 0.06);
  ctx.lineTo(x + r * 0.5, hem);
  ctx.quadraticCurveTo(x + r * 0.7, ay, x + r * 0.3, hy - r * 0.96);
  ctx.closePath();
  ctx.fillStyle = SKIN_SHADE;
  ctx.fill();
  sheetPath(ctx);
  ctx.strokeStyle = GHOST_GREEN;
  ctx.lineWidth = lw * 1.5;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  // Folds hanging from the arms.
  ctx.beginPath();
  ctx.moveTo(x - arm * 0.6, ay + r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.9, hem - h * 0.12, x - r * 0.6, hem);
  ctx.moveTo(x + arm * 0.6, ay + r * 0.2);
  ctx.quadraticCurveTo(x + r * 0.9, hem - h * 0.12, x + r * 0.6, hem);
  ctx.strokeStyle = SKIN_SHADE;
  ctx.lineWidth = Math.max(0.8, lw * 0.6);
  ctx.stroke();
  // The striped ribbon at the neck.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, hy + r * 0.85);
  ctx.quadraticCurveTo(x, hy + r * 1.05, x + r * 0.8, hy + r * 0.85);
  ctx.strokeStyle = STRIPE_BLACK;
  ctx.lineWidth = Math.max(1.5, h * 0.035);
  ctx.stroke();
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(x + i * r * 0.4, hy + r * 0.88 + Math.abs(i) * -0.05 * r);
    ctx.lineTo(x + i * r * 0.4 + r * 0.08, hy + r * 0.98 + Math.abs(i) * -0.05 * r);
  }
  ctx.strokeStyle = STRIPE_WHITE;
  ctx.lineWidth = Math.max(0.8, h * 0.012);
  ctx.stroke();
  // Big hollow eyes drooping at the corners, a little round mouth, and two moth holes.
  ctx.fillStyle = HOLLOW;
  ctx.beginPath();
  oval(ctx, x - r * 0.4, hy - r * 0.02, r * 0.2, r * 0.32, 0.2);
  oval(ctx, x + r * 0.4, hy - r * 0.02, r * 0.2, r * 0.32, -0.2);
  oval(ctx, x, hy + r * 0.5, r * 0.1, r * 0.14);
  oval(ctx, x - r * 0.55, ay + r * 1.3, r * 0.08, r * 0.06);
  oval(ctx, x + r * 0.35, ay + r * 1.9, r * 0.06, r * 0.05);
  ctx.fill();
}
