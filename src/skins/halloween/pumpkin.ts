import { alpha, ink, oval, type Ctx } from "../../base/draw";
import { CANDLE, CANDLE_HOT, CARVED, INK, MOSS, ORANGE, ORANGE_DARK, ORANGE_LIGHT, STEM } from "./common";

// The giant jack-o'-lantern, our own: a tall, slightly lopsided pumpkin with deep ribs, a light
// top and a shaded bottom, an ink outline, a curly stem whose vine winds into spirals, and a
// crooked carved face (slanted eyes, a nose, a wide jagged grin) lit from inside by a flickering
// candle. Every feature of the face is its own closed subpath, so none ever join up.

/** Warm light spilling round the pumpkin. */
const POOL = alpha(CANDLE, 0.2);

/**
 * Carved face as closed subpaths, by expression (ambient.ts FACE): a wide jagged grin under slanted
 * eyes; a toothy grin (three big square teeth); a round "boo" mouth under round startled eyes; a
 * wink (one eye a curved slit); a silly frown under drooping brows. `blink` (0..1) shuts the eyes
 * to slits. Every feature is its own subpath, so none ever join.
 */
export function face(ctx: Ctx, px: number, py: number, pr: number, expr = 0, blink = 0): void {
  ctx.beginPath();
  const open = 1 - blink * 0.85;
  // Eyes.
  for (let side = -1; side <= 1; side += 2) {
    const ex = px + side * pr * 0.38;
    const ey = py - pr * 0.24;
    if (expr === 3 && side < 0 && blink < 0.5) {
      // The wink: a curved slit, smiling.
      ctx.moveTo(ex - pr * 0.26, ey);
      ctx.quadraticCurveTo(ex, ey + pr * 0.16, ex + pr * 0.26, ey);
      ctx.quadraticCurveTo(ex, ey + pr * 0.06, ex - pr * 0.26, ey);
      ctx.closePath();
      continue;
    }
    if (expr === 2) {
      ctx.moveTo(ex + pr * 0.17, ey);
      ctx.ellipse(ex, ey, pr * 0.17, pr * 0.2 * open, 0, 0, Math.PI * 2);
      continue;
    }
    if (expr === 4) {
      // Droopy: slanting down at the outer corners.
      ctx.moveTo(ex - side * pr * 0.24, ey - pr * 0.16 * open);
      ctx.lineTo(ex + side * pr * 0.28, ey + pr * 0.02);
      ctx.lineTo(ex - side * pr * 0.2, ey + pr * 0.12 * open);
      ctx.closePath();
      continue;
    }
    // Slanted up at the outer corners: a mischievous look.
    ctx.moveTo(px + side * pr * 0.66, py - pr * 0.2);
    ctx.lineTo(px + side * pr * 0.14, py - pr * 0.02 - pr * 0.0);
    ctx.lineTo(px + side * pr * 0.34, py - pr * 0.02 - pr * 0.48 * open);
    ctx.closePath();
  }
  // Nose.
  ctx.moveTo(px, py + pr * 0.04);
  ctx.lineTo(px - pr * 0.1, py + pr * 0.2);
  ctx.lineTo(px + pr * 0.1, py + pr * 0.2);
  ctx.closePath();
  if (expr === 2) {
    // "Boo": a round open mouth.
    ctx.moveTo(px + pr * 0.22, py + pr * 0.52);
    ctx.ellipse(px, py + pr * 0.52, pr * 0.22, pr * 0.27, 0, 0, Math.PI * 2);
  } else if (expr === 4) {
    // A silly frown: an upside-down crescent, one snaggle tooth.
    ctx.moveTo(px - pr * 0.6, py + pr * 0.72);
    ctx.quadraticCurveTo(px, py + pr * 0.18, px + pr * 0.6, py + pr * 0.72);
    ctx.quadraticCurveTo(px + pr * 0.1, py + pr * 0.42, px + pr * 0.06, py + pr * 0.6);
    ctx.lineTo(px - pr * 0.06, py + pr * 0.46);
    ctx.quadraticCurveTo(px - pr * 0.3, py + pr * 0.5, px - pr * 0.6, py + pr * 0.72);
    ctx.closePath();
  } else if (expr === 1) {
    // Toothy: a wide grin with three big square teeth hanging into it.
    ctx.moveTo(px - pr * 0.74, py + pr * 0.24);
    ctx.lineTo(px - pr * 0.42, py + pr * 0.3);
    ctx.lineTo(px - pr * 0.42, py + pr * 0.44);
    ctx.lineTo(px - pr * 0.2, py + pr * 0.44);
    ctx.lineTo(px - pr * 0.2, py + pr * 0.32);
    ctx.lineTo(px + pr * 0.1, py + pr * 0.32);
    ctx.lineTo(px + pr * 0.1, py + pr * 0.46);
    ctx.lineTo(px + pr * 0.32, py + pr * 0.46);
    ctx.lineTo(px + pr * 0.32, py + pr * 0.3);
    ctx.lineTo(px + pr * 0.74, py + pr * 0.24);
    ctx.quadraticCurveTo(px + pr * 0.5, py + pr * 0.86, px, py + pr * 0.84);
    ctx.quadraticCurveTo(px - pr * 0.5, py + pr * 0.86, px - pr * 0.74, py + pr * 0.24);
    ctx.closePath();
  } else {
    // The grin: a wide crescent with a jagged row of teeth top and bottom.
    ctx.moveTo(px - pr * 0.78, py + pr * 0.18);
    const teeth = 7;
    for (let i = 1; i <= teeth; i++) {
      const x = px - pr * 0.78 + (pr * 1.56 * i) / teeth;
      const sag = Math.sin((i / teeth) * Math.PI) * pr * 0.14;
      ctx.lineTo(x - (pr * 0.78) / teeth, py + pr * 0.36 + sag);
      ctx.lineTo(x, py + pr * 0.26 + sag);
    }
    ctx.quadraticCurveTo(px + pr * 0.6, py + pr * 0.82, px, py + pr * 0.8);
    ctx.quadraticCurveTo(px - pr * 0.6, py + pr * 0.82, px - pr * 0.78, py + pr * 0.18);
    ctx.closePath();
  }
}

/**
 * A carved pumpkin with a candle inside, sitting with its bottom at `bottom`, `pr` round (it stands
 * 2pr tall). `stitched`: a crack across its crown sewn up with big cross-stitches, a Burton seam.
 */
export function jackOLantern(ctx: Ctx, t: number, px: number, bottom: number, pr: number, lw: number, pool = true, stitched = false, expr = 0, blink = 0, flare = 0, small = false): void {
  const py = bottom - pr * 0.98;
  const flicker = Math.min(1, 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1) + flare);

  if (pool) {
    ctx.fillStyle = POOL;
    ctx.globalAlpha = 0.7 + 0.3 * flicker;
    ctx.beginPath();
    oval(ctx, px, bottom, pr * 1.6, pr * 0.36);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Stem, and a curly vine winding into a spiral, with a leaf
  ctx.beginPath();
  ctx.moveTo(px - pr * 0.14, py - pr * 0.82);
  ctx.quadraticCurveTo(px - pr * 0.16, py - pr * 1.25, px + pr * 0.16, py - pr * 1.42);
  ctx.lineTo(px + pr * 0.2, py - pr * 1.3);
  ctx.quadraticCurveTo(px + pr * 0.04, py - pr * 1.2, px + pr * 0.14, py - pr * 0.82);
  ctx.closePath();
  ctx.fillStyle = STEM;
  ctx.fill();
  ink(ctx, lw, INK);
  if (!small) {
    // A curly vine winding into a spiral, and a leaf (too fine to see on a small one).
    ctx.beginPath();
    ctx.moveTo(px + pr * 0.08, py - pr * 0.92);
    ctx.bezierCurveTo(px + pr * 0.5, py - pr * 1.3, px + pr * 0.9, py - pr * 1.0, px + pr * 0.72, py - pr * 0.86);
    ctx.arc(px + pr * 0.66, py - pr * 0.92, pr * 0.08, 0.6, Math.PI * 2.4);
    ink(ctx, Math.max(1, lw * 0.7), INK);
    ctx.beginPath();
    ctx.moveTo(px - pr * 0.18, py - pr * 0.9);
    ctx.quadraticCurveTo(px - pr * 0.6, py - pr * 1.3, px - pr * 0.82, py - pr * 1.02);
    ctx.quadraticCurveTo(px - pr * 0.48, py - pr * 0.84, px - pr * 0.18, py - pr * 0.9);
    ctx.closePath();
    ctx.fillStyle = MOSS;
    ctx.fill();
    ink(ctx, Math.max(1, lw * 0.8), INK);
  }

  // Body: flat orange, a little lopsided, lit upper left, shaded underneath, with deep ribs
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.18, pr, -0.05);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  // Shade over the lower half (an arc inside the body, so no clip), and a lit spot on the shoulder.
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  ctx.ellipse(px, py, pr * 1.12, pr * 0.94, -0.05, 0.1, Math.PI - 0.1);
  ctx.quadraticCurveTo(px, py + pr * 0.35, px + pr * 1.12 * Math.cos(0.1), py + pr * 0.94 * Math.sin(0.1));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ORANGE_LIGHT;
  ctx.beginPath();
  oval(ctx, px - pr * 0.62, py - pr * 0.52, pr * 0.3, pr * 0.18, -0.5);
  ctx.fill();
  ctx.beginPath();
  for (const k of [0.45, 0.85]) {
    ctx.moveTo(px + pr * k * Math.cos(Math.PI * 0.62), py + pr * 0.97 * Math.sin(Math.PI * 0.62));
    ctx.ellipse(px, py, pr * k, pr * 0.97, 0, Math.PI * 0.62, Math.PI * 1.38);
    ctx.moveTo(px + pr * k * Math.cos(-Math.PI * 0.38), py + pr * 0.97 * Math.sin(-Math.PI * 0.38));
    ctx.ellipse(px, py, pr * k, pr * 0.97, 0, -Math.PI * 0.38, Math.PI * 0.38);
  }
  ctx.strokeStyle = ORANGE_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, px, py, pr * 1.18, pr, -0.05);
  ink(ctx, lw, INK);

  if (stitched) {
    // A zigzag crack over the crown, and the stitches holding it shut.
    const pts = [-0.95, -0.42, -0.7, -0.62, -0.45, -0.52, -0.2, -0.78, 0.05, -0.66] as const;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = px + pts[i]! * pr;
      const y = py + pts[i + 1]! * pr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ink(ctx, Math.max(1, lw * 0.8), CARVED);
    ctx.beginPath();
    for (let i = 2; i < pts.length; i += 2) {
      const x = px + ((pts[i]! + pts[i - 2]!) / 2) * pr;
      const y = py + ((pts[i + 1]! + pts[i - 1]!) / 2) * pr;
      const d = pr * 0.1;
      ctx.moveTo(x - d, y - d);
      ctx.lineTo(x + d, y + d);
      ctx.moveTo(x - d, y + d);
      ctx.lineTo(x + d, y - d);
    }
    ink(ctx, Math.max(1, lw * 0.7), INK);
  }

  // The carved face, lit from inside: deep cut, candle-bright core, inked edge.
  face(ctx, px, py, pr, expr, blink);
  if (small) {
    // A small one: the candlelight straight in its cuts (the carved depth is too fine to see).
    ctx.fillStyle = flicker > 0.5 ? CANDLE_HOT : CANDLE;
    ctx.fill();
  } else {
    ctx.fillStyle = CARVED;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.translate(0, pr * 0.07);
    face(ctx, px, py, pr, expr, blink);
    ctx.fillStyle = flicker > 0.5 ? CANDLE_HOT : CANDLE;
    ctx.fill();
    ctx.restore();
    face(ctx, px, py, pr, expr, blink);
  }
  ink(ctx, Math.max(1, lw * 0.8), INK);
}
