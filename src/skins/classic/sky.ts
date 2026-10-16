import { alpha, circle, hash, ink, mix, oval, type Ctx } from "../../base/draw";
import { puffs } from "../../base/world";
import type { Scene } from "../skin";
import { INK, PALETTE } from "./colors";

// The saturated blue daytime sky above the valley: a smiling cartoon sun low on the left (out
// of the HUD's way) with slowly turning rays and a flat two-ring halo, fluffy cel-shaded clouds
// drifting across below the title, a hawk circling on the right, and now and then a faded V of
// birds crossing far off.

const TAU = Math.PI * 2;
const SIDES = [-1, 1] as const;

// ---------------------------------------------------------------- sun

const SUN_RAY = "#ffe36a";
const SUN_SHADE = "#ffb02e";
const SUN_BODY = "#ffd43f";
const SUN_LIGHT = "#fff3a6";
const SUN_RIM = "#f0921c";
const SUN_HALO = alpha("#fff6b8", 0.42);
const SUN_HALO_OUTER = alpha("#fff6b8", 0.22);
const CHEEK = alpha("#ff7a7a", 0.45);
const SUN_FACE = "#c4641a";
const RAYS = 12;

export function sun(ctx: Ctx, s: Scene): void {
  // Left of the HUD zone, below the title. Rays reach 1.6 r: keep them left of the HUD zone
  // (x < 20% of the width) but on screen.
  const r = s.u * 0.056;
  const x = Math.max(r * 1.75, Math.min(s.cssW * 0.115, s.cssW * 0.2 - r * 1.68));
  const y = Math.min(s.cssH * 0.25, s.horizonY - s.u * 0.3);
  if (y + r * 2 < 0) return;

  // A flat, cel-shaded halo in two soft rings (no blur: cheap on phones, and on style).
  ctx.beginPath();
  circle(ctx, x, y, r * 1.45);
  ctx.fillStyle = SUN_HALO_OUTER;
  ctx.fill();
  ctx.beginPath();
  circle(ctx, x, y, r * 1.22);
  ctx.fillStyle = SUN_HALO;
  ctx.fill();

  // Rays: long and short, turning slowly and breathing a little.
  const spin = s.t * 0.1;
  const breathe = 1 + 0.05 * Math.sin(s.t * 1.7);
  ctx.beginPath();
  for (let i = 0; i < RAYS; i++) {
    const a = spin + (i * TAU) / RAYS;
    const len = r * (i % 2 ? 1.36 : 1.58) * breathe;
    const half = i % 2 ? 0.13 : 0.16;
    ctx.moveTo(x + Math.cos(a - half) * r * 1.08, y + Math.sin(a - half) * r * 1.08);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.lineTo(x + Math.cos(a + half) * r * 1.08, y + Math.sin(a + half) * r * 1.08);
    ctx.closePath();
  }
  ctx.fillStyle = SUN_RAY;
  ctx.fill();
  ink(ctx, Math.max(1, r * 0.05), SUN_RIM);

  // Cel-shaded disc: shade, then the body offset to the upper left, then a lit spot.
  ctx.beginPath();
  circle(ctx, x, y, r);
  ctx.fillStyle = SUN_SHADE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = SUN_BODY;
  ctx.beginPath();
  circle(ctx, x - r * 0.1, y - r * 0.1, r * 0.92);
  ctx.fill();
  ctx.fillStyle = SUN_LIGHT;
  ctx.beginPath();
  oval(ctx, x - r * 0.42, y - r * 0.45, r * 0.24, r * 0.15, -0.6);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  circle(ctx, x, y, r);
  ink(ctx, Math.max(1.2, r * 0.07), SUN_RIM);

  // A sleepy, happy face: rosy cheeks, closed eyes, a small smile.
  ctx.fillStyle = CHEEK;
  ctx.beginPath();
  oval(ctx, x - r * 0.48, y + r * 0.2, r * 0.16, r * 0.1);
  oval(ctx, x + r * 0.44, y + r * 0.2, r * 0.16, r * 0.1);
  ctx.fill();
  ctx.beginPath();
  for (const side of SIDES) {
    const ex = x + side * r * 0.3 - r * 0.02;
    ctx.moveTo(ex - r * 0.13, y - r * 0.08);
    ctx.quadraticCurveTo(ex, y + r * 0.04, ex + r * 0.13, y - r * 0.08);
  }
  ctx.moveTo(x - r * 0.2, y + r * 0.26);
  ctx.quadraticCurveTo(x - r * 0.02, y + r * 0.46, x + r * 0.18, y + r * 0.26);
  ink(ctx, Math.max(1.1, r * 0.075), SUN_FACE);
}

// ---------------------------------------------------------------- clouds

/** Drifting clouds below the title: start x (fraction), height (fraction of the sky), size (u), speed (px/s). */
const CLOUDS = [
  [0.75, 0.0, 0.05, 4.5],
  [0.2, 0.55, 0.04, -3.2],
  [0.55, 1.0, 0.032, 2.4],
] as const;

/** Puffs of one cloud as offsets in its radius: x, y, r. Wide and flat-bottomed. */
const CLOUD_SHAPE = [
  [-1.35, 0.22, 0.72],
  [-0.55, -0.18, 0.95],
  [0.35, -0.32, 1.05],
  [1.25, 0.05, 0.8],
  [0.55, 0.32, 0.78],
  [-0.4, 0.34, 0.8],
] as const;

const CLOUD_BUF = CLOUD_SHAPE.map(() => ({ x: 0, y: 0, r: 0 }));

function clouds(ctx: Ctx, s: Scene): void {
  // Between the HUD band and the hills on the horizon (on short screens, just under the band).
  const top = s.cssH * 0.355;
  const bottom = Math.max(top + s.u * 0.04, s.horizonY - s.u * 0.36);
  for (const [fx, fy, size, speed] of CLOUDS) {
    const r = s.u * size;
    const span = s.cssW + r * 6;
    const x = ((((fx * s.cssW + s.t * speed) % span) + span) % span) - r * 3;
    const y = top + (bottom - top) * fy + Math.sin(s.t * 0.3 + fx * 9) * s.u * 0.004;
    for (let i = 0; i < CLOUD_SHAPE.length; i++) {
      const [dx, dy, dr] = CLOUD_SHAPE[i]!;
      const b = CLOUD_BUF[i]!;
      b.x = x + dx * r;
      b.y = y + dy * r;
      b.r = dr * r;
    }
    puffs(ctx, PALETTE, CLOUD_BUF);
  }
}

// ---------------------------------------------------------------- birds far off

const V_PERIOD = 30; // seconds between flights
const V_FLIGHT = 16; // seconds to cross
const V_BIRDS = 7;
const FAR_BIRD = mix(PALETTE.far, PALETTE.skyTop, 0.55);

/** A faded V of birds crossing below the HUD band now and then. */
function flock(ctx: Ctx, s: Scene): void {
  const cycle = Math.floor(s.t / V_PERIOD);
  const tt = s.t - cycle * V_PERIOD;
  if (tt > V_FLIGHT) return;
  const k = tt / V_FLIGHT;
  const dir = hash(cycle * 7 + 3) < 0.5 ? -1 : 1;
  const g = s.u * 0.022; // half wingspan
  const span = s.cssW + g * 20;
  const lx = dir > 0 ? -g * 8 + k * span : s.cssW + g * 8 - k * span;
  const ly = Math.min(s.cssH * (0.37 + 0.06 * hash(cycle * 5 + 1)), s.horizonY - s.u * 0.32) + Math.sin(k * 6) * s.u * 0.006;
  ctx.beginPath();
  for (let j = 0; j < V_BIRDS; j++) {
    const rank = Math.ceil(j / 2);
    const side = j % 2 ? 1 : -1;
    const x = lx - dir * rank * g * 1.6;
    const y = ly + side * rank * g * 0.7;
    gull(ctx, x, y, g, Math.sin(s.t * 6 + j * 0.9));
  }
  ctx.strokeStyle = FAR_BIRD;
  ctx.lineWidth = Math.max(1.2, s.u * 0.0045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** A seagull-style "m" stroke: half wingspan g, flap -1..1. */
export function gull(ctx: Ctx, x: number, y: number, g: number, flap: number): void {
  const tip = y - flap * g * 0.45;
  ctx.moveTo(x - g, tip);
  ctx.quadraticCurveTo(x - g * 0.45, y - g * 0.55, x, y);
  ctx.quadraticCurveTo(x + g * 0.45, y - g * 0.55, x + g, tip);
}

// ---------------------------------------------------------------- hawk

const HAWK = "#9a6238";
const HAWK_LIGHT = "#e2b47c";

/**
 * A hawk circling lazily on the right, wings spread wide like a heraldic eagle: a gull-wing
 * sweep with fingered tips, a fanned tail, banking as it turns and flexing as it rides the air.
 */
function hawk(ctx: Ctx, s: Scene): void {
  const u = s.u;
  // A tight circle right of the HUD zone.
  const cx = s.cssW - u * 0.11;
  const cy = Math.min(s.cssH * 0.3, s.horizonY - u * 0.42);
  const a = s.t * 0.45;
  const x = cx + Math.cos(a) * u * 0.04;
  const y = cy + Math.sin(a) * u * 0.022;
  const g = u * 0.042 * (1 + Math.sin(a) * 0.08); // half wingspan, a little bigger on the near side
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.cos(a) * 0.22);
  ctx.scale(g, g);
  const w = Math.max(1, u * 0.0034) / g;
  const lift = Math.sin(s.t * 1.2) * 0.07;
  ctx.beginPath();
  // Tail fan
  ctx.moveTo(-0.07, 0.16);
  ctx.lineTo(-0.15, 0.44);
  ctx.quadraticCurveTo(0, 0.52, 0.15, 0.44);
  ctx.lineTo(0.07, 0.16);
  ctx.closePath();
  for (const side of SIDES) hawkWing(ctx, side, lift);
  oval(ctx, 0, 0.04, 0.1, 0.2);
  circle(ctx, 0, -0.17, 0.085);
  ctx.fillStyle = HAWK;
  ink(ctx, w * 2, INK);
  ctx.fill();
  // Pale band along each wing and across the tail, a darker back, a yellow beak.
  ctx.beginPath();
  for (const side of SIDES) {
    ctx.moveTo(side * 0.14, 0.02);
    ctx.quadraticCurveTo(side * 0.45, -0.1 - lift * 0.5, side * 0.78, -0.04 - lift);
  }
  ctx.moveTo(-0.1, 0.38);
  ctx.lineTo(0.1, 0.38);
  ctx.strokeStyle = HAWK_LIGHT;
  ctx.lineWidth = w * 1.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.03, -0.12);
  ctx.lineTo(0.03, -0.12);
  ctx.lineTo(0, -0.04);
  ctx.closePath();
  ctx.fillStyle = "#ffc23a";
  ctx.fill();
  ctx.restore();
}


/** One broad wing out to side (+1 / -1): leading edge swept up, fingered primaries, tips lifting. */
function hawkWing(ctx: Ctx, side: number, lift: number): void {
  ctx.moveTo(side * 0.08, -0.06);
  ctx.quadraticCurveTo(side * 0.42, -0.3 - lift * 0.5, side * 0.98, -0.12 - lift);
  ctx.lineTo(side * 1.02, -0.04 - lift);
  ctx.lineTo(side * 0.94, -0.06 - lift);
  ctx.lineTo(side * 0.97, 0.03 - lift);
  ctx.lineTo(side * 0.88, 0.0 - lift);
  ctx.lineTo(side * 0.89, 0.09 - lift);
  ctx.lineTo(side * 0.8, 0.05 - lift);
  ctx.quadraticCurveTo(side * 0.45, 0.18 - lift * 0.4, side * 0.08, 0.12);
  ctx.closePath();
}

/** Things in the sky, after the sun. */
export function skyLayer(ctx: Ctx, s: Scene): void {
  clouds(ctx, s);
  flock(ctx, s);
  hawk(ctx, s);
}
