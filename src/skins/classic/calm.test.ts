import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { classic } from "../classic";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_FROM } from "./tone";

// Calm by construction: life only at the screen's sides or far back, never behind the tower.
// The whole backdrop is rendered at several moments, from the start through a full turn of the
// looping story and into the next, and every pixel that changes over time must lie outside the
// tower's column above its floor line (the kite and the bluebird, the spring, the windmills and
// the waterfalls, the drifters, the sun's rays, the twinkling stars, the aurora, the shooting
// stars, the lighthouse's beam and the lanterns all stay clear). The scenery around the tower
// is the only thing these frames differ in.

const LEVELS = [
  0, 8, 16, 24, 30, 40, 52, 62, 70, 80, 92, 104, 116, 128, 138, 148,
  ...[10, 45, 80, 115].map((k) => LOOP_FROM + LOOP + k),
  ...[30, 70, 100, 125].map((k) => LOOP_FROM + 2 * LOOP + k),
];
/** Moments compared with the first: spread over the drifters' sway, the meteors, the glints and the stars' twinkle. */
const TIMES = [0, 1.7, 4.4, 8.3, 13.1, 21.9] as const;

function frame(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  kitFor(classic).world(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("classic calm", () => {
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
      // Something is alive somewhere (the kite and the windmills by day, the drifters, the stars by night).
      expect(moving, "the scene has some life").toBeGreaterThan(0);
    },
  );
});
