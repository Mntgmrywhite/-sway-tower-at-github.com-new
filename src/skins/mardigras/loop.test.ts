import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { mardiGras } from "../mardigras";
import type { Scene } from "../skin";
import { floorTop, FLOOR_SETTLED, spireAt } from "./far";
import { context, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { DAY_HIGH, level, LOOP, LOOP_START, storyLevel, toneAtLevel, type Tone } from "./tone";

// The height story loops forever (tone.ts): from LOOP_START on, everything keyed by height comes
// round every LOOP levels, the end of the loop flows into its start with no jump, the first
// pass is the designed day, and the scene can be climbed for ever (to level 2000 here) without
// throwing or slowing down. The whole frame repeats too, not just the light. The zoomed-out
// view (up to 1/0.6 times the phone's size at the same u) is covered edge to edge by the skin's
// own layers at every height.

function rgb(c: string): [number, number, number] {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
  const m = c.match(/[\d.]+/g)!.map(Number);
  return [m[0]!, m[1]!, m[2]!];
}

/** The largest change between two tones: over every color (RGB distance) and every amount (x 255). */
function step(a: Tone, b: Tone): number {
  let d = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === "number" && typeof y === "number") d = Math.max(d, Math.abs(x - y) * 255);
    else if (typeof x === "string" && typeof y === "string") {
      const p = rgb(x);
      const q = rgb(y);
      d = Math.max(d, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    } else if (Array.isArray(x) && Array.isArray(y)) {
      for (let i = 0; i < x.length; i++) {
        const p = rgb(x[i]!);
        const q = rgb(y[i]!);
        d = Math.max(d, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
      }
    }
  }
  return d;
}

describe("mardi gras looping story", () => {
  it("repeats every LOOP levels past LOOP_START", () => {
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP * 2; lvl += 0.75) {
      expect(toneAtLevel(lvl + LOOP), `level ${lvl}`).toEqual(toneAtLevel(lvl));
      expect(toneAtLevel(lvl + LOOP * 5), `level ${lvl}`).toEqual(toneAtLevel(lvl));
      expect(storyLevel(lvl + LOOP)).toBeCloseTo(storyLevel(lvl), 6);
    }
  });

  it("flows on across the seams with no jump", () => {
    const seams = [LOOP_START, LOOP_START + LOOP, LOOP_START + LOOP * 2];
    const near = (lvl: number) => seams.some((s) => Math.abs(lvl - s) <= 3);
    let elsewhere = 0;
    for (let lvl = 0; lvl < LOOP_START + LOOP; lvl += 0.5) {
      if (!near(lvl) && !near(lvl + 0.5)) elsewhere = Math.max(elsewhere, step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)));
    }
    expect(elsewhere, "the story changes somewhere").toBeGreaterThan(1);
    for (const seam of seams) {
      for (let lvl = seam - 3; lvl < seam + 3; lvl += 0.5) {
        expect(step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)), `level ${lvl} -> ${lvl + 0.5}`).toBeLessThanOrEqual(elsewhere);
      }
    }
    // And the whole loop changes smoothly too: no half-level step is far bigger than the first day's largest.
    let first = 0;
    for (let lvl = 0; lvl < LOOP_START; lvl += 0.5) first = Math.max(first, step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)));
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP; lvl += 0.5) {
      expect(step(toneAtLevel(lvl), toneAtLevel(lvl + 0.5)), `level ${lvl}`).toBeLessThanOrEqual(first * 1.25);
    }
  });

  it("keeps the first day as designed below LOOP_START", () => {
    for (let lvl = 0; lvl < LOOP_START; lvl += 1.5) expect(storyLevel(lvl)).toBe(lvl);
    expect(toneAtLevel(0).sunSet).toBe(0);
    expect(toneAtLevel(LOOP_START - 0.5).stars).toBe(1);
  });

  it("renders all the way to level 2000 without throwing or slowing down", () => {
    const W = 390;
    const H = 844;
    const ctx = context(W, H);
    const kit = kitFor(mardiGras);
    const time = (lvl: number, t: number) => {
      const s = sceneAt(W, H, lvl, t);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      ctx.getImageData(0, 0, 1, 1);
      return performance.now() - t0;
    };
    const median = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1]!;
    // Warm up, then compare the climb's busiest stretch (the street with the parade) with the loop, far up.
    for (let i = 0; i < 5; i++) time(i * 4, i);
    const low: number[] = [];
    const high: number[] = [];
    for (let i = 0; i < 24; i++) low.push(time((i * 7) % 30, i * 0.7));
    for (let lvl = LOOP_START; lvl <= 2000; lvl += 11) high.push(time(lvl, lvl * 0.13));
    expect(median(high), "frame time high up vs near the ground").toBeLessThan(median(low) * 1.5 + 1);
  }, 60_000);
});

describe("mardi gras loop on screen", () => {
  // Not just the light: past LOOP_START the whole frame comes round every LOOP levels (the cloud
  // floor has settled at its rest with the spires standing out of it, the lane repeats), so the
  // frame at L and at L + LOOP is the same picture, on both phones and zoomed out.
  const frame = (s: Scene) => {
    const ctx = context(s.cssW, s.cssH, 0.5);
    const kit = kitFor(mardiGras);
    kit.world(ctx, s);
    kit.front(ctx, s);
    return ctx.getImageData(0, 0, Math.floor(s.cssW * 0.5), Math.floor(s.cssH * 0.5)).data;
  };
  const CASES = [
    [390, 844, 1],
    [375, 667, 1],
    [390, 844, 0.6],
  ] as const;
  it.each(CASES)("%ix%i at zoom %s: the frame at L + LOOP is the frame at L", (W, H, z) => {
    for (const lvl of [LOOP_START, LOOP_START + 13, LOOP_START + 38, LOOP_START + 71, LOOP_START + 104, LOOP_START + 127]) {
      const t = 3.7 + lvl * 0.01;
      const a = frame(zoomedScene(W, H, z, lvl, t));
      for (const n of [1, 3]) {
        const b = frame(zoomedScene(W, H, z, lvl + LOOP * n, t));
        let differ = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 6) differ++;
        }
        expect(differ, `level ${lvl} vs ${lvl + LOOP * n}: pixels that differ`).toBe(0);
      }
    }
  }, 60_000);

  it("the cloud floor settles before the loop starts, with the spires standing out of it", () => {
    expect(FLOOR_SETTLED).toBeLessThanOrEqual(LOOP_START);
    for (const [W, H] of SIZES) {
      for (let lvl = LOOP_START; lvl < LOOP_START + LOOP * 2; lvl += 9) {
        const s = sceneAt(W, H, lvl, 0);
        const top = floorTop(s, level(s));
        expect(top, `level ${lvl}: the floor's top`).toBeCloseTo(s.cssH - s.u * 0.3, 6);
        expect(spireAt(s).y, `level ${lvl}: the spire above the floor`).toBeLessThan(top - s.u * 0.1);
      }
    }
  });

  it("gathers, then sinks to its rest, without a jump", () => {
    for (const [W, H] of SIZES) {
      const s0 = sceneAt(W, H, 0, 0);
      let prev = floorTop(s0, 0);
      let gathering = 0;
      let sinking = 0;
      for (let lvl = 0.25; lvl < LOOP_START + 4; lvl += 0.25) {
        const s = sceneAt(W, H, lvl, 0);
        const top = floorTop(s, level(s));
        if (lvl <= DAY_HIGH) gathering = Math.max(gathering, Math.abs(top - prev));
        else sinking = Math.max(sinking, Math.abs(top - prev));
        prev = top;
      }
      expect(gathering, `${W}x${H}: the floor's biggest step as it gathers`).toBeLessThan(s0.u * 0.03);
      expect(sinking, `${W}x${H}: the floor's biggest step as it sinks to rest`).toBeLessThan(s0.scale * 2);
    }
  });
});

describe("mardi gras zoomed out", () => {
  // The zoomed-out view (render.ts: camera.ts's frame for a virtual screen 1/zoom the phone's
  // size at the same u) must be painted edge to edge by the skin itself at every height: only
  // Mardi Gras's own layers are drawn here, so a gap would show.
  const LEVELS = [0, 4, 9, 13, 16, 19, 22, 25, 28, 31, 36, 48, 70, 88, 104, 140, 200, 400, 1500];
  it.each(SIZES.flatMap(([W, H]) => [1, 0.8, 0.6].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the whole virtual screen is covered at every height",
    (W, H, z) => {
      for (const lvl of LEVELS) {
        for (const t of [0.4, 6.1]) {
          const s = zoomedScene(W, H, z, lvl, t);
          const K = 0.5;
          const w = Math.floor(s.cssW * K);
          const h = Math.floor(s.cssH * K);
          const ctx = context(s.cssW, s.cssH, K);
          mardiGras.ground!(ctx, s);
          mardiGras.foreground!(ctx, s);
          const data = ctx.getImageData(0, 0, w, h).data;
          let holes = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]! < 250) holes++;
          expect(holes, `level ${lvl}, t=${t}: unpainted pixels`).toBe(0);
        }
      }
    },
    60_000,
  );
});
