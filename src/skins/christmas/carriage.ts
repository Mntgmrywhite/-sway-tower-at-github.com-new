import { circle, oval, roundRectPath, type Ctx } from "../../base/draw";
import {
  BRASS,
  CARRIAGE,
  CARRIAGE_LIGHT,
  COAT_NAVY,
  COAT_RED,
  CREAM,
  HORSE,
  HORSE_SHADE,
  IRON,
  LAMP,
  LAMP_CORE,
  MANE,
  NAVY,
  SKIN,
  SNOW,
  TEAL,
  WHEEL,
} from "./colors";
import { glow, snowCap } from "./shapes";

// A horse-drawn carriage loping round the street, cut from flat paper like the rest of the card
// (flat shapes, no outlines): a chestnut horse in a cranberry collar hung with brass bells,
// pulling a deep teal coach with a lit window, a coach lamp and big mustard wheels, a coachman
// in a caped greatcoat and top hat up on the box, the reins running from his hands
// down to the horse's bit and one whip held up over the horse (carriage.test.ts). Modelled
// facing right in a frame with its origin on the ground under the middle of the rig, x right,
// y UP in depth units (mirrored to face left); the whole rig stays under 0.13 units tall, so in
// front it never rises past the tower's floor line, and further back never past the base
// block's top.

const Y = (v: number) => -v;

/** The rig is modelled at full size, then drawn at this scale so it stays low. */
export const SCALE = 0.8;
/** Length of the model, tail-board to nose, before SCALE; its origin is MODEL_LENGTH / 2 behind the rig's middle. */
export const MODEL_LENGTH = 0.28;
/** Length of the rig, tail-board to nose, in units (for timing its crossing). */
export const RIG_LENGTH = MODEL_LENGTH * SCALE;
/** Gait phase per unit travelled: a stride every 0.11 units, about half the rig's length. */
const STRIDE = 55;

/** A spoked wheel at (x, y up), radius r, turned by `a` radians. */
function wheel(ctx: Ctx, x: number, y: number, r: number, a: number, lw: number): void {
  ctx.beginPath();
  circle(ctx, x, Y(y), r);
  ctx.moveTo(x + r * 0.78, Y(y));
  ctx.arc(x, Y(y), r * 0.78, 0, Math.PI * 2, true);
  ctx.fillStyle = WHEEL;
  ctx.fill("evenodd");
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const s = a + (i * Math.PI) / 3;
    ctx.moveTo(x + Math.cos(s) * r * 0.2, Y(y) + Math.sin(s) * r * 0.2);
    ctx.lineTo(x + Math.cos(s) * r * 0.8, Y(y) + Math.sin(s) * r * 0.8);
  }
  ctx.strokeStyle = WHEEL;
  ctx.lineWidth = lw * 1.2;
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x, Y(y), r * 0.24);
  ctx.fillStyle = NAVY;
  ctx.fill();
}

/**
 * A leg from the hip (x, y up), `len` long, ending in a hoof: swung `k` (-1 back .. 1 forward),
 * the hoof lifted by `up` (0..1) as it swings through, the knee bending.
 */
function leg(ctx: Ctx, x: number, y: number, len: number, k: number, up: number, color: string): void {
  const kx = x + k * len * 0.25 + up * len * 0.1;
  const ky = y - len * 0.5;
  const fx = x + k * len * 0.42;
  const fy = Math.max(0.006, y - len + up * len * 0.22);
  ctx.beginPath();
  ctx.moveTo(x, Y(y));
  ctx.lineTo(kx, Y(ky));
  ctx.lineTo(fx, Y(fy));
  ctx.strokeStyle = color;
  ctx.lineWidth = len * 0.19;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  oval(ctx, fx + 0.002, Y(fy - 0.002), 0.0064, 0.0044);
  ctx.fillStyle = NAVY;
  ctx.fill();
}

/**
 * When in its stride each leg swings forward (fraction of a stride), for a lope: the hind
 * legs land close together, then the forelegs, the near leg of each pair leading, and the
 * horse rocks over them like a rocking horse.
 */
const LOPE = { farHind: 0, nearHind: 0.14, farFore: 0.42, nearFore: 0.56 } as const;
const TAU = Math.PI * 2;
/** How far the body rocks, radians either way, and its pivot behind the withers. */
const ROCK = 0.06;
const ROCK_X = 0.045;

/**
 * Where the reins run (x, y up), refilled every frame (no allocations): from the coachman's
 * hands, forward over the horse's back to the top of its collar, and on to the bit at the
 * corner of its mouth.
 */
const REINS = { hand: { x: 0, y: 0 }, collar: { x: 0, y: 0 }, bit: { x: 0, y: 0 } };
/** How far the reins sag between his hands and the collar, at the control point (units). */
const REINS_SAG = 0.008;

/** Sets `p` to the horse's body point (x, y up) as drawn, rocked `rock` radians about (px, py). */
function rocked(p: { x: number; y: number }, x: number, y: number, px: number, py: number, rock: number): void {
  const c = Math.cos(rock);
  const sn = Math.sin(rock);
  const dx = x - px;
  const dy = y - py;
  p.x = px + dx * c - dy * sn;
  p.y = py + dx * sn + dy * c;
}

/** The horse, its hindquarters at x = hx, loping with gait phase `g` (one stride per 2π). */
function horse(ctx: Ctx, hx: number, g: number, t: number): void {
  // One lift per stride as it gathers its hind legs under it, the front rising as the forelegs reach.
  const bob = (0.5 + 0.5 * Math.sin(g - TAU * 0.3)) * 0.004;
  const by = 0.066 + bob;
  const rock = Math.sin(g - TAU * LOPE.farFore) * ROCK;
  const tilt = Math.sin(rock);
  const px = hx + ROCK_X;
  /** Height of the hip or shoulder at x, as the body rocks about px. */
  const hip = (x: number, y: number) => y + (x - px) * tilt;
  /** A leg's swing at its phase: forward and back, the hoof off the ground on the way forward. */
  const step = (x: number, y: number, len: number, phase: number, color: string) => {
    const a = g - TAU * phase;
    leg(ctx, x, hip(x, y), len, Math.sin(a), Math.max(0, Math.cos(a)), color);
  };
  // Far legs (shaded), then the body, then near legs.
  step(hx + 0.012, by - 0.01, 0.058, LOPE.farHind, HORSE_SHADE);
  step(hx + 0.066, by - 0.01, 0.058, LOPE.farFore, HORSE_SHADE);
  ctx.save();
  ctx.translate(px, Y(by));
  ctx.rotate(-rock);
  ctx.translate(-px, -Y(by));
  // Tail
  ctx.beginPath();
  ctx.moveTo(hx - 0.004, Y(by + 0.014));
  ctx.quadraticCurveTo(hx - 0.026, Y(by + 0.008 + Math.sin(t * 3) * 0.004), hx - 0.022, Y(by - 0.032));
  ctx.quadraticCurveTo(hx - 0.012, Y(by - 0.012), hx + 0.002, Y(by + 0.004));
  ctx.closePath();
  ctx.fillStyle = MANE;
  ctx.fill();
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
  ctx.beginPath();
  roundRectPath(ctx, hx + 0.101, -(by + 0.05), 0.009, 0.008, 0.002);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, hx + 0.119, Y(by + 0.025), 0.0018);
  ctx.fillStyle = NAVY;
  ctx.fill();
  // Collar with brass bells, and the harness strap
  ctx.beginPath();
  ctx.moveTo(hx + 0.074, Y(by + 0.03));
  ctx.quadraticCurveTo(hx + 0.084, Y(by + 0.012), hx + 0.08, Y(by - 0.008));
  ctx.strokeStyle = COAT_RED;
  ctx.lineWidth = 0.009;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + 0.02, Y(by + 0.006));
  ctx.lineTo(hx + 0.076, Y(by + 0.006));
  ctx.lineWidth = 0.0045;
  ctx.stroke();
  const jingle = Math.sin(t * 16) * 0.0015;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) circle(ctx, hx + 0.079 + jingle, Y(by + 0.022 - i * 0.012), 0.0038);
  ctx.fillStyle = BRASS;
  ctx.fill();
  // Snow on its back
  ctx.beginPath();
  snowCap(ctx, hx + 0.012, hx + 0.05, Y(by + 0.027), 0.005);
  ctx.fillStyle = SNOW;
  ctx.fill();
  ctx.restore();
  // Where the reins meet it, rocking with it: the top of the collar, and the bit.
  rocked(REINS.collar, hx + 0.075, by + 0.03, px, by, rock);
  rocked(REINS.bit, hx + 0.113, by + 0.023, px, by, rock);
  // Near legs
  step(hx + 0.018, by - 0.008, 0.06, LOPE.nearHind, HORSE);
  step(hx + 0.072, by - 0.008, 0.06, LOPE.nearFore, HORSE);
}

/** The coach, the box seat and the coachman, its rear at x = cx. */
function coach(ctx: Ctx, cx: number, a: number, lw: number, t: number, bob: number): void {
  // The shafts to the horse, behind the body (the far wheels hide behind the near ones).
  ctx.beginPath();
  ctx.moveTo(cx + 0.11, Y(0.052 + bob));
  ctx.lineTo(cx + 0.175, Y(0.07 + bob));
  ctx.strokeStyle = IRON;
  ctx.lineWidth = 0.005;
  ctx.lineCap = "round";
  ctx.stroke();
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
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.03, -(b + 0.06), 0.044, 0.03, 0.006);
  ctx.fillStyle = LAMP;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 0.052, Y(b + 0.06));
  ctx.lineTo(cx + 0.052, Y(b + 0.03));
  ctx.strokeStyle = CREAM;
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
  ctx.beginPath();
  ctx.moveTo(cx + 0.104, Y(sy + 0.012));
  ctx.quadraticCurveTo(cx + 0.118, Y(sy + 0.036), cx + 0.134, Y(sy + 0.012));
  ctx.quadraticCurveTo(cx + 0.118, Y(sy + 0.018), cx + 0.104, Y(sy + 0.012));
  ctx.closePath();
  ctx.fillStyle = TEAL;
  ctx.fill();
  // Head, scarf, top hat
  const hy = sy + 0.042;
  ctx.beginPath();
  circle(ctx, cx + 0.12, Y(hy), 0.011);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, cx + 0.125, Y(hy + 0.002), 0.0016);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, cx + 0.108, -(hy - 0.006), 0.024, 0.007, 0.003);
  ctx.fillStyle = BRASS;
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx + 0.111, Y(hy + 0.032), 0.019, 0.024);
  ctx.rect(cx + 0.106, Y(hy + 0.011), 0.029, 0.004);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.beginPath();
  snowCap(ctx, cx + 0.11, cx + 0.131, Y(hy + 0.032), 0.004);
  ctx.fillStyle = SNOW;
  ctx.fill();
  // His hands, holding the reins (drawn over the horse, in reins()), and the one whip.
  REINS.hand.x = cx + 0.13;
  REINS.hand.y = sy + 0.01;
  ctx.beginPath();
  ctx.moveTo(cx + 0.128, Y(sy + 0.006));
  ctx.lineTo(cx + 0.15, Y(sy + 0.05));
  ctx.quadraticCurveTo(cx + 0.17, Y(sy + 0.06 + Math.sin(t * 4) * 0.004), cx + 0.19, Y(sy + 0.046));
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = "round";
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
  // Near wheels
  wheel(ctx, cx + 0.03, 0.033, 0.033, a, lw);
  wheel(ctx, cx + 0.098, 0.027, 0.027, a * 1.22, lw);
}

/**
 * The reins, over the horse: one thin leather strap from the coachman's hands, sagging a little
 * over the horse's back to the top of its collar, then down the neck to the bit. They run down
 * to the horse, never up, so they never read as a second whip; a strap no wider than the whip,
 * so they never read as a pole.
 */
function reins(ctx: Ctx, lw: number): void {
  const { hand, collar, bit } = REINS;
  ctx.beginPath();
  ctx.moveTo(hand.x, Y(hand.y));
  ctx.quadraticCurveTo((hand.x + collar.x) / 2, Y(Math.min(hand.y, collar.y) - REINS_SAG), collar.x, Y(collar.y));
  ctx.lineTo(bit.x, Y(bit.y));
  ctx.strokeStyle = MANE;
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/**
 * The rig with the middle of its ground line at screen (x, y), U px per unit, having travelled
 * `dist` units (for the wheels and the lope), facing right (dir 1) or left (-1).
 */
export function carriage(ctx: Ctx, x: number, y: number, U: number, lwPx: number, dist: number, t: number, dir = 1): void {
  const lw = lwPx / (U * SCALE);
  const g = dist * STRIDE;
  const bob = Math.abs(Math.sin(g)) * 0.0018;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(U * SCALE * dir, U * SCALE);
  ctx.translate(-MODEL_LENGTH / 2, 0);
  // Soft shadow on the snow
  ctx.beginPath();
  oval(ctx, MODEL_LENGTH * 0.5, 0, MODEL_LENGTH * 0.52, 0.008);
  ctx.fillStyle = "rgba(47, 128, 130, 0.18)";
  ctx.fill();
  coach(ctx, 0, dist / (0.033 * SCALE), lw, t, bob);
  horse(ctx, 0.155, g, t);
  reins(ctx, lw);
  ctx.restore();
}
