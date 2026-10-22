import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { smooth } from "./shapes";
import type { Tone } from "./tone";
import { waterTower } from "./town";

// The country beyond the town, printed as a WPA poster builds its distance: flat layers of
// atmosphere, each a step paler and bluer further back, no outlines, everything lit from the
// left with a flat shadow plane on its right. Furthest, a range of angular blue-violet
// mountains, low behind the tower and climbing toward the sides; in front of it a bluer ridge,
// faceted the same way, with a far town on its right shoulder: a grain elevator (four silos and
// a headhouse), a spire, a water tank and a row of gables. Then the farm hills, rolling up toward
// the sides and plowed in contour stripes that follow their swell (green field, ochre wheat and
// rust furrows by turns, dark hedgerows along some of them), and nearest the near hill with the
// water tower on it (town.ts) and the park's tree line on the right. Behind the tower everything
// sinks low, so the column stays calm; the left keeps low under the sun (on an iPad or a wide
// window the sun's halo hangs only 0.27 u over the horizon). Positions are in u from the screen
// center, heights in u above the country's base line, HILL_BASE u under the horizon.

/** The country's base line, u below the horizon (the lawn covers it). */
export const HILL_BASE = 0.03;

type Peaks = readonly (readonly [X: number, h: number])[];

/**
 * The far range and the ridge: their peaks and saddles left to right, joined by straight
 * slopes. Low behind the column, rising toward the sides like the rim of the valley the town
 * stands in; on the left, where the sun hangs above them (0.41 u left of center, its halo 0.3 u
 * over this base line on an iPad or a wide window), no higher than 0.27 u.
 */
const RANGE: Peaks = [
  [-2, 0.24],
  [-1.1, 0.26],
  [-0.9, 0.2],
  [-0.72, 0.26],
  [-0.6, 0.21],
  [-0.5, 0.27],
  [-0.42, 0.21],
  [-0.34, 0.25],
  [-0.26, 0.17],
  [-0.14, 0.07],
  [0, 0.05],
  [0.14, 0.07],
  [0.27, 0.2],
  [0.34, 0.25],
  [0.42, 0.31],
  [0.5, 0.44],
  [0.6, 0.37],
  [0.72, 0.5],
  [0.86, 0.4],
  [1.0, 0.48],
  [1.3, 0.36],
  [2, 0.44],
];
const RIDGE: Peaks = [
  [-2, 0.24],
  [-1.0, 0.2],
  [-0.8, 0.26],
  [-0.66, 0.2],
  [-0.55, 0.25],
  [-0.46, 0.19],
  [-0.38, 0.22],
  [-0.3, 0.16],
  [-0.2, 0.06],
  [0, 0.035],
  [0.2, 0.06],
  [0.3, 0.17],
  [0.36, 0.25],
  [0.395, 0.264],
  [0.52, 0.274],
  [0.58, 0.36],
  [0.66, 0.3],
  [0.8, 0.4],
  [1.0, 0.3],
  [2, 0.34],
];

/** A range's height at X (u): straight slopes between its peaks and saddles. */
function heightOf(peaks: Peaks, X: number): number {
  for (let i = 1; i < peaks.length; i++) {
    const [x1, h1] = peaks[i]!;
    if (X > x1) continue;
    const [x0, h0] = peaks[i - 1]!;
    return h0 + ((h1 - h0) * (X - x0)) / (x1 - x0);
  }
  return peaks[peaks.length - 1]![1];
}

function rangeAt(X: number): number {
  return heightOf(RANGE, X);
}

function ridgeAt(X: number): number {
  return heightOf(RIDGE, X);
}

/** Step (u) between the points a row of hills is drawn through. */
const HILL_STEP = 0.025;
/** How far (u) a layer runs on under the nearer layer that covers it, so no seam shows between them. */
const TUCK = 0.008;

/**
 * Fill a layer of the country, `ink`, only where it shows: from its top (`top`, its height above
 * the base line at X, u) down to the top of the nearer layer in front of it (`cover`), tucked a
 * hair under it; where the nearer layer stands higher, nothing. Sampled every HILL_STEP, and
 * through `peaks` (a range's corners) so its slopes stay straight and its peaks sharp. (Filling
 * every layer down to the lawn painted the lanes three or four times over.)
 */
function stratum(ctx: Ctx, s: Scene, base: number, ink: string, top: (X: number) => number, cover: (X: number) => number, peaks: Peaks | null): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const X0 = -cx / u - HILL_STEP;
  const X1 = cx / u + HILL_STEP;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(cx + X0 * u, base - top(X0) * u);
  let p = 0;
  for (let X = X0; X < X1; ) {
    let next = X + HILL_STEP;
    if (peaks) {
      while (p < peaks.length && peaks[p]![0] <= X) p++;
      if (p < peaks.length && peaks[p]![0] < next) next = peaks[p]![0];
    }
    X = Math.min(next, X1);
    ctx.lineTo(cx + X * u, base - top(X) * u);
  }
  for (let X = X1; X > X0 - HILL_STEP * 0.5; X -= HILL_STEP) {
    ctx.lineTo(cx + X * u, base - Math.min(top(X), cover(X) - TUCK) * u);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * A range's shadow planes: every slope that falls away to the right, from the peak down to its
 * saddle and back down to the nearer layer's top a little right of the peak, in the range's shade.
 */
function facets(ctx: Ctx, s: Scene, base: number, peaks: Peaks, ink: string, cover: (X: number) => number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const lo = -cx / u - 0.3;
  const hi = cx / u + 0.3;
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let i = 0; i + 1 < peaks.length; i++) {
    const [x0, h0] = peaks[i]!;
    const [x1, h1] = peaks[i + 1]!;
    if (h1 >= h0 || x1 < lo || x0 > hi) continue;
    const xf = x0 + (x1 - x0) * 0.3;
    const hf = heightOf(peaks, xf);
    const c1 = Math.min(h1, cover(x1) - TUCK);
    const cf = Math.min(hf, cover(xf) - TUCK);
    if (c1 >= h1 && cf >= hf) continue;
    ctx.moveTo(cx + x0 * u, base - h0 * u);
    ctx.lineTo(cx + x1 * u, base - h1 * u);
    ctx.lineTo(cx + x1 * u, base - c1 * u);
    ctx.lineTo(cx + xf * u, base - cf * u);
    ctx.closePath();
  }
  ctx.fill();
}

// ---------------------------------------------------------------- the far town

/** The far town on the ridge's right shoulder, from TOWN_X0 (u) out, where the ridge runs nearly level. */
const TOWN_X0 = 0.405;
/** Its gables: center X, half width, wall height, roof rise (u). */
const HOUSES = Array.from({ length: 6 }, (_, i) => ({
  x: TOWN_X0 + 0.012 + i * 0.019 + hash(i + 5100) * 0.004,
  hw: 0.006 + hash(i + 5200) * 0.003,
  h: 0.012 + hash(i + 5300) * 0.008,
  rise: 0.008 + hash(i + 5400) * 0.004,
}));
/** The grain elevator: its silos' X (u) and their half width, height; the headhouse on top. */
const ELEVATOR_X = 0.448;
const SILO_HW = 0.0055;
const SILOS = 4;
const SILO_H = 0.085;
const HEAD_H = 0.03;
/** The far town's spire and its water tank. */
const SPIRE_X = 0.425;
const TANK_X = 0.497;

/** The far town: a row of gables, the grain elevator, a spire and a water tank, one pale ink and its shade. */
function farTown(ctx: Ctx, s: Scene, tone: Tone, base: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  if (cx + TOWN_X0 * u > s.cssW) return;
  const ground = (X: number) => base - ridgeAt(X) * u + u * 0.004;
  ctx.fillStyle = tone.farTown;
  ctx.beginPath();
  for (const hs of HOUSES) {
    const x = cx + hs.x * u;
    const g = ground(hs.x);
    ctx.rect(x - hs.hw * u, g - hs.h * u, hs.hw * 2 * u, hs.h * u);
    ctx.moveTo(x - hs.hw * u * 1.2, g - hs.h * u + 0.5);
    ctx.lineTo(x, g - (hs.h + hs.rise) * u);
    ctx.lineTo(x + hs.hw * u * 1.2, g - hs.h * u + 0.5);
    ctx.closePath();
  }
  // The elevator's silos, its headhouse and the leg up its side.
  const eg = ground(ELEVATOR_X);
  const ex = cx + ELEVATOR_X * u;
  for (let i = 0; i < SILOS; i++) {
    const sx = ex + (i - (SILOS - 1) / 2) * SILO_HW * 2 * u;
    ctx.rect(sx - SILO_HW * u, eg - SILO_H * u, SILO_HW * 2 * u - 0.5, SILO_H * u);
  }
  ctx.rect(ex - SILO_HW * 1.6 * u, eg - (SILO_H + HEAD_H) * u, SILO_HW * 3.2 * u, HEAD_H * u + 1);
  ctx.moveTo(ex - SILO_HW * 2 * u, eg - (SILO_H + HEAD_H) * u);
  ctx.lineTo(ex, eg - (SILO_H + HEAD_H + 0.012) * u);
  ctx.lineTo(ex + SILO_HW * 2 * u, eg - (SILO_H + HEAD_H) * u);
  ctx.closePath();
  // The spire and the tank on its legs.
  const sg = ground(SPIRE_X);
  const spx = cx + SPIRE_X * u;
  ctx.rect(spx - u * 0.005, sg - u * 0.035, u * 0.01, u * 0.035);
  ctx.moveTo(spx - u * 0.005, sg - u * 0.035);
  ctx.lineTo(spx, sg - u * 0.068);
  ctx.lineTo(spx + u * 0.005, sg - u * 0.035);
  ctx.closePath();
  const tg = ground(TANK_X);
  const tx = cx + TANK_X * u;
  ctx.rect(tx - u * 0.008, tg - u * 0.048, u * 0.016, u * 0.014);
  ctx.rect(tx - u * 0.006, tg - u * 0.034, u * 0.0016, u * 0.034);
  ctx.rect(tx + u * 0.0044, tg - u * 0.034, u * 0.0016, u * 0.034);
  ctx.fill();
  // The shade: the silos' right halves, the headhouse's, the gables' right walls.
  ctx.fillStyle = tone.farTownShade;
  ctx.beginPath();
  for (let i = 0; i < SILOS; i++) {
    const sx = ex + (i - (SILOS - 1) / 2) * SILO_HW * 2 * u;
    ctx.rect(sx + SILO_HW * 0.1 * u, eg - SILO_H * u, SILO_HW * 0.8 * u, SILO_H * u);
  }
  ctx.rect(ex + SILO_HW * 0.4 * u, eg - (SILO_H + HEAD_H) * u, SILO_HW * 1.2 * u, HEAD_H * u);
  for (const hs of HOUSES) {
    const x = cx + hs.x * u;
    ctx.rect(x + hs.hw * u * 0.2, ground(hs.x) - hs.h * u, hs.hw * u * 0.8, hs.h * u);
  }
  ctx.rect(spx + u * 0.001, sg - u * 0.035, u * 0.004, u * 0.035);
  ctx.fill();
}

// ---------------------------------------------------------------- the farm hills

/** The farm hills' crest: low behind the column, swelling up toward the sides like a bowl round the town, higher on the right (the sun's on the left). */
function farmHeight(X: number): number {
  const a = Math.abs(X);
  const wob = 0.018 * Math.sin(X * 7.4 + 1.1) * smooth(0.12, 0.3, a) + 0.008 * Math.sin(X * 17 + 2);
  return X > 0 ? 0.02 + 0.27 * smooth(0.12, 0.62, a) + wob : 0.02 + 0.19 * smooth(0.12, 0.5, a) + wob;
}

/**
 * The contour stripes: each one's depth under the crest (u, growing toward us as the hill
 * swells), and which ink: 0 field (the hill's own), 1 wheat, 2 furrows; a hedgerow (3) runs
 * along the top of some. Only out in the lanes: from STRIPE_FROM (u) out.
 */
const STRIPES = [
  [0.008, 3],
  [0.013, 1],
  [0.034, 0],
  [0.05, 2],
  [0.07, 3],
  [0.076, 1],
  [0.104, 0],
  [0.122, 2],
  [0.15, 0],
] as const;
const STRIPE_FROM = 0.16;
/** How far down a stripe's depth sinks where the hill is low (it thins toward the column). */
const STRIPE_SINK = 0.6;

/** A path along the farm hills' crest from x0 to x1 (screen px), `d` u below it, scaled by the hill's swell there; the way back along `d2`. */
function contour(ctx: Ctx, s: Scene, base: number, x0: number, x1: number, d: number, d2: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const step = u * HILL_STEP * 1.5;
  // A stripe runs on no lower than a hair under the near hill, which covers the rest.
  const y = (x: number, dd: number) => {
    const X = (x - cx) / u;
    const h = farmHeight(X);
    return Math.min(base - h * u + dd * u * (1 - STRIPE_SINK + (STRIPE_SINK * h) / 0.19), base - (nearHeight(X) - TUCK) * u);
  };
  ctx.moveTo(x0, y(x0, d));
  for (let x = x0 + step; x < x1; x += step) ctx.lineTo(x, y(x, d));
  ctx.lineTo(x1, y(x1, d));
  ctx.lineTo(x1, y(x1, d2));
  for (let x = x1 - step; x > x0; x -= step) ctx.lineTo(x, y(x, d2));
  ctx.lineTo(x0, y(x0, d2));
  ctx.closePath();
}

/** The farm hills: the field green down to the near hill, then the contour stripes of wheat, furrows and hedgerows out in both lanes. */
function farmHills(ctx: Ctx, s: Scene, tone: Tone, base: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  stratum(ctx, s, base, tone.field, farmHeight, nearHeight, null);
  const inner = STRIPE_FROM * u;
  if (cx - inner < 0) return;
  for (let ink = 1; ink <= 3; ink++) {
    ctx.fillStyle = ink === 1 ? tone.wheat : ink === 2 ? tone.furrow : tone.hedgerow;
    ctx.beginPath();
    for (let k = 0; k < STRIPES.length - 1; k++) {
      if (STRIPES[k]![1] !== ink) continue;
      const d0 = STRIPES[k]![0];
      const d1 = ink === 3 ? d0 + 0.006 : STRIPES[k + 1]![0];
      contour(ctx, s, base, -1, cx - inner, d0, d1);
      contour(ctx, s, base, cx + inner, s.cssW + 1, d0, d1);
    }
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the near hill and the park

function nearHeight(X: number): number {
  return 0.032 + 0.018 * Math.sin(X * 5.1 + 2.3) + 0.009 * Math.sin(X * 12.7 + 1.0);
}

/** The park's tree line on the right: round canopies along the near hill, from PARK_FROM out past the edge. */
const PARK_FROM = 0.4;
const PARK_TREES = Array.from({ length: 14 }, (_, i) => ({
  x: PARK_FROM + i * 0.065 + hash(i + 3100) * 0.03,
  r: 0.028 + hash(i + 3200) * 0.018,
  h: 0.018 + hash(i + 3300) * 0.025,
}));
/** Woods along the near hill at the left: little round crowns. */
const WOODS = Array.from({ length: 22 }, (_, i) => ({ x: -0.23 - i * 0.05 - hash(i + 3900) * 0.02, r: 0.012 + hash(i + 3950) * 0.01 }));

/** The near hill with its woods on the left and the park's tree line on the right, filled down to `bottom`. */
function nearHill(ctx: Ctx, s: Scene, tone: Tone, base: number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const step = u * HILL_STEP * 1.2;
  ctx.fillStyle = tone.woods;
  ctx.beginPath();
  for (const w of WOODS) {
    const x = cx + w.x * u;
    if (x + w.r * u < 0) break;
    circle(ctx, x, base - (nearHeight(w.x) + w.r * 0.6) * u, w.r * u);
  }
  ctx.fill();
  ctx.fillStyle = tone.hill;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += step) {
    ctx.lineTo(x, base - nearHeight((x - cx) / u) * u);
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.treeFar;
  ctx.beginPath();
  for (const t of PARK_TREES) {
    const x = cx + t.x * u;
    if (x - t.r * u > s.cssW) break;
    circle(ctx, x, base - (t.h + t.r) * u, t.r * u);
    ctx.rect(x - t.r * u * 0.5, base - (t.h + t.r) * u, t.r * u, (t.h + t.r) * u + 1);
  }
  ctx.fill();
}

/** What covers the far range and the ridge: the highest of the layers in front of each. */
function beforeRange(X: number): number {
  return Math.max(ridgeAt(X), beforeRidge(X));
}
function beforeRidge(X: number): number {
  return Math.max(farmHeight(X), nearHeight(X));
}

/** The whole country, back to front, the near hill filled down to `bottom`: the far range, the ridge and its town, the farm hills, the water tower, the near hill and the park. */
export function country(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const base = s.horizonY + s.u * HILL_BASE;
  stratum(ctx, s, base, tone.farRange, rangeAt, beforeRange, RANGE);
  facets(ctx, s, base, RANGE, tone.farRangeShade, beforeRange);
  stratum(ctx, s, base, tone.ridge, ridgeAt, beforeRidge, RIDGE);
  facets(ctx, s, base, RIDGE, tone.ridgeShade, beforeRidge);
  farTown(ctx, s, tone, base);
  farmHills(ctx, s, tone, base);
  waterTower(ctx, s, tone, s.horizonY);
  nearHill(ctx, s, tone, base, bottom);
}
