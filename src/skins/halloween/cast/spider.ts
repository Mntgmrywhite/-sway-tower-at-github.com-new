import type { Ctx } from "../../../base/draw";
import { GOLD, INK, RIM_SOFT, SILK_A, SPIDER } from "./palette";
import { bump, Rhythm, smooth } from "./time";

// A spider dangling from an eave: every 7-15 s it lets itself down on its thread, twirls slowly
// at the bottom as it spins, and climbs back up, legs paddling. A floor landing on the tower makes
// it zip a quarter of the way back up its thread. A round black body (abdomen above, head below,
// hanging the way spiders do), eight bent inked legs, two gold glints of eyes, a thread of silk.
//
// Anchored at its hanging point (x, y): the thread runs straight down to it; `room` px is how far
// it may drop. `size` is its body's length.

/** Body length in u at k = 1. */
export const SPIDER_SIZE = 0.019;

/** A drop, seconds from its start: down, spin at the bottom, back up. */
const DOWN = 1.6;
const SPIN = 1.6;
const UP = 1.6;
const DROP = DOWN + SPIN + UP;
/** First drop at 0.8 s (1.1 s later per step of its anchor's id mod 3), then every 7-15 s. */
const RHYTHM = new Rhythm(0.8, 1.1, 7, 15, 37);

export interface SpiderPose {
  /** How far down its thread, 0..1 of its room. */
  drop: number;
  /** Its twirl as it spins at the bottom, 0..1 of a turn. */
  spin: number;
  /** Leg-paddling phase. */
  legs: number;
}

const POSE: SpiderPose = { drop: 0, spin: 0, legs: 0 };

/** The spider at time t on the eave anchored `seed` (pure; the result is reused scratch). */
export function spiderAt(t: number, seed: number, sinceLand: number): Readonly<SpiderPose> {
  const a = RHYTHM.at(t, seed);
  const p = POSE;
  p.drop = 0;
  p.spin = 0;
  p.legs = t * 1.3;
  if (a >= 0 && a < DROP) {
    if (a < DOWN) p.drop = smooth(0, DOWN, a);
    else if (a < DOWN + SPIN) {
      p.drop = 1 - 0.04 * Math.sin(((a - DOWN) / SPIN) * Math.PI);
      p.spin = smooth(DOWN, DOWN + SPIN, a);
    } else p.drop = 1 - smooth(DOWN + SPIN, DROP, a);
    p.legs = t * (a < DOWN + SPIN && a >= DOWN ? 2 : 4.5);
  }
  // Startled by a landing: it zips a quarter of its thread back up, then lets itself down again.
  if (sinceLand >= 0 && p.drop > 0) p.drop *= 1 - 0.25 * bump(0, 0.1, 0.4, 1.0, sinceLand);
  return p;
}

/**
 * The spider hanging from (x, y) on its thread, dropped `p.drop` of `room` px, `size` px long.
 */
export function spider(ctx: Ctx, x: number, y: number, room: number, size: number, p: Readonly<SpiderPose>, lw: number): void {
  const by = y + size * 0.3 + p.drop * Math.max(0, room - size * 1.2);
  const turn = Math.cos(p.spin * Math.PI * 2);
  const w = Math.max(0.25, Math.abs(turn));
  // The thread
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, by);
  ctx.strokeStyle = SILK_A;
  ctx.lineWidth = Math.max(0.6, lw * 0.35);
  ctx.stroke();
  // Eight bent legs, four a side, paddling
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const ph = Math.sin(p.legs * 6 + i * 1.3 + side);
      const ry = by + size * (0.05 + i * 0.13);
      const kx = x + side * w * size * (0.42 + 0.05 * ph);
      const ky = ry - size * (0.22 - i * 0.06) + ph * size * 0.04;
      const fx = x + side * w * size * (0.62 + i * 0.03);
      const fy = ry + size * (0.12 + i * 0.07) - ph * size * 0.05;
      ctx.moveTo(x + side * w * size * 0.1, ry);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
    }
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, size * 0.08);
  ctx.stroke();
  // Abdomen above (the thread ends in it), head below; moonlit on the left
  const r = size * 0.32;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, by + r * 0.05 - r * 0.15, r * w + 0.01, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = RIM_SOFT;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, by + r * 0.05, r * w + 0.01, r * 1.1, 0, 0, Math.PI * 2);
  ctx.moveTo(x + size * 0.2 * w, by + size * 0.55);
  ctx.ellipse(x, by + size * 0.55, size * 0.2 * w + 0.01, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = SPIDER;
  ctx.fill();
  // Two gold glints of eyes, when it faces us
  if (turn > 0.3) {
    ctx.beginPath();
    ctx.arc(x - size * 0.07 * w, by + size * 0.6, Math.max(0.5, size * 0.05), 0, Math.PI * 2);
    ctx.moveTo(x + size * 0.07 * w + size * 0.05, by + size * 0.6);
    ctx.arc(x + size * 0.07 * w, by + size * 0.6, Math.max(0.5, size * 0.05), 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
}

/** Scratch box of `spiderBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box of the spider and its thread. */
export function spiderBox(x: number, y: number, room: number, size: number, p: Readonly<SpiderPose>): Readonly<typeof BOX> {
  const by = y + size * 0.3 + p.drop * Math.max(0, room - size * 1.2);
  const reach = size * 0.78 + Math.max(0.8, size * 0.08);
  BOX.x0 = x - reach - 1;
  BOX.x1 = x + reach + 1;
  BOX.y0 = Math.min(y, by - size * 0.4) - 1;
  BOX.y1 = by + size * 0.9 + 1;
  return BOX;
}
