import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { HOUSE, litter, PROPS } from "./ground";
import { DOOR_BAY } from "./house";
import { inkW, spot } from "./pen";
import { SUPPER_PERIOD } from "./supper";
import { context, sceneAt, startScene, ZOOMED } from "./test-scene";

// The backyard props at the start view, on a tall and a short phone, on tablets and in Hard's
// zoomed-out view, all through the supper's round (the family setting the table, eating, carrying it all
// back up the garden path and shaking out the cloth): each prop is rendered alone, and none
// touches a screen edge or the brick band in front, none stands in the tower's column above its
// floor line, no two props overlap, and no prop covers the leaves lying on the lawn. The one
// meeting allowed is the family in the farmhouse's door bay, coming and going.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
/** Tablets, at every fourth of the times (they are slow to check). */
const TABLETS = [
  [768, 1024],
  [1024, 1366],
] as const;
/** Scene times (s.t) right through one round of the supper, a little over a second apart. */
const TIMES = Array.from({ length: 32 }, (_, i) => (i * SUPPER_PERIOD) / 32);

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const ctx = context(W, H);
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

/** The start view on each phone and tablet, and zoomed out (a virtual screen 1/0.6 the tall phone's size at its u). */
const CASES = [
  ...SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t, "phone"] as const)),
  ...TABLETS.flatMap(([W, H]) => TIMES.filter((_, i) => i % 4 === 1).map((t) => [W, H, t, "phone"] as const)),
  ...TIMES.map((t) => [ZOOMED.W, ZOOMED.H, t, "zoomed out"] as const),
];

/** The farmhouse's door bay on screen: [x0, y0, x1, y1]. */
function doorBay(s: Scene): readonly [number, number, number, number] {
  const p = spot(s, HOUSE.X, HOUSE.z);
  const k = s.u * p.k;
  return [p.x + DOOR_BAY.x0 * k, p.y + DOOR_BAY.top * k, p.x + DOOR_BAY.x1 * k, p.y + DOOR_BAY.bottom * k];
}

describe("thanksgiving layout", () => {
  it.each(CASES)("%ix%i at t=%s (%s): props stay clear", (W, H, t, view) => {
    const s = view === "phone" ? startScene(W, H, t) : sceneAt(W, H, 0, t, ZOOMED.u);
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
        // The family may cross the house only in its door bay.
        const pair = [prop.name, PROPS[j]!.name].sort().join("+");
        const [bx0, by0, bx1, by1] = pair === "house+table" ? doorBay(s) : [0, 0, -1, -1];
        let both = 0;
        for (let k = 0; k < m.length; k++) {
          if (!(m[k]! & n[k]!)) continue;
          const x = k % W;
          const y = (k - x) / W;
          if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) continue;
          both++;
        }
        expect(both, `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  });
});
