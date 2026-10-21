import { describe, expect, it, vi } from "vitest";
import { kitFor } from "../../base/style";
import { WORLD_WIDTH, BASE_WIDTH } from "../../config";
import { valentines } from "../valentines";
import type { Scene } from "../skin";
import { floorTop } from "./far";
import { MOON_REACH, moonAt, SUN_REACH, sunAt } from "./sky";
import { context, sceneAt, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";

// The frame down the sky's sides (border.ts) belongs to the sky: the sun and the moon hang in
// front of it in their halo medallions, so nothing of it ever shows over either (the owner's rule
// that nothing passes over the sun or the moon), and it keeps to the screen's sides, out of the
// playfield where the slider sweeps and the tower stands. Here the whole backdrop is drawn with
// the frame and without it (border.ts's `frame` switched off), from the ground through a whole
// turn of the loop, on the phones, a tablet, a wide window and a phone zoomed out: inside the
// sun's and the moon's halos and across the playfield the two are the same to the pixel, and
// elsewhere the frame does show (and the moon, once fully risen, hides it completely).

const flags = vi.hoisted(() => ({ frame: true }));
vi.mock("./border", async (importOriginal) => {
  const border = await importOriginal<typeof import("./border")>();
  return { ...border, frame: (...a: Parameters<typeof border.frame>) => (flags.frame ? border.frame(...a) : undefined) };
});

const SCREENS = [
  [390, 844, 1],
  [375, 667, 1],
  [768, 1024, 1],
  [1440, 900, 1],
  [390, 844, 0.6],
] as const;
/** Drawn at half size, every STEP levels, to keep this quick. */
const K = 0.5;
const STEP = 2.5;
const TOP = LOOP_START + LOOP + 2;
const kit = kitFor(valentines);

function screenAt(W: number, H: number, z: number, lvl: number): Scene {
  return z === 1 ? sceneAt(W, H, lvl, 4.2) : zoomedScene(W, H, z, lvl, 4.2);
}

function backdrop(s: Scene, withFrame: boolean): Uint8ClampedArray {
  flags.frame = withFrame;
  const ctx = context(s.cssW, s.cssH, K);
  kit.world(ctx, s);
  flags.frame = true;
  return ctx.getImageData(0, 0, Math.round(s.cssW * K), Math.round(s.cssH * K)).data;
}

describe("valentine's frame", () => {
  it.each(SCREENS)("%ix%i at zoom %s: never over the sun or the moon, never in the playfield", (W, H, z) => {
    let shown = 0;
    let sunUp = 0;
    let moonUp = 0;
    for (let lvl = 0; lvl <= TOP; lvl += STEP) {
      const s = screenAt(W, H, z, lvl);
      const tone = toneOf(s);
      const a = backdrop(s, true);
      const b = backdrop(s, false);
      const w = Math.round(s.cssW * K);
      const h = Math.round(s.cssH * K);
      const sun = tone.sunSet < 1 ? sunAt(s, tone, floorTop(s, level(s))) : null;
      // (While the moon fades in at dusk and out at dawn, its medallion is see-through, and the
      // frame behind it shows through as it should.)
      const moon = tone.moon >= 1 ? moonAt(s) : null;
      if (sun) sunUp++;
      if (moon) moonUp++;
      // The playfield: the slider's whole sweep, the tower's column inside it.
      const field0 = s.baseX - ((WORLD_WIDTH - BASE_WIDTH) / 2) * s.scale;
      const field1 = field0 + WORLD_WIDTH * s.scale;
      let differ = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue;
          differ++;
          const px = (x + 0.5) / K;
          const py = (y + 0.5) / K;
          const where = `level ${lvl}, (${px.toFixed(0)}, ${py.toFixed(0)})`;
          expect(px > field0 && px < field1, `${where}: the frame shows in the playfield`).toBe(false);
          if (sun) expect(Math.hypot(px - sun.x, py - sun.y) < sun.r * SUN_REACH - 1 / K, `${where}: the frame shows over the sun`).toBe(false);
          if (moon) expect(Math.hypot(px - moon.x, py - moon.y) < moon.r * MOON_REACH - 1 / K, `${where}: the frame shows over the moon`).toBe(false);
        }
      }
      if (differ > 0) shown++;
    }
    expect(sunUp, "the sun is up at many of these heights").toBeGreaterThan(15);
    expect(moonUp, "the moon is up at many of these heights").toBeGreaterThan(15);
    expect(shown, "the frame shows at every height").toBe(Math.floor(TOP / STEP) + 1);
  }, 120_000);
});
