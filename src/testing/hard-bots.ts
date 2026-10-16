import { drop, newGame, perfectTolerance, step, swayOffset, top, type GameState, type Mode } from "../game";

// Seeded bots that play whole runs frame by frame, the way main.ts feeds the game: each frame the
// player may tap (drop on the state as drawn), then the frame steps. Used by hard.test.ts to show
// that blind tapping dies early in Hard while aiming pays. The randomness lives here, in the
// players, never in the game.

/** The game's frame, seconds (a 60 Hz screen). */
export const FRAME = 1 / 60;

/** Small seeded PRNG (mulberry32), so every bot run replays exactly. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal sample. */
export function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

/** Called once per frame with the run's clock (seconds) before the frame steps; true taps now. */
export type Player = (g: GameState, t: number) => boolean;

export interface RunResult {
  score: number;
  perfects: number;
  /** How the run ended: the tower tipped, a bar missed, or it was still going at the limit. */
  end: "toppled" | "miss" | "playing";
  seconds: number;
}

/** Play one run until it ends, reaches `maxScore` or runs `maxSeconds`. */
export function play(mode: Mode, player: Player, maxScore = 1000, maxSeconds = 1200): RunResult {
  const g = newGame(mode);
  let t = 0;
  while (g.phase === "playing" && g.score < maxScore && t < maxSeconds) {
    if (player(g, t)) drop(g);
    step(g, FRAME);
    t += FRAME;
  }
  const end = g.phase === "playing" ? "playing" : g.toppled ? "toppled" : "miss";
  return { score: g.score, perfects: g.perfects, end, seconds: t };
}

/** World x of the tower top right now. */
export function topWorldX(g: GameState): number {
  return top(g).x + swayOffset(g, g.blocks.length - 1);
}

/** How far right of the swaying tower top the slider is, world units. */
export function aimError(g: GameState): number {
  return g.slider.x - topWorldX(g);
}

/** A copy that can be stepped ahead without touching the game (step only changes these fields). */
function ghost(g: GameState): GameState {
  return { ...g, slider: { ...g.slider } };
}

// --- Spam: taps that never look at the screen. ---

/** Taps at random intervals, each uniform in [minMs, maxMs]. */
export function randomSpam(r: () => number, minMs = 40, maxMs = 400): Player {
  const gap = () => (minMs + (maxMs - minMs) * r()) / 1000;
  let next = gap();
  return (_g, t) => {
    if (t < next) return false;
    next += gap();
    return true;
  };
}

/** Taps on a fixed beat: every `periodMs`, the first after `phaseMs`. */
export function rhythmSpam(periodMs: number, phaseMs: number): Player {
  let next = phaseMs / 1000;
  return (_g, t) => {
    if (t < next) return false;
    next += periodMs / 1000;
    return true;
  };
}

/** Taps every single frame from `startMs` on: as fast as input can go. */
export function mash(startMs: number): Player {
  return (_g, t) => t >= startMs / 1000;
}

// --- Aiming. ---

/**
 * Perfect timing: taps on the frame where the slider is closest to the swaying tower top as it
 * passes over it (a perfect whenever a frame falls inside the window).
 */
export function perfectPlayer(): Player {
  return (g) => {
    const now = aimError(g);
    if (Math.abs(now) <= perfectTolerance(g.mode) * 0.9) return true;
    const ahead = ghost(g);
    step(ahead, FRAME);
    const next = aimError(ahead);
    // Passing over the top now (or closest now, before it pulls away): this frame is the best one.
    const passing = Math.sign(next) !== Math.sign(now) || Math.abs(next) > Math.abs(now);
    return passing && Math.abs(now) <= Math.abs(next) && Math.abs(now) < g.slider.w / 4;
  };
}

/** How far right of the tower top's rest position (the middle of the slider's run) the slider is. */
export function restError(g: GameState): number {
  return g.slider.x - top(g).x;
}

/**
 * The first moment at least `after` seconds from now that the slider passes over the target:
 * the swaying top by default (`restError` for its rest position instead).
 */
export function nextPass(g: GameState, after: number, error = aimError, horizon = 6): number | null {
  const h = 1 / 240;
  const ahead = ghost(g);
  let t = 0;
  let prev = error(ahead);
  while (t < horizon) {
    step(ahead, h);
    t += h;
    const e = error(ahead);
    if (t >= after && (e === 0 || Math.sign(e) !== Math.sign(prev))) {
      // Interpolate the crossing inside the substep.
      return t - h * (Math.abs(e) / (Math.abs(e) + Math.abs(prev) || 1));
    }
    prev = e;
  }
  return null;
}

export interface HumanOptions {
  /** Timing error, ms (one standard deviation of a normal distribution). */
  noiseMs?: number;
  /** After a drop, how long before the next tap can come, ms. */
  reactionMs?: number;
  /** Aim at the swaying top (true) or at its rest position, timing only the slider (false). */
  seesSway?: boolean;
}

/**
 * A good human: after each drop waits `reactionMs` to take in the new slider, then aims at the next
 * moment it passes over the swaying top (knowing exactly where that is) and taps off by a normal
 * timing error of `noiseMs`. The tap lands on the state of the frame it falls in.
 */
export function humanPlayer(r: () => number, { noiseMs = 40, reactionMs = 250, seesSway = true }: HumanOptions = {}): Player {
  let tapAt: number | null = null;
  return (g, t) => {
    if (tapAt === null) {
      const pass = nextPass(g, reactionMs / 1000, seesSway ? aimError : restError);
      tapAt = t + (pass ?? reactionMs / 1000) + (gauss(r) * noiseMs) / 1000;
    }
    if (t + FRAME <= tapAt) return false;
    tapAt = null;
    return true;
  };
}

/** The value below which `p` (0..1) of the sorted sample falls (nearest rank). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[i]!;
}

/** Scores of `seeds` runs, sorted ascending. */
export function scores(seeds: number, run: (seed: number) => RunResult): number[] {
  return Array.from({ length: seeds }, (_, i) => run(i + 1).score).sort((a, b) => a - b);
}
