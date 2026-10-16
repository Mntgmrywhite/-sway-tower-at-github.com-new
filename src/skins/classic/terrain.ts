import { ink, type Ctx } from "../../base/draw";
import { EARTH_DARK, EARTH_LIGHT, EARTH_LIT, EARTH_SEAM, GRASS, GRASS_DARK, GRASS_LIGHT, INK } from "./colors";

// The Classic ground: lush grass caps over checker-banded earth, our own take on the sunny
// platform-game cliff. Earth is laid in strata: each stratum is two rows of square cells in two
// warm tones, the light cells catch the sun on their top edge, and a dark seam with a lit lip
// separates the strata. The grass cap has round tufts on top and hangs over the earth in
// scallops. Everything is batched: one fill per tone, however many cells.

/** Tones for one piece of earth: dark cell (and base), light cell, lit edge, seam. */
export interface EarthTones {
  dark: string;
  light: string;
  lit: string;
  seam: string;
}

export const EARTH: EarthTones = { dark: EARTH_DARK, light: EARTH_LIGHT, lit: EARTH_LIT, seam: EARTH_SEAM };

/** Rows per stratum. */
const STRATUM = 2;

/**
 * Checker-banded earth filling x0..x1, y0..y1. Cells are `c` px square, anchored at (ax, y0) so
 * the pattern stays put on its land as it moves. `seams` adds the stratum seams (skip them for
 * small, faded earth far away).
 */
export function checkerEarth(
  ctx: Ctx,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  c: number,
  ax: number,
  tones: EarthTones,
  seams = true,
): void {
  if (y1 <= y0 || x1 <= x0) return;
  ctx.fillStyle = tones.dark;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const i0 = Math.floor((x0 - ax) / c);
  const i1 = Math.ceil((x1 - ax) / c);
  const lit = Math.max(1, c * 0.14);
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let r = 0, y = y0; y < y1; r++, y += c) {
      const h = Math.min(c, y1 - y);
      for (let i = i0; i < i1; i++) {
        if (((i + r) & 1) !== 0) continue;
        const a = Math.max(x0, ax + i * c);
        const b = Math.min(x1, ax + (i + 1) * c);
        if (b <= a) continue;
        if (pass === 0) ctx.rect(a, y, b - a, h);
        else ctx.rect(a, y, b - a, Math.min(lit, h));
      }
    }
    ctx.fillStyle = pass === 0 ? tones.light : tones.lit;
    ctx.fill();
  }
  if (!seams) return;
  // Stratum seams: a dark groove with a lit lip just under it.
  const sh = Math.max(1, c * 0.12);
  ctx.beginPath();
  for (let y = y0 + c * STRATUM; y < y1; y += c * STRATUM) ctx.rect(x0, y - sh * 0.5, x1 - x0, sh);
  ctx.fillStyle = tones.seam;
  ctx.fill();
}

/** Grass colors: body, lit tufts, shaded underside. */
export interface GrassTones {
  body: string;
  light: string;
  dark: string;
}

export const GRASS_TONES: GrassTones = { body: GRASS, light: GRASS_LIGHT, dark: GRASS_DARK };

/**
 * A grass cap from x0 to x1: round tufts along the top (tops at y), a band `h` deep, and
 * scallops hanging `drop` below it over the earth. Tufts and scallops are `w` wide, anchored at
 * `ax`. Inked when `lw` > 0.
 */
export function grassCap(
  ctx: Ctx,
  x0: number,
  x1: number,
  y: number,
  h: number,
  w: number,
  drop: number,
  ax: number,
  lw: number,
  tones: GrassTones = GRASS_TONES,
): void {
  const tuft = w * 0.22;
  const k0 = Math.floor((x0 - ax) / w) - 1;
  const k1 = Math.ceil((x1 - ax) / w) + 1;
  capPath(ctx, k0, k1, ax, y, h, w, drop, tuft);
  ctx.fillStyle = tones.body;
  ctx.fill();
  // Shaded underside just above the scallops, then lit tops on the tufts.
  ctx.beginPath();
  for (let k = k0; k < k1; k++) {
    const a = ax + k * w;
    ctx.moveTo(a, y + h);
    ctx.quadraticCurveTo(a + w / 2, y + h + drop * 2, a + w, y + h);
    ctx.lineTo(a + w, y + h - drop * 0.35);
    ctx.quadraticCurveTo(a + w / 2, y + h + drop * 1.1, a, y + h - drop * 0.35);
    ctx.closePath();
  }
  ctx.fillStyle = tones.dark;
  ctx.fill();
  ctx.beginPath();
  for (let k = k0; k < k1; k++) {
    const a = ax + k * w;
    ctx.moveTo(a + w * 0.12, y + tuft * 0.55);
    ctx.quadraticCurveTo(a + w * 0.3, y - tuft * 0.75, a + w * 0.55, y + tuft * 0.2);
    ctx.quadraticCurveTo(a + w * 0.32, y + tuft * 0.05, a + w * 0.12, y + tuft * 0.55);
    ctx.closePath();
  }
  ctx.fillStyle = tones.light;
  ctx.fill();
  if (lw > 0) {
    capPath(ctx, k0, k1, ax, y, h, w, drop, tuft);
    ink(ctx, lw, INK);
  }
}

/** The outline of a grass cap: tufts left to right along the top, scallops back along the bottom. */
function capPath(ctx: Ctx, k0: number, k1: number, ax: number, y: number, h: number, w: number, drop: number, tuft: number): void {
  ctx.beginPath();
  ctx.moveTo(ax + k0 * w, y + tuft);
  for (let k = k0; k < k1; k++) {
    const a = ax + k * w;
    ctx.quadraticCurveTo(a + w * 0.5, y - tuft, a + w, y + tuft);
  }
  ctx.lineTo(ax + k1 * w, y + h);
  for (let k = k1; k > k0; k--) {
    const a = ax + k * w;
    ctx.quadraticCurveTo(a - w * 0.5, y + h + drop * 2, a - w, y + h);
  }
  ctx.closePath();
}
