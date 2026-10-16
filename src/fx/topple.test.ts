import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../config";
import { balanceFailure, drop, newGame, swayOffset, top, type GameState } from "../game";
import type { Falling } from "./falling";
import { SETTLE_TIME, slabPoses, startTopple, stepTopple, TOPPLE_TIME, toppling, type SlabPose } from "./topple";

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
    expect(t.px0).toBeCloseTo(below.x + below.w + swayOffset(g, tip.level - 1), 9);
    expect(t.px).toBeCloseTo(t.px0, 9);
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

  it("settles from its pose on screen into the rest pose the balance check judged, so it visibly hangs past the corner", () => {
    // The kick bends the tower more at each level up to level 8, so a kick to the left draws the
    // upper bars further left than their rest shape: the bar that tips (31 past a 60-wide bar, its
    // weight 1 past the edge at rest) is drawn with its weight still over its support.
    const g = newGame("hard");
    const base = g.blocks[0]!;
    g.blocks.push({ ...base }, { ...base }, { x: base.x + 31, w: base.w });
    g.kick = -20;
    const tip = balanceFailure(g.blocks)!;
    expect(tip).toEqual({ level: 3, dir: 1 });
    const t = startTopple(g, tip);
    const shift = swayOffset(g, 2); // the bar below's sway: it stays drawn there
    const edge = g.blocks[2]!.x + shift + base.w;
    expect(com(slabPoses(t))).toBeLessThan(edge); // looks supported on screen...

    // ...then settles, frame by frame without a jump, before it has visibly swung.
    let before = slabPoses(t);
    while (t.age < SETTLE_TIME) {
      stepTopple(t, 1 / 60, []);
      const after = slabPoses(t);
      after.forEach((p, i) => expect(Math.hypot(p.cx - before[i]!.cx, p.cy - before[i]!.cy)).toBeLessThan(1));
      before = after;
    }
    // Settled: every bar where the balance check had it, on the bar below as drawn, swinging about
    // that bar's corner, with the slab's weight past it.
    expect(t.px).toBeCloseTo(edge, 9);
    const poses = slabPoses(t);
    for (const p of poses) {
      const b = g.blocks[p.level]!;
      const dx = b.x + shift + b.w / 2 - t.px;
      const dy = (p.level + 0.5) * BLOCK_HEIGHT - t.py;
      const a = p.angle; // dir * theta, small but not zero
      expect(a).toBeGreaterThan(0);
      expect(p.cx).toBeCloseTo(t.px + dx * Math.cos(a) + dy * Math.sin(a), 9);
      expect(p.cy).toBeCloseTo(t.py - dx * Math.sin(a) + dy * Math.cos(a), 9);
    }
    expect(com(poses)).toBeGreaterThan(edge);
  });

  it("a tower drawn at rest needs no settling", () => {
    const g = tipped(3);
    g.kick = 0;
    g.swayAngle = 0;
    const t = startTopple(g, g.toppled!);
    const start = slabPoses(t);
    stepTopple(t, SETTLE_TIME, []);
    // Only the swing has moved it.
    const rest = startTopple(g, g.toppled!);
    rest.age = SETTLE_TIME;
    expect(t.px0).toBe(t.px);
    expect(slabPoses(t)).toEqual(slabPoses(rest));
    expect(start.map((p) => p.cx)).toEqual(t.bars.map((b) => t.px + b.dx));
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

/** The slab's center of mass (x), every bar weighing its width. */
function com(poses: SlabPose[]): number {
  return poses.reduce((m, p) => m + p.cx * p.w, 0) / poses.reduce((m, p) => m + p.w, 0);
}
