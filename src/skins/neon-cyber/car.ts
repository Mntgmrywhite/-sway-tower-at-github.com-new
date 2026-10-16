import { circle, oval, type Ctx } from "../../base/draw";
import { tint, tube, whiten } from "./tube";
import { RED } from "./colors";

// Our own hover car: a low wedge with a bubble canopy, two hover jets and a neon underglow,
// a white headlight throwing a faint beam ahead and a red tail-light. Unit shape facing right,
// 1 long, centered on the origin.

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
const JET = "#d8f2ff";

function shape(ctx: Ctx, pts: readonly (readonly [number, number])[], x: number, y: number, L: number, dir: number): void {
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]!;
    if (i === 0) ctx.moveTo(x + px * L * dir, y + py * L);
    else ctx.lineTo(x + px * L * dir, y + py * L);
  }
  ctx.closePath();
}

function headBeam(ctx: Ctx, x: number, y: number, L: number, dir: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 0.5 * L * dir, y - 0.01 * L);
  ctx.lineTo(x + 1.6 * L * dir, y - 0.16 * L);
  ctx.lineTo(x + 1.6 * L * dir, y + 0.2 * L);
  ctx.closePath();
  ctx.fillStyle = tint(HEAD, 0.07);
  ctx.fill();
}

/** A hover car `L` px long centered at (x, y), heading `dir` (1 right, -1 left). */
export function hoverCar(ctx: Ctx, x: number, y: number, L: number, dir: number, glow: string, beam = true): void {
  if (beam && L > 12) headBeam(ctx, x, y, L, dir);

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

/** A car in a batch: center, length, heading and an index into the batch's glow colors. */
export interface CarSlot {
  x: number;
  y: number;
  L: number;
  dir: number;
  glow: number;
}

/**
 * Many hover cars at once, drawn pass by pass (beams, hulls, canopies, underglow per color,
 * jets, lights) so a whole lane of traffic costs a handful of fills and strokes.
 */
export function hoverCarFleet(ctx: Ctx, cars: readonly CarSlot[], n: number, glows: readonly string[]): void {
  if (n <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = cars[i]!;
    if (c.L <= 12) continue;
    ctx.moveTo(c.x + 0.5 * c.L * c.dir, c.y - 0.01 * c.L);
    ctx.lineTo(c.x + 1.6 * c.L * c.dir, c.y - 0.16 * c.L);
    ctx.lineTo(c.x + 1.6 * c.L * c.dir, c.y + 0.2 * c.L);
    ctx.closePath();
  }
  ctx.fillStyle = tint(HEAD, 0.07);
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < n; i++) shape(ctx, BODY, cars[i]!.x, cars[i]!.y, cars[i]!.L, cars[i]!.dir);
  ctx.fillStyle = HULL;
  ctx.fill();
  ctx.strokeStyle = HULL_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < n; i++) shape(ctx, CANOPY, cars[i]!.x, cars[i]!.y, cars[i]!.L, cars[i]!.dir);
  ctx.fillStyle = tint(GLASS, 0.45);
  ctx.fill();

  ctx.lineCap = "round";
  for (let g = 0; g < glows.length; g++) {
    ctx.beginPath();
    let any = false;
    let L = 0;
    for (let i = 0; i < n; i++) {
      const c = cars[i]!;
      if (c.glow !== g) continue;
      ctx.moveTo(c.x - 0.36 * c.L, c.y + 0.15 * c.L);
      ctx.lineTo(c.x + 0.36 * c.L, c.y + 0.15 * c.L);
      any = true;
      L = Math.max(L, c.L);
    }
    if (!any) continue;
    ctx.strokeStyle = tint(glows[g]!, 0.25);
    ctx.lineWidth = Math.max(2, L * 0.09);
    ctx.stroke();
    ctx.strokeStyle = glows[g]!;
    ctx.lineWidth = Math.max(0.8, L * 0.035);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = cars[i]!;
    oval(ctx, c.x - 0.27 * c.L * c.dir, c.y + 0.15 * c.L, 0.08 * c.L, 0.025 * c.L);
    oval(ctx, c.x + 0.27 * c.L * c.dir, c.y + 0.15 * c.L, 0.08 * c.L, 0.025 * c.L);
  }
  ctx.fillStyle = JET;
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = cars[i]!;
    circle(ctx, c.x + 0.49 * c.L * c.dir, c.y + 0.01 * c.L, Math.max(0.8, c.L * 0.035));
  }
  ctx.fillStyle = HEAD;
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const c = cars[i]!;
    circle(ctx, c.x - 0.48 * c.L * c.dir, c.y + 0.02 * c.L, Math.max(0.8, c.L * 0.035));
  }
  ctx.fillStyle = RED;
  ctx.fill();
}
