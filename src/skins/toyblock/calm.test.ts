import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { toyBlock } from "../toyblock";
import { context, sceneAt, VIEWS } from "./test-scene";
import { LOOP, LOOP_START } from "./tone";

// Calm by construction: life only at the screen edges or far back, never behind the tower.
// The whole backdrop is rendered at several moments, from the start to twice round the loop,
// and every pixel that changes over time must lie outside the tower's column above its floor
// line (the train, the flags, the sun's slow rays, the moon's mobile, the drifters, the stars,
// the meadow's toys all stay clear). The scenery around the tower is the only thing these frames
// differ in.

const FIRST = [0, 3, 8, 14, 20, 26, 34, 48, 62, 78, 96] as const;
const LOOPED = [0, 20, 40, 60, 80, 100, 120].flatMap((d) => [LOOP_START + d, LOOP_START + LOOP + d + 7]);
/** Moments compared with the first: spread over the train's run, the drifters' sway and the stars' twinkle. */
const TIMES = [0, 1.7, 4.4, 8.3, 13.1, 21.9] as const;

function frame(W: number, H: number, u: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t, u);
  kitFor(toyBlock).world(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("toy kingdom calm", () => {
  const cases = VIEWS.flatMap(([W, H, u], v) => (v < 2 ? [...FIRST, ...LOOPED] : [0, 20, 48, LOOP_START + 30]).map((lvl) => [W, H, u, lvl] as const));
  it.each(cases)("%ix%i (u %i) at level %i: nothing moves behind the tower", { timeout: 20_000 }, (W, H, u, lvl) => {
    const s = sceneAt(W, H, lvl, 0, u);
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    const floor = Math.min(H, Math.floor(s.groundY));
    const first = frame(W, H, u, lvl, TIMES[0]);
    let moving = 0;
    for (const t of TIMES.slice(1)) {
      const next = frame(W, H, u, lvl, t);
      let changed = 0;
      let column = 0;
      for (let i = 0; i < first.length; i += 4) {
        const d = Math.max(Math.abs(first[i]! - next[i]!), Math.abs(first[i + 1]! - next[i + 1]!), Math.abs(first[i + 2]! - next[i + 2]!));
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
    // Something is alive somewhere (the sun's rays by day, the stars by night, the drifters).
    expect(moving, "the scene has some life").toBeGreaterThan(0);
  });
});
