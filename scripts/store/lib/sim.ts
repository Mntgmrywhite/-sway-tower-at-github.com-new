import { drop, newGame, step, swayOffset, top, type Block, type DropResult, type GameState, type Mode } from "../../../src/game";
import { newView, showLanding, updateView, type View } from "../../../src/render";
import { aimError, FRAME, topAtContact } from "../../../src/testing/bots";

// Deterministic game moments for the store renders, fed to the view the way main.ts does (the
// same recipe as src/preview/shots.ts, with two ways to drop): `tapAt` puts the slider where the
// bar should land, for stills, and `targetPlayer` waits for the slider to pass there, for the
// preview video, where a jump would show. No DOM, no randomness, no clock.

export interface Sim {
  state: GameState;
  view: View;
}

export function sim(mode: Mode = "normal"): Sim {
  return { state: newGame(mode), view: newView() };
}

function landed(s: Sim, r: DropResult, level: number, towerX: number): void {
  showLanding(s.view, s.state, r, level, towerX);
}

/** World x of the center of the bar under `level`, as it sways now. */
function towerX(state: GameState, level: number, under: Block): number {
  return under.x + under.w / 2 + swayOffset(state, level - 1);
}

/** The tap, as main.ts does it: a landing (at once in Slide) goes to the view. */
export function tap(s: Sim): void {
  const { state } = s;
  const level = state.blocks.length;
  const x = towerX(state, level, top(state));
  const r = drop(state);
  if (r) landed(s, r, level, x);
}

/**
 * Put the slider `dx` world units right of where the swaying top will be at contact. For a still:
 * the slider runs SLIDE_RANGE either side of the tower, well past a phone's edges, and a bar caught
 * half off-screen reads as a cropping mistake, not as the game.
 */
export function showSlider(s: Sim, dx: number): void {
  s.state.slider.x = topAtContact(s.state) + dx;
}

/** Tap with the slider set so the bar lands `dx` world units right of the swaying tower top (where it will be at contact). */
export function tapAt(s: Sim, dx: number): void {
  showSlider(s, dx);
  tap(s);
}

/** One 60 Hz frame like main.ts: the game steps (a falling bar may land in it), then the view. */
export function frame(s: Sim): void {
  const { state } = s;
  const level = state.blocks.length;
  const below = top(state);
  const r = step(state, FRAME);
  if (r) landed(s, r, level, towerX(state, level, below));
  updateView(s.view, state, FRAME);
}

/** Tap so the bar lands `dx` right of the swaying top, and let it land (Drop's fall). */
export function dropAt(s: Sim, dx: number): void {
  tapAt(s, dx);
  while (s.state.fall) frame(s);
}

/** Run frames for `seconds`. */
export function settle(s: Sim, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) frame(s);
}

/** Run frames until `seconds` after the last miss (the topple's own clock). */
export function until(s: Sim, seconds: number): void {
  if (!s.view.topple) throw new Error("no topple: the run is still on");
  for (let n = 0; s.view.topple.age < seconds; n++) {
    if (n > 10 / FRAME) throw new Error(`the topple is stuck at ${s.view.topple.age} s`);
    frame(s);
  }
}

/** A copy of the moment, to keep while the sim runs on. */
export function snap(s: Sim): Sim {
  return structuredClone(s);
}

/** A tower of `blocks` bars, dropped `pattern` units off the top in turn (0: a perfect), a beat apart. */
export function climb(blocks: number, mode: Mode = "normal", pattern: readonly number[] = [0, 0, 4, 0, -3, 0, 0, 2, 0, -5]): Sim {
  const s = sim(mode);
  for (let i = 0; i < blocks; i++) {
    dropAt(s, pattern[i % pattern.length] ?? 0);
    settle(s, 0.25);
  }
  return s;
}

/** Called before each frame; true taps now. */
export type Player = (s: Sim) => boolean;

/**
 * A player who lands each bar `targets[i]` units right of the swaying top (0: a perfect), tapping
 * on the frame the slider is closest to it as it passes, at least `reaction` seconds after the
 * last bar landed, and never while one is falling. Done when the targets run out.
 */
export function targetPlayer(targets: readonly number[], reaction = 0.2): Player {
  let i = 0;
  let wait = 0;
  let wasFalling = false;
  return (s) => {
    const g = s.state;
    if (i >= targets.length || g.phase !== "playing") return false;
    if (g.fall) {
      wasFalling = true;
      return false;
    }
    if (wasFalling) {
      wasFalling = false;
      wait = reaction;
    }
    if (wait > 0) {
      wait -= FRAME;
      return false;
    }
    const dx = targets[i]!;
    const now = aimError(g) - dx;
    const ahead = structuredClone(g);
    step(ahead, FRAME);
    const next = aimError(ahead) - dx;
    const passing = Math.sign(next) !== Math.sign(now) || Math.abs(next) > Math.abs(now);
    if (passing && Math.abs(now) <= Math.abs(next) && Math.abs(now) < g.slider.w / 4) {
      i++;
      wait = reaction;
      return true;
    }
    return false;
  };
}

/** A player who misses on purpose: taps the first time the slider is clear of the swaying top (at an end of its run). */
export function missPlayer(): Player {
  let done = false;
  return (s) => {
    const g = s.state;
    if (done || g.fall || g.phase !== "playing") return false;
    const under = top(g);
    const gap = Math.abs(aimError(g));
    if (gap < under.w + 0.5) return false;
    done = true;
    return true;
  };
}

/** One frame with a player: the tap (on the state as drawn), then the frame. */
export function play(s: Sim, player: Player): void {
  if (player(s)) tap(s);
  frame(s);
}
