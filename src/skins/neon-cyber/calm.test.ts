import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { neonCyber } from "../neon-cyber";
import { context, sceneAt, SIZES } from "./test-scene";

// Calm by construction: life only at the sides of the screen (and on the street in front of
// the tower), never behind it. The whole scene around the tower (everything behind it, the rain
// in front and the post pass) is rendered at several moments, from the street to high above the
// smog, and every pixel that changes over time must lie outside the tower's column above its
// floor line: the rain, the splashes and ripples, the blinking windows and beacons, the
// flickering signs and holograms, the searchlights, the lane traffic and the twinkling stars all
// keep clear. The scenery around the tower is the only thing these frames differ in.

const LEVELS = [0, 4, 10, 16, 22, 28, 34, 40, 43, 46, 52, 60, 70, 85, 100, 130, 170] as const;
/** Moments compared with the first: spread over blinks, flickers, the rain and the lanes' sway. */
const TIMES = [0, 0.37, 1.7, 4.4, 8.3, 13.1] as const;

function frame(W: number, H: number, lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const s = sceneAt(W, H, lvl, t);
  const kit = kitFor(neonCyber);
  kit.world(ctx, s);
  kit.front(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("neon cyberpunk calm", () => {
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
      // Something is alive somewhere (rain and signs on the street, lanes and stars up high).
      expect(moving, "the scene has some life").toBeGreaterThan(0);
    },
  );
});
