import { hash } from "../../base/draw";
import { clamp01 } from "./colors";

// Manhattan's geometry, built once at load (drawing lives in city.ts and landmarks.ts). Three
// depths of our-own Art Deco skyscrapers, all in units of `u`, x from the screen center and y
// up from the horizon:
//  - BACK: a hazy row of faded silhouettes (setbacks, ziggurats, needles, masts, pyramids);
//  - MID: a darker row in front of it, dark shafts under gilded stepped crowns;
//  - the heroes (landmarks.ts): five big black-lacquer towers with gold outlines and gilded
//    crowns, the sunburst needle tower and the ball-drop tower flanking the tower column.
// Towers grow toward the screen edges, where the cloud bank piles up, and stay low behind the
// tower column, so the fireworks have room to burst over the skyline. TOP is the skyline's
// height profile: the sky layer keeps every burst above it, so no rooftop ever slices one.

/* ---------------------------------------------------------------- row towers */

export const FLAT = 0;
export const SETBACK = 1;
export const ZIGGURAT = 2;
export const SPIRE = 3;
export const MAST = 4;
export const PYRAMID = 5;

export interface RowTower {
  /** Outline, counter-clockwise from the bottom left. */
  shape: number[];
  /** The moonlit tip of the crown (a closed polygon), or empty: the back row's highlight. */
  crown: number[];
  /** The whole crown above the wall top, with a cornice band under it (a closed polygon):
   *  the middle row gilds it, so each tower reads as a stepped Deco crown on a dark shaft. */
  gilt: number[];
  /** Antenna tip for a blinking beacon, or none. */
  beacon: [number, number] | null;
  x0: number;
  x1: number;
  /** Wall top (where the crown starts) and the highest point of the outline. */
  h: number;
  top: number;
}

/** Depth (u) of the gilded cornice under a crown. */
const CORNICE = 0.006;

/** Outline and crowns of one Deco tower: body x0..x1 up to h, then its crown. */
function rowTower(x0: number, x1: number, h: number, kind: number): RowTower {
  const w = x1 - x0;
  const m = (x0 + x1) / 2;
  const s: number[] = [x0, 0, x0, h];
  let crown: number[] = [];
  let beacon: [number, number] | null = null;
  const a = w * 0.14;
  const b = w * 0.3;
  const t1 = h + 0.026;
  const t2 = h + 0.048;
  const setbacks = (): void => {
    s.push(x0 + a, h, x0 + a, t1, x0 + b, t1, x0 + b, t2);
  };
  const back = (): void => {
    s.push(x1 - b, t2, x1 - b, t1, x1 - a, t1, x1 - a, h);
  };
  if (kind === SETBACK) {
    setbacks();
    back();
    crown = [x0 + b, t1, x0 + b, t2, x1 - b, t2, x1 - b, t1];
  } else if (kind === ZIGGURAT) {
    const n = 3;
    const d = w * 0.12;
    const st = 0.018;
    for (let i = 1; i <= n; i++) s.push(x0 + d * i, h + st * (i - 1), x0 + d * i, h + st * i);
    for (let i = n; i >= 1; i--) s.push(x1 - d * i, h + st * i, x1 - d * i, h + st * (i - 1));
    const y1 = h + st * (n - 2);
    const y2 = h + st * (n - 1);
    const y3 = h + st * n;
    const l1 = x0 + d * (n - 1);
    const l2 = x0 + d * n;
    const r1 = x1 - d * (n - 1);
    const r2 = x1 - d * n;
    crown = [l1, y1, l1, y2, l2, y2, l2, y3, r2, y3, r2, y2, r1, y2, r1, y1];
  } else if (kind === SPIRE) {
    setbacks();
    const n = w * 0.09;
    s.push(m - n, t2, m, t2 + 0.075, m + n, t2);
    back();
    crown = [x0 + b, t1, x0 + b, t2, m - n, t2, m, t2 + 0.075, m + n, t2, x1 - b, t2, x1 - b, t1];
  } else if (kind === MAST) {
    setbacks();
    const mw = w * 0.11;
    const ant = Math.max(0.0035, w * 0.03);
    s.push(m - mw, t2, m - mw, t2 + 0.03, m - ant, t2 + 0.03, m - ant, t2 + 0.07, m + ant, t2 + 0.07, m + ant, t2 + 0.03, m + mw, t2 + 0.03, m + mw, t2);
    back();
    crown = [m - mw, t2, m - mw, t2 + 0.03, m + mw, t2 + 0.03, m + mw, t2];
    beacon = [m, t2 + 0.07];
  } else if (kind === PYRAMID) {
    setbacks();
    const pk = t2 + w * 0.32;
    const fw = Math.max(0.0025, w * 0.025);
    s.push(m - fw, pk - 0.004, m, pk + 0.022, m + fw, pk - 0.004);
    back();
    crown = [x0 + b, t2, m - fw, pk - 0.004, m, pk + 0.022, m + fw, pk - 0.004, x1 - b, t2];
  }
  s.push(x1, h, x1, 0);
  let top = 0;
  for (let i = 1; i < s.length; i += 2) top = Math.max(top, s[i]!);
  const gilt = [x0, h - CORNICE, ...s.slice(2, -2), x1, h - CORNICE];
  return { shape: s, crown, beacon, gilt, x0, x1, h, top };
}

/** Generate this far either side of the center: wide screens see more of the city, and Hard's
 *  camera zooms out to 1/0.6 of the screen's width (a 21:9 monitor then shows ±3.3 u). */
const SPAN = 3.6;
/** Behind the tower column the skyline stays under this (u), so bursts fit over it. */
export const MID_SPAN = 0.24;
export const MID_CAP = 0.235;

interface RowSpec {
  seed: number;
  minW: number;
  maxW: number;
  /** Wall height behind the tower column and out past the cloud piles at the edges. */
  low: number;
  high: number;
  jitter: number;
  kinds: readonly number[];
}

/** The skyline as first laid out runs from -CORE to the right; further out it goes on. */
const CORE = 1.8;

/** One tower of a row, its left edge at x and `w` wide (k: its hash key). */
function rowAt(spec: RowSpec, k: number, x: number, w: number): RowTower {
  const mid = Math.abs(x + w / 2);
  const f = clamp01((mid - 0.16) / 0.4);
  let h = spec.low + (spec.high - spec.low) * f * f * (3 - 2 * f) + hash(k + 1) * spec.jitter;
  const kind = spec.kinds[Math.floor(hash(k + 2) * spec.kinds.length)]!;
  let t = rowTower(x, x + w, h, kind);
  // Behind the tower column, nothing (spires included) rises over the cap.
  if (t.x1 > -MID_SPAN && t.x0 < MID_SPAN && t.top > MID_CAP) {
    h -= t.top - MID_CAP;
    t = rowTower(x, x + w, h, kind);
  }
  return t;
}

/** A row of towers: low behind the tower column, rising to `high` toward the screen edges. */
function row(spec: RowSpec): RowTower[] {
  const out: RowTower[] = [];
  let x = -CORE;
  for (let i = 0; x < SPAN; i++) {
    const k = spec.seed + i * 3.1;
    const w = spec.minW + hash(k) * (spec.maxW - spec.minW);
    out.push(rowAt(spec, k, x, w));
    x += w * (0.97 + hash(k + 3) * 0.06);
  }
  // On past the left end, laid leftward (appended, so the towers above keep their windows).
  x = -CORE;
  for (let i = 0; x > -SPAN; i++) {
    const k = spec.seed + 7001 + i * 3.1;
    const w = spec.minW + hash(k) * (spec.maxW - spec.minW);
    x -= w * (0.97 + hash(k + 3) * 0.06);
    out.push(rowAt(spec, k, x, w));
  }
  return out;
}

export const BACK = row({ seed: 500, minW: 0.06, maxW: 0.1, low: 0.15, high: 0.46, jitter: 0.06, kinds: [SETBACK, ZIGGURAT, SPIRE, MAST, PYRAMID, SETBACK, FLAT] });
export const MID = row({ seed: 900, minW: 0.055, maxW: 0.09, low: 0.09, high: 0.36, jitter: 0.05, kinds: [FLAT, SETBACK, ZIGGURAT, SPIRE, PYRAMID, SETBACK] });

/* ---------------------------------------------------------------- windows */

/** Lit windows as flat (x, y, tower index) triples in u, in vertical strips up each tower's piers. */
function rowWindows(list: RowTower[], seed: number, fill: number): Float32Array {
  const out: number[] = [];
  for (const [bi, b] of list.entries()) {
    const w = b.x1 - b.x0;
    const cols = Math.max(1, Math.floor((w - 0.014) / 0.019));
    const pad = (w - cols * 0.019) / 2;
    const rows = Math.max(1, Math.floor((b.h - 0.02) / 0.021));
    const p = fill + hash(seed + bi * 5.7) * 0.3;
    for (let c = 0; c < cols; c++) {
      // Whole piers go dark now and then, the way office towers do.
      if (hash(seed + bi * 13.3 + c) < 0.18) continue;
      for (let r = 0; r < rows; r++) {
        if (hash(seed + bi * 131 + r * 17 + c * 3.3) > p) continue;
        out.push(b.x0 + pad + c * 0.019 + 0.006, 0.02 + r * 0.021, bi);
      }
    }
  }
  return Float32Array.from(out);
}

export const MID_WIN = rowWindows(MID, 1700, 0.3);

/* ---------------------------------------------------------------- height profile */

/** Profile resolution (u per bin). */
const BIN = 0.01;
const BINS = Math.ceil((SPAN * 2) / BIN);
/** Highest rooftop (u over the horizon) in each bin of the skyline, all three rows. */
const TOP = new Float32Array(BINS);

/** Raise the profile under a closed outline (x, y pairs, offset by ox): each edge raises the
 *  bins it spans to its higher end, so a needle only claims its own sliver of sky. */
export function raiseProfile(ox: number, pts: readonly number[]): void {
  for (let k = 0; k < pts.length; k += 2) {
    const n = (k + 2) % pts.length;
    const xa = ox + pts[k]!;
    const xb = ox + pts[n]!;
    const top = Math.max(pts[k + 1]!, pts[n + 1]!);
    const i0 = Math.max(0, Math.floor((Math.min(xa, xb) + SPAN) / BIN));
    const i1 = Math.min(BINS - 1, Math.floor((Math.max(xa, xb) + SPAN) / BIN));
    for (let i = i0; i <= i1; i++) TOP[i] = Math.max(TOP[i]!, top);
  }
}

for (const r of [BACK, MID]) for (const b of r) raiseProfile(0, b.shape);

/** The highest rooftop (u over the horizon) anywhere between x0 and x1 (u from the center). */
export function skylineTop(x0: number, x1: number): number {
  const i0 = Math.max(0, Math.floor((x0 + SPAN) / BIN));
  const i1 = Math.min(BINS - 1, Math.floor((x1 + SPAN) / BIN));
  let top = 0;
  for (let i = i0; i <= i1; i++) top = Math.max(top, TOP[i]!);
  return top;
}

/* ---------------------------------------------------------------- the cloud bank */

// The base world piles a bank of puffs along the horizon after this layer (src/base/world.ts
// cloudBank): every 0.06 u a puff of radius 0.05..0.09 u * (0.7 + pile), centered
// 0.12 u * pile + 0.2 r above a line 0.02 u under the horizon, where pile = 0.2 + 0.95 side²
// and side runs from 0 at the screen center to 1 at an edge.

/** Screen side of screen x: 0 at the center, 1 at either edge. */
export function sideOf(cssW: number, x: number): number {
  return Math.min(1, Math.abs(x / cssW - 0.5) * 2);
}

/** The highest the cloud bank piles (u over the horizon) at a screen side: its biggest puffs. */
export function cloudTop(side: number): number {
  const pile = 0.2 + 0.95 * side * side;
  const r = 0.09 * (0.7 + pile);
  const main = 0.12 * pile + 1.22 * r;
  return side > 0.45 ? Math.max(main, 0.25 * pile + 0.77 * r) : main;
}

/** The least the cloud bank ever covers (u over the horizon) at a screen side: where its
 *  smallest neighboring puffs meet, with a margin. Anything lower is always hidden, so the
 *  city never draws it. */
export function cloudCover(side: number): number {
  const pile = 0.2 + 0.95 * side * side;
  const r = 0.05 * (0.7 + pile);
  return 0.85 * (0.12 * pile + 0.2 * r + Math.sqrt(Math.max(0, r * r - 0.03 * 0.03)) - 0.02);
}
