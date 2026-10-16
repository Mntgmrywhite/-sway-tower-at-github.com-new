import { drop, leanTarget, newGame, step, swayOffset, timeScale, top, windStrength, type GameState } from "../game";
import {
  addFalling,
  addFlash,
  newView,
  onDrop,
  onSaved,
  onWindZone,
  SLOWMO_EASE,
  takeCues,
  updateView,
  type View,
} from "../render";

// Deterministic game moments for previews and render smoke tests. No DOM.
// Drops and frames are fed to the view the way main.ts does (lean before/after, SAVED!, wind
// zone, the slow-motion clock), so the telegraphing shows exactly as in the game.

export interface Shot {
  name: string;
  state: GameState;
  view: View;
  best: number;
}

interface Sim {
  state: GameState;
  view: View;
  /** main.ts's eased game clock (slow motion while teetering). */
  clock: number;
}

const FRAME = 1 / 60;

function sim(): Sim {
  return { state: newGame(), view: newView(), clock: 1 };
}

/** Drop with the slider `dx` world units right of the swaying tower top. */
function dropAt(s: Sim, dx: number): void {
  const { state, view } = s;
  const level = state.blocks.length;
  const under = top(state);
  const topX = under.x + swayOffset(state, level - 1);
  state.slider.x = topX + dx;
  const leanBefore = leanTarget(state);
  const windBefore = windStrength(state.score);
  const r = drop(state);
  if (!r) return;
  if (r.kind === "perfect") addFlash(view, level);
  else addFalling(view, r.cut, level, topX + under.w / 2);
  onDrop(view.fx, state, { result: r, level, leanBefore, leanAfter: leanTarget(state) });
  if (windBefore === 0 && windStrength(state.score) > 0) onWindZone(view.fx);
}

/** Run frames like main.ts for `seconds` of real time, or until `until` holds. */
function settle(s: Sim, seconds: number, until?: (s: Sim) => boolean): void {
  for (let t = 0; t < seconds; t += FRAME) {
    if (until?.(s)) break;
    s.clock += (timeScale(s.state) - s.clock) * (1 - Math.exp(-SLOWMO_EASE * FRAME));
    const saves = s.state.saves;
    step(s.state, FRAME * s.clock);
    if (s.state.saves > saves) onSaved(s.view.fx, s.state);
    updateView(s.view, s.state, FRAME * s.clock);
  }
  takeCues(s.view.fx);
}

function climb(blocks: number): Sim {
  const s = sim();
  const pattern = [0, 0, 4, 0, -3, 0, 0, 2, 0, -5];
  for (let i = 0; i < blocks; i++) {
    dropAt(s, pattern[i % pattern.length] ?? 0);
    settle(s, 0.25);
  }
  return s;
}

/** climb(18), then two +6 drops 1.1 s apart: the lean builds to WOBBLY. */
function wobbly(): Sim {
  const s = climb(18);
  dropAt(s, 6);
  settle(s, 1.1);
  dropAt(s, 6);
  settle(s, 0.3);
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

  // A 20-block perfect tower takes a 28 chop: past the rail, unarmed, so LAST CHANCE counts down.
  const last = sim();
  for (let i = 0; i < 20; i++) {
    dropAt(last, 0);
    settle(last, 0.25);
  }
  settle(last, 2);
  dropAt(last, 28);
  settle(last, 4, (s) => s.view.fx.tier === "lastChance");
  settle(last, 0.45);

  // Into the first windy band with a balanced tower; caught in the gust's warning.
  const gust = sim();
  for (let i = 0; i < 13; i++) {
    dropAt(gust, 0);
    settle(gust, 0.25, (s) => s.state.gust.phase === "warn" && s.state.gust.t > 0.55);
  }
  settle(gust, 2, (s) => s.state.gust.phase === "warn" && s.state.gust.t > 0.55);

  // Keep dropping +6 on the heavy side until it arms and topples, then watch 0.8 s of the fall.
  const fell = wobbly();
  for (let i = 0; i < 12 && fell.state.phase === "playing"; i++) {
    settle(fell, 0.8);
    dropAt(fell, 6);
    if (fell.state.armed) settle(fell, 4, (s) => s.state.phase === "over");
  }
  settle(fell, 0.8);

  return [
    { name: "start", ...start, best: 52 },
    { name: "climb", ...mid, best: 52 },
    { name: "high", ...high, best: 52 },
    { name: "over", ...over, best: 52 },
    { name: "wobbly", ...wobbly(), best: 52 },
    { name: "lastChance", ...last, best: 52 },
    { name: "gust", ...gust, best: 52 },
    { name: "toppled", ...fell, best: 52 },
  ];
}
