import manifest from "../../audio/music/manifest.json";
import type { Scene } from "../skin";

// New Year's Eve on a loop: the Times Tower counts down to midnight once per pass of the song.
// Pure timing, no drawing (marquee.ts draws the screen, landmarks.ts the clock and the ball).
//
// One cycle is one pass of the song's loop (its manifest entry: loop length and the cues
// countdownStart and midnight, written by scripts/music/songs/newyear.ts). Through it:
//  - the first RESET seconds: the clock's hands spin back to one minute to midnight and the ball
//    goes back up its mast, while the screen reads "1:00";
//  - then the minute before midnight: the screen ticks the time left down ("0:59" … "0:11"), the
//    ball comes down its mast (as in Times Square, it takes the whole minute) and the clock runs;
//  - the last ten seconds: "10" … "1", big, with the crowd counting in the song;
//  - midnight: the ball lands, the clock's hands meet on twelve, the screen reads MIDNIGHT, then
//    HAPPY and the coming year until the song starts over.
// With music playing, the cycle is the song's position (Scene.songTime, as written); without it
// (muted, not started yet, a hidden tab) the same cycle runs on scene time, so it always counts.

interface SongEntry {
  sr?: number;
  L?: number;
  cues?: { countdownStart?: number; midnight?: number };
}

const SONG = (manifest as Record<string, SongEntry>).newyear;

/** Seconds into the cycle when the screen shows "10", and midnight (the song's cues). */
export const COUNT_FROM = SONG?.cues?.countdownStart ?? 52;
export const MIDNIGHT = SONG?.cues?.midnight ?? 62;
/** One cycle: the song's loop (L frames at sr), else the length it was written at. */
export const CYCLE = SONG?.L && SONG.sr ? SONG.L / SONG.sr : 82;
/** Whole seconds counted down big: "10" through "1". */
export const COUNT = Math.round(MIDNIGHT - COUNT_FROM);

/** Seconds at the top of each cycle for the clock to spin back and the ball to go back up. */
export const RESET = 2;
/** The ball comes down over the last minute (Times Square's drop), or from the end of the reset. */
export const DROP_FROM = Math.max(RESET, MIDNIGHT - 60);
/** MIDNIGHT shows this long after midnight; then HAPPY and the year until the cycle restarts. */
export const MIDNIGHT_SHOW = 4;

/** Where the cycle is (seconds, in [0, CYCLE)): the song's position, or scene time when silent. */
export function cycleTime(s: Scene): number {
  const song = s.songTime ?? NaN;
  const p = Number.isFinite(song) ? song : s.t;
  return ((p % CYCLE) + CYCLE) % CYCLE;
}

/** What the screen shows. `into` is seconds since this reading started. */
export type Reading =
  /** Whole seconds left to midnight, shown as m:ss ("0:52"). */
  | { kind: "left"; secs: number; into: number }
  /** The last ten seconds, big: "10" … "1". */
  | { kind: "count"; n: number; into: number }
  | { kind: "midnight"; into: number }
  | { kind: "year"; into: number };

/** The screen at cycle time p. */
export function readingAt(p: number): Reading {
  if (p >= MIDNIGHT) {
    const m = p - MIDNIGHT;
    return m < MIDNIGHT_SHOW ? { kind: "midnight", into: m } : { kind: "year", into: m - MIDNIGHT_SHOW };
  }
  if (p >= COUNT_FROM) {
    const t = p - COUNT_FROM;
    return { kind: "count", n: COUNT - Math.floor(t), into: t - Math.floor(t) };
  }
  // Ticks down a second at a time; held at the drop's start while the clock is being reset.
  const left = MIDNIGHT - p;
  const secs = Math.ceil(left);
  const cap = Math.ceil(MIDNIGHT - DROP_FROM);
  if (secs >= cap) return { kind: "left", secs: cap, into: p };
  return { kind: "left", secs, into: secs - left };
}

/** "m:ss", as the screen shows the time left. */
export function formatLeft(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

function ease(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/**
 * The tower clock's time at cycle time p, in seconds from midnight (negative before it). It runs
 * with the cycle from the end of the reset (one minute to midnight) through midnight to the end of
 * the cycle; during the reset it spins back from there to one minute to midnight, so the hands
 * never jump.
 */
export function clockAt(p: number): number {
  if (p >= DROP_FROM) return p - MIDNIGHT;
  const from = CYCLE - MIDNIGHT;
  const to = DROP_FROM - MIDNIGHT;
  return from + (to - from) * ease(p / DROP_FROM);
}

/** How far down its mast the ball is at cycle time p: 0 at the top, 1 landed (midnight). */
export function ballAt(p: number): number {
  if (p >= MIDNIGHT) return 1;
  if (p >= DROP_FROM) return (p - DROP_FROM) / (MIDNIGHT - DROP_FROM);
  // Back up the mast during the reset.
  return 1 - ease(p / DROP_FROM);
}

/** The New Year's season's last day (month, day): the skin's dates end here. */
export const SEASON_END: [number, number] = [1, 6];

/**
 * The year the New Year's season leads into, on `date`: the coming January 1st, or (from New
 * Year's Day through the season's last day) the one just past.
 */
export function comingYear(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const [em, ed] = SEASON_END;
  return m < em || (m === em && d <= ed) ? y : y + 1;
}

/** Previews and tests (run without a browser) greet the year of this New Year's Eve, so they
 *  draw the same whatever day they run. */
const PREVIEW_EVE = new Date(2026, 11, 31);

/** The year the screen greets: in the game, from the date it loads on (drawing never reads the
 *  clock); in previews and tests, PREVIEW_EVE's. */
export const YEAR = comingYear(typeof document === "undefined" ? PREVIEW_EVE : new Date());
