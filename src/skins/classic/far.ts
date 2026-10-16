import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { cloud, LONG_CLOUD } from "./shapes";
import { DAY_HIGH, smooth, type Tone } from "./tone";

// The far layer, standing on the horizon: two rows of soft rolling hills and the meadow far
// below, with a few groves of treetops and two small clouds drifting low over it. Above the
// start the cloud sea gathers below you and covers the land: from then on its puffy top is the
// horizon. All of it is faded and flat, with no outline.

/** Where the cloud sea's top edge is: below the screen at the start, at the horizon once you are above the clouds. */
export function seaTop(s: Scene, lvl: number): number {
  const k = smooth(16, DAY_HIGH, lvl);
  const below = s.cssH + s.u * 0.14;
  return below + (s.horizonY + s.u * 0.01 - below) * k;
}

// ---------------------------------------------------------------- hills and meadow

const HILL_STEP = 0.035;

/** A row of rolling hills on the horizon, filled down to `bottom`. */
function hills(ctx: Ctx, s: Scene, base: number, height: number, f1: number, f2: number, ph: number, bottom: number): void {
  const u = s.u;
  const cx = s.cssW / 2;
  ctx.beginPath();
  ctx.moveTo(-1, bottom);
  for (let x = -1; ; x += u * HILL_STEP) {
    const X = (x - cx) / u;
    const y = base - u * height * (0.6 + 0.3 * Math.sin(X * f1 + ph) + 0.18 * Math.sin(X * f2 + ph * 2.3));
    ctx.lineTo(x, y);
    if (x > s.cssW + 1) break;
  }
  ctx.lineTo(s.cssW + 1, bottom);
  ctx.closePath();
  ctx.fill();
}

/**
 * Groves of treetops on the meadow: x (u from the center), depth below the horizon (u), size
 * (u). Smaller than the island's own tree, so they read as far below. The left ones keep
 * clear of the kite's string, which runs up from the island's edge.
 */
const GROVES = [
  { x: -0.45, d: 0.06, r: 0.013 },
  { x: -0.43, d: 0.25, r: 0.017 },
  { x: 0.33, d: 0.07, r: 0.014 },
  { x: 0.43, d: 0.13, r: 0.017 },
] as const;

export function groves(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  const cx = s.cssW / 2;
  // Shade first, then the lit crowns shifted up, three treetops to a grove.
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? tone.grove : tone.groveShade;
    ctx.beginPath();
    for (const g of GROVES) {
      const x = cx + g.x * u;
      const y = s.horizonY + g.d * u;
      const r = g.r * u;
      const up = pass ? r * 0.18 : 0;
      const k = pass ? 0.86 : 1;
      circle(ctx, x - r * 0.9, y - up, r * 0.8 * k);
      circle(ctx, x, y - r * 0.4 - up, r * k);
      circle(ctx, x + r * 0.95, y - up, r * 0.75 * k);
    }
    ctx.fill();
  }
}

/** Two small clouds low over the meadow, either side of the island: you are high above it. */
const LOW_CLOUDS = [
  { x: -0.435, d: 0.37, r: 0.028 },
  { x: 0.44, d: 0.31, r: 0.03 },
] as const;

export function lowClouds(ctx: Ctx, s: Scene, tone: Tone): void {
  const u = s.u;
  for (const c of LOW_CLOUDS) {
    const x = s.cssW / 2 + c.x * u + Math.sin(s.t * 0.15 + c.x * 7) * u * 0.008;
    cloud(ctx, LONG_CLOUD, x, s.horizonY + c.d * u, c.r * u, tone.cloudShade, tone.cloud, tone.cloudLight);
  }
}

/** A wavy edge across the screen at `y` (continues the path, left to right). */
function rolling(ctx: Ctx, s: Scene, y: number, amp: number, f: number, ph: number): void {
  const u = s.u;
  for (let x = 0; ; x += u * 0.05) {
    const X = (x - s.cssW / 2) / u;
    ctx.lineTo(x, y + u * amp * (Math.sin(X * f + ph) + 0.5 * Math.sin(X * f * 2.3 + ph * 1.7)));
    if (x > s.cssW) break;
  }
}

/** The meadow below the hills, in two rolling bands of green: lighter far off, deeper near. */
function meadow(ctx: Ctx, s: Scene, tone: Tone, bottom: number): void {
  const u = s.u;
  const hz = s.horizonY;
  ctx.fillStyle = tone.meadow;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  rolling(ctx, s, hz + u * 0.05, 0.012, 5, 2.1);
  ctx.lineTo(s.cssW, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone.meadowShade;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  rolling(ctx, s, hz + u * 0.17, 0.02, 6, 0.8);
  ctx.lineTo(s.cssW, bottom);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- cloud sea

/** Puffs along the cloud sea's top edge, repeating every SEA_SPAN of them. */
const SEA_SPAN = 9;
const SEA = Array.from({ length: SEA_SPAN }, (_, i) => ({ r: 0.05 + hash(i + 1200) * 0.035, dy: hash(i + 1300) * 0.025 }));

/** The cloud sea: a row of cel-shaded puffs drifting slowly along its top, solid below. */
function sea(ctx: Ctx, s: Scene, tone: Tone, top: number): void {
  const u = s.u;
  const step = u * 0.085;
  const off = (s.t * u * 0.004) % (step * SEA_SPAN);
  const n = Math.ceil(s.cssW / step) + 1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = pass === 0 ? tone.cloudShade : pass === 1 ? tone.cloud : tone.cloudLight;
    ctx.beginPath();
    for (let j = -SEA_SPAN; j <= n; j++) {
      const x = j * step + off;
      if (x < -step || x > s.cssW + step) continue;
      const p = SEA[((j % SEA_SPAN) + SEA_SPAN) % SEA_SPAN]!;
      const r = p.r * u;
      const y = top + p.dy * u + r * 0.35;
      if (pass === 0) circle(ctx, x, y, r);
      else if (pass === 1) circle(ctx, x - r * 0.06, y - r * 0.12, r * 0.9);
      else circle(ctx, x - r * 0.25, y - r * 0.42, r * 0.42);
    }
    if (pass === 0) ctx.rect(0, top + u * 0.05, s.cssW, s.cssH - top);
    if (pass === 1) ctx.rect(0, top + u * 0.035, s.cssW, u * 0.035);
    ctx.fill();
  }
}

/** Where the sky stops: below this the hills and meadow, or the cloud sea, cover everything. */
export function skyBottom(s: Scene, seaY: number): number {
  return landShows(s, seaY) ? s.horizonY : seaY + s.u * 0.06;
}

/** The land below shows only until the cloud sea covers it. */
function landShows(s: Scene, seaY: number): boolean {
  return seaY > s.horizonY + s.u * 0.02;
}

/** Everything on the horizon, back to front. */
export function farLayer(ctx: Ctx, s: Scene, tone: Tone, seaY: number): void {
  const hz = s.horizonY;
  if (hz - s.u * 0.3 < s.cssH) {
    if (landShows(s, seaY)) {
      const bottom = Math.min(s.cssH, seaY + s.u * 0.06);
      ctx.fillStyle = tone.far;
      hills(ctx, s, hz + s.u * 0.004, 0.085, 4.2, 9.5, 1.1, bottom);
      ctx.fillStyle = tone.meadowHaze;
      hills(ctx, s, hz + s.u * 0.012, 0.03, 6.5, 13, 3.4, bottom);
      meadow(ctx, s, tone, bottom);
      groves(ctx, s, tone);
      lowClouds(ctx, s, tone);
    }
  }
  if (seaY < s.cssH + s.u * 0.1) sea(ctx, s, tone, seaY);
}

