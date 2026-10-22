import { alpha, hash, type Ctx } from "../../../base/draw";
import { phase } from "./clock";
import { CHIMNEY, CHIMNEY_CAP, EAVE, FRAME, INK, MOON_RIM, PANE_LIT, SLATE, SLATE_RIDGE, SMOKE } from "./palette";

// The roof on the top floor: a crooked Burton roofline of slate gables, each one a different
// height and leaning its own way, its sides curving in like a witch's hat, with a little lit
// attic window; a bone-white eave; a leaning chimney between two gables puffing curls of smoke that
// drift off along the roof; and the tallest gable's tip curling into a spiral. A narrow top floor
// gets a single gable, a very narrow one a witch's hat. The gables sway a little, the roof hops up
// onto each new top floor as it lands (react.ts), and it stays dark and low (never more than
// ROOF_MAX above the floor, never past its ends) so the slider and a falling bar read over it.

/** How far above the top floor the roof may reach, in floor heights. */
export const ROOF_MAX = 0.6;
/** Below these widths (in heights) the roof is a witch's hat, then a single gable with no chimney. */
export const HAT_BELOW = 1.4;
export const PLAIN_BELOW = 3;
/** The roof's tallest point, in heights: a gable with its curl, the hat. */
const PEAK = 0.5;
const CURL = 0.03;
const HAT_H = 0.52;
const EAVE_H = 0.13;
const CHIMNEY_TOP = 0.42;
const SMOKE_TOP = 0.585;
const SMOKE_PERIOD = 2.6;
/** How much the roof squashes per floor height it is lifted as it drops in. */
const SQUASH = 2.5;
const MAX_GABLES = 6;
/** The smoke's opacity steps, thickest first (precomputed: nothing allocated per frame). */
const SMOKE_A = [0.4, 0.31, 0.23, 0.15, 0.08].map((a) => alpha(SMOKE, a));
/** Each gable's peak (x, y) and foot half-width this frame. */
const GX = new Float64Array(MAX_GABLES);
const GY = new Float64Array(MAX_GABLES);

/** Moonlight catching the roof's edges, along the middle of its ink outline: so the roofline reads against the night. */
function moonlit(ctx: Ctx, lw: number): void {
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = lw * 0.45;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

/**
 * The roof over a top floor at (x, y), w wide, h tall. `drop` (heights, ≤ 0) is how far up the roof
 * is as it drops in onto a new top floor: it comes in from there, squashed, and springs up to its
 * full height as it lands. `still`: reduce motion (no sway, no smoke).
 */
export function roof(ctx: Ctx, x: number, y: number, w: number, h: number, level: number, t: number, drop: number, still: boolean): void {
  const W = w / h;
  if (W < 0.3) return;
  const lw = Math.max(1, 0.05 * h);
  const sway = still ? 0 : 0.06 * Math.sin((t / 3.3) * Math.PI * 2 + phase(level, 21, 3.3));
  // Squashed as it drops in (v: the vertical unit), and never lifted past ROOF_MAX
  const v = h * Math.max(0.4, 1 + SQUASH * drop);
  const tallest = ((W < HAT_BELOW ? HAT_H : PEAK + CURL) * v) / h;
  const base = y + Math.max(drop, -(ROOF_MAX - tallest - lw / h / 2 - 0.01)) * h;
  const inset = Math.min(0.08 * h, w * 0.08);
  const xl = x + inset;
  const xr = x + w - inset;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  if (W < HAT_BELOW) {
    // A witch's hat, its tip flopping over, with a band
    const hh = HAT_H * v;
    const mid = (xl + xr) / 2;
    const half = (xr - xl) / 2;
    const flop = (hash(level * 3.1) < 0.5 ? -1 : 1) * Math.min(half * 0.7, 0.2 * h);
    const lean = sway * hh;
    ctx.beginPath();
    ctx.moveTo(xl, base);
    ctx.quadraticCurveTo(mid - half * 0.35, base - hh * 0.4, mid + lean, base - hh * 0.8);
    ctx.quadraticCurveTo(mid + flop * 0.6 + lean, base - hh * 1.0, mid + flop + lean, base - hh * 0.88);
    ctx.quadraticCurveTo(mid + flop * 0.25 + lean, base - hh * 0.84, mid + half * 0.25 + lean, base - hh * 0.66);
    ctx.quadraticCurveTo(mid + half * 0.45, base - hh * 0.32, xr, base);
    ctx.closePath();
    ctx.fillStyle = SLATE;
    ctx.fill();
    ctx.stroke();
    moonlit(ctx, lw);
    ctx.fillStyle = SLATE_RIDGE;
    ctx.fillRect(xl + half * 0.35, base - hh * 0.26, half * 1.3, hh * 0.1);
    return;
  }
  // The gables along the roof, each its own height and lean
  const n = W < PLAIN_BELOW ? 1 : Math.min(MAX_GABLES, Math.max(2, Math.round((xr - xl) / (1.9 * h))));
  const gw = (xr - xl) / n;
  const eave = base - EAVE_H * v;
  let tall = 0;
  for (let i = 0; i < n; i++) {
    const k = level * 7.3 + i * 3.1;
    const ph = (0.36 + 0.14 * hash(k)) * v;
    GX[i] = xl + gw * (i + 0.5) + (hash(k + 1) - 0.5) * 0.25 * h + sway * ph;
    GY[i] = base - ph;
    if (GY[i]! < GY[tall]!) tall = i;
  }
  const foot = Math.min(0.3 * h, gw * 0.4);
  ctx.beginPath();
  ctx.moveTo(xl, base);
  ctx.lineTo(xl + 0.06 * h, eave);
  for (let i = 0; i < n; i++) {
    const c = xl + gw * (i + 0.5) + (GX[i]! - (xl + gw * (i + 0.5))) * 0.35;
    const a = c - foot;
    const b = c + foot;
    const px = GX[i]!;
    const py = GY[i]!;
    // Steep sides bowing in a little toward the peak, like a witch's hat
    ctx.lineTo(a, eave);
    ctx.quadraticCurveTo(a + (px - a) * 0.35, eave - (eave - py) * 0.55, px, py);
    ctx.quadraticCurveTo(b - (b - px) * 0.35, eave - (eave - py) * 0.55, b, eave);
  }
  ctx.lineTo(xr - 0.06 * h, eave);
  ctx.lineTo(xr, base);
  ctx.closePath();
  ctx.fillStyle = SLATE;
  ctx.fill();
  ctx.stroke();
  moonlit(ctx, lw);
  // A course of slates along the eave band
  ctx.fillStyle = SLATE_RIDGE;
  ctx.fillRect(xl + 0.1 * h, base - 0.095 * v, xr - xl - 0.2 * h, Math.max(0.8, 0.035 * v));
  // Bone-white eave along the bottom
  ctx.fillStyle = EAVE;
  ctx.fillRect(xl + 0.02 * h, base - 0.05 * v, xr - xl - 0.04 * h, 0.035 * v);
  // A little attic window in each gable, most of them lit
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const lit = hash(level * 5.9 + i) < 0.7;
      const wx = GX[i]! * 0.5 + (xl + gw * (i + 0.5) + (GX[i]! - (xl + gw * (i + 0.5))) * 0.35) * 0.5;
      const wb = eave + 0.02 * v;
      const gh = (eave - GY[i]!) * 0.6 + 0.02 * v;
      const hw = Math.min(0.07 * h, gh * 0.35) * (pass === 0 ? 1 : 0.6);
      const top = wb - (pass === 0 ? gh : gh * 0.8);
      if (pass === 1 && !lit) continue;
      ctx.moveTo(wx - hw, wb - (pass === 0 ? 0 : 0.025 * v));
      ctx.lineTo(wx - hw, top + hw);
      ctx.lineTo(wx, top);
      ctx.lineTo(wx + hw, top + hw);
      ctx.lineTo(wx + hw, wb - (pass === 0 ? 0 : 0.025 * v));
    }
    ctx.fillStyle = pass === 0 ? FRAME : PANE_LIT;
    ctx.fill();
  }
  // The tallest gable's tip curls over into a spiral
  const fx = GX[tall]!;
  const fy = GY[tall]!;
  const fd = hash(level * 4.1) < 0.5 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.quadraticCurveTo(fx + fd * 0.01 * h, fy - CURL * v, fx + fd * 0.045 * h, fy - CURL * v);
  ctx.quadraticCurveTo(fx + fd * 0.075 * h, fy - CURL * v * 0.5, fx + fd * 0.06 * h, fy + 0.005 * v);
  ctx.quadraticCurveTo(fx + fd * 0.045 * h, fy + 0.012 * v, fx + fd * 0.04 * h, fy - 0.005 * v);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, 0.035 * h);
  ctx.stroke();
  if (n < 2) return;
  // A leaning chimney in the valley between two gables, and its smoke
  const valley = 1 + Math.floor(hash(level * 8.3) * (n - 1));
  const cx = xl + gw * valley;
  const tilt = (hash(level * 2.9) < 0.5 ? -1 : 1) * 0.12 + sway;
  const cw = 0.16 * h;
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  const by = eave + 0.02 * v;
  const ch = CHIMNEY_TOP * v;
  const tx = cx + s * (ch - EAVE_H * v);
  const ty = base - ch;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cx - (cw / 2) * c, by);
  ctx.lineTo(tx - (cw / 2) * c, ty + 0.05 * v);
  ctx.lineTo(tx + (cw / 2) * c, ty + 0.05 * v);
  ctx.lineTo(cx + (cw / 2) * c, by);
  ctx.closePath();
  ctx.fillStyle = CHIMNEY;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx - cw * 0.66, ty + 0.055 * v);
  ctx.lineTo(tx + cw * 0.66, ty + 0.055 * v);
  ctx.lineTo(tx + cw * 0.6, ty);
  ctx.lineTo(tx - cw * 0.6, ty);
  ctx.closePath();
  ctx.fillStyle = CHIMNEY_CAP;
  ctx.fill();
  ctx.stroke();
  // Smoke: three puffs curling off along the roof, gone before ROOF_MAX (none with reduce motion:
  // it would be the only thing drifting).
  if (still) return;
  const away = cx < x + w / 2 ? 1 : -1;
  const top = y - SMOKE_TOP * h;
  for (let i = 0; i < 3; i++) {
    const p = (t / SMOKE_PERIOD + i / 3 + hash(level * 1.9)) % 1;
    const fade = Math.min(1, p * 5) * (1 - p);
    if (fade <= 0.05) continue;
    const r = (0.03 + 0.045 * p) * h;
    const px = tx + away * p * 0.95 * h + Math.sin(p * 6 + i) * 0.03 * h;
    const py = Math.max(top + r, y - (CHIMNEY_TOP + 0.04 + 0.05 * p) * h);
    const cxp = Math.max(x + r, Math.min(x + w - r, px));
    ctx.beginPath();
    ctx.moveTo(cxp + r, py);
    ctx.ellipse(cxp, py, r, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = SMOKE_A[Math.min(SMOKE_A.length - 1, Math.floor((1 - fade) * SMOKE_A.length))]!;
    ctx.fill();
  }
}
