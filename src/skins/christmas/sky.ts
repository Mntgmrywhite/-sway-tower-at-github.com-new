import { alpha, circle, hash, neonStroke, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { GREEN, ICE } from "./colors";
import { TAU } from "./shapes";
import { drawSleigh } from "./sleigh";

// The Christmas sky: a big moon right of the tower, gently falling snow, Santa's sleigh
// passing in front of the moon now and then, and northern lights once you climb high.

// ---------------------------------------------------------------- moon

/**
 * The moon sits right of the tower, below the HUD, at a fixed spot on screen: its disc and
 * rim stay clear of the column above the base bar, so bar edges never sit on bright moon.
 */
function moonX(s: Scene): number {
  return s.cssW / 2 + s.u * 0.35;
}
function moonY(s: Scene): number {
  return s.cssH * 0.37;
}
function moonR(s: Scene): number {
  return s.u * 0.09;
}

/** Craters as (x, y, r) fractions of the moon's radius. */
const CRATERS = [
  [-0.32, -0.22, 0.2],
  [0.28, 0.12, 0.26],
  [-0.12, 0.42, 0.14],
  [0.05, -0.48, 0.1],
  [-0.5, 0.2, 0.09],
] as const;

/** A big neon-rimmed moon with craters, a cold halo and a twinkling sparkle on its rim. */
export function celestial(ctx: Ctx, s: Scene): void {
  const x = moonX(s);
  const y = moonY(s);
  const r = moonR(s);
  const a = altitude01(s);

  // Cold halo, a little stronger up high where the sky is darker.
  const reach = r * (3.6 + a * 0.8);
  const halo = ctx.createRadialGradient(x, y, r * 0.85, x, y, reach);
  halo.addColorStop(0, alpha(ICE, 0.32 + a * 0.08));
  halo.addColorStop(0.35, alpha("#4f5dff", 0.12));
  halo.addColorStop(1, alpha("#4f5dff", 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);

  // Disc, lit from the upper left.
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, "#e2f2ff");
  g.addColorStop(1, "#93bff0");
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  for (const [cx, cy, cr] of CRATERS) circle(ctx, x + cx * r, y + cy * r, cr * r);
  ctx.fillStyle = alpha("#6f97cf", 0.32);
  ctx.fill();

  // Neon rim
  ctx.beginPath();
  circle(ctx, x, y, r);
  neonStroke(ctx, ICE, Math.max(1.2, s.u * 0.0045), 3.4);

  // A slow sparkle on the rim: a four-point star with long faint rays. It sits on the
  // upper right, so its rays reach neither the tower column nor the HUD.
  const tw = 0.5 + 0.5 * Math.sin(s.t * 1.3);
  const gx = x + r * 0.72;
  const gy = y - r * 0.72;
  const len = r * (0.26 + 0.14 * tw);
  ctx.beginPath();
  ctx.moveTo(gx - len * 1.7, gy);
  ctx.lineTo(gx + len * 1.7, gy);
  ctx.moveTo(gx, gy - len * 1.7);
  ctx.lineTo(gx, gy + len * 1.7);
  ctx.strokeStyle = alpha("#ffffff", 0.25 + 0.25 * tw);
  ctx.lineWidth = Math.max(1, s.u * 0.0025);
  ctx.stroke();
  const k = len * 0.18;
  ctx.beginPath();
  ctx.moveTo(gx, gy - len);
  ctx.quadraticCurveTo(gx, gy, gx + len, gy);
  ctx.quadraticCurveTo(gx, gy, gx, gy + len);
  ctx.quadraticCurveTo(gx, gy, gx - len, gy);
  ctx.quadraticCurveTo(gx, gy, gx, gy - len);
  ctx.closePath();
  circle(ctx, gx, gy, k);
  ctx.fillStyle = alpha("#ffffff", 0.75 + 0.25 * tw);
  ctx.fill();
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

/** Small distant flakes (drawn as squares) and fewer, larger, brighter near ones (round). */
const FAR_FLAKES = flakes(110, 4000, 0, 0.6);
const NEAR_FLAKES = flakes(36, 6000, 0.6, 1);

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
    const r = s.u * (0.0028 + 0.004 * f.z);
    ctx.rect(flakeX(s, f) - r / 2, y - r / 2, r, r);
  }
  ctx.fillStyle = alpha("#dcefff", 0.55);
  ctx.fill();

  ctx.beginPath();
  for (const f of NEAR_FLAKES) {
    const y = flakeY(s, f);
    if (y < yMin || y > yMax) continue;
    circle(ctx, flakeX(s, f), y, s.u * (0.0035 + 0.0045 * f.z));
  }
  ctx.fillStyle = alpha("#f4fbff", 0.9);
  ctx.fill();
}

// ---------------------------------------------------------------- aurora

const AURORA = [
  { color: GREEN, y: 0.52, amp: 0.05, freq: 1.6, speed: 0.25, height: 0.24, phase: 0 },
  { color: "#b45cff", y: 0.62, amp: 0.035, freq: 2.3, speed: -0.18, height: 0.16, phase: 2.1 },
] as const;

/** Northern lights: soft curtains that fade in as the tower climbs into the dark. */
function aurora(ctx: Ctx, s: Scene): void {
  const a = Math.min(1, Math.max(0, (altitude01(s) - 0.3) / 0.5));
  if (a <= 0) return;
  const steps = 24;
  for (const band of AURORA) {
    const base = s.cssH * band.y;
    const h = s.cssH * band.height;
    const amp = s.u * band.amp * 2;
    const hemY = (fx: number) =>
      base +
      Math.sin(fx * band.freq * Math.PI + s.t * band.speed + band.phase) * amp +
      Math.sin(fx * 7 + s.t * band.speed * 2.3) * s.u * 0.012;
    // The fade reaches zero at the lowest the curtain's top edge ever gets, so the top
    // never shows a hard line however the hem waves.
    const low = base + amp + s.u * 0.012;
    const g = ctx.createLinearGradient(0, low - h, 0, low);
    g.addColorStop(0, alpha(band.color, 0));
    g.addColorStop(0.6, alpha(band.color, 0.12 * a));
    g.addColorStop(1, alpha(band.color, 0.3 * a));

    // Curtain: brightest along its lower hem, fading upward.
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const fx = i / steps;
      if (i === 0) ctx.moveTo(fx * s.cssW, hemY(fx));
      else ctx.lineTo(fx * s.cssW, hemY(fx));
    }
    for (let i = steps; i >= 0; i--) ctx.lineTo((i / steps) * s.cssW, hemY(i / steps) - h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // Folds: soft vertical rays that come and go.
    ctx.beginPath();
    const rays = 44;
    for (let i = 0; i < rays; i++) {
      const fx = (i + 0.5) / rays;
      const shimmer = Math.sin(s.t * 1.3 + i * 2.7 + band.phase);
      if (shimmer < 0.15) continue;
      const x = fx * s.cssW;
      const y = hemY(fx);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h * (0.4 + 0.6 * shimmer));
    }
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(2, s.u * 0.012);
    ctx.stroke();

    // Glowing hem
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const fx = i / steps;
      if (i === 0) ctx.moveTo(0, hemY(0));
      else ctx.lineTo(fx * s.cssW, hemY(fx));
    }
    ctx.strokeStyle = alpha(band.color, 0.1 * a);
    ctx.lineWidth = Math.max(3, s.u * 0.014);
    ctx.stroke();
    ctx.strokeStyle = alpha(band.color, 0.4 * a);
    ctx.lineWidth = Math.max(1, s.u * 0.003);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- sleigh

const SLEIGH_PERIOD = 26; // seconds between passes
const SLEIGH_TIME = 8; // seconds on screen
const SLEIGH_OFFSET = 1.6;

/** Santa's sleigh: crosses every SLEIGH_PERIOD seconds, passing in front of the moon. */
function sleigh(ctx: Ctx, s: Scene): void {
  const p = (((s.t + SLEIGH_OFFSET) % SLEIGH_PERIOD) + SLEIGH_PERIOD) % SLEIGH_PERIOD;
  if (p > SLEIGH_TIME) return;
  const k = p / SLEIGH_TIME;
  const margin = s.u * 0.3;
  // Left to right, climbing gently, timed to cross in front of the moon.
  const x = -margin + (s.cssW + margin * 2) * k;
  const slope = -0.14;
  const y = moonY(s) + (x - moonX(s)) * slope + Math.sin(s.t * 2.2) * s.u * 0.008;
  drawSleigh(ctx, x, y, s.u * 0.0085, Math.atan(slope) + Math.sin(s.t * 2.2 + 1) * 0.03, s.t);
}

/** Sky layer: northern lights (up high), snow down to the horizon, and the sleigh. */
export function skyLayer(ctx: Ctx, s: Scene): void {
  aurora(ctx, s);
  snow(ctx, s, -s.u, s.horizonY);
  sleigh(ctx, s);
}
