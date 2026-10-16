import { describe, expect, it } from "vitest";
import { LIVES, PERFECT_TOLERANCE, SLIDE_RANGE, SWAY_PERIOD } from "./config";
import { drop, kickAmplitude, newGame, step, swayOffset, top, type GameState } from "./game";

/** World x of the tower top right now. */
function topWorldX(g: GameState): number {
  return top(g).x + swayOffset(g, g.blocks.length - 1);
}

/** Put the slider `dx` world units right of the tower top. */
function aim(g: GameState, dx: number): void {
  g.slider.x = topWorldX(g) + dx;
}

/** Build a tall tower of perfect drops without advancing time. */
function stack(g: GameState, n: number): void {
  for (let i = 0; i < n; i++) {
    aim(g, 0);
    drop(g);
  }
}

describe("drop", () => {
  it("snaps a near-perfect drop and keeps full width", () => {
    const g = newGame();
    const under = top(g);
    aim(g, PERFECT_TOLERANCE * 0.9);
    expect(drop(g)?.kind).toBe("perfect");
    expect(top(g)).toEqual(under);
    expect(g.score).toBe(1);
    expect(g.streak).toBe(1);
  });

  it("slices the overhang on the right and returns the cut in world space", () => {
    const g = newGame();
    const under = top(g);
    aim(g, 10);
    const r = drop(g);
    expect(r?.kind).toBe("sliced");
    expect(top(g).w).toBeCloseTo(under.w - 10);
    if (r?.kind === "sliced") expect(r.cut).toEqual({ x: under.x + under.w, w: 10 });
  });

  it("slices the overhang on the left", () => {
    const g = newGame();
    const under = top(g);
    aim(g, -12);
    const r = drop(g);
    expect(top(g).w).toBeCloseTo(under.w - 12);
    if (r?.kind === "sliced") expect(r.cut).toEqual({ x: under.x - 12, w: 12 });
  });

  it("resets the streak on a non-perfect drop", () => {
    const g = newGame();
    stack(g, 1);
    aim(g, 5);
    drop(g);
    expect(g.streak).toBe(0);
  });
});

describe("misses and lives", () => {
  it("a miss costs a life but the game continues at the same level", () => {
    const g = newGame();
    stack(g, 2);
    aim(g, top(g).w + 1);
    expect(drop(g)?.kind).toBe("miss");
    expect(g.phase).toBe("playing");
    expect(g.lives).toBe(LIVES - 1);
    expect(g.score).toBe(2);
    expect(g.blocks).toHaveLength(3);
    expect(g.streak).toBe(0);
  });

  it(`game over after ${LIVES} misses`, () => {
    const g = newGame();
    for (let i = 0; i < LIVES; i++) {
      aim(g, top(g).w + 1);
      drop(g);
    }
    expect(g.phase).toBe("over");
    expect(drop(g)).toBeNull();
  });
});

describe("sway", () => {
  // A quarter period puts sin() at its peak.
  const PEAK = SWAY_PERIOD / 4;

  it("the base never moves", () => {
    const g = newGame();
    g.time = PEAK;
    g.kick = 20;
    expect(Math.abs(swayOffset(g, 0))).toBe(0);
  });

  it("taller towers move more at the top, with no kick at all", () => {
    const g = newGame();
    g.time = PEAK;
    expect(g.kick).toBe(0);
    const low = Math.abs(swayOffset(g, 5));
    const high = Math.abs(swayOffset(g, 30));
    expect(high).toBeGreaterThan(low * 5);
  });

  it("perfect drops add no sway energy", () => {
    const g = newGame();
    stack(g, 20);
    expect(kickAmplitude(g)).toBe(0);
  });

  it("a sloppy drop kicks the sway in proportion to the overhang", () => {
    const a = newGame();
    aim(a, 4);
    drop(a);
    const b = newGame();
    aim(b, 12);
    drop(b);
    expect(kickAmplitude(a)).toBeGreaterThan(0);
    expect(kickAmplitude(b)).toBeCloseTo(kickAmplitude(a) * 3);
  });

  it("a kick pushes toward the overhang side without making the tower jump", () => {
    const g = newGame();
    stack(g, 10);
    const before = swayOffset(g, 10);
    aim(g, 10); // overhang on the right
    drop(g);
    expect(swayOffset(g, 10)).toBe(before);
    step(g, 0.1);
    expect(g.kick).toBeGreaterThan(0);
  });

  it("the kick calms down after the chop", () => {
    const g = newGame();
    aim(g, 10);
    drop(g);
    const before = kickAmplitude(g);
    for (let i = 0; i < 120; i++) step(g, 1 / 60);
    expect(kickAmplitude(g)).toBeLessThan(before * 0.6);
    expect(kickAmplitude(g)).toBeGreaterThan(0);
  });

  it("overlap is judged in world space: aiming at the tower's rest position misses the swaying top", () => {
    const g = newGame();
    stack(g, 40);
    g.time = PEAK; // tower top displaced by the full base sway
    const offset = swayOffset(g, g.blocks.length - 1);
    expect(Math.abs(offset)).toBeGreaterThan(PERFECT_TOLERANCE * 2);

    g.slider.x = top(g).x; // where the top would be with no sway
    expect(drop(g)?.kind).toBe("sliced");
  });

  it("a sliced block stays exactly where it was dropped (world space)", () => {
    const g = newGame();
    stack(g, 30);
    g.time = PEAK * 0.7;
    g.kick = 5;
    g.kickVel = 20;
    aim(g, 6);
    const sliderX = g.slider.x;
    drop(g);
    const placedWorldX = top(g).x + swayOffset(g, g.blocks.length - 1);
    expect(placedWorldX).toBeCloseTo(sliderX);
  });
});

describe("step", () => {
  it("bounces the slider within its range", () => {
    const g = newGame();
    const centers: number[] = [];
    for (let i = 0; i < 1000; i++) {
      step(g, 1 / 60);
      centers.push(g.slider.x + g.slider.w / 2);
    }
    const mid = top(g).x + top(g).w / 2;
    expect(Math.min(...centers)).toBeGreaterThanOrEqual(mid - SLIDE_RANGE - 1e-9);
    expect(Math.max(...centers)).toBeLessThanOrEqual(mid + SLIDE_RANGE + 1e-9);
    expect(Math.max(...centers) - Math.min(...centers)).toBeGreaterThan(100);
  });

  it("handles a huge dt without escaping bounds", () => {
    const g = newGame();
    step(g, 10);
    const mid = top(g).x + top(g).w / 2;
    expect(Math.abs(g.slider.x + g.slider.w / 2 - mid)).toBeLessThanOrEqual(SLIDE_RANGE + 1e-9);
  });
});

describe("bot", () => {
  const DT = 1 / 120;

  it("a bot that times both slider and sway reaches 100 blocks without narrowing", () => {
    const g = newGame();
    const startWidth = top(g).w;
    let ticks = 0;
    while (g.score < 100 && g.phase === "playing" && ticks < 1e6) {
      step(g, DT);
      ticks++;
      if (Math.abs(g.slider.x - topWorldX(g)) <= PERFECT_TOLERANCE * 0.8) drop(g);
    }
    expect(g.phase).toBe("playing");
    expect(g.score).toBe(100);
    expect(top(g).w).toBe(startWidth);
    expect(g.lives).toBe(LIVES);
  });

  it("a bot that ignores sway does worse than one that tracks it", () => {
    const play = (trackSway: boolean) => {
      const g = newGame();
      let ticks = 0;
      while (g.score < 60 && g.phase === "playing" && ticks < 1e6) {
        step(g, DT);
        ticks++;
        const target = trackSway ? topWorldX(g) : top(g).x;
        if (Math.abs(g.slider.x - target) <= PERFECT_TOLERANCE * 0.8) drop(g);
      }
      return g;
    };
    const tracker = play(true);
    const naive = play(false);
    expect(tracker.score).toBe(60);
    expect(naive.phase === "over" || top(naive).w < top(tracker).w).toBe(true);
  });
});
