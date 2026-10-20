// Shared bits of the DOM sheets (Settings, Credits, Medals): what can take the focus in one, a
// Tab that stays inside it (an open sheet is modal), and arrow keys for a row of radio buttons.

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The controls in `root` that can take the focus now (hidden ones left out), in order. */
export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hidden && el.closest("[hidden]") === null);
}

/** On Tab (or Shift+Tab) at an end of the sheet's controls, wrap to the other end. */
export function trapTab(root: HTMLElement, e: KeyboardEvent): void {
  if (e.key !== "Tab") return;
  const items = focusables(root);
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Radio-group keys for a row of `role="radio"` buttons: the arrows move the choice (and the focus)
 * to the next or previous one, wrapping. `pick` applies a choice; `checked` says which is on.
 */
export function radioKeys(group: HTMLElement, buttons: readonly HTMLButtonElement[], checked: () => number, pick: (i: number) => void): void {
  group.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step || buttons.length === 0) return;
    e.preventDefault();
    const shown = buttons.filter((b) => !b.hidden);
    const at = Math.max(0, shown.indexOf(buttons[checked()] ?? shown[0]!));
    const next = shown[(at + step + shown.length) % shown.length]!;
    pick(buttons.indexOf(next));
    next.focus();
  });
}

/** Only the checked radio of a group is in the Tab order; the arrows reach the rest. */
export function tabOnlyChecked(buttons: readonly HTMLButtonElement[], checked: number): void {
  buttons.forEach((b, i) => {
    b.setAttribute("aria-checked", String(i === checked));
    b.tabIndex = i === checked ? 0 : -1;
  });
}
