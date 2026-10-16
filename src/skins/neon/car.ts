import { alpha, circle, mix, neonStroke, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { CYAN, PINK, RED, SHADOW, TAU } from "./colors";
import { rimTube } from "./tube";

// A chrome wedge sports car of our own design (no real marque): long low hood, raked glass,
// a short cabin, a ducktail with a small wing. Side view, cruising left to right along the
// grid in front of the tower, taillights glowing and leaving light trails. It loops: crosses,
// then the road stays empty for a few seconds. Profile points are in car lengths, y up from
// the ground line.

/** Depth on the floor (in front of the tower's line) and length (u at the tower's depth). */
const CAR_Z = 1.62;
const CAR_LEN = 0.185;
/** Loop: seconds per cycle, seconds spent crossing, and the phase at t = 0. */
const PERIOD = 12;
const CROSS = 7.5;
const PHASE = 0.9;

const WHEEL_R = 0.072;
const REAR_WHEEL = 0.2;
const FRONT_WHEEL = 0.79;
const WHEELS = [REAR_WHEEL, FRONT_WHEEL] as const;

/** Body outline, rear bumper round to the nose and back along the sills (wheel arches are arcs). */
const BODY: readonly (readonly [number, number])[] = [
  [0.012, 0.07],
  [0.0, 0.115],
  [0.004, 0.19],
  [0.05, 0.205],
  [0.3, 0.2],
  [0.425, 0.278],
  [0.56, 0.283],
  [0.69, 0.2],
  [0.94, 0.148],
  [1.0, 0.112],
  [0.995, 0.078],
  [0.94, 0.058],
];
/** Glass: rear quarter and door window, split by the pillar. */
const GLASS: readonly (readonly [number, number])[] = [
  [0.33, 0.205],
  [0.43, 0.27],
  [0.555, 0.274],
  [0.665, 0.205],
];

const CHROME = [
  [0, "#2a1d63"],
  [0.3, "#7f9cf0"],
  [0.5, "#e6e0ff"],
  [0.53, "#3a0f4c"],
  [0.78, "#a2348c"],
  [1, "#ff86b8"],
] as const;
const GLASS_FILL = "#120a2c";
const WING = "#3a2f7a";
const TRAIL = mix(RED, PINK, 0.35);
const GLOW = alpha(TRAIL, 0.22);
const PILLAR = mix(GLASS_FILL, "#ffffff", 0.25);
const GLINT = alpha(CYAN, 0.6);
const STRIPE = alpha(CYAN, 0.75);
const SPOKES = alpha(CYAN, 0.45);

/** Screen x of the car's rear bumper at time t, or null while the road is empty. */
function carX(s: Scene, L: number): number | null {
  const tt = s.t + PHASE;
  const p = tt - Math.floor(tt / PERIOD) * PERIOD;
  if (p > CROSS) return null;
  const from = -L * 1.15;
  const to = s.cssW + L * 0.15;
  return from + ((to - from) * p) / CROSS;
}

// The car's frame for this draw: rear bumper x, ground y, length (module scratch, no closures).
let ox = 0;
let oy = 0;
let ol = 1;
const X = (f: number) => ox + f * ol;
const Y = (f: number) => oy - f * ol;

export function drawCar(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const k = TOWER_DEPTH / CAR_Z;
  const gy = fieldY(s, CAR_Z);
  const L = CAR_LEN * u * k;
  if (gy - L * 0.3 > s.cssH) return;
  const x0 = carX(s, L);
  if (x0 === null) return;
  ox = x0;
  oy = gy;
  ol = L;

  // Shadow on the grid, and the glow of the trails reflected under it.
  ctx.beginPath();
  ctx.ellipse(X(0.5), gy + L * 0.008, L * 0.55, L * 0.035, 0, 0, TAU);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(X(0.12), oy + L * 0.012, L * 0.22, L * 0.022, 0, 0, TAU);
  ctx.fillStyle = GLOW;
  ctx.fill();

  // Light trails behind the taillight: fading streaks, plus their reflection on the floor.
  const trail = L * 1.05;
  ctx.lineCap = "round";
  for (let j = 0; j < 6; j++) {
    const a0 = j / 6;
    const a1 = (j + 1) / 6;
    const fade = (1 - a0) * (1 - a0);
    ctx.beginPath();
    ctx.moveTo(X(0) - trail * a0, Y(0.172));
    ctx.lineTo(X(0) - trail * a1, Y(0.172));
    ctx.moveTo(X(0) - trail * a0 * 0.8, Y(0.142));
    ctx.lineTo(X(0) - trail * a1 * 0.8, Y(0.142));
    ctx.strokeStyle = TRAIL;
    ctx.globalAlpha = 0.55 * fade;
    ctx.lineWidth = Math.max(1, L * 0.014);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(0.02) - trail * a0 * 0.7, gy + L * 0.03);
    ctx.lineTo(X(0.02) - trail * a1 * 0.7, gy + L * 0.03);
    ctx.globalAlpha = 0.22 * fade;
    ctx.lineWidth = Math.max(1, L * 0.02);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Chrome body.
  ctx.beginPath();
  ctx.moveTo(X(BODY[0]![0]), Y(BODY[0]![1]));
  for (let i = 1; i < BODY.length; i++) ctx.lineTo(X(BODY[i]![0]), Y(BODY[i]![1]));
  ctx.lineTo(X(FRONT_WHEEL + WHEEL_R * 1.35), Y(0.058));
  ctx.arc(X(FRONT_WHEEL), Y(WHEEL_R), WHEEL_R * 1.3 * L, 0.05 * Math.PI, 0.95 * Math.PI, true);
  ctx.lineTo(X(REAR_WHEEL + WHEEL_R * 1.35), Y(0.058));
  ctx.arc(X(REAR_WHEEL), Y(WHEEL_R), WHEEL_R * 1.3 * L, 0.05 * Math.PI, 0.95 * Math.PI, true);
  ctx.closePath();
  const chrome = ctx.createLinearGradient(0, Y(0.285), 0, Y(0.06));
  for (const [stop, c] of CHROME) chrome.addColorStop(stop, c);
  ctx.fillStyle = chrome;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.8, L * 0.008));

  // Glass, with a pillar and a cyan glint.
  ctx.beginPath();
  ctx.moveTo(X(GLASS[0]![0]), Y(GLASS[0]![1]));
  for (let i = 1; i < GLASS.length; i++) ctx.lineTo(X(GLASS[i]![0]), Y(GLASS[i]![1]));
  ctx.closePath();
  ctx.fillStyle = GLASS_FILL;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(0.495), Y(0.272));
  ctx.lineTo(X(0.5), Y(0.205));
  ctx.strokeStyle = PILLAR;
  ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(0.58), Y(0.262));
  ctx.lineTo(X(0.63), Y(0.215));
  ctx.strokeStyle = GLINT;
  ctx.lineWidth = Math.max(1, L * 0.008);
  ctx.stroke();

  // Wing on the ducktail.
  ctx.beginPath();
  ctx.moveTo(X(-0.005), Y(0.238));
  ctx.lineTo(X(0.1), Y(0.236));
  ctx.lineTo(X(0.1), Y(0.226));
  ctx.lineTo(X(0.0), Y(0.226));
  ctx.closePath();
  ctx.rect(X(0.05), Y(0.226), Math.max(1, L * 0.012), L * 0.024);
  ctx.fillStyle = WING;
  ctx.fill();
  rimTube(ctx, PINK, Math.max(0.6, L * 0.005));

  // Side stripe.
  ctx.beginPath();
  ctx.moveTo(X(0.04), Y(0.135));
  ctx.lineTo(X(0.12), Y(0.135));
  ctx.moveTo(X(0.29), Y(0.135));
  ctx.lineTo(X(0.7), Y(0.128));
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = Math.max(1, L * 0.01);
  ctx.stroke();

  // Wheels: dark tyres, neon rims, turning spokes.
  const spin = (x0 / (WHEEL_R * L)) % TAU; // rolling right turns the wheels clockwise
  ctx.beginPath();
  circle(ctx, X(REAR_WHEEL), Y(WHEEL_R), WHEEL_R * L);
  circle(ctx, X(FRONT_WHEEL), Y(WHEEL_R), WHEEL_R * L);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, X(REAR_WHEEL), Y(WHEEL_R), WHEEL_R * L * 0.62);
  circle(ctx, X(FRONT_WHEEL), Y(WHEEL_R), WHEEL_R * L * 0.62);
  rimTube(ctx, CYAN, Math.max(0.8, L * 0.008));
  ctx.beginPath();
  for (const w of WHEELS) {
    for (let i = 0; i < 5; i++) {
      const a = spin + (i * TAU) / 5;
      ctx.moveTo(X(w), Y(WHEEL_R));
      ctx.lineTo(X(w) + Math.cos(a) * WHEEL_R * L * 0.55, Y(WHEEL_R) + Math.sin(a) * WHEEL_R * L * 0.55);
    }
  }
  ctx.strokeStyle = SPOKES;
  ctx.lineWidth = Math.max(0.8, L * 0.006);
  ctx.stroke();

  // Taillight and headlight.
  ctx.beginPath();
  ctx.moveTo(X(0.004), Y(0.172));
  ctx.lineTo(X(0.05), Y(0.172));
  neonStroke(ctx, RED, Math.max(1.2, L * 0.022), 2.6);
  ctx.beginPath();
  ctx.moveTo(X(0.955), Y(0.128));
  ctx.lineTo(X(0.99), Y(0.118));
  neonStroke(ctx, CYAN, Math.max(1, L * 0.014), 2.2);
}
