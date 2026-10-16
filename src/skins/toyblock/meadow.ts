import { circle, ink, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLUE, INK, ORANGE, RED, TEAL, WOOD, YELLOW } from "./colors";
import { centerX, inkW } from "./fort";
import { block } from "./shapes";

// More toys on the meadow around the fort, inked like everything up close: in front of it on
// the left two of the fort's guard standing to attention, the drummer beating time; further
// back, beyond the lollipop tree, a wooden rocking horse (dappled cream, red saddle, a brown yarn
// mane) rocking gently on its runner, and beyond the ring tree a striped spinning top that spins
// and wobbles. The far ones are smaller and drawn with a lighter ink. None rises into the
// slider's first lane or stands in the tower's column.
//
// Positions are in u from the base block's center line, heights in u from the floor line.

const CREAM = "#fff3dc";
const CREAM_SHADE = "#e8d3b8";
const MANE = "#8a5a3c";
const SKIN = "#f6cfa8";
const HAT = "#2b2142";
const SHADOW = "rgba(40, 70, 30, 0.2)";

// ---------------------------------------------------------------- the rocking horse

/** Where the rocking horse stands: x (u from the center line), its runner's lowest point above the floor line, and its size. */
const HORSE_X = -0.43;
const HORSE_FEET = 0.124;
const HORSE_K = 0.62;
/** The runner's radius and half-sweep (rad). */
const RUNNER_R = 0.17;
const RUNNER_A = 0.34;

/** A wooden rocking horse facing the tower, rocking slowly on its curved runner (drawn at HORSE_K size). */
export function rockingHorse(ctx: Ctx, s: Scene): void {
  const x = centerX(s) + HORSE_X * s.u;
  const feet = s.groundY - HORSE_FEET * s.u;
  if (feet - s.u * 0.1 > s.cssH) return;
  const lw = inkW(s) * 0.75;
  const u = s.u * HORSE_K;
  const rock = Math.sin(s.t * 1.5) * 0.07;
  // A soft shadow on the meadow under the runner.
  ctx.beginPath();
  oval(ctx, x, feet + u * 0.002, u * 0.05, u * 0.009);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.save();
  ctx.translate(x, feet);
  ctx.rotate(rock);
  // Everything below is drawn around (0, 0), the runner's lowest point.
  const R = RUNNER_R * u;
  const runner = (inset: number): void => {
    ctx.beginPath();
    ctx.arc(0, -R, R + inset, Math.PI / 2 - RUNNER_A, Math.PI / 2 + RUNNER_A);
  };
  // Legs: back pair and front pair, splayed, from the runner up to the body.
  ctx.beginPath();
  for (const [x0, x1] of [
    [-0.044, -0.026],
    [0.044, 0.026],
  ] as const) {
    ctx.moveTo(x0 * u, -0.012 * u);
    ctx.lineTo(x1 * u, -0.05 * u);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.011 + lw * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = WOOD.shade;
  ctx.lineWidth = u * 0.011;
  ctx.stroke();
  // The runner: a thick curved plank, lit along its top.
  runner(0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.012 + lw * 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = WOOD.body;
  ctx.lineWidth = u * 0.012;
  ctx.stroke();
  runner(u * 0.003);
  ctx.strokeStyle = WOOD.light;
  ctx.lineWidth = u * 0.003;
  ctx.stroke();
  // Tail: a brown tuft off the back.
  ctx.beginPath();
  ctx.moveTo(-0.04 * u, -0.066 * u);
  ctx.quadraticCurveTo(-0.068 * u, -0.07 * u, -0.066 * u, -0.036 * u);
  ctx.quadraticCurveTo(-0.054 * u, -0.054 * u, -0.036 * u, -0.056 * u);
  ctx.closePath();
  ctx.fillStyle = MANE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // Body, neck and head as one shape: a plump barrel rising into a neck, the head nodding forward.
  const horse = (): void => {
    ctx.beginPath();
    ctx.moveTo(-0.042 * u, -0.06 * u);
    ctx.quadraticCurveTo(-0.044 * u, -0.08 * u, -0.02 * u, -0.08 * u);
    ctx.lineTo(0.018 * u, -0.08 * u);
    ctx.quadraticCurveTo(0.03 * u, -0.098 * u, 0.034 * u, -0.112 * u);
    ctx.quadraticCurveTo(0.042 * u, -0.128 * u, 0.056 * u, -0.122 * u);
    ctx.lineTo(0.074 * u, -0.104 * u);
    ctx.quadraticCurveTo(0.08 * u, -0.094 * u, 0.07 * u, -0.09 * u);
    ctx.lineTo(0.054 * u, -0.096 * u);
    ctx.quadraticCurveTo(0.05 * u, -0.07 * u, 0.04 * u, -0.054 * u);
    ctx.quadraticCurveTo(0, -0.044 * u, -0.036 * u, -0.048 * u);
    ctx.quadraticCurveTo(-0.044 * u, -0.05 * u, -0.042 * u, -0.06 * u);
    ctx.closePath();
  };
  horse();
  ctx.fillStyle = CREAM_SHADE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(-0.05 * u, -0.13 * u, 0.14 * u, 0.064 * u);
  // Dapples.
  ctx.fillStyle = CREAM_SHADE;
  ctx.beginPath();
  circle(ctx, -0.026 * u, -0.066 * u, u * 0.005);
  circle(ctx, -0.014 * u, -0.058 * u, u * 0.004);
  circle(ctx, 0.022 * u, -0.064 * u, u * 0.0045);
  ctx.fill();
  ctx.restore();
  horse();
  ink(ctx, lw, INK);
  // Mane: brown yarn curls down the neck, a forelock between the ears.
  ctx.beginPath();
  circle(ctx, 0.024 * u, -0.09 * u, u * 0.007);
  circle(ctx, 0.031 * u, -0.104 * u, u * 0.007);
  circle(ctx, 0.04 * u, -0.117 * u, u * 0.0065);
  ctx.fillStyle = MANE;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  // Ear, eye and nostril.
  ctx.beginPath();
  ctx.moveTo(0.047 * u, -0.122 * u);
  ctx.lineTo(0.05 * u, -0.136 * u);
  ctx.lineTo(0.057 * u, -0.123 * u);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = INK;
  ctx.beginPath();
  circle(ctx, 0.056 * u, -0.112 * u, u * 0.003);
  circle(ctx, 0.072 * u, -0.097 * u, u * 0.0018);
  ctx.fill();
  // Saddle and its yellow trim, and a red bridle.
  ctx.beginPath();
  block(ctx, -0.024 * u, -0.086 * u, 0.034 * u, 0.016 * u, u * 0.006);
  ctx.fillStyle = RED.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  ctx.fillStyle = YELLOW.body;
  ctx.fillRect(-0.02 * u, -0.076 * u, 0.026 * u, u * 0.003);
  ctx.beginPath();
  ctx.moveTo(0.06 * u, -0.118 * u);
  ctx.lineTo(0.068 * u, -0.098 * u);
  ctx.strokeStyle = RED.body;
  ctx.lineWidth = Math.max(1.2, u * 0.003);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the guard

/** The guard: each soldier's x (u from the center line), and where their feet stand (u below the floor line). */
const GUARDS = [-0.456, -0.394] as const;
const GUARD_FEET = 0.296;
/** A soldier's height (u). */
const SOLDIER_H = 0.086;

/**
 * Two wooden toy soldiers of the fort's guard, standing at attention on the meadow beyond the
 * lollipop tree: tall dark hats with a gold badge and a red plume, red coats with white cross
 * belts, blue trousers. The one on the right beats a drum.
 */
export function guards(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const feet = s.groundY + GUARD_FEET * u;
  if (feet - u * SOLDIER_H * 1.25 > s.cssH) return;
  const lw = inkW(s);
  ctx.beginPath();
  for (const gx of GUARDS) oval(ctx, centerX(s) + gx * u, feet, u * 0.022, u * 0.006);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  for (let i = 0; i < GUARDS.length; i++) soldier(ctx, s, centerX(s) + GUARDS[i]! * u, feet, lw, i === 1);
}

function soldier(ctx: Ctx, s: Scene, x: number, feet: number, lw: number, drummer: boolean): void {
  const u = s.u;
  const k = SOLDIER_H * u;
  // Legs.
  ctx.beginPath();
  block(ctx, x - k * 0.15, feet - k * 0.36, k * 0.13, k * 0.36, k * 0.04);
  block(ctx, x + k * 0.02, feet - k * 0.36, k * 0.13, k * 0.36, k * 0.04);
  ctx.fillStyle = BLUE.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.fillStyle = INK;
  ctx.fillRect(x - k * 0.15, feet - k * 0.08, k * 0.3, k * 0.08);
  // Coat with cross belts, arms at the sides.
  ctx.beginPath();
  block(ctx, x - k * 0.2, feet - k * 0.72, k * 0.4, k * 0.38, k * 0.08);
  ctx.fillStyle = RED.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = k * 0.06;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.15, feet - k * 0.69);
  ctx.lineTo(x + k * 0.15, feet - k * 0.38);
  ctx.moveTo(x + k * 0.15, feet - k * 0.69);
  ctx.lineTo(x - k * 0.15, feet - k * 0.38);
  ctx.stroke();
  // Face, hat, badge, plume.
  ctx.beginPath();
  circle(ctx, x, feet - k * 0.8, k * 0.12);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x - k * 0.06, feet - k * 0.75, k * 0.035);
  circle(ctx, x + k * 0.06, feet - k * 0.75, k * 0.035);
  ctx.fillStyle = "rgba(255, 120, 120, 0.6)";
  ctx.fill();
  ctx.beginPath();
  block(ctx, x - k * 0.14, feet - k * 1.12, k * 0.28, k * 0.28, k * 0.05);
  ctx.fillStyle = HAT;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  circle(ctx, x, feet - k * 0.99, k * 0.05);
  ctx.fillStyle = YELLOW.body;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x, feet - k * 1.17, k * 0.06, k * 0.08);
  ctx.fillStyle = RED.body;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  if (!drummer) return;
  // The drum on his front, and the sticks beating in turn.
  const beat = Math.sin(s.t * 6);
  ctx.beginPath();
  block(ctx, x - k * 0.2, feet - k * 0.5, k * 0.4, k * 0.24, k * 0.06);
  ctx.fillStyle = YELLOW.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.strokeStyle = RED.body;
  ctx.lineWidth = k * 0.05;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.16, feet - k * 0.47);
  ctx.lineTo(x - k * 0.04, feet - k * 0.3);
  ctx.lineTo(x + k * 0.08, feet - k * 0.47);
  ctx.lineTo(x + k * 0.17, feet - k * 0.32);
  ctx.stroke();
  ctx.strokeStyle = WOOD.shade;
  ctx.lineWidth = k * 0.045;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - k * 0.22, feet - k * 0.6);
  ctx.lineTo(x - k * 0.08, feet - k * (0.52 + 0.06 * Math.max(0, beat)));
  ctx.moveTo(x + k * 0.22, feet - k * 0.6);
  ctx.lineTo(x + k * 0.08, feet - k * (0.52 + 0.06 * Math.max(0, -beat)));
  ctx.stroke();
}

// ---------------------------------------------------------------- the spinning top

/** Where the top spins: x (u from the center line), its tip (u above the floor line), its size (u). */
const TOP_X = 0.43;
const TOP_FEET = 0.116;
const TOP_R = 0.03;

/** A striped spinning top beyond the ring tree: its stripes run round as it spins, and it wobbles a little. */
export function spinningTop(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = centerX(s) + TOP_X * u;
  const tip = s.groundY - TOP_FEET * u;
  if (tip - u * 0.07 > s.cssH) return;
  const lw = inkW(s) * 0.75;
  const r = TOP_R * u;
  const wobble = Math.sin(s.t * 1.1) * 0.06;
  // A soft shadow under the tip.
  ctx.beginPath();
  oval(ctx, x, tip, r * 0.7, r * 0.14);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.save();
  ctx.translate(x, tip);
  ctx.rotate(wobble);
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.4, -r * 0.5, -r, -r * 1.05);
    ctx.quadraticCurveTo(-r * 1.02, -r * 1.42, -r * 0.55, -r * 1.5);
    ctx.lineTo(r * 0.55, -r * 1.5);
    ctx.quadraticCurveTo(r * 1.02, -r * 1.42, r, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.5, 0, 0);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = TEAL.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Stripes running round: three bands whose x slides with the spin.
  const spin = (s.t * 2.4) % 1;
  ctx.fillStyle = ORANGE.body;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    const sx = (i + spin) * r * 0.9;
    ctx.moveTo(sx - r * 0.18, -r * 1.6);
    ctx.lineTo(sx + r * 0.18, -r * 1.6);
    ctx.lineTo(sx * 0.2 + r * 0.05, 0);
    ctx.lineTo(sx * 0.2 - r * 0.05, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = YELLOW.body;
  ctx.fillRect(-r * 1.1, -r * 1.12, r * 2.2, r * 0.18);
  ctx.fillStyle = "rgba(30, 20, 60, 0.18)";
  ctx.fillRect(r * 0.35, -r * 1.6, r, r * 1.6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(-r * 0.75, -r * 1.42, r * 0.22, r * 0.5);
  ctx.restore();
  body();
  ink(ctx, lw, INK);
  // The handle.
  ctx.beginPath();
  block(ctx, -r * 0.14, -r * 1.95, r * 0.28, r * 0.47, r * 0.1);
  ctx.fillStyle = RED.body;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.restore();
}
