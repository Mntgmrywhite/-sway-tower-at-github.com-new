import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { stPatricks } from "../stpatricks";
import { RAINBOW } from "./colors";
import { bowSweep } from "./gold";
import { bowBands } from "./meadow";
import { context, mask, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START, toneAtLevel, toneOf } from "./tone";

// Calm by construction: life only at the screen edges or far back, never behind the tower.
// The whole backdrop is rendered at several moments, from the start to high in the night and
// on round the story's loop, and every pixel that changes over time must lie outside the
// tower's column above its floor line (the swallows, the rain, the rainbow's clouds, the geese,
// the swans, the larks, the stars and the shooting stars, the turf smoke, the glint on the gold,
// the frolicking flock all stay clear; the leprechaun keeps below the floor line). The scenery
// around the tower is the only thing these frames differ in. The one exception is the big
// rainbow over the round tower: it sweeps into its arch behind the base block in the first
// seconds of a tower, and then stands still for good.

const LEVELS = [0, 3, 8, 14, 20, 26, 30, 36, 44, 52, 62, 70, 78, 96, 108, 118, 126, 134, 150, 170, 200, 236] as const;
/**
 * Moments compared with the first, when the rainbow has formed: spread over the drifters' sway,
 * the rain, the smoke and the stars' twinkle, and two from before it is whole (where only its
 * sweep may change the tower's column).
 */
const TIMES = [2.5, 0, 1.7, 3.2, 4.4, 8.3, 13.1, 21.9] as const;
/** The rainbow is whole by then (s). */
const FORMED = TIMES[0];

/** Whether pixel (x, y) is on the whole rainbow's bands or their anti-aliased rim. */
function onBow(bow: Uint8Array, W: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (bow[(y + dy) * W + x + dx]) return true;
  return false;
}

function frame(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  kitFor(stPatricks).world(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("st. patrick's calm", () => {
  it.each(SIZES.flatMap(([W, H]) => LEVELS.map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: nothing moves behind the tower",
    (W, H, lvl) => {
      const s = sceneAt(W, H, lvl, 0);
      const x0 = Math.ceil(s.baseX - s.u * 0.05);
      const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
      const floor = Math.min(H, Math.floor(s.groundY));
      const first = frame(W, H, lvl, FORMED);
      const bow = mask(W, H, (ctx) => bowBands(ctx, { ...s, t: FORMED }));
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
          // Before it is whole, the rainbow's sweep is the one thing that may change there.
          if (y < floor && x >= x0 && x <= x1 && !(t < FORMED && onBow(bow, W, x, y))) column++;
        }
        moving += changed;
        expect(column, `t=${t}: pixels changing in the tower's column`).toBe(0);
      }
      // Something is alive somewhere (the smoke and the gold by day, the drifters, the stars by night).
      expect(moving, "the scene has some life").toBeGreaterThan(0);
    },
    60_000,
  );

  it.each(SIZES.flatMap(([W, H]) => [0, 8, 20].map((lvl) => [W, H, lvl] as const)))(
    "%ix%i at level %i: before that, only the rainbow sweeping into its arch moves behind the tower",
    (W, H, lvl) => {
      expect(bowSweep(RAINBOW.length - 1, FORMED), "whole by the first moment compared").toBe(1);
      const s = sceneAt(W, H, lvl, 0);
      const x0 = Math.ceil(s.baseX - s.u * 0.05);
      const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
      const floor = Math.min(H, Math.floor(s.groundY));
      const formed = frame(W, H, lvl, FORMED);
      const bow = mask(W, H, (ctx) => bowBands(ctx, { ...s, t: FORMED }));
      let sweeping = 0;
      for (const t of [0, 0.5, 1, 1.5, 2]) {
        const next = frame(W, H, lvl, t);
        for (let i = 0; i < formed.length; i += 4) {
          const d = Math.max(
            Math.abs(formed[i]! - next[i]!),
            Math.abs(formed[i + 1]! - next[i + 1]!),
            Math.abs(formed[i + 2]! - next[i + 2]!),
          );
          if (d <= 6) continue;
          const p = i / 4;
          const x = p % W;
          const y = Math.floor(p / W);
          if (y >= floor || x < x0 || x > x1) continue;
          // Anything changing in the column is the rainbow (or its anti-aliased rim) still forming.
          expect(onBow(bow, W, x, y), `t=${t}: (${x}, ${y}) changes in the tower's column`).toBe(true);
          sweeping++;
        }
      }
      // At the start the arch shows over the base block (the ground is on screen at these levels).
      expect(sweeping, "the rainbow sweeps in behind the tower").toBeGreaterThan(0);
    },
    60_000,
  );

  it("the weather comes and goes with the altitude: dry at the start, a shower, a rainbow, dry again", () => {
    const tone = (lvl: number) => toneOf(sceneAt(390, 844, lvl, 0));
    expect(tone(0).rain).toBe(0);
    expect(tone(0).rainbow).toBe(0);
    expect(tone(28).rain).toBeGreaterThan(0.9);
    expect(tone(28).rainbow).toBe(0);
    expect(tone(47).rain).toBe(0);
    expect(tone(47).rainbow).toBeGreaterThan(0.9);
    expect(tone(70).rainbow).toBe(0);
    expect(tone(105).stars).toBeGreaterThan(0.9);
  });

  it("the story loops: night, dawn (the sun comes back up, the stars and moon go), then the day again", () => {
    const at = (x: number) => toneAtLevel(LOOP_START + LOOP + x);
    expect(at(2).stars).toBeGreaterThan(0.9);
    expect(at(2).sunSet).toBe(1);
    expect(at(18).morningStar).toBeGreaterThan(0.5);
    expect(at(20).sunSet).toBeGreaterThan(0);
    expect(at(20).sunSet).toBeLessThan(1);
    expect(at(40).sunSet).toBe(0);
    expect(at(40).stars).toBe(0);
    expect(at(40).moon).toBe(0);
    // From the morning on it is the first day's story again: the shower, the rainbow, nightfall.
    for (const day of [12, 28, 47, 62, 80, 98]) expect(toneAtLevel(day + LOOP)).toEqual(toneAtLevel(day));
  });
});
