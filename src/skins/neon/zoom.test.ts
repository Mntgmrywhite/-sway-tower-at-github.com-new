import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { neon } from "../neon";
import type { Scene } from "../skin";
import { drawArcade } from "./arcade";
import { drawCar } from "./car";
import { drawDrifter, eachVisible } from "./drift";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { sceneAt } from "./test-scene";
import { LOOP, LOOP_FROM, toneOf } from "./tone";

// Hard mode's camera zooms out (down to 0.6) when a leaning tower's top would leave the screen:
// the scene is built for a screen up to 1/0.6 as wide and tall at the phone's u and scale, then
// drawn scaled down. Synthwave must hold up on it from the start, through the climb and round
// its loop: the backdrop covers the whole (bigger) screen with no gaps at any edge, and nothing
// on the floor or in the side lanes touches its sides or the top.

const PHONES = [
  [390, 844],
  [375, 667],
] as const;
const ZOOMS = [0.6, 0.8] as const;
const LEVELS = [0, 6, 12, 20, 30, 40, 52, 64, 80, 100, 120, 150, 180, 210, 240, 300, 360, LOOP_FROM + 2 * LOOP] as const;
/** Drawn at half size to keep this quick. */
const K = 0.5;

function canvas(s: Scene): CanvasRenderingContext2D {
  // Whole pixels inside the (possibly fractional) virtual screen: the game draws it scaled to fit its canvas.
  const ctx = createCanvas(Math.floor(s.cssW * K), Math.floor(s.cssH * K)).getContext("2d") as unknown as CanvasRenderingContext2D;
  ctx.scale(K, K);
  return ctx;
}

/** Pixels of a drawing (alpha over 40) on the left, right and top edges of the screen. */
function onSides(s: Scene, draw: (ctx: CanvasRenderingContext2D) => void): number {
  const ctx = canvas(s);
  draw(ctx);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! <= 40) continue;
      if (x === 0 || x === w - 1 || y === 0) n++;
    }
  }
  return n;
}

describe("synthwave zoomed out", () => {
  it.each(PHONES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: the backdrop covers the whole screen", (W, H, z) => {
    const kit = kitFor(neon);
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, 3.1, z);
      const ctx = canvas(s);
      kit.world(ctx, s);
      const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 250) gaps++;
      expect(gaps, `level ${lvl}: pixels not covered`).toBe(0);
    }
  });

  it.each(PHONES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: nothing touches the sides or the top", (W, H, z) => {
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, 3.1, z);
      const tone = toneOf(s);
      const what = `level ${lvl}`;
      for (const [i, p] of PALMS.entries()) expect(onSides(s, (ctx) => drawPalm(ctx, s, p, RIM)), `${what}: palm ${i}`).toBe(0);
      expect(onSides(s, (ctx) => drawArcade(ctx, s, ARCADE)), `${what}: arcade`).toBe(0);
      expect(onSides(s, (ctx) => drawCar(ctx, s)), `${what}: car`).toBe(0);
      eachVisible(s, (d) => {
        // Things come in over the top by parallax as you climb; only the sides are checked for them.
        const n = onSides({ ...s }, (ctx) => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 1 / K, s.cssW, s.cssH);
          ctx.clip();
          drawDrifter(ctx, s, tone, d);
          ctx.restore();
        });
        expect(n, `${what}: ${d.kind} at ${d.at}`).toBe(0);
      });
    }
  });
});
