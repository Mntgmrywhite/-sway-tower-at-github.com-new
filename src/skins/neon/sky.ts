import { alpha, hash, mix, oval, type Ctx } from "../../base/draw";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { CLOUD, CLOUD_LIT, GOLD, HOT, ORANGE, PINK, TAU, window01 } from "./colors";

// The Synthwave sky: a big striped sunset sun on the horizon, flat dusk clouds lit pink from
// below in the side margins, and shooting stars that streak across now and then (more of them
// once you climb into the night). The sky over the tower column is left clear.

/** Radius of the sun (u) and how far its center sits above the horizon (fraction of radius). */
const SUN_R = 0.27;
const SUN_LIFT = 0.36;
const HALO_IN = alpha(HOT, 0.3);
const HALO_OUT = alpha(HOT, 0);

/** The striped synthwave sun: gold at the top, neon orange, hot pink at the horizon. */
export function sun(ctx: Ctx, s: Scene): void {
  const r = s.u * SUN_R;
  const cx = s.cssW / 2;
  const cy = s.horizonY - r * SUN_LIFT;
  if (cy - r > s.cssH) return;

  const halo = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.9);
  halo.addColorStop(0, HALO_IN);
  halo.addColorStop(1, HALO_OUT);
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 1.9, cy - r * 1.9, r * 3.8, r * 3.8);

  // Disc, cut by bands that thicken toward the horizon.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r, cy - r, r * 2, r * 1.02);
  let y = cy + r * 0.02;
  for (let i = 0; y < cy + r; i++) {
    const gap = r * (0.03 + i * 0.024);
    const band = r * 0.1;
    ctx.rect(cx - r, y + gap, r * 2, band);
    y += gap + band;
  }
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r * 0.8);
  g.addColorStop(0, GOLD);
  g.addColorStop(0.45, ORANGE);
  g.addColorStop(1, PINK);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

interface Cloud {
  /** Center x (u from the screen center), height over the horizon (u), width and height (u). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Long flat dusk clouds in the side margins, clear of the tower column and the HUD. */
const CLOUDS: readonly Cloud[] = [
  { x: -0.4, y: 0.47, w: 0.18, h: 0.034 },
  { x: -0.41, y: 0.34, w: 0.14, h: 0.025 },
  { x: 0.4, y: 0.53, w: 0.18, h: 0.036 },
  { x: 0.41, y: 0.39, w: 0.13, h: 0.023 },
  // Higher ones come down into view as you climb.
  { x: -0.4, y: 1.35, w: 0.18, h: 0.032 },
  { x: 0.4, y: 1.75, w: 0.18, h: 0.034 },
  { x: -0.4, y: 2.2, w: 0.17, h: 0.03 },
  { x: 0.4, y: 2.65, w: 0.18, h: 0.032 },
];
/** On wide screens the HUD spans more than the play area: keep clouds out beside it. */
const HUD_HALF = 0.3; // fraction of the screen width either side of center

/** Lobes of a cloud as [dx, dy, rx, ry] in units of its half-width / height: a flat base and
 *  a bumpy top. */
const LOBES: readonly (readonly [number, number, number, number])[] = [
  [0, 0.32, 1, 0.3],
  [-0.62, 0.08, 0.3, 0.5],
  [-0.3, -0.12, 0.36, 0.72],
  [0.08, -0.22, 0.34, 0.85],
  [0.42, 0.0, 0.3, 0.6],
  [0.72, 0.2, 0.22, 0.38],
  [-0.86, 0.25, 0.16, 0.3],
];

const CLOUD_UNDER = alpha(CLOUD_LIT, 0.75);

function lobes(ctx: Ctx, s: Scene, drop: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  const drift = Math.sin(s.t * 0.07) * u * 0.006;
  for (const [i, c] of CLOUDS.entries()) {
    const y = s.horizonY - c.y * u;
    const hw = (c.w / 2) * u;
    const h = c.h * u;
    if (y + h < 0 || y - h > s.horizonY - u * 0.02) continue;
    const off = Math.max(Math.abs(c.x) * u, s.cssW * HUD_HALF + hw + u * 0.01);
    const x = cx + Math.sign(c.x) * off + drift * (i % 2 ? 1 : -1);
    for (const [dx, dy, rx, ry] of LOBES) oval(ctx, x + dx * hw, y + dy * h + drop * h, rx * hw, ry * h);
  }
}

function clouds(ctx: Ctx, s: Scene): void {
  // Lit undersides first (the same lobes, a little lower), then the dark cloud over them.
  ctx.beginPath();
  lobes(ctx, s, 0.16);
  ctx.fillStyle = CLOUD_UNDER;
  ctx.fill();
  ctx.beginPath();
  lobes(ctx, s, 0);
  ctx.fillStyle = CLOUD;
  ctx.fill();
}

/** Shooting-star slots: each fires once per period at a fresh place (cycle × slot). */
const SLOTS: readonly { period: number; offset: number; minAlt: number }[] = [
  { period: 6.1, offset: 3.55, minAlt: 0 },
  { period: 8.3, offset: 6.9, minAlt: 0 },
  { period: 5.3, offset: 1.1, minAlt: 0.25 },
  { period: 7.4, offset: 4.4, minAlt: 0.5 },
];
const STREAK_TIME = 0.85; // seconds a shooting star is visible
const TAIL_STEPS = 6;
const TAIL_COLOR = mix(PINK, "#ffffff", 0.45);

function shootingStars(ctx: Ctx, s: Scene): void {
  const a = altitude01(s);
  const u = s.u;
  const W = s.cssW;
  const H = s.cssH;
  // Stars appear in the sky band under the HUD, or in the side margins next to it.
  const floorY = Math.min(H * 0.62, s.horizonY - u * 0.12);
  for (const [i, slot] of SLOTS.entries()) {
    if (a < slot.minAlt) continue;
    const tt = s.t + slot.offset;
    const n = Math.floor(tt / slot.period);
    const p = tt - n * slot.period;
    if (p > STREAK_TIME) continue;
    const seed = n * 13 + i * 101;
    const dir = hash(seed) < 0.5 ? -1 : 1;
    const side = hash(seed + 1) < 0.5;
    let x0: number;
    let y0: number;
    if (hash(seed + 2) < 0.55) {
      // Under the HUD: anywhere across.
      // Start low enough that the tail trailing above the head stays under the HUD (0.32 H).
      const top = H * 0.32 + u * 0.08;
      x0 = W * (0.12 + hash(seed + 3) * 0.76);
      y0 = top + hash(seed + 4) * Math.max(0, floorY - top - u * 0.12);
    } else {
      // In a side margin beside the HUD, heading out toward the edge; close enough to the edge
      // that the tail trailing behind the head stays out of the HUD (0.2 W .. 0.8 W).
      x0 = side ? W * (0.03 + hash(seed + 3) * 0.07) : W * (0.9 + hash(seed + 3) * 0.07);
      y0 = H * (0.06 + hash(seed + 4) * 0.22);
    }
    const heading = side && x0 < W / 2 ? -1 : x0 > W / 2 ? 1 : dir;
    const ang = 0.38 + hash(seed + 5) * 0.25;
    const dx = Math.cos(ang) * heading;
    const dy = Math.sin(ang);
    const k = p / STREAK_TIME;
    const travel = u * 0.32 * k;
    const hx = x0 + dx * travel;
    const hy = y0 + dy * travel;
    if (hy > floorY) continue;
    const fade = window01(k, 0, 1, 0.25);
    const tail = u * (0.1 + 0.08 * Math.min(1, k * 2.5));
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, u * 0.0035);
    ctx.strokeStyle = TAIL_COLOR;
    for (let j = 0; j < TAIL_STEPS; j++) {
      const a0 = j / TAIL_STEPS;
      const a1 = (j + 1) / TAIL_STEPS;
      ctx.beginPath();
      ctx.moveTo(hx - dx * tail * a0, hy - dy * tail * a0);
      ctx.lineTo(hx - dx * tail * a1, hy - dy * tail * a1);
      ctx.globalAlpha = fade * 0.85 * (1 - a0) * (1 - a0);
      ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(1, u * 0.004), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** The sky layer: dusk clouds, then shooting stars. */
export function sky(ctx: Ctx, s: Scene): void {
  clouds(ctx, s);
  shootingStars(ctx, s);
}
