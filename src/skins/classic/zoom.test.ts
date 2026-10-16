import { describe, expect, it } from "vitest";
import { classic } from "../classic";
import { drawDrifter, eachVisible } from "./drift";
import { islandBody, islet, kite } from "./island";
import { context, mask, sceneAt, SIZES } from "./test-scene";
import { toneOf } from "./tone";

// Hard mode's camera zooms the whole frame out (down to 0.6) when a leaning tower's top would
// leave the screen: the scene is built for a virtual screen 1/zoom as wide and tall at the same
// u and scale, then drawn scaled down. Sky Islands must hold up there too, from the start
// through the loop: the backdrop covers every pixel of the virtual screen (no gap at any edge),
// and nothing in the lanes or on the home island is cut off by its edges.

const ZOOMS = [0.6, 0.78] as const;
const LEVELS = [0, 12, 20, 26, 30, 40, 60, 80, 100, 120, 140, 170, 230, 400] as const;

describe("classic zoomed out", () => {
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: the backdrop fills the screen", (W, H, z) => {
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, 3.1, z);
      const w = Math.round(s.cssW);
      const h = Math.round(s.cssH);
      const ctx = context(w, h);
      classic.ground!(ctx, s);
      classic.foreground!(ctx, s);
      const data = ctx.getImageData(0, 0, w, h).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}: uncovered pixels`).toBe(0);
    }
  });

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: nothing is cut off at the edges", (W, H, z) => {
    const K = 0.5;
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, 3.1, z);
      const tone = toneOf(s);
      const w = Math.round(s.cssW * K);
      const h = Math.round(s.cssH * K);
      const draws: [string, (ctx: CanvasRenderingContext2D) => void][] = [
        ["kite", (ctx) => kite(ctx, s)],
        ["island", (ctx) => islandBody(ctx, s)],
        ["islet", (ctx) => islet(ctx, s)],
      ];
      eachVisible(s, (d, _lane, at) => draws.push([`${d.kind} at ${Math.round(at)}`, (ctx) => drawDrifter(ctx, s, tone, d, at)]));
      for (const [what, draw] of draws) {
        const m = mask(s.cssW, s.cssH, draw, K);
        let edge = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const x = i % w;
          const y = Math.floor(i / w);
          // The sides always; the top only for things that keep their place on it (the lanes scroll in from above).
          if (x === 0 || x === w - 1 || (y === 0 && !what.includes(" at "))) edge++;
        }
        expect(edge, `level ${lvl}: ${what} touches an edge`).toBe(0);
        void h;
      }
    }
  });
});
