import { describe, expect, it } from "vitest";
import { toyBlock } from "../toyblock";
import { context, MIN_ZOOM, PHONE, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START } from "./tone";

// Hard's camera zooms out (down to MIN_ZOOM) when a leaning tower's top would leave the screen:
// the renderer builds the scene for a virtual screen 1/zoom times the phone's size with the
// phone's own u and scale, then draws it scaled down. Toy Kingdom paints the whole backdrop
// itself, so on such a view it must still cover every pixel: no gap at any edge, from the start
// through the climb and round the loop. (The lanes, calm and layout tests run on the most
// zoomed-out view too.)

/** Every other level through the climb (the land, the sea rising over it and falling away), then round the loop. */
const LEVELS = [...Array.from({ length: 41 }, (_, i) => i * 2), 100, LOOP_START + 20, LOOP_START + 60, LOOP_START + LOOP + 5, 900];

describe("toy kingdom zoomed out", () => {
  const views = [
    ...SIZES.map(([W, H]) => [W, H, Math.min(W, H * 0.6), 1] as const),
    ...[0.8, MIN_ZOOM].map((z) => [Math.round(PHONE[0] / z), Math.round(PHONE[1] / z), Math.min(PHONE[0], PHONE[1] * 0.6), z] as const),
  ];
  it.each(views)("%ix%i (u %i, zoom %s): the backdrop and the shelf cover the whole screen", { timeout: 30_000 }, (W, H, u) => {
    for (const lvl of LEVELS) {
      for (const t of [0, 6.3]) {
        const ctx = context(W, H);
        const s = sceneAt(W, H, lvl, t, u);
        toyBlock.ground!(ctx, s);
        toyBlock.foreground!(ctx, s);
        const data = ctx.getImageData(0, 0, W, H).data;
        let gaps = 0;
        let first = -1;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i]! < 255) {
            gaps++;
            if (first < 0) first = (i - 3) / 4;
          }
        }
        expect(gaps, `level ${lvl}, t=${t}: uncovered pixels (first at x ${first % W}, y ${Math.floor(first / W)})`).toBe(0);
      }
    }
  });
});
