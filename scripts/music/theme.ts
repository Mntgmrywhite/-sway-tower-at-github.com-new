// The Sway Tower main theme, shared by every skin's arrangement.
//
// A lilting 6/8 tune (it rocks like the tower sways): 16 bars, A A' B A'', in C major.
// Time is counted in eighth notes: one bar = 6 eighths. Arrangements play it at 270 eighths
// per minute (a dotted quarter = 90), which gives whole frames at 48 kHz.
//
// Arrangements may transpose it, switch it to minor (minorize), change instruments, rhythm
// feel and accompaniment — but should keep the melody recognizable.

import { midi } from "./sampler";
import type { Note } from "./song";

export const EIGHTHS_PER_BAR = 6;
export const THEME_BPM = 270;
export const THEME_BARS = 16;

/** Chord per half-bar (dotted quarter), as [root, quality]. 32 halves = 16 bars. */
export type Quality = "maj" | "min" | "dom7" | "min7" | "dim";
export const CHORDS: [string, Quality][] = [
  // A: bars 1–4
  ["C", "maj"], ["C", "maj"], ["A", "min"], ["A", "min"], ["F", "maj"], ["F", "maj"], ["G", "maj"], ["G", "dom7"],
  // A': bars 5–8
  ["C", "maj"], ["C", "maj"], ["A", "min"], ["A", "min"], ["D", "min"], ["G", "dom7"], ["C", "maj"], ["C", "maj"],
  // B: bars 9–12
  ["F", "maj"], ["F", "maj"], ["G", "maj"], ["G", "maj"], ["E", "min"], ["A", "min"], ["D", "min"], ["G", "dom7"],
  // A'': bars 13–16 (ends on the dominant so it leans back into bar 1)
  ["C", "maj"], ["C", "maj"], ["A", "min"], ["A", "min"], ["D", "min"], ["D", "min"], ["G", "maj"], ["G", "dom7"],
];

/** The melody: [start eighth within the bar, length in eighths, note] per bar. */
const BARS: [number, number, string][][] = [
  [[0, 2, "E5"], [2, 1, "G5"], [3, 2, "C6"], [5, 1, "B5"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 3, "E5"]],
  [[0, 2, "F5"], [2, 1, "A5"], [3, 2, "C6"], [5, 1, "A5"]],
  [[0, 3, "G5"], [3, 1, "B4"], [4, 1, "C5"], [5, 1, "D5"]],
  [[0, 2, "E5"], [2, 1, "G5"], [3, 2, "C6"], [5, 1, "E6"]],
  [[0, 2, "D6"], [2, 1, "C6"], [3, 3, "A5"]],
  [[0, 2, "F5"], [2, 1, "A5"], [3, 2, "G5"], [5, 1, "B4"]],
  [[0, 3, "C5"], [3, 1, "G4"], [4, 1, "A4"], [5, 1, "B4"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 2, "F5"], [5, 1, "A5"]],
  [[0, 2, "G5"], [2, 1, "F5"], [3, 3, "D5"]],
  [[0, 2, "G5"], [2, 1, "E5"], [3, 2, "A5"], [5, 1, "C6"]],
  [[0, 2, "D6"], [2, 1, "C6"], [3, 2, "B5"], [5, 1, "G5"]],
  [[0, 2, "E5"], [2, 1, "G5"], [3, 2, "C6"], [5, 1, "B5"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 2, "E5"], [5, 1, "C5"]],
  [[0, 2, "F5"], [2, 1, "E5"], [3, 2, "D5"], [5, 1, "F5"]],
  [[0, 3, "G5"], [3, 1, "F5"], [4, 2, "D5"]],
];

/** The theme melody as notes (time in eighths from the loop start), velocity shaped to the lilt. */
export function melody(): Note[] {
  const out: Note[] = [];
  BARS.forEach((bar, b) => {
    for (const [t, d, n] of bar) {
      // Accent the two dotted-quarter pulses, lighter on the in-between eighths.
      const v = t === 0 ? 0.78 : t === 3 ? 0.68 : 0.55;
      out.push({ t: b * EIGHTHS_PER_BAR + t, d, n, v });
    }
  });
  return out;
}

const INTERVALS: Record<Quality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
};

/** MIDI notes of a chord, voiced from `root` + octave. */
export function chordNotes(root: string, quality: Quality, octave: number): number[] {
  const base = midi(`${root}${octave}`);
  return INTERVALS[quality].map((i) => base + i);
}

/** Each half-bar chord with its start time in eighths. */
export function harmony(): { t: number; root: string; quality: Quality }[] {
  return CHORDS.map(([root, quality], i) => ({ t: i * 3, root, quality }));
}

/** Lower the 3rd, 6th and 7th degrees (C major -> C natural minor), for spooky arrangements. */
export function minorize(notes: Note[], tonic = 0): Note[] {
  return notes.map((n) => {
    const m = typeof n.n === "number" ? n.n : midi(n.n);
    const degree = (((m - tonic) % 12) + 12) % 12;
    return { ...n, n: degree === 4 || degree === 9 || degree === 11 ? m - 1 : m };
  });
}
