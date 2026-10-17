import { describe, expect, it } from "vitest";
import { crowPose, TAKE_OFF } from "./flight";
import { graveState } from "./graves";
import { riderAt } from "./hollow";
import { hopAt, KIDS } from "./kids";
import { moonAt } from "./sky";
import { sceneAt, SIZES } from "./test-scene";

// The owner's rule: any action happens within the first 10 s of a scene (a fresh tower on the
// title screen, or a new run), because after that players have climbed past it. Everything a
// player watches happen in the start view (the Headless Horseman's ride past the moon, the crow's
// turn round the moon, the graves' skeleton parts, the crow's caw, the kids' hops) happens for the
// first time, key moment done, by then; later repeats keep their own rhythm. Ambient motion (the
// flock circling the steeple, flicker, blowing leaves) and things keyed to height (the bats) are
// not actions. All read from the skin's own timing functions.

const OPENING = 10;
const DT = 1 / 60;

/** The first moment in [0, to) that `test` holds, or Infinity. */
function first(test: (t: number) => boolean, to = 60): number {
  for (let t = 0; t < to; t += DT) if (test(t)) return t;
  return Infinity;
}

describe.each(SIZES)("halloween opening, %ix%i", (W, H) => {
  const at = (t: number) => sceneAt(W, H, 0, t);

  it("the Headless Horseman comes out of the mist, gallops past the moon and is into the bridge by 10 s", () => {
    expect(riderAt(at(0)).vis, "not already riding when the scene starts").toBeLessThan(0.02);
    const out = first((t) => riderAt(at(t)).vis > 0.02);
    const onMoon = first((t) => {
      const s = at(t);
      const r = riderAt(s);
      const m = moonAt(s);
      return r.vis > 0.5 && Math.abs(r.x - m.x) < m.r * 0.3;
    });
    const gone = first((t) => t > out && riderAt(at(t)).vis <= 0.02);
    expect(out, "comes out of the mist").toBeLessThan(2);
    expect(onMoon, "crosses the moon's face").toBeLessThan(OPENING);
    expect(gone, "rides into the bridge").toBeLessThan(OPENING);
  });

  it("the crow takes off and has circled the moon twice by 10 s", () => {
    expect(crowPose(at(0)).perched, "on its stone when the scene starts").toBe(true);
    const off = first((t) => !crowPose(at(t)).perched);
    expect(off, "takes off").toBeLessThan(OPENING);
    // Its body over the moon's disc: once per turn on each side (two turns, crossing the face).
    let passes = 0;
    let last = -Infinity;
    let was = false;
    for (let t = off; t < off + 15; t += DT) {
      const s = at(t);
      const p = crowPose(s);
      if (p.perched) break;
      const m = moonAt(s);
      const over = Math.hypot(p.x - m.x, p.y - m.y) < m.r;
      if (over && !was) passes++;
      if (over) last = t;
      was = over;
    }
    expect(passes, "crosses the moon on each turn").toBeGreaterThanOrEqual(2);
    expect(last, "its turns round the moon are done").toBeLessThan(OPENING);
  });

  it("the crow caws within 10 s", () => {
    expect(first((t) => crowPose(at(t)).caw > 0.3)).toBeLessThan(OPENING);
  });

  it("the Horseman and the crow take turns: he is out first, past the moon before the crow gets there, and not back until it is done", () => {
    const out = first((t) => riderAt(at(t)).vis > 0.02);
    expect(TAKE_OFF - out, "the crow leaves its stone a beat after he comes out").toBeGreaterThan(1);
    const crowOver = (t: number) => {
      const s = at(t);
      const p = crowPose(s);
      const m = moonAt(s);
      return !p.perched && Math.hypot(p.x - m.x, p.y - m.y) < m.r;
    };
    const crowOnMoon = first(crowOver);
    const s = at(crowOnMoon);
    const r = riderAt(s);
    const m = moonAt(s);
    expect(r.vis < 0.02 || r.x > m.x + m.r, "the Horseman is past the moon's face").toBe(true);
    // His second ride comes out of the mist only after the crow's last pass over the moon.
    const gone = first((t) => t > out && riderAt(at(t)).vis <= 0.02);
    const back = first((t) => t > gone && riderAt(at(t)).vis > 0.02);
    let last = crowOnMoon;
    for (let t = crowOnMoon; t < back + 2; t += DT) if (crowOver(t)) last = t;
    expect(last, "the crow's turns are done before he rides again").toBeLessThan(back);
  });
});

describe("halloween opening, the churchyard and the street", () => {
  it("every grave pops a skeleton part up within 10 s, and all three parts are seen", () => {
    const parts = new Set<number>();
    for (let g = 0; g < 3; g++) {
      let was = graveState(0, g).up > 0.01;
      let popped = Infinity;
      for (let t = DT; t < OPENING; t += DT) {
        const st = graveState(t, g);
        const up = st.up > 0.01;
        if (up) parts.add(st.part);
        if (up && !was) popped = Math.min(popped, t);
        was = up;
      }
      expect(popped, `grave ${g} pops a part up`).toBeLessThan(OPENING);
    }
    expect(parts.size, "hand, skull and feet").toBe(3);
  });

  it("every trick-or-treater hops within 10 s", () => {
    for (const k of KIDS) expect(first((t) => hopAt(t, k.phase) > 0.5), k.costume).toBeLessThan(OPENING);
  });
});
