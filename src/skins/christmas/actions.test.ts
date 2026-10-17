import { describe, expect, it } from "vitest";
import { bellOn } from "./far";
import { carriageProgress, pigeonLift } from "./ground";
import { marley } from "./houses";
import { lighterReach } from "./people";
import { flockProgress } from "./sky";
import { PIGEONS } from "./street";
import { sceneAt, SIZES } from "./test-scene";

// The owner's rule: players stack up and away from the street within seconds, so every action
// the start view shows (something you watch happen, not ambient twinkle, smoke, flicker, snow or
// the carolers' steady singing) happens for the first time within the first WINDOW seconds of
// the scene's clock (Scene.t is 0 when a tower's scene starts), its key moment seen inside that
// window. Later repeats keep their own rhythm.

const WINDOW = 10;
const DT = 1 / 120;

interface Action {
  name: string;
  /** Whether it's happening at time t. */
  on: (t: number) => boolean;
  /** Whether its key moment has come by time t. */
  key: (t: number) => boolean;
  /** Whether it must also be over within the window (false: it may finish leaving after). */
  over: boolean;
}

/** The street pigeons' highest flutter at time t on a W x H screen (the scene at the start). */
const lift = (W: number, H: number) => (t: number) => {
  const s = sceneAt(W, H, 0, t);
  let most = 0;
  for (let i = 0; i < PIGEONS.length; i++) most = Math.max(most, pigeonLift(s, i));
  return most;
};

const ACTIONS: Action[] = [
  { name: "the steeple's bell peals", on: (t) => bellOn(t) > 0, key: (t) => bellOn(t) > 0.99, over: true },
  { name: "the lamplighter lights the lamp", on: (t) => lighterReach(t) > 0, key: (t) => lighterReach(t) >= 1, over: true },
  { name: "Marley's face shows in the knocker", on: (t) => marley(t) > 0, key: (t) => marley(t) > 0.99, over: true },
  // From the right edge to the left; the key moment is passing over the middle of the skyline.
  { name: "the pigeon flock crosses the sky", on: (t) => flockProgress(t) >= 0, key: (t) => flockProgress(t) >= 0.5, over: true },
  // Its middle reaches the tower's line at 0.5; the coach finishes leaving at the right edge
  // a couple of seconds after the window, its show (passing the tower, the pigeons) long done.
  { name: "the carriage trots past the tower", on: (t) => carriageProgress(t) >= 0, key: (t) => carriageProgress(t) >= 0.5, over: false },
  ...SIZES.map(([W, H]): Action => {
    const up = lift(W, H);
    return { name: `the street pigeons flutter up as it passes (${W}x${H})`, on: (t) => up(t) > 0, key: (t) => up(t) >= 1, over: true };
  }),
];

/** The first time in [from, to] at which `f` holds, or Infinity. */
function first(f: (t: number) => boolean, from: number, to = 60): number {
  for (let t = from; t <= to; t += DT) if (f(t)) return t;
  return Infinity;
}

describe("christmas actions", () => {
  it.each(ACTIONS.map((a) => [a.name, a] as const))("%s within the first 10 s", (_, a) => {
    const start = first(a.on, 0);
    expect(start, "first seen").toBeLessThanOrEqual(WINDOW);
    // The key moment is seen happening (not already past at t = 0) inside the window.
    expect(a.key(0), "key moment already past at t = 0").toBe(false);
    const key = first(a.key, start);
    expect(key, "key moment").toBeLessThanOrEqual(WINDOW);
    if (a.over) expect(first((t) => !a.on(t), key), "over").toBeLessThanOrEqual(WINDOW);
  });
});
