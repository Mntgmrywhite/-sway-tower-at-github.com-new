import { circle, hash, oval, type Ctx } from "../../base/draw";
import { HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { PALETTE } from "./common";
import { crowFly } from "./crow";
import { fogBanks } from "./fog";
import { level, LOOP_START, toneOf, type Tone } from "./tone";

// The Halloween sky: a big harvest moon low on the left (the Headless Horseman rides across
// its face along the ridge in the far layer), crows flapping and gliding over the hollow, and a
// couple of bats. Everything up here is far away, so it is drawn as faded flat silhouettes with
// no outline. No witches and no ghosts: the sky belongs to the Horseman.
//
// The sky follows the height story (tone.ts): on the first pass it is the base world's,
// deepening to night; in the loop it is painted here, the same gradient and stars recolored, as
// it pales into the mist and darkens to the witching hour, when the moon burns orange and bats
// flit across it.

// ---------------------------------------------------------------- sky and stars

/** The base world's stars, so the loop starts with the same sky the first pass ends with. */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: hash(i),
  y: hash(i + 100) * 0.8,
  r: 0.8 + hash(i + 200) * 1.2,
  sparkle: hash(i + 300) > 0.85,
}));
/** The witching hour's extra stars: smaller, twinkling slowly, kept out of the tower's column. */
const EXTRA = Array.from({ length: 40 }, (_, i) => ({
  x: hash(i + 1000),
  y: hash(i + 1100) * 0.82,
  r: 0.7 + hash(i + 1200) * 0.9,
}));

/**
 * The loop's sky, over the base world's: top, middle and horizon colors as the base paints them,
 * down to the horizon or, once that has sunk below the screen, to the screen's bottom, so the
 * loop's sky looks the same every time round. As two two-stop gradients split at a whole pixel:
 * the same as one three-stop gradient, at half the cost.
 */
function skyFill(ctx: Ctx, s: Scene, tone: Tone): void {
  const end = Math.min(Math.max(1, s.horizonY), s.cssH);
  const split = Math.round(end * 0.6);
  const upper = ctx.createLinearGradient(0, 0, 0, split);
  upper.addColorStop(0, tone.sky[0]);
  upper.addColorStop(1, tone.sky[1]);
  ctx.fillStyle = upper;
  ctx.fillRect(0, 0, s.cssW, split);
  const lower = ctx.createLinearGradient(0, split, 0, end);
  lower.addColorStop(0, tone.sky[1]);
  lower.addColorStop(1, tone.sky[2]);
  ctx.fillStyle = lower;
  ctx.fillRect(0, split, s.cssW, s.cssH - split);
}

function stars(ctx: Ctx, s: Scene, tone: Tone): void {
  ctx.fillStyle = PALETTE.star;
  if (tone.starGlow > 0.01) {
    for (const [i, st] of STARS.entries()) {
      const y = st.y * s.cssH;
      if (y > s.horizonY - s.u * 0.05 || st.y > tone.starsTo) continue;
      ctx.globalAlpha = (0.55 + 0.35 * Math.sin(s.t * 1.5 + i)) * tone.starGlow;
      const x = st.x * s.cssW;
      if (st.sparkle) {
        const r = st.r * 2.2;
        ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
        ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
      } else {
        ctx.fillRect(x, y, st.r, st.r);
      }
    }
  }
  if (tone.extraStars > 0.01) {
    const x0 = s.baseX - s.u * 0.07;
    const x1 = s.baseX + s.baseW + s.u * 0.07;
    for (const [i, st] of EXTRA.entries()) {
      const x = st.x * s.cssW;
      const y = st.y * s.cssH;
      if ((x > x0 && x < x1) || y > s.horizonY - s.u * 0.05) continue;
      ctx.globalAlpha = (0.6 + 0.3 * Math.sin(s.t * 0.8 + i * 1.7)) * tone.extraStars;
      ctx.fillRect(x, y, st.r, st.r);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the moon

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
/** Mist drifting across the moon's face when it is veiled: x, y, half-length, half-height (in radii). */
const VEIL = [
  { x: -0.15, y: -0.3, rx: 1.05, ry: 0.13 },
  { x: 0.2, y: 0.12, rx: 1.15, ry: 0.16 },
  { x: -0.1, y: 0.55, rx: 0.9, ry: 0.11 },
];

/** Moon radius at the start, in u. */
const MOON_R = 0.125;

/** Scratch result of `moonAt`, reused so nothing allocates per frame. */
const M = { x: 0, y: 0, r: 0, r0: 0 };

/**
 * Where the moon hangs: left of the tower, below the HUD block (the top 32% of the screen),
 * and 0.28u above the start horizon if that allows, so the Horseman's ridge can cross its
 * lower face with mist still below. Fixed on screen while you climb.
 */
export function moonAt(s: Scene, tone: Tone = toneOf(s)): typeof M {
  const u = s.u;
  M.r0 = u * MOON_R;
  M.r = u * tone.moonR;
  M.x = s.cssW / 2 - u * 0.3;
  const hy0 = s.horizonY - HORIZON_P * s.rise;
  M.y = Math.max(s.cssH * 0.32 + M.r0 + u * 0.02, hy0 - u * 0.28);
  return M;
}

/**
 * The skin's celestial layer: in the loop, the sky and its stars (on the first pass the base
 * world's are the story's, exactly), then the moon and the mist's fog banks.
 */
export function celestial(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  if (level(s) >= LOOP_START) {
    skyFill(ctx, s, tone);
    stars(ctx, s, tone);
  }
  moon(ctx, s, tone);
  fogBanks(ctx, s);
}

/** The harvest moon with its halo (and, in the mist, a veil over it). */
export function moon(ctx: Ctx, s: Scene, tone: Tone = toneOf(s)): void {
  const { x, y, r } = moonAt(s, tone);

  // A cel-shaded halo: three soft rings of moonlight, then the disc.
  ctx.fillStyle = tone.halo;
  for (const k of HALO_RINGS) {
    ctx.beginPath();
    circle(ctx, x, y, r * k);
    ctx.fill();
  }
  ctx.fillStyle = tone.moon;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();

  // Seas, craters with a lit lower lip, and a bright crescent rim on the lit side.
  ctx.fillStyle = tone.moonSea;
  ctx.beginPath();
  for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
  ctx.fill();
  ctx.fillStyle = tone.moonCrater;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + c.x * r, y + c.y * r, c.r * r);
  ctx.fill();
  ctx.fillStyle = tone.moon;
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + (c.x + c.r * 0.25) * r, y + (c.y + c.r * 0.25) * r, c.r * r * 0.62);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.86, Math.PI * 0.95, Math.PI * 1.45);
  ctx.strokeStyle = tone.moonRim;
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";

  // In the mist, thin streaks of it across the moon's face.
  if (tone.veil > 0.01) {
    ctx.globalAlpha = tone.veil * 0.6;
    ctx.fillStyle = tone.veilColor;
    ctx.beginPath();
    for (const v of VEIL) oval(ctx, x + v.x * r, y + v.y * r, v.rx * r, v.ry * r);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
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
export const CROWS = [
  { x: 0.29, y: 0.385, rx: 0.12, ry: 0.026, w: 0.5, ph: 0.4, size: 0.042 },
  { x: 0.31, y: 0.415, rx: 0.085, ry: 0.02, w: -0.64, ph: 2.2, size: 0.035 },
  { x: 0.27, y: 0.36, rx: 0.15, ry: 0.03, w: 0.41, ph: 4.4, size: 0.038 },
  { x: 0.22, y: 0.46, rx: 0.2, ry: 0.04, w: -0.33, ph: 1.0, size: 0.04 },
  { x: 0.26, y: 0.52, rx: 0.16, ry: 0.035, w: 0.37, ph: 3.1, size: 0.036 },
] as const;
export const BATS = [
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

/** The flock and the bats keep to fractions of a phone's height... */
const PHONE_TALL = 2.25;

/**
 * ...so on a taller view (Hard mode's zoomed-out camera) they keep their place over the hollow:
 * screen y of a fraction `f` of the height, moved down with the start horizon past a phone's.
 */
function skyY(s: Scene, f: number): number {
  const h = Math.min(s.cssH, s.u * PHONE_TALL);
  return f * h + 0.7 * (s.cssH - h);
}

/** Scratch for a flyer's spot, so placing one allocates nothing. */
const F = { x: 0, y: 0, s: 0, dir: 1, lift: 0 };

/** Where crow i of the flock is at time t. */
export function crowSpot(s: Scene, i: number): typeof F {
  const c = CROWS[i]!;
  const th = s.t * c.w + c.ph;
  F.x = s.cssW / 2 + (c.x + c.rx * Math.cos(th)) * s.u;
  F.y = skyY(s, c.y) + c.ry * s.u * Math.sin(th);
  F.s = s.u * c.size;
  // Facing the way it flies round its orbit.
  F.dir = -Math.sin(th) * c.w >= 0 ? 1 : -1;
  F.lift = crowLift(s.t, i);
  return F;
}

/** Where crossing bat i is at time t. */
export function batSpot(s: Scene, i: number): typeof F {
  const b = BATS[i]!;
  const u = s.u;
  const span = s.cssW + u * 0.4;
  const along = (((s.t * b.speed + b.phase) % span) + span) % span;
  F.x = b.dir === 1 ? along - u * 0.2 : s.cssW + u * 0.2 - along;
  F.y = skyY(s, b.y) + Math.sin(s.t * 1.7 + i * 2.1) * u * 0.02;
  F.s = u * b.size;
  F.lift = Math.sin(s.t * b.rate + i * 1.7);
  return F;
}

/** The witching hour's bats around the moon: orbit speed (rad/s), phase, wingbeat rate, size (u). */
const RING_BATS = [
  { w: 0.9, ph: 0.3, rate: 14, size: 0.024 },
  { w: 0.75, ph: 1.6, rate: 12, size: 0.021 },
  { w: -0.85, ph: 2.9, rate: 15, size: 0.023 },
  { w: 1.05, ph: 4.1, rate: 13, size: 0.02 },
  { w: -0.7, ph: 5.3, rate: 16, size: 0.022 },
] as const;
export const RING_COUNT = RING_BATS.length;
/** Ring bats keep this far (u) from the screen's left edge and from the tower's column. */
const RING_EDGE = 0.012;
/**
 * At most this wide a stretch of the lane is theirs (u): on a phone that is the whole lane, but on
 * a wider view (Hard mode's zoomed-out camera, a tablet) they keep round the moon, by the tower.
 */
const RING_SPAN = 0.2;

/** Where ring bat i is at time t: flitting round the moon, inside the lane left of the tower. */
export function ringSpot(s: Scene, i: number): typeof F {
  const b = RING_BATS[i]!;
  const u = s.u;
  const m = moonAt(s);
  const half = u * 0.03;
  const hi = s.baseX - u * 0.05 - half - u * RING_EDGE;
  const lo = Math.max(half + u * RING_EDGE, hi - u * RING_SPAN);
  const cx = (lo + hi) / 2;
  const rx = Math.max(0, (hi - lo) / 2);
  const ry = m.r * 0.92;
  const th = s.t * b.w + b.ph;
  F.x = cx + rx * (0.8 * Math.cos(th) + 0.2 * Math.sin(s.t * 2.1 + i * 1.3));
  F.y = m.y + ry * (0.8 * Math.sin(th) + 0.2 * Math.sin(s.t * 1.7 + i * 2.3));
  F.s = u * b.size;
  F.lift = Math.sin(s.t * b.rate + i * 1.9);
  return F;
}

export function flyers(ctx: Ctx, s: Scene): void {
  const tone = toneOf(s);
  ctx.fillStyle = tone.flyer;

  // The flock: whole crows in one fill, a crow coming or going faded on its own.
  const n = Math.min(CROWS.length, tone.crows);
  const whole = Math.floor(n + 1e-6);
  ctx.beginPath();
  for (let i = 0; i < whole; i++) {
    const c = crowSpot(s, i);
    crowFly(ctx, c.x, c.y, c.s, c.dir, c.lift);
  }
  ctx.fill();
  if (whole < CROWS.length && n - whole > 0.01) {
    const c = crowSpot(s, whole);
    ctx.globalAlpha = n - whole;
    ctx.beginPath();
    crowFly(ctx, c.x, c.y, c.s, c.dir, c.lift);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (tone.bats > 0.01) {
    ctx.globalAlpha = tone.bats;
    ctx.beginPath();
    for (let i = 0; i < BATS.length; i++) {
      const b = batSpot(s, i);
      batPath(ctx, b.x, b.y, b.s, b.lift);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (tone.ring > 0.01) {
    ctx.globalAlpha = tone.ring;
    ctx.beginPath();
    for (let i = 0; i < RING_BATS.length; i++) {
      const b = ringSpot(s, i);
      batPath(ctx, b.x, b.y, b.s, b.lift);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
