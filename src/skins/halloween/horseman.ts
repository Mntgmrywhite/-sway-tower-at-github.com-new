import { oval, type Ctx } from "../../base/draw";
import {
  FLAME_HOT,
  GOLD,
  PUMPKIN,
  PUMPKIN_DARK,
  PUMPKIN_GLOW,
  PUMPKIN_LIGHT,
  RIB,
  SILHOUETTE,
} from "./cast/palette";

// The Headless Horseman, our own design in a Burton spirit: a flat dark silhouette on a gaunt
// horse with long knobby legs, a sway back and faint ribs, its mane and tail streaming back in
// wispy tatters whose tips glow like embers; a tall thin rider in a long tattered cape that
// streams out in points, a high empty collar holding nothing at all, one long arm raised with a
// blazing jack-o'-lantern. The pumpkin and its fire are the only bright things (with the horse's
// ember eye and the embers in its mane). Charging, he gallops harder, the pumpkin thrust up at
// arm's length.
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

/** His size unit on screen (px), for `dotL`. */
let UNIT = 1;

/** A small round dot in his local units: an ellipse, or a square where it is under 1.4 px on screen (cheaper, and looks the same). */
function dotL(ctx: Ctx, x: number, y: number, r: number): void {
  if (r * UNIT < 1.4) {
    ctx.rect(x - r, y - r, r * 2, r * 2);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
}

/** A ripple for the tail and cape: amplitude 0.07, `rate` rad/s, phase `ph`. */
function wave(t: number, rate: number, ph: number): number {
  return 0.07 * Math.sin(t * rate + ph);
}

/** Scratch: the knee and the hoof of the last leg laid down, for its knobs. */
const J = { kx: 0, ky: 0, fx: 0, fy: 0 };

/** Work out a leg's knee and hoof (into J): from the hip at (x, y), `a` long at angle ua, then `b` at la. */
function joint(x: number, y: number, a: number, ua: number, b: number, la: number): void {
  J.kx = x + Math.sin(ua) * a;
  J.ky = y + Math.cos(ua) * a;
  J.fx = J.kx + Math.sin(la) * b;
  J.fy = J.ky + Math.cos(la) * b;
}

function leg(ctx: Ctx, x: number, y: number, a: number, ua: number, b: number, la: number): void {
  joint(x, y, a, ua, b, la);
  ctx.moveTo(x, y);
  ctx.lineTo(J.kx, J.ky);
  ctx.lineTo(J.fx, J.fy);
}

/** Knobby joints and small hooves for the leg just laid down (subpaths, filled later). */
function knobs(ctx: Ctx): void {
  dotL(ctx, J.kx, J.ky, 0.07);
  ctx.moveTo(J.fx - 0.06, J.fy + 0.03);
  ctx.lineTo(J.fx + 0.07, J.fy + 0.03);
  ctx.lineTo(J.fx + 0.04, J.fy - 0.04);
  ctx.lineTo(J.fx - 0.04, J.fy - 0.04);
  ctx.closePath();
}

/** A wispy tatter streaming back from (x, y) to its tip (tx, ty), `w` wide at the root. */
function tatter(ctx: Ctx, x: number, y: number, tx: number, ty: number, w: number): void {
  ctx.moveTo(x, y - w);
  ctx.quadraticCurveTo((x + tx) / 2, (y + ty) / 2 - w * 0.8, tx, ty);
  ctx.quadraticCurveTo((x + tx) / 2 + w * 0.3, (y + ty) / 2 + w * 0.6, x, y + w);
  ctx.closePath();
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
  UNIT = s;
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
  ctx.fillStyle = SILHOUETTE;
  ctx.strokeStyle = SILHOUETTE;

  // ---- long knobby legs, behind the body: the far pair a beat behind the near pair
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const p = ph - i * 0.5;
    // Front: reach forward, fold the knee back while the leg swings forward again.
    const fu = 0.3 + 0.6 * Math.sin(p);
    leg(ctx, 0.5, -0.9 + bob, 0.46, fu, 0.48, fu - Math.max(0, Math.cos(p)) * 1.6);
    // Hind: drive back, the hock flexing as the leg comes through.
    const q = p + Math.PI + 0.4;
    const hu = -0.2 + 0.55 * Math.sin(q);
    leg(ctx, -0.56, -0.94 + bob, 0.48, hu + 0.3, 0.48, hu - 0.35 + Math.max(0, Math.cos(q)) * 1.2);
  }
  ctx.lineWidth = 0.1;
  ctx.stroke();
  // Knobby knees and small hooves, filled with the tail and the mane below (none of them overlap)
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const p = ph - i * 0.5;
    const fu = 0.3 + 0.6 * Math.sin(p);
    joint(0.5, -0.9 + bob, 0.46, fu, 0.48, fu - Math.max(0, Math.cos(p)) * 1.6);
    knobs(ctx);
    const q = p + Math.PI + 0.4;
    const hu = -0.2 + 0.55 * Math.sin(q);
    joint(-0.56, -0.94 + bob, 0.48, hu + 0.3, 0.48, hu - 0.35 + Math.max(0, Math.cos(q)) * 1.2);
    knobs(ctx);
  }

  ctx.translate(0, bob);
  ctx.rotate(pitch);

  // ---- the tail and the mane: wispy tatters streaming back, ember-tipped
  const nod = 0.06 * Math.sin(ph + 2);
  const w0 = wave(t, 12, 0);
  const w1 = wave(t, 12, 1.3);
  const w2 = wave(t, 12, 2.6);
  tatter(ctx, -0.76, -1.2, -1.8, -1.3 + w0, 0.08);
  tatter(ctx, -0.76, -1.14, -1.84, -1.06 + w1, 0.07);
  tatter(ctx, -0.74, -1.08, -1.62, -0.86 + w2, 0.06);
  for (let i = 0; i < 4; i++) {
    const f = (i + 0.5) / 4;
    const bx = 0.72 - f * 0.44;
    const by = -1.74 + nod + f * 0.48;
    const flick = 0.06 * Math.sin(t * 14 + i * 1.7);
    tatter(ctx, bx, by, bx - 0.42, by - 0.14 + flick, 0.05);
  }
  ctx.fill();

  // ---- the gaunt body: a deep bony chest, a tucked belly, a sway back, a jutting hip
  ctx.beginPath();
  ctx.moveTo(0.68, -1.04);
  ctx.quadraticCurveTo(0.62, -0.84, 0.36, -0.87);
  ctx.quadraticCurveTo(0.0, -0.84, -0.36, -0.9);
  ctx.quadraticCurveTo(-0.68, -0.88, -0.8, -1.06);
  ctx.quadraticCurveTo(-0.86, -1.3, -0.6, -1.34);
  ctx.quadraticCurveTo(-0.2, -1.18, 0.22, -1.26);
  ctx.quadraticCurveTo(0.62, -1.3, 0.68, -1.04);
  ctx.closePath();
  ctx.fill();
  // Faint ribs showing along its flank
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const rx = 0.2 - i * 0.16;
    ctx.moveTo(rx + 0.04, -1.16);
    ctx.quadraticCurveTo(rx - 0.04, -1.04, rx + 0.02, -0.93);
  }
  ctx.strokeStyle = RIB;
  ctx.lineWidth = 0.035;
  ctx.stroke();

  // ---- a thin neck arched up and forward, then the long bony head
  ctx.beginPath();
  ctx.moveTo(0.26, -1.22);
  ctx.quadraticCurveTo(0.44, -1.64 + nod, 0.74, -1.78 + nod);
  ctx.lineTo(0.92, -1.62 + nod);
  ctx.quadraticCurveTo(0.8, -1.24, 0.7, -0.92);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.7, -1.78 + nod);
  ctx.lineTo(0.7, -2.02 + nod); // ear, tall and pointed
  ctx.lineTo(0.84, -1.8 + nod);
  ctx.lineTo(0.9, -1.78 + nod);
  ctx.lineTo(1.32, -1.44 + nod);
  ctx.quadraticCurveTo(1.4, -1.34 + nod, 1.3, -1.28 + nod);
  ctx.lineTo(1.18, -1.32 + nod);
  ctx.lineTo(1.08, -1.38 + nod);
  ctx.lineTo(0.96, -1.42 + nod);
  ctx.lineTo(0.78, -1.56 + nod);
  ctx.closePath();
  ctx.fill();

  // ---- rider: the long tattered cape first, streaming back in points over the horse's rump
  const c0 = wave(t, 10, 0);
  const c1 = wave(t, 10, 1.4);
  const c2 = wave(t, 10, 2.8);
  const c3 = wave(t, 10, 4.2);
  const c4 = wave(t, 10, 5.6);
  ctx.beginPath();
  ctx.moveTo(-0.08, -2.16);
  ctx.quadraticCurveTo(-0.7, -2.26 + c0, -1.54, -2.2 + c1);
  ctx.lineTo(-1.1, -2.04 + c1);
  ctx.lineTo(-1.6, -1.94 + c2);
  ctx.lineTo(-1.1, -1.82 + c2);
  ctx.lineTo(-1.42, -1.68 + c3);
  ctx.lineTo(-0.96, -1.66 + c3);
  ctx.lineTo(-1.1, -1.5 + c4);
  ctx.quadraticCurveTo(-0.56, -1.44, -0.12, -1.46);
  ctx.closePath();
  ctx.fill();

  // A long thin leg in the stirrup, the rein arm, and a long arm raised holding the pumpkin high
  // (charging, thrust up at arm's length); then the reins to the bit
  const sway = 0.05 * Math.sin(ph + 0.5);
  const hx = 0.5 + sway + CHARGE_REACH * charge;
  const hy = -2.74 - CHARGE_RAISE * charge;
  ctx.beginPath();
  ctx.moveTo(-0.02, -1.38);
  ctx.lineTo(0.24, -1.16);
  ctx.lineTo(0.14, -0.8);
  ctx.lineTo(0.3, -0.78);
  ctx.moveTo(0.14, -2.04);
  ctx.lineTo(0.5, -1.68);
  ctx.lineTo(0.68, -1.66);
  ctx.moveTo(0.2, -2.06);
  ctx.lineTo(0.5 - 0.08 * charge, -2.4 - 0.1 * charge);
  ctx.lineTo(hx, hy);
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.68, -1.66);
  ctx.lineTo(1.22, -1.36 + nod);
  ctx.lineWidth = 0.035;
  ctx.stroke();

  // A tall narrow torso leaning into the gallop, topped by a high pointed collar with nothing at
  // all between its points.
  ctx.beginPath();
  ctx.moveTo(-0.16, -1.36);
  ctx.lineTo(0.12, -1.36);
  ctx.lineTo(0.26, -2.06);
  ctx.lineTo(0.38, -2.5);
  ctx.lineTo(0.18, -2.24);
  ctx.quadraticCurveTo(0.06, -2.18, -0.06, -2.24);
  ctx.lineTo(-0.26, -2.46);
  ctx.lineTo(-0.16, -2.06);
  ctx.closePath();
  ctx.fill();

  // The horse's ember eye, and embers caught in its mane and tail
  ctx.fillStyle = PUMPKIN;
  ctx.beginPath();
  dotL(ctx, 0.98, -1.62 + nod, 0.045);
  for (let i = 0; i < 3; i++) {
    const e = (t * 0.9 + i * 0.37) % 1;
    dotL(ctx, -1.7 - e * 0.12, -1.42 + i * 0.26 + 0.05 * Math.sin(t * 8 + i), 0.035 * (1 - e) + 0.01);
    dotL(ctx, 0.3 - i * 0.12 - e * 0.1, -1.86 + nod + i * 0.12, 0.03 * (1 - e) + 0.008);
  }
  ctx.fill();

  // ---- the blazing jack-o'-lantern
  const pr = 0.24;
  const py = hy - pr * 0.75;
  const flick = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 7.3 + 1);
  ctx.fillStyle = PUMPKIN_GLOW;
  ctx.beginPath();
  dotL(ctx, hx, py - pr * 0.5, pr * 2.4);
  ctx.fill();
  // Flames: three tongues licking up and streaming back
  ctx.fillStyle = PUMPKIN_LIGHT;
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
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const e = (t * 1.4 + i * 0.2) % 1;
    dotL(ctx, hx - e * 1.3, py - pr * 1.1 - e * 0.6 + 0.08 * Math.sin(t * 9 + i * 2), 0.06 * (1 - e) + 0.015);
  }
  ctx.fill();
  // The pumpkin, ribbed, and its jagged lit face
  ctx.fillStyle = PUMPKIN;
  ctx.beginPath();
  oval(ctx, hx, py, pr * 1.15, pr);
  ctx.fill();
  ctx.fillStyle = PUMPKIN_DARK;
  ctx.beginPath();
  ctx.ellipse(hx, py, pr * 1.15, pr, 0, 0.15, Math.PI - 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flick > 0.5 ? FLAME_HOT : GOLD;
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(hx + side * pr * 0.66, py - pr * 0.02);
    ctx.lineTo(hx + side * pr * 0.1, py - pr * 0.1);
    ctx.lineTo(hx + side * pr * 0.46, py - pr * 0.58);
    ctx.closePath();
  }
  ctx.moveTo(hx - pr * 0.7, py + pr * 0.16);
  ctx.lineTo(hx - pr * 0.42, py + pr * 0.3);
  ctx.lineTo(hx - pr * 0.28, py + pr * 0.18);
  ctx.lineTo(hx - pr * 0.08, py + pr * 0.36);
  ctx.lineTo(hx + pr * 0.1, py + pr * 0.2);
  ctx.lineTo(hx + pr * 0.3, py + pr * 0.36);
  ctx.lineTo(hx + pr * 0.44, py + pr * 0.2);
  ctx.lineTo(hx + pr * 0.7, py + pr * 0.16);
  ctx.quadraticCurveTo(hx, py + pr * 0.95, hx - pr * 0.7, py + pr * 0.16);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
