import { hash, type Ctx } from "../../base/draw";
import { layerGround } from "../../base/world";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { hillLine } from "./land";
import { blob, caps, paintBlob, poly, type Blob, type BlobInks, type Lobe } from "./paint";
import { moonAt, MOON_REACH, sunAt, sunHaloFoot, SUN_REACH } from "./sky";
import { LOOP, toneOf, type Tone } from "./tone";

// The summer clouds, painted soft and round like a postcard's: fair-weather cumulus built of
// round lobes, their tops lit warm and creamy, their flat undersides in a cool blue-grey shade,
// a lit cap on every lobe that makes their top; no lines. Two great banks stand on the hills at
// the sides: on the left a cumulus heaped up under the sun (never into it: it rises only as far
// as the sun's halo leaves room, wherever the sun is, and the moon's), on the right a summer cumulus
// towering over the town as high as the HUD leaves room. They build through the afternoon, glow
// gold and rose at sunset, settle to low banks by night under the show and take its light, and
// build again through the loop's dawn (tone.ts `towers`). Climb, and fair-weather clouds come
// down the right lane past you (the left lane is the sun's and the moon's: sky.ts). Everything
// breathes a little on the breeze, never into the tower's column.

/** The column the banks keep out of (u either side of the center). */
const COLUMN = 0.265;
/** How far the banks breathe on the breeze (u) and how slowly. */
const DRIFT = 0.005;

/**
 * A bank: its billows, top to bottom, each a set of lobes measured in from the screen's side
 * (u), up from the hill line (u, negative), and their radii (u). Each billow is painted with its
 * own shaded underside, and the one below it covers that underside but between its own lobes,
 * so the bank reads as heaped billows. Its inner reach (in + radius) stays within a phone's lane,
 * so on every screen it keeps out of the column; on a wider screen it keeps to the side and
 * leaves open sky by the column.
 */
interface Bank {
  billows: Blob[];
  /** Its design's height (u above the hill line) and how far in from the side it reaches (u). */
  height: number;
  reach: number;
}

function bank(billows: Lobe[][]): Bank {
  const blobs = billows.map((l) => blob(l, 0.56, 0.7, 36));
  return { billows: blobs, height: -Math.min(...blobs.map((b) => b.top)), reach: Math.max(...blobs.map((b) => b.right)) };
}

const LEFT = bank([
  [
    [0.0, -0.38, 0.034],
    [0.05, -0.405, 0.042],
    [0.1, -0.385, 0.03],
  ],
  [
    [-0.03, -0.29, 0.05],
    [0.04, -0.31, 0.058],
    [0.11, -0.29, 0.045],
    [0.155, -0.27, 0.028],
  ],
  [
    [-0.05, -0.19, 0.065],
    [0.05, -0.2, 0.068],
    [0.13, -0.18, 0.052],
    [0.18, -0.16, 0.03],
  ],
  [
    [-0.06, -0.075, 0.08],
    [0.05, -0.085, 0.078],
    [0.14, -0.065, 0.062],
    [0.195, -0.045, 0.03],
  ],
]);
const RIGHT = bank([
  [
    [0.02, -0.53, 0.036],
    [0.065, -0.55, 0.044],
    [0.11, -0.525, 0.03],
  ],
  [
    [-0.02, -0.43, 0.048],
    [0.05, -0.45, 0.056],
    [0.12, -0.43, 0.042],
  ],
  [
    [-0.04, -0.32, 0.058],
    [0.04, -0.34, 0.064],
    [0.12, -0.32, 0.05],
    [0.165, -0.3, 0.03],
  ],
  [
    [-0.05, -0.2, 0.068],
    [0.05, -0.215, 0.07],
    [0.14, -0.19, 0.055],
    [0.19, -0.17, 0.028],
  ],
  [
    [-0.06, -0.075, 0.08],
    [0.06, -0.09, 0.08],
    [0.15, -0.065, 0.062],
    [0.2, -0.045, 0.028],
  ],
]);

/** The highest a bank's design stands (u above the hill line). */
const LEFT_H = LEFT.height;
const RIGHT_H = RIGHT.height;
/** By night the banks settle to this share of their height. */
const NIGHT = 0.42;
/** The HUD's lowest line (a share of the screen's height plus u): the right bank never towers into it. */
const HUD_SHARE = 0.14;
const HUD_U = 0.19;
/** The room kept clear under the sun's halo and the moon's glow (u). */
const CLEAR = 0.02;

/** How tall a bank stands now, as a share of its design: it builds by day and settles by night, within the room above the hill line. */
export function bankScale(s: Scene, tone: Tone, side: -1 | 1, line = hillLine(s)): number {
  const u = s.u;
  const h = side < 0 ? LEFT_H : RIGHT_H;
  let ceiling = s.cssH * HUD_SHARE + u * HUD_U;
  if (side < 0) {
    // Under the sun wherever it is while it shows (it sets behind the hills, never into the bank), under the moon's glow while it shows.
    if (tone.sunSet < 1) {
      const sun = sunAt(s, tone);
      ceiling = Math.max(ceiling, sun.y + sun.r * SUN_REACH + CLEAR * u);
    }
    if (tone.moon > 0) {
      const m = moonAt(s);
      ceiling = Math.max(ceiling, m.y + m.r * MOON_REACH + CLEAR * u);
    }
  }
  const room = (line - ceiling) / (h * u);
  const want = NIGHT + (1 - NIGHT) * tone.towers;
  return Math.max(0, Math.min(want, room));
}

/** The highest a bank reaches now (u above the hill line): the fireworks keep above them. */
export function bankTop(s: Scene, tone: Tone, side: -1 | 1): number {
  return (side < 0 ? LEFT_H : RIGHT_H) * bankScale(s, tone, side);
}

/** Scratch inks for the hour. */
const INKS: BlobInks = { shade: "", body: "", light: "" };

function inksOf(tone: Tone): BlobInks {
  INKS.shade = tone.cloudShade;
  INKS.body = tone.cloud;
  INKS.light = tone.cloudLight;
  return INKS;
}

/** The banks of cloud on the hills (drawn behind the hills): the left under the sun, the right towering over the town. */
export function banks(ctx: Ctx, s: Scene, tone: Tone): void {
  const line = hillLine(s);
  const u = s.u;
  if (line - 0.1 * u > s.cssH) return;
  const drift = Math.sin(s.t * 0.11) * DRIFT * u;
  const inks = inksOf(tone);
  for (const side of [-1, 1] as const) {
    const k = bankScale(s, tone, side, line);
    if (k < 0.01) continue;
    const b = side < 0 ? LEFT : RIGHT;
    // Measured in from the side: on a phone the bank fills the lane; on a wider screen it keeps to the side.
    const near = s.cssW / 2 + side * (COLUMN + b.reach + DRIFT) * u;
    const x0 = side < 0 ? Math.min(drift, near) : Math.max(s.cssW + drift, near);
    const m = side < 0 ? 1 : -1;
    // All its billows' undersides in one fill, then all their lit bodies, then all their caps:
    // each billow's body covers the underside of the one above it, as painting them one by one would.
    ctx.fillStyle = inks.shade;
    ctx.beginPath();
    for (const billow of b.billows) poly(ctx, billow.outline, x0, line, u, m, u * k);
    ctx.fill();
    ctx.fillStyle = inks.body;
    ctx.beginPath();
    for (const billow of b.billows) poly(ctx, billow.body, x0, line, u, m, u * k);
    ctx.fill();
    ctx.fillStyle = inks.light;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const billow of b.billows) caps(ctx, billow, x0, line, u, m, u * k);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- clouds coming down the lane

/** Parallax depth of the lane's clouds (1 moves with the tower): further than the lane's things. */
export const CLOUD_P = 0.45;

/** Fair-weather clouds of a few shapes, their lobes in u about their middle; flat-bottomed. */
const PUFFS: Blob[] = [
  blob(
    [
      [-0.07, 0.01, 0.034],
      [-0.025, -0.016, 0.044],
      [0.03, -0.008, 0.04],
      [0.072, 0.012, 0.028],
      [0.0, 0.018, 0.034],
    ],
    0.58,
    0.8,
    40,
  ),
  blob(
    [
      [-0.06, 0.008, 0.03],
      [-0.016, -0.022, 0.04],
      [0.034, -0.01, 0.034],
      [0.066, 0.012, 0.024],
      [0.008, 0.016, 0.03],
    ],
    0.58,
    0.8,
    40,
  ),
  blob(
    [
      [-0.08, 0.012, 0.028],
      [-0.04, -0.01, 0.038],
      [0.006, -0.03, 0.046],
      [0.05, -0.006, 0.036],
      [0.084, 0.014, 0.024],
      [0.0, 0.018, 0.034],
    ],
    0.58,
    0.8,
    40,
  ),
];

/** The lane's clouds: height (world units, at CLOUD_P), X (u from center), shape, size. */
const LANE: readonly (readonly [at: number, X: number, shape: number, size: number])[] = [
  [150, 0.4, 0, 0.9],
  [330, 0.385, 2, 1.0],
  [480, 0.39, 1, 1.05],
  [640, 0.385, 2, 1.0],
  [800, 0.39, 0, 1.05],
  [950, 0.385, 1, 1.0],
];
/** A turn of the loop, in the clouds' heights: every turn brings them round again, a loop higher. */
const PERIOD = LOOP * BLOCK_HEIGHT;
/** How far a lane cloud drifts on the breeze (u). */
const SWAY = 0.006;

/** Calls `each` for every lane cloud on screen: its middle (px), its shape and size (px to the unit). */
export function eachCloud(s: Scene, each: (x: number, y: number, c: Blob, k: number) => void): void {
  const u = s.u;
  const base = layerGround(s, CLOUD_P);
  const unit = s.scale * CLOUD_P;
  const lo = (base - s.cssH - u * 0.2) / unit;
  const hi = (base + u * 0.2) / unit;
  for (let n = Math.max(0, Math.floor((lo - 1000) / PERIOD)); n * PERIOD <= hi; n++) {
    for (let i = 0; i < LANE.length; i++) {
      const [at0, X, sh, size] = LANE[i]!;
      const at = at0 + n * PERIOD;
      if (at < lo || at > hi) continue;
      const drift = Math.sin(s.t * 0.09 + hash(i + 7300) * 6) * SWAY;
      // Out in the lane on a phone; on a wider screen, its middle stays as far in from the side.
      const x = Math.max(s.cssW / 2 + (X + drift) * u, s.cssW - (0.5 - X - drift) * u);
      each(x, base - at * unit, PUFFS[sh]!, u * size);
    }
  }
}

/**
 * Over the square two fair-weather clouds hang in the left lane too, below the sun: placed from
 * the start's own layout (u below the foot of the sun's halo: the gap, X, shape, size), they only
 * ever move down as you climb, so neither ever passes the sun, and they are long gone below the
 * town before the moon comes out. They come only on the first day (the loop's left lane is the
 * sun's and the moon's alone).
 */
/** The start's left-lane clouds come down nearly with the lane (1 moves with the tower): gone behind the town before the sun sets. */
const START_P = 1;
const START_LEFT: readonly (readonly [gap: number, X: number, shape: number, size: number])[] = [[0.2, -0.36, 1, 0.8]];

/** Calls `each` for the start's left-lane clouds that are on screen. */
export function eachStartCloud(s: Scene, each: (x: number, y: number, c: Blob, k: number) => void): void {
  const u = s.u;
  const foot = sunHaloFoot(s);
  for (let i = 0; i < START_LEFT.length; i++) {
    const [gap, X, sh, size] = START_LEFT[i]!;
    const c = PUFFS[sh]!;
    // Always below the sun, even as it sets (on a zoomed-out screen the camera holds and the sun can catch up).
    const sun = sunAt(s, toneOf(s));
    const y = Math.max(foot + (gap - c.top * size) * u + s.rise * START_P, sun.y + sun.r * SUN_REACH + (gap - c.top * size) * u);
    if (y + c.top * size * u > s.cssH) continue;
    const drift = Math.sin(s.t * 0.08 + i * 2.4) * SWAY;
    const x = Math.min(s.cssW / 2 + (X + drift) * u, (0.5 + X + drift) * u);
    each(x, y, c, u * size);
  }
}

/** The clouds coming down the right lane, and the start's two in the left. */
export function laneClouds(ctx: Ctx, s: Scene, tone: Tone): void {
  const inks = inksOf(tone);
  eachCloud(s, (x, y, c, k) => paintBlob(ctx, c, x, y, k, inks));
  eachStartCloud(s, (x, y, c, k) => paintBlob(ctx, c, x, y, k, inks));
}
