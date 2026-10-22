import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { floorTop, landmarkLine } from "./far";
import { POLE_TOP, STEEPLE_REACH } from "./landmarks";
import { BLOOM, eachBurst, eachPieceBox, fireworks, lanceAt, RISE, type Burst } from "./fireworks";
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

/** How far a point lies from a burst's reach (0 inside it). */
function boxToPoint(b: Burst, x: number, y: number): number {
  const px = Math.min(Math.max(x, b.x - b.across), b.x + b.across);
  const py = Math.min(Math.max(y, b.y - b.up), b.y + b.down);
  return Math.hypot(x - px, y - py);
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
          const what = `level ${lvl}, t=${t.toFixed(2)}: a burst at (${Math.round(b.x)}, ${Math.round(b.y)}) reaching ${Math.round(b.across)} across, ${Math.round(b.up)} up, ${Math.round(b.down)} down`;
          expect(Math.abs(b.x - cx) - b.across, `${what}: in the tower's column`).toBeGreaterThanOrEqual(s.u * 0.25);
          expect(b.x - b.across, `${what}: off the left`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.across, `${what}: off the right`).toBeLessThanOrEqual(s.cssW);
          // The HUD: its corner buttons (the top 15% of the screen at the sides); its rows of text keep to the column, checked above.
          expect(b.y - b.up, `${what}: in the HUD's corner buttons`).toBeGreaterThanOrEqual(s.cssH * 0.15 - 1);
          expect(b.y + b.down, `${what}: in the cloud floor`).toBeLessThanOrEqual(floor);
          if (b.side < 0 && tone.moon > 0) expect(boxToPoint(b, moon.x, moon.y), `${what}: over the moon`).toBeGreaterThan(moon.r);
          if (b.side > 0) expect(b.y + b.down, `${what}: over the courthouse dome and its flag`).toBeLessThanOrEqual(flagTop);
          else expect(b.y + b.down, `${what}: over the steeple`).toBeLessThanOrEqual(crossTop);
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
        // Every box something of the show draws inside: a burst's reach, or (a rocket still
        // climbing) the strip from its burst down to where it climbs from, as wide as it wanders;
        // and the finale's fountains and Roman candles.
        const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
        eachBurst(s, tone, floor, (b, local) => {
          if (local < RISE) boxes.push({ x0: b.x - b.wander - s.u * 0.01, y0: b.y - s.u * 0.01, x1: b.x + b.wander + s.u * 0.01, y1: b.launchY });
          else boxes.push({ x0: b.x - b.across, y0: b.y - b.up, x1: b.x + b.across, y1: b.y + b.down });
        });
        eachPieceBox(s, tone, floor, (p) => boxes.push({ x0: p.x - p.across, y0: p.top, x1: p.x + p.across, y1: p.foot }));
        if (!boxes.length) continue;
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
          if (!boxes.some((b) => x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 2) && !inLance(x, y)) outside++;
        }
        expect(column, `level ${lvl}, t=${t.toFixed(2)}: pixels in the tower's column`).toBe(0);
        expect(outside, `level ${lvl}, t=${t.toFixed(2)}: pixels outside every burst's reach`).toBe(0);
      }
    }
    expect(checked).toBeGreaterThan(20);
  }, 60_000);

  it.each(SCREENS)("%ix%i at zoom %s: the finale's fountains and Roman candles keep to the lanes, under the landmarks' tops, off the moon, on the screen", (W, H, z) => {
    // The finale's wall along the skyline: out in both lanes, clear of the column, never above
    // the lane's landmark (so it never meets a burst, which keeps above it), never near the moon.
    let pieces = 0;
    const sides = new Set<number>();
    for (const lvl of [74, 78, 82, 86, 90, LOOP_START + LOOP - 30]) {
      for (let t = 0; t < 12; t += 0.7) {
        const s = screenAt(W, H, z, lvl, t);
        const tone = toneOf(s);
        const floor = floorTop(s, level(s));
        const cx = s.cssW / 2;
        const moon = moonAt(s);
        const line = landmarkLine(s);
        eachPieceBox(s, tone, floor, (p) => {
          pieces++;
          const side = p.x < cx ? -1 : 1;
          sides.add(side);
          const what = `level ${lvl}, t=${t.toFixed(1)}: a piece at ${Math.round(p.x)} from ${Math.round(p.foot)} up to ${Math.round(p.top)}`;
          expect(Math.abs(p.x - cx) - p.across, `${what}: in the tower's column`).toBeGreaterThanOrEqual(s.u * 0.25);
          expect(p.x - p.across, `${what}: off the left`).toBeGreaterThanOrEqual(0);
          expect(p.x + p.across, `${what}: off the right`).toBeLessThanOrEqual(s.cssW);
          expect(p.top, `${what}: above its lane's landmark`).toBeGreaterThanOrEqual(line - s.u * (side > 0 ? POLE_TOP : STEEPLE_REACH) - s.u * 0.02);
          expect(p.top, `${what}: in the HUD`).toBeGreaterThanOrEqual(s.cssH * 0.3);
          if (tone.moon > 0) expect(Math.hypot(Math.max(0, Math.abs(moon.x - p.x) - p.across), Math.max(0, p.top - moon.y)), `${what}: over the moon`).toBeGreaterThan(moon.r);
        });
      }
    }
    expect(pieces, "the finale's wall burns").toBeGreaterThan(50);
    expect([...sides].sort()).toEqual([-1, 1]);
  });

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
