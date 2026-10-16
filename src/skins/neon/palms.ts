import { alpha, circle, mix, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { PINK, SHADOW, SHADOW_MID, SKY_BOTTOM } from "./colors";
import { rimTube } from "./tube";

// Palm trees: near-black silhouettes backlit by the sunset, a thin neon rim down the side of the
// trunk that faces the sun and along the top of every frond. Each palm is planted on the grid
// at its depth and scaled by TOWER_DEPTH / z. The crown sways a little in the evening breeze.

export interface Palm {
  /** Base x (u from the screen center) and depth on the floor. */
  x: number;
  z: number;
  /** Trunk height (u at the tower's depth), crown offset sideways toward the center (u), bow. */
  h: number;
  lean: number;
  bow: number;
  /** Trunk width at the base (u). */
  w: number;
  /** Fronds as [angle, length (u), droop] for a palm on the left (0 = toward the center, -PI/2 = up). */
  fronds: readonly (readonly [number, number, number])[];
  phase: number;
}

/** Rim colors: the tall palms, and a softer one for the young palm. Both a step below the
 *  bars' neon so the tower stays the brightest thing on screen. */
export const RIM = mix(PINK, SKY_BOTTOM, 0.18);
export const SOFT_RIM = mix(PINK, SKY_BOTTOM, 0.4);

/** Faint trunk-ring color per rim color, built once. */
const RINGS = new Map<string, string>();

const TRUNK_STEPS = 9;
const FROND_STEPS = 8;
const MAX_FRONDS = 10;

// Scratch buffers, reused every frame (no per-frame allocation).
const LX = new Float64Array(TRUNK_STEPS + 1);
const LY = new Float64Array(TRUNK_STEPS + 1);
const RX = new Float64Array(TRUNK_STEPS + 1);
const RY = new Float64Array(TRUNK_STEPS + 1);
/** Frond spines: x, y per step, for every frond. */
const SPINE = new Float64Array(MAX_FRONDS * (FROND_STEPS + 1) * 2);

/** A point on the quadratic a → b → c at t. */
function quad(a: number, b: number, c: number, t: number): number {
  const m = 1 - t;
  return m * m * a + 2 * m * t * b + t * t * c;
}

function quadD(a: number, b: number, c: number, t: number): number {
  return 2 * (1 - t) * (b - a) + 2 * t * (c - b);
}

export function drawPalm(ctx: Ctx, s: Scene, p: Palm, rim: string): void {
  const u = s.u;
  const k = TOWER_DEPTH / p.z;
  const by = fieldY(s, p.z);
  if (by - (p.h + 0.2) * u * k > s.cssH) return;
  const side = p.x < 0 ? 1 : -1; // +1: the center (and the sun) is to the right
  const bx = s.cssW / 2 + p.x * u;
  const breeze = Math.sin(s.t * 0.9 + p.phase);
  const tx = bx + side * p.lean * u * k + breeze * u * 0.003 * k;
  const ty = by - p.h * u * k;
  const mx = bx + side * p.lean * u * k * p.bow;
  const my = by - p.h * u * k * 0.5;
  const w0 = p.w * u * k;

  // Trunk: a tapered tube along the curve, flared at the foot.
  for (let i = 0; i <= TRUNK_STEPS; i++) {
    const t = i / TRUNK_STEPS;
    const x = quad(bx, mx, tx, t);
    const y = quad(by, my, ty, t);
    const dx = quadD(bx, mx, tx, t);
    const dy = quadD(by, my, ty, t);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = (w0 / 2) * (1 - t * 0.45 + (t < 0.12 ? (0.12 - t) * 3 : 0));
    LX[i] = x - nx * half;
    LY[i] = y - ny * half;
    RX[i] = x + nx * half;
    RY[i] = y + ny * half;
  }
  ctx.beginPath();
  ctx.moveTo(LX[0]!, LY[0]!);
  for (let i = 1; i <= TRUNK_STEPS; i++) ctx.lineTo(LX[i]!, LY[i]!);
  for (let i = TRUNK_STEPS; i >= 0; i--) ctx.lineTo(RX[i]!, RY[i]!);
  ctx.closePath();
  ctx.fillStyle = SHADOW;
  ctx.fill();

  // Trunk rings, faint.
  ctx.beginPath();
  for (let i = 1; i < TRUNK_STEPS; i++) {
    ctx.moveTo(LX[i]!, LY[i]!);
    ctx.lineTo(RX[i]!, RY[i]!);
  }
  let ring = RINGS.get(rim);
  if (!ring) {
    ring = alpha(rim, 0.22);
    RINGS.set(rim, ring);
  }
  ctx.strokeStyle = ring;
  ctx.lineWidth = Math.max(0.8, u * 0.002 * k);
  ctx.stroke();

  // Fronds: an arched spine with a comb of leaflets, long ones hanging below and short ones
  // above, all swept toward the tip.
  const count = Math.min(MAX_FRONDS, p.fronds.length);
  ctx.beginPath();
  for (let fi = 0; fi < count; fi++) {
    const [a0, len0, droop] = p.fronds[fi]!;
    const a = a0 + Math.sin(s.t * 1.1 + p.phase + fi * 0.7) * 0.035;
    const dxa = Math.cos(a) * side;
    const dya = Math.sin(a);
    const L = len0 * u * k;
    const ex = tx + dxa * L;
    const ey = ty + dya * L + droop * L;
    const qx = tx + dxa * L * 0.6;
    const qy = ty + dya * L * 0.6 - L * (0.12 + droop * 0.1);
    const wide = L * 0.2;
    const base = fi * (FROND_STEPS + 1) * 2;
    for (let pass = 0; pass < 2; pass++) {
      // pass 0: upper side out to the tip; pass 1: lower side back to the crown.
      for (let j = 0; j <= FROND_STEPS; j++) {
        const i = pass === 0 ? j : FROND_STEPS - j;
        const t = i / FROND_STEPS;
        const x = quad(tx, qx, ex, t);
        const y = quad(ty, qy, ey, t);
        const ddx = quadD(tx, qx, ex, t);
        const ddy = quadD(ty, qy, ey, t);
        const l = Math.hypot(ddx, ddy) || 1;
        const txn = ddx / l;
        const tyn = ddy / l;
        // Normal toward screen-up.
        let nx = -tyn;
        let ny = txn;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const f = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.06)), 0.6);
        if (pass === 0) {
          if (j === 0) ctx.moveTo(x, y);
          else {
            const len = wide * 0.38 * f;
            ctx.lineTo(x + nx * len + txn * len * 0.9, y + ny * len + tyn * len * 0.9);
            ctx.lineTo(x + nx * wide * 0.05, y + ny * wide * 0.05);
          }
          SPINE[base + i * 2] = x + nx * wide * 0.04;
          SPINE[base + i * 2 + 1] = y + ny * wide * 0.04;
        } else {
          const len = wide * f;
          ctx.lineTo(x - nx * len + txn * len * 0.55, y - ny * len + tyn * len * 0.55 + len * 0.3);
          ctx.lineTo(x - nx * wide * 0.08, y - ny * wide * 0.08);
        }
      }
    }
    ctx.closePath();
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();

  // Coconuts under the crown.
  ctx.beginPath();
  const cr = u * 0.011 * k;
  circle(ctx, tx - cr * 0.9, ty + cr * 1.1, cr);
  circle(ctx, tx + cr * 0.9, ty + cr * 1.2, cr);
  circle(ctx, tx, ty + cr * 2, cr);
  ctx.fillStyle = SHADOW_MID;
  ctx.fill();

  // Neon rim light: down the sunward side of the trunk and along the top of each frond.
  const xs = side > 0 ? RX : LX;
  const ys = side > 0 ? RY : LY;
  ctx.beginPath();
  ctx.moveTo(xs[1]!, ys[1]!);
  for (let i = 2; i <= TRUNK_STEPS; i++) ctx.lineTo(xs[i]!, ys[i]!);
  for (let fi = 0; fi < count; fi++) {
    const base = fi * (FROND_STEPS + 1) * 2;
    ctx.moveTo(SPINE[base]!, SPINE[base + 1]!);
    for (let i = 1; i <= FROND_STEPS; i++) ctx.lineTo(SPINE[base + i * 2]!, SPINE[base + i * 2 + 1]!);
  }
  rimTube(ctx, rim, Math.max(0.9, u * 0.0022 * k));
}
