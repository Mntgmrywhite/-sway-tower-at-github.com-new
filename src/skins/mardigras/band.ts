import { circle, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import type { Scene } from "../skin";
import { GOLD, INK, INLAY_BORDER, INLAY_JOINT, INLAY_TILE, THREE, WHITE } from "./colors";
import { fleurPath } from "./shapes";

// The band in front, under the curb: a harlequin frieze laid over the base band's lip and its
// first row of plum flagstones (the palette's), a jester's diamonds in purple, green and gold
// between two gilded rules strung with gold beads, and every few diamonds a gold fleur-de-lis on
// an ink boss. It drops away with the tiles as you climb (parallax 1.6), and stays above the line
// where render.ts writes "tap to drop", so the words sit on the flagstones.

/** The frieze's top: the curb's foot (front.ts: 0.346 u + its 0.032 u below the band's line), and its height (u). */
const TOP = 0.376;
const HEIGHT = 0.03;
/** A diamond's width (u). */
const STEP = 0.04;

export function friezeBand(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const y0 = layerGround(s, 1.6) + u * TOP;
  if (y0 > s.cssH) return;
  const h = u * HEIGHT;
  const rule = h * 0.17;
  const W = s.cssW;
  ctx.fillStyle = INK;
  ctx.fillRect(0, y0, W, h);
  const step = u * STEP;
  const off = ((W / 2) % step) - step;
  const mid = y0 + h / 2;
  const dh = (h - rule * 2) / 2;
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.body;
    ctx.beginPath();
    let i = 0;
    for (let x = off; x < W + step; x += step / 2, i++) {
      if (((i % 3) + 3) % 3 !== c) continue;
      // Diamonds, up and down by turns, so the row reads as a harlequin's lozenges.
      ctx.moveTo(x, mid - dh);
      ctx.lineTo(x + step / 4, mid);
      ctx.lineTo(x, mid + dh);
      ctx.lineTo(x - step / 4, mid);
      ctx.closePath();
    }
    ctx.fill();
  }
  // The gilded rules, their lit tops, the beads along them, and the fleur bosses.
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(0, y0, W, rule);
  ctx.fillRect(0, y0 + h - rule, W, rule);
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(0, y0, W, rule * 0.4);
  ctx.fillRect(0, y0 + h - rule, W, rule * 0.4);
  // Gold beads strung along the inner edge of each rule: dots of a dashed stroke.
  ctx.strokeStyle = GOLD.light;
  ctx.lineWidth = u * 0.0042;
  ctx.lineCap = "round";
  DASH[1] = step / 2;
  ctx.setLineDash(DASH);
  ctx.lineDashOffset = -step / 4 - off;
  ctx.beginPath();
  ctx.moveTo(0, y0 + rule + u * 0.0026);
  ctx.lineTo(W, y0 + rule + u * 0.0026);
  ctx.moveTo(0, y0 + h - rule - u * 0.0026);
  ctx.lineTo(W, y0 + h - rule - u * 0.0026);
  ctx.stroke();
  ctx.setLineDash(NO_DASH);
  ctx.lineDashOffset = 0;
  // A gold fleur-de-lis on an ink boss every six diamonds, out of the middle (where "tap to drop" goes).
  const bosses = (f: (x: number) => void) => {
    for (let x = off + step * 2; x < W + step; x += step * 3) if (Math.abs(x - W / 2) > u * 0.2) f(x);
  };
  ctx.beginPath();
  bosses((x) => circle(ctx, x, mid, dh * 0.95));
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  bosses((x) => fleurPath(ctx, x, mid, dh * 1.5));
  ctx.fillStyle = GOLD.body;
  ctx.fill();
}

const DASH = [0.001, 1];
const NO_DASH: number[] = [];

/** The street-name inlay set into the flagstones at the left: its center (u from the screen's center), how far under the frieze, its size (u). */
const INLAY_X = -0.33;
const INLAY_DOWN = 0.042;
const INLAY_W = 0.22;
const INLAY_H = 0.05;
/** "tap to drop" sits at 0.9 of the screen's height across this half width (u) of the middle: the flagstones' litter keeps out of it. */
const WORDS_HW = 0.2;

/** Confetti, doubloons and a lost string of beads on the flagstones: [X (u), depth under the frieze (u), kind, color]. */
const LITTER = Array.from({ length: 40 }, (_, i) => [((i * 0.618 + 0.13) % 1) * 1.6 - 0.8, 0.045 + ((i * 0.377 + 0.2) % 1) * 0.22, i % 5 === 0 ? 1 : 0, i % 3] as const);

/**
 * The flagstones under the frieze, made festive: confetti and a few doubloons scattered over
 * them, out of the middle where "tap to drop" goes, and set into them at the left a street-name
 * inlay in the Quarter's way, white letters on blue tiles in a white border.
 */
export function flagstones(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const y0 = layerGround(s, 1.6) + u * (TOP + HEIGHT);
  if (y0 > s.cssH) return;
  const cx = s.cssW / 2;
  const words = s.cssH * 0.9;
  const clear = (x: number, y: number) => Math.abs(x - cx) < WORDS_HW * u && Math.abs(y - words) < u * 0.05;
  for (let c = 0; c < 3; c++) {
    ctx.fillStyle = THREE[c]!.light;
    ctx.beginPath();
    for (const [X, d, kind, col] of LITTER) {
      if (col !== c || kind) continue;
      const x = cx + X * u;
      const y = y0 + d * u;
      if (y > s.cssH || clear(x, y) || Math.abs(X - INLAY_X) < INLAY_W * 0.6) continue;
      ctx.rect(x - u * 0.006, y, u * 0.012, u * 0.005);
    }
    ctx.fill();
  }
  ctx.beginPath();
  for (const [X, d, kind] of LITTER) {
    if (!kind) continue;
    const x = cx + X * u;
    const y = y0 + d * u;
    if (y > s.cssH || clear(x, y) || Math.abs(X - INLAY_X) < INLAY_W * 0.6) continue;
    circle(ctx, x, y, u * 0.008);
  }
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.stroke();
  // The inlay: a white border round blue tiles, the street's name in white.
  const ix = cx + INLAY_X * u;
  const iy = y0 + INLAY_DOWN * u;
  // Whole or not at all: never cut by a screen's edge.
  if (iy + (INLAY_H / 2) * u > s.cssH - 1 || ix - (INLAY_W / 2) * u < 1) return;
  ctx.fillStyle = INLAY_BORDER;
  ctx.fillRect(ix - (INLAY_W / 2) * u, iy - (INLAY_H / 2) * u, INLAY_W * u, INLAY_H * u);
  ctx.fillStyle = INLAY_TILE;
  ctx.fillRect(ix - (INLAY_W / 2 - 0.007) * u, iy - (INLAY_H / 2 - 0.007) * u, (INLAY_W - 0.014) * u, (INLAY_H - 0.014) * u);
  ctx.strokeStyle = INLAY_JOINT;
  ctx.lineWidth = Math.max(1, u * 0.0015);
  ctx.beginPath();
  for (let x = ix - (INLAY_W / 2 - 0.007) * u; x < ix + (INLAY_W / 2 - 0.007) * u; x += u * 0.018) {
    ctx.moveTo(x, iy - (INLAY_H / 2 - 0.007) * u);
    ctx.lineTo(x, iy + (INLAY_H / 2 - 0.007) * u);
  }
  ctx.stroke();
  ctx.fillStyle = WHITE;
  ctx.font = `${Math.round(u * 0.026)}px 'Bungee', 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BOURBON ST", ix, iy + u * 0.001);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}
