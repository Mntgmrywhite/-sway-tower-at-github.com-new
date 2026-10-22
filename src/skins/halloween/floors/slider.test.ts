import { afterEach, describe, expect, it } from "vitest";
import { BASE_W, changed, H_PHONE, info, shoot, type Shot } from "./test-floor";
import { breathe } from "../test-scene";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// R7: the slider is the storey the player is timing, so it keeps calm: the same floor at rest, its
// lights steady, its room still, nothing swinging. Frame to frame it changes far less than the same
// floor standing in the tower (here, not at all).

function copy(s: Shot): Shot {
  return { ...s, data: new Uint8ClampedArray(s.data) };
}

/** Pixels changed from frame to frame over `seconds` at 30 fps, as `role`. */
function motion(level: number, role: "tower" | "slider", from: number, seconds: number): number {
  let total = 0;
  let prev = copy(shoot(level, BASE_W, H_PHONE, info(from, role)));
  for (let t = from + 1 / 30; t < from + seconds; t += 1 / 30) {
    const s = copy(shoot(level, BASE_W, H_PHONE, info(t, role)));
    total += changed(prev, s);
    prev = s;
  }
  return total;
}

describe("the slider keeps calm (R7)", () => {
  it("changes at most 40% as much as the same floor in the tower (and in fact holds still)", () => {
    for (let level = 1; level <= 24; level++) {
      for (const from of [0.5, 7.25]) {
        const tower = motion(level, "tower", from, 2.5);
        const slider = motion(level, "slider", from, 2.5);
        expect(slider, `level ${level} from ${from} s`).toBeLessThanOrEqual(0.4 * tower);
        expect(slider, `level ${level} from ${from} s`).toBe(0);
      }
    }
  }, 60_000);

  it("whatever the moment, even right after a landing", () => {
    for (let level = 1; level <= 24; level++) {
      const a = copy(shoot(level, BASE_W, H_PHONE, info(0, "slider")));
      for (const [t, since] of [
        [3.3, 0.1],
        [9.9, Infinity],
        [41.7, 0.4],
      ] as const)
        expect(changed(a, shoot(level, BASE_W, H_PHONE, info(t, "slider", since)))).toBe(0);
    }
  }, 60_000);
});
