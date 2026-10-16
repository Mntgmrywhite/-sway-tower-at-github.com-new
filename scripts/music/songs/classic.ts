// Classic: a sunny 6/8 brass-band march for the castle tower, in C major. The piano tune at the
// heart, a village band around it: French horns, euphonium, a tenor sax, glockenspiel and a
// march drum kit (bass drum, bright snare with rolls, toms, clash cymbals).
//
// 32 bars, the theme twice (42.7 s):
//   1–16   the piano carries the tune with its after-beat chords (the "pah"); the euphonium
//          plays the oom on the pulses and walks up into phrases; two horns hold warm harmony
//          and answer the tune's held notes (bars 2, 6, 10); the glockenspiel sparkles on the
//          tune's pulse notes. A horn fanfare pickup (bar 16) announces
//   17–32  the band's turn: the horns take the tune in harmony (thirds above it, sixths below
//          its high notes), the tenor sax doubles it an octave up so it stays clear on a phone,
//          and the euphonium sings a countermelody under it, moving where the tune holds.
//          The piano comps higher and answers the holds (bars 18, 22); staccato horns punch the
//          pickups (bars 20, 24). Bars 29–32 are the full band: the piano doubles the tune in
//          its own octave and the fanfare pickup in bar 32 lands back on bar 1.
// Drums: bass drum on both pulses, snare on the second (plus ghost notes in pass 2), a roll or a
// tom fill into each phrase, clash cymbals at each pass, a suspended cymbal at bars 9, 25, 29.
//
// Register plan (the recorded French horn has nothing between C4 and D5, so the horns stay at
// or under E4, never stretched more than 4 semitones):
//   glockenspiel E6–E7 · piano tune E5–E6 · piano comps B3–A4 (pass 1), B4–A5 (pass 2)
//   tenor sax G3–E5 (tune, pass 2) · horns E3–D4 (pads, pass 1), G2–E4 (tune, pass 2)
//   euphonium countermelody G2–G3 · euphonium bass E2–E3 · drums
// Bright parts are low-passed (sax, glockenspiel, cymbals) so nothing bites.

import { midi } from "../sampler";
import { euphonium, type Note, type Song, type Track } from "../song";
import { chordNotes, EIGHTHS_PER_BAR, harmony, melody, THEME_BARS, THEME_BPM, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One time through the tune, in eighths. */
const PASS = THEME_BARS * BAR;
const BARS = 2 * THEME_BARS;
/** Start of bar b (1-based), in eighths. */
const bar = (b: number) => (b - 1) * BAR;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
/** Notes written as [bar, eighth in bar, length in eighths, note, velocity?]. */
type Cell = [number, number, number, string, number?];
const cells = (list: Cell[], v = 0.6): Note[] => list.map(([b, t, d, n, vel]) => ({ t: bar(b) + t, d, n, v: vel ?? v }));

// ---------------------------------------------------------------- harmony

/** The chord of every half bar over both passes. */
const HALVES = [...harmony(), ...harmony().map((c) => ({ ...c, t: c.t + PASS }))];
const chordAt = (t: number) => HALVES[Math.floor(t / 3)]!;

/** Piano after-beat voicings (close position around G4), low to high. */
const COMP: Record<string, string[]> = {
  "C maj": ["C4", "E4", "G4"],
  "A min": ["C4", "E4", "A4"],
  "F maj": ["C4", "F4", "A4"],
  "G maj": ["B3", "D4", "G4"],
  "G dom7": ["B3", "F4", "G4"],
  "D min": ["D4", "F4", "A4"],
  "E min": ["B3", "E4", "G4"],
};
const voicing = (root: string, quality: Quality) => COMP[`${root} ${quality}`]!;

// ---------------------------------------------------------------- the tune

const tune = melody();
/** The tune in pass 2 (bars 17–32). */
const tune2 = tune.map((n) => ({ ...n, t: n.t + PASS }));
const shift = (notes: Note[], semis: number, v?: (n: Note) => number): Note[] =>
  notes.map((n) => ({ ...n, n: num(n.n) + semis, v: v ? v(n) : n.v }));

// Piano: the tune in pass 1, then again over the full band in the last phrase (bars 29–32).
const pianoTune: Note[] = [
  ...tune.map((n) => ({ ...n, v: (n.v ?? 0.7) * 0.9 })),
  ...tune2.filter((n) => n.t >= bar(29)).map((n) => ({ ...n, v: (n.v ?? 0.7) * 0.95 })),
];

// Glockenspiel: the tune's pulse notes an octave up (E6–E7), lighter under the band's tune.
const glock: Note[] = [...tune, ...tune2]
  .filter((n) => n.t % 3 === 0)
  .map((n) => ({ ...n, n: num(n.n) + 12, v: n.t >= PASS && n.t < bar(29) ? 0.5 : 0.62 }));

// ---------------------------------------------------------------- piano comping

// The "pah": a short chord on the last eighth of each pulse (6/8 march after-beats). Pass 1
// sits under the tune (B3–A4); pass 2 moves up an octave (B4–A5), above the band's tune.
const pianoComp: Note[] = [];
for (let t = 0; t < BARS * BAR; t += 3) {
  const c = chordAt(t);
  const up = t >= PASS ? 12 : 0;
  // The fanfare pickups (bars 16, 32) belong to the horns.
  if (t === bar(16) + 3 || t === bar(32) + 3) continue;
  for (const n of voicing(c.root, c.quality)) pianoComp.push({ t: t + 2, d: 1, n: num(n) + up, v: t % 6 === 0 ? 0.42 : 0.36 });
}

// Pass 2: the piano answers the band's held notes in the tune's own register.
const pianoAnswer = cells(
  [
    // bar 18 (Am, the band holds E): an echo of the opening rise
    [18, 3, 1, "E5"], [18, 4, 1, "A5"], [18, 5, 1, "C6"],
    // bar 22 (Am, the band holds A): falling back down to it
    [22, 3, 1, "E6"], [22, 4, 1, "C6"], [22, 5, 1, "A5"],
    // bar 26 (G, the band holds D): a little turn
    [26, 3, 1, "B5"], [26, 4, 1, "D6"], [26, 5, 1, "G5"],
  ],
  0.55,
);

// ---------------------------------------------------------------- horns

// Pass 1: two horns hold warm harmony (two chord tones, E3–C4), whole or half bars, the
// leading tones resolving (B -> C, F -> E).
const PADS: [number, number, number, string, string][] = [
  // [bar, eighth, length, upper, lower]
  [1, 0, 6, "G3", "E3"],
  [2, 0, 6, "A3", "E3"],
  [3, 0, 6, "A3", "F3"],
  [4, 0, 3, "B3", "G3"], [4, 3, 3, "B3", "F3"],
  [5, 0, 6, "C4", "E3"],
  [6, 0, 6, "C4", "E3"],
  [7, 0, 3, "A3", "F3"], [7, 3, 3, "B3", "F3"],
  [8, 0, 6, "C4", "E3"],
  [9, 0, 6, "C4", "F3"],
  [10, 0, 6, "B3", "G3"],
  [11, 0, 3, "B3", "G3"], [11, 3, 3, "C4", "A3"],
  [12, 0, 3, "A3", "F3"], [12, 3, 3, "B3", "F3"],
  [13, 0, 6, "C4", "E3"],
  [14, 0, 6, "C4", "E3"],
  [15, 0, 6, "A3", "F3"],
  [16, 0, 3, "B3", "G3"],
];
const hornPads: Note[] = PADS.flatMap(([b, t, d, hi, lo]) => [
  { t: bar(b) + t, d, n: hi, v: 0.42 },
  { t: bar(b) + t, d, n: lo, v: 0.38 },
]);

// Pass 1: a horn answers where the tune holds (G3–D4).
const hornAnswer = cells(
  [
    [2, 3, 1, "C4"], [2, 4, 1, "B3"], [2, 5, 1, "A3"],
    [6, 3, 1, "A3"], [6, 4, 1, "B3"], [6, 5, 1, "C4"], [7, 0, 2, "D4"],
    [10, 3, 1, "D4"], [10, 4, 1, "C4"], [10, 5, 1, "B3"],
  ],
  0.6,
);

// Pass 2: the horns take the tune two octaves down (G2–E4, the horn's warm middle). The second
// horn harmonizes it in a narrow band (F3–D4, over the countermelody): a third above or below
// the tune where it can, else a sixth or a fourth, always a chord tone on the pulses and on
// held notes, moving as little as it can. It leaves the pickups (bars 20, 24, 32) to the
// staccato horns.
const SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Cost of each interval (semitones) between the tune and its harmony: thirds, then sixths, then a fourth. */
const INTERVAL_COST: Record<number, number> = { 3: 0, 4: 0, 8: 1, 9: 1, 5: 1.5 };
function harmonize(line: Note[], low: number, high: number): Note[] {
  let prev = midi("B3");
  const out: Note[] = [];
  for (const n of line) {
    const m = num(n.n);
    const c = chordAt(n.t);
    const chordPcs = new Set(chordNotes(c.root, c.quality, 4).map((x) => x % 12));
    const strong = n.t % 3 === 0 || n.d >= 2;
    let best = NaN;
    let bestCost = Infinity;
    for (let h = low; h <= high; h++) {
      const inChord = chordPcs.has(h % 12);
      const base = INTERVAL_COST[Math.abs(h - m)];
      if (base === undefined || !SCALE.includes(h % 12) || (strong && !inChord)) continue;
      const cost = base + (inChord ? 0 : 0.5) + 0.15 * Math.abs(h - prev);
      if (cost < bestCost) {
        bestCost = cost;
        best = h;
      }
    }
    if (Number.isNaN(best)) continue;
    prev = best;
    out.push({ ...n, n: best, v: (n.v ?? 0.6) - 0.04 });
  }
  return out;
}
const hornTune = shift(tune2, -24, (n) => (n.t % 3 === 0 ? 0.64 : 0.56));
const isPickup = (t: number) => [20, 24, 32].some((b) => t >= bar(b) + 3 && t < bar(b + 1));
const hornHarmony = harmonize(
  hornTune.filter((n) => !isPickup(n.t)),
  midi("F3"),
  midi("D4"),
);

// Staccato horns: the fanfare pickups into each pass (a G triad, three times, growing), and a
// punch on the band's pickups in bars 20 and 24.
const hornShort: Note[] = [
  ...[16, 32].flatMap((b) =>
    [0, 1, 2].flatMap((i) => ["G3", "B3", "D4"].map((n) => ({ t: bar(b) + 3 + i, d: 1, n, v: 0.52 + i * 0.08 }))),
  ),
  ...hornTune.filter((n) => (n.t >= bar(20) + 3 && n.t < bar(21)) || (n.t >= bar(24) + 3 && n.t < bar(25))).map((n) => ({ ...n, v: 0.6 })),
];

// ---------------------------------------------------------------- tenor sax

// Pass 2: the sax doubles the horns' tune an octave up (G3–E5), the line a phone speaker carries.
const sax = shift(tune2, -12, (n) => (n.t % 3 === 0 ? 0.62 : 0.54));

// ---------------------------------------------------------------- euphonium

// The bass (staccato euphonium: the oom): root on the first pulse, a fifth or third on the
// second, walking up into phrases, and repeated Gs under the fanfare pickups. Pass 1 sits at
// E2–E3; pass 2 drops to C2–C3 to leave the countermelody room above it.
type BassBar = [string, string, string?, string?]; // first pulse, second pulse, eighths 5 and 6
const BASS1: BassBar[] = [
  ["C3", "G2"], ["A2", "E2"], ["F2", "C3"], ["G2", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E3"], ["D3", "G2"], ["C3", "E2"],
  ["F2", "C3"], ["G2", "D3"], ["E3", "A2"], ["D3", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "A2"], ["G2", "G2", "G2", "G2"],
];
const BASS2: BassBar[] = [
  ["C2", "G2"], ["A2", "E2"], ["F2", "C2"], ["G2", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "G2"], ["C2", "E2"],
  ["F2", "C2"], ["G2", "D2"], ["E2", "A2"], ["D2", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "A2"], ["G2", "G2", "G2", "G2"],
];
const bass: Note[] = [];
[BASS1, BASS2].forEach((table, pass) =>
  table.forEach(([one, two, five, six], i) => {
    const t = bar(i + 1) + pass * PASS;
    bass.push({ t, d: 2, n: one, v: 0.66 }, { t: t + 3, d: 1, n: two, v: 0.56 });
    if (five) bass.push({ t: t + 4, d: 1, n: five, v: 0.56 });
    if (six) bass.push({ t: t + 5, d: 1, n: six, v: 0.6 });
  }),
);

// Pass 2: the euphonium's countermelody (G2–G3), under the horns' tune: long notes while the
// tune moves, running eighths where it holds (bars 18, 20, 22, 24, 26, 32), resolving by step.
const counter = cells(
  [
    [17, 0, 3, "C3"], [17, 3, 3, "E3"],
    [18, 0, 3, "C3"], [18, 3, 1, "A2"], [18, 4, 1, "B2"], [18, 5, 1, "C3"],
    [19, 0, 3, "A2"], [19, 3, 3, "F3"],
    [20, 0, 1, "D3"], [20, 1, 1, "E3"], [20, 2, 4, "F3"],
    [21, 0, 3, "C3"], [21, 3, 2, "E3"], [21, 5, 1, "G3"],
    [22, 0, 2, "F3"], [22, 2, 1, "E3"], [22, 3, 1, "C3"], [22, 4, 1, "D3"], [22, 5, 1, "E3"],
    [23, 0, 3, "D3"], [23, 3, 3, "G2"],
    [24, 0, 1, "E3"], [24, 1, 1, "F3"], [24, 2, 2, "G3"],
    [25, 0, 3, "C3"], [25, 3, 3, "A2"],
    [26, 0, 3, "B2"], [26, 3, 1, "G2"], [26, 4, 1, "A2"], [26, 5, 4, "B2"],
    [27, 3, 3, "E3"],
    [28, 0, 3, "F3"], [28, 3, 3, "D3"],
    [29, 0, 2, "C3"], [29, 2, 1, "D3"], [29, 3, 2, "E3"], [29, 5, 1, "G3"],
    [30, 0, 3, "C3"], [30, 3, 3, "A2"],
    [31, 0, 2, "A2"], [31, 2, 1, "C3"], [31, 3, 4, "B2"],
    [32, 1, 1, "C3"], [32, 2, 1, "D3"], [32, 3, 3, "B2"],
  ],
  0.56,
);

// ---------------------------------------------------------------- drums

const kick: Note[] = [];
const snare: Note[] = [];
for (let t = 0; t < BARS * BAR; t++) {
  const inBar = t % BAR;
  const b = Math.floor(t / BAR) + 1;
  const two = t >= PASS;
  if (inBar === 0) kick.push({ t, d: 1, n: "C2", v: 0.62 });
  if (inBar === 3) kick.push({ t, d: 1, n: "C2", v: 0.46 });
  // Phrase ends (bars 4, 8, 12, 16, ...) get a roll or a tom fill instead of the after-beats.
  const fill = b % 4 === 0 && inBar >= 3;
  if (inBar === 3) snare.push({ t, d: 1, n: "D2", v: two ? 0.62 : 0.55 });
  else if (!fill && inBar === 5) snare.push({ t, d: 1, n: "D2", v: two ? 0.32 : 0.24 });
  else if (!fill && two && inBar === 2) snare.push({ t, d: 1, n: "D2", v: 0.22 });
}
// Rolls into bars 9, 17, 25 and 1 (the roll ends on the next downbeat's accent); tom fills into
// bars 5, 13, 21 and 29.
const rollBars = [8, 16, 24, 32];
const roll: Note[] = rollBars.map((b) => ({ t: bar(b) + 3.5, d: 2.5, n: "D2", v: b === 16 || b === 32 ? 0.7 : 0.5 }));
const tomBars = [4, 12, 20, 28];
const toms: Note[] = tomBars.flatMap((b) => [
  { t: bar(b) + 4, d: 1, n: "A2", v: 0.5 },
  { t: bar(b) + 4.5, d: 1, n: "A2", v: 0.45 },
  { t: bar(b) + 5, d: 1, n: "F2", v: 0.55 },
]);
const tomHigh = toms.filter((n) => n.n === "A2");
const tomLow = toms.filter((n) => n.n === "F2");
// Clash cymbals at the top of each pass; the suspended cymbal at the B sections and the last phrase.
const cymbals: Note[] = [1, 17].map((b) => ({ t: bar(b), d: 1, n: "C#3", v: 0.7 }));
const crash: Note[] = [9, 25, 29].map((b) => ({ t: bar(b), d: 1, n: "C#3", v: 0.6 }));

// ---------------------------------------------------------------- song

const tracks: Track[] = [
  // Tune
  { inst: "piano", notes: pianoTune, gain: 0.26, pan: -0.05, reverb: 0.25, humanize: 0.2 },
  { inst: "glockenspiel", notes: glock, gain: 6, pan: 0.25, reverb: 0.35, lowpass: 5000 },
  { inst: "horn", notes: hornTune, gain: 1.33, pan: -0.2, reverb: 0.3, humanize: 0.15 },
  { inst: "horn", notes: hornHarmony, gain: 0.96, pan: -0.3, reverb: 0.3, humanize: 0.15 },
  { inst: "sax", notes: sax, gain: 0.87, pan: 0.15, reverb: 0.28, humanize: 0.15, lowpass: 3500 },
  // Harmony and answers
  { inst: "piano", notes: pianoComp, gain: 0.045, pan: 0.1, reverb: 0.2, humanize: 0.2 },
  { inst: "piano", notes: pianoAnswer, gain: 0.15, pan: 0.05, reverb: 0.3, humanize: 0.2 },
  { inst: "horn", notes: hornPads, gain: 1, pan: -0.25, reverb: 0.35, humanize: 0.15 },
  { inst: "horn", notes: hornAnswer, gain: 1.1, pan: -0.15, reverb: 0.3, humanize: 0.15 },
  { inst: "hornShort", notes: hornShort, gain: 0.7, pan: -0.2, reverb: 0.3, humanize: 0.15 },
  // Low brass
  ...euphonium(counter, { gain: 2.2, pan: 0.3, reverb: 0.3, humanize: 0.15 }),
  ...euphonium(bass, { gain: 0.48, pan: 0, reverb: 0.15, humanize: 0.15, short: true }),
  // Drums
  { inst: "kick", notes: kick, gain: 0.46, reverb: 0.08 },
  { inst: "snareOn", notes: snare, gain: 0.64, pan: 0.05, reverb: 0.15 },
  { inst: "snareRoll", notes: roll, gain: 0.43, pan: 0.05, reverb: 0.15 },
  { inst: "tomHigh", notes: tomHigh, gain: 0.74, pan: 0.15, reverb: 0.15 },
  { inst: "tomLow", notes: tomLow, gain: 0.68, pan: -0.1, reverb: 0.15 },
  { inst: "cymbals", notes: cymbals, gain: 0.48, pan: 0.2, reverb: 0.2, lowpass: 7000 },
  { inst: "crash", notes: crash, gain: 0.58, pan: -0.2, reverb: 0.2, lowpass: 7000 },
];

const song: Song = {
  name: "classic",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.7, damp: 0.4, width: 0.9, level: 0.9 },
  tracks,
};

export default song;
