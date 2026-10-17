import { alpha, circle, hash, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { STAR } from "./colors";
import { sparklePath, TAU } from "./shapes";
import { level, loopHorizon, moonUp, sunUp, toneAt, toneIndexAt, toneOf, type Tone } from "./tone";

// The dusk sky over London: a pale winter moon up in the right corner (clear of the HUD and
// of the rooftops at any phone size), snow falling, and now and then a flock of pigeons
// wheeling across above the chimneys. Past the first pass the sky turns with the story's loop
// (tone.ts): the skin paints it itself, the moon sets and a winter sun rises on the left for
// Christmas morning, the snow stops for the bright day and comes back with the dusk.

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
/** The soft halos of the moon and the sun reach this many radii. */
const HALO_REACH = 2.6;
/**
 * Rising and setting, the sun and the moon pass the bottom of the screen; once the street's
 * horizon has sunk out of view nothing hides them there, so they fade there instead of being cut by
 * the screen's edge: gone while anything visible of them (the sun's rays, the brighter part of a
 * halo, out to BODY_REACH radii) would touch the edge, whole again EDGE_FADE radii higher.
 */
const BODY_REACH = 2.2;
const EDGE_FADE = 1.5;

/** How much of a body at screen y with radius r shows near the bottom of the screen. */
function edgeFade(s: Scene, y: number, r: number): number {
  const k = (s.cssH - y - r * BODY_REACH) / (r * EDGE_FADE);
  return k <= 0 ? 0 : k >= 1 ? 1 : k;
}

const MOON = "#fff6df";
const MOON_SHADE = "#f0d9c4";
const CRATER = "#f6e6d2";
const HALO_STOPS = [
  [0, alpha("#fff3e0", 0.4)],
  [0.45, alpha("#ffe9e0", 0.12)],
  [1, alpha("#ffe9e0", 0)],
] as const;
let haloCtx: Ctx | null = null;
let haloFill: CanvasGradient | null = null;

/** Craters as (x, y, r) fractions of the moon's radius. */
const CRATERS = [
  [-0.3, -0.24, 0.2],
  [0.3, 0.1, 0.22],
  [-0.1, 0.42, 0.13],
  [0.08, -0.52, 0.09],
  [-0.52, 0.18, 0.09],
] as const;

/** A pale full moon: one soft halo, a warm shaded rim, flat craters and a slow twinkle. */
function moon(ctx: Ctx, s: Scene, up: number): void {
  if (up <= 0) return;
  const x = moonX(s);
  const y = moonY(s, up);
  const r = moonR(s);
  const fade = edgeFade(s, y, r);
  if (fade <= 0) return;
  ctx.globalAlpha = fade;

  if (haloCtx !== ctx || !haloFill) {
    haloCtx = ctx;
    haloFill = ctx.createRadialGradient(0, 0, 0.35, 0, 0, 1);
    for (const [at, c] of HALO_STOPS) haloFill.addColorStop(at, c);
  }
  const reach = r * HALO_REACH;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(reach, reach);
  ctx.fillStyle = haloFill;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = MOON_SHADE;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.08, y - r * 0.08, r * 0.88);
  ctx.fillStyle = MOON;
  ctx.fill();
  ctx.beginPath();
  for (const [cx, cy, cr] of CRATERS) circle(ctx, x + cx * r, y + cy * r, cr * r);
  ctx.fillStyle = CRATER;
  ctx.fill();

  const tw = 0.5 + 0.5 * Math.sin(s.t * 1.3);
  ctx.beginPath();
  // On the outer (right) shoulder, so the twinkle never reaches into the HUD's column.
  sparklePath(ctx, x + r * 0.85, y - r * 0.75, r * (0.22 + 0.12 * tw));
  ctx.fillStyle = "#ffffff";
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
/** Its soft halo, warmer than the moon's, reaching HALO_REACH radii. */
const SUN_HALO_STOPS = [
  [0, alpha("#fff1c8", 0.5)],
  [0.45, alpha("#ffe6b8", 0.16)],
  [1, alpha("#ffe6b8", 0)],
] as const;
let sunHaloCtx: Ctx | null = null;
let sunHaloFill: CanvasGradient | null = null;
/**
 * Short rounded rays around the disc: how many, where their feet sit and how far their curve
 * pulls out (in radii; the tips reach about 1.4).
 */
const RAYS = 12;
const RAY_FOOT = 1.18;
const RAY_PULL = 1.62;
/** Half a ray's width at its foot, radians. */
const RAY_HALF = (TAU / RAYS) * 0.22;

/**
 * Christmas morning's sun: rises from below the screen on the left as you climb into the morning
 * (out of the haze: see edgeFade), keeps its spot through the day and sinks again in the late
 * afternoon. A soft halo like the
 * moon's, a ring of short flat rays, a shaded rim and a highlight; warm gold low down, pale at
 * its height.
 */
function sun(ctx: Ctx, s: Scene, tone: Tone, up: number): void {
  if (up <= 0) return;
  const r = sunR(s);
  const spot = s.cssH * 0.205;
  const y = up >= 1 ? spot : spot + (s.cssH + r * HALO_REACH - spot) * (1 - up);
  const x = sunX(s);
  const fade = edgeFade(s, y, r);
  if (fade <= 0) return;
  ctx.globalAlpha = fade;

  if (sunHaloCtx !== ctx || !sunHaloFill) {
    sunHaloCtx = ctx;
    sunHaloFill = ctx.createRadialGradient(0, 0, 0.35, 0, 0, 1);
    for (const [at, c] of SUN_HALO_STOPS) sunHaloFill.addColorStop(at, c);
  }
  const reach = r * HALO_REACH;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(reach, reach);
  ctx.fillStyle = sunHaloFill;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  ctx.beginPath();
  const foot = r * RAY_FOOT;
  const pull = r * RAY_PULL;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * TAU;
    ctx.moveTo(x + Math.cos(a - RAY_HALF) * foot, y + Math.sin(a - RAY_HALF) * foot);
    ctx.quadraticCurveTo(x + Math.cos(a) * pull, y + Math.sin(a) * pull, x + Math.cos(a + RAY_HALF) * foot, y + Math.sin(a + RAY_HALF) * foot);
    ctx.closePath();
  }
  ctx.fillStyle = tone.sunShade;
  ctx.globalAlpha = 0.75 * fade;
  ctx.fill();
  ctx.globalAlpha = fade;

  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = tone.sunShade;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x - r * 0.07, y - r * 0.08, r * 0.88);
  ctx.fillStyle = tone.sunBody;
  ctx.fill();
  ctx.beginPath();
  oval(ctx, x - r * 0.36, y - r * 0.4, r * 0.24, r * 0.15, -0.6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the loop's sky

/** Where the sky's three colors sit between the top of the screen and the horizon (as the base's). */
const SKY_STOPS = [0, 0.6, 1] as const;
/** The loop's sky gradient, built in unit space and rebuilt only when the light or the context changes. */
const skyCache = { ctx: null as Ctx | null, index: -1, fill: null as CanvasGradient | null };

/** The base world's small stars (src/base/world.ts), redrawn over the loop's sky as the light allows. */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.8,
  r: 0.8 + hash(i + 200) * 1.2,
  sparkle: hash(i + 300) > 0.85,
}));

/**
 * In the loop the skin paints the sky over the base's: the hour's three colors hanging from where
 * the horizon stood at the loop's start (the base's night sky there, exactly), and the small stars.
 */
function loopSky(ctx: Ctx, s: Scene, tone: Tone, index: number): void {
  if (skyCache.ctx !== ctx || skyCache.index !== index || !skyCache.fill) {
    const g = ctx.createLinearGradient(0, 0, 0, 1);
    for (let i = 0; i < SKY_STOPS.length; i++) g.addColorStop(SKY_STOPS[i]!, tone.sky[i]!);
    skyCache.ctx = ctx;
    skyCache.index = index;
    skyCache.fill = g;
  }
  // The field covers everything below the horizon.
  const bottom = Math.min(s.cssH, Math.ceil(s.horizonY) + 1);
  if (bottom <= 0) return;
  const h = Math.max(1, loopHorizon(s));
  ctx.save();
  ctx.scale(1, h);
  ctx.fillStyle = skyCache.fill;
  ctx.fillRect(0, 0, s.cssW, bottom / h);
  ctx.restore();

  if (tone.stars <= 0) return;
  ctx.fillStyle = STAR;
  for (const [i, st] of STARS.entries()) {
    const y = st.y * s.cssH;
    if (y > s.horizonY - s.u * 0.05) continue;
    ctx.globalAlpha = (0.55 + 0.35 * Math.sin(s.t * 1.5 + i)) * tone.stars;
    const x = st.x * s.cssW;
    if (st.sparkle) {
      const r = st.r * 2.2;
      ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
      ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    } else {
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

/** The sun and the moon where the story has them (in the side lanes, clear of the tower). */
export function bodies(ctx: Ctx, s: Scene): void {
  const lvl = level(s);
  sun(ctx, s, toneAt(lvl), sunUp(lvl));
  moon(ctx, s, moonUp(lvl));
}

/** The celestial layer: in the loop the sky itself, then the sun and the moon. */
export function celestial(ctx: Ctx, s: Scene): void {
  const lvl = level(s);
  const tone = toneAt(lvl);
  if (tone.loop) loopSky(ctx, s, tone, toneIndexAt(lvl));
  bodies(ctx, s);
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

/** Small distant flakes (drawn as squares) and fewer, larger near ones (round). */
const FAR_FLAKES = flakes(90, 4000, 0, 0.6);
const NEAR_FLAKES = flakes(34, 6000, 0.6, 1);
const FAR_FLAKE = alpha("#ffffff", 0.62);
const NEAR_FLAKE = alpha("#ffffff", 0.94);

function flakeY(s: Scene, f: Flake): number {
  const speed = 0.03 + 0.06 * f.z; // screen heights per second
  const climb = (s.rise / s.cssH) * (0.15 + 0.35 * f.z);
  const k = (f.y + s.t * speed + climb) % 1;
  return k * (s.cssH + s.u * 0.1) - s.u * 0.05;
}

function flakeX(s: Scene, f: Flake): number {
  return f.x * s.cssW + Math.sin(s.t * (0.5 + 0.6 * f.z) + f.phase) * s.u * (0.012 + 0.03 * f.z);
}

/**
 * As the snow eases off, flakes fade out in this many groups, one after the other, so it thins
 * rather than all of it turning faint.
 */
const SNOW_GROUPS = 4;

/** The flakes of `list` in group g (every one when g < 0), between screen rows yMin and yMax. */
function flakePaths(ctx: Ctx, s: Scene, list: readonly Flake[], near: boolean, g: number, yMin: number, yMax: number): void {
  ctx.beginPath();
  for (let i = 0; i < list.length; i++) {
    if (g >= 0 && i % SNOW_GROUPS !== g) continue;
    const f = list[i]!;
    const y = flakeY(s, f);
    if (y < yMin || y > yMax) continue;
    if (near) {
      circle(ctx, flakeX(s, f), y, s.u * (0.004 + 0.0045 * f.z));
    } else {
      const r = s.u * (0.003 + 0.004 * f.z);
      ctx.rect(flakeX(s, f) - r / 2, y - r / 2, r, r);
    }
  }
  ctx.fillStyle = near ? NEAR_FLAKE : FAR_FLAKE;
  ctx.fill();
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
 * gently. Drawn by the far layer, so it passes in front of the skyline but behind the fog.
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
    // Body facing left, a small head, a fanned tail.
    ctx.moveTo(x - q * 1.5, y - q * 0.2);
    ctx.quadraticCurveTo(x - q * 0.2, y - q * 0.75, x + q * 1.2, y - q * 0.1);
    ctx.lineTo(x + q * 2.0, y - q * 0.35);
    ctx.lineTo(x + q * 2.0, y + q * 0.35);
    ctx.lineTo(x + q * 1.1, y + q * 0.3);
    ctx.quadraticCurveTo(x - q * 0.2, y + q * 0.75, x - q * 1.5, y - q * 0.2);
    ctx.closePath();
    circle(ctx, x - q * 1.55, y - q * 0.45, q * 0.5);
    // Wings: one triangle beating up and down from the shoulders.
    const tip = y - flap * q * 1.9;
    ctx.moveTo(x - q * 0.6, y - q * 0.3);
    ctx.lineTo(x + q * 0.7, tip - q * 0.4);
    ctx.lineTo(x + q * 0.9, tip + q * 0.2);
    ctx.lineTo(x + q * 0.5, y - q * 0.1);
    ctx.closePath();
  }
  // Faded like the skyline, a shade darker so they read against the sky.
  ctx.fillStyle = toneOf(s).flyer;
  ctx.fill();
}

// ---------------------------------------------------------------- night stars

/**
 * Bright twinkling stars that come out as the tower climbs into the night: [x, y] as
 * fractions of the screen, and a twinkle group. Up top they keep to the sides, clear of
 * the HUD.
 */
const NIGHT_STARS = Array.from({ length: 12 }, (_, i) => {
  const fy = 0.06 + hash(i + 7600) * 0.56;
  const side = hash(i + 7700) < 0.5 ? 0 : 1;
  const fx = fy < 0.35 ? (side ? 0.84 : 0.04) + hash(i + 7800) * 0.12 : 0.04 + hash(i + 7800) * 0.92;
  return [fx, fy, i % 3] as const;
});

function nightStars(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  const a = tone.loop ? tone.sparkles : Math.min(1, Math.max(0, (altitude01(s) - 0.2) / 0.5));
  if (a <= 0) return;
  for (let g = 0; g < 3; g++) {
    const tw = 0.5 + 0.5 * Math.sin(s.t * 1.6 + g * 2.1);
    ctx.beginPath();
    for (const [fx, fy, group] of NIGHT_STARS) {
      if (group !== g) continue;
      sparklePath(ctx, fx * s.cssW, fy * s.cssH, s.u * (0.008 + 0.008 * tw));
    }
    ctx.fillStyle = "#fffbe8";
    ctx.globalAlpha = a * (0.45 + 0.55 * tw);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Sky layer: bright stars up high, and snow down to the horizon. */
export function skyLayer(ctx: Ctx, s: Scene): void {
  nightStars(ctx, s);
  snow(ctx, s, -s.u, s.horizonY);
}
