import { audio } from "./audio/engine";
import { dropSounds } from "./audio/sounds";
import { tuning } from "./config";
import { drop, leanTarget, newGame, step, swayOffset, timeScale, top, windStrength, type GameState } from "./game";
import { createOptions } from "./options";
import { createPanel } from "./panel";
import {
  addFalling,
  addFlash,
  newView,
  onDrop,
  onSaved,
  onWindZone,
  render,
  SLOWMO_EASE,
  takeCues,
  TOPPLE_ANIM_MS,
  updateView,
  type Cue,
  type View,
} from "./render";
import { resolveSkin } from "./skins";
import type { Skin } from "./skins/skin";

// Storage keys keep the game's original working name so saved scores survive renames.
const BEST_KEY = "sway-stack:best";
/** Ignore taps for this long after game over so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;

/** Vibration patterns, ms. navigator.vibrate is missing on iOS web, where these are no-ops. */
const HAPTICS: Record<Cue | "armed" | "saved" | "topple", number | number[]> = {
  creak: 8,
  whoa: [30, 40, 30],
  teeter: [15, 90, 15],
  armed: 60,
  saved: [25, 70, 25],
  topple: [90, 50, 180],
};

function buzz(kind: keyof typeof HAPTICS): void {
  // Browsers refuse (and log) vibration before the first real tap.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(HAPTICS[kind]);
  } catch {
    // Not allowed here (no user activation yet, or blocked); haptics are a bonus.
  }
}

/** A fresh run with its own seed (gust timing and direction come from it). */
function freshGame(): GameState {
  return newGame(Math.floor(Math.random() * 2 ** 31));
}

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

let state: GameState = freshGame();
let view: View = newView();
let best = loadBest();
let overAt = 0;
/** Game-clock multiplier: eases toward timeScale(state), e.g. slow motion while teetering. */
let clock = 1;
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
  state = freshGame();
  view = newView();
  clock = 1;
}

const panel = createPanel(restart);
const options = createOptions();
/** True while an overlay is open: input goes to the overlay and the game pauses. */
const paused = () => panel.isOpen() || options.isOpen();

function tap(): void {
  if (state.phase === "over") {
    const guard = RESTART_GUARD_MS + (state.toppled ? TOPPLE_ANIM_MS : 0);
    if (performance.now() - overAt < guard) return;
    restart();
    return;
  }
  const level = state.blocks.length;
  const under = top(state);
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  // Before/after the drop, for the lean arrow and the wind banner.
  const leanBefore = leanTarget(state);
  const windBefore = windStrength(state.score);
  const r = drop(state);
  if (!r) return;
  for (const cue of dropSounds(r, state.streak)) audio.play(cue.sound, cue);
  if (r.kind === "perfect") addFlash(view, level);
  else addFalling(view, r.cut, level, towerX);
  onDrop(view.fx, state, { result: r, level, leanBefore, leanAfter: leanTarget(state) });
  if (r.kind === "sliced" && r.armed) buzz("armed");
  if (windBefore === 0 && windStrength(state.score) > 0) onWindZone(view.fx);
  if (state.score > best) {
    best = state.score;
    saveBest(best);
  }
  if (r.kind === "miss" && state.lives <= 0) overAt = performance.now(); // last life gone
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
// Canvas text only uses a web font once it's loaded; ask for the base faces up front.
document.fonts?.load("700 40px Fredoka").catch(() => {});
document.fonts?.load("600 40px Fredoka").catch(() => {});
document.fonts?.load("40px Monoton").catch(() => {});
document.fonts?.load("700 40px Orbitron").catch(() => {});
document.fonts?.load("600 40px Orbitron").catch(() => {});
resize();

/** Pull in a skin's Google Fonts the first time it is shown. */
const loadedFonts = new Set<string>();
function ensureFonts(skin: Skin): void {
  for (const family of skin.fonts ?? []) {
    if (loadedFonts.has(family)) continue;
    loadedFonts.add(family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
    document.head.append(link);
    link.addEventListener("load", () => {
      document.fonts?.load(`40px "${family.split(":")[0]}"`).catch(() => {});
    });
  }
}

/** The active skin, re-resolved when the choice or the day changes. */
let skinKey = "";
let skin: Skin = resolveSkin(tuning.skin, new Date());
function currentSkin(): Skin {
  const now = new Date();
  const key = `${tuning.skin}|${now.getMonth()}-${now.getDate()}`;
  if (key !== skinKey) {
    skinKey = key;
    skin = resolveSkin(tuning.skin, now);
    ensureFonts(skin);
    document.documentElement.style.setProperty("--accent", skin.hud.ui);
    // Each skin has its arrangement of the theme (skins without one play Classic's).
    audio.setMusic(skin.id);
  }
  return skin;
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // Paused while tuning, so values can be changed without losing the run.
  if (!paused()) {
    clock += (timeScale(state) - clock) * (1 - Math.exp(-SLOWMO_EASE * dt));
    const wasPlaying = state.phase === "playing";
    const saves = state.saves;
    step(state, dt * clock);
    // SAVED!: the tower came back from the rail (the logic counts it in step()).
    if (state.saves > saves) {
      onSaved(view.fx, state);
      buzz("saved");
      audio.play("chime", { semitones: 12 });
    }
    updateView(view, state, dt * clock);
    // Game over can come from a drop (last life) or from step() (a topple).
    if (wasPlaying && state.phase === "over") {
      overAt = performance.now();
      if (state.toppled) {
        buzz("topple");
        audio.play("topple");
      }
    }
    for (const cue of takeCues(view.fx)) buzz(cue);
  }
  render(ctx!, cssW, cssH, state, view, best, currentSkin());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState; __view: () => View }).__game = () => state;
(window as unknown as { __view: () => View }).__view = () => view;
(window as unknown as { __audio: typeof audio }).__audio = audio;
