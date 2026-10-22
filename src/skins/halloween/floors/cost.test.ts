import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import type { BarInfo } from "../../skin";
import { floor } from "./floor";

// What the floors cost a frame: a tower's worth on a phone (390 x 844 at 2x): 26 floors (the top
// one with its roof), the slider and a falling piece, over a dozen seconds and while the house
// shudders from a landing. The target is about 2 ms on the bench (preview/hw-f/bench.ts, with
// Christmas measured alongside); here the limit is generous so a busy test machine never fails it,
// but a painter gone badly wrong does.

const W = 390;
const H = 844;
const h = 20.8;

describe("the floors' cost", () => {
  it("a tower's worth of floors stays well within a frame", () => {
    const ctx = createCanvas(W * 2, H * 2).getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.scale(2, 2);
    const info: BarInfo = { t: 0, role: "tower", sinceLand: Infinity, still: false };
    const paint = () => {
      for (let i = 0; i < 26; i++) {
        info.role = i === 25 ? "top" : "tower";
        floor(ctx, 117 + Math.sin(i * 0.7) * 6, 820 - (i + 1) * h, 156 - (i % 5) * 5, h, 60 + i, info);
      }
      info.role = "slider";
      floor(ctx, 140, 820 - 27 * h, 150, h, 86, info);
      info.role = "loose";
      floor(ctx, 40, 500, 60, h, 85, info);
    };
    const times: number[] = [];
    for (let k = 0; k < 36; k++) {
      info.t = k * 0.35;
      info.sinceLand = [Infinity, 0.1, 0.5][k % 3]!;
      let best = Infinity;
      for (let rep = 0; rep < 3; rep++) {
        const t0 = performance.now();
        paint();
        best = Math.min(best, performance.now() - t0);
      }
      times.push(best);
    }
    times.sort((a, b) => a - b);
    const median = times[times.length >> 1]!;
    console.log(`floors: ${median.toFixed(2)} ms median for 26 floors + slider + loose`);
    expect(median).toBeLessThan(12);
  });
});
