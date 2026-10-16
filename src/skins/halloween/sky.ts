import { alpha, circle, neonStroke, oval, type Ctx } from "../../neon/draw";
import { altitude01 } from "../../neon/world";
import type { Scene } from "../skin";
import { GREEN, INK } from "./common";

// The Halloween sky: a big cratered full moon left of the HUD column, witches on broomsticks
// (one crosses the moon) and a few bats, all as dark silhouettes with thin neon rims.

const TAU = Math.PI * 2;
const MOON_RIM = "#e58cff";
const MOON_HALO = "#b46bff";

// Moon surface, in fractions of the radius.
const MARIA = [
  { x: -0.3, y: -0.2, rx: 0.34, ry: 0.22, rot: 0.5 },
  { x: 0.22, y: 0.1, rx: 0.28, ry: 0.2, rot: -0.3 },
  { x: -0.08, y: 0.45, rx: 0.22, ry: 0.13, rot: 0.15 },
  { x: 0.34, y: -0.4, rx: 0.15, ry: 0.1, rot: 0.6 },
];
const CRATERS = [
  { x: -0.45, y: 0.24, r: 0.13 },
  { x: 0.4, y: 0.42, r: 0.1 },
  { x: 0.05, y: -0.58, r: 0.09 },
  { x: 0.55, y: -0.06, r: 0.08 },
  { x: -0.14, y: 0.08, r: 0.07 },
  { x: -0.55, y: -0.32, r: 0.06 },
  { x: 0.16, y: 0.68, r: 0.06 },
  { x: -0.25, y: -0.6, r: 0.05 },
];

/** Moon center and radius: left of the score column, below the HUD, above the skyline. */
function moonX(s: Scene): number {
  return s.cssW / 2 - s.u * 0.31;
}
function moonY(s: Scene): number {
  return s.cssH * 0.37;
}
/** It swells a little as you climb toward it. */
function moonR(s: Scene): number {
  return s.u * (0.1 + altitude01(s) * 0.015);
}

export function moon(ctx: Ctx, s: Scene): void {
  const x = moonX(s);
  const y = moonY(s);
  const r = moonR(s);

  // Soft violet halo
  const reach = r * 2.8;
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, reach);
  halo.addColorStop(0, alpha(MOON_HALO, 0.38));
  halo.addColorStop(0.4, alpha(MOON_HALO, 0.12));
  halo.addColorStop(1, alpha(MOON_HALO, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);

  // Disc, lit from the upper left
  ctx.beginPath();
  circle(ctx, x, y, r);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#fffbef");
  g.addColorStop(0.65, "#f1e6d2");
  g.addColorStop(1, "#cdb6d6");
  ctx.fillStyle = g;
  ctx.fill();

  // Seas and craters
  ctx.beginPath();
  for (const m of MARIA) oval(ctx, x + m.x * r, y + m.y * r, m.rx * r, m.ry * r, m.rot);
  ctx.fillStyle = alpha("#9a84a8", 0.3);
  ctx.fill();
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + c.x * r, y + c.y * r, c.r * r);
  ctx.fillStyle = alpha("#8e7798", 0.42);
  ctx.fill();
  ctx.beginPath();
  for (const c of CRATERS) circle(ctx, x + (c.x + c.r * 0.22) * r, y + (c.y + c.r * 0.22) * r, c.r * r * 0.68);
  ctx.fillStyle = alpha("#fff7e6", 0.4);
  ctx.fill();

  ctx.beginPath();
  circle(ctx, x, y, r);
  neonStroke(ctx, MOON_RIM, Math.max(1.3, s.u * 0.0045), 3.5);
}

// ---------------------------------------------------------------- witches

/** Filled parts of a witch on a broom, facing +x, in units of her size. Windings all match. */
function witchSolid(ctx: Ctx, flap: number): void {
  ctx.beginPath();
  // Bristles
  ctx.moveTo(-0.95, 0.12);
  ctx.lineTo(-1.55, 0.45);
  ctx.lineTo(-1.72, 0.22);
  ctx.lineTo(-1.6, -0.12);
  ctx.closePath();
  // Cape streaming behind
  ctx.moveTo(0.15, -0.55);
  ctx.lineTo(-0.1, 0.1);
  ctx.lineTo(-0.85, 0.05 + flap * 0.3);
  ctx.lineTo(-0.7, -0.1 - flap * 0.5);
  ctx.lineTo(-1.05, -0.25 + flap);
  ctx.quadraticCurveTo(-0.5, -0.62 + flap, 0.15, -0.55);
  ctx.closePath();
  // Body hunched over the broom
  ctx.moveTo(-0.25, 0.08);
  ctx.quadraticCurveTo(-0.1, -0.6, 0.25, -0.55);
  ctx.lineTo(0.35, 0.02);
  ctx.closePath();
  // Head and hooked nose
  circle(ctx, 0.3, -0.68, 0.15);
  ctx.moveTo(0.42, -0.72);
  ctx.lineTo(0.6, -0.6);
  ctx.lineTo(0.42, -0.6);
  ctx.closePath();
  // Hat with a crooked tip
  ctx.moveTo(-0.02, -0.78);
  ctx.lineTo(0.18, -0.86);
  ctx.lineTo(0.02, -1.14);
  ctx.lineTo(0.1, -1.32);
  ctx.lineTo(0.38, -0.86);
  ctx.lineTo(0.62, -0.82);
  ctx.closePath();
}

/** Stick parts: broom handle, arm, dangling leg. */
function witchLimbs(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-1.1, 0.15);
  ctx.lineTo(1.0, -0.05);
  ctx.moveTo(0.2, -0.35);
  ctx.lineTo(0.55, 0);
  ctx.moveTo(-0.05, 0.08);
  ctx.lineTo(0.05, 0.4);
  ctx.lineTo(0.2, 0.42);
}

/**
 * A witch silhouette with a neon rim around the whole outline (not every part): the shape is
 * stroked fat in the rim color first, then filled dark on top.
 */
function witch(ctx: Ctx, x: number, y: number, size: number, dir: 1 | -1, t: number, rim: string, rimPx: number): void {
  const flap = Math.sin(t * 9) * 0.12;
  const e = rimPx / size;
  const limb = 0.08;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * size * 0.15);
  ctx.scale(dir * size, size);
  ctx.rotate(-0.08);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [width, color] of [
    [e * 6, alpha(rim, 0.16)],
    [e * 2, rim],
    [0, INK],
  ] as const) {
    ctx.strokeStyle = color;
    witchSolid(ctx, flap);
    if (width > 0) {
      ctx.lineWidth = width;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.lineWidth = limb + width;
    witchLimbs(ctx);
    ctx.stroke();
  }
  ctx.restore();
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
  for (let side = 1; side >= -1; side -= 2) {
    const k = side * s;
    if (side === 1) {
      ctx.quadraticCurveTo(x + k * 0.3, y - s * (0.2 + L * 0.6), x + k * 0.55, y - s * (0.24 + L));
      ctx.quadraticCurveTo(x + k * 0.8, y - s * (0.22 + L * 1.1), x + k, y - s * (0.04 + L * 1.25));
      ctx.quadraticCurveTo(x + k * 0.84, y + s * (0.02 - L * 0.75), x + k * 0.74, y + s * (0.22 - L * 0.85));
      ctx.quadraticCurveTo(x + k * 0.6, y + s * (0.08 - L * 0.5), x + k * 0.44, y + s * (0.26 - L * 0.5));
      ctx.quadraticCurveTo(x + k * 0.3, y + s * (0.1 - L * 0.25), x + k * 0.08, y + s * 0.18);
      ctx.lineTo(x, y + s * 0.28);
    } else {
      ctx.lineTo(x + k * 0.08, y + s * 0.18);
      ctx.quadraticCurveTo(x + k * 0.3, y + s * (0.1 - L * 0.25), x + k * 0.44, y + s * (0.26 - L * 0.5));
      ctx.quadraticCurveTo(x + k * 0.6, y + s * (0.08 - L * 0.5), x + k * 0.74, y + s * (0.22 - L * 0.85));
      ctx.quadraticCurveTo(x + k * 0.84, y + s * (0.02 - L * 0.75), x + k, y - s * (0.04 + L * 1.25));
      ctx.quadraticCurveTo(x + k * 0.8, y - s * (0.22 + L * 1.1), x + k * 0.55, y - s * (0.24 + L));
      ctx.quadraticCurveTo(x + k * 0.3, y - s * (0.2 + L * 0.6), x + k * 0.06, y - s * 0.1);
    }
  }
  ctx.closePath();
}

// Bats: screen-height band (fraction of cssH), size (u), speed (px/s), direction, phase.
// The last ones only come out once you are high up.
const BATS = [
  { y: 0.4, size: 0.046, speed: 38, dir: 1, phase: 40, rate: 12 },
  { y: 0.47, size: 0.036, speed: 52, dir: -1, phase: 210, rate: 14 },
  { y: 0.35, size: 0.032, speed: 30, dir: -1, phase: 330, rate: 13 },
  { y: 0.43, size: 0.04, speed: 44, dir: 1, phase: 520, rate: 11 },
  { y: 0.52, size: 0.034, speed: 36, dir: 1, phase: 120, rate: 15 },
  { y: 0.38, size: 0.03, speed: 58, dir: -1, phase: 400, rate: 16 },
] as const;
const BAT_RIM = "#9a55ff";

export function flyers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const t = s.t;
  const a = altitude01(s);

  // Bats, all in one path
  const count = 4 + Math.floor(a * 2.99);
  const span = s.cssW + u * 0.3;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const b = BATS[i];
    if (!b) break;
    const along = (((t * b.speed + b.phase) % span) + span) % span;
    const x = b.dir === 1 ? along - u * 0.15 : s.cssW + u * 0.15 - along;
    const y = s.cssH * b.y + Math.sin(t * 1.7 + i * 2.1) * u * 0.025 + Math.sin(t * 4.3 + i) * u * 0.006;
    batPath(ctx, x, y, u * b.size, Math.sin(t * b.rate + i * 1.7));
  }
  ctx.fillStyle = INK;
  ctx.fill();
  neonStroke(ctx, BAT_RIM, Math.max(0.8, u * 0.0022), 2.4);

  // A small witch far off, behind the town, flying left
  {
    const period = 23;
    const p = ((((t + 9) % period) + period) % period) / period;
    const wspan = s.cssW + u * 0.4;
    const x = s.cssW + u * 0.2 - p * wspan;
    const y = s.cssH * 0.455 + Math.sin(p * TAU * 2) * u * 0.015;
    witch(ctx, x, y, u * 0.03, -1, t + 1.3, GREEN, 0.9);
  }
  // The big witch: her path runs across the face of the moon, then dips away from the HUD.
  {
    const period = 16;
    const p = ((((t + 1.9) % period) + period) % period) / period;
    const wspan = s.cssW + u * 0.6;
    const x = p * wspan - u * 0.3;
    const y = moonY(s) + Math.max(0, x - moonX(s)) * 0.2 + Math.sin(p * TAU * 2) * u * 0.012;
    witch(ctx, x, y, u * 0.052, 1, t, GREEN, 1.2);
  }
}
