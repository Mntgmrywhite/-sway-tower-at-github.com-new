// Neon: French electro house on synths, for the Neon skins (every skin of the Neon style plays
// it: Synthwave and Cyberpunk, Blacklight and Minimal). The owner's reference is the euphoric
// French dance music of the early 2010s: a driving four-on-the-floor at 125 bpm, detuned
// super-saw chords pumping against the kick, plucky arpeggios, a gritty electro bass over a sub,
// open hats on the offbeats and claps on 2 and 4, filter sweeps, risers and snare-roll builds
// into the drops, and a euphoric lift. The genre only: every line here is the theme's or built
// from its chords. The synths are our own (synth.ts); the sax and piano are the real recordings.
//
// The theme in 4/4. Each 6/8 bar of the tune becomes one 4/4 bar: its two dotted-quarter pulses
// become the two half bars, and the three eighths of each pulse the 3+3+2 sixteenths of a
// tresillo (the house push). The tune's long-short lilt turns into a dotted-quarter-and-eighth
// hook, each short note pushing into the next pulse; the pickup runs fall on the tresillo's
// offbeats. A saw lead sings it (mono, its vibrato blooming on the long notes) while a pluck
// re-strikes the long notes every three sixteenths, so the hook drives the 3+3+2 under the
// melody. The harmony is the ballad's A minor (minorize, keeping the leading tone G# where the
// tune cadences on the dominant), one chord per bar as house has it: Am | F | Dm | Esus E, and
// the B section's lift into the relative major, F | G | C F | Dm6 E7.
//
// 48 bars at 125 bpm (92 s), the theme's harmony three times:
//   1-8    intro: the groove (kick, offbeat open hats, filtered electro bass, a pumping pad, the
//          pluck arpeggio opening up); claps, 16th hats and the sub join at bar 5.
//   9-16   build: super-saw chords whose filter opens across the eight bars, the pluck teasing
//          the tune's B and A'' sections behind its own opening filter, a riser and a snare roll
//          (quarters, eighths, sixteenths, 32nds) over the last four bars; the kick drops out
//          for bar 16, and the roll, the chords and the tease stop half a beat short (the breath).
//   17-32  drop 1: the whole tune as the hook (an octave of super saw under the B section's
//          climb), pumping chords, the electro bass bouncing octaves on the offbeats, the full
//          kit; a crash and a downlifter on the drop.
//   33-40  breakdown: no kick. A real tenor sax sings the A section over house piano (struck on
//          the hook's rhythm, left-hand octaves under it) and a breathing pad (33-36); then
//          build 2 (37-40): the lead takes A' behind a filter that opens bar by bar, the chords
//          sweep open, the piano pulses in eighths, kick on the beat, the roll and the riser,
//          and the same breath before the drop.
//   41-48  drop 2: the B section's lift and A'' with everything, plus house-piano stabs, bells
//          an octave over the hook and a ride; a tom fill in bar 48 turns the loop back into the
//          intro (which starts on a crash, so the turn sounds meant).
//
// Groove: the drum machine is quantized; everything on the odd sixteenths (hats, arps, bass
// pops, the hook's pushes) sits 0.04 beat late, a light house swing. The pitched parts pump
// against the kick (Song.pump): the sub and the chords deepest, the lead least. The plucks, sax
// and piano send into a dotted-eighth ping-pong delay (Song.delay).
//
// Mix (mix.ts, and phone-weighted: a 24 dB/octave high-pass at 200 Hz): the hook within 5-6 dB
// of the mix in the drops, the sax within 5 in the breakdown; the kick high-passed at 120 Hz
// (its body only cost loudness on phones; its punch and click carry) and the sub kept low; the
// clap and snare loud enough that 2 and 4 jump out over 1 and 3 on a phone; hats, claps, snares,
// crash, risers and the breakdown's arp low-passed so the top end sits near the brightest other songs.
// Section loudness rises intro < build < drop 1 > breakdown < build 2 < drop 2.
//
// Register plan:
//   sub E1-D2 (felt, not heard on phones) · electro bass A1-G3 · chords, pad and piano G3-F4
//   (the piano's left hand A1-F3 in the breakdown) · arp E4-G5 under the hook in the drops,
//   A4-C6 elsewhere · hook E4-C6 (super saw an octave down, B3-B4, in the climb) · sax G#4-A5 ·
//   bells A5-B6.

import { midi } from "../sampler";
import { transpose, type Note, type Song, type Track } from "../song";
import { SYNTHS, type Patch, type VoicePatch } from "../synth";
import { CHORDS, EIGHTHS_PER_BAR, melody, minorize } from "../theme";

const BPM = 125;
const BPB = 4;
const BARS = 48;
const LOOP = BARS * BPB;
/** Start of a 1-based bar, in beats. */
const bar = (b: number): number => (b - 1) * BPB;
/** The 1-based bar a time falls in. */
const barOf = (t: number): number => Math.floor(t / BPB + 1e-9) + 1;
/** The theme bar (1-16) a song bar plays: the song is the theme's harmony three times. */
const themeBar = (b: number): number => ((b - 1) % 16) + 1;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const clampV = (v: number): number => Math.min(0.98, Math.max(0.08, v));

/** House swing: notes on the odd sixteenths sit this many beats late. */
const SWING = 0.04;
const swing = (t: number): number => {
  const s = t * 4;
  return Math.abs(s - Math.round(s)) < 1e-6 && Math.round(s) % 2 !== 0 ? t + SWING : t;
};

// ------------------------------------------------------------------ the theme in 4/4

/**
 * The theme in A minor, as the ballad had it: minorize() flattens every B, but over the
 * dominant (G) the B is the leading tone the tune cadences on, so it stays natural (G# in A minor).
 */
const minorTheme: Note[] = (() => {
  const major = melody();
  const minor = minorize(major).map((n, i) => {
    const orig = num(major[i]!.n);
    const onDominant = CHORDS[Math.floor(n.t / 3)]![0] === "G";
    return orig % 12 === 11 && onDominant ? { ...n, n: orig } : n;
  });
  return transpose(minor, -3);
})();

/** 6/8 eighths to 4/4 beats: a dotted-quarter pulse is a half bar, its eighths a tresillo (3+3+2 sixteenths). */
function toBeats(e: number): number {
  const half = Math.floor(e / 3 + 1e-9);
  return 2 * half + [0, 0.75, 1.5][Math.round(e - 3 * half)]!;
}

/** The hook: the theme in 4/4 (beats from the start of a theme pass), with the theme bar each note is in. */
const HOOK: (Note & { tb: number })[] = minorTheme.map((n) => {
  const t = toBeats(n.t);
  return { t, d: toBeats(n.t + n.d) - t, n: num(n.n), v: n.v, tb: Math.floor(n.t / EIGHTHS_PER_BAR) + 1 };
});

/** The hook's notes in theme bars [from, to], placed at song bar `at` (which plays theme bar `from`). */
function hookBars(from: number, to: number, at: number): (Note & { tb: number })[] {
  return HOOK.filter((n) => n.tb >= from && n.tb <= to).map((n) => ({ ...n, t: n.t - bar(from) + bar(at) }));
}

// ------------------------------------------------------------------ harmony

interface Chord {
  /** Electro bass root (A1-G2); the sub plays it too, an octave down where its register allows. */
  bass: string;
  /** The saw chords' (and pad's, and piano stabs') voicing, under the hook. */
  voicing: string[];
}
const Am: Chord = { bass: "A1", voicing: ["A3", "C4", "E4"] };
const AmG: Chord = { bass: "G2", voicing: ["A3", "C4"] }; // the pickup E4 F4 G4 runs over it: no E4
const F: Chord = { bass: "F2", voicing: ["A3", "C4", "F4"] };
const Dm: Chord = { bass: "D2", voicing: ["A3", "D4", "F4"] };
const Dm7: Chord = { bass: "D2", voicing: ["A3", "C4", "F4"] };
const Dm6: Chord = { bass: "D2", voicing: ["A3", "B3", "D4", "F4"] };
const Esus: Chord = { bass: "E2", voicing: ["A3", "B3", "E4"] };
const E7: Chord = { bass: "E2", voicing: ["G#3", "B3", "D4", "E4"] };
/** Bar 4's E7 leaves its 3rd to the tune (G#4 A4 B4: a G#3 under the passing A4 is a b9). */
const E7no3: Chord = { bass: "E2", voicing: ["B3", "D4", "E4"] };
const G: Chord = { bass: "G2", voicing: ["G3", "B3", "D4"] };
const C: Chord = { bass: "C2", voicing: ["G3", "C4", "E4"] };

/** One chord per half bar of the theme (32 halves, 16 bars). */
const HALVES: Chord[] = [
  Am, Am, F, F, Dm, Dm, Esus, E7no3, // A
  Am, Am, F, F, Dm, E7, Am, AmG, // A'
  F, F, G, G, C, F, Dm6, E7, // B: the lift
  Am, Am, F, F, Dm7, Dm6, Esus, E7, // A''
];
/** The chord at song time t (beats). */
const chordAt = (t: number): Chord => HALVES[(themeBar(barOf(t)) - 1) * 2 + (t % BPB >= 2 ? 1 : 0)]!;
/** Half bars (start beat, chord) over song bars [from, to], merging repeated chords into one. */
function halves(from: number, to: number): { t: number; d: number; c: Chord }[] {
  const out: { t: number; d: number; c: Chord }[] = [];
  for (let t = bar(from); t < bar(to + 1); t += 2) {
    const c = chordAt(t);
    const last = out[out.length - 1];
    if (last && last.c === c && last.t + last.d === t) last.d += 2;
    else out.push({ t, d: 2, c });
  }
  return out;
}

// ------------------------------------------------------------------ drums

const kick: Note[] = [];
const clap: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const hatOpen: Note[] = [];
const hat: Note[] = [];
const ride: Note[] = [];
const crash: Note[] = [];
const toms: { hi: Note[]; mid: Note[]; lo: Note[] } = { hi: [], mid: [], lo: [] };

const INTRO = (b: number) => b <= 8;
const BUILD1 = (b: number) => b >= 9 && b <= 16;
const DROP1 = (b: number) => b >= 17 && b <= 32;
const BREAK = (b: number) => b >= 33 && b <= 36;
const BUILD2 = (b: number) => b >= 37 && b <= 40;
const DROP2 = (b: number) => b >= 41;
const DROP = (b: number) => DROP1(b) || DROP2(b);

/**
 * The breath before each drop: the build's sustained parts (the swept chords, the pluck's
 * tease) stop with the snare roll, half a beat before the drop, so the drop lands out of a
 * near silence. The lead's pickup into drop 2 still sings through it.
 */
const BREATH = 3.5;
const PRE_DROP = new Set([16, 40]);
function breathe(notes: Note[]): Note[] {
  return notes.flatMap((n) => {
    const b = barOf(n.t);
    if (!PRE_DROP.has(b)) return [n];
    const cut = bar(b) + BREATH;
    if (n.t >= cut - 0.01) return [];
    return [{ ...n, d: Math.min(n.d, cut - 0.02 - n.t) }];
  });
}

for (let b = 1; b <= BARS; b++) {
  const s = bar(b);
  // Kick: four on the floor, except the breakdown and the bar before each drop (the gap).
  if (!BREAK(b) && b !== 16 && b !== 40) for (let q = 0; q < 4; q++) kick.push({ t: s + q, d: 0.5, n: "C2", v: 0.92 });
  // Claps (with a snare under them in the drops) on 2 and 4.
  const claps = (b >= 5 && b <= 15) || DROP(b) || (b >= 37 && b <= 39);
  if (claps) {
    for (const q of [1, 3]) {
      if ((b === 32 || b === 48) && q === 3) continue; // the fills
      clap.push({ t: s + q, d: 0.5, n: "C4", v: 0.85 });
      if (DROP(b)) snare.push({ t: s + q, d: 0.5, n: "C4", v: 0.7 });
    }
  }
  // Open hats on every offbeat eighth; 16th hats around them from bar 5.
  const opens = !BREAK(b) && b !== 16 && b !== 40;
  for (let k = 0; k < 16; k++) {
    const t = s + k / 4;
    if (k % 4 === 2) {
      if (opens) hatOpen.push({ t, d: 0.25, n: "C4", v: DROP(b) ? 0.82 : 0.72 });
      continue;
    }
    const sixteenths = (b >= 5 && b <= 15) || DROP(b) || (BUILD2(b) && b !== 40);
    if (!sixteenths) continue;
    if ((b === 32 || b === 48) && k >= 12) continue;
    if (BUILD2(b) && k % 2) continue; // eighths only in build 2
    hat.push({ t: swing(t), d: 0.25, n: "C4", v: k % 4 === 0 ? 0.62 : 0.42 });
  }
  // A ride on the beat in drop 2: the lift's extra shine.
  if (DROP2(b)) for (let q = 0; q < 4; q++) ride.push({ t: s + q, d: 1, n: "C4", v: q % 2 ? 0.5 : 0.6 });
}
// Crashes on the section starts (and the loop's start, after drop 2's fill).
for (const b of [1, 17, 25, 33, 41, 45]) crash.push({ t: bar(b), d: 1, n: "C4", v: b === 17 || b === 41 ? 0.9 : 0.75 });

/** A snare roll over 4 bars into a drop: quarters, eighths, sixteenths, then sixteenths and 32nds; silent for its last half beat. */
function buildRoll(start: number): void {
  const steps: [number, number][] = [[0, 1], [4, 0.5], [8, 0.25], [12, 0.25], [14, 0.125]];
  for (let k = 0; k < steps.length; k++) {
    const [from, step] = steps[k]!;
    const to = k + 1 < steps.length ? steps[k + 1]![0] : 15.5;
    for (let t = from; t < to - 1e-9; t += step) roll.push({ t: bar(start) + t, d: 0.25, n: "C4", v: clampV(0.3 + (0.62 * t) / 15.5) });
  }
}
buildRoll(13);
buildRoll(37);
// A sixteenth-note snare fill closing drop 1's first half (bar 24) and into the breakdown (bar 32).
for (const t of [3, 3.25, 3.5, 3.75]) snare.push({ t: bar(24) + t, d: 0.25, n: "C4", v: 0.45 + (t - 3) * 0.4 });
for (const t of [3, 3.25, 3.5, 3.75]) snare.push({ t: bar(32) + t, d: 0.25, n: "C4", v: 0.5 + (t - 3) * 0.4 });
// Bar 48: a tom fill down the last two beats, back into the intro.
const FILL: [number, "hi" | "mid" | "lo"][] = [[2, "hi"], [2.25, "hi"], [2.5, "mid"], [2.75, "mid"], [3, "lo"], [3.25, "lo"], [3.5, "lo"], [3.75, "lo"]];
for (const [t, drum] of FILL) toms[drum].push({ t: bar(48) + t, d: 0.5, n: "C4", v: 0.7 + (t - 2) * 0.12 });

// ------------------------------------------------------------------ bass

const electro: Note[] = [];
const electroIntro: Note[] = [];
const sub: Note[] = [];
/** The sub an octave under the electro root where its register (E1 up) allows. */
const subRoot = (m: number): number => (m - 12 >= midi("E1") ? m - 12 : m);
for (let b = 1; b <= BARS; b++) {
  if (BREAK(b) || b === 16 || b === 40) continue;
  const s = bar(b);
  // Offbeat eighths on the root; in the drops an octave pop on the last sixteenth of each beat,
  // and a pickup into the next chord on the bar's last sixteenth.
  for (let q = 0; q < 4; q++) {
    const c = chordAt(s + q);
    const root = num(c.bass);
    const out = INTRO(b) || BUILD1(b) || BUILD2(b) ? electroIntro : electro;
    out.push({ t: s + q + 0.5, d: 0.26, n: root, v: q % 2 ? 0.8 : 0.72 });
    if (DROP(b)) {
      const pop = q === 3 ? num(chordAt(s + 4 < LOOP ? s + 4 : 0).bass) : root + 12;
      electro.push({ t: swing(s + q + 0.75), d: 0.25, n: pop, v: 0.62 });
    }
  }
  // The sub holds each chord's root (from bar 5), pumped by the kick into a swell.
  if (b >= 5) {
    for (const h of [0, 2]) sub.push({ t: s + h, d: 1.95, n: subRoot(num(chordAt(s + h).bass)), v: 0.75 });
  }
}

// ------------------------------------------------------------------ chords, pad, piano

/** Held chords over bars [from, to]: each chord's voicing for as long as it lasts (repeats tied), voices a few ms apart. */
function chordNotes(from: number, to: number, v: number): Note[] {
  return halves(from, to).flatMap(({ t, d, c }) => c.voicing.map((n, k) => ({ t: t + k * 0.004, d: d - 0.06, n: num(n), v })));
}

// The build's chords open bar by bar: one patch per bar, its filter swept up across the bar by
// the patch's ramp, from where the last bar's ended (a 24 dB resonant low-pass, 380 Hz to 6.5 kHz).
const SAW = SYNTHS.superSaw as Patch as VoicePatch;
function sweepPatch(fromHz: number, toHz: number): VoicePatch {
  return {
    ...SAW,
    filter: { ...SAW.filter!, cutoff: fromHz, resonance: 0.32, envAmount: 0.3 },
    ramp: { cutoff: Math.log2(toHz / fromHz) },
  };
}
/** Tracks of super-saw chords over bars [from, to] whose filter opens from `lo` Hz to `hi` Hz. */
function sweptChords(from: number, to: number, lo: number, hi: number, base: Omit<Track, "inst" | "notes">): Track[] {
  const n = to - from + 1;
  const hz = (k: number) => lo * (hi / lo) ** (k / n);
  const out: Track[] = [];
  for (let b = from; b <= to; b++) {
    const k = b - from;
    // A chord held across the bar is one note, its sweep spanning the bar; a chord change splits
    // the bar into two notes, one patch per half, so the sweep runs on without a jump.
    // Each note's sweep ends where its held length ends (earlier in the breath before a drop).
    const notes = breathe(halves(b, b).flatMap(({ t, d, c }) => c.voicing.map((m) => ({ t, d: d - 0.04, n: num(m), v: 0.7 }))));
    const halfHz = (x: number) => hz(k + x);
    const first = notes.filter((x) => x.t % BPB < 2);
    const second = notes.filter((x) => x.t % BPB >= 2);
    const firstLen = first.length ? (first[0]!.d + 0.04) / BPB : 0;
    const secondLen = second.length ? (second[0]!.d + 0.04) / BPB : 0;
    if (first.length) out.push({ ...base, inst: "superSaw", patch: sweepPatch(halfHz(0), halfHz(firstLen)), notes: first });
    if (second.length) out.push({ ...base, inst: "superSaw", patch: sweepPatch(halfHz(0.5), halfHz(0.5 + secondLen)), notes: second });
  }
  return out;
}

const chords: Note[] = [...chordNotes(17, 32, 0.72), ...chordNotes(41, 48, 0.76)];
const padIntro: Note[] = chordNotes(1, 8, 0.6);
const padBreak: Note[] = chordNotes(33, 36, 0.6);

// House piano: in the breakdown, each half bar's chord struck on the hook's rhythm (a dotted
// quarter, then the push on its last eighth) over left-hand octaves; in build 2 the chords pulse
// in eighths, growing; in drop 2, syncopated stabs (3+3+4+3+3 sixteenths).
const pianoChords: Note[] = [];
const pianoPulse: Note[] = [];
const pianoLow: Note[] = [];
for (let t = bar(33); t < bar(37); t += 2) {
  const c = chordAt(t);
  for (const n of c.voicing) pianoChords.push({ t, d: 1.42, n: num(n), v: 0.56 }, { t: t + 1.5, d: 0.42, n: num(n), v: 0.46 });
  const root = num(c.bass);
  pianoLow.push({ t, d: 1.9, n: root, v: 0.6 }, { t: t + 0.01, d: 1.9, n: root + 12, v: 0.55 });
}
for (let b = 37; b <= 40; b++) {
  for (let e = 0; e < 8; e++) {
    const t = bar(b) + e / 2;
    if (b === 40 && e >= 7) continue;
    for (const n of chordAt(t).voicing) pianoPulse.push({ t: swing(t), d: 0.4, n: num(n), v: clampV(0.38 + ((b - 37) * 8 + e) * 0.012) });
  }
}
const STAB = [0, 0.75, 1.5, 2.5, 3.25];
const pianoStabs: Note[] = [];
for (let b = 41; b <= 48; b++) {
  for (const x of STAB) {
    if (b === 48 && x > 2) continue;
    const t = bar(b) + x;
    for (const n of chordAt(t).voicing) pianoStabs.push({ t: swing(t), d: 0.3, n: num(n), v: x === 0 ? 0.72 : 0.62 });
  }
}

// ------------------------------------------------------------------ arpeggio

/** Chord tones from `lo` up within an octave and a third (the arp's lane), at least four. */
function lane(c: Chord, lo: string): number[] {
  const pcs = new Set(c.voicing.map((n) => num(n) % 12));
  const out: number[] = [];
  for (let m = num(lo); out.length < 5 && m < num(lo) + 16; m++) if (pcs.has(m % 12)) out.push(m);
  return out;
}
/** Sixteenth arpeggio (rising and turning), accented on the tresillo's 3+3+2. */
const ARP = [0, 2, 1, 3, 2, 4, 3, 1];
const ACCENT = new Set([0, 3, 6]);
function arpeggio(from: number, to: number, lo: string, v: number, skip: (b: number, k: number) => boolean = () => false): Note[] {
  const out: Note[] = [];
  for (let b = from; b <= to; b++) {
    for (let k = 0; k < 16; k++) {
      if (skip(b, k)) continue;
      const t = bar(b) + k / 4;
      const tones = lane(chordAt(t), lo);
      const n = tones[ARP[k % 8]! % tones.length]!;
      out.push({ t: swing(t), d: 0.2, n, v: clampV(v + (ACCENT.has(k % 8) ? 0.12 : 0)) });
    }
  }
  return out;
}
// Intro: high and filtered (opening at bar 5); build 1 and the breakdown: high, with the delay;
// drops: lower, under the hook.
const arpIntro = arpeggio(1, 4, "A4", 0.5);
const arpIntro2 = arpeggio(5, 15, "A4", 0.52);
const arpBreak = arpeggio(33, 39, "A4", 0.45);
const arpDrop = [...arpeggio(17, 32, "E4", 0.5), ...arpeggio(41, 48, "E4", 0.52, (b, k) => b === 48 && k >= 8)];

// ------------------------------------------------------------------ the hook

/** A part split into one track per bar over [from, to], its low-pass opening from `lo` to `hi` Hz (a step per bar). */
function opening(base: Omit<Track, "notes" | "lowpass">, notes: Note[], from: number, to: number, lo: number, hi: number): Track[] {
  const out: Track[] = [];
  for (let b = from; b <= to; b++) {
    const inBar = notes.filter((n) => barOf(n.t) === b);
    if (inBar.length) out.push({ ...base, notes: inBar, lowpass: Math.round(lo * (hi / lo) ** ((b - from) / Math.max(1, to - from))) });
  }
  return out;
}

/** Synth-lead phrasing: a short gap before each note so it retriggers; louder on the pulses. */
function leadPhrase(notes: Note[], lift = 0): Note[] {
  return notes.map((n) => {
    const onPulse = n.t % 2 === 0;
    return { t: swing(n.t), d: Math.max(0.15, n.d - 0.08), n: n.n, v: clampV((n.v ?? 0.6) + 0.1 + (onPulse ? 0.06 : 0) + lift) };
  });
}

// Drop 1: the whole tune; build 1 previews B and A'' on the pluck; build 2 brings in A' on
// the lead behind the opening filter; drop 2 plays B and A''.
const hookDrop1 = hookBars(1, 16, 17);
const hookDrop2 = hookBars(9, 16, 41);
/**
 * The pluck's hook: the tune with its long notes re-struck every three sixteenths, so under the
 * singing saw it drives the 3+3+2 of each half bar.
 */
function restrike(notes: Note[]): Note[] {
  return notes.flatMap((n) => {
    const out: Note[] = [];
    for (let x = 0; x < n.d - 0.3; x += 0.75) out.push({ t: n.t + x, d: Math.min(0.75, n.d - x), n: n.n, v: (n.v ?? 0.6) - (x ? 0.08 : 0) });
    return out;
  });
}
const lead: Note[] = leadPhrase([...hookDrop1, ...hookDrop2]);
const leadBuild2: Note[] = leadPhrase(hookBars(5, 8, 37), -0.1);
const pluckHook: Note[] = leadPhrase(restrike([...hookDrop1, ...hookDrop2]), -0.05);
const pluckTease: Note[] = breathe(leadPhrase(restrike(hookBars(9, 16, 9)), -0.12));
// The B section's climb, doubled by a super saw an octave down (bars 25-28 and 41-44).
const climb: Note[] = leadPhrase([...hookBars(9, 12, 25), ...hookBars(9, 12, 41)], -0.1).map((n) => ({ ...n, n: num(n.n) - 12 }));
// Drop 2's bells: the hook an octave up, lightly.
const bells: Note[] = hookDrop2.map((n) => ({ t: swing(n.t), d: Math.min(n.d, 1), n: num(n.n) + 12, v: clampV((n.v ?? 0.6) - 0.05) }));

// ------------------------------------------------------------------ the sax (breakdown)

/** Sax phrasing: tongued legato, a touch behind the beat, louder on the pulses and long notes. */
function saxPhrase(notes: Note[]): Note[] {
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  return sorted.map((n, i) => {
    const next = sorted[i + 1];
    const gap = next ? next.t - (n.t + n.d) : Infinity;
    const d = gap < 0.01 ? n.d - 0.03 : n.d - 0.2;
    const pulse = n.t % 2 === 0 ? 0.08 : 0;
    return { t: n.t + 0.03, d, n: n.n, v: clampV(0.62 + pulse + Math.min(0.08, (n.d - 0.75) * 0.05)) };
  });
}
// The A section (bars 33-36), then a held answer into build 2.
const sax: Note[] = saxPhrase([...hookBars(1, 4, 33), { t: bar(37), d: 2, n: num("C5"), v: 0.6 }]);

// ------------------------------------------------------------------ effects

const riser: Note[] = [{ t: bar(13), d: 15.5, n: "C4", v: 0.8 }, { t: bar(37), d: 15.5, n: "C4", v: 0.8 }];
const downlifter: Note[] = [17, 33, 41].map((b) => ({ t: bar(b), d: 4, n: "C4", v: 0.7 }));

// ------------------------------------------------------------------ the song

/** The pump key: every pitched part ducks at these kicks. */
const KICK = "kick";

/** Seconds per beat (for the cues). */
const SEC = 60 / BPM;

const song: Song = {
  name: "neon",
  bpm: BPM,
  beatsPerBar: BPB,
  bars: BARS,
  // Synthwave's chrome car keeps time with these (src/skins/neon/car.ts): it floors it and drives
  // off into the distance on the first drop (bar 17), and comes back round on the lift (bar 25,
  // the B section's climb in drop 1, with its crash).
  cues: { drop: bar(17) * SEC, lift: bar(25) * SEC },
  reverb: { room: 0.78, damp: 0.5, width: 1, level: 0.8 },
  pump: { from: KICK, release: 0.75, curve: 2 },
  delay: { time: 0.75, feedback: 0.38, pingPong: true, damp: 4500, lowCut: 400, level: 0.9 },
  tracks: [
    // Drum machine (quantized: no humanizing).
    { inst: "dmKick", notes: kick, gain: 1.25, reverb: 0.02, humanize: 0, highpass: 120, lowpass: 8000, label: KICK },
    // The clap's two sides are separate noise (it loses 3 dB on a mono phone speaker) and it sits
    // under the hook's long notes: loud enough that 2 and 4 stand out over 1 and 3 on a phone.
    { inst: "dmClap", notes: clap, gain: 3, reverb: 0.22, humanize: 0, delay: 0.05, lowpass: 4500, label: "clap" },
    { inst: "dmSnare", notes: snare, gain: 0.77, reverb: 0.18, humanize: 0, lowpass: 5000, label: "snare" },
    { inst: "dmSnare", notes: roll, gain: 0.5, reverb: 0.25, humanize: 0, lowpass: 4000, label: "snare roll" },
    { inst: "dmHatOpen", notes: hatOpen, gain: 0.8, pan: 0.15, reverb: 0.05, humanize: 0, ring: 0.2, lowpass: 6000, label: "open hat" },
    { inst: "dmHat", notes: hat, gain: 0.8, pan: -0.15, reverb: 0.03, humanize: 0, lowpass: 6500, label: "hat" },
    { inst: "dmRide", notes: ride, gain: 0.5, pan: 0.3, reverb: 0.1, humanize: 0, lowpass: 8000, label: "ride" },
    { inst: "dmCrash", notes: crash, gain: 0.9, pan: -0.2, reverb: 0.2, humanize: 0, lowpass: 7000, label: "crash" },
    { inst: "dmTomHigh", notes: toms.hi, gain: 0.8, pan: -0.25, reverb: 0.2, humanize: 0, label: "toms" },
    { inst: "dmTomMid", notes: toms.mid, gain: 0.8, pan: 0, reverb: 0.2, humanize: 0, label: "toms" },
    { inst: "dmTomLow", notes: toms.lo, gain: 0.8, pan: 0.25, reverb: 0.2, humanize: 0, label: "toms" },
    // Bass
    { inst: "electroBass", notes: electro, gain: 1.15, reverb: 0, humanize: 0.05, pump: 0.45, highpass: 75, label: "electro bass" },
    { inst: "electroBass", notes: electroIntro, gain: 0.9, reverb: 0, humanize: 0.05, pump: 0.45, lowpass: 900, highpass: 75, label: "electro bass (filtered)" },
    { inst: "subBass", notes: sub, gain: 0.3, reverb: 0, humanize: 0, pump: 0.9, highpass: 30, label: "sub" },
    // Chords
    { inst: "superSaw", notes: chords, gain: 0.8, reverb: 0.15, humanize: 0.05, pump: 0.75, lowpass: 5000, label: "saw chords" },
    ...sweptChords(9, 16, 380, 6500, { gain: 0.6, reverb: 0.15, humanize: 0.05, pump: 0.75, label: "saw chords (sweep)" }),
    ...sweptChords(37, 40, 380, 6500, { gain: 0.6, reverb: 0.15, humanize: 0.05, pump: 0.6, label: "saw chords (sweep)" }),
    { inst: "superSawPad", notes: padIntro, gain: 0.7, reverb: 0.3, humanize: 0.05, pump: 0.8, label: "pad" },
    { inst: "superSawPad", notes: padBreak, gain: 0.3, reverb: 0.35, humanize: 0.05, label: "pad" },
    // Arps
    { inst: "pluck", notes: arpIntro, gain: 0.62, pan: 0.2, reverb: 0.15, humanize: 0.05, pump: 0.4, delay: 0.3, lowpass: 1600, label: "arp (filtered)" },
    { inst: "pluck", notes: arpIntro2, gain: 0.62, pan: 0.2, reverb: 0.15, humanize: 0.05, pump: 0.4, delay: 0.3, lowpass: 3500, label: "arp (filtered)" },
    // The breakdown's arp is dark: the quiet breakdown shows any fizz.
    { inst: "pluck", notes: arpBreak, gain: 0.42, pan: 0.2, reverb: 0.25, humanize: 0.05, pump: 0.4, delay: 0.4, lowpass: 3200, label: "arp" },
    { inst: "pluck", notes: arpDrop, gain: 0.4, pan: 0.25, reverb: 0.1, humanize: 0.05, pump: 0.5, delay: 0.2, lowpass: 4000, label: "arp" },
    // The hook
    { inst: "sawLead", notes: lead, gain: 1.35, reverb: 0.2, humanize: 0.05, pump: 0.15, delay: 0.12, lowpass: 3800, label: "lead" },
    ...opening({ inst: "sawLead", gain: 1.3, reverb: 0.25, humanize: 0.05, pump: 0.15, delay: 0.2, label: "lead (filtered)" }, leadBuild2, 37, 40, 1400, 3800),
    { inst: "pluck", notes: pluckHook, gain: 0.7, pan: -0.1, reverb: 0.15, humanize: 0.05, pump: 0.15, delay: 0.15, lowpass: 5000, label: "lead" },
    ...opening({ inst: "pluck", gain: 0.95, pan: -0.1, reverb: 0.2, humanize: 0.05, pump: 0.3, delay: 0.3, label: "lead (tease)" }, pluckTease, 9, 16, 1500, 5000),
    { inst: "superSaw", notes: climb, gain: 0.6, reverb: 0.2, humanize: 0.05, pump: 0.3, lowpass: 6000, label: "lead (climb)" },
    { inst: "bell", notes: bells, gain: 0.5, pan: 0.3, reverb: 0.3, humanize: 0.05, delay: 0.15, label: "bells" },
    // Real instruments
    { inst: "sax", notes: sax, gain: 1.15, reverb: 0.3, humanize: 0.3, delay: 0.12, lowpass: 4500, label: "sax" },
    { inst: "piano", notes: pianoChords, gain: 0.14, pan: -0.15, reverb: 0.3, humanize: 0.2, delay: 0.1, label: "piano" },
    { inst: "piano", notes: pianoPulse, gain: 0.11, pan: -0.15, reverb: 0.2, humanize: 0.2, pump: 0.35, delay: 0.08, label: "piano" },
    { inst: "piano", notes: pianoStabs, gain: 0.17, pan: -0.15, reverb: 0.2, humanize: 0.2, pump: 0.35, delay: 0.08, label: "piano" },
    { inst: "piano", notes: pianoLow, gain: 0.15, pan: -0.05, reverb: 0.25, humanize: 0.2, label: "piano (low)" },
    // Effects
    { inst: "riser", notes: riser, gain: 1, reverb: 0.3, humanize: 0, lowpass: 5000, label: "riser" },
    { inst: "downlifter", notes: downlifter, gain: 0.8, reverb: 0.3, humanize: 0, lowpass: 6000, label: "downlifter" },
  ],
};

export default song;
