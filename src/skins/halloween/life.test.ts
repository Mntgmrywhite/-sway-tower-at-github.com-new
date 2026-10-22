import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import { beat, beatTime, FACE, jackFace, lightsOut, waxDrip } from "./ambient";
import { BALE_FACES, BALE_WINK, CANDLE_FIRST } from "./front";
import { REACH_FIRST, reachAt } from "./hollow";
import { FIRST as FIRST_FLASH, flashAt } from "./lightning";
import { FIRST_OUT } from "./mansion";
import { JACK_EVERY, JACK_FIRST, JACK_SEED } from "./square";
import { breathe, context, sceneAt } from "./test-scene";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The owner's guide: the world is alive, something always quietly happening, even when the player
// does nothing: at every stretch of the height story, any three seconds change a fair share of the
// side lanes, while the tower's column stays calm (at most a third as busy). The start view's little
// lives come to life in the opening (each first moment by 10 s: the jack-o'-lantern's first face,
// a mansion window going dark, the hill tree's branch reaching, wax running down a candle, the
// first lightning, a bale's wink) and keep coming back on their own rhythms, never in lockstep.

const OPENING = 10;
const W = 390;
const H = 844;

function frame(lvl: number, t: number): Uint8ClampedArray {
  const ctx = context(W, H);
  const kit = kitFor(halloween);
  const s = sceneAt(W, H, lvl, t);
  kit.world(ctx, s);
  kit.front(ctx, s);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("halloween is alive", () => {
  it.each([0, 20, 45, 70, 100, 130, 170, 210])("level %i: every three seconds the lanes change, the column far less", (lvl) => {
    const s = sceneAt(W, H, lvl, 0);
    const c0 = Math.round(s.baseX - s.u * 0.05);
    const c1 = Math.round(s.baseX + s.baseW + s.u * 0.05);
    const floor = Math.min(H, Math.round(s.groundY));
    let last = frame(lvl, 0);
    let laneTotal = 0;
    let colTotal = 0;
    for (let t = 3; t <= 60; t += 3) {
      const now = frame(lvl, t);
      let lane = 0;
      let lanes = 0;
      let col = 0;
      let cols = 0;
      for (let y = 0; y < floor; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const d = Math.max(Math.abs(now[i]! - last[i]!), Math.abs(now[i + 1]! - last[i + 1]!), Math.abs(now[i + 2]! - last[i + 2]!));
          const moved = d > 12 ? 1 : 0;
          if (x >= c0 && x <= c1) {
            col += moved;
            cols++;
          } else {
            lane += moved;
            lanes++;
          }
        }
      }
      expect(lane / lanes, `level ${lvl}, ${t - 3}-${t} s: share of the lanes that changed`).toBeGreaterThanOrEqual(0.005);
      laneTotal += lane / lanes;
      colTotal += col / cols;
      last = now;
    }
    expect(colTotal, `level ${lvl}: the column changes no more than a third as much as the lanes`).toBeLessThanOrEqual(laneTotal / 3);
  }, 60_000);

  it("the start view's little lives all come to life in the opening, and keep coming back", () => {
    const first = (test: (t: number) => boolean, from = 0, to = 130) => {
      for (let t = from; t < to; t += 1 / 30) if (test(t)) return t;
      return Infinity;
    };
    const s = (t: number) => sceneAt(W, H, 0, t);
    // Each first moment, as the plan has it.
    const face = (t: number) => jackFace(t, JACK_FIRST, JACK_EVERY[0], JACK_EVERY[1], JACK_SEED, FACE.boo);
    expect(first((t) => face(t).face === FACE.boo), "the giant jack's first face (boo)").toBeCloseTo(JACK_FIRST + 0.06, 1);
    expect(first((t) => lightsOut(t, 4803, FIRST_OUT)), "a mansion window goes dark").toBeLessThan(2.5);
    expect(first((t) => reachAt(t) > 0.5), "the hill tree's branch reaches").toBeLessThan(REACH_FIRST + 1.5);
    expect(first((t) => waxDrip(t, CANDLE_FIRST, 1) > 0), "wax runs down a candle").toBeCloseTo(CANDLE_FIRST, 1);
    expect(first((t) => flashAt(s(t)) > 0), "the first lightning").toBeCloseTo(FIRST_FLASH, 1);
    const wink = BALE_FACES[0];
    expect(wink.first).toBe(BALE_WINK);
    expect(first((t) => jackFace(t, wink.first, wink.min, wink.max, wink.seed, wink.face).face === FACE.wink), "a bale's wink").toBeLessThan(OPENING);
    for (const t0 of [JACK_FIRST, FIRST_OUT, REACH_FIRST, CANDLE_FIRST, FIRST_FLASH, BALE_WINK]) expect(t0).toBeLessThan(OPENING);
    // And again and again: at least three times in the first two minutes.
    const count = (test: (t: number) => boolean) => {
      let n = 0;
      let was = false;
      for (let t = 0; t < 120; t += 1 / 30) {
        const on = test(t);
        if (on && !was) n++;
        was = on;
      }
      return n;
    };
    expect(count((t) => face(t).blink > 0.5), "the giant jack's faces").toBeGreaterThanOrEqual(3);
    expect(count((t) => lightsOut(t, 4803, FIRST_OUT)), "the window going dark").toBeGreaterThanOrEqual(3);
    expect(count((t) => reachAt(t) > 0.5), "the branch reaching").toBeGreaterThanOrEqual(3);
    expect(count((t) => waxDrip(t, CANDLE_FIRST, 1) > 0 && waxDrip(t, CANDLE_FIRST, 1) < 0.2), "the wax").toBeGreaterThanOrEqual(3);
    expect(count((t) => flashAt(s(t)) > 0), "the lightning").toBeGreaterThanOrEqual(3);
  });

  it("never in lockstep: the jack-o'-lanterns change their faces at their own moments", () => {
    const changes: number[] = [];
    // The giant jack-o'-lantern's and the two bale jacks' schedules, as the scene runs them.
    const jacks = [
      [JACK_FIRST, JACK_EVERY[0], JACK_EVERY[1], JACK_SEED] as const,
      ...BALE_FACES.map((b) => [b.first, b.min, b.max, b.seed] as const),
    ];
    expect(jacks.length).toBe(3);
    for (const [f, a, b, seed] of jacks) {
      for (let k = 0; k < 120; k++) changes.push(beatTime(k, f, a, b, seed));
    }
    changes.sort((x, y) => x - y);
    let close = 0;
    for (let i = 1; i < changes.length; i++) if (changes[i]! - changes[i - 1]! < 0.3) close++;
    expect(close / changes.length, "changes within 0.3 s of another").toBeLessThan(0.1);
    // A beat's gaps stay within its range, and it is pure.
    for (let k = 0; k < 200; k++) {
      const gap = beatTime(k + 1, 3, 4, 11, 9) - beatTime(k, 3, 4, 11, 9);
      expect(gap).toBeGreaterThanOrEqual(4 - 1e-9);
      expect(gap).toBeLessThanOrEqual(11 + 1e-9);
    }
    const later = { ...beat(431.7, 3, 4, 11, 9) };
    beat(3, 3, 4, 11, 9);
    expect({ ...beat(431.7, 3, 4, 11, 9) }).toEqual(later);
  });
});
