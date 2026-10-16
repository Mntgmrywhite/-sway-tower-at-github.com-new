import { describe, expect, it } from "vitest";
import { PERFECT_TOLERANCE } from "./config";
import { drop, newGame, step, top, type GameState } from "./game";

function placeSliderAt(state: GameState, x: number): void {
  state.slider.x = x;
}

describe("drop", () => {
  it("snaps a near-perfect drop and keeps full width", () => {
    const g = newGame();
    const under = top(g);
    placeSliderAt(g, under.x + PERFECT_TOLERANCE * 0.9);
    const r = drop(g);
    expect(r?.kind).toBe("perfect");
    expect(top(g)).toEqual(under);
    expect(g.score).toBe(1);
    expect(g.streak).toBe(1);
  });

  it("slices the overhang on the right", () => {
    const g = newGame();
    const under = top(g);
    placeSliderAt(g, under.x + 10);
    const r = drop(g);
    expect(r?.kind).toBe("sliced");
    expect(top(g)).toEqual({ x: under.x + 10, w: under.w - 10 });
    if (r?.kind === "sliced") expect(r.cut).toEqual({ x: under.x + under.w, w: 10 });
  });

  it("slices the overhang on the left", () => {
    const g = newGame();
    const under = top(g);
    placeSliderAt(g, under.x - 12);
    const r = drop(g);
    expect(top(g)).toEqual({ x: under.x, w: under.w - 12 });
    if (r?.kind === "sliced") expect(r.cut).toEqual({ x: under.x - 12, w: 12 });
  });

  it("ends the game on a full miss and ignores further drops", () => {
    const g = newGame();
    const under = top(g);
    placeSliderAt(g, under.x + under.w + 1);
    expect(drop(g)?.kind).toBe("miss");
    expect(g.phase).toBe("over");
    expect(g.blocks).toHaveLength(1);
    expect(drop(g)).toBeNull();
  });

  it("resets the streak on a non-perfect drop", () => {
    const g = newGame();
    placeSliderAt(g, top(g).x);
    drop(g);
    placeSliderAt(g, top(g).x + 5);
    drop(g);
    expect(g.streak).toBe(0);
  });
});

describe("step", () => {
  it("bounces the slider within its range", () => {
    const g = newGame();
    const xs: number[] = [];
    for (let i = 0; i < 1000; i++) {
      step(g, 1 / 60);
      xs.push(g.slider.x);
    }
    const center = top(g).x + top(g).w / 2;
    const sliderCenters = xs.map((x) => x + g.slider.w / 2);
    expect(Math.min(...sliderCenters)).toBeGreaterThanOrEqual(center - 55 - 1e-9);
    expect(Math.max(...sliderCenters)).toBeLessThanOrEqual(center + 55 + 1e-9);
    // It actually traveled both ways.
    expect(Math.max(...sliderCenters) - Math.min(...sliderCenters)).toBeGreaterThan(100);
  });

  it("handles a huge dt without escaping bounds", () => {
    const g = newGame();
    step(g, 10);
    const center = top(g).x + top(g).w / 2;
    expect(Math.abs(g.slider.x + g.slider.w / 2 - center)).toBeLessThanOrEqual(55 + 1e-9);
  });
});

describe("bot", () => {
  const DT = 1 / 120;

  it("a perfect-timing bot reaches 200 blocks without narrowing", () => {
    const g = newGame();
    const startWidth = top(g).w;
    while (g.score < 200 && g.phase === "playing") {
      step(g, DT);
      if (Math.abs(g.slider.x - top(g).x) <= PERFECT_TOLERANCE) drop(g);
    }
    expect(g.phase).toBe("playing");
    expect(g.score).toBe(200);
    expect(top(g).w).toBe(startWidth);
  });

  it("a mash-instantly bot loses fast", () => {
    const g = newGame();
    let taps = 0;
    while (g.phase === "playing" && taps < 50) {
      drop(g);
      taps++;
    }
    expect(g.phase).toBe("over");
    expect(g.score).toBeLessThan(5);
  });
});
