import { alpha, circle, mix, oval, type Ctx } from "../../base/draw";
import { CANDLE, FLAME, FLAME_HOT, ORANGE, ORANGE_DARK, RIDER } from "./common";

// The Headless Horseman, our own design: a flat dark silhouette galloping on a big-chested
// horse with a streaming mane and tail, a tattered cape billowing behind a rider whose high
// flared collar holds nothing at all, one arm raised with a flaming jack-o'-lantern. The
// pumpkin, its fire and the horse's ember eye are the only lit things. Charging, he gallops
// harder, the pumpkin thrust up at arm's length.
//
// Local space: origin on the ground under the horse's middle, facing +x (mirrored to face
// left), up is -y, in units of `s` (the horse is about 3 long and the raised pumpkin about 3
// up). Everything is a fixed outline animated from `t`; nothing allocates per frame.

const TAU = Math.PI * 2;
/** Strides per second, and how much faster he gallops charging. */
const STRIDE = 1.7;
const CHARGE_STRIDE = 0.4;
/** Charging, the pumpkin's hand is this much higher and farther forward, in his size unit. */
export const CHARGE_RAISE = 0.2;
const CHARGE_REACH = 0.1;
const EMBER = mix(FLAME, "#ffffff", 0.25);
const GLOW = alpha(FLAME, 0.2);

/** A ripple for the tail and cape: amplitude 0.07, `rate` rad/s, phase `ph`. */
function wave(t: number, rate: number, ph: number): number {
  return 0.07 * Math.sin(t * rate + ph);
}

function leg(ctx: Ctx, x: number, y: number, a: number, ua: number, b: number, la: number): void {
  const kx = x + Math.sin(ua) * a;
  const ky = y + Math.cos(ua) * a;
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(kx + Math.sin(la) * b, ky + Math.cos(la) * b);
}

/**
 * The Horseman at (x, y) (ground under his middle), `s` = his size unit, tilted by `tilt`
 * radians (the slope he rides), at opacity `vis`, facing `dir` (1 right, -1 left), charging
 * by `charge` (0..1; hold it steady through a ride, as it sets the gallop's pace).
 */
export function horseman(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  t: number,
  tilt: number,
  vis: number,
  dir = 1,
  charge = 0,
): void {
  if (vis <= 0.01) return;
  const ph = t * STRIDE * (1 + CHARGE_STRIDE * charge) * TAU;
  const bob = -0.06 * Math.sin(ph + 0.4);
  const pitch = 0.04 * Math.sin(ph + 1.1);

  ctx.save();
  ctx.globalAlpha = vis;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s * dir, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = RIDER;
  ctx.strokeStyle = RIDER;

  // ---- legs, behind the body: the far pair a beat behind the near pair
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const p = ph - i * 0.5;
    // Front: reach forward, fold the knee back while the leg swings forward again.
    const fu = 0.3 + 0.6 * Math.sin(p);
    leg(ctx, 0.52, -0.86 + bob, 0.44, fu, 0.44, fu - Math.max(0, Math.cos(p)) * 1.6);
    // Hind: drive back, the hock flexing as the leg comes through.
    const q = p + Math.PI + 0.4;
    const hu = -0.2 + 0.55 * Math.sin(q);
    leg(ctx, -0.58, -0.9 + bob, 0.46, hu + 0.3, 0.46, hu - 0.35 + Math.max(0, Math.cos(q)) * 1.2);
  }
  ctx.lineWidth = 0.17;
  ctx.stroke();

  ctx.translate(0, bob);
  ctx.rotate(pitch);

  // ---- tail, streaming back and rippling
  const w0 = wave(t, 12, 0);
  const w1 = wave(t, 12, 1.3);
  const w2 = wave(t, 12, 2.6);
  ctx.beginPath();
  ctx.moveTo(-0.78, -1.2);
  ctx.quadraticCurveTo(-1.2, -1.44 + w0, -1.75, -1.36 + w1);
  ctx.lineTo(-1.5, -1.24 + w1 * 0.6);
  ctx.lineTo(-1.8, -1.08 + w2);
  ctx.quadraticCurveTo(-1.3, -1.02 + w2 * 0.5, -0.82, -0.98);
  ctx.closePath();
  ctx.fill();

  // ---- body: barrel, deep chest, round hindquarters
  ctx.beginPath();
  oval(ctx, 0, -1.0, 0.66, 0.28);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, 0.5, -1.02, 0.32, 0.32, 0.2);
  ctx.fill();
  ctx.beginPath();
  oval(ctx, -0.52, -1.06, 0.36, 0.32, -0.15);
  ctx.fill();

  // ---- neck arched up and forward, then the head
  const nod = 0.06 * Math.sin(ph + 2);
  ctx.beginPath();
  ctx.moveTo(0.26, -1.2);
  ctx.quadraticCurveTo(0.42, -1.62 + nod, 0.74, -1.76 + nod);
  ctx.lineTo(0.96, -1.6 + nod);
  ctx.quadraticCurveTo(0.84, -1.2, 0.76, -0.86);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.7, -1.78 + nod);
  ctx.lineTo(0.72, -1.98 + nod); // ear
  ctx.lineTo(0.84, -1.79 + nod);
  ctx.lineTo(0.92, -1.76 + nod);
  ctx.lineTo(1.3, -1.42 + nod);
  ctx.quadraticCurveTo(1.38, -1.32 + nod, 1.3, -1.26 + nod);
  ctx.lineTo(1.16, -1.28 + nod);
  ctx.lineTo(0.92, -1.46 + nod);
  ctx.lineTo(0.78, -1.56 + nod);
  ctx.closePath();
  ctx.fill();

  // ---- mane, flying back off the crest like smoke
  ctx.beginPath();
  ctx.moveTo(0.74, -1.76 + nod);
  for (let i = 0; i < 4; i++) {
    const f = (i + 1) / 4;
    const bx = 0.74 - f * 0.46;
    const by = -1.76 + nod + f * 0.52;
    const flick = 0.06 * Math.sin(t * 14 + i * 1.7);
    ctx.lineTo(bx - 0.3, by - 0.16 + flick);
    ctx.lineTo(bx - 0.05, by);
  }
  ctx.closePath();
  ctx.fill();

  // ---- rider: the tattered cape first, billowing back over the horse's rump
  const c0 = wave(t, 10, 0);
  const c1 = wave(t, 10, 1.4);
  const c2 = wave(t, 10, 2.8);
  const c3 = wave(t, 10, 4.2);
  const c4 = wave(t, 10, 5.6);
  ctx.beginPath();
  ctx.moveTo(-0.06, -1.98);
  ctx.quadraticCurveTo(-0.6, -2.08 + c0, -1.3, -1.92 + c1);
  ctx.lineTo(-1.06, -1.8 + c1);
  ctx.lineTo(-1.4, -1.66 + c2);
  ctx.lineTo(-1.1, -1.56 + c2);
  ctx.lineTo(-1.26, -1.4 + c3);
  ctx.lineTo(-0.94, -1.4 + c3);
  ctx.lineTo(-0.98, -1.24 + c4);
  ctx.quadraticCurveTo(-0.5, -1.32, -0.12, -1.42);
  ctx.closePath();
  ctx.fill();

  // Leg in the stirrup, rein arm, and the reins to the bit
  ctx.beginPath();
  ctx.moveTo(-0.04, -1.36);
  ctx.lineTo(0.26, -1.18);
  ctx.lineTo(0.16, -0.82);
  ctx.lineTo(0.3, -0.8);
  ctx.moveTo(0.16, -1.92);
  ctx.lineTo(0.48, -1.6);
  ctx.lineTo(0.66, -1.62);
  ctx.lineWidth = 0.15;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.66, -1.62);
  ctx.lineTo(1.2, -1.32 + nod);
  ctx.lineWidth = 0.045;
  ctx.stroke();

  // Torso, broad-shouldered and leaning into the gallop, topped by a high flared collar with
  // nothing at all between its points.
  ctx.beginPath();
  ctx.moveTo(-0.2, -1.34);
  ctx.lineTo(0.16, -1.34);
  ctx.lineTo(0.3, -2.0);
  ctx.lineTo(0.4, -2.36);
  ctx.lineTo(0.2, -2.12);
  ctx.quadraticCurveTo(0.08, -2.06, -0.04, -2.12);
  ctx.lineTo(-0.24, -2.36);
  ctx.lineTo(-0.16, -2.0);
  ctx.closePath();
  ctx.fill();

  // Raised arm, holding the pumpkin high (charging, thrust up at arm's length)
  const sway = 0.05 * Math.sin(ph + 0.5);
  const hx = 0.5 + sway + CHARGE_REACH * charge;
  const hy = -2.74 - CHARGE_RAISE * charge;
  ctx.beginPath();
  ctx.moveTo(0.22, -1.96);
  ctx.lineTo(0.52 - 0.08 * charge, -2.36 - 0.1 * charge);
  ctx.lineTo(hx, hy);
  ctx.lineWidth = 0.15;
  ctx.stroke();

  // Horse's ember eye
  ctx.fillStyle = FLAME;
  ctx.beginPath();
  circle(ctx, 0.98, -1.62 + nod, 0.05);
  ctx.fill();

  // ---- the flaming jack-o'-lantern
  const pr = 0.24;
  const py = hy - pr * 0.75;
  const flick = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 7.3 + 1);
  ctx.fillStyle = GLOW;
  ctx.beginPath();
  circle(ctx, hx, py - pr * 0.5, pr * 2.4);
  ctx.fill();
  // Flames: three tongues licking up and streaming back
  ctx.fillStyle = FLAME;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const fx = hx + (i - 1) * pr * 0.5;
    const fh = pr * (1.3 + (i === 1 ? 0.6 : 0) + 0.3 * Math.sin(t * 19 + i * 2.1));
    ctx.moveTo(fx - pr * 0.4, py - pr * 0.4);
    ctx.quadraticCurveTo(fx - pr * 0.4, py - pr * 0.4 - fh * 0.6, fx - fh * 0.45, py - pr * 0.4 - fh);
    ctx.quadraticCurveTo(fx + pr * 0.3, py - pr * 0.4 - fh * 0.45, fx + pr * 0.4, py - pr * 0.4);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = FLAME_HOT;
  ctx.beginPath();
  ctx.moveTo(hx - pr * 0.3, py - pr * 0.45);
  ctx.quadraticCurveTo(hx - pr * 0.25, py - pr * (1.1 + flick * 0.4), hx - pr * 0.6, py - pr * (1.5 + flick * 0.5));
  ctx.quadraticCurveTo(hx + pr * 0.25, py - pr * 0.95, hx + pr * 0.3, py - pr * 0.45);
  ctx.closePath();
  ctx.fill();
  // Embers drifting back and up off the flame
  ctx.fillStyle = EMBER;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const e = (t * 1.4 + i * 0.2) % 1;
    circle(ctx, hx - e * 1.3, py - pr * 1.1 - e * 0.6 + 0.08 * Math.sin(t * 9 + i * 2), 0.06 * (1 - e) + 0.015);
  }
  ctx.fill();
  // Pumpkin body and its lit face
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  oval(ctx, hx, py, pr * 1.15, pr);
  ctx.fill();
  ctx.fillStyle = ORANGE_DARK;
  ctx.beginPath();
  ctx.ellipse(hx, py, pr * 1.15, pr, 0, 0.15, Math.PI - 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flick > 0.5 ? FLAME_HOT : CANDLE;
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(hx + side * pr * 0.62, py - pr * 0.04);
    ctx.lineTo(hx + side * pr * 0.12, py - pr * 0.04);
    ctx.lineTo(hx + side * pr * 0.4, py - pr * 0.52);
    ctx.closePath();
  }
  ctx.moveTo(hx - pr * 0.62, py + pr * 0.2);
  ctx.lineTo(hx + pr * 0.62, py + pr * 0.2);
  ctx.quadraticCurveTo(hx, py + pr * 0.8, hx - pr * 0.62, py + pr * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
