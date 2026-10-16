import { circle, ink, inkedLine, oval, roundRectPath, type Ctx } from "../../base/draw";
import {
  BRASS,
  CARRIAGE,
  CARRIAGE_LIGHT,
  COAT_NAVY,
  FRAME,
  HAT,
  HAT_LIGHT,
  HORSE,
  HORSE_SHADE,
  INK,
  IRON,
  LAMP,
  LAMP_CORE,
  MANE,
  RED,
  SCARF_GOLD,
  SKIN,
  SNOW,
  WHEEL,
} from "./colors";
import { glow, snowCap } from "./shapes";

// A horse-drawn carriage trotting along the street: a chestnut horse in a red collar hung
// with brass bells, pulling a blue coach with a lit window, a coach lamp and big yellow
// wheels, a coachman in a caped greatcoat and top hat up on the box. Drawn facing right in a
// frame with its origin on the ground under the middle of the rig, x right, y UP in depth
// units; the whole rig stays under 0.13 units tall so it never rises past the tower's base.

const Y = (v: number) => -v;

/** The rig is modelled at full size, then drawn at this scale so it stays low. */
const SCALE = 0.8;
const MODEL_LENGTH = 0.28;
/** Length of the rig, tail-board to nose, in units (for timing its crossing). */
export const RIG_LENGTH = MODEL_LENGTH * SCALE;

/** A spoked wheel at (x, y up), radius r, turned by `a` radians. */
function wheel(ctx: Ctx, x: number, y: number, r: number, a: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.moveTo(x + r * 0.78, Y(y));
  ctx.arc(x, Y(y), r * 0.78, 0, Math.PI * 2, true);
  ctx.fillStyle = WHEEL;
  ctx.fill("evenodd");
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const s = a + (i * Math.PI) / 3;
    ctx.moveTo(x + Math.cos(s) * r * 0.2, Y(y) + Math.sin(s) * r * 0.2);
    ctx.lineTo(x + Math.cos(s) * r * 0.8, Y(y) + Math.sin(s) * r * 0.8);
  }
  inkedLine(ctx, WHEEL, lw * 0.9, lw * 0.4, INK);
  ctx.beginPath();
  circle(ctx, x, Y(y), r * 0.22);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
}

/** A leg from the hip (x, y up) with knee swing `k` (-1..1), `len` long, ending in a hoof. */
function leg(ctx: Ctx, x: number, y: number, len: number, k: number, color: string, lw: number): void {
  const kx = x + k * len * 0.25;
  const ky = y - len * 0.5;
  const fx = x + k * len * 0.42;
  const fy = Math.max(0.006, y - len + Math.max(0, k) * len * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, Y(y));
  ctx.lineTo(kx, Y(ky));
  ctx.lineTo(fx, Y(fy));
  inkedLine(ctx, color, len * 0.17, lw * 0.6, INK);
  ctx.beginPath();
  oval(ctx, fx + 0.002, Y(fy - 0.002), 0.0062, 0.0042);
  ctx.fillStyle = HAT;
  ctx.fill();
}

/** The horse, its hindquarters at x = hx, trotting with gait phase `g`. */
function horse(ctx: Ctx, hx: number, g: number, lw: number, t: number): void {
  const bob = Math.abs(Math.sin(g)) * 0.003;
  const by = 0.066 + bob;
  const s = Math.sin(g);
  // Far legs (shaded), then the body, then near legs.
  leg(ctx, hx + 0.012, by - 0.01, 0.058, -s, HORSE_SHADE, lw);
  leg(ctx, hx + 0.066, by - 0.01, 0.058, s, HORSE_SHADE, lw);
  // Tail
  ctx.beginPath();
  ctx.moveTo(hx - 0.004, Y(by + 0.014));
  ctx.quadraticCurveTo(hx - 0.026, Y(by + 0.008 + Math.sin(t * 3) * 0.004), hx - 0.022, Y(by - 0.032));
  ctx.quadraticCurveTo(hx - 0.012, Y(by - 0.012), hx + 0.002, Y(by + 0.004));
  ctx.closePath();
  ctx.fillStyle = MANE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // Body, neck and head as one shape
  ctx.beginPath();
  ctx.moveTo(hx, Y(by + 0.012));
  ctx.quadraticCurveTo(hx + 0.004, Y(by + 0.03), hx + 0.03, Y(by + 0.026));
  ctx.lineTo(hx + 0.06, Y(by + 0.026));
  ctx.quadraticCurveTo(hx + 0.075, Y(by + 0.03), hx + 0.088, Y(by + 0.05));
  ctx.lineTo(hx + 0.1, Y(by + 0.058));
  ctx.quadraticCurveTo(hx + 0.106, Y(by + 0.06), hx + 0.112, Y(by + 0.05));
  ctx.lineTo(hx + 0.122, Y(by + 0.03));
  ctx.quadraticCurveTo(hx + 0.125, Y(by + 0.022), hx + 0.117, Y(by + 0.02));
  ctx.lineTo(hx + 0.104, Y(by + 0.026));
  ctx.quadraticCurveTo(hx + 0.092, Y(by + 0.018), hx + 0.082, Y(by - 0.004));
  ctx.quadraticCurveTo(hx + 0.07, Y(by - 0.018), hx + 0.05, Y(by - 0.016));
  ctx.lineTo(hx + 0.02, Y(by - 0.016));
  ctx.quadraticCurveTo(hx - 0.002, Y(by - 0.014), hx, Y(by + 0.012));
  ctx.closePath();
  ctx.fillStyle = HORSE;
  ctx.fill();
  // Belly shade
  ctx.save();
  ctx.clip();
  ctx.fillStyle = HORSE_SHADE;
  ctx.fillRect(hx - 0.01, Y(by - 0.004), 0.1, 0.02);
  ctx.restore();
  ink(ctx, lw, INK);
  // Mane along the neck, ear, blinker, eye, nostril
  ctx.beginPath();
  ctx.moveTo(hx + 0.07, Y(by + 0.03));
  ctx.quadraticCurveTo(hx + 0.084, Y(by + 0.05), hx + 0.1, Y(by + 0.062));
  ctx.lineTo(hx + 0.094, Y(by + 0.048));
  ctx.quadraticCurveTo(hx + 0.082, Y(by + 0.036), hx + 0.078, Y(by + 0.022));
  ctx.closePath();
  ctx.moveTo(hx + 0.098, Y(by + 0.058));
  ctx.lineTo(hx + 0.097, Y(by + 0.072));
  ctx.lineTo(hx + 0.105, Y(by + 0.059));
  ctx.closePath();
  ctx.fillStyle = MANE;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  roundRectPath(ctx, hx + 0.101, -(by + 0.05), 0.009, 0.008, 0.002);
  ctx.fillStyle = HAT;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx + 0.119, Y(by + 0.025), 0.0018);
  ctx.fillStyle = INK;
  ctx.fill();
  // Collar with brass bells, and the harness strap
  ctx.beginPath();
  ctx.moveTo(hx + 0.074, Y(by + 0.03));
  ctx.quadraticCurveTo(hx + 0.084, Y(by + 0.012), hx + 0.08, Y(by - 0.008));
  inkedLine(ctx, RED, 0.008, lw * 0.5, INK);
  ctx.beginPath();
  ctx.moveTo(hx + 0.02, Y(by + 0.006));
  ctx.lineTo(hx + 0.076, Y(by + 0.006));
  inkedLine(ctx, RED, 0.004, lw * 0.4, INK);
  const jingle = Math.sin(t * 16) * 0.0015;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) circle(ctx, hx + 0.079 + jingle, Y(by + 0.022 - i * 0.012), 0.0038);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  // Near legs
  leg(ctx, hx + 0.018, by - 0.008, 0.06, s, HORSE, lw);
  leg(ctx, hx + 0.072, by - 0.008, 0.06, -s, HORSE, lw);
  // Snow on its back
  ctx.beginPath();
  snowCap(ctx, hx + 0.012, hx + 0.05, Y(by + 0.027), 0.005);
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** The coach, the box seat and the coachman, its rear at x = cx. */
function coach(ctx: Ctx, cx: number, a: number, lw: number, t: number, bob: number): void {
  // Wheels behind the body (far side), shafts to the horse
  ctx.beginPath();
  ctx.moveTo(cx + 0.11, Y(0.052 + bob));
  ctx.lineTo(cx + 0.175, Y(0.07 + bob));
  inkedLine(ctx, IRON, 0.004, lw * 0.4, INK);
  wheel(ctx, cx + 0.03, 0.033, 0.033, a, lw);
  // Body: a rounded box on springs, with a lit window and a gold-trimmed door.
  const b = 0.034 + bob;
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.004, -(b + 0.07), 0.108, 0.07, 0.012);
  ctx.fillStyle = CARRIAGE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CARRIAGE_LIGHT;
  ctx.fillRect(cx, Y(b + 0.07), 0.12, 0.012);
  ctx.restore();
  ink(ctx, lw, INK);
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.03, -(b + 0.06), 0.044, 0.03, 0.006);
  ctx.fillStyle = LAMP;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(cx + 0.052, Y(b + 0.06));
  ctx.lineTo(cx + 0.052, Y(b + 0.03));
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.026, -(b + 0.064), 0.052, 0.058, 0.008);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  // Box seat in front, and the coachman on it
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.104, -(b + 0.05), 0.03, 0.022, 0.004);
  ctx.fillStyle = CARRIAGE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  const sy = b + 0.05;
  // Caped greatcoat
  ctx.beginPath();
  ctx.moveTo(cx + 0.104, Y(sy - 0.004));
  ctx.lineTo(cx + 0.106, Y(sy + 0.024));
  ctx.quadraticCurveTo(cx + 0.118, Y(sy + 0.034), cx + 0.13, Y(sy + 0.024));
  ctx.lineTo(cx + 0.134, Y(sy - 0.004));
  ctx.closePath();
  ctx.fillStyle = COAT_NAVY;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.beginPath();
  ctx.moveTo(cx + 0.104, Y(sy + 0.012));
  ctx.quadraticCurveTo(cx + 0.118, Y(sy + 0.036), cx + 0.134, Y(sy + 0.012));
  ctx.quadraticCurveTo(cx + 0.118, Y(sy + 0.018), cx + 0.104, Y(sy + 0.012));
  ctx.closePath();
  ctx.fillStyle = HAT_LIGHT;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Head, scarf, top hat
  const hy = sy + 0.042;
  ctx.beginPath();
  circle(ctx, cx + 0.12, Y(hy), 0.011);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  circle(ctx, cx + 0.125, Y(hy + 0.002), 0.0016);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.108, -(hy - 0.006), 0.024, 0.007, 0.003);
  ctx.fillStyle = SCARF_GOLD;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.111, -(hy + 0.032), 0.019, 0.024, 0.002);
  ctx.fillStyle = HAT;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.beginPath();
  oval(ctx, cx + 0.1205, Y(hy + 0.009), 0.0145, 0.003);
  ctx.fillStyle = HAT_LIGHT;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  ctx.beginPath();
  snowCap(ctx, cx + 0.11, cx + 0.131, Y(hy + 0.032), 0.004);
  ctx.fillStyle = SNOW;
  ctx.fill();
  // Reins and whip
  ctx.beginPath();
  ctx.moveTo(cx + 0.13, Y(sy + 0.01));
  ctx.quadraticCurveTo(cx + 0.18, Y(sy - 0.012), cx + 0.222, Y(0.12 + bob));
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 0.128, Y(sy + 0.006));
  ctx.lineTo(cx + 0.15, Y(sy + 0.05));
  ctx.quadraticCurveTo(cx + 0.17, Y(sy + 0.06 + Math.sin(t * 4) * 0.004), cx + 0.19, Y(sy + 0.046));
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  // Snow on the roof, the coach lamp glowing at the front corner
  ctx.beginPath();
  snowCap(ctx, cx + 0.002, cx + 0.098, Y(b + 0.07), 0.01);
  ctx.fillStyle = SNOW;
  ctx.fill();
  const lx = cx + 0.104;
  const ly = b + 0.034;
  glow(ctx, lx, Y(ly), 0.05, 0.9);
  ctx.beginPath();
  roundRectPath(ctx, lx - 0.006, -(ly + 0.009), 0.012, 0.016, 0.003);
  ctx.fillStyle = LAMP_CORE;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  // Near wheels
  wheel(ctx, cx + 0.03, 0.033, 0.033, a + 0.3, lw);
  wheel(ctx, cx + 0.098, 0.027, 0.027, a * 1.22, lw);
}

/**
 * The rig with the middle of its ground line at screen (x, y), U px per unit, having travelled
 * `dist` units (for the wheels and the trot).
 */
export function carriage(ctx: Ctx, x: number, y: number, U: number, lwPx: number, dist: number, t: number): void {
  const lw = lwPx / (U * SCALE);
  const g = dist * 55;
  const bob = Math.abs(Math.sin(g)) * 0.0018;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(U * SCALE, U * SCALE);
  ctx.translate(-MODEL_LENGTH / 2, 0);
  // Soft shadow on the snow
  ctx.beginPath();
  oval(ctx, MODEL_LENGTH * 0.5, 0, MODEL_LENGTH * 0.52, 0.008);
  ctx.fillStyle = "rgba(90, 96, 160, 0.18)";
  ctx.fill();
  coach(ctx, 0, dist / (0.033 * SCALE), lw, t, bob);
  horse(ctx, 0.155, g, lw, t);
  ctx.restore();
}
