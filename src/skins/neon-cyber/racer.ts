import { circle, type Ctx } from "../../base/draw";
import { BLUE, CYAN, MAGENTA, PURPLE, RED } from "./colors";
import { tint, tube } from "./tube";

// Our own street racer: a low wedge coupe on wheels (not a hover car, so it can rip through a
// puddle), with a fastback roof, a ducktail, a slit headlight, a red tail bar, a blue rocker light
// between the wheels, a purple underglow and neon-ringed rims. The city's magenta catches its
// roofline. Drawn in a unit frame facing right, 1 long, origin on the ground midway between the
// wheels (y up is negative).

/** Wheel centers along the body and their radius (of the length). */
export const WHEEL_X = 0.33;
export const WHEEL_R = 0.075;
/** The roof's height over the ground (of the length): the car is this tall. */
export const ROOF = 0.27;
/** How far the body reaches behind the rear axle's center... and in front of the front one. */
export const REAR = 0.52;

/** Upper outline, nose to tail. */
const TOP = [
  [0.5, -0.065],
  [0.522, -0.098],
  [0.47, -0.132],
  [0.22, -0.168],
  [0.07, -0.255],
  [-0.12, -0.27],
  [-0.3, -0.228],
  [-0.46, -0.18],
  [-0.52, -0.172],
  [-0.512, -0.12],
  [-0.5, -0.065],
] as const;
/** Side glass, front to back. */
const GLASS_PTS = [
  [0.19, -0.17],
  [0.065, -0.243],
  [-0.12, -0.257],
  [-0.27, -0.222],
  [-0.31, -0.19],
  [-0.12, -0.176],
] as const;
const ARCH = 0.088;
/** Where the wheel arches meet the sill (radians below the horizontal). */
const ARCH_FOOT = Math.asin((WHEEL_R - 0.065) / ARCH);

const HULL = "#0d0a1a";
const HULL_EDGE = "#41387a";
const TIRE = "#040308";
const GLASS = "#4fb8ff";
const HEAD = "#e8f6ff";
const DRIVER = "#06050c";

export interface RacerPose {
  /** How far the wheels have turned (radians). */
  spin: number;
  /** Rims and lights: 0 asleep .. 1 fully lit. */
  power: number;
  /** Nose up (radians), about the rear wheel's contact. */
  pitch: number;
}

function poly(ctx: Ctx, pts: readonly (readonly [number, number])[]): void {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function wheel(ctx: Ctx, x: number, spin: number, power: number, px: number): void {
  const y = -WHEEL_R;
  ctx.beginPath();
  circle(ctx, x, y, WHEEL_R);
  ctx.fillStyle = TIRE;
  ctx.fill();
  ctx.strokeStyle = HULL_EDGE;
  ctx.lineWidth = px;
  ctx.stroke();
  // The neon rim, and three spokes that show the wheel turning.
  ctx.beginPath();
  circle(ctx, x, y, WHEEL_R * 0.62);
  ctx.globalAlpha = 0.45 + 0.55 * power;
  tube(ctx, CYAN, px * 1.3, 2.2);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = spin + (k * Math.PI * 2) / 3;
    ctx.moveTo(x + Math.cos(a) * WHEEL_R * 0.16, y + Math.sin(a) * WHEEL_R * 0.16);
    ctx.lineTo(x + Math.cos(a) * WHEEL_R * 0.55, y + Math.sin(a) * WHEEL_R * 0.55);
  }
  ctx.strokeStyle = tint(CYAN, 0.6);
  ctx.lineWidth = px;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * The racer `L` px long standing on the floor at (x, y), heading `dir` (1 right, -1 left). Only
 * the car: its glow and reflection on the floor are the caller's.
 */
export function streetRacer(ctx: Ctx, x: number, y: number, L: number, dir: number, pose: RacerPose): void {
  const px = 1 / L; // one screen pixel in the unit frame
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(L * dir, L);
  if (pose.pitch !== 0) {
    ctx.translate(-WHEEL_X, 0);
    ctx.rotate(-pose.pitch);
    ctx.translate(WHEEL_X, 0);
  }

  // Underglow
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.04);
  ctx.lineTo(0.2, -0.04);
  ctx.globalAlpha = 0.5 + 0.5 * pose.power;
  tube(ctx, PURPLE, Math.max(1, L * 0.028) * px, 2.4);
  ctx.globalAlpha = 1;

  // Body: the top outline back to the tail, then the sill with an arch over each wheel.
  ctx.beginPath();
  poly(ctx, TOP);
  ctx.lineTo(-WHEEL_X - ARCH, -0.065);
  ctx.arc(-WHEEL_X, -WHEEL_R, ARCH, Math.PI - ARCH_FOOT, ARCH_FOOT);
  ctx.lineTo(WHEEL_X - ARCH, -0.065);
  ctx.arc(WHEEL_X, -WHEEL_R, ARCH, Math.PI - ARCH_FOOT, ARCH_FOOT);
  ctx.closePath();
  ctx.fillStyle = HULL;
  ctx.fill();
  ctx.strokeStyle = HULL_EDGE;
  ctx.lineWidth = Math.max(0.8, L * 0.012) * px;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Glass, the driver's head behind it, and the pillar
  ctx.beginPath();
  poly(ctx, GLASS_PTS);
  ctx.closePath();
  ctx.fillStyle = tint(GLASS, 0.4);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, 0.0, -0.205, 0.034);
  ctx.fillStyle = DRIVER;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.258);
  ctx.lineTo(-0.15, -0.176);
  ctx.strokeStyle = HULL;
  ctx.lineWidth = Math.max(1, L * 0.018) * px;
  ctx.stroke();

  // The city's magenta along the roofline
  ctx.beginPath();
  ctx.moveTo(0.21, -0.172);
  ctx.lineTo(0.07, -0.258);
  ctx.lineTo(-0.12, -0.273);
  ctx.lineTo(-0.3, -0.231);
  ctx.strokeStyle = tint(MAGENTA, 0.55);
  ctx.lineWidth = Math.max(0.8, L * 0.01) * px;
  ctx.stroke();

  // Rocker light between the wheels
  ctx.beginPath();
  ctx.moveTo(-WHEEL_X + ARCH + 0.03, -0.095);
  ctx.lineTo(WHEEL_X - ARCH - 0.03, -0.095);
  ctx.globalAlpha = 0.55 + 0.45 * pose.power;
  tube(ctx, BLUE, Math.max(0.8, L * 0.012) * px, 2.4);

  // Slit headlight and the tail bar
  ctx.beginPath();
  ctx.moveTo(0.43, -0.128);
  ctx.lineTo(0.51, -0.104);
  tube(ctx, HEAD, Math.max(1, L * 0.016) * px, 2.6);
  ctx.beginPath();
  ctx.moveTo(-0.515, -0.162);
  ctx.lineTo(-0.508, -0.125);
  tube(ctx, RED, Math.max(1, L * 0.02) * px, 2.6);
  ctx.globalAlpha = 1;

  wheel(ctx, -WHEEL_X, pose.spin, pose.power, Math.max(0.8, L * 0.01) * px);
  wheel(ctx, WHEEL_X, pose.spin, pose.power, Math.max(0.8, L * 0.01) * px);
  ctx.restore();
}
