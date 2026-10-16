// Which sound effects a drop makes. Pure, so it is unit-tested; main.ts plays the result.

import type { DropResult } from "../game";
import type { Sound } from "./engine";

export interface SoundCue {
  sound: Sound;
  /** Pitch shift in semitones. */
  semitones?: number;
  gain?: number;
}

/** Major-scale steps for the perfect chime: each perfect in a streak climbs one note. */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
export function chimeStep(streak: number): number {
  return SCALE[Math.max(0, Math.min(SCALE.length - 1, streak - 1))]!;
}

/** A cut this wide (world units) or wider sounds at full volume; slivers are quieter. */
const LOUD_CUT = 20;

/** Sounds for one drop. `streak` is the perfect streak after the drop. */
export function dropSounds(r: DropResult, streak: number): SoundCue[] {
  switch (r.kind) {
    case "perfect":
      return [
        { sound: "land", gain: 0.6 },
        { sound: "chime", semitones: chimeStep(streak) },
      ];
    case "sliced":
      return [
        { sound: "land" },
        { sound: "slice", gain: 0.5 + 0.5 * Math.min(1, r.cut.w / LOUD_CUT) },
      ];
    case "miss":
      return [{ sound: "miss" }];
  }
}
