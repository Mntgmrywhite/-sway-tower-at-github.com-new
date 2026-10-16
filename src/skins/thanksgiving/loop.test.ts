import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { BLOCK_HEIGHT } from "../../config";
import { thanksgiving } from "../thanksgiving";
import type { Scene } from "../skin";
import { HUD_BAND, HUD_LEFT, HUD_RIGHT, moonSpot, sunSpot, type Body } from "./sky";
import { LOOP_LEVELS, LOOP_START } from "./story";
import { context, PHONES, pixels, sceneAt, SCREENS, ZOOMED } from "./test-scene";

// The looping day as drawn. Handing over from the first pass to the loop shows nothing; once the
// hollow has sunk out of view, the skin's own layers repeat exactly every loop; the sun and the
// moon keep to their side lanes (out of the tower's column, the HUD and the slider's run, never
// cut off by a screen edge) through two whole loops, on phones and zoomed out; and the whole
// scene draws at any height without trouble.

const A = LOOP_START;
const P = LOOP_LEVELS;
const kit = kitFor(thanksgiving);

/** Everything behind the tower and in front of it, as the renderer draws the scenery. */
function scenery(ctx: CanvasRenderingContext2D, s: Scene): void {
  kit.world(ctx, s);
  kit.front(ctx, s);
}

/** Only the skin's own layers (the base world's drifting height clouds left out). */
function ownLayers(ctx: CanvasRenderingContext2D, s: Scene): void {
  thanksgiving.celestial!(ctx, s);
  thanksgiving.sky!(ctx, s);
  thanksgiving.far!(ctx, s);
  thanksgiving.ground!(ctx, s);
}

/** Largest channel difference between two frames, and how many pixels differ at all. */
function diff(a: Uint8ClampedArray, b: Uint8ClampedArray): { max: number; count: number } {
  let max = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i]! - b[i]!);
    if (d > 0) count++;
    if (d > max) max = d;
  }
  return { max, count };
}

describe("thanksgiving looping day", () => {
  it.each(SCREENS)("%ix%i (u %i): stepping into the loop changes nothing on screen", (W, H, u) => {
    for (const t of [0, 2.9, 11.3]) {
      const before = pixels(W, H, (ctx) => scenery(ctx, sceneAt(W, H, A - 1e-4, t, u)));
      const after = pixels(W, H, (ctx) => scenery(ctx, sceneAt(W, H, A, t, u)));
      const d = diff(before, after);
      // A ten-thousandth of a level moves the parallax layers by a hair at most.
      expect(d.count, `t=${t}: pixels that change`).toBeLessThan(W * H * 0.002);
    }
  });

  it.each(PHONES)("%ix%i: past the hollow, the skin's layers repeat every loop", (W, H) => {
    for (let lvl = 2 * P + A + 3; lvl < 3 * P + A; lvl += 9.5) {
      for (const t of [0.4, 7.7]) {
        const a = pixels(W, H, (ctx) => ownLayers(ctx, sceneAt(W, H, lvl, t)));
        for (const k of [1, 4]) {
          const b = pixels(W, H, (ctx) => ownLayers(ctx, sceneAt(W, H, lvl + k * P, t)));
          const d = diff(a, b);
          expect(d.max, `level ${lvl} vs ${k} loops on, t=${t}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it.each(SCREENS)("%ix%i (u %i): the sun and moon keep to their lanes through two loops", (W, H, u) => {
    let sunSeen = 0;
    let moonSeen = 0;
    let sunAlone = 0;
    let moonAlone = 0;
    for (let lvl = A; lvl <= A + 2 * P; lvl += 0.5) {
      const s = sceneAt(W, H, lvl, 0, u);
      const column0 = s.baseX - s.u * 0.05;
      const column1 = s.baseX + s.baseW + s.u * 0.05;
      const check = (b: Body, name: string) => {
        if (!b.on) return;
        const at = `${name} at level ${lvl}`;
        // Whole: never cut off by a screen edge, the bottom one included (high in the sky there
        // is no horizon to go behind: a body fades in and out at the low end of its lane).
        expect(b.x - b.reach, at).toBeGreaterThanOrEqual(0);
        expect(b.x + b.reach, at).toBeLessThanOrEqual(W);
        expect(b.y - b.reach, at).toBeGreaterThanOrEqual(0);
        expect(b.y + b.reach, at).toBeLessThanOrEqual(H);
        // Beside the tower, never behind it.
        expect(b.x + b.reach <= column0 || b.x - b.reach >= column1, `${at}: in the tower's column`).toBe(true);
        // Out of the HUD: below its band, or outside its columns.
        const clearOfHud = b.y - b.reach >= H * HUD_BAND || b.x + b.reach <= W * HUD_LEFT || b.x - b.reach >= W * HUD_RIGHT;
        expect(clearOfHud, `${at}: in the HUD`).toBe(true);
      };
      const sun = sunSpot(s);
      check(sun, "sun");
      if (sun.on) {
        sunSeen++;
        // Clear of the slider's run along the tower top (at 38% down, one bar tall).
        if (sun.y < H) expect(sun.y - sun.reach, `sun at level ${lvl}: on the slider's run`).toBeGreaterThan(H * 0.38 + BLOCK_HEIGHT * s.scale);
      }
      const sunOn = sun.on;
      const moon = moonSpot(s);
      check(moon, "moon");
      if (moon.on) moonSeen++;
      if (sunOn && !moon.on) sunAlone++;
      if (moon.on && !sunOn) moonAlone++;
    }
    // Both come and go in every loop: a day with the sun alone, a night with the moon alone.
    expect(sunSeen).toBeGreaterThan(P * 0.6);
    expect(moonSeen).toBeGreaterThan(P * 0.6);
    expect(sunAlone).toBeGreaterThan(P * 0.2);
    expect(moonAlone).toBeGreaterThan(P * 0.2);
  });

  it.each(SCREENS)("%ix%i (u %i): the sun and moon come and go by fading, never popping or jumping", (W, H, u) => {
    const spots = [
      ["sun", sunSpot],
      ["moon", moonSpot],
    ] as const;
    for (const [name, spot] of spots) {
      let prev: Body | null = null;
      let full = 0;
      for (let lvl = A; lvl <= A + 2 * P; lvl += 0.5) {
        const b = { ...spot(sceneAt(W, H, lvl, 0, u)) };
        const at = `${name} at level ${lvl}`;
        expect(b.alpha, at).toBeGreaterThanOrEqual(0);
        expect(b.alpha, at).toBeLessThanOrEqual(1);
        if (b.on && b.alpha === 1) full++;
        if (prev) {
          // Showing up or going away only while (all but) invisible.
          if (b.on !== prev.on) expect(b.on ? b.alpha : prev.alpha, `${at}: pops`).toBeLessThan(0.02);
          if (b.on && prev.on) {
            expect(Math.abs(b.alpha - prev.alpha), `${at}: fades too fast`).toBeLessThan(0.15);
            expect(Math.abs(b.y - prev.y), `${at}: jumps`).toBeLessThan(H * 0.015);
          }
        }
        prev = b;
      }
      // ...and in between, it shows fully for a good part of each loop.
      expect(full, `${name}: half levels at full strength`).toBeGreaterThan(P * 0.5);
    }
  });

  it("draws any height, up to 2000 levels, within budget", () => {
    const times: number[] = [];
    for (const [W, H, u] of SCREENS) {
      const ctx = context(W, H);
      for (let lvl = 0; lvl <= 2000; lvl += 37) {
        const s = sceneAt(W, H, lvl, lvl * 0.13, u);
        const t0 = performance.now();
        expect(() => scenery(ctx, s)).not.toThrow();
        // Reading a pixel back makes the canvas finish drawing.
        ctx.getImageData(0, 0, 1, 1);
        if (W === 390) times.push(performance.now() - t0);
      }
    }
    // Offscreen at 1x, so far below a phone's frame; a loose bound that only trips on a blow-up.
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 2)]!, "median ms per frame").toBeLessThan(25);
  });

  it("covers the whole zoomed-out screen, from the start up through two loops", () => {
    const { W, H, u } = ZOOMED;
    for (const lvl of [0, 6, 13, 20, 30, 45, 60, 75, 90, 110, 130, 160, 200, 250, 300, 330]) {
      const px = pixels(W, H, (ctx) => scenery(ctx, sceneAt(W, H, lvl, 1.7, u)));
      let gaps = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}: pixels not covered`).toBe(0);
    }
  });
});
