import { describe, expect, it } from "vitest";
import manifest from "./music/manifest.json";
import { barSeconds, nextBar, TEMPO_STEPS, tempoStep } from "./tempo";

describe("tempo steps", () => {
  it("are whole semitones of speed from 1 to 1.33, within Hard mode's 1.35 cap", () => {
    expect(TEMPO_STEPS.map((r) => r.toFixed(2))).toEqual(["1.00", "1.06", "1.12", "1.19", "1.26", "1.33"]);
    expect(TEMPO_STEPS.at(-1)!).toBeLessThanOrEqual(1.35);
  });

  it("as written at rate 1 and below (title, game over, Normal)", () => {
    expect(tempoStep(1, 3)).toBe(0);
    expect(tempoStep(0.8, 0)).toBe(0);
    expect(tempoStep(NaN, 2)).toBe(0);
  });

  it("follows the rate to the nearest step, up to the top one", () => {
    let step = 0;
    const seen: number[] = [];
    for (let r = 1; r <= 1.35; r += 0.005) {
      step = tempoStep(r, step);
      seen.push(step);
    }
    // Climbs one step at a time, never back.
    for (let i = 1; i < seen.length; i++) expect(seen[i]! - seen[i - 1]!).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < seen.length; i++) expect(seen[i]! - seen[i - 1]!).toBeLessThanOrEqual(1);
    expect(seen.at(-1)).toBe(5);
    expect(tempoStep(1.35, 0)).toBe(5);
    expect(tempoStep(1.19, 0)).toBe(3);
  });

  it("holds a step while the rate hovers on a boundary", () => {
    const mid = 2 ** (2.5 / 12); // halfway between 1.12 and 1.19
    expect(tempoStep(mid * 1.001, 2)).toBe(2);
    expect(tempoStep(mid * 0.999, 3)).toBe(3);
    expect(tempoStep(2 ** (2.7 / 12), 2)).toBe(3);
  });
});

describe("bar grid", () => {
  it("every song's loop is a whole number of bars", () => {
    for (const [name, info] of Object.entries(manifest as Record<string, { sr: number; L: number; bars?: number; bpm?: number }>)) {
      if (!info.bars) continue;
      const bar = barSeconds(info);
      const loop = info.L / info.sr;
      expect(loop / bar, name).toBeCloseTo(Math.round(loop / bar), 6);
      expect(bar, name).toBeGreaterThan(0.5);
      expect(bar, name).toBeLessThan(4);
    }
  });

  it("next bar line is ahead of the position, wrapping at the loop end", () => {
    expect(nextBar(0.1, 1, 8, 0)).toBe(1);
    expect(nextBar(0.95, 1, 8, 0.1)).toBe(2);
    expect(nextBar(1, 1, 8, 0)).toBe(1);
    expect(nextBar(7.5, 1, 8, 0)).toBe(0);
    expect(nextBar(7.95, 1, 8, 0.1)).toBe(1);
    expect(nextBar(2.9999999, 1, 8, 0)).toBe(3);
  });
});
