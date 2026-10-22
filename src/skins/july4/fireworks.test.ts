import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { floorTop, landmarkLine } from "./far";
import { POLE_TOP, STEEPLE_REACH } from "./landmarks";
import { BLOOM, eachBurst, fireworks, lanceAt, RISE } from "./fireworks";
import { moonAt } from "./sky";
import { context, mask, sceneAt, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// The fireworks show, through the night of the first day and of a turn of the loop, on both
// phones, a tablet, a desktop window and zoomed out: every burst keeps to its lane (never across
// the tower's column), below the HUD's rows, on the screen, clear of the moon and above the
// steeple's cross (the left lane) and above the courthouse dome and its flag (the right lane);
// the show fires in both lanes, builds to a finale of many more shells, and by day there is
// none. The finale's lancework flag hangs in the left lane by the same rules.
// Everything it draws stays inside the reach it claims, so the geometry is what the rules are
// checked on.

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [1024, 1366, 1],
  [1440, 900, 1],
  [390, 844, 0.6],
  [375, 667, 0.6],
] as const;

function screenAt(W: number, H: number, z: number, lvl: number, t: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, t) : zoomedScene(W, H, z, lvl, t);
}

/** Night levels of the first pass and the loop's turn, through the show, its finale and its end. */
const NIGHTS = [58, 64, 70, 76, 80, 84, 88, 92, 96, 100, LOOP_START + LOOP - 40, LOOP_START + LOOP - 26];

describe("independence day's fireworks", () => {
  it.each(SCREENS)("%ix%i at zoom %s: every burst keeps to its lane, under the HUD, off the moon and above the steeple and the dome", (W, H, z) => {
    let bursts = 0;
    const sides = new Set<number>();
    for (const lvl of NIGHTS) {
      for (let t = 0; t < 40; t += 0.37) {
        const s = screenAt(W, H, z, lvl, t);
        const tone = toneOf(s);
        const floor = floorTop(s, level(s));
        const cx = s.cssW / 2;
        const moon = moonAt(s);
        const flagTop = landmarkLine(s) - s.u * POLE_TOP;
        const crossTop = landmarkLine(s) - s.u * STEEPLE_REACH;
        eachBurst(s, tone, floor, (b) => {
          bursts++;
          sides.add(b.side);
          const what = `level ${lvl}, t=${t.toFixed(2)}: a burst at (${Math.round(b.x)}, ${Math.round(b.y)}) reaching ${Math.round(b.reach)}`;
          expect(Math.abs(b.x - cx) - b.reach, `${what}: in the tower's column`).toBeGreaterThanOrEqual(s.u * 0.25);
          expect(b.x - b.reach, `${what}: off the left`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.reach, `${what}: off the right`).toBeLessThanOrEqual(s.cssW);
          expect(b.y - b.reach, `${what}: in the HUD`).toBeGreaterThanOrEqual(s.cssH * 0.3 - 1);
          expect(b.y + b.reach, `${what}: in the cloud floor`).toBeLessThanOrEqual(floor);
          if (b.side < 0 && tone.moon > 0) expect(Math.hypot(b.x - moon.x, b.y - moon.y), `${what}: over the moon`).toBeGreaterThan(b.reach + moon.r);
          if (b.side > 0) expect(b.y + b.reach, `${what}: over the courthouse dome and its flag`).toBeLessThanOrEqual(flagTop);
          else expect(b.y + b.reach, `${what}: over the steeple`).toBeLessThanOrEqual(crossTop);
        });
      }
    }
    expect(bursts, "shells go up").toBeGreaterThan(200);
    expect([...sides].sort()).toEqual([-1, 1]);
  }, 60_000);

  it.each(SIZES)("%ix%i: what a shell draws stays inside the reach it claims, and out of the column", (W, H) => {
    const K = 0.5;
    const w = Math.round(W * K);
    let checked = 0;
    for (const lvl of [66, 80, 92]) {
      for (let t = 0.1; t < 30; t += 0.53) {
        const s = sceneAt(W, H, lvl, t);
        const tone = toneOf(s);
        const floor = floorTop(s, level(s));
        const reach: { x: number; y: number; r: number }[] = [];
        eachBurst(s, tone, floor, (b, local) => {
          // A rocket still climbing is below its burst, on the way up from the floor.
          reach.push(local < RISE ? { x: b.x, y: (b.y + floor) / 2, r: Math.max(b.reach, (floor - b.y) / 2 + s.u * 0.05) } : { x: b.x, y: b.y, r: b.reach });
        });
        if (!reach.length) continue;
        checked++;
        // The finale's lancework flag burns in its own box: its pole, the flag and the sparks dropping from its foot.
        const lance = { ...lanceAt(s, tone) };
        const inLance = (x: number, y: number) =>
          lance.on > 0.02 && x >= lance.x - s.u * 0.006 - 2 && x <= lance.x + lance.w + 2 && y >= lance.y - s.u * 0.012 - 2 && y <= lance.y + lance.h + s.u * 0.05 + 2;
        const m = mask(W, H, (ctx) => fireworks(ctx, s, tone, floor), K);
        const c0 = (s.cssW / 2 - s.u * 0.25) * K;
        const c1 = (s.cssW / 2 + s.u * 0.25) * K;
        let column = 0;
        let outside = 0;
        for (let k = 0; k < m.length; k++) {
          if (!m[k]) continue;
          const x = (k % w) / K;
          const y = Math.floor(k / w) / K;
          if (x * K >= c0 && x * K <= c1) column++;
          if (!reach.some((r) => Math.hypot(x - r.x, y - r.y) <= r.r + 2) && !inLance(x, y)) outside++;
        }
        expect(column, `level ${lvl}, t=${t.toFixed(2)}: pixels in the tower's column`).toBe(0);
        expect(outside, `level ${lvl}, t=${t.toFixed(2)}: pixels outside every burst's reach`).toBe(0);
      }
    }
    expect(checked).toBeGreaterThan(20);
  }, 60_000);

  it.each(SCREENS)("%ix%i at zoom %s: the finale's lancework flag hangs in the left lane, under the HUD and the moon, above the steeple, on the screen", (W, H, z) => {
    let burns = 0;
    for (const lvl of [74, 78, 82, 86, 90, LOOP_START + LOOP - 30]) {
      for (let t = 0; t < 18; t += 0.5) {
        const s = screenAt(W, H, z, lvl, t);
        const tone = toneOf(s);
        const l = lanceAt(s, tone);
        if (l.on <= 0.02) continue;
        burns++;
        const what = `level ${lvl}, t=${t}`;
        const moon = moonAt(s);
        expect(l.x - s.u * 0.006, `${what}: off the left`).toBeGreaterThanOrEqual(0);
        expect(l.x + l.w, `${what}: in the tower's column`).toBeLessThanOrEqual(s.cssW / 2 - s.u * 0.25);
        expect(l.y - s.u * 0.012, `${what}: in the HUD`).toBeGreaterThanOrEqual(s.cssH * 0.3 - 1);
        if (tone.moon > 0) expect(l.y - s.u * 0.012, `${what}: over the moon`).toBeGreaterThan(moon.y + moon.r);
        expect(l.y + l.h + s.u * 0.05, `${what}: over the steeple`).toBeLessThanOrEqual(landmarkLine(s) - s.u * STEEPLE_REACH);
      }
    }
    expect(burns, "the lancework flag burns through the finale").toBeGreaterThan(20);
  });

  it("builds from a few shells at dusk to a finale of many, and is over before the stars' calm", () => {
    const count = (lvl: number) => {
      let n = 0;
      for (let t = 0; t < 60; t += 0.25) {
        const s = sceneAt(390, 844, lvl, t);
        eachBurst(s, toneOf(s), floorTop(s, level(s)), (_b, local) => {
          if (local >= RISE && local < RISE + BLOOM) n++;
        });
      }
      return n;
    };
    expect(count(30)).toBe(0);
    expect(count(50)).toBe(0);
    const early = count(60);
    const full = count(68);
    const finale = count(82);
    expect(early).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(early);
    expect(finale).toBeGreaterThan(full * 2);
    expect(count(106)).toBe(0);
    expect(count(LOOP_START + 4)).toBe(0);
    // The same show comes round in the loop.
    expect(count(82 + LOOP)).toBe(finale);
  });

  it("the context is left as it found it", () => {
    const s = sceneAt(390, 844, 82, 7.3);
    const ctx = context(390, 844);
    ctx.globalAlpha = 1;
    fireworks(ctx, s, toneOf(s), floorTop(s, level(s)));
    expect(ctx.globalAlpha).toBe(1);
  });
});
