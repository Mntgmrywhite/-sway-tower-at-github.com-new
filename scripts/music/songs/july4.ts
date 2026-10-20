// Independence Day: the theme as a Sousa-style military march, for the small-town parade, the
// bandstand and the fireworks night. In the spirit of the 6/8 quicksteps of the American march
// kings (our theme only, our own arrangement), with one public-domain tune woven in the way the
// Christmas carols are: "Yankee Doodle" (traditional, 18th century) is the second strain, fife
// and drum, then the whole band on its chorus; its first line comes back as the dogfight's answer.
//
// 80 bars of the theme's 6/8 at a dotted quarter of 120 (360 eighths a minute: one bar a second,
// 48,000 frames, 80 s): the parade's 120 steps a minute.
//
// Form (bars):
//    1–4   INTRO: the band's fanfare in E flat (cornets, horns, trombones, euphonium and tuba in
//          octaves: a bugle call on the tonic, the arpeggio down, a scale run up to the dominant),
//          clash cymbals, and the snare roll into
//    5–20  FIRST STRAIN, the theme in E flat: the cornets (the staccato trumpet) carry it, a second
//          cornet in harmony from A'; the piccolo doubles it an octave up from A' and runs into each
//          phrase where the tune holds; the bells ring its pulses; the EUPHONIUM sings a
//          countermelody under it the whole strain; the horns on the after-beats, the tuba and bass
//          drum on the beat, the snare's march with a roll into each phrase, cymbals on the phrases.
//   21–28  SECOND STRAIN, "Yankee Doodle" (the verse) in E flat, fife and drum: the piccolo two
//          octaves up and the clarinet at pitch over a field drum, the tuba's oom and soft horns;
//   29–36  its chorus with the whole band: cornets with the clarinet, the piccolo above, the
//          euphonium on the tune an octave under the cornets, trombone and horn after-beats, the
//          full drums. Its last chord turns to E flat seventh, the dominant of
//   37–52  THE TRIO, the theme in A flat, soft: the TENOR SAX sings it (G3–C5) with the clarinet in
//          harmony under it, the euphonium holding the bass (no tuba), the horns' after-beats and
//          the drums light, the bells on the pulses. It ends on the dominant and falls to
//   53–60  THE DOGFIGHT (the break strain) in F minor: the low brass (euphonium, horns, trombones,
//          tuba) hammer the theme's head, a cannon (bass drum and cymbals) on their last note; the
//          cornets, clarinet and piccolo answer with "Yankee Doodle keep it up" in A flat; the call
//          again on D flat and the cannon; the answer, and the band runs up the dominant over a
//          snare roll into
//   61–76  THE GRANDIOSO, the theme in A flat with everything: cornets in two parts with the
//          clarinet, the piccolo's obbligato above them (turns on the pulses, runs where the tune
//          holds, a trill into the last bar), the EUPHONIUM's countermelody in full voice, horns
//          and trombones on the after-beats, tuba and bass drum, the snare, cymbals, bells. In its
//          last phrase the fireworks start: three whistles rising into the dark and their distant
//          booms (our synth), low and behind the band (17–22 dB under it, the booms on beats the
//          band owns). The tune lands on A flat and the band's stinger.
//   77–80  the drumline's street beat (two bars), then the roll-off: a snare roll and the low brass
//          swelling on B flat seventh, the cornets' three-note pickup into bar 1.
//
// Register plan (low to high): tuba oom C2–B2 (the sustained tuba holds only B flat 1 and F2) ·
// euphonium Bb2–Eb4 (the strain's countermelody), G3–F4 (the chorus tune), Ab2–G3 (the trio's
// bass), F2–Db3 (the dogfight's call), Eb2–Eb4 (the grandioso's countermelody) · horns Eb3–C4
// (after-beats and the call: the recorded horn has nothing between C4 and D5) · trombone
// after-beats Eb3–Bb3 · cornets D4–G5 (the strain), G4–F5 (the chorus), F5–Ab5 (the answers),
// G4–C6 (the grandioso) · clarinet Bb4–Ab5 (the verse), Eb3–Ab4 (the trio's harmony) · sax G3–C5 ·
// piccolo D5–G6 (the strain), Bb5–Ab6 (the verse), G5–C7 (the grandioso) · bells D6–G7.
//
// Mix (scripts/music/mix.ts, dB against the mix per 4-bar phrase): each section's lead within 6 dB
// (the cornets at -4 to -7, the clarinet and piccolo on the verse, the sax in the trio at -2), the
// euphonium's countermelodies at -7 to -9, the after-beats, tuba and drums within 9 to 16. The
// fireworks sit 17 to 22 under the band (the booms are mostly sub-bass: louder, they only made
// master() turn the band down). Everything bright is low-passed (cornets 3.5 kHz, piccolo 3.6,
// clarinet 4, bells 4, snare 4.5, cymbals 4.5), so the 2–8 kHz band sits among the other songs'
// (between New Year's and Oktoberfest). Tuning (scripts/music/tuning.ts): every sax, horn,
// trombone, tuba and euphonium note within 4 cents as heard; the staccato tuba stays at C2 and up
// (its low B flat take reads flat) and skips the dogfight call's one-eighth notes; the sustained
// euphonium keeps to the tuba's soft takes (softLayer), the only layer recorded up to D4.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import type { DrumPatch, VoicePatch } from "../synth";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths per minute: a dotted quarter of 120. One bar = 48,000 frames at 48 kHz. */
const BPM = 360;
const BARS = 80;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;

// The sections' first bars (1-based).
const INTRO = 1;
const STRAIN = 5;
const VERSE = 21;
const CHORUS = 29;
const TRIO = 37;
const FIGHT = 53;
const GRAND = 61;
const TAG = 77;

/** Start of bar b (1-based), in eighths. */
const bar = (b: number) => (b - 1) * BAR;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
/** Notes of one bar written as [eighth in the bar, length in eighths, note, velocity]. */
type Cell = [number, number, string | number, number];
const cells = (b: number, list: Cell[]): Note[] => list.map(([p, d, n, v]) => ({ t: bar(b) + p, d, n: num(n), v }));

// ---------------------------------------------------------------- harmony

const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SUFFIX: Record<Quality, string> = { maj: "", min: "m", dom7: "7", min7: "m7", dim: "dim" };
const pcOf = (name: string) => midi(`${name}4`) % 12;
const EB = pcOf("Eb");
const AB = pcOf("Ab");
/** The theme's chord for half bar i, moved by `semis`. */
const themeHalf = (i: number, semis: number) => {
  const [root, q] = CHORDS[i]!;
  return FLAT[(pcOf(root) + semis + 12) % 12]! + SUFFIX[q];
};
const themeHalves = (semis: number) => Array.from({ length: 32 }, (_, i) => themeHalf(i, semis));

/** The chord of every half bar of the loop. */
const HALVES: string[] = [
  ...["Eb", "Eb", "Eb", "Eb", "Eb", "Eb", "Bb7", "Bb7"], // 1–4: the fanfare
  ...themeHalves(-9), // 5–20: the first strain (E flat), ending on its dominant
  ...["Eb", "Eb", "Eb", "Bb7", "Eb", "Eb", "Eb", "Bb7", "Eb", "Eb", "Ab", "Eb", "Bb7", "Bb7", "Eb", "Eb"], // 21–28: Yankee Doodle's verse
  ...["Ab", "Ab", "Ab", "Ab", "Eb", "Bb7", "Eb", "Eb", "Ab", "Ab", "Ab", "Ab", "Eb", "Bb7", "Eb", "Eb7"], // 29–36: its chorus, turning to A flat
  ...themeHalves(-4), // 37–52: the trio (A flat), ending on its dominant
  ...["Fm", "C7", "Bbm", "Fm", "Db", "Db", "Db", "Ab", "Db", "Db", "Bbm", "Bbm", "Eb7", "Eb7", "Eb7", "Eb7"], // 53–60: the dogfight
  ...themeHalves(-4), // 61–76: the grandioso
  ...["Ab", "Ab", "Ab", "Ab", "Bb7", "Bb7", "Bb7", "Bb7"], // 77–80: the street beat and the roll-off
];
const halfOf = (b: number, h: number) => (b - 1) * 2 + h;
// The grandioso cadences home to A flat (E flat seventh under the tune's last pickup).
HALVES[halfOf(GRAND + 14, 1)] = "Eb7";
HALVES[halfOf(GRAND + 15, 0)] = "Ab";
HALVES[halfOf(GRAND + 15, 1)] = "Ab";
if (HALVES.length !== BARS * 2) throw new Error(`${HALVES.length} half bars of chords, not ${BARS * 2}`);

interface Chord {
  root: number;
  /** Pitch classes: root, 3rd, 5th (and 7th). */
  pcs: number[];
  third: number;
  seventh?: number;
}
const QUALITY: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], dim: [0, 3, 6, 9] };
function chord(sym: string): Chord {
  const m = /^([A-G]b?)(m|7|dim)?$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const root = FLAT.indexOf(m[1]!);
  const ints = QUALITY[m[2] ?? ""]!;
  return { root, pcs: ints.map((i) => (root + i) % 12), third: (root + ints[1]!) % 12, seventh: m[2] === "7" ? (root + 10) % 12 : undefined };
}
const chordAt = (t: number) => chord(HALVES[Math.floor(wrap(t) / 3)]!);

/** Chord tones from `lo` to `hi` (inclusive), ascending. */
function tonesIn(c: Chord, lo: string | number, hi: string | number): number[] {
  const out: number[] = [];
  for (let m = num(lo); m <= num(hi); m++) if (c.pcs.includes(m % 12)) out.push(m);
  return out;
}

/** The lowest note at or above `lo` with pitch class `pc`. */
const low = (pc: number, lo: string | number) => num(lo) + ((((pc - num(lo)) % 12) + 12) % 12);

/**
 * An n-voice voicing of `c` within [lo, hi] that moves as little as possible from `prev`: different
 * notes, always the 3rd, and the 7th of a seventh chord when there is room.
 */
function voicing(c: Chord, lo: string | number, hi: string | number, prev: number[] | null, n: number): number[] {
  const tones = tonesIn(c, lo, hi);
  const options: number[][] = [];
  const pick = (start: number, acc: number[]) => {
    if (acc.length === n) {
      options.push([...acc]);
      return;
    }
    for (let i = start; i < tones.length; i++) pick(i + 1, [...acc, tones[i]!]);
  };
  pick(0, []);
  const fits = (v: number[], strict: boolean) => {
    const pcs = new Set(v.map((x) => x % 12));
    if (pcs.size < Math.min(n, c.pcs.length)) return false;
    if (!pcs.has(c.third)) return false;
    return !strict || c.seventh === undefined || n < 2 || pcs.has(c.seventh);
  };
  let fit = options.filter((v) => fits(v, true));
  if (!fit.length) fit = options.filter((v) => fits(v, false));
  if (!fit.length) return voicing(c, num(lo) - 1, num(hi) + 1, prev, n);
  const centre = (num(lo) + num(hi)) / 2;
  const cost = (v: number[]) => (prev && prev.length === n ? v.reduce((s, x, i) => s + Math.abs(x - prev[i]!), 0) : Math.abs(v.reduce((a, b) => a + b, 0) / n - centre));
  return fit.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const inKey = (m: number, key: number) => MAJOR.includes((((m - key) % 12) + 12) % 12);

/** `count` scale steps (of the major key `key`) leading into `target` from below or from above, in order. */
function runInto(target: number, key: number, count: number, from: "below" | "above"): number[] {
  const out: number[] = [];
  for (let m = target; out.length < count; ) {
    m += from === "below" ? -1 : 1;
    if (inKey(m, key)) out.unshift(m);
  }
  return out;
}

/** The scale step of `key` next to `m`: one up or one down. */
const step = (m: number, key: number, dir: 1 | -1): number => {
  let x = m + dir;
  while (!inKey(x, key)) x += dir;
  return x;
};

/**
 * A harmony note under a tune note, at or above `floor`: a chord tone a third or a sixth below
 * (else a fourth or a fifth); under a passing note, the scale's third below. Null when none fits.
 */
function under(n: number, c: Chord, key: number, floor: number): number | null {
  if (c.pcs.includes(n % 12)) {
    const below = [3, 4, 8, 9, 5, 7].map((s) => n - s).filter((m) => m >= floor && c.pcs.includes(m % 12));
    return below[0] ?? null;
  }
  const third = [3, 4].map((s) => n - s).find((m) => inKey(m, key));
  return third !== undefined && third >= floor ? third : null;
}

// ---------------------------------------------------------------- the tunes

const THEME = melody();

/** A tune note placed in the loop: time and length in eighths, MIDI note, accent, tune bar (from 0), eighth in its bar. */
interface Mel {
  t: number;
  d: number;
  n: number;
  v: number;
  tb: number;
  pos: number;
}

/** The theme's first `bars` bars from bar `start`, moved by `semis`; `last` replaces its 16th bar. */
function tuneAt(start: number, semis: number, bars = 16, last?: Cell[]): Mel[] {
  const out: Mel[] = [];
  for (let tb = 0; tb < bars; tb++) {
    const src: Cell[] = tb === 15 && last ? last : THEME.filter((n) => Math.floor(n.t / BAR) === tb).map((n): Cell => [n.t - tb * BAR, n.d, n.n, n.v ?? 0.7]);
    for (const [pos, d, n, v] of src) out.push({ t: bar(start + tb) + pos, d, n: num(n) + semis, v, tb, pos });
  }
  return out;
}

/** A tune written bar by bar in cells, from bar `start`, moved by `semis`. */
function tuneCells(start: number, bars: Cell[][], semis: number): Mel[] {
  const out: Mel[] = [];
  bars.forEach((list, tb) => {
    for (const [pos, d, n, v] of list) out.push({ t: bar(start + tb) + pos, d, n: num(n) + semis, v, tb, pos });
  });
  return out;
}

const STRAIN_TUNE = tuneAt(STRAIN, -9);
const TRIO_TUNE = tuneAt(TRIO, -16);
/** The grandioso lands on the tonic, high (theme.ts writes C major: C6 - 4 = Ab5). */
const GRAND_TUNE = tuneAt(GRAND, -4, 16, [[0, 3, "C6", 0.82]]);

/** Theme bars whose tune holds a note through its second pulse (runs and fireworks go there). */
const HOLDS = [1, 5, 9];

/**
 * "Yankee Doodle" (traditional), written in C and 2/4; placed on the 6/8 grid each pair of its
 * eighths becomes a quarter and an eighth, the lilt a fife-and-drum corps gives it on the march.
 * The verse ("Yankee Doodle went to town") and the chorus ("Yankee Doodle keep it up").
 */
const YD_VERSE: Cell[][] = [
  [[0, 2, "C5", 0.62], [2, 1, "C5", 0.5], [3, 2, "D5", 0.58], [5, 1, "E5", 0.5]],
  [[0, 2, "C5", 0.62], [2, 1, "E5", 0.5], [3, 2, "D5", 0.58], [5, 1, "G4", 0.5]],
  [[0, 2, "C5", 0.62], [2, 1, "C5", 0.5], [3, 2, "D5", 0.58], [5, 1, "E5", 0.5]],
  [[0, 3, "C5", 0.62], [3, 3, "B4", 0.56]],
  [[0, 2, "C5", 0.62], [2, 1, "C5", 0.5], [3, 2, "D5", 0.58], [5, 1, "E5", 0.5]],
  [[0, 2, "F5", 0.62], [2, 1, "E5", 0.5], [3, 2, "D5", 0.58], [5, 1, "C5", 0.5]],
  [[0, 2, "B4", 0.62], [2, 1, "G4", 0.5], [3, 2, "A4", 0.58], [5, 1, "B4", 0.5]],
  [[0, 3, "C5", 0.64], [3, 2, "C5", 0.56]],
];
const YD_CHORUS: Cell[][] = [
  [[0, 2, "A4", 0.62], [2, 1, "B4", 0.5], [3, 2, "A4", 0.58], [5, 1, "G4", 0.5]],
  [[0, 2, "A4", 0.62], [2, 1, "B4", 0.5], [3, 3, "C5", 0.6]],
  [[0, 2, "G4", 0.62], [2, 1, "A4", 0.5], [3, 2, "G4", 0.58], [5, 1, "F4", 0.5]],
  [[0, 3, "E4", 0.62], [3, 3, "G4", 0.56]],
  [[0, 2, "A4", 0.62], [2, 1, "B4", 0.5], [3, 2, "A4", 0.58], [5, 1, "G4", 0.5]],
  [[0, 2, "A4", 0.62], [2, 1, "B4", 0.5], [3, 2, "C5", 0.58], [5, 1, "A4", 0.5]],
  [[0, 2, "G4", 0.62], [2, 1, "C5", 0.5], [3, 2, "B4", 0.58], [5, 1, "D5", 0.5]],
  [[0, 3, "C5", 0.64], [3, 2, "C5", 0.58]],
];
/** The verse and the chorus in E flat (C + 3). */
const VERSE_TUNE = tuneCells(VERSE, YD_VERSE, 3);
const CHORUS_TUNE = tuneCells(CHORUS, YD_CHORUS, 3);

/**
 * Low registers that play in tune: the staccato tuba's oom from C2 (its low B flat take reads 7
 * cents flat), the sustained tuba only on B flat 1 and F2; the euphonium's bass from A flat 2.
 */
const OOM = "C2";

// ---------------------------------------------------------------- the parts

const cornets: Note[] = [];
const cornets2: Note[] = [];
const cornetAnswer: Note[] = [];
const piccolo: Note[] = [];
const piccoloShort: Note[] = [];
const clarinet: Note[] = [];
const clarinetShort: Note[] = [];
const sax: Note[] = [];
const bells: Note[] = [];
const hornPah: Note[] = [];
const hornHold: Note[] = [];
const hornCall: Note[] = [];
const euphCounter: Note[] = [];
const euphChorus: Note[] = [];
const euphBass: Note[] = [];
const euphGrand: Note[] = [];
const euphShort: Note[] = [];
const tromboneShort: Note[] = [];
const tromboneHold: Note[] = [];
const tuba: Note[] = [];
const tubaOom: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const cymbals: Note[] = [];
const whistles: Note[] = [];
const booms: Note[] = [];

/** A held snare roll from eighth `from` to `to`, swelling in steps (each restart a small accent). */
function snareRoll(from: number, to: number, v0: number, v1: number, steps = 3): void {
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    roll.push({ t: a, d: (to - from) / steps, n: "D2", v: v0 + ((v1 - v0) * i) / Math.max(1, steps - 1) });
  }
}

/** A part's after-beat chords: the list they go to, their register, voices and level. */
interface Pah {
  list: Note[];
  lo: string;
  hi: string;
  v: number;
  voices?: number;
}

/**
 * The oom-pah from bar `from` up to (not including) bar `to`: the tuba's staccato oom on each
 * pulse (the root, then the fifth while the chord holds; none with `vOom` 0) and after-beat chords
 * on the last eighth of each pulse for each part in `pahs`. With `tune` (a line in the
 * after-beats' own register), an after-beat note a semitone (or a major seventh or minor ninth)
 * from the tune note sounding then moves to another chord tone, or drops out.
 */
function oomPah(from: number, to: number, vOom: number, pahs: Pah[], tune: Note[] = []): void {
  const prev = new Map<Pah, number[] | null>();
  for (let b = from; b < to; b++) {
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      const c = chordAt(t);
      const held = h === 1 && chordAt(t - 3).root === c.root;
      if (vOom > 0) tubaOom.push({ t, d: 1.5, n: low(held ? (c.root + 7) % 12 : c.root, OOM), v: vOom - h * 0.04 });
      const sounding = tune.filter((m) => m.t <= t + 2.01 && m.t + m.d > t + 2.01).map((m) => num(m.n));
      const rubs = (n: number) => sounding.some((m) => [1, 11, 13].includes(Math.abs(n - m)));
      for (const pah of pahs) {
        const chordNotes = voicing(c, pah.lo, pah.hi, prev.get(pah) ?? null, pah.voices ?? 2);
        prev.set(pah, chordNotes);
        const notes = new Set(chordNotes.map((n) => (rubs(n) ? tonesIn(c, pah.lo, pah.hi).find((x) => !rubs(x) && !chordNotes.includes(x)) : n)));
        for (const n of notes) if (n !== undefined) pah.list.push({ t: t + 2, d: 0.7, n, v: pah.v });
      }
    }
  }
}

/** The march beat on snare and bass drum, bar `from` up to bar `to`, scaled by `level`; a build into each 4-bar phrase. */
function marchDrums(from: number, to: number, level: number): void {
  for (let b = from; b < to; b++) {
    const k = (b - from) % 4;
    const pattern: [number, number][] =
      k === 3
        ? [[0, 0.72], [2, 0.42], [3, 0.62], [3.5, 0.34], [4, 0.4], [4.5, 0.44], [5, 0.5], [5.5, 0.56]]
        : k % 2 === 0
          ? [[0, 0.72], [2, 0.42], [3, 0.62], [5, 0.42]]
          : [[0, 0.72], [2, 0.42], [3, 0.62], [4, 0.3], [4.5, 0.34], [5, 0.44]];
    for (const [p, v] of pattern) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: v * level });
    kick.push({ t: bar(b), d: 1, n: "C2", v: 0.56 * level }, { t: bar(b) + 3, d: 1, n: "C2", v: 0.42 * level });
  }
}

/** A field drummer's rudiments, bar `from` up to bar `to`: accented pulses, a flam before the second, taps between. */
function fieldDrum(from: number, to: number, level: number): void {
  for (let b = from; b < to; b++) {
    const k = (b - from) % 4;
    const pattern: [number, number][] =
      k === 3
        ? [[0, 0.7], [1, 0.3], [1.5, 0.34], [2, 0.42], [2.85, 0.3], [3, 0.6], [4, 0.36], [4.5, 0.4], [5, 0.46], [5.5, 0.5]]
        : [[0, 0.7], [1.5, 0.3], [2, 0.4], [2.85, 0.28], [3, 0.6], [4, 0.3], [4.5, 0.34], [5, 0.44]];
    for (const [p, v] of pattern) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: v * level });
    kick.push({ t: bar(b), d: 1, n: "C2", v: 0.44 * level }, { t: bar(b) + 3, d: 1, n: "C2", v: 0.34 * level });
  }
}

/** A cornet line: detached, a march's articulation; the landings ring. */
const cornetLen = (d: number) => (d >= 3 ? 2.5 : d === 2 ? 1.5 : 0.8);

// ---------------------------------------------------------------- bars 1–4: the fanfare (E flat)

/** The fanfare's line in the cornets' register; the low brass take it an octave or two down. */
const FANFARE: Cell[][] = [
  [[0, 2, "Eb5", 0.66], [2, 1, "Eb5", 0.56], [3, 2, "Eb5", 0.64], [5, 1, "Eb5", 0.56]],
  [[0, 2, "G5", 0.66], [2, 1, "Eb5", 0.56], [3, 3, "Bb4", 0.62]],
  [[0, 1, "C5", 0.56], [1, 1, "D5", 0.56], [2, 1, "Eb5", 0.58], [3, 1, "F5", 0.6], [4, 1, "G5", 0.62], [5, 1, "Ab5", 0.64]],
  [[0, 3, "Bb5", 0.7]],
];
FANFARE.forEach((list, i) => {
  const notes = cells(INTRO + i, list);
  cornets.push(...notes.map((n) => ({ ...n, d: cornetLen(n.d) })));
  piccolo.push(...notes.map((n) => ({ ...n, n: num(n.n) + 12, d: Math.min(n.d, 2.5), v: 0.5 })));
  clarinetShort.push(...notes.map((n) => ({ ...n, d: cornetLen(n.d), v: (n.v ?? 0.6) - 0.1 })));
  euphShort.push(...notes.map((n) => ({ ...n, n: num(n.n) - 24, d: Math.min(n.d, 1.2), v: (n.v ?? 0.6) - 0.02 })));
  bells.push(...notes.filter((n) => n.t % 3 === 0 || i === 1).map((n) => ({ ...n, n: num(n.n) + 12, d: 1, v: 0.3 })));
});
// The horns and trombones stab the chord on the fanfare's rhythm, then hold under the run and the dominant.
for (const [b, pos] of [[1, 0], [1, 2], [1, 3], [1, 5], [2, 0], [2, 2], [2, 3]] as const) {
  const t = bar(INTRO + b - 1) + pos;
  for (const n of voicing(chordAt(t), "Eb3", "C4", null, 2)) hornPah.push({ t, d: 0.8, n, v: 0.5 });
  for (const n of voicing(chordAt(t), "Bb2", "G3", null, 2)) tromboneShort.push({ t, d: 0.8, n, v: 0.52 });
}
for (const [b, d] of [[3, 3], [4, 3]] as const) {
  const t = bar(INTRO + b - 1);
  for (const n of voicing(chordAt(t), "Eb3", "C4", null, 2)) hornHold.push({ t, d: d - 0.2, n, v: 0.44 });
  for (const n of voicing(chordAt(t), "Bb2", "G3", null, 2)) tromboneHold.push({ t, d: d - 0.2, n, v: 0.4 });
}
tubaOom.push(...cells(INTRO, [[0, 1.5, "Eb2", 0.7], [3, 1.5, "Eb2", 0.66]]), ...cells(INTRO + 1, [[0, 1.5, "Eb2", 0.7], [3, 1.5, "Bb2", 0.64]]), ...cells(INTRO + 2, [[0, 1.5, "Eb2", 0.7], [3, 1.5, "Eb2", 0.66]]), ...cells(INTRO + 3, [[0, 1.5, "Bb2", 0.72]]));
// The low brass walk up into the strain's first chord under the roll.
euphShort.push(...cells(INTRO + 3, [[3, 1, "Bb2", 0.56], [4, 1, "C3", 0.58], [5, 1, "D3", 0.6]]));
tromboneShort.push(...cells(INTRO + 3, [[3, 1, "Bb2", 0.5], [4, 1, "C3", 0.52], [5, 1, "D3", 0.54]]));
snare.push(
  ...cells(INTRO, [[0, 0.5, "D2", 0.8], [2, 0.5, "D2", 0.4], [3, 0.5, "D2", 0.66], [5, 0.5, "D2", 0.44]]),
  ...cells(INTRO + 1, [[0, 0.5, "D2", 0.8], [2, 0.5, "D2", 0.4], [3, 0.5, "D2", 0.7]]),
  ...cells(INTRO + 2, [[0, 0.5, "D2", 0.7], [1, 0.5, "D2", 0.4], [2, 0.5, "D2", 0.44], [3, 0.5, "D2", 0.62], [4, 0.5, "D2", 0.46], [5, 0.5, "D2", 0.5]]),
  ...cells(INTRO + 3, [[0, 0.5, "D2", 0.86]]),
);
snareRoll(bar(INTRO + 1) + 3.5, bar(INTRO + 2), 0.3, 0.5, 2);
snareRoll(bar(INTRO + 3) + 3, bar(STRAIN), 0.36, 0.72, 3);
for (let b = INTRO; b < STRAIN; b++) kick.push({ t: bar(b), d: 1, n: "C2", v: 0.62 }, { t: bar(b) + 3, d: 1, n: "C2", v: 0.5 });
cymbals.push(...cells(INTRO, [[0, 1, "C#3", 0.62]]), ...cells(INTRO + 3, [[0, 1, "C#3", 0.6]]));

// ---------------------------------------------------------------- bars 5–20: the first strain (E flat)

for (const m of STRAIN_TUNE) {
  const phrase = Math.floor(m.tb / 4); // A, A', B, A''
  const len = cornetLen(m.d);
  cornets.push({ t: m.t, d: len, n: m.n, v: 0.58 + (m.v - 0.55) * 0.5 });
  if (phrase >= 1) {
    const harm = under(m.n, chordAt(m.t), EB, midi("A3"));
    if (harm !== null) cornets2.push({ t: m.t, d: len, n: harm, v: 0.46 });
    piccolo.push({ t: m.t, d: Math.min(len, 2.2), n: m.n + 12, v: 0.52 });
  }
  if (m.pos % 3 === 0 || phrase >= 2) bells.push({ t: m.t, d: 1, n: m.n + 24, v: m.pos % 3 === 0 ? 0.3 : 0.22 });
}
// The piccolo runs into the next phrase where the tune holds (sixteenths on the second pulse).
for (const tb of HOLDS) {
  const held = STRAIN_TUNE.find((m) => m.tb === tb && m.pos === 3)!;
  const next = STRAIN_TUNE.find((m) => m.tb === tb + 1 && m.pos === 0)!;
  const run = runInto(next.n + 12, EB, 4, next.n >= held.n ? "below" : "above");
  run.forEach((n, i) => piccoloShort.push({ t: held.t + 1 + i * 0.5, d: 0.5, n, v: 0.44 + i * 0.03 }));
}
// The euphonium's countermelody: singing under the cornets, moving where the tune holds, in
// parallel tenths with its pickups, in contrary motion with its leaps.
euphCounter.push(
  ...cells(STRAIN, [[0, 3, "Eb3", 0.32], [3, 2, "G3", 0.3], [5, 1, "Bb3", 0.3]]),
  ...cells(STRAIN + 1, [[0, 2, "C4", 0.32], [2, 1, "Bb3", 0.3], [3, 3, "G3", 0.3]]),
  ...cells(STRAIN + 2, [[0, 3, "Ab3", 0.32], [3, 2, "C4", 0.3], [5, 1, "Ab3", 0.3]]),
  ...cells(STRAIN + 3, [[0, 2, "Bb3", 0.32], [2, 1, "F3", 0.3], [3, 3, "D3", 0.3]]),
  ...cells(STRAIN + 4, [[0, 3, "Eb3", 0.32], [3, 1, "F3", 0.3], [4, 1, "G3", 0.3], [5, 1, "Ab3", 0.3]]),
  ...cells(STRAIN + 5, [[0, 2, "Bb3", 0.32], [2, 1, "G3", 0.3], [3, 3, "Eb3", 0.3]]),
  ...cells(STRAIN + 6, [[0, 3, "C4", 0.32], [3, 2, "Ab3", 0.3], [5, 1, "F3", 0.3]]),
  ...cells(STRAIN + 7, [[0, 3, "G3", 0.32], [3, 3, "Eb3", 0.3]]),
  ...cells(STRAIN + 8, [[0, 3, "Ab3", 0.34], [3, 2, "C4", 0.32], [5, 1, "Eb4", 0.32]]),
  ...cells(STRAIN + 9, [[0, 2, "D4", 0.34], [2, 1, "Bb3", 0.32], [3, 3, "F3", 0.32]]),
  ...cells(STRAIN + 10, [[0, 3, "G3", 0.34], [3, 2, "C4", 0.32], [5, 1, "G3", 0.32]]),
  ...cells(STRAIN + 11, [[0, 3, "Ab3", 0.34], [3, 2, "F3", 0.32], [5, 1, "D3", 0.32]]),
  ...cells(STRAIN + 12, [[0, 3, "Eb3", 0.34], [3, 2, "G3", 0.32], [5, 1, "Bb3", 0.32]]),
  ...cells(STRAIN + 13, [[0, 2, "C4", 0.34], [2, 1, "Bb3", 0.32], [3, 3, "G3", 0.32]]),
  ...cells(STRAIN + 14, [[0, 2, "Ab3", 0.34], [2, 1, "C4", 0.32], [3, 2, "F3", 0.32], [5, 1, "Ab3", 0.32]]),
  ...cells(STRAIN + 15, [[0, 3, "D4", 0.34], [3, 2, "Bb3", 0.32], [5, 1, "Ab3", 0.32]]),
);
oomPah(STRAIN, VERSE, 0.64, [{ list: hornPah, lo: "Eb3", hi: "C4", v: 0.42 }], euphCounter);
marchDrums(STRAIN, VERSE, 1);
cymbals.push(...cells(STRAIN, [[0, 1, "C#3", 0.56]]), ...cells(STRAIN + 8, [[0, 1, "C#3", 0.48]]), ...cells(STRAIN + 12, [[0, 1, "C#3", 0.54]]));

// ---------------------------------------------------------------- bars 21–36: Yankee Doodle (E flat)

// The verse: fife and drum. The piccolo two octaves over the written tune, the clarinet at pitch.
for (const m of VERSE_TUNE) {
  const len = cornetLen(m.d);
  clarinetShort.push({ t: m.t, d: len, n: m.n, v: m.v });
  if (m.d >= 3) piccolo.push({ t: m.t, d: len, n: m.n + 12, v: 0.5 });
  else piccoloShort.push({ t: m.t, d: len, n: m.n + 12, v: 0.5 });
  if (m.pos % 3 === 0) bells.push({ t: m.t, d: 1, n: m.n + 12, v: 0.26 });
}
fieldDrum(VERSE, CHORUS, 1);
snareRoll(bar(VERSE + 3) + 3.5, bar(VERSE + 4), 0.24, 0.4, 2);
snareRoll(bar(VERSE + 7) + 3.5, bar(CHORUS), 0.3, 0.6, 2);
oomPah(VERSE, CHORUS, 0.56, [{ list: hornPah, lo: "Eb3", hi: "C4", v: 0.34 }]);

// The chorus: the band. Cornets with the clarinet, the piccolo above, the euphonium an octave under
// (in the after-beats' register: they step aside from its line, as in the strain and the grandioso).
for (const m of CHORUS_TUNE) {
  const len = cornetLen(m.d);
  cornets.push({ t: m.t, d: len, n: m.n, v: m.v });
  clarinetShort.push({ t: m.t, d: len, n: m.n, v: m.v - 0.1 });
  if (m.tb >= 4) {
    const harm = under(m.n, chordAt(m.t), EB, midi("A3"));
    if (harm !== null) cornets2.push({ t: m.t, d: len, n: harm, v: 0.46 });
  }
  if (m.d >= 3) piccolo.push({ t: m.t, d: len, n: m.n + 12, v: 0.52 });
  else piccoloShort.push({ t: m.t, d: len, n: m.n + 12, v: 0.52 });
  euphChorus.push({ t: m.t, d: m.d >= 3 ? m.d - 0.3 : m.d - 0.1, n: m.n - 12, v: 0.3 + (m.v - 0.55) * 0.2 });
  if (m.pos % 3 === 0) bells.push({ t: m.t, d: 1, n: m.n + 12, v: 0.3 });
}
oomPah(CHORUS, CHORUS + 7, 0.66, [
  { list: hornPah, lo: "Eb3", hi: "C4", v: 0.42 },
  { list: tromboneShort, lo: "Bb2", hi: "G3", v: 0.42 },
], euphChorus);
marchDrums(CHORUS, CHORUS + 7, 1);
cymbals.push(...cells(CHORUS, [[0, 1, "C#3", 0.58]]), ...cells(CHORUS + 4, [[0, 1, "C#3", 0.5]]));
// Bar 36: "handy" lands on E flat, the band stabs E flat seventh under its last note, and the
// snare whispers the trio in.
{
  const b = CHORUS + 7;
  tubaOom.push(...cells(b, [[0, 1.5, "Eb2", 0.66], [3, 1, "Eb2", 0.7]]));
  for (const n of voicing(chordAt(bar(b)), "Eb3", "C4", null, 2)) hornPah.push({ t: bar(b) + 2, d: 0.7, n, v: 0.42 });
  for (const n of voicing(chordAt(bar(b) + 3), "Eb3", "Db4", null, 3)) hornPah.push({ t: bar(b) + 3, d: 0.9, n, v: 0.5 });
  for (const n of voicing(chordAt(bar(b) + 3), "G2", "G3", null, 2)) tromboneShort.push({ t: bar(b) + 3, d: 0.9, n, v: 0.5 });
  euphShort.push(...cells(b, [[3, 0.9, "Eb3", 0.56]]));
  snare.push(...cells(b, [[0, 0.5, "D2", 0.72], [2, 0.5, "D2", 0.42], [3, 0.5, "D2", 0.8]]));
  kick.push(...cells(b, [[0, 1, "C2", 0.56], [3, 1, "C2", 0.7]]));
  cymbals.push(...cells(b, [[3, 1, "C#3", 0.5]]));
  snareRoll(bar(b) + 4, bar(TRIO), 0.26, 0.18, 2);
}

// ---------------------------------------------------------------- bars 37–52: the trio (A flat)

for (const m of TRIO_TUNE) {
  const len = m.d >= 3 ? m.d - 0.3 : m.d - 0.12;
  sax.push({ t: m.t, d: len, n: m.n, v: 0.36 + (m.v - 0.55) * 0.2 });
  const harm = under(m.n, chordAt(m.t), AB, midi("Eb3"));
  if (harm !== null) clarinet.push({ t: m.t, d: len, n: harm, v: 0.34 });
  // Two octaves up, three for the tune's lowest pickup (the glockenspiel starts at G5).
  if (m.pos % 3 === 0) bells.push({ t: m.t, d: 1, n: m.n + 24 < midi("G5") ? m.n + 36 : m.n + 24, v: 0.22 });
}
{
  // The euphonium holds the bass (the root, then the fifth while the chord holds; the trio has
  // no tuba), the horns' after-beats soft, the drums light.
  for (let b = TRIO; b < FIGHT; b++) {
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      const c = chordAt(t);
      const held = h === 1 && chordAt(t - 3).root === c.root;
      euphBass.push({ t, d: 2.8, n: low(held ? (c.root + 7) % 12 : c.root, "Ab2"), v: 0.28 - h * 0.02 });
    }
    kick.push({ t: bar(b), d: 1, n: "C2", v: 0.26 });
    snare.push({ t: bar(b) + 2, d: 0.5, n: "D2", v: 0.16 }, { t: bar(b) + 5, d: 0.5, n: "D2", v: 0.18 });
  }
  oomPah(TRIO, FIGHT - 1, 0, [{ list: hornPah, lo: "Eb3", hi: "C4", v: 0.3 }], sax);
}
// Bar 52: the trio lands on E flat seventh; the horns hold it and the snare rolls into the dogfight.
{
  const b = FIGHT - 1;
  for (const n of voicing(chordAt(bar(b)), "Eb3", "C4", null, 2)) hornPah.push({ t: bar(b) + 2, d: 0.7, n, v: 0.3 });
  for (const n of voicing(chordAt(bar(b) + 3), "Eb3", "Db4", null, 3)) hornHold.push({ t: bar(b) + 3, d: 2.8, n, v: 0.34 });
  snareRoll(bar(b) + 3, bar(FIGHT), 0.2, 0.5, 2);
  kick.push({ t: bar(b) + 3, d: 1, n: "C2", v: 0.4 });
}

// ---------------------------------------------------------------- bars 53–60: the dogfight

// The low brass call: the theme's head (3-5-8-7, 6-5-3) in F minor, then on D flat.
const CALL_FM: Cell[][] = [
  [[0, 2, "Ab2", 0.64], [2, 1, "C3", 0.54], [3, 2, "F3", 0.66], [5, 1, "E3", 0.54]],
  [[0, 2, "Db3", 0.66], [2, 1, "C3", 0.54], [3, 3, "Ab2", 0.64]],
];
const CALL_DB: Cell[][] = [
  [[0, 2, "F2", 0.64], [2, 1, "Ab2", 0.54], [3, 2, "Db3", 0.66], [5, 1, "C3", 0.54]],
  [[0, 2, "Bb2", 0.66], [2, 1, "Ab2", 0.54], [3, 3, "F2", 0.64]],
];
for (const [first, list] of [
  [FIGHT, CALL_FM],
  [FIGHT + 4, CALL_DB],
] as const) {
  list.forEach((cl, i) => {
    const notes = cells(first + i, cl);
    euphShort.push(...notes);
    hornCall.push(...notes.map((n) => ({ ...n, v: (n.v ?? 0.6) - 0.1 })));
    tromboneShort.push(...notes.map((n) => ({ ...n, v: (n.v ?? 0.6) - 0.06 })));
    // The tuba an octave down on the call's pulses (its one-eighth C2 reads 6 cents flat).
    tubaOom.push(...notes.filter((n) => n.t % 3 === 0).map((n) => ({ ...n, d: 1.5, n: low(num(n.n) % 12, OOM), v: (n.v ?? 0.6) + 0.04 })));
  });
  // The cannon on the call's last note.
  kick.push({ t: bar(first + 1) + 3, d: 1, n: "C2", v: 0.92 });
  cymbals.push({ t: bar(first + 1) + 3, d: 1, n: "C#3", v: 0.44 });
  // Tension under the call: the snare on every eighth, leaning on the pulses.
  for (let b = first; b < first + 2; b++) for (let p = 0; p < 6; p++) if (!(b === first + 1 && p === 3)) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: p % 3 === 0 ? 0.44 : 0.24 });
}
// The answer: "Yankee Doodle keep it up" in A flat, high: cornets, the clarinet and the piccolo.
const ANSWERS: [number, Cell[][]][] = [
  [FIGHT + 2, [YD_CHORUS[0]!, YD_CHORUS[1]!]],
  [FIGHT + 6, [YD_CHORUS[0]!]],
];
for (const [first, bars] of ANSWERS) {
  for (const m of tuneCells(first, bars, 8)) {
    const len = cornetLen(m.d);
    cornetAnswer.push({ t: m.t, d: len, n: m.n, v: m.v + 0.04 });
    clarinetShort.push({ t: m.t, d: len, n: m.n, v: m.v - 0.08 });
    piccoloShort.push({ t: m.t, d: len, n: m.n + 12, v: 0.5 });
    if (m.pos % 3 === 0) bells.push({ t: m.t, d: 1, n: m.n + 12, v: 0.28 });
  }
}
for (let b = FIGHT + 2; b < FIGHT + 4; b++) {
  for (const h of [0, 1]) {
    const t = bar(b) + h * 3;
    tubaOom.push({ t, d: 1.5, n: low(chordAt(t).root, OOM), v: 0.56 });
    kick.push({ t, d: 1, n: "C2", v: 0.5 });
  }
  snare.push({ t: bar(b), d: 0.5, n: "D2", v: 0.6 }, { t: bar(b) + 3, d: 0.5, n: "D2", v: 0.56 }, { t: bar(b) + 5, d: 0.5, n: "D2", v: 0.36 });
}
// Bars 59–60: the answer over the dominant, then the band runs up E flat seventh under a snare roll.
{
  const b = FIGHT + 6;
  for (let h = 0; h < 4; h++) {
    const t = bar(b) + h * 3;
    const c = chordAt(t);
    for (const n of voicing(c, "Eb3", "Db4", null, 3)) hornHold.push({ t, d: h === 3 ? 2.6 : 3, n, v: 0.36 + h * 0.03 });
    for (const n of voicing(c, "G2", "G3", null, 2)) tromboneHold.push({ t, d: h === 3 ? 2.6 : 3, n, v: 0.34 + h * 0.03 });
    tubaOom.push({ t, d: 1.5, n: "Eb2", v: 0.6 + h * 0.03 });
    kick.push({ t, d: 1, n: "C2", v: 0.5 + h * 0.04 });
  }
  euphBass.push(...cells(b, [[0, 5.8, "Eb3", 0.3]]), ...cells(b + 1, [[0, 2.8, "Eb3", 0.34]]));
  const first = GRAND_TUNE[0]!.n;
  runInto(first, AB, 6, "below").forEach((n, i) => {
    const t = bar(b + 1) + 3 + i * 0.5;
    cornetAnswer.push({ t, d: 0.5, n, v: 0.5 + i * 0.02 });
    clarinetShort.push({ t, d: 0.5, n, v: 0.42 + i * 0.02 });
    piccoloShort.push({ t, d: 0.5, n: n + 12, v: 0.42 + i * 0.03 });
  });
  for (let p = 0; p < 6; p++) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: 0.3 + p * 0.03 });
  snareRoll(bar(b + 1), bar(GRAND), 0.34, 0.7, 3);
}

// ---------------------------------------------------------------- bars 61–76: the grandioso (A flat)

for (const m of GRAND_TUNE) {
  const len = cornetLen(m.d);
  cornets.push({ t: m.t, d: len, n: m.n, v: 0.62 + (m.v - 0.55) * 0.5 });
  const harm = under(m.n, chordAt(m.t), AB, midi("A3"));
  if (harm !== null) cornets2.push({ t: m.t, d: len, n: harm, v: 0.5 });
  clarinetShort.push({ t: m.t, d: len, n: m.n, v: 0.46 });
  // The glockenspiel is recorded from G5: the tune's low pickups ring an octave higher.
  bells.push({ t: m.t, d: 1, n: m.n + 12 < midi("G5") ? m.n + 24 : m.n + 12, v: m.pos % 3 === 0 ? 0.32 : 0.24 });
}
// The piccolo's obbligato above the cornets: a turn on the pulse notes (in the A sections on the
// first pulse, in A' and A'' on both), a trill where the tune holds its first pulse, a run into the
// next phrase where it holds its second, the tune an octave up between, and a trill into the last bar.
for (let tb = 0; tb < 16; tb++) {
  const notes = GRAND_TUNE.filter((m) => m.tb === tb);
  const both = tb % 8 >= 4;
  for (const m of notes) {
    const top = m.n + 12;
    const v = 0.48 + (m.v - 0.55) * 0.3;
    if (tb === 15) {
      for (let i = 0; i < 6; i++) piccoloShort.push({ t: m.t + i * 0.5, d: 0.5, n: i % 2 ? step(top, AB, 1) : top, v: v - 0.02 + i * 0.01 });
    } else if (m.d === 3 && m.pos === 0) {
      for (let i = 0; i < 6; i++) piccoloShort.push({ t: m.t + i * 0.5, d: 0.5, n: i % 2 ? step(top, AB, 1) : top, v: v - 0.04 });
    } else if (m.d === 3 && m.pos === 3) {
      const next = GRAND_TUNE.find((x) => x.tb === tb + 1 && x.pos === 0)!;
      runInto(next.n + 12, AB, 6, next.n >= m.n ? "below" : "above").forEach((n, i) => piccoloShort.push({ t: m.t + i * 0.5, d: 0.5, n, v: v - 0.04 + i * 0.02 }));
    } else if (m.d === 2 && (m.pos === 0 || both)) {
      [top, step(top, AB, 1), top, step(top, AB, -1)].forEach((n, i) => piccoloShort.push({ t: m.t + i * 0.5, d: 0.5, n, v: i === 0 ? v : v - 0.06 }));
    } else {
      piccoloShort.push({ t: m.t, d: m.d, n: top, v });
    }
  }
}
// The euphonium's countermelody in full voice: climbing under the tune's head, falling with its
// arpeggios, in parallel tenths and twelfths with its pickups.
euphGrand.push(
  ...cells(GRAND, [[0, 3, "Eb3", 0.34], [3, 2, "C4", 0.32], [5, 1, "Eb4", 0.32]]),
  ...cells(GRAND + 1, [[0, 2, "Ab3", 0.34], [2, 1, "C4", 0.32], [3, 3, "F3", 0.32]]),
  ...cells(GRAND + 2, [[0, 2, "F3", 0.34], [2, 1, "Ab3", 0.32], [3, 2, "Db4", 0.34], [5, 1, "Ab3", 0.32]]),
  ...cells(GRAND + 3, [[0, 3, "Bb3", 0.34], [3, 1, "Eb3", 0.32], [4, 1, "F3", 0.32], [5, 1, "G3", 0.32]]),
  ...cells(GRAND + 4, [[0, 2, "Ab3", 0.34], [2, 1, "Bb3", 0.32], [3, 2, "C4", 0.34], [5, 1, "Eb4", 0.34]]),
  ...cells(GRAND + 5, [[0, 3, "F4", 0.36], [3, 2, "C4", 0.32], [5, 1, "Ab3", 0.32]]),
  ...cells(GRAND + 6, [[0, 2, "Db4", 0.34], [2, 1, "Bb3", 0.32], [3, 3, "G3", 0.32]]),
  ...cells(GRAND + 7, [[0, 3, "C3", 0.34], [3, 1, "Ab2", 0.32], [4, 1, "Bb2", 0.32], [5, 1, "C3", 0.32]]),
  ...cells(GRAND + 8, [[0, 2, "Db3", 0.34], [2, 1, "F3", 0.32], [3, 2, "Ab3", 0.34], [5, 1, "Db4", 0.34]]),
  ...cells(GRAND + 9, [[0, 2, "Bb3", 0.34], [2, 1, "G3", 0.32], [3, 3, "Eb3", 0.32]]),
  ...cells(GRAND + 10, [[0, 3, "G3", 0.34], [3, 2, "C4", 0.34], [5, 1, "F3", 0.32]]),
  ...cells(GRAND + 11, [[0, 3, "Bb3", 0.34], [3, 2, "G3", 0.32], [5, 1, "Bb3", 0.32]]),
  ...cells(GRAND + 12, [[0, 3, "Eb3", 0.36], [3, 2, "C4", 0.34], [5, 1, "Eb4", 0.34]]),
  ...cells(GRAND + 13, [[0, 2, "Ab3", 0.36], [2, 1, "C4", 0.34], [3, 3, "F3", 0.34]]),
  ...cells(GRAND + 14, [[0, 2, "Db4", 0.36], [2, 1, "Bb3", 0.34], [3, 2, "G3", 0.34], [5, 1, "Bb3", 0.34]]),
  ...cells(GRAND + 15, [[0, 2.8, "Ab3", 0.38]]),
);
// Horns and trombones share the euphonium's register on the after-beats: they step aside from its line.
oomPah(GRAND, GRAND + 15, 0.68, [
  { list: hornPah, lo: "Eb3", hi: "C4", v: 0.46 },
  { list: tromboneShort, lo: "Eb3", hi: "Bb3", v: 0.46 },
], euphGrand);
marchDrums(GRAND, GRAND + 15, 1.1);
cymbals.push(...cells(GRAND, [[0, 1, "C#3", 0.64]]), ...cells(GRAND + 8, [[0, 1, "C#3", 0.56]]), ...cells(GRAND + 12, [[0, 1, "C#3", 0.62]]));
// Bar 76: the band lands on A flat, and the stinger on the second pulse.
{
  const b = GRAND + 15;
  tubaOom.push(...cells(b, [[0, 1.5, "Ab2", 0.72], [3, 1, "Ab2", 0.76]]));
  tuba.push(...cells(b, [[3, 0.8, "Bb1", 0.5]]).map((n) => ({ ...n, n: midi("Ab1") })));
  tromboneShort.push(...cells(b, [[0, 1.5, "Eb3", 0.5], [0, 1.5, "Ab3", 0.5], [3, 0.8, "Ab2", 0.6], [3, 0.8, "Eb3", 0.6], [3, 0.8, "C4", 0.6]]));
  hornPah.push(...cells(b, [[0, 1.5, "Ab3", 0.5], [0, 1.5, "C4", 0.5], [3, 0.8, "Eb3", 0.52], [3, 0.8, "Ab3", 0.52]]));
  euphShort.push(...cells(b, [[3, 0.8, "Ab2", 0.62]]));
  cornets2.push(...cells(b, [[3, 0.8, "C5", 0.62], [3, 0.8, "Eb5", 0.62]]));
  cornets.push(...cells(b, [[3, 0.8, "Ab5", 0.66]]));
  clarinetShort.push(...cells(b, [[3, 0.8, "Eb5", 0.5], [3, 0.8, "Ab5", 0.5]]));
  bells.push(...cells(b, [[3, 1, "Ab6", 0.34]]));
  piccoloShort.push(...cells(b, [[3, 0.8, "Ab6", 0.5]]));
  kick.push(...cells(b, [[0, 1, "C2", 0.72], [3, 1, "C2", 0.86]]));
  snare.push(...cells(b, [[0, 0.5, "D2", 0.78], [2.5, 0.5, "D2", 0.5], [3, 0.5, "D2", 0.88]]));
  cymbals.push(...cells(b, [[0, 1, "C#3", 0.52], [3, 1, "C#3", 0.66]]));
}
// The fireworks, in the last phrase: a whistle climbs under the tune (17–22 dB below the band), its
// boom lands about a second later on a beat the band already owns; the last one goes up with the stinger.
for (const [wb, wp, bb, bp, v] of [
  [GRAND + 11, 3, GRAND + 12, 2, 0.5],
  [GRAND + 13, 2, GRAND + 14, 0, 0.56],
  [GRAND + 15, 2, GRAND + 16, 0, 0.62],
] as const) {
  whistles.push({ t: bar(wb) + wp, d: 4.5, n: "C6", v });
  booms.push({ t: bar(bb) + bp, d: 2, n: "C2", v: v + 0.2 });
}

// ---------------------------------------------------------------- bars 77–80: the street beat and the roll-off

// Two bars of the drumline alone.
snare.push(
  ...cells(TAG, [[0, 0.5, "D2", 0.8], [1, 0.5, "D2", 0.4], [1.5, 0.5, "D2", 0.44], [2, 0.5, "D2", 0.5], [3, 0.5, "D2", 0.74], [4, 0.5, "D2", 0.4], [4.5, 0.5, "D2", 0.44], [5, 0.5, "D2", 0.5], [5.5, 0.5, "D2", 0.54]]),
  ...cells(TAG + 1, [[0, 0.5, "D2", 0.8], [0.5, 0.5, "D2", 0.4], [1, 0.5, "D2", 0.5], [1.5, 0.5, "D2", 0.4], [2, 0.5, "D2", 0.56], [3, 0.5, "D2", 0.74], [3.5, 0.5, "D2", 0.4], [4, 0.5, "D2", 0.5], [4.5, 0.5, "D2", 0.58], [5, 0.5, "D2", 0.68], [5.5, 0.5, "D2", 0.74]]),
);
kick.push(...cells(TAG, [[0, 1, "C2", 0.6], [3, 1, "C2", 0.5]]), ...cells(TAG + 1, [[0, 1, "C2", 0.6], [3, 1, "C2", 0.5], [5, 1, "C2", 0.56]]));
cymbals.push(...cells(TAG, [[0, 1, "C#3", 0.32]]));
// The roll-off: the snare roll swells over two bars, the low brass on B flat seventh under it, the
// bass drum on every pulse, and the cornets' three-note pickup into the fanfare.
snareRoll(bar(TAG + 2), bar(TAG + 4), 0.3, 0.72, 4);
for (let b = TAG + 2; b < TAG + 4; b++) kick.push({ t: bar(b), d: 1, n: "C2", v: 0.5 + (b - TAG - 2) * 0.08 }, { t: bar(b) + 3, d: 1, n: "C2", v: 0.46 + (b - TAG - 2) * 0.08 });
for (const h of [0, 1]) {
  const t = bar(TAG + 2) + h * 6;
  for (const n of voicing(chordAt(t), "F3", "D4", null, 3)) hornHold.push({ t, d: 5.8, n, v: 0.34 + h * 0.08 });
  for (const n of voicing(chordAt(t), "Bb2", "Ab3", null, 2)) tromboneHold.push({ t, d: 5.8, n, v: 0.32 + h * 0.08 });
  euphBass.push({ t, d: 5.8, n: midi("Bb2"), v: 0.28 + h * 0.06 });
  tuba.push({ t, d: 5.8, n: midi("Bb1"), v: 0.36 + h * 0.06 });
}
cornets.push(...cells(TAG + 3, [[3, 0.8, "F5", 0.6], [4, 0.8, "F5", 0.62], [5, 0.8, "F5", 0.64]]));
clarinetShort.push(...cells(TAG + 3, [[3, 0.8, "F5", 0.5], [4, 0.8, "F5", 0.52], [5, 0.8, "F5", 0.54]]));
euphShort.push(...cells(TAG + 3, [[3, 0.8, "F3", 0.56], [4, 0.8, "F3", 0.58], [5, 0.8, "F3", 0.6]]));
cymbals.push(...cells(TAG + 3, [[3, 1, "C#3", 0.4]]));

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at different levels from note to note, so a line played at one
// velocity comes out lumpy. These read the recording the sampler plays for a note (zoneFor) so a
// line can be evened out before its dynamics are applied (as in stpatricks.ts and toyblock.ts).

function layerRange(name: InstrumentName, vel: number): { lo: number; hi: number } {
  const n = new Set(instrument(name).zones.map((z) => z.layer)).size;
  const i = Math.min(n - 1, Math.floor(vel * n));
  return { lo: i / n, hi: i === n - 1 ? 1 : (i + 1) / n };
}

const zoneLevels = new Map<string, number>();
/** Peak 30 ms RMS (dB) of a note's recording over its first `seconds` (0.1–0.35), round robins averaged. */
function zoneDb(name: InstrumentName, note: number, vel: number, seconds = 0.35): number {
  const { note: zone, layer } = instrument(name).zoneFor(note, vel);
  const window = Math.min(0.35, Math.max(0.1, seconds));
  const key = `${name}/${zone}/${layer}/${window.toFixed(2)}`;
  let db = zoneLevels.get(key);
  if (db === undefined) {
    const peaks = instrument(name)
      .zones.filter((z) => z.layer === layer && z.note === zone)
      .map(({ audio: { left, right, rate }, level = 1 }) => {
        const w = Math.round(rate * 0.03);
        let peak = 0;
        for (let s = 0; s + w < Math.min(left.length, rate * window); s += Math.round(w / 3)) {
          let sum = 0;
          for (let i = s; i < s + w; i++) sum += (left[i]! ** 2 + right[i]! ** 2) / 2;
          peak = Math.max(peak, sum / w);
        }
        return 10 * Math.log10(peak * level ** 2 + 1e-12);
      });
    db = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    zoneLevels.set(key, db);
  }
  return db;
}

/** The velocity that changes a note's amplitude by `db`, within its velocity layer. */
function nudge(name: InstrumentName, vel: number, db: number): number {
  const { lo, hi } = layerRange(name, vel);
  const v = ((0.35 + 0.65 * vel) * 10 ** (db / 20) - 0.35) / 0.65;
  return Math.min(hi === 1 ? 1 : hi - 0.03, Math.max(lo + 0.03, v));
}

/** How loud a note's recording plays at track gain 1 (its zoneDb plus the instrument's own gain), dB. */
function noteDb(name: InstrumentName, n: Note): number {
  const inst = instrument(name);
  const held = inst.opts.oneShot ? 0.35 : n.d * EIGHTH;
  return zoneDb(name, num(n.n), n.v ?? 0.7, held) + 20 * Math.log10(inst.opts.gain);
}

/** A part's typical note level (the median of noteDb). */
function typicalDb(name: InstrumentName, notes: Note[]): number {
  const sorted = notes.map((n) => noteDb(name, n)).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * A part as tracks with its notes evened out to one level (by default the part's typical one):
 * notes grouped by the correction they need in 3 dB steps (a track each, with that gain), the
 * rest made up by velocity. The velocity each note was written with is kept on top, as dynamics.
 * With `choke`, a one-shot note rings only until the part's next note, set from the whole part
 * before the split (a track's own choke stops a note at that track's next note only, so the split
 * tracks would ring into each other: the staccato trumpet's takes last 0.6–1.2 s); notes with the
 * same step and ring share a track. `ring` caps it, else the longest take does (1.2 s).
 */
function leveled(track: Omit<SampledTrack, "notes">, notes: Note[], typical = typicalDb(track.inst, notes)): Track[] {
  const starts = [...new Set(notes.map((n) => n.t))].sort((a, b) => a - b);
  const ringOf = (n: Note): number | undefined => {
    if (!track.choke) return track.ring;
    const next = starts.find((t) => t > n.t + 0.1) ?? starts[0]! + LOOP;
    return Math.min(track.ring ?? 1.2, Math.round((next - n.t) * EIGHTH * 1000) / 1000);
  };
  const groups = new Map<string, { gain: number; ring?: number; notes: Note[] }>();
  for (const n of notes) {
    const need = typical - noteDb(track.inst, n);
    const stepDb = Math.max(-12, Math.min(12, Math.round(need / 3) * 3));
    const ring = ringOf(n);
    const group = groups.get(`${stepDb}/${ring}`) ?? { gain: (track.gain ?? 1) * 10 ** (stepDb / 20), ring, notes: [] };
    group.notes.push({ ...n, v: nudge(track.inst, n.v ?? 0.7, need - stepDb) });
    groups.set(`${stepDb}/${ring}`, group);
  }
  return [...groups.values()].map(({ gain, ring, notes: group }) => ({ ...track, notes: group, gain, ...(ring === undefined ? {} : { ring }) }));
}

/** Brass recordings take 30–60 ms to speak: sustained brass starts this much early, as players do. */
const early = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: wrap(n.t - 0.04 / EIGHTH) }));

/**
 * The sustained euphonium's lines on the tuba's soft takes: only that layer (velocity under a
 * third) is recorded up to D4; the louder layers stop at B flat 3, so a C4–F4 note played on
 * them is stretched 2–7 semitones. The parts' dynamics are small (0.28–0.38) and their level is
 * set by gain, so the cap costs nothing audible (humanize moves velocity by under 0.01).
 */
const SOFT_LAYER = 0.31;
const softLayer = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, v: Math.min(SOFT_LAYER, n.v ?? 0.7) }));

// ---------------------------------------------------------------- the fireworks

/**
 * A firework's whistle: a sine (with a touch of triangle for the reed's edge) that climbs about an
 * octave over its length as the shell goes up, warbling a little, and fades as it goes.
 */
const WHISTLE: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "sine" }, { wave: "triangle", level: 0.12 }],
  amp: { attack: 0.08, decay: 0.9, sustain: 0.35, release: 0.25 },
  lfos: [{ rate: 8.5, pitch: 22, delay: 0.1, fade: 0.25 }],
  ramp: { pitch: 14, curve: 1.25 },
  highpass: 400,
  gain: 0.05,
  range: ["G5", "G6"],
  home: "C6",
};
/** Its burst, far off: a deep thump whose pitch falls, a low roar under it, no crack (the band has the treble). */
const BOOM: DrumPatch = {
  kind: "membrane",
  freq: 46,
  sweep: 3,
  sweepTime: 0.09,
  hold: 0.03,
  decay: 1.1,
  noise: 0.5,
  noiseDecay: 0.7,
  noiseBand: [60, 420],
  click: 0,
  drive: 1.6,
  gain: 0.5,
};

// ---------------------------------------------------------------- the song

const tracks: Track[] = [
  // The cornets and woodwinds
  ...leveled({ inst: "trumpetShort", gain: 2.2, pan: 0.15, reverb: 0.3, humanize: 0.12, lowpass: 3500, choke: true, label: "cornets" }, cornets),
  { inst: "trumpetShort", notes: cornets2, gain: 1.4, pan: 0.25, reverb: 0.3, humanize: 0.12, lowpass: 3500, choke: true, label: "cornets (harmony)" },
  { inst: "trumpetShort", notes: cornetAnswer, gain: 2, pan: 0.15, reverb: 0.3, humanize: 0.1, lowpass: 3500, choke: true, label: "cornets (answer)" },
  { inst: "flute", notes: piccolo, gain: 0.7, pan: -0.2, reverb: 0.32, humanize: 0.15, lowpass: 3600, label: "piccolo" },
  { inst: "fluteShort", notes: piccoloShort, gain: 0.65, pan: -0.2, reverb: 0.32, humanize: 0.1, lowpass: 3600, choke: true, ring: 0.3, label: "piccolo (staccato)" },
  { inst: "clarinet", notes: clarinet, gain: 0.7, pan: 0.2, reverb: 0.32, humanize: 0.15, lowpass: 4000, label: "clarinet (harmony)" },
  { inst: "clarinetShort", notes: clarinetShort, gain: 0.8, pan: 0.2, reverb: 0.3, humanize: 0.12, lowpass: 4000, choke: true, label: "clarinet" },
  ...leveled({ inst: "sax", gain: 1, pan: 0.05, reverb: 0.35, humanize: 0.15, lowpass: 3600, label: "sax (trio tune)" }, sax),
  { inst: "glockenspiel", notes: bells, gain: 5, pan: 0.3, reverb: 0.35, humanize: 0.1, lowpass: 4000, ring: 0.8, label: "bells" },
  // The brass
  { inst: "hornShort", notes: hornPah, gain: 0.7, pan: -0.25, reverb: 0.3, humanize: 0.15, lowpass: 5000, choke: true, label: "horns (after-beats)" },
  { inst: "horn", notes: early(hornHold), gain: 1.3, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horns (held chords)" },
  { inst: "hornShort", notes: hornCall, gain: 0.7, pan: -0.2, reverb: 0.3, humanize: 0.1, lowpass: 5000, choke: true, label: "horns (call)" },
  ...euphonium(early(softLayer(euphCounter)), { gain: 8.5, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (countermelody)" }),
  ...euphonium(early(softLayer(euphChorus)), { gain: 8.5, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (chorus tune)" }),
  ...euphonium(early(softLayer(euphBass)), { gain: 7, pan: 0.1, reverb: 0.3, humanize: 0.15, label: "euphonium (bass)" }),
  ...euphonium(early(softLayer(euphGrand)), { gain: 9.5, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (grandioso counter)" }),
  ...euphonium(euphShort, { short: true, gain: 0.8, pan: 0.1, reverb: 0.28, humanize: 0.1, choke: true, label: "euphonium (fanfare, call)" }),
  { inst: "tromboneShort", notes: tromboneShort, gain: 1, pan: 0.25, reverb: 0.28, humanize: 0.15, lowpass: 4000, choke: true, label: "trombones" },
  { inst: "trombone", notes: early(tromboneHold), gain: 0.5, pan: 0.25, reverb: 0.3, humanize: 0.12, lowpass: 3000, label: "trombones (held chords)" },
  { inst: "tuba", notes: early(tuba), gain: 1.1, pan: 0.05, reverb: 0.22, humanize: 0.15, highpass: 50 },
  { inst: "tubaShort", notes: tubaOom, gain: 0.45, pan: 0.05, reverb: 0.2, humanize: 0.1, highpass: 60, choke: true, label: "tuba (oom)" },
  // The drums
  { inst: "kick", notes: kick, gain: 0.75, pan: 0, reverb: 0.2, humanize: 0.1, highpass: 70, label: "bass drum" },
  { inst: "snareOn", notes: snare, gain: 0.55, pan: -0.1, reverb: 0.22, humanize: 0.15, lowpass: 4500, label: "snare" },
  { inst: "snareRoll", notes: roll, gain: 0.45, pan: -0.1, reverb: 0.25, humanize: 0, lowpass: 4500, label: "snare roll" },
  { inst: "cymbals", notes: cymbals, gain: 0.55, pan: 0.2, reverb: 0.35, humanize: 0.05, lowpass: 4500 },
  // The fireworks
  { inst: "sawLead", patch: WHISTLE, notes: whistles, gain: 1.4, pan: -0.4, reverb: 0.5, humanize: 0, lowpass: 4500, label: "fireworks (whistles)" },
  { inst: "dmKick", patch: BOOM, notes: booms, gain: 0.15, pan: 0.3, reverb: 0.45, humanize: 0, lowpass: 450, highpass: 55, label: "fireworks (booms)" },
];

const song: Song = {
  name: "july4",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A bandstand in the park: open air, a little slap off the storefronts.
  reverb: { room: 0.5, damp: 0.5, width: 0.9, level: 0.65 },
  tracks,
};

export default song;
