import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { BLOCK_HEIGHT } from "../../config";
import { CREAM, MOON, MOON_HALO, MOON_SHADE, MUSTARD, SNOW, SUN_HALO, WHITE } from "./colors";
import { sparklePath, starburstPath, TAU } from "./shapes";
import { BANDS, level, LOOP_START, moonUp, smooth, storyLevel, sunUp, toneAt, toneOf, type Tone } from "./tone";

// The sky over London, printed like a 1950s Christmas card: flat bands of color from the top of
// the screen down to the glow on the horizon (no soft gradients), a pale flat moon up in the
// right corner (clear of the HUD and of the rooftops at any phone size), small dot stars and
// atomic starbursts in the side lanes, snow falling as little geometric flakes (finer behind the
// tower, so its column stays calm), and now and then a flock of pigeons crossing above the
// chimneys. Up the story's loop (tone.ts) the bands take the hour's colors, the moon sets and a
// rayed winter sun rises on the left for Christmas morning, the snow stops for the bright day and
// comes back with the dusk. Nothing ever crosses the sun or the moon.

// ---------------------------------------------------------------- the bands

/**
 * Where the sky's bands hang from: the horizon while it is on screen, then the screen's bottom
 * once the climb has sunk it (so past the first turn of the loop the bands never move again).
 */
function skyAnchor(s: Scene): number {
  return Math.max(1, Math.min(s.horizonY, s.cssH));
}

/** The whole screen, in the hour's flat bands; the last runs on to the bottom behind the land. */
export function skyFill(ctx: Ctx, s: Scene, tone: Tone): void {
  const h = skyAnchor(s);
  let y0 = 0;
  for (let i = 0; i < BANDS.length; i++) {
    const y1 = i + 1 < BANDS.length ? Math.round(BANDS[i + 1]! * h) : s.cssH;
    if (y1 <= y0) continue;
    ctx.fillStyle = tone.bands[i]!;
    // Two pixels' overlap into the next band (more than a whole device pixel at any zoom), so the
    // next one's anti-aliased edge always lies over solid color and no seam shows between them.
    ctx.fillRect(0, y0, s.cssW, y1 - y0 + (y1 < s.cssH ? 2 : 0));
    y0 = y1;
  }
}

// ---------------------------------------------------------------- moon

/** Upper right, outside the top-center HUD zone and well above the townhouse roofs. */
function moonX(s: Scene): number {
  return s.cssW / 2 + s.u * 0.375;
}
/** At its spot when `up` is 1; sunk below the bottom of the screen, halo and all, at 0. */
function moonY(s: Scene, up: number): number {
  const y = s.cssH * 0.205;
  return up >= 1 ? y : y + (s.cssH + moonR(s) * HALO_REACH - y) * (1 - up);
}
function moonR(s: Scene): number {
  return s.u * 0.068;
}
/** The flat rings of light round the moon and the sun reach this many radii. */
const HALO_REACH = 1.9;
/** The halo's two flat rings: radius (in radii) and opacity, so it steps out like a print. */
const HALO_RINGS = [
  [1.9, 0.05],
  [1.45, 0.09],
] as const;
/**
 * Rising and setting, the sun and the moon pass the bottom of the screen; once the street's
 * horizon has sunk out of view nothing hides them there, so they fade there instead of being cut by
 * the screen's edge: gone while anything of them (the rays, the halo, out to BODY_REACH radii)
 * would touch the edge, whole again EDGE_FADE radii higher.
 */
const BODY_REACH = 2.2;
const EDGE_FADE = 1.5;

/** How much of a body at screen y with radius r shows near the bottom of the screen. */
function edgeFade(s: Scene, y: number, r: number): number {
  const k = (s.cssH - y - r * BODY_REACH) / (r * EDGE_FADE);
  return k <= 0 ? 0 : k >= 1 ? 1 : k;
}

/** Two flat rings of light about (x, y), radius r, at `fade` opacity. */
function halo(ctx: Ctx, x: number, y: number, r: number, color: string, fade: number): void {
  ctx.fillStyle = color;
  for (const [k, a] of HALO_RINGS) {
    ctx.beginPath();
    circle(ctx, x, y, r * k);
    ctx.globalAlpha = a * fade;
    ctx.fill();
  }
  ctx.globalAlpha = fade;
}

/** Its flat seas, as (x, y, r) fractions of the radius. */
const SEAS = [
  [-0.28, -0.22, 0.22],
  [0.26, 0.16, 0.2],
  [-0.08, 0.44, 0.12],
] as const;

/** A pale full moon, flat: a stepped halo, a shaded crescent along its rim, flat seas, a twinkle. */
function moon(ctx: Ctx, s: Scene, up: number): void {
  if (up <= 0) return;
  const x = moonX(s);
  const y = moonY(s, up);
  const r = moonR(s);
  const fade = edgeFade(s, y, r);
  if (fade <= 0) return;
  halo(ctx, x, y, r, MOON_HALO, fade);
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = MOON_SHADE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.1, y - r * 0.06, r * 0.9);
  ctx.fillStyle = MOON;
  ctx.fill();
  ctx.beginPath();
  for (const [cx, cy, cr] of SEAS) circle(ctx, x + cx * r, y + cy * r, cr * r);
  ctx.fillStyle = MOON_SHADE;
  ctx.globalAlpha = 0.55 * fade;
  ctx.fill();

  const tw = 0.5 + 0.5 * Math.sin(s.t * 1.3);
  ctx.beginPath();
  // On the outer (right) shoulder, so the twinkle never reaches into the HUD's column.
  sparklePath(ctx, x + r * 0.85, y - r * 0.75, r * (0.22 + 0.12 * tw));
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = (0.65 + 0.35 * tw) * fade;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- sun

/** The winter sun: upper left, mirroring the moon, so it too keeps clear of the HUD and the tower. */
function sunX(s: Scene): number {
  return s.cssW / 2 - s.u * 0.375;
}
function sunR(s: Scene): number {
  return s.u * 0.062;
}
/** An atomic sun's rays: how many (long and short by turns), their feet and tips in radii. */
const RAYS = 16;
const RAY_FOOT = 1.14;
const RAY_LONG = 1.62;
const RAY_SHORT = 1.36;
/** Half a ray's width at its foot, radians. */
const RAY_HALF = (TAU / RAYS) * 0.3;

/**
 * Christmas morning's sun: rises from below the screen on the left as you climb into the morning
 * (see edgeFade), keeps its spot through the day and sinks again in the late afternoon. A flat
 * disc in a ring of pointed rays, long and short by turns, like a 1950s starburst clock; warm gold
 * low down, pale at its height.
 */
function sun(ctx: Ctx, s: Scene, tone: Tone, up: number): void {
  if (up <= 0) return;
  const r = sunR(s);
  const spot = s.cssH * 0.205;
  const y = up >= 1 ? spot : spot + (s.cssH + r * HALO_REACH - spot) * (1 - up);
  const x = sunX(s);
  const fade = edgeFade(s, y, r);
  if (fade <= 0) return;
  halo(ctx, x, y, r, SUN_HALO, fade);

  ctx.beginPath();
  const foot = r * RAY_FOOT;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * TAU;
    const tip = r * (i % 2 ? RAY_SHORT : RAY_LONG);
    ctx.moveTo(x + Math.cos(a - RAY_HALF) * foot, y + Math.sin(a - RAY_HALF) * foot);
    ctx.lineTo(x + Math.cos(a) * tip, y + Math.sin(a) * tip);
    ctx.lineTo(x + Math.cos(a + RAY_HALF) * foot, y + Math.sin(a + RAY_HALF) * foot);
    ctx.closePath();
  }
  ctx.fillStyle = tone.sunShade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = tone.sunShade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 0.84);
  ctx.fillStyle = tone.sunBody;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The sun and the moon where the story has them (in the side lanes, clear of the tower). */
export function bodies(ctx: Ctx, s: Scene): void {
  const lvl = level(s);
  sun(ctx, s, toneAt(lvl), sunUp(lvl));
  moon(ctx, s, moonUp(lvl));
}

// ---------------------------------------------------------------- stars

/** How far either side of the center line the tower's column keeps clear of stars (u). */
const STAR_CLEAR = 0.24;

/** Small dot stars over the sky: x, y as fractions of the screen, size (px) and a twinkle phase. */
const DOTS = Array.from({ length: 60 }, (_, i) => ({ x: hash(i), y: hash(i + 100) * 0.8, r: 0.7 + hash(i + 200) * 0.9 }));

/** A small diamond of half-diagonal r as its own subpath: the card's dot of light (and much cheaper than a tiny circle). */
function dot(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

/** Small dots in the side lanes, above the horizon, twinkling. */
function dotStars(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.stars <= 0) return;
  const cx = s.cssW / 2;
  const clear = s.u * STAR_CLEAR;
  ctx.fillStyle = CREAM;
  for (let g = 0; g < 3; g++) {
    ctx.beginPath();
    for (let i = g; i < DOTS.length; i += 3) {
      const st = DOTS[i]!;
      const x = st.x * s.cssW;
      const y = st.y * s.cssH;
      if (Math.abs(x - cx) < clear || y > s.horizonY - s.u * 0.05) continue;
      dot(ctx, x, y, st.r * 1.2);
    }
    ctx.globalAlpha = (0.55 + 0.35 * Math.sin(s.t * 1.5 + g * 2.1)) * tone.stars;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Atomic starbursts that come out as the tower climbs into the night: [x, y] as fractions of
 * the screen, a twinkle group, a size. They keep to the side lanes, clear of the HUD and the
 * tower; a few (BIG_BURSTS) are the card's big feature stars, low in the lanes.
 */
const BIG_BURSTS: readonly number[] = [1, 6, 7];
const BIG = 1.8;
const BURSTS = Array.from({ length: 12 }, (_, i) => {
  const fy = 0.06 + hash(i + 7600) * 0.56;
  const side = i % 2;
  const fx = (side ? 0.82 : 0.03) + hash(i + 7800) * 0.15;
  return [fx, fy, i % 3, BIG_BURSTS.includes(i) ? BIG : 1] as const;
});

/** The starbursts' ink: mustard warmed toward the cream of the moon. */
const BURST = mix(MUSTARD, CREAM, 0.35);

/** No starburst within this many u (plus its own reach) of the sun's or the moon's spot, so none peeks out round them. */
const BODY_CLEAR = 0.14;
/** A starburst's radius (u) at its smallest twinkle, and how much it grows. */
const BURST_R = 0.022;
const BURST_TW = 0.008;

function starbursts(ctx: Ctx, s: Scene, tone: Tone): void {
  const a = tone.sparkles;
  if (a <= 0) return;
  const by = s.cssH * 0.205;
  const clear = s.u * BODY_CLEAR;
  for (let g = 0; g < 3; g++) {
    const tw = 0.5 + 0.5 * Math.sin(s.t * 1.6 + g * 2.1);
    ctx.beginPath();
    for (const [fx, fy, group, size] of BURSTS) {
      if (group !== g) continue;
      const x = fx * s.cssW;
      const y = fy * s.cssH;
      const near = clear + s.u * (BURST_R + BURST_TW) * size;
      if (Math.hypot(x - moonX(s), y - by) < near || Math.hypot(x - sunX(s), y - by) < near) continue;
      starburstPath(ctx, x, y, s.u * (BURST_R + BURST_TW * tw) * size);
    }
    ctx.fillStyle = BURST;
    ctx.globalAlpha = a * (0.55 + 0.45 * tw);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- day clouds

/**
 * Flat cut-paper clouds that drift by in the right lane on the loop's bright day, while the moon
 * is set (so none ever crosses it): stacks of rounded strips, the longest at the bottom. Each
 * passes 40% of the way down the screen at story level `at` (past LOOP_START), center `x` u right
 * of the center line, `w` u long; they sink half as fast as the tower as you climb.
 */
const CLOUDS = [
  { at: 46, x: 0.35, w: 0.17 },
  { at: 55, x: 0.32, w: 0.18 },
  { at: 63, x: 0.37, w: 0.15 },
  { at: 72, x: 0.33, w: 0.18 },
] as const;
/** The clouds grow in once the moon has set and shrink away before it rises (levels past LOOP_START: tone.ts), opaque like cut paper (a fade would turn them grey). */
const CLOUD_IN = [36, 42] as const;
const CLOUD_OUT = [76, 82] as const;
/** How fast they sink as the tower climbs, against the tower. */
const CLOUD_PARALLAX = 0.5;
/** Each cloud's strips: [left end, right end] as fractions of its length, top down; each strip CLOUD_H u thick. */
const STRIPS = [
  [0.3, 0.72],
  [0.12, 0.88],
  [0, 1],
] as const;
const CLOUD_H = 0.026;
/** Below this size (a fraction of full) a growing or shrinking cloud is not drawn. */
const CLOUD_MIN = 0.04;

function dayClouds(ctx: Ctx, s: Scene): void {
  const p = storyLevel(level(s)) - LOOP_START;
  const k = smooth(CLOUD_IN[0], CLOUD_IN[1], p) * (1 - smooth(CLOUD_OUT[0], CLOUD_OUT[1], p));
  if (k < CLOUD_MIN) return;
  const u = s.u;
  const h = CLOUD_H * u * k;
  const perLevel = BLOCK_HEIGHT * s.scale * CLOUD_PARALLAX;
  ctx.beginPath();
  for (const c of CLOUDS) {
    const y0 = s.cssH * 0.4 + (p - c.at) * perLevel;
    if (y0 < -h * 4 || y0 - h * 3 > s.cssH) continue;
    const L = c.w * u * k;
    const x0 = s.cssW / 2 + c.x * u - L / 2;
    STRIPS.forEach(([l, r], i) => {
      const y = y0 - (STRIPS.length - 1 - i) * h * 0.85;
      const xa = x0 + l * L;
      const xb = x0 + r * L;
      ctx.moveTo(xa + h / 2, y - h / 2);
      ctx.lineTo(xb - h / 2, y - h / 2);
      ctx.arc(xb - h / 2, y, h / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(xa + h / 2, y + h / 2);
      ctx.arc(xa + h / 2, y, h / 2, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.closePath();
    });
  }
  ctx.fillStyle = SNOW;
  ctx.fill();
}

/** Sky layer: the dot stars, the starbursts and the day's clouds, behind the sun and the moon. */
export function stars(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  dayClouds(ctx, s);
  dotStars(ctx, s, tone);
  starbursts(ctx, s, tone);
}

// ---------------------------------------------------------------- snow

interface Flake {
  x: number;
  y: number;
  z: number;
  phase: number;
}

function flakes(n: number, seed: number, zMin: number, zMax: number): Flake[] {
  return Array.from({ length: n }, (_, i) => ({
    x: hash(seed + i * 5),
    y: hash(seed + i * 5 + 1),
    z: zMin + (zMax - zMin) * hash(seed + i * 5 + 2),
    phase: hash(seed + i * 5 + 3) * TAU,
  }));
}

/** Small distant flakes (diamond dots) and fewer, larger near ones (six-armed asterisks). */
const FAR_FLAKES = flakes(90, 4000, 0, 0.6);
const NEAR_FLAKES = flakes(34, 6000, 0.6, 1);
const FAR_FLAKE = alpha(WHITE, 0.6);
const NEAR_FLAKE = alpha(WHITE, 0.92);

function flakeY(s: Scene, f: Flake): number {
  const speed = 0.03 + 0.06 * f.z; // screen heights per second
  const climb = (s.rise / s.cssH) * (0.15 + 0.35 * f.z);
  const k = (f.y + s.t * speed + climb) % 1;
  return k * (s.cssH + s.u * 0.1) - s.u * 0.05;
}

function flakeX(s: Scene, f: Flake): number {
  return f.x * s.cssW + Math.sin(s.t * (0.5 + 0.6 * f.z) + f.phase) * s.u * (0.012 + 0.03 * f.z);
}

/** Flakes are finer behind the tower: their size, from FINE in its column to whole in the lanes. */
const FINE = 0.45;
function laneSize(s: Scene, x: number): number {
  const d = (Math.abs(x - s.cssW / 2) / s.u - 0.12) / 0.18;
  const k = d <= 0 ? 0 : d >= 1 ? 1 : d * d * (3 - 2 * d);
  return FINE + (1 - FINE) * k;
}

/**
 * As the snow eases off, flakes fade out in this many groups, one after the other, so it thins
 * rather than all of it turning faint.
 */
const SNOW_GROUPS = 4;
/** The near flakes' arms, as unit vectors: three lines through the middle make six arms. */
const ARMS = [0, 1, 2].map((i) => [Math.cos((i * Math.PI) / 3 + Math.PI / 2), Math.sin((i * Math.PI) / 3 + Math.PI / 2)] as const);

/** The flakes of `list` in group g (every one when g < 0), between screen rows yMin and yMax. */
function flakePaths(ctx: Ctx, s: Scene, list: readonly Flake[], near: boolean, g: number, yMin: number, yMax: number): void {
  ctx.beginPath();
  for (let i = 0; i < list.length; i++) {
    if (g >= 0 && i % SNOW_GROUPS !== g) continue;
    const f = list[i]!;
    const y = flakeY(s, f);
    if (y < yMin || y > yMax) continue;
    const x = flakeX(s, f);
    const k = laneSize(s, x);
    if (near) {
      const r = s.u * (0.006 + 0.007 * f.z) * k;
      for (const [dx, dy] of ARMS) {
        ctx.moveTo(x - dx * r, y - dy * r);
        ctx.lineTo(x + dx * r, y + dy * r);
      }
    } else {
      dot(ctx, x, y, s.u * (0.0022 + 0.003 * f.z) * k);
    }
  }
  if (near) {
    ctx.strokeStyle = NEAR_FLAKE;
    ctx.lineWidth = Math.max(1, s.u * 0.0032);
    ctx.lineCap = "butt";
    ctx.stroke();
  } else {
    ctx.fillStyle = FAR_FLAKE;
    ctx.fill();
  }
}

/** Falling snow between screen rows yMin and yMax, as heavy as the story's weather has it. */
export function snow(ctx: Ctx, s: Scene, yMin: number, yMax: number): void {
  const density = toneOf(s).snow;
  if (density >= 1) {
    flakePaths(ctx, s, FAR_FLAKES, false, -1, yMin, yMax);
    flakePaths(ctx, s, NEAR_FLAKES, true, -1, yMin, yMax);
    return;
  }
  for (let g = 0; g < SNOW_GROUPS; g++) {
    const a = Math.min(1, (density - g / SNOW_GROUPS) * SNOW_GROUPS);
    if (a <= 0) break;
    ctx.globalAlpha = a;
    flakePaths(ctx, s, FAR_FLAKES, false, g, yMin, yMax);
    flakePaths(ctx, s, NEAR_FLAKES, true, g, yMin, yMax);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- ornamental flakes

/**
 * Big ornamental snowflakes like those printed on a 1950s card, drifting slowly down the upper
 * left lane (the moon keeps the right): [x (u left of the center line), phase, radius (u), spin].
 * Part of the printed sky: they grow in below the HUD and shrink away before they reach anything
 * standing in their lane (the roofs, the chimney smoke, the city's towers and the hills), fall
 * only while it snows, and stay away while the loop's winter sun is up in their lane.
 */
const ORNAMENTS = [
  [0.4, 0, 0.034, 0.3],
  [0.34, 0.36, 0.026, -0.25],
  [0.41, 0.69, 0.03, 0.2],
] as const;
/** Screen heights per second they drift down, and the band of the screen they cross (fractions of its height). */
const ORN_FALL = 0.008;
const ORN_BAND = [0.16, 0.44] as const;
/** The lane they drift down: this far left of the center line at most and at least (u), sway and arms included. */
export const ORN_LANE = [0.46, 0.29] as const;
/** They are gone (shrunk away) this far above the top of whatever stands in their lane (u), the biggest's arms included. */
const ORN_CLEAR = 0.045;
/** Below this much room between the HUD and the land (u) none are drawn; below ORN_FULL they are drawn smaller, so they never touch. */
const ORN_ROOM = 0.12;
const ORN_FULL = 0.26;
/** The arms' branches: [where along the arm, length], as fractions of the radius. */
const BRANCHES = [
  [0.42, 0.3],
  [0.7, 0.22],
] as const;
const ORN_INK = alpha(CREAM, 0.55);

/**
 * The ornamental flakes, as heavy as the story's snow has them, above `floor`: the screen y of the
 * highest thing standing in their lane (ORN_LANE), which they keep clear of.
 */
export function ornaments(ctx: Ctx, s: Scene, floor: number): void {
  const k = toneOf(s).snow * (1 - smooth(0, 0.05, sunUp(level(s))));
  if (k <= 0.01) return;
  const u = s.u;
  const top = s.cssH * ORN_BAND[0];
  const span = Math.min(s.cssH * ORN_BAND[1], floor - u * ORN_CLEAR) - top;
  if (span < u * ORN_ROOM) return;
  const room = Math.min(1, span / (u * ORN_FULL));
  ctx.beginPath();
  for (const [dx, phase, size, spin] of ORNAMENTS) {
    const p = (phase + s.t * ORN_FALL) % 1;
    // They grow in as they drift in and shrink away before the roofs, like the day's clouds.
    const grow = smooth(0, 0.15, p) * (1 - smooth(0.7, 1, p));
    if (grow <= 0.05) continue;
    const r = size * u * grow * room;
    const x = s.cssW / 2 - dx * u + Math.sin(s.t * 0.4 + phase * 9) * u * 0.012;
    const y = top + p * span;
    const a0 = s.t * spin + phase * 5;
    for (let i = 0; i < 6; i++) {
      const a = a0 + (i * Math.PI) / 3;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      ctx.moveTo(x + c * r * 0.16, y + sn * r * 0.16);
      ctx.lineTo(x + c * r, y + sn * r);
      for (const [at, len] of BRANCHES) {
        const bx = x + c * r * at;
        const by = y + sn * r * at;
        ctx.moveTo(bx + Math.cos(a - 0.8) * r * len, by + Math.sin(a - 0.8) * r * len);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + 0.8) * r * len, by + Math.sin(a + 0.8) * r * len);
      }
    }
  }
  ctx.strokeStyle = ORN_INK;
  ctx.lineWidth = Math.max(1, u * 0.0035);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.globalAlpha = k;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- pigeons

const FLOCK_PERIOD = 21; // seconds between passes
const FLOCK_TIME = 9; // seconds on screen
/** At s.t = 0 the flock is already crossing: it is gone by 5 s, back at 17 s (actions.test.ts). */
const FLOCK_OFFSET = 4;
/** Each bird: offset behind the leader and below it (u), flap phase. */
const FLOCK = Array.from({ length: 7 }, (_, i) => ({
  dx: i * 0.055 + hash(i + 7100) * 0.03,
  dy: (i % 2 ? 0.035 : -0.01) + hash(i + 7200) * 0.03 - i * 0.004,
  phase: hash(i + 7300) * TAU,
  size: 0.85 + hash(i + 7400) * 0.3,
}));

/** 0..1: how far the flock has crossed the sky at time t (from the right edge), or -1 while it's away. */
export function flockProgress(t: number): number {
  const p = (((t + FLOCK_OFFSET) % FLOCK_PERIOD) + FLOCK_PERIOD) % FLOCK_PERIOD;
  return p > FLOCK_TIME ? -1 : p / FLOCK_TIME;
}

/**
 * A loose flock of pigeons crossing right to left above the rooftops, wings beating, rising
 * gently: flat cut-paper birds, a teardrop body and a pointed wing. Drawn before the sun and the
 * moon, so where one is rising or setting through their height it stays whole in front of them.
 */
export function pigeonFlock(ctx: Ctx, s: Scene): void {
  const k = flockProgress(s.t);
  if (k < 0) return;
  const u = s.u;
  const span = s.cssW + u * 0.7;
  const lead = s.cssW + u * 0.1 - span * k;
  const base = s.cssH * 0.37 - k * u * 0.06;
  ctx.beginPath();
  for (const b of FLOCK) {
    const x = lead + b.dx * u;
    const y = base + b.dy * u + Math.sin(s.t * 2 + b.phase) * u * 0.006;
    const q = u * 0.011 * b.size;
    const flap = Math.sin(s.t * 13 + b.phase);
    // A teardrop body facing left, its head the round end, and a forked tail.
    ctx.moveTo(x - q * 1.9, y - q * 0.25);
    ctx.quadraticCurveTo(x - q * 1.6, y - q * 0.9, x - q * 0.6, y - q * 0.45);
    ctx.lineTo(x + q * 1.4, y - q * 0.15);
    ctx.lineTo(x + q * 2.3, y - q * 0.5);
    ctx.lineTo(x + q * 2.0, y + q * 0.05);
    ctx.lineTo(x + q * 2.3, y + q * 0.45);
    ctx.lineTo(x + q * 1.2, y + q * 0.3);
    ctx.quadraticCurveTo(x - q * 0.6, y + q * 0.7, x - q * 1.9, y - q * 0.25);
    ctx.closePath();
    // The wing: one pointed blade beating up and down from the shoulders.
    const tip = y - flap * q * 2;
    ctx.moveTo(x - q * 0.7, y - q * 0.3);
    ctx.lineTo(x + q * 1.0, tip - q * 0.3);
    ctx.lineTo(x + q * 0.6, y);
    ctx.closePath();
  }
  // Faded like the skyline, a shade darker so they read against the sky.
  ctx.fillStyle = toneOf(s).flyer;
  ctx.fill();
}
