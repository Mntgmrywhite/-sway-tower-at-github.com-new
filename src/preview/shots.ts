import { drop, newGame, step, swayOffset, top, type GameState } from "../game";
import { addFalling, addFlash, newView, updateView, type View } from "../render";

// Deterministic game moments for previews and render smoke tests. No DOM.

export interface Shot {
  name: string;
  state: GameState;
  view: View;
  best: number;
}

/** Drop with the slider `dx` world units right of the swaying tower top. */
function dropAt(state: GameState, view: View, dx: number): void {
  const level = state.blocks.length;
  const under = top(state);
  const topX = under.x + swayOffset(state, level - 1);
  state.slider.x = topX + dx;
  const r = drop(state);
  if (r?.kind === "perfect") addFlash(view, level, state.streak);
  else if (r) addFalling(view, r.cut, level, topX + under.w / 2);
}

function settle(state: GameState, view: View, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) {
    step(state, 1 / 60);
    updateView(view, state, 1 / 60);
  }
}

function climb(blocks: number): { state: GameState; view: View } {
  const state = newGame();
  const view = newView();
  const pattern = [0, 0, 4, 0, -3, 0, 0, 2, 0, -5];
  for (let i = 0; i < blocks; i++) {
    dropAt(state, view, pattern[i % pattern.length] ?? 0);
    settle(state, view, 0.25);
  }
  return { state, view };
}

export function shots(): Shot[] {
  const start = { state: newGame(), view: newView() };
  settle(start.state, start.view, 3);

  // Mid-climb: a slice just fell, then a perfect drop flashing on top.
  const mid = climb(18);
  dropAt(mid.state, mid.view, 6);
  settle(mid.state, mid.view, 0.35);
  dropAt(mid.state, mid.view, 0);
  settle(mid.state, mid.view, 0.12);

  const high = climb(90);
  settle(high.state, high.view, 1.5);

  const over = climb(24);
  over.state.lives = 1;
  dropAt(over.state, over.view, 500);
  settle(over.state, over.view, 0.5);

  return [
    { name: "start", ...start, best: 52 },
    { name: "climb", ...mid, best: 52 },
    { name: "high", ...high, best: 52 },
    { name: "over", ...over, best: 52 },
  ];
}
