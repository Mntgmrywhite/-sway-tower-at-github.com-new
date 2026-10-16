import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { toyBlock } from "../toyblock";
import { eachVisible, LANES } from "./drift";
import { climbed, DROP1, landShows, seaTop } from "./place";
import { context, sceneAt, SIZES, VIEWS } from "./test-scene";
import { LOOP, LOOP_START, storyLevel, toneAtLevel, type Tone } from "./tone";

// The height story loops, so a tower can climb forever: from LOOP_START everything keyed by
// height repeats every LOOP levels (the light, the sun and the moon, the stars, the lanes' toys
// and clouds), the land is long gone under the cloud sea and the sea lies still at the bottom.
// The loop's end (night) flows into its start without a jump, and very tall towers draw the
// same as low ones, at the same cost.

/** Every color of a tone as [r, g, b], and its numbers, for comparing tones. */
function channels(t: Tone): number[] {
  const out: number[] = [];
  const add = (c: string) => {
    if (!c.startsWith("#")) return;
    for (const i of [1, 3, 5]) out.push(parseInt(c.slice(i, i + 2), 16) / 255);
  };
  const walk = (v: unknown): void => {
    if (typeof v === "string") add(v);
    else if (typeof v === "number") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(t);
  return out;
}

/** How much each color channel and number changes between two tones. */
function steps(a: Tone, b: Tone): number[] {
  const ca = channels(a);
  const cb = channels(b);
  return ca.map((v, i) => Math.abs(v - cb[i]!));
}

describe("toy kingdom loop", () => {
  it("the first pass is the story as designed; from LOOP_START it wraps", () => {
    for (let l = 0; l < LOOP_START; l += 0.5) expect(storyLevel(l)).toBe(l);
    expect(storyLevel(LOOP_START + LOOP)).toBe(LOOP_START);
    expect(storyLevel(LOOP_START + LOOP * 7 + 12)).toBeCloseTo(LOOP_START + 12);
  });

  it("the light at L is the light at L + LOOP, for every L past LOOP_START", () => {
    for (let l = LOOP_START; l < LOOP_START + LOOP * 3; l += 0.37) {
      expect(toneAtLevel(l + LOOP), `level ${l.toFixed(2)}`).toBe(toneAtLevel(l));
      expect(toneAtLevel(l + LOOP * 5), `level ${l.toFixed(2)}`).toBe(toneAtLevel(l));
    }
  });

  it("the loop's seam is no bigger a step than any other in the story", () => {
    // The largest change of each color channel and number between neighboring half-level steps
    // anywhere else in the story. Channel by channel: a quick switch of one number (the
    // constellations swap while they are out of sight) must not excuse a jump in the sky's colors.
    const largest = channels(toneAtLevel(0)).map(() => 0);
    for (let l = 0; l + 0.5 < LOOP_START + LOOP; l += 0.5) {
      steps(toneAtLevel(l), toneAtLevel(l + 0.5)).forEach((d, i) => (largest[i] = Math.max(largest[i]!, d)));
    }
    expect(Math.max(...largest)).toBeGreaterThan(0);
    // Across the seam, lap after lap, and into the loop from the first pass.
    for (let k = 0; k < 4; k++) {
      const seam = LOOP_START + k * LOOP;
      for (const l of [seam - 1, seam - 0.5, seam]) {
        steps(toneAtLevel(l), toneAtLevel(l + 0.5)).forEach((d, i) => {
          expect(d, `step of channel ${i} at level ${l}`).toBeLessThanOrEqual(largest[i]! + 1e-9);
        });
      }
    }
  });

  it("the land is gone and the sea lies still well before the loop starts", () => {
    for (const [W, H, u] of VIEWS) {
      const s = sceneAt(W, H, LOOP_START, 0, u);
      expect(climbed(s), `${W}x${H}`).toBeGreaterThan(DROP1);
      expect(landShows(s, seaTop(s))).toBe(false);
      expect(seaTop(s)).toBeCloseTo(seaTop(sceneAt(W, H, LOOP_START + LOOP * 3, 0, u)), 6);
    }
  });

  it.each(SIZES.flatMap(([W, H]) => [0, 13.5, 41, 77, 101, 122].map((d) => [W, H, LOOP_START + d] as const)))(
    "%ix%i at level %s draws the same a lap and two laps later",
    (W, H, lvl) => {
      const draw = (l: number) => {
        const ctx = context(W, H);
        kitFor(toyBlock).world(ctx, sceneAt(W, H, l, 3.7));
        return ctx.getImageData(0, 0, W, H).data;
      };
      const a = draw(lvl);
      for (const l of [lvl + LOOP, lvl + LOOP * 2]) {
        const b = draw(l);
        let differ = 0;
        for (let i = 0; i < a.length; i++) if (Math.abs(a[i]! - b[i]!) > 3) differ++;
        // Only antialiasing may differ (positions are computed from different camera heights).
        expect(differ, `pixels that differ at level ${l}`).toBeLessThan(a.length * 0.0005);
      }
    },
  );
});

describe("toy kingdom far up", () => {
  it.each(VIEWS.map(([W, H, u]) => [W, H, u] as const))("%ix%i (u %i): levels up to 2000 draw without error, as cheaply as low ones", { timeout: 30_000 }, (W, H, u) => {
    const kit = kitFor(toyBlock);
    const ctx = context(W, H);
    const time = (l: number) => {
      const s = sceneAt(W, H, l, l * 0.31, u);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      ctx.getImageData(0, 0, 1, 1);
      return performance.now() - t0;
    };
    const low: number[] = [];
    const high: number[] = [];
    // Alternate low and high levels so a busy machine slows both alike.
    for (let i = 0; i < 40; i++) {
      low.push(time(LOOP_START + ((i * 7) % LOOP)));
      high.push(time(1500 + i * 13));
    }
    for (let l = 0; l <= 2000; l += 17) {
      const s = sceneAt(W, H, l, 2.2, u);
      let items = 0;
      eachVisible(s, () => items++);
      // A bounded number of things in the lanes at any height.
      expect(items, `items on screen at level ${l}`).toBeLessThanOrEqual(Math.ceil(LANES.length * 6 * Math.max(1, H / 844)));
      expect(() => {
        kit.world(ctx, s);
        kit.front(ctx, s);
      }, `level ${l}`).not.toThrow();
    }
    const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1]!;
    expect(median(high), "frame cost far up vs. in the first lap (ms)").toBeLessThan(median(low) * 1.5 + 1);
  });
});
