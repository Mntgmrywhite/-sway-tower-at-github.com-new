import { hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { block } from "./shapes";
import type { Tone } from "./tone";

// The cloud sea (place.ts says where its top is): a bank of big rounded cloud blocks in two rows
// along its top, solid below, stacked up into piles of smaller blocks toward the sides of the
// screen, like blocks piled up at the edges of a toy box. It stands still: it runs right behind
// the tower, where nothing moves. Cloud colors of the hour; no outline.

/**
 * Cloud blocks along the top edge, repeating every SPAN of them: width and rise above the top
 * line (u). A back row stands taller between the front row's blocks.
 */
const SPAN = 8;
const BLOCKS = Array.from({ length: SPAN }, (_, i) => ({
  w: 0.13 + hash(i + 3200) * 0.09,
  up: 0.035 + hash(i + 3300) * 0.045,
}));
/** Blocks overlap their neighbors a little: each steps on by this fraction of its width. */
const STEP = 0.82;
const SPAN_W = BLOCKS.reduce((a, b) => a + b.w * STEP, 0);
const H = 0.16;
/** Below this (u under the top line) the sea is solid. */
export const SEA_SOLID = 0.06;
/**
 * The piles rise toward the screen's sides: a block within PILE_EDGE u of a side gets a tier more
 * every PILE_TIER u closer to it, up to PILE_MAX tiers; none stand behind the tower's column.
 */
const PILE_EDGE = 0.23;
const PILE_TIER = 0.07;
const PILE_MAX = 3;
const PILE_CLEAR = 0.3;

/** One row of the sea's blocks, with the piles at the sides: shade, then body (leaving a shaded lower band), then lit caps. */
function row(ctx: Ctx, s: Scene, tone: Tone, top: number, back: boolean): void {
  const u = s.u;
  const span = SPAN_W * u;
  const cx = s.cssW / 2;
  // Centered on the screen, so both sides match at any width.
  const start = cx - span * (Math.ceil(cx / span) + 0.4);
  const h = H * u;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let x = start, j = 0; x < s.cssW; j++) {
      const b = BLOCKS[j % SPAN]!;
      const w = b.w * u;
      x += w * STEP;
      const bx = back ? x - w * STEP + w * 0.45 : x - w * STEP;
      const bw = back ? w * 0.7 : w;
      if (bx + bw < 0) continue;
      const y = top - b.up * u * (back ? 1.25 : 0.6);
      // Tiers piled on this block toward the sides: each a little narrower, set in from its edges.
      const out = Math.abs(bx + bw / 2 - cx) / u;
      const edge = cx / u - out;
      const tiers = back || out < PILE_CLEAR ? 0 : Math.min(PILE_MAX, Math.floor(Math.max(0, PILE_EDGE - edge) / PILE_TIER + (hash(j + 3400) - 0.35)));
      for (let t = 0; t <= tiers; t++) {
        const tw = bw * (1 - t * 0.2);
        const tx = bx + (bw - tw) * (0.5 + (hash(j * 3 + t + 3500) - 0.5) * 0.6);
        const ty = y - t * h * 0.5;
        const th = t === 0 ? h : h * 0.62;
        const r = Math.min(tw, th) * 0.32;
        if (pass === 0) block(ctx, tx, ty, tw, th, r);
        else if (pass === 1) block(ctx, tx, ty, tw - u * 0.008, th * (t === 0 ? 0.42 : 0.62), r);
        else ctx.rect(tx + r, ty + u * 0.006, Math.max(0, tw - r * 2 - u * 0.012), u * 0.007);
      }
    }
    if (pass === 0 && !back) ctx.rect(0, top + u * SEA_SOLID, s.cssW, s.cssH - top);
    ctx.fill();
  }
}

/**
 * Rows of bigger blocks further down the sea, nearer to us: how far below the top (u), their
 * size, and how far each row is shifted sideways (in spans), so the sea reads as a field of
 * cloud blocks running toward us rather than a flat wall.
 */
const DEEP_ROWS = [
  [0.13, 1.3, 0.37],
  [0.3, 1.7, 0.71],
  [0.53, 2.2, 0.13],
  [0.84, 2.8, 0.55],
] as const;

/**
 * A deeper row: bigger blocks laid over the sea below the rows above it, each shaded along its
 * lower part with a body band and a lit cap on top (three fills), so the rows read as layers.
 */
function deepRow(ctx: Ctx, s: Scene, tone: Tone, y0: number, size: number, shift: number): void {
  const u = s.u;
  const span = SPAN_W * u * size;
  const cx = s.cssW / 2;
  const start = cx - span * (Math.ceil(cx / span) + 0.4 + shift);
  const h = H * u * size;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let x = start, j = 0; x < s.cssW; j++) {
      const b = BLOCKS[(j + 3) % SPAN]!;
      const w = b.w * u * size;
      x += w * STEP;
      const bx = x - w * STEP;
      if (bx + w < 0) continue;
      const y = y0 - b.up * u * size * 0.5;
      const r = Math.min(w, h) * 0.3;
      if (pass === 0) block(ctx, bx, y, w, h, r);
      else if (pass === 1) block(ctx, bx, y, w - u * 0.008 * size, h * 0.36, r);
      else ctx.rect(bx + r, y + u * 0.006 * size, Math.max(0, w - r * 2 - u * 0.012 * size), u * 0.006 * size);
    }
    ctx.fill();
  }
}

/** The cloud sea with its top edge at `top`. */
export function cloudSea(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  if (top - s.u * 0.45 > s.cssH) return;
  row(ctx, s, tone, top, true);
  row(ctx, s, tone, top, false);
  for (const [dy, size, shift] of DEEP_ROWS) {
    const y = top + dy * s.u;
    if (y - s.u * 0.1 > s.cssH) break;
    deepRow(ctx, s, tone, y, size, shift);
  }
}
