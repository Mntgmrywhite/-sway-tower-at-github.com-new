import { christmas } from "./christmas";
import { halloween } from "./halloween";
import { neon } from "./neon";
import { newYear } from "./newyear";
import type { Skin } from "./skin";
import { thanksgiving } from "./thanksgiving";

/** Every skin, in picker order. The neon base is always first and is the fallback. */
export const SKINS: Skin[] = [neon, halloween, thanksgiving, christmas, newYear];

/** "auto" picks by date; anything else is a skin id. */
export const AUTO = "auto";

function inWindow(month: number, day: number, from: [number, number], to: [number, number]): boolean {
  const md = month * 100 + day;
  const a = from[0] * 100 + from[1];
  const b = to[0] * 100 + to[1];
  // Windows may wrap the new year (e.g. Dec 28 – Jan 6).
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}

/** The seasonal skin for a date, or the neon base when no season matches. */
export function skinForDate(date: Date): Skin {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  for (const skin of SKINS) {
    if (skin.dates?.some((w) => inWindow(month, day, w.from, w.to))) return skin;
  }
  return neon;
}

/** Resolve a picker choice ("auto" or an id) to a skin. Unknown ids fall back to the base. */
export function resolveSkin(choice: string, now: Date): Skin {
  if (choice === AUTO) return skinForDate(now);
  return SKINS.find((s) => s.id === choice) ?? neon;
}
