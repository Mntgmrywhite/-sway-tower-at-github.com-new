import "./panel.css";
import { DEFAULT_TUNING, resetTuning, tuning, type Tuning } from "./config";

const STORAGE_KEY = "sway-stack:tuning";

type NumberKey = { [K in keyof Tuning]: Tuning[K] extends number ? K : never }[keyof Tuning];

interface Slider {
  key: NumberKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const SLIDERS: Slider[] = [
  { key: "swayBase", label: "Base sway", min: 0, max: 40, step: 1, unit: "" },
  { key: "swayPeriod", label: "Sway period", min: 0.8, max: 6, step: 0.1, unit: "s" },
  { key: "kickPerUnit", label: "Kick strength", min: 0, max: 4, step: 0.1, unit: "×" },
  { key: "kickDecay", label: "Kick decay", min: 0.1, max: 3, step: 0.1, unit: "/s" },
  { key: "slideSpeed", label: "Slider speed", min: 20, max: 200, step: 5, unit: "" },
];

function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Tuning>;
    for (const k of Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]) {
      if (typeof saved[k] === typeof DEFAULT_TUNING[k]) Object.assign(tuning, { [k]: saved[k] });
    }
  } catch {
    // Corrupt or blocked storage: keep defaults.
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
  } catch {
    // Storage blocked; values just won't persist.
  }
}

function format(v: number, s: Slider): string {
  return (s.step < 1 ? v.toFixed(1) : String(v)) + s.unit;
}

export interface Panel {
  isOpen(): boolean;
}

/** Builds the tuning panel. `onRestart` starts a fresh game. */
export function createPanel(onRestart: () => void): Panel {
  load();

  const toggle = document.createElement("button");
  toggle.id = "tuning-toggle";
  toggle.type = "button";
  toggle.textContent = "⚙";
  toggle.setAttribute("aria-label", "Tuning");
  toggle.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.id = "tuning";
  panel.hidden = true;
  panel.innerHTML = `
    <h2>Tuning</h2>
    <p class="note">Game pauses while open. Values are saved on this device.</p>
    <label class="check"><input type="checkbox" data-key="swayOn" /> Sway on</label>
    ${SLIDERS.map(
      (s) => `
      <label>
        <span class="row"><span>${s.label}</span><span class="val" data-val="${s.key}"></span></span>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" />
      </label>`,
    ).join("")}
    <div class="buttons">
      <button type="button" data-action="reset">Defaults</button>
      <button type="button" data-action="copy">Copy</button>
      <button type="button" class="primary" data-action="restart">Restart</button>
    </div>`;

  const swayBox = panel.querySelector<HTMLInputElement>('input[data-key="swayOn"]')!;

  const sync = () => {
    swayBox.checked = tuning.swayOn;
    for (const s of SLIDERS) {
      panel.querySelector<HTMLInputElement>(`input[data-key="${s.key}"]`)!.value = String(tuning[s.key]);
      panel.querySelector(`[data-val="${s.key}"]`)!.textContent = format(tuning[s.key], s);
    }
  };

  swayBox.addEventListener("change", () => {
    tuning.swayOn = swayBox.checked;
    save();
  });
  for (const s of SLIDERS) {
    const input = panel.querySelector<HTMLInputElement>(`input[data-key="${s.key}"]`)!;
    input.addEventListener("input", () => {
      tuning[s.key] = Number(input.value);
      panel.querySelector(`[data-val="${s.key}"]`)!.textContent = format(tuning[s.key], s);
      save();
    });
  }

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden !== false));
  panel.addEventListener("click", (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "reset") {
      resetTuning();
      save();
      sync();
    } else if (action === "copy") {
      // Handy for pasting settings back into chat after a playtest.
      void navigator.clipboard?.writeText(JSON.stringify(tuning)).catch(() => {});
    } else if (action === "restart") {
      onRestart();
      setOpen(false);
    }
  });

  sync();
  document.body.append(toggle, panel);
  return { isOpen: () => panel.hidden === false };
}
