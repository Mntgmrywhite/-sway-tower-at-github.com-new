import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { christmas } from "../christmas";
import { CART_LAP, carriageBackProgress, carriageProgress, props } from "./ground";
import { celestial } from "./sky";
import { context, mask, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";
import { LOOP_PERIOD, LOOP_START } from "./tone";

// Hard mode's camera zooms out (down to MIN_ZOOM) when a leaning tower's top would leave the
// screen: the scene is built for a virtual screen 1/z wider and taller at the same u, then drawn
// scaled by z. The skin must fill all of it, from the start to any height, and keep the street's
// props whole at its edges.

const ZOOMS = [1, 0.8, MIN_ZOOM] as const;
const LEVELS = [0, 4, 10, 18, 30, 50, 75, LOOP_START - 1, LOOP_START + 20, LOOP_START + 50, LOOP_START + 95, 260, 600, 2000];

describe("christmas zoomed out", () => {
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: every pixel is covered", (W, H, z) => {
    const kit = kitFor(christmas);
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, lvl * 0.29, z);
      // Drawn as the renderer does: the virtual screen scaled down by z onto the phone's.
      const ctx = context(W, H);
      ctx.scale(z, z);
      kit.world(ctx, s);
      kit.front(ctx, s);
      const data = ctx.getImageData(0, 0, W, H).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}: uncovered pixels`).toBe(0);
    }
  });

  // (Unzoomed, only the gas lamps' soft glow reaches past a phone's side edges, by design.)
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.filter((z) => z < 1).map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: at the start no street prop is cut off by a screen edge",
    (W, H, z) => {
      // Moments the carriage is round a corner, out of view (it drives in and out at the sides).
      const away = [5.1, 11.9, 5.1 + CART_LAP, 11.9 + 2 * CART_LAP];
      for (const t of away) {
        expect(carriageProgress(t) < 0 && carriageBackProgress(t) < 0, `t=${t}: the carriage is out of view`).toBe(true);
        const s = sceneAt(W, H, 0, t, z);
        const w = Math.round(s.cssW);
        const h = Math.round(s.cssH);
        const m = mask(s.cssW, s.cssH, (ctx) => props(ctx, s));
        let edge = 0;
        let seen = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!m[y * w + x]) continue;
            seen++;
            if (x === 0 || x === w - 1 || y === 0 || y === h - 1) edge++;
          }
        }
        expect(seen, "the street is drawn").toBeGreaterThan(1000);
        expect(edge, `t=${t}: prop pixels on the screen's edge`).toBe(0);
      }
    },
  );

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the loop's own sky covers the whole screen down to the horizon at every hour",
    (W, H, z) => {
      // (The base's sky under it always fills the screen, so this looks at the skin's sky alone.)
      for (let lvl = LOOP_START; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 7) {
        const s = sceneAt(W, H, lvl, 1, z);
        const ctx = context(W, H);
        ctx.scale(z, z);
        celestial(ctx, s);
        const rows = Math.min(H, Math.floor(s.horizonY * z) - 1);
        const data = ctx.getImageData(0, 0, W, rows).data;
        let gaps = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
        expect(gaps, `level ${lvl}: sky pixels the loop's sky leaves uncovered`).toBe(0);
      }
    },
  );

  it("the loop's sky fills a zoomed-out screen at every hour", () => {
    const kit = kitFor(christmas);
    const [W, H] = SIZES[0];
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += 6) {
      const s = sceneAt(W, H, lvl + 3 * LOOP_PERIOD, 1, MIN_ZOOM);
      const ctx = context(W, H);
      ctx.scale(MIN_ZOOM, MIN_ZOOM);
      kit.world(ctx, s);
      const data = ctx.getImageData(0, 0, W, H).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}`).toBe(0);
    }
  });
});
