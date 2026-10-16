// Neon: an 80s neon-noir power ballad on real instruments, for all four Neon skins (Synthwave,
// Cyberpunk, Blacklight, Minimal). The theme's 6/8 at a dotted quarter = 90 is a 12/8 ballad
// groove: kick on the bar, a big snare backbeat on the second pulse sent deep into a long, wide
// reverb (the closest this reverb gets to 80s gated drums), closed hi-hat on every triplet
// eighth, a crash on each section and a tom fill into it. A minor (minorize, keeping the leading
// tone G# where the tune cadences on the dominant), coloured the 80s way: Esus4 -> E7, a
// descending bass (Am – Am/G – F), Dm/F and a D pedal (Dm7 – Bø/D) into the E chords, and a lift
// into the relative major for B (F | G | C F | Bø E7).
//
// 32 bars (42.7 s), the theme twice.
// Pass 1 is the verse. The tenor sax sings the tune low and breathy (A, A', A'') over the piano's
// big left-hand octaves and soft broken-chord triplets above it, with the bass pizz on the pulse
// (A1–G2: on G and F it doubles the left hand's upper octave, so no long-ringing low pizz runs
// into the next chord);
// from A' the horns hold open pads underneath. In B the piano takes the tune (with a chord tone
// under each note) over harp arpeggios, and the sax answers. A snare roll, a horn swell and a sax
// run up the E7 chord lift bar 16 into pass 2, the chorus: the sax solos on the tune an octave
// up (turns, runs, a climb to C6 at bar 29) and the soprano sax answers its held notes; the
// piano's triplets drop under it, the bass drives eighths, the horns pad in triads, horn +
// euphonium stabs mark the sections (pushed an eighth early into B and the last A), and a
// glockenspiel arpeggiator shimmers on top. The last bar runs down the E7 chord and a big fill
// drops the loop back into the verse.
//
// Voicings are generated per chord inside each part's lane, leaving out any chord tone a
// semitone from a passing note in the tune (no b9 against the melody) and, for the parts that
// ring on (glockenspiel, harp), any tone a semitone from the chords and tune notes they ring into.
//
// Register plan (so no two parts fight in the same octave):
//   pass 1: piano LH octaves F1–E3 · bass pizz A1–G2 · horn pads F2–F3 · sax G#3–C5 ·
//           piano RH C5–C6 (B: harp C3–A4 · piano tune E4–B5 over its harmony · sax answers G#3–E4)
//   pass 2: piano LH F1–E3 · bass pizz A1–G2 · horn pads, swell and stabs D3–D4 · piano RH C4–C5 ·
//           sax G#4–C6 (its last bar runs down to D4) · soprano sax G5–D6 · glockenspiel C6–A7
// All parts sit inside their instruments' recorded ranges.

import { midi } from "../sampler";
import { euphonium, transpose, type Note, type Song, type Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, minorize, THEME_BARS, THEME_BPM } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One statement of the theme, in eighths. */
const PASS = THEME_BARS * BAR;
const BARS = THEME_BARS * 2;
const LOOP = BARS * BAR;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const pc = (m: number): number => ((Math.round(m) % 12) + 12) % 12;
/** Start of a 1-based bar, in eighths. */
const bar = (b: number): number => (b - 1) * BAR;
/** 1-based bar that time t falls in. */
const barOf = (t: number): number => Math.floor(t / BAR) + 1;
const dB = (x: number): number => 10 ** (x / 20);
const clampV = (v: number): number => Math.min(0.95, Math.max(0.1, v));

/**
 * Split one part into several tracks that differ only in gain, so each note can get its own
 * level (the sampler has no per-note gain): evens out recordings captured at different levels,
 * and shapes dynamics without changing velocity layer.
 */
function byGain(base: Omit<Track, "notes" | "gain">, notes: Note[], gainOf: (n: Note) => number): Track[] {
  const groups = new Map<number, Note[]>();
  for (const n of notes) {
    const g = Math.round(gainOf(n) * 1000) / 1000;
    groups.set(g, [...(groups.get(g) ?? []), n]);
  }
  return [...groups].map(([gain, ns]) => ({ ...base, gain, notes: ns }));
}

/**
 * The theme in A minor. minorize() flattens every B, but over the dominant (G) the B is the
 * leading tone the tune cadences on, so it stays natural (it becomes G# in A minor).
 */
const theme: Note[] = (() => {
  const major = melody();
  const minor = minorize(major).map((n, i) => {
    const orig = num(major[i]!.n);
    const onDominant = CHORDS[Math.floor(n.t / 3)]![0] === "G";
    return orig % 12 === 11 && onDominant ? { ...n, n: orig } : n;
  });
  return transpose(minor, -3);
})();

// ------------------------------------------------------------------ harmony

interface Chord {
  /** Bass pizz and the bottom of the piano's left-hand octave. */
  bass: string;
  /** Chord tones above the bass (pitch classes, as note names in any octave). */
  upper: string[];
  /** Horn pads: pass 1 open and low (under the low sax), pass 2 triads (under the piano). */
  pad1: string[];
  pad2: string[];
}
const Am: Chord = { bass: "A1", upper: ["A", "C", "E"], pad1: ["A2", "E3"], pad2: ["E3", "A3", "C4"] };
const AmG: Chord = { bass: "G1", upper: ["A", "C", "E"], pad1: ["C3", "E3"], pad2: ["E3", "A3", "C4"] };
const F: Chord = { bass: "F1", upper: ["F", "A", "C"], pad1: ["F2", "C3"], pad2: ["F3", "A3", "C4"] };
const Dm: Chord = { bass: "D2", upper: ["D", "F", "A"], pad1: ["A2", "F3"], pad2: ["F3", "A3", "D4"] };
const Dm7: Chord = { bass: "D2", upper: ["D", "F", "A", "C"], pad1: ["C3", "F3"], pad2: ["F3", "A3", "C4"] };
const Esus: Chord = { bass: "E2", upper: ["E", "A", "B"], pad1: ["B2", "E3"], pad2: ["E3", "A3", "B3"] };
const E7: Chord = { bass: "E2", upper: ["E", "G#", "B", "D"], pad1: ["G#2", "D3"], pad2: ["E3", "G#3", "D4"] };
const G: Chord = { bass: "G1", upper: ["G", "B", "D"], pad1: ["B2", "D3"], pad2: ["D3", "G3", "B3"] };
const C: Chord = { bass: "C2", upper: ["C", "E", "G"], pad1: ["C3", "E3"], pad2: ["E3", "G3", "C4"] };
const Bo: Chord = { bass: "B1", upper: ["B", "D", "F", "A"], pad1: ["D3", "F3"], pad2: ["F3", "A3", "D4"] };
/**
 * Inversions where the tune lands on the chord roots into the cadence (F D E over bars 6–7,
 * D B E over bars 15–16, again in 22–23 and 31–32): in root position the bass doubled the tune
 * in octaves for three pulses straight into the E. Dm/F steps down to E; Bø/D (a Dm6) holds the
 * D under Dm7 – Dm6 – Esus, the line cliché.
 */
const DmF: Chord = { ...Dm, bass: "F2" };
const BoD: Chord = { ...Bo, bass: "D2" };

/** One chord per half bar (dotted quarter), 16 bars; both passes share it. */
const HALVES: Chord[] = [
  Am, Am, F, F, Dm, Dm, Esus, E7, // A
  Am, Am, G, F, DmF, E7, Am, AmG, // A'
  F, F, G, G, C, F, Bo, E7, // B
  Am, AmG, F, F, Dm7, BoD, Esus, E7, // A''
];
const HALVES_PER_LOOP = LOOP / 3;
const chordOf = (h: number): Chord => HALVES[((h % 32) + 32) % 32]!;
const tonesOf = (c: Chord): Set<number> => new Set([c.bass, ...c.upper.map((n) => `${n}4`)].map((n) => pc(num(n))));

/** Pushes: the band plays these downbeats an eighth early (into pass 2's B and its last A). */
const PUSHES = new Set([bar(25), bar(29)]);
/** Where the accompaniment of half bar h starts and ends (a pushed half starts an eighth early). */
const span = (h: number): [number, number] => [3 * h - (PUSHES.has(3 * h) ? 1 : 0), 3 * h + 3 - (PUSHES.has(3 * h + 3) ? 1 : 0)];

// ------------------------------------------------------------------ tenor sax (the star)

type Line = [t: number, d: number, n: string][];

/** Pass 1: the tune an octave down (G#3–C5), the sax's warm, breathy register. */
const verse: Note[] = [];
for (const n of theme) {
  const b = barOf(n.t);
  // The piano takes the pickup into B and the B section; the sax ends bar 16 with its own run.
  if ((b === 8 && n.t % BAR >= 3) || (b >= 9 && b <= 12) || (b === 16 && n.t % BAR >= 3)) continue;
  verse.push({ ...n, n: num(n.n) - 12 });
}
const answers: Line = [
  // Bar 10: answers the piano's held B over G (B D E D).
  [bar(10) + 3, 0.5, "B3"], [bar(10) + 3.5, 0.5, "D4"], [bar(10) + 4, 1, "E4"], [bar(10) + 5, 1.5, "D4"],
  // Bar 12: the pickup back into the tune (G# B -> C).
  [bar(12) + 4.5, 0.5, "G#3"], [bar(12) + 5, 1, "B3"],
  // Bar 16: a run up the E7 chord into the solo.
  [bar(16) + 3, 0.5, "D4"], [bar(16) + 3.5, 0.5, "E4"], [bar(16) + 4, 0.5, "G#4"], [bar(16) + 4.5, 0.5, "A4"], [bar(16) + 5, 1, "B4"],
];

/** Pass 2: the solo, on the tune an octave up (G#4–C6), with turns, runs and a climb to C6. */
const SOLO: Line[] = [
  [[0, 2, "C5"], [2, 1, "E5"], [3, 2, "A5"], [5, 1, "G5"]], // 17
  [[0, 2, "F5"], [2, 1, "E5"], [3, 1.5, "C5"], [4.5, 0.5, "D5"], [5, 0.5, "C5"], [5.5, 0.5, "A4"]], // 18: a turn
  [[0, 2, "D5"], [2, 1, "F5"], [3, 1.5, "A5"], [4.5, 0.5, "G5"], [5, 1, "F5"]], // 19
  [[0, 3, "E5"], [3, 0.5, "D5"], [3.5, 0.5, "B4"], [4, 0.5, "G#4"], [4.5, 0.5, "A4"], [5, 1, "B4"]], // 20: down E7 and back
  [[0, 2, "C5"], [2, 1, "E5"], [3, 2, "A5"], [5, 1, "C6"]], // 21
  [[0, 2, "B5"], [2, 1, "A5"], [3, 3, "F5"]], // 22
  [[0, 2, "D5"], [2, 1, "F5"], [3, 2, "E5"], [5, 1, "G#4"]], // 23
  [[0, 3, "A4"], [3, 0.5, "C5"], [3.5, 0.5, "D5"], [4, 0.5, "E5"], [4.5, 0.5, "G5"], [5, 0.5, "A5"], [5.5, 0.5, "G5"]], // 24: pentatonic climb
  [[0, 2, "F5"], [2, 1, "E5"], [3, 2, "D5"], [5, 1, "F5"]], // 25
  [[0, 2, "E5"], [2, 1, "D5"], [3, 3, "B4"]], // 26
  [[0, 2, "E5"], [2, 1, "C5"], [3, 2, "F5"], [5, 1, "A5"]], // 27
  [[0, 2, "B5"], [2, 1, "A5"], [3, 1, "G#5"], [4, 0.5, "A5"], [4.5, 0.5, "B5"], [5, 4, "C6"]], // 28: up to the top, on the push
  [[3, 2, "A5"], [5, 1, "G5"]], // 29: the climax held over the bar line
  [[0, 2, "F5"], [2, 1, "E5"], [3, 2, "C5"], [5, 1, "A4"]], // 30
  [[0, 2, "D5"], [2, 1, "C5"], [3, 2, "B4"], [5, 1, "D5"]], // 31
  [[0, 3, "E5"], [3, 0.5, "D5"], [3.5, 0.5, "B4"], [4, 0.5, "G#4"], [4.5, 0.5, "E4"], [5, 1, "D4"]], // 32: down into bar 1's C4
];
const solo: Note[] = SOLO.flatMap((line, i) => line.map(([t, d, n]) => ({ t: bar(17 + i) + t, d, n })));

/** Sax phrasing: slightly behind the beat, tongued legato, louder on the pulses, long notes and high notes. */
const LAID_BACK = 0.08;
function phrase(notes: Note[], base: number): Note[] {
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  return sorted.map((n, i) => {
    const next = sorted[i + 1];
    const gapAfter = next ? next.t - (n.t + n.d) : Infinity;
    // Legato into the next note (the release overlaps its attack); a breath before a rest.
    const d = gapAfter < 0.01 ? n.d - 0.04 : n.d - 0.25;
    const pulse = n.t % 3 === 0 ? 0.08 : n.t % 1 === 0 ? 0.03 : 0;
    const v = clampV(base + pulse + Math.min(0.08, (n.d - 1) * 0.04) + (num(n.n) - 69) * 0.006);
    return { t: n.t + LAID_BACK, d, n: num(n.n), v };
  });
}
const sax: Note[] = [...phrase([...verse, ...answers.map(([t, d, n]) => ({ t, d, n }))], 0.6), ...phrase(solo, 0.74)];
/** Per-note level (dB) evening out the recordings (measured, phone-weighted): the low notes are ~1.5 dB softer. */
const saxTrim = (m: number): number => (m < midi("A4") ? 1.5 : 0);

// The soprano sax answers the tenor's held notes in pass 2 (bars 22, 26 and 30).
const soprano: Note[] = [
  // Over F, a pentatonic turn above the held F5.
  ...phrase([{ t: bar(22) + 3.5, d: 0.5, n: "C6" }, { t: bar(22) + 4, d: 0.5, n: "D6" }, { t: bar(22) + 4.5, d: 0.5, n: "C6" }, { t: bar(22) + 5, d: 1.2, n: "A5" }], 0.62),
  // Over G, rising above the held B4.
  ...phrase([{ t: bar(26) + 3.5, d: 0.5, n: "G5" }, { t: bar(26) + 4, d: 0.5, n: "B5" }, { t: bar(26) + 4.5, d: 1.3, n: "D6" }], 0.62),
  // Over F, answering the way down.
  ...phrase([{ t: bar(30) + 3.5, d: 0.5, n: "A5" }, { t: bar(30) + 4, d: 0.5, n: "C6" }, { t: bar(30) + 4.5, d: 1.2, n: "A5" }], 0.62),
];

// ------------------------------------------------------------------ the piano's tune in B (pass 1)

// From the pickup in bar 8, with a chord tone under each note (the nearest at least a minor 3rd
// below; the pickup is a single line).
const pianoTop: Note[] = [];
const pianoUnder: Note[] = [];
for (const n of theme) {
  const b = barOf(n.t);
  if (!((b === 8 && n.t % BAR >= 3) || (b >= 9 && b <= 12))) continue;
  const m = num(n.n);
  pianoTop.push({ t: n.t, d: n.d - 0.05, n: m, v: clampV((n.v ?? 0.6) * 0.95) });
  if (b === 8) continue;
  const tones = tonesOf(chordOf(Math.floor(n.t / 3)));
  let h = m - 3;
  while (!tones.has(pc(h))) h--;
  pianoUnder.push({ t: n.t + 0.01, d: n.d - 0.05, n: h, v: clampV((n.v ?? 0.6) * 0.75) });
}

// ------------------------------------------------------------------ voicing guard

/** Pitch classes of the tune's passing notes (not in the chord) sounding in half bar h (as pushed). */
const tuneLines = [sax, soprano, pianoTop];
function passingAt(h: number): Set<number> {
  const tones = tonesOf(chordOf(h));
  const [start, end] = span(h);
  const out = new Set<number>();
  for (const line of tuneLines) {
    for (const n of line) {
      if (n.t + n.d > start + 0.1 && n.t < end - 0.1 && !tones.has(pc(num(n.n)))) out.add(pc(num(n.n)));
    }
  }
  return out;
}
const semitone = (a: number, b: number): boolean => [1, 11].includes(((a - b) % 12 + 12) % 12);
/**
 * The chord tones of half bar h a part may use: not a semitone from the tune's passing notes
 * there (a sustained b9 under the melody), and, for parts that ring on (`ringing` = how many
 * half bars a note rings into), not a semitone from the chords and passing notes it rings into.
 */
function allowed(h: number, ringing: number): Set<number> {
  const tones = [...tonesOf(chordOf(h))];
  const tune = [...passingAt(h)];
  const clean = (avoid: number[]) => tones.filter((p) => !avoid.some((a) => semitone(p, a)));
  // Look as far ahead as the part rings, nearer if that leaves nothing; the tune always counts.
  for (let reach = ringing; reach >= 0; reach--) {
    const avoid = [...tune];
    for (let k = 1; k <= reach; k++) {
      if (chordOf(h + k) !== chordOf(h)) avoid.push(...tonesOf(chordOf(h + k)));
      avoid.push(...passingAt(h + k));
    }
    if (clean(avoid).length) return new Set(clean(avoid));
  }
  return new Set(tones);
}
/**
 * `count` allowed chord tones of half bar h rising from `from` within an octave and a 5th (the
 * upper voices only, no slash bass); a single allowed tone is played in octaves (low, high, low).
 */
function voice(h: number, from: string, count: number, ringing: number): number[] {
  const ok = allowed(h, ringing);
  const upper = new Set(chordOf(h).upper.map((n) => pc(num(`${n}4`))));
  const lane: number[] = [];
  for (let m = num(from); m < num(from) + 19; m++) if (ok.has(pc(m)) && upper.has(pc(m))) lane.push(m);
  if (!lane.length) for (let m = num(from); m < num(from) + 12; m++) if (upper.has(pc(m))) lane.push(m);
  if (lane.length >= count) return lane.slice(0, count);
  // Too few tones: alternate them (a single one in octaves).
  const pool = lane.length === 1 ? [lane[0]!, lane[0]! + 12] : lane;
  return Array.from({ length: count }, (_, k) => pool[k % pool.length]!);
}
/** A held voicing (pads) with the notes the guard forbids left out. */
const thin = (h: number, notes: string[]): number[] => notes.map(num).filter((m) => allowed(h, 0).has(pc(m)));

// ------------------------------------------------------------------ piano

/**
 * The upright's bass zones are tuned flat (measured over partials 2–4: the F#1 zone ~-43 cents,
 * C2 ~-26, A1 ~-19, the F#2 zone ~-14), so the left hand's notes are pulled up to the band (cents).
 */
const PIANO_CENTS = new Map(
  Object.entries({ F1: 43, G1: 43, A1: 19, B1: 12, C2: 26, D2: 10, E2: 10, F2: 14, G2: 14, A2: 2, B2: 2, C3: 2, D3: 5, E3: 5, F3: 5, G3: 5 }).map(([k, c]) => [midi(k), c]),
);
const pianoTuned = (m: number): number => m + (PIANO_CENTS.get(m) ?? 0) / 100;

/** Rising broken-chord triplets over half bar h (the first note moves with a push), pedalled to its end. */
function arpeggio(h: number, notes: number[], v: (k: number) => number): Note[] {
  const [start, end] = span(h);
  return notes
    .map((n, k) => ({ t: k === 0 ? start : 3 * h + k, n, k }))
    .filter((x) => x.t < end - 0.01)
    .map(({ t, n, k }) => ({ t, d: end - t - 0.05, n, v: v(k) }));
}

const lh: Note[] = [];
const rh: Note[] = [];
for (let h = 0; h < HALVES_PER_LOOP; h++) {
  const pass2 = 3 * h >= PASS;
  const [start, end] = span(h);
  // Left hand: a big octave on every pulse, held like the sustain pedal.
  const low = num(chordOf(h).bass);
  const v = pass2 ? 0.74 : h % 2 === 0 ? 0.62 : 0.56;
  lh.push({ t: start, d: end - start - 0.05, n: pianoTuned(low), v }, { t: start + 0.01, d: end - start - 0.05, n: pianoTuned(low + 12), v: v - 0.04 });
  // Right hand: soft and high above the low sax in pass 1 (not where it has the tune); under the solo in pass 2.
  if (3 * h >= bar(8) + 3 && 3 * h < bar(13)) continue;
  rh.push(...arpeggio(h, voice(h, pass2 ? "C4" : "C5", 3, 0), (k) => (pass2 ? 0.56 - k * 0.02 : 0.42 - k * 0.03)));
}

// ------------------------------------------------------------------ bass pizz

/**
 * The pizz plays the roots from A1 to G2. F1 and G1 came from the loud layer's E1 and G1 takes,
 * which ring for 2+ s (F1 still -12 dB a second later), so F1 soured every cadence onto E7 and the
 * chorus's repeated F1s piled up into a drone. G and F go up an octave, to the E2 take (down 24 dB
 * within a second, at most 3 semitones from it); the piano's left hand keeps the low A–G–F descent.
 */
const pizzRoot = (m: number): number => (m < num("A1") ? m + 12 : m);
/** The E2 zone's two takes measure -1 and -5 cents (partials 2–8), so the notes played from it are centred. */
const BASS_CENTS = new Map(["E2", "F2", "G2"].map((k) => [midi(k), 3]));
/** Per-note level (dB), from measuring each rendered note (phone-weighted, first 300 ms). */
const BASS_TRIM = new Map(Object.entries({ B1: 2.5, C2: 3.5, D2: 4.5, F2: 1 }).map(([k, v]) => [midi(k), v]));
const bassNotes: Note[] = [];
for (let t = 0; t < LOOP; t++) {
  const pass2 = t >= PASS;
  const e = t % 3;
  // Pass 1 on the pulse; pass 2 drives eighths, pulses accented, the pushes on the next root.
  if (!pass2 && e !== 0) continue;
  const pushed = PUSHES.has(t + 1);
  const chord = chordOf(Math.floor(t / 3) + (pushed ? 1 : 0));
  // Dm/F walks down through D into the E (F F D | E): a last F would ring a semitone over the E.
  const root = pass2 && e === 2 && chord === DmF ? num("D2") : pizzRoot(num(chord.bass));
  const v = e === 0 ? (t % BAR === 0 ? 0.86 : 0.8) : pushed ? 0.84 : 0.66;
  bassNotes.push({ t, d: pass2 ? 1 : 3, n: root + (BASS_CENTS.get(root) ?? 0) / 100, v });
}
const bass = byGain({ inst: "bassPizz", pan: 0, reverb: 0.08, humanize: 0.25 }, bassNotes, (n) => 0.52 * dB(BASS_TRIM.get(Math.round(num(n.n))) ?? 0));

// ------------------------------------------------------------------ horns: pads, swell, stabs

/** Horn level per note (dB), measured (phone-weighted): the A3 zone was recorded ~4 dB hot, A2–C3 ~8.5 dB soft. */
const HORN_TRIM = new Map(Object.entries({ F2: -2, "G#2": 1.5, A2: 8.5, B2: 8.5, C3: 8.5, D3: 1.5, "G#3": -4, A3: -4 }).map(([k, v]) => [midi(k), v]));
const pads: Note[] = [];
// Pads hold each chord, tied across repeated notes; pass 1 from A' (bar 5), open and low, pass 2
// in triads under the piano. They breathe under the piano's pickup into B (bar 8), and bar 16's
// second half is the swell.
for (let h = bar(5) / 3; h < HALVES_PER_LOOP; h++) {
  if (3 * h === bar(8) + 3 || 3 * h === bar(16) + 3) continue;
  const pass2 = 3 * h >= PASS;
  const [start, end] = span(h);
  for (const m of thin(h, pass2 ? chordOf(h).pad2 : chordOf(h).pad1)) {
    const tied = pads.find((p) => p.n === m && Math.abs(p.t + p.d + 0.1 - start) < 0.01 && start !== PASS);
    if (tied) tied.d += end - start;
    else pads.push({ t: start, d: end - start - 0.1, n: m, v: 0.56 });
  }
}
// The swell into the chorus: E7 (its 3rd left to the sax's run) blooms bottom-up over bar 16's last pulse.
const swell: Note[] = ["E3", "B3", "D4"].map((n, k) => ({ t: bar(16) + 3 + k * 0.67, d: 3 - k * 0.67, n: num(n), v: 0.5 + k * 0.08 }));

// Stabs: short horns + euphonium on the chorus downbeats, two of them pushed an eighth early.
// Topped at C4: the staccato horn has no recording between C4 and D5, so an E4 or F4 on top was
// the C4 take pitched up 4-5 semitones.
const STABS: [number, string[], string][] = [
  [bar(17), ["E3", "A3", "C4"], "A2"],
  [bar(21), ["E3", "A3", "C4"], "A2"],
  [bar(25) - 1, ["F3", "A3", "C4"], "F2"],
  [bar(29) - 1, ["E3", "A3", "C4"], "A2"],
];
const HORN_SHORT_TRIM = new Map(Object.entries({ C4: 1.5 }).map(([k, v]) => [midi(k), v]));
const stabs: Note[] = STABS.flatMap(([t, ns]) => ns.map((n, k) => ({ t: t + k * 0.012, d: 1, n: num(n), v: 0.6 })));
const euphStabs: Note[] = STABS.map(([t, , root]) => ({ t, d: 1, n: num(root), v: 0.7 }));

// ------------------------------------------------------------------ harp and glockenspiel arpeggios

// Harp under the piano's tune in pass 1's B; the glockenspiel arpeggiator over the whole chorus.
// Both ring on, so their voicings also avoid the next chord's neighbours.
/** The harp strings that measure off over partials 1–3 (C3, D3 and F4 ~5–6 cents sharp, D4 ~6 flat, B3/C4 ~3 flat), pulled in (cents). */
const HARP_CENTS = new Map(Object.entries({ C3: -5, D3: -5, B3: 3, C4: 3, D4: 6, F4: -6 }).map(([k, c]) => [midi(k), c]));
const harp: Note[] = [];
for (let h = bar(9) / 3; h < bar(13) / 3; h++) harp.push(...arpeggio(h, voice(h, "C3", 3, 1), (k) => (k === 0 ? 0.5 : 0.42)));
for (const n of harp) n.n = num(n.n) + (HARP_CENTS.get(num(n.n)) ?? 0) / 100;
const glock: Note[] = [];
for (let h = PASS / 3; h < HALVES_PER_LOOP; h++) glock.push(...arpeggio(h, voice(h, "C6", 3, 2), (k) => (k === 0 ? 0.3 : 0.24)));

// ------------------------------------------------------------------ drums

const kickVerse: Note[] = [];
const kickChorus: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const tomHi: Note[] = [];
const tomLo: Note[] = [];
const hatPulse: Note[] = [];
const hatOff: Note[] = [];
const FILL_BARS = new Set([4, 8, 12, 16, 20, 24, 28, 32]);
for (let b = 1; b <= BARS; b++) {
  const s = bar(b);
  const pass2 = b > THEME_BARS;
  // Kick on the bar (and on the "a" of the second pulse in the chorus, leading on). Always the
  // hardest recorded hit, whose beater click carries on a phone; the chorus is louder in gain.
  if (!PUSHES.has(s)) (pass2 ? kickChorus : kickVerse).push({ t: s, d: 1, n: "C2", v: 0.88 });
  if (pass2 && !FILL_BARS.has(b)) kickChorus.push({ t: s + 5, d: 1, n: "C2", v: 0.82 });
  // The backbeat.
  snare.push({ t: s + 3, d: 1, n: "D2", v: 0.9 });
  // Hats on every triplet eighth, the pulses louder; the drummer's hands leave them for fills.
  for (let e = 0; e < 6; e++) {
    if (FILL_BARS.has(b) && e >= 4) continue;
    if (b === 16 && e < 3) continue; // the roll
    if (b === 32 && e >= 2) continue; // the big fill
    (e % 3 === 0 ? hatPulse : hatOff).push({ t: s + e, d: 1, n: "F#2", v: 0.62 });
  }
}
// Tom fills into each section: two toms down the last pulse, longer at the halves and passes.
const fill = (b: number, hits: [number, "hi" | "lo", number][]) => {
  for (const [e, drum, v] of hits) (drum === "hi" ? tomHi : tomLo).push({ t: bar(b) + e, d: 1, n: drum === "hi" ? "A2" : "F2", v });
};
for (const b of [4, 12, 20, 28]) fill(b, [[4, "hi", 0.62], [4.5, "hi", 0.66], [5, "lo", 0.7], [5.5, "lo", 0.74]]);
for (const b of [8, 24]) fill(b, [[3.5, "hi", 0.6], [4, "hi", 0.64], [4.5, "hi", 0.68], [5, "lo", 0.72], [5.5, "lo", 0.76]]);
fill(16, [[3.5, "hi", 0.7], [4, "hi", 0.72], [4.5, "lo", 0.74], [5, "lo", 0.78], [5.5, "lo", 0.8]]);
fill(32, [[3.5, "hi", 0.7], [4, "hi", 0.74], [4.5, "lo", 0.76], [5, "lo", 0.8], [5.5, "lo", 0.84]]);
// Bar 16: a snare roll swelling into the chorus (each eighth a louder recorded roll).
roll.push({ t: bar(16), d: 1, n: "D2", v: 0.2 }, { t: bar(16) + 1, d: 1, n: "D2", v: 0.5 }, { t: bar(16) + 2, d: 0.95, n: "D2", v: 0.85 });
// Bar 32: snare pickups into the backbeat before the fill drops back into the verse.
snare.push({ t: bar(32) + 2, d: 1, n: "D2", v: 0.66 }, { t: bar(32) + 2.5, d: 1, n: "D2", v: 0.72 });
// Kick under the pushes and the fills' last notes.
for (const t of PUSHES) kickChorus.push({ t: t - 1, d: 1, n: "C2", v: 0.88 });
kickVerse.push({ t: bar(16) + 5.5, d: 1, n: "C2", v: 0.84 });
kickChorus.push({ t: bar(32) + 5.5, d: 1, n: "C2", v: 0.84 });
// Crash on each section (on the pushes, an eighth early): big at the passes and B, lighter in A' and A''.
const crashBig: Note[] = [bar(1), bar(9), bar(17), bar(25) - 1, bar(29) - 1].map((t) => ({ t, d: 1, n: "C#3", v: 0.8 }));
const crash: Note[] = [bar(5), bar(13), bar(21)].map((t) => ({ t, d: 1, n: "C#3", v: 0.8 }));

// ------------------------------------------------------------------ the song

const song: Song = {
  name: "neon",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.86, damp: 0.45, width: 1, level: 1 },
  tracks: [
    ...byGain({ inst: "sax", pan: 0, reverb: 0.3, humanize: 0.3, lowpass: 4200 }, sax, (n) => 1.4 * dB(saxTrim(Math.round(num(n.n))))),
    { inst: "sopranoSax", notes: soprano, gain: 1.6, pan: 0.25, reverb: 0.38, humanize: 0.3, lowpass: 4500 },
    { inst: "piano", notes: lh, gain: 0.11, pan: -0.1, reverb: 0.22, humanize: 0.2 },
    { inst: "piano", notes: rh, gain: 0.16, pan: -0.2, reverb: 0.3, humanize: 0.3 },
    { inst: "piano", notes: [...pianoTop, ...pianoUnder], gain: 0.24, pan: -0.1, reverb: 0.3, humanize: 0.2 },
    ...bass,
    ...byGain({ inst: "horn", pan: 0.2, reverb: 0.4, humanize: 0.15 }, [...pads, ...swell], (n) => 0.6 * dB(HORN_TRIM.get(Math.round(num(n.n))) ?? 0)),
    ...byGain({ inst: "hornShort", pan: 0.15, reverb: 0.35, humanize: 0.2 }, stabs, (n) => 1.05 * dB(HORN_SHORT_TRIM.get(num(n.n)) ?? 0)),
    ...euphonium(euphStabs, { short: true, gain: 0.8, pan: -0.1, reverb: 0.3 }),
    { inst: "harp", notes: harp, gain: 0.9, pan: 0.3, reverb: 0.4, humanize: 0.2 },
    { inst: "glockenspiel", notes: glock, gain: 6, pan: 0.3, reverb: 0.45, humanize: 0.2, lowpass: 6000 },
    // Drums
    { inst: "kick", notes: kickVerse, gain: 0.25, reverb: 0.06 },
    { inst: "kick", notes: kickChorus, gain: 0.26, reverb: 0.06 },
    // The chorus lifts in gain (the hardest snare hit throughout: its crack and ring are the 80s sound).
    ...byGain({ inst: "snareOn", pan: 0.05, reverb: 0.75, lowpass: 7000 }, snare, (n) => (n.t >= PASS ? 0.68 : 0.52)),
    { inst: "snareRoll", notes: roll, gain: 0.35, pan: 0.05, reverb: 0.6, lowpass: 6000 },
    { inst: "tomHigh", notes: tomHi, gain: 0.8, pan: -0.2, reverb: 0.5 },
    { inst: "tomLow", notes: tomLo, gain: 0.8, pan: 0.2, reverb: 0.5 },
    ...byGain({ inst: "hatClosed", pan: 0.3, reverb: 0.08, humanize: 0.4, lowpass: 7000 }, hatPulse, (n) => (n.t >= PASS ? 2.6 : 2.1)),
    ...byGain({ inst: "hatClosed", pan: 0.3, reverb: 0.08, humanize: 0.4, lowpass: 7000 }, hatOff, (n) => (n.t >= PASS ? 1.7 : 1.35)),
    { inst: "crash", notes: crashBig, gain: 0.5, pan: -0.3, reverb: 0.3, lowpass: 8000 },
    { inst: "crash", notes: crash, gain: 0.32, pan: -0.3, reverb: 0.3, lowpass: 8000 },
  ],
};

export default song;
