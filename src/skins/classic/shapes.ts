import { circle, type Ctx } from "../../base/draw";

// Shapes shared by the home island and everything drifting past: the island's grass cap and
// striped underside, flat-bottomed cel-shaded clouds, and a far-off bird. Paths only; callers
// pick the colors (inked up close, faded far away).

// ---------------------------------------------------------------- islands

/**
 * The underside of a floating island hanging from the line `top` (cx - hw .. cx + hw), `d`
 * deep: a chunky, lopsided cone that steps in twice and ends in a round tip. `m` = -1 mirrors it.
 * Starts its own path.
 */
export function undersidePath(ctx: Ctx, cx: number, top: number, hw: number, d: number, m = 1): void {
  const X = (k: number) => cx + k * hw * m;
  const Y = (k: number) => top + k * d;
  ctx.beginPath();
  ctx.moveTo(X(-1), Y(0));
  ctx.quadraticCurveTo(X(-1.02), Y(0.3), X(-0.78), Y(0.44));
  ctx.quadraticCurveTo(X(-0.56), Y(0.56), X(-0.46), Y(0.74));
  ctx.quadraticCurveTo(X(-0.3), Y(1.04), X(-0.04), Y(1));
  ctx.quadraticCurveTo(X(0.2), Y(0.97), X(0.3), Y(0.74));
  ctx.quadraticCurveTo(X(0.42), Y(0.5), X(0.72), Y(0.4));
  ctx.quadraticCurveTo(X(1.02), Y(0.3), X(1), Y(0));
  ctx.closePath();
}

/** One stratum: its colors, and where its top edge runs (fraction of the depth). */
export interface Band {
  body: string;
  lit: string;
  at: number;
}

const WAVE_SEGS = 10;

/** The wavy top edge of a stratum, as a polyline from left to right (continues the path). */
function waveLine(ctx: Ctx, cx: number, y: number, hw: number, amp: number, phase: number): void {
  for (let i = 0; i <= WAVE_SEGS; i++) {
    const k = i / WAVE_SEGS;
    const x = cx - hw * 1.05 + hw * 2.1 * k;
    const yy = y + Math.sin(k * 7.5 + phase) * amp;
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
}

/**
 * Fill the current clip with horizontal strata hanging from `top`, `d` deep: each band is a
 * flat color with a lit strip along its wavy top edge. Call inside a clip to the underside.
 */
export function strata(ctx: Ctx, cx: number, top: number, hw: number, d: number, bands: readonly Band[]): void {
  const amp = d * 0.035;
  const bottom = top + d * 1.1;
  const strip = Math.max(1, d * 0.055);
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]!;
    const y = top + b.at * d;
    ctx.beginPath();
    waveLine(ctx, cx, y, hw, amp, i * 1.9);
    ctx.lineTo(cx + hw * 1.05, bottom);
    ctx.lineTo(cx - hw * 1.05, bottom);
    ctx.closePath();
    ctx.fillStyle = b.body;
    ctx.fill();
    if (i === 0) continue;
    ctx.beginPath();
    waveLine(ctx, cx, y + strip / 2, hw, amp, i * 1.9);
    ctx.strokeStyle = b.lit;
    ctx.lineWidth = strip;
    ctx.stroke();
  }
}

/**
 * An island's underside in curved strata without a clip (for the islands further off, drawn
 * many times a frame): the whole underside in the lowest band's color, then shallower copies of
 * it for the bands above, each with a lit strip just under the band above it. `bands` top to
 * bottom; their `at` is where each band begins (fraction of the depth).
 */
export function nestedStrata(ctx: Ctx, cx: number, top: number, hw: number, d: number, m: number, bands: readonly Band[]): void {
  const strip = d * 0.06;
  for (let i = bands.length - 1; i >= 0; i--) {
    const b = bands[i]!;
    const depth = i === bands.length - 1 ? d : bands[i + 1]!.at * d;
    if (i < bands.length - 1) {
      undersidePath(ctx, cx, top, hw, depth + strip, m);
      ctx.fillStyle = bands[i + 1]!.lit;
      ctx.fill();
    }
    undersidePath(ctx, cx, top, hw, depth, m);
    ctx.fillStyle = b.body;
    ctx.fill();
  }
}

/**
 * The grass cap of an island: a flat top at `top` with rounded ends, `h` thick, its lower edge
 * hanging over the soil in `bumps` round scallops. Starts its own path.
 */
export function capPath(ctx: Ctx, cx: number, top: number, hw: number, h: number, bumps: number): void {
  const r = h * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - hw, top + r);
  ctx.quadraticCurveTo(cx - hw, top, cx - hw + r, top);
  ctx.lineTo(cx + hw - r, top);
  ctx.quadraticCurveTo(cx + hw, top, cx + hw, top + r);
  ctx.lineTo(cx + hw, top + h * 0.75);
  const step = (hw * 2) / bumps;
  for (let i = 0; i < bumps; i++) {
    const x0 = cx + hw - step * i;
    const deep = i % 2 ? 0.42 : 0.62;
    ctx.quadraticCurveTo(x0 - step / 2, top + h * (1 + deep), x0 - step, top + h * 0.75);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- clouds

/** A cloud's puffs as [dx, dy, r] in units of its size; the lowest sit on its flat bottom, dy = 0.3. */
export type CloudShape = readonly (readonly [number, number, number])[];

/** A long low cloud for the sides of the screen. */
export const LONG_CLOUD: CloudShape = [
  [-1.3, -0.2, 0.5],
  [-0.7, -0.42, 0.72],
  [0.05, -0.6, 0.9],
  [0.8, -0.38, 0.68],
  [1.35, -0.16, 0.46],
];
/** A rounder, taller cloud. */
export const TALL_CLOUD: CloudShape = [
  [-0.85, -0.25, 0.55],
  [-0.3, -0.62, 0.7],
  [0.32, -0.85, 0.8],
  [0.9, -0.28, 0.58],
  [0.25, -0.32, 0.62],
];

/** A big cumulus: a tall heap of puffs over a broad base. */
export const BIG_CLOUD: CloudShape = [
  [-1.15, -0.18, 0.5],
  [-0.62, -0.5, 0.68],
  [-0.05, -0.95, 0.78],
  [0.45, -0.62, 0.72],
  [1.05, -0.24, 0.52],
  [0.1, -0.3, 0.66],
];

/** The flat base of a cloud shape: [left, right] in units of its size. */
function baseOf(shape: CloudShape): [number, number] {
  let l = Infinity;
  let r = -Infinity;
  for (const [dx, , dr] of shape) {
    l = Math.min(l, dx - dr * 0.6);
    r = Math.max(r, dx + dr * 0.6);
  }
  return [l, r];
}
const BASES = new Map<CloudShape, [number, number]>([
  [LONG_CLOUD, baseOf(LONG_CLOUD)],
  [TALL_CLOUD, baseOf(TALL_CLOUD)],
  [BIG_CLOUD, baseOf(BIG_CLOUD)],
]);

function cloudLayer(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, k: number, dy: number): void {
  ctx.beginPath();
  for (const [px, py, pr] of shape) circle(ctx, x + px * r, y + (py + dy) * r, pr * r * k);
  const base = BASES.get(shape);
  if (base) {
    const h = r * 0.34 * k;
    pill(ctx, x + base[0] * r, y + (0.3 + dy) * r - h, (base[1] - base[0]) * r, h);
  }
}

/** A horizontal pill as its own subpath (no beginPath, so it can share a fill). */
function pill(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const r = Math.min(h, w) / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.closePath();
}

/**
 * A flat-bottomed, cel-shaded cloud at (x, y) of size r: the shaded body, the lit body shifted
 * up so a shaded band shows along the bottom, and light caps. No outline (it is far away).
 */
export function cloud(ctx: Ctx, shape: CloudShape, x: number, y: number, r: number, shade: string, body: string, light: string): void {
  cloudLayer(ctx, shape, x, y, r, 1, 0);
  ctx.fillStyle = shade;
  ctx.fill();
  cloudLayer(ctx, shape, x, y, r, 0.94, -0.12);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  for (const [px, py, pr] of shape) {
    if (pr < 0.6) continue;
    circle(ctx, x + (px - pr * 0.22) * r, y + (py - pr * 0.42) * r, pr * r * 0.42);
  }
  ctx.fillStyle = light;
  ctx.fill();
}

// ---------------------------------------------------------------- birds

/** A far-off bird as an open "m" stroke: half wingspan g, flap -1..1. Continues the path. */
export function birdStroke(ctx: Ctx, x: number, y: number, g: number, flap: number): void {
  const tip = y - flap * g * 0.5;
  ctx.moveTo(x - g, tip);
  ctx.quadraticCurveTo(x - g * 0.45, y - g * 0.5, x, y);
  ctx.quadraticCurveTo(x + g * 0.45, y - g * 0.5, x + g, tip);
}
