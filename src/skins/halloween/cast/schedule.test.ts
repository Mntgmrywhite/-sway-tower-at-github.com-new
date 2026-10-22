import { describe, expect, it } from "vitest";
import { batTripAt } from "./bats";
import { bonebirdAt, boneVAt } from "./bonebird";
import { catAt } from "./cat";
import { driftGhostAt, graveGhostAt } from "./ghosts";
import { ratAt } from "./rat";
import { ravenAt } from "./raven";
import { spiderAt } from "./spider";
import { curtainAt } from "./windows";

// The owner's rules for anything that moves: every action in the start view has its first key
// moment within the first 10 s (players climb past after that), and then it comes round again for
// as long as anyone watches, on its own rhythm: the guide's "randomized intervals", from hash, so
// no two performers keep step, and the black cat rests out of sight for long stretches before it
// unexpectedly comes back. All pure functions of time and the anchor's id.

const DT = 1 / 30;
const TEN_MIN = 600;
const NONE = Infinity;

/** Whether each performer's action is under way at t (anchor `seed`), and its key moment's test. */
const ACTIVE: Record<string, (t: number, seed: number) => boolean> = {
  cat: (t, s) => catAt(t, s, NONE).vis > 0,
  raven: (t, s) => ravenAt(t, s, NONE).vis > 0,
  spider: (t, s) => spiderAt(t, s, NONE).drop > 0,
  rat: (t, s) => ratAt(t, s, NONE).vis > 0,
  ghost: (t, s) => graveGhostAt(t, s, NONE).rise > 0,
  curtain: (t, s) => curtainAt(t, s).vis > 0,
  "bat trip": (t, s) => batTripAt(t, s) !== null,
  "bone bird flutter": (t, s) => bonebirdAt(t, s, NONE).flying,
  "bone V": (t, s) => boneVAt(t, s) !== null,
  "drift ghost": (t, s) => driftGhostAt(t, s).vis > 0,
};
const KEY: Record<string, (t: number, seed: number) => boolean> = {
  "cat looks at the moon": (t, s) => catAt(t, s, NONE).look > 0.5,
  "raven lands": (t, s) => {
    const p = ravenAt(t, s, NONE);
    return p.vis > 0.99 && !p.flying;
  },
  "raven caws": (t, s) => ravenAt(t, s, NONE).caw > 0.5,
  "spider at the bottom": (t, s) => spiderAt(t, s, NONE).drop > 0.9,
  "rat sniffs": (t, s) => ratAt(t, s, NONE).sniff > 0.5,
  "ghost up": (t, s) => graveGhostAt(t, s, NONE).rise > 0.95,
  "curtain's shadow in the middle": (t, s) => curtainAt(t, s).vis > 0 && curtainAt(t, s).k === 0.5,
  "bats out of the roost": (t, s) => batTripAt(t, s) !== null,
  "bone bird pecks": (t, s) => bonebirdAt(t, s, NONE).peck > 0.5,
  "bone bird flutters": (t, s) => bonebirdAt(t, s, NONE).flying,
};
/** Each action's rhythm: seconds from one start to the next. */
const RANGE: Record<string, [number, number]> = {
  cat: [24, 40],
  raven: [17, 31],
  spider: [7, 15],
  rat: [20, 35],
  ghost: [18, 30],
  curtain: [6, 14],
  "bat trip": [8, 16],
  "bone bird flutter": [8, 15],
  "bone V": [9, 20],
  "drift ghost": [12, 22],
};

/** Moments in [0, to) at which `on` turns true (rising edges), sampled at DT. */
function starts(on: (t: number) => boolean, to = TEN_MIN): number[] {
  const out: number[] = [];
  let was = false;
  for (let i = 0; i * DT < to; i++) {
    const t = i * DT;
    const now = on(t);
    if (now && !was) out.push(t);
    was = now;
  }
  return out;
}

describe("halloween cast schedules", () => {
  it.each(Object.keys(KEY))("%s: first within 10 s, whatever the anchor", (name) => {
    for (let seed = 0; seed < 6; seed++) {
      const first = starts((t) => KEY[name]!(t, seed), 12)[0] ?? Infinity;
      expect(first, `${name}, anchor ${seed}`).toBeLessThan(10);
    }
  });

  it.each(Object.keys(RANGE))("%s: comes round again and again, every %s s or so", (name) => {
    const [lo, hi] = RANGE[name]!;
    for (const seed of [0, 1, 7]) {
      const s = starts((t) => ACTIVE[name]!(t, seed));
      expect(s.length, `${name}, anchor ${seed}: visits in 10 minutes`).toBeGreaterThanOrEqual(Math.floor(TEN_MIN / hi) - 1);
      const gaps = s.slice(1).map((t, i) => t - s[i]!);
      for (const g of gaps) {
        expect(g, `${name}, anchor ${seed}: gap`).toBeGreaterThanOrEqual(lo - 0.1);
        expect(g, `${name}, anchor ${seed}: gap`).toBeLessThanOrEqual(hi + 0.1);
      }
      // Randomized, not a loop: the gaps vary.
      const spread = Math.max(...gaps) - Math.min(...gaps);
      expect(spread, `${name}, anchor ${seed}: the gaps vary`).toBeGreaterThan((hi - lo) * 0.4);
    }
  });

  it("no two performers keep step: their key moments rarely coincide", () => {
    const moments: [string, number[]][] = [
      ["cat", starts((t) => KEY["cat looks at the moon"]!(t, 0))],
      ["second cat", starts((t) => KEY["cat looks at the moon"]!(t, 1))],
      ["raven", starts((t) => KEY["raven lands"]!(t, 0))],
      ["spider", starts((t) => KEY["spider at the bottom"]!(t, 0))],
      ["rat", starts((t) => KEY["rat sniffs"]!(t, 0))],
      ["ghost", starts((t) => KEY["ghost up"]!(t, 0))],
      ["curtain", starts((t) => KEY["curtain's shadow in the middle"]!(t, 0))],
      ["second curtain", starts((t) => KEY["curtain's shadow in the middle"]!(t, 1))],
      ["bats", starts((t) => KEY["bats out of the roost"]!(t, 0))],
      ["bone bird", starts((t) => KEY["bone bird flutters"]!(t, 0))],
    ];
    for (const [a, ma] of moments) {
      for (const [b, mb] of moments) {
        if (a === b) continue;
        const together = ma.filter((t) => mb.some((u) => Math.abs(t - u) < 0.5)).length;
        expect(together / ma.length, `${a} with ${b}`).toBeLessThan(0.2);
      }
    }
  });

  it("the black cat rests out of sight for long stretches between its visits", () => {
    for (const seed of [0, 1, 2]) {
      let hidden = 0;
      let longest = 0;
      let shortest = Infinity;
      let seen = false;
      for (let i = 0; i * DT < TEN_MIN; i++) {
        const on = catAt(i * DT, seed, NONE).vis > 0;
        if (on) {
          if (seen && hidden > 0) shortest = Math.min(shortest, hidden);
          seen = true;
          hidden = 0;
        } else {
          hidden += DT;
          longest = Math.max(longest, hidden);
        }
      }
      expect(longest, `anchor ${seed}: its longest rest`).toBeGreaterThanOrEqual(15);
      expect(shortest, `anchor ${seed}: its shortest rest between visits`).toBeGreaterThanOrEqual(15);
    }
  });

  it("is a pure function of time and anchor, whatever order it is asked in", () => {
    const at = (t: number, seed: number) =>
      JSON.stringify([
        catAt(t, seed, 0.2),
        ravenAt(t, seed, NONE),
        spiderAt(t, seed, 0.1),
        ratAt(t, seed, 0.15),
        graveGhostAt(t, seed, NONE),
        curtainAt(t, seed),
        batTripAt(t, seed),
        bonebirdAt(t, seed, NONE),
        boneVAt(t, seed),
        driftGhostAt(t, seed),
      ]);
    const T = Array.from({ length: 60 }, (_, i) => (i * 37.3) % 900);
    const seeds = [0, 1, 2, 5];
    const forward = T.flatMap((t) => seeds.map((s) => at(t, s)));
    // Asked again backward and interleaved with far-off moments, the answers are the same.
    const back: string[] = [];
    for (let i = T.length - 1; i >= 0; i--) {
      for (let j = seeds.length - 1; j >= 0; j--) {
        at(5000 - T[i]!, seeds[j]!);
        back[i * seeds.length + j] = at(T[i]!, seeds[j]!);
      }
    }
    expect(back).toEqual(forward);
  });
});
