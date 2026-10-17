import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { fieldY } from "../../base/world";
import { EDGE_Z } from "./ground";
import { newYear } from "../newyear";
import { COLUMN, drifters } from "./sky";
import { CLIMB_TOP, LOOP, LOOP_FROM, storyLevel, toneAt, toneAtLevel, type Tone } from "./story";
import { sceneAt } from "./test-scene";

const FIELDS = ["climb", "fireworks", "finale", "confetti", "plumes", "glitter", "snow", "balloons", "glow", "silver"] as const;

/** The biggest change in any field between two tones. */
function step(a: Tone, b: Tone): number {
  let d = 0;
  for (const f of FIELDS) d = Math.max(d, Math.abs(a[f] - b[f]));
  return d;
}

describe("New Year's height story", () => {
  it("keeps the first pass as designed: the climb thickens everything up to the full night", () => {
    expect(LOOP_FROM).toBeGreaterThanOrEqual(CLIMB_TOP);
    for (let lvl = 0; lvl < LOOP_FROM; lvl += 1.5) {
      const a = Math.min(1, lvl / CLIMB_TOP);
      const t = toneAt(lvl);
      expect(t.climb).toBeCloseTo(a, 9);
      expect(t.fireworks).toBeCloseTo(a, 9);
      expect(Math.round(44 * t.confetti)).toBe(Math.round(26 + 18 * a));
      expect(Math.round(6 * t.plumes)).toBe(3 + Math.round(3 * a));
      expect(t.snow + t.balloons + t.finale + t.glow + t.silver).toBe(0);
    }
  });

  it("starts looping only after the terrace has left the view", () => {
    for (const [W, H] of [
      [390, 844],
      [375, 667],
      [768, 1024],
    ] as const) {
      const s = sceneAt(W, H, LOOP_FROM - 1, 0);
      expect(fieldY(s, EDGE_Z), `${W}x${H}`).toBeGreaterThan(H);
    }
  });

  it("repeats every LOOP levels past LOOP_FROM", () => {
    expect(LOOP).toBeGreaterThanOrEqual(80);
    expect(LOOP).toBeLessThanOrEqual(160);
    for (let lvl = LOOP_FROM; lvl < LOOP_FROM + 3 * LOOP; lvl += 0.75) {
      expect(toneAtLevel(lvl + LOOP), `${lvl}`).toEqual(toneAtLevel(lvl));
      expect(toneAtLevel(lvl + 7 * LOOP), `${lvl}`).toEqual(toneAtLevel(lvl));
      expect(storyLevel(lvl + LOOP)).toBeCloseTo(storyLevel(lvl), 6);
    }
  });

  it("goes round the whole night: a finale, balloons, snow, and back to midnight", () => {
    const turn = Array.from({ length: LOOP * 2 }, (_, i) => toneAtLevel(LOOP_FROM + i / 2));
    for (const f of ["finale", "balloons", "snow", "glow", "silver"] as const) expect(Math.max(...turn.map((t) => t[f])), f).toBe(1);
    expect(Math.min(...turn.map((t) => t.fireworks))).toBeLessThan(0.5);
    expect(toneAtLevel(LOOP_FROM)).toEqual(toneAtLevel(LOOP_FROM - 1));
  });

  it("flows across the seam: no step there bigger than the story's biggest step elsewhere", () => {
    let biggest = 0;
    for (let lvl = 0; lvl + 0.5 < LOOP_FROM + LOOP; lvl += 0.5) biggest = Math.max(biggest, step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)));
    expect(biggest).toBeGreaterThan(0);
    for (let k = 1; k <= 3; k++) {
      const seam = LOOP_FROM + k * LOOP;
      for (const d of [-1, -0.5, 0, 0.5]) {
        expect(step(toneAtLevel(seam + d), toneAtLevel(seam + d + 0.5)), `seam ${k} at ${d}`).toBeLessThanOrEqual(biggest);
      }
    }
    // ...and into the loop from the first pass
    expect(step(toneAtLevel(LOOP_FROM - 0.5), toneAtLevel(LOOP_FROM))).toBeLessThanOrEqual(biggest);
  });
});

describe("New Year's drifters, over the climb and two turns of the loop", () => {
  // Masks are drawn at half size to keep this quick.
  const K = 0.5;

  it.each([
    [390, 844],
    [375, 667],
  ] as const)("%ix%i: confetti, plumes, glitter, snow and balloons keep to the side lanes, under the HUD", (W, H) => {
    const w = Math.round(W * K);
    const h = Math.round(H * K);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    let drawn = 0;
    for (let lvl = 0; lvl <= LOOP_FROM + 2 * LOOP; lvl += 3) {
      for (const t of [0, 5.3, 11.7, 31.9]) {
        const s = sceneAt(W, H, lvl, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.scale(K, K);
        drifters(ctx as unknown as CanvasRenderingContext2D, s, toneAtLevel(lvl + 1));
        const data = ctx.getImageData(0, 0, w, h).data;
        const c0 = (W / 2 - COLUMN * s.u) * K;
        const c1 = (W / 2 + COLUMN * s.u) * K;
        let inColumn = 0;
        let inHud = 0;
        let onEdge = 0;
        for (let i = 0; i < w * h; i++) {
          if (data[i * 4 + 3]! < 40) continue;
          drawn++;
          const x = i % w;
          const y = Math.floor(i / w);
          if (x > c0 + 1 && x < c1 - 1) inColumn++;
          if (x > W * 0.2 * K + 1 && x < W * 0.8 * K - 1 && y < H * 0.32 * K - 1) inHud++;
          if (x === 0 || x === w - 1) onEdge++;
        }
        const at = `level ${lvl} at t=${t}`;
        expect(inColumn, at).toBe(0);
        expect(inHud, at).toBe(0);
        expect(onEdge, at).toBe(0);
      }
    }
    // (They are there: hundreds of pixels a frame on average.)
    expect(drawn / ((LOOP_FROM + 2 * LOOP) / 3) / 4).toBeGreaterThan(200);
  });
});

describe("New Year's sky, over the climb and two turns of the loop", () => {
  it.each([
    [390, 844],
    [375, 667],
  ] as const)("%ix%i: nothing in it (fireworks included, the midnight finale too) ever crosses the HUD", (W, H) => {
    const K = 0.5;
    const w = Math.round(W * K);
    const h = Math.round(H * 0.32 * K);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    let fired = 0;
    for (let lvl = 0; lvl <= LOOP_FROM + 2 * LOOP; lvl += 2) {
      // The count, then midnight's volley and the finale (the next minute's too)
      for (const t of [1.7, 4.4, 9.9, 10.3, 11.2, 12.9, 15.6, 70.8]) {
        const s = sceneAt(W, H, lvl, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.scale(K, K);
        newYear.sky!(ctx as unknown as CanvasRenderingContext2D, s);
        const data = ctx.getImageData(0, 0, w, h).data;
        let inHud = 0;
        for (let i = 0; i < w * h; i++) {
          if (data[i * 4 + 3]! < 40) continue;
          fired++;
          const x = i % w;
          if (x > W * 0.2 * K + 1 && x < W * 0.8 * K - 1) inHud++;
        }
        expect(inHud, `level ${lvl} at t=${t}`).toBe(0);
      }
    }
    expect(fired).toBeGreaterThan(0);
  });
});

describe("New Year's layers past the city", () => {
  // Once the skyline has dropped out of the view (by level ~270 on a phone), nothing the skin
  // draws depends on height but through the story: every layer looks the same a turn later.
  it("draws the very same frame at level L and L + LOOP", () => {
    const W = 390;
    const H = 844;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const frame = (lvl: number, t: number): Uint8ClampedArray => {
      const s = sceneAt(W, H, lvl, t, t * 3.7);
      ctx.clearRect(0, 0, W, H);
      for (const layer of [newYear.celestial, newYear.sky, newYear.far, newYear.ground, newYear.foreground]) layer?.(ctx, s);
      return ctx.getImageData(0, 0, W, H).data;
    };
    for (const lvl of [350, 383.5, 421, 462.25]) {
      for (const t of [1.3, 8.8]) {
        const a = frame(lvl, t);
        const b = frame(lvl + LOOP, t);
        let differ = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
        expect(differ, `level ${lvl} at t=${t}`).toBe(0);
        expect(a.some((v) => v > 0)).toBe(true);
      }
    }
  });
});
