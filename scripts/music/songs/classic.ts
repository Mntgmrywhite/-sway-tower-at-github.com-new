// Classic: bright and bouncy. Glockenspiel + piano carry the tune over a pizzicato waltz
// (bass on the pulse, strings on the off-eighths), ukulele strums, and light percussion.

import { midi } from "../sampler";
import type { Note, Song } from "../song";
import { chordNotes, EIGHTHS_PER_BAR, harmony, melody, THEME_BARS, THEME_BPM } from "../theme";

const tune = melody();
const chords = harmony();

const pianoLead: Note[] = tune.map((n) => ({ ...n, v: (n.v ?? 0.7) * 0.9 }));
// Glockenspiel doubles the tune an octave up, only on the pulse notes, for sparkle.
const glock: Note[] = tune.filter((n) => n.t % 3 === 0).map((n) => ({ ...n, n: midi(String(n.n)) + 12, v: 0.55 }));

const bass: Note[] = [];
const pizz: Note[] = [];
const uke: Note[] = [];
for (const c of chords) {
  const [root, , fifth] = chordNotes(c.root, c.quality, 2);
  // Bass on the pulse: root, then the fifth on the second pulse of the bar
  const secondHalf = (c.t / 3) % 2 === 1;
  bass.push({ t: c.t, d: 2, n: secondHalf ? fifth! : root!, v: 0.8 });
  // Pizzicato chord on the two off-eighths of each pulse
  const upper = chordNotes(c.root, c.quality, 4).slice(0, 3);
  for (const off of [1, 2]) for (const n of upper) pizz.push({ t: c.t + off, d: 1, n, v: off === 1 ? 0.5 : 0.42 });
  // Ukulele strum on each pulse (a quick roll, low to high)
  chordNotes(c.root, c.quality, 4)
    .slice(0, 3)
    .forEach((n, i) => uke.push({ t: c.t + i * 0.06, d: 2, n, v: 0.45 }));
}

const total = THEME_BARS * EIGHTHS_PER_BAR;
const kick: Note[] = [];
const snare: Note[] = [];
const shaker: Note[] = [];
for (let t = 0; t < total; t++) {
  const inBar = t % EIGHTHS_PER_BAR;
  if (inBar === 0) kick.push({ t, d: 1, n: "C2", v: 0.7 });
  if (inBar === 3) snare.push({ t, d: 1, n: "D2", v: 0.35 });
  shaker.push({ t, d: 1, n: "C4", v: inBar % 3 === 0 ? 0.5 : 0.3 });
}

const song: Song = {
  name: "classic",
  bpm: THEME_BPM,
  beatsPerBar: EIGHTHS_PER_BAR,
  bars: THEME_BARS,
  reverb: { room: 0.7, damp: 0.4, width: 0.9, level: 0.9 },
  tracks: [
    { inst: "piano", notes: pianoLead, gain: 0.9, pan: -0.1, reverb: 0.25 },
    { inst: "glockenspiel", notes: glock, gain: 0.5, pan: 0.25, reverb: 0.35 },
    { inst: "bassPizz", notes: bass, gain: 0.9, pan: 0, reverb: 0.12 },
    { inst: "violinsPizz", notes: pizz, gain: 0.55, pan: 0.35, reverb: 0.3 },
    { inst: "ukulele", notes: uke, gain: 0.5, pan: -0.35, reverb: 0.2 },
    { inst: "kick", notes: kick, gain: 0.7, reverb: 0.05 },
    { inst: "snare", notes: snare, gain: 0.45, pan: 0.05, reverb: 0.15 },
    { inst: "shaker", notes: shaker, gain: 0.35, pan: 0.3, reverb: 0.1 },
  ],
};

export default song;
