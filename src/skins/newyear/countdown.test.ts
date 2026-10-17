import { describe, expect, it } from "vitest";
import manifest from "../../audio/music/manifest.json";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import {
  ballAt,
  clockAt,
  COUNT,
  COUNT_FROM,
  comingYear,
  CYCLE,
  cycleIndex,
  cycleTime,
  formatLeft,
  MIDNIGHT,
  MIDNIGHT_SHOW,
  MINUTE,
  readingAt,
  sceneTimeOf,
  SEASON_END,
  secondAt,
  START,
  YEAR,
} from "./countdown";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
const FRAME = 1 / 60;

/** The cycle time a frame `dt` after cycle time p (wrapping round the cycle). */
const next = (p: number, dt = FRAME) => (((p + dt) % CYCLE) + CYCLE) % CYCLE;
/** What the screen shows `t` seconds into a tower's scene, with no music. */
const shownAt = (t: number) => readingAt(cycleTime({ t } as Scene));

describe("New Year's countdown", () => {
  it("keeps the song's time: its cues and its loop length", () => {
    const song = (manifest as unknown as Record<string, { sr: number; L: number; cues: { countdownStart: number; midnight: number } }>).newyear!;
    expect(COUNT_FROM).toBe(song.cues.countdownStart);
    expect(MIDNIGHT).toBe(song.cues.midnight);
    expect(COUNT).toBe(10);
    expect(CYCLE).toBeCloseTo(song.L / song.sr, 9);
    expect(MIDNIGHT + MIDNIGHT_SHOW).toBeLessThan(CYCLE);
    // The minute fits in the song, with a moment before it to set the clock and the ball back.
    expect(MINUTE).toBe(60);
    expect(START).toBeCloseTo(MIDNIGHT - MINUTE, 9);
    expect(START).toBeGreaterThanOrEqual(1);
  });

  // The owner: "The count should go back to a full minute how you had it first; the setup/payoff
  // was much better."
  it("counts a full minute from a tower's first frame: 1:00 at the start, midnight a minute in", () => {
    expect(shownAt(0)).toMatchObject({ kind: "left", secs: 60 });
    expect(shownAt(0.99)).toMatchObject({ kind: "left", secs: 60 });
    expect(shownAt(1)).toMatchObject({ kind: "left", secs: 59, into: 0 });
    expect(shownAt(30)).toMatchObject({ kind: "left", secs: 30, into: 0 });
    expect(shownAt(49.99)).toMatchObject({ kind: "left", secs: 11 });
    expect(shownAt(50)).toEqual({ kind: "count", n: 10, into: 0 });
    expect(shownAt(59.99)).toMatchObject({ kind: "count", n: 1 });
    expect(shownAt(60)).toEqual({ kind: "midnight", into: 0 });
    expect(shownAt(60 + MIDNIGHT_SHOW + 0.5)).toMatchObject({ kind: "year" });
    expect(sceneTimeOf(START)).toBe(0);
    expect(sceneTimeOf(MIDNIGHT)).toBeCloseTo(60, 9);
  });

  it("starts the next minute where the song's loop comes round, and every pass counts like the first", () => {
    for (const pass of [1, 2, 7]) {
      const t0 = pass * CYCLE;
      // The greeting holds until the top of the cycle, then 1:00 while the clock is set back...
      expect(shownAt(t0 - START - 0.01).kind, `pass ${pass}`).toBe("year");
      expect(shownAt(t0 - START + 0.01)).toMatchObject({ kind: "left", secs: 60 });
      // ...and the minute runs from where a fresh tower's does.
      for (const t of [0, 1, 30, 50, 59.99, 60, 70]) expect(shownAt(t0 + t), `pass ${pass}, ${t}s`).toEqual(shownAt(t));
      expect(cycleIndex({ t: t0 + 30 } as Scene)).toBe(pass);
      expect(cycleIndex({ t: t0 - START - 0.01 } as Scene)).toBe(pass - 1);
    }
    expect(cycleIndex({ t: 0 } as Scene)).toBe(0);
  });

  it("follows the music, and runs the same cycle on scene time when there is none", () => {
    const at = (t: number, songTime?: number) => cycleTime({ t, songTime } as Scene);
    expect(at(3, 40.5)).toBe(40.5);
    expect(at(3, NaN)).toBe(START + 3);
    expect(at(3)).toBe(START + 3);
    expect(at(CYCLE * 4 + 7.25, NaN)).toBeCloseTo(START + 7.25, 9);
    // Music tells one pass from another no better than a guess: its midnights share a finale.
    expect(cycleIndex({ t: CYCLE * 3 + 10, songTime: 64 } as Scene)).toBe(0);
  });

  it("always shows something: the time left, the last ten big, MIDNIGHT, then the year", () => {
    let last = Infinity;
    for (let p = 0; p < CYCLE; p += 0.05) {
      const r = readingAt(p);
      if (p < COUNT_FROM) {
        expect(r.kind, `${p}`).toBe("left");
        if (r.kind !== "left") continue;
        // One minute to midnight at most, ticking down a second at a time, never skipping one
        expect(r.secs).toBeLessThanOrEqual(60);
        expect(r.secs).toBeGreaterThan(10);
        expect(r.secs === last || r.secs === last - 1 || last === Infinity).toBe(true);
        expect(r.secs).toBe(Math.min(60, Math.ceil(MIDNIGHT - p)));
        last = r.secs;
      } else if (p < MIDNIGHT) {
        expect(r).toMatchObject({ kind: "count", n: Math.ceil(MIDNIGHT - p) });
      } else if (p < MIDNIGHT + MIDNIGHT_SHOW) {
        expect(r.kind).toBe("midnight");
      } else {
        expect(r.kind).toBe("year");
      }
    }
    expect(last).toBe(11);
    expect(readingAt(0)).toMatchObject({ kind: "left", secs: 60 });
    expect(readingAt(MIDNIGHT - 52)).toMatchObject({ kind: "left", secs: 52, into: 0 });
    expect(readingAt(COUNT_FROM)).toMatchObject({ kind: "count", n: 10, into: 0 });
    expect(readingAt(COUNT_FROM + 4.5)).toMatchObject({ kind: "count", n: 6, into: 0.5 });
    expect(readingAt(MIDNIGHT - 0.01)).toMatchObject({ kind: "count", n: 1 });
    expect(readingAt(MIDNIGHT)).toEqual({ kind: "midnight", into: 0 });
    expect(readingAt(MIDNIGHT + MIDNIGHT_SHOW + 1)).toMatchObject({ kind: "year", into: 1 });
    expect(readingAt(CYCLE - 0.01).kind).toBe("year");
  });

  it("formats the time left as m:ss", () => {
    expect(formatLeft(60)).toBe("1:00");
    expect(formatLeft(52)).toBe("0:52");
    expect(formatLeft(11)).toBe("0:11");
    expect(formatLeft(5)).toBe("0:05");
  });

  it("keeps the clock in step with the screen: each second comes up as the second hand passes its mark, and all three hands meet on twelve at midnight", () => {
    expect(clockAt(START)).toBe(-60);
    expect(secondAt(START)).toBe(0);
    expect(clockAt(MIDNIGHT)).toBe(0);
    expect(secondAt(MIDNIGHT)).toBe(0);
    for (let secs = 59; secs >= 11; secs--) {
      const p = MIDNIGHT - secs;
      expect(readingAt(p)).toMatchObject({ kind: "left", secs, into: 0 });
      expect(secondAt(p)).toBeCloseTo(60 - secs, 9);
      expect(clockAt(p)).toBeCloseTo(-secs, 9);
    }
    for (let n = COUNT; n >= 1; n--) {
      const p = MIDNIGHT - n;
      expect(readingAt(p)).toMatchObject({ kind: "count", n, into: 0 });
      expect(secondAt(p)).toBeCloseTo(60 - n, 9);
      expect(clockAt(p)).toBeCloseTo(-n, 9);
    }
  });

  it("sets the clock back while the screen holds 1:00: the hands never jump, and the second hand never turns back", () => {
    for (let p = 0; p < START; p += 0.05) expect(readingAt(p)).toMatchObject({ kind: "left", secs: 60 });
    // From the end of the cycle, through the reset and the whole minute, every frame
    for (let p = 0; p < CYCLE; p += FRAME) {
      const q = next(p);
      const ds = (((secondAt(q) - secondAt(p)) % 60) + 60) % 60;
      if (p >= START && q > p) {
        // The second hand runs with the clock, a frame's worth a frame...
        expect(ds, `${p}`).toBeCloseTo(FRAME, 6);
        expect(clockAt(q) - clockAt(p), `${p}`).toBeCloseTo(FRAME, 6);
      } else {
        // ...and sweeps on to twelve during the reset, quickly but smoothly (a few degrees a frame),
        // while the hour and minute hands ease back a minute and a bit (a sliver of a degree).
        expect(ds, `${p}`).toBeLessThan(0.6);
        expect(Math.abs(clockAt(q) - clockAt(p)), `${p}`).toBeLessThan(1.1);
      }
    }
    expect(clockAt(CYCLE - 1e-9)).toBeCloseTo(clockAt(0), 6);
    expect(secondAt(CYCLE - 1e-9)).toBeCloseTo(secondAt(0), 6);
    expect(clockAt(START - 1e-9)).toBeCloseTo(-60, 6);
  });

  it("brings the ball down the mast over the whole minute, landing at midnight, and back up while the screen holds 1:00", () => {
    expect(ballAt(START)).toBe(0);
    expect(ballAt(MIDNIGHT)).toBe(1);
    expect(ballAt(CYCLE - 0.001)).toBe(1);
    expect(ballAt(0)).toBe(1);
    // In step with the screen: a sixtieth of the way down with each second.
    for (let secs = 60; secs >= 0; secs--) expect(ballAt(MIDNIGHT - secs)).toBeCloseTo(1 - secs / 60, 9);
    let prev = 0;
    for (let p = START; p <= MIDNIGHT; p += 0.25) {
      expect(ballAt(p)).toBeGreaterThanOrEqual(prev);
      prev = ballAt(p);
    }
    // Smoothly: no frame moves it more than a sliver, across the cycle's wrap and the reset too.
    for (let p = 0; p < CYCLE; p += FRAME) expect(Math.abs(ballAt(next(p)) - ballAt(p)), `${p}`).toBeLessThan(0.02);
  });

  it("greets the year the season leads into", () => {
    expect(comingYear(day(2026, 10, 16))).toBe(2027);
    expect(comingYear(day(2026, 12, 28))).toBe(2027);
    expect(comingYear(day(2026, 12, 31))).toBe(2027);
    expect(comingYear(new Date(2026, 11, 31, 23, 59, 59))).toBe(2027);
    expect(comingYear(new Date(2027, 0, 1, 0, 0, 1))).toBe(2027);
    expect(comingYear(day(2027, 1, 6))).toBe(2027);
    expect(comingYear(day(2027, 1, 7))).toBe(2028);
    expect(comingYear(day(2027, 7, 4))).toBe(2028);
    // The season the skin is picked for ends where the greeting turns over.
    expect(newYear.dates?.at(-1)?.to).toEqual(SEASON_END);
    // Previews and tests (no browser) greet a fixed year, so they draw the same any day.
    expect(YEAR).toBe(2027);
  });
});
