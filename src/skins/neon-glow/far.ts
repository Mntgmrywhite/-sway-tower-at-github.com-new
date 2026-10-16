import { hash, oval, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { beats, FAR, FAR_RIM, GLOWS, GREEN, PINK, pulse, SIL_LIGHT } from "./common";

// The back of the hall, standing on the horizon: two lattice light towers at the sides with
// laser heads on top (the sky layer draws their beams), and the crowd packed along the
// horizon on either side of the tower, arms up, a few glow sticks waving on the beat. The
// tower's own column stays clear so it reads against the calm grid.

/** Light towers stand this far from the center, in u. */
const LASER_X = 0.43;
const TOWER_H = 0.3;
const TOWER_W = 0.036;

const E = { x: 0, y: 0 };

/** Screen position of a light tower's laser head (side -1 left, 1 right). */
export function emitter(s: Scene, side: -1 | 1): { x: number; y: number } {
  E.x = s.cssW / 2 + side * LASER_X * s.u;
  E.y = s.horizonY - s.u * (TOWER_H + 0.02);
  return E;
}

/** One reveller per slot, from the tower's column outward on each side. */
const CROWD = Array.from({ length: 24 }, (_, i) => ({
  gap: 0.027 + hash(i + 900) * 0.012,
  hs: 0.85 + hash(i + 910) * 0.3,
  arms: hash(i + 920) > 0.55 ? 2 : hash(i + 925) > 0.45 ? 1 : 0,
  stick: hash(i + 930) > 0.5 ? Math.floor(hash(i + 940) * 4) : -1,
  phase: hash(i + 950),
}));

/** Inner edge of the crowd on each side of the tower, in u from the center. */
const CROWD_IN = 0.265;

/** Both light towers: lattices in one stroke, then their heads, then the lit lenses. */
function lightTowers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const w = TOWER_W * u;
  const h = TOWER_H * u;
  const base = s.horizonY;
  const top = base - h;
  const n = Math.round(h / w);
  // Lattice: two rails, rungs and zigzag braces.
  ctx.beginPath();
  for (const side of SIDES) {
    const cx = s.cssW / 2 + side * LASER_X * u;
    ctx.moveTo(cx - w / 2, base);
    ctx.lineTo(cx - w / 2, top);
    ctx.moveTo(cx + w / 2, base);
    ctx.lineTo(cx + w / 2, top);
    for (let i = 0; i <= n; i++) {
      const y = base - (i / n) * h;
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      if (i < n) ctx.lineTo(cx - w / 2, y - h / n);
    }
  }
  ctx.strokeStyle = FAR_RIM;
  ctx.lineWidth = Math.max(1, u * 0.0028);
  ctx.stroke();

  // Moving-head fixtures on top.
  ctx.beginPath();
  for (const side of SIDES) {
    const cx = s.cssW / 2 + side * LASER_X * u;
    const e = emitter(s, side);
    ctx.rect(cx - w * 0.7, top - u * 0.012, w * 1.4, u * 0.012);
    oval(ctx, e.x, e.y, u * 0.016, u * 0.012);
  }
  ctx.fillStyle = SIL_LIGHT;
  ctx.fill();
  ctx.strokeStyle = FAR_RIM;
  ctx.lineWidth = Math.max(1, u * 0.003);
  ctx.stroke();
  // Lenses, flaring on the beat.
  const r = u * (0.006 + pulse(s.t, 3) * 0.002);
  for (const side of SIDES) {
    const e = emitter(s, side);
    ctx.beginPath();
    oval(ctx, e.x, e.y, r, r);
    ctx.fillStyle = side < 0 ? GREEN : PINK;
    ctx.fill();
  }
}

/**
 * Raised arms found while laying out the crowd, 6 numbers each: x, shoulder y, height scale,
 * phase, arms up (1 or 2), stick color (-1 none) — plus the side it stands on.
 */
const ARMS = new Float64Array(CROWD.length * 2 * 7);
let armCount = 0;

/** Add every reveller's body (both sides) to the current path; collects raised arms. */
function bodies(ctx: Ctx, s: Scene, b: number, dy: number): void {
  const u = s.u;
  const base = s.horizonY + dy;
  const half = s.cssW / 2;
  const sw = u * 0.0145;
  armCount = 0;
  for (const side of SIDES) {
    let d = CROWD_IN * u;
    for (const c of CROWD) {
      d += c.gap * u;
      if (d + sw * 1.4 > half) break;
      const x = half + side * d;
      const bob = Math.abs(Math.sin((b + c.phase) * Math.PI)) * u * 0.004;
      const sh = u * 0.026 * c.hs;
      oval(ctx, x, base - sh + sw * 0.55 - bob, sw, sw * 0.6);
      ctx.rect(x - sw, base - sh + sw * 0.55 - bob, sw * 2, sh - sw * 0.55 + bob + 1);
      oval(ctx, x, base - sh - u * 0.012 * c.hs - bob, u * 0.0095 * c.hs, u * 0.011 * c.hs);
      if (c.arms > 0) {
        const o = armCount * 7;
        ARMS[o] = x;
        ARMS[o + 1] = base - sh + sw * 0.4 - bob;
        ARMS[o + 2] = c.hs;
        ARMS[o + 3] = c.phase;
        ARMS[o + 4] = c.arms;
        ARMS[o + 5] = c.stick;
        ARMS[o + 6] = side;
        armCount++;
      }
    }
  }
}

/** The crowd on both sides: heads and shoulders on the horizon, raised arms, glow sticks. */
function crowd(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const b = beats(s.t);
  const sw = u * 0.0145;
  const reach = u * 0.034;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Silhouettes, lit from behind: the same shapes nudged up in the rim color, then the dark
  // bodies over them, so only a thin line glows along the tops of heads and shoulders.
  const lift = Math.max(1, u * 0.0035);
  ctx.beginPath();
  bodies(ctx, s, b, -lift);
  ctx.fillStyle = FAR_RIM;
  ctx.fill();

  // Raised arms get the same treatment.
  ctx.beginPath();
  for (let j = 0; j < armCount; j++) {
    const o = j * 7;
    const x = ARMS[o]!;
    const sy = ARMS[o + 1]!;
    const wave = Math.sin((b * 0.5 + ARMS[o + 3]!) * Math.PI * 2) * u * 0.006;
    const both = ARMS[o + 4] === 2;
    for (let k = both ? -1 : ARMS[o + 6]!; k <= (both ? 1 : ARMS[o + 6]!); k += 2) {
      ctx.moveTo(x + k * sw * 0.75, sy);
      ctx.lineTo(x + k * sw * 1.25 + wave, sy - reach * ARMS[o + 2]!);
    }
  }
  ctx.strokeStyle = FAR_RIM;
  ctx.lineWidth = Math.max(3, u * 0.0105);
  ctx.stroke();
  ctx.strokeStyle = FAR;
  ctx.lineWidth = Math.max(1.6, u * 0.0058);
  ctx.stroke();

  ctx.beginPath();
  bodies(ctx, s, b, 0);
  ctx.fillStyle = FAR;
  ctx.fill();

  // Glow sticks in the raised hands, one stroke per color.
  ctx.lineWidth = Math.max(1.5, u * 0.0048);
  for (let col = 0; col < 4; col++) {
    ctx.beginPath();
    let any = false;
    for (let j = 0; j < armCount; j++) {
      const o = j * 7;
      if (ARMS[o + 5] !== col) continue;
      const k = ARMS[o + 4] === 2 ? 1 : ARMS[o + 6]!;
      const phase = ARMS[o + 3]!;
      const wave = Math.sin((b * 0.5 + phase) * Math.PI * 2) * u * 0.006;
      const hx = ARMS[o]! + k * sw * 1.25 + wave;
      const hy = ARMS[o + 1]! - reach * ARMS[o + 2]!;
      const tilt = Math.sin((b + phase) * Math.PI) * 0.6 * k;
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.sin(tilt) * u * 0.02, hy - Math.cos(tilt) * u * 0.02);
      any = true;
    }
    if (!any) continue;
    ctx.strokeStyle = GLOWS[col]!;
    ctx.stroke();
  }
}

const SIDES = [-1, 1] as const;

/** The far layer: light towers, then the crowd in front of them. */
export function partyFar(ctx: Ctx, s: Scene): void {
  if (s.horizonY - s.u * (TOWER_H + 0.05) > s.cssH) return;
  lightTowers(ctx, s);
  crowd(ctx, s);
}
