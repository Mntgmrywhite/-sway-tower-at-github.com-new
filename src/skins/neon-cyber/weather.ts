import { hash, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { RAIN } from "./colors";
import { COLUMN } from "./sky";
import type { Tone } from "./tone";
import { tint } from "./tube";

// Rain, the street's signature: thin slanted streaks falling at the sides of the screen and over
// the street in front of the tower, a few bigger near drops at the very sides, and splash rings
// popping on the wet floor. Behind the tower, above its floor line, no rain falls, so the
// column stays still and the tower reads. It thins out as you climb and stops in the smog.

const SLANT = 0.2; // sideways drift per pixel of fall (wind from the right)

interface Drop {
  x: number;
  phase: number;
  len: number;
  speed: number;
}

function drops(n: number, seed: number, len: number, speed: number): Drop[] {
  return Array.from({ length: n }, (_, i) => ({
    x: hash(seed + i * 1.3),
    phase: hash(seed + i * 2.7 + 0.5),
    len: len * (0.7 + hash(seed + i * 4.1) * 0.6),
    speed: speed * (0.8 + hash(seed + i * 5.9) * 0.4),
  }));
}

const FAR_RAIN = drops(110, 9100, 0.05, 1.9);
const NEAR_RAIN = drops(18, 9500, 0.09, 3.2);

/** Add the streaks of `list` to the current path; at light rain (`keep` < 1) only some of the drops. */
function streaks(ctx: Ctx, s: Scene, list: Drop[], keep: number): void {
  const u = s.u;
  const H = s.cssH;
  const span = s.cssW + SLANT * H;
  for (let i = 0; i < list.length; i++) {
    if (hash(i * 7.7 + 0.3) > keep) continue;
    const d = list[i]!;
    const L = d.len * u;
    const y = ((d.phase * (H + L) + s.t * d.speed * u) % (H + L)) - L;
    const x = d.x * span - SLANT * y;
    ctx.moveTo(x, y);
    ctx.lineTo(x - SLANT * L, y + L);
  }
}

/**
 * Clip to where rain may fall: the sides of the screen beyond `half` u from the center, and,
 * when `street`, the street in front of the tower's floor line.
 */
function rainZone(ctx: Ctx, s: Scene, half: number, street: boolean): void {
  const cx = s.cssW / 2;
  const h = half * s.u;
  ctx.beginPath();
  ctx.rect(0, 0, Math.max(0, cx - h), s.cssH);
  ctx.rect(cx + h, 0, Math.max(0, s.cssW - cx - h), s.cssH);
  if (street && s.groundY < s.cssH) ctx.rect(cx - h, s.groundY, h * 2, s.cssH - s.groundY);
  ctx.clip();
}

/** Rain behind the tower: at the sides of the screen and over the street in front of it. */
export function farRain(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.rain <= 0.02) return;
  ctx.save();
  rainZone(ctx, s, COLUMN, true);
  ctx.beginPath();
  streaks(ctx, s, FAR_RAIN, tone.rain);
  ctx.strokeStyle = tint(RAIN, 0.27);
  ctx.lineWidth = Math.max(1, s.u * 0.0022);
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.restore();
}

/** A few big, faint drops in front of everything, only at the very sides. */
export function nearRain(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.rain <= 0.02) return;
  ctx.save();
  rainZone(ctx, s, COLUMN + 0.06, false);
  ctx.beginPath();
  streaks(ctx, s, NEAR_RAIN, tone.rain);
  ctx.strokeStyle = tint(RAIN, 0.2);
  ctx.lineWidth = Math.max(1.2, s.u * 0.004);
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.restore();
}

// Splash spots on the floor: sideways spot (u at the tower's depth), depth, timing.
const SPLASHES = Array.from({ length: 30 }, (_, i) => ({
  X: (hash(i + 9900) - 0.5) * 2.4,
  z: 1.3 + hash(i + 9950) * 4.5,
  period: 0.7 + hash(i + 9990) * 0.8,
  offset: hash(i + 10030) * 3,
}));

/** Splash rings on the wet floor, each spot popping on its own beat (none behind the tower). */
export function splashes(ctx: Ctx, s: Scene, tone: Tone): void {
  if (tone.rain <= 0.02) return;
  const u = s.u;
  const cx = s.cssW / 2;
  const still = u * (COLUMN + 0.03);
  ctx.beginPath();
  for (let i = 0; i < SPLASHES.length; i++) {
    if (hash(i * 3.1 + 0.7) > tone.rain) continue;
    const sp = SPLASHES[i]!;
    const y = fieldY(s, sp.z);
    if (y > s.cssH + 4) continue;
    const k = TOWER_DEPTH / sp.z;
    const x = cx + sp.X * u * k;
    if (x < -10 || x > s.cssW + 10) continue;
    const rMax = u * 0.02 * k * 2;
    // Behind the floor line, splashes keep out of the tower's column.
    if (y < s.groundY + rMax && Math.abs(x - cx) < still + rMax) continue;
    const p = ((s.t + sp.offset) % sp.period) / sp.period;
    if (p > 0.45) continue;
    const r = u * 0.02 * k * (0.2 + p * 1.8);
    oval(ctx, x, y, r, r * 0.28);
  }
  ctx.strokeStyle = tint(RAIN, 0.3);
  ctx.lineWidth = Math.max(0.8, u * 0.002);
  ctx.stroke();
}
