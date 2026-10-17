import type { Scene } from "../skin";

// New Year's Eve on a loop: the Times Tower counts down to midnight once a minute, on the
// tower's own scene clock. Pure timing, no drawing (marquee.ts draws the screen, landmarks.ts
// the clock and the ball, sky.ts the midnight fireworks).
//
// The owner: "The countdown needs to start at 10, with lots more fireworks, then reset after a
// minute." A tower's scene starts (s.t = 0: the title's fresh tower, or a new run) with the
// screen on "10", so the countdown lands within the first ten seconds, before players have
// moved on and up. One cycle is a minute:
//  - the first ten seconds: "10" … "1", big, the ball coming down its mast and the clock's
//    second hand sweeping up to meet the others on twelve;
//  - midnight (s.t = 10): the ball lands, the clock's hands meet on twelve, the screen reads
//    MIDNIGHT, and the grand finale fills the sky; then HAPPY and the coming year;
//  - while HAPPY holds, the ball goes back up its mast and the clock is set back a minute (its
//    minute hand easing back a few degrees; the second hand never stops or turns back), so at
//    the top of the next minute everything is where it started and the count begins again.
// The music keeps its own time: the screen no longer follows the song.

/** One cycle: a minute. A whole number of minutes, so the clock's second hand runs on across it. */
export const CYCLE = 60;
/** Seconds into the cycle when the screen shows "10", and midnight. */
export const COUNT_FROM = 0;
export const MIDNIGHT = 10;
/** Whole seconds counted down big: "10" through "1". */
export const COUNT = Math.round(MIDNIGHT - COUNT_FROM);
/** MIDNIGHT shows this long after midnight; then HAPPY and the year until the cycle restarts. */
export const MIDNIGHT_SHOW = 4;
/** While HAPPY holds, the ball goes back up and the clock is set back a minute between these
 *  seconds of the cycle; the ball then waits at the top for the count. */
export const RESET_FROM = CYCLE - 6;
export const RESET_END = CYCLE - 1;

/** Where the cycle is (seconds, in [0, CYCLE)): the scene's own clock. */
export function cycleTime(s: Scene): number {
  return ((s.t % CYCLE) + CYCLE) % CYCLE;
}

/** Which minute the scene is in (0 for the first): each midnight's fireworks differ. */
export function cycleIndex(s: Scene): number {
  return Math.floor(s.t / CYCLE);
}

/** What the screen shows. `into` is seconds since this reading started. */
export type Reading =
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
  const t = Math.max(0, p - COUNT_FROM);
  return { kind: "count", n: COUNT - Math.floor(t), into: t - Math.floor(t) };
}

function ease(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** How far through the reset (0 → 1) cycle time p is. */
function reset(p: number): number {
  return ease((p - RESET_FROM) / (RESET_END - RESET_FROM));
}

/**
 * The time the tower clock's hour and minute hands show at cycle time p, in seconds from
 * midnight (negative before it): ten seconds to midnight as the count starts, running on through
 * midnight, then set back a minute during the reset, smoothly, so it is ten seconds to midnight
 * again when the next count starts.
 */
export function clockAt(p: number): number {
  return p - MIDNIGHT - 60 * reset(p);
}

/** Where the clock's second hand points at cycle time p (seconds, in [0, 60)): it sweeps up
 *  from fifty to twelve over the count and runs on, never stopping, round the cycle. */
export function secondAt(p: number): number {
  return (((p - MIDNIGHT) % 60) + 60) % 60;
}

/** How far down its mast the ball is at cycle time p: 0 at the top, 1 landed (midnight). */
export function ballAt(p: number): number {
  if (p < MIDNIGHT) return Math.max(0, (p - COUNT_FROM) / (MIDNIGHT - COUNT_FROM));
  // Landed, then back up the mast during the reset.
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
