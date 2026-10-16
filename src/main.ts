import { audio } from "./audio/engine";
import { dropSounds, type SoundCue } from "./audio/sounds";
import { tuning } from "./config";
import { BASE_FONTS, loadFonts } from "./fonts";
import { drop, musicTempo, newGame, step, swayOffset, top, type DropOutcome, type GameState, type Mode } from "./game";
import { buzz, dropHaptic } from "./haptics";
import { createOptions } from "./options";
import { createPanel } from "./panel";
import { addFalling, addFlash, addTopple, isToppling, newView, render, updateView, type View } from "./render";
import { resolveSkin } from "./skins";
import type { Skin } from "./skins/skin";
import { keepSaves } from "./storage";

// Storage keys keep the game's original working name so saved scores survive renames. Normal's
// best keeps the original key; Hard has its own.
const BEST_KEYS: Record<Mode, string> = { normal: "sway-stack:best", hard: "sway-stack:best:hard" };
const MODE_KEY = "sway-stack:mode";
/** Ignore taps for this long after the game-over card comes up so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;

// In the iOS app, keep a copy of the saves where iOS won't purge them (restored if it did).
void keepSaves();

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing #game canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

function loadBest(mode: Mode): number {
  try {
    return Number(localStorage.getItem(BEST_KEYS[mode])) || 0;
  } catch {
    return 0;
  }
}

function saveBest(mode: Mode, n: number): void {
  try {
    localStorage.setItem(BEST_KEYS[mode], String(n));
  } catch {
    // Storage blocked (private mode etc.); best score just won't persist.
  }
}

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "hard" ? "hard" : "normal";
  } catch {
    return "normal";
  }
}

function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked; the mode just won't persist.
  }
}

let mode: Mode = loadMode();
let state: GameState = newGame(mode);
let view: View = newView();
let best = loadBest(mode);
/** When the game-over card came up (performance.now() ms), or 0 while it isn't showing. */
let cardAt = 0;
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
  state = newGame(mode);
  view = newView();
  cardAt = 0;
}

/** Switching mode starts a fresh run in it. */
function setMode(next: Mode): void {
  if (next === mode) return;
  mode = next;
  saveMode(mode);
  best = loadBest(mode);
  restart();
}

const panel = createPanel(restart);
const options = createOptions({ mode: () => mode, setMode });
/** True while an overlay is open: input goes to the overlay and the game pauses. */
const paused = () => panel.isOpen() || options.isOpen();

/**
 * Sounds for a drop. Hard mode slices nothing: an off-center bar just lands, and a drop that tips
 * the tower lands and goes over.
 */
function dropCues(r: DropOutcome, streak: number): SoundCue[] {
  switch (r.kind) {
    case "placed":
      return [{ sound: "land" }];
    case "toppled":
      return [{ sound: "land" }, { sound: "miss" }];
    default:
      return dropSounds(r, streak);
  }
}

function tap(): void {
  if (state.phase === "over") {
    // A toppled tower falls before the card comes up; then a beat so a mistap doesn't restart.
    if (!cardAt || performance.now() - cardAt < RESTART_GUARD_MS) return;
    restart();
    return;
  }
  const level = state.blocks.length;
  const under = top(state);
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  const r = drop(state);
  if (!r) return;
  const over = r.kind === "toppled" || (r.kind === "miss" && state.lives <= 0); // tower went over, or last life gone
  for (const cue of dropCues(r, state.streak)) audio.play(cue.sound, cue);
  // Hard's off-center landing is an ordinary landing (silent); a topple is the run ending.
  const feel = dropHaptic(r.kind === "perfect" || r.kind === "miss" ? r.kind : "sliced", state.streak, over);
  if (feel) buzz(feel);
  if (r.kind === "perfect") addFlash(view, level, state.streak);
  else if (r.kind === "sliced" || r.kind === "miss") addFalling(view, r.cut, level, towerX);
  else if (r.kind === "toppled") addTopple(view, state, r.tip);
  if (state.score > best) {
    best = state.score;
    saveBest(mode, best);
  }
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
  if (state.phase === "over" && !cardAt && !isToppling(view)) cardAt = now;
  // Hard mode: the music keeps pace with the bar (1 otherwise; the engine skips unchanged rates).
  audio.setTempo(musicTempo(state));
  render(ctx!, cssW, cssH, state, view, best, currentSkin(), audio.position());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState; __view: () => View }).__game = () => state;
(window as unknown as { __view: () => View }).__view = () => view;
(window as unknown as { __audio: typeof audio }).__audio = audio;
