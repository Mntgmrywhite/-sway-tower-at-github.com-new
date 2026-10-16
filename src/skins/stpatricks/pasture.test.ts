import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { bridge, farSheep, monastery } from "./far";
import { cottage, smoke } from "./meadow";
import { drawSheep, flockPoses } from "./pasture";
import { sceneAt, SIZES } from "./test-scene";
import { toneOf } from "./tone";

// The flock in the back pasture, over two minutes of frolicking (four, frame by frame, for
// touching) on a tall and a short phone: the four of them never touch each other, never come
// into the tower's column or reach the screen's edge, never walk into the far props (the
// bridge, the hilltop round tower and cross, the sheep on the hill) or the cottage and its
// smoke in front, and keep to the pasture beyond the brow. And they do frolic: the lambs race
// round (one chasing the other), bounce and skip, the ewes graze, look up, and now and then
// bounce too.

/** The pasture's corner of the screen, where the masks are drawn. */
function region(s: Scene): { x: number; y: number; w: number; h: number } {
  return { x: 0, y: Math.floor(s.horizonY), w: Math.ceil(s.cssW / 2), h: Math.ceil(s.u * 0.62) };
}

function regionMask(s: Scene, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const r = region(s);
  const canvas = createCanvas(r.w, r.h);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.translate(-r.x, -r.y);
  draw(ctx);
  const data = ctx.getImageData(0, 0, r.w, r.h).data;
  const out = new Uint8Array(r.w * r.h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

function both(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i]! & b[i]!;
  return n;
}

const TIMES = Array.from({ length: 520 }, (_, i) => i * 0.231);

describe("st. patrick's flock", () => {
  it.each(SIZES)("%ix%i: frolics apart, in the pasture, clear of everything", (W, H) => {
    const s0 = sceneAt(W, H, 0, 0);
    const r = region(s0);
    const tone = toneOf(s0);
    const lw = 1.2;
    const column = Math.floor(s0.baseX - s0.u * 0.05) - r.x;
    const props = regionMask(s0, (ctx) => {
      bridge(ctx, s0, tone);
      monastery(ctx, s0, tone);
      farSheep(ctx, s0, tone);
      cottage(ctx, s0);
    });
    const xs = [[], [], [], []] as number[][];
    let hopped = 0;
    let raced = 0;
    let grazing = 0;
    let looking = 0;
    for (const t of TIMES) {
      const s = { ...s0, t };
      const poses = flockPoses(s).map((p) => ({ ...p }));
      const smokeMask = regionMask(s, (ctx) => smoke(ctx, s));
      const masks = poses.map((p) => regionMask(s, (ctx) => drawSheep(ctx, [p], lw)));
      poses.forEach((p, i) => {
        const what = `t=${t.toFixed(2)}: ${i < 2 ? "ewe" : "lamb"} ${i}`;
        xs[i]!.push((p.x - s.cssW / 2) / s.u);
        if (p.lift > p.L * 0.5) hopped++;
        if (i >= 2 && p.stride !== 0 && p.lift > 0) raced++;
        if (i < 2 && p.graze > 0.99) grazing++;
        if (i < 2 && p.graze < 0.01) looking++;
        const d = (p.foot - s.horizonY) / s.u;
        expect(d, `${what}: beyond the hedge`).toBeGreaterThan(0.1);
        expect(d, `${what}: before the brow`).toBeLessThan(0.285);
        const m = masks[i]!;
        let edge = 0;
        let inColumn = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = k % r.w;
          if (x <= 0) edge++;
          if (x >= column) inColumn++;
        }
        expect(edge, `${what}: on the screen's edge`).toBe(0);
        expect(inColumn, `${what}: in the tower's column`).toBe(0);
        expect(both(m, props), `${what}: into the far props or the cottage`).toBe(0);
        expect(both(m, smokeMask), `${what}: in the smoke`).toBe(0);
      });
    }
    // No two of them ever touch, checked frame by frame (they only come close for a moment, so
    // the samples above would miss it): every pair whose boxes come near is compared pixel by pixel.
    const reach = (p: { L: number }) => p.L * 1.8;
    for (let t = 0; t < 240; t += 1 / 30) {
      const s = { ...s0, t };
      const poses = flockPoses(s).map((p) => ({ ...p }));
      const masks: (Uint8Array | null)[] = poses.map(() => null);
      for (let i = 0; i < poses.length; i++) {
        for (let j = i + 1; j < poses.length; j++) {
          const a = poses[i]!;
          const b = poses[j]!;
          if (Math.abs(a.x - b.x) > reach(a) + reach(b) || Math.abs(a.foot - a.lift - b.foot + b.lift) > (a.L + b.L) * 2.6) continue;
          masks[i] ??= regionMask(s, (ctx) => drawSheep(ctx, [a], lw));
          masks[j] ??= regionMask(s, (ctx) => drawSheep(ctx, [b], lw));
          expect(both(masks[i]!, masks[j]!), `t=${t.toFixed(2)}: animal ${i} touches animal ${j}`).toBe(0);
        }
      }
    }
    const span = (a: number[]) => Math.max(...a) - Math.min(...a);
    expect(span(xs[2]!), "the lambs race about").toBeGreaterThan(0.08);
    expect(span(xs[3]!), "the lambs race about").toBeGreaterThan(0.08);
    expect(hopped, "they hop and pronk").toBeGreaterThan(20);
    expect(raced, "they run").toBeGreaterThan(20);
    expect(grazing, "the ewes graze").toBeGreaterThan(200);
    expect(looking, "and look up").toBeGreaterThan(20);
  }, 60_000);
});
