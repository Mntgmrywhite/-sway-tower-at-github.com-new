import { afterEach, describe, expect, it } from "vitest";
import { resetTuning, tuning } from "./config";
import * as game from "./game";
import * as shipped from "./testing/shipped-game";

// Normal mode must stay bit-identical to the rules as they shipped before Hard mode existed
// (src/testing/shipped-game.ts, a frozen copy). Seeded runs of random frames and drops (perfects,
// slices, misses, restarts) go through both; every state and every drop result must match exactly.

afterEach(resetTuning);

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

/** The shipped fields of a state (Normal adds `mode` and `toppled`, which stay "normal" and null). */
function shippedFields(s: shipped.GameState | game.GameState): shipped.GameState {
  return {
    phase: s.phase,
    blocks: s.blocks.map((b) => ({ ...b })),
    slider: { ...s.slider },
    score: s.score,
    streak: s.streak,
    perfects: s.perfects,
    cuts: s.cuts.map((c) => ({ ...c })),
    lives: s.lives,
    swayAngle: s.swayAngle,
    kick: s.kick,
    kickVel: s.kickVel,
    calm: s.calm,
    calmTimer: s.calmTimer,
  };
}

function replay(seed: number, frames: number): number {
  const r = rng(seed);
  let a = shipped.newGame();
  let b = game.newGame("normal");
  let drops = 0;
  for (let f = 0; f < frames; f++) {
    const dt = 1 / 240 + r() * (1 / 20);
    shipped.step(a, dt);
    game.step(b, dt);
    if (r() < 0.12) {
      if (a.phase === "over") {
        a = shipped.newGame();
        b = game.newGame();
      } else {
        // Aim like a player of mixed skill: perfect, near, sloppy, or way off.
        const pick = r();
        const dx = pick < 0.3 ? 0 : pick < 0.6 ? (r() - 0.5) * 6 : pick < 0.9 ? (r() - 0.5) * 50 : (r() - 0.5) * 300;
        const target = shipped.top(a).x + shipped.swayOffset(a, a.blocks.length - 1) + dx;
        a.slider.x = target;
        b.slider.x = target;
        expect(game.drop(b)).toEqual(shipped.drop(a));
        drops++;
      }
    }
    expect(b.mode).toBe("normal");
    expect(b.toppled).toBeNull();
    expect(shippedFields(b)).toEqual(shippedFields(a));
  }
  return drops;
}

describe("Normal mode is the shipped game", () => {
  it.each([1, 2, 3, 42, 1234])("seed %i: identical states and drop results", (seed) => {
    expect(replay(seed, 4000)).toBeGreaterThan(200);
  });

  it("identical with sway off and odd tuning too", () => {
    tuning.swayOn = false;
    replay(9, 1500);
    resetTuning();
    tuning.swayBase = 35;
    tuning.swayPeriod = 1.1;
    tuning.kickPerUnit = 3.5;
    tuning.kickDecay = 2.8;
    tuning.slideSpeed = 150;
    tuning.perfectCalm = 1;
    replay(10, 1500);
  });
});
