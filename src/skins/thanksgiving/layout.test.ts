import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { thanksgiving } from "../thanksgiving";
import type { CartoonSkin, Scene } from "../skin";
import { litter, PROPS } from "./ground";
import { inkW } from "./pen";

// The backyard props at the start view, on a tall and a short phone, at a few animation
// times: each prop is rendered alone, and none touches a screen edge or the brick band in
// front, none stands in the tower's column above its floor line, no two props overlap, and no
// prop covers the leaves lying on the lawn.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
const TIMES = [0, 1.3, 2.7, 4.1, 6.6, 9.4] as const;

/** The scene the start shot renders with. */
function startScene(W: number, H: number, t: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  shot.view.t += t;
  let scene: Scene | undefined;
  const spy: CartoonSkin = { ...thanksgiving, ground: (_, s) => (scene = { ...s }) };
  const canvas = createCanvas(W, H);
  render(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
  return scene!;
}

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

describe("thanksgiving layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const leaves = mask(W, H, (ctx) => litter(ctx, s, inkW(s)));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The grass lip of the brick band starts a little above its top edge.
    const band = Math.round(s.groundY + s.u * 0.36 - s.u * 0.03);

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let low = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1) edge++;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (y >= band - 3) low++;
        }
      }
      expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(50);
      expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(low, `${prop.name}: pixels reaching the brick band`).toBe(0);
      let onLeaves = 0;
      for (let k = 0; k < m.length; k++) onLeaves += m[k]! & leaves[k]!;
      expect(onLeaves, `${prop.name} covers fallen leaves`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        const n = masks[j]!;
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
        expect(both, `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  });
});
