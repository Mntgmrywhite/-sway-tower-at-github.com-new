import manifest from "../../audio/music/manifest.json";
import type { Scene } from "../skin";

// New Year's Eve on a loop: the Times Tower counts the last minute down to midnight once per pass
// of the song. Pure timing, no drawing (marquee.ts draws the screen, landmarks.ts the clock and
// the ball, sky.ts the midnight finale).
//
// The owner: "The count should go back to a full minute how you had it first; the setup/payoff
// was much better." One cycle is one pass of the song's loop (its manifest entry: loop length and
// the cues countdownStart and midnight, written by scripts/music/songs/newyear.ts). Through it:
//  - the first START seconds: the screen reads "1:00" while the clock is set back to a minute to
//    midnight (its second hand sweeping on round to twelve, never back) and the ball goes back up
//    its mast;
//  - then the minute before midnight: the screen ticks the time left down ("0:59" … "0:11"), each
//    tick as the clock's second hand passes its mark, while the ball comes down its mast (as in
//    Times Square, it takes the whole minute);
//  - the last ten seconds: "10" … "1", big, with the crowd counting in the song;
//  - midnight: the ball lands, the clock's hands meet on twelve, the screen reads MIDNIGHT under
//    the grand finale (sky.ts), then HAPPY and the coming year until the song starts over.
// With music playing, the cycle is the song's position (Scene.songTime, as written), so the screen
// and the music can never part, tempo changes included. Without it (muted, not started yet, a
// hidden tab, an overlay holding the scene still while the music plays on) the same cycle runs on
// scene time. A tower's scene starts (s.t = 0: the title's fresh
// tower, or a new run) on the minute's first second, "1:00", and strikes midnight a minute later;
// main.ts cuts the song to the same place (audio.setMusic's sceneSync), so the two agree and
// turning the music off or on doesn't make the screen jump.

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
/** The minute counted down: the screen shows "1:00" this long before midnight. */
export const MINUTE = 60;
/** Where the cycle is as a tower's scene starts (s.t = 0): a minute to midnight. The seconds before
 *  it, at the top of the cycle, set the clock and the ball back for the next minute. */
export const START = MIDNIGHT - MINUTE;
/** MIDNIGHT shows this long after midnight; then HAPPY and the year until the cycle restarts. */
export const MIDNIGHT_SHOW = 4;

const mod = (x: number, n: number): number => ((x % n) + n) % n;

/** Where the cycle is (seconds, in [0, CYCLE)): the song's position, or scene time when silent. */
export function cycleTime(s: Scene): number {
  const song = s.songTime ?? NaN;
  return mod(Number.isFinite(song) ? song : START + s.t, CYCLE);
}

/**
 * Which pass of the cycle the scene is in, so each midnight's finale differs: on scene time, the
 * passes since the tower's start (0 for the first). With music, always 0: the song's position
 * tells one pass from another no better than a guess, and a guess could change mid-finale.
 */
export function cycleIndex(s: Scene): number {
  return Number.isFinite(s.songTime ?? NaN) ? 0 : Math.floor((START + s.t) / CYCLE);
}

/** The scene time (s.t, on scene time) of cycle time p in pass `pass` (0: the tower's first). */
export function sceneTimeOf(p: number, pass = 0): number {
  return pass * CYCLE + p - START;
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
  // Ticks down a second at a time; held on "1:00" from the top of the cycle, through the reset.
  const left = MIDNIGHT - p;
  const secs = Math.ceil(left);
  if (secs >= MINUTE) return { kind: "left", secs: MINUTE, into: p };
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

/** How far through the reset at the top of the cycle (0 → 1) cycle time p is. */
function reset(p: number): number {
  return START > 0 ? ease(p / START) : 1;
}

/**
 * The time the tower clock's hour and minute hands show at cycle time p, in seconds from midnight
 * (negative before it): a minute to midnight as the minute starts, running with the cycle through
 * midnight to the end of the cycle; during the reset it is set back from there to a minute to
 * midnight, smoothly, so the hands never jump.
 */
export function clockAt(p: number): number {
  if (p >= START) return p - MIDNIGHT;
  const from = CYCLE - MIDNIGHT;
  return from + (-MINUTE - from) * reset(p);
}

/**
 * Where the clock's second hand points at cycle time p (seconds, in [0, 60)): on twelve as the
 * minute starts, passing each mark as the screen's number for it comes up, on twelve again at
 * midnight, and running on to the end of the cycle; during the reset it sweeps on round to twelve,
 * never stopping or turning back.
 */
export function secondAt(p: number): number {
  if (p >= START) return mod(p - MIDNIGHT, 60);
  const from = CYCLE - MIDNIGHT;
  return mod(from + mod(-MINUTE - from, 60) * reset(p), 60);
}

/** How far down its mast the ball is at cycle time p: 0 at the top, 1 landed (midnight). */
export function ballAt(p: number): number {
  if (p >= MIDNIGHT) return 1;
  if (p >= START) return (p - START) / MINUTE;
  // Back up the mast during the reset.
  return 1 - reset(p);
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
