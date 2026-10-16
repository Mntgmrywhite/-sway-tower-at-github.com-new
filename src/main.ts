import { audio } from "./audio/engine";
import { dropSounds } from "./audio/sounds";
import { tuning } from "./config";
import { BASE_FONTS, loadFonts } from "./fonts";
import { drop, newGame, step, swayOffset, top, type GameState } from "./game";
import { buzz, dropHaptic } from "./haptics";
import { createOptions } from "./options";
import { createPanel } from "./panel";
import { addFalling, addFlash, newView, render, updateView, type View } from "./render";
import { resolveSkin } from "./skins";
import type { Skin } from "./skins/skin";
import { keepSaves } from "./storage";

// Storage keys keep the game's original working name so saved scores survive renames.
const BEST_KEY = "sway-stack:best";
/** Ignore taps for this long after game over so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;

// In the iOS app, keep a copy of the saves where iOS won't purge them (restored if it did).
void keepSaves();

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

/**
 * Canvas pixels per CSS pixel. Drawing cost grows with pixel count, and a 3x phone at 2x
 * paints 2.25 times fewer pixels with barely visible softening in this flat cartoon style.
 */
const MAX_DPR = 2;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
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
const options = createOptions();
/** True while an overlay is open: input goes to the overlay and the game pauses. */
const paused = () => panel.isOpen() || options.isOpen();

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
  const over = r.kind === "miss" && state.lives <= 0; // last life gone
  for (const cue of dropSounds(r, state.streak)) audio.play(cue.sound, cue);
  const feel = dropHaptic(r.kind, state.streak, over);
  if (feel) buzz(feel);
  if (r.kind === "perfect") addFlash(view, level, state.streak);
  else addFalling(view, r.cut, level, towerX);
  if (state.score > best) {
    best = state.score;
    saveBest(best);
  }
  if (over) overAt = performance.now();
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  audio.unlock();
  if (paused()) return;
  tap();
});
// Browsers only start sound inside a user gesture; iOS Safari wants the end of a touch.
window.addEventListener("pointerup", () => audio.unlock());
window.addEventListener("keydown", (e) => {
  audio.unlock();
  if (paused()) return;
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    tap();
  }
});
window.addEventListener("resize", resize);
// Canvas text only uses a web font once it's loaded; decode the base faces up front.
loadFonts(BASE_FONTS);
resize();

/** The active skin, re-resolved when the choice or the day changes. */
let skinKey = "";
let skin: Skin = resolveSkin(tuning.skin, new Date());
function currentSkin(): Skin {
  const now = new Date();
  const key = `${tuning.skin}|${now.getMonth()}-${now.getDate()}`;
  if (key !== skinKey) {
    skinKey = key;
    skin = resolveSkin(tuning.skin, now);
    loadFonts(skin.fonts ?? []);
    document.documentElement.style.setProperty("--accent", skin.hud.ui);
    // Each skin has its arrangement of the theme; the Neon skins share one (and any skin
    // without a rendered arrangement plays Classic's).
    audio.setMusic(skin.style === "neon" ? "neon" : skin.id);
  }
  return skin;
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // Paused while tuning, so values can be changed without losing the run.
  if (!paused()) {
    step(state, dt);
    updateView(view, state, dt);
    // The music steps back while a run is played, and comes forward on the title and game over.
    audio.setFocus(state.phase === "playing" && state.score > 0);
  }
  render(ctx!, cssW, cssH, state, view, best, currentSkin());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState; __view: () => View }).__game = () => state;
(window as unknown as { __view: () => View }).__view = () => view;
(window as unknown as { __audio: typeof audio }).__audio = audio;
