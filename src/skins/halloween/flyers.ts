import type { Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { batPath } from "./cast/bats";
import { crowFly } from "./crow";
import { mansionAt } from "./mansion";
import { toneOf, type Tone } from "./tone";

// Things flying in the sky, all out in the right-hand lane round the crooked mansion (the left of
// the sky belongs to the moon: nothing crosses it): a small flock of crows wheeling high over the
// crag, a few bats flitting round the mansion's spire, and in the witching hour a swarm of bats
// pouring out of its belfry and looping round the lane. Far away, so flat silhouettes in the
// tone's flyer color, no outline (the bats are the cast's, cast/bats.ts). A floor landing on the
// tower sends the spire's bats flitting out for a moment. Everything is a pure function of the scene.

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

/** How long the spire's bats flit out when a floor lands (s). */
const FLIT = 0.6;

export function batSpot(s: Scene, i: number): typeof F {
  const b = BATS[i]!;
  const L = lane(s);
  const m = mansionAt(s);
  const u = s.u;
  const th = s.t * b.w + b.ph;
  const half = b.size * u;
  // A floor landing on the tower makes them flit out from the spire for a moment (not with reduce motion).
  const land = s.sinceLand ?? Infinity;
  const flit = s.still !== true && land >= 0 && land < FLIT ? Math.sin((Math.PI * land) / FLIT) : 0;
  const x = m.belfryX + Math.sin(th) * b.rx * u * (1 + flit * 0.8);
  F.x = Math.max(L.x0 + half, Math.min(L.x1 - half, x));
  F.y = Math.max(L.y0 + half, m.topY + u * 0.02 + Math.sin(th * 2) * b.ry * u - flit * u * 0.03);
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
