import { afterEach, describe, expect, it } from "vitest";
import {
  BASE_WIDTH,
  CALM_TIME,
  HARD_CALM_TIME,
  HARD_KICK_SCALE,
  HARD_PERFECT_TOLERANCE,
  HARD_SLIDE_SPEED_MAX,
  HARD_SLIDE_SPEED_SCALE,
  HARD_SWAY_KICK_MAX,
  HARD_SWAY_SCALE,
  HARD_TEMPO_MAX,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_SPEED_MAX,
  resetTuning,
  tuning,
} from "./config";
import {
  balanceFailure,
  drop,
  kickAmplitude,
  musicTempo,
  newGame,
  perfectTolerance,
  sliderSpeed,
  startLives,
  step,
  swayOffset,
  top,
  type Block,
  type GameState,
  type Tip,
} from "./game";
import { VIEW_WIDTH } from "./camera";
import {
  FRAME,
  humanPlayer,
  mash,
  mulberry32,
  percentile,
  perfectPlayer,
  play,
  randomSpam,
  rhythmSpam,
  scores,
  type Player,
} from "./testing/hard-bots";

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

/** Small seeded PRNG so property checks replay exactly. */
const rng = mulberry32;

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

  it("a sloppy drop kicks the sway harder than the same overhang in Normal", () => {
    const hard = newGame("hard");
    const normal = newGame();
    for (const g of [hard, normal]) {
      aim(g, 0);
      drop(g);
      aim(g, 9);
      drop(g);
    }
    expect(kickAmplitude(normal)).toBeGreaterThan(0);
    expect(kickAmplitude(hard)).toBeCloseTo(kickAmplitude(normal) * HARD_KICK_SCALE, 9);
  });

  it("and the kick is capped where the swaying top bar still fits a phone's screen", () => {
    const g = newGame("hard");
    for (let i = 0; i < 20; i++) {
      aim(g, 0);
      drop(g);
    }
    for (let i = 0; i < 6; i++) {
      for (const dx of [22, -22]) {
        aim(g, dx);
        expect(drop(g)?.kind).toBe("placed");
        expect(kickAmplitude(g)).toBeLessThanOrEqual(HARD_SWAY_KICK_MAX + 1e-9);
        sway(g, 0.3);
      }
    }
    expect(kickAmplitude(g)).toBeGreaterThan(HARD_SWAY_KICK_MAX * 0.8);
    // The full wave plus the most kick: a straight tower's top bar and its swing either side fit the
    // view. (A leaning tower needs the camera's pan too, which is off while the base is on screen.)
    expect(BASE_WIDTH + 2 * (tuning.swayBase * HARD_SWAY_SCALE + HARD_SWAY_KICK_MAX)).toBeLessThanOrEqual(VIEW_WIDTH);
  });

  it("a kicked tower swings on longer than in Normal", () => {
    const hard = newGame("hard");
    const normal = newGame();
    for (const g of [hard, normal]) {
      aim(g, 0);
      drop(g);
      aim(g, 9);
      drop(g);
    }
    const left = (g: GameState) => {
      const before = kickAmplitude(g);
      sway(g, 2);
      return kickAmplitude(g) / before;
    };
    expect(left(hard)).toBeGreaterThan(left(normal) * 1.5);
  });

  it("sways more than Normal: stronger, sooner and faster", () => {
    const hard = newGame("hard");
    const normal = newGame();
    const reach = (g: GameState, level: number) => {
      let most = 0;
      const s = structuredClone(g);
      for (let t = 0; t < 4; t += FRAME) {
        step(s, FRAME);
        most = Math.max(most, Math.abs(swayOffset(s, level)));
      }
      return most;
    };
    // Low down the Normal tower barely moves; Hard's already swings.
    expect(reach(hard, 10)).toBeGreaterThan(reach(normal, 10) * 5);
    expect(reach(hard, 40)).toBeGreaterThan(reach(normal, 40) * 1.3);
    // A full swing takes less time: count zero crossings at the top over the same time.
    const crossings = (g: GameState) => {
      const s = structuredClone(g);
      let n = 0;
      let last = swayOffset(s, 40);
      for (let t = 0; t < 10; t += FRAME) {
        step(s, FRAME);
        const now = swayOffset(s, 40);
        if (Math.sign(now) !== Math.sign(last)) n++;
        last = now;
      }
      return n;
    };
    expect(crossings(hard)).toBeGreaterThan(crossings(normal));
  });

  it("a perfect snaps centered on the bar below, calms the sway and counts the streak", () => {
    const g = newGame("hard");
    aim(g, 9);
    drop(g);
    const under = top(g);
    aim(g, HARD_PERFECT_TOLERANCE * 0.9);
    const r = drop(g);
    expect(r).toEqual({ kind: "perfect", placed: { x: under.x, w: BASE_WIDTH }, regained: 0 });
    expect(g.streak).toBe(1);
    expect(g.perfects).toBe(1);
    expect(g.calmTimer).toBe(HARD_CALM_TIME);
  });

  it("the perfect window is tighter than Normal's, and its calm weaker and shorter", () => {
    expect(perfectTolerance("hard")).toBe(HARD_PERFECT_TOLERANCE);
    expect(perfectTolerance("normal")).toBe(PERFECT_TOLERANCE);
    expect(HARD_PERFECT_TOLERANCE).toBeLessThan(PERFECT_TOLERANCE);
    expect(HARD_CALM_TIME).toBeLessThan(CALM_TIME);
    const dx = (HARD_PERFECT_TOLERANCE + PERFECT_TOLERANCE) / 2;
    const hard = newGame("hard");
    const normal = newGame();
    for (const g of [hard, normal]) {
      aim(g, dx);
      drop(g);
    }
    expect(normal.perfects).toBe(1);
    expect(hard.perfects).toBe(0);

    // The same perfect on the same swinging tower leaves Hard swaying more.
    const calmed = (mode: "hard" | "normal") => {
      const g = newGame(mode);
      for (let i = 0; i < 30; i++) {
        aim(g, 0);
        drop(g);
      }
      g.calm = 1;
      g.swayAngle = Math.PI / 2;
      const still = { ...g, calm: 0 };
      return swayOffset(g, 30) / swayOffset(still, 30);
    };
    expect(calmed("hard")).toBeGreaterThan(calmed("normal"));
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

  it("the slider starts faster than Normal's, speeds up harder and tops out higher", () => {
    const hard = newGame("hard");
    const normal = newGame();
    expect(sliderSpeed(hard)).toBe(tuning.slideSpeed * HARD_SLIDE_SPEED_SCALE);
    const start = [sliderSpeed(hard), sliderSpeed(normal)] as const;
    for (let i = 0; i < 150; i++) {
      for (const g of [hard, normal]) {
        aim(g, 0);
        drop(g);
      }
      expect(sliderSpeed(hard)).toBeGreaterThan(sliderSpeed(normal));
      // A steeper ramp: more speed gained so far, until Normal closes in on its own cap.
      if (i < 30) expect(sliderSpeed(hard) - start[0]).toBeGreaterThan((sliderSpeed(normal) - start[1]) * 2);
    }
    expect(sliderSpeed(hard)).toBe(HARD_SLIDE_SPEED_MAX);
    expect(sliderSpeed(normal)).toBe(SLIDE_SPEED_MAX);
    expect(HARD_SLIDE_SPEED_MAX).toBeGreaterThan(SLIDE_SPEED_MAX);
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

  it("Hard keeps pace with the slider, from 1 at Hard's starting speed up to the cap", () => {
    const g = newGame("hard");
    expect(musicTempo(g)).toBe(1); // title screen
    let last = 1;
    for (let i = 0; i < 60; i++) {
      aim(g, 0);
      drop(g);
      const rate = musicTempo(g);
      const expected = Math.min(HARD_TEMPO_MAX, sliderSpeed(g) / (tuning.slideSpeed * HARD_SLIDE_SPEED_SCALE));
      if (i === 0) expect(rate).toBeLessThan(1.1); // the first drop barely moves it
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

  it("a bot that only ever drops perfects reaches 100 without ever toppling", () => {
    const g = newGame("hard");
    let ticks = 0;
    while (g.score < 100 && g.phase === "playing" && ticks < 1e6) {
      step(g, DT);
      ticks++;
      if (Math.abs(g.slider.x - topWorldX(g)) <= HARD_PERFECT_TOLERANCE * 0.8) drop(g);
    }
    expect(g.phase).toBe("playing");
    expect(g.score).toBe(100);
    expect(g.perfects).toBe(100);
    expect(g.toppled).toBeNull();
    expect(g.lives).toBe(1);
  });

  it("a bot that ignores sway lands off-center: fewer perfects and a crooked tower", () => {
    const g = newGame("hard");
    let ticks = 0;
    while (g.score < 100 && g.phase === "playing" && ticks < 1e6) {
      step(g, DT);
      ticks++;
      if (Math.abs(g.slider.x - top(g).x) <= HARD_PERFECT_TOLERANCE * 0.8) drop(g);
    }
    expect(g.perfects).toBeLessThan(g.score * 0.6);
    expect(g.blocks.some((b, i) => i > 0 && Math.abs(b.x - g.blocks[i - 1]!.x) > 3)).toBe(true);
  });
});

// "Spam doesn't work": seeded players, 200 runs each, frame by frame at 60 Hz the way main.ts plays.
// Taps that never look at the screen must die within a couple of dozen bars; aiming must pay.
describe("hard: spam doesn't work, aiming does", () => {
  const RUNS = 200;
  /** Blind tapping: 95% of runs under 25 bars and none past 50. */
  function blind(s: number[]): void {
    expect(s).toHaveLength(RUNS);
    expect(percentile(s, 0.95)).toBeLessThan(25);
    expect(s.at(-1)!).toBeLessThanOrEqual(50);
  }

  it("random tap intervals (40-400 ms, and up to 1.5 s) die early", () => {
    blind(scores(RUNS, (seed) => play("hard", randomSpam(mulberry32(seed), 40, 400))));
    blind(scores(RUNS, (seed) => play("hard", randomSpam(mulberry32(seed), 40, 1500))));
  });

  it("a fixed rhythm dies early, whatever the beat (40 ms to 2 s, any start)", () => {
    blind(
      scores(RUNS, (seed) => {
        const period = 40 + ((2000 - 40) * (seed - 1)) / (RUNS - 1);
        return play("hard", rhythmSpam(period, 2000 * mulberry32(seed)()));
      }),
    );
  });

  it("no fixed rhythm rides the sway: a dense scan of beats (40 ms to 3 s, 2 ms apart, 12 starts) gets nowhere", () => {
    // Some tunings let a beat near half the sway period lock in with the kicks and climb for
    // hundreds of bars, inside windows a few ms wide that 200 spread-out beats can miss: with the
    // sway period at ×0.6, the 200 beats above top out at 19 while this scan hits its cap of 60.
    // Hard as it was before "everything to 11" let a beat reach 39 here. Each run stops at 60 bars,
    // so a lock-in costs little time.
    let most = 0;
    let at = "";
    for (let period = 40; period <= 3000; period += 2) {
      for (let k = 0; k < 12; k++) {
        const score = play("hard", rhythmSpam(period, k * 250), 60).score;
        if (score > most) [most, at] = [score, `every ${period} ms from ${k * 250} ms`];
      }
    }
    expect(most, at).toBeLessThan(25);
  });

  it("tapping as fast as possible dies at once", () => {
    const s = scores(RUNS, (seed) => play("hard", mash(seed * 13)));
    blind(s);
    expect(s.at(-1)!).toBeLessThanOrEqual(2);
  });

  it("perfect timing (the best frame as the slider passes over the swaying top) climbs past 150", () => {
    // Each start waits for a different pass of the first slider (first taps at 0.77, 2.28, 3.82 and
    // 5.35 s), so these are four different runs.
    for (const start of [0, 1.13, 2.7, 4.3]) {
      const late: Player = (g, t) => t >= start && perfectPlayer()(g, t);
      const run = play("hard", late, 160);
      expect(run.end, `start ${start}`).toBe("playing");
      expect(run.score).toBe(160);
      expect(run.perfects).toBeGreaterThan(run.score / 2);
    }
  });

  it("a good human (aims; 40 ms timing noise, a 250 ms reaction) gets a moderate run", () => {
    const s = scores(RUNS, (seed) => play("hard", humanPlayer(mulberry32(seed * 101))));
    const median = percentile(s, 0.5);
    expect(median).toBeGreaterThanOrEqual(15);
    expect(median).toBeLessThanOrEqual(60);
    // Far beyond blind tapping, and nobody gets near the perfect bot.
    expect(s[0]!).toBeGreaterThan(5);
    expect(s.at(-1)!).toBeLessThan(150);
  });

  it("the sway matters: aiming at the swaying top beats timing the slider alone", () => {
    const sees = scores(RUNS, (seed) => play("hard", humanPlayer(mulberry32(seed * 101))));
    const blindToSway = scores(RUNS, (seed) => play("hard", humanPlayer(mulberry32(seed * 101), { seesSway: false })));
    expect(percentile(sees, 0.5)).toBeGreaterThan(percentile(blindToSway, 0.5));
  });
});
