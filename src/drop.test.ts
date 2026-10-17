import { createCanvas } from "@napi-rs/canvas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kitFor } from "./base/style";
import {
  BLOCK_HEIGHT,
  CALM_TIME,
  DROP_GAP,
  LIVES,
  PERFECT_TOLERANCE,
  SLIDE_RANGE,
  SLIDE_SPEED_MAX,
  TEMPO_MAX,
  resetTuning,
  tuning,
} from "./config";
import {
  drop,
  fallTime,
  musicTempo,
  newGame,
  sliderGap,
  sliderLift,
  sliderSpeed,
  step,
  swayOffset,
  top,
  type DropResult,
  type GameState,
  type Mode,
} from "./game";
import { newView, render } from "./render";
import { SKINS } from "./skins";
import {
  FRAME,
  humanPlayer,
  land,
  mulberry32,
  percentile,
  perfectPlayer,
  play,
  scores,
  topAtContact,
  topWorldX,
  type Player,
} from "./testing/bots";
import { MODE_CHOICES } from "./title";

// Drop (mode "hard") is Slide (mode "normal") with one difference: the slider runs a bar above the
// tower, and a tap lets the bar go to fall straight down onto it, landing on contact against the
// top bar where it has swayed to by then. Everything else is Slide's: slicing, perfects, lives,
// the speed ramp, sway, kicks and calm.

afterEach(resetTuning);

/** Set the slider so a bar let go now lands `dx` right of the swaying top (as it will be at contact). */
function aim(g: GameState, dx: number): void {
  g.slider.x = topAtContact(g) + dx;
}

/** Let the tower sway a while, so drops land on a moving target. */
function sway(g: GameState, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) step(g, FRAME);
}

/** A tower of `n` perfect bars, swayed a bit between drops. */
function tower(mode: Mode, n: number): GameState {
  const g = newGame(mode);
  for (let i = 0; i < n; i++) {
    sway(g, 0.3);
    aim(g, 0);
    land(g);
  }
  return g;
}

/** Step frame by frame, the way main.ts does, until a released bar lands: what happened, when, and the lift each frame. */
function fallOut(g: GameState): { r: DropResult; t: number; lifts: number[] } {
  const lifts = [sliderLift(g)];
  for (let t = FRAME; t < 2; t += FRAME) {
    const r = step(g, FRAME);
    if (r) return { r, t, lifts };
    lifts.push(sliderLift(g));
  }
  throw new Error("the bar never landed");
}

/**
 * The same moment in Slide: a Drop state with a bar let go (or about to be), stepped to contact with
 * the slider held where it was let go, as a Slide state. Slide's drop there must do exactly what
 * Drop's landing does.
 */
function asSlideAtContact(g: GameState): GameState {
  const s = structuredClone(g);
  const held = { ...s.slider };
  s.mode = "normal";
  s.fall = null;
  step(s, fallTime("hard") - (g.fall?.t ?? 0));
  s.slider = held;
  return s;
}

describe("Drop: the bar falls from a bar above", () => {
  it("the slider runs a clear bar above the tower top; Slide's runs level with it", () => {
    expect(DROP_GAP).toBe(BLOCK_HEIGHT);
    expect(sliderGap("hard")).toBe(DROP_GAP);
    const g = newGame("hard");
    expect(g.fall).toBeNull();
    for (let i = 0; i < 6; i++) {
      expect(sliderLift(g)).toBe(DROP_GAP);
      aim(g, i % 2 ? 3 : 0);
      land(g);
    }
    const n = newGame();
    expect([sliderGap("normal"), sliderLift(n), fallTime("normal")]).toEqual([0, 0, 0]);
  });

  it("a tap stops the slider and lets the bar go: it falls straight down, faster and faster, landing fallTime later", () => {
    const g = newGame("hard");
    step(g, 0.3);
    g.slider.x = top(g).x + 0.5; // over the base, which never sways
    const x = g.slider.x;
    expect(drop(g)).toBeNull();
    expect(g.fall).toEqual({ t: 0 });
    const T = fallTime("hard");
    // Quick but readable.
    expect(T).toBeGreaterThan(0.2);
    expect(T).toBeLessThan(0.35);
    let frames = 0;
    for (let t = 0; t + FRAME < T; t += FRAME) {
      expect(step(g, FRAME)).toBeNull();
      frames++;
      // Nothing lands before contact, and the bar falls where it was let go.
      expect(g.slider.x).toBe(x);
      expect(g.blocks).toHaveLength(1);
      expect(g.score).toBe(0);
      expect(g.fall!.t).toBeCloseTo(frames * FRAME, 12);
      expect(sliderLift(g)).toBeCloseTo(DROP_GAP * (1 - (frames * FRAME) ** 2 / (T * T)), 9);
    }
    expect(step(g, FRAME)?.kind).toBe("perfect");
    expect(g.fall).toBeNull();
    expect(g.blocks).toHaveLength(2);
    // Accelerating: each frame of the fall covers more than the one before.
    const h = newGame("hard");
    drop(h);
    const { t, lifts } = fallOut(h);
    expect(t).toBeGreaterThanOrEqual(T);
    expect(t - FRAME).toBeLessThan(T);
    const fell = lifts.slice(1).map((l, i) => lifts[i]! - l);
    for (let i = 1; i < fell.length; i++) expect(fell[i]!).toBeGreaterThan(fell[i - 1]!);
    expect(lifts.every((l) => l > 0 && l <= DROP_GAP)).toBe(true);
  });

  it("taps while a bar falls are ignored", () => {
    const g = tower("hard", 8);
    aim(g, 0);
    drop(g);
    step(g, 0.1);
    const before = structuredClone(g);
    for (let i = 0; i < 5; i++) expect(drop(g)).toBeNull();
    expect(g).toEqual(before);
    // It lands on time, once.
    expect(step(g, fallTime("hard") - 0.1 - 1e-9)).toBeNull();
    expect(step(g, 2e-9)?.kind).toBe("perfect");
    expect(g.score).toBe(9);
    expect(g.fall).toBeNull();
  });

  it("lands at contact in world space, against the top bar where it has swayed to, not where it was at the tap", () => {
    const g = tower("hard", 40);
    // A moment when the top sways well past the perfect window during a fall.
    for (let i = 0; Math.abs(topAtContact(g) - topWorldX(g)) < 6; i++) {
      if (i > 600) throw new Error("the top never swayed that far in a fall");
      step(g, FRAME);
    }
    const now = topWorldX(g);
    const then = topAtContact(g);
    const under = top(g);

    // Lined up with the top as it is at the tap: sliced at contact by how far the top swayed. The
    // bar keeps the overlap, at the world x where it fell; the overhang falls off in world space.
    const a = structuredClone(g);
    a.slider.x = now;
    const r = land(a);
    expect(r?.kind).toBe("sliced");
    if (r?.kind !== "sliced") return;
    expect(r.cut.w).toBeCloseTo(Math.abs(then - now), 9);
    expect(r.placed.w + r.cut.w).toBeCloseTo(under.w, 9);
    const placedX = top(a).x + swayOffset(a, a.blocks.length - 1);
    expect(placedX).toBeCloseTo(Math.max(now, then), 9);
    expect(r.cut.x).toBeCloseTo(then < now ? then + under.w : now, 9);
    expect(a.streak).toBe(0);

    // Lined up with where the top will be: a perfect.
    const b = structuredClone(g);
    b.slider.x = then;
    expect(land(b)?.kind).toBe("perfect");
    expect(b.streak).toBe(41);
  });

  it("frame by frame it lands as it would in one step to contact", () => {
    const g = newGame("hard");
    for (let i = 0; i < 20; i++) {
      sway(g, 0.2);
      aim(g, [0, 4, -3, 0, 6][i % 5]!);
      land(g);
    }
    step(g, 0.37);
    aim(g, 5);
    const once = structuredClone(g);
    const exact = land(once);
    drop(g);
    const { r } = fallOut(g);
    expect(r.kind).toBe(exact?.kind);
    // (The sway's spring is integrated in frame-sized substeps instead of one fall-sized step.)
    expect(top(g).x).toBeCloseTo(top(once).x, 4);
    expect(top(g).w).toBeCloseTo(top(once).w, 4);
  });

  it("the next bar shows up a bar above the new top, at the end of its run, and slides on for the rest of the frame", () => {
    const g = tower("hard", 3);
    aim(g, 4);
    drop(g);
    const r = step(g, fallTime("hard") + 0.05); // lands 0.05 s before the frame ends
    expect(r?.kind).toBe("sliced");
    expect(g.score).toBe(4);
    expect(g.fall).toBeNull();
    expect(sliderLift(g)).toBe(DROP_GAP);
    const t = top(g);
    // The slider has the new top's width (the slice is gone from it too).
    expect(g.slider.w).toBe(t.w);
    expect(t.w).toBeCloseTo(60 - 4, 9);
    // Level 4 starts from the left end of the run (centered on the new top's rest center).
    expect(g.slider.dir).toBe(1);
    expect(g.slider.x).toBeCloseTo(t.x + t.w / 2 - SLIDE_RANGE - t.w / 2 + sliderSpeed(g) * 0.05, 9);
  });
});

describe("Drop lands by Slide's rules", () => {
  it("whatever the aim and the sway, the landing is exactly Slide's drop at the moment of contact", () => {
    const r = mulberry32(7);
    const g = newGame("hard");
    const kinds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      if (g.phase === "over") {
        // A fresh run, and keep going.
        kinds.add("over");
        Object.assign(g, newGame("hard"));
      }
      sway(g, r() * 1.5);
      // Perfect, near, sloppy, or off the tower entirely.
      const pick = r();
      const dx = pick < 0.35 ? 0 : pick < 0.6 ? (r() - 0.5) * 6 : pick < 0.97 ? (r() - 0.5) * 30 : 200;
      aim(g, dx);
      if (r() < 0.5) {
        // Let go, a few frames of the fall, then the rest of it.
        drop(g);
        step(g, FRAME * Math.floor(r() * 10));
      }
      const slide = asSlideAtContact(g);
      const expected = drop(slide);
      const got = g.fall ? step(g, fallTime("hard") - g.fall.t) : land(g);
      expect(got).toEqual(expected);
      expect({ ...g, mode: "normal" }).toEqual(slide);
      kinds.add(got!.kind);
    }
    expect([...kinds].sort()).toEqual(["miss", "over", "perfect", "sliced"]);
  });

  it("a sloppy landing slices off the overhang and kicks the sway toward it, as in Slide", () => {
    const g = tower("hard", 12);
    sway(g, 0.4);
    aim(g, -7);
    const r = land(g);
    expect(r?.kind).toBe("sliced");
    if (r?.kind !== "sliced") return;
    expect(r.cut.w).toBeCloseTo(7, 9);
    expect(g.cuts.at(-1)).toEqual({ w: r.cut.w, side: 1 });
    // Kicked left (the overhang's side): velocity only, so the tower doesn't jump.
    expect(g.kickVel).toBeLessThan(0);
  });

  it("a perfect at contact snaps square, calms the sway, counts the streak and wins back the newest slice", () => {
    const g = tower("hard", 10);
    aim(g, 5);
    land(g);
    aim(g, -3);
    land(g);
    const width = top(g).w;
    expect(width).toBeCloseTo(60 - 5 - 3, 9);
    sway(g, 2.5);
    aim(g, PERFECT_TOLERANCE * 0.5);
    const r = land(g);
    expect(r?.kind).toBe("perfect");
    if (r?.kind !== "perfect") return;
    expect(r.regained).toBeCloseTo(3, 9);
    expect(top(g).w).toBeCloseTo(width + 3, 9);
    expect([g.streak, g.calmTimer]).toEqual([1, CALM_TIME]);
    aim(g, 0);
    expect(land(g)).toMatchObject({ kind: "perfect", regained: 5 });
    expect(top(g).w).toBeCloseTo(60, 9);
    expect(g.streak).toBe(2);
  });

  it(`a miss comes at contact, not at the tap, and costs one of ${LIVES} lives; game over at the last`, () => {
    const g = tower("hard", 5);
    expect(g.lives).toBe(LIVES);
    expect(LIVES).toBe(3);
    for (let life = LIVES; life > 0; life--) {
      aim(g, 500);
      drop(g);
      expect(step(g, fallTime("hard") / 2)).toBeNull();
      expect([g.phase, g.lives, g.score]).toEqual(["playing", life, 5]);
      expect(step(g, fallTime("hard"))?.kind).toBe("miss");
      expect(g.lives).toBe(life - 1);
      // The run goes on at the same level, with the next bar a bar above the same top.
      expect(g.score).toBe(5);
      if (life > 1) expect([g.phase, sliderLift(g)]).toEqual(["playing", DROP_GAP]);
    }
    expect(g.phase).toBe("over");
    // Game over stops the clock: nothing falls or slides after it, and taps do nothing.
    const after = structuredClone(g);
    expect(drop(g)).toBeNull();
    expect(step(g, 1)).toBeNull();
    expect(g).toEqual(after);
  });

  it("the slider speeds up exactly as in Slide, from slow to fast", () => {
    const d = newGame("hard");
    const s = newGame();
    expect(sliderSpeed(d)).toBe(tuning.slideSpeed);
    for (let i = 0; i < 120; i++) {
      d.score = s.score = i;
      expect(sliderSpeed(d)).toBe(sliderSpeed(s));
      if (i > 0) expect(sliderSpeed(d)).toBeGreaterThanOrEqual(sliderSpeed({ ...d, score: i - 1 }));
    }
    expect(sliderSpeed(d)).toBe(SLIDE_SPEED_MAX);
    // And it slides at that speed.
    const g = newGame("hard");
    const x = g.slider.x;
    step(g, 0.1);
    expect(g.slider.x - x).toBeCloseTo(tuning.slideSpeed * 0.1, 9);
  });

  it("sways, kicks and calms exactly as Slide does", () => {
    const g = tower("hard", 30);
    aim(g, 9);
    land(g);
    for (let i = 0; i < 120; i++) {
      step(g, FRAME);
      const s = { ...g, mode: "normal" as const };
      for (const level of [0, 5, 20, 31]) expect(swayOffset(g, level)).toBe(swayOffset(s, level));
    }
  });

  it("Slide is unchanged: a tap lands at once and nothing ever falls", () => {
    const g = newGame();
    step(g, 0.5);
    g.slider.x = top(g).x;
    expect(drop(g)?.kind).toBe("perfect");
    expect(g.fall).toBeNull();
    for (let i = 0; i < 30; i++) expect(step(g, FRAME)).toBeNull();
    expect(g.fall).toBeNull();
    expect(sliderLift(g)).toBe(0);
  });
});

describe("music tempo", () => {
  it.each<Mode>(["normal", "hard"])("%s: keeps pace with the slider, from as written at the run's start up to the cap", (mode) => {
    const g = newGame(mode);
    expect(musicTempo(g)).toBe(1); // title screen, and the run's start
    let last = 1;
    for (let i = 0; i < 60; i++) {
      aim(g, 0);
      land(g);
      const rate = musicTempo(g);
      if (i === 0) expect(rate).toBeLessThan(1.1); // the first drop barely moves it
      expect(rate).toBeCloseTo(Math.min(TEMPO_MAX, sliderSpeed(g) / tuning.slideSpeed), 12);
      expect(rate).toBeGreaterThanOrEqual(last);
      last = rate;
    }
    expect(last).toBe(TEMPO_MAX);
  });

  it("the same in both modes at the same height", () => {
    const d = newGame("hard");
    const s = newGame();
    for (let i = 0; i < 30; i++) {
      for (const g of [d, s]) {
        aim(g, i % 3 ? 2 : 0);
        land(g);
      }
      expect(musicTempo(d)).toBe(musicTempo(s));
    }
  });

  it.each<Mode>(["normal", "hard"])("%s: never slower than written, even with a slider tuned past the speed cap", (mode) => {
    tuning.slideSpeed = 200;
    const g = newGame(mode);
    aim(g, 0);
    land(g);
    expect(musicTempo(g)).toBe(1);
  });

  it.each<Mode>(["normal", "hard"])("%s: back to 1 at game over", (mode) => {
    const g = tower(mode, 20);
    expect(musicTempo(g)).toBeGreaterThan(1);
    while (g.phase === "playing") {
      aim(g, 500);
      land(g);
    }
    expect(musicTempo(g)).toBe(1);
  });
});

describe("drawn", () => {
  /** What a frame draws: the bars it hands the style kit (y, height, level) and its words. */
  function drawn(g: GameState) {
    const skin = SKINS[0]!;
    const spy = vi.spyOn(kitFor(skin), "bar");
    const canvas = createCanvas(390, 844);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const words: string[] = [];
    const fill = ctx.fillText.bind(ctx);
    ctx.fillText = (t: string, x: number, y: number) => {
      words.push(t);
      fill(t, x, y);
    };
    try {
      render(ctx, 390, 844, g, newView(), 7, skin);
      const bars = spy.mock.calls.map(([, , y, , h, level]) => ({ y, h, level }));
      return { bars, words };
    } finally {
      spy.mockRestore();
    }
  }

  /** How far above the top bar the slider's bar is drawn, in bar heights (1: resting on it). */
  function above(g: GameState): number {
    const { bars } = drawn(g);
    const slider = bars.filter((b) => b.level === g.blocks.length);
    const topBar = bars.filter((b) => b.level === g.blocks.length - 1);
    expect([slider.length, topBar.length]).toEqual([1, 1]);
    return (topBar[0]!.y - slider[0]!.y) / slider[0]!.h;
  }

  it("Drop's slider is drawn a clear bar above the top bar (Slide's rests on it); a released bar closes the gap as it falls", () => {
    expect(above(tower("normal", 3))).toBeCloseTo(1, 9);
    const g = tower("hard", 3);
    expect(above(g)).toBeCloseTo(1 + DROP_GAP / BLOCK_HEIGHT, 9);
    expect(DROP_GAP / BLOCK_HEIGHT).toBe(1);
    aim(g, 0);
    drop(g);
    let last = above(g);
    let frames = 0;
    for (;;) {
      expect(step(g, FRAME)).toBeNull();
      if (fallTime("hard") - g.fall!.t < FRAME) break;
      const now = above(g);
      expect(now).toBeCloseTo(1 + sliderLift(g) / BLOCK_HEIGHT, 9);
      expect(now).toBeLessThan(last);
      expect(now).toBeGreaterThan(1);
      last = now;
      frames++;
    }
    expect(frames).toBeGreaterThan(10);
  });

  it("the run's first frames say \"tap to drop\" until the bar is let go", () => {
    for (const mode of ["normal", "hard"] as const) {
      const g = newGame(mode);
      expect(drawn(g).words).toContain("tap to drop");
      g.slider.x = top(g).x;
      drop(g);
      expect(drawn(g).words).not.toContain("tap to drop");
    }
  });
});

describe("names", () => {
  it("the player sees Slide and Drop; the ids stay normal and hard", () => {
    expect(MODE_CHOICES).toEqual([
      { value: "normal", title: "Slide" },
      { value: "hard", title: "Drop" },
    ]);
  });

  it("Drop's run start says DROP under the name; Slide's doesn't; both start with three lives", () => {
    /** The words a fresh run's first frame draws. */
    const words = (mode: Mode) => {
      const canvas = createCanvas(390, 844);
      const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      const texts: string[] = [];
      const fill = ctx.fillText.bind(ctx);
      ctx.fillText = (t: string, x: number, y: number) => {
        texts.push(t);
        fill(t, x, y);
      };
      render(ctx, 390, 844, newGame(mode), newView(), 7, SKINS[0]!);
      return texts;
    };
    expect(words("hard").filter((t) => t === "DROP")).toHaveLength(1);
    expect(words("normal")).not.toContain("DROP");
    expect(words("normal")).not.toContain("SLIDE");
    expect([newGame("hard").lives, newGame().lives]).toEqual([3, 3]);
  });
});

describe("Drop bots", () => {
  it("perfect timing (the best frame as the slider passes over where the swaying top will be) climbs past 300", () => {
    // Each start waits for a different pass of the first slider, so these are four different runs.
    // The bot foresees the sway at contact exactly.
    for (const start of [0, 1.13, 2.7, 4.3]) {
      const perfect = perfectPlayer();
      const late: Player = (g, t) => t >= start && perfect(g, t);
      const run = play("hard", late, 300);
      expect(run.end, `start ${start}`).toBe("playing");
      expect(run.score).toBe(300);
      expect(run.perfects).toBe(300);
    }
  });

  // Good humans, 200 seeded runs each, frame by frame at 60 Hz (40 ms timing noise, a 250 ms
  // reaction after each landing). Measured: Slide's median 52; Drop's 50 reading the sway at
  // contact exactly, 49 reading it ahead from what it shows (its place and speed), 42 aiming at the
  // top as it is at the tap (Slide's habit); 32 in either mode timing the slider alone.
  const RUNS = 200;
  const SLOW = { timeout: 30_000 };
  const medians = new Map<string, number>();
  /** The median score of RUNS seeded good humans (each batch is played once and remembered). */
  const human = (mode: Mode, opts: Parameters<typeof humanPlayer>[1] = {}): number => {
    const key = JSON.stringify([mode, opts]);
    let m = medians.get(key);
    if (m === undefined) {
      m = percentile(scores(RUNS, (seed) => play(mode, humanPlayer(mulberry32(seed * 101), opts))), 0.5);
      medians.set(key, m);
    }
    return m;
  };

  it("a good human does about as well in Drop as in Slide, reading the sway ahead", SLOW, () => {
    const slide = human("normal");
    const exact = human("hard");
    const reads = human("hard", { aim: "extrapolate" });
    expect(slide).toBeGreaterThanOrEqual(35);
    expect(slide).toBeLessThanOrEqual(70);
    for (const d of [exact, reads]) {
      expect(d).toBeGreaterThan(slide * 0.8);
      expect(d).toBeLessThan(slide * 1.2);
    }
  });

  it("the fall matters: aiming at the top as it is at the tap does worse, far worse with precise timing", SLOW, () => {
    expect(human("hard", { aim: "now" })).toBeLessThan(human("hard"));
    const precise = { noiseMs: 20 };
    expect(human("hard", { ...precise, aim: "now" })).toBeLessThan(human("hard", precise) * 0.7);
  });

  it.each<Mode>(["normal", "hard"])("%s: the sway matters: aiming at the swaying top beats timing the slider alone", SLOW, (mode) => {
    expect(human(mode)).toBeGreaterThan(human(mode, { aim: "rest" }) * 1.3);
  });
});
