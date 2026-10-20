import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { mardiGras } from "../mardigras";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START, toneAtLevel, toneOf } from "./tone";

// Calm by construction: life only at the screen edges, below the floor line or far back, never
// behind the tower. The whole backdrop is rendered at several moments, from the start to high
// in the night and on round the story's loop, and every pixel that changes over time must lie
// outside the tower's column above its floor line (the parade passes below it; the family's
// tosses, the riverboat, the streetcar, the drifters, the fireworks, the lanterns' flicker, the
// stars and the flambeaux's glow all keep to the sides). The scenery around the tower is the
// only thing these frames differ in.

const LEVELS = [0, 3, 8, 14, 20, 26, 30, 36, 44, 52, 62, 70, 78, 96, 108, 118, 126, 134, 150, 170, 200, 236] as const;
/** Moments compared with the first: spread over the parade's pass, the tosses, the smoke and the stars' twinkle. */
const TIMES = [2.5, 0, 1.7, 3.2, 4.4, 6.1, 8.3, 13.1, 21.9] as const;

function frame(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  kitFor(mardiGras).world(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("mardi gras calm", () => {
  it.each(SIZES.flatMap(([W, H]) => LEVELS.map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: nothing moves behind the tower",
    (W, H, lvl) => {
      const s = sceneAt(W, H, lvl, 0);
      const x0 = Math.ceil(s.baseX - s.u * 0.05);
      const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
      const floor = Math.min(H, Math.floor(s.groundY));
      const first = frame(W, H, lvl, TIMES[0]);
      let moving = 0;
      for (const t of TIMES.slice(1)) {
        const next = frame(W, H, lvl, t);
        let changed = 0;
        let column = 0;
        for (let i = 0; i < first.length; i += 4) {
          const d = Math.max(
            Math.abs(first[i]! - next[i]!),
            Math.abs(first[i + 1]! - next[i + 1]!),
            Math.abs(first[i + 2]! - next[i + 2]!),
          );
          if (d <= 6) continue;
          changed++;
          const p = i / 4;
          const x = p % W;
          const y = Math.floor(p / W);
          if (y < floor && x >= x0 && x <= x1) column++;
        }
        moving += changed;
        expect(column, `t=${t}: pixels changing in the tower's column`).toBe(0);
      }
      // Something is alive somewhere (the parade and the tosses at the start, the drifters, the fireworks, the stars by night).
      expect(moving, "the scene has some life").toBeGreaterThan(0);
    },
    60_000,
  );

  it("the light comes and goes with the altitude: afternoon, sunset, dusk, the night parade, the deep night", () => {
    const tone = (lvl: number) => toneOf(sceneAt(390, 844, lvl, 0));
    expect(tone(0).sunSet).toBe(0);
    expect(tone(0).stars).toBe(0);
    expect(tone(0).fireworks).toBe(0);
    expect(tone(32).sunSet).toBeGreaterThan(0.3);
    expect(tone(32).sunSet).toBeLessThan(1);
    expect(tone(45).sunSet).toBe(1);
    expect(tone(45).lit).toBeGreaterThan(0.5);
    expect(tone(66).fireworks).toBeGreaterThan(0.9);
    expect(tone(66).flambeau).toBeGreaterThan(0.9);
    expect(tone(70).stars).toBeGreaterThan(0.9);
    expect(tone(90).fireworks).toBe(0);
    expect(tone(90).stars).toBe(1);
  });

  it("the story loops: night, a misty dawn (the sun comes back up, the stars and moon go), then the afternoon again", () => {
    const at = (x: number) => toneAtLevel(LOOP_START + LOOP + x);
    expect(at(2).stars).toBeGreaterThan(0.9);
    expect(at(2).sunSet).toBe(1);
    expect(at(14).mist).toBeGreaterThan(0.5);
    expect(at(22).sunSet).toBeGreaterThan(0);
    expect(at(22).sunSet).toBeLessThan(1);
    expect(at(40).sunSet).toBe(0);
    expect(at(40).stars).toBe(0);
    expect(at(40).moon).toBe(0);
    expect(at(40).mist).toBe(0);
    // From the afternoon on it is the first day's story again: sunset, dusk, the night parade, nightfall.
    for (const day of [10, 28, 45, 60, 70, 88]) expect(toneAtLevel(day + LOOP)).toEqual(toneAtLevel(day));
  });
});
