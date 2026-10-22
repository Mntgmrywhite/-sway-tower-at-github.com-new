import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { valentines } from "../valentines";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START } from "./tone";

// The owner's layering rule: the band behind the tower stays quieter and lower in contrast than
// the edges, so play stays readable. On the backdrop alone (no tower, no foreground), from the top
// of the screen down to the tower's floor line, the tower's column (baseX to baseX + baseW) must be
// measurably calmer than the side lanes (strips at each edge of the screen, same rows, as wide as
// the column or as the margin beside it where that is narrower, so they never overlap it): its
// local RMS contrast and its mean edge strength at most CALMER times the sides' mean. On
// Valentine's the sides hold the stained-glass frame and its climbing rose, the sun and moon in
// their halos, the cherub, the café and the canal, the lane's drifters, and above the clouds
// Paris's rooftops and landmarks and the night's fireworks; the column holds the plain sky, the
// quiet townhouse at the start and the cloud sea's rows.
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
/** From the boulevard at the start, up through the clouds and the dusk into the night, then through one turn of the loop. */
const LEVELS = [0, 12, 24, 40, 60, 80, LOOP_START, LOOP_START + 20, LOOP_START + 40, LOOP_START + 60, LOOP_START + 80, LOOP_START + 100, LOOP_START + LOOP];
/** A few moments of the start's actions (the cherub's shot and pop, the swans' heart, the couple's card) and the lane's drift. */
const MOMENTS = [1.5, 3.4, 8.5];

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
  kitFor(valentines).world(ctx, s);
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

describe("valentine's center calm", () => {
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
    console.log(`valentine's center calm, ${W}x${H} (center / sides):\n${rows.join("\n")}`);
    for (const { at, center, sides } of samples) {
      const limit = sides.local < FLAT ? 1 : CALMER;
      expect(center.local, `${at}: local contrast, center against the sides`).toBeLessThanOrEqual(limit * sides.local);
      expect(center.edge, `${at}: edge strength, center against the sides`).toBeLessThanOrEqual(limit * sides.edge);
    }
  }, 60_000);
});
