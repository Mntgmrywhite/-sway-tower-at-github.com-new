import { alpha, circle, hash, ink, mix, type Ctx } from "../../base/draw";
import { fieldY } from "../../base/world";
import type { Scene } from "../skin";
import {
  EARTH_DARK,
  EARTH_LIGHT,
  EARTH_LIT,
  EARTH_SEAM,
  FALL,
  FALL_SHADE,
  FOAM,
  GRASS,
  GRASS_LIGHT,
  HAZE,
  INK,
  inkW,
  PALETTE,
  RIPPLE,
  SHORE,
  spot,
  WATER,
  WATER_FAR,
  WATER_NEAR,
} from "./colors";
import { fox } from "./animals";
import { palm, sunflower } from "./plants";
import type { EarthTones } from "./terrain";

// The heart of the valley: a deep-blue lake, glittering with sun stripes and sparkles, fed by
// waterfalls that pour off two grassy mesas on its far shore. The mesas are our checker-banded
// earth under a scalloped grass cap, a palm on each; white water tumbles down their faces into
// churning foam. All placed on the ground plane (X sideways in u at the tower's depth, z depth).

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the lake

/** Lake center and half extents on the ground plane; a rounded, squarish (superelliptic) shape. */
export const LAKE_X = -0.04;
export const LAKE_Z = 4.32;
export const LAKE_A = 1.35;
export const LAKE_B = 1.0;
const SQUARE = 3;
const LAKE_STEPS = 48;

/** Shoreline radius factor at angle a: a lumpy superellipse. */
function shore(a: number): number {
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const r = Math.pow(Math.pow(c, SQUARE) + Math.pow(s, SQUARE), -1 / SQUARE);
  return r * (1 + 0.05 * Math.sin(3 * a + 0.6) + 0.035 * Math.sin(5 * a + 2.2) + 0.02 * Math.sin(8 * a + 1.1));
}

/** Lake shoreline in ground coordinates, precomputed: [X, z] pairs. */
const SHORE_PTS = Array.from({ length: LAKE_STEPS }, (_, i) => {
  const a = (i / LAKE_STEPS) * TAU;
  const r = shore(a);
  return [LAKE_X + Math.cos(a) * LAKE_A * r, LAKE_Z + Math.sin(a) * LAKE_B * r] as const;
});

/** 0 at the lake's center, 1 on its shore (roughly), more outside. */
export function inLake(X: number, z: number): number {
  const dx = (X - LAKE_X) / LAKE_A;
  const dz = (z - LAKE_Z) / LAKE_B;
  return Math.sqrt(dx * dx + dz * dz) / shore(Math.atan2(dz, dx));
}

function lakePath(ctx: Ctx, s: Scene, grow: number): void {
  ctx.beginPath();
  for (let i = 0; i < SHORE_PTS.length; i++) {
    const [X, z] = SHORE_PTS[i]!;
    const p = spot(s, LAKE_X + (X - LAKE_X) * grow, LAKE_Z + (z - LAKE_Z) * grow);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/** Ripple dashes: [X, z, length, phase] spread over the lake. */
const RIPPLES = Array.from({ length: 22 }, (_, i) => {
  const a = hash(i + 700) * TAU;
  const r = Math.sqrt(hash(i + 710)) * 0.8;
  return [LAKE_X + Math.cos(a) * LAKE_A * r, LAKE_Z + Math.sin(a) * LAKE_B * r, 0.035 + hash(i + 720) * 0.05, hash(i + 730) * TAU] as const;
});

const SPARKLES = Array.from({ length: 10 }, (_, i) => {
  const a = hash(i + 800) * TAU;
  const r = Math.sqrt(hash(i + 810)) * 0.75;
  return [LAKE_X + Math.cos(a) * LAKE_A * r, LAKE_Z + Math.sin(a) * LAKE_B * r, hash(i + 820) * TAU] as const;
});

/** Sun stripes: long, thin light bands across the water at these depths, [z, phase]. */
const STRIPES = [
  [5.05, 0.3],
  [4.6, 2.1],
  [4.15, 4.2],
  [3.75, 1.2],
  [3.45, 3.3],
] as const;

const REFLECT = alpha("#1a7a5a", 0.28);
const STRIPE = alpha("#ffffff", 0.45);
const RIPPLE_INK = alpha(RIPPLE, 0.7);
const WATER_MID = mix(WATER, WATER_FAR, 0.3);
const SHORE_INK = alpha(INK, 0.6);

export function lake(ctx: Ctx, s: Scene): void {
  const far = fieldY(s, LAKE_Z + LAKE_B * 1.15);
  const near = fieldY(s, LAKE_Z - LAKE_B * 1.15);
  if (far > s.cssH || near < s.horizonY) return;
  const k = spot(s, LAKE_X, LAKE_Z).k;
  const lw = inkW(s, k) * 0.8;

  // A sandy beach all around, then the water.
  lakePath(ctx, s, 1.06);
  ctx.fillStyle = SHORE;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  lakePath(ctx, s, 1);
  ctx.fillStyle = WATER;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Flat bands of water, light toward the far shore and deep toward us.
  const band0 = fieldY(s, LAKE_Z + LAKE_B * 0.45);
  const band1 = fieldY(s, LAKE_Z - LAKE_B * 0.45);
  ctx.fillStyle = WATER_FAR;
  ctx.fillRect(0, far, s.cssW, band0 - far);
  ctx.fillStyle = WATER_MID;
  ctx.fillRect(0, band0, s.cssW, (band1 - band0) * 0.5);
  ctx.fillStyle = WATER_NEAR;
  ctx.fillRect(0, band1, s.cssW, near - band1);
  // The far shore's cliffs and trees, reflected as a dark wavy band just inside it.
  const top = fieldY(s, LAKE_Z + LAKE_B * 1.12);
  const band = (near - far) * 0.18;
  ctx.beginPath();
  ctx.moveTo(0, top - 2);
  for (let x = 0; x <= s.cssW + 8; x += s.u * 0.03) {
    ctx.lineTo(x, top + band + Math.sin(x * 0.09 + s.t * 1.2) * band * 0.18);
  }
  ctx.lineTo(s.cssW + 8, top - 2);
  ctx.closePath();
  ctx.fillStyle = REFLECT;
  ctx.fill();

  // Sun stripes: thin light bands, broken and breathing.
  ctx.beginPath();
  for (const [z, ph] of STRIPES) {
    const y = fieldY(s, z);
    const h = Math.max(1, s.u * 0.006 * (3 / z));
    for (let i = 0; i < 5; i++) {
      const f = hash(i * 13 + z * 7);
      const len = s.cssW * (0.08 + 0.12 * f) * (0.75 + 0.25 * Math.sin(s.t * 0.9 + ph + i));
      const x = ((f * 1.7 + i * 0.21) % 1) * s.cssW + Math.sin(s.t * 0.3 + ph + i) * s.u * 0.02;
      ctx.rect(x - len / 2, y - h / 2, len, h);
    }
  }
  ctx.fillStyle = STRIPE;
  ctx.fill();

  // Ripples: short white dashes drifting and breathing.
  ctx.beginPath();
  for (const [X, z, len, ph] of RIPPLES) {
    const a = Math.sin(s.t * 0.9 + ph);
    if (a < -0.2) continue;
    const p = spot(s, X + Math.sin(s.t * 0.25 + ph) * 0.03, z);
    const w = len * s.u * p.k * (0.6 + 0.4 * a);
    ctx.moveTo(p.x - w, p.y);
    ctx.quadraticCurveTo(p.x, p.y - s.u * 0.004 * p.k, p.x + w, p.y);
  }
  ctx.strokeStyle = RIPPLE_INK;
  ctx.lineWidth = Math.max(1, s.u * 0.0035 * k);
  ctx.lineCap = "round";
  ctx.stroke();

  // Sparkles: little four-point glints winking on and off.
  ctx.beginPath();
  for (const [X, z, ph] of SPARKLES) {
    const tw = Math.sin(s.t * 2.1 + ph);
    if (tw < 0.3) continue;
    const p = spot(s, X, z);
    sparkle(ctx, p.x, p.y, s.u * 0.014 * p.k * tw);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  lakePath(ctx, s, 1);
  ink(ctx, lw * 0.7, SHORE_INK);
}

function sparkle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

// ---------------------------------------------------------------- bluffs and waterfalls

/** What stands on a bluff's top: a palm, a giant sunflower, or the fox. */
const PALM_TOP = 0;
const SUNFLOWER_TOP = 1;
const FOX_TOP = 2;

interface Mesa {
  /** Ground X range; the end nearer the center is the rounded inner shoulder. */
  x0: number;
  x1: number;
  z: number;
  /** Cliff height, u at the tower's depth. */
  h: number;
  /** Waterfalls: [X, width (u at the tower's depth)]. */
  falls: readonly (readonly [number, number])[];
  /** On top, drawn in order: [X, kind, size (u at the tower's depth), lean or phase]. */
  tops: readonly (readonly [number, number, number, number])[];
}

/** Two bluffs framing the lake, back to front. Everything on them stays clear of the tower's column. */
export const MESAS: readonly Mesa[] = [
  {
    x0: 0.46,
    x1: 3.6,
    z: 5.0,
    h: 0.3,
    falls: [[0.67, 0.095]],
    tops: [
      [0.515, PALM_TOP, 0.062, 0.3],
      [0.77, SUNFLOWER_TOP, 0.2, 1.3],
      [0.6, FOX_TOP, 0.055, 0],
    ],
  },
  {
    x0: -3.6,
    x1: -0.42,
    z: 4.7,
    h: 0.38,
    falls: [[-0.585, 0.105]],
    tops: [
      [-0.47, PALM_TOP, 0.066, -0.3],
      [-0.715, SUNFLOWER_TOP, 0.22, 0.2],
    ],
  },
];
/** Radius of the rounded corner at a bluff's inner end, ground units. */
const SHOULDER = 0.05;
/** Sample spacing along a bluff, ground units. */
const STEP = 0.04;

const MESA_EARTH: EarthTones = {
  dark: mix(EARTH_DARK, PALETTE.skyBottom, 0.08),
  light: mix(EARTH_LIGHT, PALETTE.skyBottom, 0.08),
  lit: mix(EARTH_LIT, PALETTE.skyBottom, 0.06),
  seam: mix(EARTH_SEAM, PALETTE.skyBottom, 0.08),
};
const MESA_GRASS = mix(GRASS, HAZE, 0.05);
const MESA_GRASS_LIGHT = mix(GRASS_LIGHT, HAZE, 0.05);
const STREAK = alpha("#ffffff", 0.9);
const FACE_SHADE = alpha("#5a2a14", 0.18);

/** Height (u at the tower's depth) of a bluff's top at X: gently rolling, a rounded corner at the inner end. */
export function mesaTop(m: Mesa, X: number): number {
  const inner = Math.max(0, m.x1 < 0 ? m.x1 - X : X - m.x0);
  const roll = m.h * (1 + 0.05 * Math.sin(X * 7.1 + m.z) + 0.03 * Math.sin(X * 15.3));
  if (inner >= SHOULDER) return roll;
  const d = SHOULDER - inner;
  return roll - SHOULDER + Math.sqrt(SHOULDER * SHOULDER - d * d);
}

/** Visible X range of a bluff at depth z (ground units), written to RANGE; false when off screen. */
const RANGE = { a: 0, b: 0 };
function visible(s: Scene, m: Mesa, k: number): boolean {
  const half = s.cssW / 2 / (s.u * k) + STEP * 2;
  RANGE.a = Math.max(m.x0, -half);
  RANGE.b = Math.min(m.x1, half);
  return RANGE.a < RANGE.b;
}

/** The bluff's face outline: along the top from left to right, then down and back along the base. */
function facePath(ctx: Ctx, s: Scene, m: Mesa, a: number, b: number, k: number, base: number): void {
  const cx = s.cssW / 2;
  const uk = s.u * k;
  ctx.beginPath();
  ctx.moveTo(cx + a * uk, base);
  for (let X = a; ; X += STEP) {
    const x = Math.min(X, b);
    ctx.lineTo(cx + x * uk, base - mesaTop(m, x) * uk);
    if (x >= b) break;
  }
  ctx.lineTo(cx + b * uk, base);
  ctx.closePath();
}

/** The grass cap following the bluff's top: tufted above, scalloped below. */
function capPath(ctx: Ctx, s: Scene, m: Mesa, a: number, b: number, k: number, base: number, gh: number): void {
  const cx = s.cssW / 2;
  const uk = s.u * k;
  const tuft = gh * 0.3;
  ctx.beginPath();
  let px = cx + a * uk;
  let py = base - mesaTop(m, a) * uk;
  ctx.moveTo(px, py);
  for (let X = a + STEP; ; X += STEP) {
    const x = Math.min(X, b);
    const nx = cx + x * uk;
    const ny = base - mesaTop(m, x) * uk;
    ctx.quadraticCurveTo((px + nx) / 2, (py + ny) / 2 - tuft, nx, ny);
    px = nx;
    py = ny;
    if (x >= b) break;
  }
  // Back along the underside in scallops, hugging the top.
  for (let X = b; ; X -= STEP) {
    const x = Math.max(X, a);
    const nx = cx + x * uk;
    const ny = base - mesaTop(m, x) * uk + Math.min(gh, mesaTop(m, x) * uk * 0.6);
    if (X === b) ctx.lineTo(nx, ny);
    else ctx.quadraticCurveTo((px + nx) / 2, (py + ny) / 2 + gh * 0.55, nx, ny);
    px = nx;
    py = ny;
    if (x <= a) break;
  }
  ctx.closePath();
}

/** Tiny blooms scattered along each bluff's grass cap. */
const CAP_BLOOMS = 12;

/** Rows per stratum on a bluff's face. */
const STRATUM = 2;

/**
 * The checker on a bluff's face without a clip: cells stack up from the base, column by column,
 * each column stopping at the lower end of the face's top across it (the grass cap hides the
 * small gap left under the curve). Light cells, their lit tops, then the stratum seams.
 */
function faceChecker(ctx: Ctx, s: Scene, m: Mesa, a: number, b: number, uk: number, base: number): void {
  const cx = s.cssW / 2;
  const c = uk * 0.05;
  const x0 = cx + a * uk;
  const x1 = cx + b * uk;
  const i0 = Math.floor((x0 - cx) / c);
  const i1 = Math.ceil((x1 - cx) / c);
  const lit = Math.max(1, c * 0.14);
  const sh = Math.max(1, c * 0.12);
  // The lowest point of the face's top (largest y): seams stay under it.
  let low = -Infinity;
  for (let X = a; ; X += STEP) {
    const x = Math.min(X, b);
    low = Math.max(low, base - mesaTop(m, x) * uk);
    if (x >= b) break;
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = i0; i < i1; i++) {
      const l = Math.max(x0, cx + i * c);
      const r = Math.min(x1, cx + (i + 1) * c);
      if (r <= l) continue;
      const top = base - Math.min(mesaTop(m, (l - cx) / uk), mesaTop(m, (r - cx) / uk)) * uk;
      for (let row = 0; base - row * c > top; row++) {
        const yb = base - row * c;
        const yt = yb - c;
        if (((i + row) & 1) !== 0) continue;
        if (pass === 0) ctx.rect(l, Math.max(top, yt), r - l, yb - Math.max(top, yt));
        else if (yt >= top) ctx.rect(l, yt, r - l, lit);
      }
    }
    ctx.fillStyle = pass === 0 ? MESA_EARTH.light : MESA_EARTH.lit;
    ctx.fill();
  }
  // Stratum seams: one strip across the whole face, wherever every column reaches above it.
  ctx.beginPath();
  for (let row = STRATUM; base - row * c - sh > low; row += STRATUM) ctx.rect(x0, base - row * c - sh / 2, x1 - x0, sh);
  ctx.fillStyle = MESA_EARTH.seam;
  ctx.fill();
}

function mesa(ctx: Ctx, s: Scene, m: Mesa): void {
  const p = spot(s, 0, m.z);
  const k = p.k;
  const base = p.y;
  if (base - m.h * s.u * k * 2 > s.cssH) return;
  if (!visible(s, m, k)) return;
  const a = RANGE.a;
  const b = RANGE.b;
  const uk = s.u * k;
  const cx = s.cssW / 2;
  const lw = inkW(s, k);
  const gh = uk * 0.036;

  // Palms behind the grass cap, their feet tucked into it.
  for (const [X, kind, size, lean] of m.tops) {
    if (kind !== PALM_TOP) continue;
    palm(ctx, cx + X * uk, base - mesaTop(m, X) * uk + gh * 0.5, s.u * size * k, lean, s.t, lw);
  }

  // Earth face: the dark tone over the whole outline, then the checker column by column.
  facePath(ctx, s, m, a, b, k, base);
  ctx.fillStyle = MESA_EARTH.dark;
  ctx.fill();
  faceChecker(ctx, s, m, a, b, uk, base);
  const inner = cx + (m.x1 < 0 ? m.x1 : m.x0) * uk;
  const shadeW = uk * 0.06;
  const shadeTop = base - (m.h - SHOULDER) * uk;
  ctx.fillStyle = FACE_SHADE;
  ctx.fillRect(m.x1 < 0 ? inner - shadeW : inner, shadeTop, shadeW, base - shadeTop);
  facePath(ctx, s, m, a, b, k, base);
  ink(ctx, lw, INK);

  // Grass cap
  capPath(ctx, s, m, a, b, k, base, gh);
  ctx.fillStyle = MESA_GRASS;
  ctx.fill();
  ink(ctx, lw, INK);
  ctx.beginPath();
  for (let X = a + STEP * 0.5; X < b; X += STEP * 2) {
    const x = cx + X * uk;
    const y = base - mesaTop(m, X) * uk;
    ctx.moveTo(x - uk * 0.03, y + gh * 0.12);
    ctx.quadraticCurveTo(x, y - gh * 0.3, x + uk * 0.03, y + gh * 0.12);
    ctx.closePath();
  }
  ctx.fillStyle = MESA_GRASS_LIGHT;
  ctx.fill();
  // A scatter of tiny blooms along the cap, two colors.
  for (let c = 0; c < 2; c++) {
    ctx.beginPath();
    for (let j = c; j < CAP_BLOOMS; j += 2) {
      const X = a + (b - a) * hash(j * 7 + (m.x0 > 0 ? 40 : 0));
      const y = base - mesaTop(m, X) * uk + gh * (0.25 + 0.4 * hash(j * 3 + 11));
      circle(ctx, cx + X * uk, y, Math.max(1, uk * 0.008));
    }
    ctx.fillStyle = c === 0 ? "#ff6fae" : "#b46cff";
    ctx.fill();
  }

  for (let i = 0; i < m.falls.length; i++) {
    const [X, w] = m.falls[i]!;
    fall(ctx, s, m, X, w * uk, k, base, lw, gh, i);
  }

  // Sunflowers and the fox in front of the cap.
  for (const [X, kind, size, ph] of m.tops) {
    if (kind === PALM_TOP) continue;
    const x = cx + X * uk;
    const y = base - mesaTop(m, X) * uk + gh * 0.45;
    if (kind === SUNFLOWER_TOP) sunflower(ctx, x, y, s.u * size * k, s.t, ph, lw);
    else fox(ctx, s, x, y, s.u * size * k, lw);
  }
}

/** Lanes of bright streaks down a fall, as fractions of its width. */
const LANES = [0.22, 0.5, 0.76] as const;

/** One waterfall off the mesa's lip at X, into churning foam on the lake. */
function fall(ctx: Ctx, s: Scene, m: Mesa, X: number, w: number, k: number, base: number, lw: number, gh: number, i: number): void {
  const uk = s.u * k;
  const x = s.cssW / 2 + X * uk;
  const top = base - mesaTop(m, X) * uk + gh * 0.15;
  const bot = base + uk * 0.008;
  if (x + w < 0 || x - w > s.cssW) return;
  // Body, flaring a little as it falls.
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top);
  ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w * 0.6, bot);
  ctx.lineTo(x - w * 0.6, bot);
  ctx.closePath();
  ctx.fillStyle = FALL;
  ctx.fill();
  ink(ctx, lw, INK);
  // Shaded right edge.
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, top);
  ctx.lineTo(x + w / 2, top);
  ctx.lineTo(x + w * 0.6, bot);
  ctx.lineTo(x + w * 0.3, bot);
  ctx.closePath();
  ctx.fillStyle = FALL_SHADE;
  ctx.fill();
  // Streaks rushing down.
  const period = uk * 0.05;
  const dash = period * 0.55;
  const scroll = (s.t * uk * 0.32 + i * period * 0.37) % period;
  ctx.beginPath();
  for (let j = 0; j < LANES.length; j++) {
    const lx = x - w / 2 + LANES[j]! * w;
    const off = scroll + (j * period) / 3;
    for (let y = top - period + (off % period); y < bot; y += period) {
      const y0 = Math.max(top + 1, y);
      const y1 = Math.min(bot - 1, y + dash);
      if (y1 <= y0) continue;
      const f = (y0 - top) / (bot - top);
      ctx.moveTo(lx + (LANES[j]! - 0.5) * w * 0.2 * f, y0);
      ctx.lineTo(lx + (LANES[j]! - 0.5) * w * 0.2 * ((y1 - top) / (bot - top)), y1);
    }
  }
  ctx.strokeStyle = STREAK;
  ctx.lineWidth = Math.max(1, w * 0.13);
  ctx.lineCap = "round";
  ctx.stroke();
  // The lip where it pours over the edge.
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, top + gh * 0.15);
  ctx.quadraticCurveTo(x, top - gh * 0.55, x + w * 0.55, top + gh * 0.15);
  ctx.quadraticCurveTo(x, top + gh * 0.3, x - w * 0.55, top + gh * 0.15);
  ctx.closePath();
  ctx.fillStyle = FOAM;
  ctx.fill();
  ink(ctx, lw * 0.8, INK);
  // Foam churning at the foot, and a few droplets leaping out of it.
  ctx.beginPath();
  for (let f = 0; f < 5; f++) {
    const a = s.t * 5 + f * 1.9 + i * 2;
    const fx = x + (f - 2) * w * 0.32;
    const fy = bot - w * 0.05 + Math.sin(a) * w * 0.06;
    circle(ctx, fx, fy, w * (0.26 + 0.06 * Math.sin(a * 0.7 + f) + (f === 2 ? 0.08 : 0)));
  }
  ink(ctx, lw * 1.6, INK);
  ctx.fillStyle = FOAM;
  ctx.fill();
  ctx.beginPath();
  for (let d = 0; d < 4; d++) {
    const ph = (s.t * 1.3 + d * 0.27 + i * 0.5) % 1;
    const side = d % 2 ? 1 : -1;
    const dx = x + side * w * (0.45 + ph * 0.5);
    const dy = bot - w * 0.25 - Math.sin(ph * Math.PI) * w * 0.55;
    circle(ctx, dx, dy, Math.max(0.7, w * 0.07 * (1 - ph * 0.5)));
  }
  ctx.fillStyle = FOAM;
  ctx.fill();
}

export function mesas(ctx: Ctx, s: Scene): void {
  for (const m of MESAS) mesa(ctx, s, m);
}

/** True when ground point (X, z) is just behind a bluff or in front of its face (trees there would hide or be hidden). */
export function beforeMesa(X: number, z: number): boolean {
  for (const m of MESAS) {
    if (z < m.z + 0.8 && z > m.z - 1.6 && X > m.x0 - 0.12 && X < m.x1 + 0.12) return true;
  }
  return false;
}

/**
 * True when something standing at depth z, centered at screen x with half width `half` px and
 * its top at screen y `top`, should not be drawn because a bluff stands in front of it: either
 * it is entirely hidden, or it would peek out from behind the bluff's inner edge half cut.
 */
export function behindMesa(s: Scene, x: number, z: number, top: number, half: number): boolean {
  for (const m of MESAS) {
    if (z <= m.z) continue;
    const uk = (s.u * 3) / m.z;
    const a = (x - half - s.cssW / 2) / uk;
    const b = (x + half - s.cssW / 2) / uk;
    const inner = m.x1 < 0 ? m.x1 : m.x0;
    if (a < inner && b > inner) return true;
    if (a < m.x0 || b > m.x1) continue;
    if (top >= fieldY(s, m.z) - Math.min(mesaTop(m, a), mesaTop(m, b)) * uk) return true;
  }
  return false;
}
