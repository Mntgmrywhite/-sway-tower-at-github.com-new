import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { CYAN, GOLD, MAGENTA, NIGHT_DISC, ORANGE, PINK, VIOLET, window01 } from "./colors";
import { toneIndex, toneOf, type Tone } from "./tone";
import { rimTube } from "./tube";

// The Synthwave sky. At the start, the big striped sun sits on the horizon behind the tower;
// as you climb it sinks into the horizon and its halo fades. Then the night things come out in
// the side lanes, clear of the tower's column and below the HUD: a wireframe moon turning
// slowly on the right, a ringed planet (striped like the sun that set) rising on the left high
// up, neon constellations, and shooting stars that streak out toward the screen edges.
// Celestial things are far away: flat fills and thin tubes, no blur.

// ---------------------------------------------------------------- the sun

/** Radius of the sun (u) and how far its center sits above the horizon (fraction of radius). */
const SUN_R = 0.31;
const SUN_LIFT = 0.36;
/** How far below its start the sun sinks once set (radii): its top just under the horizon. */
const SUN_SINK = 1.42;
const HALO_R = 1.75;

/** Where the cuts start, in radii from the center: above it, so the stripes show over the low
 *  middle of the range (which reaches up to about the center) and the sun reads as striped. */
const CUTS_FROM = -0.44;

/** The disc's cut bands, top to bottom, as [y0, y1] in radii from the center (solid cap first). */
const BANDS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [[-1, CUTS_FROM]];
  let y = CUTS_FROM;
  for (let i = 0; ; i++) {
    const gap = 0.026 + i * 0.022;
    const band = 0.1;
    if (y + gap >= 1) break;
    out.push([y + gap, Math.min(0.999, y + gap + band)]);
    y += gap + band;
  }
  return out;
})();

/** Gradients are built around the origin (the sun is drawn translated), once per light step and size. */
const sunCache = { ctx: null as Ctx | null, step: -1, r: -1, disc: null as CanvasGradient | null, halo: null as CanvasGradient | null };

function sunFills(ctx: Ctx, s: Scene, tone: Tone, r: number): void {
  const step = toneIndex(s);
  if (sunCache.ctx === ctx && sunCache.step === step && sunCache.r === r) return;
  const set = tone.sunSet;
  const disc = ctx.createLinearGradient(0, -r, 0, r * 0.8);
  disc.addColorStop(0, mix(GOLD, ORANGE, set * 0.7));
  disc.addColorStop(0.45, mix(ORANGE, PINK, set * 0.5));
  disc.addColorStop(1, mix(PINK, MAGENTA, set * 0.6));
  const halo = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * HALO_R);
  halo.addColorStop(0, tone.halo);
  halo.addColorStop(1, tone.haloClear);
  sunCache.ctx = ctx;
  sunCache.step = step;
  sunCache.r = r;
  sunCache.disc = disc;
  sunCache.halo = halo;
}

/** Scratch result of `sunAt`, reused so placing it allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };

/** Where the sun is: centered on the horizon, sunk by `sunSet` (1: just under the horizon). */
export function sunAt(s: Scene, tone: Tone): typeof SUN {
  SUN.r = s.u * SUN_R;
  SUN.x = s.cssW / 2;
  SUN.y = s.horizonY - SUN.r * SUN_LIFT + SUN.r * SUN_SINK * tone.sunSet;
  return SUN;
}

/** The striped synthwave sun: gold at the top, neon orange, hot pink at the horizon. */
function sun(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone);
  const hy = s.horizonY;
  if (y - r * HALO_R > s.cssH) return;
  sunFills(ctx, s, tone, r);
  // Everything below the horizon is painted over by the floor, so stop there.
  const below = hy - y;
  ctx.translate(x, y);
  ctx.fillStyle = sunCache.halo!;
  ctx.fillRect(-r * HALO_R, -r * HALO_R, r * HALO_R * 2, Math.max(0, Math.min(r * HALO_R * 2, below + r * HALO_R)));
  // Disc, cut by bands that thicken toward the horizon: one path of circle slices, no clip.
  ctx.beginPath();
  for (const [a, b] of BANDS) {
    const y0 = a * r;
    if (y0 >= below) break;
    const y1 = Math.min(b * r, below);
    const a0 = Math.asin(y0 / r);
    const a1 = Math.asin(Math.min(0.9999, y1 / r));
    ctx.moveTo(Math.cos(a0) * r, y0);
    ctx.arc(0, 0, r, a0, a1);
    ctx.arc(0, 0, r, Math.PI - a1, Math.PI - a0);
    ctx.closePath();
  }
  ctx.fillStyle = sunCache.disc!;
  ctx.fill();
  ctx.translate(-x, -y);
}

// ---------------------------------------------------------------- moon and planet

/** Lowest line of the HUD (title, best, lives) on the start screen. */
export function hudBottom(s: Scene): number {
  return s.cssH * 0.14 + s.u * 0.13;
}

/** Scratch results of `moonAt` / `planetAt`. */
const MOON = { x: 0, y: 0, r: 0 };
const PLANET = { x: 0, y: 0, r: 0, ring: 0 };

/** Lane centers sit this far from the screen center (u). */
const LANE_X = 0.375;

/** The wireframe moon: up the right lane, below the HUD. `r` is the disc; its halo reaches 1.35 r. */
export function moonAt(s: Scene): typeof MOON {
  MOON.r = s.u * 0.05;
  MOON.x = Math.min(s.cssW - MOON.r * 1.6, s.cssW / 2 + s.u * LANE_X);
  MOON.y = Math.max(s.cssH * 0.25, hudBottom(s) + MOON.r * 1.7);
  return MOON;
}

/** The ringed planet: down the left lane, lower than the moon; it rises a little as it appears.
 *  `r` is the disc, `ring` the ring's half-width. */
export function planetAt(s: Scene, tone: Tone): typeof PLANET {
  PLANET.r = s.u * 0.056;
  PLANET.ring = s.u * 0.1;
  PLANET.x = Math.max(PLANET.ring + s.u * 0.03, s.cssW / 2 - s.u * LANE_X);
  PLANET.y = Math.max(s.cssH * 0.3, hudBottom(s) + PLANET.r * 2.4) + (1 - tone.planet) * s.u * 0.05;
  return PLANET;
}

const MOON_HALO = alpha(CYAN, 0.1);
const MOON_GRID = alpha(mix(CYAN, VIOLET, 0.3), 0.55);
/** Parallels, as sines of their latitude. */
const LATS = [-0.82, -0.5, 0, 0.5, 0.82] as const;
const MERIDIANS = 4;

function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_HALO;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.35);
  ctx.fill();
  ctx.fillStyle = NIGHT_DISC;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  // The wire globe: parallels as chords, meridians as ellipses turning slowly.
  ctx.beginPath();
  for (const l of LATS) {
    const w = Math.sqrt(1 - l * l) * r;
    ctx.moveTo(x - w, y + l * r);
    ctx.lineTo(x + w, y + l * r);
  }
  const spin = s.t * 0.12;
  for (let i = 0; i < MERIDIANS; i++) {
    const rx = Math.abs(Math.sin(spin + (i * Math.PI) / MERIDIANS)) * r;
    if (rx < 0.5) {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
    } else oval(ctx, x, y, rx, r);
  }
  ctx.strokeStyle = MOON_GRID;
  ctx.lineWidth = Math.max(0.8, s.u * 0.0022);
  ctx.stroke();
  ctx.beginPath();
  circle(ctx, x, y, r);
  rimTube(ctx, CYAN, Math.max(1, s.u * 0.003));
  ctx.globalAlpha = 1;
}

/** The planet's stripes (like the sun's), as [y0, y1] in radii: dark gaps across the lower half. */
const PLANET_GAPS: readonly (readonly [number, number])[] = [
  [0.1, 0.17],
  [0.34, 0.43],
  [0.6, 0.72],
];
const RING_TILT = -0.32;
const RING_FLAT = 0.24;
const planetCache = { ctx: null as Ctx | null, r: -1, fill: null as CanvasGradient | null };

/** Circle slices between y0 and y1 (radii, from the center), as subpaths around the origin. */
function slice(ctx: Ctx, r: number, y0: number, y1: number): void {
  const a0 = Math.asin(y0);
  const a1 = Math.asin(y1);
  ctx.moveTo(Math.cos(a0) * r, y0 * r);
  ctx.arc(0, 0, r, a0, a1);
  ctx.arc(0, 0, r, Math.PI - a1, Math.PI - a0);
  ctx.closePath();
}

/** Half of the ring, as an ellipse arc around the origin: the far (upper) or the near (lower) half. */
function ringHalf(ctx: Ctx, rx: number, ry: number, near: boolean): void {
  const a = near ? 0 : Math.PI;
  ctx.moveTo(Math.cos(a) * rx * Math.cos(RING_TILT), Math.cos(a) * rx * Math.sin(RING_TILT));
  ctx.ellipse(0, 0, rx, ry, RING_TILT, a, a + Math.PI);
}

function planet(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.planet <= 0) return;
  const { x, y, r, ring } = planetAt(s, tone);
  if (planetCache.ctx !== ctx || planetCache.r !== r) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, mix(GOLD, NIGHT_DISC, 0.25));
    g.addColorStop(0.45, mix(ORANGE, NIGHT_DISC, 0.3));
    g.addColorStop(1, mix(MAGENTA, NIGHT_DISC, 0.45));
    planetCache.ctx = ctx;
    planetCache.r = r;
    planetCache.fill = g;
  }
  const tube = Math.max(1, s.u * 0.003);
  const ry = ring * RING_FLAT;
  ctx.globalAlpha = tone.planet;
  ctx.translate(x, y);
  // Far half of the ring, the striped body, then the near half over it.
  ctx.beginPath();
  ringHalf(ctx, ring, ry, false);
  rimTube(ctx, CYAN, tube);
  ctx.beginPath();
  circle(ctx, 0, 0, r);
  ctx.fillStyle = planetCache.fill!;
  ctx.fill();
  ctx.beginPath();
  for (const [a, b] of PLANET_GAPS) slice(ctx, r, a, b);
  ctx.fillStyle = NIGHT_DISC;
  ctx.fill();
  ctx.beginPath();
  ringHalf(ctx, ring, ry, true);
  rimTube(ctx, CYAN, tube);
  ctx.translate(-x, -y);
  ctx.globalAlpha = 1;
}

/** Everything behind the sky layer: the sun, then the moon and the planet. */
export function celestial(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  sun(ctx, s, tone);
  moon(ctx, s, tone);
  planet(ctx, s, tone);
}

// ---------------------------------------------------------------- night sky

/** Half width of the tower's column (u): nothing in the sky goes nearer the center than this. */
export const COLUMN = 0.25;

/**
 * Constellations of our own (a pyramid, a lightning bolt), up the lanes: points as
 * [x, y] with x in u out from the center (negative is left) and y as a fraction of the screen
 * height; lines join consecutive points, a NaN pair starts a new stroke.
 */
const CONSTELLATIONS: readonly (readonly (readonly [number, number])[])[] = [
  // Left: a pyramid with a star over its apex.
  [
    [-0.43, 0.56],
    [-0.365, 0.485],
    [-0.3, 0.555],
    [-0.43, 0.56],
    [NaN, NaN],
    [-0.365, 0.485],
    [-0.36, 0.452],
  ],
  // Right: a lightning bolt.
  [
    [0.42, 0.47],
    [0.36, 0.52],
    [0.4, 0.525],
    [0.33, 0.585],
  ],
];
const CONST_LINE = alpha(mix(CYAN, VIOLET, 0.4), 0.38);
const STAR = mix(CYAN, "#ffffff", 0.75);

/** Sparkles in the lanes: x (u from center), y (fraction of the height), size (u). */
const SPARKLES = Array.from({ length: 10 }, (_, i) => ({
  x: (i % 2 ? 1 : -1) * (0.29 + hash(i * 7 + 40) * 0.17),
  y: 0.42 + hash(i * 7 + 41) * 0.22,
  r: 0.006 + hash(i * 7 + 42) * 0.005,
}));

/** Lowest point of the open sky, above the horizon things and the cloud bank. */
export function skyFloor(s: Scene): number {
  return s.horizonY - s.u * 0.36;
}

function nightSky(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const H = s.cssH;
  const floor = skyFloor(s);
  ctx.globalAlpha = tone.stars;
  ctx.beginPath();
  for (const c of CONSTELLATIONS) {
    let pen = false;
    for (const [px, py] of c) {
      if (Number.isNaN(px)) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(cx + px * u, py * H);
      else ctx.moveTo(cx + px * u, py * H);
      pen = true;
    }
  }
  ctx.strokeStyle = CONST_LINE;
  ctx.lineWidth = Math.max(0.8, u * 0.002);
  ctx.lineCap = "round";
  ctx.stroke();
  // The constellations' stars and the sparkles (four-point stars) in one fill, breathing slowly.
  ctx.globalAlpha = tone.stars * (0.7 + 0.3 * Math.sin(s.t * 0.8));
  ctx.beginPath();
  for (const c of CONSTELLATIONS) {
    for (const [px, py] of c) {
      if (Number.isNaN(px) || py * H > floor) continue;
      circle(ctx, cx + px * u, py * H, Math.max(1, u * 0.0042));
    }
  }
  for (const p of SPARKLES) {
    const y = p.y * H;
    if (y > floor) continue;
    sparkle(ctx, cx + p.x * u, y, p.r * u);
  }
  ctx.fillStyle = STAR;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A four-point sparkle as its own subpath. */
function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  const w = r * 0.22;
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + w, y - w, x + r, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + r);
  ctx.quadraticCurveTo(x - w, y + w, x - r, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - r);
  ctx.closePath();
}

// ---------------------------------------------------------------- shooting stars

/** Shooting-star slots: each fires once per period at a fresh place (cycle × slot), unlocked
 *  one by one as you climb (tone.meteors). */
const SLOTS: readonly { period: number; offset: number }[] = [
  { period: 7.3, offset: 3.55 },
  { period: 9.1, offset: 6.9 },
  { period: 6.2, offset: 1.1 },
  { period: 8.4, offset: 4.4 },
];
const STREAK_TIME = 0.8; // seconds a shooting star is visible
const TAIL_STEPS = 5;
const TAIL_COLOR = mix(PINK, "#ffffff", 0.45);
/** How far the head travels (u), the longest tail (u), and the band of the lanes they start in. */
const TRAVEL = 0.13;
const TAIL = 0.07;
const START_IN = 0.3;
const START_OUT = 0.33;
const BAND_TOP = 0.4;
const BAND_BOTTOM = 0.58;

/** Scratch result of `meteorAt`. */
const METEOR = { on: false, x: 0, y: 0, dx: 0, dy: 0, tail: 0, fade: 0 };

/** Where slot `i`'s shooting star is at this moment (on = false while the slot is idle). */
export function meteorAt(s: Scene, tone: Tone, i: number): typeof METEOR {
  METEOR.on = false;
  const slot = SLOTS[i];
  if (!slot || i >= tone.meteors) return METEOR;
  const tt = s.t + slot.offset;
  const n = Math.floor(tt / slot.period);
  const p = tt - n * slot.period;
  if (p > STREAK_TIME) return METEOR;
  const u = s.u;
  const H = s.cssH;
  const seed = n * 13 + i * 101;
  // Out from a lane toward the screen edge, gently down.
  const side = hash(seed + 1) < 0.5 ? -1 : 1;
  const top = Math.max(H * BAND_TOP, hudBottom(s) + u * 0.12);
  const bottom = Math.min(H * BAND_BOTTOM, skyFloor(s) - u * 0.06);
  if (bottom <= top) return METEOR;
  const x0 = s.cssW / 2 + side * u * (START_IN + hash(seed + 3) * (START_OUT - START_IN));
  const y0 = top + hash(seed + 4) * (bottom - top);
  const ang = 0.3 + hash(seed + 5) * 0.3;
  const k = p / STREAK_TIME;
  const travel = u * TRAVEL * k;
  METEOR.dx = Math.cos(ang) * side;
  METEOR.dy = Math.sin(ang);
  METEOR.x = x0 + METEOR.dx * travel;
  METEOR.y = y0 + METEOR.dy * travel;
  // The tail never reaches back past where the star appeared.
  METEOR.tail = Math.min(u * TAIL, travel + u * 0.012);
  METEOR.fade = window01(k, 0, 1, 0.25);
  METEOR.on = true;
  return METEOR;
}

export function drawMeteor(ctx: Ctx, s: Scene, m: typeof METEOR): void {
  const { x, y, dx, dy, tail, fade } = m;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, s.u * 0.0035);
  ctx.strokeStyle = TAIL_COLOR;
  for (let j = 0; j < TAIL_STEPS; j++) {
    const a0 = j / TAIL_STEPS;
    const a1 = (j + 1) / TAIL_STEPS;
    ctx.beginPath();
    ctx.moveTo(x - dx * tail * a0, y - dy * tail * a0);
    ctx.lineTo(x - dx * tail * a1, y - dy * tail * a1);
    ctx.globalAlpha = fade * 0.85 * (1 - a0) * (1 - a0);
    ctx.stroke();
  }
  ctx.globalAlpha = fade;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  circle(ctx, x, y, Math.max(1, s.u * 0.004));
  ctx.fill();
  ctx.globalAlpha = 1;
}

function shootingStars(ctx: Ctx, s: Scene, tone: Tone): void {
  for (let i = 0; i < tone.meteors; i++) {
    const m = meteorAt(s, tone, i);
    if (m.on) drawMeteor(ctx, s, m);
  }
}

/** The sky layer: constellations and sparkles at night, then shooting stars. */
export function sky(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  nightSky(ctx, s, tone);
  shootingStars(ctx, s, tone);
}

