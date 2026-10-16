import "./panel.css";
import { DEFAULT_TUNING, resetTuning, tuning, type Tuning } from "./config";
import { AUTO, SKINS } from "./skins";

// Original working name kept on purpose: renaming the key would drop saved settings.
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
  { key: "perfectCalm", label: "Perfect calm", min: 0, max: 1, step: 0.1, unit: "" },
];

/** Balance mechanic: lean, topple, rebuild-when-calm, gusts. */
const BALANCE_SLIDERS: Slider[] = [
  { key: "leanGain", label: "Lean per drift", min: 0, max: 4, step: 0.1, unit: "×" },
  { key: "leanSway", label: "Lean adds sway", min: 0, max: 2, step: 0.1, unit: "×" },
  { key: "toppleLimit", label: "Topple limit", min: 10, max: 60, step: 1, unit: "" },
  { key: "thinTippy", label: "Thin tops tippier", min: 0, max: 0.9, step: 0.05, unit: "" },
  { key: "teeterTime", label: "Teeter time", min: 0.1, max: 2, step: 0.05, unit: "s" },
  { key: "teeterSlowmo", label: "Teeter slow-mo", min: 0.2, max: 1, step: 0.05, unit: "×" },
  { key: "perfectSteady", label: "Perfect steadies", min: 0, max: 1, step: 0.1, unit: "" },
  { key: "perfectBrace", label: "Perfect catch", min: 0, max: 1, step: 0.1, unit: "" },
  { key: "regrowCalm", label: "Calm enough to rebuild", min: 0, max: 15, step: 0.5, unit: "" },
  { key: "gustPush", label: "Gust strength", min: 0, max: 20, step: 1, unit: "" },
];
const ALL_SLIDERS = [...SLIDERS, ...BALANCE_SLIDERS];

type BoolKey = { [K in keyof Tuning]: Tuning[K] extends boolean ? K : never }[keyof Tuning];
const BALANCE_SWITCHES: { key: BoolKey; label: string }[] = [
  { key: "leanOn", label: "Lean" },
  { key: "toppleOn", label: "Topple" },
  { key: "lastChance", label: "Last chance" },
  { key: "regrowNeedsCalm", label: "Rebuild needs calm" },
  { key: "gustsOn", label: "Gusts" },
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

/** Persist the current tuning (shared with the options sheet). */
export function saveTuning(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
  } catch {
    // Storage blocked; values just won't persist.
  }
}

function format(v: number, s: Slider): string {
  const digits = s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0;
  return v.toFixed(digits) + s.unit;
}

function sliderRow(s: Slider): string {
  return `
      <label>
        <span class="row"><span>${s.label}</span><span class="val" data-val="${s.key}"></span></span>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" />
      </label>`;
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
    <label class="pick">
      <span>Skin</span>
      <select data-key="skin">
        <option value="${AUTO}">Auto (by date)</option>
        ${SKINS.map((k) => `<option value="${k.id}">${k.name}</option>`).join("")}
      </select>
    </label>
    <label class="check"><input type="checkbox" data-key="swayOn" /> Sway on</label>
    ${SLIDERS.map(sliderRow).join("")}
    <h3>Balance</h3>
    <div class="checks">
      ${BALANCE_SWITCHES.map((b) => `<label class="check"><input type="checkbox" data-key="${b.key}" /> ${b.label}</label>`).join("")}
    </div>
    ${BALANCE_SLIDERS.map(sliderRow).join("")}
    <div class="buttons">
      <button type="button" data-action="reset">Defaults</button>
      <button type="button" data-action="copy">Copy</button>
      <button type="button" class="primary" data-action="restart">Restart</button>
    </div>`;

  const boxes = (["swayOn", ...BALANCE_SWITCHES.map((b) => b.key)] as BoolKey[]).map(
    (key) => [key, panel.querySelector<HTMLInputElement>(`input[data-key="${key}"]`)!] as const,
  );

  const skinPick = panel.querySelector<HTMLSelectElement>('select[data-key="skin"]')!;

  const sync = () => {
    skinPick.value = tuning.skin;
    for (const [key, box] of boxes) box.checked = tuning[key];
    for (const s of ALL_SLIDERS) {
      panel.querySelector<HTMLInputElement>(`input[data-key="${s.key}"]`)!.value = String(tuning[s.key]);
      panel.querySelector(`[data-val="${s.key}"]`)!.textContent = format(tuning[s.key], s);
    }
  };

  skinPick.addEventListener("change", () => {
    tuning.skin = skinPick.value;
    saveTuning();
  });
  for (const [key, box] of boxes) {
    box.addEventListener("change", () => {
      tuning[key] = box.checked;
      saveTuning();
    });
  }
  for (const s of ALL_SLIDERS) {
    const input = panel.querySelector<HTMLInputElement>(`input[data-key="${s.key}"]`)!;
    input.addEventListener("input", () => {
      tuning[s.key] = Number(input.value);
      panel.querySelector(`[data-val="${s.key}"]`)!.textContent = format(tuning[s.key], s);
      saveTuning();
    });
  }

  const setOpen = (open: boolean) => {
    if (open) sync(); // another control (the options sheet) may have changed values
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden !== false));
  panel.addEventListener("click", (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "reset") {
      resetTuning();
      saveTuning();
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
