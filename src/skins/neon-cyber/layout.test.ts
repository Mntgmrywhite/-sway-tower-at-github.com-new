import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { facadeSigns, roofs } from "./city";
import { drawDrifter, eachVisible, type Drifter } from "./lanes";
import { lamp, machines, parked, stall, walker } from "./street";
import { mask, overlap, SIZES, startScene } from "./test-scene";
import { toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each street prop (and
// whatever hangs in the side lanes at the start) is drawn alone, and none touches a screen edge
// or the HUD at the top, none that rises above the floor line stands in the tower's column,
// and no two overlap. The one meeting allowed is light: the walker stands in the lamp's pool of
// light, so for that pair only the solid parts (not the faint cone and pool) must stay apart.
// Whatever hangs in a lane also keeps clear of the city's most characterful details behind it:
// the antenna forests, the roof gardens, the signs and the holo billboard.

const TIMES = [0, 1.3, 2.7, 4.1, 6.6, 9.4] as const;
/** Pairs that may share light, compared by their solid parts only. */
const LIT = new Set(["lamp|walker"]);
/** Alpha (of 255) above which a pixel is solid: the lamp's cone and pool stay under it. */
const SOLID = 120;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/** `above`: rises above the floor line (so must keep out of the tower's column). */
const PROPS: { name: string; draw: Draw; above: boolean }[] = [
  { name: "stall", draw: stall, above: true },
  { name: "lamp", draw: lamp, above: true },
  { name: "walker", draw: walker, above: true },
  // In front of the tower, below its floor line, in the bottom corners.
  { name: "parked car", draw: parked, above: false },
  { name: "vending machines", draw: machines, above: false },
];

/** The lane items on screen at the start, as props of their own. */
function lanesAtStart(s: Scene): { name: string; draw: Draw; above: boolean }[] {
  const out: { name: string; draw: Draw; above: boolean }[] = [];
  eachVisible(s, (d: Drifter) => out.push({ name: `lane ${d.kind}`, draw: (ctx, sc) => drawDrifter(ctx, sc, toneOf(sc), d), above: true }));
  return out;
}

describe("neon cyberpunk layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: the start view stays clear", (W, H, t) => {
    const s = startScene(W, H, t);
    // Lane items just above the screen are visited too; keep the ones that show.
    const lanes = lanesAtStart(s)
      .map((p) => ({ p, m: mask(W, H, (ctx) => p.draw(ctx, s)) }))
      .filter(({ m }) => m.some((v) => v > 0));
    expect(lanes.length, "something hangs in a lane at the start").toBeGreaterThan(0);
    const props = [...PROPS, ...lanes.map(({ p }) => p)];
    const masks = [...PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s))), ...lanes.map(({ m }) => m)];
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The HUD (title, best, lives) at the top.
    const hud = Math.round(H * 0.14 + s.u * 0.13);

    const city = mask(W, H, (ctx) => {
      roofs(ctx, s, toneOf(s));
      facadeSigns(ctx, s, toneOf(s));
    });
    for (const { p, m } of lanes) expect(overlap(m, city), `${p.name} covers a roof or a sign`).toBe(0);

    props.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === 0 || y === H - 1) edge++;
          if (prop.above && y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
        }
      }
      expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(50);
      expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      for (let j = i + 1; j < props.length; j++) {
        const other = props[j]!;
        const lit = LIT.has(`${prop.name}|${other.name}`);
        const a = lit ? mask(W, H, (ctx) => prop.draw(ctx, s), 1, SOLID) : m;
        const b = lit ? mask(W, H, (ctx) => other.draw(ctx, s), 1, SOLID) : masks[j]!;
        expect(overlap(a, b), `${prop.name} overlaps ${other.name}`).toBe(0);
      }
    });
  });
});
