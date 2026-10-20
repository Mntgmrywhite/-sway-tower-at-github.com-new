import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { sparkle } from "./shapes";
import { level, lightAt, type Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), a festival sun up on
// the left (amber in the golden evening) that sinks into the valley mist at sunset, then a
// crescent moon in the same place, lit on the side the sun set, and the stars over the Alps;
// at the loop's dawn the moon and stars fade and the sun comes back up where it set. Celestial
// things are far away: flat fills, no outline, a flat halo instead of a glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), so
// nothing ever passes over either.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.4, 0.7, 0.92] as const;

/** The sky gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

/**
 * Paint the sky down to `bottom` (everything below it is covered by the foothills and the
 * meadow, or the mist). Gradient fills are the costliest thing in the scene, so it stops there.
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
/** Where the sun and the moon hang: u left of the screen's center, and the fraction of the screen's height down. */
export const SUN_X = -0.36;
const SUN_Y = 0.27;
const MOON_Y = 0.25;

/**
 * How far the sun has set at the scene's altitude: 0 at its day spot, 1 gone into the mist. Read
 * at the exact altitude (tone.ts lightAt), never from the tone table's half-level steps, so the
 * sun glides down as the camera climbs instead of jumping every half level.
 */
export function sunSetAt(s: Scene): number {
  return lightAt(level(s)).sunSet;
}

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the mist's top), or below the bottom of the screen once the mist has
 * sunk out of view (and it comes up the same way at dawn). `r` is the disc; its halo reaches
 * SUN_REACH r. Its path is continuous in the altitude (the mist's top is too).
 */
export function sunAt(s: Scene, floor: number): typeof SUN {
  const k = sunSetAt(s);
  const r0 = s.u * 0.056;
  const y0 = s.cssH * SUN_Y;
  SUN.r = r0 * (1 + 0.45 * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 + SUN_X * s.u);
  SUN.y = y0 + (Math.min(floor, s.cssH) + SUN.r * 1.3 - y0) * k;
  return SUN;
}

export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (sunSetAt(s) >= 1) return;
  const { x, y, r } = sunAt(s, floor);
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

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 + SUN_X * s.u);
  MOON_AT.y = s.cssH * MOON_Y;
  return MOON_AT;
}

const MOON = "#fff3c8";
const MOON_SHADE = "#efd99c";

/** A crescent moon up on the left, fading in at dusk, lit low on the side the sun set. The bite is painted with the sky itself. */
export function moon(ctx: Ctx, s: Scene): void {
  const shown = lightAt(level(s)).moon;
  if (shown <= 0 || !cache.fill) return;
  const { x, y, r } = moonAt(s);
  ctx.globalAlpha = shown;
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
const STARS = Array.from({ length: 52 }, (_, i) => ({
  x: hash(i * 3 + 7700),
  y: 0.03 + hash(i * 3 + 7701) * 0.66,
  r: 0.0028 + hash(i * 3 + 7702) * 0.0034,
  g: i % 3,
  big: hash(i + 7900) > 0.85,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;
/** Stars keep this far (u) in from the screen's sides, so no sparkle is cut in half by an edge. */
const STAR_MARGIN = 0.022;

/** Stars over the night sky in three twinkle groups (one fill each), fading in with the exact altitude. */
export function stars(ctx: Ctx, s: Scene): void {
  const shown = lightAt(level(s)).stars;
  if (shown <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  // No star behind the moon either (it shows through while the moon fades in).
  const moon = moonAt(s);
  const clear = moon.r * 1.5 + u * 0.03;
  ctx.fillStyle = "#fff8e0";
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = shown * (0.62 + 0.38 * Math.sin(s.t * 0.9 + g * 2.1));
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = edge + st.x * span;
      if (x > c0 && x < c1) continue;
      const y = st.y * s.cssH;
      if (Math.abs(x - moon.x) < clear && Math.abs(y - moon.y) < clear) continue;
      const r = st.r * u;
      if (st.big) sparkle(ctx, x, y, r * 2.6);
      else circle(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
