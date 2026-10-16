import { afterEach, describe, expect, it } from "vitest";
import { BASE_WIDTH, CALM_TIME, HARD_TEMPO_MAX, LIVES, PERFECT_TOLERANCE, resetTuning, tuning } from "./config";
import {
  balanceFailure,
  drop,
  musicTempo,
  newGame,
  sliderSpeed,
  startLives,
  step,
  swayOffset,
  top,
  type Block,
  type GameState,
  type Tip,
} from "./game";

afterEach(resetTuning);

const W = 60;
/** A tower of 60-wide bars from left edges. */
const tower = (...xs: number[]): Block[] => xs.map((x) => ({ x, w: W }));

/** Straightforward reference: the center of mass of each upper part, checked from the bottom up. */
function referenceFailure(blocks: Block[]): Tip | null {
  for (let i = 1; i < blocks.length; i++) {
    const upper = blocks.slice(i);
    const weight = upper.reduce((a, b) => a + b.w, 0);
    const com = upper.reduce((a, b) => a + b.w * (b.x + b.w / 2), 0) / weight;
    const bar = blocks[i]!;
    const below = blocks[i - 1]!;
    const left = Math.max(bar.x, below.x);
    const right = Math.min(bar.x + bar.w, below.x + below.w);
    if (com < left - 1e-9) return { level: i, dir: -1 };
    if (com > right + 1e-9) return { level: i, dir: 1 };
  }
  return null;
}

/** Small seeded PRNG (mulberry32) so property checks replay exactly. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("balance", () => {
  it("a centered stack stands, however tall", () => {
    expect(balanceFailure(tower(0))).toBeNull();
    expect(balanceFailure(tower(...Array<number>(500).fill(20)))).toBeNull();
  });

  it("a single bar overhanging less than half its width stands; past half it tips that way", () => {
    expect(balanceFailure(tower(0, 29))).toBeNull();
    expect(balanceFailure(tower(0, -29))).toBeNull();
    expect(balanceFailure(tower(0, 31))).toEqual({ level: 1, dir: 1 });
    expect(balanceFailure(tower(0, -31))).toEqual({ level: 1, dir: -1 });
  });

  it("a center of mass exactly on the contact edge still stands", () => {
    expect(balanceFailure(tower(0, 30))).toBeNull();
    expect(balanceFailure(tower(0, -30))).toBeNull();
  });

  it("weight follows width: a wide bar on top pulls the center its way", () => {
    // A narrow bar hanging off the right is fine alone; a wide bar over it, further right, is not.
    const narrow: Block[] = [{ x: 0, w: 60 }, { x: 40, w: 30 }];
    expect(balanceFailure(narrow)).toBeNull();
    expect(balanceFailure([...narrow, { x: 45, w: 60 }])).toEqual({ level: 1, dir: 1 });
    // The same top bar, but light: it balances on the narrow one.
    expect(balanceFailure([...narrow, { x: 45, w: 20 }])).toBeNull();
  });

  it("a staircase stands until its upper part's center of mass passes the bottom step's edge", () => {
    // 60-wide bars stepping 9 right: the bottom interface carries n bars whose center sits
    // 9(n+1)/2 right of the step below's center, past its edge (30) from n = 6.
    const stairs = (n: number) => tower(...Array.from({ length: n + 1 }, (_, i) => 9 * i));
    for (let n = 1; n <= 5; n++) expect(balanceFailure(stairs(n))).toBeNull();
    expect(balanceFailure(stairs(6))).toEqual({ level: 1, dir: 1 });
    // Mirrored, it tips the other way.
    const left = tower(...Array.from({ length: 7 }, (_, i) => -9 * i));
    expect(balanceFailure(left)).toEqual({ level: 1, dir: -1 });
  });

  it("the staircase falls at its own interface, not at the straight tower under it", () => {
    const straight = Array<number>(10).fill(0);
    const stairs = Array.from({ length: 6 }, (_, i) => 9 * (i + 1));
    expect(balanceFailure(tower(...straight, ...stairs))).toEqual({ level: 10, dir: 1 });
  });

  it("a counterweight brings it back: the bar that would tip the staircase stands on the other side", () => {
    const five = Array.from({ length: 6 }, (_, i) => 9 * i); // base + 5 steps, standing
    expect(balanceFailure(tower(...five, 54))).toEqual({ level: 1, dir: 1 });
    expect(balanceFailure(tower(...five, 18))).toBeNull();
  });

  it("the lowest failing interface wins", () => {
    // Both interfaces fail (to the right); the whole upper part goes from bar 1.
    expect(balanceFailure(tower(0, 35, 70))).toEqual({ level: 1, dir: 1 });
    // Only the top fails: just the top bar goes.
    expect(balanceFailure(tower(0, 0, 0, 31))).toEqual({ level: 3, dir: 1 });
    // A low interface failing left beats a high one failing right.
    expect(balanceFailure(tower(0, -40, -40, -40, -8))).toEqual({ level: 1, dir: -1 });
  });

  it("bars that no longer touch at rest cannot stand", () => {
    expect(balanceFailure(tower(0, 60.5))?.level).toBe(1);
    expect(balanceFailure([{ x: 0, w: 60 }, { x: 0, w: 60 }, { x: 61, w: 2 }])).toEqual({ level: 2, dir: 1 });
  });

  it("matches a straightforward reference on thousands of random deep towers", () => {
    const r = rng(7);
    for (let t = 0; t < 3000; t++) {
      const n = 2 + Math.floor(r() * 120);
      const blocks: Block[] = [{ x: 0, w: BASE_WIDTH }];
      for (let i = 1; i < n; i++) {
        const below = blocks[i - 1]!;
        const w = r() < 0.2 ? 10 + r() * 60 : W;
        // Mostly small steps (a slow lean), sometimes a big one.
        const stepX = (r() - 0.5) * (r() < 0.1 ? 70 : 8);
        blocks.push({ x: below.x + (below.w - w) / 2 + stepX, w });
      }
      expect(balanceFailure(blocks)).toEqual(referenceFailure(blocks));
    }
  });
});

/** World x of the tower top right now. */
function topWorldX(g: GameState): number {
  return top(g).x + swayOffset(g, g.blocks.length - 1);
}

/** Put the slider `dx` world units right of the swaying tower top. */
function aim(g: GameState, dx: number): void {
  g.slider.x = topWorldX(g) + dx;
}

/** Let the tower sway a while, so drops land on a moving target. */
function sway(g: GameState, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) step(g, 1 / 60);
}

describe("hard mode", () => {
  it("one life; Normal keeps its lives", () => {
    expect(newGame("hard").lives).toBe(1);
    expect(startLives("hard")).toBe(1);
    expect(newGame().lives).toBe(LIVES);
    expect(newGame().mode).toBe("normal");
    expect(newGame("hard").mode).toBe("hard");
  });

  it("an off-center drop keeps the whole bar exactly where it landed (world space): nothing is sliced", () => {
    const g = newGame("hard");
    for (let i = 0; i < 6; i++) {
      aim(g, 0);
      drop(g);
    }
    sway(g, 0.9);
    aim(g, 11);
    const worldX = g.slider.x;
    const r = drop(g);
    expect(r?.kind).toBe("placed");
    if (r?.kind === "placed") expect(r.overhang).toBeCloseTo(11);
    expect(top(g).w).toBe(BASE_WIDTH);
    expect(top(g).x + swayOffset(g, g.blocks.length - 1)).toBeCloseTo(worldX, 9);
    expect(g.cuts).toEqual([]);
    expect(g.score).toBe(7);
    expect(g.streak).toBe(0);
  });

  it("bars never shrink: the slider always has the top bar's width", () => {
    const g = newGame("hard");
    for (const dx of [12, -10, 8, -14, 5]) {
      aim(g, dx);
      drop(g);
      expect(g.slider.w).toBe(BASE_WIDTH);
    }
    expect(g.phase).toBe("playing");
    expect(g.blocks.every((b) => b.w === BASE_WIDTH)).toBe(true);
  });

  it("a sloppy drop kicks the sway exactly as hard as the same overhang in Normal", () => {
    const hard = newGame("hard");
    const normal = newGame();
    for (const g of [hard, normal]) {
      aim(g, 0);
      drop(g);
      aim(g, 13);
      drop(g);
    }
    expect(hard.kickVel).not.toBe(0);
    expect(hard.kickVel).toBe(normal.kickVel);
  });

  it("a perfect snaps centered on the bar below, calms the sway and counts the streak", () => {
    const g = newGame("hard");
    aim(g, 9);
    drop(g);
    const under = top(g);
    aim(g, PERFECT_TOLERANCE * 0.9);
    const r = drop(g);
    expect(r).toEqual({ kind: "perfect", placed: { x: under.x, w: BASE_WIDTH }, regained: 0 });
    expect(g.streak).toBe(1);
    expect(g.perfects).toBe(1);
    expect(g.calmTimer).toBe(CALM_TIME);
  });

  it("a drop with no overlap is a miss, and with one life the run is over", () => {
    const g = newGame("hard");
    aim(g, 500);
    expect(drop(g)?.kind).toBe("miss");
    expect(g.lives).toBe(0);
    expect(g.phase).toBe("over");
    expect(g.toppled).toBeNull();
    expect(drop(g)).toBeNull();
  });

  it("a drop that tips the tower ends the run: the bar does not score and the tip is reported", () => {
    const g = newGame("hard");
    aim(g, 0);
    drop(g);
    aim(g, 36); // more than half off: its weight is past the edge
    const r = drop(g);
    expect(r).toMatchObject({ kind: "toppled", tip: { level: 2, dir: 1 } });
    expect(g.toppled).toEqual({ level: 2, dir: 1 });
    expect(g.phase).toBe("over");
    expect(g.lives).toBe(0);
    expect(g.score).toBe(1);
    expect(g.blocks).toHaveLength(3); // the fallen bars stay in the state for the renderer
    expect(drop(g)).toBeNull();
  });

  it("tips left too, and a staircase goes from its bottom step", () => {
    const g = newGame("hard");
    aim(g, -40);
    expect(drop(g)).toMatchObject({ kind: "toppled", tip: { level: 1, dir: -1 } });

    const s = newGame("hard");
    const kinds: string[] = [];
    for (let i = 0; i < 6; i++) {
      aim(s, 9);
      kinds.push(drop(s)!.kind);
    }
    expect(kinds).toEqual(["placed", "placed", "placed", "placed", "placed", "toppled"]);
    expect(s.toppled).toEqual({ level: 1, dir: 1 });
  });

  it("a perfect is weight too: on a staircase at its limit even a perfect tips it (no PERFECT then)", () => {
    // Steps of 9.5: five stand (the upper part's center sits 1.5 inside the bottom step's edge);
    // a perfect on top adds a bar where the top already is, and that is past the edge.
    const blocks = tower(0, ...Array.from({ length: 5 }, (_, i) => 9.5 * (i + 1)));
    expect(balanceFailure(blocks)).toBeNull();
    expect(balanceFailure([...blocks, { x: 47.5, w: W }])).toEqual({ level: 1, dir: 1 });

    const g = newGame("hard");
    const base = g.blocks[0]!.x;
    g.blocks.push(...blocks.slice(1).map((b) => ({ x: base + b.x, w: W })));
    g.score = 5;
    aim(g, 0);
    const r = drop(g);
    expect(r).toMatchObject({ kind: "toppled", tip: { level: 1, dir: 1 } });
    expect(g.perfects).toBe(0);
    expect(g.streak).toBe(0);
    expect(g.score).toBe(5);
  });

  it("a counterweight keeps a leaning tower up", () => {
    const g = newGame("hard");
    for (let i = 0; i < 5; i++) {
      aim(g, 9);
      drop(g);
    }
    aim(g, -27); // back over the middle instead of further out
    expect(drop(g)?.kind).toBe("placed");
    expect(g.phase).toBe("playing");
  });

  it("sway alone never tips it: perfect drops on a wildly swaying tower always stand", () => {
    tuning.swayBase = 40;
    tuning.kickPerUnit = 4;
    const g = newGame("hard");
    for (let i = 0; i < 80; i++) {
      sway(g, 0.37);
      aim(g, 0);
      expect(drop(g)?.kind).toBe("perfect");
    }
    expect(g.phase).toBe("playing");
    expect(balanceFailure(g.blocks)).toBeNull();
  });

  it("the slider speeds up with the score exactly as in Normal", () => {
    const hard = newGame("hard");
    const normal = newGame();
    for (let i = 0; i < 30; i++) {
      for (const g of [hard, normal]) {
        aim(g, 0);
        drop(g);
      }
      expect(sliderSpeed(hard)).toBe(sliderSpeed(normal));
    }
  });
});

describe("music tempo", () => {
  it("Normal always plays as written", () => {
    const g = newGame();
    for (let i = 0; i < 40; i++) {
      aim(g, 0);
      drop(g);
    }
    expect(musicTempo(g)).toBe(1);
  });

  it("Hard follows the slider, from 1 at the start up to the cap", () => {
    const g = newGame("hard");
    expect(musicTempo(g)).toBe(1); // title screen
    let last = 1;
    for (let i = 0; i < 60; i++) {
      aim(g, 0);
      drop(g);
      const rate = musicTempo(g);
      const expected = Math.min(HARD_TEMPO_MAX, sliderSpeed(g) / tuning.slideSpeed);
      expect(rate).toBeCloseTo(expected, 12);
      expect(rate).toBeGreaterThanOrEqual(last);
      last = rate;
    }
    expect(last).toBe(HARD_TEMPO_MAX);
  });

  it("never slower than written, even with a slider tuned past the speed cap", () => {
    tuning.slideSpeed = 200;
    const g = newGame("hard");
    aim(g, 0);
    drop(g);
    expect(musicTempo(g)).toBe(1);
  });

  it("back to 1 at game over", () => {
    const g = newGame("hard");
    for (let i = 0; i < 20; i++) {
      aim(g, 0);
      drop(g);
    }
    expect(musicTempo(g)).toBeGreaterThan(1);
    aim(g, 500);
    drop(g);
    expect(musicTempo(g)).toBe(1);
  });
});

describe("hard bot", () => {
  const DT = 1 / 120;

  it("a bot that times both slider and sway reaches 100 without ever toppling", () => {
    const g = newGame("hard");
    let ticks = 0;
    while (g.score < 100 && g.phase === "playing" && ticks < 1e6) {
      step(g, DT);
      ticks++;
      if (Math.abs(g.slider.x - topWorldX(g)) <= PERFECT_TOLERANCE * 0.8) drop(g);
    }
    expect(g.phase).toBe("playing");
    expect(g.score).toBe(100);
    expect(g.toppled).toBeNull();
    expect(g.lives).toBe(1);
  });

  it("a bot that ignores sway lands off-center: fewer perfects and a crooked tower", () => {
    const g = newGame("hard");
    let ticks = 0;
    while (g.score < 100 && g.phase === "playing" && ticks < 1e6) {
      step(g, DT);
      ticks++;
      if (Math.abs(g.slider.x - top(g).x) <= PERFECT_TOLERANCE * 0.8) drop(g);
    }
    expect(g.perfects).toBeLessThan(g.score * 0.6);
    expect(g.blocks.some((b, i) => i > 0 && Math.abs(b.x - g.blocks[i - 1]!.x) > 3)).toBe(true);
  });
});
