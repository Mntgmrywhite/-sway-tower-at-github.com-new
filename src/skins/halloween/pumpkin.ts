import { alpha, ink, mix, oval, type Ctx } from "../../base/draw";
import { CANDLE, CANDLE_HOT, CARVED, INK, MOSS, ORANGE, ORANGE_DARK, ORANGE_LIGHT, STEM } from "./common";
import { SHADOW } from "./dirt";

// The jack-o'-lantern: a flat orange pumpkin with ribs, a light top and shaded bottom, an ink
// outline, and a carved face lit from inside by a flickering candle.

/** Carved face as closed subpaths: two eyes, a nose, a jagged grin. Nothing joins up. */
function face(ctx: Ctx, px: number, py: number, pr: number): void {
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(px + side * pr * 0.6, py - pr * 0.04);
    ctx.lineTo(px + side * pr * 0.16, py - pr * 0.04);
    ctx.lineTo(px + side * pr * 0.42, py - pr * 0.46);
    ctx.closePath();
  }
  ctx.moveTo(px, py + pr * 0.04);
  ctx.lineTo(px - pr * 0.11, py + pr * 0.22);
  ctx.lineTo(px + pr * 0.11, py + pr * 0.22);
  ctx.closePath();
  ctx.moveTo(px - pr * 0.68, py + pr * 0.28);
  const teeth = 6;
  for (let i = 1; i <= teeth; i++) {
    ctx.lineTo(px - pr * 0.68 + (pr * 1.36 * i) / teeth, py + pr * (i % 2 ? 0.46 : 0.3));
  }
  ctx.quadraticCurveTo(px + pr * 0.52, py + pr * 0.74, px, py + pr * 0.74);
  ctx.quadraticCurveTo(px - pr * 0.52, py + pr * 0.74, px - pr * 0.68, py + pr * 0.28);
  ctx.closePath();
}

/** A carved pumpkin with a candle inside, sitting on the field with its bottom at `bottom`. */
export function jackOLantern(ctx: Ctx, t: number, px: number, bottom: number, pr: number, lw: number): void {
  const py = bottom - pr * 0.95;
  const flicker = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1);

  // Warm light spilling on the grass, and a contact shadow
  ctx.fillStyle = alpha(CANDLE, 0.12 + 0.05 * flicker);
  ctx.beginPath();
  oval(ctx, px, bottom, pr * 1.45, pr * 0.36);
  ctx.fill();
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  oval(ctx, px + pr * 0.1, bottom, pr * 1.15, pr * 0.24);
  ctx.fill();

  // Stem, and a curly vine with a leaf
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.12, py - pr * 0.8);
  ctx.quadraticCurveTo(px - pr * 0.1, py - pr * 1.22, px + pr * 0.22, py - pr * 1.34);
  ctx.lineTo(px + pr * 0.17, py - pr * 0.8);
  ctx.closePath();
  ctx.fillStyle = STEM;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  ctx.moveTo(px + pr * 0.1, py - pr * 0.9);
  ctx.bezierCurveTo(px + pr * 0.5, py - pr * 1.25, px + pr * 0.75, py - pr * 0.9, px + pr * 0.55, py - pr * 0.8);
  ink(ctx, Math.max(1, lw * 0.7), INK);
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.18, py - pr * 0.88);
  ctx.quadraticCurveTo(px - pr * 0.55, py - pr * 1.25, px - pr * 0.75, py - pr * 1.0);
  ctx.quadraticCurveTo(px - pr * 0.45, py - pr * 0.82, px - pr * 0.18, py - pr * 0.88);
  ctx.closePath();
  ctx.fillStyle = MOSS;
  ctx.fill();
  ink(ctx, Math.max(1, lw * 0.8), INK);

  // Body: flat orange, lit upper left, shaded underneath, with ribs
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.2, pr);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  oval(ctx, px + pr * 0.15, py + pr * 0.75, pr * 1.3, pr * 0.5);
  ctx.fill();
  ctx.fillStyle = ORANGE_LIGHT;
  ctx.beginPath();
  oval(ctx, px - pr * 0.6, py - pr * 0.5, pr * 0.32, pr * 0.2, -0.5);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 0.5, pr * 0.97, 0, Math.PI * 0.62, Math.PI * 1.38);
  ctx.moveTo(px + pr * 0.5 * Math.cos(-Math.PI * 0.38), py + pr * 0.97 * Math.sin(-Math.PI * 0.38));
  ctx.ellipse(px, py, pr * 0.5, pr * 0.97, 0, -Math.PI * 0.38, Math.PI * 0.38);
  ctx.strokeStyle = ORANGE_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.2, pr);
  ink(ctx, lw, INK);

  // The carved face, lit from inside: deep cut, candle-bright core, inked edge.
  face(ctx, px, py, pr);
  ctx.fillStyle = CARVED;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(0, pr * 0.07);
  face(ctx, px, py, pr);
  ctx.fillStyle = mix(CANDLE, CANDLE_HOT, flicker);
  ctx.fill();
  ctx.restore();
  face(ctx, px, py, pr);
  ink(ctx, Math.max(1, lw * 0.8), INK);
}
