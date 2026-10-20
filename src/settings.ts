// Player settings the Settings sheet (src/options.ts) edits beyond the mode, the sound and the
// skin: whether haptics play, and how much motion the game shows. Saved under a `sway-stack:*`
// key, so the iOS app mirrors it like every other save (src/storage.ts). A damaged save keeps its
// valid parts; anything else is the default.
//
// Motion: "auto" follows the device (prefers-reduced-motion), "on" always reduces, "off" never.
// Reduced motion means no scene shake and no screen-wide flash at the game-over blast, the
// medals already in place on the card, and no sheet fade or rise. main.ts resolves the choice
// each frame and marks the page (applyMotion), which the sheets' CSS reads; the renderer gets it
// as RenderOptions.still.

/** Reduce motion: follow the device, always, or never. */
export type MotionChoice = "auto" | "on" | "off";

export const MOTION_CHOICES: readonly MotionChoice[] = ["auto", "on", "off"];

export interface Settings {
  /** The Taptic Engine (or the phone's vibration) plays the perfect and blast cues. */
  haptics: boolean;
  motion: MotionChoice;
}

export const SETTINGS_KEY = "sway-stack:settings";

export const DEFAULT_SETTINGS: Readonly<Settings> = { haptics: true, motion: "auto" };

/** The bits of Storage used here (localStorage in the game, a fake in tests). */
export type KeyValue = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or null where even touching it throws (some private modes). */
function local(): KeyValue | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isMotion(v: unknown): v is MotionChoice {
  return typeof v === "string" && (MOTION_CHOICES as readonly string[]).includes(v);
}

/** The settings a saved string holds: each valid field, the defaults for the rest. */
export function parseSettings(raw: string | null): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!raw) return out;
  try {
    const saved = JSON.parse(raw) as unknown;
    if (!saved || typeof saved !== "object") return out;
    const s = saved as Record<string, unknown>;
    if (typeof s.haptics === "boolean") out.haptics = s.haptics;
    if (isMotion(s.motion)) out.motion = s.motion;
  } catch {
    // Not JSON: the defaults.
  }
  return out;
}

export function loadSettings(store: KeyValue | null = local()): Settings {
  try {
    return parseSettings(store?.getItem(SETTINGS_KEY) ?? null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** The live settings: the sheet edits them in place and saves (like `tuning`). */
export const settings: Settings = loadSettings();

export function saveSettings(s: Settings = settings, store: KeyValue | null = local()): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify({ haptics: s.haptics, motion: s.motion }));
  } catch {
    // Storage blocked or full: the settings hold for this session.
  }
}

/** Whether motion is reduced now: the choice, or the device's preference on "auto". */
export function reduceMotion(choice: MotionChoice, devicePrefers: boolean): boolean {
  return choice === "auto" ? devicePrefers : choice === "on";
}

/** The page's motion mark, which the sheets' CSS reads (`:root[data-motion="reduce"]`). */
export function applyMotion(reduce: boolean, root: { dataset: DOMStringMap } = document.documentElement): void {
  root.dataset.motion = reduce ? "reduce" : "full";
}
