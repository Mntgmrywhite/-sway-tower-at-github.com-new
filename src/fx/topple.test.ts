import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../config";
import { drop, newGame, swayOffset, top, type GameState } from "../game";
import type { Falling } from "./falling";
import { slabPoses, startTopple, stepTopple, TOPPLE_TIME, toppling } from "./topple";

/** A Hard tower of `straight` bars, then 9-unit steps right until it tips. */
function tipped(straight: number): GameState {
  const g = newGame("hard");
  const aim = (dx: number) => {
    g.slider.x = top(g).x + swayOffset(g, g.blocks.length - 1) + dx;
    drop(g);
  };
  for (let i = 0; i < straight; i++) aim(0);
  while (g.phase === "playing") aim(9);
  return g;
}

describe("topple", () => {
  it("starts exactly where the slab stood, swinging about the contact corner", () => {
    const g = tipped(4);
    const tip = g.toppled!;
    const t = startTopple(g, tip);
    expect(t.dir).toBe(1);
    // The pivot is the right end of the contact between the bar below and the slab's lowest bar.
    const below = g.blocks[tip.level - 1]!;
    expect(t.px).toBeCloseTo(below.x + below.w + swayOffset(g, tip.level - 1), 9);
    expect(t.py).toBe(tip.level * BLOCK_HEIGHT);
    const poses = slabPoses(t);
    expect(poses).toHaveLength(g.blocks.length - tip.level);
    for (const p of poses) {
      const b = g.blocks[p.level]!;
      expect(p.cx).toBeCloseTo(b.x + b.w / 2 + swayOffset(g, p.level), 9);
      expect(p.cy).toBeCloseTo((p.level + 0.5) * BLOCK_HEIGHT, 9);
      expect(p.angle).toBe(0);
    }
  });

  it("gathers speed toward the side it tips, and the bars peel off from the top into falling pieces", () => {
    const g = tipped(4);
    const t = startTopple(g, g.toppled!);
    const falling: Falling[] = [];
    const angles: number[] = [];
    const firstOut: number[] = [];
    for (let i = 0; i < 90; i++) {
      stepTopple(t, 1 / 60, falling);
      const poses = slabPoses(t);
      if (poses[0]) angles.push(poses[0].angle);
      for (const f of falling) if (!firstOut.includes(f.level)) firstOut.push(f.level);
    }
    // Clockwise on screen (tipping right), and accelerating.
    expect(angles.every((a) => a >= 0)).toBe(true);
    const d1 = angles[10]! - angles[5]!;
    const d2 = angles[20]! - angles[15]!;
    expect(d2).toBeGreaterThan(d1);
    // Every bar has left the slab, top one first.
    expect(t.bars).toHaveLength(0);
    const levels = [...firstOut];
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
    expect(falling).toHaveLength(g.blocks.length - g.toppled!.level);
    // They fly off to the right and down.
    for (const f of falling) expect(f.vx).toBeGreaterThan(0);
  });

  it("a bar peels off where the slab had it: no jump", () => {
    const g = tipped(2);
    const t = startTopple(g, g.toppled!);
    const falling: Falling[] = [];
    let before = slabPoses(t);
    for (let i = 0; i < 90; i++) {
      stepTopple(t, 1 / 60, falling);
      const after = slabPoses(t);
      for (const f of falling) {
        const was = before.find((p) => p.level === f.level);
        if (!was || after.some((p) => p.level === f.level)) continue;
        // Released this frame: one frame of swing away from where it was drawn last frame.
        expect(Math.hypot(f.x + f.w / 2 - was.cx, f.y + BLOCK_HEIGHT / 2 - was.cy)).toBeLessThan(3);
      }
      before = after;
    }
  });

  it("runs for TOPPLE_TIME, then the card may come", () => {
    const g = tipped(3);
    const t = startTopple(g, g.toppled!);
    expect(toppling(t)).toBe(true);
    stepTopple(t, TOPPLE_TIME - 0.01, []);
    expect(toppling(t)).toBe(true);
    stepTopple(t, 0.02, []);
    expect(toppling(t)).toBe(false);
    expect(toppling(null)).toBe(false);
  });

  it("tips left as well", () => {
    const g = newGame("hard");
    g.slider.x = top(g).x - 40;
    drop(g);
    const t = startTopple(g, g.toppled!);
    expect(t.dir).toBe(-1);
    expect(t.px).toBe(g.blocks[0]!.x); // the left end of the contact: the base's left edge
    stepTopple(t, 0.3, []);
    expect(slabPoses(t)[0]!.angle).toBeLessThan(0);
  });
});
