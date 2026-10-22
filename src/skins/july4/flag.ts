import type { Ctx } from "../../base/draw";
import { speck } from "./shapes";

// The Stars and Stripes, the one way every flag in the skin is printed, at any size and hour (the
// owner saw a small courthouse flag at night read as Puerto Rico's: one star in a dark canton
// that the night sky swallowed). Red and white stripes that start and end red (thirteen where
// each can be told apart, seven on a small flag), and a rectangular blue canton in the upper
// hoist, seven stripes deep (four of seven on a small flag), holding a staggered field of white
// stars, printed as dots, in rows of six and five as on the real flag, fewer on a small one,
// never fewer than three rows of four. The flag ripples along its fly; the hoist stays on its
// pole, so the canton is always next to the pole whichever way the wind blows. flag.test.ts
// holds it to that.

/** The flag's three inks. */
export interface FlagInks {
  red: string;
  white: string;
  blue: string;
}

/** Thirteen stripes only where each is at least this tall (px); below it, seven. */
const STRIPE_MIN = 1.6;
/** The canton's length along the fly, as a share of the flag's (the real flag's 0.76 of 1.9). */
export const CANTON_W = 0.4;
/** Points along the fly the ripple is drawn through: at most SEGS on a big flag, fewer on a small one (the canvas's cost is in its points). */
const SEGS = 6;
let segs = SEGS;
/** Stars a row and rows at full size (the real fifty: nine rows, six and five by turns). */
const FULL_COLS = 6;
const FULL_ROWS = 9;
/** The smallest field: rows of four (three in the shorter rows), three rows. */
const MIN_COLS = 4;
const MIN_ROWS = 3;
/** A star's dot needs at least this much room (px) between neighbours to stay a speck. */
const STAR_PITCH = 2.4;

/** Scratch: the ripple's offset at each point along the fly, so drawing allocates nothing. */
const WAVE = new Float32Array(SEGS + 1);

/** How many stripes a flag `h` tall shows: 13, or 7 where 13 would blur together. */
export function stripesFor(h: number): 7 | 13 {
  return h / 13 >= STRIPE_MIN ? 13 : 7;
}

/** How far the ripple lifts the flag at `k` (0 hoist .. 1 fly end). */
function lift(k: number): number {
  const f = k * segs;
  const i = Math.min(segs - 1, Math.floor(f));
  return WAVE[i]! + (WAVE[i + 1]! - WAVE[i]!) * (f - i);
}

/** One band of the flag from `v0` to `v1` (fractions of its height), over the fly from k0 to k1, following the ripple. */
function band(ctx: Ctx, x: number, y: number, w: number, h: number, dir: number, v0: number, v1: number, k0: number, k1: number): void {
  const n = Math.max(1, Math.round((k1 - k0) * segs));
  for (let j = 0; j <= n; j++) {
    const k = k0 + ((k1 - k0) * j) / n;
    const px = x + dir * w * k;
    if (j === 0) ctx.moveTo(px, y + h * v0 + lift(k));
    else ctx.lineTo(px, y + h * v0 + lift(k));
  }
  for (let j = n; j >= 0; j--) {
    const k = k0 + ((k1 - k0) * j) / n;
    ctx.lineTo(x + dir * w * k, y + h * v1 + lift(k));
  }
  ctx.closePath();
}

/**
 * A US flag hung from its hoist's top corner (x, y) on a pole, `w` long and `h` deep, flying
 * right (`dir` 1) or left (-1). `wave` is how far (px) the ripple lifts the fly end, and
 * `phase` where the ripple is along it (the clock moves it).
 */
export function usFlag(ctx: Ctx, x: number, y: number, w: number, h: number, dir: 1 | -1, wave: number, phase: number, inks: FlagInks): void {
  segs = w >= 36 ? SEGS : w >= 16 ? 4 : 3;
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    WAVE[i] = Math.sin(phase - k * 5) * wave * k;
  }
  const n = stripesFor(h);
  // The field red, then the white stripes, every other one from the second.
  ctx.fillStyle = inks.red;
  ctx.beginPath();
  band(ctx, x, y, w, h, dir, 0, 1, 0, 1);
  ctx.fill();
  ctx.fillStyle = inks.white;
  ctx.beginPath();
  for (let i = 1; i < n; i += 2) band(ctx, x, y, w, h, dir, i / n, (i + 1) / n, 0, 1);
  ctx.fill();
  // The canton: seven stripes deep (four of seven on a small flag), CANTON_W of the fly.
  const ch = n === 13 ? 7 / 13 : 4 / 7;
  ctx.fillStyle = inks.blue;
  ctx.beginPath();
  band(ctx, x, y, w, h, dir, 0, ch, 0, CANTON_W);
  ctx.fill();
  // The stars: staggered rows of dots, as many as stay apart at this size.
  const cw = w * CANTON_W;
  const cH = h * ch;
  const rows = Math.max(MIN_ROWS, Math.min(FULL_ROWS, Math.floor(cH / STAR_PITCH) | 1));
  const cols = Math.max(MIN_COLS, Math.min(FULL_COLS, Math.floor(cw / (STAR_PITCH * 1.2))));
  const r = Math.min(cH / (rows + 1), cw / (cols + 0.5)) * 0.36;
  ctx.fillStyle = inks.white;
  ctx.beginPath();
  for (let row = 0; row < rows; row++) {
    const long = row % 2 === 0;
    const count = long ? cols : cols - 1;
    const v = ((row + 1) / (rows + 1)) * ch;
    for (let c = 0; c < count; c++) {
      const k = (((long ? c + 0.5 : c + 1) / cols) * CANTON_W);
      speck(ctx, x + dir * w * k, y + h * v + lift(k), r * 0.9);
    }
  }
  ctx.fill();
}
