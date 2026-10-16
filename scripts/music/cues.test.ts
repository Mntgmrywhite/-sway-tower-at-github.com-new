// Song.cues: the moments the game syncs visuals to (render.ts writes them into manifest.json).

import { describe, expect, it } from "vitest";
import { loopCues, type Song } from "./song";

/** Two bars of 4/4 at 240 bpm: a 2 s loop. */
const song = (cues?: Record<string, number>): Song => ({ name: "test", bpm: 240, beatsPerBar: 4, bars: 2, tracks: [], cues });

describe("loopCues", () => {
  it("is undefined for a song without cues", () => {
    expect(loopCues(song())).toBeUndefined();
  });

  it("keeps each cue in seconds, rounded to the microsecond", () => {
    expect(loopCues(song({ countdownStart: 0, midnight: (7 * 60) / 240 + 1e-12 }))).toEqual({ countdownStart: 0, midnight: 1.75 });
  });

  it("rejects a cue outside the loop", () => {
    expect(() => loopCues(song({ late: 2 }))).toThrow(/cue late/);
    expect(() => loopCues(song({ early: -0.1 }))).toThrow(/cue early/);
    expect(() => loopCues(song({ broken: Number.NaN }))).toThrow(/cue broken/);
  });
});
