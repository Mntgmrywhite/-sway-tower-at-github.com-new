import { circle, mix, oval, type Ctx } from "../../base/draw";
import { altitude01, HORIZON_P } from "../../base/world";
import type { Scene } from "../skin";
import { FLYER, PALETTE } from "./common";

// The Halloween sky: a big cream full moon left of the HUD column, witches on broomsticks
// (one crosses the face of the moon) and a few bats. Everything up here is far away, so it
// is drawn as faded flat silhouettes with no outline and no glow.

const TAU = Math.PI * 2;
const FLYER_HIGH = mix(FLYER, "#140f3c", 0.55);

const MOON_SEA = mix(PALETTE.moon, "#c8a98a", 0.32);
const MOON_CRATER = mix(PALETTE.moon, "#b8957a", 0.4);
const MOON_RIM = mix(PALETTE.moon, "#ffffff", 0.55);

// Moon surface, in fractions of the radius.
const MARIA = [
  { x: -0.3, y: -0.2, rx: 0.34, ry: 0.22, rot: 0.5 },
  { x: 0.24, y: 0.12, rx: 0.28, ry: 0.2, rot: -0.3 },
  { x: -0.08, y: 0.48, rx: 0.22, ry: 0.13, rot: 0.15 },
];
const CRATERS = [
  { x: -0.45, y: 0.26, r: 0.13 },
  { x: 0.42, y: 0.44, r: 0.1 },
  { x: 0.05, y: -0.58, r: 0.09 },
  { x: 0.56, y: -0.1, r: 0.08 },
  { x: -0.52, y: -0.36, r: 0.06 },
];

/** It swells a little as you climb toward it. */
function moonR(s: Scene): number {
  return s.u * (0.095 + altitude01(s) * 0.015);
}
/** Moon center: left of the score column, below the HUD, above the clouds and rooftops. */
function moonX(s: Scene): number {
  return s.cssW / 2 - s.u * 0.28;
}
function moonY(s: Scene): number {
  const r = moonR(s);
  // Clear of the HUD block, and on tall phones of the whole top band; but kept above the
  // rooftops (as they stand at the start, the lowest the camera holds them) on shorter screens.
  const hud = s.cssH * 0.14 + s.u * 0.25 + r;
  const band = s.cssH * 0.32 + r + s.u * 0.012;
  const roofs = s.horizonY - HORIZON_P * s.rise - s.u * 0.3 - r;
  return Math.max(hud, Math.min(band, roofs));
}

export function moon(ctx: Ctx, s: Scene): void {
  const x = moonX(s);
  const y = moonY(s);
  const r = moonR(s);

  // The one soft halo in the scene.
  ctx.save();
  ctx.shadowColor = "rgba(255, 244, 214, 0.65)";
  ctx.shadowBlur = r * 0.9;
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.restore();

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
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

// ---------------------------------------------------------------- witches

/** Filled parts of a witch on a broom, facing +x, in units of her size, as closed subpaths. */
function witchSolid(ctx: Ctx, flap: number): void {
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
  ctx.moveTo(-1.1, 0.15);
  ctx.lineTo(1.0, -0.05);
  ctx.moveTo(0.2, -0.35);
  ctx.lineTo(0.55, 0);
  ctx.moveTo(-0.05, 0.08);
  ctx.lineTo(0.05, 0.4);
  ctx.lineTo(0.2, 0.42);
}

/** A witch silhouette in the current fill style. */
function witch(ctx: Ctx, x: number, y: number, size: number, dir: 1 | -1, t: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * size * 0.15);
  ctx.scale(dir * size, size);
  ctx.rotate(-0.08);
  ctx.beginPath();
  witchSolid(ctx, Math.sin(t * 9) * 0.12);
  ctx.fill();
  ctx.beginPath();
  witchLimbs(ctx);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 0.09;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
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
  // Right wing out along the top edge, back along the scalloped trailing edge
  ctx.quadraticCurveTo(x + s * 0.3, y - s * (0.2 + L * 0.6), x + s * 0.55, y - s * (0.24 + L));
  ctx.quadraticCurveTo(x + s * 0.8, y - s * (0.22 + L * 1.1), x + s, y - s * (0.04 + L * 1.25));
  ctx.quadraticCurveTo(x + s * 0.84, y + s * (0.02 - L * 0.75), x + s * 0.74, y + s * (0.22 - L * 0.85));
  ctx.quadraticCurveTo(x + s * 0.6, y + s * (0.08 - L * 0.5), x + s * 0.44, y + s * (0.26 - L * 0.5));
  ctx.quadraticCurveTo(x + s * 0.3, y + s * (0.1 - L * 0.25), x + s * 0.08, y + s * 0.18);
  ctx.lineTo(x, y + s * 0.28);
  // Left wing, the mirror image, traced the other way round
  ctx.lineTo(x - s * 0.08, y + s * 0.18);
  ctx.quadraticCurveTo(x - s * 0.3, y + s * (0.1 - L * 0.25), x - s * 0.44, y + s * (0.26 - L * 0.5));
  ctx.quadraticCurveTo(x - s * 0.6, y + s * (0.08 - L * 0.5), x - s * 0.74, y + s * (0.22 - L * 0.85));
  ctx.quadraticCurveTo(x - s * 0.84, y + s * (0.02 - L * 0.75), x - s, y - s * (0.04 + L * 1.25));
  ctx.quadraticCurveTo(x - s * 0.8, y - s * (0.22 + L * 1.1), x - s * 0.55, y - s * (0.24 + L));
  ctx.quadraticCurveTo(x - s * 0.3, y - s * (0.2 + L * 0.6), x - s * 0.06, y - s * 0.1);
  ctx.closePath();
}

// Bats: screen-height band (fraction of cssH), size (u), speed (px/s), direction, phase, flap
// rate. The last ones only come out once you are high up.
const BATS = [
  { y: 0.36, size: 0.042, speed: 34, dir: 1, phase: 40, rate: 12 },
  { y: 0.42, size: 0.034, speed: 48, dir: -1, phase: 210, rate: 14 },
  { y: 0.34, size: 0.03, speed: 28, dir: -1, phase: 330, rate: 13 },
  { y: 0.45, size: 0.038, speed: 40, dir: 1, phase: 520, rate: 11 },
  { y: 0.39, size: 0.032, speed: 33, dir: 1, phase: 120, rate: 15 },
  { y: 0.35, size: 0.028, speed: 54, dir: -1, phase: 400, rate: 16 },
] as const;

export function flyers(ctx: Ctx, s: Scene): void {
  const u = s.u;
  const t = s.t;
  const a = altitude01(s);
  // The sky deepens as you climb, so the flyers deepen with it to stay a shade darker.
  ctx.fillStyle = mix(FLYER, FLYER_HIGH, a);

  // Bats, all in one path
  const count = 4 + Math.floor(a * 2.99);
  const span = s.cssW + u * 0.3;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const b = BATS[i];
    if (!b) break;
    const along = (((t * b.speed + b.phase) % span) + span) % span;
    const x = b.dir === 1 ? along - u * 0.15 : s.cssW + u * 0.15 - along;
    const y = s.cssH * b.y + Math.sin(t * 1.7 + i * 2.1) * u * 0.02 + Math.sin(t * 4.3 + i) * u * 0.005;
    batPath(ctx, x, y, u * b.size, Math.sin(t * b.rate + i * 1.7));
  }
  ctx.fill();

  // A small witch far off, flying left above the rooftops
  {
    const period = 23;
    const p = ((((t + 9) % period) + period) % period) / period;
    const wspan = s.cssW + u * 0.4;
    const x = s.cssW + u * 0.2 - p * wspan;
    const y = s.cssH * 0.415 + Math.sin(p * TAU * 2) * u * 0.012;
    if (x > -u * 0.1 && x < s.cssW + u * 0.1) witch(ctx, x, y, u * 0.026, -1, t + 1.3);
  }
  // The big witch: her path runs across the face of the moon, then dips gently and levels off.
  {
    const period = 16;
    const p = ((((t + 1.9) % period) + period) % period) / period;
    const wspan = s.cssW + u * 0.6;
    const x = p * wspan - u * 0.3;
    const my = moonY(s);
    const dx = Math.max(0, x - moonX(s));
    const y = my + u * 0.1 * Math.tanh(dx / (u * 0.5)) + Math.sin(p * TAU * 2) * u * 0.01;
    if (x > -u * 0.15 && x < s.cssW + u * 0.15) witch(ctx, x, y, u * 0.048, 1, t);
  }
}
