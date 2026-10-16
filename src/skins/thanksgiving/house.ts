import { circle, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { INK, LIT, PUMPKIN, STEM, tone, WOOD } from "./colors";
import { C, cel, flat, L, len, line, M, O, pen, R, RS, S, X, Y } from "./pen";

// The farmhouse: a cream clapboard house with a rust roof and a cross gable, a chimney
// puffing smoke, lit windows with green shutters, and a front porch across the bottom (white
// posts and railing, a red door, steps with a pumpkin on each side). Local units, origin at
// the middle of the porch floor's front edge.

const WALL = tone("#f8eacb", 0.4, 0.16);
const CLAPBOARD = "#e2cfa6";
const ROOF = tone("#c2533a", 0.3, 0.26);
const TRIM = "#fffaf0";
const SHUTTER = "#5f8a4a";
const DOOR = tone("#b8432e");
const BRICK = tone("#a8513c");
const SMOKE = "#f4ecf4";

const HW = 0.15; // half the wall width
const WALL_H = 0.15;
const EAVE = 0.168; // roof half width at the eaves
const RIDGE_Y = -0.232;
const RIDGE_HW = 0.118;
const GABLE_HW = 0.058;
const GABLE_Y = -0.272;
const PORCH_TOP = -0.074;
const FLOOR = -0.014;

/** Window centers: x, y (center), w, h. */
const WINDOWS = [
  [-0.098, -0.112, 0.034, 0.036],
  [0.098, -0.112, 0.034, 0.036],
  [-0.088, -0.042, 0.034, 0.032],
  [0.088, -0.042, 0.034, 0.032],
] as const;
const POSTS = [-0.145, -0.05, 0.05, 0.145] as const;

/** Smoke puffs: phase offset; each rises and swells over SMOKE_T seconds, drifting left. */
const SMOKE_PUFFS = [0, 0.25, 0.5, 0.75] as const;
const SMOKE_T = 6;
const CHIM_X = 0.075;
const CHIM_TOP = -0.29;

export function farmhouse(ctx: Ctx, s: Scene, x: number, y: number, scale: number, lw: number): void {
  const thin = Math.max(1, lw * 0.7);
  pen(x, y, scale, 11);

  // Chimney behind the roof
  ctx.beginPath();
  R(ctx, CHIM_X - 0.014, CHIM_TOP, 0.028, 0.08);
  cel(ctx, BRICK, CHIM_TOP, CHIM_TOP + 0.08, lw, 0.18, 0.2);
  ctx.beginPath();
  RS(ctx, CHIM_X - 0.018, CHIM_TOP - 0.008, 0.036, 0.01);
  flat(ctx, BRICK.shade, thin);

  // Roof
  ctx.beginPath();
  M(ctx, -EAVE, -WALL_H + 0.004);
  L(ctx, -RIDGE_HW, RIDGE_Y);
  L(ctx, RIDGE_HW, RIDGE_Y);
  L(ctx, EAVE, -WALL_H + 0.004);
  ctx.closePath();
  cel(ctx, ROOF, RIDGE_Y, -WALL_H, lw, 0.22, 0.22);
  ctx.beginPath();
  M(ctx, -EAVE + 0.02, -0.186);
  L(ctx, EAVE - 0.02, -0.186);
  line(ctx, ROOF.shade, thin);

  // Walls with clapboard lines
  ctx.beginPath();
  R(ctx, -HW, -WALL_H, HW * 2, WALL_H + FLOOR);
  cel(ctx, WALL, -WALL_H, FLOOR, lw, 0.12, 0.18);
  ctx.beginPath();
  for (let yy = -WALL_H + 0.02; yy < PORCH_TOP - 0.005; yy += 0.016) {
    M(ctx, -HW + 0.006, yy);
    L(ctx, HW - 0.006, yy);
  }
  line(ctx, CLAPBOARD, thin * 0.8);

  // Cross gable over the door, with a round window
  ctx.beginPath();
  M(ctx, -GABLE_HW, -WALL_H + 0.002);
  L(ctx, 0, GABLE_Y + 0.012);
  L(ctx, GABLE_HW, -WALL_H + 0.002);
  ctx.closePath();
  ctx.fillStyle = WALL.light;
  ctx.fill();
  ctx.beginPath();
  M(ctx, -GABLE_HW - 0.016, -WALL_H + 0.01);
  L(ctx, 0, GABLE_Y);
  L(ctx, GABLE_HW + 0.016, -WALL_H + 0.01);
  line(ctx, INK, lw * 2 + len(0.012));
  line(ctx, ROOF.base, len(0.012));
  ctx.beginPath();
  C(ctx, 0, -0.18, 0.016);
  flat(ctx, LIT, thin);

  // Windows: lit panes, a cross of mullions, shutters
  ctx.beginPath();
  for (const [wx, wy, w, h] of WINDOWS) {
    RS(ctx, wx - w / 2 - 0.013, wy - h / 2, 0.011, h);
    RS(ctx, wx + w / 2 + 0.002, wy - h / 2, 0.011, h);
  }
  flat(ctx, SHUTTER, thin);
  ctx.beginPath();
  for (const [wx, wy, w, h] of WINDOWS) R(ctx, wx - w / 2, wy - h / 2, w, h);
  flat(ctx, LIT, thin);
  ctx.beginPath();
  for (const [wx, wy, w, h] of WINDOWS) {
    M(ctx, wx, wy - h / 2);
    S(ctx, wx, wy + h / 2);
    M(ctx, wx - w / 2, wy);
    S(ctx, wx + w / 2, wy);
  }
  line(ctx, TRIM, thin);

  // Door with a knob and a little wreath of leaves
  ctx.beginPath();
  R(ctx, -0.02, -0.066, 0.04, 0.052);
  cel(ctx, DOOR, -0.066, FLOOR, thin, 0.15, 0.2);
  ctx.beginPath();
  C(ctx, 0.012, -0.04, 0.0035);
  ctx.fillStyle = "#ffd768";
  ctx.fill();
  ctx.beginPath();
  C(ctx, 0, -0.054, 0.008);
  line(ctx, "#e8902e", len(0.005));

  // Porch: floor, railing, posts, then its roof across the top
  ctx.beginPath();
  R(ctx, -HW - 0.01, FLOOR, HW * 2 + 0.02, -FLOOR);
  cel(ctx, WOOD, FLOOR, 0, thin, 0.3, 0.3);
  ctx.beginPath();
  for (let i = 0; i < POSTS.length - 1; i++) {
    const a = POSTS[i]!;
    const b = POSTS[i + 1]!;
    if (a < 0 && b > 0) continue; // the door bay
    M(ctx, a, -0.04);
    L(ctx, b, -0.04);
    for (let j = 1; j < 4; j++) {
      const bx = a + ((b - a) * j) / 4;
      M(ctx, bx, -0.04);
      S(ctx, bx, FLOOR);
    }
  }
  line(ctx, INK, thin * 2.6);
  line(ctx, TRIM, thin * 1.1);
  ctx.beginPath();
  for (const px of POSTS) RS(ctx, px - 0.0045, PORCH_TOP, 0.009, -PORCH_TOP + FLOOR);
  flat(ctx, TRIM, thin);
  ctx.beginPath();
  M(ctx, -HW - 0.016, PORCH_TOP + 0.002);
  L(ctx, -HW + 0.004, PORCH_TOP - 0.016);
  L(ctx, HW - 0.004, PORCH_TOP - 0.016);
  L(ctx, HW + 0.016, PORCH_TOP + 0.002);
  ctx.closePath();
  cel(ctx, ROOF, PORCH_TOP - 0.016, PORCH_TOP, thin, 0.3, 0.3);

  // Steps down from the door, a pumpkin on either side
  ctx.beginPath();
  R(ctx, -0.03, 0, 0.06, 0.008);
  R(ctx, -0.036, 0.008, 0.072, 0.008);
  cel(ctx, WOOD, 0, 0.016, thin, 0.3, 0.2);
  ctx.beginPath();
  O(ctx, -0.056, 0.004, 0.017, 0.012);
  O(ctx, 0.056, 0.006, 0.014, 0.01);
  cel(ctx, PUMPKIN, -0.008, 0.016, thin, 0.25, 0.3);
  ctx.beginPath();
  M(ctx, -0.056, -0.008);
  S(ctx, -0.054, -0.014);
  M(ctx, 0.056, -0.004);
  S(ctx, 0.058, -0.009);
  line(ctx, STEM, thin * 1.4);

  // Smoke curling up from the chimney, drifting left (away from the tower) and fading.
  const t = s.t / SMOKE_T;
  ctx.fillStyle = SMOKE;
  for (const ph of SMOKE_PUFFS) {
    const k = (t + ph) % 1;
    const r = 0.012 + k * 0.026;
    const px = CHIM_X - k * 0.06 + Math.sin(s.t * 0.8 + ph * 9) * 0.006;
    const py = CHIM_TOP - 0.02 - k * 0.2;
    ctx.globalAlpha = 0.7 * (1 - k) * Math.min(1, k * 6);
    ctx.beginPath();
    circle(ctx, X(px), Y(py), len(r));
    circle(ctx, X(px - r * 0.8), Y(py + r * 0.3), len(r * 0.7));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
