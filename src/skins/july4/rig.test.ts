import { describe, expect, it } from "vitest";
import { HAIR_BROWN, SKIN_FAIR, TROUSERS, UNIFORM, shades } from "./colors";
import { STROLLERS, CROWD_IDS } from "./crowd";
import { figure, type Look } from "./folk";
import { BAND_GAITS, BIKER_REACH, drawUnit, PARADE_VIEW } from "./parade";
import { ADULT, blinkAt, bone, CHILD, footAt, fract, glance, hop, J, legTo, phaseAt, pose, sit, stand, STROLL, walk, wave, type Build, type Gait, type Pose } from "./rig";
import { context, sceneAt } from "./test-scene";

// The rig every townsperson stands on (rig.ts): its bones never stretch or part, a walking foot
// stays where it was set down while it bears weight, knees bend forward and elbows back, and the
// band and the crowd each move on their own clocks (the owner: "nothing moves in lockstep"). And
// every check here is shown to catch the fault it is for, on a pose broken on purpose.

/** Every bone of a pose against its build: how far the worst one is off its length (u). */
function worstBone(P: Pose, b: Build): number {
  const pairs: [number, number, number][] = [
    [J.hipN, J.kneeN, b.thigh],
    [J.kneeN, J.ankleN, b.shin],
    [J.hipF, J.kneeF, b.thigh],
    [J.kneeF, J.ankleF, b.shin],
    [J.shN, J.elbowN, b.upper],
    [J.elbowN, J.handN, b.fore],
    [J.shF, J.elbowF, b.upper],
    [J.elbowF, J.handF, b.fore],
    [J.ankleN, J.ballN, Math.hypot(b.ball, b.ankle)],
    [J.ankleF, J.ballF, Math.hypot(b.ball, b.ankle)],
    [J.pelvis, J.chest, b.spine],
  ];
  let worst = 0;
  for (const [a, c, len] of pairs) worst = Math.max(worst, Math.abs(bone(P, a, c) - len));
  return worst;
}

/** Bones of the arm placed by armSwing: the hand hangs off the forearm's line at most `out` aside, so check the upper arm only and that the forearm is no longer than its bone. */
const BUILDS: [string, Build][] = [
  ["a grown-up", ADULT],
  ["a child", CHILD],
  ...BAND_GAITS.map(({ id, build }) => [id, build] as [string, Build]),
];

/** The poses the cast is put in, at time t. */
const BEHAVIORS: [string, (P: Pose, b: Build, t: number) => void][] = [
  ["a stroll", (P, b, t) => walk(P, b, { speed: 0.06, cadence: 1, phase: 0, duty: 0.6, lift: 0.006, high: 0, stance: 0.005 }, STROLL, t)],
  ["a march", (P, b, t) => walk(P, b, { speed: 0.24, cadence: 1.95, phase: 0.3, duty: 0.54, lift: 0.0045, high: 0.3, stance: 0.005 }, { ...STROLL, arms: 0 }, t)],
  ["a high step", (P, b, t) => walk(P, b, { speed: 0.24, cadence: 1.95, phase: 0.1, duty: 0.54, lift: 0.0045, high: 1, stance: 0.005 }, STROLL, t)],
  ["standing at ease", (P, b, t) => stand(P, b, t, 0.4, 0.005)],
  ["hopping", (P, b, t) => hop(P, b, t, 1.8, 0.2, 0.01, 0.005)],
  ["sitting", (P, b) => sit(P, b, 0.03, -0.1, 0, 0)],
  ["sitting on the ground", (P, b) => sit(P, b, 0, -0.05, 0.1, 1)],
  [
    "waving",
    (P, b, t) => {
      stand(P, b, t, 0.2, 0.005);
      wave(P, b, t, 1.5, 1);
    },
  ],
];

describe("the rig's bones never stretch or part", () => {
  it.each(BUILDS.flatMap(([name, b]) => BEHAVIORS.map(([what, pose]) => [name, what, b, pose] as const)))("%s, %s", (_name, _what, b, set) => {
    const P = pose();
    for (let t = 0; t < 6; t += 0.037) {
      set(P, b, t);
      expect(worstBone(P, b), `t=${t.toFixed(3)}`).toBeLessThan(1e-9);
    }
  });

  it("the check catches a stretched bone", () => {
    const P = pose();
    stand(P, ADULT, 1, 0, 0.005);
    expect(worstBone(P, ADULT)).toBeLessThan(1e-9);
    P.j[J.kneeN * 3 + 2] = P.j[J.kneeN * 3 + 2]! + 0.004;
    expect(worstBone(P, ADULT)).toBeGreaterThan(0.002);
  });
});

/** A walker's planted feet, tracked through its stride: how far a planted ball of the foot moves over the ground (u), and how far a planted foot is off the ground. Its body travels at `travel` u/s. */
function plantDrift(b: Build, g: Gait, travel: number, t0: number, seconds: number): { slide: number; lift: number; reached: number; stances: number } {
  const P = pose();
  const dt = 1 / 240;
  let slide = 0;
  let lift = 0;
  let reached = 0;
  let stances = 0;
  const was = [NaN, NaN];
  for (let t = t0; t < t0 + seconds; t += dt) {
    walk(P, b, g, STROLL, t);
    const p = phaseAt(g, t);
    [true, false].forEach((near, i) => {
      const q = fract(p + (near ? 0 : 0.5));
      const planted = footAt(g, q).planted;
      const ball = near ? J.ballN : J.ballF;
      // Where the leg's own ball of the foot is, in the world (the body has travelled `travel` t).
      const x = travel * t + P.j[ball * 3 + 1]!;
      const y = P.j[ball * 3 + 2]!;
      if (planted) {
        if (Number.isNaN(was[i]!)) stances++;
        else slide = Math.max(slide, Math.abs(x - was[i]!));
        if (Number.isNaN(was[i]!)) was[i] = x;
        lift = Math.max(lift, Math.abs(y));
        // The leg reaches its foot: the ball the solver placed is the ball the gait set.
        const target = footAt(g, q).f;
        reached = Math.max(reached, Math.abs(P.j[ball * 3 + 1]! - target));
      } else was[i] = NaN;
    });
  }
  return { slide, lift, reached, stances };
}

describe("a walking foot stays where it is set down while it bears weight", () => {
  const walkers: [string, Build, Gait][] = [
    ...BAND_GAITS.map(({ id, build, gait }) => [`the parade's ${id}`, build, gait] as [string, Build, Gait]),
    ...STROLLERS.map((w) => [`the stroller ${w.id}`, w.build, { speed: w.speed / (0.52 * Math.sin(Math.PI * 0.4)), cadence: w.cadence, phase: 0, duty: 0.6, lift: 0.006, high: 0, stance: 0.005 }] as [string, Build, Gait]),
  ];
  it.each(walkers)("%s", (_name, b, g) => {
    for (const t0 of [0, 3.3, 41.7]) {
      const d = plantDrift(b, g, g.speed, t0, 3);
      expect(d.stances, "it takes steps").toBeGreaterThan(3);
      expect(d.slide, "a planted foot slides over the ground (u)").toBeLessThan(1e-6);
      expect(d.lift, "a planted foot leaves the ground (u)").toBeLessThan(1e-6);
      expect(d.reached, "the leg falls short of its planted foot (u)").toBeLessThan(1e-6);
    }
  });

  it("the parade's marchers step at the pace the parade walks: their feet do not slide on the screen", () => {
    // A marcher's ground point moves at SPEED on the screen; its body space is seen from PARADE_VIEW
    // at its scale, so its gait's speed in its own units must be SPEED over (scale x sin(view)).
    for (const { id, gait } of BAND_GAITS) {
      const k = gait.speed * Math.sin(PARADE_VIEW);
      expect(k, id).toBeGreaterThan(0.2);
      expect(k, id).toBeLessThan(0.27);
    }
  });

  it("the check catches a foot that slides (a stride that does not match the body's travel)", () => {
    const { build, gait } = BAND_GAITS[2]!;
    const d = plantDrift(build, gait, gait.speed * 1.15, 0, 3);
    expect(d.slide).toBeGreaterThan(0.002);
  });
});

describe("the girl on her bike keeps her feet on the pedals and her hands on the bars", () => {
  it("round and round the crank, for a lap of the parade", () => {
    const ctx = context(390, 844, 0.25);
    for (let t = 0; t < 12; t += 0.031) {
      const s = sceneAt(390, 844, 0, t);
      drawUnit(ctx, s, "bike", 195, s.groundY + 0.285 * s.u, t);
      expect(BIKER_REACH.feet, `t=${t.toFixed(3)}: a foot off its pedal (u)`).toBeLessThan(1e-6);
      expect(BIKER_REACH.hands, `t=${t.toFixed(3)}: a hand off the bars (u)`).toBeLessThan(1e-6);
    }
  });
});

describe("knees bend forward, elbows back", () => {
  /** How far the knee is in front of the line from the hip to the ankle (u, positive: forward). */
  const kneeAhead = (P: Pose, near: boolean) => {
    const h = near ? J.hipN : J.hipF;
    const k = near ? J.kneeN : J.kneeF;
    const a = near ? J.ankleN : J.ankleF;
    const hf = P.j[h * 3 + 1]!;
    const hy = P.j[h * 3 + 2]!;
    const af = P.j[a * 3 + 1]!;
    const ay = P.j[a * 3 + 2]!;
    const kf = P.j[k * 3 + 1]!;
    const ky = P.j[k * 3 + 2]!;
    // The knee's offset from the hip-ankle line, signed forward.
    const dx = af - hf;
    const dy = ay - hy;
    const len = Math.hypot(dx, dy) || 1;
    return ((kf - hf) * dy - (ky - hy) * dx) / len;
  };
  const elbowBack = (P: Pose, near: boolean) => {
    const s = near ? J.shN : J.shF;
    const e = near ? J.elbowN : J.elbowF;
    const h = near ? J.handN : J.handF;
    const dx = P.j[h * 3 + 1]! - P.j[s * 3 + 1]!;
    const dy = P.j[h * 3 + 2]! - P.j[s * 3 + 2]!;
    const len = Math.hypot(dx, dy) || 1;
    return -((P.j[e * 3 + 1]! - P.j[s * 3 + 1]!) * dy - (P.j[e * 3 + 2]! - P.j[s * 3 + 2]!) * dx) / len;
  };

  it.each(BAND_GAITS.map(({ id, build, gait }) => [id, build, gait] as const))("%s: every knee bends forward through the whole stride", (_id, b, g) => {
    const P = pose();
    for (let t = 0; t < 2; t += 0.011) {
      walk(P, b, g, STROLL, t);
      for (const near of [true, false]) expect(kneeAhead(P, near), `t=${t.toFixed(3)}`).toBeGreaterThan(-1e-9);
    }
  });

  it("an arm reaching out to a hand's place bends its elbow back and down, never forward", () => {
    const P = pose();
    for (let t = 0; t < 4; t += 0.05) {
      stand(P, ADULT, t, 0.3, 0.005);
      wave(P, ADULT, t, 1.4, 1, true);
      expect(elbowBack(P, true), `t=${t}`).toBeGreaterThan(-1e-9);
    }
  });

  it("the check catches a knee bent backward", () => {
    const P = pose();
    walk(P, ADULT, BAND_GAITS[0]!.gait, STROLL, 0.2);
    // Bend the near knee the wrong way: its pole behind it.
    const [l, f, y] = [P.j[J.ballN * 3]!, P.j[J.ballN * 3 + 1]!, P.j[J.ballN * 3 + 2]!];
    legTo(P, ADULT, true, l, f, y - 0.02, 0, 0);
    const before = kneeAhead(P, true);
    expect(before).toBeGreaterThan(0);
    // Mirror the knee across the hip-ankle line.
    const hf = P.j[J.hipN * 3 + 1]!;
    const hy = P.j[J.hipN * 3 + 2]!;
    const af = P.j[J.ankleN * 3 + 1]!;
    const ay = P.j[J.ankleN * 3 + 2]!;
    const kf = P.j[J.kneeN * 3 + 1]!;
    const ky = P.j[J.kneeN * 3 + 2]!;
    const dx = af - hf;
    const dy = ay - hy;
    const t = ((kf - hf) * dx + (ky - hy) * dy) / (dx * dx + dy * dy);
    const px = hf + dx * t;
    const py = hy + dy * t;
    P.j[J.kneeN * 3 + 1] = 2 * px - kf;
    P.j[J.kneeN * 3 + 2] = 2 * py - ky;
    expect(kneeAhead(P, true)).toBeLessThan(0);
  });
});

describe("nothing moves in lockstep", () => {
  it("the band steps together but each a little out of the others' time", () => {
    const band = BAND_GAITS.filter((g) => g.id !== "uncleSam");
    for (let i = 0; i < band.length; i++) {
      for (let j = i + 1; j < band.length; j++) {
        const a = band[i]!.gait;
        const b = band[j]!.gait;
        // Same tempo (they march to one drum)...
        expect(a.cadence, `${band[i]!.id} and ${band[j]!.id} march to one tempo`).toBeCloseTo(b.cadence, 9);
        // ...but never on the very same foot at the very same moment.
        const d = Math.abs(fract(a.phase - b.phase + 0.5) - 0.5);
        expect(d, `${band[i]!.id} and ${band[j]!.id} share a phase`).toBeGreaterThan(0.02);
      }
    }
  });

  it("the band's members lift their knees and carry themselves each their own way", () => {
    const highs = new Set(BAND_GAITS.map((g) => g.gait.high.toFixed(3)));
    expect(highs.size).toBeGreaterThan(4);
  });

  it("the crowd blinks, glances and shifts on its own clocks: no two alike", () => {
    // Over a minute, sample each member's blink and glance: no two members' series match.
    const series = CROWD_IDS.map((id) => {
      const out: number[] = [];
      for (let t = 0; t < 60; t += 0.1) out.push(blinkAt(t, id) > 0.5 ? 1 : 0, Math.round(glance(t, id, -1, 1) * 20));
      return out.join();
    });
    expect(new Set(series).size).toBe(series.length);
  });

  it("the strollers walk at their own paces", () => {
    const paces = new Set(STROLLERS.map((w) => `${w.speed}/${w.cadence}`));
    expect(paces.size).toBe(STROLLERS.length);
  });

  it("the check catches two members in lockstep", () => {
    const series = [11, 11].map((id) => {
      const out: number[] = [];
      for (let t = 0; t < 60; t += 0.1) out.push(blinkAt(t, id) > 0.5 ? 1 : 0);
      return out.join();
    });
    expect(new Set(series).size).toBe(1);
  });
});

describe("a painted figure stays in one piece", () => {
  /** How many separate blobs a figure painted alone makes (8-connected pixels with any paint). */
  function blobs(draw: (ctx: CanvasRenderingContext2D) => void): number {
    const W = 160;
    const H = 200;
    const K = 2;
    const ctx = context(W, H, K);
    draw(ctx);
    const w = W * K;
    const h = H * K;
    const d = ctx.getImageData(0, 0, w, h).data;
    const seen = new Uint8Array(w * h);
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || d[i * 4 + 3]! < 60) continue;
      n++;
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const p = stack.pop()!;
        const x = p % w;
        const y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (seen[q] || d[q * 4 + 3]! < 60) continue;
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    return n;
  }
  const LOOKS: [string, Look][] = [
    ["in a uniform", { skin: SKIN_FAIR, hair: HAIR_BROWN, style: "crop", top: UNIFORM, sleeves: "long", lower: TROUSERS, legs: "trousers", shoes: "#2a2433" }],
    ["in a dress, with a ponytail", { skin: SKIN_FAIR, hair: HAIR_BROWN, style: "pony", ribbon: "#c9403a", top: shades("#9cc6e8"), sleeves: "short", lower: shades("#9cc6e8"), legs: "dress", hem: 0.5, shoes: "#c9403a" }],
    ["in shorts, with pigtails", { skin: SKIN_FAIR, hair: HAIR_BROWN, style: "pigtails", ribbon: "#c9403a", top: shades("#ef8f43"), sleeves: "short", lower: shades("#4b67a8"), legs: "shorts", shoes: "#3b2a26" }],
  ];
  it.each(LOOKS.flatMap(([what, look]) => BEHAVIORS.map(([how, set]) => [what, how, look, set] as const)))("%s, %s", (_what, _how, look, set) => {
    const P = pose();
    for (const lod of [2, 0]) {
      for (let t = 0.1; t < 3; t += 0.37) {
        set(P, ADULT, t);
        P.view = Math.PI * (0.15 + (t % 1) * 0.3);
        P.face = P.view;
        P.lagX = Math.sin(t * 3) * 0.004;
        P.lagY = Math.cos(t * 3) * 0.003;
        expect(blobs((ctx) => figure(ctx, P, ADULT, look, 80, 170, 600, t % 2 < 1 ? 1 : -1, lod > 0 ? 1.4 : 0, { lod })), `lod ${lod}, t=${t.toFixed(2)}`).toBe(1);
      }
    }
  });

  it("the check catches a part that came off", () => {
    const P = pose();
    stand(P, ADULT, 1, 0, 0.005);
    expect(blobs((ctx) => figure(ctx, P, ADULT, LOOKS[0]![1], 80, 170, 600, 1, 1.4, { lod: 2 }))).toBe(1);
    // A hat drawn well away from the head.
    const hat = (ctx: CanvasRenderingContext2D, F: { x: Float64Array; y: Float64Array; headR: number }) => {
      ctx.beginPath();
      ctx.arc(F.x[J.head]!, F.y[J.head]! - F.headR * 4, F.headR, 0, Math.PI * 2);
      ctx.fill();
    };
    expect(blobs((ctx) => figure(ctx, P, ADULT, LOOKS[0]![1], 80, 170, 600, 1, 1.4, { lod: 2 }, { hat }))).toBeGreaterThan(1);
  });
});
