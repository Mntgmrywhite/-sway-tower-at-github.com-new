import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { MOON, MOON_DOTS, MOON_SHADE } from "./colors";
import { dot, triskelePath } from "./knot";
import type { Tone } from "./tone";

// The sky and what hangs in it: the clear wash for the hour (from tone.ts), a spring sun up on the
// left (pale behind the shower, amber in the golden evening) that sinks into the cloud floor at
// sunset, then a crescent moon in the same place, lit on the side the sun set, and the stars,
// now and then a shooting star out in a side lane; at the loop's dawn the moon and stars fade,
// the morning star lingers low on the right, and the sun comes back up where it set.
// Drawn as an illuminator would: the sun a roundel of orpiment with a triskele in it, finely
// outlined and ringed with red dots as the Book of Kells rings its initials; the moon a pale
// crescent in a ring of gold dots; the brighter stars little rosettes of five dots (the page's
// own filler), the rest single dots. Flat fills and a flat halo, never a glow.
//
// The left of the sky belongs to the sun and the moon: nothing drifts there (drift.ts), and a
// shooting star on that side streaks high above the moon, so nothing ever passes over either.

/** Where the four sky colors (top, middle, glow band, bottom) stand down the screen, as fractions of its height. */
const STOPS = [0, 0.34, 0.62, 0.88] as const;

/**
 * The sky is a smooth gradient through its four colors, laid as bands one 8-bit step of color
 * apart (a band starts wherever the gradient's color, rounded to whole channel values, changes):
 * the same picture as the canvas's own gradient, which can only show whole steps either, at a
 * small part of its cost (a gradient fill was the costliest thing in the scene). The bands are
 * worked out only when the light (its tone step) or the screen's height changes.
 */
const MAX_BANDS = 512;
const BAND_Y = new Float64Array(MAX_BANDS + 1);
const BAND_COLOR: string[] = Array.from({ length: MAX_BANDS }, () => "");
const bands = { step: -1, h: -1, n: 0 };

function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildBands(tone: Tone, h: number): void {
  const stops = tone.sky.map(rgb);
  let n = 0;
  let last = -1;
  for (let y = 0; y < h && n < MAX_BANDS; y++) {
    const f = (y + 0.5) / h;
    let i = 0;
    while (i < STOPS.length - 2 && f > STOPS[i + 1]!) i++;
    const k = Math.max(0, Math.min(1, (f - STOPS[i]!) / (STOPS[i + 1]! - STOPS[i]!)));
    const a = stops[i]!;
    const b = stops[i + 1]!;
    const r = Math.round(a[0] + (b[0] - a[0]) * k);
    const g = Math.round(a[1] + (b[1] - a[1]) * k);
    const bl = Math.round(a[2] + (b[2] - a[2]) * k);
    const key = (r << 16) | (g << 8) | bl;
    if (key === last) continue;
    last = key;
    BAND_Y[n] = y;
    BAND_COLOR[n] = `rgb(${r},${g},${bl})`;
    n++;
  }
  BAND_Y[n] = h;
  bands.n = n;
}

/**
 * Paint the sky down to `bottom` (everything below it is covered by the hills and the meadow,
 * or the cloud floor). Each band overlaps the next by a pixel, so no seam shows between them at
 * any scale.
 */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone, step: number, bottom: number): void {
  const h = Math.ceil(s.cssH);
  if (bands.step !== step || bands.h !== h) {
    buildBands(tone, h);
    bands.step = step;
    bands.h = h;
  }
  const end = Math.min(s.cssH, Math.ceil(bottom));
  for (let i = 0; i < bands.n; i++) {
    const y0 = BAND_Y[i]!;
    if (y0 >= end) break;
    ctx.fillStyle = BAND_COLOR[i]!;
    ctx.fillRect(0, y0, s.cssW, Math.min(BAND_Y[i + 1]! + 1, end) - y0);
  }
}

// ---------------------------------------------------------------- sun

/** Scratch results of `sunAt` / `moonAt`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };

/** The halo's reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.42;

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
  SUN.x = Math.max(r0 * 1.6, s.cssW / 2 - s.u * 0.36);
  SUN.y = y0 + (Math.min(floor, s.cssH) + SUN.r * 1.3 - y0) * k;
  return SUN;
}

/** A ring of dots round the sun and the moon: their directions, and how far out they stand and how big they are (radii). */
const RING_DOTS = 16;
const RING = Array.from({ length: RING_DOTS }, (_, i) => [Math.cos((i / RING_DOTS) * Math.PI * 2), Math.sin((i / RING_DOTS) * Math.PI * 2)] as const);
const SUN_RING = 1.22;
const SUN_DOT = 0.07;
const MOON_RING = 1.3;
const MOON_DOT = 0.06;
/** How far the moon reaches, its ring of dots and all (radii): nothing may pass over any of it. */
export const MOON_REACH = MOON_RING + MOON_DOT;

/** A ring of dots round (x, y), `out` radii from it, each `dot` radii across, as subpaths. */
function ring(ctx: Ctx, x: number, y: number, r: number, out: number, size: number): void {
  for (const [c, sn] of RING) dot(ctx, x + c * r * out, y + sn * r * out, r * size);
}

/** The sun: its flat halo, its ring of red dots, the disc with its fine contour, and a triskele drawn in it. */
export function sun(ctx: Ctx, s: Scene, tone: Tone, floor: number): void {
  if (tone.sunSet >= 1) return;
  const { x, y, r } = sunAt(s, tone, floor);
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * SUN_REACH);
  ctx.fill();
  ctx.fillStyle = tone.sunDots;
  ctx.beginPath();
  ring(ctx, x, y, r, SUN_RING, SUN_DOT);
  ctx.fill();
  ctx.fillStyle = tone.sunLine;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = tone.sunBody;
  ctx.beginPath();
  circle(ctx, x, y, r * 0.92);
  ctx.fill();
  ctx.beginPath();
  triskelePath(ctx, x, y, r * 0.62);
  ctx.strokeStyle = tone.sunShade;
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- moon and stars

/** Where the moon hangs: up on the left where the sun hung, below the title. */
export function moonAt(s: Scene): typeof MOON_AT {
  MOON_AT.r = s.u * 0.05;
  MOON_AT.x = Math.max(MOON_AT.r * 2, s.cssW / 2 - s.u * 0.36);
  MOON_AT.y = s.cssH * 0.25;
  return MOON_AT;
}

/**
 * A crescent: the disc at (x, y) of radius r less the bite of radius br at (bx, by), as its own
 * subpath: round the outside of the disc away from the bite, then back along the bite's edge.
 */
function crescentPath(ctx: Ctx, x: number, y: number, r: number, bx: number, by: number, br: number): void {
  const d = Math.hypot(bx - x, by - y);
  const toward = Math.atan2(by - y, bx - x);
  const a = Math.acos((r * r - br * br + d * d) / (2 * d * r));
  const b = Math.acos((br * br - r * r + d * d) / (2 * d * br));
  ctx.moveTo(x + Math.cos(toward + a) * r, y + Math.sin(toward + a) * r);
  ctx.arc(x, y, r, toward + a, toward - a + Math.PI * 2);
  ctx.arc(bx, by, br, toward + Math.PI + b, toward + Math.PI - b, true);
  ctx.closePath();
}

/** A crescent moon up on the left, fading in at dusk, lit low on the side the sun set, in a ring of gold dots. */
export function moon(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.moon <= 0) return;
  const { x, y, r } = moonAt(s);
  const bx = x + r * 0.5;
  const by = y - r * 0.28;
  ctx.globalAlpha = tone.moon;
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  crescentPath(ctx, x, y, r, bx, by, r * 0.86);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  crescentPath(ctx, x - r * 0.05, y - r * 0.05, r * 0.88, bx, by, r * 0.86);
  ctx.fill();
  ctx.globalAlpha = tone.moon * 0.85;
  ctx.fillStyle = MOON_DOTS;
  ctx.beginPath();
  ring(ctx, x, y, r, MOON_RING, MOON_DOT);
  ctx.fill();
  ctx.globalAlpha = 1;
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

/** The dots of a rosette star round its center: four petals of dots, in units of its size. */
const ROSETTE = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Stars over the night sky in three twinkle groups (one fill each): the bright ones rosettes of five dots, the rest single dots. */
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
      if (st.big) {
        dot(ctx, x, y, r * 1.1);
        for (const [dx, dy] of ROSETTE) dot(ctx, x + dx * r * 2.6, y + dy * r * 2.6, r * 0.75);
      } else dot(ctx, x, y, r);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Scratch result of `morningStarAt`. */
const MORNING_STAR = { x: 0, y: 0 };

/** The morning star: low on the right, out in the lane, across the sky from where the moon hangs. */
export function morningStarAt(s: Scene): typeof MORNING_STAR {
  MORNING_STAR.x = Math.min(s.cssW - s.u * 0.06, s.cssW / 2 + s.u * 0.33);
  MORNING_STAR.y = s.cssH * 0.4;
  return MORNING_STAR;
}

/** The morning star at the loop's dawn: one big sparkle with a flat halo, gently pulsing. */
export function morningStar(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.morningStar <= 0.01) return;
  const { x, y } = morningStarAt(s);
  const r = s.u * 0.014 * (1 + 0.08 * Math.sin(s.t * 1.3));
  ctx.globalAlpha = tone.morningStar * 0.3;
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  circle(ctx, x, y, r * 1.5);
  ctx.fill();
  ctx.globalAlpha = tone.morningStar;
  ctx.beginPath();
  sparkle(ctx, x, y, r * 1.9);
  circle(ctx, x, y, r * 0.42);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Shooting stars: one every SHOOT_EVERY seconds or so, each crossing the sky for SHOOT_TIME. */
const SHOOT_EVERY = 6.3;
const SHOOT_TIME = 0.75;
/**
 * How far down the screen a shooting star may start (fractions of its height, plus 0.05 u): on
 * the right anywhere in the upper sky, on the moon's side only high above it (the moon is up
 * whenever the stars are bright enough for one: tone.ts).
 */
const SHOOT_FROM = 0.08;
const SHOOT_SPAN = 0.22;
const SHOOT_SPAN_MOON = 0.06;

/**
 * Now and then a shooting star streaks down and outward high in a side lane, by night only,
 * a bright head with a fading tail. Which side, where and which way are picked per streak.
 */
export function shootingStar(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars < 0.6) return;
  const n = Math.floor(s.t / SHOOT_EVERY);
  const k = (s.t - n * SHOOT_EVERY) / SHOOT_TIME;
  if (k >= 1 || hash(n * 3 + 9100) < 0.25) return;
  const u = s.u;
  const side = hash(n * 3 + 9101) < 0.5 ? -1 : 1;
  // Starts between 0.3 and 0.4 u out from the center, falls outward and down 0.08 u.
  const x0 = s.cssW / 2 + side * u * (0.3 + hash(n * 3 + 9102) * 0.1);
  const y0 = s.cssH * (SHOOT_FROM + hash(n * 3 + 9103) * (side < 0 ? SHOOT_SPAN_MOON : SHOOT_SPAN)) + u * 0.05;
  const run = u * 0.08;
  const hx = x0 + side * run * k;
  const hy = y0 + run * 0.55 * k;
  const len = u * 0.05 * Math.sin(Math.PI * Math.min(1, k * 1.4));
  const a = Math.sin(Math.PI * k) * tone.stars;
  ctx.globalAlpha = a * 0.55;
  ctx.strokeStyle = "#fff8e0";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx - side * len, hy - len * 0.55);
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  circle(ctx, hx, hy, u * 0.0045);
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
