import { afterEach, it } from "vitest";
import { resetTuning, tuning } from "./config";
import { drift, drop, forecast, newGame, step, swayOffset, toppleLimit, top, warning, tilt, type GameState } from "./game";
import { DT, dropAt, gauss, median, perfectTower, play, rng } from "./testing/bots";

afterEach(resetTuning);
const log = (...a: unknown[]) => console.log(...a);

it("SIM perfect bot with gusts", () => {
  const rows: string[] = [];
  for (let seed = 0; seed < 10; seed++) {
    const r = play(seed, 200, () => 0);
    rows.push(`seed ${seed}: score ${r.score} cause ${r.cause} width ${r.width} lives ${r.lives} maxFr ${r.maxFr.toFixed(3)} gustsSeen`);
  }
  log("PERFECT BOT\n" + rows.join("\n"));
});

it("SIM one-sided sloppy from a 20-block tower", () => {
  const rows: string[] = [];
  for (const e of [2, 3, 4, 5, 6, 8, 10]) {
    for (const start of [20, 0]) {
      const g = start ? perfectTower(start) : undefined;
      let n = 0;
      let firstWobbly = -1;
      const firstDanger = -1;
      const levels: string[] = [];
      const r = play(1, 400, () => e, {
        start: g,
        minGap: 1.1,
        onDrop: (gg, res) => {
          if (res?.kind === "sliced") n++;
          const w = warning(gg);
          levels.push(`${w[0]}${(forecast(gg) / toppleLimit(gg)).toFixed(2)}`);
          if (firstWobbly < 0 && forecast(gg) / toppleLimit(gg) >= 0.6) firstWobbly = n;
        },
      });
      void firstDanger;
      rows.push(
        `e=${e} from L${start}: wobbly after ${firstWobbly} sloppy, end after ${n} sloppy (${r.cause}) score ${r.score} sawRed ${r.sawDangerBeforeTopple} red5s ${r.redTimeBeforeTopple.toFixed(2)} frLast ${r.frAtLastPlaced.toFixed(2)} armed ${r.armedAtEnd} | ${levels.slice(0, 10).join(" ")}`,
      );
    }
  }
  log("ONE-SIDED\n" + rows.join("\n"));
});

it("SIM single chop from steady (no further drops)", () => {
  const rows: string[] = [];
  for (const L of [10, 20, 30, 60]) {
    for (const chop of [10, 16, 20, 24, 28, 32, 36, 40, 44, 50, 56]) {
      const g = perfectTower(L, 3);
      tuning.gustsOn = false;
      dropAt(g, chop);
      let t = 0;
      let maxR = 0;
      let firstTeeter = -1;
      while (g.phase === "playing" && t < 8) {
        step(g, DT);
        t += DT;
        maxR = Math.max(maxR, Math.abs(tilt(g)) / toppleLimit(g));
        if (firstTeeter < 0 && g.teeter > 0) firstTeeter = t;
      }
      rows.push(
        `L${L} chop ${chop}: ${g.toppled ? `TOPPLED at ${t.toFixed(2)}s` : "stands"} maxRatio ${maxR.toFixed(2)} firstTeeter ${firstTeeter.toFixed(2)} drift ${drift(g).toFixed(1)}`,
      );
      resetTuning();
    }
  }
  log("SINGLE CHOP\n" + rows.join("\n"));
});

function survive(g: GameState, seconds: number): { toppledAt: number; level: string; teeter: number } {
  let t = 0;
  while (g.phase === "playing" && t < seconds) {
    step(g, DT);
    t += DT;
  }
  return { toppledAt: g.toppled ? t : -1, level: g.phase === "playing" ? warning(g) : "OVER", teeter: g.teeter };
}

it("SIM last chance saves across the hang", () => {
  const rows: string[] = [];
  for (const chop of [20, 24, 28, 32, 40]) {
    for (const action of ["counter-6", "counter-10", "counter-14", "perfect", "perfect+perfect", "same+6", "none"]) {
      const outs: string[] = [];
      for (const delay of [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9, 3.2]) {
        const g = perfectTower(20, 5);
        tuning.gustsOn = false;
        dropAt(g, chop);
        const pre = survive(g, delay);
        if (pre.toppledAt >= 0) {
          outs.push(`pre@${pre.toppledAt.toFixed(1)}`);
          resetTuning();
          continue;
        }
        const lvl = warning(g)[0];
        if (action.startsWith("counter")) dropAt(g, -Number(action.slice(8)));
        else if (action === "perfect") dropAt(g, 0);
        else if (action === "perfect+perfect") {
          dropAt(g, 0);
          const mid = survive(g, 1.2);
          if (mid.toppledAt < 0) dropAt(g, 0);
        } else if (action === "same+6") dropAt(g, 6);
        const post = survive(g, 6);
        outs.push(
          `${lvl}${post.toppledAt >= 0 ? `T${post.toppledAt.toFixed(1)}` : post.level === "steady" || post.level === "wobbly" ? "ok" : post.level}`,
        );
        resetTuning();
      }
      rows.push(`chop ${chop} ${action.padEnd(16)}: ${outs.join(" ")}`);
    }
  }
  log("LAST CHANCE (delays 0.2..3.2s; prefix = level at the deciding tap; T=topple time after tap)\n" + rows.join("\n"));
});

function population(
  label: string,
  n: number,
  cap: number,
  mk: (r: () => number) => (g: GameState) => number,
): string {
  const scores: number[] = [];
  let topples = 0;
  let lives = 0;
  let caps = 0;
  let saves = 0;
  let steadies = 0;
  let rebuilds = 0;
  let perf = 0;
  let cold = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = rng(seed * 7 + 3);
    const res = play(seed, cap, mk(r));
    scores.push(res.score);
    if (res.cause === "topple") {
      topples++;
      if (res.frAtLastPlaced < 0.6 && !res.armedAtEnd) cold++;
      if (!res.armedAtEnd) cold += 0; // unarmed topples come only from LAST_CHANCE expiry
    } else if (res.cause === "lives") lives++;
    else caps++;
    saves += res.saves;
    steadies += res.steadies;
    rebuilds += res.rebuilds;
    perf += res.perfects;
  }
  return `${label.padEnd(44)} median ${median(scores)} topple ${topples}/${n} lives ${lives} cap ${caps} | saves/run ${(saves / n).toFixed(2)} steady:rebuilt ${steadies}:${rebuilds} perfects ${perf} coldTopples ${cold}`;
}

const gaussBot = (mu: number, sigma: number, pPerfect: number) => (r: () => number) => () => {
  if (r() < pPerfect) return 0;
  let e = mu + sigma * gauss(r);
  if (Math.abs(e) < 1.6) e = e < 0 ? -1.6 : 1.6; // within tolerance would be a perfect; keep it sloppy
  return e;
};

it("SIM populations", () => {
  const rows: string[] = [];
  const N = 40;
  const sets: [string, (r: () => number) => (g: GameState) => number][] = [
    ["sigma 1.5, 30% perfect", gaussBot(0, 1.5, 0.3)],
    ["sigma 2.5, 30% perfect", gaussBot(0, 2.5, 0.3)],
    ["sigma 2.5, 0% perfect", gaussBot(0, 2.5, 0)],
    ["sigma 4, 30% perfect", gaussBot(0, 4, 0.3)],
    ["sigma 4, 0% perfect", gaussBot(0, 4, 0)],
    ["mu 1.5 sigma 2.5, 30% perfect", gaussBot(1.5, 2.5, 0.3)],
    ["mu 2.5 sigma 2.5, 30% perfect", gaussBot(2.5, 2.5, 0.3)],
    ["40% perfect, |e| U(2,7) random sign", (r) => () => (r() < 0.4 ? 0 : (r() < 0.5 ? -1 : 1) * (2 + 5 * r()))],
    ["40% perfect, |e| U(2,7) BALANCER", (r) => (g) => (r() < 0.4 ? 0 : (drift(g) > 0 ? -1 : 1) * (2 + 5 * r()))],
    ["65% perfect, |e| U(2,7) random sign", (r) => () => (r() < 0.65 ? 0 : (r() < 0.5 ? -1 : 1) * (2 + 5 * r()))],
    ["alternating perfect, +4", () => {
      let k = 0;
      return () => (k++ % 2 === 0 ? 0 : 4);
    }],
    ["alternating perfect, +6", () => {
      let k = 0;
      return () => (k++ % 2 === 0 ? 0 : 6);
    }],
  ];
  for (const [label, mk] of sets) rows.push(population(label, N, 150, mk));
  // A/B: shipped-equivalent (all new toggles off)
  const off = () => {
    tuning.leanOn = false;
    tuning.toppleOn = false;
    tuning.gustsOn = false;
    tuning.regrowNeedsCalm = false;
    tuning.perfectSteady = 0;
    tuning.perfectBrace = 0;
  };
  off();
  rows.push(population("[SHIPPED] sigma 2.5, 30% perfect", N, 150, gaussBot(0, 2.5, 0.3)));
  off();
  rows.push(population("[SHIPPED] sigma 4, 30% perfect", N, 150, gaussBot(0, 4, 0.3)));
  off();
  rows.push(population("[SHIPPED] mu 1.5 sigma 2.5, 30% perfect", N, 150, gaussBot(1.5, 2.5, 0.3)));
  resetTuning();
  log("POPULATIONS (40 seeds, cap 150)\n" + rows.join("\n"));
});

it("SIM forecast bound", () => {
  const r = rng(99);
  let worst = 0;
  let viol = 0;
  for (let k = 0; k < 600; k++) {
    resetTuning();
    tuning.toppleOn = false;
    const L = 1 + Math.floor(r() * 60);
    const g = perfectTower(0, k);
    // synthesize a tower
    g.blocks.length = 1;
    const base = g.blocks[0]!;
    let x = base.x;
    let w = base.w;
    for (let i = 1; i <= L; i++) {
      if (r() < 0.3) {
        const c = Math.min(w - 4, r() * 8);
        if (r() < 0.5) x += c;
        w -= c;
      }
      g.blocks.push({ x, w });
    }
    g.score = L;
    g.leanTop = L - r() * 2;
    g.lean = (r() * 2 - 1) * 25;
    g.kick = (r() * 2 - 1) * 15;
    g.kickVel = (r() * 2 - 1) * 30;
    g.calm = r();
    g.calmTimer = r() * 2;
    g.swayAngle = r() * 6.28;
    const ph = r();
    if (ph < 0.33) g.gust = { phase: "idle", t: 0, dir: 1, amp: 0 };
    else if (ph < 0.66) g.gust = { phase: "warn", t: r() * 1.2, dir: r() < 0.5 ? -1 : 1, amp: 8 * r() };
    else g.gust = { phase: "blow", t: r() * 1.6, dir: r() < 0.5 ? -1 : 1, amp: 8 * r() };
    g.nextGust = 1e9; // block restarts
    const f0 = forecast(g);
    let peak = 0;
    for (let t = 0; t < 8; t += DT) {
      step(g, DT);
      peak = Math.max(peak, Math.abs(tilt(g)));
    }
    if (peak > f0 + 1e-6) viol++;
    worst = Math.max(worst, peak / f0);
  }
  log(`FORECAST BOUND: 600 states, violations ${viol}, worst peak/forecast ${worst.toFixed(3)}`);
});

it("SIM gust on a balanced tower and on a leaning one", () => {
  const rows: string[] = [];
  for (const calm of [0, 1]) {
    const g = perfectTower(44, 1);
    g.calm = calm;
    g.calmTimer = calm ? 99 : 0;
    g.gust = { phase: "warn", t: 0, dir: 1, amp: 8 };
    g.nextGust = 1e9;
    let peak = 0;
    let maxFr = 0;
    for (let t = 0; t < 5; t += DT) {
      step(g, DT);
      peak = Math.max(peak, Math.abs(tilt(g)));
      maxFr = Math.max(maxFr, forecast(g) / toppleLimit(g));
    }
    rows.push(`balanced L44 calm=${calm}: peak tilt ${peak.toFixed(2)} max forecastRatio ${maxFr.toFixed(2)}`);
  }
  log("GUSTS\n" + rows.join("\n") + `\nwidth ${top(perfectTower(1)).w}`);
});

it("SIM extra: gust frequency, wobbly lead time, saves", () => {
  // gusts per 100 blocks for the perfect bot
  const gusts = 0;
  const g0 = play(3, 200, () => 0, { onDrop: () => {} });
  void g0;
  {
    const g = newGame(3);
    const prev = "idle";
    play(3, 200, () => 0, { start: g, onDrop: () => {} });
    void prev;
  }
  // count gust starts by stepping a perfect bot manually
  {
    const r = play(5, 200, () => 0);
    void r;
  }
  // lead time between first WOBBLY and the topple, one-sided e=4..8 and sigma-4 population
  const leads: number[] = [];
  const dropsWobbly: number[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const r = rng(seed * 13 + 1);
    let firstWobblyT = -1;
    let t0 = 0;
    let wobblyDrops = 0;
    const res = play(seed, 150, () => (r() < 0.3 ? 0 : (() => { const e = 4 * gauss(r); return Math.abs(e) < 1.6 ? (e < 0 ? -1.6 : 1.6) : e; })()), {
      onDrop: (g) => {
        t0 += 1;
        const w = warning(g);
        if (w !== "steady") { if (firstWobblyT < 0) firstWobblyT = t0; wobblyDrops++; } else { firstWobblyT = -1; wobblyDrops = 0; }
      },
    });
    if (res.cause === "topple") { leads.push(firstWobblyT < 0 ? 0 : t0 - firstWobblyT + 1); dropsWobbly.push(wobblyDrops); }
  }
  log(`sigma4/30%: topples ${leads.length}/40; drops shown non-steady before the topple (streak ending at the topple): ${leads.sort((a,b)=>a-b).join(",")}`);
  void gusts;
});

it("SIM gust count", () => {
  const g = newGame(9);
  let starts = 0;
  let prev = g.gust.phase;
  let since = 0;
  while (g.score < 200 && g.phase === "playing") {
    step(g, DT);
    since += DT;
    if (prev === "idle" && g.gust.phase === "warn") starts++;
    prev = g.gust.phase;
    if (since > 0.5 && Math.abs(g.slider.x - (top(g).x + 0)) < 999) {
      // perfect drop at the swaying top when aligned
      const tx = top(g).x + (g.blocks.length ? 0 : 0);
      void tx;
    }
    const target = top(g).x + swayOffsetTop(g);
    if (since > 0.5 && Math.abs(g.slider.x - target) <= 1.2) { drop(g); since = 0; }
  }
  log(`gust starts over 200 perfect blocks (seed 9): ${starts}`);
});
function swayOffsetTop(g: GameState) { return swayOffset(g, g.blocks.length - 1); }
