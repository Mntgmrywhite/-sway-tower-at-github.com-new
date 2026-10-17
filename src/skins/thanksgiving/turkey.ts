import { emerge, type Ctx } from "../../base/draw";
import { INK, tone } from "./colors";
import { C, cel, flat, L, len, line, M, O, pen, Q, S } from "./pen";

// A friendly farmyard turkey, our own cartoon design: a round bronze body with a lighter
// breast, a barred wing, a big banded tail fan, a pale blue head with a red snood and wattle,
// a bright eye, orange legs. It pecks at the lawn now and then and puffs its fan.
// Turkey units: about 1 tall, facing right, origin between its feet.

const BODY = tone("#8b5a34", 0.3, 0.26);
const BREAST = "#a8703e";
const WING = tone("#6c4227", 0.25, 0.22);
/** Feather bars across the wing: a warm copper, soft enough not to read as bones. */
const BAR = "#c9874e";
const FAN_TIP = "#f4e0b4";
const FAN_BAND = "#c4592e";
const FAN_BRONZE = "#91582f";
const FAN_INNER = "#6a3f24";
const HEAD = tone("#c5d5ef", 0.3, 0.2);
const RED = "#e2443a";
const BEAK = "#ffb43a";
const LEG = "#f09a3a";

const FAN_X = -0.2;
const FAN_Y = -0.5;
const FEATHERS = 7;
/** Fan layers: radius, color (outermost first). */
const FAN = [
  [0.54, FAN_TIP],
  [0.47, FAN_BAND],
  [0.37, FAN_BRONZE],
  [0.2, FAN_INNER],
] as const;

const LEGS = [-0.06, 0.09] as const;
const BARS = [0.3, 0.55, 0.8] as const;

const NECK_X = 0.15;
const NECK_Y = -0.55;
const HEAD_UP_X = 0.27;
const HEAD_UP_Y = -0.85;
const HEAD_DOWN_X = 0.44;
const HEAD_DOWN_Y = -0.14;

/** One scalloped fan layer of radius r, as its own subpath, spread `sp` (1 = full). */
function fanLayer(ctx: Ctx, r: number, sp: number, tilt: number): void {
  const a0 = -Math.PI / 2 - 1.75 * sp + tilt;
  const a1 = -Math.PI / 2 + 1.55 * sp + tilt;
  M(ctx, FAN_X + Math.cos(a0) * r * 0.5, FAN_Y + Math.sin(a0) * r * 0.5);
  L(ctx, FAN_X + Math.cos(a0) * r, FAN_Y + Math.sin(a0) * r);
  for (let i = 0; i < FEATHERS; i++) {
    const am = a0 + ((a1 - a0) * (i + 0.5)) / FEATHERS;
    const ae = a0 + ((a1 - a0) * (i + 1)) / FEATHERS;
    Q(ctx, FAN_X + Math.cos(am) * r * 1.13, FAN_Y + Math.sin(am) * r * 1.13, FAN_X + Math.cos(ae) * r, FAN_Y + Math.sin(ae) * r);
  }
  S(ctx, FAN_X + Math.cos(a1) * r * 0.5, FAN_Y + Math.sin(a1) * r * 0.5);
  Q(ctx, FAN_X + 0.08, FAN_Y + 0.25, FAN_X + Math.cos(a0) * r * 0.5, FAN_Y + Math.sin(a0) * r * 0.5);
  ctx.closePath();
}

/**
 * Peck: how far the head is down toward the lawn at time t (0 up .. 1 at the lawn). It dips,
 * pecks a few times and comes back up every 3.6 + 0.7 phase seconds, staggered by `phase`; each
 * turkey's first peck comes in the first few seconds of a scene.
 */
export function peckAt(t: number, phase: number): number {
  return emerge(t, 3.6 + phase * 0.7, phase * 2.3) * (Math.sin(t * 11 + phase) * 0.15 + 0.85);
}

/** Strut: how far the fan is puffed out at time t (0..1), a slow swell staggered by `phase`. */
export function strutAt(t: number, phase: number): number {
  return 0.5 + 0.5 * Math.sin(t * 0.7 + phase * 4);
}

/**
 * Turkey standing at (x, y), 1 turkey unit = `scale` px, facing `dir` (1 right, -1 left).
 * `phase` staggers its pecking and fan-puffing against the other turkeys.
 */
export function turkey(ctx: Ctx, t: number, x: number, y: number, scale: number, dir: number, lw: number, phase: number): void {
  const thin = Math.max(1, lw * 0.75);
  // Peck: the head dips to the lawn and back now and then. Strut: the fan opens wider.
  const peck = peckAt(t, phase);
  const strut = strutAt(t, phase);
  const bob = Math.sin(t * 2.2 + phase) * 0.012 * (1 - peck);
  pen(x, y, scale, 50 + Math.round(phase * 10), dir);

  // Legs and three-toed feet
  ctx.beginPath();
  for (const lx of LEGS) {
    M(ctx, lx, -0.28);
    L(ctx, lx - 0.01, 0);
    M(ctx, lx - 0.08, 0.01);
    S(ctx, lx - 0.01, 0);
    S(ctx, lx + 0.07, 0.01);
    M(ctx, lx - 0.01, 0);
    S(ctx, lx - 0.005, 0.02);
  }
  line(ctx, INK, len(0.045) + lw * 2);
  line(ctx, LEG, len(0.045));

  // Tail fan: banded layers, feather lines across the bands
  const sp = 0.9 + 0.1 * strut;
  const tilt = -0.12 + 0.06 * strut;
  for (const [r, c] of FAN) {
    ctx.beginPath();
    fanLayer(ctx, r, sp, tilt);
    flat(ctx, c, thin);
  }
  ctx.beginPath();
  const a0 = -Math.PI / 2 - 1.75 * sp + tilt;
  const a1 = -Math.PI / 2 + 1.55 * sp + tilt;
  for (let i = 1; i < FEATHERS; i++) {
    const a = a0 + ((a1 - a0) * i) / FEATHERS;
    M(ctx, FAN_X + Math.cos(a) * 0.22, FAN_Y + Math.sin(a) * 0.22);
    S(ctx, FAN_X + Math.cos(a) * 0.47, FAN_Y + Math.sin(a) * 0.47);
  }
  line(ctx, INK, thin * 0.8);

  // Body with a lighter breast, and the barred wing
  ctx.beginPath();
  O(ctx, 0, -0.42 + bob, 0.28, 0.24);
  cel(ctx, BODY, -0.66, -0.18, lw, 0.18, 0.28);
  ctx.beginPath();
  O(ctx, 0.13, -0.46 + bob, 0.12, 0.15, 0.2);
  ctx.fillStyle = BREAST;
  ctx.fill();
  ctx.beginPath();
  M(ctx, -0.17, -0.5 + bob);
  Q(ctx, 0.01, -0.62 + bob, 0.11, -0.45 + bob);
  Q(ctx, 0.04, -0.3 + bob, -0.2, -0.33 + bob);
  Q(ctx, -0.26, -0.42 + bob, -0.17, -0.5 + bob);
  ctx.closePath();
  cel(ctx, WING, -0.6, -0.3, thin, 0.18, 0.25);
  ctx.beginPath();
  for (const k of BARS) {
    const bx = -0.2 + k * 0.28;
    M(ctx, bx - 0.02, -0.53 + bob + k * 0.04);
    Q(ctx, bx + 0.035, -0.44 + bob, bx - 0.03, -0.34 + bob);
  }
  line(ctx, BAR, thin);

  // Neck and head, dipping toward the lawn when it pecks
  const hx = HEAD_UP_X + (HEAD_DOWN_X - HEAD_UP_X) * peck;
  const hy = HEAD_UP_Y + (HEAD_DOWN_Y - HEAD_UP_Y) * peck + bob;
  ctx.beginPath();
  M(ctx, NECK_X, NECK_Y + bob);
  Q(ctx, NECK_X + 0.14 + 0.1 * peck, NECK_Y - 0.12 + 0.2 * peck + bob, hx - 0.01, hy + 0.04);
  line(ctx, INK, len(0.11) + lw * 2);
  line(ctx, HEAD.base, len(0.11));

  // Wattle under the chin and the snood over the beak (behind the head)
  ctx.beginPath();
  O(ctx, hx + 0.03, hy + 0.085, 0.035, 0.06, -0.2);
  flat(ctx, RED, thin);
  ctx.beginPath();
  C(ctx, hx, hy, 0.078);
  cel(ctx, HEAD, hy - 0.078, hy + 0.078, lw, 0.25, 0.25);
  ctx.beginPath();
  M(ctx, hx + 0.06, hy - 0.016);
  S(ctx, hx + 0.15, hy + 0.012);
  S(ctx, hx + 0.06, hy + 0.034);
  ctx.closePath();
  flat(ctx, BEAK, thin);
  ctx.beginPath();
  M(ctx, hx + 0.035, hy - 0.06);
  Q(ctx, hx + 0.12, hy - 0.05, hx + 0.12, hy + 0.08);
  Q(ctx, hx + 0.08, hy + 0.06, hx + 0.06, hy - 0.02);
  ctx.closePath();
  flat(ctx, RED, thin);

  // A bright friendly eye
  ctx.beginPath();
  C(ctx, hx + 0.004, hy - 0.018, 0.032);
  flat(ctx, "#ffffff", thin * 0.8);
  ctx.beginPath();
  C(ctx, hx + 0.012, hy - 0.016, 0.018);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  C(ctx, hx + 0.017, hy - 0.024, 0.006);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}
