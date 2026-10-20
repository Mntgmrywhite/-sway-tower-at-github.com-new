import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { GOLD, GREEN, PURPLE } from "./colors";
import { sparkle } from "./shapes";
import type { Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), the afternoon sun up
// on the left that goes amber and sinks into the cloud floor at sunset over the river, then a
// crescent moon in the same place, lit on the side the sun set, the stars, and by night the
// fireworks bursting over the river in the left lane, under the moon; at the loop's dawn the
// moon and stars fade and the sun comes back up where it set. Celestial things are far away:
// flat fills, no outline, a flat halo instead of a glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), and
// the fireworks burst well below the moon, so nothing ever passes over either.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.4, 0.7, 0.92] as const;

/** The sky gradient is rebuilt only when the light, the screen height or the context changes. */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, fill: null as CanvasGradient | null };

/**
 * Paint the sky down to `bottom` (everything below it is covered by the street, or the cloud
 * floor). Gradient fills are the costliest thing in the scene, so it stops there.
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

const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;
/** Where the sun and the moon hang: u left of the screen's center. */
const SKY_X = 0.36;

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little and
 * sinks below `floor` (the cloud floor's top), or below the bottom of the screen once the floor
 * has sunk out of view (and it comes up the same way at dawn). `r` is the disc; its halo reaches
 * SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, floor: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * 0.056;
  const y0 = s.cssH * 0.27;
  SUN.r = r0 * (1 + 0.45 * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * SKY_X);
  SUN.y = y0 + (Math.min(floor, s.cssH) + SUN.r * 1.3 - y0) * k;
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
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 - s.u * SKY_X);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

const MOON = "#fff3c8";
const MOON_SHADE = "#efd99c";

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
  x: hash(i * 3 + 7700),
  y: 0.03 + hash(i * 3 + 7701) * 0.72,
  r: 0.0028 + hash(i * 3 + 7702) * 0.0034,
  g: i % 3,
  big: hash(i + 7900) > 0.85,
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
  ctx.fillStyle = "#fff6d8";
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

// ---------------------------------------------------------------- fireworks

/** One burst every SHOT_EVERY seconds; each climbs for CLIMB s and blooms over BLOOM s. */
const SHOT_EVERY = 2.2;
const CLIMB = 0.55;
const BLOOM = 1.5;
/** The bursts' spots: x (u left of the screen's center), y (fraction of the screen's height). */
const SPOTS = [
  [SKY_X, 0.46],
  [SKY_X + 0.025, 0.54],
  [SKY_X + 0.01, 0.4],
] as const;
/** A burst's radius (u): everything a burst draws stays within this of its spot (inside the lane, under the moon). */
export const BURST_R = 0.095;
const SPARKS = 18;
const COLORS = [GOLD.body, GREEN.body, PURPLE.light, "#ff6fa8", "#ffffff"] as const;

/** Where burst `n` goes off: its spot (chosen by hash). */
function spotOf(s: Scene, n: number): { x: number; y: number } {
  const [dx, fy] = SPOTS[Math.floor(hash(n * 5 + 9300) * SPOTS.length) % SPOTS.length]!;
  SPOT.x = Math.max(s.u * (BURST_R + 0.02), s.cssW / 2 - s.u * dx);
  SPOT.y = s.cssH * fy;
  return SPOT;
}
const SPOT = { x: 0, y: 0 };

/**
 * Fireworks over the river by night, in the left lane under the moon: a shell climbs on a
 * thin trail, bursts into a ring of sparks that spread, fall and fade, a few of them twinkling,
 * in the colors of the season. Two shells may be in the air at once (the last one's sparks
 * still falling as the next climbs).
 */
export function fireworks(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.fireworks <= 0.01) return;
  const u = s.u;
  const n = Math.floor(s.t / SHOT_EVERY);
  for (let i = n - 1; i <= n; i++) {
    if (i < 0) continue;
    const age = s.t - i * SHOT_EVERY;
    if (age > CLIMB + BLOOM) continue;
    const { x, y } = spotOf(s, i);
    const color = COLORS[Math.floor(hash(i * 5 + 9301) * COLORS.length) % COLORS.length]!;
    if (age < CLIMB) {
      // The shell climbs from below the burst's spot, a little trail behind it.
      const k = age / CLIMB;
      const from = y + u * BURST_R * 1.1;
      const hy = from + (y - from) * (1 - (1 - k) * (1 - k));
      ctx.globalAlpha = tone.fireworks * 0.8;
      ctx.strokeStyle = "#fff0b0";
      ctx.lineWidth = Math.max(1, u * 0.003);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, hy);
      ctx.lineTo(x, Math.min(from, hy + u * 0.02));
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      circle(ctx, x, hy, u * 0.004);
      ctx.fill();
      continue;
    }
    const k = (age - CLIMB) / BLOOM;
    const spread = u * BURST_R * (1 - (1 - k) * (1 - k) * (1 - k) * (1 - k)) * 0.88;
    const drop = u * 0.015 * k * k;
    const fadeOut = 1 - k * k;
    // Each spark trails a streak back toward the heart of the burst, brightest as it blooms.
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.globalAlpha = tone.fireworks * fadeOut * 0.55;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const a = (j / SPARKS) * Math.PI * 2 + hash(i * 7 + 9302) * 0.5;
      const reach = spread * (0.85 + hash(i * 31 + j + 9303) * 0.15);
      ctx.moveTo(x + Math.cos(a) * reach * 0.55, y + Math.sin(a) * reach * 0.5 + drop * 0.5);
      ctx.lineTo(x + Math.cos(a) * reach * 0.92, y + Math.sin(a) * reach * 0.83 + drop * 0.9);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = tone.fireworks * fadeOut;
    ctx.beginPath();
    for (let j = 0; j < SPARKS; j++) {
      const a = (j / SPARKS) * Math.PI * 2 + hash(i * 7 + 9302) * 0.5;
      const reach = spread * (0.85 + hash(i * 31 + j + 9303) * 0.15);
      const sx = x + Math.cos(a) * reach;
      const sy = y + Math.sin(a) * reach * 0.9 + drop;
      const r = u * 0.0065 * (1 - k * 0.4);
      if (j % 4 === 1 && Math.sin(s.t * 20 + j) > 0) sparkle(ctx, sx, sy, r * 2.2);
      else circle(ctx, sx, sy, r);
    }
    // A second, inner ring of the same color, smaller.
    for (let j = 0; j < SPARKS / 2; j++) {
      const a = (j / (SPARKS / 2)) * Math.PI * 2 + hash(i * 7 + 9304) * 0.9;
      circle(ctx, x + Math.cos(a) * spread * 0.5, y + Math.sin(a) * spread * 0.45 + drop * 0.6, u * 0.0045);
    }
    ctx.fill();
    // The flash at the heart of a fresh burst.
    if (k < 0.25) {
      ctx.globalAlpha = tone.fireworks * (1 - k / 0.25) * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      circle(ctx, x, y, u * 0.012 * (1 - k / 0.25));
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
