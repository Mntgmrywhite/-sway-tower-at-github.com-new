import type { Ctx } from "../../../base/draw";
import { GOLD, INK, RAT, RAT_BELLY, RAT_PINK, RIM_SOFT, SILK_A } from "./palette";
import { Rhythm, smooth } from "./time";

// A rat on the railing: every 20-35 s it pops out from behind one end (a hay bale), scurries along
// the rail, stops on a post to sniff the air, whiskers twitching, and dashes off behind the other
// end. A floor landing on the tower freezes it for a moment, ears up, before it runs on (it catches
// the lost moment up). Grey with a paler belly, pink ears and a long pink tail, a glinting eye.
//
// Drawn in its own units (one unit = its body length, `size` px), feet on the rail at (x, y),
// facing `dir` (the way it runs).

/** Body length in u at k = 1 (its tail is 0.026 u more). */
export const RAT_LEN = 0.03;

/** A run, seconds from its start: out to the post, sniff, on to the far end. */
const TO_POST = 0.6;
const SNIFF = 0.8;
const ON = 0.8;
const RUN = TO_POST + SNIFF + ON;
/** The post it stops on, as a fraction of the rail. */
const POST = 0.35;
/** A frozen rat holds still at most this long, then catches up over the next 0.7 s. */
const FREEZE = 0.3;
/** First run at 6.0 s (1.5 s earlier per step of its anchor's id mod 3), then every 20-35 s. */
const RHYTHM = new Rhythm(6.0, -1.5, 20, 35, 41);

export interface RatPose {
  vis: number;
  /** How far along the rail: 0 at the end it comes from, 1 at the far end. */
  along: number;
  /** Stride phase (radians), and whether it is running at all (0..1). */
  run: number;
  sniff: number;
  freeze: number;
}

const POSE: RatPose = { vis: 0, along: 0, run: 0, sniff: 0, freeze: 0 };

/** The rat at time t on the rail anchored `seed` (pure; the result is reused scratch). */
export function ratAt(t: number, seed: number, sinceLand: number): Readonly<RatPose> {
  // Frozen by a landing: its run lags the clock by up to FREEZE seconds, then catches up.
  const lag = sinceLand >= 0 ? (sinceLand < FREEZE ? sinceLand : FREEZE * (1 - smooth(FREEZE, FREEZE + 0.7, sinceLand))) : 0;
  const a = RHYTHM.at(t - lag, seed);
  const p = POSE;
  p.vis = 0;
  p.along = 0;
  p.run = 0;
  p.sniff = 0;
  p.freeze = 0;
  if (!(a >= 0 && a < RUN)) return p;
  if (a < TO_POST) {
    const f = a / TO_POST;
    p.along = POST * (f * (1.6 - 0.6 * f));
    p.run = 1;
  } else if (a < TO_POST + SNIFF) {
    p.along = POST;
    p.sniff = smooth(0, 0.12, a - TO_POST) * (1 - smooth(SNIFF - 0.12, SNIFF, a - TO_POST));
  } else {
    const f = (a - TO_POST - SNIFF) / ON;
    p.along = POST + (1 - POST) * f * f * (1.4 - 0.4 * f);
    p.run = 1;
  }
  p.vis = smooth(0, 0.05, p.along) * (1 - smooth(0.95, 1, p.along));
  p.freeze = sinceLand >= 0 && sinceLand < FREEZE + 0.1 ? 1 - smooth(FREEZE - 0.05, FREEZE + 0.1, sinceLand) : 0;
  if (p.freeze > 0.5) p.run = 0;
  return p;
}

/** The rat at (x, y) (its feet), `size` px, facing `dir`, in pose `p`, at time `t` for its legs and whiskers. */
export function rat(ctx: Ctx, x: number, y: number, size: number, dir: -1 | 1, p: Readonly<RatPose>, lw: number): void {
  if (p.vis <= 0.01) return;
  const d = dir;
  const stride = p.along * 160;
  const bob = p.run * Math.abs(Math.sin(stride)) * 0.06;
  const rear = p.sniff * 0.18 + p.freeze * 0.06;
  const cx = x;
  const cy = y - size * (0.2 + bob + rear * 0.5);
  if (p.vis < 1) ctx.globalAlpha = p.vis;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The long tail, trailing and curling, stiff when it freezes
  ctx.beginPath();
  ctx.moveTo(cx - d * size * 0.42, cy + size * 0.02);
  const wag = p.freeze > 0.5 ? 0 : Math.sin(stride * 0.5) * 0.12;
  ctx.bezierCurveTo(
    cx - d * size * 0.75, cy + size * (0.18 + wag),
    cx - d * size * 1.05, cy - size * (0.02 + wag),
    cx - d * size * 1.3, cy + size * (0.1 - wag),
  );
  ctx.strokeStyle = RAT_PINK;
  ctx.lineWidth = Math.max(0.8, size * 0.06);
  ctx.stroke();
  // Legs scurrying (a blur of four), or planted
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const ph = stride + i * Math.PI;
    const sw = p.run * Math.sin(ph) * 0.12;
    ctx.moveTo(cx + d * size * (0.22 - rear * 0.2), cy + size * 0.08);
    ctx.lineTo(cx + d * size * (0.24 + sw - rear * 0.15), y);
    ctx.moveTo(cx - d * size * 0.22, cy + size * 0.08);
    ctx.lineTo(cx - d * size * (0.2 + sw), y);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, size * 0.07);
  ctx.stroke();
  // Body: a teardrop, the nose forward (raised when it sniffs), moonlit along its back
  const tilt = -d * rear;
  const rim = Math.max(0.4, Math.min(lw * 0.5, size * 0.04));
  for (let pass = 0; pass < 2; pass++) {
    const o = pass ? 0 : -rim;
    ctx.beginPath();
    ctx.ellipse(cx + o, cy + o, size * 0.44, size * 0.2, tilt, 0, Math.PI * 2);
    const nx = cx + d * size * (0.38 + rear * 0.0) + o;
    const ny = cy - size * (0.04 + rear * 0.55) + o;
    ctx.moveTo(nx, ny - size * 0.12);
    ctx.quadraticCurveTo(nx + d * size * 0.28, ny - size * 0.02 - rear * size * 0.15, nx + d * size * 0.3, ny + size * 0.04 - rear * size * 0.15);
    ctx.quadraticCurveTo(nx + d * size * 0.1, ny + size * 0.12, nx - d * size * 0.06, ny + size * 0.12);
    ctx.closePath();
    ctx.fillStyle = pass ? RAT : RIM_SOFT;
    ctx.fill();
  }
  // The pale belly
  ctx.beginPath();
  ctx.ellipse(cx + d * size * 0.04, cy + size * 0.1, size * 0.28, size * 0.08, tilt, 0, Math.PI);
  ctx.fillStyle = RAT_BELLY;
  ctx.fill();
  // A round pink ear (pricked up when it freezes), the glinting eye, the nose
  const hx = cx + d * size * 0.4;
  const hy = cy - size * (0.1 + rear * 0.55);
  ctx.beginPath();
  ctx.ellipse(hx - d * size * 0.04, hy - size * (0.1 + p.freeze * 0.05), size * 0.08, size * (0.1 + p.freeze * 0.03), 0, 0, Math.PI * 2);
  ctx.fillStyle = RAT_PINK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + d * size * 0.1, hy + size * 0.02, Math.max(0.6, size * 0.045), 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.beginPath();
  const tip = hx + d * size * (0.36 - rear * 0.0);
  const tipY = hy + size * (0.1 - rear * 0.15);
  ctx.arc(tip, tipY, Math.max(0.5, size * 0.035), 0, Math.PI * 2);
  ctx.fillStyle = RAT_PINK;
  ctx.fill();
  // Whiskers, twitching as it sniffs
  const tw = Math.sin(p.along * 900 + p.sniff * 40) * p.sniff * 0.05;
  ctx.beginPath();
  ctx.moveTo(tip - d * size * 0.04, tipY);
  ctx.lineTo(tip + d * size * 0.12, tipY - size * (0.07 + tw));
  ctx.moveTo(tip - d * size * 0.04, tipY);
  ctx.lineTo(tip + d * size * 0.13, tipY + size * (0.02 - tw));
  ctx.strokeStyle = SILK_A;
  ctx.lineWidth = Math.max(0.5, size * 0.02);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Scratch box of `ratBox`. */
const BOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

/** The screen box the rat covers in pose `p` (taller when it rears to sniff or freezes, ears up), tail included. */
export function ratBox(x: number, y: number, size: number, dir: -1 | 1, p: Readonly<RatPose>): Readonly<typeof BOX> {
  const back = 1.36 * size;
  const front = 0.95 * size;
  BOX.x0 = x - (dir > 0 ? back : front) - 1;
  BOX.x1 = x + (dir > 0 ? front : back) + 1;
  BOX.y0 = y - (p.sniff > 0 || p.freeze > 0 ? 0.9 : 0.72) * size - 1;
  BOX.y1 = y + Math.max(0.5, size * 0.04) + 1;
  return BOX;
}
