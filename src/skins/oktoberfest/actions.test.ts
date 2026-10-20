import { describe, expect, it } from "vitest";
import { BAND_SET, BAND_STARTS, BOW_AT, dance, DANCE_ROUND, playing } from "./folk";
import { PARADE_EVERY, PARADE_LENGTH, PARADE_REACH, paradeAt, WAITRESS_EVERY, WAITRESS_REACH, waitressAt } from "./parade";

// The owner's rules: any action needs to happen within the first 10 seconds, because after that
// players move past it and up; and every action repeats: a thing that happens once must come
// round again on a rhythm for as long as the player stands there. The scene's clock starts at 0
// with a fresh tower (the title screen, or play again), so every action the start view shows
// happens for the first time, key moment included, by OPENING, and then again and again.
//
// What the start view shows over time at the Oktoberfest: the oompah band striking up (and,
// after each set, resting a moment and striking up again), the brewers' parade crossing in front
// (past the tower, and away out the right), the dancers' schuhplattler with its leap and their
// bow, and the waitress crossing with her tray of steins (past the tower). The rest is ambient: the
// rides turning, the stall's smoke, the band playing on. The lane's balloons and lanterns, the
// lights and the stars come with the height you climb to, so they are exempt.

const OPENING = 10;
const FRAME = 1 / 60;
/** How long the checks stand at the scene: ten minutes of its clock. */
const STAND = 600;
/** The longest any action may take to come round again (s). */
const RHYTHM = 50;
/** Screens the crossings are checked on, as half widths in u: phones, a tablet, the zoomed-out view. */
const HALVES = [0.5, 0.625, 0.84] as const;

/** The times (s) at which `on` turns true over STAND seconds of the clock. */
function starts(on: (t: number) => boolean): number[] {
  const out: number[] = [];
  let was = on(0);
  if (was) out.push(0);
  for (let t = FRAME; t < STAND; t += FRAME) {
    const now = on(t);
    if (now && !was) out.push(t);
    was = now;
  }
  return out;
}

/** The longest wait between consecutive starts, and from the last one to the end of the stand. */
function longestWait(at: number[]): number {
  let wait = 0;
  for (let i = 1; i < at.length; i++) wait = Math.max(wait, at[i]! - at[i - 1]!);
  return Math.max(wait, STAND - at[at.length - 1]!);
}

describe("oktoberfest actions happen in the first 10 seconds", () => {
  it("the band strikes up at once and is in full swing within two seconds", () => {
    expect(playing(0)).toBe(0);
    expect(BAND_STARTS).toBeLessThan(1);
    expect(playing(1.5)).toBe(1);
    expect(playing(OPENING)).toBe(1);
  });

  it("the parade comes in from the left, passes the tower by the third second and is away by the eighth", () => {
    for (const half of HALVES) {
      expect(paradeAt(0, 0.5).shown, "not yet in view on a phone").toBe(false);
      let past = -1;
      let gone = -1;
      for (let t = 0; t < OPENING; t += FRAME) {
        const p = paradeAt(t, half);
        if (past < 0 && p.shown && p.x >= 0) past = t;
        if (past >= 0 && gone < 0 && !p.shown) gone = t;
      }
      expect(past, "the lead horse's nose passes the tower's center line").toBeGreaterThan(0);
      expect(past).toBeLessThan(3);
      expect(gone, "the wagon's tail has left the screen").toBeGreaterThan(past);
      if (half === 0.5) expect(gone).toBeLessThan(8);
      else expect(gone).toBeLessThan(OPENING);
    }
  });

  it("the dancers slap, leap and bow, all by the tenth second, then rest and go again", () => {
    let slapping = -1;
    let leap = -1;
    let bow = -1;
    let rest = -1;
    const slaps = new Set<number>();
    for (let t = 0; t < OPENING; t += FRAME) {
      const d = dance(t);
      if (slapping < 0 && d.plattler > 0.9) slapping = t;
      if (d.plattler > 0.9) slaps.add(d.slap);
      if (leap < 0 && d.leap > 0.95) leap = t;
      if (bow < 0 && d.bow > 0.95) bow = t;
      if (bow > 0 && rest < 0 && d.bow === 0 && d.leap === 0 && d.plattler === 0) rest = t;
    }
    expect(slapping, "the slap dance is under way").toBeGreaterThan(0);
    expect(slapping).toBeLessThan(2);
    expect([...slaps].sort()).toEqual([0, 1, 2, 3]);
    expect(leap, "the leap").toBeGreaterThan(slapping);
    expect(bow, "the bow").toBeGreaterThan(leap);
    expect(BOW_AT).toBeLessThan(OPENING);
    expect(rest, "at rest again").toBeGreaterThan(bow);
    expect(rest).toBeLessThanOrEqual(OPENING + 0.1);
  });

  it("the waitress comes in from the left after the parade and passes the tower by the tenth second", () => {
    for (const half of HALVES) {
      let out = -1;
      let past = -1;
      for (let t = 0; t < OPENING; t += FRAME) {
        const w = waitressAt(t, half);
        if (out < 0 && w.shown) out = t;
        if (past < 0 && w.shown && w.m * w.x >= 0) past = t;
      }
      if (half === 0.5) expect(out, "she comes into view on a phone").toBeGreaterThan(2);
      expect(past, "she passes the tower's center line").toBeGreaterThan(out);
      expect(past).toBeLessThan(OPENING);
      // Her first crossing goes right, the next comes back left.
      expect(waitressAt(past, half).m).toBe(1);
      expect(waitressAt(past + WAITRESS_EVERY, half).m).toBe(-1);
      expect(waitressAt(past + WAITRESS_EVERY, half).shown).toBe(true);
    }
  });
});

describe("oktoberfest actions repeat", () => {
  // Over ten minutes of the clock, each action comes round again and again, never more than
  // RHYTHM seconds apart, and each round is the same as the first (the dance, the band's set,
  // the parade), or the mirror of it (the waitress, who goes the other way each time).
  it("the band rests after each set and strikes up again", () => {
    const strikes = starts((t) => playing(t) > 0.95);
    const rests = starts((t) => playing(t) < 0.05);
    expect(strikes.length, "sets struck up").toBeGreaterThan(STAND / RHYTHM);
    expect(rests.length, "rests between sets").toBeGreaterThan(STAND / RHYTHM);
    expect(longestWait(strikes)).toBeLessThanOrEqual(RHYTHM);
    for (let t = 0; t < BAND_SET; t += 0.37) expect(playing(t + BAND_SET * 7)).toBeCloseTo(playing(t), 9);
  });

  it("the dancers go round again and again", () => {
    const leaps = starts((t) => dance(t).leap > 0.95);
    const bows = starts((t) => dance(t).bow > 0.95);
    expect(leaps.length).toBeGreaterThan(STAND / RHYTHM);
    expect(bows.length).toBeGreaterThan(STAND / RHYTHM);
    expect(longestWait(leaps)).toBeLessThanOrEqual(RHYTHM);
    expect(longestWait(bows)).toBeLessThanOrEqual(RHYTHM);
    expect(dance(DANCE_ROUND * 9 + 3).slap).toBe(dance(3).slap);
    expect(dance(DANCE_ROUND * 9 + 3).plattler).toBeCloseTo(dance(3).plattler, 6);
  });

  it.each(HALVES)("the parade comes round again and again (half width %s u)", (half) => {
    const passes = starts((t) => {
      const p = paradeAt(t, half);
      return p.shown && p.x >= 0;
    });
    expect(passes.length).toBeGreaterThan(STAND / RHYTHM);
    expect(longestWait(passes)).toBeLessThanOrEqual(RHYTHM);
    expect(paradeAt(PARADE_EVERY * 5 + 2, half).x).toBeCloseTo(paradeAt(2, half).x, 6);
  });

  it.each(HALVES)("the waitress crosses again and again, each way in turn (half width %s u)", (half) => {
    const right = starts((t) => {
      const w = waitressAt(t, half);
      return w.shown && w.m > 0 && w.x >= 0;
    });
    const left = starts((t) => {
      const w = waitressAt(t, half);
      return w.shown && w.m < 0 && w.x <= 0;
    });
    expect(longestWait(right), "between crossings to the right").toBeLessThanOrEqual(RHYTHM);
    expect(longestWait(left), "between crossings to the left").toBeLessThanOrEqual(RHYTHM);
    expect(longestWait([...right, ...left].sort((a, b) => a - b)), "between crossings").toBeLessThanOrEqual(WAITRESS_EVERY + 1);
  });

  it.each(HALVES)("everything that crosses enters and leaves through the screen's sides, never popping up in view (half width %s u)", (half) => {
    // Whenever the parade or the waitress turns up or goes, the part of it nearest the
    // screen is just past a side of it.
    let wasP = paradeAt(0, half).shown;
    let wasW = waitressAt(0, half).shown;
    for (let t = FRAME; t < STAND; t += FRAME) {
      const p = paradeAt(t, half);
      if (p.shown !== wasP) {
        const near = p.x > 0 ? p.x - PARADE_LENGTH - PARADE_REACH : p.x + PARADE_REACH;
        expect(Math.abs(Math.abs(near) - half), `t=${t.toFixed(2)}: the parade turns up or goes inside the screen`).toBeLessThan(0.01);
      }
      wasP = p.shown;
      const w = waitressAt(t, half);
      if (w.shown !== wasW) {
        expect(Math.abs(Math.abs(w.x) - WAITRESS_REACH - half), `t=${t.toFixed(2)}: she turns up or goes inside the screen`).toBeLessThan(0.01);
      }
      wasW = w.shown;
    }
  });

  it.each(HALVES)("the parade and the waitress never meet, for as long as a tower lasts (half width %s u)", (half) => {
    // Whenever both are in view, the wagon (nose to tail) and she (with her tray) keep clear of each other.
    for (let t = 0; t < STAND; t += FRAME) {
      const p = paradeAt(t, half);
      const w = waitressAt(t, half);
      if (!p.shown || !w.shown) continue;
      const wagon = [p.x - PARADE_LENGTH - PARADE_REACH, p.x + PARADE_REACH];
      const her = [w.x - WAITRESS_REACH, w.x + WAITRESS_REACH];
      expect(her[1]! < wagon[0]! || her[0]! > wagon[1]!, `t=${t.toFixed(2)}: the waitress meets the parade`).toBe(true);
    }
  });
});
