import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { july4 } from "../july4";
import type { Scene } from "../skin";
import { floorTop, landmarkLine, rayFoot, skyBottom } from "./far";
import { halftone, skyFill, stars } from "./sky";
import { context, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// The owner's layering rule: the band behind the tower stays quieter and lower in contrast than
// the edges, so play stays readable. On the backdrop alone (no tower, no foreground), from the top
// of the screen down to the tower's floor line, the tower's column (baseX to baseX + baseW) must be
// measurably calmer than the side lanes (strips at each edge of the screen, same rows, as wide as
// the column or as the margin beside it where that is narrower, so they never overlap it):
// its local RMS contrast and its mean edge strength at most CALMER times the sides' mean.
//
// RMS contrast is taken locally: the standard deviation of relative luminance within each TILE x
// TILE tile, averaged over the strip. (Taken over a whole strip it would mostly measure the sky's
// own range from the top of the screen down to the glow on the horizon, the same in every column,
// whatever stands in front of it: those numbers are printed too, as "whole".) Edge strength is
// the mean gradient magnitude of relative luminance.
//
// Where both are near-flat sky (the sides' local contrast under FLAT), the center need only not
// exceed the sides.

const CALMER = 0.8;
const TILE = 12;
const FLAT = 0.004;
/** From the square at the start, up the climb through the evening, the dusk and the show's night, then through one turn of the loop. */
const LEVELS = [0, 12, 24, 40, 56, 66, 80, 96, LOOP_START, LOOP_START + 20, LOOP_START + 40, LOOP_START + 60, LOOP_START + 80, LOOP_START + 100, LOOP_START + LOOP];
/** A few moments of the square's actions (the parade in front of the bandstand, the cook's flip) and of the show. */
const MOMENTS = [1.5, 4.5, 8.5];

/** sRGB channel (0..255) to linear light. */
const LINEAR = Float64Array.from({ length: 256 }, (_, v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
});

interface Measure {
  /** Local RMS contrast, mean edge strength, and the RMS contrast over the whole strip. */
  local: number;
  edge: number;
  whole: number;
}

/** The measures of columns x0..x1 (exclusive), rows 0..rows, of a luminance map W wide. */
function measure(L: Float64Array, W: number, rows: number, x0: number, x1: number): Measure {
  let sum = 0;
  let sum2 = 0;
  let edge = 0;
  let edges = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = x0; x < x1; x++) {
      const v = L[y * W + x]!;
      sum += v;
      sum2 += v * v;
      if (x > x0 && x < x1 - 1 && y > 0 && y < rows - 1) {
        const gx = (L[y * W + x + 1]! - L[y * W + x - 1]!) / 2;
        const gy = (L[(y + 1) * W + x]! - L[(y - 1) * W + x]!) / 2;
        edge += Math.hypot(gx, gy);
        edges++;
      }
    }
  }
  const n = rows * (x1 - x0);
  const mean = sum / n;
  let local = 0;
  let tiles = 0;
  for (let ty = 0; ty + TILE <= rows; ty += TILE) {
    for (let tx = x0; tx + TILE <= x1; tx += TILE) {
      let s1 = 0;
      let s2 = 0;
      for (let y = ty; y < ty + TILE; y++) {
        for (let x = tx; x < tx + TILE; x++) {
          const v = L[y * W + x]!;
          s1 += v;
          s2 += v * v;
        }
      }
      const m = s1 / (TILE * TILE);
      local += Math.sqrt(Math.max(0, s2 / (TILE * TILE) - m * m));
      tiles++;
    }
  }
  return { local: local / tiles, edge: edge / edges, whole: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
}

/** The tower's column and the two side lanes of the backdrop with `lvl` bars placed, at time t. */
function lanes(W: number, H: number, lvl: number, t: number): { center: Measure; sides: Measure } {
  const s = sceneAt(W, H, lvl, t);
  const ctx = context(W, H);
  kitFor(july4).world(ctx, s);
  const d = ctx.getImageData(0, 0, W, H).data;
  const L = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * LINEAR[d[i * 4]!]! + 0.7152 * LINEAR[d[i * 4 + 1]!]! + 0.0722 * LINEAR[d[i * 4 + 2]!]!;
  const rows = Math.min(H, Math.round(s.groundY));
  const w = Math.round(s.baseW);
  const x0 = Math.round(s.baseX);
  const side = Math.min(w, x0);
  const center = measure(L, W, rows, x0, x0 + w);
  const left = measure(L, W, rows, 0, side);
  const right = measure(L, W, rows, W - side, W);
  const sides = { local: (left.local + right.local) / 2, edge: (left.edge + right.edge) / 2, whole: (left.whole + right.whole) / 2 };
  return { center, sides };
}

describe("independence day center calm", () => {
  it.each(SIZES)("%ix%i: behind the tower the backdrop is calmer than in the side lanes, at every height", (W, H) => {
    const samples = LEVELS.flatMap((lvl) => MOMENTS.map((t) => ({ at: `level ${lvl}, t ${t}`, ...lanes(W, H, lvl, t) })));
    const rows = samples.map(({ at, center, sides }) => {
      const flat = sides.local < FLAT ? "   (flat sky)" : "";
      return (
        `${at.padEnd(18)} local ${center.local.toFixed(4)} / ${sides.local.toFixed(4)} = ${(center.local / sides.local).toFixed(2)}` +
        `   edge ${center.edge.toFixed(4)} / ${sides.edge.toFixed(4)} = ${(center.edge / sides.edge).toFixed(2)}` +
        `   whole ${center.whole.toFixed(4)} / ${sides.whole.toFixed(4)}${flat}`
      );
    });
    console.log(`independence day center calm, ${W}x${H} (center / sides):\n${rows.join("\n")}`);
    for (const { at, center, sides } of samples) {
      const limit = sides.local < FLAT ? 1 : CALMER;
      expect(center.local, `${at}: local contrast, center against the sides`).toBeLessThanOrEqual(limit * sides.local);
      expect(center.edge, `${at}: edge strength, center against the sides`).toBeLessThanOrEqual(limit * sides.edge);
    }
  }, 60_000);
});

describe("independence day's sky behind the tower", () => {
  // The poster sky is flat bands, and what is printed over them (the sunburst's rays, the show
  // night's halftone dots, the stars) keeps to the lanes: from the top of the screen down to the
  // line the town (later the cloud sea) stands on, every row of the sky is one flat ink across
  // the tower's column. (The calm test above compares the column with lanes full of props, so a
  // fan of rays across the column would still pass it.)
  const VIEWS = [
    [390, 844, 1],
    [375, 667, 1],
    [834, 1194, 1],
    [390, 844, 0.6],
  ] as const;
  /** Every level up the first day and one turn of the loop, and the moments the stars twinkle at. */
  const STEPS = Array.from({ length: Math.ceil((LOOP_START + LOOP) / 3) + 1 }, (_, i) => i * 3);

  it.each(VIEWS)("%ix%i at zoom %s: the sky across the column is plain bands", (W0, H0, z) => {
    const view = (lvl: number, t: number): Scene => (z === 1 ? sceneAt(W0, H0, lvl, t) : zoomedScene(W0, H0, z, lvl, t));
    const probe = view(0, 0);
    const ctx = context(probe.cssW, probe.cssH);
    for (const lvl of STEPS) {
      const s = view(lvl, (lvl * 0.71) % 9);
      const tone = toneOf(s);
      const line = landmarkLine(s);
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      const floor = floorTop(s, level(s));
      skyFill(ctx, s, tone, line, skyBottom(s, floor), rayFoot(s, floor, line));
      halftone(ctx, s, tone, line);
      stars(ctx, s, tone);
      const x0 = Math.floor(s.baseX);
      const w = Math.ceil(s.baseW);
      const rows = Math.min(Math.floor(line), Math.floor(s.cssH));
      if (rows <= 0) continue;
      const d = ctx.getImageData(x0, 0, w, rows).data;
      let busy = 0;
      for (let y = 0; y < rows; y++) {
        const r0 = y * w * 4;
        for (let x = 1; x < w; x++) {
          const i = r0 + x * 4;
          if (Math.abs(d[i]! - d[r0]!) + Math.abs(d[i + 1]! - d[r0 + 1]!) + Math.abs(d[i + 2]! - d[r0 + 2]!) > 3) busy++;
        }
      }
      expect(busy, `level ${lvl}: pixels across the column that differ from their row's band`).toBe(0);
    }
  }, 60_000);
});

describe("independence day's cloud sea behind the tower", () => {
  // Below its scalloped top edge the cloud sea is one plain ink across the tower's column: its
  // rows of billows keep to the lanes. (The calm test above averages the column over the whole
  // screen, where the plain sky outweighs a band of busy cloud behind the tower.) Checked on the
  // whole backdrop, so nothing else drawn there may show either.
  const VIEWS = [
    [390, 844, 1],
    [375, 667, 1],
    [834, 1194, 1],
    [390, 844, 0.6],
  ] as const;
  /** The floor's top edge (its lobes, their caps and the shade under them) reaches this far (u) under its top. */
  const EDGE = 0.1;
  const STEPS = Array.from({ length: Math.ceil((LOOP_START + LOOP) / 3) + 1 }, (_, i) => i * 3);

  it.each(VIEWS)("%ix%i at zoom %s: the cloud sea across the column is one ink", (W0, H0, z) => {
    const view = (lvl: number, t: number): Scene => (z === 1 ? sceneAt(W0, H0, lvl, t) : zoomedScene(W0, H0, z, lvl, t));
    const probe = view(0, 0);
    const ctx = context(probe.cssW, probe.cssH);
    let checked = 0;
    for (const lvl of STEPS) {
      const s = view(lvl, (lvl * 0.71) % 9);
      const y0 = Math.ceil(floorTop(s, level(s)) + s.u * EDGE);
      if (y0 >= s.cssH) continue;
      ctx.clearRect(0, 0, s.cssW, s.cssH);
      kitFor(july4).world(ctx, s);
      const x0 = Math.floor(s.baseX);
      const w = Math.ceil(s.baseW);
      const d = ctx.getImageData(x0, y0, w, Math.floor(s.cssH) - y0).data;
      let busy = 0;
      for (let i = 4; i < d.length; i += 4) if (Math.abs(d[i]! - d[0]!) + Math.abs(d[i + 1]! - d[1]!) + Math.abs(d[i + 2]! - d[2]!) > 3) busy++;
      expect(busy, `level ${lvl}: pixels of the cloud sea across the column that differ from its face`).toBe(0);
      checked++;
    }
    expect(checked, "levels with the cloud sea on screen").toBeGreaterThan(20);
  }, 60_000);
});
