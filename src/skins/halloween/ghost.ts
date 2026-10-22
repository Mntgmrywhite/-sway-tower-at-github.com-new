import { ink, oval, type Ctx } from "../../base/draw";
import { INK, ORANGE } from "./common";

// A sheet ghost on a stake, the homemade yard decoration: a white sheet draped over a round head
// on a wooden stake with a crossbar for arms, tied at the neck with an orange ribbon, two big oval
// eyes and a little round "oo" of a mouth, its ragged hem fluttering in the wind. Never in the sky:
// it stands planted in the churchyard's grass. Silly-spooky.

const SHEET = "#f1ece0";
const SHEET_SHADE = "#c9c2b2";
const STAKE = "#7a5a3a";

/** A sheet ghost planted at (x, y) (the stake's foot), `h` px tall, its hem fluttering by time `t`. */
export function sheetGhost(ctx: Ctx, x: number, y: number, h: number, t: number, lw: number, seed: number): void {
  const r = h * 0.17;
  const hy = y - h + r;
  const arm = h * 0.3;
  const ay = hy + r * 1.5;
  // The stake, into the ground, under the hem.
  ctx.beginPath();
  ctx.rect(x - h * 0.02, y - h * 0.32, h * 0.04, h * 0.32);
  ctx.fillStyle = STAKE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The sheet: over the head, out along the crossbar, down to a ragged hem that flutters.
  const hem = y - h * 0.3;
  const sheet = () => {
    ctx.beginPath();
    ctx.moveTo(x - r, hy);
    ctx.arc(x, hy, r, Math.PI, 0);
    ctx.quadraticCurveTo(x + r * 1.1, ay - r * 0.5, x + arm, ay - r * 0.1);
    ctx.lineTo(x + arm * 0.92, ay + r * 0.45);
    ctx.quadraticCurveTo(x + r * 1.2, ay + r * 0.4, x + r * 1.15, hem - h * 0.04);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const f = 1 - (i + 1) / n;
      const flap = Math.sin(t * 4 + i * 1.7 + seed) * h * 0.035;
      const px = x - r * 1.15 + f * r * 2.3;
      ctx.lineTo(px + r * 0.23 + flap * 0.5, hem + (i % 2 ? h * 0.02 : h * 0.07) + flap);
      ctx.lineTo(px, hem - h * 0.01);
    }
    ctx.quadraticCurveTo(x - r * 1.2, ay + r * 0.4, x - arm * 0.92, ay + r * 0.45);
    ctx.lineTo(x - arm, ay - r * 0.1);
    ctx.quadraticCurveTo(x - r * 1.1, ay - r * 0.5, x - r, hy);
    ctx.closePath();
  };
  sheet();
  ctx.fillStyle = SHEET;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = SHEET_SHADE;
  ctx.beginPath();
  ctx.rect(x + r * 0.35, hy - r, h, h);
  ctx.fill();
  ctx.restore();
  sheet();
  ink(ctx, lw, INK);
  // Folds hanging from the arms.
  ctx.beginPath();
  ctx.moveTo(x - arm * 0.6, ay + r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.9, hem - h * 0.12, x - r * 0.6, hem);
  ctx.moveTo(x + arm * 0.6, ay + r * 0.2);
  ctx.quadraticCurveTo(x + r * 0.9, hem - h * 0.12, x + r * 0.6, hem);
  ink(ctx, Math.max(0.8, lw * 0.6), SHEET_SHADE);
  // The ribbon at the neck.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, hy + r * 0.85);
  ctx.quadraticCurveTo(x, hy + r * 1.05, x + r * 0.8, hy + r * 0.85);
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = Math.max(1.5, h * 0.035);
  ctx.stroke();
  // Eyes and a little round mouth, each its own subpath.
  ctx.fillStyle = INK;
  ctx.beginPath();
  oval(ctx, x - r * 0.38, hy - r * 0.05, r * 0.17, r * 0.28);
  oval(ctx, x + r * 0.38, hy - r * 0.05, r * 0.17, r * 0.28);
  oval(ctx, x, hy + r * 0.45, r * 0.12, r * 0.15);
  ctx.fill();
}
