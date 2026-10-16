import { describe, expect, it } from "vitest";
import manifest from "../../audio/music/manifest.json";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import {
  ballAt,
  clockAt,
  COUNT_FROM,
  comingYear,
  CYCLE,
  cycleTime,
  DROP_FROM,
  formatLeft,
  MIDNIGHT,
  MIDNIGHT_SHOW,
  readingAt,
  RESET,
  SEASON_END,
  YEAR,
} from "./countdown";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("New Year's countdown", () => {
  it("keeps the song's time: its cues and its loop length", () => {
    const song = (manifest as unknown as Record<string, { sr: number; L: number; cues: { countdownStart: number; midnight: number } }>).newyear!;
    expect(COUNT_FROM).toBe(song.cues.countdownStart);
    expect(MIDNIGHT).toBe(song.cues.midnight);
    expect(MIDNIGHT - COUNT_FROM).toBe(10);
    expect(CYCLE).toBeCloseTo(song.L / song.sr, 9);
    expect(MIDNIGHT + MIDNIGHT_SHOW).toBeLessThan(CYCLE);
  });

  it("follows the music, and runs the same cycle on scene time when there is none", () => {
    const at = (t: number, songTime?: number) => cycleTime({ t, songTime } as Scene);
    expect(at(3, 40.5)).toBe(40.5);
    expect(at(3, NaN)).toBe(3);
    expect(at(3)).toBe(3);
    expect(at(CYCLE * 4 + 7.25, NaN)).toBeCloseTo(7.25, 9);
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
    expect(readingAt(CYCLE - 0.01).kind).toBe("year");
  });

  it("formats the time left as m:ss", () => {
    expect(formatLeft(60)).toBe("1:00");
    expect(formatLeft(52)).toBe("0:52");
    expect(formatLeft(11)).toBe("0:11");
    expect(formatLeft(5)).toBe("0:05");
  });

  it("puts the clock on midnight at midnight, and never jumps its hands", () => {
    expect(clockAt(MIDNIGHT)).toBe(0);
    expect(clockAt(DROP_FROM)).toBe(-60);
    expect(clockAt(COUNT_FROM)).toBe(-10);
    // Across the cycle's wrap, and through the reset, the hands move at most a few seconds a frame.
    const frame = 1 / 60;
    for (let p = -1; p < CYCLE + 1; p += frame) {
      const a = clockAt(((p % CYCLE) + CYCLE) % CYCLE);
      const b = clockAt((((p + frame) % CYCLE) + CYCLE) % CYCLE);
      expect(Math.abs(b - a), `${p}`).toBeLessThan(80 / (RESET * 60) * 1.6);
    }
  });

  it("brings the ball down the mast over the last minute, landing at midnight", () => {
    expect(ballAt(DROP_FROM)).toBe(0);
    expect(ballAt(MIDNIGHT)).toBe(1);
    expect(ballAt(CYCLE - 0.001)).toBe(1);
    expect(ballAt(0)).toBe(1);
    expect(MIDNIGHT - DROP_FROM).toBe(60);
    let prev = 0;
    for (let p = DROP_FROM; p <= MIDNIGHT; p += 0.25) {
      const b = ballAt(p);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
    // Back up during the reset, smoothly: no frame moves it more than a sliver.
    for (let p = 0; p < DROP_FROM; p += 1 / 60) expect(Math.abs(ballAt(p + 1 / 60) - ballAt(p))).toBeLessThan(0.02);
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
