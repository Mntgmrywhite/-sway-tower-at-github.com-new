import { describe, expect, it } from "vitest";
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
  MIDNIGHT,
  MIDNIGHT_SHOW,
  readingAt,
  RESET_END,
  RESET_FROM,
  SEASON_END,
  secondAt,
  YEAR,
} from "./countdown";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
const FRAME = 1 / 60;

/** The cycle time a frame `dt` after cycle time p (wrapping round the minute). */
const next = (p: number, dt = FRAME) => (((p + dt) % CYCLE) + CYCLE) % CYCLE;

describe("New Year's countdown", () => {
  // The owner: "The countdown needs to start at 10, with lots more fireworks, then reset after a
  // minute." Within the first ten seconds of a tower's scene, before players move on and up.
  it("starts at 10 on a tower's first frame, strikes midnight at 10 s and starts over every minute", () => {
    expect(CYCLE).toBe(60);
    expect(COUNT_FROM).toBe(0);
    expect(MIDNIGHT).toBe(10);
    expect(COUNT).toBe(10);
    expect(readingAt(0)).toEqual({ kind: "count", n: 10, into: 0 });
    expect(readingAt(MIDNIGHT)).toEqual({ kind: "midnight", into: 0 });
    const at = (t: number) => readingAt(cycleTime({ t } as Scene));
    for (const minute of [0, 1, 2, 7]) {
      const t0 = minute * CYCLE;
      expect(at(t0), `minute ${minute}`).toEqual({ kind: "count", n: 10, into: 0 });
      expect(at(t0 + MIDNIGHT - 0.01)).toMatchObject({ kind: "count", n: 1 });
      expect(at(t0 + MIDNIGHT + 0.01).kind).toBe("midnight");
      expect(at(t0 + CYCLE - 0.01).kind).toBe("year");
      expect(cycleIndex({ t: t0 + 30 } as Scene)).toBe(minute);
    }
  });

  it("keeps the scene's time, whatever the music is doing", () => {
    const at = (t: number, songTime?: number) => cycleTime({ t, songTime } as Scene);
    expect(at(3, 40.5)).toBe(3);
    expect(at(3, NaN)).toBe(3);
    expect(at(3)).toBe(3);
    expect(at(CYCLE * 4 + 7.25, 12)).toBeCloseTo(7.25, 9);
  });

  it("always shows something: 10 … 1 big, MIDNIGHT, then the year until the minute is up", () => {
    let last = COUNT + 1;
    for (let i = 0; i < CYCLE * 20; i++) {
      const p = i / 20;
      const r = readingAt(p);
      if (p < MIDNIGHT) {
        expect(r).toMatchObject({ kind: "count", n: COUNT - Math.floor(p) });
        if (r.kind !== "count") continue;
        // A second at a time, never skipping one
        expect(r.n === last || r.n === last - 1, `${p}`).toBe(true);
        last = r.n;
      } else if (p < MIDNIGHT + MIDNIGHT_SHOW) {
        expect(r.kind).toBe("midnight");
      } else {
        expect(r.kind).toBe("year");
      }
    }
    expect(last).toBe(1);
    expect(readingAt(4.5)).toMatchObject({ kind: "count", n: 6, into: 0.5 });
    expect(readingAt(MIDNIGHT + MIDNIGHT_SHOW + 1)).toMatchObject({ kind: "year", into: 1 });
  });

  it("sweeps the second hand up to meet the others on twelve at midnight, in step with the screen", () => {
    expect(clockAt(0)).toBe(-10);
    expect(clockAt(MIDNIGHT)).toBe(0);
    expect(secondAt(0)).toBe(50);
    expect(secondAt(MIDNIGHT)).toBe(0);
    // Each number on the screen comes up as the second hand passes its mark: "n" at n to twelve.
    for (let n = COUNT; n >= 1; n--) {
      const p = MIDNIGHT - n;
      expect(readingAt(p)).toMatchObject({ kind: "count", n, into: 0 });
      expect(secondAt(p)).toBeCloseTo(60 - n, 9);
      expect(clockAt(p)).toBeCloseTo(-n, 9);
    }
  });

  it("resets the clock while HAPPY holds: the hands never jump, and the second hand never turns back", () => {
    // Across the minute's wrap, and through the reset, every frame.
    for (let p = 0; p < CYCLE; p += FRAME) {
      const q = next(p);
      // The second hand runs on: a frame's worth forward, every frame.
      const ds = (((secondAt(q) - secondAt(p)) % 60) + 60) % 60;
      expect(ds, `${p}`).toBeCloseTo(FRAME, 6);
      // The minute hand moves at most a few seconds' worth a frame (a sliver of a degree).
      expect(Math.abs(clockAt(q) - clockAt(p)), `${p}`).toBeLessThan(0.35);
    }
    // The setting back happens while the year is showing.
    for (let p = RESET_FROM; p < CYCLE; p += 0.1) expect(readingAt(p).kind).toBe("year");
    expect(clockAt(RESET_FROM)).toBeCloseTo(RESET_FROM - MIDNIGHT, 9);
    expect(clockAt(CYCLE - 1e-9)).toBeCloseTo(clockAt(0), 6);
  });

  it("brings the ball down the mast with the count, landing at midnight, and takes it back up while HAPPY holds", () => {
    expect(ballAt(0)).toBe(0);
    expect(ballAt(MIDNIGHT)).toBe(1);
    // In step with the screen: a tenth of the way down with each number.
    for (let n = COUNT; n >= 0; n--) expect(ballAt(MIDNIGHT - n)).toBeCloseTo(1 - n / COUNT, 9);
    let prev = 0;
    for (let p = 0; p <= MIDNIGHT; p += 0.25) {
      expect(ballAt(p)).toBeGreaterThanOrEqual(prev);
      prev = ballAt(p);
    }
    // Landed through MIDNIGHT and most of the year, then up during the reset, waiting at the top.
    for (let p = MIDNIGHT; p < RESET_FROM; p += 0.5) expect(ballAt(p)).toBe(1);
    for (let p = RESET_FROM; p < CYCLE; p += 0.1) expect(readingAt(p).kind).toBe("year");
    for (let p = RESET_END; p < CYCLE; p += 0.1) expect(ballAt(p)).toBe(0);
    // Smoothly: no frame moves it more than a sliver, across the minute's wrap too.
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
