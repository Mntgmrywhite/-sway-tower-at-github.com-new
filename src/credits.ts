import "./credits.css";
import licensesText from "../public/font-licenses.txt?raw";
import { kitFor } from "./base/style";
import { FONT_FILES, FONT_LICENSES, loadFonts, type FontLicense } from "./fonts";
import { trapTab } from "./sheet";
import type { Skin } from "./skins/skin";

// The Credits sheet, from the Settings sheet's footer: whose game this is, what the music is made
// of (our own theme, arranged per skin and rendered from CC0 recordings, plus our own synth), and
// the fonts with their licenses. The OFL faces ask that their license text ship with the fonts, so
// "Font licenses" unfolds the bundled text (public/font-licenses.txt) in a scrolling panel. The
// content is plain data up top, so a test can check it names every library and every font.

/** Who made the game (shown as "by …"). */
export const AUTHOR = "Turk White";

export interface Library {
  name: string;
  /** What the game takes from it. */
  what: string;
}

/** The CC0 sample libraries the songs and effects are rendered from (~/APP/samples/PROVENANCE.json). */
export const LIBRARIES: readonly Library[] = [
  { name: "Versilian Community Sample Library (VCSL)", what: "saxophones, harmonica, recorder, harpsichord, mallets, bells, drums and percussion" },
  { name: "Versilian Studios Chamber Orchestra 2 Community Edition (VSCO 2 CE)", what: "French horn, trombone, tuba, trumpet, strings, woodwinds, timpani" },
  { name: "FreePats", what: "upright and honky-tonk pianos, Spanish guitar, ukulele, button accordion" },
  { name: "BigSoundBank (Joseph Sardin)", what: "crowds, corks and clinks, creaking doors, owls" },
  { name: "Kenney", what: "the landing, slice and miss sounds, clicks and jingles" },
];

/** The music, in a few lines (each a paragraph). */
export const MUSIC_NOTES: readonly string[] = [
  "Every skin's song is an arrangement of the game's own theme, a waltz in six-eight, played by real instruments: CC0 recordings from these libraries, tuned and rendered offline.",
  "The synth voices in Synthwave and Cyberpunk, Halloween's howls, hisses and chains, and the game-over boom come from our own synthesizer and drum machine.",
];

/** What the licenses are, in a line. */
export const FONT_NOTE = "Set in open fonts, each bundled under its license: the SIL Open Font License 1.1 or the Apache License 2.0.";

export interface FontCredit {
  family: string;
  license: FontLicense;
}

/** Every bundled font family with its license, alphabetically. */
export function fontCredits(): FontCredit[] {
  return Object.keys(FONT_FILES)
    .sort((a, b) => a.localeCompare(b))
    .map((family) => ({ family, license: FONT_LICENSES[family]! }));
}

/** The license text that ships with the fonts (public/font-licenses.txt). */
export function fontLicenseText(): string {
  return licensesText;
}

/** A license id as a player reads it. */
export function licenseName(license: FontLicense): string {
  return license === "OFL-1.1" ? "SIL Open Font License 1.1" : "Apache License 2.0";
}

export interface Credits {
  isOpen(): boolean;
  /** Open the sheet; the focus goes back to `from` when it closes. */
  open(from?: HTMLElement): void;
  close(): void;
  /** Fonts and highlight from the skin (the accent is the page's --accent, as for every sheet). */
  setSkin(skin: Skin): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

export function createCredits(): Credits {
  const backdrop = el("div");
  backdrop.id = "credits";
  backdrop.hidden = true;
  const sheet = el("div", "sheet");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "credits-title");

  const head = el("div", "head");
  const title = el("h2", "", "Credits");
  title.id = "credits-title";
  const close = el("button", "close", "✕");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  head.append(title, close);

  const game = el("section");
  game.append(el("h3", "", "Sway Tower"), el("p", "", `An original game: design, code, art and music by ${AUTHOR}.`));

  const music = el("section");
  music.append(el("h3", "", "Music"), el("p", "", MUSIC_NOTES[0]!));
  const libs = el("ul", "libraries");
  for (const lib of LIBRARIES) {
    const item = el("li");
    item.append(el("strong", "", lib.name), el("small", "", lib.what));
    libs.append(item);
  }
  music.append(libs, el("p", "", MUSIC_NOTES[1]!));

  const fonts = el("section");
  fonts.append(el("h3", "", "Fonts"));
  const faces = el("ul", "fonts");
  for (const f of fontCredits()) {
    const item = el("li");
    const name = el("span", "face", f.family);
    name.style.fontFamily = `'${f.family}', system-ui, sans-serif`;
    item.append(name, el("small", "", licenseName(f.license)));
    faces.append(item);
  }
  const unfold = el("button", "link", "Font licenses");
  unfold.type = "button";
  unfold.setAttribute("aria-expanded", "false");
  unfold.setAttribute("aria-controls", "credits-licenses");
  const licenses = el("div", "licenses");
  licenses.id = "credits-licenses";
  licenses.hidden = true;
  licenses.setAttribute("role", "region");
  licenses.setAttribute("aria-label", "Font licenses");
  licenses.tabIndex = -1;
  const text = el("pre", "", fontLicenseText());
  text.tabIndex = 0;
  licenses.append(text);
  fonts.append(faces, el("p", "", FONT_NOTE), unfold, licenses);

  sheet.append(head, game, music, fonts);
  backdrop.append(sheet);
  document.body.append(backdrop);

  let opener: HTMLElement | null = null;

  function setOpen(open: boolean): void {
    if (open === !backdrop.hidden) return;
    if (open) {
      // Each font's name is set in its own face: decode them all (inline data, nothing fetched).
      loadFonts(Object.keys(FONT_FILES));
      licenses.hidden = true;
      unfold.setAttribute("aria-expanded", "false");
      backdrop.hidden = false;
      sheet.scrollTop = 0;
      close.focus({ preventScroll: true });
    } else {
      backdrop.hidden = true;
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  }

  unfold.addEventListener("click", () => {
    const show = licenses.hidden;
    licenses.hidden = !show;
    unfold.setAttribute("aria-expanded", String(show));
    if (show) licenses.focus({ preventScroll: true });
  });
  close.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) setOpen(false);
  });
  window.addEventListener("keydown", (e) => {
    if (backdrop.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else trapTab(sheet, e);
  });

  return {
    isOpen: () => !backdrop.hidden,
    open(from) {
      opener = from ?? null;
      setOpen(true);
    },
    close: () => setOpen(false),
    setSkin(skin) {
      sheet.style.setProperty("--hl", skin.hud.accent);
      sheet.style.setProperty("--display", skin.hud.display);
      sheet.style.setProperty("--body", kitFor(skin).body);
    },
  };
}
