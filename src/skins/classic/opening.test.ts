import { describe, expect, it } from "vitest";
import { birdDip, DIP_EVERY, GLINT_EVERY, glintPhase } from "./island";
import { DAY_HIGH, toneAtLevel } from "./tone";
import { roundTime, tractorAt, TRACTORS } from "./tractors";

// The owner's rule: any action needs to happen within the first 10 seconds, because after that
// players move past it and up. Scene time starts at 0 with a fresh tower (the title screen, or
// play again). Every action that can be seen from the start view must happen for the first time,
// key moment included, by OPENING. Later repeats keep their own rhythm.
//
// What the start view shows over time on Sky Islands: the bluebird on the kite's stake dipping
// its head, a glint flashing on the crystals in the island's underside, and the tractors on the
// fields far below each plodding to an end of its strip and turning round. Everything else
// there is ambient: the kite fluttering, the tail waving, vines and roots swaying, the
// waterfall's streaks, the tractors' smoke and dust, windmills turning, the sun's rays, low
// clouds drifting, far balloons and the lane drifters bobbing in place, sparkles in the cloud
// bank. The shooting stars happen only at night, far up the climb, so they depend on height and
// are exempt.

const OPENING = 10;
const STEP = 0.005;

interface Action {
  name: string;
  /** How far into the action it is at scene time t: 0 when idle, up to 1 at its key moment. */
  at: (t: number) => number;
  /** How often it repeats (s). */
  every: number;
}

const ACTIONS: Action[] = [
  { name: "the bluebird dips its head", at: birdDip, every: DIP_EVERY },
  { name: "a glint flashes on the crystals", at: (t) => (glintPhase(t) < 0 ? 0 : Math.sin(glintPhase(t) * Math.PI)), every: GLINT_EVERY },
  ...TRACTORS.map((tr, i) => ({
    name: `the ${tr.color} tractor ${i} turns at the end of its strip`,
    at: (t: number) => {
      const turn = tractorAt(i, t).turn;
      return turn < 0 ? 0 : Math.sin(turn * Math.PI);
    },
    every: roundTime(tr),
  })),
];

/** The first run of an action from scene start: when it starts, peaks and ends (s). */
function firstRun(a: Action): { start: number; peak: number; end: number } {
  let start = -1;
  let peak = -1;
  let best = 0;
  for (let t = 0; t <= OPENING + a.every; t += STEP) {
    const v = a.at(t);
    if (start < 0) {
      if (v > 0.02) start = t;
      else continue;
    }
    if (v > best) {
      best = v;
      peak = t;
    }
    if (v <= 0.02 && t > start) return { start, peak, end: t };
  }
  return { start, peak, end: Infinity };
}

describe("classic opening", () => {
  it.each(ACTIONS.map((a) => [a.name, a] as const))("%s within the first 10 s", (_, a) => {
    const run = firstRun(a);
    expect(run.start, "it starts").toBeGreaterThanOrEqual(0);
    expect(run.start).toBeLessThan(OPENING);
    // Its key moment is reached and done by then too.
    expect(a.at(run.peak)).toBeGreaterThan(0.95);
    expect(run.peak).toBeLessThan(OPENING);
    expect(run.end).toBeLessThanOrEqual(OPENING);
  });

  it("the shooting stars wait for the night, out of reach of the opening seconds", () => {
    // DAY_HIGH levels is far more than anyone climbs in 10 s; the meteors come in near level 92.
    for (let lvl = 0; lvl <= DAY_HIGH; lvl += 0.25) expect(toneAtLevel(lvl).meteors, `level ${lvl}`).toBe(0);
  });
});
