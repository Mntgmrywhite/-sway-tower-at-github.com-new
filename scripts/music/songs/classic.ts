// Classic: a sunny 6/8 brass-band march for the castle tower, in C major. The piano tune at the
// heart, a village band around it: French horns, euphonium, a tenor sax, glockenspiel and a
// march drum kit (bass drum, bright snare with rolls, toms, clash cymbals).
//
// 32 bars, the theme twice (42.7 s):
//   1–16   the piano carries the tune with its after-beat chords (the "pah"); the euphonium
//          plays the oom on the pulses and walks up into phrases; two horns hold warm harmony
//          and answer the tune's held notes (bars 2, 6, 10); the glockenspiel sparkles on the
//          tune's pulse notes. A horn fanfare pickup (bar 16) announces
//   17–32  the band's turn: the horns take the tune in harmony (a second horn a third or sixth
//          from it, on chord tones), the tenor sax doubles it an octave up so it stays clear on a
//          phone, and the euphonium sings a countermelody under it, moving where the tune holds.
//          The piano comps higher and answers the holds (bars 18, 22, 26); staccato horns and sax
//          punch the pickups (bars 20, 24) while the bass steps aside. Bars 29–32 are the full
//          band: the piano doubles the tune in its own octave and the fanfare pickup in bar 32
//          lands back on bar 1.
// Drums: bass drum on both pulses, snare on the second with a ghost note on the last eighth
// (and one on the third in pass 2), a roll or a tom fill into each phrase, clash cymbals at
// each pass, a suspended cymbal at bars 9, 25, 29.
//
// Register plan (the recorded French horn has nothing between C4 and D5, so the horns stay at
// or under D4; the tune's top E in bar 21 is the sax's alone):
//   glockenspiel G5–D7 · piano tune G4–E6 · piano comps B3–A4 (pass 1), B4–A5 (pass 2)
//   tenor sax G3–E5 (tune, pass 2) · horns E3–C4 (pads) and A3–D4 (answers) in pass 1,
//   C3–D4 (tune; its staccato pickups down to G2) and F3–D4 (harmony) in pass 2
//   euphonium countermelody G2–G3
//   euphonium bass D2–E3 (pass 1), D2–C3 (pass 2) · drums
// Bright parts are low-passed (sax, glockenspiel, snare, cymbals) so nothing bites: the mix has
// no more 5–10 kHz energy than the other cartoon skins.
// Tuning: every recording is auto-tuned (instruments.ts); on top of that the song plays the
// horn's tune and the countermelody's tuba in their cleanest layers, gives the pickups to the
// staccato takes, and raises one-eighth notes on the horn's and trombone's sustained takes a
// few cents (`settle`). Measured as heard, every pitched note lands within 5 cents.

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

// Glockenspiel: the tune's pulse notes an octave up (G5–D7), lighter under the band's tune.
const glock: Note[] = [...tune, ...tune2]
  .filter((n) => n.t % 3 === 0)
  .map((n) => ({ ...n, n: num(n.n) + 12, v: n.t >= PASS && n.t < bar(29) ? 0.5 : 0.62 }));

// ---------------------------------------------------------------- piano comping

// The "pah": a short chord on the last eighth of each pulse (6/8 march after-beats). Pass 1
// sits under the tune (B3–A4); pass 2 moves up an octave (B4–A5), above the band's tune, which
// puts it in the same octave as the sax's and the piano's tune: there it leaves out a chord
// tone a semitone from the tune's passing note (the C under a B, the F under an E), so the two
// never rub.
const tuneAt = (t: number) => tune2.find((n) => n.t <= t && t < n.t + n.d);
const rubs = (a: number, b: number) => [1, 11].includes((((a - b) % 12) + 12) % 12);
const pianoComp: Note[] = [];
for (let t = 0; t < BARS * BAR; t += 3) {
  const c = chordAt(t);
  const up = t >= PASS ? 12 : 0;
  // The fanfare pickups (bars 16, 32) belong to the horns.
  if (t === bar(16) + 3 || t === bar(32) + 3) continue;
  const mel = up ? tuneAt(t + 2) : undefined;
  for (const n of voicing(c.root, c.quality)) {
    if (mel && rubs(num(n), num(mel.n))) continue;
    pianoComp.push({ t: t + 2, d: 1, n: num(n) + up, v: t % 6 === 0 ? 0.42 : 0.36 });
  }
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

// Pass 1: a horn answers where the tune holds (A3–D4), stepping around the pads' notes so it
// never sits a semitone from them (bars 6 and 10 answer long-short, in the tune's lilt).
const hornAnswer = cells(
  [
    [2, 3, 1, "C4"], [2, 4, 1, "B3"], [2, 5, 1, "A3"],
    [6, 3, 2, "A3"], [6, 5, 1, "C4"], [7, 0, 2, "D4"],
    [10, 3, 2, "D4"], [10, 5, 1, "B3"],
  ],
  0.6,
);

// Pass 2: the horns take the tune two octaves down (C3–D4, the horn's warm middle), in the
// horn's mp layer (velocity under 0.5): the louder layer's F3 take starts 45 cents flat for its
// first 0.2 s, so every short E, F and G of the tune sounded flat. The pickups (bars 20, 24,
// 32) and the leading tone into bar 24 belong to the staccato horns (and the staccato sax).
// Two tune notes the horn's recordings can't play cleanly go to the sax alone while the horn
// holds the note before (a chord tone): the leap to the top E in bar 21 (an E4 would stretch
// the C4 recording, the horn has nothing between C4 and D5) and the C at the end of bar 30
// (the A#2 take scoops 13 cents flat into a short note). The second
// horn harmonizes it in a narrow band (F3–D4, over the countermelody): a third above or below
// the tune where it can, else a sixth or a fourth; a chord tone on the pulses, on held notes and
// on the piano's after-beats (eighths 3 and 6, where a passing note would rub against the
// chord); passing notes never a tritone or a semitone off the root; moving as little as it
// can.
const SCALE = [0, 2, 4, 5, 7, 9, 11];
/** Cost of each interval (semitones) between the tune and its harmony: thirds, then sixths, then a fourth. */
const INTERVAL_COST: Record<number, number> = { 3: 0, 4: 0, 8: 1, 9: 1, 5: 1.5 };
function harmonize(line: Note[], low: number, high: number): Note[] {
  let prev = midi("B3");
  const out: Note[] = [];
  for (const n of line) {
    const m = num(n.n);
    const c = chordAt(n.t);
    const tones = chordNotes(c.root, c.quality, 4);
    const chordPcs = new Set(tones.map((x) => x % 12));
    // A passing note may not sit a tritone or a minor second off the chord's root.
    const clashes = (h: number) => [1, 6].includes((((h - tones[0]!) % 12) + 12) % 12);
    const strong = n.t % 3 !== 1 || n.d >= 2;
    let best = NaN;
    let bestCost = Infinity;
    for (let h = low; h <= high; h++) {
      const inChord = chordPcs.has(h % 12);
      const base = INTERVAL_COST[Math.abs(h - m)];
      if (base === undefined || !SCALE.includes(h % 12) || (!inChord && (strong || clashes(h)))) continue;
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
/** The tune's pickups into a phrase in pass 2 (bars 20, 24, 32). */
const isPickup = (t: number) => [20, 24, 32].some((b) => t >= bar(b) + 3 && t < bar(b + 1));
/** Punched staccato by the horns and the sax: the pickups in bars 20 and 24, and the leading tone into bar 24. */
const punched = (t: number) => (isPickup(t) && t < bar(32)) || t === bar(23) + 5;
/** Tune notes the sax carries alone (bars 21 and 30, last eighth) while the horn holds the note before. */
const SAX_ALONE = [bar(21) + 5, bar(30) + 5];
/**
 * Song-local tuning for one-eighth notes on sustained recordings: such a note is heard only for
 * its first 0.2 s, while autotune judges a take over its first half second. The horn's mp takes
 * and the trombone's settle into pitch from a little flat, so one-eighth notes measure -5 to
 * -6 cents (horn) and -4 to -5 (trombone) as heard; raise them by that much.
 */
const settle = (notes: Note[], cents: number): Note[] => notes.map((n) => (n.d <= 1 ? { ...n, n: num(n.n) + cents / 100 } : n));
const hornLine = shift(tune2, -24);
const hornTune: Note[] = hornLine
  .filter((n) => !isPickup(n.t) && !punched(n.t) && !SAX_ALONE.includes(n.t))
  .map((n) => ({ ...n, d: SAX_ALONE.includes(n.t + 2) ? 3 : n.d, v: n.t % 3 === 0 ? 0.47 : 0.41 }));
const hornHarmony = harmonize(hornTune, midi("F3"), midi("D4"));

// Staccato horns: the fanfare pickups into each pass (a G triad, three times, growing), and a
// punch on the band's pickups in bars 20 and 24 (and the leading tone into bar 24).
const hornShort: Note[] = [
  ...[16, 32].flatMap((b) =>
    [0, 1, 2].flatMap((i) => ["G3", "B3", "D4"].map((n) => ({ t: bar(b) + 3 + i, d: 1, n, v: 0.52 + i * 0.08 }))),
  ),
  ...hornLine.filter((n) => punched(n.t)).map((n) => ({ ...n, v: 0.6 })),
];

// ---------------------------------------------------------------- tenor sax

// Pass 2: the sax doubles the horns' tune an octave up (G3–E5), the line a phone speaker carries,
// and has two of its notes to itself (bars 21 and 30). The punched pickups are its staccato
// takes: the sustained takes scoop 7-9 cents flat into a short note below C4.
const saxLine = shift(tune2, -12, (n) => (n.t % 3 === 0 || SAX_ALONE.includes(n.t) ? 0.62 : 0.54));
const sax = saxLine.filter((n) => !punched(n.t));
const saxShort = saxLine.filter((n) => punched(n.t)).map((n) => ({ ...n, v: 0.6 }));

// ---------------------------------------------------------------- euphonium

// The bass (staccato euphonium: the oom): root on the first pulse, a fifth or third on the
// second, walking up into phrases, and repeated Gs under the fanfare pickups. Pass 1 sits at
// D2–E3; pass 2 at D2–C3, under the countermelody. Where the horns' tune drops into the bass's
// own octave for its pickups (bars 20, 24), the bass steps aside: no walk under bar 20's B-C-D
// (it would run in thirds with it, a growl at that depth), and a G in unison with bar 24's G
// instead of an E a third under it. No C2: the staccato tuba's only takes for it (its A#1
// recordings) measure -1, -8 and -15 cents as heard and rotate, so the bass would wobble.
type BassBar = [string, string, string?, string?]; // first pulse, second pulse, eighths 5 and 6
const BASS1: BassBar[] = [
  ["C3", "G2"], ["A2", "E2"], ["F2", "C3"], ["G2", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "G2"], ["C3", "E2"],
  ["F2", "C3"], ["G2", "D3"], ["E3", "A2"], ["D3", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "A2"], ["G2", "G2", "G2", "G2"],
];
const BASS2: BassBar[] = [
  ["C3", "G2"], ["A2", "E2"], ["F2", "A2"], ["G2", "G2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "G2"], ["C3", "G2"],
  ["F2", "A2"], ["G2", "D2"], ["E2", "A2"], ["D2", "G2", "A2", "B2"],
  ["C3", "G2"], ["A2", "E2"], ["D2", "F2"], ["G2", "G2", "G2", "G2"],
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

// Pass 2: the euphonium's countermelody (G2–G3), between the bass and the horns' tune: long
// notes while the tune moves, moving where it holds (eighths in bars 20, 22, 24, 26, a turn in
// bar 32, a late step in bars 18 and 30), leading tones and sevenths resolving by step. It
// moves against the tune and the second horn, never with them in fifths or octaves (hence the
// late steps in bars 18 and 30, under the tune's G-E). It enters on bar 17's second pulse and
// rests where the bass lands on C3 (bars 21, 29), so the two never meet in unison.
const counter = cells(
  [
    [17, 3, 3, "E3"],
    [18, 0, 4, "C3"], [18, 4, 5, "A2"],
    [19, 3, 3, "F3"],
    [20, 0, 1, "D3"], [20, 1, 1, "E3"], [20, 2, 4, "F3"],
    [21, 3, 2, "E3"], [21, 5, 1, "G3"],
    [22, 0, 2, "F3"], [22, 2, 1, "E3"], [22, 3, 1, "C3"], [22, 4, 1, "D3"], [22, 5, 1, "E3"],
    [23, 0, 5, "D3"],
    [24, 0, 1, "E3"], [24, 1, 1, "F3"], [24, 2, 2, "G3"],
    [25, 0, 6, "C3"],
    [26, 0, 3, "D3"], [26, 3, 1, "G2"], [26, 4, 1, "A2"], [26, 5, 4, "B2"],
    [27, 3, 2, "C3"], [27, 5, 1, "E3"],
    [28, 0, 3, "F3"], [28, 3, 3, "D3"],
    [29, 3, 2, "E3"], [29, 5, 1, "D3"],
    [30, 0, 4, "C3"], [30, 4, 2, "A2"],
    [31, 0, 2, "D3"], [31, 2, 1, "C3"], [31, 3, 3, "A2"],
    [32, 0, 1, "D3"], [32, 1, 1, "E3"], [32, 2, 1, "D3"], [32, 3, 3, "B2"],
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
  // Phrase ends (bars 4, 8, 12, 16, ...) drop the last ghost note for a roll or a tom fill.
  const fill = b % 4 === 0 && inBar >= 3;
  if (inBar === 3) snare.push({ t, d: 1, n: "D2", v: 0.62 });
  else if (!fill && inBar === 5) snare.push({ t, d: 1, n: "D2", v: two ? 0.32 : 0.3 });
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

// The countermelody's euphonium, its tuba in the soft layer (velocity under 1/3, hence the gain):
// the louder takes start 10-20 cents flat on A#2 and F2, which its short notes would hear. The
// trombone's one-eighth notes settle.
const counterTracks = euphonium(counter, { gain: 2.7, pan: 0.3, reverb: 0.3, humanize: 0.15 }).map((t) =>
  t.inst === "tuba" ? { ...t, notes: counter.map((n) => ({ ...n, v: 0.3 })), gain: (t.gain ?? 1) * 3 } : { ...t, notes: settle(counter, 4) },
);

const tracks: Track[] = [
  // Tune
  { inst: "piano", notes: pianoTune, gain: 0.26, pan: -0.05, reverb: 0.25, humanize: 0.2 },
  { inst: "glockenspiel", notes: glock, gain: 7, pan: 0.25, reverb: 0.35, lowpass: 3000 },
  { inst: "horn", notes: settle(hornTune, 5), gain: 2.9, pan: -0.2, reverb: 0.3, humanize: 0.15 },
  { inst: "horn", notes: settle(hornHarmony, 5), gain: 2.1, pan: -0.3, reverb: 0.3, humanize: 0.15 },
  { inst: "sax", notes: sax, gain: 0.87, pan: 0.15, reverb: 0.28, humanize: 0.15, lowpass: 3500 },
  { inst: "saxShort", notes: saxShort, gain: 0.87, pan: 0.15, reverb: 0.28, humanize: 0.15, lowpass: 3500 },
  // Harmony and answers
  { inst: "piano", notes: pianoComp.filter((n) => n.t < PASS), gain: 0.045, pan: 0.1, reverb: 0.2, humanize: 0.2 },
  { inst: "piano", notes: pianoComp.filter((n) => n.t >= PASS), gain: 0.12, pan: 0.1, reverb: 0.2, humanize: 0.2 },
  { inst: "piano", notes: pianoAnswer, gain: 0.18, pan: 0.05, reverb: 0.3, humanize: 0.2 },
  { inst: "horn", notes: hornPads, gain: 1, pan: -0.25, reverb: 0.35, humanize: 0.15 },
  { inst: "horn", notes: hornAnswer, gain: 1.1, pan: -0.15, reverb: 0.3, humanize: 0.15 },
  { inst: "hornShort", notes: hornShort, gain: 0.7, pan: -0.2, reverb: 0.3, humanize: 0.15 },
  // Low brass
  ...counterTracks,
  // The bass a little louder in pass 2, under the full band.
  ...euphonium(bass.filter((n) => n.t < PASS), { gain: 0.6, pan: 0, reverb: 0.15, humanize: 0.15, short: true }),
  ...euphonium(bass.filter((n) => n.t >= PASS), { gain: 0.75, pan: 0, reverb: 0.15, humanize: 0.15, short: true }),
  // Drums
  { inst: "kick", notes: kick, gain: 0.46, reverb: 0.08 },
  // The same hits in both passes, a little lighter under the piano in pass 1.
  { inst: "snareOn", notes: snare.filter((n) => n.t < PASS), gain: 0.64, pan: 0.05, reverb: 0.15, lowpass: 7000 },
  { inst: "snareOn", notes: snare.filter((n) => n.t >= PASS), gain: 1, pan: 0.05, reverb: 0.15, lowpass: 7000 },
  { inst: "snareRoll", notes: roll, gain: 0.43, pan: 0.05, reverb: 0.15, lowpass: 7000 },
  { inst: "tomHigh", notes: tomHigh, gain: 0.95, pan: 0.15, reverb: 0.15 },
  { inst: "tomLow", notes: tomLow, gain: 0.88, pan: -0.1, reverb: 0.15 },
  { inst: "cymbals", notes: cymbals, gain: 0.5, pan: 0.2, reverb: 0.2, lowpass: 6000 },
  { inst: "crash", notes: crash, gain: 0.58, pan: -0.2, reverb: 0.2, lowpass: 6000 },
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
