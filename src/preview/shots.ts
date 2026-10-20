import { drop, newGame, step, swayOffset, top, type Block, type DropResult, type GameState, type Mode } from "../game";
import { BLAST_AT, TOPPLE_TIME, type BlastVariant } from "../fx/topple";
import { newView, showLanding, updateView, type View } from "../render";
import { topAtContact } from "../testing/bots";

// Deterministic game moments for previews and render smoke tests. No DOM.
// Drops and frames are fed to the view the way main.ts does, so the falling pieces, the seam
// flash, the PERFECT pop and the game-over topple and blast show exactly as in the game. In Drop
// (mode "hard") a tap lets the bar go from a bar above the tower and it lands frames later, where
// main.ts would show it.

export interface Shot {
  name: string;
  state: GameState;
  view: View;
  best: number;
}

interface Sim {
  state: GameState;
  view: View;
}

const FRAME = 1 / 60;

function sim(mode: Mode = "normal"): Sim {
  return { state: newGame(mode), view: newView() };
}

/** A bar met the tower onto `level` (the top bar's center at world x `towerX`): the view shows it as main.ts does. */
function landed(s: Sim, r: DropResult, level: number, towerX: number): void {
  showLanding(s.view, s.state, r, level, towerX);
}

/** World x of the center of the bar under `level`, as it sways now. */
function towerX(state: GameState, level: number, under: Block): number {
  return under.x + under.w / 2 + swayOffset(state, level - 1);
}

/** Tap with the slider set so the bar lands `dx` world units right of the swaying tower top. */
function tapAt(s: Sim, dx: number): void {
  const { state } = s;
  state.slider.x = topAtContact(state) + dx;
  const level = state.blocks.length;
  const x = towerX(state, level, top(state));
  const r = drop(state);
  if (r) landed(s, r, level, x);
}

/** One frame like main.ts: the game steps (a falling bar may land in it), then the view. */
function frame(s: Sim): void {
  const { state } = s;
  const level = state.blocks.length;
  const below = top(state);
  const r = step(state, FRAME);
  if (r) landed(s, r, level, towerX(state, level, below));
  updateView(s.view, state, FRAME);
}

/** Drop so the bar lands `dx` right of the swaying top (where it will be, in Drop), and let it land. */
function dropAt(s: Sim, dx: number): void {
  tapAt(s, dx);
  while (s.state.fall) frame(s);
}

/** Run frames like main.ts for `seconds`. */
function settle(s: Sim, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) frame(s);
}

/** Run frames until `seconds` after the last miss (the topple's own clock). */
function until(s: Sim, seconds: number): void {
  if (!s.view.topple) throw new Error("no topple: the run is still on");
  for (let n = 0; s.view.topple.age < seconds; n++) {
    // A topple that stops aging would hang every test that takes the shots: fail instead.
    if (n > 10 / FRAME) throw new Error(`the topple is stuck at ${s.view.topple.age} s`);
    frame(s);
  }
}

/** A copy of the moment, to keep while the sim runs on. */
function snap(s: Sim): Sim {
  return structuredClone(s);
}

function climb(blocks: number, mode: Mode = "normal", pattern = [0, 0, 4, 0, -3, 0, 0, 2, 0, -5]): Sim {
  const s = sim(mode);
  for (let i = 0; i < blocks; i++) {
    dropAt(s, pattern[i % pattern.length] ?? 0);
    settle(s, 0.25);
  }
  return s;
}

export function shots(): Shot[] {
  const start = sim();
  settle(start, 3);

  // Mid-climb: a slice just fell, then a perfect drop flashing on top.
  const mid = climb(18);
  dropAt(mid, 6);
  settle(mid, 0.35);
  dropAt(mid, 0);
  settle(mid, 0.12);

  const high = climb(90);
  settle(high, 1.5);

  // The last life: the missed bar falls to the right, the top of the tower goes over after it and
  // blows up, then the card. (A run of these, from one sim.)
  const over = climb(24);
  over.state.lives = 1;
  dropAt(over, over.state.slider.w + 3);
  until(over, 0.32);
  const topple = snap(over);
  until(over, BLAST_AT + 0.05);
  const blast = snap(over);
  until(over, BLAST_AT + 0.4);
  const debris = snap(over);
  until(over, TOPPLE_TIME + 0.2);

  // Drop (mode "hard"): the run's start (DROP under the name, three lives, the slider a bar above
  // the base); a climb with a slice just cut off and tumbling, the next slider in its raised lane;
  // and a bar let go, half way down onto the swaying top.
  const hard = sim("hard");
  settle(hard, 3);
  const hardClimb = climb(22, "hard", [0, 5, -4, 0, 3, 0, -6, 0, 2, 0]);
  settle(hardClimb, 0.4);
  dropAt(hardClimb, 7);
  settle(hardClimb, 0.3);
  const hardFall = climb(16, "hard", [0, 5, -4, 0, 6, -3]);
  settle(hardFall, 0.6);
  tapAt(hardFall, 4);
  for (let i = 0; i < 11; i++) frame(hardFall);
  // Drop's last life: the bar falls past the top's left side, and the top goes over to the left and blows up.
  const hardBlast = climb(12, "hard", [0, 3, -4, 0, 2]);
  hardBlast.state.lives = 1;
  dropAt(hardBlast, -hardBlast.state.slider.w - 3);
  until(hardBlast, BLAST_AT + 0.12);

  // The other ways a run ends (the run above got the starburst): each just after it goes off, and
  // the two that linger (the fireworks' second bloom, the floating confetti) later on too.
  const fireworks = ending("fireworks", 1, BLAST_AT + 0.14);
  const fireworksLate = ending("fireworks", 1, BLAST_AT + 0.42);
  const shockwave = ending("shockwave", -1, BLAST_AT + 0.16);
  const confetti = ending("confetti", 1, BLAST_AT + 0.12);
  const confettiLate = ending("confetti", -1, BLAST_AT + 0.5);
  // Popcorn: the second little pop has just gone off while the section still swings.
  const popcorn = ending("popcorn", -1, 0.36);

  return [
    { name: "start", ...start, best: 52 },
    { name: "climb", ...mid, best: 52 },
    { name: "high", ...high, best: 52 },
    { name: "topple", ...topple, best: 52 },
    { name: "blast", ...blast, best: 52 },
    { name: "debris", ...debris, best: 52 },
    { name: "over", ...over, best: 52 },
    { name: "hard", ...hard, best: 17 },
    { name: "hardClimb", ...hardClimb, best: 17 },
    { name: "hardFall", ...hardFall, best: 17 },
    { name: "hardBlast", ...hardBlast, best: 17 },
    { name: "fireworks", ...fireworks, best: 52 },
    { name: "fireworksLate", ...fireworksLate, best: 52 },
    { name: "shockwave", ...shockwave, best: 52 },
    { name: "confetti", ...confetti, best: 52 },
    { name: "confettiLate", ...confettiLate, best: 52 },
    { name: "popcorn", ...popcorn, best: 52 },
  ];
}

/**
 * A run's end in the blast `variant`, `seconds` after the last miss, which the bar missed on `side`
 * (the run's own pick is overridden for the preview; the swing before the blast is the same for all).
 */
function ending(variant: BlastVariant, side: -1 | 1, seconds: number): Sim {
  const s = climb(20, "normal", [0, 0, 3, 0, -4, 0, 2, 0, -2, 0]);
  s.state.lives = 1;
  dropAt(s, side * (s.state.slider.w + 3));
  s.view.topple!.variant = variant;
  until(s, seconds);
  return s;
}
