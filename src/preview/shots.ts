import { drop, newGame, step, swayOffset, top, type GameState, type Mode } from "../game";
import { addFalling, addFlash, addTopple, newView, updateView, type View } from "../render";

// Deterministic game moments for previews and render smoke tests. No DOM.
// Drops and frames are fed to the view the way main.ts does, so the falling pieces, the seam
// flash and the PERFECT pop show exactly as in the game.

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

/** Drop with the slider `dx` world units right of the swaying tower top. */
function dropAt(s: Sim, dx: number): void {
  const { state, view } = s;
  const level = state.blocks.length;
  const under = top(state);
  const topX = under.x + swayOffset(state, level - 1);
  state.slider.x = topX + dx;
  const r = drop(state);
  if (!r) return;
  if (r.kind === "perfect") addFlash(view, level, state.streak);
  else if (r.kind === "sliced" || r.kind === "miss") addFalling(view, r.cut, level, topX + under.w / 2);
  else if (r.kind === "toppled") addTopple(view, state, r.tip);
}

/** Run frames like main.ts for `seconds`. */
function settle(s: Sim, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) {
    step(s.state, FRAME);
    updateView(s.view, s.state, FRAME);
  }
}

function climb(blocks: number, mode: Mode = "normal", pattern = [0, 0, 4, 0, -3, 0, 0, 2, 0, -5]): Sim {
  const s = sim(mode);
  for (let i = 0; i < blocks; i++) {
    dropAt(s, pattern[i % pattern.length] ?? 0);
    settle(s, 0.25);
  }
  return s;
}

/**
 * Hard mode: a straight tower, then a staircase leaning right until it tips (with 60-wide bars
 * stepping 9 right, the sixth step takes the whole staircase over), then `seconds` of the fall.
 */
function topple(seconds: number): Sim {
  const s = climb(10, "hard", [0]);
  for (let i = 0; i < 40 && s.state.phase === "playing"; i++) {
    dropAt(s, 9);
    if (s.state.phase === "playing") settle(s, 0.25);
  }
  settle(s, seconds);
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

  const over = climb(24);
  over.state.lives = 1;
  dropAt(over, 500);
  settle(over, 0.5);

  // Hard mode: the title (HARD under the name, one life), a tower of overhanging bars that still
  // balances (nothing is sliced), a tower mid-fall, and the card once it has gone over.
  const hard = sim("hard");
  settle(hard, 3);
  const hardClimb = climb(22, "hard", [0, 7, -6, 0, 5, -8, 3, 0, -4, 6]);
  settle(hardClimb, 0.4);

  return [
    { name: "start", ...start, best: 52 },
    { name: "climb", ...mid, best: 52 },
    { name: "high", ...high, best: 52 },
    { name: "over", ...over, best: 52 },
    { name: "hard", ...hard, best: 17 },
    { name: "hardClimb", ...hardClimb, best: 17 },
    { name: "topple", ...topple(0.5), best: 17 },
    { name: "toppled", ...topple(1.6), best: 17 },
  ];
}
