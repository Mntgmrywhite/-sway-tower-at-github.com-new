import { alpha, hash, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { HOLO, LOW_STRIPS, SIGNS } from "./city";
import { BASE_BAR, BLUE, CYAN, MAGENTA, PINK, PURPLE, WINDOW_COLORS } from "./colors";
import { noodleStall, parkedCar, puddle, steamVent, streetLamp, umbrellaWalker, vending } from "./props";
import { farRain, splashes } from "./weather";

// The street around the tower, drawn on the wet floor behind the tower: shimmering reflections
// of the neon signs, street props on both sides of the tower's column, splashes and rain.

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

/**
 * A reflection on wet asphalt: a column of short horizontal ripples from y0 down to y1,
 * wobbling sideways, fading with distance from the source.
 */
export function shimmer(ctx: Ctx, s: Scene, x: number, y0: number, y1: number, w: number, color: string, a: number, seed: number): void {
  if (y0 > s.cssH || y1 < s.horizonY) return;
  const top = Math.max(y0, s.horizonY + 1);
  const bottom = Math.min(y1, s.cssH);
  const step = Math.max(2.5, s.u * 0.008);
  ctx.beginPath();
  for (let y = top, i = 0; y < bottom; y += step, i++) {
    const f = (y - y0) / Math.max(1, y1 - y0);
    const half = w * (0.35 + 0.35 * hash(seed + i * 1.7)) * (0.75 + 0.25 * Math.sin(s.t * 2.6 + i * 1.3 + seed));
    const dx = Math.sin(s.t * 1.7 + i * 0.9 + seed) * w * 0.12;
    if (hash(seed * 3.3 + i) < 0.18 + f * 0.3) continue;
    ctx.moveTo(x + dx - half, y);
    ctx.lineTo(x + dx + half, y);
  }
  ctx.strokeStyle = alpha(color, a);
  ctx.lineWidth = Math.max(1, s.u * 0.0035);
  ctx.stroke();
}

/** Reflections of the skyline's signs and billboard, mirrored under the horizon. */
function skylineReflections(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const hy = s.horizonY;
  for (const sg of SIGNS) {
    const x = cx + (sg.x + sg.w / 2) * u;
    shimmer(ctx, s, x, hy + (sg.y - sg.h) * u, hy + sg.y * u * 1.05, sg.w * u * 1.6, sg.color, 0.4, sg.seed);
  }
  shimmer(ctx, s, cx + (HOLO.x + HOLO.w / 2) * u, hy + (HOLO.y - HOLO.h) * u, hy + HOLO.y * u, HOLO.w * u * 0.8, HOLO.color, 0.22, HOLO.seed);
  // The street blocks' neon strips, mirrored just under the horizon.
  for (let i = 0; i < LOW_STRIPS.length; i++) {
    const st = LOW_STRIPS[i]!;
    if (Math.abs(st.x + st.w / 2) > cx / u + 0.1) continue;
    shimmer(ctx, s, cx + (st.x + st.w / 2) * u, hy + st.h * u * 0.5, hy + st.h * u * 1.8, st.w * u, st.color, 0.38, 90 + i);
  }
  // A wet sheen of window light along the foot of the skyline.
  for (let c = 0; c < SHEEN_COLORS; c++) {
    ctx.beginPath();
    for (const d of SHEEN) {
      if (d.c !== c) continue;
      const y = hy + 2 + d.depth * d.depth * u * 0.16;
      if (y > s.cssH) continue;
      const x = cx + d.x * u + Math.sin(s.t * 1.9 + d.x * 40) * u * 0.006;
      const half = d.len * u * (0.5 + d.depth * 0.6);
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y);
    }
    ctx.strokeStyle = alpha(WINDOW_COLORS[c]!, 0.26);
    ctx.lineWidth = Math.max(1, u * 0.003);
    ctx.stroke();
  }
}

/** Sheen dashes under the skyline, in the cool window colors only. */
const SHEEN_COLORS = 3;
const SHEEN = Array.from({ length: 70 }, (_, i) => ({
  x: (hash(i + 4400) - 0.5) * 1.6,
  depth: hash(i + 4450),
  len: 0.006 + hash(i + 4500) * 0.012,
  c: Math.floor(hash(i + 4550) * SHEEN_COLORS),
}));

// Props on the floor, back to front. X is sideways in u at the tower's depth; z = 3 is the
// tower's line. Behind that line everything keeps to the side strips, clear of the tower's
// column; in front of it the props sit in the bottom corners, beside "tap to drop".
// Props that share a side either stand at the same depth (the lamp and the walker under it,
// so they keep their places as the camera climbs) or start clear above/below each other, so
// a nearer prop, sinking faster, only ever moves away from a farther one.
const STALL = { X: 0.43, z: 3.6 };
const LAMP = { X: -0.4545, z: 2.9 };
const WALKER = { X: -0.358, z: 2.9 };
const VENT = { X: 0.336, z: 2.8 };
const PUDDLES = [
  { X: 0.03, z: 2.05, rx: 0.075, ry: 0.012, rim: PURPLE },
  { X: 0.17, z: 2.75, rx: 0.05, ry: 0.008, rim: BLUE },
];
const PARKED = { X: 0.2, z: 1.9 };
const VENDING = { X: -0.1825, z: 1.5 };
const FARTHEST = STALL.z;

function props(ctx: Ctx, s: Scene): void {
  const u = s.u;
  if (fieldY(s, FARTHEST) - u * 0.4 > s.cssH) return;

  let p = spot(s, STALL.X, STALL.z);
  shimmer(ctx, s, p.x, p.y + 2, p.y + u * p.k * 0.16, u * p.k * 0.2, MAGENTA, 0.3, 61);
  noodleStall(ctx, s, p.x, p.y, u * p.k);

  p = spot(s, LAMP.X, LAMP.z);
  let U = u * p.k;
  shimmer(ctx, s, p.x + U * 0.085, p.y + 2, p.y + U * 0.2, U * 0.12, CYAN, 0.3, 64);
  streetLamp(ctx, p.x, p.y, U, 1, CYAN);
  p = spot(s, WALKER.X, WALKER.z);
  umbrellaWalker(ctx, p.x, p.y, u * p.k, CYAN, s.t, 1);

  p = spot(s, VENT.X, VENT.z);
  steamVent(ctx, s.t, p.x, p.y, u * p.k);

  p = spot(s, PARKED.X, PARKED.z);
  U = u * p.k;
  shimmer(ctx, s, p.x, p.y + 2, p.y + U * 0.1, U * 0.14, MAGENTA, 0.3, 65);
  parkedCar(ctx, s, p.x, p.y, U);

  p = spot(s, VENDING.X, VENDING.z);
  U = u * p.k;
  shimmer(ctx, s, p.x - U * 0.026, p.y + 2, p.y + U * 0.1, U * 0.045, BLUE, 0.35, 62);
  shimmer(ctx, s, p.x + U * 0.03, p.y + 2, p.y + U * 0.1, U * 0.045, PINK, 0.35, 63);
  vending(ctx, p.x, p.y, U, BLUE, PINK, s.t);
}

/** Puddles, then the base bar mirrored in the wet floor right under the tower. */
function wetFloor(ctx: Ctx, s: Scene): void {
  const u = s.u;
  for (const pd of PUDDLES) {
    const p = spot(s, pd.X, pd.z);
    if (p.y - u * 0.05 > s.cssH) continue;
    puddle(ctx, p.x, p.y, pd.rx * u * p.k, pd.ry * u * p.k, pd.rim);
  }
  if (s.baseW <= 0) return;
  shimmer(ctx, s, s.baseX + s.baseW / 2, s.groundY + 2, s.groundY + u * 0.2, s.baseW * 0.95, BASE_BAR, 0.35, 77);
}

export function street(ctx: Ctx, s: Scene): void {
  skylineReflections(ctx, s);
  wetFloor(ctx, s);
  splashes(ctx, s);
  props(ctx, s);
  farRain(ctx, s);
}
