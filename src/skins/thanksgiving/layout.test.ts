import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { thanksgiving } from "../thanksgiving";
import type { CartoonSkin, Scene } from "../skin";
import { rollingFields } from "./fields";

// The backyard props at the start view, on a tall and a short phone: none touches a screen
// edge or the brick band in front, and none stands in the tower's column above its floor line.
// Props are found by rendering with and without them (the rolling hills are terrain, so they
// stay in both renders) and comparing pixels.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
const TIMES = [0, 2.7, 6.6] as const;

function frame(W: number, H: number, skin: CartoonSkin, t: number): Uint8ClampedArray {
  const shot = shots().find((s) => s.name === "start")!;
  shot.view.t += t;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  render(ctx as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, skin);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("thanksgiving layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    let scene: Scene | undefined;
    const spy: CartoonSkin = {
      ...thanksgiving,
      ground: (ctx, s) => {
        scene = s;
        thanksgiving.ground!(ctx, s);
      },
    };
    const a = frame(W, H, spy, t);
    const b = frame(W, H, { ...thanksgiving, ground: rollingFields }, t);
    const s = scene!;
    const prop = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      return Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 30;
    };

    const edges: number[] = [];
    for (let y = 0; y < H; y++) if (prop(0, y) || prop(W - 1, y)) edges.push(y);
    expect(edges, "props touching a screen edge (rows)").toEqual([]);

    let column = 0;
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    for (let y = Math.floor(s.horizonY); y < Math.floor(s.groundY); y++) for (let x = x0; x <= x1; x++) if (prop(x, y)) column++;
    expect(column, "prop pixels in the tower's column above its floor").toBe(0);

    // The grass lip of the brick band starts a little above its top edge.
    const band = Math.round(s.groundY + s.u * 0.36 - s.u * 0.03);
    let touching = 0;
    for (let x = 0; x < W; x++) for (let y = band - 3; y <= band; y++) if (prop(x, y)) touching++;
    expect(touching, "prop pixels reaching the brick band").toBe(0);
  });
});
