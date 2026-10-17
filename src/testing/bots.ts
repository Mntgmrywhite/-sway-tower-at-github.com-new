import { PERFECT_TOLERANCE } from "../config";
import { drop, fallTime, newGame, step, swayOffset, top, type DropResult, type GameState, type Mode } from "../game";

// Seeded bots that play whole runs frame by frame, the way main.ts feeds the game: each frame the
// player may tap (drop on the state as drawn), then the frame steps. Used by the tests to show that
// both modes can be climbed far with perfect timing, and how a good human does in each. The
// randomness lives here, in the players, never in the game.
//
// In Drop a tap lets the bar go from a bar above the tower and it lands fallTime later, where the
// swaying top is by then. So the aiming players aim at the top as it will be at contact
// (topAtContact, which is the top as it is now in Slide), and wait for each bar to land (and the
// next slider to show) before the next tap.

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
  /** How the run ended: the last life went, or it was still going at the limit. */
  end: "over" | "playing";
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
  return { score: g.score, perfects: g.perfects, end: g.phase, seconds: t };
}

/** World x of the tower top right now. */
export function topWorldX(g: GameState): number {
  return top(g).x + swayOffset(g, g.blocks.length - 1);
}

/**
 * A copy that can be stepped ahead without touching the game: step changes these fields, and a
 * landing pushes onto (never edits) the bars and the cuts.
 */
function ghost(g: GameState): GameState {
  return { ...g, slider: { ...g.slider }, fall: g.fall && { ...g.fall }, blocks: [...g.blocks], cuts: [...g.cuts] };
}

/**
 * World x of the tower top at the moment a bar let go now would land: fallTime ahead in Drop (with
 * the sway as it will be then), right now in Slide.
 */
export function topAtContact(g: GameState): number {
  const t = fallTime(g.mode);
  if (t === 0) return topWorldX(g);
  const ahead = ghost(g);
  step(ahead, t);
  return topWorldX(ahead);
}

/** How far right of the swaying tower top, as it will be at contact, a bar let go now would land, world units. */
export function aimError(g: GameState): number {
  return g.slider.x - topAtContact(g);
}

/**
 * Tap, and in Drop let the bar fall until it lands, in one step of exactly the fall time (so a
 * slider aimed with topAtContact lands exactly there). What happened, as drop() reports it in Slide.
 */
export function land(g: GameState): DropResult | null {
  const r = drop(g);
  return g.fall ? step(g, fallTime(g.mode)) : r;
}

/**
 * Perfect timing: taps on the frame where the slider is closest to the swaying tower top, as it
 * will be when the bar lands, as it passes over it (a perfect whenever a frame falls inside the
 * window). It waits for a falling bar to land.
 */
export function perfectPlayer(): Player {
  return (g) => {
    if (g.fall) return false;
    const now = aimError(g);
    if (Math.abs(now) <= PERFECT_TOLERANCE * 0.9) return true;
    const ahead = ghost(g);
    step(ahead, FRAME);
    const next = aimError(ahead);
    // Passing over the top now (or closest now, before it pulls away): this frame is the best one.
    const passing = Math.sign(next) !== Math.sign(now) || Math.abs(next) > Math.abs(now);
    return passing && Math.abs(now) <= Math.abs(next) && Math.abs(now) < g.slider.w / 4;
  };
}

/** What a human aims at (see HumanOptions.aim). */
export type Aim = "contact" | "extrapolate" | "now" | "rest";

/**
 * The first moment at least `after` seconds from now that a tap would land the bar on the target:
 * where the swaying top will be when the bar lands ("contact"), where it is plus where its speed (as
 * seen) takes it in a fall ("extrapolate"), the swaying top as it is at the tap ("now"), or the
 * top's rest position, the middle of the slider's run ("rest"). In Slide, contact is now.
 */
export function nextPass(g: GameState, after: number, aim: Aim = "contact", horizon = 6): number | null {
  const h = 1 / 240;
  const fall = fallTime(g.mode);
  const lead = aim === "contact" ? fall / h : 0;
  const k = Math.floor(lead);
  const frac = lead - k;
  // The slider and the target on a fine grid, stepped ahead only as far as the search needs (the
  // target is looked up a fall later than the slider).
  const ahead = ghost(g);
  const slider: number[] = [];
  const target: number[] = [];
  const upTo = (i: number) => {
    while (slider.length <= i) {
      if (slider.length > 0) step(ahead, h);
      slider.push(ahead.slider.x);
      target.push(aim === "rest" ? top(ahead).x : topWorldX(ahead));
    }
  };
  const speed = (i: number) => (target[i + 1]! - target[Math.max(0, i - 1)]!) / ((i > 0 ? 2 : 1) * h);
  const error = (i: number) => {
    upTo(i + k + 1);
    return (
      slider[i]! -
      (aim === "extrapolate" ? target[i]! + speed(i) * fall : target[i + k]! + frac * (target[i + k + 1]! - target[i + k]!))
    );
  };
  let prev = error(0);
  for (let i = 1; i * h < horizon; i++) {
    const t = i * h;
    const e = error(i);
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
  /** After a bar lands, how long before the next tap can come, ms. */
  reactionMs?: number;
  /**
   * What the player aims at: the swaying top where it will be when the bar lands ("contact", the
   * default: a player who reads the sway ahead exactly), where it is plus its speed's worth of a
   * fall ("extrapolate": reading ahead from what the sway shows), the swaying top as it is at the
   * tap ("now": a Slide habit, which Drop's fall punishes; the same as contact in Slide), or its
   * rest position, timing only the slider ("rest").
   */
  aim?: Aim;
}

/**
 * A good human: after each bar lands waits `reactionMs` to take in the new slider, then aims at the
 * next moment it passes over the target (knowing exactly where that is) and taps off by a normal
 * timing error of `noiseMs`. The tap lands on the state of the frame it falls in.
 */
export function humanPlayer(r: () => number, { noiseMs = 40, reactionMs = 250, aim = "contact" }: HumanOptions = {}): Player {
  let tapAt: number | null = null;
  return (g, t) => {
    if (g.fall) return false;
    if (tapAt === null) {
      const pass = nextPass(g, reactionMs / 1000, aim);
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
