import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import { breathe, context, sceneAt, SCREENS } from "./test-scene";
import { LOOP_PERIOD, LOOP_START } from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The owner's layering rule: the band behind the tower stays quieter and lower in contrast than
// the edges, so play stays readable. On the backdrop alone (no tower, no foreground), from the top
// of the screen down to the tower's floor line, the tower's column (baseX to baseX + baseW) must be
// measurably calmer than the side lanes (strips at each edge of the screen, same rows, as wide as
// the column or as the margin beside it where that is narrower, so they never overlap it): its
// local RMS contrast and its mean edge strength at most CALMER times the sides' mean.
//
// RMS contrast is taken locally: the standard deviation of relative luminance within each TILE x
// TILE tile, averaged over the strip (over a whole strip it would mostly measure the sky's own
// range from top to horizon, the same in every column: printed too, as "whole"). Edge strength is
// the mean gradient magnitude of relative luminance. Where the sides are near-flat sky (local
// contrast under FLAT), the center need only not exceed them.
//
// Measured over the whole height, the sky (the same everywhere) and the lanes' busiest things
// (the moon, the mansion, the shops) would let a busy patch behind the tower slip through, so the
// column is also held band by band: in each of BANDS horizontal bands down to the floor line it is
// never busier than the side lanes beside it, unless it is calm in its own right there (local
// contrast under CALM_LOCAL and edge strength under CALM_EDGE: the faint courses of the cobbles
// beside a flat hill, say). That catches what the whole column hides: Main Street's facades
// thinning into converging slivers as the camera rises over them, a lit window or lamp too bright
// behind the tower.

const CALMER = 0.8;
const TILE = 12;
const FLAT = 0.004;
const BANDS = 4;
const CALM_LOCAL = 0.006;
const CALM_EDGE = 0.002;
/** Up the first pass (the square, the climb past the shops, the mist gathering, the night) and one turn of the loop (night, mist, witching hour, night). */
const LEVELS = [0, 10, 20, 32, 46, 60, 80, 100, LOOP_START, LOOP_START + 20, LOOP_START + 40, LOOP_START + 60, LOOP_START + 80, LOOP_START + 100, LOOP_START + LOOP_PERIOD];
/** Moments of the opening: the Horseman on the hill, the crow round the moon, the charge back. */
const MOMENTS = [1.5, 4.5, 8.5];

/** sRGB channel (0..255) to linear light. */
const LINEAR = Float64Array.from({ length: 256 }, (_, v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
});

interface Measure {
  local: number;
  edge: number;
  whole: number;
}

/** The measures of columns x0..x1 (exclusive), rows r0..rows, of a luminance map W wide. */
function measure(L: Float64Array, W: number, rows: number, x0: number, x1: number, r0 = 0): Measure {
  let sum = 0;
  let sum2 = 0;
  let edge = 0;
  let edges = 0;
  for (let y = r0; y < rows; y++) {
    for (let x = x0; x < x1; x++) {
      const v = L[y * W + x]!;
      sum += v;
      sum2 += v * v;
      if (x > x0 && x < x1 - 1 && y > r0 && y < rows - 1) {
        const gx = (L[y * W + x + 1]! - L[y * W + x - 1]!) / 2;
        const gy = (L[(y + 1) * W + x]! - L[(y - 1) * W + x]!) / 2;
        edge += Math.hypot(gx, gy);
        edges++;
      }
    }
  }
  const n = (rows - r0) * (x1 - x0);
  const mean = sum / n;
  let local = 0;
  let tiles = 0;
  for (let ty = r0; ty + TILE <= rows; ty += TILE) {
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

/** The tower's column and the two side lanes of the backdrop with `lvl` bars placed, at time t, whole and band by band. */
function lanes(W: number, H: number, lvl: number, t: number): { center: Measure; sides: Measure; bands: { center: Measure; sides: Measure }[] } {
  const s = sceneAt(W, H, lvl, t);
  const ctx = context(W, H);
  kitFor(halloween).world(ctx, s);
  const d = ctx.getImageData(0, 0, W, H).data;
  const L = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * LINEAR[d[i * 4]!]! + 0.7152 * LINEAR[d[i * 4 + 1]!]! + 0.0722 * LINEAR[d[i * 4 + 2]!]!;
  const rows = Math.min(H, Math.round(s.groundY));
  const w = Math.round(s.baseW);
  const x0 = Math.round(s.baseX);
  const side = Math.min(w, x0);
  const pair = (r0: number, r1: number) => {
    const left = measure(L, W, r1, 0, side, r0);
    const right = measure(L, W, r1, W - side, W, r0);
    return {
      center: measure(L, W, r1, x0, x0 + w, r0),
      sides: { local: (left.local + right.local) / 2, edge: (left.edge + right.edge) / 2, whole: (left.whole + right.whole) / 2 },
    };
  };
  const bands = Array.from({ length: BANDS }, (_, b) => pair(Math.round((rows * b) / BANDS), Math.round((rows * (b + 1)) / BANDS)));
  return { ...pair(0, rows), bands };
}

describe("halloween center calm", () => {
  it.each(SCREENS)("%ix%i: behind the tower the backdrop is calmer than in the side lanes, at every height", (W, H) => {
    const samples = LEVELS.flatMap((lvl) => MOMENTS.map((t) => ({ at: `level ${lvl}, t ${t}`, ...lanes(W, H, lvl, t) })));
    const rows = samples.map(({ at, center, sides }) => {
      const flat = sides.local < FLAT ? "   (flat sky)" : "";
      return (
        `${at.padEnd(18)} local ${center.local.toFixed(4)} / ${sides.local.toFixed(4)} = ${(center.local / sides.local).toFixed(2)}` +
        `   edge ${center.edge.toFixed(4)} / ${sides.edge.toFixed(4)} = ${(center.edge / sides.edge).toFixed(2)}` +
        `   whole ${center.whole.toFixed(4)} / ${sides.whole.toFixed(4)}${flat}`
      );
    });
    console.log(`halloween center calm, ${W}x${H} (center / sides):\n${rows.join("\n")}`);
    for (const { at, center, sides, bands } of samples) {
      const limit = sides.local < FLAT ? 1 : CALMER;
      expect(center.local, `${at}: local contrast, center against the sides`).toBeLessThanOrEqual(limit * sides.local);
      expect(center.edge, `${at}: edge strength, center against the sides`).toBeLessThanOrEqual(limit * sides.edge);
      bands.forEach((b, i) => {
        if (b.center.local < CALM_LOCAL && b.center.edge < CALM_EDGE) return;
        const ratio = Math.max(b.center.local / b.sides.local, b.center.edge / b.sides.edge);
        expect(ratio, `${at}, band ${i + 1} of ${BANDS} (local ${b.center.local.toFixed(4)} / ${b.sides.local.toFixed(4)}, edge ${b.center.edge.toFixed(4)} / ${b.sides.edge.toFixed(4)}): center against the sides`).toBeLessThanOrEqual(1);
      });
    }
  }, 60_000);
});
