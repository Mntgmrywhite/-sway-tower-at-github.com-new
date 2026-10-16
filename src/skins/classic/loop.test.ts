import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { classic } from "../classic";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_FROM, SCENE_LOOP_FROM, storyLevel, toneAtLevel, type Tone } from "./tone";

// The height story loops: past LOOP_FROM the light repeats every LOOP levels (night, dawn,
// the high day, sunset, dusk and night again), the seam where a turn ends and the next begins
// is as smooth as anywhere else in the story, and past SCENE_LOOP_FROM the whole scene repeats:
// the same picture at L and L + LOOP. A tower can climb forever: far up, the frame still draws,
// and costs no more than one turn of the loop up.

const STEP = 0.5;

function channels(c: string): number[] {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(c);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]) * 255] : [];
}

/** How much the light changes from one tone to the next: the largest change of any color channel or weight (0..255). */
function change(a: Tone, b: Tone, colorsOnly = false): number {
  let most = 0;
  for (const key of Object.keys(a) as (keyof Tone)[]) {
    const x = a[key];
    const y = b[key];
    const xs = Array.isArray(x) ? x : [x];
    const ys = Array.isArray(y) ? y : [y];
    xs.forEach((v, i) => {
      const w = ys[i];
      if (typeof v === "number" && typeof w === "number") {
        if (!colorsOnly) most = Math.max(most, Math.abs(v - w) * 255);
      }
      else if (typeof v === "string" && typeof w === "string") {
        const cv = channels(v);
        const cw = channels(w);
        cv.forEach((n, j) => (most = Math.max(most, Math.abs(n - (cw[j] ?? n)))));
      }
    });
  }
  return most;
}

function world(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  const kit = kitFor(classic);
  kit.world(ctx, s);
  kit.front(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

/** Pixels whose color differs by more than a hair between two frames. */
function differing(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!));
    if (d > 3) n++;
  }
  return n;
}

describe("classic loop", () => {
  it("the light at L + LOOP is the light at L, from LOOP_FROM on", () => {
    for (let lvl = LOOP_FROM; lvl < LOOP_FROM + 3 * LOOP; lvl += STEP) {
      expect(toneAtLevel(lvl + LOOP), `level ${lvl}`).toBe(toneAtLevel(lvl));
    }
    expect(storyLevel(LOOP_FROM + LOOP)).toBe(LOOP_FROM);
    expect(storyLevel(LOOP_FROM - 1)).toBe(LOOP_FROM - 1);
  });

  it("the story's turn runs night, dawn, day, sunset, dusk and back to night", () => {
    const at = (m: number) => toneAtLevel(m);
    expect(at(0).stars).toBe(0);
    expect(at(0).sunSet).toBe(0);
    expect(at(70).sunSet).toBeGreaterThan(0.5);
    expect(at(110).stars).toBeGreaterThan(0.9);
    expect(at(110).moon).toBeGreaterThan(0.9);
    expect(at(110).aurora).toBeGreaterThan(0.9);
    expect(at(110).sunSet).toBe(1);
    expect(at(140).sunSet).toBeGreaterThan(0);
    expect(at(140).sunSet).toBeLessThan(1);
    expect(at(140).stars).toBe(0);
    expect(at(LOOP_FROM + LOOP + 80).stars).toBe(at(110).stars);
  });

  it("no jump at the seam: a turn flows into the next as smoothly as the story flows anywhere else", () => {
    let most = 0;
    for (let lvl = 0; lvl + STEP < LOOP_FROM + LOOP - STEP; lvl += STEP) {
      most = Math.max(most, change(toneAtLevel(lvl), toneAtLevel(lvl + STEP)));
    }
    expect(most).toBeGreaterThan(0);
    const seam = LOOP_FROM + LOOP;
    for (let lvl = seam - 2; lvl < seam + 2; lvl += STEP) {
      expect(change(toneAtLevel(lvl), toneAtLevel(lvl + STEP)), `step at ${lvl}`).toBeLessThanOrEqual(most);
    }
    // ...and the light barely moves there: the seam sits on a held key (the high day).
    expect(change(toneAtLevel(seam - STEP), toneAtLevel(seam))).toBeLessThan(2);
  });

  it("the sky never ticks: a color changes by a few shades at most from one tone step to the next", () => {
    // Tones come in quarter-level steps; the camera eases through them as the tower climbs.
    for (let lvl = 0; lvl < LOOP_FROM + LOOP + 1; lvl += 0.25) {
      expect(change(toneAtLevel(lvl), toneAtLevel(lvl + 0.25), true), `step at ${lvl}`).toBeLessThanOrEqual(6);
    }
  });

  it.each(SIZES)("%ix%i: the whole scene repeats every LOOP levels past SCENE_LOOP_FROM", (W, H) => {
    for (let lvl = SCENE_LOOP_FROM; lvl < SCENE_LOOP_FROM + LOOP; lvl += 9) {
      const t = 2 + lvl * 0.07;
      const a = world(W, H, lvl, t);
      const b = world(W, H, lvl + LOOP, t);
      const c = world(W, H, lvl + 5 * LOOP, t);
      expect(differing(a, b), `level ${lvl} vs ${lvl + LOOP}`).toBeLessThan(W);
      expect(differing(a, c), `level ${lvl} vs ${lvl + 5 * LOOP}`).toBeLessThan(W);
    }
  });

  it("far up the tower the frame still draws, with no more work than one turn up", () => {
    const W = 390;
    const H = 844;
    /** Drawing calls Sky Islands makes at a level: a picture the same as one turn up must cost the same. */
    const calls = (lvl: number): number => {
      let n = 0;
      const real = context(W, H);
      const counting = new Proxy(real, {
        get(target, key) {
          const v = Reflect.get(target, key) as unknown;
          if (typeof v !== "function") return v;
          return (...args: unknown[]) => {
            n++;
            return (v as (...a: unknown[]) => unknown).apply(target, args);
          };
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
      // The skin's own layers (the base world under them is painted over, and is not Classic's).
      const s = sceneAt(W, H, lvl, 3);
      classic.ground!(counting, s);
      classic.foreground!(counting, s);
      return n;
    };
    for (const lvl of [300, 700, 1200, 1999, 2000]) expect(() => world(W, H, lvl, 1)).not.toThrow();
    const top = 2000;
    const near = top - Math.floor((top - SCENE_LOOP_FROM) / LOOP) * LOOP;
    expect(calls(top)).toBe(calls(near));
    // ...and it draws well inside a frame's budget even on a busy test machine.
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      world(W, H, top, 3 + i * 0.4);
      runs.push(performance.now() - t0);
    }
    expect(runs.sort((x, y) => x - y)[2]!).toBeLessThan(120);
  });
});
