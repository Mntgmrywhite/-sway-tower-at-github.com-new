import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { drop, newGame, swayOffset, type GameState } from "./game";
import { newView, render, showLanding, updateView, type View } from "./render";
import { classic } from "./skins/classic";
import type { BarInfo, CartoonSkin, Scene } from "./skins/skin";

// A cartoon skin may paint its own bars (CartoonSkin.bar) and react to a new floor: the renderer
// tells the painter each bar's role (a standing bar, the top bar, the slider, a falling piece), the
// scene's clock and how long ago a bar last landed, and tells the scenery the same (Scene.sinceLand)
// along with the player's reduce-motion setting (Scene.still). Skins without a painter draw as before.

const W = 390;
const H = 844;

function harness() {
  const calls: (BarInfo & { level: number })[] = [];
  const scenes: Scene[] = [];
  const skin: CartoonSkin = {
    ...classic,
    id: "bar-hook-test",
    bar: (_ctx, _x, _y, _w, _h, level, info) => void calls.push({ ...info, level }),
    ground: (_ctx, s) => void scenes.push({ ...s }),
  };
  const ctx = createCanvas(W, H).getContext("2d") as unknown as CanvasRenderingContext2D;
  const frame = (state: GameState, view: View, still = false) => {
    calls.length = 0;
    scenes.length = 0;
    render(ctx, W, H, state, view, 0, skin, NaN, { still });
    return { calls: [...calls], scene: scenes[0]! };
  };
  return frame;
}

/** Lands the slider squarely on the top bar (a perfect) or entirely off it (a miss), as main.ts does. */
function land(state: GameState, view: View, how: "perfect" | "miss"): void {
  const level = state.blocks.length;
  const under = state.blocks[level - 1]!;
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  state.slider.x = how === "perfect" ? under.x + swayOffset(state, level - 1) : under.x + under.w * 1.05 + swayOffset(state, level - 1);
  const r = drop(state)!;
  expect(r.kind).toBe(how);
  showLanding(view, state, r, level, towerX);
}

describe("a skin's own bars", () => {
  it("are told their role, the clock and the last landing", () => {
    const frame = harness();
    const state = newGame("normal");
    const view = newView();
    updateView(view, state, 0.5);

    let f = frame(state, view);
    expect(f.calls.map((c) => c.role)).toEqual(["top", "slider"]);
    for (const c of f.calls) {
      expect(c.t).toBe(view.t);
      expect(c.sinceLand).toBe(Infinity);
      expect(c.still).toBe(false);
    }
    expect(f.scene.sinceLand).toBe(Infinity);
    expect(f.scene.still).toBe(false);

    land(state, view, "perfect");
    updateView(view, state, 0.25);
    f = frame(state, view);
    expect(f.calls.map((c) => [c.role, c.level])).toEqual([
      ["tower", 0],
      ["top", 1],
      ["slider", 2],
    ]);
    for (const c of f.calls) expect(c.sinceLand).toBeCloseTo(0.25, 9);
    expect(f.scene.sinceLand).toBeCloseTo(0.25, 9);
  });

  it("a miss is not a new floor: the last landing stands, and the missed bar falls as a loose piece", () => {
    const frame = harness();
    const state = newGame("normal");
    const view = newView();
    land(state, view, "perfect");
    updateView(view, state, 1);
    land(state, view, "miss");
    updateView(view, state, 0.1);
    const f = frame(state, view);
    expect(f.scene.sinceLand).toBeCloseTo(1.1, 9);
    expect(f.calls.some((c) => c.role === "loose")).toBe(true);
    expect(f.calls.filter((c) => c.role === "top")).toHaveLength(1);
  });

  it("pass the player's reduce-motion setting to the bars and the scenery", () => {
    const frame = harness();
    const state = newGame("normal");
    const view = newView();
    const f = frame(state, view, true);
    expect(f.scene.still).toBe(true);
    for (const c of f.calls) expect(c.still).toBe(true);
  });
});
