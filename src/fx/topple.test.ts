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
  BLAST_VARIANTS,
  bitPoses,
  blastCueAt,
  blastVariant,
  breakLevel,
  burstPoses,
  chunkPoses,
  CONFETTI_FADE,
  DEBRIS_FADE,
  flarePoses,
  flashAlpha,
  POPCORN_POPS,
  puffPoses,
  ribbonPoses,
  ringPoses,
  shakeOffset,
  slabPoses,
  sparkPoses,
  TOPPLE_BARS,
  TOPPLE_TIME,
  type BlastVariant,
} from "./topple";

// The end of a run, in both modes: the miss that takes the last life sends the top of the tower
// over toward the side the bar missed on; then it blows up, one of five ways, and the card comes.

/** A run played the way main.ts plays it: the game steps, landings show on the view, the view steps. */
interface Run {
  g: GameState;
  v: View;
  /** Frames in which the view reported the blast's cue (main.ts plays the sound and the haptic then). */
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

/** The last life, missed just past the top on `side`; the run ends in `variant` (its own pick unless told). */
function lastMiss(run: Run, side: -1 | 1, variant?: BlastVariant): void {
  run.g.lives = 1;
  tap(run, side * (run.g.slider.w + 3));
  if (variant) run.v.topple!.variant = variant;
}

/** Run frames until the topple is `age` seconds old (failing, not hanging, if it stops aging). */
function until(run: Run, age: number): void {
  for (let n = 0; run.v.topple!.age < age; n++) {
    if (n > 10 / run.dt) throw new Error(`the topple is stuck at ${run.v.topple!.age} s`);
    frame(run);
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Smoke puffs still out 0.35 s after the blast: most of them (it lingers). */
const PUFFS_LEFT = 6;

const CASES = (["normal", "hard"] as const).flatMap((mode) => ([-1, 1] as const).map((side) => [mode, side] as const));
const ENDINGS = BLAST_VARIANTS.flatMap((variant) => ([-1, 1] as const).map((side) => [variant, side] as const));

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
    // Popcorn bites bars before the blast; the swing itself is checked on the starburst.
    t.variant = "starburst";
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

    for (const variant of BLAST_VARIANTS) {
      const bare: Run = { g: newGame("hard"), v: newView(), blasts: [], dt: FRAME };
      lastMiss(bare, -1, variant);
      const t = bare.v.topple!;
      expect([t.level, t.dir, t.py]).toEqual([0, -1, 0]);
      expect(t.px).toBeCloseTo(bare.g.blocks[0]!.x, 9);
      until(bare, TOPPLE_TIME);
      expect(bare.blasts).toHaveLength(1);
    }
  });

  it("nothing topples while a life is left: a miss just falls away", () => {
    const run = climb("hard", 6);
    tap(run, run.g.slider.w + 3);
    expect(run.g.lives).toBe(2);
    expect(run.v.topple).toBeNull();
    expect(run.v.falling.length).toBeGreaterThan(0);
  });
});

describe("which blast", () => {
  /** Many different runs' ends: heights, shapes (the pattern of drops), modes and sides. */
  function endings(): { state: GameState; dir: -1 | 1; variant: BlastVariant }[] {
    const out: { state: GameState; dir: -1 | 1; variant: BlastVariant }[] = [];
    for (let i = 0; i < 48; i++) {
      const mode: Mode = i % 2 === 0 ? "normal" : "hard";
      const pattern = [0, 2 + (i % 5), -3 + (i % 4), 0, 4 - (i % 3), -1, i % 2, -2];
      const run = climb(mode, 2 + (i * 7) % 29, FRAME, pattern);
      const dir = i % 3 === 0 ? -1 : 1;
      lastMiss(run, dir);
      out.push({ state: run.g, dir, variant: run.v.topple!.variant });
    }
    return out;
  }

  it("the run's own pick, the same every time, from its score, perfects, mode, side and the tower's shape", () => {
    for (const e of endings()) {
      expect(e.variant).toBe(blastVariant(e.state, e.dir));
      expect(blastVariant(structuredClone(e.state), e.dir)).toBe(e.variant);
      expect(BLAST_VARIANTS).toContain(e.variant);
    }
    // Any of those changing picks differently somewhere, so runs that look alike needn't end alike.
    const base = endings()[7]!;
    const picks = new Set([
      blastVariant(base.state, base.dir),
      blastVariant(base.state, base.dir > 0 ? -1 : 1),
      blastVariant({ ...base.state, score: base.state.score + 1 }, base.dir),
      blastVariant({ ...base.state, perfects: base.state.perfects + 1 }, base.dir),
      blastVariant({ ...base.state, mode: base.state.mode === "hard" ? "normal" : "hard" }, base.dir),
      blastVariant({ ...base.state, blocks: base.state.blocks.map((b, i) => (i === 3 ? { ...b, w: b.w - 1 } : b)) }, base.dir),
    ]);
    expect(picks.size).toBeGreaterThan(2);
  });

  it("every blast comes up, and none hogs the ends", () => {
    const seen = endings().map((e) => e.variant);
    for (const variant of BLAST_VARIANTS) {
      const share = seen.filter((v) => v === variant).length / seen.length;
      expect(share, variant).toBeGreaterThanOrEqual(0.08);
      expect(share, variant).toBeLessThanOrEqual(0.45);
    }
    // Consecutive runs (one more bar each) mostly end differently.
    let changes = 0;
    for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1]) changes++;
    expect(changes).toBeGreaterThan(seen.length / 2);
  });

  it("the sound's cue: the blast, but popcorn's first pop (its sound runs pop-pop-pop-BOOM)", () => {
    for (const v of BLAST_VARIANTS) expect(blastCueAt(v)).toBe(v === "popcorn" ? POPCORN_POPS[0] : BLAST_AT);
    expect(POPCORN_POPS.every((at) => at < BLAST_AT)).toBe(true);
  });
});

describe("then it blows up", () => {
  it.each(CASES)("starburst, %s, missed %s: once, while still falling, at BLAST_AT; the bars break up and fly that way and up, spinning", (mode, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb(mode, 20);
    lastMiss(run, side, "starburst");
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
    expect(burstPoses(t)).toHaveLength(1);
    until(run, BLAST_AT + 0.35);
    const puffs = puffPoses(t);
    expect(puffs.length).toBeGreaterThan(PUFFS_LEFT);
    expect(mean(puffs.map((p) => p.x - centerX)) * side).toBeGreaterThan(5);
  });

  it.each(ENDINGS)("%s, missed %s: whatever flies, flies that way, and what was still falling goes with it", (variant, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb("hard", 16);
    lastMiss(run, side, variant);
    const t = run.v.topple!;
    until(run, BLAST_AT - 1e-9);
    expect(run.v.falling.length).toBeGreaterThan(0);
    frame(run);
    expect(run.blasts).toHaveLength(1);
    expect(run.blasts[0]!).toBeGreaterThanOrEqual(blastCueAt(variant));
    expect(run.blasts[0]! - run.dt).toBeLessThan(blastCueAt(variant));
    expect(slabPoses(t)).toEqual([]);
    expect(run.v.falling).toEqual([]);
    expect(t.blast).not.toBeNull();
    // The debris of the section itself (not the missed bar, which keeps its own fall): its mean
    // velocity goes to the toppling side, and up.
    const debris = [...t.chunks.filter((c) => c.t0 <= BLAST_AT), ...t.bits, ...t.ribbons];
    expect(debris.length).toBeGreaterThanOrEqual(TOPPLE_BARS);
    expect(mean(debris.map((d) => d.vx)) * side).toBeGreaterThan(30);
    expect(mean(debris.map((d) => d.vy))).toBeGreaterThan(20);
    // So does the missed bar, which was thrown too.
    const swept = t.chunks.filter((c) => c.t0 > BLAST_AT || (c.t0 === t.age && c.t0 !== BLAST_AT));
    for (const c of swept) expect(c.vx * side).toBeGreaterThan(0);
    // And the sparks drift that way.
    if (t.sparks.length > 0) expect(mean(t.sparks.map((s) => s.vx)) * side).toBeGreaterThan(0);
    // By a tenth of a second later everything thrown has moved that way on average.
    until(run, BLAST_AT + 0.1);
    const moved = [
      ...chunkPoses(t).map((p, i) => p.cx - t.chunks[i]!.x0),
      ...bitPoses(t).map((p, i) => p.x - t.bits[i]!.x0),
      ...ribbonPoses(t).map((p, i) => p.points[0]!.x - t.ribbons[i]!.x0),
    ];
    expect(mean(moved) * side).toBeGreaterThan(0);
  });

  it("fireworks: a chrysanthemum of glittering sparks that arc and slow, the bars as streaks, then a second smaller bloom", () => {
    const run = climb("normal", 20);
    lastMiss(run, 1, "fireworks");
    const t = run.v.topple!;
    until(run, BLAST_AT + 0.01);
    // The bars fly as streaks of their own color, not as blocks.
    const streaks = t.chunks.filter((c) => c.t0 === BLAST_AT);
    expect(streaks.length).toBeGreaterThanOrEqual(TOPPLE_BARS);
    for (const c of streaks) expect(c.as).toBe("streak");
    const poses = chunkPoses(t);
    expect(poses.some((p) => Math.hypot(p.cx - p.tx, p.cy - p.ty) > 0.5)).toBe(true);
    // A round shell of many sparks, in several colors, that glitter; a flare at its heart.
    const shell = t.sparks.filter((s) => s.born === 0);
    expect(shell.length).toBeGreaterThan(30);
    expect(new Set(shell.map((s) => s.color)).size).toBeGreaterThan(1);
    expect(shell.every((s) => s.twinkle && s.drag > 0)).toBe(true);
    const angles = shell.map((s) => Math.atan2(s.vy, s.vx));
    expect(angles.some((a) => a > 1.5) && angles.some((a) => a < -1.5) && angles.some((a) => Math.abs(a) < 0.5) && angles.some((a) => Math.abs(a) > 2.6)).toBe(true);
    expect(flarePoses(t)).toHaveLength(1);
    expect(burstPoses(t)).toEqual([]);
    // They slow: a spark's speed 0.3 s in is well under its launch speed, and it has started to fall.
    const s0 = shell[0]!;
    const launch = Math.hypot(s0.vx, s0.vy);
    const at = (k: number) => sparkPoses({ ...t, age: BLAST_AT + k })[0]!;
    const a = at(0.3);
    const b = at(0.34);
    expect(Math.hypot(b.x - a.x, b.y - a.y) / 0.04).toBeLessThan(launch * 0.7);
    // The second bloom: later, smaller, higher and toward the toppling side.
    const second = t.sparks.filter((s) => s.born > 0);
    expect(second.length).toBeGreaterThan(10);
    expect(second.length).toBeLessThan(shell.length);
    expect(second[0]!.x0).toBeGreaterThan(t.blast!.x);
    expect(second[0]!.y0).toBeGreaterThan(t.blast!.y);
    expect(mean(second.map((s) => Math.hypot(s.vx, s.vy)))).toBeLessThan(mean(shell.map((s) => Math.hypot(s.vx, s.vy))));
    until(run, BLAST_AT + second[0]!.born + 0.02);
    expect(flarePoses(t)).toHaveLength(1);
    expect(sparkPoses(t).length).toBeGreaterThan(shell.length);
  });

  it("shockwave: a ring races out (and a second behind it), whole bars pinwheel away fast, a mushroom of smoke rises and thins", () => {
    const run = climb("normal", 20);
    lastMiss(run, -1, "shockwave");
    const t = run.v.topple!;
    until(run, BLAST_AT + 0.01);
    const bars = t.chunks.filter((c) => c.t0 === BLAST_AT);
    // Every bar whole, spinning fast.
    expect(bars).toHaveLength(TOPPLE_BARS);
    for (const c of bars) expect(Math.abs(c.spin)).toBeGreaterThan(12);
    expect(mean(bars.map((c) => Math.hypot(c.vx, c.vy)))).toBeGreaterThan(150);
    // The ring: out fast, thinning and fading as it goes.
    const r0 = ringPoses(t);
    expect(r0).toHaveLength(1);
    until(run, BLAST_AT + 0.12);
    const r1 = ringPoses(t);
    expect(r1).toHaveLength(2);
    expect(r1[0]!.r).toBeGreaterThan(r0[0]!.r * 2);
    expect(r1[0]!.width).toBeLessThan(r0[0]!.width);
    expect(r1[0]!.alpha).toBeLessThan(r0[0]!.alpha);
    expect(r1[1]!.r).toBeLessThan(r1[0]!.r);
    // The mushroom: by 0.4 s the smoke's top is well above the blast and spread wider than its stem.
    until(run, BLAST_AT + 0.4);
    const puffs = puffPoses(t);
    expect(puffs.length).toBeGreaterThan(PUFFS_LEFT);
    const topY = Math.max(...puffs.map((p) => p.y));
    expect(topY).toBeGreaterThan(t.blast!.y + t.blast!.r);
    const cap = puffs.filter((p) => p.y > t.blast!.y + t.blast!.r * 0.8);
    const stem = puffs.filter((p) => p.y <= t.blast!.y + t.blast!.r * 0.8);
    const spread = (ps: typeof puffs) => Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    expect(cap.length).toBeGreaterThan(2);
    if (stem.length > 1) expect(spread(cap)).toBeGreaterThan(spread(stem));
    // ...and thins away.
    until(run, TOPPLE_TIME - 0.1);
    expect(puffPoses(t).every((p) => p.alpha < 0.7)).toBe(true);
  });

  it("confetti: the bars crumble into colored squares and curling streamers that flutter down slowly; no chunks of the section", () => {
    const run = climb("normal", 20);
    lastMiss(run, 1, "confetti");
    const t = run.v.topple!;
    until(run, BLAST_AT + 0.01);
    expect(t.chunks.filter((c) => c.t0 === BLAST_AT)).toEqual([]);
    expect(t.bits.length).toBeGreaterThan(TOPPLE_BARS * 4);
    expect(new Set(t.bits.map((b) => b.color)).size).toBeGreaterThanOrEqual(5);
    expect(t.ribbons.length).toBeGreaterThanOrEqual(5);
    // A small pop, no sparks.
    expect(burstPoses(t)).toHaveLength(1);
    expect(burstPoses(t)[0]!.r).toBeLessThan(t.blast!.r);
    expect(sparkPoses(t)).toEqual([]);
    // Floaty: a square is still in view 0.6 s later, falling no faster than a slow drift, fluttering and flipping.
    const early = bitPoses({ ...t, age: BLAST_AT + 0.5 });
    const late = bitPoses({ ...t, age: BLAST_AT + 0.6 });
    const fall = mean(early.map((p, i) => (p.y - late[i]!.y) / 0.1));
    expect(fall).toBeGreaterThan(5);
    expect(fall).toBeLessThan(60);
    expect(late.some((p, i) => p.squash !== early[i]!.squash)).toBe(true);
    expect(late.every((p) => p.squash >= 0.25 && p.squash <= 1)).toBe(true);
    // A streamer is a curl of points trailing its head.
    const ribbons = ribbonPoses({ ...t, age: BLAST_AT + 0.3 });
    expect(ribbons[0]!.points.length).toBeGreaterThan(5);
    const head = ribbons[0]!.points[0]!;
    const tail = ribbons[0]!.points.at(-1)!;
    expect(Math.hypot(head.x - tail.x, head.y - tail.y)).toBeGreaterThan(3);
    // Still mostly in view near the end, so it fades (over CONFETTI_FADE) rather than vanishing.
    until(run, TOPPLE_TIME - CONFETTI_FADE / 2);
    expect(bitPoses(t)[0]!.alpha).toBeCloseTo(0.5, 5);
    expect(ribbonPoses(t)[0]!.alpha).toBeCloseTo(0.5, 5);
  });

  it("popcorn: three quick little pops race up the swinging section, a chunk flying off each, then the big one", () => {
    const run = climb("normal", 20);
    lastMiss(run, -1, "popcorn");
    const t = run.v.topple!;
    const widths = () => slabPoses(t).map((p) => p.w);
    const before = widths();
    const bitten: number[] = [];
    POPCORN_POPS.forEach((at, i) => {
      // Up to the frame before the pop: nothing has popped yet.
      until(run, at - run.dt);
      expect(t.chunks).toHaveLength(i);
      expect(run.blasts).toHaveLength(i === 0 ? 0 : 1);
      until(run, at);
      // The cue comes with the first pop (the sound starts there); the section keeps swinging.
      expect(run.blasts).toHaveLength(1);
      expect(t.chunks).toHaveLength(i + 1);
      expect(slabPoses(t)).toHaveLength(TOPPLE_BARS);
      const chunk = t.chunks[i]!;
      expect(chunk.t0).toBe(at);
      expect(chunk.vx * t.dir).toBeGreaterThan(50);
      expect(chunk.vy).toBeGreaterThan(50);
      // Its bar is narrower by the bite, which flew off the toppling side.
      const now = widths();
      const j = now.findIndex((w, k) => w < before[k]! - 1e-9 && !bitten.includes(k));
      expect(j).toBeGreaterThanOrEqual(0);
      bitten.push(j);
      expect(before[j]! - now[j]!).toBeCloseTo(chunk.w, 9);
      // A little burst and a few sparks at the bite (the earlier pops' bursts are still showing).
      expect(burstPoses(t)).toHaveLength(i + 1);
      expect(burstPoses(t).every((b) => !b.big)).toBe(true);
      expect(sparkPoses(t).length).toBeGreaterThan(2);
    });
    // Bottom, middle, top: the pops race up the section (bars are top first).
    expect(bitten[0]!).toBeGreaterThan(bitten[1]!);
    expect(bitten[1]!).toBeGreaterThan(bitten[2]!);
    expect(flashAlpha(t)).toBe(0);
    // Then the big one, as the starburst.
    until(run, BLAST_AT + 0.01);
    expect(run.blasts).toHaveLength(1);
    expect(slabPoses(t)).toEqual([]);
    expect(t.chunks.filter((c) => c.t0 === BLAST_AT).length).toBeGreaterThanOrEqual(TOPPLE_BARS);
    expect(burstPoses(t).some((b) => b.big)).toBe(true);
    expect(flashAlpha(t)).toBeGreaterThan(0.4);
  });

  it("popcorn: a sliver thinner than a bite goes whole; no bar or chunk is ever thinner than nothing", () => {
    const run = climb("normal", 20);
    lastMiss(run, 1, "popcorn");
    const t = run.v.topple!;
    const sliver = 0.8;
    for (const b of t.bars) b.w = sliver;
    until(run, POPCORN_POPS[POPCORN_POPS.length - 1]!);
    // Each pop took its whole bar off the section.
    expect(slabPoses(t)).toHaveLength(TOPPLE_BARS - POPCORN_POPS.length);
    for (const p of slabPoses(t)) expect(p.w).toBe(sliver);
    for (const c of t.chunks) expect(c.w).toBeCloseTo(sliver, 9);
    until(run, BLAST_AT + 0.01);
    expect(slabPoses(t)).toEqual([]);
    expect(t.chunks.length).toBeGreaterThanOrEqual(TOPPLE_BARS);
    for (const c of t.chunks) expect(c.w).toBeGreaterThan(0);
  });

  it.each(BLAST_VARIANTS)("%s: the flash and the shake come with the blast and settle quickly; the shake never moves the scene far", (variant) => {
    const run = climb("normal", 12);
    lastMiss(run, 1, variant);
    const t = run.v.topple!;
    until(run, BLAST_AT - 1e-9);
    expect([flashAlpha(t), shakeOffset(t).amp]).toEqual([0, 0]);
    frame(run);
    expect(flashAlpha(t)).toBeGreaterThan(0.2);
    let amp = shakeOffset(t).amp;
    expect(amp).toBeGreaterThan(0);
    while (t.age < BLAST_AT + 0.5) {
      frame(run);
      const s = shakeOffset(t);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(s.amp);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(s.amp);
      expect(s.amp).toBeLessThanOrEqual(amp);
      expect(s.amp).toBeLessThan(0.03);
      amp = s.amp;
    }
    expect([flashAlpha(t), shakeOffset(t).amp]).toEqual([0, 0]);
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

  it.each(ENDINGS)("%s, missed %s: everything has gone (off screen, or faded) by TOPPLE_TIME, when the card comes", (variant, sideArg) => {
    const side = sideArg as -1 | 1;
    const run = climb(side > 0 ? "normal" : "hard", 20);
    lastMiss(run, side, variant);
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
    expect(bitPoses(t).every((p) => p.alpha === 1)).toBe(true);

    // On a phone most of the section's chunks have flown off the screen before they start to fade
    // (the shockwave's whole bars go every way, so more of them are still crossing it; confetti
    // floats instead, and fades).
    until(run, TOPPLE_TIME - DEBRIS_FADE);
    const f = frameFor(390, 844, run.v.cameraY);
    const section = t.chunks.filter((c) => c.t0 <= BLAST_AT);
    const seen = chunkPoses(t).filter((p, i) => {
      if (t.chunks[i]!.t0 > BLAST_AT) return false;
      const reach = (p.w / 2 + BLOCK_HEIGHT) * f.scale;
      const x = f.offsetX + p.cx * f.scale;
      const y = f.anchorPx - (p.cy - f.cameraY) * f.scale;
      return x > -reach && x < 390 + reach && y > -reach && y < 844 + reach;
    });
    if (variant !== "confetti") expect(seen.length).toBeLessThanOrEqual(section.length / (variant === "shockwave" ? 2 : 4));

    // Then what is still in view fades to nothing, and the rest is over before the card.
    while (t.age + run.dt < TOPPLE_TIME) frame(run);
    for (const p of chunkPoses(t)) expect(p.alpha).toBeLessThanOrEqual(run.dt / DEBRIS_FADE + 1e-9);
    for (const p of bitPoses(t)) expect(p.alpha).toBeLessThanOrEqual(run.dt / CONFETTI_FADE + 1e-9);
    for (const p of ribbonPoses(t)) expect(p.alpha).toBeLessThanOrEqual(run.dt / CONFETTI_FADE + 1e-9);
    expect([puffPoses(t), sparkPoses(t), ringPoses(t), flarePoses(t), burstPoses(t)]).toEqual([[], [], [], [], []]);
    expect(isToppling(run.v)).toBe(true);
    expect(words(run).map((w) => w.text)).not.toContain("Game Over");
    frame(run);
    expect(t.age).toBeGreaterThanOrEqual(TOPPLE_TIME);
    expect(isToppling(run.v)).toBe(false);
    expect([
      chunkPoses(t),
      puffPoses(t),
      sparkPoses(t),
      burstPoses(t),
      ringPoses(t),
      flarePoses(t),
      bitPoses(t),
      ribbonPoses(t),
      flashAlpha(t),
      shakeOffset(t).amp,
    ]).toEqual([[], [], [], [], [], [], [], [], 0, 0]);
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
    lastMiss(run, -1, "starburst");
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

  const PAINTS = ["burst", "smoke", "spark", "streak", "ring", "flare", "confetti", "streamer", "flash"] as const;
  /** What the style kit's painter was asked to draw in a frame: calls per shape (puffs and bits counted), and the flash's brightness. */
  function painted(run: Run, skin = SKINS[0]!) {
    const paint = kitFor(skin).blast;
    const spies = PAINTS.map((k) => vi.spyOn(paint, k));
    try {
      const ctx = createCanvas(390, 844).getContext("2d") as unknown as CanvasRenderingContext2D;
      render(ctx, 390, 844, run.g, run.v, 7, skin);
      const count = (i: number) => spies[i]!.mock.calls.length;
      return {
        burst: count(0),
        puffs: spies[1]!.mock.calls.reduce((n, c) => n + (c[1] as unknown[]).length, 0),
        sparks: count(2),
        streaks: count(3),
        rings: count(4),
        flares: count(5),
        bits: spies[6]!.mock.calls.reduce((n, c) => n + (c[1] as unknown[]).length, 0),
        streamers: count(7),
        flash: Math.max(0, ...spies[8]!.mock.calls.map((c) => c[3] as number)),
      };
    } finally {
      for (const s of spies) s.mockRestore();
    }
  }
  const NOTHING = { burst: 0, puffs: 0, sparks: 0, streaks: 0, rings: 0, flares: 0, bits: 0, streamers: 0, flash: 0 };

  it.each(["classic", "neon"])("%s: the style kit paints the starburst: the flash and the burst, then the smoke and the sparks; nothing once the card is up", (id) => {
    const skin = SKINS.find((s) => s.id === id)!;
    const run = climb("hard", 12);
    lastMiss(run, 1, "starburst");
    until(run, BLAST_AT - 0.1);
    expect(painted(run, skin)).toEqual(NOTHING);
    until(run, BLAST_AT + 0.01);
    const blast = painted(run, skin);
    expect(blast.burst).toBe(1);
    expect(blast.sparks).toBeGreaterThan(8);
    expect(blast.flash).toBeGreaterThan(0.4);
    expect([blast.streaks, blast.rings, blast.flares, blast.bits, blast.streamers]).toEqual([0, 0, 0, 0, 0]);
    until(run, BLAST_AT + 0.2);
    expect(painted(run, skin).puffs).toBeGreaterThan(PUFFS_LEFT);
    until(run, TOPPLE_TIME);
    expect(painted(run, skin)).toEqual(NOTHING);
  });

  it.each(SKINS.flatMap((skin) => BLAST_VARIANTS.map((v) => [skin.id, v, skin] as const)))(
    "%s paints %s with its own shapes, and nothing once the card is up",
    (_, variant, skin) => {
      const run = climb("hard", 12);
      lastMiss(run, variant === "popcorn" ? -1 : 1, variant);
      until(run, BLAST_AT + 0.03);
      const p = painted(run, skin);
      expect(p.flash).toBeGreaterThan(0.2);
      switch (variant) {
        case "starburst":
          expect(p.burst).toBe(1);
          expect(p.sparks).toBeGreaterThan(8);
          break;
        case "fireworks":
          expect(p.streaks).toBeGreaterThanOrEqual(TOPPLE_BARS);
          expect(p.flares).toBe(1);
          expect(p.sparks).toBeGreaterThan(30);
          expect(p.burst).toBe(0);
          break;
        case "shockwave":
          expect(p.rings).toBeGreaterThanOrEqual(1);
          expect(p.burst).toBe(1);
          break;
        case "confetti":
          expect(p.bits).toBeGreaterThan(TOPPLE_BARS * 4);
          expect(p.streamers).toBeGreaterThanOrEqual(5);
          expect(p.burst).toBe(1);
          break;
        case "popcorn":
          expect(p.burst).toBeGreaterThanOrEqual(1);
          expect(p.sparks).toBeGreaterThan(8);
          break;
      }
      until(run, TOPPLE_TIME);
      expect(painted(run, skin)).toEqual(NOTHING);
    },
  );

  it("popcorn's little pops are painted while the section still swings, before the blast", () => {
    const run = climb("hard", 12);
    lastMiss(run, -1, "popcorn");
    until(run, POPCORN_POPS[0]! + 0.02);
    const p = painted(run);
    expect(p.burst).toBe(1);
    expect(p.sparks).toBeGreaterThan(2);
    expect(p.flash).toBe(0);
  });
});

describe("the shake", () => {
  it.each(["classic", "neon"])("%s: the shaken scene still covers every edge of the screen, even in the shockwave's bigger shake", (id) => {
    const skin = SKINS.find((s) => s.id === id)!;
    const run = climb("hard", 12);
    lastMiss(run, 1, "shockwave");
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
  it.each(BLAST_VARIANTS)("%s: a player who asked for less motion gets the blast without the shake or the screen flash", (variant) => {
    const skin = SKINS[0]!;
    const run = climb("normal", 10);
    lastMiss(run, -1, variant);
    until(run, BLAST_AT + 0.04);
    expect(shakeOffset(run.v.topple!).amp).toBeGreaterThan(0);
    expect(flashAlpha(run.v.topple!)).toBeGreaterThan(0);
    /** The transform the scene is drawn with, and the flash's brightness. */
    const drawn = (still: boolean) => {
      const kit = kitFor(skin);
      let moved = false;
      const world = vi.spyOn(kit, "world").mockImplementation((ctx) => {
        const m = ctx.getTransform();
        moved = m.a !== 1 || m.d !== 1 || m.e !== 0 || m.f !== 0;
      });
      const flash = vi.spyOn(kit.blast, "flash");
      try {
        const ctx = createCanvas(390, 844).getContext("2d") as unknown as CanvasRenderingContext2D;
        render(ctx, 390, 844, run.g, run.v, 7, skin, NaN, { still });
        return { moved, flash: Math.max(0, ...flash.mock.calls.map((c) => c[3] as number)) };
      } finally {
        world.mockRestore();
        flash.mockRestore();
      }
    };
    expect(drawn(false).moved).toBe(true);
    expect(drawn(false).flash).toBeGreaterThan(0);
    expect(drawn(true)).toEqual({ moved: false, flash: 0 });
  });
});

describe("the same every time", () => {
  it.each(BLAST_VARIANTS)("%s: the same run ends the same way", (variant) => {
    const end = () => {
      const run = climb("hard", 14);
      lastMiss(run, 1, variant);
      until(run, BLAST_AT + 0.3);
      return run.v.topple;
    };
    expect(end()).toEqual(end());
  });

  it.each(BLAST_VARIANTS)("%s: at any frame rate: the same swing, and the blast throws the same pieces, smoke and sparks", (variant) => {
    const run = climb("normal", 10);
    lastMiss(run, -1, variant);
    const from = structuredClone({ g: run.g, v: run.v });
    const after = (dt: number) => {
      const r: Run = { ...structuredClone(from), blasts: [], dt };
      until(r, 0.3);
      const swing = slabPoses({ ...r.v.topple!, age: 0.3 });
      until(r, BLAST_AT + 0.1);
      const t = r.v.topple!;
      expect(r.blasts).toHaveLength(1);
      // What was still falling joins at the frame of the blast; the rest is the same at any rate.
      return {
        swing,
        pieces: t.chunks.filter((c) => c.t0 <= BLAST_AT),
        puffs: t.puffs,
        sparks: t.sparks,
        bits: t.bits,
        ribbons: t.ribbons,
        rings: t.rings,
        flares: t.flares,
        pops: t.pops,
        blast: t.blast,
      };
    };
    const base = after(1 / 60);
    expect(base.pieces.length + base.bits.length).toBeGreaterThan(0);
    expect(after(1 / 30)).toEqual(base);
    expect(after(1 / 144)).toEqual(base);
  });
});
