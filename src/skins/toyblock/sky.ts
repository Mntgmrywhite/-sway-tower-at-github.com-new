import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import type { Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), a wooden-toy sun up on
// the left (a round disc in a ring of rounded rays, turning very slowly) that sinks into the
// block clouds at sunset, then a crescent moon on the right and little five-point stars, like
// the ones on a nursery mobile. Far away: flat fills, no outline.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.4, 0.7, 0.92] as const;

/** The sky gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

/**
 * Paint the sky down to `bottom` (everything below it is covered by the hills and the meadow,
 * or the cloud floor). Gradient fills are the costliest thing in the scene, so it stops there.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  if (cache.ctx !== ctx || cache.step !== step || cache.h !== s.cssH || !cache.fill) {
    const g = ctx.createLinearGradient(0, 0, 0, s.cssH);
    for (let i = 0; i < STOPS.length; i++) g.addColorStop(STOPS[i]!, tone.sky[i]!);
    cache.ctx = ctx;
    cache.step = step;
    cache.h = s.cssH;
    cache.fill = g;
  }
  ctx.fillStyle = cache.fill;
  ctx.fillRect(0, 0, s.cssW, Math.min(s.cssH, Math.ceil(bottom)));
}

// ---------------------------------------------------------------- sun

/** Scratch results of `sunAt` / `moonAt`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** How far the rays reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.62;

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the cloud floor's top). `r` is the disc; its rays reach SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * 0.05;
  const y0 = s.cssH * 0.27;
  SUN.r = r0 * (1 + 0.4 * k);
  SUN.x = Math.max(r0 * SUN_REACH + s.u * 0.02, s.cssW / 2 - s.u * 0.36);
  SUN.y = y0 + (floor + SUN.r * SUN_REACH - y0) * k;
  return SUN;
}

const RAYS = 10;

export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, floor);
  // Rounded rays: one stroke of short round-capped spokes, turning very slowly.
  const spin = s.t * 0.05;
  const w = r * 0.3;
  ctx.beginPath();
  for (let i = 0; i < RAYS; i++) {
    const a = spin + (i / RAYS) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    ctx.moveTo(x + c * r * 1.2, y + sn * r * 1.2);
    ctx.lineTo(x + c * (SUN_REACH * r - w / 2), y + sn * (SUN_REACH * r - w / 2));
  }
  ctx.strokeStyle = tone.sunRay;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = tone.sunShade;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.sunBody;
  ctx.beginPath();
  circle(ctx, x - r * 0.07, y - r * 0.09, r * 0.88);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  oval(ctx, x - r * 0.36, y - r * 0.4, r * 0.24, r * 0.15, -0.6);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the right, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.min(s.cssW - MOON_AT.r * 2, s.cssW / 2 + s.u * 0.36);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

const MOON = "#fff3c8";
const MOON_SHADE = "#efd99c";

/** A crescent moon up on the right, fading in at dusk. The bite is painted with the sky itself. */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0 || !cache.fill) return;
  const { x, y, r } = moonAt(s);
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x - r * 0.06, y - r * 0.06, r * 0.9);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = cache.fill;
  ctx.beginPath();
  circle(ctx, x + r * 0.5, y - r * 0.28, r * 0.86);
  ctx.fill();
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it is a big five-point star. */
const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: hash(i * 3 + 2700),
  y: 0.03 + hash(i * 3 + 2701) * 0.72,
  r: 0.0026 + hash(i * 3 + 2702) * 0.0032,
  g: i % 3,
  big: hash(i + 2900) > 0.84,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;

/** Stars over the night sky in three twinkle groups (one fill each). */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  ctx.fillStyle = "#fff8e0";
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = tone.stars * (0.64 + 0.36 * Math.sin(s.t * 0.8 + g * 2.1));
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = st.x * s.cssW;
      const y = st.y * s.cssH;
      // Nothing twinkles behind the tower.
      if (x > c0 && x < c1) continue;
      const r = st.r * u;
      if (st.big) starPath(ctx, x, y, r * 2.8);
      else circle(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A plump five-point star as its own subpath. */
export function starPath(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const k = i % 2 ? r * 0.48 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    else ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
}
