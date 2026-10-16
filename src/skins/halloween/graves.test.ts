import { describe, expect, it } from "vitest";
import { graveState } from "./graves";

// The skeleton parts must pop up at random: every grave keeps changing which part comes up,
// the graves never show the same part at the same time, and it is all a pure function of time.

const GRAVES = 3;
const STEP = 1 / 30;

function sample(t: number) {
  return Array.from({ length: GRAVES }, (_, g) => ({ ...graveState(t, g) }));
}

describe("halloween graves", () => {
  // Ten minutes of play, frame by frame.
  const frames: ReturnType<typeof sample>[] = [];
  for (let t = 0; t < 600; t += STEP) frames.push(sample(t));

  it("never shows the same part in two graves at once", () => {
    for (const f of frames) {
      const up = f.filter((s) => s.up > 0.01).map((s) => s.part);
      expect(new Set(up).size).toBe(up.length);
    }
  });

  it("re-picks the part every time a grave comes up, never repeating it twice running", () => {
    for (let g = 0; g < GRAVES; g++) {
      const parts: number[] = [];
      let wasUp = false;
      for (const f of frames) {
        const s = f[g]!;
        const up = s.up > 0.01;
        if (up && !wasUp) parts.push(s.part);
        // A part never changes while it is above the soil.
        if (up && wasUp) expect(s.part).toBe(parts[parts.length - 1]);
        wasUp = up;
      }
      expect(parts.length).toBeGreaterThan(60);
      for (let i = 1; i < parts.length; i++) expect(parts[i]).not.toBe(parts[i - 1]);
      for (const p of [0, 1, 2]) expect(parts.filter((x) => x === p).length).toBeGreaterThan(parts.length / 5);
    }
  });

  it("staggers the graves: they do not rise in lockstep", () => {
    const starts: number[][] = [[], [], []];
    const wasUp = [false, false, false];
    frames.forEach((f, i) => {
      f.forEach((s, g) => {
        const up = s.up > 0.01;
        if (up && !wasUp[g]) starts[g]!.push(i * STEP);
        wasUp[g] = up;
      });
    });
    let together = 0;
    for (const a of starts[0]!) if (starts[1]!.some((b) => Math.abs(a - b) < 0.1)) together++;
    expect(together).toBeLessThan(starts[0]!.length * 0.2);
  });

  it("is a pure function of time, whatever order it is asked in", () => {
    const later = sample(431.7).map((s) => [s.part, s.up]);
    sample(3);
    sample(1200);
    expect(sample(431.7).map((s) => [s.part, s.up])).toEqual(later);
  });
});
