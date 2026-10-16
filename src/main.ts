import { drop, newGame, step, swayOffset, top, type GameState } from "./game";
import { createPanel } from "./panel";
import { addFalling, addFlash, newView, render, updateView, type View } from "./render";

const BEST_KEY = "sway-stack:best";
/** Ignore taps for this long after game over so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing #game canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // Storage blocked (private mode etc.); best score just won't persist.
  }
}

let state: GameState = newGame();
let view: View = newView();
let best = loadBest();
let overAt = 0;
let cssW = 0;
let cssH = 0;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cssW = canvas!.clientWidth;
  cssH = canvas!.clientHeight;
  canvas!.width = Math.round(cssW * dpr);
  canvas!.height = Math.round(cssH * dpr);
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function restart(): void {
  state = newGame();
  view = newView();
}

const panel = createPanel(restart);

function tap(): void {
  if (state.phase === "over") {
    if (performance.now() - overAt < RESTART_GUARD_MS) return;
    restart();
    return;
  }
  const level = state.blocks.length;
  const under = top(state);
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  const r = drop(state);
  if (!r) return;
  if (r.kind === "perfect") addFlash(view, level, state.streak);
  else addFalling(view, r.cut, level, towerX);
  if (state.score > best) {
    best = state.score;
    saveBest(best);
  }
  if (r.kind === "miss" && state.lives <= 0) overAt = performance.now();
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (panel.isOpen()) return;
  tap();
});
window.addEventListener("keydown", (e) => {
  if (panel.isOpen()) return;
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    tap();
  }
});
window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // Paused while tuning, so values can be changed without losing the run.
  if (!panel.isOpen()) {
    step(state, dt);
    updateView(view, state, dt);
  }
  render(ctx!, cssW, cssH, state, view, best);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState }).__game = () => state;
