import { circle, hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { sparkle } from "./shapes";
import type { Tone } from "./tone";

// The sky and what hangs in it: a soft continuous gradient for the hour (from tone.ts), never
// bands; the golden-hour sun up on the left (gold in the afternoon, orange as it sets) that sinks
// into the cloud sea at dusk, then a crescent moon in the same place, lit on the side the sun set,
// and the stars; at the loop's dawn the moon and stars fade and the sun comes back up where it
// set. The sun and the moon are Art Nouveau medallions, each set in a halo: an opaque disc a shade
// off the sky, ringed by a fine line (and the sun's by a ring of dots), like the halo behind a
// Mucha figure. Flat fills, no glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), so
// nothing ever passes over either. The frame down the sky's sides (border.ts) is painted before
// them, so they sit in front of it.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.36, 0.58, 0.8] as const;
/** How far (px) each piece of the sky runs on under the next. */
const SEAM = 4;

/**
 * The sky's gradient as three two-color pieces, one between each pair of stops (below the last
 * stop it is flat): the same continuous gradient as one of four stops, at less than half its cost
 * to fill. Rebuilt only when the light, the screen height or the context changes.
 */
const cache = { ctx: null as Ctx | null, step: -1, h: -1, pieces: [] as CanvasGradient[] };

/**
 * Paint the sky down to `bottom` (everything below it is covered by the hills and the lawn, or
 * the cloud sea). Gradient fills are the costliest thing in the scene, so it stops there.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  const H = s.cssH;
  if (cache.ctx !== ctx || cache.step !== step || cache.h !== H) {
    cache.pieces.length = 0;
    for (let i = 0; i + 1 < STOPS.length; i++) {
      const g = ctx.createLinearGradient(0, STOPS[i]! * H, 0, STOPS[i + 1]! * H);
      g.addColorStop(0, tone.sky[i]!);
      g.addColorStop(1, tone.sky[i + 1]!);
      cache.pieces.push(g);
    }
    cache.ctx = ctx;
    cache.step = step;
    cache.h = H;
  }
  const end = Math.min(H, Math.ceil(bottom));
  // Each piece runs on a little under the next (by a whole pixel even on a canvas drawn small),
  // so no seam shows between them; the next paints over that.
  for (let i = 0; i < cache.pieces.length; i++) {
    const y0 = STOPS[i]! * H;
    if (y0 >= end) return;
    ctx.fillStyle = cache.pieces[i]!;
    ctx.fillRect(0, y0, s.cssW, Math.min(end, STOPS[i + 1]! * H + SEAM) - y0);
  }
  const y = STOPS[STOPS.length - 1]! * H;
  if (y >= end) return;
  ctx.fillStyle = tone.sky[STOPS.length - 1]!;
  ctx.fillRect(0, y, s.cssW, end - y);
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
  // The halo medallion: its disc, a fine ring at its rim and one inside, and a ring of dots between.
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  ctx.strokeStyle = tone.sunRing;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  circle(ctx, x, y, r * (SUN_REACH - 0.07));
  circle(ctx, x, y, r * 1.08);
  ctx.stroke();
  ctx.fillStyle = tone.sunRing;
  ctx.beginPath();
  for (let i = 0; i < SUN_DOTS; i++) {
    const a = (i / SUN_DOTS) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r * 1.18, y + Math.sin(a) * r * 1.18, r * 0.035);
  }
  ctx.fill();
  // The disc: shaded, its lit body up and to the left, a flat highlight.
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

/** The dots round the sun's halo. */
const SUN_DOTS = 14;

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = skyX(s);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

const MOON = "#fff4cf";
const MOON_SHADE = "#efd9a4";
/** The moon's halo medallion, in moon radii. Everything the moon draws stays inside it. */
export const MOON_REACH = 1.42;
/** The bite out of the full disc that leaves the crescent: its center (moon radii from the moon's) and radius. */
const BITE_X = 0.5;
const BITE_Y = -0.28;
const BITE_R = 0.86;

/**
 * A crescent as one closed subpath: the disc at (x, y) radius r less the bite at (bx, by) radius
 * br (which must cut it in two points): round the disc's outer side, back round the bite's edge.
 */
function crescent(ctx: Ctx, x: number, y: number, r: number, bx: number, by: number, br: number): void {
  const dx = bx - x;
  const dy = by - y;
  const d = Math.hypot(dx, dy);
  // The two circles meet at the points a along the line of centers and h either side of it.
  const a = (r * r - br * br + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r * r - a * a));
  const mx = x + (dx * a) / d;
  const my = y + (dy * a) / d;
  const p1x = mx - (dy * h) / d;
  const p1y = my + (dx * h) / d;
  const p2x = mx + (dy * h) / d;
  const p2y = my - (dx * h) / d;
  const a1 = Math.atan2(p1y - y, p1x - x);
  const a2 = Math.atan2(p2y - y, p2x - x);
  ctx.moveTo(p1x, p1y);
  ctx.arc(x, y, r, a1, a2, false);
  ctx.arc(bx, by, br, Math.atan2(p2y - by, p2x - bx), Math.atan2(p1y - by, p1x - bx), true);
  ctx.closePath();
}

/**
 * A crescent moon up on the left in its halo medallion, fading in at dusk, lit low on the side
 * the sun set; the bite is the halo showing through.
 */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = tone.moonHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * MOON_REACH);
  ctx.fill();
  ctx.strokeStyle = tone.moonRing;
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  circle(ctx, x, y, r * (MOON_REACH - 0.08));
  ctx.stroke();
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  crescent(ctx, x, y, r, x + r * BITE_X, y + r * BITE_Y, r * BITE_R);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  crescent(ctx, x - r * 0.05, y - r * 0.05, r * 0.9, x + r * BITE_X, y + r * BITE_Y, r * (BITE_R + 0.04));
  ctx.fill();
  ctx.globalAlpha = 1;
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
