import { PERFECT_TOLERANCE, WARN_FRAC, DANGER_FRAC, tuning } from "../config";
import {
  drift,
  drop,
  forecast,
  newGame,
  step,
  swayOffset,
  toppleLimit,
  top,
  warning,
  type DropResult,
  type GameState,
} from "../game";

export const DT = 1 / 120;

export function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r: () => number): number {
  const u = Math.max(1e-12, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export const topWorldX = (g: GameState) => top(g).x + swayOffset(g, g.blocks.length - 1);

export interface RunStats {
  score: number;
  cause: "topple" | "lives" | "cap" | "stuck";
  maxFr: number;
  maxRatio: number;
  saves: number;
  steadies: number;
  rebuilds: number;
  perfects: number;
  /** forecast ratio sampled right before the last placed drop */
  frAtLastPlaced: number;
  armedAtEnd: boolean;
  wobblyDrops: number; // placed drops made while wobbly
  sawDangerBeforeTopple: boolean;
  redTimeBeforeTopple: number; // seconds with level danger/teeter/lastChance in the final 5 s
  width: number;
  lives: number;
  t: number;
}

/**
 * Bot plays until cap. `pick(g)` returns the aim error for the next drop (0 = perfect attempt).
 * Drops when the slider crosses topWorldX + e, at least minGap after the previous drop.
 */
export function play(
  seed: number,
  cap: number,
  pick: (g: GameState) => number,
  opts: { minGap?: number; onDrop?: (g: GameState, r: DropResult | null) => void; start?: GameState } = {},
): RunStats & { g: GameState } {
  const g = opts.start ?? newGame(seed);
  const minGap = opts.minGap ?? 0.5;
  let e = pick(g);
  let since = 0;
  let prev: number | null = null;
  let t = 0;
  const st: RunStats = {
    score: 0,
    cause: "cap",
    maxFr: 0,
    maxRatio: 0,
    saves: 0,
    steadies: 0,
    rebuilds: 0,
    perfects: 0,
    frAtLastPlaced: 0,
    armedAtEnd: false,
    wobblyDrops: 0,
    sawDangerBeforeTopple: false,
    redTimeBeforeTopple: 0,
    width: 0,
    lives: 0,
    t: 0,
  };
  const redLog: number[] = [];
  let ticks = 0;
  while (g.score < cap && g.phase === "playing" && ticks < 4e6) {
    step(g, DT);
    ticks++;
    t += DT;
    since += DT;
    if (g.phase !== "playing") break;
    const lim = toppleLimit(g);
    st.maxFr = Math.max(st.maxFr, forecast(g) / lim);
    const w = warning(g);
    if (w === "danger" || w === "teeter" || w === "lastChance") {
      st.sawDangerBeforeTopple = true;
      redLog.push(t);
    }
    const target = topWorldX(g) + e;
    const d = g.slider.x - target;
    let go = false;
    if (since >= minGap) {
      if (e === 0) go = Math.abs(d) <= PERFECT_TOLERANCE * 0.8;
      else go = prev !== null && Math.sign(d) !== Math.sign(prev);
    }
    prev = d;
    if (since > 8) {
      // unreachable target: give up on it
      e = 0;
    }
    if (go) {
      const fr = forecast(g) / toppleLimit(g);
      const r = drop(g);
      if (r && r.kind !== "miss") {
        st.frAtLastPlaced = fr;
        if (fr >= WARN_FRAC) st.wobblyDrops++;
      }
      if (r?.kind === "perfect") {
        if (r.steadied) st.steadies++;
        st.rebuilds += r.rebuilt;
      }
      opts.onDrop?.(g, r);
      since = 0;
      prev = null;
      e = pick(g);
    }
  }
  st.score = g.score;
  st.cause = g.toppled ? "topple" : g.phase === "over" ? "lives" : g.score >= cap ? "cap" : "stuck";
  st.saves = g.saves;
  st.perfects = g.perfects;
  st.armedAtEnd = g.armed;
  st.width = top(g).w;
  st.lives = g.lives;
  st.t = t;
  st.redTimeBeforeTopple = redLog.filter((x) => x > t - 5).length * DT;
  void DANGER_FRAC;
  void tuning;
  void drift;
  return { ...st, g };
}

/** Build an n-block perfect tower and let it settle. */
export function perfectTower(n: number, seed = 0): GameState {
  const g = newGame(seed);
  const saved = tuning.gustsOn;
  tuning.gustsOn = false;
  play(seed, n, () => 0, { start: g });
  for (let i = 0; i < 360; i++) step(g, DT);
  tuning.gustsOn = saved;
  return g;
}

/** Aim the slider dx right of the swaying top and drop now. */
export function dropAt(g: GameState, dx: number): DropResult | null {
  g.slider.x = topWorldX(g) + dx;
  return drop(g);
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}
