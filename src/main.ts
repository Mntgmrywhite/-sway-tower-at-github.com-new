import { audio } from "./audio/engine";
import { dropSounds, unlockSounds, type SoundCue } from "./audio/sounds";
import { creditBests, loadAchievements, markSeen, record, saveAchievements, type Achievement } from "./achievements";
import { createAchievements, MEDAL_ICON } from "./achievements-sheet";
import { tuning } from "./config";
import { BASE_FONTS, loadFonts } from "./fonts";
import { drop, musicTempo, newGame, step, swayOffset, top, type DropOutcome, type GameState, type Mode } from "./game";
import { buzz, dropHaptic } from "./haptics";
import { createOptions } from "./options";
import { createPanel } from "./panel";
import { addFalling, addFlash, addTopple, isToppling, newView, render, titleLayout, updateView, type View } from "./render";
import { resolveSkin } from "./skins";
import type { Skin } from "./skins/skin";
import { keepSaves } from "./storage";
import { createTitle, flowStep, keyIntent, skinSong, tapIntent, type Intent, type Screen } from "./title";

// Storage keys keep the game's original working name so saved scores survive renames. Normal's
// best keeps the original key; Hard has its own.
const BEST_KEYS: Record<Mode, string> = { normal: "sway-stack:best", hard: "sway-stack:best:hard" };
const MODE_KEY = "sway-stack:mode";
/** Ignore taps for this long after the game-over card comes up so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;
/**
 * Ignore drops for this long after a run starts (PLAY, or playing again), so a double tap there
 * doesn't drop the first bar at the slider's far end: a sliver in Normal, a topple in Hard.
 */
const START_GUARD_MS = 300;

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
/** Each mode's best, kept here too so the title shows both even when storage is blocked. */
const bests: Record<Mode, number> = { normal: loadBest("normal"), hard: loadBest("hard") };
let best = bests[mode];
/** When the game-over card came up (performance.now() ms), or 0 while it isn't showing. */
let cardAt = 0;
/** When the current run started (performance.now() ms): PLAY, or playing again. */
let startedAt = 0;
let cssW = 0;
let cssH = 0;
/** The title screen, or a run (PLAY starts one; the game-over card's Menu comes back). */
let screen: Screen = "title";
/** Every medal earned so far (src/achievements.ts); bests from before medals existed count. */
const medals = loadAchievements();
if (creditBests(medals, bests, Date.now()).changed) saveAchievements(medals);
/** The medals this run earned: the game-over card shows them (nothing shows while stacking). */
let runMedals: Achievement[] = [];
/** The medals pop in on the card, unless the player asked for less motion. */
const lessMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

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
  const at = titleLayout(cssW, cssH);
  title.layout(at.u, at.top, at.menuTop, { left: canvas!.offsetLeft, top: canvas!.offsetTop, width: cssW, height: cssH });
}

function restart(): void {
  state = newGame(mode);
  view = newView();
  cardAt = 0;
  runMedals = [];
}

/** Switching mode starts a fresh run in it. */
function setMode(next: Mode): void {
  if (next === mode) return;
  mode = next;
  saveMode(mode);
  best = bests[mode];
  restart();
}

const panel = createPanel(restart);
// The sheet can change the mode and the sound: the title re-reads them when it closes.
const options = createOptions({ mode: () => mode, setMode }, () => title.refresh());
const title = createTitle(
  {
    mode: () => mode,
    setMode,
    bests: () => ({ ...bests }),
    play: () => act("play"),
    menu: () => act("menu"),
    openOptions: (from) => options.open(from),
    sound: () => audio.settings.music || audio.settings.sfx,
    setSound(on) {
      audio.unlock();
      audio.setMusicOn(on);
      audio.setSfxOn(on);
    },
  },
  canvas,
);
const achievements = createAchievements({
  save: () => medals,
  seen() {
    if (markSeen(medals)) saveAchievements(medals);
  },
});
// The title's Medals button opens it (between Skins and Sound); the focus comes back to it.
const medalsButton: HTMLButtonElement = title.addButton({
  id: "title-achievements",
  caption: "Medals",
  label: "Medals: achievements",
  icon: MEDAL_ICON,
  onClick: () => achievements.open(medalsButton),
});
achievements.bindButton(medalsButton);
/** True while an overlay is open: input goes to the overlay and the game pauses. */
const paused = () => panel.isOpen() || options.isOpen() || achievements.isOpen();

/** Play a sound now, or after its delay. */
function playCue(cue: SoundCue): void {
  if (cue.delay) setTimeout(() => audio.play(cue.sound, cue), cue.delay * 1000);
  else audio.play(cue.sound, cue);
}

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

/** Drop the slider (playing again from the game-over card is act("again")). */
function tap(): void {
  if (state.phase === "over") return;
  const level = state.blocks.length;
  const under = top(state);
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  const r = drop(state);
  if (!r) return;
  const over = r.kind === "toppled" || (r.kind === "miss" && state.lives <= 0); // tower went over, or last life gone
  for (const cue of dropCues(r, state.streak)) playCue(cue);
  // Medals: saved at once, chimed softly, and shown on the game-over card (never mid-run).
  const earned = record(medals, mode, state.score, state.streak, Date.now());
  if (earned.changed) saveAchievements(medals);
  if (earned.unlocked.length > 0) {
    runMedals.push(...earned.unlocked);
    for (const cue of unlockSounds()) playCue(cue);
    achievements.refresh();
  }
  // Hard's off-center landing is an ordinary landing (silent); a topple is the run ending.
  const feel = dropHaptic(r.kind === "perfect" || r.kind === "miss" ? r.kind : "sliced", state.streak, over);
  if (feel) buzz(feel);
  if (r.kind === "perfect") addFlash(view, level, state.streak);
  else if (r.kind === "sliced" || r.kind === "miss") addFalling(view, r.cut, level, towerX);
  else if (r.kind === "toppled") addTopple(view, state, r.tip);
  if (state.score > best) {
    best = state.score;
    bests[mode] = best;
    saveBest(mode, best);
  }
}

/**
 * The game-over card is up (a toppled tower falls first), and up long enough that a tap meant for
 * the tower can't play again or leave by mistake.
 */
function cardReady(): boolean {
  return state.phase === "over" && cardAt > 0 && performance.now() - cardAt >= RESTART_GUARD_MS;
}

function showScreen(next: Screen): void {
  screen = next;
  title.showMenu(false);
  // The title has its own Skins button; a run keeps the Options button as before.
  options.showButton(next === "run");
  if (next === "title") title.show();
  else title.hide();
}

/** Do what the player asked for: a tap, a key, or a title-screen button. */
function act(intent: Intent): void {
  const now = performance.now();
  const next = flowStep(screen, state, intent, cardReady(), now - startedAt >= START_GUARD_MS);
  if (!next) return;
  if (next.fresh) restart();
  if (next.screen !== screen) showScreen(next.screen);
  if (intent === "drop") tap();
  else if (next.screen === "run") startedAt = now;
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  audio.unlock();
  if (paused()) return;
  const intent = tapIntent(screen, state.phase);
  if (intent) act(intent);
});
// Browsers only start sound inside a user gesture; iOS Safari wants the end of a touch.
window.addEventListener("pointerup", () => audio.unlock());
// Capture: this sees Escape before the Options sheet closes on it (so it isn't also "Menu").
window.addEventListener(
  "keydown",
  (e) => {
    audio.unlock();
    if (paused()) return;
    const intent = keyIntent(screen, state.phase, e, title.isControl(document.activeElement));
    if (!intent) return;
    e.preventDefault();
    act(intent);
  },
  true,
);
window.addEventListener("resize", resize);
// Canvas text only uses a web font once it's loaded; decode the base faces up front.
loadFonts(BASE_FONTS);
resize();
showScreen("title");

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
    title.setSkin(skin);
    achievements.setSkin(skin);
    // Each skin has its arrangement of the theme; a skin without one yet plays Synthwave's if it
    // is neon, else Classic's.
    audio.setMusic(...skinSong(skin));
  }
  return skin;
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // A page can resize the canvas without resizing the window (the Artifact page pads the top by
  // the phone's safe area once it knows it): follow it, or the title's buttons drift off the logo.
  if (canvas!.clientWidth !== cssW || canvas!.clientHeight !== cssH) resize();
  // Paused while tuning, so values can be changed without losing the run.
  if (!paused()) {
    // The title holds the tower still (and hides the slider) until PLAY.
    if (screen === "run") step(state, dt);
    updateView(view, state, dt);
    // The music steps back while a run is played, and comes forward on the title and game over.
    audio.setFocus(state.phase === "playing" && state.score > 0);
  }
  if (state.phase === "over" && !cardAt && !isToppling(view)) {
    cardAt = now;
    // The card is canvas: screen readers hear the run's new medals here.
    if (runMedals.length > 0) achievements.announce(runMedals);
  }
  // The Menu button comes once the card takes taps, so it never shows without working.
  title.showMenu(screen === "run" && cardReady());
  // Hard mode: the music keeps pace with the bar (1 otherwise; the engine skips unchanged rates).
  audio.setTempo(musicTempo(state));
  render(ctx!, cssW, cssH, state, view, best, currentSkin(), audio.position(), {
    title: screen === "title",
    newMedals: runMedals,
    cardAge: lessMotion?.matches ? Infinity : cardAt ? (now - cardAt) / 1000 : 0,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState; __view: () => View }).__game = () => state;
(window as unknown as { __view: () => View }).__view = () => view;
(window as unknown as { __audio: typeof audio }).__audio = audio;
(window as unknown as { __screen: () => Screen }).__screen = () => screen;
