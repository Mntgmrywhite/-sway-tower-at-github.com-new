import { describe, expect, it } from "vitest";
import type { Ctx } from "../../base/draw";
import { familyFolk, familyOnDeck, sidewalkFolk, sidewalkKids } from "./balcony";
import { curbFolk } from "./crowd";
import type { Folk } from "./folk";
import { front } from "./front";
import { onlookerFolk } from "./onlookers";
import { headX, parade, PARADE_AT, ridersOf, UNITS, walkers } from "./parade";
import { deckY } from "./place";
import { ADULT, BONY, CHILD, dance, ik, nearDown, pose, rig, sit, solve, STILTED, walk, type Build, type Gait, type Pose, type Rig, type Vec } from "./rig";
import { sceneAt } from "./test-scene";

// The rig every Mardi Gras figure stands on (rig.ts) and the cast's motion on it: joints never
// come apart, two-bone IK reaches what it can and stretches toward what it cannot, knees bend
// forward and elbows at ease back, a walker's legs alternate and its planted foot stays put on
// the street while it walks over it, a reaching hand gets where the beads land, and no two
// figures of a group move in lockstep.

const EPS = 1e-9;
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** A canvas that draws nothing: the cast's behaviors and rigs run, nothing is painted. */
const STUB = new Proxy({} as Record<string | symbol, unknown>, {
  get: (t, p) => (p in t ? t[p] : () => undefined),
  set: (t, p, v) => {
    t[p] = v;
    return true;
  },
}) as unknown as Ctx;

/** Every joint sits its bone's length from the joint it hangs from. */
function attached(b: Build, r: Rig): void {
  expect(Math.abs(dist(r.hipN, r.kneeN) - b.thigh)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.kneeN, r.ankleN) - b.shin)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.hipF, r.kneeF) - b.thigh)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.kneeF, r.ankleF) - b.shin)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.shN, r.elN) - b.upper)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.elN, r.wrN) - b.fore)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.shF, r.elF) - b.upper)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.elF, r.wrF) - b.fore)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.pelvis, r.neck) - b.spine)).toBeLessThan(EPS);
  expect(Math.abs(dist(r.neck, r.head) - b.neck)).toBeLessThan(EPS);
}

/** Where the ankle should be for the pose's near foot (the ball, pitched): as rig.ts places it. */
function ankleFor(b: Build, x: number, y: number, p: number): Vec {
  const c = Math.cos(p);
  const s = Math.sin(p);
  return { x: x - b.heel * c - b.ankle * s, y: y + b.heel * s - b.ankle * c };
}

/** A deterministic spread of numbers for poses. */
function noise(i: number): number {
  const v = Math.sin(i * 91.17 + 3.3) * 43758.5453;
  return v - Math.floor(v);
}

const GAITS: readonly [string, Build, Gait][] = [
  ["march", ADULT, { step: 0.06, duty: 0.56, lift: 0.016, bounce: 0.005, swing: 0.014, lean: 0.03, roll: 0.02 }],
  ["strut", ADULT, { step: 0.058, duty: 0.58, lift: 0.032, bounce: 0.007, swing: 0.01, lean: -0.07, roll: 0.03 }],
  ["stilts", STILTED, { step: 0.112, duty: 0.6, lift: 0.03, bounce: 0.006, swing: 0.01, lean: 0.02, roll: 0.02 }],
  ["skip", CHILD, { step: 0.075, duty: 0.4, lift: 0.024, bounce: 0.008, swing: 0.02, lean: 0.05, roll: 0.04 }],
];

describe("the rig", () => {
  it("two-bone IK reaches a target in reach exactly, and stretches straight toward one out of reach", () => {
    const mid = { x: 0, y: 0 };
    const end = { x: 0, y: 0 };
    for (let i = 0; i < 400; i++) {
      const tx = (noise(i) - 0.5) * 0.2;
      const ty = (noise(i + 1000) - 0.5) * 0.2;
      ik(0, 0, tx, ty, 0.04, 0.038, i % 2 ? 1 : -1, mid, end);
      expect(Math.abs(Math.hypot(mid.x, mid.y) - 0.04)).toBeLessThan(EPS);
      expect(Math.abs(dist(mid, end) - 0.038)).toBeLessThan(EPS);
      const d = Math.hypot(tx, ty);
      if (d < 0.077 && d > 0.003) expect(dist(end, { x: tx, y: ty })).toBeLessThan(1e-7);
      else if (d >= 0.078) {
        // Out of reach: the arm points straight at it, as far as it goes.
        expect(Math.abs(end.x * ty - end.y * tx)).toBeLessThan(1e-9);
        expect(end.x * tx + end.y * ty).toBeGreaterThan(0);
      }
    }
  });

  it("no joint ever comes apart: walks, dances, sitting, and hands sent anywhere at all", () => {
    for (const [, b, g] of GAITS) {
      const p = pose(b);
      const r = rig();
      for (let i = 0; i < 200; i++) {
        walk(p, b, i / 37, g);
        p.handNX = (noise(i) - 0.5) * 0.3;
        p.handNY = -noise(i + 7) * 0.3;
        p.elbowN = i % 2 ? 1 : -1;
        p.lean = (noise(i + 3) - 0.5) * 0.6;
        p.tilt = (noise(i + 4) - 0.5) * 0.6;
        attached(b, solve(b, p, r));
      }
    }
    for (const b of [ADULT, CHILD, BONY]) {
      const p = pose(b);
      const r = rig();
      for (let i = 0; i < 100; i++) {
        dance(p, b, i / 23, 1);
        attached(b, solve(b, p, r));
        sit(p, b, 0.04, Math.sin(i));
        attached(b, solve(b, p, r));
      }
    }
  });

  it("knees bend forward, and an elbow at ease bends back", () => {
    for (const [name, b, g] of GAITS) {
      const p = pose(b);
      const r = rig();
      for (let i = 0; i < 64; i++) {
        walk(p, b, i / 64, g);
        solve(b, p, r);
        for (const [hip, knee, ankle] of [
          [r.hipN, r.kneeN, r.ankleN],
          [r.hipF, r.kneeF, r.ankleF],
        ] as const) {
          // The knee is on the forward side of the line from hip to ankle (or on it, the leg straight).
          const side = (ankle.x - hip.x) * (knee.y - hip.y) - (ankle.y - hip.y) * (knee.x - hip.x);
          expect(side, `${name} ${i}/64`).toBeLessThanOrEqual(1e-9);
        }
        // The near arm swinging at the side: its elbow behind the line from shoulder to wrist.
        const side = (r.wrN.x - r.shN.x) * (r.elN.y - r.shN.y) - (r.wrN.y - r.shN.y) * (r.elN.x - r.shN.x);
        expect(side, `${name} ${i}/64: the elbow`).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("a walker's legs alternate: one foot lands half a cycle after the other, and they pass", () => {
    for (const [name, b, g] of GAITS) {
      const p: Pose = pose(b);
      let lead = 0;
      let last = 0;
      for (let i = 0; i <= 200; i++) {
        const ph = i / 200;
        walk(p, b, ph, g);
        const d = Math.sign(p.nearX - p.farX);
        if (d !== 0 && last !== 0 && d !== last) lead++;
        if (d !== 0) last = d;
        // Never both feet in the air at once unless the gait is a run; never both swinging.
        if (g.duty >= 0.5) expect(nearDown(g, ph) || nearDown(g, ph + 0.5), `${name} at ${ph}`).toBe(true);
        expect(nearDown(g, ph) && !nearDown(g, ph + 0.5) ? p.nearY : 0, name).toBe(0);
      }
      // Each foot passes the other twice a cycle.
      expect(lead, name).toBe(2);
    }
  });
});

/** Run the parade (and the street's folk) at time t without painting, so every rig is set for that frame. */
function frame(t: number): void {
  const s = sceneAt(390, 844, 0, t);
  parade(STUB, s);
  familyOnDeck(STUB, s, deckY(s, 1));
  sidewalkKids(STUB, s);
  front(STUB, s);
}

describe("the parade on its feet", () => {
  const DT = 1 / 120;
  /** Each walker's place along the route (u from the center) at t. */
  const placeOf = (unit: string, t: number) => headX(t) - UNITS.find(([u]) => u === unit)![1];

  it("a planted foot stays put on the street while the walker passes over it, and stands on it", () => {
    let checked = 0;
    for (const w of walkers()) {
      const size = w.f.size * w.k;
      let prev: { n: number | null; f: number | null } = { n: null, f: null };
      for (let t = PARADE_AT + 0.5; t < PARADE_AT + 11; t += DT) {
        frame(t);
        const r = w.f.rig;
        const ux = placeOf(w.unit, t);
        // Only while it is drawn (on a phone's screen and a little past its edges).
        if (Math.abs(ux) > 0.65) {
          prev = { n: null, f: null };
          continue;
        }
        const p = w.f.pose;
        const down = { n: p.nearY === 0 && Math.abs(p.nearP) < 0.8, f: p.farY === 0 && Math.abs(p.farP) < 0.8 };
        const world = { n: ux + r.ballN.x * size, f: ux + r.ballF.x * size };
        for (const k of ["n", "f"] as const) {
          if (!down[k]) {
            prev[k] = null;
            continue;
          }
          // The foot is really there: the leg reaches its ankle.
          const ball = k === "n" ? r.ballN : r.ballF;
          const want = ankleFor(w.f.look.b, ball.x, ball.y, k === "n" ? r.pitchN : r.pitchF);
          expect(dist(want, k === "n" ? r.ankleN : r.ankleF), `${w.unit} at ${t.toFixed(3)}: the ${k} leg reaches its foot`).toBeLessThan(1e-6);
          if (prev[k] !== null) {
            expect(Math.abs(world[k] - prev[k]!), `${w.unit} at ${t.toFixed(3)}: the ${k} foot slides`).toBeLessThan(1e-6);
            checked++;
          }
          prev[k] = world[k];
        }
        prev = { ...prev };
      }
    }
    expect(checked).toBeGreaterThan(2000);
  }, 60_000);
});

/** Pearson correlation of two series. */
function corr(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    ab += (a[i]! - ma) * (b[i]! - mb);
    aa += (a[i]! - ma) ** 2;
    bb += (b[i]! - mb) ** 2;
  }
  if (aa < 1e-14 || bb < 1e-14) return 0;
  return ab / Math.sqrt(aa * bb);
}

describe("nobody moves in lockstep", () => {
  /** The channels of a figure's motion compared: its pelvis's height, its near foot, its hands. */
  const CHANNELS = [(p: Pose) => p.hipY, (p: Pose) => p.nearX, (p: Pose) => p.nearY, (p: Pose) => p.handNY, (p: Pose) => p.handFY];

  /** Each figure's motion over a stretch of time, channel by channel, sampled as the scene draws it. */
  function bounces(group: () => readonly Folk[], from: number, to: number): number[][][] {
    const out: number[][][] = group().map(() => CHANNELS.map(() => []));
    for (let t = from; t < to; t += 1 / 30) {
      frame(t);
      group().forEach((f, i) => CHANNELS.forEach((c, k) => out[i]![k]!.push(c(f.pose))));
    }
    return out;
  }

  /** No two of a group move together: on average over the channels that move for both, their motions are far from in step. */
  function noPair(name: string, series: number[][][]): void {
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        let sum = 0;
        let n = 0;
        for (let k = 0; k < CHANNELS.length; k++) {
          const c = corr(series[i]![k]!, series[j]![k]!);
          if (c === 0) continue;
          sum += c;
          n++;
        }
        expect(n ? sum / n : 0, `${name}: ${i} and ${j}`).toBeLessThan(0.8);
        // And never bobbing up and down as one.
        expect(corr(series[i]![0]!, series[j]![0]!), `${name}: ${i} and ${j}, their bounce`).toBeLessThan(0.9);
      }
    }
  }

  it("the band and the second line, each walker on its own step", () => {
    // While the whole band is on screen, and again as the tail passes.
    const band = () => walkers().filter((w) => ["flambeau", "trumpet", "sax", "trombone", "sousaphone", "snare", "bass"].includes(w.unit)).map((w) => w.f);
    noPair("the band", bounces(band, PARADE_AT + 2.5, PARADE_AT + 4.5));
    const tail = () => walkers().filter((w) => ["stilts", "flambeau2", "liner", "dancer"].includes(w.unit)).map((w) => w.f);
    noPair("the tail", bounces(tail, PARADE_AT + 8, PARADE_AT + 10));
  }, 60_000);

  it("the skeletons on their float and the riders on theirs, each dancing to its own count", () => {
    noPair("the skeletons", bounces(() => ridersOf(0), PARADE_AT + 5, PARADE_AT + 7));
    noPair("the riders", bounces(() => ridersOf(1), PARADE_AT + 6.5, PARADE_AT + 8.5));
  }, 60_000);

  it("the street's folk: the family, the kids, the curb's crowd and the onlookers", () => {
    const street = () => [familyFolk(0), familyFolk(1), familyFolk(2), sidewalkFolk(0), sidewalkFolk(1), ...curbFolk(), ...onlookerFolk()];
    noPair("the street", bounces(street, 12, 20));
  }, 60_000);
});

/** How near a catcher's hands come to where the beads land (u): a hand's breadth on the smallest of them. */
const CLOSE = 0.006;

describe("hands meet the beads", () => {
  it("every catcher's hands are where the beads come down as they land", async () => {
    const { THROW_COUNT, throwAt, throwTarget, SEATS, SEAT_UP, CATCH_UP, CATCH_AHEAD } = await import("./parade");
    const { tossAt } = await import("./balcony");
    const { kidCatch, curbTop, JUMPER, LITTLE } = await import("./place");
    const { toScreen } = await import("./folk");
    const W = 390;
    const H = 844;
    const first = (f: (t: number) => boolean, from = 0) => {
      for (let t = from; t < 60; t += 1 / 120) if (f(t)) return t;
      return Infinity;
    };
    const mid = { x: 0, y: 0 };
    const hands = (f: Folk, x: number, y: number, u: number) => {
      const a = toScreen(f, f.rig.wrN, x, y, u, { x: 0, y: 0 });
      const b = toScreen(f, f.rig.wrF, x, y, u, { x: 0, y: 0 });
      mid.x = (a.x + b.x) / 2;
      mid.y = (a.y + b.y) / 2;
      return mid;
    };
    for (let i = 0; i < THROW_COUNT; i++) {
      const start = first((t) => throwAt(t, i).flight >= 0);
      const land = first((t) => throwAt(t, i).flight < 0, start) - 1 / 60;
      frame(land);
      const s = sceneAt(W, H, 0, land);
      const { to, n } = throwTarget(i);
      let target: Vec;
      let at: Vec;
      if (to === "kid") {
        target = { ...kidCatch(s, n) };
        const f = sidewalkFolk(n);
        const k = (await import("./place")).KID_SPOTS[n]!;
        at = hands(f, W / 2 + k.x * s.u, deckY(s, 0) + 0.045 * s.u, s.u);
      } else if (to === "seat") {
        target = { x: W / 2 + SEATS[n]! * s.u, y: curbTop(s) - s.u * SEAT_UP };
        const { LADDER_AT, ladderTop } = await import("./front");
        at = hands(curbFolk()[n]!, W / 2 + (LADDER_AT + (n ? 0.024 : -0.024)) * s.u, ladderTop(s), s.u);
      } else if (to === "gallery") {
        target = { x: W / 2 + (LITTLE.x + CATCH_AHEAD * LITTLE.size) * s.u, y: deckY(s, 1) - CATCH_UP * LITTLE.size * s.u };
        at = hands(familyFolk(2), W / 2 + LITTLE.x * s.u, deckY(s, 1), s.u);
      } else {
        target = { x: W / 2 + (JUMPER.x + CATCH_AHEAD * JUMPER.size) * s.u, y: curbTop(s) + s.u * 0.004 - CATCH_UP * JUMPER.size * s.u };
        at = hands(curbFolk()[2]!, W / 2 + JUMPER.x * s.u, curbTop(s) + s.u * 0.004, s.u);
      }
      expect(dist(at, target) / s.u, `throw ${i} to ${to} ${n}`).toBeLessThan(CLOSE);
    }
    // The family's tosses down to the kids.
    for (let i = 0; i < 2; i++) {
      const fly = first((t) => tossAt(t, i).flight >= 0);
      const land = first((t) => tossAt(t, i).flight < 0, fly) - 1 / 60;
      frame(land);
      const s = sceneAt(W, H, 0, land);
      const kid = i === 0 ? 1 : 0;
      const k = (await import("./place")).KID_SPOTS[kid]!;
      const at = hands(sidewalkFolk(kid), W / 2 + k.x * s.u, deckY(s, 0) + 0.045 * s.u, s.u);
      expect(dist(at, kidCatch(s, kid)) / s.u, `toss ${i}`).toBeLessThan(CLOSE);
    }
  }, 60_000);
});
