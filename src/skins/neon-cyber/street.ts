import { alpha, hash, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { heroFoot, HOLO, SIGNS, STRIP_COLORS } from "./city";
import { BASE_BAR, BLUE, CYAN, MAGENTA, PINK, PURPLE, WINDOW_COLORS } from "./colors";
import { noodleStall, parkedCar, puddle, streetLamp, umbrellaWalker, vending } from "./props";
import { COLUMN } from "./sky";
import type { Tone } from "./tone";
import { splashes } from "./weather";

// The street the tower stands on: wet asphalt from the foot of the megacity's towers to the
// bottom of the screen, mirroring their signs and windows in shimmering ripples, with puddles,
// splashes, and street life on both sides of the tower's column: a lamp with a pedestrian under a
// glowing umbrella, a steaming noodle stall, and in front, vending machines and a parked hover
// car. Behind the tower everything on the street holds still.

/** Scratch point for `spot()`, reused so placing props allocates nothing per frame. */
const P = { x: 0, y: 0, k: 1 };

/** A spot on the floor: X sideways in u at the tower's depth, z depth (3 = the tower's line). */
export function spot(s: Scene, X: number, z: number): typeof P {
  const k = TOWER_DEPTH / z;
  P.x = s.cssW / 2 + X * s.u * k;
  P.y = fieldY(s, z);
  P.k = k;
  return P;
}

/** The asphalt gradient only changes with the screen height (or a new context). */
const cache = { ctx: null as Ctx | null, h: -1, fill: null as CanvasGradient | null };
const ASPHALT_FAR = "#1b1030";
const ASPHALT_NEAR = "#050409";

function asphalt(ctx: Ctx, s: Scene, top: number): void {
  if (cache.ctx !== ctx || cache.h !== s.cssH || !cache.fill) {
    const g = ctx.createLinearGradient(0, s.cssH * 0.5, 0, s.cssH);
    g.addColorStop(0, ASPHALT_FAR);
    g.addColorStop(1, ASPHALT_NEAR);
    cache.ctx = ctx;
    cache.h = s.cssH;
    cache.fill = g;
  }
  ctx.fillStyle = cache.fill;
  ctx.fillRect(0, top, s.cssW, s.cssH - top);
}

/**
 * A reflection on wet asphalt, added to the current path: a column of short horizontal ripples
 * from y0 down to y1, thinning out with distance from the source. `still` ripples hold their
 * shape (behind the tower); the others wobble.
 */
function shimmerPath(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, w: number, seed: number, still = false): void {
  if (y0 > s.cssH) return;
  const bottom = Math.min(y1, s.cssH);
  const step = Math.max(2.5, s.u * 0.008);
  const t = still ? 0 : s.t;
  for (let y = y0, i = 0; y < bottom; y += step, i++) {
    const f = (y - y0) / Math.max(1, y1 - y0);
    if (hash(seed * 3.3 + i) < 0.18 + f * 0.3) continue;
    const half = w * (0.35 + 0.35 * hash(seed + i * 1.7)) * (0.75 + 0.25 * Math.sin(t * 2.6 + i * 1.3 + seed));
    const dx = Math.sin(t * 1.7 + i * 0.9 + seed) * w * 0.12;
    ctx.moveTo(x + dx - half, y);
    ctx.lineTo(x + dx + half, y);
  }
}

function strokeShimmer(ctx: Ctx, s: Scene, style: string): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = Math.max(1, s.u * 0.0035);
  ctx.stroke();
}

/** One reflection, stroked on its own in `style` (a color with its alpha). */
export function shimmer(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, w: number, style: string, seed: number): void {
  ctx.beginPath();
  shimmerPath(ctx, s, x, y0, y1, w, seed);
  strokeShimmer(ctx, s, style);
}

// Reflection tints, made once.
const REFLECT = STRIP_COLORS.map((c) => alpha(c, 0.36));
const HOLO_REFLECT = alpha(HOLO.color, 0.22);
const SHEEN_STYLES = WINDOW_COLORS.map((c) => alpha(c, 0.24));
const MAGENTA_REFLECT = alpha(MAGENTA, 0.3);
const CYAN_REFLECT = alpha(CYAN, 0.3);
const BLUE_REFLECT = alpha(BLUE, 0.35);
const PINK_REFLECT = alpha(PINK, 0.35);
const BASE_REFLECT = alpha(BASE_BAR, 0.35);

/** Sheen dashes of window light under the towers, in the cool window colors only: x (u), depth, length, color. */
const SHEEN_COLORS = 3;
const SHEEN = Array.from({ length: 64 }, (_, i) => ({
  x: (hash(i + 4400) - 0.5) * 1.5,
  depth: hash(i + 4450),
  len: 0.006 + hash(i + 4500) * 0.012,
  c: Math.floor(hash(i + 4550) * SHEEN_COLORS),
}));

/** The megacity's signs, billboard and windows mirrored in the wet street under the towers' foot. */
function reflections(ctx: Ctx, s: Scene, foot: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const still = u * (COLUMN + 0.02);
  for (let c = 0; c < STRIP_COLORS.length; c++) {
    ctx.beginPath();
    for (const sg of SIGNS) {
      if (sg.c !== c) continue;
      const x = cx + (sg.x + sg.w / 2) * u;
      shimmerPath(ctx, s, x, foot + (sg.y - sg.h) * u * 0.8, foot + sg.y * u * 0.85, sg.w * u * 1.6, sg.seed);
    }
    strokeShimmer(ctx, s, REFLECT[c]!);
  }
  ctx.beginPath();
  shimmerPath(ctx, s, cx + (HOLO.x + HOLO.w / 2) * u, foot + (HOLO.y - HOLO.h) * u * 0.8, foot + HOLO.y * u * 0.85, HOLO.w * u * 0.8, HOLO.seed);
  strokeShimmer(ctx, s, HOLO_REFLECT);
  // A wet sheen of window light along the foot of the towers; behind the tower it holds still.
  for (let c = 0; c < SHEEN_COLORS; c++) {
    ctx.beginPath();
    for (const d of SHEEN) {
      if (d.c !== c) continue;
      const y = foot + 2 + d.depth * d.depth * u * 0.14;
      if (y > s.cssH) continue;
      const x0 = cx + d.x * u;
      const half = d.len * u * (0.5 + d.depth * 0.6);
      const x = Math.abs(x0 - cx) < still + half ? x0 : x0 + Math.sin(s.t * 1.9 + d.x * 40) * u * 0.006;
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y);
    }
    ctx.strokeStyle = SHEEN_STYLES[c]!;
    ctx.lineWidth = Math.max(1, u * 0.003);
    ctx.stroke();
  }
}

// Props on the floor, back to front. X is sideways in u at the tower's depth; z = 3 is the
// tower's line. Behind that line everything keeps to the side strips, clear of the tower's
// column; in front of it the props sit in the bottom corners, beside "tap to drop".
// Props that share a side either stand at the same depth (the lamp and the walker under it,
// so they keep their places as the camera climbs) or start clear above/below each other, so
// a nearer prop, sinking faster, only ever moves away from a farther one.
const STALL = { X: 0.455, z: 3.6 };
const LAMP = { X: -0.4545, z: 2.9 };
const WALKER = { X: -0.358, z: 2.9 };
const PUDDLES = [
  { X: 0.03, z: 2.05, rx: 0.075, ry: 0.012, rim: PURPLE },
  { X: 0.17, z: 2.75, rx: 0.05, ry: 0.008, rim: BLUE },
  { X: -0.12, z: 4.2, rx: 0.06, ry: 0.006, rim: MAGENTA },
];
const PARKED = { X: 0.2, z: 1.9 };
const VENDING = { X: -0.1825, z: 1.5 };
const FARTHEST = STALL.z;

/** The stall, with its reflection. */
export function stall(ctx: Ctx, s: Scene): void {
  const p = spot(s, STALL.X, STALL.z);
  shimmer(ctx, s, p.x, p.y + 2, p.y + s.u * p.k * 0.09, s.u * p.k * 0.2, MAGENTA_REFLECT, 61);
  noodleStall(ctx, s, p.x, p.y, s.u * p.k);
}

/** The street lamp and its light on the wet floor. */
export function lamp(ctx: Ctx, s: Scene): void {
  const p = spot(s, LAMP.X, LAMP.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x + U * 0.085, p.y + 2, p.y + U * 0.025, U * 0.12, CYAN_REFLECT, 64);
  streetLamp(ctx, p.x, p.y, U, 1, CYAN);
}

/** The pedestrian under a glowing umbrella. */
export function walker(ctx: Ctx, s: Scene): void {
  const p = spot(s, WALKER.X, WALKER.z);
  umbrellaWalker(ctx, p.x, p.y, s.u * p.k, CYAN, s.t, 1);
}

/** The parked hover car, and its underglow on the wet floor. */
export function parked(ctx: Ctx, s: Scene): void {
  const p = spot(s, PARKED.X, PARKED.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x, p.y + 2, p.y + U * 0.1, U * 0.14, MAGENTA_REFLECT, 65);
  parkedCar(ctx, s, p.x, p.y, U);
}

/** The pair of vending machines. */
export function machines(ctx: Ctx, s: Scene): void {
  const p = spot(s, VENDING.X, VENDING.z);
  const U = s.u * p.k;
  shimmer(ctx, s, p.x - U * 0.026, p.y + 2, p.y + U * 0.1, U * 0.045, BLUE_REFLECT, 62);
  shimmer(ctx, s, p.x + U * 0.03, p.y + 2, p.y + U * 0.1, U * 0.045, PINK_REFLECT, 63);
  vending(ctx, p.x, p.y, U, BLUE, PINK, s.t);
}

/** Every street prop, back to front (the layout test draws them one by one). */
export const PROPS = [stall, lamp, walker, parked, machines] as const;

/**
 * The wet street floor behind the tower: asphalt from the towers' foot down, their reflections,
 * puddles, the base bar mirrored under the tower and the rain's splashes.
 */
export function streetFloor(ctx: Ctx, s: Scene, tone: Tone): void {
  const foot = heroFoot(s);
  if (foot > s.cssH) return;
  const top = Math.max(0, foot - 1);
  asphalt(ctx, s, top);
  reflections(ctx, s, foot);
  const u = s.u;
  for (const pd of PUDDLES) {
    const p = spot(s, pd.X, pd.z);
    if (p.y - u * 0.05 > s.cssH) continue;
    puddle(ctx, p.x, p.y, pd.rx * u * p.k, pd.ry * u * p.k, pd.rim);
  }
  if (s.baseW > 0) {
    ctx.beginPath();
    shimmerPath(ctx, s, s.baseX + s.baseW / 2, s.groundY + 2, s.groundY + u * 0.2, s.baseW * 0.95, 77);
    strokeShimmer(ctx, s, BASE_REFLECT);
  }
  splashes(ctx, s, tone);
}

/** The props on the street, back to front. */
export function streetProps(ctx: Ctx, s: Scene): void {
  if (fieldY(s, FARTHEST) - s.u * 0.4 > s.cssH) return;
  for (const draw of PROPS) draw(ctx, s);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}
