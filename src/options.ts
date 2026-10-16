import "./options.css";
import { audio } from "./audio/engine";
import { tuning } from "./config";
import type { Mode } from "./game";
import { saveTuning } from "./panel";
import { AUTO, SKINS, skinForDate } from "./skins";
import type { Skin } from "./skins/skin";

// Player-facing options: an Options button (top-left) that opens a sheet with the game mode
// (Normal / Hard), sound switches (music, effects) and a skin picker. Picking a skin applies it
// immediately behind the sheet; picking a mode starts a fresh run in it. Everything is saved on the
// device (main.ts owns the mode and its save).

/** The mode choices, in order, with a one-line summary each. */
const MODES: { value: Mode; title: string; sub: string }[] = [
  { value: "normal", title: "Normal", sub: "3 lives · overhangs slice off" },
  { value: "hard", title: "Hard", sub: "1 life · real balance · the music speeds up" },
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
  for (const bar of skin.bars.slice(0, 6)) {
    const chip = document.createElement("i");
    chip.style.setProperty("--c", bar.color);
    strip.append(chip);
  }
  return strip;
}

export interface Options {
  isOpen(): boolean;
  /** Open the sheet (the title screen's Skins button); the focus goes back to `from` on close. */
  open(from?: HTMLElement): void;
  /** Show or hide the Options button (the title screen has its own). */
  showButton(show: boolean): void;
}

/** The current mode, and switching it (which starts a fresh run). */
export interface ModeControl {
  mode(): Mode;
  setMode(mode: Mode): void;
}

/** `onClose` runs when the sheet closes (the title screen re-reads the mode and the sound). */
export function createOptions(modes: ModeControl, onClose?: () => void): Options {
  const button = document.createElement("button");
  button.id = "options-toggle";
  button.type = "button";
  button.setAttribute("aria-label", "Options");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.4-.9.2-1.9 1.2-1.9H16a5 5 0 0 0 5-5c0-4.1-4-7.3-9-7.3z"
      fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="7.5" cy="11" r="1.4" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.4" fill="currentColor"/>
    <circle cx="15" cy="7.8" r="1.4" fill="currentColor"/><circle cx="17.6" cy="11.6" r="1.4" fill="currentColor"/>
  </svg>`;

  const backdrop = document.createElement("div");
  backdrop.id = "options";
  backdrop.hidden = true;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "options-title");
  sheet.innerHTML = `
    <div class="head">
      <h2 id="options-title">Options</h2>
      <button type="button" class="close" aria-label="Close">✕</button>
    </div>
    <h3>Mode</h3>
    <div class="modes" role="radiogroup" aria-label="Mode"></div>
    <h3>Sound</h3>
    <div class="toggles"></div>
    <h3>Skins</h3>
    <div class="list" role="radiogroup" aria-label="Skin"></div>`;
  backdrop.append(sheet);
  const list = sheet.querySelector<HTMLElement>(".list")!;
  const toggles = sheet.querySelector<HTMLElement>(".toggles")!;
  const modeList = sheet.querySelector<HTMLElement>(".modes")!;

  const modeChoices: { value: Mode; el: HTMLButtonElement }[] = [];
  for (const m of MODES) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "choice mode";
    el.setAttribute("role", "radio");
    const text = document.createElement("span");
    text.className = "text";
    const name = document.createElement("strong");
    name.textContent = m.title;
    const sub = document.createElement("small");
    sub.textContent = m.sub;
    text.append(name, sub);
    el.append(text);
    el.addEventListener("click", () => {
      modes.setMode(m.value);
      refresh();
    });
    modeList.append(el);
    modeChoices.push({ value: m.value, el });
  }

  const switches: { el: HTMLButtonElement; on: () => boolean }[] = [];
  const addSwitch = (label: string, on: () => boolean, set: (on: boolean) => void) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "toggle";
    el.setAttribute("role", "switch");
    el.textContent = label;
    el.addEventListener("click", () => {
      audio.unlock();
      set(!on());
      refresh();
    });
    toggles.append(el);
    switches.push({ el, on });
  };
  addSwitch("Music", () => audio.settings.music, (on) => audio.setMusicOn(on));
  addSwitch("Effects", () => audio.settings.sfx, (on) => audio.setSfxOn(on));

  const choices: { value: string; el: HTMLButtonElement }[] = [];
  const addChoice = (value: string, title: string, sub: string, preview: HTMLElement) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "choice";
    el.setAttribute("role", "radio");
    const text = document.createElement("span");
    text.className = "text";
    const name = document.createElement("strong");
    name.textContent = title;
    const when = document.createElement("small");
    when.textContent = sub;
    text.append(name, when);
    el.append(preview, text);
    el.addEventListener("click", () => {
      tuning.skin = value;
      saveTuning();
      refresh();
    });
    list.append(el);
    choices.push({ value, el });
    return { el, when };
  };

  const today = skinForDate(new Date());
  const auto = addChoice(AUTO, "Auto", "", swatch(today));
  for (const skin of SKINS) addChoice(skin.id, skin.name, dateLabel(skin), swatch(skin));

  const refresh = () => {
    auto.when.textContent = `Matches the date · today: ${skinForDate(new Date()).name}`;
    for (const c of choices) c.el.setAttribute("aria-checked", String(c.value === tuning.skin));
    for (const c of modeChoices) c.el.setAttribute("aria-checked", String(c.value === modes.mode()));
    for (const sw of switches) sw.el.setAttribute("aria-checked", String(sw.on()));
  };

  /** Where the focus goes back to when the sheet closes. */
  let opener: HTMLElement | null = null;
  const setOpen = (open: boolean) => {
    if (open === !backdrop.hidden) return;
    if (open) refresh();
    backdrop.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) choices.find((c) => c.value === tuning.skin)?.el.focus();
    else {
      onClose?.();
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  };

  button.addEventListener("click", () => setOpen(backdrop.hidden !== false));
  sheet.querySelector(".close")!.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) setOpen(false);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.hidden === false) setOpen(false);
  });

  document.body.append(button, backdrop);
  return {
    isOpen: () => backdrop.hidden === false,
    open(from) {
      opener = from ?? null;
      setOpen(true);
    },
    showButton(show) {
      button.hidden = !show;
    },
  };
}
