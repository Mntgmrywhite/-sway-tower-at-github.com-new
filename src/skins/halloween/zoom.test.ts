import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import { LAND, TAKE_OFF } from "./flight";
import { graveyard } from "./graveyard";
import { piles } from "./leaves";
import { flyers, moon } from "./sky";
import { context, mask, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";
import { LOOP_PERIOD, LOOP_START } from "./tone";

// Hard mode's camera zooms out (down to MIN_ZOOM) when a leaning tower's top would leave the
// screen: the scene is built for a virtual screen 1/z wider and taller at the same u, then drawn
// scaled by z. Halloween must fill all of it, from the start to any height, and keep its props
// whole at its edges.

const ZOOMS = [1, 0.8, MIN_ZOOM] as const;
const LEVELS = [0, 4, 10, 18, 30, 50, 75, 95, LOOP_START - 1, LOOP_START + 25, LOOP_START + 50, LOOP_START + 80, 400, 2000];

/** Pixels a drawing puts on the virtual screen's edges, and how many it draws at all. */
function edges(s: ReturnType<typeof sceneAt>, draw: (ctx: CanvasRenderingContext2D) => void): { edge: number; seen: number } {
  const w = Math.round(s.cssW);
  const h = Math.round(s.cssH);
  const m = mask(s.cssW, s.cssH, draw);
  let edge = 0;
  let seen = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      seen++;
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) edge++;
    }
  }
  return { edge, seen };
}

describe("halloween zoomed out", () => {
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: every pixel is covered", (W, H, z) => {
    const kit = kitFor(halloween);
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

  it("the loop's sky fills a zoomed-out screen all the way round", () => {
    const kit = kitFor(halloween);
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

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: at the start nothing is cut off by an edge",
    (W, H, z) => {
      // Moments with the crow on its stone, taking off, round the moon, and coming back in.
      for (const t of [1, TAKE_OFF + 0.6, TAKE_OFF + 5.1, TAKE_OFF + 7, LAND - 0.8]) {
        const s = sceneAt(W, H, 0, t, z);
        const field = edges(s, (ctx) => graveyard(ctx, s));
        expect(field.seen, "the town and the churchyard are drawn").toBeGreaterThan(3000);
        expect(field.edge, `t=${t}: town or churchyard on the screen's edge`).toBe(0);
        expect(edges(s, (ctx) => moon(ctx, s)).edge, `t=${t}: the moon on the edge`).toBe(0);
        expect(edges(s, (ctx) => flyers(ctx, s)).edge, `t=${t}: a crow on the edge`).toBe(0);
        expect(edges(s, (ctx) => piles(ctx, s)).edge, `t=${t}: a leaf pile on the edge`).toBe(0);
      }
    },
  );
});
