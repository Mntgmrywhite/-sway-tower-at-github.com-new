import { hash, oval, type Ctx } from "../../base/draw";
import { tint } from "./tube";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { RAIN } from "./colors";

// Rain: thin slanted streaks falling over the city (behind the tower), a few bigger near drops
// in front of it, and splash rings popping on the wet floor.

const SLANT = 0.2; // sideways drift per pixel of fall (wind from the right)

interface Drop {
  x: number;
  phase: number;
  len: number;
  speed: number;
}

function drops(n: number, seed: number, len: number, speed: number): Drop[] {
  return Array.from({ length: n }, (_, i) => ({
    x: hash(seed + i * 1.3),
    phase: hash(seed + i * 2.7 + 0.5),
    len: len * (0.7 + hash(seed + i * 4.1) * 0.6),
    speed: speed * (0.8 + hash(seed + i * 5.9) * 0.4),
  }));
}

const FAR_RAIN = drops(84, 9100, 0.045, 1.9);
const NEAR_RAIN = drops(16, 9500, 0.09, 3.2);

function streaks(ctx: Ctx, s: Scene, list: Drop[], width: number, a: number): void {
  const u = s.u;
  const H = s.cssH;
  const span = s.cssW + SLANT * H;
  ctx.beginPath();
  for (const d of list) {
    const L = d.len * u;
    const y = ((d.phase * (H + L) + s.t * d.speed * u) % (H + L)) - L;
    const x = d.x * span - SLANT * y;
    ctx.moveTo(x, y);
    ctx.lineTo(x - SLANT * L, y + L);
  }
  ctx.strokeStyle = tint(RAIN, a);
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  ctx.stroke();
}

/** Rain over the city and the floor, behind the tower. */
export function farRain(ctx: Ctx, s: Scene): void {
  streaks(ctx, s, FAR_RAIN, Math.max(1, s.u * 0.0022), 0.19);
}

/** A few big, faint drops in front of everything. */
export function nearRain(ctx: Ctx, s: Scene): void {
  streaks(ctx, s, NEAR_RAIN, Math.max(1.2, s.u * 0.004), 0.13);
}

// Splash spots on the floor: sideways spot (u at the tower's depth), depth, timing.
const SPLASHES = Array.from({ length: 30 }, (_, i) => ({
  X: (hash(i + 9900) - 0.5) * 2.4,
  z: 1.3 + hash(i + 9950) * 9,
  period: 0.7 + hash(i + 9990) * 0.8,
  offset: hash(i + 10030) * 3,
}));

/** Splash rings on the wet floor, each spot popping on its own beat. */
export function splashes(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (const sp of SPLASHES) {
    const y = fieldY(s, sp.z);
    if (y > s.cssH + 4 || y < s.horizonY + 2) continue;
    const k = TOWER_DEPTH / sp.z;
    const x = cx + sp.X * u * k;
    if (x < -10 || x > s.cssW + 10) continue;
    const p = ((s.t + sp.offset) % sp.period) / sp.period;
    if (p > 0.45) continue;
    const r = u * 0.02 * k * (0.2 + p * 1.8);
    oval(ctx, x, y, r, r * 0.28);
  }
  ctx.strokeStyle = tint(RAIN, 0.3);
  ctx.lineWidth = Math.max(0.8, u * 0.002);
  ctx.stroke();
}
