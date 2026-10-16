import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { FAR, SKY_TOP } from "./colors";
import { sparklePath, TAU } from "./shapes";

// The dusk sky over London: a pale winter moon up in the right corner (clear of the HUD and
// of the rooftops at any phone size), snow falling, and now and then a flock of pigeons
// wheeling across above the chimneys.

// ---------------------------------------------------------------- moon

/** Upper right, outside the top-center HUD zone and well above the townhouse roofs. */
function moonX(s: Scene): number {
  return s.cssW / 2 + s.u * 0.375;
}
function moonY(s: Scene): number {
  return s.cssH * 0.205;
}
function moonR(s: Scene): number {
  return s.u * 0.068;
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
export function celestial(ctx: Ctx, s: Scene): void {
  const x = moonX(s);
  const y = moonY(s);
  const r = moonR(s);

  if (haloCtx !== ctx || !haloFill) {
    haloCtx = ctx;
    haloFill = ctx.createRadialGradient(0, 0, 0.35, 0, 0, 1);
    for (const [at, c] of HALO_STOPS) haloFill.addColorStop(at, c);
  }
  const reach = r * 2.6;
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
  ctx.globalAlpha = 0.65 + 0.35 * tw;
  ctx.fill();
  ctx.globalAlpha = 1;
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

/** Falling snow between screen rows yMin and yMax. */
export function snow(ctx: Ctx, s: Scene, yMin: number, yMax: number): void {
  ctx.beginPath();
  for (const f of FAR_FLAKES) {
    const y = flakeY(s, f);
    if (y < yMin || y > yMax) continue;
    const r = s.u * (0.003 + 0.004 * f.z);
    ctx.rect(flakeX(s, f) - r / 2, y - r / 2, r, r);
  }
  ctx.fillStyle = FAR_FLAKE;
  ctx.fill();

  ctx.beginPath();
  for (const f of NEAR_FLAKES) {
    const y = flakeY(s, f);
    if (y < yMin || y > yMax) continue;
    circle(ctx, flakeX(s, f), y, s.u * (0.004 + 0.0045 * f.z));
  }
  ctx.fillStyle = NEAR_FLAKE;
  ctx.fill();
}

// ---------------------------------------------------------------- pigeons

const FLOCK_PERIOD = 21; // seconds between passes
const FLOCK_TIME = 9; // seconds on screen
const FLOCK_OFFSET = 4;
/** Each bird: offset behind the leader and below it (u), flap phase. */
const FLOCK = Array.from({ length: 7 }, (_, i) => ({
  dx: i * 0.055 + hash(i + 7100) * 0.03,
  dy: (i % 2 ? 0.035 : -0.01) + hash(i + 7200) * 0.03 - i * 0.004,
  phase: hash(i + 7300) * TAU,
  size: 0.85 + hash(i + 7400) * 0.3,
}));
/** Faded like the skyline, a shade darker so they read against the dusk. */
const FLYER = mix(FAR, SKY_TOP, 0.3);

/**
 * A loose flock of pigeons crossing right to left above the rooftops, wings beating, rising
 * gently. Drawn by the far layer, so it passes in front of the skyline but behind the fog.
 */
export function pigeonFlock(ctx: Ctx, s: Scene): void {
  const p = (((s.t + FLOCK_OFFSET) % FLOCK_PERIOD) + FLOCK_PERIOD) % FLOCK_PERIOD;
  if (p > FLOCK_TIME) return;
  const k = p / FLOCK_TIME;
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
  ctx.fillStyle = FLYER;
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
  const a = Math.min(1, Math.max(0, (altitude01(s) - 0.2) / 0.5));
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
