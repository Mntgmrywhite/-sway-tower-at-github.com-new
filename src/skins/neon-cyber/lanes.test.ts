import { describe, expect, it } from "vitest";
import { drawDrifter, eachVisible, type Drifter } from "./lanes";
import { moonAt } from "./sky";
import { mask, overlap, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_FROM, toneOf } from "./tone";

// Everything hanging in the side lanes, all the way up (through the story and two rounds of its
// loop), on a tall and a short phone: nothing enters the tower's column or touches a side of the
// screen, nothing overlaps, and once the moon is out above the smog only wisps of smog pass in
// front of it.

/** Every other level from the street through the story and two full loops of it (tone.ts). */
const LEVELS = Array.from({ length: Math.ceil((LOOP_FROM + 2 * LOOP + 30) / 2) + 1 }, (_, i) => i * 2);
const TIMES = [0, 5.3] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;
/** These walk every other level through two loops: give them time on a busy machine (ms). */
const SLOW = 60_000;

/** Pixels of a mask inside a circle (in full-size coordinates). */
function inCircle(m: Uint8Array, w: number, cx: number, cy: number, r: number): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = (i % w) / K;
    const y = Math.floor(i / w) / K;
    if (Math.hypot(x - cx, y - cy) < r) n++;
  }
  return n;
}

describe("neon cyberpunk lanes", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: lanes stay clear all the way up", (W, H, t) => {
    const w = Math.round(W * K);
    let seen = 0;
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, t);
      const tone = toneOf(s);
      const items: { d: Drifter; lane: number; m: Uint8Array }[] = [];
      eachVisible(s, (d, lane) => items.push({ d, lane, m: mask(W, H, (ctx) => drawDrifter(ctx, s, tone, d), K) }));
      seen += items.length;
      const c0 = (s.cssW / 2 - s.u * 0.25) * K;
      const c1 = (s.cssW / 2 + s.u * 0.25) * K;
      const moon = moonAt(s);
      items.forEach(({ d, lane, m }, i) => {
        const what = `level ${lvl}: ${d.kind} at ${d.at}`;
        let column = 0;
        let edge = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = k % w;
          if (x >= c0 && x <= c1) column++;
          if (x === 0 || x === w - 1) edge++;
        }
        expect(column, `${what}: pixels in the tower's column`).toBe(0);
        expect(edge, `${what}: pixels on a side of the screen`).toBe(0);
        for (let j = i + 1; j < items.length; j++) {
          const other = items[j]!;
          expect(overlap(m, other.m), `${what} overlaps ${other.d.kind} at ${other.d.at}`).toBe(0);
        }
        if (d.kind !== "wisp" && lane === 0 && tone.moon > 0) {
          expect(inCircle(m, w, moon.x, moon.y, moon.r * 1.15), `${what} crosses the moon`).toBe(0);
        }
      });
    }
    expect(seen, "the lanes carry something").toBeGreaterThan(100);
  }, SLOW);
});
