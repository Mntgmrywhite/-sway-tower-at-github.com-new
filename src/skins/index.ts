import { christmas } from "./christmas";
import { classic } from "./classic";
import { halloween } from "./halloween";
import { july4 } from "./july4";
import { mardiGras } from "./mardigras";
import { neon } from "./neon";
import { neonCyber } from "./neon-cyber";
import { newYear } from "./newyear";
import { oktoberfest } from "./oktoberfest";
import type { Skin } from "./skin";
import { stPatricks } from "./stpatricks";
import { thanksgiving } from "./thanksgiving";
import { toyBlock } from "./toyblock";
import { valentines } from "./valentines";

/** Every skin, in picker order. Classic is always first and is the fallback. */
/** The holidays run in calendar order from the autumn: a season a player is in sits near the top. */
export const SKINS: Skin[] = [classic, toyBlock, neon, neonCyber, halloween, thanksgiving, christmas, newYear, mardiGras, valentines, stPatricks, july4, oktoberfest];

/** Skins that were retired, and the skin a saved choice of them now shows. */
const RETIRED: Record<string, string> = { "neon-glow": "neon", "neon-minimal": "neon" };

/** "auto" picks by date; anything else is a skin id. */
export const AUTO = "auto";

function inWindow(month: number, day: number, from: [number, number], to: [number, number]): boolean {
  const md = month * 100 + day;
  const a = from[0] * 100 + from[1];
  const b = to[0] * 100 + to[1];
  // Windows may wrap the new year (e.g. Dec 28 – Jan 6).
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}

/** The seasonal skin for a date, or Classic when no season matches. */
export function skinForDate(date: Date): Skin {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  for (const skin of SKINS) {
    const windows = skin.datesFor?.(year) ?? skin.dates;
    if (windows?.some((w) => inWindow(month, day, w.from, w.to))) return skin;
  }
  return classic;
}

/** Resolve a picker choice ("auto" or an id) to a skin. Unknown ids fall back to Classic. */
export function resolveSkin(choice: string, now: Date): Skin {
  if (choice === AUTO) return skinForDate(now);
  const id = RETIRED[choice] ?? choice;
  return SKINS.find((s) => s.id === id) ?? classic;
}
