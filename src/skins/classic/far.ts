import { alpha, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";

// The far side of the valley, standing on the horizon behind the cloud bank: a hazy range of
// flat-topped hills with rounded shoulders, faint checker strata on their faces and thin
// waterfalls streaking down them; rolling blue-green hills in front, and a little castle on a
// hilltop to the right, a rival keep across the valley with its flag flying. Flat faded
// silhouettes, no outlines; only the grassy rims, the falls and the flag are a shade lighter
// or brighter.

const BACK = mix(mix(PALETTE.far, PALETTE.skyBottom, 0.12), "#5f9ad8", 0.25);
const RIM = mix(BACK, "#c8f7a8", 0.55);
const FALLS = mix(BACK, "#ffffff", 0.6);
const HILLS = mix(PALETTE.far, PALETTE.fieldFar, 0.36);
const HILL_RIM = mix(HILLS, "#e8ffc0", 0.3);
const RIDGE = mix(HILLS, PALETTE.fieldFar, 0.32);
const KEEP = mix(PALETTE.far, "#5a6fa8", 0.25);
const FLAG = mix("#e2364f", PALETTE.far, 0.35);
const LIT_WINDOW = alpha("#ffffff", 0.35);

/** Plateaus: x in u from the screen center, half width of the flat top, height, shoulder radius (u). */
const PLATEAUS = [
  [-1.45, 0.22, 0.2, 0.07],
  [-0.95, 0.12, 0.15, 0.05],
  [-0.52, 0.12, 0.25, 0.06],
  [-0.22, 0.07, 0.31, 0.05],
  [0.05, 0.09, 0.2, 0.05],
  [0.3, 0.1, 0.27, 0.06],
  [0.68, 0.14, 0.33, 0.07],
  [1.1, 0.12, 0.19, 0.05],
  [1.55, 0.22, 0.24, 0.07],
] as const;

/** Thin falls down the plateaus' faces: x (u from center), width (u). */
const FAR_FALLS = [
  [-0.24, 0.014],
  [-0.48, 0.009],
  [0.27, 0.011],
  [0.33, 0.007],
  [0.66, 0.012],
] as const;

/** Height (u) at x (u from center): the tallest plateau there, flat on top with rounded shoulders. */
function plateau(xu: number): number {
  let h = 0;
  for (const [px, hw, ph, sh] of PLATEAUS) {
    const d = Math.abs(xu - px) - hw;
    let v: number;
    if (d <= 0) v = ph * (1 + 0.025 * Math.sin(xu * 41 + px));
    else if (d < sh) v = ph - sh + Math.sqrt(sh * sh - d * d);
    else continue;
    if (v > h) h = v;
  }
  return h;
}

function foothill(xu: number): number {
  return 0.045 + 0.02 * Math.sin(xu * 6.3 + 1.2) + 0.012 * Math.sin(xu * 15 + 0.4);
}

function hill(xu: number): number {
  return 0.085 + 0.03 * Math.sin(xu * 4.1 + 0.7) + 0.022 * Math.sin(xu * 9.3 + 2.1) + castleHill(xu);
}

/** The rival castle's hill: a rounded bump under it. */
const CASTLE_X = 0.33;
function castleHill(xu: number): number {
  const d = (xu - CASTLE_X) / 0.17;
  return d * d < 1 ? 0.075 * (1 - d * d) : 0;
}

/** Sample spacing in u: fine for the plateaus' rounded shoulders, coarser for smooth hills. */
const STEP = 0.014;
const HILL_STEP = 0.025;

/** A ridge's silhouette standing on the horizon, its top lowered by `drop` px (for a rim under it). */
function ridgePath(ctx: Ctx, s: Scene, f: (xu: number) => number, drop: number, step = HILL_STEP): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const base = s.horizonY + 2;
  const x0 = -cx / u - step;
  const x1 = cx / u + step;
  ctx.beginPath();
  ctx.moveTo(cx + x0 * u, base);
  for (let xu = x0; xu <= x1 + step; xu += step) ctx.lineTo(cx + xu * u, Math.min(base, s.horizonY - f(xu) * u + drop));
  ctx.lineTo(cx + x1 * u + step * u, base);
  ctx.closePath();
}

/** The plateaus: a grassy rim (the silhouette in rim green, the body a little lower), thin falls. */
function plateaus(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  ridgePath(ctx, s, plateau, 0, STEP);
  ctx.fillStyle = RIM;
  ctx.fill();
  ridgePath(ctx, s, plateau, u * 0.012, STEP);
  ctx.fillStyle = BACK;
  ctx.fill();
  // Falls from each rim to the haze.
  ctx.fillStyle = FALLS;
  for (const [fx, fw] of FAR_FALLS) {
    const top = hy - plateau(fx) * u + u * 0.006;
    ctx.fillRect(cx + (fx - fw / 2) * u, top, fw * u, hy - top);
  }
}

/** The rival keep's towers: [x offset, half width, height, cone height] in u. */
const FAR_TOWERS = [
  [-0.075, 0.016, 0.065, 0.04],
  [0.075, 0.016, 0.06, 0.038],
  [-0.012, 0.022, 0.1, 0.055],
] as const;

/** The rival keep on its hill: towers with cones and a flag, all one faded color. */
function farCastle(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const x = s.cssW / 2 + CASTLE_X * u;
  const g = s.horizonY - hill(CASTLE_X) * u + u * 0.004;
  ctx.beginPath();
  // Curtain wall with merlons
  const wl = x - u * 0.075;
  const wr = x + u * 0.075;
  const wt = g - u * 0.035;
  ctx.moveTo(wl, g);
  ctx.lineTo(wl, wt);
  for (let mx = wl; mx < wr - 1; mx += u * 0.016) {
    ctx.lineTo(mx, wt - u * 0.008);
    ctx.lineTo(mx + u * 0.009, wt - u * 0.008);
    ctx.lineTo(mx + u * 0.009, wt);
    ctx.lineTo(Math.min(wr, mx + u * 0.016), wt);
  }
  ctx.lineTo(wr, g);
  ctx.closePath();
  for (const [ox, hw, h, cone] of FAR_TOWERS) {
    const tx = x + ox * u;
    const top = g - h * u;
    ctx.moveTo(tx - hw * u, g);
    ctx.lineTo(tx - hw * u, top);
    ctx.lineTo(tx - hw * u * 1.3, top);
    ctx.lineTo(tx, top - cone * u);
    ctx.lineTo(tx + hw * u * 1.3, top);
    ctx.lineTo(tx + hw * u, top);
    ctx.lineTo(tx + hw * u, g);
    ctx.closePath();
  }
  ctx.fillStyle = KEEP;
  ctx.fill();
  // Flagpole and a small fluttering flag on the tall tower.
  const px = x - u * 0.012;
  const pt = g - u * 0.19;
  ctx.fillRect(px - 0.5, pt, Math.max(1, u * 0.003), u * 0.04);
  const wave = Math.sin(s.t * 3) * u * 0.003;
  ctx.beginPath();
  ctx.moveTo(px, pt);
  ctx.quadraticCurveTo(px + u * 0.012, pt - u * 0.002 + wave, px + u * 0.026, pt + u * 0.004 + wave);
  ctx.lineTo(px, pt + u * 0.014);
  ctx.closePath();
  ctx.fillStyle = FLAG;
  ctx.fill();
  // Two tiny lit windows.
  ctx.fillStyle = LIT_WINDOW;
  ctx.fillRect(x - u * 0.016, g - u * 0.07, u * 0.007, u * 0.012);
  ctx.fillRect(x + u * 0.068, g - u * 0.045, u * 0.006, u * 0.01);
}

export function far(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.45 > s.cssH) return;
  plateaus(ctx, s);
  ridgePath(ctx, s, hill, 0);
  ctx.fillStyle = HILL_RIM;
  ctx.fill();
  ridgePath(ctx, s, hill, s.u * 0.008);
  ctx.fillStyle = HILLS;
  ctx.fill();
  // A lighter, nearer ridge of rolling foothills.
  ridgePath(ctx, s, foothill, 0);
  ctx.fillStyle = RIDGE;
  ctx.fill();
  farCastle(ctx, s);
}
