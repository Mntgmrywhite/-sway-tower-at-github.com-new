import { afterEach, describe, expect, it } from "vitest";
import { LIVES, PERFECT_TOLERANCE, SLIDE_RANGE, SWAY_KICK_MAX, resetTuning, tuning } from "./config";
import { drop, kickAmplitude, newGame, sliderSpeed, step, swayOffset, top, type GameState } from "./game";

afterEach(resetTuning);

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

  it("counts perfect drops for the whole game, unlike the streak", () => {
    const g = newGame();
    stack(g, 3);
    aim(g, 5);
    drop(g);
    stack(g, 2);
    expect(g.perfects).toBe(5);
    expect(g.streak).toBe(2);
    expect(newGame().perfects).toBe(0);
  });

  it("resets the streak on a non-perfect drop", () => {
    const g = newGame();
    stack(g, 1);
    aim(g, 5);
    drop(g);
    expect(g.streak).toBe(0);
  });
});

describe("perfect drops win back length", () => {
  it("restores the most recent slice on the edge that lost it", () => {
    const g = newGame();
    const base = top(g);
    aim(g, 10); // lands 10 right: the tower's left edge recedes by 10
    drop(g);
    expect(top(g).w).toBeCloseTo(base.w - 10);
    aim(g, 0);
    const r = drop(g);
    expect(r?.kind).toBe("perfect");
    if (r?.kind === "perfect") expect(r.regained).toBeCloseTo(10);
    expect(top(g).w).toBeCloseTo(base.w);
    // Back on the left: the bar is exactly the original again.
    expect(top(g).x).toBeCloseTo(base.x);
  });

  it("landing left loses the right edge, and gets it back there", () => {
    const g = newGame();
    const base = top(g);
    aim(g, -8);
    drop(g);
    aim(g, 0);
    drop(g);
    expect(top(g).x).toBeCloseTo(base.x);
    expect(top(g).w).toBeCloseTo(base.w);
  });

  it("each perfect wins back the next slice, newest first", () => {
    const g = newGame();
    const base = top(g);
    aim(g, 6);
    drop(g);
    aim(g, 4);
    drop(g); // lost 6 then 4
    stack(g, 1);
    expect(top(g).w).toBeCloseTo(base.w - 6);
    stack(g, 1);
    expect(top(g).w).toBeCloseTo(base.w);
    stack(g, 1); // nothing left to win back
    expect(top(g).w).toBeCloseTo(base.w);
  });

  it("a run of perfects rebuilds a sliver to the full original bar", () => {
    const g = newGame();
    const base = top(g);
    let slices = 0;
    while (top(g).w > 4) {
      aim(g, Math.min(5, top(g).w - 3));
      drop(g);
      slices++;
    }
    expect(slices).toBeGreaterThan(5);
    stack(g, slices);
    expect(top(g).w).toBeCloseTo(base.w);
    expect(top(g).x).toBeCloseTo(base.x);
  });

  it("a miss is not a slice and gives nothing back", () => {
    const g = newGame();
    const base = top(g);
    aim(g, top(g).w + 1);
    drop(g);
    aim(g, 0);
    drop(g);
    expect(top(g).w).toBeCloseTo(base.w);
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
  // sin() peaks at a quarter turn.
  const PEAK = Math.PI / 2;

  it("the base never moves", () => {
    const g = newGame();
    g.swayAngle = PEAK;
    g.kick = 20;
    expect(Math.abs(swayOffset(g, 0))).toBe(0);
  });

  it("taller towers move more at the top, with no kick at all", () => {
    const g = newGame();
    g.swayAngle = PEAK;
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

  it("a kick past the swing cap trims speed only: a swinging tower never jumps", () => {
    const g = newGame();
    stack(g, 10);
    g.kick = 25; // already swinging hard, near the cap
    g.kickVel = 0;
    const before = swayOffset(g, 10);
    aim(g, 20); // a big overhang would push the swing past SWAY_KICK_MAX
    drop(g);
    expect(swayOffset(g, 10)).toBe(before);
    expect(g.kick).toBe(25);
    expect(kickAmplitude(g)).toBeCloseTo(SWAY_KICK_MAX);
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
    g.swayAngle = PEAK; // tower top displaced by the full base sway
    const offset = swayOffset(g, g.blocks.length - 1);
    expect(Math.abs(offset)).toBeGreaterThan(PERFECT_TOLERANCE * 2);

    g.slider.x = top(g).x; // where the top would be with no sway
    expect(drop(g)?.kind).toBe("sliced");
  });

  it("a sliced block stays exactly where it was dropped (world space)", () => {
    const g = newGame();
    stack(g, 30);
    g.swayAngle = PEAK * 0.7;
    g.kick = 5;
    g.kickVel = 20;
    aim(g, 6);
    const sliderX = g.slider.x;
    drop(g);
    const placedWorldX = top(g).x + swayOffset(g, g.blocks.length - 1);
    expect(placedWorldX).toBeCloseTo(sliderX);
  });
});

describe("perfect calm", () => {
  /** Peak |offset| at the top over one sway cycle, starting now. */
  function peakOver(g: GameState, seconds: number): number {
    let peak = 0;
    for (let t = 0; t < seconds; t += 1 / 120) {
      step(g, 1 / 120);
      peak = Math.max(peak, Math.abs(swayOffset(g, g.blocks.length - 1)));
    }
    return peak;
  }

  it("a perfect drop makes the tower sway less for a while", () => {
    const calmGame = newGame();
    stack(calmGame, 40); // every drop perfect
    const plain = newGame();
    stack(plain, 40);
    plain.calmTimer = 0; // same tower, no calm
    plain.calm = 0;
    calmGame.calm = 0; // start both from the same sway, then let calm ease in
    expect(peakOver(calmGame, 1.5)).toBeLessThan(peakOver(plain, 1.5) * 0.8);
  });

  it("calm does not make the tower jump at the moment of the drop", () => {
    const g = newGame();
    stack(g, 30);
    g.calm = 0;
    g.calmTimer = 0;
    g.swayAngle = Math.PI / 3;
    const before = swayOffset(g, 30);
    aim(g, 0);
    drop(g);
    expect(swayOffset(g, 30)).toBe(before);
  });

  it("calm wears off", () => {
    const g = newGame();
    stack(g, 10);
    for (let i = 0; i < 600; i++) step(g, 1 / 60); // 10 seconds
    expect(g.calm).toBeLessThan(0.01);
  });

  it("sloppy drops do not calm the tower", () => {
    const g = newGame();
    aim(g, 8);
    drop(g);
    expect(g.calmTimer).toBe(0);
  });

  it("perfect calm 0 disables the effect", () => {
    tuning.perfectCalm = 0;
    const g = newGame();
    stack(g, 40);
    g.calm = 1;
    g.swayAngle = Math.PI / 2;
    const withCalm = swayOffset(g, 40);
    g.calm = 0;
    expect(swayOffset(g, 40)).toBe(withCalm);
  });
});

describe("tuning", () => {
  it("sway off: the tower never moves and sloppy drops add no kick", () => {
    tuning.swayOn = false;
    const g = newGame();
    stack(g, 40);
    g.swayAngle = Math.PI / 2;
    aim(g, 10);
    drop(g);
    expect(swayOffset(g, 40)).toBe(0);
    expect(kickAmplitude(g)).toBe(0);
  });

  it("base sway scales the displacement", () => {
    const g = newGame();
    g.swayAngle = Math.PI / 2;
    const a = swayOffset(g, 40);
    tuning.swayBase *= 2;
    expect(swayOffset(g, 40)).toBeCloseTo(a * 2);
  });

  it("period sets how fast the sway cycles", () => {
    tuning.swayPeriod = 2;
    const g = newGame();
    for (let i = 0; i < 60; i++) step(g, 1 / 120); // half a second = quarter cycle
    expect(g.swayAngle).toBeCloseTo(Math.PI / 2);
  });

  it("changing the period mid-game does not make the tower jump", () => {
    const g = newGame();
    stack(g, 40);
    step(g, 0.3);
    const before = swayOffset(g, 40);
    tuning.swayPeriod = 1;
    expect(swayOffset(g, 40)).toBe(before);
  });

  it("kick strength and decay are live", () => {
    tuning.kickPerUnit = 2.4;
    const g = newGame();
    aim(g, 5);
    drop(g);
    expect(kickAmplitude(g)).toBeCloseTo(12);

    tuning.kickDecay = 2;
    for (let i = 0; i < 60; i++) step(g, 1 / 60);
    expect(kickAmplitude(g)).toBeLessThan(12 * 0.3);
  });

  it("very high decay calms at least as fast as moderate decay", () => {
    const after = (decay: number) => {
      tuning.kickDecay = decay;
      const g = newGame();
      aim(g, 10);
      drop(g);
      for (let i = 0; i < 90; i++) step(g, 1 / 60);
      return kickAmplitude(g);
    };
    expect(after(10)).toBeLessThanOrEqual(after(1.5));
  });

  it("slider speed applies immediately", () => {
    const g = newGame();
    tuning.slideSpeed = 100;
    expect(sliderSpeed(g)).toBe(100);
    const x0 = g.slider.x;
    step(g, 0.1);
    expect(g.slider.x - x0).toBeCloseTo(10);
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
