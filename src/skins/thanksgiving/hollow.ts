import { alpha, circle, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { PALETTE } from "./colors";

// The far layer: the hollow. Hazy lavender hills rise high at the sides and dip in the
// middle, patched with fields; down in the hollow, among round autumn trees, sits the little
// town, peeking over the clouds: gabled houses with lit windows, a white church with its
// steeple left of the tower, and a barn and silo to the right. Far away, so it is flat color
// with no outline (the church a touch lighter); every building is closed along the horizon.

const FAR = PALETTE.far;
/** The ridge behind, hazier still. */
const FAR_BACK = mix(FAR, PALETTE.skyBottom, 0.42);
/** Fields on the far hills: pale grass and harvested gold, faded by distance. */
const PATCH = mix(FAR_BACK, "#ffffff", 0.2);
const PATCH_GOLD = mix(FAR_BACK, "#f4c25a", 0.3);
const CHURCH = mix(FAR, "#ffffff", 0.3);
/** Autumn color, faded by distance: the round trees in town. */
const FAR_TREE = mix(FAR, "#e2773a", 0.3);
const WINDOW = mix("#ffd768", FAR, 0.15);

/** Ridge heights in u at fraction fx of the width: high at the sides (the hollow), rolling in
 * soft humps as they climb. */
function backHill(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.14 + 0.29 * side * side + side * (0.04 * Math.sin(fx * 15 + 0.6) + 0.014 * Math.sin(fx * 31 + 2));
}

/** Screen y of the far hills' ridge (the back one, the higher) at screen x: what the sun and moon set behind. */
export function ridgeY(s: Scene, x: number): number {
  return s.horizonY - backHill(Math.min(1, Math.max(0, x / s.cssW))) * s.u;
}

function frontHill(fx: number): number {
  const side = Math.abs(fx - 0.5) * 2;
  return 0.07 + 0.2 * side * side * side + 0.016 * Math.sin(fx * 9.1 + 1.7);
}

const HILL_STEPS = 48;

/** The hill's ridge at `frac` of its height, as a path from the left edge to the right. */
function ridge(ctx: Ctx, s: Scene, h: (fx: number) => number, frac: number, first: boolean): void {
  for (let i = 0; i <= HILL_STEPS; i++) {
    const fx = i / HILL_STEPS;
    const y = s.horizonY - h(fx) * s.u * frac;
    if (i === 0 && first) ctx.moveTo(-4, y);
    else ctx.lineTo(i === HILL_STEPS ? s.cssW + 4 : fx * s.cssW, y);
  }
}

function hillPath(ctx: Ctx, s: Scene, h: (fx: number) => number): void {
  ctx.beginPath();
  ctx.moveTo(-4, s.horizonY + 2);
  ridge(ctx, s, h, 1, false);
  ctx.lineTo(s.cssW + 4, s.horizonY + 2);
  ctx.closePath();
}

/** Fields on the far slopes: bands that follow the rolling ridge, [top, bottom] as fractions of
 * its height, alternating harvested gold and pale grass. Only the high sides show over the
 * clouds; in the middle they sink behind the town. */
const BANDS = [
  [0.9, 0.78],
  [0.72, 0.6],
] as const;

function hills(ctx: Ctx, s: Scene): void {
  hillPath(ctx, s, backHill);
  ctx.fillStyle = FAR_BACK;
  ctx.fill();
  for (let b = 0; b < BANDS.length; b++) {
    const [top, bottom] = BANDS[b]!;
    ctx.beginPath();
    ridge(ctx, s, backHill, top, true);
    for (let i = HILL_STEPS; i >= 0; i--) {
      const fx = i / HILL_STEPS;
      ctx.lineTo(i === HILL_STEPS ? s.cssW + 4 : i === 0 ? -4 : fx * s.cssW, s.horizonY - backHill(fx) * s.u * bottom);
    }
    ctx.closePath();
    ctx.fillStyle = b ? PATCH : PATCH_GOLD;
    ctx.fill();
  }
  hillPath(ctx, s, frontHill);
  ctx.fillStyle = FAR;
  ctx.fill();
}

// The town, in u from the screen center (x) and up from the horizon (y).

/** Gabled houses: center x, half width, wall height, roof height, chimney side (-1, 0, 1). */
const HOUSES = [
  [-0.36, 0.035, 0.1, 0.045, 1],
  [-0.27, 0.032, 0.12, 0.04, -1],
  [-0.04, 0.03, 0.105, 0.042, 1],
  [0.04, 0.036, 0.118, 0.045, 0],
  [0.125, 0.028, 0.098, 0.038, -1],
] as const;
/** Round tree clumps between the houses: x, radius, trunk height. */
const CLUMPS = [
  [-0.195, 0.032, 0.09],
  [-0.31, 0.024, 0.1],
  [0.09, 0.022, 0.1],
  [0.29, 0.03, 0.095],
  [0.38, 0.03, 0.1],
] as const;

const CHURCH_X = -0.125;
const BARN_X = 0.2;
const SILO_X = 0.248;

/** Lit windows: x, y (bottom), w, h. */
const WINDOWS: readonly (readonly [number, number, number, number])[] = [
  ...HOUSES.flatMap(([x, hw, h]) => [
    [x - hw * 0.5, h * 0.66, 0.012, 0.015] as const,
    [x + hw * 0.18, h * 0.66, 0.012, 0.015] as const,
  ]),
  [CHURCH_X + 0.022, 0.05, 0.01, 0.028],
  [CHURCH_X + 0.045, 0.05, 0.01, 0.028],
  [CHURCH_X - 0.006, 0.15, 0.012, 0.018],
  [BARN_X - 0.008, 0.1, 0.016, 0.016],
];

function houses(ctx: Ctx, ox: number, oy: number, u: number): void {
  for (const [x, hw, h, roof, chim] of HOUSES) {
    const x0 = ox + (x - hw) * u;
    const x1 = ox + (x + hw) * u;
    const eave = oy - h * u;
    ctx.moveTo(x0, oy);
    ctx.lineTo(x0, eave);
    ctx.lineTo(x0 - u * 0.006, eave);
    ctx.lineTo(ox + x * u, eave - roof * u);
    ctx.lineTo(x1 + u * 0.006, eave);
    ctx.lineTo(x1, eave);
    ctx.lineTo(x1, oy);
    ctx.closePath();
    if (chim) {
      const cx = ox + (x + chim * hw * 0.5) * u;
      ctx.rect(cx - u * 0.006, eave - roof * u * 0.85, u * 0.012, roof * u * 0.6);
    }
  }
}

/** Round autumn trees in town, on short trunks. */
function clumps(ctx: Ctx, ox: number, oy: number, u: number): void {
  for (const [x, r, h] of CLUMPS) {
    circle(ctx, ox + x * u, oy - h * u, r * u);
    circle(ctx, ox + (x - r * 0.6) * u, oy - (h - r * 0.5) * u, r * 0.75 * u);
  }
}

/** Gambrel barn and a silo with a domed cap. */
function farm(ctx: Ctx, ox: number, oy: number, u: number): void {
  const bx = ox + BARN_X * u;
  const w = u * 0.09;
  const h = u * 0.15;
  ctx.moveTo(bx - w * 0.5, oy);
  ctx.lineTo(bx - w * 0.5, oy - h * 0.55);
  ctx.lineTo(bx - w * 0.4, oy - h * 0.86);
  ctx.lineTo(bx, oy - h);
  ctx.lineTo(bx + w * 0.4, oy - h * 0.86);
  ctx.lineTo(bx + w * 0.5, oy - h * 0.55);
  ctx.lineTo(bx + w * 0.5, oy);
  ctx.closePath();
  const sx = ox + SILO_X * u;
  const sw = u * 0.034;
  const sh = u * 0.19;
  ctx.moveTo(sx - sw / 2, oy);
  ctx.lineTo(sx - sw / 2, oy - sh);
  ctx.arc(sx, oy - sh, sw / 2, Math.PI, 0);
  ctx.lineTo(sx + sw / 2, oy);
  ctx.closePath();
}

/** The white church: a nave with a gable roof and a square tower with a belfry and spire. */
function church(ctx: Ctx, ox: number, oy: number, u: number): void {
  const x = ox + CHURCH_X * u;
  // Nave, to the right of the tower
  const n0 = x + u * 0.008;
  const n1 = x + u * 0.068;
  const wall = oy - u * 0.088;
  ctx.moveTo(n0, oy);
  ctx.lineTo(n0, wall);
  ctx.lineTo((n0 + n1) / 2, wall - u * 0.036);
  ctx.lineTo(n1 + u * 0.004, wall);
  ctx.lineTo(n1, wall);
  ctx.lineTo(n1, oy);
  ctx.closePath();
  // Tower, belfry, spire and the cross
  const tw = u * 0.02;
  const top = oy - u * 0.17;
  ctx.moveTo(x - tw, oy);
  ctx.lineTo(x - tw, top);
  ctx.lineTo(x - tw * 1.2, top);
  ctx.lineTo(x - tw * 1.2, top - u * 0.008);
  ctx.lineTo(x - tw * 0.85, top - u * 0.008);
  ctx.lineTo(x, top - u * 0.11);
  ctx.lineTo(x + tw * 0.85, top - u * 0.008);
  ctx.lineTo(x + tw * 1.2, top - u * 0.008);
  ctx.lineTo(x + tw * 1.2, top);
  ctx.lineTo(x + tw, top);
  ctx.lineTo(x + tw, oy);
  ctx.closePath();
  const cy = top - u * 0.11;
  ctx.rect(x - u * 0.0018, cy - u * 0.026, u * 0.0036, u * 0.026);
  ctx.rect(x - u * 0.008, cy - u * 0.019, u * 0.016, u * 0.0036);
}

export function hollow(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * 0.55 > s.cssH) return;
  hills(ctx, s);
  const u = s.u;
  const ox = s.cssW / 2;
  const oy = s.horizonY + 1;
  ctx.beginPath();
  clumps(ctx, ox, oy, u);
  ctx.fillStyle = FAR_TREE;
  ctx.fill();
  ctx.beginPath();
  houses(ctx, ox, oy, u);
  farm(ctx, ox, oy, u);
  for (const [x, , h] of CLUMPS) ctx.rect(ox + x * u - u * 0.003, oy - h * u, u * 0.006, h * u);
  ctx.fillStyle = FAR;
  ctx.fill();
  ctx.beginPath();
  church(ctx, ox, oy, u);
  ctx.fillStyle = CHURCH;
  ctx.fill();
  // The belfry opening, and lit windows all over town.
  ctx.fillStyle = alpha(FAR, 0.9);
  ctx.fillRect(ox + CHURCH_X * u - u * 0.008, oy - u * 0.162, u * 0.016, u * 0.022);
  ctx.fillStyle = WINDOW;
  for (const [x, y, w, h] of WINDOWS) ctx.fillRect(ox + x * u, oy - (y + h) * u, w * u, h * u);
}
