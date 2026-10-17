import { describe, expect, it } from "vitest";
import { TURKEYS } from "./ground";
import { geese, geeseAcross, geeseCycle, GEESE_FLIGHT, GEESE_PERIOD } from "./sky";
import { context, PHONES, sceneAt } from "./test-scene";
import { peckAt, strutAt } from "./turkey";

// The owner's rule: every action seen from the start view happens within the first 10 s of the
// scene's clock (s.t = 0 on the title's fresh tower and on a new run), because after that players
// have climbed past it. The actions here are the V of geese crossing the sky and the turkeys
// pecking at the lawn and puffing out their fans. Everything else that moves is ambient (leaves
// always in the air, chimney smoke, pie steam, the swing, the sun's rays, twinkling stars), and
// the sunset, the moonrise and the looping day are keyed to height.

/** An action's first occurrence is done by this time, in seconds of s.t. */
const FIRST = 10;

/** Times from 0 to `end` seconds, `dt` apart. */
function times(end: number, dt: number): number[] {
  return Array.from({ length: Math.round(end / dt) + 1 }, (_, i) => i * dt);
}

/** The columns the geese cover in the start view at time t (alpha above 0), or null if none. */
function geeseSpan(W: number, H: number, t: number): [number, number] | null {
  const ctx = context(W, H);
  geese(ctx, sceneAt(W, H, 0, t));
  const data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let x1 = -1;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) continue;
    const x = ((i - 3) / 4) % W;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
  }
  return x1 < 0 ? null : [x0, x1];
}

describe("thanksgiving actions happen in the first 10 seconds", () => {
  it("the first V of geese sets off as the scene starts, and later ones keep their rhythm", () => {
    expect(geeseCycle(0)).toBe(0);
    expect(geeseAcross(0)).toBe(0);
    for (const k of [1, 2, 5]) expect(geeseAcross(k * GEESE_PERIOD), `flight ${k}`).toBe(0);
  });

  it.each(PHONES)("%ix%i: the geese cross the start view within the first 10 s", (W, H) => {
    const s = sceneAt(W, H, 0, 0);
    const column0 = s.baseX - s.u * 0.05;
    const column1 = s.baseX + s.baseW + s.u * 0.05;
    let first = -1;
    let whole = -1;
    let past = -1;
    let last = -1;
    let fromLeft = true;
    for (const t of times(GEESE_FLIGHT, 0.25)) {
      const span = geeseSpan(W, H, t);
      if (!span) continue;
      if (first < 0) {
        first = t;
        fromLeft = span[0] === 0;
      }
      if (whole < 0 && span[0] > 0 && span[1] < W - 1) whole = t;
      if (past < 0 && (fromLeft ? span[0] > column1 : span[1] < column0)) past = t;
      last = t;
    }
    // In from the edge at once, the whole V in view soon after, past the tower and gone by ~10 s.
    expect(first, "first goose in view").toBeGreaterThanOrEqual(0);
    expect(first, "first goose in view").toBeLessThanOrEqual(1);
    expect(whole, "whole V in view").toBeGreaterThanOrEqual(0);
    expect(whole, "whole V in view").toBeLessThanOrEqual(3);
    expect(past, "V past the tower").toBeGreaterThanOrEqual(0);
    expect(past, "V past the tower").toBeLessThanOrEqual(FIRST);
    expect(last, "last goose out of view").toBeLessThanOrEqual(FIRST + 0.5);
  });

  it("every turkey pecks at the lawn and comes back up within the first 10 s, out of step", () => {
    const dips: number[] = [];
    for (const [, , , , phase] of TURKEYS) {
      // A whole peck: head up, down at the lawn, back up.
      let up = false;
      let dip = -1;
      let done = -1;
      for (const t of times(FIRST, 0.02)) {
        const p = peckAt(t, phase);
        if (dip < 0) {
          if (p < 0.05) up = true;
          else if (up && p > 0.6) dip = t;
        } else if (p < 0.05) {
          done = t;
          break;
        }
      }
      expect(dip, `turkey (phase ${phase}): head down`).toBeGreaterThanOrEqual(0);
      expect(done, `turkey (phase ${phase}): back up`).toBeGreaterThanOrEqual(0);
      expect(done, `turkey (phase ${phase}): back up`).toBeLessThanOrEqual(FIRST);
      dips.push(dip);
    }
    // Not in lockstep: the first pecks start at clearly different moments.
    for (let i = 0; i < dips.length; i++) {
      for (let j = i + 1; j < dips.length; j++) expect(Math.abs(dips[i]! - dips[j]!), `turkeys ${i} and ${j}`).toBeGreaterThan(0.4);
    }
  });

  it("every turkey puffs its fan all the way out within the first 10 s", () => {
    for (const [, , , , phase] of TURKEYS) {
      const full = times(FIRST, 0.02).find((t) => strutAt(t, phase) > 0.99);
      expect(full, `turkey (phase ${phase})`).toBeDefined();
    }
  });
});
