import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import { farBalloons, groves, lowClouds, seaTop, village, windmill } from "./far";
import { front } from "./front";
import { islandBody, islandTree, islet, kite } from "./island";
import { sun } from "./sky";
import { mask, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge, the HUD at the top or the cloud bank in front, none
// stands in the tower's column above its floor line, the island's tree and the islet stay below
// the base block (the slider's first pass never sweeps over them), and no two overlap.

const TIMES = [0, 1.3, 2.7, 4.1, 6.6, 9.4] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `planted`:
 * stands on (or hangs from) the home island. `underBase`: stays below the base block's top, out
 * of the slider's first lane.
 */
const PROPS: { name: string; draw: Draw; above: boolean; planted?: boolean; underBase?: boolean }[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), seaTop(s, level(s))), above: true },
  { name: "balloon", draw: (ctx, s) => drifters(ctx, s, toneOf(s)), above: true },
  { name: "kite", draw: kite, above: true, planted: true },
  { name: "tree", draw: islandTree, above: true, planted: true, underBase: true },
  { name: "islet", draw: islet, above: true, planted: true, underBase: true },
  { name: "groves", draw: (ctx, s) => groves(ctx, s, toneOf(s)), above: true },
  { name: "low clouds", draw: (ctx, s) => lowClouds(ctx, s, toneOf(s)), above: true },
  { name: "village", draw: (ctx, s) => village(ctx, s, toneOf(s)), above: true },
  { name: "windmill", draw: (ctx, s) => windmill(ctx, s, toneOf(s)), above: true },
  { name: "far balloons", draw: (ctx, s) => farBalloons(ctx, s, toneOf(s)), above: true },
  // The island hangs below the floor line, under the tower (its daisies stay below it too).
  { name: "island", draw: islandBody, above: true },
];

describe("classic layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The HUD (title, best, lives) at the top, and the top of the cloud bank in front, column
    // by column as it is drawn (its back row heaps up toward the sides), with a little air.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const bank = mask(W, H, (ctx) => front(ctx, s));
    const tops = Array.from({ length: W }, (_, x) => {
      let y = 0;
      while (y < H && !bank[y * W + x]) y++;
      return y - 2;
    });
    const lip = (x: number) => tops[x]!;
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let low = 0;
      let lane = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === 0) edge++;
          if (prop.above && y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (y >= lip(x)) low++;
          if (prop.underBase && y < baseTop) lane++;
        }
      }
      expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(50);
      expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(low, `${prop.name}: pixels reaching the cloud bank`).toBe(0);
      expect(lane, `${prop.name}: pixels above the base block (in the slider's first lane)`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (prop.planted && PROPS[j]!.name === "island") continue;
        const n = masks[j]!;
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
        expect(both, `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  });
});
