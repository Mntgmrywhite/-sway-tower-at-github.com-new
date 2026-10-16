// Neon: an 80s neon-noir power ballad on real instruments, for all four Neon skins (Synthwave,
// Cyberpunk, Blacklight, Minimal). The theme's 6/8 at a dotted quarter = 90 is a 12/8 ballad
// groove: kick on the bar, a big snare backbeat on the second pulse sent deep into a long, wide
// reverb (the closest this reverb gets to 80s gated drums), closed hi-hat on every triplet
// eighth, a crash on each section and a tom fill into it. A minor (minorize, keeping the leading
// tone G# where the tune cadences on the dominant), coloured the 80s way: Esus4 -> E7, a
// descending bass (Am – Am/G – F) and a lift into the relative major for B (F | G | C F | Bø E7).
//
// 32 bars (42.7 s), the theme twice.
// Pass 1 is the verse. The tenor sax sings the tune low and breathy (A, A', A'') over the piano's
// big left-hand octaves and soft broken-chord triplets high above it, with the bass pizz on the
// pulse; from A' the horns hold open pads underneath. In B the piano takes the tune (harmonized
// in 3rds/4ths) over harp arpeggios and the sax answers; a snare roll, a horn swell and a sax run
// lift bar 16 into
// pass 2, the chorus: the sax solos on the tune an octave up (turns, runs, a climb to C6 at bar
// 29) while the soprano sax answers in B, the piano's triplets drop under it, the bass drives
// eighths, horns pad in triads, horn + euphonium stabs mark the sections (pushed an eighth early
// into B and the last A), and a glockenspiel arpeggiator shimmers on top. The last bar runs
// down the E7 chord and a big fill drops the loop back into the verse.
//
// Register plan (so no two parts fight in the same octave):
//   pass 1: bass E1–G2 · piano LH octaves F1–G3 · horn pads G#2–F3 · sax G#3–C5 · piano RH C5–A5
//           (B: harp C3–E4 · piano tune + harmony A4–B5 · sax answers B3–E4)
//   pass 2: bass E1–G2 · piano LH F1–G3 · horn pads/stabs D3–E4 · piano RH C4–B4 · sax G#4–C6 ·
//           soprano sax G5–D6 · glockenspiel C6–B6
// All parts sit inside their instruments' recorded ranges.

import { midi } from "../sampler";
import { euphonium, type Note, type Song, type Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, minorize, THEME_BARS, THEME_BPM } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One statement of the theme, in eighths. */
const PASS = THEME_BARS * BAR;
const BARS = THEME_BARS * 2;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
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
  return transposeTo(minor, -3);
})();
function transposeTo(notes: Note[], semis: number): Note[] {
  return notes.map((n) => ({ ...n, n: num(n.n) + semis }));
}

// ------------------------------------------------------------------ harmony

interface Chord {
  /** Bass pizz and the piano's left-hand octave (bottom note). */
  bass: string;
  /** Horn pad, pass 1 (open, under the low sax) and pass 2 (triads, under the piano). */
  pad1: string[];
  pad2: string[];
  /** Piano right-hand broken chord: pass 1 above the sax, pass 2 below it. */
  hi: string[];
  lo: string[];
  /** Harp arpeggio (pass 1's B) and glockenspiel arpeggiator (pass 2). */
  harp: string[];
  glock: string[];
}
const Am: Chord = { bass: "A1", pad1: ["A2", "E3"], pad2: ["E3", "A3", "C4"], hi: ["C5", "E5", "A5"], lo: ["C4", "E4", "A4"], harp: ["A2", "E3", "C4"], glock: ["C6", "E6", "A6"] };
const AmG: Chord = { ...Am, bass: "G1" };
const F: Chord = { bass: "F1", pad1: ["A2", "F3"], pad2: ["F3", "A3", "C4"], hi: ["C5", "F5", "A5"], lo: ["C4", "F4", "A4"], harp: ["C3", "F3", "A3"], glock: ["C6", "F6", "A6"] };
const Dm: Chord = { bass: "D2", pad1: ["A2", "F3"], pad2: ["F3", "A3", "D4"], hi: ["D5", "F5", "A5"], lo: ["D4", "F4", "A4"], harp: ["D3", "A3", "F4"], glock: ["D6", "F6", "A6"] };
const Dm7: Chord = { ...Dm, pad1: ["C3", "F3"], pad2: ["F3", "A3", "C4"], hi: ["C5", "F5", "A5"], lo: ["C4", "F4", "A4"] };
const Esus: Chord = { bass: "E2", pad1: ["B2", "E3"], pad2: ["E3", "A3", "B3"], hi: ["B4", "E5", "A5"], lo: ["E4", "A4", "B4"], harp: ["E3", "B3", "A3"], glock: ["E6", "A6", "B6"] };
const E7: Chord = { bass: "E2", pad1: ["G#2", "D3"], pad2: ["E3", "G#3", "D4"], hi: ["B4", "D5", "G#5"], lo: ["D4", "G#4", "B4"], harp: ["E3", "G#3", "D4"], glock: ["D6", "G#6", "B6"] };
const G: Chord = { bass: "G1", pad1: ["B2", "D3"], pad2: ["D3", "G3", "B3"], hi: ["B4", "D5", "G5"], lo: ["D4", "G4", "B4"], harp: ["D3", "G3", "B3"], glock: ["D6", "G6", "B6"] };
const C: Chord = { bass: "C2", pad1: ["C3", "E3"], pad2: ["E3", "G3", "C4"], hi: ["C5", "E5", "G5"], lo: ["C4", "E4", "G4"], harp: ["C3", "G3", "E4"], glock: ["C6", "E6", "G6"] };
const Bo: Chord = { bass: "B1", pad1: ["A2", "F3"], pad2: ["F3", "A3", "D4"], hi: ["D5", "F5", "A5"], lo: ["D4", "F4", "A4"], harp: ["D3", "F3", "A3"], glock: ["D6", "F6", "A6"] };

/** One chord per half bar (dotted quarter), 16 bars; both passes share it. */
const HALVES: Chord[] = [
  Am, Am, F, F, Dm, Dm, Esus, E7, // A
  Am, Am, G, F, Dm, E7, Am, AmG, // A'
  F, F, G, G, C, F, Bo, E7, // B
  Am, AmG, F, F, Dm7, Bo, Esus, E7, // A''
];
const half = (t: number): Chord => HALVES[Math.floor((((t % PASS) + PASS) % PASS) / 3)]!;
/** Pitch classes sounding in the chord at t (bass + upper voicing). */
const tonesAt = (t: number): Set<number> => new Set([half(t).bass, ...half(t).hi].map((n) => num(n) % 12));

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
  // Bar 10: answers the piano's held B under G (B D E D).
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
  [[0, 2, "B5"], [2, 1, "A5"], [3, 1.5, "G#5"], [4.5, 0.5, "A5"], [5, 1, "B5"]], // 28: up to the top
  [[0, 3, "C6"], [3, 2, "A5"], [5, 1, "G5"]], // 29: the climax
  [[0, 2, "F5"], [2, 1, "E5"], [3, 2, "C5"], [5, 1, "A4"]], // 30
  [[0, 2, "D5"], [2, 1, "C5"], [3, 2, "B4"], [5, 1, "D5"]], // 31
  [[0, 3, "E5"], [3, 0.5, "D5"], [3.5, 0.5, "B4"], [4, 0.5, "G#4"], [4.5, 0.5, "E4"], [5, 1, "D4"]], // 32: down into bar 1's C4
];
const solo: Note[] = SOLO.flatMap((line, i) => line.map(([t, d, n]) => ({ t: bar(17 + i) + t, d, n, v: 0 })));

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
const sax: Note[] = [
  ...phrase([...verse, ...answers.map(([t, d, n]) => ({ t, d, n }))], 0.6),
  ...phrase(solo, 0.74),
];
/** Per-note level (dB) evening out the recordings (measured, phone-weighted): the low notes are ~1.5 dB softer. */
const saxTrim = (m: number): number => (m < midi("A4") ? 1.5 : 0);

// Soprano sax answers the tenor's held notes in pass 2's B.
const soprano: Note[] = phrase(
  [
    // Bar 26, over G: a rising answer under the held B.
    { t: bar(26) + 3.5, d: 0.5, n: "G5" }, { t: bar(26) + 4, d: 0.5, n: "B5" }, { t: bar(26) + 4.5, d: 1.3, n: "D6" },
    // Bar 28 is the tenor's climb; bar 30, over F, it answers the descent.
    { t: bar(30) + 3.5, d: 0.5, n: "A5" }, { t: bar(30) + 4, d: 0.5, n: "C6" }, { t: bar(30) + 4.5, d: 1.2, n: "A5" },
  ],
  0.62,
);
// Bar 22 answers the held F5 with a little pentatonic turn.
soprano.push(...phrase([{ t: bar(22) + 3.5, d: 0.5, n: "C6" }, { t: bar(22) + 4, d: 0.5, n: "D6" }, { t: bar(22) + 4.5, d: 0.5, n: "C6" }, { t: bar(22) + 5, d: 1.2, n: "A5" }], 0.62));

// ------------------------------------------------------------------ piano

/**
 * The upright's bass zones are tuned flat (measured over partials 2–4: F#1 zone ~-43 cents, C2
 * ~-26, A1 ~-19, the F#2 zone ~-14), so the left hand's notes are pulled up to the band (cents).
 */
const PIANO_CENTS = new Map(
  Object.entries({ F1: 43, G1: 43, A1: 19, B1: 12, C2: 26, D2: 10, E2: 10, F2: 14, G2: 14, A2: 2, B2: 2, C3: 2, D3: 5, E3: 5, F3: 5, G3: 5 }).map(([k, c]) => [midi(k), c]),
);
const pianoTuned = (m: number): number => m + (PIANO_CENTS.get(m) ?? 0) / 100;

const lh: Note[] = [];
const rh: Note[] = [];
const pianoTune: Note[] = [];
/** Pushes: the band plays the next bar's downbeat an eighth early (into B and the last A of pass 2). */
const PUSHES = new Set([bar(25), bar(29)]);
for (let t = 0; t < BARS * BAR; t += 3) {
  const pass2 = t >= PASS;
  const c = half(t);
  // Left hand: a big octave on every pulse (held like the sustain pedal), anticipating the pushes.
  const lt = PUSHES.has(t + 3) && pass2 ? null : t;
  if (lt !== null) {
    const at = PUSHES.has(t) ? t - 1 : t;
    const d = PUSHES.has(t) ? 4 : 3;
    const low = num(c.bass) + (num(c.bass) < midi("F1") ? 12 : 0);
    const v = pass2 ? 0.74 : t % BAR === 0 ? 0.62 : 0.56;
    lh.push({ t: at, d: d - 0.05, n: pianoTuned(low), v }, { t: at + 0.01, d: d - 0.05, n: pianoTuned(low + 12), v: v - 0.04 });
  } else {
    // This pulse is played an eighth early with the next one; hold the previous chord's octave until then.
    const low = num(c.bass);
    lh.push({ t, d: 1.95, n: pianoTuned(low), v: 0.7 }, { t: t + 0.01, d: 1.95, n: pianoTuned(low + 12), v: 0.66 });
  }
  // Right hand: rising broken-chord triplets, pedalled to the end of the pulse. Pass 1 plays high
  // and soft above the low sax (not in B, where it has the tune); pass 2 plays under the solo.
  const inB = t >= bar(8) + 3 && t < bar(13);
  if (inB) continue;
  const voicing = pass2 ? c.lo : c.hi;
  voicing.forEach((n, k) => {
    const v = pass2 ? 0.56 - k * 0.02 : 0.42 - k * 0.03;
    rh.push({ t: t + k, d: 3 - k - 0.05, n: num(n), v });
  });
}
// B (pass 1): the piano sings the tune, from the pickup in bar 8, with a chord tone under each note
// (the nearest at least a minor 3rd below), over the left hand's octaves.
for (const n of theme) {
  const b = barOf(n.t);
  if (!((b === 8 && n.t % BAR >= 3) || (b >= 9 && b <= 12))) continue;
  const m = num(n.n);
  pianoTune.push({ t: n.t, d: n.d - 0.05, n: m, v: clampV((n.v ?? 0.6) * 0.95) });
  if (b === 8) continue; // the pickup is a single line
  const tones = tonesAt(n.t);
  let h = m - 3;
  while (!tones.has(((h % 12) + 12) % 12)) h--;
  pianoTune.push({ t: n.t + 0.01, d: n.d - 0.05, n: h, v: clampV((n.v ?? 0.6) * 0.75) });
}

// ------------------------------------------------------------------ bass pizz

/** The pizz zones' tuning, measured over partials 2–8 (cents to add). */
const BASS_CENTS = new Map([[midi("E1"), 8], [midi("F1"), 7], [midi("G1"), 6]]);
/** Per-note level (dB), from measuring each rendered note (phone-weighted, first 300 ms). */
const BASS_TRIM = new Map(Object.entries({ F1: 2, G1: 4, B1: 2.5, C2: 3.5, D2: 4.5 }).map(([k, v]) => [midi(k), v]));
const bassNotes: Note[] = [];
for (let t = 0; t < BARS * BAR; t++) {
  const pass2 = t >= PASS;
  const e = t % 3;
  // Pass 1 on the pulse; pass 2 drives eighths, pulses accented.
  if (!pass2 && e !== 0) continue;
  // The pushes: the next bar's root an eighth early.
  const c = PUSHES.has(t + 1) ? half(t + 1) : half(t);
  const v = e === 0 ? (t % BAR === 0 ? 0.86 : 0.8) : PUSHES.has(t + 1) ? 0.84 : 0.66;
  bassNotes.push({ t, d: pass2 ? 1 : 3, n: num(c.bass), v });
}
const bass = byGain(
  { inst: "bassPizz", pan: 0, reverb: 0.08, humanize: 0.25 },
  bassNotes.map((n) => ({ ...n, n: num(n.n) + (BASS_CENTS.get(num(n.n)) ?? 0) / 100 })),
  (n) => dB(BASS_TRIM.get(Math.round(num(n.n))) ?? 0),
);

// ------------------------------------------------------------------ horns: pads, swell, stabs

/** Horn level per note (dB): the A3 zone was recorded ~4.5 dB hot, A2–C3 ~8 dB soft (measured). */
const HORN_TRIM = new Map(Object.entries({ A2: 8, B2: 8, C3: 8, "G#3": -4.5, A3: -4.5 }).map(([k, v]) => [midi(k), v]));
const pads: Note[] = [];
// Pads hold each chord, tied across repeated chords; pass 1 from A' (bar 5), open and low; pass 2
// in triads under the piano. Bar 16's second half is the swell instead.
for (let t = bar(5); t < BARS * BAR; t += 3) {
  if (t === bar(16) + 3) continue;
  const pass2 = t >= PASS;
  const c = half(t);
  const voicing = pass2 ? c.pad2 : c.pad1;
  const prevT = t - 3;
  const prev = prevT >= bar(5) && prevT !== bar(16) + 3 && prevT >= (pass2 ? PASS : 0) ? (pass2 ? half(prevT).pad2 : half(prevT).pad1) : null;
  for (const n of voicing) {
    const m = num(n);
    const tied = prev?.some((p) => num(p) === m) ? pads.find((p) => num(p.n) === m && Math.abs(p.t + p.d + 0.1 - t) < 0.01) : undefined;
    if (tied) tied.d += 3;
    else pads.push({ t, d: 2.9, n: m, v: 0.56 });
  }
}
// The swell into the chorus: the E7 triad blooms bottom-up over bar 16's last pulse.
const swell: Note[] = E7.pad2.map((n, k) => ({ t: bar(16) + 3 + k * 0.67, d: 3 - k * 0.67, n: num(n), v: 0.5 + k * 0.08 }));

// Stabs: short horns + euphonium on the chorus downbeats, two of them pushed an eighth early.
const STABS: [number, string[], string][] = [
  [bar(17), ["E3", "A3", "C4", "E4"], "A2"],
  [bar(21), ["E3", "A3", "C4", "E4"], "A2"],
  [bar(25) - 1, ["F3", "A3", "C4", "F4"], "F2"],
  [bar(29) - 1, ["E3", "A3", "C4", "E4"], "A2"],
];
const HORN_SHORT_TRIM = new Map(Object.entries({ C4: 1.5, E4: 2, F4: 2 }).map(([k, v]) => [midi(k), v]));
const stabs: Note[] = STABS.flatMap(([t, ns]) => ns.map((n, k) => ({ t: t + k * 0.012, d: 1, n: num(n), v: 0.6 })));
const euphStabs: Note[] = STABS.map(([t, , root]) => ({ t, d: 1, n: num(root), v: 0.7 }));

// ------------------------------------------------------------------ harp and glockenspiel arpeggios

const harp: Note[] = [];
for (let t = bar(9); t < bar(13); t += 3) {
  half(t).harp.forEach((n, k) => harp.push({ t: t + k, d: 3 - k, n: num(n), v: k === 0 ? 0.5 : 0.42 }));
}
const glock: Note[] = [];
for (let t = PASS; t < BARS * BAR; t += 3) {
  half(t).glock.forEach((n, k) => glock.push({ t: t + k, d: 1, n: num(n), v: k === 0 ? 0.3 : 0.24 }));
}

// ------------------------------------------------------------------ drums

const kick: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const tomHi: Note[] = [];
const tomLo: Note[] = [];
const hatPulse: Note[] = [];
const hatOff: Note[] = [];
const crash: Note[] = [];
const FILL_BARS = new Set([4, 8, 12, 16, 20, 24, 28, 32]);
for (let b = 1; b <= BARS; b++) {
  const s = bar(b);
  const pass2 = b > THEME_BARS;
  const pushed = PUSHES.has(s);
  // Kick on the bar (and on the "a" of the second pulse in the chorus, leading on).
  if (!pushed) kick.push({ t: s, d: 1, n: "C2", v: pass2 ? 0.8 : 0.66 });
  if (pass2 && !FILL_BARS.has(b)) kick.push({ t: s + 5, d: 1, n: "C2", v: 0.6 });
  // The backbeat.
  snare.push({ t: s + 3, d: 1, n: "D2", v: pass2 ? 0.92 : 0.86 });
  // Hats on every triplet eighth, the pulses louder; the drummer's hands leave them for fills.
  for (let e = 0; e < 6; e++) {
    if (FILL_BARS.has(b) && e >= 4) continue;
    if (b === 16 && e < 3) continue; // the roll
    if (b === 32 && e >= 2) continue; // the big fill
    (e % 3 === 0 ? hatPulse : hatOff).push({ t: s + e, d: 1, n: "F#2", v: 0.62 });
  }
}
// Tom fills into each section: small ones (two toms down the last pulse), bigger at the halves and passes.
const fill = (b: number, hits: [number, "hi" | "lo", number][]) => {
  for (const [e, drum, v] of hits) (drum === "hi" ? tomHi : tomLo).push({ t: bar(b) + e, d: 1, n: drum === "hi" ? "A2" : "F2", v });
};
for (const b of [4, 12, 20, 28]) fill(b, [[4, "hi", 0.62], [4.5, "hi", 0.66], [5, "lo", 0.7], [5.5, "lo", 0.74]]);
for (const b of [8, 24]) fill(b, [[3.5, "hi", 0.6], [4, "hi", 0.64], [4.5, "hi", 0.68], [5, "lo", 0.72], [5.5, "lo", 0.76]]);
fill(16, [[3.5, "hi", 0.7], [4, "hi", 0.72], [4.5, "lo", 0.74], [5, "lo", 0.78], [5.5, "lo", 0.8]]);
fill(32, [[3.5, "hi", 0.7], [4, "hi", 0.74], [4.5, "lo", 0.76], [5, "lo", 0.8], [5.5, "lo", 0.84]]);
// Bar 16: a snare roll swelling into the chorus (each eighth a louder recorded roll).
roll.push({ t: bar(16), d: 1, n: "D2", v: 0.2 }, { t: bar(16) + 1, d: 1, n: "D2", v: 0.5 }, { t: bar(16) + 2, d: 0.95, n: "D2", v: 0.85 });
// Bar 32: snare pickups into the backbeat, and the fill drops back into the verse.
snare.push({ t: bar(32) + 2, d: 1, n: "D2", v: 0.66 }, { t: bar(32) + 2.5, d: 1, n: "D2", v: 0.72 });
// Kick under the pushes and the fill's last note.
for (const t of PUSHES) kick.push({ t: t - 1, d: 1, n: "C2", v: 0.84 });
kick.push({ t: bar(16) + 5.5, d: 1, n: "C2", v: 0.7 }, { t: bar(32) + 5.5, d: 1, n: "C2", v: 0.7 });
// Crash on each section (on the pushes, an eighth early): big at the passes and B, lighter in A' and A''.
const crashBig: Note[] = [bar(1), bar(9), bar(17), bar(25) - 1, bar(29) - 1].map((t) => ({ t, d: 1, n: "C#3", v: 0.8 }));
crash.push(...[bar(5), bar(13), bar(21)].map((t) => ({ t, d: 1, n: "C#3", v: 0.8 })));

// ------------------------------------------------------------------ the song

const song: Song = {
  name: "neon",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.86, damp: 0.45, width: 1, level: 1 },
  tracks: [
    ...byGain({ inst: "sax", pan: 0, reverb: 0.3, humanize: 0.3, lowpass: 4200 }, sax, (n) => dB(saxTrim(Math.round(num(n.n))))),
    { inst: "sopranoSax", notes: soprano, gain: 0.9, pan: 0.25, reverb: 0.38, humanize: 0.3, lowpass: 4500 },
    { inst: "piano", notes: lh, gain: 0.22, pan: -0.1, reverb: 0.22, humanize: 0.2 },
    { inst: "piano", notes: rh, gain: 0.16, pan: -0.2, reverb: 0.3, humanize: 0.3 },
    { inst: "piano", notes: pianoTune, gain: 0.3, pan: -0.1, reverb: 0.3, humanize: 0.2 },
    ...bass.map((t) => ({ ...t, gain: (t.gain ?? 1) * 1.1 })),
    ...byGain({ inst: "horn", pan: 0.2, reverb: 0.4, humanize: 0.15 }, [...pads, ...swell], (n) => 0.7 * dB(HORN_TRIM.get(Math.round(num(n.n))) ?? 0)),
    ...byGain({ inst: "hornShort", pan: 0.15, reverb: 0.35, humanize: 0.2 }, stabs, (n) => 0.9 * dB(HORN_SHORT_TRIM.get(num(n.n)) ?? 0)),
    ...euphonium(euphStabs, { short: true, gain: 0.8, pan: -0.1, reverb: 0.3 }),
    { inst: "harp", notes: harp, gain: 0.6, pan: 0.3, reverb: 0.4, humanize: 0.2 },
    { inst: "glockenspiel", notes: glock, gain: 0.25, pan: 0.3, reverb: 0.45, humanize: 0.2, lowpass: 6000 },
    // Drums
    { inst: "kick", notes: kick, gain: 0.9, reverb: 0.06 },
    { inst: "snareOn", notes: snare, gain: 0.6, pan: 0.05, reverb: 0.75, lowpass: 7000 },
    { inst: "snareRoll", notes: roll, gain: 0.35, pan: 0.05, reverb: 0.6, lowpass: 6000 },
    { inst: "tomHigh", notes: tomHi, gain: 0.8, pan: -0.2, reverb: 0.5 },
    { inst: "tomLow", notes: tomLo, gain: 0.8, pan: 0.2, reverb: 0.5 },
    { inst: "hatClosed", notes: hatPulse, gain: 0.6, pan: 0.3, reverb: 0.08, humanize: 0.4, lowpass: 8000 },
    { inst: "hatClosed", notes: hatOff, gain: 0.4, pan: 0.3, reverb: 0.08, humanize: 0.4, lowpass: 8000 },
    { inst: "crash", notes: crashBig, gain: 0.5, pan: -0.3, reverb: 0.3, lowpass: 8000 },
    { inst: "crash", notes: crash, gain: 0.32, pan: -0.3, reverb: 0.3, lowpass: 8000 },
  ],
};

export default song;
