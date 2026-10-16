import { alpha, circle, mix, oval, type Ctx } from "../../base/draw";
import { altitude01, HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { FLYER, PALETTE } from "./common";
import { crowFly } from "./crow";

// The Halloween sky: a big cream harvest moon low on the left (the Headless Horseman rides
// across its face along the ridge in the far layer), crows flapping and gliding over the
// hollow, and a couple of bats. Everything up here is far away, so it is drawn as faded flat
// silhouettes with no outline. No witches and no ghosts: the sky belongs to the Horseman.

/** Flyers deepen with the sky as you climb, in a few steps (precomputed, no per-frame colors). */
const FLYER_STEPS = Array.from({ length: 9 }, (_, i) => mix(FLYER, "#140f3c", (0.55 * i) / 8));

const MOON_SEA = mix(PALETTE.moon, "#d8a98a", 0.3);
const MOON_CRATER = mix(PALETTE.moon, "#c8957a", 0.36);
const MOON_RIM = mix(PALETTE.moon, "#ffffff", 0.6);
const HALO = alpha("#ffeec8", 0.09);
const HALO_RINGS = [1.55, 1.32, 1.14] as const;

// Moon surface, in fractions of the radius.
const MARIA = [
  { x: -0.3, y: -0.22, rx: 0.34, ry: 0.22, rot: 0.5 },
  { x: 0.26, y: 0.1, rx: 0.28, ry: 0.2, rot: -0.3 },
  { x: -0.08, y: 0.46, rx: 0.22, ry: 0.13, rot: 0.15 },
];
const CRATERS = [
  { x: -0.46, y: 0.24, r: 0.12 },
  { x: 0.44, y: 0.42, r: 0.09 },
  { x: 0.05, y: -0.6, r: 0.09 },
  { x: 0.58, y: -0.12, r: 0.075 },
  { x: -0.5, y: -0.4, r: 0.06 },
];

/** Moon radius at the start; it swells a little as you climb toward it. */
const MOON_R = 0.125;

/** Scratch result of `moonAt`, reused so nothing allocates per frame. */
const M = { x: 0, y: 0, r: 0, r0: 0 };

/**
 * Where the moon hangs: left of the tower, below the HUD block (the top 32% of the screen),
 * and as high above the start horizon as that allows, so the Horseman's ridge can cross its
 * lower face with mist still below. Fixed on screen while you climb.
 */
export function moonAt(s: Scene): typeof M {
  const u = s.u;
  M.r0 = u * MOON_R;
  M.r = u * (MOON_R + altitude01(s) * 0.02);
  M.x = s.cssW / 2 - u * 0.3;
  const hy0 = s.horizonY - HORIZON_P * s.rise;
  M.y = Math.max(s.cssH * 0.32 + M.r0 + u * 0.02, Math.min(hy0 - u * 0.28, s.cssH * 0.44));
  return M;
}

export function moon(ctx: Ctx, s: Scene): void {
  const { x, y, r } = moonAt(s);

  // A cel-shaded halo: three soft rings of moonlight, then the disc.
  ctx.fillStyle = HALO;
  for (const k of HALO_RINGS) {
    ctx.beginPath();
    circle(ctx, x, y, r * k);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();

  // Seas, craters with a lit lower lip, and a bright crescent rim on the lit side.
  ctx.fillStyle = MOON_SEA;
  ctx.beginPath();
  for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
  ctx.fill();
  ctx.fillStyle = MOON_CRATER;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + c.x * r, y + c.y * r, c.r * r);
  ctx.fill();
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + (c.x + c.r * 0.25) * r, y + (c.y + c.r * 0.25) * r, c.r * r * 0.62);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.86, Math.PI * 0.95, Math.PI * 1.45);
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

// ---------------------------------------------------------------- bats

/**
 * One bat, wings spread, as a closed subpath (so many can share a fill). `lift` -1..1 raises
 * or drops the wingtips; the trailing edge is scalloped between the finger bones.
 */
function batPath(ctx: Ctx, x: number, y: number, s: number, lift: number): void {
  const L = lift * 0.32;
  ctx.moveTo(x - s * 0.06, y - s * 0.1);
  ctx.lineTo(x - s * 0.1, y - s * 0.25);
  ctx.lineTo(x - s * 0.025, y - s * 0.14);
  ctx.lineTo(x + s * 0.025, y - s * 0.14);
  ctx.lineTo(x + s * 0.1, y - s * 0.25);
  ctx.lineTo(x + s * 0.06, y - s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.3, y - s * (0.2 + L * 0.6), x + s * 0.55, y - s * (0.24 + L));
  ctx.quadraticCurveTo(x + s * 0.8, y - s * (0.22 + L * 1.1), x + s, y - s * (0.04 + L * 1.25));
  ctx.quadraticCurveTo(x + s * 0.84, y + s * (0.02 - L * 0.75), x + s * 0.74, y + s * (0.22 - L * 0.85));
  ctx.quadraticCurveTo(x + s * 0.6, y + s * (0.08 - L * 0.5), x + s * 0.44, y + s * (0.26 - L * 0.5));
  ctx.quadraticCurveTo(x + s * 0.3, y + s * (0.1 - L * 0.25), x + s * 0.08, y + s * 0.18);
  ctx.lineTo(x, y + s * 0.28);
  ctx.lineTo(x - s * 0.08, y + s * 0.18);
  ctx.quadraticCurveTo(x - s * 0.3, y + s * (0.1 - L * 0.25), x - s * 0.44, y + s * (0.26 - L * 0.5));
  ctx.quadraticCurveTo(x - s * 0.6, y + s * (0.08 - L * 0.5), x - s * 0.74, y + s * (0.22 - L * 0.85));
  ctx.quadraticCurveTo(x - s * 0.84, y + s * (0.02 - L * 0.75), x - s, y - s * (0.04 + L * 1.25));
  ctx.quadraticCurveTo(x - s * 0.8, y - s * (0.22 + L * 1.1), x - s * 0.55, y - s * (0.24 + L));
  ctx.quadraticCurveTo(x - s * 0.3, y - s * (0.2 + L * 0.6), x - s * 0.06, y - s * 0.1);
  ctx.closePath();
}

// ---------------------------------------------------------------- flyers

// Crows circling over the church steeple and the gnarled tree on the right, clear of the moon
// and the Horseman: orbit center (u from the screen center, fraction of cssH), radii (u),
// angular speed (rad/s, sign = direction), phase, half-wingspan (u). The last ones (and the
// bats) only come out once you are high up.
const CROWS = [
  { x: 0.29, y: 0.385, rx: 0.12, ry: 0.026, w: 0.5, ph: 0.4, size: 0.042 },
  { x: 0.31, y: 0.415, rx: 0.085, ry: 0.02, w: -0.64, ph: 2.2, size: 0.035 },
  { x: 0.27, y: 0.36, rx: 0.15, ry: 0.03, w: 0.41, ph: 4.4, size: 0.038 },
  { x: 0.22, y: 0.46, rx: 0.2, ry: 0.04, w: -0.33, ph: 1.0, size: 0.04 },
  { x: 0.26, y: 0.52, rx: 0.16, ry: 0.035, w: 0.37, ph: 3.1, size: 0.036 },
] as const;
const BATS = [
  { y: 0.47, size: 0.03, speed: 44, dir: -1, phase: 150, rate: 13 },
  { y: 0.37, size: 0.026, speed: 52, dir: 1, phase: 380, rate: 15 },
] as const;

/** Wing lift for crow i at time t: steady wingbeats, easing into a glide now and then. */
function crowLift(t: number, i: number): number {
  const beat = Math.sin(t * (5 + i * 0.4) + i * 1.9);
  const g = 0.5 + 0.5 * Math.sin(t * 0.55 + i * 2.3);
  const glide = g < 0.62 ? 0 : g > 0.82 ? 1 : (g - 0.62) / 0.2;
  return beat * (1 - glide) + 0.22 * glide;
}

export function flyers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const t = s.t;
  const a = altitude01(s);
  ctx.fillStyle = FLYER_STEPS[Math.round(a * 8)]!;

  const crows = 3 + Math.floor(a * 2.99);
  const cx = s.cssW / 2;
  ctx.beginPath();
  for (let i = 0; i < crows; i++) {
    const c = CROWS[i];
    if (!c) break;
    const th = t * c.w + c.ph;
    const x = cx + (c.x + c.rx * Math.cos(th)) * u;
    const y = s.cssH * c.y + c.ry * u * Math.sin(th);
    // Facing the way it flies round its orbit.
    const dir = -Math.sin(th) * c.w >= 0 ? 1 : -1;
    crowFly(ctx, x, y, u * c.size, dir, crowLift(t, i));
  }
  ctx.fill();

  if (a > 0.35) {
    const span = s.cssW + u * 0.4;
    ctx.beginPath();
    for (let i = 0; i < BATS.length; i++) {
      const b = BATS[i]!;
      const along = (((t * b.speed + b.phase) % span) + span) % span;
      const x = b.dir === 1 ? along - u * 0.2 : s.cssW + u * 0.2 - along;
      const y = s.cssH * b.y + Math.sin(t * 1.7 + i * 2.1) * u * 0.02;
      batPath(ctx, x, y, u * b.size, Math.sin(t * b.rate + i * 1.7));
    }
    ctx.fill();
  }
}
