import { circle, oval, type Ctx } from "../../base/draw";
import { tint, tube, whiten } from "./tube";
import { RED } from "./colors";

// Our own hover car: a low wedge with a bubble canopy, two hover jets and a neon underglow,
// a white headlight and a red tail-light. Unit shape facing right, 1 long, centered on the
// origin.

const BODY = [
  [-0.5, 0.04],
  [-0.46, -0.08],
  [-0.18, -0.12],
  [0.02, -0.24],
  [0.24, -0.22],
  [0.4, -0.08],
  [0.52, 0.0],
  [0.46, 0.09],
  [-0.44, 0.1],
] as const;
const CANOPY = [
  [0.05, -0.2],
  [0.22, -0.19],
  [0.33, -0.09],
  [0.06, -0.1],
] as const;

const HULL = "#100d1c";
const HULL_EDGE = "#3d3470";
const GLASS = "#4fb8ff";
const HEAD = "#e8f6ff";

function shape(ctx: Ctx, pts: readonly (readonly [number, number])[], x: number, y: number, L: number, dir: number): void {
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]!;
    if (i === 0) ctx.moveTo(x + px * L * dir, y + py * L);
    else ctx.lineTo(x + px * L * dir, y + py * L);
  }
  ctx.closePath();
}

/** A hover car `L` px long centered at (x, y), heading `dir` (1 right, -1 left). */
export function hoverCar(ctx: Ctx, x: number, y: number, L: number, dir: number, glow: string): void {
  ctx.beginPath();
  shape(ctx, BODY, x, y, L, dir);
  ctx.fillStyle = HULL;
  ctx.fill();
  ctx.strokeStyle = HULL_EDGE;
  ctx.lineWidth = Math.max(0.8, L * 0.025);
  ctx.stroke();

  ctx.beginPath();
  shape(ctx, CANOPY, x, y, L, dir);
  ctx.fillStyle = tint(GLASS, 0.45);
  ctx.fill();

  // Underglow
  ctx.beginPath();
  ctx.moveTo(x - 0.36 * L, y + 0.15 * L);
  ctx.lineTo(x + 0.36 * L, y + 0.15 * L);
  tube(ctx, glow, Math.max(0.8, L * 0.035), 2.6);
  // Hover jets: a hot glow at each end of the belly
  ctx.beginPath();
  oval(ctx, x - 0.27 * L * dir, y + 0.15 * L, 0.08 * L, 0.025 * L);
  oval(ctx, x + 0.27 * L * dir, y + 0.15 * L, 0.08 * L, 0.025 * L);
  ctx.fillStyle = whiten(glow, 0.5);
  ctx.fill();

  ctx.beginPath();
  circle(ctx, x + 0.49 * L * dir, y + 0.01 * L, Math.max(0.8, L * 0.035));
  ctx.fillStyle = HEAD;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - 0.48 * L * dir, y + 0.02 * L, Math.max(0.8, L * 0.035));
  ctx.fillStyle = RED;
  ctx.fill();
}
