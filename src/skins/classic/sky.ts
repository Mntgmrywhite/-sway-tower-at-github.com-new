import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { AURORA } from "./colors";
import type { Tone } from "./tone";

// The sky and what hangs in it: the gradient for the hour (from tone.ts), the sun up on the
// left with its short rays, sinking into the cloud sea at sunset and coming back up out of it
// at dawn, then a crescent moon on the right, the stars, the aurora's two curtains low at the
// sides in the deep of the night, now and then a shooting star, and the morning star over the
// cloud sea before dawn. Celestial things are far away: flat fills, no outline, flat halos
// instead of a glow, and nothing that moves ever crosses the tower's column.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.4, 0.7, 0.92] as const;
/** The sky is painted in flat bands this tall (CSS px): a gradient fill costs ten times as much, and bands this thin step by about one shade each. */
const BAND = 5;
/** How far each band reaches under the next (CSS px): a device pixel even at Hard's widest zoom on a 1x screen. */
const OVERLAP = 2;

/** The sky's band colors, rebuilt only when the light or the screen height changes. */
const cache = { step: -1, h: -1, colors: [] as string[] };

/** The sky's color at fraction f of the screen's height. */
function skyAt(tone: Tone, f: number): string {
  if (f >= STOPS[3]) return tone.sky[3];
  for (let i = 1; i < STOPS.length; i++) {
    if (f > STOPS[i]!) continue;
    const a = STOPS[i - 1]!;
    return mix(tone.sky[i - 1]!, tone.sky[i]!, (f - a) / (STOPS[i]! - a));
  }
  return tone.sky[0];
}

/** Half width of the tower's column (u): nothing that moves or glints goes inside it. */
export const COLUMN = 0.27;

/**
 * How far out the side lanes, the sun, the moon and the far islands sit, as a multiple of
 * their place on a phone (in u from the center): 1 on a phone, growing with a wider screen
 * (Hard mode's zoomed-out view, a tablet) so they keep to the sides, up to SPREAD_MAX.
 */
export const SPREAD_MAX = 1.6;
export function spread(s: Scene): number {
  return Math.min(SPREAD_MAX, Math.max(1, s.cssW / s.u));
}

/**
 * Paint the sky down to `bottom` (everything below it is covered by the countryside or the
 * cloud sea), in thin flat bands from the four colors of the hour.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  if (cache.step !== step || cache.h !== s.cssH) {
    const n = Math.ceil(s.cssH / BAND) + 1;
    cache.colors = Array.from({ length: n }, (_, i) => skyAt(tone, ((i + 0.5) * BAND) / s.cssH));
    cache.step = step;
    cache.h = s.cssH;
  }
  // A pixel past the screen's edges, so a fractional screen size leaves no seam.
  const end = Math.min(s.cssH + 1, Math.ceil(bottom));
  const w = s.cssW + 1;
  // Each band reaches OVERLAP into the next one, which paints over it. Bands that merely abut
  // would each half-cover the pixel row they share whenever the scale is fractional (Hard's
  // zoom, a 2.625 or 1.5 device pixel ratio), and whatever lies under the sky would show
  // through as a bright hairline at every band edge.
  for (let i = 0; i * BAND < end; i++) {
    ctx.fillStyle = cache.colors[i] ?? tone.sky[3];
    ctx.fillRect(0, i * BAND, w, Math.min(BAND + OVERLAP, end - i * BAND));
  }
}

// ---------------------------------------------------------------- sun

/** Scratch result of `sunAt` / `moonAt`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The sun's rays reach this far (in disc radii); its halo 1.42. */
const RAY_REACH = 1.72;
const RAYS = 12;

/**
 * Where the sun is: by day left of the tower, below the title; at sunset it swells a little
 * and sinks below `sea` (the cloud sea's top), and at dawn it comes back up the same way. `r`
 * is the disc; its halo reaches 1.42 r and its rays 1.72 r.
 */
export function sunAt(s: Scene, tone: Tone, sea: number): typeof SUN {
  const k = tone.sunSet;
  const r0 = s.u * 0.056;
  const y0 = s.cssH * 0.27;
  SUN.r = r0 * (1 + 0.45 * k);
  SUN.x = Math.max(r0 * 1.9, s.cssW / 2 - s.u * 0.36 * spread(s));
  SUN.y = y0 + (sea + SUN.r * 1.9 - y0) * k;
  return SUN;
}

/** Where the moon hangs: up on the right, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.min(s.cssW - MOON_AT.r * 2, s.cssW / 2 + s.u * 0.36 * spread(s));
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

export function sun(ctx: Ctx, s: Scene, tone: Tone, sea: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, sea);
  // Short rays turning slowly (they fade as the sun warms and sinks).
  // The rays reach as far as by day even while the sun swells, so they never turn inside the column.
  const rays = 1 - tone.sunSet;
  const day = s.u * 0.056;
  if (rays > 0.02) {
    ctx.fillStyle = tone.sunHalo;
    ctx.globalAlpha = rays;
    ctx.beginPath();
    const spin = s.t * 0.05;
    for (let i = 0; i < RAYS; i++) {
      const a = spin + (i / RAYS) * Math.PI * 2;
      const long = i % 2 ? 0.86 : 1;
      const w = 0.13;
      const r0 = r * 1.12;
      const r1 = Math.max(r0 + day * 0.1, day * RAY_REACH * long);
      ctx.moveTo(x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.lineTo(x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.42);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 1.2);
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
  circle(ctx, x - r * 0.62, y - r * 0.08, r * 0.07);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and stars

const MOON = "#fff3c8";
const MOON_SHADE = "#efd99c";
const MOON_CRATER = "#e6cc8c";
const MOON_HALO = alpha("#fff3c8", 0.1);

/** A crescent as its own path: the outer arc round the left, the inner edge an elliptic arc back up. */
function crescentPath(ctx: Ctx, x: number, y: number, r: number, inner: number, tilt: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r, tilt, -Math.PI / 2, Math.PI / 2, true);
  ctx.ellipse(x, y, r * inner, r, tilt, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
}

/** A crescent moon up on the right with two flat halos, fading in at dusk and out at dawn. */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  const tilt = -0.42;
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_HALO;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.55);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 1.25);
  ctx.fill();
  crescentPath(ctx, x, y, r, 0.36, tilt);
  ctx.fillStyle = MOON_SHADE;
  ctx.fill();
  crescentPath(ctx, x - r * 0.05, y - r * 0.04, r * 0.9, 0.42, tilt);
  ctx.fillStyle = MOON;
  ctx.fill();
  // Two craters on the crescent's broad middle.
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  ctx.fillStyle = MOON_CRATER;
  ctx.beginPath();
  oval(ctx, x - r * 0.66 * c, y - r * 0.66 * sn + r * 0.08, r * 0.1, r * 0.08, tilt);
  oval(ctx, x - r * 0.55 * c + r * 0.12, y - r * 0.55 * sn + r * 0.42, r * 0.07, r * 0.055, tilt);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it sparkles. */
const STARS = Array.from({ length: 64 }, (_, i) => ({
  x: hash(i * 3 + 700),
  y: 0.03 + hash(i * 3 + 701) * 0.7,
  r: 0.0026 + hash(i * 3 + 702) * 0.0034,
  g: i % 3,
  big: hash(i + 900) > 0.86,
}));

/** Stars over the night sky in three twinkle groups (one fill each); none sparkles in the tower's column. */
export function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * COLUMN;
  const c1 = s.cssW / 2 + u * COLUMN;
  ctx.fillStyle = "#fff8e0";
  for (let g = 0; g < 3; g++) {
    ctx.beginPath();
    let twinkle = false;
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = st.x * s.cssW;
      const y = st.y * s.cssH;
      const r = st.r * u;
      // Stars in the column hold still; outside it they twinkle.
      if (x >= c0 && x <= c1) continue;
      twinkle = true;
      if (st.big) sparkle(ctx, x, y, r * 2.6);
      else circle(ctx, x, y, r);
    }
    if (!twinkle) continue;
    ctx.globalAlpha = tone.stars * (0.62 + 0.38 * Math.sin(s.t * 0.9 + g * 2.1));
    ctx.fill();
  }
  // The column's stars: small and steady, so nothing glints beside the bars.
  ctx.globalAlpha = tone.stars * 0.7;
  ctx.beginPath();
  for (const st of STARS) {
    const x = st.x * s.cssW;
    if (x < c0 || x > c1) continue;
    circle(ctx, x, st.y * s.cssH, st.r * u * 0.85);
  }
  ctx.fill();
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

// ---------------------------------------------------------------- aurora

/** Points along a curtain's edges, and the brighter rays down it. */
const CURTAIN_STEPS = 12;
const AURORA_RAYS = 9;

/** Each curtain layer fades out toward the column with a horizontal gradient, built once per screen. */
const auroraCache = { ctx: null as Ctx | null, w: -1, u: -1, fills: [] as CanvasGradient[] };

/** The three layer fills and the ray fill, for side index `side` (0 left, 1 right). */
function auroraFills(ctx: Ctx, s: Scene): CanvasGradient[] {
  if (auroraCache.ctx === ctx && auroraCache.w === s.cssW && auroraCache.u === s.u) return auroraCache.fills;
  const fills: CanvasGradient[] = [];
  const strength = [0.2, 0.26, 0.48, 0.16];
  const colors = [AURORA[2], AURORA[1], AURORA[0], AURORA[0]];
  for (const m of [-1, 1]) {
    const inner = s.cssW / 2 + m * s.u * (COLUMN + 0.02);
    const outer = m < 0 ? 0 : s.cssW;
    for (let l = 0; l < 4; l++) {
      const g = ctx.createLinearGradient(outer, 0, inner, 0);
      g.addColorStop(0, alpha(colors[l]!, strength[l]!));
      g.addColorStop(0.55, alpha(colors[l]!, strength[l]! * 0.75));
      g.addColorStop(1, alpha(colors[l]!, 0));
      fills.push(g);
    }
  }
  auroraCache.ctx = ctx;
  auroraCache.w = s.cssW;
  auroraCache.u = s.u;
  auroraCache.fills = fills;
  return fills;
}

/**
 * One aurora curtain on side `m` (-1 left, +1 right), high in the sky between the screen's
 * edge and the tower's column: violet at the top, teal, and a bright mint hem along its
 * waving lower edge, with a few brighter rays down it, fading out toward the column so the
 * bars stand on a calm sky. The hem ripples slowly; the rays breathe.
 */
function curtain(ctx: Ctx, s: Scene, m: number, fills: CanvasGradient[], k: number): void {
  const u = s.u;
  const inner = s.cssW / 2 + m * u * (COLUMN + 0.02);
  const outer = m < 0 ? 0 : s.cssW;
  const xAt = (f: number) => outer + (inner - outer) * f;
  const hem = (f: number) =>
    s.cssH * 0.29 + u * (0.035 * Math.sin(f * 5.2 + m) + 0.05 * f) + Math.sin(s.t * 0.3 + f * 6 + m) * u * 0.01;
  const height = (f: number) => u * (0.24 + 0.04 * Math.sin(f * 3.6 + m * 2)) * (1 - 0.4 * f);
  const side = m < 0 ? 0 : 4;
  const bands = [
    [1, 0.42],
    [0.66, 0.1],
    [0.2, 0],
  ] as const;
  ctx.globalAlpha = k;
  for (let l = 0; l < 3; l++) {
    const [from, to] = bands[l]!;
    ctx.beginPath();
    for (let i = 0; i <= CURTAIN_STEPS; i++) {
      const f = i / CURTAIN_STEPS;
      const y = hem(f) - height(f) * from;
      if (i === 0) ctx.moveTo(xAt(f), y);
      else ctx.lineTo(xAt(f), y);
    }
    for (let i = CURTAIN_STEPS; i >= 0; i--) {
      const f = i / CURTAIN_STEPS;
      ctx.lineTo(xAt(f), hem(f) - height(f) * to);
    }
    ctx.closePath();
    ctx.fillStyle = fills[side + l]!;
    ctx.fill();
  }
  // Brighter rays down the curtain, slowly breathing.
  ctx.beginPath();
  for (let i = 0; i < AURORA_RAYS; i++) {
    const f = (i + 0.2 + hash(i * 3 + m * 7 + 40) * 0.6) / AURORA_RAYS;
    const x = xAt(f);
    const w = u * (0.005 + hash(i + m * 11 + 50) * 0.005);
    // A ray: a thin streak up the curtain from its hem, its length breathing.
    const len = height(f) * (0.7 + 0.2 * Math.sin(s.t * 0.4 + i * 1.7 + m));
    ctx.rect(x - w / 2, hem(f) - len, w, len);
  }
  ctx.fillStyle = fills[side + 3]!;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The aurora's two curtains, behind the moon. */
export function aurora(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.aurora <= 0.01) return;
  const fills = auroraFills(ctx, s);
  curtain(ctx, s, -1, fills, tone.aurora);
  curtain(ctx, s, 1, fills, tone.aurora);
}

// ---------------------------------------------------------------- shooting stars and the morning star

/** Seconds between chances of a shooting star, and how long one streaks. */
const METEOR_EVERY = 3.6;
const METEOR_TIME = 0.75;

/**
 * Now and then a shooting star high up at one side, streaking out and down, away from the
 * tower and clear of the moon: deterministic from the clock (cycle index and hash()).
 */
export function meteors(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.meteors <= 0.05) return;
  const u = s.u;
  const n = Math.floor(s.t / METEOR_EVERY);
  if (hash(n * 13 + 3) > 0.62) return;
  const start = hash(n * 13 + 4) * (METEOR_EVERY - METEOR_TIME);
  const k = (s.t - n * METEOR_EVERY - start) / METEOR_TIME;
  if (k < 0 || k > 1) return;
  const m = hash(n * 13 + 5) < 0.5 ? -1 : 1;
  const room = s.cssW / 2 - u * (COLUMN + 0.06);
  const x0 = s.cssW / 2 + m * (u * (COLUMN + 0.04) + room * hash(n * 13 + 6) * 0.35);
  const y0 = s.cssH * (0.04 + hash(n * 13 + 7) * 0.08);
  const len = Math.min(room * 0.75, u * 0.2);
  const dx = m * len * 0.9;
  const dy = len * 0.42;
  // The head runs along the path; the tail trails it, longest mid-flight.
  const head = k;
  const tail = Math.max(0, k - 0.35 - 0.25 * Math.sin(k * Math.PI));
  const fadeIn = Math.min(1, k * 5) * Math.min(1, (1 - k) * 4);
  ctx.globalAlpha = tone.meteors * fadeIn;
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  const hx = x0 + dx * head;
  const hy = y0 + dy * head;
  const tx = x0 + dx * tail;
  const ty = y0 + dy * tail;
  const w = u * 0.0045;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  ctx.moveTo(tx, ty);
  ctx.lineTo(hx + nx, hy + ny);
  ctx.lineTo(hx - nx, hy - ny);
  ctx.closePath();
  circle(ctx, hx, hy, w * 1.1);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The morning star: a steady sparkle low on the right over the cloud sea, before dawn. */
export function dawnStar(ctx: Ctx, s: Scene, tone: Tone, sea: number): void {
  if (tone.dawnStar <= 0.01) return;
  const u = s.u;
  const x = s.cssW / 2 + u * 0.33 * spread(s);
  const y = sea - u * 0.34;
  ctx.globalAlpha = tone.dawnStar;
  ctx.fillStyle = alpha("#fff8e0", 0.25);
  ctx.beginPath();
  circle(ctx, x, y, u * 0.016);
  ctx.fill();
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  sparkle(ctx, x, y, u * 0.022 * (0.9 + 0.1 * Math.sin(s.t * 1.3)));
  ctx.fill();
  ctx.globalAlpha = 1;
}
