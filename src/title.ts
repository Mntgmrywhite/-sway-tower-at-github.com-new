import "./title.css";
import { kitFor } from "./base/style";
import type { Mode, Phase } from "./game";
import type { Skin } from "./skins/skin";

// The title screen, in the spirit of Retro Bowl: over the skin's start scene, the "Sway Tower"
// logo (drawn on the canvas by render.ts, where the name sits during a run), the Slide / Drop
// choice (modes "normal" / "hard") with each mode's best, one big PLAY, and a row of small buttons
// (Skins & options, Sound).
// The game-over card gets a row of its own under it: Share (the tower as a picture, where the
// platform can share one: src/share.ts) and Menu, back here. Nothing of this shows while stacking.
//
// The DOM side is styled per skin from CSS variables (setSkin), cartoon or neon like the HUD. The
// flow (which screen, what a key or a tap does) is pure and lives at the top so it can be tested
// without a DOM; main.ts owns the game and acts on the intents.
//
// More small buttons (Achievements) go in the row with `addButton`, between Skins and Sound.

/** The title screen, or a run (being stacked, or its game-over card). */
export type Screen = "title" | "run";

/**
 * What the player asked for: start the run from the title, drop the slider, start again from the
 * game-over card, or go back to the title from it.
 */
export type Intent = "play" | "drop" | "again" | "menu";

/** The parts of a keydown the flow looks at. */
export interface KeyPress {
  code: string;
  key: string;
  repeat: boolean;
}

/**
 * What a key does. `onControl` is true while the keyboard has the focus on a control that keeps
 * Space and Enter (Skins, Sound, the other mode, the game-over Menu, ⚙: Title.isControl): they
 * then press that control instead. Space drops while stacking (as before the title screen); on the
 * title Space or Enter plays; on the game-over card they play again and Escape goes back to the
 * title.
 */
export function keyIntent(screen: Screen, phase: Phase, k: KeyPress, onControl: boolean): Intent | null {
  if (k.repeat) return null;
  const go = k.code === "Space" || k.key === "Enter";
  if (screen === "title") return go && !onControl ? "play" : null;
  if (phase === "playing") return k.code === "Space" ? "drop" : null;
  if (k.key === "Escape") return "menu";
  return go && !onControl ? "again" : null;
}

/** What a tap on the scene does: nothing on the title (PLAY starts), else drop or play again. */
export function tapIntent(screen: Screen, phase: Phase): Intent | null {
  if (screen === "title") return null;
  return phase === "playing" ? "drop" : "again";
}

/** What an intent leads to: the screen after it, and whether the tower starts fresh first. */
export interface FlowStep {
  screen: Screen;
  fresh: boolean;
}

/**
 * What an intent does now, or null when it does nothing (main.ts does the drop itself).
 * `cardReady`: the game-over card is up and past its guard, so a tap can't hit it by mistake.
 * `runReady`: the run is past its own short guard, so the second tap of a double tap on PLAY (or
 * on the card) doesn't drop the first bar at the slider's far end.
 * PLAY runs the tower standing behind the title (fresh unless something already changed it);
 * playing again and going back to the title both start a fresh one.
 */
export function flowStep(
  screen: Screen,
  game: { phase: Phase; score: number },
  intent: Intent,
  cardReady: boolean,
  runReady = true,
): FlowStep | null {
  switch (intent) {
    case "play":
      return screen === "title" ? { screen: "run", fresh: game.phase !== "playing" || game.score > 0 } : null;
    case "drop":
      return screen === "run" && game.phase === "playing" && runReady ? { screen: "run", fresh: false } : null;
    case "again":
      return screen === "run" && game.phase === "over" && cardReady ? { screen: "run", fresh: true } : null;
    case "menu":
      return screen === "run" && game.phase === "over" && cardReady ? { screen: "title", fresh: true } : null;
  }
}

/** The mode choices on the title, in order: the player sees Slide (mode "normal") and Drop ("hard"). */
export const MODE_CHOICES: readonly { value: Mode; title: string }[] = [
  { value: "normal", title: "Slide" },
  { value: "hard", title: "Drop" },
];

export interface ModeCard {
  value: Mode;
  title: string;
  /** "best N" for that mode. */
  best: string;
  checked: boolean;
}

/** The title's mode cards: each mode with its own best, the current one checked. */
export function modeCards(bests: Readonly<Record<Mode, number>>, mode: Mode): ModeCard[] {
  return MODE_CHOICES.map((m) => ({ value: m.value, title: m.title, best: `best ${bests[m.value]}`, checked: m.value === mode }));
}

/**
 * The song for a skin, and what plays until it has one: each skin's own arrangement by id; a neon
 * skin without one plays Synthwave's, any other Classic's (audio.setMusic(name, fallback)).
 */
export function skinSong(skin: Pick<Skin, "id" | "style">): [name: string, fallback: string] {
  return [skin.id, skin.style === "neon" ? "neon" : "classic"];
}

/** What the title needs from the game. */
export interface TitleHost {
  mode(): Mode;
  /** Pick a mode (a fresh run in it). */
  setMode(mode: Mode): void;
  /** Each mode's best score. */
  bests(): Record<Mode, number>;
  /** PLAY: into the run. */
  play(): void;
  /** The game-over card's Menu: back to the title. */
  menu(): void;
  /**
   * The game-over card's Share: the tower as a picture (`from` is the button, to anchor an iPad
   * popover). Absent where nothing can share a picture: the button is then never shown.
   */
  share?(from: HTMLElement): void;
  /** Open the Options sheet (skins, sound, mode); focus returns to `from` when it closes. */
  openOptions(from: HTMLElement): void;
  /** Whether any sound is on (music or effects). */
  sound(): boolean;
  /** Sound on or off: music and effects together. */
  setSound(on: boolean): void;
}

export interface SmallButton {
  /** Element id, e.g. "title-achievements". */
  id: string;
  /** The short caption under the icon. */
  caption: string;
  /** The accessible name, when it says more than the caption. */
  label?: string;
  /** Inline SVG markup for the icon (24×24 viewBox, currentColor). */
  icon: string;
  onClick(): void;
}

/** Where the canvas sits in its parent (CSS px): its offset there and its CSS size. */
export interface CanvasBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Title {
  show(): void;
  hide(): void;
  isShown(): boolean;
  /** Show or hide the game-over card's row (Menu, and Share when `withShare` and the host can share). */
  showMenu(on: boolean, withShare?: boolean): void;
  /** The picture is being made and the share sheet is on its way (it can take a moment): Share says so. */
  setSharing(on: boolean): void;
  /**
   * Place the overlay to match the canvas: `u` is render.ts's size unit, `top` the y the column
   * starts at (under the logo), `menuTop` the y of the game-over card's row (CSS px, from the
   * canvas's top), and `box` where the canvas sits in its parent (offsetLeft/Top, its CSS size).
   * The page can push the canvas down (the Artifact page pads the top by the phone's safe area),
   * and the overlay must follow it or its column rides up over the logo.
   */
  layout(u: number, top: number, menuTop: number, box?: CanvasBox): void;
  /** Colors and faces from the skin's HUD, cartoon or neon. */
  setSkin(skin: Skin): void;
  /** Re-read the mode, the bests and the sound switch. */
  refresh(): void;
  /**
   * True when the keyboard (Tab, the arrows) put the focus on a control that keeps Space and Enter
   * for itself: any button but PLAY and the chosen mode (which play), the ⚙ and Options buttons
   * included. A control focused by a click or a tap doesn't: Space and Enter still play.
   */
  isControl(el: Element | null): boolean;
  /** Add a small button to the row (between Skins and Sound). */
  addButton(button: SmallButton): HTMLButtonElement;
}

const ICONS = {
  // The palette of the Options button (src/options.ts).
  skins: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.4-.9.2-1.9 1.2-1.9H16a5 5 0 0 0 5-5c0-4.1-4-7.3-9-7.3z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="7.5" cy="11" r="1.5" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="7.8" r="1.5" fill="currentColor"/><circle cx="17.6" cy="11.6" r="1.5" fill="currentColor"/>
  </svg>`,
  sound: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path class="off" d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 11.5 12 4.5l8 7M6.5 9.5V19.5h4v-5h3v5h4V9.5" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  // The box with the arrow out of it: the share sign everyone knows.
  share: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5v11M8.5 7 12 3.5 15.5 7" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 10.5h-2A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-2"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

/** Keys that move the focus: after one, the focused control keeps Space and Enter. */
const FOCUS_KEYS = new Set(["Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);
/** What can have the focus and acts on Space or Enter itself. */
const CONTROLS = "button, input, select, textarea, a[href], [contenteditable]";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function smallButton(b: SmallButton): HTMLButtonElement {
  const button = el("button", "small");
  button.type = "button";
  button.id = b.id;
  if (b.label) button.setAttribute("aria-label", b.label);
  button.innerHTML = b.icon;
  button.append(el("span", "caption", b.caption));
  button.addEventListener("click", () => b.onClick());
  return button;
}

/** Builds the title overlay and the game-over card's row (Share, Menu), right after `canvas` (under the sheets). */
export function createTitle(host: TitleHost, canvas: HTMLElement): Title {
  const root = el("section");
  root.id = "title";
  root.setAttribute("aria-label", "Sway Tower");
  root.hidden = true;
  // The logo itself is drawn on the canvas; screen readers get it here.
  const heading = el("h1", "sr-only", "Sway Tower");
  const column = el("div", "column");

  const modes = el("div", "modes");
  modes.setAttribute("role", "radiogroup");
  modes.setAttribute("aria-label", "Mode");
  const cards = MODE_CHOICES.map((m) => {
    const button = el("button", "mode");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.dataset.mode = m.value;
    const best = el("small", "best");
    button.append(el("strong", "", m.title), best);
    button.addEventListener("click", () => pick(m.value));
    modes.append(button);
    return { value: m.value, button, best };
  });
  // Radio-group keys: the arrows move the choice (and the focus) to the other mode.
  modes.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const at = cards.findIndex((c) => c.value === host.mode());
    const next = cards[(at + step + cards.length) % cards.length]!;
    pick(next.value);
    next.button.focus();
  });

  const play = el("button", "play", "Play");
  play.type = "button";
  play.addEventListener("click", () => host.play());

  const row = el("div", "row");
  const skins = smallButton({
    id: "title-options",
    caption: "Skins",
    label: "Skins and settings",
    icon: ICONS.skins,
    onClick: () => host.openOptions(skins),
  });
  const sound = smallButton({
    id: "title-sound",
    caption: "Sound",
    icon: ICONS.sound,
    onClick: () => {
      host.setSound(!host.sound());
      refresh();
    },
  });
  sound.setAttribute("role", "switch");
  sound.setAttribute("aria-label", "Sound");
  row.append(skins, sound);

  column.append(modes, play, row);
  root.append(heading, column);

  // The game-over card's row: Share (only where the host can share a picture) and Menu.
  const over = el("div");
  over.id = "over";
  over.hidden = true;
  const share = smallButton({
    id: "over-share",
    caption: "Share",
    // The accessible names start with the captions, so "click Share" works by voice too.
    label: "Share: your tower as a picture",
    icon: ICONS.share,
    onClick: () => host.share?.(share),
  });
  share.hidden = true;
  const menu = smallButton({
    id: "over-menu",
    caption: "Menu",
    label: "Menu: back to the title screen",
    icon: ICONS.home,
    onClick: () => host.menu(),
  });
  over.append(share, menu);

  // Beside the canvas, placed from its offset in their shared parent (layout), so the overlay can't
  // drift from the logo when the page pads or pushes the canvas.
  const parent = canvas.parentElement;
  if (parent && getComputedStyle(parent).position === "static") parent.style.position = "relative";
  canvas.after(root, over);

  // Whether the keyboard put the focus where it is (Tab, the arrows), not a click or a tap. A
  // button keeps the focus after a click (Chrome), and Space or Enter must still play then, not
  // press it again (Sound back on, Skins open again).
  let byKeyboard = false;
  window.addEventListener("pointerdown", () => (byKeyboard = false), true);
  window.addEventListener(
    "keydown",
    (e) => {
      if (FOCUS_KEYS.has(e.key)) byKeyboard = true;
    },
    true,
  );

  function pick(mode: Mode): void {
    host.setMode(mode);
    refresh();
  }

  function refresh(): void {
    for (const card of modeCards(host.bests(), host.mode())) {
      const c = cards.find((x) => x.value === card.value)!;
      c.best.textContent = card.best;
      // Named outright, so every screen reader hears the mode and its best, not just the text nodes.
      c.button.setAttribute("aria-label", `${card.title}, ${card.best}`);
      c.button.setAttribute("aria-checked", String(card.checked));
      // Only the chosen mode is in the tab order; the arrows reach the other.
      c.button.tabIndex = card.checked ? 0 : -1;
    }
    sound.setAttribute("aria-checked", String(host.sound()));
  }

  return {
    show() {
      // Back from the game-over card by keyboard: the focus moves on to PLAY.
      const keyboard = over.contains(document.activeElement);
      refresh();
      root.hidden = false;
      over.hidden = true;
      if (keyboard) play.focus({ preventScroll: true });
    },
    hide() {
      if (root.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      root.hidden = true;
    },
    isShown: () => !root.hidden,
    showMenu(on, withShare = true) {
      share.hidden = !(on && withShare && host.share !== undefined);
      if (over.hidden === !on) return;
      if (!on && over.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      over.hidden = !on;
    },
    setSharing(on) {
      share.setAttribute("aria-busy", String(on));
    },
    layout(u, top, menuTop, box) {
      for (const node of [root, over]) {
        node.style.setProperty("--u", `${u}px`);
        node.style.setProperty("--top", `${top}px`);
        node.style.setProperty("--menu-top", `${menuTop}px`);
        if (box) {
          node.style.setProperty("--box-left", `${box.left}px`);
          node.style.setProperty("--box-top", `${box.top}px`);
          node.style.setProperty("--box-w", `${box.width}px`);
          node.style.setProperty("--box-h", `${box.height}px`);
        }
      }
    },
    setSkin(skin) {
      const style = skin.style === "neon" ? "neon" : "cartoon";
      const vars: Record<string, string> = {
        "--ui": skin.hud.ui,
        "--title": skin.hud.title,
        "--hl": skin.hud.accent,
        "--display": skin.hud.display,
        "--body": kitFor(skin).body,
      };
      for (const node of [root, over]) {
        node.dataset.style = style;
        for (const [k, v] of Object.entries(vars)) node.style.setProperty(k, v);
      }
    },
    refresh,
    isControl(e) {
      if (!byKeyboard || !(e instanceof HTMLElement) || e === play) return false;
      // The chosen mode plays: Enter takes a choice, and Space would only pick it again.
      if (cards.some((c) => c.button === e && c.button.getAttribute("aria-checked") === "true")) return false;
      return e.matches(CONTROLS);
    },
    addButton(b) {
      const button = smallButton(b);
      row.insertBefore(button, sound);
      return button;
    },
  };
}
