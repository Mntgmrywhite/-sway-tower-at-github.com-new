import { alpha, circle, hash, mix, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { FAR, SKY_TOP } from "./colors";
import { sparklePath, TAU } from "./shapes";
import { drawSleigh } from "./sleigh";

// The Christmas sky: a big cel-shaded moon right of the tower, gently falling snow, Santa's
// sleigh crossing in front of the moon now and then as a faded silhouette, and soft
// northern-light ribbons once you climb high.

// ---------------------------------------------------------------- moon

/**
 * The moon sits right of the tower, below the HUD, at a fixed spot on screen: its disc
 * stays clear of the column above the base bar, so bar edges never sit on bright moon.
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

const MOON = "#fbfcff";
const MOON_SHADE = "#cdd8f6";
const CRATER = "#dfe6fa";
const HALO = [alpha("#ffffff", 0.32), alpha("#ffffff", 0.1), alpha("#ffffff", 0)] as const;

/** Craters as (x, y, r) fractions of the moon's radius. */
const CRATERS = [
  [-0.32, -0.22, 0.2],
  [0.28, 0.12, 0.24],
  [-0.12, 0.42, 0.14],
  [0.05, -0.5, 0.1],
  [-0.52, 0.2, 0.09],
] as const;

/** A big pale moon: one soft halo, a shaded crescent on the lower right, flat craters. */
export function celestial(ctx: Ctx, s: Scene): void {
  const x = moonX(s);
  const y = moonY(s);
  const r = moonR(s);

  const reach = r * 2.4;
  const halo = ctx.createRadialGradient(x, y, r * 0.9, x, y, reach);
  halo.addColorStop(0, HALO[0]);
  halo.addColorStop(0.4, HALO[1]);
  halo.addColorStop(1, HALO[2]);
  ctx.fillStyle = halo;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);

  // Shaded disc, then the lit disc just inside it (no clip needed), then the craters.
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

  // A slow twinkle on the upper-right rim, away from the tower column and the HUD.
  const tw = 0.5 + 0.5 * Math.sin(s.t * 1.3);
  ctx.beginPath();
  sparklePath(ctx, x + r * 0.78, y - r * 0.78, r * (0.24 + 0.12 * tw));
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.7 + 0.3 * tw;
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
const FAR_FLAKE = alpha("#ffffff", 0.6);
const NEAR_FLAKE = alpha("#ffffff", 0.92);

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

// ---------------------------------------------------------------- aurora

const AURORA = [
  { color: "#5ff0b0", y: 0.5, amp: 0.05, freq: 1.6, speed: 0.25, height: 0.2, phase: 0 },
  { color: "#ff8ad8", y: 0.6, amp: 0.035, freq: 2.3, speed: -0.18, height: 0.13, phase: 2.1 },
] as const;
const AURORA_STEPS = 24;
const AURORA_HEMS = AURORA.map((b) => mix(b.color, "#ffffff", 0.3));

/** Northern lights: soft flat ribbons that fade in as the tower climbs into the night. */
function aurora(ctx: Ctx, s: Scene): void {
  const a = Math.min(1, Math.max(0, (altitude01(s) - 0.3) / 0.5));
  if (a <= 0) return;
  for (const [i, band] of AURORA.entries()) {
    const base = s.cssH * band.y;
    const h = s.cssH * band.height;
    const amp = s.u * band.amp * 2;
    const hemY = (fx: number) =>
      base +
      Math.sin(fx * band.freq * Math.PI + s.t * band.speed + band.phase) * amp +
      Math.sin(fx * 7 + s.t * band.speed * 2.3) * s.u * 0.012;
    // The fade reaches zero at the lowest the ribbon's top edge ever gets, so the top
    // never shows a hard line however the hem waves.
    const low = base + amp + s.u * 0.012;
    const g = ctx.createLinearGradient(0, low - h, 0, low);
    g.addColorStop(0, alpha(band.color, 0));
    g.addColorStop(0.5, alpha(band.color, 0.2 * a));
    g.addColorStop(1, alpha(band.color, 0.45 * a));

    ctx.beginPath();
    for (let i = 0; i <= AURORA_STEPS; i++) {
      const fx = i / AURORA_STEPS;
      if (i === 0) ctx.moveTo(0, hemY(0));
      else ctx.lineTo(fx * s.cssW, hemY(fx));
    }
    for (let i = AURORA_STEPS; i >= 0; i--) ctx.lineTo((i / AURORA_STEPS) * s.cssW, hemY(i / AURORA_STEPS) - h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // A crisp lighter hem along the bottom edge.
    ctx.beginPath();
    for (let i = 0; i <= AURORA_STEPS; i++) {
      const fx = i / AURORA_STEPS;
      if (i === 0) ctx.moveTo(0, hemY(0));
      else ctx.lineTo(fx * s.cssW, hemY(fx));
    }
    ctx.strokeStyle = alpha(AURORA_HEMS[i]!, 0.3 * a);
    ctx.lineWidth = Math.max(2, s.u * 0.008);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- sleigh

const SLEIGH_PERIOD = 26; // seconds between passes
const SLEIGH_TIME = 8; // seconds on screen
const SLEIGH_OFFSET = 1.6;
/** Faded like the skyline, a shade darker so it reads against the moon and the sky. */
const SLEIGH = mix(FAR, SKY_TOP, 0.35);
const NOSE = "#ff5a6a";

/**
 * Santa's sleigh: crosses every SLEIGH_PERIOD seconds, passing in front of the moon.
 * Drawn by the far layer, so it flies in front of the village and behind the clouds.
 */
export function sleigh(ctx: Ctx, s: Scene): void {
  const p = (((s.t + SLEIGH_OFFSET) % SLEIGH_PERIOD) + SLEIGH_PERIOD) % SLEIGH_PERIOD;
  if (p > SLEIGH_TIME) return;
  const k = p / SLEIGH_TIME;
  const margin = s.u * 0.3;
  // Left to right, climbing gently, timed to cross in front of the moon.
  const x = -margin + (s.cssW + margin * 2) * k;
  const slope = -0.08;
  const y = moonY(s) + (x - moonX(s)) * slope + Math.sin(s.t * 2.2) * s.u * 0.008;
  const angle = Math.atan(slope) + Math.sin(s.t * 2.2 + 1) * 0.03;
  drawSleigh(ctx, x, y, s.u * 0.0085, angle, s.t, SLEIGH, NOSE);
}

/** Sky layer: northern lights (up high) and snow down to the horizon. */
export function skyLayer(ctx: Ctx, s: Scene): void {
  aurora(ctx, s);
  snow(ctx, s, -s.u, s.horizonY);
}
