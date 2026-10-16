import { afterEach, describe, expect, it } from "vitest";
import {
  BASE_WIDTH,
  CALM_TIME,
  LAST_CHANCE_TIME,
  LEAN_EASE,
  LIVES,
  WARN_FRAC,
  resetTuning,
  tuning,
} from "./config";
import {
  drift,
  drop,
  forecast,
  gustPush,
  hash01,
  kickAmplitude,
  leanShape,
  leanTarget,
  newGame,
  stability,
  step,
  swayOffset,
  tilt,
  timeScale,
  top,
  toppleLimit,
  topplePivot,
  unrest,
  warning,
  windStrength,
  type GameState,
} from "./game";
import * as shipped from "./testing/shipped-game";
import { DT, dropAt, gauss, median, perfectTower, play, rng, topWorldX } from "./testing/bots";

afterEach(resetTuning);

function aim(g: GameState, dx: number): void {
  g.slider.x = topWorldX(g) + dx;
}
function stack(g: GameState, n: number): void {
  for (let i = 0; i < n; i++) {
    aim(g, 0);
    drop(g);
  }
}
function run(g: GameState, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += DT) step(g, DT);
}
/** Tower of n full-width blocks whose top is shifted so drift = d; lean set at its target. */
function leaning(n: number, d: number, opts: { armed?: boolean } = {}): GameState {
  const g = newGame();
  const b = g.blocks[0]!;
  for (let i = 1; i <= n; i++) g.blocks.push({ x: b.x + (i === n ? d : 0), w: b.w });
  g.score = n;
  g.leanTop = n;
  g.lean = leanTarget(g);
  g.armed = opts.armed ?? false;
  g.nextGust = 1e9;
  return g;
}

describe("imbalance -> lean", () => {
  it("an off-center drop moves the drift by half the error and the lean eases in", () => {
    const g = newGame();
    stack(g, 20);
    aim(g, 6);
    drop(g);
    expect(drift(g)).toBeCloseTo(3, 1);
    expect(leanTarget(g)).toBeCloseTo(6, 1);
    expect(g.lean).toBe(0);
    run(g, 1);
    expect(g.lean).toBeCloseTo(6 * (1 - Math.exp(-LEAN_EASE)), 1);
  });

  it("a counterweight straightens it at once", () => {
    const g = newGame();
    stack(g, 20);
    aim(g, 6);
    drop(g);
    aim(g, -6);
    const r = drop(g);
    expect(r?.kind).toBe("sliced");
    expect(Math.abs(drift(g))).toBeLessThan(0.5);
    expect(Math.abs(leanTarget(g))).toBeLessThan(1);
    if (r?.kind === "sliced") expect(r.armed).toBe(false);
  });

  it("short towers are stiff", () => {
    const a = newGame();
    aim(a, 6);
    drop(a); // level 1
    const b = newGame();
    stack(b, 20);
    aim(b, 6);
    drop(b);
    expect(leanTarget(a)).toBeLessThan(leanTarget(b) / 4);
  });

  it("the lean tilts only the top LEAN_SPAN levels; the base never moves", () => {
    const g = leaning(40, 0);
    g.lean = 12;
    g.swayAngle = 0;
    expect(swayOffset(g, 40)).toBeCloseTo(12);
    expect(swayOffset(g, 34)).toBeCloseTo(6);
    expect(swayOffset(g, 28)).toBeCloseTo(0);
    expect(swayOffset(g, 0)).toBe(0);
    expect(leanShape(g, 0)).toBe(0);
  });

  it("a leaning tower sways more (leanSway)", () => {
    const g = leaning(40, 0);
    g.swayAngle = Math.PI / 2;
    g.lean = 15;
    expect(swayOffset(g, 40) - 15).toBeCloseTo(14 * (1 + 0.5 * 0.5));
  });
});

describe("no jumps", () => {
  it("a drop never moves any placed block", () => {
    const g = perfectTower(20, 1);
    run(g, 0.37);
    aim(g, 9);
    const before = g.blocks.map((_, i) => swayOffset(g, i));
    drop(g);
    before.forEach((v, i) => expect(swayOffset(g, i)).toBe(v));
    const perf = g.blocks.map((_, i) => swayOffset(g, i));
    aim(g, 0);
    drop(g); // perfect: brace changes velocity only
    perf.forEach((v, i) => expect(swayOffset(g, i)).toBe(v));
  });

  it("motion is continuous: per-step movement halves when the step halves", () => {
    const maxDelta = (dt: number) => {
      const g = perfectTower(30, 2);
      const r = rng(4);
      let worst = 0;
      let prev = swayOffset(g, 30);
      for (let t = 0; t < 30; t += dt) {
        step(g, dt);
        if (g.phase !== "playing") break;
        if (r() < dt * 1.2) {
          // sloppy, counter, or perfect drops at random; also flip toggles
          const lvl = g.blocks.length - 1;
          const now = swayOffset(g, lvl);
          aim(g, [0, 9, -12, 5][Math.floor(r() * 4)]!);
          drop(g);
          expect(swayOffset(g, lvl)).toBe(now);
          if (r() < 0.3) tuning.leanOn = !tuning.leanOn;
        }
        const cur = swayOffset(g, g.blocks.length - 1);
        if (g.blocks.length - 1 === 30) worst = Math.max(worst, Math.abs(cur - prev));
        prev = cur;
      }
      return worst;
    };
    const a = maxDelta(1 / 120);
    const b = maxDelta(1 / 240);
    expect(a).toBeLessThan(2.5);
    expect(b).toBeLessThan(a * 0.7);
  });

  it("live tuning changes leave every block where it is", () => {
    const g = perfectTower(30, 3);
    aim(g, 8);
    drop(g);
    run(g, 0.4);
    const before = g.blocks.map((_, i) => swayOffset(g, i));
    tuning.leanOn = false;
    tuning.leanGain = 3.3;
    tuning.toppleOn = false;
    tuning.toppleLimit = 12;
    tuning.thinTippy = 0.9;
    tuning.teeterTime = 1.5;
    tuning.gustsOn = false;
    tuning.gustPush = 20;
    tuning.lastChance = false;
    tuning.perfectSteady = 0;
    tuning.perfectBrace = 0;
    tuning.regrowNeedsCalm = false;
    tuning.regrowCalm = 9;
    before.forEach((v, i) => expect(swayOffset(g, i)).toBe(v));
  });

  it("the kick cap trims velocity, never position", () => {
    const g = newGame();
    stack(g, 10);
    g.kick = 25;
    aim(g, 50);
    drop(g);
    expect(g.kick).toBe(25);
    expect(kickAmplitude(g)).toBeLessThanOrEqual(30 + 1e-9);
  });
});

describe("topple", () => {
  it("limit shrinks with a narrow top (thinTippy)", () => {
    const g = leaning(5, 0);
    expect(toppleLimit(g)).toBeCloseTo(30);
    top(g).w = 30;
    expect(toppleLimit(g)).toBeCloseTo(22.5);
    top(g).w = 12;
    expect(toppleLimit(g)).toBeCloseTo(18);
    tuning.thinTippy = 0;
    expect(toppleLimit(g)).toBeCloseTo(30);
  });

  it("an armed tower past the rail topples after teeterTime, in slow motion", () => {
    const g = leaning(40, 18, { armed: true }); // lean 36 > 30
    run(g, 0.58);
    expect(g.phase).toBe("playing");
    expect(warning(g)).toBe("teeter");
    expect(timeScale(g)).toBe(tuning.teeterSlowmo);
    run(g, 0.04);
    expect(g.phase).toBe("over");
    expect(g.toppled).toEqual({ dir: 1, level: 40 });
    expect(g.lives).toBe(LIVES);
    expect(drop(g)).toBeNull();
    expect(timeScale(g)).toBe(1);
    const frozen = JSON.stringify(g);
    step(g, 1);
    expect(JSON.stringify(g)).toBe(frozen);
  });

  it("a brief swing past the rail is a near-miss, not a topple", () => {
    const g = leaning(40, 11, { armed: true }); // lean 22
    g.kick = 9.5; // at the peak of a swing: tilt 31.5 > 30, then it swings back
    let maxTeeter = 0;
    for (let t = 0; t < 3; t += DT) {
      step(g, DT);
      maxTeeter = Math.max(maxTeeter, g.teeter);
    }
    expect(g.phase).toBe("playing");
    expect(maxTeeter).toBeGreaterThan(0);
    expect(maxTeeter).toBeLessThan(tuning.teeterTime);
    expect(g.teeter).toBe(0);
    expect(g.saves).toBe(1);
  });

  it("an unarmed tower hangs in LAST CHANCE, then goes if nobody acts", () => {
    const g = leaning(40, 18); // lean 36, armed false
    run(g, 1);
    expect(g.phase).toBe("playing");
    expect(warning(g)).toBe("lastChance");
    expect(stability(g).lastChance01).toBeGreaterThan(0);
    expect(timeScale(g)).toBe(1); // slow motion only while it teeters
    run(g, tuning.teeterTime + LAST_CHANCE_TIME - 1 - 0.05);
    expect(g.phase).toBe("playing");
    run(g, 0.1);
    expect(g.phase).toBe("over");
  });

  it("lastChance off: an unarmed tower goes at teeterTime", () => {
    tuning.lastChance = false;
    const g = leaning(40, 18);
    run(g, tuning.teeterTime + 0.02);
    expect(g.phase).toBe("over");
  });

  it("the deciding tap: counterweight or perfect+perfect saves, same side topples", () => {
    for (const delay of [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9]) {
      const mk = () => {
        const g = perfectTower(20, 5);
        tuning.gustsOn = false;
        dropAt(g, 28);
        run(g, delay);
        expect(g.phase).toBe("playing");
        expect(["teeter", "lastChance", "danger"]).toContain(warning(g));
        return g;
      };
      const counter = mk();
      dropAt(counter, -14);
      run(counter, tuning.teeterTime + LAST_CHANCE_TIME - 0.05);
      expect(counter.phase).toBe("playing"); // an unarmed tap can never topple sooner

      // Perfects every 1.2 s: STEADY until calm, then REBUILT straightens it. Never topples.
      const perfects = mk();
      let regained = 0;
      let taps = 0;
      while (regained === 0 && taps < 3) {
        const r = dropAt(perfects, 0);
        expect(r?.kind).toBe("perfect");
        if (r?.kind === "perfect") regained = r.regained;
        taps++;
        run(perfects, 1.2);
        expect(perfects.phase).toBe("playing");
      }
      expect(regained).toBeCloseTo(28);
      run(perfects, 6);
      expect(perfects.phase).toBe("playing");
      expect(warning(perfects)).toBe("steady");

      const same = mk();
      const s = dropAt(same, 6);
      expect(s?.kind === "sliced" && s.armed).toBe(true);
      run(same, tuning.teeterTime - 0.05);
      expect(same.phase).toBe("playing");
      run(same, 0.8);
      expect(same.phase).toBe("over");
    }
  });

  it("a single drop from a steady tower never topples before teeterTime + LAST_CHANCE_TIME", () => {
    for (const L of [10, 20, 40]) {
      for (const chop of [10, 16, 20, 24, 28, 32, 40, 48, 56]) {
        const g = perfectTower(L, 6);
        tuning.gustsOn = false;
        expect(warning(g)).toBe("steady");
        dropAt(g, chop);
        run(g, tuning.teeterTime + LAST_CHANCE_TIME - 0.01);
        expect(g.phase).toBe("playing");
        resetTuning();
      }
    }
  });

  it("pivot is the narrowest block in the top 12 (lowest on ties)", () => {
    const g = leaning(30, 0);
    g.blocks[25]!.w = 20;
    g.blocks[22]!.w = 20;
    expect(topplePivot(g)).toBe(22);
  });
});

describe("perfects: steady first, rebuild once calm", () => {
  it("a perfect on a swinging tower steadies and banks; the next calm perfect rebuilds", () => {
    const g = newGame();
    stack(g, 10);
    aim(g, 10);
    drop(g);
    expect(unrest(g)).toBeGreaterThan(tuning.regrowCalm);
    const vel = g.kickVel;
    const before = swayOffset(g, 11);
    aim(g, 0);
    const r = drop(g);
    expect(r).toMatchObject({ kind: "perfect", regained: 0, rebuilt: 0, steadied: true });
    expect(g.banked).toBe(1);
    expect(g.cuts).toHaveLength(1);
    expect(g.kickVel).toBe(vel * (1 - tuning.perfectBrace));
    expect(swayOffset(g, 11)).toBe(before);
    let t = 0;
    while (unrest(g) > tuning.regrowCalm && t < 3) {
      step(g, DT);
      t += DT;
    }
    expect(t).toBeLessThan(1.5);
    aim(g, 0);
    const r2 = drop(g);
    expect(r2).toMatchObject({ kind: "perfect", rebuilt: 1, regained: 10, steadied: false });
    expect(top(g).w).toBeCloseTo(BASE_WIDTH);
    expect(g.banked).toBe(0);
  });

  it("STEADY only shows when there is something to rebuild", () => {
    const g = newGame();
    stack(g, 10);
    g.kickVel = 40;
    aim(g, 0);
    const r = drop(g);
    expect(r?.kind === "perfect" && r.steadied).toBe(false);
  });

  it("banked rebuilds pay out together", () => {
    const g = newGame();
    stack(g, 10);
    aim(g, 8);
    drop(g);
    aim(g, 8);
    drop(g);
    aim(g, 0);
    drop(g);
    expect(g.banked).toBe(1);
    run(g, 2.5);
    aim(g, 0);
    const r = drop(g);
    expect(r).toMatchObject({ kind: "perfect", rebuilt: 2, regained: 16 });
    expect(top(g).w).toBeCloseTo(BASE_WIDTH);
  });

  it("calm damps the swing for real (perfectSteady)", () => {
    const mk = (calm: boolean) => {
      const g = leaning(20, 0);
      g.kickVel = 12 * ((2 * Math.PI) / tuning.swayPeriod);
      if (calm) {
        g.calm = 1;
        g.calmTimer = CALM_TIME;
      }
      run(g, 1);
      return kickAmplitude(g);
    };
    expect(mk(true)).toBeLessThan(mk(false) * 0.5);
  });

  it("rebuilds pick the cut that pulls the top home", () => {
    tuning.regrowNeedsCalm = false;
    const g = newGame();
    const base = { ...top(g) };
    aim(g, 8); // right overhang: left edge recedes 8
    drop(g);
    aim(g, -2); // left overhang: right edge recedes 2
    drop(g);
    expect(drift(g)).toBeCloseTo(3);
    aim(g, 0);
    const r = drop(g);
    expect(r).toMatchObject({ regained: 8, grewLeft: 8, grewRight: 0 });
    expect(Math.abs(drift(g))).toBeLessThan(1.5);
    aim(g, 0);
    drop(g);
    expect(top(g)).toEqual(base);

    tuning.leanOn = false; // newest first, as shipped
    const h = newGame();
    aim(h, 8);
    drop(h);
    aim(h, -2);
    drop(h);
    aim(h, 0);
    const r2 = drop(h);
    expect(r2).toMatchObject({ regained: 2 });
  });
});

describe("gusts", () => {
  it("windy bands", () => {
    expect([11, 12, 19, 20, 27, 28, 35, 36, 44, 60, 76].map(windStrength)).toEqual([
      0, 0.5, 0.5, 0, 0, 0.75, 0.75, 0, 1, 1, 1,
    ]);
  });

  it("hash is integer-exact and both directions occur", () => {
    expect(hash01(7, 3)).toBe(hash01(7, 3));
    const dirs = new Set<number>();
    for (let s = 0; s < 10; s++) dirs.add(hash01(s, 27) < 0.5 ? -1 : 1);
    expect(dirs.size).toBe(2);
  });

  it("deterministic: same seed and inputs give the same gusts", () => {
    const a = play(7, 60, () => 0);
    const b = play(7, 60, () => 0);
    expect(JSON.stringify(a.g)).toBe(JSON.stringify(b.g));
  });

  it("warns for GUST_WARN before any push; the forecast shows it at once; the push is smooth", () => {
    const g = leaning(13, 0);
    g.nextGust = 13;
    step(g, DT);
    expect(g.gust.phase).toBe("warn");
    expect(forecast(g)).toBeCloseTo(g.gust.amp);
    let warnTime = 0;
    let prevLean = g.lean;
    let maxDl = 0;
    while (g.gust.phase !== "idle") {
      if (g.gust.phase === "warn") {
        expect(gustPush(g)).toBe(0);
        warnTime += DT;
      }
      step(g, DT);
      maxDl = Math.max(maxDl, Math.abs(g.lean - prevLean));
      prevLean = g.lean;
    }
    expect(warnTime).toBeCloseTo(1.2, 1);
    expect(maxDl).toBeLessThan(g.gust.amp * LEAN_EASE * DT + 1e-9);
  });

  it("a gust alone never makes a balanced tower WOBBLY, at any width", () => {
    for (const w of [60, 40, 20, 8]) {
      const g = leaning(44, 0);
      for (const b of g.blocks.slice(1)) {
        b.x += (b.w - w) / 2;
        b.w = w;
      }
      g.gust = { phase: "warn", t: 0, dir: 1, amp: tuning.gustPush };
      let maxFr = 0;
      let peak = 0;
      for (let t = 0; t < 5; t += DT) {
        step(g, DT);
        maxFr = Math.max(maxFr, forecast(g) / toppleLimit(g));
        peak = Math.max(peak, Math.abs(tilt(g)));
      }
      expect(maxFr).toBeLessThan(WARN_FRAC);
      expect(peak).toBeLessThanOrEqual(tuning.gustPush);
    }
  });

  it("no new gust starts on a tower in danger", () => {
    const g = leaning(13, 13); // lean 26 of 30: forecast 0.87
    g.nextGust = 13;
    run(g, 10);
    expect(g.gust.phase).toBe("idle");
  });

  it("gustsOn off: no gusts; a gust in progress still finishes smoothly", () => {
    const g = leaning(13, 0);
    g.nextGust = 13;
    step(g, DT);
    tuning.gustsOn = false;
    run(g, 4);
    expect(g.gust.phase).toBe("idle");
    g.nextGust = 13;
    run(g, 4);
    expect(g.gust.phase).toBe("idle");
  });
});

describe("forecast and fairness", () => {
  it("forecast bounds |tilt| until the next drop (600 random states)", () => {
    const r = rng(99);
    for (let k = 0; k < 600; k++) {
      resetTuning();
      tuning.toppleOn = false;
      const L = 1 + Math.floor(r() * 60);
      const g = newGame(k);
      const b = g.blocks[0]!;
      let x = b.x;
      let w = b.w;
      for (let i = 1; i <= L; i++) {
        if (r() < 0.3) {
          const c = Math.min(w - 4, r() * 8);
          if (r() < 0.5) x += c;
          w -= c;
        }
        g.blocks.push({ x, w });
      }
      g.score = L;
      g.leanTop = Math.max(0, L - r() * 2);
      g.lean = (r() * 2 - 1) * 25;
      g.kick = (r() * 2 - 1) * 15;
      g.kickVel = (r() * 2 - 1) * 30;
      g.calm = r();
      g.calmTimer = r() * 2;
      g.swayAngle = r() * 6.28;
      const ph = r();
      if (ph > 0.33)
        g.gust = { phase: ph < 0.66 ? "warn" : "blow", t: r() * 1.2, dir: r() < 0.5 ? -1 : 1, amp: 8 * r() };
      g.nextGust = 1e9;
      const f0 = forecast(g);
      for (let t = 0; t < 8; t += DT) {
        step(g, DT);
        expect(Math.abs(tilt(g))).toBeLessThanOrEqual(f0 + 1e-6);
      }
    }
  });

  it("every topple was armed by a WOBBLY drop, or followed a full LAST CHANCE countdown", () => {
    const profiles: [number, number, number][] = [
      [0, 2.5, 0.3],
      [0, 4, 0.3],
      [0, 4, 0],
      [1.5, 2.5, 0.3],
      [2.5, 2.5, 0.3],
    ];
    let topples = 0;
    for (const [mu, sigma, pp] of profiles) {
      for (let seed = 1; seed <= 20; seed++) {
        const r = rng(seed * 7 + 3);
        let redTime = 0;
        const res = play(seed, 150, () => {
          if (r() < pp) return 0;
          const e = mu + sigma * gauss(r);
          return Math.abs(e) < 1.6 ? (e < 0 ? -1.6 : 1.6) : e;
        }, {
          onDrop: () => {
            redTime = 0;
          },
        });
        void redTime;
        if (res.cause !== "topple") continue;
        topples++;
        const viaArm = res.armedAtEnd && res.frAtLastPlaced >= WARN_FRAC;
        const viaCountdown = !res.armedAtEnd && res.g.teeter >= tuning.teeterTime + LAST_CHANCE_TIME;
        expect(viaArm || viaCountdown).toBe(true);
        expect(res.redTimeBeforeTopple).toBeGreaterThanOrEqual(tuning.teeterTime - 1e-9);
      }
    }
    expect(topples).toBeGreaterThan(30);
  });
});

describe("bots", () => {
  it("perfect timing reaches 200 through gusts: full width, all lives, never WOBBLY", () => {
    for (const seed of [0, 1, 2]) {
      const r = play(seed, 200, () => 0);
      expect(r.score).toBe(200);
      expect(r.width).toBe(BASE_WIDTH);
      expect(r.lives).toBe(LIVES);
      expect(r.maxFr).toBeLessThan(WARN_FRAC);
    }
  });

  it("one-sided sloppiness: WOBBLY first, then a topple", () => {
    const g = perfectTower(20, 1);
    let n = 0;
    let wobblyAt = -1;
    const r = play(1, 200, () => 6, {
      start: g,
      minGap: 1.1,
      onDrop: (gg) => {
        n++;
        if (wobblyAt < 0 && warning(gg) !== "steady") wobblyAt = n;
      },
    });
    expect(r.cause).toBe("topple");
    expect(wobblyAt).toBeLessThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(6);
    expect(n - wobblyAt).toBeGreaterThanOrEqual(1);
    expect(r.sawDangerBeforeTopple).toBe(true);
  });

  it("sloppy players end early, many by toppling", () => {
    let topples = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const rr = rng(seed);
      const res = play(seed, 150, () => (rr() < 0.5 ? -1 : 1) * (2 + 6 * rr()));
      expect(res.score).toBeLessThan(100);
      if (res.cause === "topple") topples++;
    }
    expect(topples).toBeGreaterThanOrEqual(9);
  });

  it("balance pays: countering the drift beats random-side errors", () => {
    const pop = (balancer: boolean) => {
      const scores: number[] = [];
      let topples = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const r = rng(seed * 7 + 3);
        const res = play(seed, 150, (g) =>
          r() < 0.4 ? 0 : (balancer ? (drift(g) > 0 ? -1 : 1) : r() < 0.5 ? -1 : 1) * (2 + 5 * r()),
        );
        scores.push(res.score);
        if (res.cause === "topple") topples++;
      }
      return { med: median(scores), topples };
    };
    const bal = pop(true);
    const rnd = pop(false);
    expect(bal.med).toBeGreaterThan(rnd.med);
    expect(bal.topples * 3).toBeLessThanOrEqual(rnd.topples);
  });
});

describe("toggles", () => {
  it("everything new off reproduces the shipped game exactly", () => {
    tuning.leanOn = false;
    tuning.toppleOn = false;
    tuning.gustsOn = false;
    tuning.regrowNeedsCalm = false;
    tuning.perfectSteady = 0;
    tuning.perfectBrace = 0;
    const a = newGame();
    const b = shipped.newGame();
    const r = rng(11);
    const errs = Array.from({ length: 400 }, () => (r() < 0.4 ? 0 : (r() * 2 - 1) * 9));
    let i = 0;
    let since = 0;
    for (let k = 0; k < 120 * 300 && a.phase === "playing"; k++) {
      step(a, DT);
      shipped.step(b, DT);
      since += DT;
      if (since > 0.9) {
        since = 0;
        const e = errs[i++ % errs.length]!;
        a.slider.x = topWorldX(a) + e;
        b.slider.x = shipped.top(b).x + shipped.swayOffset(b, b.blocks.length - 1) + e;
        drop(a);
        shipped.drop(b);
      }
      for (let lvl = 0; lvl < a.blocks.length; lvl += 7) {
        expect(swayOffset(a, lvl) === shipped.swayOffset(b, lvl)).toBe(true);
      }
    }
    expect(a.blocks).toEqual(b.blocks);
    expect(a.score).toBe(b.score);
  });

  it("toppleOn off: never teeters, never topples", () => {
    tuning.toppleOn = false;
    const g = leaning(40, 25, { armed: true });
    run(g, 5);
    expect(g.phase).toBe("playing");
    expect(g.teeter).toBe(0);
    expect(warning(g)).toBe("danger");
  });

  it("leanOn off: lean eases back to 0; sway off: no lean, tilt, forecast or push", () => {
    const g = leaning(40, 10);
    tuning.leanOn = false;
    run(g, 3);
    expect(Math.abs(g.lean)).toBeLessThan(0.01);
    tuning.swayOn = false;
    g.gust = { phase: "blow", t: 0.8, dir: 1, amp: 8 };
    expect(tilt(g)).toBe(0);
    expect(forecast(g)).toBe(0);
    expect(leanTarget(g)).toBe(0);
  });
});
