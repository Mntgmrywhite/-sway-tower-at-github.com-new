import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import {
  BRASS,
  CANVAS_BLUE,
  CANVAS_WHITE,
  HARNESS,
  HORSE,
  HORSE_LIGHT,
  INK,
  IRON,
  MANE,
  PEWTER,
  SKIN,
  WAGON,
  WHEEL,
  WOOD,
  WREATH,
} from "./colors";
import { DRIVER, figure, WAITRESS, WOMAN_H } from "./folk";
import { centerX, inkW } from "./ground";
import { block, pill } from "./shapes";
import { barrels, steins } from "./stein";

// What crosses in front of the bandstand, below the floor line (so nothing moves behind the
// tower): the brewers' parade, two draft horses in brass-studded harness with blue-and-white
// plumes pulling a blue barrel wagon (three oak barrels stacked on its bed, a garland of flowers
// festooned along its rim), a driver up on the box, in from the left and away out the right, past the
// tower by the third second and gone by the eighth; then the waitress, in from the left with a
// pewter tray of foaming steins held out before her, across the front and away out the right,
// past the tower by the tenth second. Both go behind the stalls and the fence in front, and
// keep coming round for as long as you stand there: the parade every PARADE_EVERY seconds, the
// waitress every WAITRESS_EVERY, the other way each time, timed so they never meet. They
// enter and leave through the sides of the screen, however wide it is (`half`: the screen's
// half width in u). Everything is a function of the scene's time.
//
// Positions are in u from the base block's center line, heights in u down from the floor line.

/**
 * The parade's line (u below the floor) and the waitress's: her shoes keep clear above the
 * trodden sand in front (front.ts, from 0.332 u down), and her head stays under the stalls'
 * awnings (from 0.16 u down) as she passes behind them.
 */
export const PARADE_LINE = 0.245;
export const WAITRESS_LINE = 0.322;
/** The parade: when the lead horse's nose passes the tower's center line (s), how fast it goes (u/s), how often it comes round (s). */
export const PARADE_PASS = 2.45;
export const PARADE_SPEED = 0.22;
export const PARADE_EVERY = 48;
/** How long the parade is, nose to tail (u), and how far its drawing reaches past either end (u). */
export const PARADE_LENGTH = 0.56;
export const PARADE_REACH = 0.03;
/** The waitress: when she first passes the tower's center line (s), her pace (u/s), how often she crosses (s). */
export const WAITRESS_PASS = 9.5;
export const WAITRESS_SPEED = 0.12;
export const WAITRESS_EVERY = 24;
/** How far she and her tray reach either side of her center (u). */
export const WAITRESS_REACH = 0.07;

/** t folded into [-every / 2, every / 2). */
function folded(t: number, every: number): number {
  return t - every * Math.floor(t / every + 0.5);
}

/**
 * Where the parade is at time t: the lead horse's nose (u from the tower's center), and whether
 * any of it is in view on a screen `half` u either side of the center. Each round it crosses
 * from far off the left (PARADE_EVERY / 2 seconds before it passes the tower) to far off the right.
 */
export function paradeAt(t: number, half = 0.5): { x: number; shown: boolean } {
  PARADE.x = folded(t - PARADE_PASS, PARADE_EVERY) * PARADE_SPEED;
  PARADE.shown = PARADE.x + PARADE_REACH > -half && PARADE.x - PARADE_LENGTH - PARADE_REACH < half;
  return PARADE;
}
const PARADE = { x: 0, shown: false };

/**
 * Where the waitress is at time t: her center (u from the tower's center), her facing, and
 * whether she is in view on a screen `half` u either side of the center. She passes the tower
 * every WAITRESS_EVERY seconds, the first time going right, then the other way each time.
 */
export function waitressAt(t: number, half = 0.5): { x: number; m: number; shown: boolean } {
  const w = WAITRESS_AT;
  const n = Math.floor((t - WAITRESS_PASS) / WAITRESS_EVERY + 0.5);
  const k = t - WAITRESS_PASS - n * WAITRESS_EVERY;
  w.m = n % 2 ? -1 : 1;
  w.x = w.m * k * WAITRESS_SPEED;
  w.shown = Math.abs(w.x) - WAITRESS_REACH < half;
  return w;
}
const WAITRESS_AT = { x: 0, m: 1, shown: false };

/** The scene's half width in u either side of the tower's center line. */
export function halfWidth(s: Scene): number {
  const cx = centerX(s);
  return Math.max(cx, s.cssW - cx) / s.u;
}

// ---------------------------------------------------------------- the horses and the wagon

/** A horse's walk this frame: where its four feet are (fore and hind, near and far), by the stride phase. */
function hoof(phase: number): number {
  return Math.sin(phase);
}

/**
 * A draft horse in its own frame (feet at the origin, facing right): a deep body, a crested
 * neck with a cream mane, the head down in the collar, feathered feet, in a harness of dark
 * leather with brass bosses and a blue-and-white plume on its head.
 */
function horse(ctx: Ctx, u: number, lw: number, x: number, foot: number, stride: number, k: number, far: boolean): void {
  const w = lw / u;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(u * k, u * k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const body = far ? HORSE_LIGHT : HORSE;
  // Far legs first (the pair on the other side), then the body, then the near legs.
  for (let near = 0; near < 2; near++) {
    if (near === 1) {
      // The body: deep and round, a lit top, a dark belly.
      ctx.beginPath();
      oval(ctx, 0, -0.095, 0.06, 0.036);
      ctx.fillStyle = body.body;
      ctx.fill();
      ctx.fillStyle = body.light;
      ctx.beginPath();
      oval(ctx, -0.01, -0.112, 0.04, 0.012);
      ctx.fill();
      ctx.beginPath();
      oval(ctx, 0, -0.095, 0.06, 0.036);
      ink(ctx, w, INK);
      // The tail.
      ctx.beginPath();
      ctx.moveTo(-0.056, -0.105);
      ctx.quadraticCurveTo(-0.075, -0.09, -0.07, -0.05);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.012 + w;
      ctx.stroke();
      ctx.strokeStyle = MANE;
      ctx.lineWidth = 0.012;
      ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const hipX = i ? 0.038 : -0.038;
      const ph = stride + i * Math.PI + near * Math.PI * 0.9;
      const swing = hoof(ph) * 0.016;
      const lift = Math.max(0, Math.cos(ph)) * 0.012;
      ctx.beginPath();
      ctx.moveTo(hipX, -0.085);
      ctx.lineTo(hipX + swing * 0.5, -0.045);
      ctx.lineTo(hipX + swing, -0.006 - lift);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.013 + w;
      ctx.stroke();
      ctx.strokeStyle = near ? body.body : body.shade;
      ctx.lineWidth = 0.013;
      ctx.stroke();
      // Feathered feet: a tuft of cream over the hoof.
      ctx.beginPath();
      oval(ctx, hipX + swing, -0.011 - lift, 0.011, 0.007);
      ctx.fillStyle = near ? MANE : HORSE_LIGHT.shade;
      ctx.fill();
      ink(ctx, w * 0.7, INK);
      ctx.beginPath();
      ctx.rect(hipX + swing - 0.008, -0.006 - lift, 0.016, 0.006);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }
  // The neck, crested, up and forward; the mane along it.
  ctx.beginPath();
  ctx.moveTo(0.04, -0.12);
  ctx.quadraticCurveTo(0.07, -0.15, 0.084, -0.148);
  ctx.lineTo(0.09, -0.118);
  ctx.quadraticCurveTo(0.07, -0.09, 0.05, -0.085);
  ctx.closePath();
  ctx.fillStyle = body.body;
  ctx.fill();
  ink(ctx, w, INK);
  ctx.beginPath();
  ctx.moveTo(0.042, -0.122);
  ctx.quadraticCurveTo(0.068, -0.152, 0.086, -0.15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.012 + w;
  ctx.stroke();
  ctx.strokeStyle = MANE;
  ctx.lineWidth = 0.012;
  ctx.stroke();
  // The head: a long muzzle angled down, an ear, an eye, a nostril; the bridle round it.
  ctx.beginPath();
  ctx.moveTo(0.078, -0.15);
  ctx.quadraticCurveTo(0.1, -0.15, 0.112, -0.125);
  ctx.quadraticCurveTo(0.118, -0.105, 0.108, -0.098);
  ctx.quadraticCurveTo(0.094, -0.1, 0.086, -0.118);
  ctx.closePath();
  ctx.fillStyle = body.body;
  ctx.fill();
  ctx.fillStyle = body.light;
  ctx.beginPath();
  oval(ctx, 0.1, -0.128, 0.008, 0.016, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.078, -0.15);
  ctx.quadraticCurveTo(0.1, -0.15, 0.112, -0.125);
  ctx.quadraticCurveTo(0.118, -0.105, 0.108, -0.098);
  ctx.quadraticCurveTo(0.094, -0.1, 0.086, -0.118);
  ctx.closePath();
  ink(ctx, w, INK);
  ctx.beginPath();
  ctx.moveTo(0.082, -0.15);
  ctx.lineTo(0.08, -0.166);
  ctx.lineTo(0.09, -0.153);
  ctx.closePath();
  ctx.fillStyle = body.body;
  ctx.fill();
  ink(ctx, w * 0.8, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, 0.093, -0.14, 0.0032);
  circle(ctx, 0.109, -0.106, 0.002);
  ctx.fill();
  // The plume on its head: blue and white.
  ctx.beginPath();
  oval(ctx, 0.075, -0.172, 0.006, 0.011);
  ctx.fillStyle = CANVAS_BLUE;
  ctx.fill();
  ink(ctx, w * 0.7, INK);
  ctx.fillStyle = CANVAS_WHITE;
  ctx.beginPath();
  oval(ctx, 0.075, -0.176, 0.003, 0.006);
  ctx.fill();
  // The harness: the collar round the neck's base with brass bosses, the bridle and the trace back along the body.
  ctx.strokeStyle = HARNESS;
  ctx.lineWidth = 0.007;
  ctx.beginPath();
  ctx.moveTo(0.052, -0.138);
  ctx.quadraticCurveTo(0.076, -0.118, 0.06, -0.086);
  ctx.stroke();
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.moveTo(0.095, -0.128);
  ctx.lineTo(0.112, -0.112);
  ctx.moveTo(0.088, -0.145);
  ctx.lineTo(0.108, -0.105);
  ctx.moveTo(0.055, -0.1);
  ctx.lineTo(-0.058, -0.1);
  ctx.moveTo(0.0, -0.126);
  ctx.quadraticCurveTo(0.004, -0.07, 0.0, -0.062);
  ctx.stroke();
  ctx.fillStyle = BRASS.body;
  ctx.beginPath();
  circle(ctx, 0.062, -0.128, 0.0032);
  circle(ctx, 0.068, -0.112, 0.0032);
  circle(ctx, 0.062, -0.096, 0.0032);
  circle(ctx, 0.0, -0.126, 0.0035);
  ctx.fill();
  ctx.restore();
}

/** A wagon wheel: a gold rim with spokes, turning by `angle`. */
function wheel(ctx: Ctx, u: number, lw: number, x: number, y: number, r: number, angle: number): void {
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = WHEEL.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x, y, r * 0.78);
  ctx.fillStyle = WHEEL.light;
  ctx.fill();
  ctx.strokeStyle = WHEEL.shade;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI) / 3;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
  }
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.16);
  ctx.fillStyle = IRON.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** Flower colors for the wagon's garland, by turns. */
const FLOWERS = ["#ff5a6e", "#ffd23f", "#ff8fc8", "#ffffff"] as const;

/** Flowers at the scratch points, one fill per color, each inked. */
function flowers(ctx: Ctx, lw: number, n: number, r: number): void {
  for (let c = 0; c < FLOWERS.length; c++) {
    ctx.beginPath();
    for (let i = c; i < n; i += FLOWERS.length) circle(ctx, BLOOM_X[i]!, BLOOM_Y[i]!, r);
    ctx.fillStyle = FLOWERS[c]!;
    ctx.fill();
    ink(ctx, lw * 0.6, INK);
  }
}
const BLOOM_X = new Float64Array(16);
const BLOOM_Y = new Float64Array(16);

/** The barrels on the bed: how long and high each is (u), and how far in from the bed's back end the stack starts (u). */
const BARREL_W = 0.104;
const BARREL_H = 0.05;
const STACK_IN = 0.02;

/**
 * The wagon's load: three oak barrels lying along the bed, two side by side and one on top,
 * chocked with wedges, and a garland of flowers festooned along the bed's rim in front of them.
 */
function cargo(ctx: Ctx, u: number, lw: number, bx: number, bedY: number): void {
  const w = BARREL_W * u;
  const h = BARREL_H * u;
  const x0 = bx + STACK_IN * u;
  const x1 = x0 + w + u * 0.008;
  const xt = (x0 + x1) / 2;
  const yt = bedY - h * 2 + u * 0.006;
  // Wedges under the bottom pair, so they cannot roll.
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const x = i ? x1 + w * 0.8 : x0 + w * 0.2;
    ctx.moveTo(x - u * 0.009, bedY);
    ctx.lineTo(x + u * 0.009, bedY);
    ctx.lineTo(x, bedY - u * 0.012);
    ctx.closePath();
  }
  ctx.fillStyle = WOOD.shade;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // The bottom pair side by side, then the one lying on top of them.
  barrels(ctx, lw, x0, x1 - x0, 2, bedY - h, w, h);
  barrels(ctx, lw, xt, 0, 1, yt, w, h);
  // The garland: a green festoon along the bed's top, sagging in two loops in front of the
  // bottom barrels, with flowers along it.
  const gx0 = bx + u * 0.008;
  const gx1 = bx + u * 0.248;
  const gm = (gx0 + gx1) / 2;
  const gy = bedY + u * 0.002;
  const sag = u * 0.022;
  ctx.beginPath();
  ctx.moveTo(gx0, gy);
  ctx.quadraticCurveTo((gx0 + gm) / 2, gy + sag * 0.9, gm, gy);
  ctx.quadraticCurveTo((gm + gx1) / 2, gy + sag * 0.9, gx1, gy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.008 + lw * 1.6;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = WREATH.body;
  ctx.lineWidth = u * 0.008;
  ctx.stroke();
  // Flowers at the knots and along each loop.
  let n = 0;
  for (let loop = 0; loop < 2; loop++) {
    const a0 = loop ? gm : gx0;
    const a1 = loop ? gx1 : gm;
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      BLOOM_X[n] = a0 + (a1 - a0) * t;
      BLOOM_Y[n] = gy + 2 * t * (1 - t) * sag * 0.9;
      n++;
    }
  }
  BLOOM_X[n] = gx1;
  BLOOM_Y[n] = gy;
  n++;
  flowers(ctx, lw, n, u * 0.0055);
}

/**
 * The barrel wagon at its nose x: the horses (the far one a little higher and smaller, then the
 * near one), the shafts, the wagon's blue bed on gold wheels, its load of barrels under their
 * garland, and the driver up on the box with the reins.
 */
function wagon(ctx: Ctx, s: Scene, nose: number): void {
  const u = s.u;
  const g = s.groundY;
  const foot = g + PARADE_LINE * u;
  if (foot - u * 0.24 > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const stride = s.t * 7;
  // The horses: noses at `nose`, their origins 0.11 behind.
  const hx = cx + (nose - 0.112) * u;
  horse(ctx, u, lw, hx + u * 0.02, foot - u * 0.03, stride + 1.1, 0.94, true);
  // The wagon's bed, behind the horses.
  const bx = cx + (nose - PARADE_LENGTH) * u;
  const bw = u * 0.3;
  const bedY = foot - u * 0.075;
  // Shafts from the bed to the horses' collars.
  ctx.beginPath();
  ctx.moveTo(bx + bw, bedY + u * 0.01);
  ctx.lineTo(hx - u * 0.01, foot - u * 0.098);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.006 + lw * 1.3;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = u * 0.006;
  ctx.stroke();
  horse(ctx, u, lw, hx, foot, stride, 1, false);
  // The bed: a blue box on a dark undercarriage.
  ctx.beginPath();
  block(ctx, bx, bedY, bw, u * 0.04, u * 0.004);
  ctx.fillStyle = WAGON.body;
  ctx.fill();
  ctx.fillStyle = WAGON.light;
  ctx.fillRect(bx + u * 0.006, bedY + u * 0.004, bw - u * 0.012, u * 0.008);
  ctx.fillStyle = WAGON.shade;
  ctx.fillRect(bx + u * 0.006, bedY + u * 0.03, bw - u * 0.012, u * 0.007);
  ink(ctx, lw, INK);
  // A white diamond trim along the side.
  ctx.fillStyle = CANVAS_WHITE;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const x = bx + u * 0.03 + i * u * 0.04;
    ctx.moveTo(x, bedY + u * 0.013);
    ctx.lineTo(x + u * 0.007, bedY + u * 0.021);
    ctx.lineTo(x, bedY + u * 0.029);
    ctx.lineTo(x - u * 0.007, bedY + u * 0.021);
    ctx.closePath();
  }
  ctx.fill();
  cargo(ctx, u, lw, bx, bedY);
  // The driver on the box at the front of the bed, reins in hand.
  const dr = DRIVER;
  dr.m = 1;
  dr.lift = 0;
  dr.lean = 0.05;
  dr.footL = 0.014;
  dr.footR = 0.022;
  dr.raiseL = 0.03;
  dr.raiseR = 0.028;
  dr.handLx = 0.028;
  dr.handLy = -0.095;
  dr.handRx = 0.036;
  dr.handRy = -0.092;
  dr.mouth = 0;
  // Seated: his feet rest on the footboard, his hips on the box.
  ctx.beginPath();
  block(ctx, bx + bw - u * 0.045, bedY - u * 0.03, u * 0.045, u * 0.03, u * 0.004);
  ctx.fillStyle = WOOD.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  figure(ctx, u, lw, bx + bw - u * 0.024, bedY + u * 0.016, dr);
  // Reins from his hands to the horses.
  ctx.beginPath();
  ctx.moveTo(bx + bw + u * 0.012, bedY - u * 0.075);
  ctx.quadraticCurveTo(hx - u * 0.02, foot - u * 0.1, hx + u * 0.09, foot - u * 0.128);
  ctx.strokeStyle = HARNESS;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  // The wheels, turning with the road.
  const angle = (cx + nose * u) / (u * 0.034);
  wheel(ctx, u, lw, bx + u * 0.05, foot - u * 0.036, u * 0.036, angle);
  wheel(ctx, u, lw, bx + bw - u * 0.05, foot - u * 0.036, u * 0.036, angle + 0.4);
}

/** The parade, if any of it is in view now. */
export function parade(ctx: Ctx, s: Scene): void {
  const p = paradeAt(s.t, halfWidth(s));
  if (!p.shown) return;
  wagon(ctx, s, p.x);
}

// ---------------------------------------------------------------- the waitress

/** Her tray: how far before her it is held (u, at full size), its half width and height above her feet (u). */
const TRAY_X = 0.058;
const TRAY_HW = 0.045;
const TRAY_UP = 0.088;
/** The steins on it: their glass height, where the first stands (u from the tray's center, out from her) and the next (u further out). */
const STEIN_H = 0.034;
const STEIN_AT = -0.026;
const STEIN_STEP = 0.028;

/** The waitress crossing in front with a tray of foaming steins held out before her. */
export function waitress(ctx: Ctx, s: Scene): void {
  const wa = waitressAt(s.t, halfWidth(s));
  if (!wa.shown) return;
  const u = s.u;
  const g = s.groundY;
  const foot = g + WAITRESS_LINE * u;
  if (foot - WOMAN_H * u > s.cssH) return;
  const cx = centerX(s);
  const lw = inkW(s);
  const x = cx + wa.x * u;
  const stride = s.t * 8;
  const f = WAITRESS;
  const size = f.size;
  f.m = wa.m;
  f.lift = Math.abs(Math.sin(stride)) * 0.003;
  f.lean = 0.03;
  f.footL = -0.009 + Math.sin(stride) * 0.012;
  f.footR = 0.009 - Math.sin(stride) * 0.012;
  f.raiseL = Math.max(0, Math.cos(stride)) * 0.008;
  f.raiseR = Math.max(0, -Math.cos(stride)) * 0.008;
  // Both hands under the tray's near rim, the far one a little further out.
  f.handLx = TRAY_X - TRAY_HW * 0.55;
  f.handLy = -TRAY_UP + 0.004;
  f.handRx = TRAY_X - TRAY_HW * 0.2;
  f.handRy = -TRAY_UP + 0.006;
  f.flare = 0.15;
  f.mouth = 0;
  figure(ctx, u, lw, x, foot, f);
  // The tray, held level (it rides her step), and the steins on it, handles out the way she
  // goes: each stein's handle tucks behind the next one, and the leading one's shows whole.
  const ty = foot - (TRAY_UP * size + f.lift) * u;
  const tx = x + wa.m * TRAY_X * size * u;
  steins(ctx, tx + wa.m * STEIN_AT * size * u, wa.m * STEIN_STEP * size * u, 3, ty, STEIN_H * size * u, lw, wa.m);
  ctx.beginPath();
  pill(ctx, tx - TRAY_HW * size * u, ty - u * 0.002, TRAY_HW * 2 * size * u, u * 0.009);
  ctx.fillStyle = PEWTER.body;
  ctx.fill();
  ctx.fillStyle = PEWTER.light;
  ctx.fillRect(tx - TRAY_HW * size * u * 0.8, ty - u * 0.0005, TRAY_HW * 1.6 * size * u, u * 0.0022);
  ctx.beginPath();
  pill(ctx, tx - TRAY_HW * size * u, ty - u * 0.002, TRAY_HW * 2 * size * u, u * 0.009);
  ink(ctx, lw * 0.8, INK);
  // Her near hand on the tray's rim.
  ctx.beginPath();
  circle(ctx, x + wa.m * f.handRx * size * u, ty + u * 0.004, u * 0.0058);
  ctx.fillStyle = SKIN.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}
