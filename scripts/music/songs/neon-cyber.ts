// Cyberpunk (skin "neon-cyber"): tech-noir for a rainy megacity at night. The Synthwave skin keeps
// the French electro house of neon.ts; this is its dark twin, in the spirit of the 1980s tech-noir
// film scores: slow, wet and minor, analog synths in a cavernous reverb (a polyphonic brass pad
// that swells and sings with vibrato, a wide breathing saw pad, a sequencer pulsing in the dark,
// a deep saw bass), gated 80s drums, and a real tenor saxophone carrying the theme, the classic
// noir pairing, with a lonely piano. Thunder rolls in the distance as the loop opens and again
// with the break, under everything, never over the tune. No rain: the owner heard its noise as
// crackle, so nothing noisy plays as a bed; the pad and the drone carry the quiet sections. The
// genre only: every line here is the theme's, built from its chords, or our own.
//
// The theme stays in its 6/8 (the tower's sway), slowed to a dotted quarter of 64: a heavy 12/8
// half-time groove (kick on the bar, the gated snare on its second pulse, the kick's push on the
// bar's last eighth), against Neon's four-on-the-floor at 125. Time is counted in eighths
// (192 a minute, 15,000 frames each; a bar is 1.875 s). In D minor, the ballad's harmony as Neon
// has it (minorize, keeping the leading tone over the dominant), one chord per pulse with noir
// colours: Dm | Bbmaj7 | Gm7 | Asus A7, the B section's lift through C and F, a Gm6 before the
// last A7. D minor puts the tune (A3-F5) in the tenor's warm, breathy middle.
//
// 40 bars (75 s):
//    1-4   intro: a far thunder roll; the wide pad on the A section's chords, the bass a low
//          drone, the sequencer opening behind a filter; the piano high and alone with the
//          tune's first and third bars, and between them (bar 2) a soft, slow swell of the brass
//          pad; ticking hats, then gated toms and a reversed swell into
//    5-20  the theme: the tenor sax sings it all (A A' B A''). The A section half-time (bass in
//          pulses, kick and the gated snare, hats in eighths); from A' the bass drives in
//          eighths; in B the brass pad swells on every chord, the hats run in sixteenths and
//          the kick pushes into each snare; gated tom fills close the phrases.
//   21-24  break: the drums stop and the thunder breaks; the piano plays the A section in
//          octaves over the open pad and the drone, the sequencer ticking on; a gated snare build.
//   25-36  the theme again from A': the sax back with the full groove, the brass under the
//          lift and A'', the piano answering the sax's long notes from high up, a second tenor in
//          harmony under the climax (B A'').
//   37-40  outro: the sax sings the theme's first figure slowed to half speed over the A chords
//          as the drums thin out; the open pad and the drone run on through the loop point into
//          the intro.
//
// Register plan (each part in its own lane): bass G1-D3 (two saws over a sine on the root) ·
// pad D3-C4 (under the sax) · brass E3-E4 (under the tune's B section; the intro's swell F3-D4,
// where nothing sings) · sax A3-F5, the second tenor a third (now and then a fourth or fifth)
// under it, Bb3-C5 · piano: the break's tune C#4-D6 in octaves over a left hand G2-A3, the
// intro's figure and the answers D5-E6, the second pass's low octaves G2-F4 · sequencer D5-C6
// (above the sax, filtered dark) · thunder: low-passed to a rumble.
//
// Mix (mix.ts, dB vs the mix per 4-bar phrase): the sax 1-3 down where it sings, the second
// tenor 11; the piano 2 down in the break and 6 in the intro (3 in the bars it plays), over the
// open pad (8-10 down there, 11-13 under the sax), the brass 11 and the intro's swell 11, the bass
// 13-15, the sequencer 11-15, the kick 8-10 and the gated snare 11-13, the thunder 12 in its
// phrases. In the band of whatever carries the tune (250-3500 Hz) no other part comes within 8 dB
// of it, but for the intro's pad (5-8 under the piano's figure) and the piano's answers (6 under
// the sax's long notes). The gated snare cracks where the tune starts a note on every bar's second
// pulse, and the theme's tom fills run under the sax's pickups, so both sit lower than an 80s mix
// would put them. Everything bright is low-passed: the sax at 3.6 kHz (the owner hears harshness), the
// sequencer, snare, hats and cymbals at 2.4-6 kHz, so the 2-8 kHz band sits among the other
// songs' (-16.4 dB of the whole; they run -12.3 to -20.2), not above them. Tuning as heard
// (tuning.ts): the saxes within half a cent, the piano within 1.5 cents, the synths within 3.1.

import { midi } from "../sampler";
import { transpose, type Note, type Song, type Track } from "../song";
import { SYNTHS, type DrumPatch, type MembranePatch, type Patch, type VoicePatch } from "../synth";
import { CHORDS, melody, minorize } from "../theme";

const BPM = 192; // eighths a minute: a dotted quarter of 64
const BPB = 6; // eighths a bar (6/8)
const BARS = 40;
const LOOP = BARS * BPB;
/** Start of a 1-based bar, in eighths. */
const bar = (b: number): number => (b - 1) * BPB;
/** The 1-based bar a time falls in. */
const barOf = (t: number): number => Math.floor((((t % LOOP) + LOOP) % LOOP) / BPB + 1e-9) + 1;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const clampV = (v: number): number => Math.min(0.98, Math.max(0.08, v));

// Sections (first bars).
const THEME1 = 5;
const BREAK = 21;
const THEME2 = 25;
const OUTRO = 37;

/** The theme bar (1-16) whose harmony a song bar plays. */
function themeBar(b: number): number {
  if (b < THEME1) return b; // intro: the A section's chords
  if (b < BREAK) return b - 4; // the whole theme
  if (b < THEME2) return b - 20; // break: A
  if (b < OUTRO) return b - 20; // A' B A''
  return b - 36; // outro: A
}
/** Section tests. */
const inTheme1 = (b: number) => b >= THEME1 && b < BREAK;
const inTheme2 = (b: number) => b >= THEME2 && b < OUTRO;
const inTheme = (b: number) => inTheme1(b) || inTheme2(b);
/** The first pass's B and A'', and all of the second pass: the hot groove. */
const hot = (b: number) => (inTheme1(b) && themeBar(b) >= 9) || inTheme2(b);

// ------------------------------------------------------------------ the theme in D minor

/**
 * The theme in D minor: minorize() flattens every B, E and A of the C major tune, but over the
 * dominant (G) the B is the leading tone the tune cadences on, so it stays natural (C# in D).
 */
const THEME: (Note & { tb: number })[] = (() => {
  const major = melody();
  const minor = minorize(major).map((n, i) => {
    const orig = num(major[i]!.n);
    const onDominant = CHORDS[Math.floor(n.t / 3)]![0] === "G";
    return orig % 12 === 11 && onDominant ? { ...n, n: orig } : n;
  });
  return transpose(minor, -10).map((n) => ({ ...n, n: num(n.n), tb: Math.floor(n.t / BPB) + 1 }));
})();

/** The theme's notes in theme bars [from, to], placed at song bar `at` (which plays theme bar `from`). */
function themeBars(from: number, to: number, at: number): (Note & { tb: number })[] {
  return THEME.filter((n) => n.tb >= from && n.tb <= to).map((n) => ({ ...n, t: n.t - bar(from) + bar(at) }));
}

// ------------------------------------------------------------------ harmony

interface Chord {
  /** The deep bass's root (G1-F2). */
  bass: string;
  /** The wide pad's voicing, under the sax (D3-C4). */
  pad: string[];
  /** The brass pad's voicing under the B section's tune. */
  brass: string[];
  /** Its pitch classes (the sequencer's lane, the second tenor's chord tones). */
  tones: number[];
}
const pcs = (...names: string[]): number[] => names.map((n) => midi(`${n}4`) % 12);
const Dm: Chord = { bass: "D2", pad: ["D3", "F3", "A3"], brass: ["F3", "A3", "D4"], tones: pcs("D", "F", "A", "C") };
const DmC: Chord = { bass: "C2", pad: ["D3", "F3", "A3"], brass: ["F3", "A3", "D4"], tones: pcs("D", "F", "A", "C") };
const Bbmaj7: Chord = { bass: "Bb1", pad: ["D3", "F3", "A3"], brass: ["F3", "A3", "D4"], tones: pcs("Bb", "D", "F", "A") };
const Gm7: Chord = { bass: "G1", pad: ["D3", "F3", "Bb3"], brass: ["F3", "Bb3", "D4"], tones: pcs("G", "Bb", "D", "F") };
const Gm6: Chord = { bass: "G1", pad: ["D3", "E3", "Bb3"], brass: ["G3", "Bb3", "E4"], tones: pcs("G", "Bb", "D", "E") };
const Asus: Chord = { bass: "A1", pad: ["D3", "E3", "A3"], brass: ["E3", "A3", "D4"], tones: pcs("A", "D", "E") };
// The tune passes through C# (its leading tone) over A7: the pad leaves the 3rd to it.
const A7: Chord = { bass: "A1", pad: ["E3", "G3", "A3"], brass: ["G3", "C#4", "E4"], tones: pcs("A", "C#", "E", "G") };
const C: Chord = { bass: "C2", pad: ["E3", "G3", "C4"], brass: ["E3", "G3", "C4"], tones: pcs("C", "E", "G") };
const F: Chord = { bass: "F2", pad: ["F3", "A3", "C4"], brass: ["F3", "A3", "C4"], tones: pcs("F", "A", "C") };

/** One chord per pulse (half bar) of the theme: 32 pulses, 16 bars. */
const PULSES: Chord[] = [
  Dm, Dm, Bbmaj7, Bbmaj7, Gm7, Gm7, Asus, A7, // A
  Dm, Dm, Bbmaj7, Bbmaj7, Gm7, A7, Dm, DmC, // A'
  Bbmaj7, Bbmaj7, C, C, F, Bbmaj7, Gm6, A7, // B: the lift
  Dm, Dm, Bbmaj7, Bbmaj7, Gm7, Gm6, Asus, A7, // A''
];
/** The chord at song time t (eighths). */
const chordAt = (t: number): Chord => {
  const w = ((t % LOOP) + LOOP) % LOOP;
  return PULSES[(themeBar(barOf(w)) - 1) * 2 + (w % BPB >= 3 ? 1 : 0)]!;
};
/** Pulses (start, length, chord) over song bars [from, to], merging repeated chords into one. */
function pulses(from: number, to: number): { t: number; d: number; c: Chord }[] {
  const out: { t: number; d: number; c: Chord }[] = [];
  for (let t = bar(from); t < bar(to + 1); t += 3) {
    const c = chordAt(t);
    const last = out[out.length - 1];
    if (last && last.c === c && last.t + last.d === t) last.d += 3;
    else out.push({ t, d: 3, c });
  }
  return out;
}

// ------------------------------------------------------------------ the sax

/**
 * Noir sax phrasing: legato within a phrase, a touch behind the beat, the long notes leaned on;
 * a breath after each long note (the tune's phrase ends, and before its pickups).
 */
function saxPhrase(notes: Note[], lift = 0): Note[] {
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  return sorted.map((n, i) => {
    const next = sorted[i + 1];
    const gap = next ? next.t - (n.t + n.d) : Infinity;
    const d = gap < 0.01 && n.d < 3 ? n.d - 0.05 : n.d - 0.4;
    const pulse = n.t % 3 === 0 ? 0.06 : 0;
    const long = Math.min(0.06, (n.d - 1) * 0.03);
    return { t: n.t + 0.05, d, n: n.n, v: clampV(0.64 + pulse + long + lift) };
  });
}
const sax1 = saxPhrase(themeBars(1, 16, THEME1));
const sax2 = saxPhrase(themeBars(5, 16, THEME2), 0.04);
// The outro: the theme's first figure (F A D C, then the B-flat it turns to) at half speed, a
// pulse a note, coming to rest on the A of the last bar.
const saxOutro = saxPhrase([
  { t: bar(OUTRO), d: 3, n: num("F4") },
  { t: bar(OUTRO) + 3, d: 3, n: num("A4") },
  { t: bar(OUTRO + 1), d: 6, n: num("D5") },
  { t: bar(OUTRO + 2), d: 3, n: num("C5") },
  { t: bar(OUTRO + 2) + 3, d: 3, n: num("Bb4") },
  { t: bar(OUTRO + 3), d: 5.5, n: num("A4") },
]);
const sax: Note[] = [...sax1, ...sax2, ...saxOutro];

/**
 * The second tenor in the climax, mostly in thirds: under each note of the tune a chord tone a
 * third below, else the scale's third below (D minor; harmonic over the dominant) unless it sits
 * a half step over a chord tone (a minor ninth against the pad), else a chord tone a fourth
 * below. Over the dominant the chord tones come first (a fourth before a stray third).
 */
const D_MINOR = pcs("D", "E", "F", "G", "A", "Bb", "C");
const D_HARMONIC = pcs("D", "E", "F", "G", "A", "Bb", "C#");
function under(m: number, t: number): number {
  const c = chordAt(t);
  const has = (set: number[], i: number) => set.includes((m - i) % 12);
  const dominant = c === A7 || c === Asus;
  for (const i of dominant ? [3, 4, 5] : [3, 4]) if (has(c.tones, i)) return m - i;
  for (const i of [3, 4]) if (has(dominant ? D_HARMONIC : D_MINOR, i) && !has(c.tones, i + 1)) return m - i;
  if (has(c.tones, 5)) return m - 5;
  return m - 3;
}
const saxHarmony: Note[] = sax2
  .filter((n) => barOf(n.t) >= 29 && barOf(n.t) < OUTRO)
  .map((n) => ({ ...n, n: under(num(n.n), n.t - 0.05), v: clampV((n.v ?? 0.6) - 0.08) }));

// ------------------------------------------------------------------ piano

const pianoHigh: Note[] = []; // the intro's figure, the answers
const pianoTune: Note[] = []; // the break's tune, in octaves
const pianoLow: Note[] = []; // the left hand
// Intro: the tune's first and third bars an octave above the sax's, alone over the pad (bars 1
// and 3), each note left to ring into the next.
for (const [from, at] of [[1, 1], [3, 3]] as [number, number][]) {
  for (const n of themeBars(from, from, at)) pianoHigh.push({ t: n.t, d: n.d + 1.5, n: num(n.n) + 12, v: n.t % 3 === 0 ? 0.5 : 0.42 });
}
pianoHigh.push({ t: bar(4), d: 4, n: num("A5"), v: 0.45 });
// Break: the A section in octaves; the left hand's root and fifth on each chord, the chord's
// colour on the second pulse.
for (const n of themeBars(1, 4, BREAK)) {
  const m = num(n.n);
  const v = n.t % 3 === 0 ? 0.56 : 0.48;
  pianoTune.push({ t: n.t + 0.03, d: n.d + 0.4, n: m, v }, { t: n.t + 0.04, d: n.d + 0.4, n: m + 12, v: v - 0.08 });
}
for (const { t, d, c } of pulses(BREAK, THEME2 - 1)) {
  const root = num(c.bass) + 12;
  pianoLow.push({ t, d: d + 0.5, n: root, v: 0.5 }, { t: t + 0.02, d: d + 0.5, n: root + 7, v: 0.42 });
  if (d >= 6) for (const [k, n] of c.pad.entries()) pianoLow.push({ t: t + 3 + 0.02 * k, d: 2.8, n: num(n), v: 0.36 });
}
// Theme 2: low octaves on each bar's downbeat (the bass's root, struck), and the piano answering
// the sax's long notes from up high, a falling figure on the chord.
for (let b = THEME2; b < OUTRO + 2; b++) {
  const root = num(chordAt(bar(b)).bass) + 12;
  pianoLow.push({ t: bar(b), d: 5.5, n: root, v: 0.46 }, { t: bar(b) + 0.01, d: 5.5, n: root + 12, v: 0.4 });
}
const ANSWERS: [number, number, string[]][] = [
  // [song bar, eighth, notes falling in sixteenths]
  [26, 3.5, ["D6", "A5", "F5"]], // over the tune's held B-flat (Bbmaj7)
  [28, 0.5, ["A5", "F5", "D5"]], // over its held D (Dm)
  [30, 3.5, ["C6", "G5", "E5"]], // over its held E (C)
  [36, 0.5, ["E6", "D6", "A5"]], // over the last A (Asus): into the outro
];
for (const [b, e, ns] of ANSWERS) ns.forEach((n, k) => pianoHigh.push({ t: bar(b) + e + k * 0.5, d: 2.5 - k * 0.5, n: num(n), v: 0.48 - k * 0.04 }));

// ------------------------------------------------------------------ bass

const bass: Note[] = [];
const drone: Note[] = [];
for (let b = 1; b <= BARS; b++) {
  for (const p of [0, 3]) {
    const t = bar(b) + p;
    const root = num(chordAt(t).bass);
    if (!inTheme(b)) {
      // Intro, break and outro: a low drone, a note a chord.
      if (p === 0 || chordAt(t) !== chordAt(t - 3)) drone.push({ t, d: chordAt(t) === chordAt(t + 3) && p === 0 ? 5.8 : 2.8, n: root, v: 0.6 });
      continue;
    }
    if (inTheme1(b) && themeBar(b) <= 4) {
      // The A section of the first pass: half-time, a note a pulse.
      bass.push({ t, d: 2.6, n: root, v: 0.72 });
      continue;
    }
    // Driving eighths ("DUM da da"), the octave up on the bar's last eighth in the hot sections.
    bass.push({ t, d: 0.9, n: root, v: 0.8 }, { t: t + 1, d: 0.45, n: root, v: 0.55 });
    const last = p === 3 && hot(b);
    bass.push({ t: t + 2, d: 0.45, n: last ? root + 12 : root, v: last ? 0.62 : 0.55 });
  }
}

// ------------------------------------------------------------------ pads

// The wide pad: every chord as long as it lasts, voices a few ms apart; louder where nothing sings.
const padSoft: Note[] = [];
const padOpen: Note[] = [];
for (const { t, d, c } of pulses(1, BARS)) {
  const list = inTheme(barOf(t)) ? padSoft : padOpen;
  c.pad.forEach((n, k) => list.push({ t: t + k * 0.01, d: d - 0.05, n: num(n), v: 0.62 }));
}
// The brass pad: a swell on every chord of the B sections and on the second pass's last A''.
const brass: Note[] = [];
for (const [from, to] of [[13, 16], [29, 32], [33, 36]] as [number, number][]) {
  for (const { t, d, c } of pulses(from, to)) c.brass.forEach((n, k) => brass.push({ t: t + k * 0.012, d: d - 0.1, n: num(n), v: 0.66 }));
}

// ------------------------------------------------------------------ the sequencer

/** The chord's tones in [lo, hi] (the sequencer's lane, above the sax: three or four notes). */
function lane(c: Chord, lo: string, hi: string): number[] {
  const out: number[] = [];
  for (let m = num(lo); m <= num(hi); m++) if (c.tones.includes(m % 12)) out.push(m);
  return out;
}
/** Sixteenths over the bar's two pulses: up the chord and turning back. */
const SEQ = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1];
function sequencer(from: number, to: number, v: number): Note[] {
  const out: Note[] = [];
  for (let b = from; b <= to; b++) {
    for (let k = 0; k < 12; k++) {
      const t = bar(b) + k / 2;
      const tones = lane(chordAt(t), "D5", "C6");
      out.push({ t, d: 0.4, n: tones[SEQ[k]! % tones.length]!, v: clampV(v + (k % 6 === 0 ? 0.14 : k % 2 === 0 ? 0.05 : 0)) });
    }
  }
  return out;
}
const seqIntro = sequencer(1, THEME1 - 1, 0.5);
const seqMain = sequencer(THEME1, BARS, 0.48);

// ------------------------------------------------------------------ drums

const kick: Note[] = [];
const snare: Note[] = [];
const build: Note[] = [];
const hat: Note[] = [];
const hatOpen: Note[] = [];
const crash: Note[] = [];
const toms: { hi: Note[]; mid: Note[]; lo: Note[] } = { hi: [], mid: [], lo: [] };

/** A gated tom fill down the bar's last pulse (from eighth `from`, in sixteenths). */
function tomFill(b: number, from = 3.5): void {
  const order: ("hi" | "mid" | "lo")[] = ["hi", "hi", "mid", "mid", "lo", "lo"];
  for (let k = 0; from + k * 0.5 < 6; k++) toms[order[Math.min(5, k + Math.round((from - 3) * 2))]!].push({ t: bar(b) + from + k * 0.5, d: 0.5, n: "C4", v: clampV(0.62 + k * 0.06) });
}
const FILLS = new Set([12, 20, 28, 36]);

for (let b = 1; b <= BARS; b++) {
  const s = bar(b);
  if (inTheme(b)) {
    const fill = FILLS.has(b);
    kick.push({ t: s, d: 1, n: "C2", v: 0.9 });
    if (hot(b)) kick.push({ t: s + 2.5, d: 0.5, n: "C2", v: 0.62 });
    if (!fill || b === 20) kick.push({ t: s + 5, d: 1, n: "C2", v: 0.72 });
    snare.push({ t: s + 3, d: 1, n: "C4", v: 0.88 });
    for (let k = 0; k < 12; k++) {
      const e = k / 2;
      if (fill && e >= 3.5) continue;
      if (k % 2 && !hot(b)) continue; // eighths in the first A, sixteenths after
      if (hot(b) && k === 9) {
        hatOpen.push({ t: s + e, d: 0.5, n: "C4", v: 0.55 });
        continue;
      }
      hat.push({ t: s + e, d: 0.5, n: "C4", v: k % 6 === 0 ? 0.62 : k % 2 ? 0.34 : 0.46 });
    }
    if (fill && b !== 20) tomFill(b);
  } else if (b === 3 || b === 4 || b === OUTRO || b === OUTRO + 1) {
    // Intro and outro: the clock ticking, a soft kick on the bar.
    kick.push({ t: s, d: 1, n: "C2", v: 0.62 });
    for (let e = 0; e < 6; e++) if (!(b === 4 && e >= 3)) hat.push({ t: s + e, d: 0.5, n: "C4", v: e % 3 === 0 ? 0.5 : 0.36 });
  }
}
tomFill(4, 3);
// Bar 20, into the break: the gated snare in sixteenths up the last pulse.
for (let k = 0; k < 5; k++) build.push({ t: bar(20) + 3.5 + k * 0.5, d: 0.5, n: "C4", v: clampV(0.45 + k * 0.1) });
// Bar 24, out of the break: a gated snare build over the whole bar (eighths, then sixteenths).
for (const e of [0, 1, 2, 3, 3.5, 4, 4.5]) build.push({ t: bar(24) + e, d: 0.5, n: "C4", v: clampV(0.32 + e * 0.07) });
for (const b of [THEME1, 13, BREAK, THEME2, 29, 33]) crash.push({ t: bar(b), d: 1, n: "C4", v: b === THEME1 || b === BREAK ? 0.6 : 0.75 });
crash.push({ t: bar(OUTRO), d: 1, n: "C4", v: 0.5 });

// The reversed swell (a cymbal played backwards, as the 80s did) into the sax's entrances.
const swell: Note[] = [4, 24, 28].map((b) => ({ t: bar(b), d: 6, n: "C4", v: 0.7 }));

// ------------------------------------------------------------------ thunder and the intro's swell

// Thunder: the short roll (3114, 11 s) as the loop opens, ringing out whole under the intro; the
// long one (3181) breaking with the break, let go after 7 s to die away over the next three.
// Played at their recorded pitch; far away, so low-passed and quiet.
const thunderNear: Note[] = [{ t: bar(1) + 0.5, d: 1, n: "C4", v: 0.7 }];
const thunderFar: Note[] = [{ t: bar(BREAK) + 0.3, d: 1, n: "C4", v: 0.7 }];
// The intro's swell: the brass pad, soft and slow, rising from bar 1's second pulse under the
// piano's figure, cresting in bar 2 (where the piano rests and the bar would stand empty) and
// letting go as the piano comes back in bar 3. Dm's voicing, which Bbmaj7 shares over its own
// bass: one chord carries both bars.
const brassSwell: Note[] = Dm.brass.map((n, k) => ({ t: bar(1) + 3 + k * 0.02, d: 8.5, n: num(n), v: 0.6 }));

// ------------------------------------------------------------------ patches (our own synths)

/**
 * The deep saw bass: two saws a hair apart over a sine on the root, through a dark filter that
 * opens only a little on each note (a deeper, faster sweep drags the pitch flat as it closes).
 */
const SAW_BASS: VoicePatch = {
  kind: "voice",
  mono: true,
  glide: 0.015,
  osc: [{ wave: "saw", voices: 2, detune: 10, spread: 0.2 }, { wave: "sine", level: 0.5 }],
  drive: 1.4,
  filter: { cutoff: 750, resonance: 0.18, keyTrack: 0.5, envAmount: 0.3, env: { attack: 0.002, decay: 0.5, sustain: 0.5, release: 0.1 }, velocity: 0.2 },
  amp: { attack: 0.003, decay: 0.5, sustain: 0.8, release: 0.08 },
  gain: 0.12,
  range: ["G1", "A3"],
  home: "D2",
};
/** The drone: the same bass held, the filter closed and slowly breathing. */
const DRONE: VoicePatch = {
  ...SAW_BASS,
  filter: { cutoff: 300, resonance: 0.15, keyTrack: 0.6, envAmount: 0.6, env: { attack: 0.8, decay: 2, sustain: 0.4, release: 0.8 } },
  lfos: [{ rate: 0.2, cutoff: 0.3, shape: "triangle" }],
  amp: { attack: 0.4, decay: 1, sustain: 0.9, release: 0.9 },
  mono: false,
};
/**
 * The polyphonic brass pad of the era's film scores: two saws, a slow filter swell that opens
 * and settles, a delayed vibrato.
 */
const BRASS: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "saw", voices: 2, detune: 12, spread: 0.6 }, { wave: "pulse", width: 0.42, level: 0.3 }],
  filter: { cutoff: 620, resonance: 0.18, keyTrack: 0.5, envAmount: 1.7, env: { attack: 0.3, decay: 1.4, sustain: 0.4, release: 0.7 } },
  lfos: [{ rate: 5.2, pitch: 9, delay: 0.35, fade: 0.5 }],
  amp: { attack: 0.09, decay: 1.5, sustain: 0.85, release: 0.7 },
  highpass: 160,
  gain: 0.12,
  range: ["C3", "C6"],
  home: "C4",
};
/**
 * The same brass played soft and slow, for the intro's swell: it breathes in over two seconds,
 * its filter opening as slowly and not as far, the vibrato barely there; no noise anywhere. It
 * lets go nearly as fast as the pad does at a chord change, so its A doesn't linger against bar
 * 3's Gm7.
 */
const SOFT_BRASS: VoicePatch = {
  ...BRASS,
  filter: { cutoff: 480, resonance: 0.12, keyTrack: 0.5, envAmount: 1.2, env: { attack: 2.2, decay: 2.5, sustain: 0.5, release: 1.4 } },
  lfos: [{ rate: 4.8, pitch: 5, delay: 1.2, fade: 1.5 }],
  amp: { attack: 1.8, decay: 3, sustain: 0.85, release: 1.6 },
};
/** The wide pad: the super-saw pad, slower to breathe in. */
const PAD: VoicePatch = { ...(SYNTHS.superSawPad as Patch as VoicePatch), amp: { attack: 0.6, decay: 1, sustain: 0.9, release: 1.4 } };
/** The gated snare: a big noisy room cut off short (the track's `ring`), as the 80s gated reverb did. */
const GATED_SNARE: DrumPatch = {
  ...(SYNTHS.dmSnare as MembranePatch),
  freq: 175,
  decay: 0.3,
  noise: 1.3,
  noiseDecay: 1.1,
  noiseBand: [250, 4200],
  release: 0.02,
};
const gatedTom = (p: Patch): DrumPatch => ({ ...(p as MembranePatch), decay: 1, release: 0.02 });
/** A reversed cymbal: noise swelling up through an opening filter over the note's length. */
const SWELL: VoicePatch = {
  ...(SYNTHS.riser as Patch as VoicePatch),
  osc: [{ wave: "noise" }],
  filter: { slope: 12, cutoff: 500, resonance: 0.2 },
  ramp: { cutoff: 3.2, amp: 0.98, curve: 2.5 },
  amp: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.05 },
};

// ------------------------------------------------------------------ the song

/** A part split into one track per bar over [from, to], its low-pass opening from `lo` to `hi` Hz. */
function opening(base: Omit<Track, "notes" | "lowpass">, notes: Note[], from: number, to: number, lo: number, hi: number): Track[] {
  const out: Track[] = [];
  for (let b = from; b <= to; b++) {
    const inBar = notes.filter((n) => barOf(n.t) === b);
    if (inBar.length) out.push({ ...base, notes: inBar, lowpass: Math.round(lo * (hi / lo) ** ((b - from) / Math.max(1, to - from))) });
  }
  return out;
}

/**
 * The gated toms, the intro's fill (bar 4, nothing else sings) or the theme's fills (bars 12, 28,
 * 36), which run under the sax's pickups into the next phrase and so sit lower.
 */
function tomTracks(intro: boolean, gain: number): Track[] {
  const pick = (ns: Note[]) => ns.filter((n) => barOf(n.t) < THEME1 === intro);
  const out: Track[] = [
    { inst: "dmTomHigh", patch: gatedTom(SYNTHS.dmTomHigh), notes: pick(toms.hi), gain, pan: -0.3, reverb: 0.15, humanize: 0, ring: 0.28, label: "toms" },
    { inst: "dmTomMid", patch: gatedTom(SYNTHS.dmTomMid), notes: pick(toms.mid), gain, pan: 0, reverb: 0.15, humanize: 0, ring: 0.28, label: "toms" },
    { inst: "dmTomLow", patch: gatedTom(SYNTHS.dmTomLow), notes: pick(toms.lo), gain, pan: 0.3, reverb: 0.15, humanize: 0, ring: 0.3, label: "toms" },
  ];
  return out.filter((t) => t.notes.length);
}

const song: Song = {
  name: "neon-cyber",
  bpm: BPM,
  beatsPerBar: BPB,
  bars: BARS,
  // A cavernous hall: the city at night, wet.
  reverb: { room: 0.86, damp: 0.55, width: 1, level: 0.9 },
  // A dotted-eighth ping-pong (half a pulse): echoes on the sixteenth grid.
  delay: { time: 1.5, feedback: 0.35, pingPong: true, damp: 3500, lowCut: 400, level: 0.85 },
  tracks: [
    // The sax: the theme, the outro, the second tenor under the climax.
    { inst: "sax", notes: sax, gain: 1.7, pan: 0, reverb: 0.38, humanize: 0.3, delay: 0.08, lowpass: 3600, label: "sax" },
    { inst: "sax", notes: saxHarmony, gain: 0.7, pan: -0.3, reverb: 0.4, humanize: 0.35, lowpass: 3200, label: "sax (harmony)" },
    // Piano: where it carries the tune (the intro's figure, the break) it sits over the open pad;
    // its answers under the sax stay lower.
    { inst: "piano", notes: pianoTune, gain: 0.28, pan: 0.05, reverb: 0.4, humanize: 0.25, delay: 0.1, label: "piano" },
    { inst: "piano", notes: pianoHigh.filter((n) => barOf(n.t) < THEME1), gain: 0.32, pan: 0.25, reverb: 0.45, humanize: 0.25, delay: 0.25, lowpass: 5000, label: "piano (high)" },
    { inst: "piano", notes: pianoHigh.filter((n) => barOf(n.t) >= THEME1), gain: 0.22, pan: 0.25, reverb: 0.45, humanize: 0.25, delay: 0.25, lowpass: 5000, label: "piano (high)" },
    { inst: "piano", notes: pianoLow, gain: 0.12, pan: -0.1, reverb: 0.3, humanize: 0.2, label: "piano (low)" },
    // Synths.
    { inst: "subBass", patch: SAW_BASS, notes: bass, gain: 0.8, reverb: 0.04, humanize: 0.05, highpass: 50, label: "bass" },
    { inst: "subBass", patch: DRONE, notes: drone, gain: 0.7, reverb: 0.1, humanize: 0, highpass: 50, label: "bass (drone)" },
    { inst: "superSawPad", patch: PAD, notes: padSoft, gain: 0.3, reverb: 0.4, humanize: 0.05, label: "pad" },
    { inst: "superSawPad", patch: PAD, notes: padOpen, gain: 0.32, reverb: 0.45, humanize: 0.05, label: "pad" },
    { inst: "superSaw", patch: BRASS, notes: brass, gain: 0.3, pan: 0.1, reverb: 0.4, humanize: 0.05, lowpass: 3000, label: "brass" },
    ...opening({ inst: "pluck", gain: 0.42, pan: 0.2, reverb: 0.3, humanize: 0.03, delay: 0.35, label: "sequencer" }, seqIntro, 1, THEME1 - 1, 900, 2400),
    { inst: "pluck", notes: seqMain, gain: 0.36, pan: 0.2, reverb: 0.3, humanize: 0.03, delay: 0.3, lowpass: 2400, label: "sequencer" },
    // Drums (quantized), the snare and toms gated.
    { inst: "dmKick", notes: kick, gain: 0.9, reverb: 0.05, humanize: 0, highpass: 120, lowpass: 7000, label: "kick" },
    // The snare cracks on every bar's second pulse, where the tune starts a note: loud, not over it.
    { inst: "dmSnare", patch: GATED_SNARE, notes: snare, gain: 0.57, reverb: 0.12, humanize: 0, ring: 0.3, lowpass: 4200, label: "snare (gated)" },
    { inst: "dmSnare", patch: GATED_SNARE, notes: build, gain: 0.4, reverb: 0.12, humanize: 0, ring: 0.16, lowpass: 4200, label: "snare build" },
    ...tomTracks(true, 0.7),
    ...tomTracks(false, 0.45),
    { inst: "dmHat", notes: hat, gain: 1.1, pan: -0.2, reverb: 0.08, humanize: 0, lowpass: 6000, label: "hats" },
    { inst: "dmHatOpen", notes: hatOpen, gain: 0.8, pan: 0.2, reverb: 0.1, humanize: 0, ring: 0.25, lowpass: 6000, label: "open hat" },
    { inst: "dmCrash", notes: crash, gain: 0.8, pan: -0.25, reverb: 0.3, humanize: 0, lowpass: 6000, label: "crash" },
    { inst: "riser", patch: SWELL, notes: swell, gain: 0.6, reverb: 0.3, humanize: 0, lowpass: 5000, label: "swell" },
    // Thunder, far off.
    { inst: "thunder", notes: thunderNear, gain: 0.21, pan: 0.2, reverb: 0.4, highpass: 110, lowpass: 1500, humanize: 0, label: "thunder" },
    { inst: "thunderRoll", notes: thunderFar, gain: 0.25, pan: -0.25, reverb: 0.4, ring: 7, highpass: 110, lowpass: 1500, humanize: 0, label: "thunder" },
    // The intro's swell, last: a track's humanizing is seeded by its place in this list, so a part
    // added at the end leaves every part above it playing exactly as before.
    { inst: "superSaw", patch: SOFT_BRASS, notes: brassSwell, gain: 0.42, pan: -0.1, reverb: 0.45, humanize: 0, lowpass: 2000, label: "brass (swell)" },
  ],
};

export default song;
