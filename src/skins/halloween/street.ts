import { alpha, circle, hash, mix, oval, type Ctx } from "../../base/draw";
import { fieldY, TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import {
  BONE,
  COBBLE,
  COBBLE_LIGHT,
  COBBLE_SHADE,
  GRASS,
  GRASS_LIGHT,
  IRON,
  LAMP,
  MOSSGREY,
  PLUM,
  POOL,
  POOL_CORE,
  SLATE,
  smooth,
  TEALGREY,
} from "./common";
import { streetShows } from "./lines";
import { level, type Tone } from "./tone";

// Main Street, running away from the square behind the tower toward the hollow, in one-point
// perspective: its cobbles converge on the vanishing point on the horizon, gas lamps stand along
// it shrinking into the distance, and its two walls of crooked shopfronts recede from the corner
// buildings on the square (shops.ts) and are lost in the fog long before its far end, where the
// covered bridge waits. All of the street beyond the square lies behind the tower, so it is kept
// quiet: flat fills fading into the fog with distance, dim windows, no outlines. In front of the
// square a kerb of black-and-white striped stones, and the churchyard's grass.
//
// Positions: X in units at the tower's depth (TOWER_DEPTH) from the center line, z depth on the
// field, heights in the same units (a thing h tall at depth z is h * u * 3 / z px tall).

/** The corner buildings' fronts face the square at this depth; the walls run back from there. */
export const CORNER_Z = 3.95;
/** The street's walls stand this far either side of the center line (units): just outside the tower's column at the corner. */
export const STREET_X = (0.256 * CORNER_Z) / TOWER_DEPTH;
/** The kerb between the square and the churchyard, and its height (u). */
export const KERB_Z = 2.42;
const KERB_H = 0.014;
/** The street runs back this far; past it the fog has it all. */
const FAR_Z = 30;
/** The walls fade out as the camera rises from the start view by this much (u). */
const WALLS_FADE = [0.03, 0.16] as const;

/** Screen x of X units off center at depth z, and the px per unit there. */
function sx(s: Scene, X: number, z: number): number {
  return s.cssW / 2 + (X * s.u * TOWER_DEPTH) / z;
}
function unit(s: Scene, z: number): number {
  return (s.u * TOWER_DEPTH) / z;
}

/** How far a thing at depth z is lost in the fog (0 clear .. FOG_MAX). */
const FOG_MAX = 0.78;
export function fogAt(z: number): number {
  return FOG_MAX * smooth(CORNER_Z, 30, z) ** 0.8;
}

// ---------------------------------------------------------------- the walls

interface Facade {
  z0: number;
  z1: number;
  /** Heights at the near and far end (crooked), units. */
  h0: number;
  h1: number;
  /** 0 flat parapet, 1 gable end, 2 mansard. */
  roof: number;
  color: number;
  /** A chimney (0 none), and how many window rows. */
  chimney: number;
  rows: number;
}

const WALL_COLORS = [SLATE, PLUM, TEALGREY, MOSSGREY] as const;

/** Each side's facades, near to far: lengths and heights hashed once. */
const WALLS: Facade[][] = [-1, 1].map((side) => {
  const out: Facade[] = [];
  let z = CORNER_Z;
  for (let i = 0; z < FAR_Z; i++) {
    const k = i * 13 + (side > 0 ? 500 : 0);
    const len = (0.5 + hash(k + 5000) * 0.6) * (1 + (z - CORNER_Z) * 0.06);
    // No higher than the corner shops' walls near the square, so nothing peeks over their roofs.
    const h = i === 0 ? 0.27 : 0.22 + hash(k + 5001) * 0.1;
    out.push({
      z0: z,
      z1: z + len,
      h0: h,
      h1: h + (hash(k + 5002) - 0.5) * 0.06,
      roof: i === 0 ? 1 : Math.floor(hash(k + 5003) * 3),
      color: Math.floor(hash(k + 5004) * WALL_COLORS.length),
      chimney: i > 0 && hash(k + 5005) < 0.5 ? 0.3 + hash(k + 5006) * 0.4 : 0,
      rows: 2,
    });
    z += len;
  }
  return out;
});

/** The colors of one wall's facades this frame: each base color fogged by depth, in a few steps. */
const FOG_STEPS = 8;
function wallColor(color: number, z: number, tone: Tone, cache: string[]): string {
  const step = Math.min(FOG_STEPS - 1, Math.round((fogAt(z) / FOG_MAX) * (FOG_STEPS - 1)));
  const key = color * FOG_STEPS + step;
  let c = cache[key];
  if (!c) {
    c = mix(mix(WALL_COLORS[color]!, "#0e0a16", 0.35), tone.fog, (step / (FOG_STEPS - 1)) * FOG_MAX);
    cache[key] = c;
  }
  return c;
}
const CACHE: string[] = [];
let cacheTone: Tone | null = null;

/** One side's wall (side -1 left, 1 right), far to near so the nearer facades overlap the farther. */
function wall(ctx: Ctx, s: Scene, tone: Tone, side: -1 | 1, k: number): void {
  const list = WALLS[side < 0 ? 0 : 1]!;
  const X = STREET_X * side;
  // Facades of one color in a row share a fill (they hardly overlap, so the order barely matters).
  let color = "";
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]!;
    const xa = sx(s, X, f.z0);
    const xb = sx(s, X, f.z1);
    const ya = fieldY(s, f.z0);
    const yb = fieldY(s, f.z1);
    const ua = unit(s, f.z0);
    const ub = unit(s, f.z1);
    if (ya - f.h0 * k * ua > s.cssH) continue;
    const c = wallColor(f.color, (f.z0 + f.z1) / 2, tone, CACHE);
    if (c !== color) {
      if (color) ctx.fill();
      color = c;
      ctx.fillStyle = c;
      ctx.beginPath();
    }
    const ta = ya - f.h0 * k * ua;
    const tb = yb - f.h1 * k * ub;
    ctx.moveTo(xa, ya + 1);
    ctx.lineTo(xa, ta);
    if (f.roof === 1) {
      // A gable end facing the street: the roof's peak halfway along.
      const zm = (f.z0 + f.z1) / 2;
      const hm = ((f.h0 + f.h1) / 2 + 0.12) * k;
      ctx.lineTo(sx(s, X, zm), fieldY(s, zm) - hm * unit(s, zm));
    } else if (f.roof === 2) {
      // A mansard: its slope rises inward, seen edge-on as a stepped top.
      ctx.lineTo(sx(s, X * 0.9, f.z0), ta - 0.08 * k * ua);
      ctx.lineTo(sx(s, X * 0.9, f.z1), tb - 0.08 * k * ub);
    }
    ctx.lineTo(xb, tb);
    ctx.lineTo(xb, yb + 1);
    ctx.closePath();
    if (f.chimney) {
      const zc = f.z0 + (f.z1 - f.z0) * f.chimney;
      const uc = unit(s, zc);
      const xc = sx(s, X, zc);
      const yc = fieldY(s, zc) - (f.h0 + 0.12) * k * uc;
      ctx.rect(xc - 0.02 * uc, yc - 0.12 * k * uc, 0.04 * uc, 0.14 * k * uc);
    }
  }
  if (color) ctx.fill();
}

/** The windows along both walls, dim through the fog: rows of lit panes in perspective. */
function wallWindows(ctx: Ctx, s: Scene, k: number): void {
  for (const side of [-1, 1] as const) {
    const list = WALLS[side < 0 ? 0 : 1]!;
    const X = STREET_X * side;
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < list.length; i++) {
        const f = list[i]!;
        const lit = 1 - fogAt(f.z0) / FOG_MAX;
        if ((pass === 0) !== lit > 0.45 || f.z0 > 24) continue;
        const n = Math.max(1, Math.round((f.z1 - f.z0) / 0.4));
        for (let r = 0; r < f.rows; r++) {
          const h0 = (0.06 + r * 0.1) * k;
          for (let c = 0; c < n; c++) {
            if (hash(i * 31 + r * 7 + c + side * 1000) < 0.3) continue;
            const za = f.z0 + ((c + 0.3) / n) * (f.z1 - f.z0);
            const zb = f.z0 + ((c + 0.7) / n) * (f.z1 - f.z0);
            const ua = unit(s, za);
            const ub = unit(s, zb);
            const xa = sx(s, X, za);
            const xb = sx(s, X, zb);
            const ya = fieldY(s, za);
            const yb = fieldY(s, zb);
            ctx.moveTo(xa, ya - h0 * ua);
            ctx.lineTo(xb, yb - h0 * ub);
            ctx.lineTo(xb, yb - (h0 + 0.055 * k) * ub);
            ctx.lineTo(xa, ya - (h0 + 0.055 * k) * ua);
            ctx.closePath();
            any = true;
          }
        }
      }
      if (!any) continue;
      ctx.fillStyle = pass === 0 ? alpha(LAMP, 0.32) : alpha(LAMP, 0.75);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- the lamps

/** Gas lamps along both sides of the street: depths, and how far in from the walls they stand. */
const LAMP_Z = [5.2, 7.2, 10.2, 14.4, 20.5] as const;
const LAMP_X = STREET_X - 0.07;
const LAMP_H = 0.34;

/** Each lamp's post and head colors, fogged by its depth: made once per tone. */
let lampTone: Tone | null = null;
const LAMP_INK: string[] = [];
const LAMP_HEAD: string[] = [];

function lamps(ctx: Ctx, s: Scene, tone: Tone, t: number, fade: number): void {
  if (lampTone !== tone) {
    lampTone = tone;
    LAMP_Z.forEach((z, i) => {
      LAMP_INK[i] = mix("#0e0a16", tone.fog, fogAt(z));
      LAMP_HEAD[i] = mix(LAMP, tone.fog, 0.15 + fogAt(z) * 0.6);
    });
  }
  // Both sides' lamps at each depth share their fills: glow, posts, heads.
  ctx.fillStyle = LAMP;
  for (let i = LAMP_Z.length - 1; i >= 0; i--) {
    const z = LAMP_Z[i]!;
    const U = unit(s, z);
    const y = fieldY(s, z);
    if (y - LAMP_H * U > s.cssH) continue;
    const head = y - LAMP_H * U;
    const xl = sx(s, -LAMP_X, z);
    const xr = sx(s, LAMP_X, z);
    const flick = 0.92 + 0.08 * Math.sin(t * 6 + i * 2);
    ctx.globalAlpha = 0.13 * (1 - fogAt(z) * 0.7) * fade;
    ctx.fillStyle = LAMP;
    ctx.beginPath();
    circle(ctx, xl, head, 0.045 * U * flick);
    circle(ctx, xr, head, 0.045 * U * (1.84 - flick));
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = LAMP_INK[i]!;
    ctx.lineWidth = Math.max(0.8, 0.012 * U);
    ctx.beginPath();
    ctx.moveTo(xl, y);
    ctx.lineTo(xl, head + 0.02 * U);
    ctx.moveTo(xr, y);
    ctx.lineTo(xr, head + 0.02 * U);
    ctx.stroke();
    ctx.fillStyle = LAMP_HEAD[i]!;
    ctx.beginPath();
    oval(ctx, xl, head, 0.022 * U, 0.03 * U);
    oval(ctx, xr, head, 0.022 * U, 0.03 * U);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the floor

/** The cobbled square and street from the horizon to the kerb, and the churchyard's grass in front. */
function floor(ctx: Ctx, s: Scene, tone: Tone): void {
  const kerb = fieldY(s, KERB_Z);
  const top = Math.max(0, s.horizonY);
  if (top < kerb) {
    const g = ctx.createLinearGradient(0, top, 0, kerb);
    g.addColorStop(0, mix(COBBLE_SHADE, tone.fog, 0.42));
    g.addColorStop(0.35, mix(COBBLE_SHADE, tone.fog, 0.12));
    g.addColorStop(1, COBBLE);
    ctx.fillStyle = g;
    ctx.fillRect(0, top, s.cssW, kerb - top);
    // Courses of cobbles in perspective: every other row a shade lighter, near the square only.
    ctx.fillStyle = alpha(COBBLE_LIGHT, 0.5);
    ctx.beginPath();
    for (let z = KERB_Z, i = 0; z < 9; z *= 1.07, i++) {
      if (i % 2) continue;
      const y0 = fieldY(s, z * 1.07);
      const y1 = fieldY(s, z);
      if (y0 > s.cssH) continue;
      ctx.rect(0, y0, s.cssW, Math.max(0.5, (y1 - y0) * 0.55));
    }
    ctx.fill();
  }
  // The churchyard's grass, from the kerb to the bottom of the screen.
  if (kerb < s.cssH) {
    const g = ctx.createLinearGradient(0, kerb, 0, s.cssH);
    g.addColorStop(0, GRASS);
    g.addColorStop(1, mix(GRASS, GRASS_LIGHT, 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(0, kerb, s.cssW, s.cssH - kerb);
  }
}

/** Warm light lying on the cobbles under the street's lamps. */
function pools(ctx: Ctx, s: Scene): void {
  for (let core = 0; core < 2; core++) {
    ctx.beginPath();
    for (const z of LAMP_Z) {
      if (z > 16) continue;
      const U = unit(s, z);
      const y = fieldY(s, z);
      if (y > s.cssH + U * 0.1) continue;
      const k = core ? 0.5 : 1;
      for (const side of [-1, 1]) oval(ctx, sx(s, LAMP_X * side, z), y, 0.16 * U * k, 0.025 * U * k);
    }
    ctx.fillStyle = core ? POOL_CORE : POOL;
    ctx.fill();
  }
}

/** The kerb between the square and the churchyard: black and white striped stones, inked on top. */
function kerbStones(ctx: Ctx, s: Scene): void {
  const y = fieldY(s, KERB_Z);
  if (y > s.cssH) return;
  const h = s.u * KERB_H;
  const w = s.u * 0.05;
  ctx.fillStyle = IRON;
  ctx.fillRect(0, y - h, s.cssW, h);
  ctx.fillStyle = BONE;
  ctx.beginPath();
  for (let x = ((s.cssW / 2) % (w * 2)) - w * 2; x < s.cssW; x += w * 2) {
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x + w * 0.85, y);
    ctx.lineTo(x - w * 0.15, y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = IRON;
  ctx.fillRect(0, y - h - Math.max(1, s.u * 0.003), s.cssW, Math.max(1, s.u * 0.003));
}

/** Main Street, back to front: the floor, the walls and their windows, the lamps, the kerb. */
export function street(ctx: Ctx, s: Scene, tone: Tone, k = 1): void {
  // Once the mist has gathered over it the street is gone for good (seen from on high, or on a
  // zoomed-out screen, its floor would otherwise show between the hollow and the sinking mist).
  if (!streetShows(level(s))) return;
  if (cacheTone !== tone) {
    CACHE.length = 0;
    cacheTone = tone;
  }
  floor(ctx, s, tone);
  if (s.horizonY < s.cssH) {
    // The walls are facades seen from the street: as the camera rises over their roofs they would
    // thin into slivers converging on the far end, so they fade into the fog as soon as it lifts.
    const walls = 1 - smooth(WALLS_FADE[0], WALLS_FADE[1], s.rise / s.u);
    if (walls > 0.01) {
      ctx.globalAlpha = walls;
      wall(ctx, s, tone, -1, k);
      wall(ctx, s, tone, 1, k);
      wallWindows(ctx, s, k);
      ctx.globalAlpha = 1;
    }
    // The lamps fade into the gathering mist as you climb (seen from above they would only clutter the column).
    const fade = 1 - smooth(8, 24, level(s));
    if (fade > 0.01) {
      ctx.globalAlpha = fade;
      pools(ctx, s);
      ctx.globalAlpha = 1;
      lamps(ctx, s, tone, s.t, fade);
    }
  }
  kerbStones(ctx, s);
}
