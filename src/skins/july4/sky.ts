import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MOON, MOON_SHADE, STAR, STAR_WARM, SUN_CORE } from "./colors";
import { hillsK, ridgeH } from "./hills";
import { hillLine } from "./land";
import { bands } from "./paint";
import { crescent, dot, sparkle } from "./shapes";
import type { Tone } from "./tone";

// The sky, painted like a postcard's: one soft wash from the deep summer blue overhead down
// through paler blues to a creamy glow on the hills (the hour's colors, tone.ts), laid in thin
// flat bands too close in color to see (paint.ts), with no rays, so the sky behind the tower is calm. A warm summer sun hangs up on the left by day, a
// glowing disc in a soft halo, and sinks behind the far hills at sunset; then a crescent moon in
// the same place, lit on the side the sun set, and the stars, twinkling gently, out in the
// lanes; at the loop's dawn the moon and stars fade and the sun comes back up over the hills.
//
// The left of the sky belongs to the sun and the moon: nothing comes down the left lane
// (drift.ts; over the square only a cloud and the stunt plane hang there, below the sun, and they
// only ever move down), the cloud bank on the left rises only as far as the sun and the moon
// leave room (clouds.ts), the kites fly below the sun (hills.ts), and the fireworks in that lane
// burst below the moon (fireworks.ts), so nothing ever passes over either.

/** Where the wash's colors sit, from the top of the screen (0) to the hills (1). */
const STOPS = [0, 0.32, 0.6, 0.84, 1] as const;

/** The sky down to `bottom` (everything below is covered by the hills): its wash ends on the hills' line. */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const line = Math.max(1, hillLine(s));
  const end = Math.min(s.cssH, Math.ceil(bottom));
  if (end <= 0) return;
  bands(ctx, "sky", 0, s.cssW, 0, line, tone.sky, STOPS, 5);
  if (end > line) {
    ctx.fillStyle = tone.sky[4];
    ctx.fillRect(0, line, s.cssW, end - line);
  }
}

// ---------------------------------------------------------------- the sun

/** Scratch results of `sunAt` / `moonAt`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;
/** How far out in the left lane the sun and the moon hang (u from the screen's center): clear of the steeple. */
export const SUN_X = 0.41;
/** The disc's radius (u) by day, and how much it swells as it sets. */
const SUN_R = 0.05;
const SUN_SWELL = 0.1;
/**
 * The sun's day height: SUN_HEIGHT u below the HUD's top line (render.ts HUD_TOP), so the whole
 * halo hangs below the title screen's Slide / Drop cards on every screen (layout.test.ts).
 */
const HUD_TOP = 0.14;
const SUN_HEIGHT = 0.29;
/** The sun sets this far (u) below the hills' crest, so it is wholly behind them when it goes. */
const BELOW = 0.016;

/** The lowest the day sun's halo reaches (px): over the square, the left lane's clouds start below it. */
export function sunHaloFoot(s: Scene): number {
  return s.cssH * HUD_TOP + s.u * (SUN_HEIGHT + SUN_R * SUN_REACH);
}

/**
 * The line the sun sets behind: the far ridge's crest where it is lowest across the sun's halo
 * (the ridge is drawn over the sun, so below this line it is hidden).
 */
export function sunFloor(s: Scene, x: number, reach: number): number {
  const X0 = (x - reach - s.cssW / 2) / s.u;
  const X1 = (x + reach - s.cssW / 2) / s.u;
  let low = Infinity;
  for (let i = 0; i <= 8; i++) low = Math.min(low, ridgeH(X0 + ((X1 - X0) * i) / 8));
  return hillLine(s) - low * hillsK(s) * s.u;
}

/**
 * Where the sun is: by day left of the tower, below the title's cards; at sunset it swells a
 * little and sinks behind the far hills (and it comes up the same way at dawn). Fully set, the
 * whole halo is behind the hills, so it goes without a blink. `r` is the disc; its halo reaches
 * SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * SUN_R;
  const y0 = s.cssH * HUD_TOP + s.u * SUN_HEIGHT;
  SUN.r = r0 * (1 + SUN_SWELL * k);
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * SUN_X);
  const floor = Math.min(sunFloor(s, SUN.x, r0 * (1 + SUN_SWELL) * SUN_REACH), s.cssH);
  SUN.y = y0 + (floor + SUN.r * SUN_REACH + s.u * BELOW - y0) * k;
  return SUN;
}

/** The sun: a soft halo in two rings round a glowing disc, warm at its rim. */
export function sun(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone);
  ctx.fillStyle = tone.sunHalo;
  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.18);
  ctx.fill();
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, SUN_CORE);
  g.addColorStop(0.45, tone.sunBody);
  g.addColorStop(1, tone.sunShade);
  ctx.fillStyle = g;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.048;
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 - s.u * SUN_X);
  MOON_AT.y = s.cssH * 0.22;
  return MOON_AT;
}

/** The moon's soft glow reaches this many radii (all it draws stays inside its disc and glow). */
export const MOON_REACH = 1.3;

/** A crescent moon up on the left, fading in at dusk, in a faint glow, lit low on the side the sun set. */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  const bx = x + r * 0.52;
  const by = y - r * 0.3;
  ctx.globalAlpha = tone.moon * 0.16;
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x, y, r * MOON_REACH);
  ctx.fill();
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  crescent(ctx, x, y, r, bx, by, r * 0.86);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  crescent(ctx, x - r * 0.07, y + r * 0.02, r * 0.92, bx, by, r * 0.94);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it is a sparkle (four soft points) or warm. */
const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: hash(i * 3 + 4700),
  y: 0.03 + hash(i * 3 + 4701) * 0.68,
  r: 0.0022 + hash(i * 3 + 4702) * 0.003,
  g: i % 3,
  sparkle: hash(i + 4900) > 0.84,
  warm: hash(i + 4950) > 0.7,
}));

/** Half width of the tower's column (u): no stars there, so nothing twinkles beside the bars. */
const COLUMN = 0.27;
/** Stars keep this far (u) in from the screen's sides, and a sparkle's points reach this many of its radii. */
const STAR_MARGIN = 0.022;
const SPARKLE = 3.4;

/** Stars over the night sky in three twinkle groups: soft dots, and a few four-point sparkles. */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  const bottom = hillLine(s);
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = tone.stars * (0.6 + 0.4 * Math.sin(s.t * 0.9 + g * 2.1));
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? STAR_WARM : STAR;
      ctx.beginPath();
      for (const st of STARS) {
        if (st.g !== g || st.warm !== (pass === 1)) continue;
        const x = edge + st.x * span;
        const r = st.r * u;
        const reach = st.sparkle ? r * SPARKLE : r;
        if (x > c0 - reach && x < c1 + reach) continue;
        const y = st.y * s.cssH;
        if (y > bottom - u * 0.25) continue;
        if (st.sparkle) sparkle(ctx, x, y, r * SPARKLE);
        else dot(ctx, x, y, r);
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
