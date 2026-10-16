import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import type { Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), a spring sun up on
// the left (pale behind the shower, amber in the golden evening) that sinks into the cloud
// floor at sunset, then a crescent moon on the right and the stars. Celestial things are far
// away: flat fills, no outline, a flat halo instead of a glow.

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

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the cloud floor's top). `r` is the disc; its halo reaches SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * 0.056;
  const y0 = s.cssH * 0.27;
  SUN.r = r0 * (1 + 0.45 * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * 0.36);
  SUN.y = y0 + (floor + SUN.r * 1.3 - y0) * k;
  return SUN;
}

export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, floor);
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  ctx.fillStyle = tone.sunShade;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.sunBody;
  ctx.beginPath();
  circle(ctx, x - r * 0.07, y - r * 0.09, r * 0.9);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  oval(ctx, x - r * 0.38, y - r * 0.42, r * 0.24, r * 0.15, -0.6);
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

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it sparkles. */
const STARS = Array.from({ length: 48 }, (_, i) => ({
  x: hash(i * 3 + 5700),
  y: 0.03 + hash(i * 3 + 5701) * 0.72,
  r: 0.0028 + hash(i * 3 + 5702) * 0.0034,
  g: i % 3,
  big: hash(i + 5900) > 0.85,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;
/** Stars keep this far (u) in from the screen's sides, so no sparkle is cut in half by an edge. */
const STAR_MARGIN = 0.022;

/** Stars over the night sky in three twinkle groups (one fill each). */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  ctx.fillStyle = "#fff8e0";
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = tone.stars * (0.62 + 0.38 * Math.sin(s.t * 0.9 + g * 2.1));
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = edge + st.x * span;
      if (x > c0 && x < c1) continue;
      const y = st.y * s.cssH;
      const r = st.r * u;
      if (st.big) sparkle(ctx, x, y, r * 2.6);
      else circle(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A four-point sparkle as its own subpath. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  const w = r * 0.24;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + w, y - w, x + r, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + r);
  ctx.quadraticCurveTo(x - w, y + w, x - r, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - r);
  ctx.closePath();
}
