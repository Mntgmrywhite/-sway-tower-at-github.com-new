import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { sparkle } from "./shapes";
import type { Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), the golden-hour sun
// up on the left (gold in the afternoon, orange as it sets) that sinks into the cloud sea at
// dusk, then a crescent moon in the same place, lit on the side the sun set, and the stars; at
// the loop's dawn the moon and stars fade and the sun comes back up where it set. Celestial
// things are far away: flat fills, no outline, a flat halo instead of a glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), so
// nothing ever passes over either.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.36, 0.58, 0.8] as const;

/** The sky gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

/**
 * Paint the sky down to `bottom` (everything below it is covered by the hills and the lawn, or
 * the cloud sea). Gradient fills are the costliest thing in the scene, so it stops there.
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
export const SUN_REACH = 1.36;
/** The sun's and the moon's place across the sky: this far left of the screen's center (u), clear of the boulevard's first shop even with the setting sun's halo. */
const SKY_X = 0.375;
/** The disc's radius by day (u), and how much it swells as it sets. */
const SUN_R = 0.058;
const SWELL = 0.25;
/** Where it has set to: its halo this far (u) under the cloud sea's top, where the sea is solid. */
const UNDER = 0.04;

/** The sun's and the moon's x on screen (kept a little in from the left edge on a narrow screen). */
function skyX(s: Scene): number {
  return Math.max(s.u * SUN_R * 1.75, s.cssW / 2 - s.u * SKY_X);
}

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the cloud sea's top) until even its halo is under the sea, or below the
 * bottom of the screen once the sea has sunk out of view (and it comes up the same way at dawn).
 * `tone.sunSet` follows the exact level (tone.ts), so the sun glides with the camera. `r` is the
 * disc; its halo reaches SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const y0 = s.cssH * 0.27;
  SUN.r = s.u * SUN_R * (1 + SWELL * k);
  SUN.x = skyX(s);
  SUN.y = y0 + (Math.min(floor, s.cssH) + s.u * UNDER + SUN.r * SUN_REACH - y0) * k;
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

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = skyX(s);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

const MOON = "#fff4cf";
const MOON_SHADE = "#f2dca6";

/** A crescent moon up on the left, fading in at dusk, lit low on the side the sun set. The bite is painted with the sky itself. */
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
  x: hash(i * 3 + 4700),
  y: 0.03 + hash(i * 3 + 4701) * 0.72,
  r: 0.0028 + hash(i * 3 + 4702) * 0.0034,
  g: i % 3,
  big: hash(i + 4900) > 0.85,
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
  ctx.fillStyle = "#fff6e0";
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
