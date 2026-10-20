import "./options.css";
import { audio } from "./audio/engine";
import { kitFor } from "./base/style";
import { tuning } from "./config";
import { createCredits } from "./credits";
import type { Mode } from "./game";
import { hapticsAvailable } from "./haptics";
import { gameCenterRow, type GameCenterStatus } from "./native/gamecenter";
import { saveTuning } from "./panel";
import { MOTION_CHOICES, saveSettings, settings, type MotionChoice } from "./settings";
import { radioKeys, tabOnlyChecked, trapTab } from "./sheet";
import { AUTO, SKINS, skinForDate } from "./skins";
import type { Skin } from "./skins/skin";

// The Settings sheet: opened by the title's Skins button and by the Settings button (top-left)
// during a run. Mode (Slide / Drop), Sound (music, effects, haptics), Motion (reduce motion:
// auto / on / off), in the iOS app a Game Center row (who is signed in, Sign in, the mode's
// leaderboard), the skin picker, and a footer with the version, Credits and, in the iOS app,
// Rate Sway Tower. Picking a skin applies it at once behind the sheet; picking a mode starts a
// fresh run in it. Everything is saved on the device (main.ts owns the mode and its save; the
// audio engine its switches; src/settings.ts haptics and motion). Nothing of this shows while
// stacking: the owner's game stays one tap.

/** The mode choices, in order, with a one-line summary each: Slide (mode "normal") and Drop ("hard"). */
const MODES: { value: Mode; title: string; sub: string }[] = [
  { value: "normal", title: "Slide", sub: "the bar slides across the top · 3 lives · overhangs slice off" },
  { value: "hard", title: "Drop", sub: "the bar drops from one bar above · 3 lives · overhangs slice off" },
];

/** Reduce motion, as the player picks it. */
const MOTIONS: { value: MotionChoice; title: string }[] = [
  { value: "auto", title: "Auto" },
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateLabel(skin: Skin): string {
  const w = skin.dates?.[0];
  if (!w) return "Any time";
  const fmt = ([m, d]: [number, number]) => `${MONTHS[m - 1]} ${d}`;
  return `${fmt(w.from)} – ${fmt(w.to)}`;
}

/** A strip of the skin's first bar colors, as a preview. */
function swatch(skin: Skin): HTMLElement {
  const strip = document.createElement("span");
  strip.className = "swatch";
  strip.setAttribute("aria-hidden", "true");
  for (const bar of skin.bars.slice(0, 6)) {
    const chip = document.createElement("i");
    chip.style.setProperty("--c", bar.color);
    strip.append(chip);
  }
  return strip;
}

export interface Options {
  /** True while the sheet, or the Credits sheet over it, is open. */
  isOpen(): boolean;
  /** Re-read what the sheet shows from the host (the Game Center status changed). */
  refresh(): void;
  /** Open the sheet (the title screen's Skins button); the focus goes back to `from` on close. */
  open(from?: HTMLElement): void;
  close(): void;
  /** Show or hide the in-run Settings button (the title screen has its own). */
  showButton(show: boolean): void;
  /** Fonts and highlight from the skin (the accent is the page's --accent). */
  setSkin(skin: Skin): void;
}

/** The current mode, and switching it (which starts a fresh run). */
export interface ModeControl {
  mode(): Mode;
  setMode(mode: Mode): void;
}

/** What the sheet needs from the game. */
export interface OptionsHost extends ModeControl {
  /** The app version, for the footer. */
  version: string;
  /** Haptics or motion changed: main.ts re-reads them. */
  onSettings?(): void;
  /** "Rate Sway Tower" (the iOS app); absent on the web, where the button is hidden. */
  rate?: () => void;
  /** Game Center (the iOS app; src/native/gamecenter.ts); absent on the web, where the row is hidden. */
  gameCenter?: GameCenterControl;
}

/** The Game Center row's host: the status, a deliberate sign-in, and the current mode's leaderboard. */
export interface GameCenterControl {
  status(): GameCenterStatus;
  signIn(): Promise<GameCenterStatus>;
  showLeaderboard(): void;
}


function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** `onClose` runs when the sheet closes (the title screen re-reads the mode and the sound). */
export function createOptions(host: OptionsHost, onClose?: () => void): Options {
  const button = el("button");
  button.id = "options-toggle";
  button.type = "button";
  button.setAttribute("aria-label", "Settings");
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.4-.9.2-1.9 1.2-1.9H16a5 5 0 0 0 5-5c0-4.1-4-7.3-9-7.3z"
      fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="7.5" cy="11" r="1.4" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.4" fill="currentColor"/>
    <circle cx="15" cy="7.8" r="1.4" fill="currentColor"/><circle cx="17.6" cy="11.6" r="1.4" fill="currentColor"/>
  </svg>`;

  const backdrop = el("div");
  backdrop.id = "options";
  backdrop.hidden = true;
  const sheet = el("div", "sheet");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "options-title");
  sheet.innerHTML = `
    <div class="head">
      <h2 id="options-title">Settings</h2>
      <button type="button" class="close" aria-label="Close">✕</button>
    </div>
    <h3 id="options-mode">Mode</h3>
    <div class="modes" role="radiogroup" aria-labelledby="options-mode"></div>
    <h3 id="options-sound">Sound</h3>
    <div class="toggles" role="group" aria-labelledby="options-sound"></div>
    <h3 id="options-motion">Motion</h3>
    <div class="motion">
      <span class="label" id="options-motion-label">Reduce motion</span>
      <div class="segments" role="radiogroup" aria-labelledby="options-motion-label" aria-describedby="options-motion-hint"></div>
    </div>
    <p class="hint" id="options-motion-hint">Auto follows your device. On: no shake or flash at the blast, nothing pops in.</p>
    <h3 id="options-gc" hidden>Game Center</h3>
    <div class="gc" hidden>
      <span class="text"><strong class="gc-name"></strong><small class="gc-note"></small></span>
      <button type="button" class="link gc-action"></button>
    </div>
    <h3 id="options-skins">Skins</h3>
    <div class="list" role="radiogroup" aria-labelledby="options-skins"></div>
    <div class="foot">
      <span class="version"></span>
      <span class="links">
        <button type="button" class="link credits">Credits</button>
        <button type="button" class="link rate" hidden>Rate Sway Tower</button>
      </span>
    </div>`;
  backdrop.append(sheet);
  const list = sheet.querySelector<HTMLElement>(".list")!;
  const toggles = sheet.querySelector<HTMLElement>(".toggles")!;
  const modeList = sheet.querySelector<HTMLElement>(".modes")!;
  const segments = sheet.querySelector<HTMLElement>(".segments")!;
  const closeButton = sheet.querySelector<HTMLButtonElement>(".close")!;
  const creditsButton = sheet.querySelector<HTMLButtonElement>(".credits")!;
  const rateButton = sheet.querySelector<HTMLButtonElement>(".rate")!;
  const gcHeading = sheet.querySelector<HTMLElement>("#options-gc")!;
  const gcRow = sheet.querySelector<HTMLElement>(".gc")!;
  const gcName = sheet.querySelector<HTMLElement>(".gc-name")!;
  const gcNote = sheet.querySelector<HTMLElement>(".gc-note")!;
  const gcAction = sheet.querySelector<HTMLButtonElement>(".gc-action")!;
  sheet.querySelector<HTMLElement>(".version")!.textContent = `Sway Tower ${host.version}`;

  // --- Mode ---
  const modeButtons: HTMLButtonElement[] = [];
  for (const m of MODES) {
    const b = el("button", "choice mode");
    b.type = "button";
    b.setAttribute("role", "radio");
    // Spoken with commas: a screen reader would read the dots out.
    b.setAttribute("aria-label", `${m.title}: ${m.sub.replaceAll(" · ", ", ")}`);
    const text = el("span", "text");
    text.append(el("strong", "", m.title), el("small", "", m.sub));
    b.append(text);
    b.addEventListener("click", () => {
      host.setMode(m.value);
      refresh();
    });
    modeList.append(b);
    modeButtons.push(b);
  }
  const modeAt = () => Math.max(0, MODES.findIndex((m) => m.value === host.mode()));
  radioKeys(modeList, modeButtons, modeAt, (i) => {
    host.setMode(MODES[i]!.value);
    refresh();
  });

  // --- Sound: music, effects, haptics ---
  const switches: { el: HTMLButtonElement; on: () => boolean }[] = [];
  const addSwitch = (label: string, on: () => boolean, set: (on: boolean) => void) => {
    const b = el("button", "toggle", label);
    b.type = "button";
    b.setAttribute("role", "switch");
    b.addEventListener("click", () => {
      audio.unlock();
      set(!on());
      refresh();
    });
    toggles.append(b);
    switches.push({ el: b, on });
    return b;
  };
  addSwitch("Music", () => audio.settings.music, (on) => audio.setMusicOn(on));
  addSwitch("Effects", () => audio.settings.sfx, (on) => audio.setSfxOn(on));
  const haptics = addSwitch(
    "Haptics",
    () => settings.haptics,
    (on) => {
      settings.haptics = on;
      saveSettings();
      host.onSettings?.();
    },
  );
  // Only where a haptic can play (the app, phones with vibration): a switch that does nothing misleads.
  haptics.hidden = !hapticsAvailable();

  // --- Motion ---
  const motionButtons: HTMLButtonElement[] = [];
  const pickMotion = (i: number) => {
    settings.motion = MOTIONS[i]!.value;
    saveSettings();
    host.onSettings?.();
    refresh();
  };
  MOTIONS.forEach((m, i) => {
    const b = el("button", "segment", m.title);
    b.type = "button";
    b.setAttribute("role", "radio");
    b.addEventListener("click", () => pickMotion(i));
    segments.append(b);
    motionButtons.push(b);
  });
  const motionAt = () => Math.max(0, MOTION_CHOICES.indexOf(settings.motion));
  radioKeys(segments, motionButtons, motionAt, pickMotion);

  // --- Skins ---
  const choices: { value: string; el: HTMLButtonElement }[] = [];
  const addChoice = (value: string, title: string, sub: string, preview: HTMLElement) => {
    const b = el("button", "choice");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", sub ? `${title}, ${sub}` : title);
    const text = el("span", "text");
    const when = el("small", "", sub);
    text.append(el("strong", "", title), when);
    b.append(preview, text);
    b.addEventListener("click", () => {
      tuning.skin = value;
      saveTuning();
      refresh();
    });
    list.append(b);
    choices.push({ value, el: b });
    return { el: b, when };
  };
  const today = skinForDate(new Date());
  const auto = addChoice(AUTO, "Auto", "", swatch(today));
  for (const skin of SKINS) addChoice(skin.id, skin.name, dateLabel(skin), swatch(skin));
  const skinAt = () => Math.max(0, choices.findIndex((c) => c.value === tuning.skin));
  radioKeys(
    list,
    choices.map((c) => c.el),
    skinAt,
    (i) => {
      tuning.skin = choices[i]!.value;
      saveTuning();
      refresh();
    },
  );

  // --- Game Center (the iOS app only) ---
  const gc = host.gameCenter;
  gcHeading.hidden = gcRow.hidden = !gc;
  /** A Sign in that GameKit answered without its sheet and without signing in: say where to go. */
  let askedAndRefused = false;
  const renderGameCenter = () => {
    if (!gc) return;
    const status = gc.status();
    const row = gameCenterRow(status, askedAndRefused);
    gcName.textContent = row.name;
    gcNote.textContent = row.note;
    gcAction.textContent = row.action;
    gcAction.disabled = status.busy || status.asking;
    gcAction.setAttribute("aria-label", status.authenticated ? "Leaderboard: see it in Game Center" : "Sign in to Game Center");
  };
  gcAction.addEventListener("click", () => {
    if (!gc) return;
    if (gc.status().authenticated) {
      gc.showLeaderboard();
      return;
    }
    askedAndRefused = false;
    renderGameCenter();
    void gc.signIn().then((status) => {
      askedAndRefused = !status.authenticated && !status.busy;
      renderGameCenter();
    });
  });

  const refresh = () => {
    renderGameCenter();
    auto.when.textContent = `Matches the date · today: ${skinForDate(new Date()).name}`;
    auto.el.setAttribute("aria-label", `Auto, matches the date; today: ${skinForDate(new Date()).name}`);
    tabOnlyChecked(
      choices.map((c) => c.el),
      skinAt(),
    );
    tabOnlyChecked(modeButtons, modeAt());
    tabOnlyChecked(motionButtons, motionAt());
    for (const sw of switches) sw.el.setAttribute("aria-checked", String(sw.on()));
  };

  // --- Footer ---
  rateButton.hidden = !host.rate;
  rateButton.addEventListener("click", () => host.rate?.());

  /** Where the focus goes back to when the sheet closes. */
  let opener: HTMLElement | null = null;
  const setOpen = (open: boolean) => {
    if (open === !backdrop.hidden) return;
    if (open) refresh();
    backdrop.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      sheet.scrollTop = 0;
      closeButton.focus({ preventScroll: true });
    } else {
      credits.close();
      onClose?.();
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  };

  button.addEventListener("click", () => {
    opener = button;
    setOpen(backdrop.hidden !== false);
  });
  closeButton.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) setOpen(false);
  });
  // Registered before the Credits sheet's own listener, so an Escape with Credits open closes
  // only Credits (this one sees it open and stands back), and the next one closes Settings.
  window.addEventListener("keydown", (e) => {
    if (backdrop.hidden !== false || credits.isOpen()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else trapTab(sheet, e);
  });
  const credits = createCredits();
  creditsButton.addEventListener("click", () => credits.open(creditsButton));

  document.body.append(button, backdrop);
  return {
    isOpen: () => backdrop.hidden === false || credits.isOpen(),
    refresh: renderGameCenter,
    open(from) {
      opener = from ?? null;
      setOpen(true);
    },
    close: () => setOpen(false),
    showButton(show) {
      button.hidden = !show;
    },
    setSkin(skin) {
      sheet.style.setProperty("--hl", skin.hud.accent);
      sheet.style.setProperty("--display", skin.hud.display);
      sheet.style.setProperty("--body", kitFor(skin).body);
      credits.setSkin(skin);
    },
  };
}
