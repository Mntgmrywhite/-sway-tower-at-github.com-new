import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { BLOCK_HEIGHT } from "../../config";
import { neonCyber } from "../neon-cyber";
import { lookStep } from "../neon/test-scene";
import { eachVisible } from "./lanes";
import { context, sceneAt } from "./test-scene";
import { LOOP, LOOP_FROM, toneOf, type Tone } from "./tone";

// The height story loops forever (tone.ts): past LOOP_FROM everything keyed by height repeats
// every LOOP levels, with no seam where one loop runs into the next, and the climb can go on
// for as long as anyone stacks without the frame getting any slower.

/** The light at a level (in half-level steps; only the camera's altitude matters to it). */
function toneAt(lvl: number): Tone {
  return toneOf({ ...sceneAt(390, 844, 0, 0), altitude: lvl * BLOCK_HEIGHT });
}

describe("neon cyberpunk height story loop", () => {
  it("repeats every LOOP levels past LOOP_FROM", () => {
    for (let lvl = LOOP_FROM; lvl < LOOP_FROM + 3 * LOOP; lvl += 1.5) {
      expect(toneAt(lvl + LOOP), `level ${lvl}`).toEqual(toneAt(lvl));
      expect(toneAt(lvl + 7 * LOOP), `level ${lvl}`).toEqual(toneAt(lvl));
    }
  });

  it("has no seam: into the loop and from one loop to the next, no step is bigger than the story's", () => {
    // The smoothly changing fields: `above` flips once for good (out of the smog), and a flip
    // would otherwise set the bar at "anything goes" for every color.
    const smoothPart = (t: Tone): Partial<Tone> => {
      const rest: Partial<Tone> = { ...t };
      delete rest.above;
      return rest;
    };
    const step = (lvl: number) => lookStep(smoothPart(toneAt(lvl)), smoothPart(toneAt(lvl + 0.5)));
    let story = 0;
    for (let lvl = 0; lvl < LOOP_FROM; lvl += 0.5) story = Math.max(story, step(lvl));
    expect(story, "the story changes as you climb").toBeGreaterThan(0);
    for (let k = 0; k < 3; k++) {
      const seam = LOOP_FROM + k * LOOP;
      for (let lvl = seam - 3; lvl < seam + 3; lvl += 0.5) {
        expect(step(lvl), `step at level ${lvl}`).toBeLessThanOrEqual(story);
        expect(toneAt(lvl + 0.5).above, `out of the smog at level ${lvl}`).toBe(true);
      }
    }
    // Inside the loop the night's fades replay faster than on the first pass (the moon dims in
    // about half the climb), but never in a jump.
    for (let lvl = LOOP_FROM; lvl < LOOP_FROM + LOOP; lvl += 0.5) {
      expect(step(lvl), `step at level ${lvl}`).toBeLessThanOrEqual(story * 2);
    }
  });

  it("goes somewhere: each loop climbs through a thin smog layer and back out into the night", () => {
    const night = toneAt(LOOP_FROM);
    const inside = toneAt(LOOP_FROM + LOOP / 2);
    expect(night.murkA).toBe(0);
    expect(night.strata).toBe(0);
    expect(night.moon).toBe(1);
    expect(inside.strata).toBeGreaterThan(0.9);
    expect(inside.murkA).toBeGreaterThan(0.4);
    expect(inside.moon).toBeLessThan(0.3);
    // What happened for good stays done.
    expect(inside.above).toBe(true);
    expect(inside.rain).toBe(0);
    expect(inside.beams).toBe(0);
    expect(inside.seaRise).toBe(1);
  });

  it("brings the same things past in the side lanes every loop", () => {
    const seen = (lvl: number) => {
      const s = sceneAt(390, 844, lvl, 2.5);
      const out: string[] = [];
      eachVisible(s, (d, lane) => out.push(`${lane} ${d.kind} ${d.x.toFixed(4)} ${(s.groundY - s.rise * 0.3 - d.at * s.scale * 0.7).toFixed(2)}`));
      return out;
    };
    let items = 0;
    // From once the night's last things have gone by (they leave about 30 levels after their
    // height, and the first loop leaves out what would crowd them).
    for (let lvl = LOOP_FROM + 45; lvl < LOOP_FROM + 2 * LOOP; lvl += 3) {
      const here = seen(lvl);
      items += here.length;
      expect(seen(lvl + LOOP), `level ${lvl}`).toEqual(here);
      expect(seen(lvl + 9 * LOOP), `level ${lvl}`).toEqual(here);
    }
    expect(items, "the lanes carry something").toBeGreaterThan(40);
  });

  it.each([
    [390, 844, 1],
    [375, 667, 1],
    [390, 844, 0.6],
  ])("%ix%i at zoom %s: once the smog sea has sunk out of view, whole frames repeat every LOOP levels", (W, H, z) => {
    // The loop's light starts at LOOP_FROM, but the smog sea and the spires poking through it
    // only sink away slowly, by parallax: off a phone by about level 260, off Hard's most
    // zoomed-out view by about 400. From there on every pixel repeats, the side lanes included.
    const kit = kitFor(neonCyber);
    const frame = (lvl: number) => {
      const s = sceneAt(W, H, lvl, 3.7, z);
      const ctx = context(s.cssW, s.cssH, 0.5);
      kit.world(ctx, s);
      kit.front(ctx, s);
      return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
    };
    for (let lvl = 450; lvl < 450 + LOOP; lvl += 10) {
      const a = frame(lvl);
      for (const b of [frame(lvl + LOOP), frame(lvl + 5 * LOOP)]) {
        let off = 0;
        for (let i = 0; i < a.length; i++) if (Math.abs(a[i]! - b[i]!) > 2) off++;
        expect(off, `level ${lvl}: pixels that differ a loop later`).toBe(0);
      }
    }
  });

  it("draws any height up to level 2000 without throwing, and no slower high up", () => {
    const kit = kitFor(neonCyber);
    const ctx = context(390, 844, 2);
    const time = (lvl: number) => {
      const s = sceneAt(390, 844, lvl, 4.2);
      const t0 = performance.now();
      kit.world(ctx, s);
      kit.front(ctx, s);
      return performance.now() - t0;
    };
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    time(0); // warm up
    // Low and high frames taken in turn, so whatever else the machine is doing weighs on both.
    const low: number[] = [];
    const high: number[] = [];
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 15; i++) {
        low.push(time(i * 20 + round));
        high.push(time(Math.round(300 + (i * 1700) / 14) - round * 3));
      }
    }
    // A stall (thousands of lines, or items piling up the lanes) would cost whole seconds.
    expect(Math.max(...high), "the slowest frame high up, ms").toBeLessThan(250);
    expect(median(high), "frames high up, ms").toBeLessThan(median(low) * 2 + 3);
  });
});
