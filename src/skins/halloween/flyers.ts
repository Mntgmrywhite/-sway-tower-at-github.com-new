import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { crowFly } from "./crow";
import { mansionAt } from "./mansion";
import { toneOf, type Tone } from "./tone";

// Things flying in the sky, all out in the right-hand lane round the crooked mansion (the left of
// the sky belongs to the moon: nothing crosses it): a small flock of crows wheeling high over the
// crag, a few bats flitting round the mansion's spire, and in the witching hour a swarm of bats
// pouring out of its belfry and looping round the lane. Far away, so flat silhouettes in the
// tone's flyer color, no outline. Everything is a pure function of the scene.

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

/** Keep this far (u) from the tower's column and the screen's right edge. */
const EDGE = 0.014;
/** Flyers keep below this fraction of the screen (the score's band above is the HUD's). */
const TOP = 0.2;

/** The lane flyers keep to on this screen: x from, x to, y from, in px. */
function lane(s: Scene): { x0: number; x1: number; y0: number } {
  const u = s.u;
  return { x0: s.baseX + s.baseW + u * (0.05 + EDGE), x1: s.cssW - u * EDGE, y0: s.cssH * TOP };
}

/** Scratch for a flyer's spot, so placing one allocates nothing. */
const F = { x: 0, y: 0, s: 0, dir: 1, lift: 0 };

// ---------------------------------------------------------------- the crows

/** The flock: orbit phase, angular speed (rad/s), size (u), orbit radii (fractions of the lane, u). */
export const CROWS = [
  { ph: 0.4, w: 0.55, size: 0.03, rx: 0.36, ry: 0.022, dy: 0 },
  { ph: 2.6, w: -0.48, size: 0.026, rx: 0.3, ry: 0.018, dy: 0.03 },
  { ph: 4.4, w: 0.42, size: 0.028, rx: 0.4, ry: 0.024, dy: 0.012 },
  { ph: 1.5, w: -0.38, size: 0.024, rx: 0.26, ry: 0.016, dy: 0.045 },
  { ph: 3.3, w: 0.5, size: 0.026, rx: 0.33, ry: 0.02, dy: 0.06 },
] as const;

/** Wing lift for crow i at time t: steady wingbeats, easing into a glide now and then. */
function crowLift(t: number, i: number): number {
  const beat = Math.sin(t * (5 + i * 0.4) + i * 1.9);
  const g = 0.5 + 0.5 * Math.sin(t * 0.55 + i * 2.3);
  const glide = g < 0.62 ? 0 : g > 0.82 ? 1 : (g - 0.62) / 0.2;
  return beat * (1 - glide) + 0.22 * glide;
}

/** Where the flock wheels: the middle of the lane, a little above the mansion's spire. */
function flockCenter(s: Scene): { x: number; y: number; w: number } {
  const L = lane(s);
  const m = mansionAt(s);
  const y = Math.max(L.y0 + s.u * 0.05, Math.min(m.topY - s.u * 0.07, s.cssH * 0.42));
  return { x: (L.x0 + L.x1) / 2, y, w: L.x1 - L.x0 };
}

/** Where crow i of the flock is at time t. */
export function crowSpot(s: Scene, i: number): typeof F {
  const c = CROWS[i]!;
  const f = flockCenter(s);
  const size = s.u * c.size;
  const rx = Math.max(0, f.w / 2 - size) * c.rx * 2;
  const th = s.t * c.w + c.ph;
  F.x = f.x + Math.min(rx, f.w / 2 - size) * Math.cos(th);
  F.y = f.y + (c.ry * Math.sin(th) + c.dy - 0.03) * s.u;
  F.s = size;
  F.dir = -Math.sin(th) * c.w >= 0 ? 1 : -1;
  F.lift = crowLift(s.t, i);
  return F;
}

// ---------------------------------------------------------------- the bats round the spire

/** Bats flitting in figure-eights round the mansion's spire: phase, rate (rad/s), wingbeat, size (u), reach (u). */
export const BATS = [
  { ph: 0.3, w: 1.1, rate: 13, size: 0.022, rx: 0.06, ry: 0.035 },
  { ph: 2.4, w: -0.9, rate: 15, size: 0.019, rx: 0.075, ry: 0.03 },
  { ph: 4.2, w: 1.25, rate: 14, size: 0.017, rx: 0.05, ry: 0.04 },
] as const;

export function batSpot(s: Scene, i: number): typeof F {
  const b = BATS[i]!;
  const L = lane(s);
  const m = mansionAt(s);
  const u = s.u;
  const th = s.t * b.w + b.ph;
  const half = b.size * u;
  const x = m.belfryX + Math.sin(th) * b.rx * u;
  F.x = Math.max(L.x0 + half, Math.min(L.x1 - half, x));
  F.y = Math.max(L.y0 + half, m.topY + u * 0.02 + Math.sin(th * 2) * b.ry * u);
  F.s = half;
  F.lift = Math.sin(s.t * b.rate + i * 1.7);
  return F;
}

// ---------------------------------------------------------------- the witching hour's swarm

/** Bats in the swarm, each leaving the belfry on its own beat and looping out round the lane. */
export const SWARM_COUNT = 22;
const SWARM_PERIOD = 5.2;

export function swarmSpot(s: Scene, i: number): typeof F {
  const L = lane(s);
  const m = mansionAt(s);
  const u = s.u;
  const p = (((s.t / SWARM_PERIOD + i / SWARM_COUNT) % 1) + 1) % 1;
  // Out of the belfry in a widening loop, up round the lane and back in.
  const r = Math.sin(p * Math.PI);
  const a = p * Math.PI * 2 * (i % 2 ? 1 : -1) + i;
  const half = u * (0.018 + 0.012 * (((i * 7) % 3) / 2)) * (0.45 + 0.55 * r);
  const w = (L.x1 - L.x0) / 2;
  const cx = (L.x0 + L.x1) / 2;
  const x = m.belfryX + (cx - m.belfryX) * r + Math.cos(a) * w * 0.85 * r;
  const y = m.belfryY - r * u * 0.22 + Math.sin(a) * u * 0.14 * r;
  F.x = Math.max(L.x0 + half, Math.min(L.x1 - half, x));
  F.y = Math.max(L.y0 + half, y);
  F.s = half;
  F.lift = Math.sin(s.t * 16 + i * 2.3);
  return F;
}

/** The flock, the bats and the swarm. */
export function flyers(ctx: Ctx, s: Scene, tone: Tone = toneOf(s)): void {
  ctx.fillStyle = tone.flyer;
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
  if (tone.swarm > 0.01) {
    ctx.globalAlpha = tone.swarm;
    ctx.beginPath();
    for (let i = 0; i < SWARM_COUNT; i++) {
      const b = swarmSpot(s, i);
      if (b.s < s.u * 0.006) continue;
      batPath(ctx, b.x, b.y, b.s, b.lift);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
