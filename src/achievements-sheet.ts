import "./achievements.css";
import {
  ACHIEVEMENTS,
  PERFECT_MEDALS,
  STACK_MEDALS,
  earnedCount,
  nextMedal,
  type Achievement,
  type AchievementSave,
  type MedalKind,
} from "./achievements";
import { kitFor } from "./base/style";
import { medalSvg } from "./medals";
import type { Skin } from "./skins/skin";

// The Achievements screen, opened from the title's Medals button: a sheet in the Options sheet's
// look (dark glass, the skin's accent), with the best stack and best perfect streak as progress
// toward the next medal, and every medal in a grid, earned (in its metal, with the mode that
// earned it first) or locked (an outline with its goal). Medals earned since the last visit are
// marked NEW here and counted on the button. Also a polite live region that reads out the medals
// a run earned when the game-over card comes up (the card itself is canvas).

/** One line per kind for the progress tiles and the grid headings. */
const KINDS: Record<MedalKind, { heading: string; best: string; unit: (n: number) => string; list: readonly Achievement[] }> = {
  stack: { heading: "Stack height", best: "Best stack", unit: (n) => `${n} ${n === 1 ? "bar" : "bars"}`, list: STACK_MEDALS },
  perfect: { heading: "Perfect streaks", best: "Best perfect streak", unit: (n) => `${n} in a row`, list: PERFECT_MEDALS },
};

/** What the player calls each mode (the saves keep the ids "normal" and "hard"). */
const MODE_NAMES = { normal: "Slide", hard: "Drop" } as const;

/** The title's button icon: a medal on a ribbon (24×24, currentColor). */
export const MEDAL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.5 2h4.6l3.4 7.4H8.9zM18.5 2h-4.6l-3.4 7.4h4.6z" fill="currentColor" opacity="0.75"/>
  <circle cx="12" cy="15.2" r="6.3" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 11.9l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill="currentColor"/>
</svg>`;

/** What the screen needs from the game. */
export interface AchievementsHost {
  /** The current save (read on every open). */
  save(): AchievementSave;
  /** The screen was opened: clear the NEW marks and save. */
  seen(): void;
}

export interface AchievementsSheet {
  isOpen(): boolean;
  /** Open the screen; the focus goes back to `from` when it closes. */
  open(from?: HTMLElement): void;
  close(): void;
  /** Fonts and highlight from the skin (the accent is the page's --accent, as for Options). */
  setSkin(skin: Skin): void;
  /** The title's Medals button: its NEW count and accessible name follow the save. */
  bindButton(button: HTMLButtonElement): void;
  /** Re-read the save for the button (after a run earned medals). */
  refresh(): void;
  /** Read out a run's new medals (the game-over card is canvas). */
  announce(medals: readonly Achievement[]): void;
}

/** "New medal: Stack 25." / "3 new medals: Stack 5, Stack 10 and Perfect ×3." */
export function announcement(medals: readonly Achievement[]): string {
  if (medals.length === 0) return "";
  const names = medals.map((a) => a.name);
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return medals.length === 1 ? `New medal: ${list}.` : `${medals.length} new medals: ${list}.`;
}

/** The progress toward a kind's next medal, for its tile. */
export interface Progress {
  label: string;
  best: number;
  /** The next goal, or null when the whole ladder is earned. */
  next: Achievement | null;
  /** 0..1: the best against the next goal (1 when done). */
  fraction: number;
  /** "Next: Stack 40" or "All 20 earned". */
  caption: string;
  /** What a screen reader hears for the bar. */
  valueText: string;
}

export function progress(save: AchievementSave, kind: MedalKind): Progress {
  const k = KINDS[kind];
  const best = kind === "stack" ? save.best.stack : save.best.streak;
  const next = nextMedal(save, kind);
  if (!next) {
    return { label: k.best, best, next, fraction: 1, caption: `All ${k.list.length} earned`, valueText: `${k.unit(best)}: every medal earned` };
  }
  return {
    label: k.best,
    best,
    next,
    fraction: Math.min(1, best / next.goal),
    caption: `Next: ${next.name}`,
    valueText: `${best} of ${k.unit(next.goal)}, for ${next.name}`,
  };
}

/** A grid cell's text for screen readers: name, state, and what it takes when locked. */
export function medalLabel(a: Achievement, save: AchievementSave): string {
  const e = save.earned[a.id];
  if (!e) return `${a.name}, locked: ${a.description}.`;
  const fresh = save.fresh.includes(a.id) ? ", new" : "";
  return `${a.name}, earned in ${MODE_NAMES[e.mode]}${fresh}.`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

export function createAchievements(host: AchievementsHost): AchievementsSheet {
  const backdrop = el("div");
  backdrop.id = "achievements";
  backdrop.hidden = true;
  const sheet = el("div", "sheet");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "achievements-title");
  sheet.setAttribute("aria-describedby", "achievements-count");

  const head = el("div", "head");
  const title = el("h2", "", "Achievements");
  title.id = "achievements-title";
  const close = el("button", "close", "✕");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  head.append(title, close);

  const count = el("p", "count");
  count.id = "achievements-count";
  const tiles = el("div", "progress");
  const grids = el("div", "grids");
  sheet.append(head, count, tiles, grids);
  backdrop.append(sheet);

  // Reads out a run's new medals; separate from the sheet so it works while the sheet is closed.
  const live = el("div", "achievements-live");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");

  document.body.append(backdrop, live);

  let button: HTMLButtonElement | null = null;
  let opener: HTMLElement | null = null;

  function renderTiles(save: AchievementSave): void {
    tiles.replaceChildren(
      ...(["stack", "perfect"] as const).map((kind) => {
        const p = progress(save, kind);
        const tile = el("div", "tile");
        const label = el("span", "label", p.label);
        label.id = `achievements-best-${kind}`;
        const value = el("strong", "value", String(p.best));
        const bar = el("div", "bar");
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-labelledby", label.id);
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", String(p.next?.goal ?? p.best));
        bar.setAttribute("aria-valuenow", String(Math.min(p.best, p.next?.goal ?? p.best)));
        bar.setAttribute("aria-valuetext", p.valueText);
        const fill = el("i");
        fill.style.width = `${(p.fraction * 100).toFixed(1)}%`;
        bar.append(fill);
        tile.append(label, value, bar, el("small", "next", p.caption));
        tile.dataset.done = String(!p.next);
        return tile;
      }),
    );
  }

  function renderGrids(save: AchievementSave): void {
    grids.replaceChildren(
      ...(["stack", "perfect"] as const).flatMap((kind) => {
        const k = KINDS[kind];
        const heading = el("h3", "", k.heading);
        heading.id = `achievements-${kind}`;
        const earned = k.list.filter((a) => save.earned[a.id]).length;
        heading.append(el("span", "of", `${earned} / ${k.list.length}`));
        const list = el("ul", "medals");
        list.setAttribute("aria-labelledby", heading.id);
        for (const a of k.list) {
          const e = save.earned[a.id];
          const item = el("li", e ? "earned" : "locked");
          item.dataset.id = a.id;
          if (e && save.fresh.includes(a.id)) item.classList.add("new");
          item.innerHTML = medalSvg(a, Boolean(e));
          item.append(el("span", "sr-only", medalLabel(a, save)));
          const tag = el("span", "tag", e ? MODE_NAMES[e.mode] : "");
          tag.setAttribute("aria-hidden", "true");
          if (e) tag.dataset.mode = e.mode;
          item.append(tag);
          if (item.classList.contains("new")) {
            const badge = el("span", "badge", "New");
            badge.setAttribute("aria-hidden", "true");
            item.append(badge);
          }
          list.append(item);
        }
        return [heading, list];
      }),
    );
  }

  function refreshButton(save: AchievementSave): void {
    if (!button) return;
    const fresh = save.fresh.filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length;
    // The accessible name starts with the caption ("Medals"), so voice control finds it.
    button.setAttribute("aria-label", fresh > 0 ? `Medals: achievements, ${fresh} new` : "Medals: achievements");
    if (fresh > 0) button.dataset.new = fresh > 9 ? "9+" : String(fresh);
    else delete button.dataset.new;
  }

  function setOpen(open: boolean): void {
    if (open === !backdrop.hidden) return;
    if (open) {
      const save = host.save();
      count.textContent = `${earnedCount(save)} of ${ACHIEVEMENTS.length} earned`;
      renderTiles(save);
      renderGrids(save);
      backdrop.hidden = false;
      sheet.scrollTop = 0;
      close.focus({ preventScroll: true });
      // Shown as NEW this once; the button's count clears now.
      host.seen();
      refreshButton(host.save());
    } else {
      backdrop.hidden = true;
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  }

  close.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) setOpen(false);
  });
  window.addEventListener("keydown", (e) => {
    if (backdrop.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      // A modal: the focus stays in the sheet, whose only control is Close (the arrows scroll).
      e.preventDefault();
      close.focus();
    }
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
    bindButton(b) {
      button = b;
      refreshButton(host.save());
    },
    refresh: () => refreshButton(host.save()),
    announce(medals) {
      // Cleared first, so the same words read out again after another run.
      live.textContent = "";
      const text = announcement(medals);
      if (text) setTimeout(() => (live.textContent = text), 50);
    },
  };
}
