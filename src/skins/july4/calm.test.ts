import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { july4 } from "../july4";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START, toneAtLevel } from "./tone";

// Calm by construction: life only at the screen edges, far back, or below the tower's floor,
// never behind the tower. The whole backdrop is rendered at several moments, from the start to
// high in the night and on round the story's loop, and every pixel that changes over time must
// lie outside the tower's column above its floor line (the parade passes below the floor; the
// balloons, the eagle, the kite, the biplane and the smoke keep to the right lane; the sun's
// rays, the stars, the fireworks, the courthouse flag, the barbecue smoke, the sparklers and
// the cook all stay clear). The scenery around the tower is the only thing these frames differ in.

const LEVELS = [0, 3, 8, 14, 20, 26, 30, 36, 44, 52, 60, 66, 72, 78, 84, 92, 100, 108, 118, 126, 134, 150, 170, 200, 236] as const;
/** Moments compared with the first: the parade's units in front of the tower (on its first lap and its next), the cook's flip, the show's shells at every age. */
const TIMES = [2.5, 0, 1.7, 3.2, 4.4, 6.1, 8.3, 9.9, 13.1, 21.9, 37.4, 43.2, 47.9, 611.3] as const;

function frame(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  kitFor(july4).world(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("independence day calm", () => {
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
      // Something is alive somewhere (the parade and the smoke by day, the lane, the show, the stars by night).
      expect(moving, "the scene has some life").toBeGreaterThan(0);
    },
    60_000,
  );

  it("the day turns with the altitude: afternoon, a golden evening, dusk with the moon, the night's show, then calm stars", () => {
    const tone = toneAtLevel;
    expect(tone(0).sunSet).toBe(0);
    expect(tone(0).stars).toBe(0);
    expect(tone(0).show).toBe(0);
    expect(tone(40).sunSet).toBeGreaterThan(0);
    expect(tone(40).sunSet).toBeLessThan(1);
    expect(tone(70).moon).toBeGreaterThan(0.9);
    expect(tone(62).sunSet).toBe(1);
    expect(tone(66).show).toBeGreaterThan(0.9);
    expect(tone(66).finale).toBe(0);
    expect(tone(82).finale).toBeGreaterThan(0.9);
    expect(tone(100).show).toBeGreaterThan(0);
    expect(tone(100).finale).toBe(0);
    expect(tone(104).show).toBe(0);
    expect(tone(104).stars).toBeGreaterThan(0.9);
    expect(tone(104).smoke).toBeGreaterThan(0.9);
  });

  it("the story loops: night, dawn (the sun comes back up, the stars and moon go, the smoke clears), then the day again", () => {
    const at = (x: number) => toneAtLevel(LOOP_START + LOOP + x);
    expect(at(2).stars).toBeGreaterThan(0.9);
    expect(at(2).sunSet).toBe(1);
    expect(at(2).show).toBe(0);
    expect(at(20).sunSet).toBeGreaterThan(0);
    expect(at(20).sunSet).toBeLessThan(1);
    expect(at(20).moon).toBe(0);
    expect(at(20).smoke).toBe(0);
    expect(at(36).sunSet).toBe(0);
    expect(at(36).stars).toBe(0);
    for (const day of [14, 28, 47, 62, 80, 98]) expect(toneAtLevel(day + LOOP)).toEqual(toneAtLevel(day));
  });
});
