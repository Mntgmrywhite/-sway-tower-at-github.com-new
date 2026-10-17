import { circle, hash, mix, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { COLUMN, HORIZON_UP, LAND_TOP } from "./place";
import { smooth, type Tone } from "./tone";

// The sky and what hangs in it: the colors of the hour (from tone.ts), top to bottom; a wooden-toy sun up on
// the left (a round disc in a ring of rounded rays, turning very slowly) that sinks into the
// cloud sea at sunset and climbs out of it again at sunrise; and at night, in the same spot, a
// sleepy crescent moon with a little mobile of three stars hanging from it on threads, and
// plump five-point stars across the sky, like the ones on a nursery mobile. The sun and the moon
// keep to the left, and nothing ever passes over them (the owner's rule): no cloud or toy drifts
// through their part of the lane (`lightsSpan`, drift.ts), and only the cloud sea they set into
// and rise out of covers them. Far away: flat fills, no outline.

/** Gradient stops for the four sky colors (top, middle, glow band, bottom). */
const STOPS = [0, 0.4, 0.7, 0.92] as const;
/**
 * The sky is painted as this many flat bands down the screen (each about 6 px on a phone, a
 * step of about one shade in each color channel): solid fills cost a fraction of a gradient's.
 */
const BANDS = 140;

/** The sky's color a fraction `f` of the way down the screen, blended between the stops. */
function skyColor(tone: Tone, f: number): string {
  if (f <= STOPS[0]) return tone.sky[0];
  for (let i = 1; i < STOPS.length; i++) {
    if (f > STOPS[i]!) continue;
    const a = STOPS[i - 1]!;
    return mix(tone.sky[i - 1]!, tone.sky[i]!, (f - a) / (STOPS[i]! - a));
  }
  return tone.sky[STOPS.length - 1]!;
}

/** Each tone step's bands, built when first needed. */
const bandCache = new Map<number, string[]>();

/** The sky's band colors, top to bottom, for this tone step. */
export function skyBands(tone: Tone, step: number): string[] {
  let bands = bandCache.get(step);
  if (!bands) {
    bands = Array.from({ length: BANDS }, (_, i) => skyColor(tone, (i + 0.5) / BANDS));
    bandCache.set(step, bands);
  }
  return bands;
}

/** Paint the sky down to `bottom` (everything below it is covered by the land or the cloud sea). */
export function skyFill(ctx: Ctx, s: Scene, bands: readonly string[], bottom: number): void {
  const h = s.cssH / BANDS;
  const end = Math.min(s.cssH, Math.ceil(bottom));
  for (let i = 0; i < BANDS; i++) {
    const y = i * h;
    if (y >= end) break;
    ctx.fillStyle = bands[i]!;
    // Each band reaches a pixel into the next, so no seam shows between them.
    ctx.fillRect(0, y, s.cssW, Math.min(h + 1, end - y));
  }
}

// ---------------------------------------------------------------- sun

/** Scratch results of `sunAt`, `moonAt` and `lightsSpan`, reused so placing them allocates nothing. */
const SUN = { x: 0, y: 0, r: 0 };
const MOON_AT = { x: 0, y: 0, r: 0 };
const LIGHTS = { x0: 0, x1: 0 };

/** The sun's day spot, as a fraction of the screen height: under the HUD, over the castle's flag. */
const SUN_Y = 0.262;
/**
 * How far (u) the sun's rays keep above the castle's flag as the title shows it. On a phone the
 * sun's spot is well clear of it; on a squarer screen (a tablet, a desktop browser) the land stands
 * taller on the screen, and the sun sits up out of its way so the flag never pokes into it.
 */
const SUN_CLEAR = 0.01;
/** How far the rays reach, in disc radii. Everything the sun draws stays inside this. */
export const SUN_REACH = 1.62;
/** The sun's and the moon's x: up the left lane (u left of the center). */
const CELESTIAL_X = 0.36;
/** The sun's disc by day and the moon's (u); the sun swells by SUN_SWELL of it as it sets. */
const SUN_R = 0.05;
const SUN_SWELL = 0.4;
const MOON_R = 0.05;
/** How far the moon and its mobile reach either side of its center, in moon radii (its clip box). */
const MOON_REACH = 1.5;

function celestialX(s: Scene, reach: number): number {
  return Math.max(reach + s.u * 0.02, s.cssW / 2 - s.u * CELESTIAL_X);
}

/**
 * The left and right edges (px) of everything the sun or the moon ever draws, at any hour (the
 * setting sun's rays at their widest, the moon's mobile): their part of the left lane, which
 * nothing drifts through (drift.ts), so nothing ever passes over them.
 */
export function lightsSpan(s: Scene): typeof LIGHTS {
  const sunX = celestialX(s, s.u * SUN_R * SUN_REACH);
  const sunReach = s.u * SUN_R * (1 + SUN_SWELL) * SUN_REACH;
  const moonX = celestialX(s, s.u * MOON_R * 1.2);
  const moonReach = s.u * MOON_R * MOON_REACH;
  LIGHTS.x0 = Math.min(sunX - sunReach, moonX - moonReach);
  LIGHTS.x1 = Math.max(sunX + sunReach, moonX + moonReach);
  return LIGHTS;
}

/**
 * Where the sun is: by day up the left lane, below the title; at sunset it swells a little and
 * sinks below `sea` (the cloud sea's top), and at sunrise it climbs back out. `r` is the disc;
 * its rays reach SUN_REACH r.
 */
export function sunAt(s: Scene, tone: Tone, sea: number): typeof SUN {
  const k = 1 - tone.sunUp;
  const r0 = s.u * SUN_R;
  // The land's top at the start: the floor line's start (s.groundY - s.rise stays put as the
  // camera climbs) less the horizon's height and the flag's. The land only sinks from there.
  const land = s.groundY - s.rise - s.u * (HORIZON_UP + LAND_TOP);
  const y0 = Math.min(s.cssH * SUN_Y, land - r0 * SUN_REACH - s.u * SUN_CLEAR);
  SUN.r = r0 * (1 + SUN_SWELL * k);
  SUN.x = celestialX(s, r0 * SUN_REACH);
  SUN.y = y0 + (Math.max(y0, sea) + SUN.r * SUN_REACH - y0) * k;
  return SUN;
}

const RAYS = 10;

export function sun(ctx: Ctx, s: Scene, tone: Tone, sea: number): void {
  if (tone.sunUp <= 0) return;
  const { x, y, r } = sunAt(s, tone, sea);
  // A soft flat halo, then rounded rays: one stroke of short round-capped spokes, turning slowly.
  ctx.fillStyle = tone.sunHalo;
  ctx.beginPath();
  circle(ctx, x, y, r * 1.32);
  ctx.fill();
  const spin = s.t * 0.05;
  const w = r * 0.3;
  ctx.beginPath();
  for (let i = 0; i < RAYS; i++) {
    const a = spin + (i / RAYS) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const out = i % 2 ? SUN_REACH * r - w / 2 : (SUN_REACH - 0.14) * r - w / 2;
    ctx.moveTo(x + c * r * 1.2, y + sn * r * 1.2);
    ctx.lineTo(x + c * out, y + sn * out);
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
  // A turned-wood ring on the face, and a glint.
  ctx.strokeStyle = tone.sunShade;
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  circle(ctx, x - r * 0.05, y - r * 0.06, r * 0.56);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  oval(ctx, x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6);
  ctx.fill();
}

// ---------------------------------------------------------------- moon and its mobile

/** The mobile's threads: x offset and length in moon radii, and each star's size. */
const THREADS = [
  [-0.55, 1.15, 0.34],
  [0.05, 1.75, 0.42],
  [0.6, 1.3, 0.32],
] as const;

/** Where the moon hangs: up the left lane, below the title; it rises out of the sea at dusk and sinks back before dawn. */
export function moonAt(s: Scene, tone: Tone, sea: number): typeof MOON_AT {
  const r = s.u * MOON_R;
  const y0 = s.cssH * 0.25;
  const k = 1 - tone.moonUp;
  MOON_AT.r = r;
  MOON_AT.x = celestialX(s, r * 1.2);
  MOON_AT.y = y0 + (Math.max(y0, sea) + r * 1.1 - y0) * k;
  return MOON_AT;
}

const MOON = "#fff3c8";
const MOON_SHADE = "#efd99c";
const MOON_FACE = "#c9a86a";
const CHEEK = "rgba(255, 150, 150, 0.45)";
const STAR_GOLD = "#ffd95a";
const STAR_GOLD_LIGHT = "#fff1b0";

/** Where the mobile's threads leave the moon, in moon radii below its center: on the crescent, under its body. */
const THREAD_TOP = 0.62;

/**
 * A crescent moon with a sleepy face, and a mobile of three gold stars hanging from it on
 * threads, swaying a little. The bite is cut away (a clip), so the sky, the stars and the
 * night's constellation show through it as the moon rises and sets past them.
 */
export function moon(ctx: Ctx, s: Scene, tone: Tone, sea: number): void {
  if (tone.moonUp <= 0) return;
  const { x, y, r } = moonAt(s, tone, sea);
  // The mobile first, so the moon hangs in front of the threads' tops.
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = Math.max(1, s.u * 0.0022);
  ctx.beginPath();
  for (let i = 0; i < THREADS.length; i++) {
    const [dx, len] = THREADS[i]!;
    const swing = Math.sin(s.t * 0.7 + i * 2.1) * 0.06;
    ctx.moveTo(x + dx * r, y + r * THREAD_TOP);
    ctx.lineTo(x + dx * r + Math.sin(swing) * len * r, y + r * THREAD_TOP + Math.cos(swing) * len * r);
  }
  ctx.stroke();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? STAR_GOLD_LIGHT : STAR_GOLD;
    ctx.beginPath();
    for (let i = 0; i < THREADS.length; i++) {
      const [dx, len, size] = THREADS[i]!;
      const swing = Math.sin(s.t * 0.7 + i * 2.1) * 0.06;
      const sx = x + dx * r + Math.sin(swing) * len * r;
      const sy = y + r * THREAD_TOP + Math.cos(swing) * len * r + size * r * 0.8;
      if (pass) circle(ctx, sx - size * r * 0.25, sy - size * r * 0.25, size * r * 0.22);
      else starPath(ctx, sx, sy, size * r);
    }
    ctx.fill();
  }
  // The moon: shade, then body, with the bite cut out of both (everything around the moon but
  // the bite circle, filled even-odd, is the clip).
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r * MOON_REACH, y - r * MOON_REACH, r * MOON_REACH * 2, r * MOON_REACH * 2);
  circle(ctx, x + r * 0.5, y - r * 0.32, r * 0.84);
  ctx.clip("evenodd");
  ctx.fillStyle = MOON_SHADE;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.fillStyle = MOON;
  ctx.beginPath();
  circle(ctx, x - r * 0.06, y - r * 0.06, r * 0.9);
  ctx.fill();
  ctx.restore();
  // A closed eye and a rosy cheek on the thick of the crescent.
  ctx.strokeStyle = MOON_FACE;
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x - r * 0.42, y + r * 0.1, r * 0.13, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  circle(ctx, x - r * 0.28, y + r * 0.42, r * 0.11);
  ctx.fill();
}

/** Stars: position (fractions of the screen), size (u), twinkle group, and whether it is a big five-point star. */
const STARS = Array.from({ length: 64 }, (_, i) => ({
  x: hash(i * 3 + 2700),
  y: 0.03 + hash(i * 3 + 2701) * 0.8,
  r: 0.0026 + hash(i * 3 + 2702) * 0.0032,
  g: i % 3,
  big: hash(i + 2900) > 0.84,
}));

/** Stars keep this far (u) in from the screen's sides, so no star is cut in half by an edge. */
const STAR_MARGIN = 0.022;

/** Stars over the night sky in three twinkle groups (one fill each), down to `bottom`. */
export function stars(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  if (tone.stars <= 0) return;
  const u = s.u;
  const c0 = s.cssW / 2 - u * (COLUMN + 0.02);
  const c1 = s.cssW / 2 + u * (COLUMN + 0.02);
  const edge = u * STAR_MARGIN;
  const span = s.cssW - edge * 2;
  ctx.fillStyle = "#fff8e0";
  for (let g = 0; g < 3; g++) {
    ctx.globalAlpha = tone.stars * (0.64 + 0.36 * Math.sin(s.t * 0.8 + g * 2.1));
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== g) continue;
      const x = edge + st.x * span;
      const y = st.y * s.cssH;
      // Nothing twinkles behind the tower.
      if ((x > c0 && x < c1) || y > bottom) continue;
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

// ---------------------------------------------------------------- constellations

/** Constellations: stars as [x, y] in units of the size, and the lines between them (index pairs). */
const CONSTELLATIONS: readonly { stars: readonly (readonly [number, number])[]; lines: readonly (readonly [number, number])[] }[] = [
  // A sailboat: hull, mast, mainsail and jib.
  {
    stars: [
      [-1.5, 0.7],
      [1.5, 0.7],
      [1.0, 1.25],
      [-1.0, 1.25],
      [0, -1.7],
      [1.2, 0.45],
      [-1.0, 0.45],
      [0, 0.7],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [7, 4],
      [4, 5],
      [5, 7],
      [4, 6],
      [6, 7],
    ],
  },
  // A teddy's head: a ring of stars, two ears and a nose.
  {
    stars: [
      [0, -1.0],
      [0.87, -0.5],
      [0.87, 0.5],
      [0, 1.0],
      [-0.87, 0.5],
      [-0.87, -0.5],
      [1.15, -1.15],
      [-1.15, -1.15],
      [0, 0.3],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [1, 6],
      [5, 7],
    ],
  },
];

/** Where the constellations hang: up the left lane under the moon (fraction of the screen height), and their size (u). */
const CONSTELLATION_Y = 0.48;
const CONSTELLATION_K = 0.045;

/** Where the night's constellation is drawn: center and size, px. */
function constellationAt(s: Scene): { x: number; y: number; k: number } {
  return { x: celestialX(s, s.u * 0.08), y: s.cssH * CONSTELLATION_Y, k: s.u * CONSTELLATION_K };
}

/**
 * The moon is this far up (tone.moonUp) when its mobile has cleared the constellation's spot on
 * every screen: the constellation comes out once the moon is above it and goes in as it sinks,
 * so the moon never rises or sets through it.
 */
const CONSTELLATION_MOON = 0.9;

/**
 * The night's constellations, up the left lane under the moon: early in the night a sailboat,
 * later a teddy's head (tone.ts cross-fades them), out with the stars while the moon is up.
 */
export function constellations(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = tone.stars * smooth(CONSTELLATION_MOON, 1, tone.moonUp);
  if (a <= 0) return;
  const { x, y, k } = constellationAt(s);
  if (tone.teddy < 1) constellation(ctx, s, x, y, k, 0, a * (1 - tone.teddy));
  if (tone.teddy > 0) constellation(ctx, s, x, y, k, 1, a * tone.teddy);
}

/** A constellation in a toy's shape: faint lines between plump little stars. */
function constellation(ctx: Ctx, s: Scene, x: number, y: number, k: number, v: number, a: number): void {
  const c = CONSTELLATIONS[v % CONSTELLATIONS.length]!;
  ctx.globalAlpha = a * 0.45;
  ctx.strokeStyle = "#cfd8ff";
  ctx.lineWidth = Math.max(1, s.u * 0.0018);
  ctx.beginPath();
  for (const [a, b] of c.lines) {
    const p = c.stars[a]!;
    const q = c.stars[b]!;
    ctx.moveTo(x + p[0] * k, y + p[1] * k);
    ctx.lineTo(x + q[0] * k, y + q[1] * k);
  }
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fff8e0";
  ctx.beginPath();
  for (const [sx, sy] of c.stars) starPath(ctx, x + sx * k, y + sy * k, s.u * 0.0075);
  ctx.fill();
  ctx.globalAlpha = 1;
}
