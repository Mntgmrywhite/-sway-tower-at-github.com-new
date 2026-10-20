import { createAnnouncer, gameOverWords, landingWords } from "./announce";
import { audio, type SceneSync } from "./audio/engine";
import { blastSounds, dropSounds, unlockSounds, type SoundCue } from "./audio/sounds";
import { creditBests, loadAchievements, markSeen, record, saveAchievements, type Achievement } from "./achievements";
import { createAchievements, MEDAL_ICON } from "./achievements-sheet";
import { tuning } from "./config";
import { BASE_FONTS, loadFonts } from "./fonts";
import { BLAST_AT, blastCueAt } from "./fx/topple";
import { drop, musicTempo, newGame, step, swayOffset, top, type DropResult, type GameState, type Mode } from "./game";
import { buzz, dropHaptic } from "./haptics";
import { createGameCenter } from "./native/gamecenter";
import { APP_VERSION, gameCenterPlugin, isNativeApp, rateApp, requestReview, shareNative } from "./native/native";
import { asked, parseRateState, RATE_KEY, runEnded, serializeRateState, shouldAskForReview, type RateState } from "./native/rate";
import { createOptions } from "./options";
import { createPanel } from "./panel";
import { isToppling, newView, render, showLanding, titleLayout, updateView, type View } from "./render";
import { applyMotion, reduceMotion, settings } from "./settings";
import { drawShareCard, pngBase64, pngFile, SHARE_H, SHARE_LINK, SHARE_W, shareText, webShareAvailable } from "./share";
import { resolveSkin } from "./skins";
import { MINUTE } from "./skins/newyear/countdown";
import type { Skin } from "./skins/skin";
import { keepSaves } from "./storage";
import { createTitle, flowStep, keyIntent, skinSong, tapIntent, type Intent, type Screen } from "./title";

// Storage keys keep the game's original working name so saved scores survive renames, and the
// modes keep their original ids: Slide ("normal") keeps the original best key; Drop ("hard") has
// its own.
const BEST_KEYS: Record<Mode, string> = { normal: "sway-stack:best", hard: "sway-stack:best:hard" };
const MODE_KEY = "sway-stack:mode";
/** Ignore taps for this long after the game-over card comes up so a mistap doesn't instantly restart. */
const RESTART_GUARD_MS = 400;
/**
 * Ignore drops for this long after a run starts (PLAY, or playing again), so a double tap there
 * doesn't drop the first bar at the slider's far end: a sliver.
 */
const START_GUARD_MS = 300;
/**
 * The App Store review prompt (the iOS app, src/native/rate.ts) comes this long after the
 * game-over card, so the card, its medals and their chime land first.
 */
const RATE_DELAY_MS = 1200;
/** A click this soon after a pointer event on the scene is that same tap, not an assistive tech's activation. */
const CLICK_AFTER_POINTER_MS = 1000;
/**
 * A tap on the scene this soon after the share sheet went down is the tap that dismissed it (the
 * iOS 26 share sheet lets a tap beside it through to the page), not a tap to play again.
 */
const SHARE_GUARD_MS = 500;

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
/** Whether this run set a new best (the review ask waits for one). */
let runNewBest = false;
/**
 * Less motion: the medals already in place on the card, the game-over blast without its shake and
 * screen-wide flash, no sheet fade or rise. The Settings sheet's Motion choice, which on "auto"
 * follows the device (src/settings.ts).
 */
const deviceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const lessMotion = (): boolean => reduceMotion(settings.motion, deviceMotion?.matches ?? false);
const refreshMotion = (): void => applyMotion(lessMotion());
deviceMotion?.addEventListener?.("change", refreshMotion);
refreshMotion();
/** What a screen reader hears while stacking: the score at each landing, the lives, the game over. */
const announcer = createAnnouncer();
/** When the review ask may come (src/native/rate.ts): runs played, the version last asked in. */
let rate: RateState = loadRate();
/**
 * Game Center, in the iOS app (src/native/gamecenter.ts): signed in quietly after the first PLAY,
 * each game over to the mode's leaderboard, each medal as an achievement, the access point on the
 * title. On the web it has no plugin and does nothing.
 */
const gameCenter = createGameCenter({
  plugin: gameCenterPlugin,
  store: safeStorage(),
  bests: () => bests,
  medals: () => medals,
  onChange() {
    options.refresh();
    achievements.refresh();
  },
});

/** localStorage, or null where even touching it throws (some private modes). */
function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function loadRate(): RateState {
  try {
    return parseRateState(localStorage.getItem(RATE_KEY));
  } catch {
    return parseRateState(null);
  }
}

function saveRate(s: RateState): void {
  try {
    localStorage.setItem(RATE_KEY, serializeRateState(s));
  } catch {
    // Storage blocked; the ask may come again another day.
  }
}

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
  runNewBest = false;
  // A fresh tower's scene starts over: New Year's music cuts to the minute's start with the screen's.
  audio.realign();
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
const options = createOptions(
  {
    mode: () => mode,
    setMode,
    version: APP_VERSION,
    onSettings: refreshMotion,
    // "Rate Sway Tower" and the Game Center row: the iOS app only (the web has neither).
    rate: isNativeApp ? () => void rateApp() : undefined,
    gameCenter: isNativeApp
      ? { status: () => gameCenter.status(), signIn: () => gameCenter.signIn(), showLeaderboard: () => gameCenter.showLeaderboard(mode) }
      : undefined,
  },
  () => title.refresh(),
);
/** Whether this platform can share the tower as a picture: the app always, a browser with the Web Share API for files. */
const canShare = isNativeApp || webShareAvailable();
const title = createTitle(
  {
    mode: () => mode,
    setMode,
    bests: () => ({ ...bests }),
    play: () => act("play"),
    menu: () => act("menu"),
    share: canShare ? (from) => void shareTower(from) : undefined,
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
  gameCenter: isNativeApp ? { authenticated: () => gameCenter.status().authenticated, show: () => gameCenter.showAchievements() } : undefined,
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
/** True while an overlay is open (a sheet, or GameKit's sign-in): input goes to it and the game pauses. */
const paused = () => panel.isOpen() || options.isOpen() || achievements.isOpen() || gameCenter.status().busy;

/** Play a sound now, or after its delay. */
function playCue(cue: SoundCue): void {
  if (cue.delay) setTimeout(() => audio.play(cue.sound, cue), cue.delay * 1000);
  else audio.play(cue.sound, cue);
}

/**
 * Drop the slider (playing again from the game-over card is act("again")). In Drop this only lets
 * the bar go: it lands a moment later, in a frame's step (see `frame`).
 */
function tap(): void {
  if (state.phase === "over") return;
  const level = state.blocks.length;
  const under = top(state);
  const towerX = under.x + under.w / 2 + swayOffset(state, level - 1);
  const r = drop(state);
  if (r) landed(r, level, towerX);
}

/**
 * A bar met the tower onto `level` (the top bar's center was at world x `towerX`): its sound,
 * medals, haptic and effects, and the best. In Drop this comes at contact, never at the tap. The
 * miss that takes the last life sends the top of the tower over; its boom and heavy haptic come
 * with the blast (see `frame`).
 */
function landed(r: DropResult, level: number, towerX: number): void {
  for (const cue of dropSounds(r, state.streak)) playCue(cue);
  // Medals: saved at once, chimed softly, and shown on the game-over card (never mid-run).
  const earned = record(medals, mode, state.score, state.streak, Date.now());
  if (earned.changed) saveAchievements(medals);
  if (earned.unlocked.length > 0) {
    runMedals.push(...earned.unlocked);
    for (const cue of unlockSounds()) playCue(cue);
    achievements.refresh();
  }
  const feel = dropHaptic(r.kind, state.streak);
  if (feel) buzz(feel);
  showLanding(view, state, r, level, towerX);
  // Spoken for screen readers: a miss at once, the score when the last one has been said.
  const words = landingWords(r.kind, state.score, state.lives);
  if (r.kind === "miss") announcer.sayNow(words);
  else announcer.say(words);
  if (state.score > best) {
    best = state.score;
    bests[mode] = best;
    saveBest(mode, best);
    runNewBest = true;
  }
  // The last life: the run's height goes to the mode's leaderboard (the card comes after the topple).
  if (state.phase === "over") gameCenter.gameOver(mode, state.score);
}

/** A share in progress (the sheet is up): a second tap on Share waits, and the scene takes no taps. */
let sharing = false;
/** When the share sheet last went down (performance.now() ms): a tap right after is the one that dismissed it. */
let sharedAt = -Infinity;

/**
 * Share the tower on the game-over card: a 1080×1920 picture of it as it stood (src/share.ts),
 * through the app's share sheet or the browser's. `from` is the Share button (the iPad popover's anchor).
 */
async function shareTower(from: HTMLElement): Promise<void> {
  if (sharing || state.phase !== "over") return;
  sharing = true;
  title.setSharing(true);
  try {
    // The app: let the dimmed Share button show before the picture is made (a moment's work). The
    // web keeps it all in the tap, or the browser may refuse to share outside the gesture.
    if (isNativeApp) await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    const card = document.createElement("canvas");
    card.width = SHARE_W;
    card.height = SHARE_H;
    const c = card.getContext("2d");
    if (!c) return;
    drawShareCard(c, state, view, best, currentSkin(), audio.position());
    const png = pngBase64(card.toDataURL("image/png"));
    const text = shareText(state.score, mode);
    const url = SHARE_LINK || undefined;
    if (isNativeApp) {
      const r = from.getBoundingClientRect();
      await shareNative({ png, text, url, rect: { x: r.left, y: r.top, width: r.width, height: r.height } });
    } else {
      await navigator.share({ files: [pngFile(png)], text, url });
    }
  } catch {
    // The player closed the sheet, or this page may not share: nothing to do.
  } finally {
    sharing = false;
    sharedAt = performance.now();
    title.setSharing(false);
  }
}

/**
 * The game-over card is up: say so, and in the iOS app maybe ask for a review (after a new best,
 * from the third run on, once per version: src/native/rate.ts), a moment after the card.
 */
function cardUp(): void {
  announcer.sayNow(gameOverWords(state.score, runNewBest));
  // The run's medals go to Game Center with the card: GameKit's banner lands here, never over
  // the HUD mid-run (while stacking, a medal is a chime only).
  gameCenter.earned(runMedals);
  rate = runEnded(rate);
  saveRate(rate);
  if (shouldAskForReview(rate, { newBest: runNewBest, version: APP_VERSION, native: isNativeApp })) {
    setTimeout(() => {
      // Still on the card, with nothing open over it: never mid-play. The one ask a version gets
      // is spent only once StoreKit was actually asked, so a player who played again or opened
      // Settings before the moment came still gets it after a later best.
      if (state.phase !== "over" || screen !== "run" || paused()) return;
      void requestReview().then((requested) => {
        if (!requested) return;
        rate = asked(rate, APP_VERSION);
        saveRate(rate);
      });
    }, RATE_DELAY_MS);
  }
}

/** The game-over card is up, and up long enough that a tap meant for the tower can't play again or leave by mistake. */
function cardReady(): boolean {
  return state.phase === "over" && cardAt > 0 && performance.now() - cardAt >= RESTART_GUARD_MS;
}

function showScreen(next: Screen): void {
  screen = next;
  title.showMenu(false);
  // The title has its own Skins button; a run keeps the Settings button as before.
  options.showButton(next === "run");
  if (next === "title") title.show();
  else title.hide();
  describeCanvas();
}

/**
 * The canvas for assistive tech: on the title it is scenery behind the controls; in a run it is
 * the one button the game has (a tap drops the bar, or plays again from the card).
 */
function describeCanvas(): void {
  if (screen === "title") {
    canvas!.setAttribute("aria-hidden", "true");
    canvas!.removeAttribute("role");
    canvas!.removeAttribute("aria-label");
    return;
  }
  canvas!.removeAttribute("aria-hidden");
  canvas!.setAttribute("role", "button");
  canvas!.setAttribute("aria-label", state.phase === "over" ? "Play again" : "Drop the bar");
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
  // The first PLAY: Game Center signs in quietly (never on launch, before a gesture).
  if (intent === "play") void gameCenter.firstPlay();
  describeCanvas();
}

/** A tap on the scene: drop the bar, or play again from the card. */
function tapped(): void {
  audio.unlock();
  // Not while a sheet is up, and not the tap that dismissed the share sheet (it would play again
  // and take the card away).
  if (paused() || sharing || performance.now() - sharedAt < SHARE_GUARD_MS) return;
  const intent = tapIntent(screen, state.phase);
  if (intent) act(intent);
}

/** When the scene last saw a pointer go down, up or away (performance.now() ms): the click that follows is that same tap. */
let pointerAt = -Infinity;
const sawPointer = (): void => void (pointerAt = performance.now());
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  sawPointer();
  tapped();
});
canvas.addEventListener("pointerup", sawPointer);
canvas.addEventListener("pointercancel", sawPointer);
// Assistive tech (VoiceOver's double-tap, a switch) activates the canvas button with a click and
// no pointer events at all; a finger's tap already acted on its pointerdown, and its click comes
// right after its pointerup (a long press included), so that one is left alone.
canvas.addEventListener("click", () => {
  if (performance.now() - pointerAt < CLICK_AFTER_POINTER_MS) return;
  tapped();
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
    options.setSkin(skin);
    achievements.setSkin(skin);
    // Each skin has its arrangement of the theme; a skin without one yet plays Synthwave's if it
    // is neon, else Classic's.
    audio.setMusic(...skinSong(skin), sceneSync(skin));
  }
  return skin;
}

/**
 * New Year's: the song's midnight (its "midnight" cue, the crowd's cheer) strikes a minute into the
 * tower's scene, so a fresh tower starts the song a minute before it, as the Art Deco screen shows
 * "1:00", and the song's own loop is the cycle from there. The song comes in where the scene is and
 * cuts to where it is when a fresh tower starts (restart) or the scene goes on after an overlay held
 * it (audio.hold); while it plays, the screen follows it (countdown.ts), and while an overlay holds
 * the scene, the screen holds too. Other skins' music keeps its own time.
 */
function sceneSync(s: Skin): SceneSync | undefined {
  return s.id === "newyear" ? { cue: "midnight", at: MINUTE, time: () => view.t } : undefined;
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  // A page can resize the canvas without resizing the window (the Artifact page pads the top by
  // the phone's safe area once it knows it): follow it, or the title's buttons drift off the logo.
  if (canvas!.clientWidth !== cssW || canvas!.clientHeight !== cssH) resize();
  // An overlay holds the scene's clock still (where New Year's is picked, a mode switch's fresh
  // tower starts, or the music comes back on) while the music plays on: New Year's screen holds
  // with the scene, and as the scene goes on again the song cuts back to it (audio.hold).
  audio.hold(paused());
  // Paused while tuning, so values can be changed without losing the run.
  if (!paused()) {
    // The title holds the tower still (and hides the slider) until PLAY. In Drop a released bar
    // lands inside a step: its sounds and effects start right then, at contact.
    if (screen === "run") {
      const level = state.blocks.length;
      const under = top(state);
      const r = step(state, dt);
      if (r) landed(r, level, under.x + under.w / 2 + swayOffset(state, level - 1));
    }
    // The toppling tower blows up inside a view step: its sound starts at the blast's cue, and the
    // heavy haptic lands with the blast itself (popcorn's cue is its first little pop, before its
    // BOOM at BLAST_AT: the thump waits for that).
    if (updateView(view, state, dt).blast) {
      const variant = view.topple!.variant;
      for (const cue of blastSounds(variant)) playCue(cue);
      const wait = BLAST_AT - blastCueAt(variant);
      if (wait > 0) setTimeout(() => buzz("blast"), wait * 1000);
      else buzz("blast");
    }
    // The music steps back while a run is played, and comes forward on the title and game over;
    // it stays back while the tower goes over and blows up, so the boom isn't buried, and comes
    // forward with the card.
    audio.setFocus(state.score > 0 && (state.phase === "playing" || isToppling(view)));
  }
  // The card comes once the tower has gone over and blown up.
  if (state.phase === "over" && !cardAt && !isToppling(view)) {
    cardAt = now;
    // The card is canvas: screen readers hear the score and the run's new medals here.
    cardUp();
    if (runMedals.length > 0) achievements.announce(runMedals);
    describeCanvas();
  }
  // The Share and Menu buttons come once the card takes taps, so they never show without working
  // (Share only for a tower: a zero has nothing to show).
  title.showMenu(screen === "run" && cardReady(), state.score > 0);
  // The Game Center bubble, on the title only (never over a sheet or a run).
  gameCenter.setAccessPoint(screen === "title" && !paused());
  // The music keeps pace with the bar while a run is played, in both modes (1 on the title and
  // game over; the engine skips unchanged rates).
  audio.setTempo(musicTempo(state));
  const still = lessMotion();
  render(ctx!, cssW, cssH, state, view, best, currentSkin(), audio.position(), {
    title: screen === "title",
    newMedals: runMedals,
    cardAge: still ? Infinity : cardAt ? (now - cardAt) / 1000 : 0,
    still,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/inspection hook for automated checks.
(window as unknown as { __game: () => GameState; __view: () => View }).__game = () => state;
(window as unknown as { __view: () => View }).__view = () => view;
(window as unknown as { __audio: typeof audio }).__audio = audio;
(window as unknown as { __screen: () => Screen }).__screen = () => screen;
