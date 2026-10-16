import { describe, expect, it } from "vitest";
import { LOOP_LEVELS, LOOP_START, loopTone, moonDown, NIGHT_LEVEL, sunUp, toneAt, type Tone } from "./story";
import { sceneAt } from "./test-scene";

// The height story as numbers: past LOOP_START the light repeats every LOOP_LEVELS levels, and
// nothing jumps where the first pass hands over to the loop or where the loop meets itself.

const A = LOOP_START;
const P = LOOP_LEVELS;
/** Where the camera starts on a phone, in levels. */
const FIRST = 13;
/** How many loops the checks run through. */
const LOOPS = 3;

function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The biggest change between two tones: any sky channel (0..255), or the star line (in 1/255 screens). */
function step(a: Tone, b: Tone): number {
  let d = Math.abs(a.stars - b.stars) * 255;
  for (let i = 0; i < 3; i++) {
    const x = rgb(a.sky[i]!);
    const y = rgb(b.sky[i]!);
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(x[k]! - y[k]!));
  }
  return d;
}

/** Half-level samples from the start of the climb through LOOPS loops. */
const SAMPLES = Array.from({ length: (A + LOOPS * P - FIRST) * 2 + 1 }, (_, i) => FIRST + i / 2);
/** Levels where the story changes hands: into the loop, and each time the loop comes round. */
const SEAMS = Array.from({ length: LOOPS + 1 }, (_, k) => A + k * P);

describe("thanksgiving height story", () => {
  it("repeats every loop past the loop's start", () => {
    for (let lvl = A; lvl < A + P; lvl += 0.37) {
      for (const k of [1, 2, 7]) {
        const a = toneAt(lvl);
        const b = toneAt(lvl + k * P);
        expect(step(a, b), `tone at ${lvl.toFixed(2)} vs ${k} loops on`).toBeLessThanOrEqual(1);
        expect(sunUp(lvl + k * P)).toBeCloseTo(sunUp(lvl), 6);
        expect(moonDown(lvl + k * P)).toBeCloseTo(moonDown(lvl), 6);
      }
    }
  });

  it("starts and ends the loop on the first pass's night", () => {
    const night = toneAt(NIGHT_LEVEL);
    for (const lvl of [NIGHT_LEVEL + 3, A - 0.5, A, A + P - 0.5, A + P, A + 5 * P]) {
      expect(step(toneAt(lvl), night), `level ${lvl}`).toBe(0);
    }
    // The moon is still high at the top left and the sun gone where the loop begins and ends.
    expect(moonDown(A)).toBe(0);
    expect(sunUp(A)).toBe(0);
    expect(moonDown(A + P - 1e-9)).toBeLessThan(1e-6);
    expect(sunUp(A + P - 1e-9)).toBeLessThan(1e-6);
  });

  it("goes through a whole day in every loop", () => {
    let maxUp = 0;
    let maxDown = 0;
    let fewestStars = 1;
    for (let lvl = A; lvl < A + P; lvl += 0.5) {
      maxUp = Math.max(maxUp, sunUp(lvl));
      maxDown = Math.max(maxDown, moonDown(lvl));
      fewestStars = Math.min(fewestStars, toneAt(lvl).stars);
      // Never both in the sky's middle at once: the moon is down whenever the sun is well up.
      if (sunUp(lvl) > 0.5) expect(moonDown(lvl), `level ${lvl}`).toBe(1);
    }
    expect(maxUp).toBe(1);
    expect(maxDown).toBe(1);
    expect(fewestStars).toBeLessThan(0.5);
  });

  it("has no jump into the loop or where it meets itself", () => {
    const steps = SAMPLES.slice(1).map((lvl) => ({ lvl, d: step(toneAt(lvl - 0.5), toneAt(lvl)) }));
    const atSeam = (lvl: number) => SEAMS.some((s) => lvl > s - 1 && lvl <= s + 1);
    const elsewhere = Math.max(...steps.filter((s) => !atSeam(s.lvl)).map((s) => s.d));
    const across = Math.max(...steps.filter((s) => atSeam(s.lvl)).map((s) => s.d));
    expect(across, "largest step across a seam").toBeLessThanOrEqual(elsewhere);
    // ...and the loop's own changes stay gentle: a few 1/255ths per half level at most.
    expect(elsewhere, "largest step anywhere").toBeLessThanOrEqual(6);
    // The sun and the moon glide too.
    for (const lvl of SAMPLES.slice(1)) {
      expect(Math.abs(sunUp(lvl) - sunUp(lvl - 0.5)), `sun at ${lvl}`).toBeLessThan(0.05);
      expect(Math.abs(moonDown(lvl) - moonDown(lvl - 0.5)), `moon at ${lvl}`).toBeLessThan(0.05);
    }
  });

  it("draws the loop from the precomputed half-level tones", () => {
    for (let lvl = A; lvl < A + 2.5 * P; lvl += 0.61) {
      const s = sceneAt(390, 844, lvl);
      expect(loopTone(s)).toEqual(toneAt(A + (Math.round((lvl - A) * 2) % (2 * P)) / 2));
    }
    // The first pass leaves the sky to the base world.
    expect(loopTone(sceneAt(390, 844, A - 0.01))).toBeNull();
  });
});
