import { hash, type Ctx } from "../../../base/draw";
import { CURTAIN, CURTAIN_FOLD, FLAME_HOT, GOLD, SHADOW_A } from "./palette";
import { bump, Rhythm, VISIT } from "./time";

// Mysterious silhouettes behind lit curtains: a window's drawn curtain glows candle-gold, and now
// and then (every 6-14 s) a shadow passes behind it, pauses in the middle to do something, and
// moves on: a tall-hatted gentleman who tips his hat, a hunchback carrying a candle (its flame
// shows through), a witch in profile who throws up her arms, or the huge shadow of a cat turning
// its head. Drawn inside the pane's rectangle only.

/** A pass, seconds from its start: in to the middle, pause, on and out. */
const IN = 0.95;
const PAUSE = 0.6;
const PASS = IN + PAUSE + IN;
/** First pass at 2.6 s (2.4 s later per step of the pane's id mod 3: 2.6, 5.0, 7.4), then every 6-14 s. */
const RHYTHM = new Rhythm(2.6, 2.4, 6, 14, 79);

export interface CurtainPose {
  /** 1 while a shadow is behind the curtain. */
  vis: number;
  /** Who: 0 the gentleman, 1 the hunchback with a candle, 2 the witch, 3 the cat. */
  who: 0 | 1 | 2 | 3;
  /** Its pass across the pane, 0 (left, out of sight) .. 1 (right, out of sight); it walks the other way when `dir` < 0. */
  k: number;
  /** 0..1 its act in the middle. */
  act: number;
  /** Which way it walks. */
  dir: -1 | 1;
}

const POSE: CurtainPose = { vis: 0, who: 0, k: 0, act: 0, dir: 1 };

/** The pane anchored `seed` at time t (pure; the result is reused scratch). */
export function curtainAt(t: number, seed: number): Readonly<CurtainPose> {
  const a = RHYTHM.at(t, seed);
  const v = VISIT.k;
  const p = POSE;
  p.vis = 0;
  p.k = 0;
  p.act = 0;
  p.who = (v < 0 ? 0 : Math.floor(hash(seed * 7 + v * 13 + 3) * 3.999)) as 0 | 1 | 2 | 3;
  // The first visitor of a pane is picked by its id, so two panes in the opening differ.
  if (v === 0) p.who = (Math.abs(Math.floor(seed)) % 4) as 0 | 1 | 2 | 3;
  p.dir = hash(seed * 11 + v * 5 + 1) < 0.5 ? 1 : -1;
  if (!(a >= 0 && a < PASS)) return p;
  p.vis = 1;
  if (a < IN) p.k = (a / IN) * 0.5;
  else if (a < IN + PAUSE) {
    p.k = 0.5;
    p.act = bump(IN, IN + 0.15, IN + PAUSE - 0.15, IN + PAUSE, a);
  } else p.k = 0.5 + ((a - IN - PAUSE) / IN) * 0.5;
  return p;
}

/** One figure's silhouette in a box `fh` px tall, centred at (cx, base), facing `d`. */
function figure(ctx: Ctx, who: number, cx: number, base: number, fh: number, d: number, act: number, step: number): void {
  const u = fh;
  const bob = Math.abs(Math.sin(step)) * u * 0.03;
  const y0 = base - bob;
  ctx.beginPath();
  if (who === 0) {
    // A tall gentleman in a stovepipe hat; in the middle he lifts it.
    const lift = act * u * 0.12;
    ctx.ellipse(cx, y0 - u * 0.64, u * 0.09, u * 0.1, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - u * 0.17, y0);
    ctx.lineTo(cx - u * 0.12, y0 - u * 0.5);
    ctx.quadraticCurveTo(cx, y0 - u * 0.58, cx + u * 0.12, y0 - u * 0.5);
    ctx.lineTo(cx + u * 0.17, y0);
    ctx.closePath();
    ctx.rect(cx - u * 0.07, y0 - u * 0.96 - lift, u * 0.14, u * 0.24);
    ctx.rect(cx - u * 0.13, y0 - u * 0.73 - lift, u * 0.26, u * 0.03);
    if (act > 0.05) {
      // The arm raised to the hat's brim
      ctx.moveTo(cx + d * u * 0.1, y0 - u * 0.48);
      ctx.lineTo(cx + d * u * 0.2, y0 - u * (0.5 + act * 0.18));
      ctx.lineTo(cx + d * u * 0.16, y0 - u * (0.52 + act * 0.2));
      ctx.lineTo(cx + d * u * 0.08, y0 - u * 0.44);
      ctx.closePath();
    }
  } else if (who === 1) {
    // A hunchback with a candle held out in front.
    ctx.moveTo(cx - d * u * 0.2, y0);
    ctx.quadraticCurveTo(cx - d * u * 0.34, y0 - u * 0.5, cx - d * u * 0.08, y0 - u * 0.62);
    ctx.quadraticCurveTo(cx + d * u * 0.1, y0 - u * 0.68, cx + d * u * 0.14, y0 - u * 0.5);
    ctx.lineTo(cx + d * u * 0.12, y0);
    ctx.closePath();
    ctx.moveTo(cx + d * u * 0.18, y0 - u * 0.5);
    ctx.ellipse(cx + d * u * 0.1, y0 - u * 0.5, u * 0.08, u * 0.08, 0, 0, Math.PI * 2);
    ctx.moveTo(cx + d * u * 0.05, y0 - u * 0.36);
    ctx.lineTo(cx + d * u * 0.28, y0 - u * (0.4 + act * 0.12));
    ctx.lineTo(cx + d * u * 0.28, y0 - u * (0.34 + act * 0.12));
    ctx.lineTo(cx + d * u * 0.05, y0 - u * 0.3);
    ctx.closePath();
  } else if (who === 2) {
    // A witch in profile: pointed hat, long nose and chin; she throws her arms up.
    ctx.moveTo(cx - u * 0.18, y0);
    ctx.lineTo(cx - u * 0.08, y0 - u * 0.5);
    ctx.lineTo(cx + u * 0.08, y0 - u * 0.5);
    ctx.lineTo(cx + u * 0.18, y0);
    ctx.closePath();
    ctx.moveTo(cx + d * u * 0.08, y0 - u * 0.62);
    ctx.ellipse(cx, y0 - u * 0.6, u * 0.08, u * 0.09, 0, 0, Math.PI * 2);
    ctx.moveTo(cx + d * u * 0.06, y0 - u * 0.62);
    ctx.lineTo(cx + d * u * 0.17, y0 - u * 0.57);
    ctx.lineTo(cx + d * u * 0.06, y0 - u * 0.56);
    ctx.closePath();
    ctx.moveTo(cx - u * 0.18, y0 - u * 0.66);
    ctx.lineTo(cx + u * 0.18, y0 - u * 0.66);
    ctx.lineTo(cx - d * u * 0.02, y0 - u * 1.0);
    ctx.closePath();
    const up = act * u * 0.3;
    for (let s = -1; s <= 1; s += 2) {
      ctx.moveTo(cx + s * u * 0.06, y0 - u * 0.46);
      ctx.lineTo(cx + s * u * (0.2 + act * 0.02), y0 - u * 0.3 - up);
      ctx.lineTo(cx + s * u * (0.24 + act * 0.02), y0 - u * 0.33 - up);
      ctx.lineTo(cx + s * u * 0.1, y0 - u * 0.5);
      ctx.closePath();
    }
  } else {
    // The huge shadow of a cat's head and shoulders, turning to look out.
    const turn = act * 0.4;
    ctx.ellipse(cx, y0 - u * 0.1, u * 0.34, u * 0.3, 0, Math.PI, 0);
    ctx.closePath();
    ctx.moveTo(cx + u * 0.22, y0 - u * 0.5);
    ctx.ellipse(cx + d * turn * u * 0.1, y0 - u * 0.5, u * 0.22, u * 0.18, 0, 0, Math.PI * 2);
    for (let s = -1; s <= 1; s += 2) {
      ctx.moveTo(cx + s * u * 0.18 + d * turn * u * 0.1, y0 - u * 0.58);
      ctx.lineTo(cx + s * u * 0.2 + d * turn * u * 0.12, y0 - u * 0.86);
      ctx.lineTo(cx + s * u * 0.06 + d * turn * u * 0.1, y0 - u * 0.66);
      ctx.closePath();
    }
  }
  ctx.fillStyle = SHADOW_A;
  ctx.fill();
  if (who === 1) {
    // The candle's flame glows through the curtain.
    const fx = cx + d * u * 0.28;
    const fy = y0 - u * (0.47 + act * 0.12);
    ctx.beginPath();
    ctx.ellipse(fx, fy, u * 0.07, u * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = FLAME_HOT;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx, fy + u * 0.02, u * 0.03, u * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
}

/** The lit curtain drawn across the pane (x, y, w, h), with a shadow passing behind it. Inside the pane only. */
export function curtain(ctx: Ctx, x: number, y: number, w: number, h: number, p: Readonly<CurtainPose>): void {
  ctx.fillStyle = CURTAIN;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (p.vis > 0) {
    const fh = h * 0.92;
    const travel = w + fh * 0.7;
    const k = p.dir > 0 ? p.k : 1 - p.k;
    const cx = x - fh * 0.35 + travel * k;
    figure(ctx, p.who, cx, y + h, fh, p.dir, p.act, p.k * 9);
  }
  // Folds of the curtain, gathered toward the top, and the gap where it parts in the middle.
  ctx.beginPath();
  const n = Math.max(2, Math.round(w / Math.max(3, h * 0.18)));
  for (let i = 1; i < n; i++) {
    const fx = x + (w * i) / n;
    ctx.moveTo(fx + (fx - (x + w / 2)) * -0.1, y);
    ctx.quadraticCurveTo(fx, y + h * 0.4, fx + (fx - (x + w / 2)) * 0.08, y + h);
  }
  ctx.strokeStyle = CURTAIN_FOLD;
  ctx.lineWidth = Math.max(0.7, w * 0.03);
  ctx.stroke();
  ctx.restore();
}
