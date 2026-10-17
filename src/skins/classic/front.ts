import { circle, hash, ink, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CLOUD, CLOUD_LIGHT, CLOUD_SHADE, INK } from "./colors";
import { bankLine, inkW } from "./island";
import { COLUMN, sparkle } from "./sky";

// The near edge we look over: the tops of a bank of cloud, puffy and inked like everything up
// close. A back row of big shaded puffs heaps up toward the sides, and in front of it a row of
// smaller lit puffs with bright caps, a scalloped shaded band under them, and a few sparkles
// twinkling out at the sides. It covers the base band and drops away faster than the tower as
// the camera climbs (parallax 1.6, like the band), so it only frames the start.

/** Puffs along each row, repeating: size (u) and a small rise (u). */
const SPAN = 7;
const FRONT = Array.from({ length: SPAN }, (_, i) => ({ r: 0.042 + hash(i + 1500) * 0.016, up: hash(i + 1600) * 0.01 }));
const BACK = Array.from({ length: SPAN }, (_, i) => ({ r: 0.05 + hash(i + 1800) * 0.022, up: hash(i + 1900) * 0.016 }));
const STEP = 0.064;
const SPARKLE = "#9fc8f2";
const SWELL = mix(CLOUD_SHADE, CLOUD, 0.55);
const BACK_STEP = 0.082;

/** How much the back row heaps up toward the screen's sides (u). */
function heap(s: Scene, x: number): number {
  const side = Math.min(1, Math.abs(x - s.cssW / 2) / (s.cssW / 2));
  return side * side * 0.03;
}

/** Puffs of a row as subpaths: centers on `y`, scaled by k and shifted by dy (in radii). */
function puffRow(ctx: Ctx, s: Scene, y: number, k: number, dy: number, back: boolean): void {
  const u = s.u;
  const step = u * (back ? BACK_STEP : STEP);
  const list = back ? BACK : FRONT;
  // Centered on the screen, so both edges match at any width; the back row is offset half a step.
  const off = back ? step / 2 : 0;
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  for (let i = -n; i <= n; i++) {
    const p = list[((i % SPAN) + SPAN) % SPAN]!;
    const x = s.cssW / 2 + i * step + off;
    // The back row sits low behind the front one in the middle and heaps up toward the sides.
    const r = p.r * u * (back ? 0.8 + heap(s, x) * 6 : 1);
    circle(ctx, x, y - p.up * u - (back ? heap(s, x) * u * 2.2 : 0) + dy * r, r * k);
  }
}

/** Sparkles on the lip, out at the sides: x (fraction of the half screen from the center), rise (u), size (u). */
const SPARKLES = [
  [-0.8, 0.05, 0.012],
  [-0.62, 0.11, 0.008],
  [0.66, 0.07, 0.011],
  [0.86, 0.12, 0.008],
] as const;

export function front(ctx: Ctx, s: Scene): void {
  const u = s.u;
  // The front row's puffs sit on the bank's line (see island.ts).
  const y = bankLine(s);
  if (y - u * 0.16 > s.cssH) return;
  const lw = inkW(s);
  // The back row: outline first (only its outer half survives the fill), shaded body, lit top.
  const by = y + u * 0.012;
  ctx.beginPath();
  puffRow(ctx, s, by, 1, 0, true);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = CLOUD_SHADE;
  ctx.fill();
  ctx.beginPath();
  puffRow(ctx, s, by, 0.86, -0.16, true);
  ctx.fillStyle = CLOUD;
  ctx.fill();
  ctx.beginPath();
  puffRow(ctx, s, by, 0.36, -0.6, true);
  ctx.fillStyle = CLOUD_LIGHT;
  ctx.fill();
  // The front row, the same way, then the body below it.
  ctx.beginPath();
  puffRow(ctx, s, y, 1, 0, false);
  ink(ctx, lw * 2, INK);
  ctx.fillStyle = CLOUD_SHADE;
  ctx.fill();
  ctx.fillRect(-1, y, s.cssW + 2, s.cssH - y + 1);
  ctx.beginPath();
  puffRow(ctx, s, y, 0.92, -0.14, false);
  ctx.rect(-1, y - u * 0.01, s.cssW + 2, u * 0.055);
  const step = u * 0.06;
  const n = Math.ceil(s.cssW / 2 / step) + 1;
  for (let i = -n; i <= n; i++) circle(ctx, s.cssW / 2 + (i + 0.5) * step, y + u * 0.045, u * (0.026 + 0.008 * hash(i + 1700)));
  ctx.fillStyle = CLOUD;
  ctx.fill();
  ctx.beginPath();
  puffRow(ctx, s, y, 0.4, -0.62, false);
  ctx.fillStyle = CLOUD_LIGHT;
  ctx.fill();
  // Soft swells deeper in the bank: low mounds a shade lighter than the body.
  ctx.fillStyle = SWELL;
  ctx.beginPath();
  const swell = u * 0.21;
  const m = Math.ceil(s.cssW / 2 / swell) + 1;
  for (let i = -m; i <= m; i++) {
    const x = s.cssW / 2 + (i + 0.3) * swell;
    const sy = y + u * (0.16 + 0.05 * hash(i + 1950));
    if (sy - u * 0.03 > s.cssH) continue;
    const rx = u * (0.07 + 0.03 * hash(i + 1960));
    ctx.moveTo(x - rx, sy);
    ctx.ellipse(x, sy, rx, u * 0.034, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
  }
  ctx.fill();
  // Sparkles twinkling out at the sides, clear of the tower's column.
  ctx.fillStyle = SPARKLE;
  ctx.beginPath();
  for (let i = 0; i < SPARKLES.length; i++) {
    const [fx, rise, size] = SPARKLES[i]!;
    const x = s.cssW / 2 + fx * Math.max(s.cssW / 2, u * (COLUMN + 0.1));
    const k = Math.max(0, Math.sin(s.t * 1.3 + i * 1.9));
    if (k < 0.05) continue;
    sparkle(ctx, x, y + rise * u, size * u * k);
  }
  ctx.fill();
}
