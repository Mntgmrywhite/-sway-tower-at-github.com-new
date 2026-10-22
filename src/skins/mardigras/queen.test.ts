import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { floorTop } from "./far";
import { carnivalQueen, queenAt, queenUp } from "./queen";
import { lowestBurst, moonAt } from "./sky";
import { mask, sceneAt, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneAtLevel, toneOf } from "./tone";

// The Carnival Queen, the night parade's great float head standing out of the clouds in the left
// lane (queen.ts): she rises at nightfall and sinks before the dawn by height alone, so the
// story's loop comes round with no seam; she is never up while the sun is in the sky (the lane is
// the sun's by day); and whenever she is up she is whole on screen, out of the tower's column with
// all her motion, clear of the moon, and under the fireworks, on phones, tablets, a desktop window
// and zoomed out.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [834, 1194, 1],
  [1024, 1366, 1],
  [1440, 900, 1],
  [390, 844, 0.8],
  [390, 844, 0.6],
  [375, 667, 0.6],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** Moments over her tilt, her plumes' trembling, the beads' swing and the bulbs' chase. */
const TIMES = [0, 1.9, 4.4, 7.3, 11.6] as const;
const TOP = LOOP_START + LOOP * 2 + 10;

describe("mardi gras carnival queen", () => {
  it("rises at nightfall, stands all night, and sinks before every dawn: smoothly, and the same on every turn of the loop", () => {
    expect(queenUp(30)).toBe(0);
    expect(queenUp(70)).toBe(1);
    expect(queenUp(LOOP_START - 1)).toBe(1);
    let up = 0;
    let down = 0;
    for (let lvl = 0; lvl < TOP; lvl += 0.25) {
      const a = queenUp(lvl);
      const b = queenUp(lvl + 0.25);
      expect(Math.abs(b - a), `level ${lvl}: no jump`).toBeLessThan(0.05);
      if (b > a) up++;
      if (b < a) down++;
      if (lvl >= LOOP_START) expect(queenUp(lvl + LOOP), `level ${lvl}`).toBeCloseTo(a, 9);
      // The left lane is the sun's by day: she is down in the clouds whenever the sun is in the sky.
      if (toneAtLevel(lvl).sunSet < 1) expect(a, `level ${lvl}: up while the sun is`).toBe(0);
    }
    expect(up, "she rises").toBeGreaterThan(10);
    expect(down, "she sinks").toBeGreaterThan(10);
  });

  it.each(SCREENS)("%ix%i at zoom %s: whole on screen, out of the tower's column, clear of the moon and under the fireworks", (W0, H0, z) => {
    const K = 0.5;
    let seen = 0;
    for (let lvl = 40; lvl < TOP; lvl += 3) {
      for (const t of TIMES) {
        const s = screenAt(W0, H0, z, lvl, t);
        const floor = floorTop(s, level(s));
        const q = queenAt(s);
        if (q.up <= 0) continue;
        const tone = toneOf(s);
        const m = mask(s.cssW, s.cssH, (ctx) => carnivalQueen(ctx, s, tone, floor), K);
        const w = Math.round(s.cssW * K);
        const c0 = Math.floor((s.baseX - s.u * 0.05) * K);
        const moon = moonAt(s);
        /** The lowest any burst reaches (sky.ts: its lowest spot, plus its reach). */
        const bursts = lowestBurst(s);
        let drawn = 0;
        let top = Infinity;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          drawn++;
          const x = i % w;
          const y = Math.floor(i / w);
          top = Math.min(top, y / K);
          const what = `level ${lvl}, t=${t}`;
          if (x >= c0) expect.fail(`${what}: in the tower's column at x=${x / K}`);
          if (x === 0) expect.fail(`${what}: touches the screen's side`);
          if (tone.moon > 0 && Math.hypot((x + 0.5) / K - moon.x, (y + 0.5) / K - moon.y) < moon.r + 2) expect.fail(`${what}: over the moon`);
        }
        if (drawn === 0) continue;
        seen++;
        if (tone.fireworks > 0) expect(top, `level ${lvl}, t=${t}: her plumes' tips under the lowest burst`).toBeGreaterThan(bursts);
      }
    }
    expect(seen, "she is seen").toBeGreaterThan(30);
  }, 120_000);
});
