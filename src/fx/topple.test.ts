import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";
import { kitFor } from "../base/style";
import { frameFor } from "../camera";
import { BLOCK_HEIGHT } from "../config";
import { drop, newGame, step, swayOffset, top, type GameState, type Mode } from "../game";
import { isToppling, newView, render, showLanding, updateView, type View } from "../render";
import { SKINS } from "../skins";
import { FRAME, topAtContact } from "../testing/bots";
import {
  BLAST_AT,
  breakLevel,
  burstPose,
  chunkPoses,
  DEBRIS_FADE,
  flashAlpha,
  puffPoses,
  shakeOffset,
  slabPoses,
  sparkPoses,
  TOPPLE_BARS,
  TOPPLE_TIME,
} from "./topple";

// The end of a run, in both modes: the miss that takes the last life sends the top of the tower
// over toward the side the bar missed on; then it blows up, and the card comes.

/** A run played the way main.ts plays it: the game steps, landings show on the view, the view steps. */
interface Run {
  g: GameState;
  v: View;
  /** Frames in which the view reported the blast (main.ts plays the boom and the haptic then). */
  blasts: number[];
  dt: number;
}

function landOn(run: Run, f: () => ReturnType<typeof step>): void {
  const { g, v } = run;
  const level = g.blocks.length;
  const under = top(g);
  const towerX = under.x + under.w / 2 + swayOffset(g, level - 1);
  const r = f();
  if (r) showLanding(v, g, r, level, towerX);
}

function frame(run: Run): void {
  landOn(run, () => step(run.g, run.dt));
  if (updateView(run.v, run.g, run.dt).blast) run.blasts.push(run.v.topple!.age);
}

/** Tap with the bar aimed `dx` right of where the swaying top will be when it lands; let it land. */
function tap(run: Run, dx: number): void {
  run.g.slider.x = topAtContact(run.g) + dx;
  landOn(run, () => drop(run.g));
  while (run.g.fall) frame(run);
}

function climb(mode: Mode, bars: number, dt = FRAME, pattern = [0, 2, -3, 0, 4, -1, 0, -2]): Run {
  const run: Run = { g: newGame(mode), v: newView(), blasts: [], dt };
  for (let i = 0; i < bars; i++) {
    tap(run, pattern[i % pattern.length]!);
    for (let t = 0; t < 0.3; t += dt) frame(run);
  }
  return run;
}

/** The last life, missed just past the top on `side`. */
function lastMiss(run: Run, side: -1 | 1): void {
  run.g.lives = 1;
  tap(run, side * (run.g.slider.w + 3));
}

/** Run frames until the topple is `age` seconds old (failing, not hanging, if it stops aging). */
function until(run: Run, age: number): void {
  for (let n = 0; run.v.topple!.age < age; n++) {
    if (n > 10 / run.dt) throw new Error(`the topple is stuck at ${run.v.topple!.age} s`);
    frame(run);
  }
}

/** Smoke puffs still out 0.35 s after the blast: most of them (it lingers). */
const PUFFS_LEFT = 6;

const CASES = (["normal", "hard"] as const).flatMap((mode) => ([-1, 1] as const).map((side) => [mode, side] as const));

describe("the last life: the top of the tower goes over", () => {
  it.each(CASES)("%s, missed %s: the top section swings over that way about its bottom corner on that side, faster and faster", (mode, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb(mode, 20);
    const { g, v } = run;
    lastMiss(run, side);
    expect(g.phase).toBe("over");
    const t = v.topple!;
    expect(t.dir).toBe(side);
    expect(t.level).toBe(g.blocks.length - TOPPLE_BARS);
    // The corner: where the section's lowest bar meets the bar below, on the toppling side.
    const drawn = (i: number) => g.blocks[i]!.x + swayOffset(g, i);
    const low = g.blocks[t.level]!;
    const below = g.blocks[t.level - 1]!;
    const corner =
      side > 0 ? Math.min(drawn(t.level) + low.w, drawn(t.level - 1) + below.w) : Math.max(drawn(t.level), drawn(t.level - 1));
    expect(t.px).toBeCloseTo(corner, 9);
    expect(t.py).toBe(t.level * BLOCK_HEIGHT);

    // At the miss it stands as drawn: no jump. (In Drop the miss lands inside a frame, which has
    // already aged the topple by then.)
    const start = slabPoses({ ...t, age: 0 });
    expect(start.map((p) => p.level)).toEqual(Array.from({ length: TOPPLE_BARS }, (_, i) => g.blocks.length - 1 - i));
    for (const p of start) {
      expect(p.cx).toBeCloseTo(drawn(p.level) + g.blocks[p.level]!.w / 2, 9);
      expect(p.cy).toBeCloseTo((p.level + 0.5) * BLOCK_HEIGHT, 9);
      expect(Math.abs(p.angle)).toBe(0);
    }
    const arm = (p: { cx: number; cy: number }) => Math.hypot(p.cx - t.px, p.cy - t.py);
    let lastX = start[0]!.cx;
    let lastMove = 0;
    let lastAngle = 0;
    let frames = 0;
    while (t.age + run.dt < BLAST_AT) {
      frame(run);
      frames++;
      const poses = slabPoses(t);
      // One rigid piece turning about the corner: every bar keeps its distance from it...
      poses.forEach((p, i) => expect(arm(p)).toBeCloseTo(arm(start[i]!), 9));
      // ...turning toward the side the bar missed on (clockwise on screen to the right), faster each frame.
      const top = poses[0]!;
      expect(top.angle * side).toBeGreaterThan(lastAngle * side);
      expect((top.cx - lastX) * side).toBeGreaterThan(lastMove);
      lastMove = (top.cx - lastX) * side;
      lastX = top.cx;
      lastAngle = top.angle;
    }
    expect(frames).toBeGreaterThan(20);
    // By the blast it has visibly gone over: a quarter of a right angle or more.
    expect(Math.abs(lastAngle)).toBeGreaterThan(Math.PI / 8);
    // The bars below the section still stand where they were.
    expect(g.blocks.length - t.level).toBe(TOPPLE_BARS);
  });

  it("a short tower: the bars above the base go over; a bare base goes over by itself, off its own corner on the ground", () => {
    const short = climb("normal", 3);
    lastMiss(short, 1);
    expect(breakLevel(short.g.blocks.length)).toBe(1);
    expect(short.v.topple!.level).toBe(1);
    expect(slabPoses(short.v.topple!)).toHaveLength(3);

    const bare: Run = { g: newGame("hard"), v: newView(), blasts: [], dt: FRAME };
    lastMiss(bare, -1);
    const t = bare.v.topple!;
    expect([t.level, t.dir, t.py]).toEqual([0, -1, 0]);
    expect(t.px).toBeCloseTo(bare.g.blocks[0]!.x, 9);
    until(bare, TOPPLE_TIME);
    expect(bare.blasts).toHaveLength(1);
  });

  it("nothing topples while a life is left: a miss just falls away", () => {
    const run = climb("hard", 6);
    tap(run, run.g.slider.w + 3);
    expect(run.g.lives).toBe(2);
    expect(run.v.topple).toBeNull();
    expect(run.v.falling.length).toBeGreaterThan(0);
  });
});

describe("then it blows up", () => {
  it.each(CASES)("%s, missed %s: once, while still falling, at BLAST_AT; the bars break up and fly that way and up, spinning", (mode, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb(mode, 20);
    lastMiss(run, side);
    const t = run.v.topple!;
    until(run, BLAST_AT - 1e-9);
    expect(run.blasts).toEqual([]);
    expect(t.chunks).toEqual([]);
    expect(slabPoses(t)).toHaveLength(TOPPLE_BARS);
    // The missed bar is still falling beside the tower.
    expect(run.v.falling.length).toBeGreaterThan(0);
    frame(run);
    // The view tells main.ts the frame it happens in (for the boom and the heavy haptic).
    expect(run.blasts).toHaveLength(1);
    expect(run.blasts[0]! - run.dt).toBeLessThan(BLAST_AT);
    expect(run.blasts[0]!).toBeGreaterThanOrEqual(BLAST_AT);
    // The section is gone into pieces (a bar breaks into up to three; some stay whole), and what was
    // still falling went with it.
    expect(slabPoses(t)).toEqual([]);
    const pieces = t.chunks.filter((c) => c.t0 === BLAST_AT);
    expect(pieces.length).toBeGreaterThanOrEqual(TOPPLE_BARS);
    expect(pieces.length).toBeLessThanOrEqual(TOPPLE_BARS * 3);
    expect(new Set(pieces.map((c) => c.level)).size).toBe(TOPPLE_BARS);
    expect(run.v.falling).toEqual([]);
    expect(t.chunks.length).toBeGreaterThan(pieces.length);

    // Everything is thrown toward the side the bar missed on: every piece, every spark; the smoke drifts that way.
    for (const c of t.chunks) expect(c.vx * side).toBeGreaterThan(0);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(pieces.map((c) => c.vy))).toBeGreaterThan(40);
    expect(pieces.filter((c) => c.vy > 0).length).toBeGreaterThan(pieces.length * 0.8);
    for (const c of pieces) expect(Math.abs(c.spin)).toBeGreaterThan(1);
    const sparks0 = sparkPoses(t);
    const puffs0 = puffPoses(t);
    expect(sparks0.length).toBeGreaterThan(8);
    const centerX = t.blast!.x;
    until(run, BLAST_AT + 0.15);
    for (const s of sparkPoses(t)) expect((s.x - centerX) * side).toBeGreaterThan(0);
    expect(puffPoses(t).length).toBeGreaterThan(puffs0.length);
    const poses = chunkPoses(t);
    poses.forEach((p, i) => expect((p.cx - t.chunks[i]!.x0) * side).toBeGreaterThan(0));
    // A bright burst over it all.
    expect(burstPose(t)).not.toBeNull();
    until(run, BLAST_AT + 0.35);
    const puffs = puffPoses(t);
    expect(puffs.length).toBeGreaterThan(PUFFS_LEFT);
    expect(mean(puffs.map((p) => p.x - centerX)) * side).toBeGreaterThan(5);
  });

  it("the flash and the shake come with the blast and settle quickly; the shake never moves the scene far", () => {
    const run = climb("normal", 12);
    lastMiss(run, 1);
    const t = run.v.topple!;
    until(run, BLAST_AT - 1e-9);
    expect([flashAlpha(t), shakeOffset(t).amp, burstPose(t)]).toEqual([0, 0, null]);
    frame(run);
    expect(flashAlpha(t)).toBeGreaterThan(0.4);
    let amp = shakeOffset(t).amp;
    expect(amp).toBeGreaterThan(0);
    while (t.age < BLAST_AT + 0.5) {
      frame(run);
      const s = shakeOffset(t);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(s.amp);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(s.amp);
      expect(s.amp).toBeLessThanOrEqual(amp);
      expect(s.amp).toBeLessThan(0.02);
      amp = s.amp;
    }
    expect([flashAlpha(t), shakeOffset(t).amp, burstPose(t)]).toEqual([0, 0, null]);
  });
});

describe("then the card", () => {
  /** The words a frame draws, and the canvas transform each was drawn with. */
  function words(run: Run, skin = SKINS[0]!) {
    const canvas = createCanvas(390, 844);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const out: { text: string; moved: boolean }[] = [];
    const fill = ctx.fillText.bind(ctx);
    ctx.fillText = (text: string, x: number, y: number) => {
      const m = ctx.getTransform();
      out.push({ text, moved: m.a !== 1 || m.d !== 1 || m.e !== 0 || m.f !== 0 });
      fill(text, x, y);
    };
    render(ctx, 390, 844, run.g, run.v, 7, skin);
    return out;
  }

  it.each(CASES)("%s, missed %s: everything has gone (off screen, or faded) by TOPPLE_TIME, when the card comes", (mode, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb(mode, 20);
    lastMiss(run, side);
    const t = run.v.topple!;
    expect(isToppling(run.v)).toBe(true);
    // While it goes over and blows up the HUD stays (and never shakes); the card waits.
    until(run, BLAST_AT + 0.05);
    const during = words(run);
    expect(during.map((w) => w.text)).toContain(String(run.g.score));
    expect(during.map((w) => w.text)).not.toContain("Game Over");
    expect(shakeOffset(t).amp).toBeGreaterThan(0);
    expect(during.some((w) => w.moved)).toBe(false);
    // The pieces fly fully there until the fade.
    expect(chunkPoses(t).every((p) => p.alpha === 1)).toBe(true);

    // On a phone most of the section's pieces have flown off the screen before they start to fade.
    until(run, TOPPLE_TIME - DEBRIS_FADE);
    const f = frameFor(390, 844, run.v.cameraY);
    const seen = chunkPoses(t).filter((p, i) => {
      if (t.chunks[i]!.t0 !== BLAST_AT) return false;
      const reach = (p.w / 2 + BLOCK_HEIGHT) * f.scale;
      const x = f.offsetX + p.cx * f.scale;
      const y = f.anchorPx - (p.cy - f.cameraY) * f.scale;
      return x > -reach && x < 390 + reach && y > -reach && y < 844 + reach;
    });
    expect(seen.length).toBeLessThanOrEqual(t.chunks.filter((c) => c.t0 === BLAST_AT).length / 4);

    // Then what is still in view fades to nothing.
    while (t.age + run.dt < TOPPLE_TIME) frame(run);
    for (const p of chunkPoses(t)) expect(p.alpha).toBeLessThanOrEqual(run.dt / DEBRIS_FADE + 1e-9);
    expect(isToppling(run.v)).toBe(true);
    expect(words(run).map((w) => w.text)).not.toContain("Game Over");
    frame(run);
    expect(t.age).toBeGreaterThanOrEqual(TOPPLE_TIME);
    expect(isToppling(run.v)).toBe(false);
    expect([chunkPoses(t), puffPoses(t), sparkPoses(t), burstPose(t), flashAlpha(t), shakeOffset(t).amp]).toEqual([[], [], [], null, 0, 0]);
    expect(run.v.falling).toEqual([]);
    expect(words(run).map((w) => w.text)).toContain("Game Over");
    // Overall about as long as the old topple's 1.2 s.
    expect(TOPPLE_TIME).toBeGreaterThanOrEqual(1);
    expect(TOPPLE_TIME).toBeLessThanOrEqual(1.5);
  });

  it("a game over without a topple (none in play) shows the card at once", () => {
    const g = newGame();
    g.phase = "over";
    const v = newView();
    expect(isToppling(v)).toBe(false);
    expect(words({ g, v, blasts: [], dt: FRAME }).map((w) => w.text)).toContain("Game Over");
  });
});

describe("drawn", () => {
  it.each(["classic", "neon"])("%s: the section swings as drawn, then its pieces fly; the standing tower stays", (id) => {
    const skin = SKINS.find((s) => s.id === id)!;
    // Perfect drops only, so no sliver of an earlier slice is falling past.
    const run = climb("normal", 16, FRAME, [0]);
    lastMiss(run, -1);
    const levels = () => {
      const spy = vi.spyOn(kitFor(skin), "bar");
      try {
        const ctx = createCanvas(390, 844).getContext("2d") as unknown as CanvasRenderingContext2D;
        render(ctx, 390, 844, run.g, run.v, 7, skin);
        return spy.mock.calls.map((c) => c[5]);
      } finally {
        spy.mockRestore();
      }
    };
    const t = run.v.topple!;
    until(run, 0.3);
    const swinging = levels();
    // Each bar of the section is drawn once, by the swing; the bars below once each, standing.
    for (let i = t.level; i < run.g.blocks.length; i++) expect(swinging.filter((l) => l === i)).toHaveLength(1);
    expect(swinging.filter((l) => l === t.level - 1)).toHaveLength(1);
    until(run, BLAST_AT + 0.02);
    const pieces = levels().filter((l) => l >= t.level);
    expect(pieces.length).toBeGreaterThan(TOPPLE_BARS);
  });

  it.each(["classic", "neon"])("%s: the style kit paints the blast: the flash and the burst, then the smoke and the sparks; nothing once the card is up", (id) => {
    const skin = SKINS.find((s) => s.id === id)!;
    const run = climb("hard", 12);
    lastMiss(run, 1);
    const painted = () => {
      const paint = kitFor(skin).blast;
      const spies = (["burst", "smoke", "spark", "flash"] as const).map((k) => vi.spyOn(paint, k));
      try {
        const ctx = createCanvas(390, 844).getContext("2d") as unknown as CanvasRenderingContext2D;
        render(ctx, 390, 844, run.g, run.v, 7, skin);
        const [burst, smoke, spark, flash] = spies.map((s) => s.mock.calls);
        return {
          burst: burst!.length,
          puffs: smoke!.reduce((n, c) => n + (c[1] as unknown[]).length, 0),
          sparks: spark!.length,
          flash: Math.max(0, ...flash!.map((c) => c[3] as number)),
        };
      } finally {
        for (const s of spies) s.mockRestore();
      }
    };
    until(run, BLAST_AT - 0.1);
    expect(painted()).toEqual({ burst: 0, puffs: 0, sparks: 0, flash: 0 });
    until(run, BLAST_AT + 0.01);
    const blast = painted();
    expect(blast.burst).toBe(1);
    expect(blast.sparks).toBeGreaterThan(8);
    expect(blast.flash).toBeGreaterThan(0.4);
    until(run, BLAST_AT + 0.2);
    expect(painted().puffs).toBeGreaterThan(PUFFS_LEFT);
    until(run, TOPPLE_TIME);
    expect(painted()).toEqual({ burst: 0, puffs: 0, sparks: 0, flash: 0 });
  });
});

describe("the shake", () => {
  it.each(["classic", "neon"])("%s: the shaken scene still covers every edge of the screen", (id) => {
    const skin = SKINS.find((s) => s.id === id)!;
    const run = climb("hard", 12);
    lastMiss(run, 1);
    for (const age of [BLAST_AT + 0.02, BLAST_AT + 0.06, BLAST_AT + 0.12]) {
      until(run, age);
      const s = shakeOffset(run.v.topple!);
      expect(Math.hypot(s.x, s.y)).toBeGreaterThan(0.002);
      const W = 390;
      const H = 844;
      const ctx = createCanvas(W, H).getContext("2d");
      render(ctx as unknown as CanvasRenderingContext2D, W, H, run.g, run.v, 7, skin);
      const px = ctx.getImageData(0, 0, W, H).data;
      const alphaAt = (x: number, y: number) => px[(y * W + x) * 4 + 3];
      for (let x = 0; x < W; x++) expect([alphaAt(x, 0), alphaAt(x, H - 1)]).toEqual([255, 255]);
      for (let y = 0; y < H; y++) expect([alphaAt(0, y), alphaAt(W - 1, y)]).toEqual([255, 255]);
    }
  });
});

describe("less motion", () => {
  it("a player who asked for less motion gets the blast without the shake", () => {
    const skin = SKINS[0]!;
    const run = climb("normal", 10);
    lastMiss(run, -1);
    until(run, BLAST_AT + 0.04);
    expect(shakeOffset(run.v.topple!).amp).toBeGreaterThan(0);
    /** The transform the scene is drawn with. */
    const sceneMoved = (still: boolean) => {
      const kit = kitFor(skin);
      let moved = false;
      const spy = vi.spyOn(kit, "world").mockImplementation((ctx) => {
        const m = ctx.getTransform();
        moved = m.a !== 1 || m.d !== 1 || m.e !== 0 || m.f !== 0;
      });
      try {
        const ctx = createCanvas(390, 844).getContext("2d") as unknown as CanvasRenderingContext2D;
        render(ctx, 390, 844, run.g, run.v, 7, skin, NaN, { still });
      } finally {
        spy.mockRestore();
      }
      return moved;
    };
    expect(sceneMoved(false)).toBe(true);
    expect(sceneMoved(true)).toBe(false);
  });
});

describe("the same every time", () => {
  it("the same run ends the same way", () => {
    const end = () => {
      const run = climb("hard", 14);
      lastMiss(run, 1);
      until(run, BLAST_AT + 0.3);
      return run.v.topple;
    };
    expect(end()).toEqual(end());
  });

  it("at any frame rate: the same swing, and the blast throws the same pieces, smoke and sparks", () => {
    const run = climb("normal", 10);
    lastMiss(run, -1);
    const from = structuredClone({ g: run.g, v: run.v });
    const after = (dt: number) => {
      const r: Run = { ...structuredClone(from), blasts: [], dt };
      until(r, 0.3);
      const swing = slabPoses({ ...r.v.topple!, age: 0.3 });
      until(r, BLAST_AT + 0.1);
      const t = r.v.topple!;
      expect(r.blasts).toHaveLength(1);
      // What was still falling joins at the frame of the blast; the rest is the same at any rate.
      return { swing, pieces: t.chunks.filter((c) => c.t0 === BLAST_AT), puffs: t.puffs, sparks: t.sparks, blast: t.blast };
    };
    const base = after(1 / 60);
    expect(base.pieces.length).toBeGreaterThan(0);
    expect(after(1 / 30)).toEqual(base);
    expect(after(1 / 144)).toEqual(base);
  });
});
