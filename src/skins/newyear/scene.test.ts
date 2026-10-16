import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { DROP_FROM, MIDNIGHT } from "./countdown";
import { LOOP, LOOP_FROM } from "./story";
import { sceneAt } from "./test-scene";

const kit = kitFor(newYear);

describe("New Year's city under the start screen's title", () => {
  // render.ts puts the title's baseline at cssH * 0.14 at the start of a run (and on the title
  // screen), its outline reaching about 0.008 u under it, and the title spans up to 0.44 u either
  // side of the center. The squarest screens (u = 0.6 cssH: tablets, desktop windows) leave the
  // least room between it and the city.
  it.each([
    [390, 844],
    [375, 667],
    [768, 1024],
    [600, 1000],
    [1280, 800],
  ] as const)("%ix%i: nothing in the city reaches the title's row, the ball and its rays included", (W, H) => {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const u = Math.min(W, H * 0.6);
    const rows = Math.ceil(H * 0.14 + u * 0.012);
    // The ball at the top of its mast, then landed with its rays reaching out at midnight; the rays
    // pulse and turn with scene time.
    for (const song of [DROP_FROM, DROP_FROM + 0.5, MIDNIGHT + 0.4, MIDNIGHT + 2]) {
      for (const t of [0.65, 1.9, 3.3, 7.1]) {
        ctx.clearRect(0, 0, W, H);
        newYear.far!(ctx as unknown as CanvasRenderingContext2D, sceneAt(W, H, 0, t, song));
        const data = ctx.getImageData(0, 0, W, rows).data;
        let hits = 0;
        for (let i = 0; i < W * rows; i++) {
          // Solid pixels only: the searchlights' faint beams fade out over the city.
          if (data[i * 4 + 3]! > 200 && Math.abs((i % W) - W / 2) < 0.45 * u) hits++;
        }
        expect(hits, `song ${song}s, t ${t}`).toBe(0);
      }
    }
  });
});

/** The whole scenery (behind and in front of the tower) on a context. */
function scenery(ctx: CanvasRenderingContext2D, s: Scene): void {
  kit.world(ctx, s);
  kit.front(ctx, s);
}

/** A context that counts every call made on it (paths, fills, strokes, text...). Its canvas is
 *  tiny, so the scene is mostly drawn off it: quick, and the calls are all still made. */
function counting(): { ctx: CanvasRenderingContext2D; calls: () => number; reset: () => void } {
  const raw = createCanvas(8, 8).getContext("2d") as unknown as Record<PropertyKey, unknown>;
  let n = 0;
  const ctx = new Proxy(raw, {
    get(target, key) {
      const v = target[key];
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        n++;
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls: () => n, reset: () => (n = 0) };
}

const TIMES = [0, 7.7, 21.9, 47.1, 61.5];

describe("New Year's scenery all the way up", () => {
  it("draws anything up to level 2000 without throwing, and no busier than the climb as designed", () => {
    const c = counting();
    let designed = 0;
    for (let lvl = 0; lvl < LOOP_FROM; lvl += 4) {
      for (const t of TIMES) {
        c.reset();
        scenery(c.ctx, sceneAt(390, 844, lvl, t));
        designed = Math.max(designed, c.calls());
      }
    }
    let looped = 0;
    for (let lvl = LOOP_FROM; lvl <= 2000; lvl += lvl < LOOP_FROM + 2 * LOOP ? 4 : 53) {
      for (const t of TIMES) {
        for (const song of [NaN, t + 20]) {
          c.reset();
          expect(() => scenery(c.ctx, sceneAt(390, 844, lvl, t, song)), `level ${lvl}`).not.toThrow();
          looped = Math.max(looped, c.calls());
        }
      }
    }
    expect(looped).toBeGreaterThan(500);
    expect(looped).toBeLessThanOrEqual(designed);
  });
});

describe("Hard's zoomed-out camera", () => {
  // The renderer builds the scene for a virtual screen 1/z the size (z down to 0.6) with the
  // phone's own u, then draws it scaled by z: the skin must cover all of it.
  const Z = 0.6;
  const SCREENS = [
    // A phone: 390x844 seen as 650x1407.
    [390, 844],
    // A short phone, a tablet and a wide desktop window.
    [375, 667],
    [768, 1024],
    [1920, 1080],
  ] as const;

  it.each(SCREENS)("%ix%i zoomed out to 0.6: the scenery fills the whole virtual screen, the skyline reaches both edges", (pw, ph) => {
    const u = Math.min(pw, ph * 0.6);
    const W = Math.round(pw / Z);
    const H = Math.round(ph / Z);
    const K = 0.25;
    const w = Math.floor(W * K);
    const h = Math.floor(H * K);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    for (const lvl of [2, 12, 30, 90, LOOP_FROM + 40, 600]) {
      const s = sceneAt(W, H, lvl, 5.5, NaN, u);
      // Everything, opaque everywhere
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.scale(K, K);
      scenery(ctx as unknown as CanvasRenderingContext2D, s);
      const all = ctx.getImageData(0, 0, w, h).data;
      let holes = 0;
      for (let i = 3; i < all.length; i += 4) if (all[i]! < 255) holes++;
      expect(holes, `${pw}x${ph} level ${lvl}`).toBe(0);

      // The city alone: some of it stands in every column of the screen while the horizon is on it
      if (s.horizonY > H) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.scale(K, K);
      newYear.far!(ctx as unknown as CanvasRenderingContext2D, s);
      const y0 = Math.max(0, Math.floor((s.horizonY - s.u * 0.7) * K));
      const y1 = Math.min(h, Math.floor(s.horizonY * K));
      const city = ctx.getImageData(0, y0, w, y1 - y0).data;
      let gaps = 0;
      for (let x = 0; x < w; x++) {
        let any = false;
        for (let y = 0; y < y1 - y0 && !any; y++) any = city[(y * w + x) * 4 + 3]! > 200;
        if (!any) gaps++;
      }
      expect(gaps, `${pw}x${ph} level ${lvl}: skyline gaps`).toBe(0);
    }
  });
});
