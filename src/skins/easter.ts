import type { DateWindow } from "./skin";

// Movable feasts: Easter Sunday (Gregorian calendar, the Meeus/Jones/Butcher algorithm) and the
// days counted from it. Mardi Gras (Fat Tuesday) falls 47 days before Easter, so its season moves
// every year: the skin's `datesFor` (src/skins/skin.ts) computes the windows for the year asked.

/** Easter Sunday of `year`, at local noon. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

/** Fat Tuesday of `year`: 47 days before Easter, at local noon. */
export function mardiGras(year: number): Date {
  const easter = easterSunday(year);
  return new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 47, 12);
}

/** Mardi Gras's season runs this many days, ending on Fat Tuesday (the Thursday before, through the day). */
export const MARDI_GRAS_DAYS = 6;

/**
 * The season's windows for `year`: MARDI_GRAS_DAYS days up to and including Fat Tuesday, less
 * February 14, which stays Valentine's (so the season may come as two windows).
 */
export function mardiGrasWindows(year: number): DateWindow[] {
  const end = mardiGras(year);
  const out: DateWindow[] = [];
  for (let i = MARDI_GRAS_DAYS - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i, 12);
    if (d.getMonth() === 1 && d.getDate() === 14) continue;
    const md: [number, number] = [d.getMonth() + 1, d.getDate()];
    const last = out[out.length - 1];
    if (last && isNextDay(year, last.to, md)) last.to = md;
    else out.push({ from: md, to: md });
  }
  return out;
}

function isNextDay(year: number, a: [number, number], b: [number, number]): boolean {
  const next = new Date(year, a[0] - 1, a[1] + 1, 12);
  return next.getMonth() + 1 === b[0] && next.getDate() === b[1];
}
