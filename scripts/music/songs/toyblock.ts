// Toy Kingdom: the theme as a toy-box march, for the toy-block fort. A key is wound, a music box
// plays the opening phrase and runs down, a toy soldier drums and bugles the band awake, and the
// toy band marches: tuba oom-pah, horn after-beats, snare and bass drum, the tune on a toy piano
// with glockenspiel, xylophone and piccolo. Then the march's trio, sung by the French horn and the
// euphonium, a toy battle (the brass call, the toys answer, a toy cannon), and the grandioso.
// In the spirit of the toy-shop marches of the operetta stage (Victor Herbert's "March of the
// Toys", 1903) and old toy-shop music: our theme only, our own arrangement.
//
// 64 bars of the theme's 6/8 at a dotted quarter of 106 2/3 (320 eighths a minute, one bar 1.125 s,
// 72 s), a brisk toy-soldier step.
//
// Form (bars):
//    1     the key is wound (a ratchet, three turns)
//    2–5   the music box plays the theme's first phrase (F major) and runs down in its last bar
//    6–7   a toy soldier's drum call (a roll, rat-a-tat) and a bugle call on the F chord
//    8     the band's vamp: oom-pah on F and C7
//    9–24  THE MARCH, the theme in F: the toy piano carries the tune (staccato, with its metal rods
//          ringing under the hammers), the glockenspiel twinkles on its pulse notes, the xylophone
//          runs into the next phrase where the tune holds; in A' the toy piano crushes grace notes
//          into its pulse notes; the piccolo and the whole glockenspiel join in B, where the
//          euphonium sings a countermelody; the toy piano in octaves in A''.
//          The tune lands home on F, and the horn's pickup leads into
//   25–40  THE TRIO, the theme in B flat (the march's subdominant): the French horn sings A A' with
//          the euphonium in harmony under it, the euphonium takes B A'' with the horn under it.
//          Wooden soldiers tick-tock on the woodblock over the tuba's soft oom, the toy piano plays
//          the after-beats, and the music box echoes the tune where it holds. The trio's last
//          chord, F7, turns to G minor:
//   41–48  THE TOY BATTLE: the low brass call (euphonium, horns, bassoon, tuba in octaves: the
//          theme's head in G minor) and a toy cannon; the toys answer high (xylophone, piccolo,
//          glockenspiel, toy piano); the call again on E flat and another cannon; the toys giggle,
//          tumble down over E flat and E diminished, and race up an F7 scale over a snare roll into
//   49–64  THE GRANDIOSO: the theme in B flat, the horn and the euphonium on the tune together, the
//          toy piano in octaves and the glockenspiel above them, trombone after-beats (stepping aside
//          from the tune where its passing notes would rub a semitone against them), piccolo runs
//          where the tune holds, trumpet stabs at each phrase and a bugle echo, the full drums. It
//          ends on B flat with a stinger, and the key is wound again.
//
// Register plan (low to high): tuba oom C2–B2, softer in the trio (G1–G2 under the calls; the
// sustained tuba F2 before the trio, B flat 1 under the calls and the stinger) · trombone bass
// line Eb2–F2 · euphonium F2–D4 (tunes), F2–Bb3 (harmony), G2–G3 (calls), D3–C4 (countermelody)
// · horns Bb2–D4 (tunes), Bb2–G3 (harmony, a third or a sixth under the other's tune), E3–D4
// (after-beats): the recorded horn has nothing between C4 and D5 · trombone after-beats Bb2–D4 ·
// bugle and trumpets F4–C6 · toy piano C5–A6 (march), F4–D6 + F5–D7 (grandioso), F4–Bb5
// (chords) · music box A3–F6, its echoes C6–C7 · piccolo C5–A6, staccato Eb5–Bb6 · xylophone
// F4–C7 · glockenspiel F5–G7.
//
// The music box is our own synth patch (a comb tine: the fundamental on two teeth a few cents
// apart, a faint octave and the clamped tine's inharmonic second mode, 6.27 times the pitch, which
// pings and dies at once); the toy piano is the upright piano high up, struck short, with the same
// tine ringing softly under each note, the way a toy piano's metal rods ring under its hammers.
// Everything else is recorded (instruments.ts), the wind-up key a crank ratchet.
//
// Mix (scripts/music/mix.ts, dB against the mix per 4-bar phrase): each section's lead within 6 dB
// (the music box 0, the bugle -6, the toy piano -2 to -5, the trio's horn -3/-4 over the euphonium's
// harmony at -9/-10, the trio's euphonium -2 over the horn's at -14/-15, the tuba's oom -13/-14, the
// battle's call -8 to -10 per voice with the bassoon and horns on it, the toys' answer -5 to -9, the
// grandioso's horn and euphonium -6 to -10 each, together, with the toy piano at -4 to -5); the
// snare -9 to -11 and the bass drum -9 to -14 wherever the band marches. The toys are low-passed
// and mostly in their softer layers: 2–8 kHz sits 18.6 dB under the whole, darker than every song
// but Classic and Halloween. Tuning (scripts/music/tuning.ts): every piano, horn, euphonium, trombone
// and tuba note within 3 cents as heard; the low registers avoid the takes that read flat (OOM below).

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import type { VoicePatch } from "../synth";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths per minute: a dotted quarter of 106 2/3. One bar = 54,000 frames at 48 kHz. */
const BPM = 320;
const BARS = 64;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;

// The sections' first bars (1-based).
const BOX = 2;
const CALL = 6;
const VAMP = 8;
const MARCH = 9;
const TRIO = 25;
const BATTLE = 41;
const GRAND = 49;

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
const F = pcOf("F");
const BB = pcOf("Bb");
/** The theme's chord for half bar i, moved by `semis`. */
const themeHalf = (i: number, semis: number) => {
  const [root, q] = CHORDS[i]!;
  return FLAT[(pcOf(root) + semis + 12) % 12]! + SUFFIX[q];
};
const themeHalves = (semis: number) => Array.from({ length: 32 }, (_, i) => themeHalf(i, semis));

/** The chord of every half bar of the loop. */
const HALVES: string[] = [
  ...["F", "F"], // 1: the key turns
  ...themeHalves(5).slice(0, 8), // 2–5: the music box
  ...["F", "F", "F", "F", "F", "C7"], // 6–8: drum and bugle, the vamp
  ...themeHalves(5), // 9–24: the march
  ...themeHalves(-2), // 25–40: the trio
  ...["Gm", "D7", "Cm", "Gm", "Cm", "Cm", "D7", "D7", "Eb", "Eb", "Cm", "Cm", "Eb", "Edim", "F7", "F7"], // 41–48: the battle
  ...themeHalves(-2), // 49–64: the grandioso
];
const halfOf = (b: number, h: number) => (b - 1) * 2 + h;
// The march cadences home to F (C7 under the tune's F, the tune landing on A) and turns to F7 for
// the trio; the grandioso cadences the same way to B flat.
HALVES[halfOf(MARCH + 14, 1)] = "C7";
HALVES[halfOf(MARCH + 15, 0)] = "F";
HALVES[halfOf(MARCH + 15, 1)] = "F7";
HALVES[halfOf(GRAND + 14, 1)] = "F7";
HALVES[halfOf(GRAND + 15, 0)] = "Bb";
HALVES[halfOf(GRAND + 15, 1)] = "Bb";
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

// ---------------------------------------------------------------- the tune

const THEME = melody();

/** A theme note placed in the loop: time and length in eighths, MIDI note, accent, theme bar (0–15), eighth in its bar. */
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

/** The march and the grandioso cadence: the tune lands on the tonic's third (theme.ts writes C major). */
const BOX_TUNE = tuneAt(BOX, 5, 4);
const MARCH_TUNE = tuneAt(MARCH, 5, 16, [[0, 3, "E5", 0.78]]);
const TRIO_TUNE = tuneAt(TRIO, -2);
const GRAND_TUNE = tuneAt(GRAND, -2, 16, [[0, 2, "E5", 0.8]]);

/** Theme bars whose tune holds a note through its second pulse (fills and echoes go there). */
const HOLDS = [1, 5, 9];

/**
 * Low registers that play in tune: the staccato tuba's oom from C2 (its low B flat take reads 7
 * cents flat; the sustained tuba, whose D2 and E flat 2 takes read 7-17 cents flat, only holds F2
 * and B flat 1), the euphonium's harmony from F2.
 */
const OOM = "C2";
const EUPH_LOW = midi("F2");
/** Under B flat 2 the horn's low takes blur: the euphonium takes those notes of a horn tune. */
const HORN_LOW = midi("Bb2");

// ---------------------------------------------------------------- the parts

const ratchet: Note[] = [];
const box: Note[] = [];
const boxEcho: Note[] = [];
const rods: Note[] = [];
const toyPiano: Note[] = [];
const toyPianoLow: Note[] = [];
const toyPianoHigh: Note[] = [];
const toyChords: Note[] = [];
const glock: Note[] = [];
const xylo: Note[] = [];
const flute: Note[] = [];
const piccolo: Note[] = [];
const bugle: Note[] = [];
const trumpets: Note[] = [];
const hornTrio: Note[] = [];
const hornUnder: Note[] = [];
const hornGrand: Note[] = [];
const hornHold: Note[] = [];
const hornPah: Note[] = [];
const hornCall: Note[] = [];
const euphTrio: Note[] = [];
const euphUnder: Note[] = [];
const euphCounter: Note[] = [];
const euphGrand: Note[] = [];
const euphCall: Note[] = [];
const euphHold: Note[] = [];
const bassoon: Note[] = [];
const tuba: Note[] = [];
const tubaOom: Note[] = [];
const tubaTrio: Note[] = [];
const trombonePah: Note[] = [];
const tromboneBass: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const cymbals: Note[] = [];
const triangle: Note[] = [];
const woodblock: Note[] = [];

/** A held snare roll from eighth `from` to `to`, swelling in steps (each restart a small accent). */
function snareRoll(from: number, to: number, v0: number, v1: number, steps = 3): void {
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    roll.push({ t: a, d: (to - from) / steps, n: "D2", v: v0 + ((v1 - v0) * i) / Math.max(1, steps - 1) });
  }
}

/**
 * The oom-pah from bar `from` up to (not including) bar `to`: the tuba's staccato oom on each pulse
 * (the root, then the fifth while the chord holds), and after-beat chords on the last eighth of
 * each pulse from `pah` in [lo, hi]. With `tune` (a line in the after-beats' own register), an
 * after-beat note a semitone (or a major seventh or minor ninth) from the tune note sounding then
 * moves to another chord tone, or drops out: the tune's passing eighths fall on the after-beats.
 */
function oomPah(from: number, to: number, vOom: number, pah: Note[], lo: string, hi: string, vPah: number, voices = 2, tune: Note[] = []): void {
  let prev: number[] | null = null;
  for (let b = from; b < to; b++) {
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      const c = chordAt(t);
      const held = h === 1 && chordAt(t - 3).root === c.root;
      tubaOom.push({ t, d: 1.5, n: low(held ? (c.root + 7) % 12 : c.root, OOM), v: vOom - h * 0.04 });
      prev = voicing(c, lo, hi, prev, voices);
      const sounding = tune.filter((m) => m.t <= t + 2.01 && m.t + m.d > t + 2.01).map((m) => num(m.n));
      const rubs = (n: number) => sounding.some((m) => [1, 11, 13].includes(Math.abs(n - m)));
      const chord = prev;
      const notes = new Set(chord.map((n) => (rubs(n) ? tonesIn(c, lo, hi).find((x) => !rubs(x) && !chord.includes(x)) : n)));
      for (const n of notes) if (n !== undefined) pah.push({ t: t + 2, d: 0.7, n, v: vPah });
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

// ---------------------------------------------------------------- bar 1: the key is wound

[0, 2, 4].forEach((p, i) => ratchet.push({ t: bar(1) + p, d: 1, n: "C4", v: 0.6 + i * 0.05 }));

// ---------------------------------------------------------------- bars 2–5: the music box

/** The box runs down in its last bar: each note there a little later than the last. */
const runDown = (t: number) => {
  const p = t - bar(BOX + 3);
  return p > 2 ? t + 0.04 * (p - 2) ** 2 : t;
};
for (const m of BOX_TUNE) box.push({ t: runDown(m.t), d: 3, n: m.n, v: 0.45 + (m.v - 0.55) * 0.8 });
for (let b = BOX; b < BOX + 4; b++) {
  for (const h of [0, 1]) {
    const t = bar(b) + h * 3;
    const c = chordAt(t);
    // The comb's low teeth: the root on the pulse, the third on the after-beat.
    box.push({ t: runDown(t), d: 3, n: low(c.root, "A3"), v: 0.42 });
    const mid = tonesIn(c, "F4", "E5");
    box.push({ t: runDown(t + 2), d: 2, n: mid.find((n) => n % 12 === c.third) ?? mid[0]!, v: 0.3 });
  }
}

// ---------------------------------------------------------------- bars 6–8: drum, bugle, vamp

snareRoll(bar(CALL), bar(CALL) + 2.5, 0.3, 0.55, 2);
snare.push(
  ...cells(CALL, [[3, 0.5, "D2", 0.8], [4, 0.5, "D2", 0.4], [4.5, 0.5, "D2", 0.46], [5, 0.5, "D2", 0.6]]),
  ...cells(CALL + 1, [[0, 0.5, "D2", 0.8], [2, 0.5, "D2", 0.46], [3, 0.5, "D2", 0.76], [4, 0.5, "D2", 0.4], [4.5, 0.5, "D2", 0.45], [5, 0.5, "D2", 0.5], [5.5, 0.5, "D2", 0.56]]),
);
kick.push(...cells(CALL, [[3, 1, "C2", 0.5]]), ...cells(CALL + 1, [[0, 1, "C2", 0.56], [3, 1, "C2", 0.44]]));
bugle.push(
  ...cells(CALL, [[0, 1, "C5", 0.6], [1, 0.5, "C5", 0.5], [1.5, 0.5, "C5", 0.52], [2, 1, "F5", 0.58], [3, 2, "A5", 0.64], [5, 1, "F5", 0.55]]),
  ...cells(CALL + 1, [[0, 1, "A5", 0.6], [1, 0.5, "A5", 0.5], [1.5, 0.5, "A5", 0.52], [2, 1, "C6", 0.6], [3, 3, "F5", 0.64]]),
);
oomPah(VAMP, MARCH, 0.62, hornPah, "F3", "C4", 0.42);
// The vamp's drums build into the march, and the xylophone runs up to the tune's first note.
snare.push(...cells(VAMP, [[0, 0.5, "D2", 0.72], [2, 0.5, "D2", 0.42], [3, 0.5, "D2", 0.62], [3.5, 0.5, "D2", 0.34], [4, 0.5, "D2", 0.4], [4.5, 0.5, "D2", 0.44], [5, 0.5, "D2", 0.5], [5.5, 0.5, "D2", 0.56]]));
kick.push(...cells(VAMP, [[0, 1, "C2", 0.56], [3, 1, "C2", 0.42]]));
runInto(MARCH_TUNE[0]!.n, F, 6, "below").forEach((n, i) => xylo.push({ t: bar(VAMP) + 3 + i * 0.5, d: 0.5, n, v: 0.36 + i * 0.02 }));
triangle.push(...cells(VAMP, [[0, 1, "C4", 0.6]]));

// ---------------------------------------------------------------- bars 9–24: the march (F)

for (const m of MARCH_TUNE) {
  const phrase = Math.floor(m.tb / 4); // A, A', B, A''
  // Detached, a toy soldier's step; the landing rings.
  const len = m.d >= 3 ? 2.4 : m.d === 2 ? 1.3 : 0.7;
  const v = 0.56 + (m.v - 0.55) * 0.6;
  toyPiano.push({ t: m.t, d: len, n: m.n, v });
  rods.push({ t: m.t, d: len, n: m.n, v: 0.5 });
  // In A' the toy piano crushes a grace note from a step below into its pulse notes.
  if (phrase === 1 && m.pos % 3 === 0 && m.d >= 2) toyPiano.push({ t: m.t - 0.3, d: 0.3, n: runInto(m.n, F, 1, "below")[0]!, v: v - 0.04 });
  if (phrase === 3) toyPianoLow.push({ t: m.t, d: len, n: m.n - 12, v: v - 0.04 });
  if (m.pos % 3 === 0 || phrase >= 2) glock.push({ t: m.t, d: 1, n: m.n + 12, v: m.pos % 3 === 0 ? 0.3 : 0.22 });
  if (phrase >= 2) flute.push({ t: m.t, d: Math.min(len, 2), n: m.n, v: 0.6 });
}
// The xylophone runs into the next phrase where the tune holds (sixteenths on the second pulse).
for (const tb of HOLDS) {
  const held = MARCH_TUNE.find((m) => m.tb === tb && m.pos === 3)!;
  const next = MARCH_TUNE.find((m) => m.tb === tb + 1 && m.pos === 0)!;
  const run = runInto(next.n, F, 4, next.n >= held.n ? "below" : "above");
  run.forEach((n, i) => xylo.push({ t: held.t + 1 + i * 0.5, d: 0.5, n: n + (n + 12 <= midi("C7") ? 12 : 0), v: 0.38 + i * 0.03 }));
}
// The euphonium's countermelody in B and A'', moving where the tune holds.
euphCounter.push(
  ...cells(MARCH + 8, [[0, 3, "D3", 0.3], [3, 3, "F3", 0.3]]),
  ...cells(MARCH + 9, [[0, 3, "E3", 0.3], [3, 1, "G3", 0.28], [4, 1, "A3", 0.28], [5, 1, "Bb3", 0.3]]),
  ...cells(MARCH + 10, [[0, 3, "C4", 0.32], [3, 3, "A3", 0.3]]),
  ...cells(MARCH + 11, [[0, 3, "Bb3", 0.32], [3, 2, "G3", 0.3], [5, 1, "Bb3", 0.3]]),
  ...cells(MARCH + 12, [[0, 3, "A3", 0.3], [3, 3, "C4", 0.3]]),
  ...cells(MARCH + 13, [[0, 3, "F3", 0.3], [3, 3, "D3", 0.3]]),
  ...cells(MARCH + 14, [[0, 3, "D3", 0.3], [3, 3, "E3", 0.3]]),
  ...cells(MARCH + 15, [[0, 2.5, "F3", 0.3]]),
);
oomPah(MARCH, MARCH + 15, 0.64, hornPah, "F3", "C4", 0.42);
marchDrums(MARCH, MARCH + 15, 1);
cymbals.push(...cells(MARCH, [[0, 1, "C#3", 0.55]]), ...cells(MARCH + 8, [[0, 1, "C#3", 0.45]]), ...cells(MARCH + 12, [[0, 1, "C#3", 0.55]]));
triangle.push(...cells(MARCH + 4, [[0, 1, "C4", 0.55]]), ...cells(MARCH + 10, [[0, 1, "C4", 0.5]]));
// Bar 24: the band lands on F; the tuba holds F under the horn's pickup into the trio.
{
  const b = MARCH + 15;
  tubaOom.push(...cells(b, [[0, 1.5, "F2", 0.66]]));
  for (const n of voicing(chordAt(bar(b)), "F3", "C4", null, 2)) hornPah.push({ t: bar(b) + 2, d: 0.7, n, v: 0.42 });
  tuba.push(...cells(b, [[3, 2.8, "F2", 0.36]]));
  snare.push(...cells(b, [[0, 0.5, "D2", 0.72]]));
  kick.push(...cells(b, [[0, 1, "C2", 0.56]]));
  hornTrio.push(...cells(b, [[3, 1, "A2", 0.4], [4, 1, "Bb2", 0.4], [5, 1, "C3", 0.42]]));
}

// ---------------------------------------------------------------- bars 25–40: the trio (B flat)

for (const m of TRIO_TUNE) {
  // The horn sings A A', the euphonium B A''; each in harmony under the other.
  const euphSings = m.tb >= 8;
  const lead: Note = { t: m.t, d: m.d >= 3 ? m.d - 0.35 : m.d - 0.1, n: m.n - 24, v: 0 };
  if (euphSings) {
    euphTrio.push({ ...lead, v: 0.27 + (m.v - 0.55) * 0.2 });
    // (Under the tune's low pickups the horn rests: down there it only rumbles.)
    const harm = under(m.n - 24, chordAt(m.t), BB, HORN_LOW);
    if (harm !== null) hornUnder.push({ ...lead, n: harm, v: 0.34 });
  } else if (m.n - 24 < HORN_LOW) {
    euphTrio.push({ ...lead, v: 0.27 + (m.v - 0.55) * 0.2 });
  } else {
    hornTrio.push({ ...lead, v: 0.42 + (m.v - 0.55) * 0.2 });
    const harm = under(m.n - 24, chordAt(m.t), BB, EUPH_LOW);
    if (harm !== null) euphUnder.push({ ...lead, n: harm, v: 0.24 });
  }
}
{
  let prev: number[] | null = null;
  for (let b = TRIO; b < TRIO + 16; b++) {
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      const c = chordAt(t);
      // The toy piano's after-beats, the tuba's soft oom (root, then the fifth while the chord
      // holds, from C2: always under the singers), the wooden soldiers' tick-tock.
      prev = voicing(c, "F4", "D5", prev, 3);
      for (const n of prev) toyChords.push({ t: t + 2, d: 0.6, n, v: 0.36 });
      const held = h === 1 && chordAt(t - 3).root === c.root;
      tubaTrio.push({ t, d: 1.5, n: low(held ? (c.root + 7) % 12 : c.root, OOM), v: 0.6 - h * 0.04 });
      woodblock.push({ t, d: 1, n: h === 0 ? "G4" : "C4", v: 0.66 });
    }
    // The clockwork runs on into each new phrase.
    if ((b - TRIO) % 4 === 3) woodblock.push({ t: bar(b) + 4, d: 1, n: "G4", v: 0.62 }, { t: bar(b) + 5, d: 1, n: "G4", v: 0.64 });
    kick.push({ t: bar(b), d: 1, n: "C2", v: 0.26 });
    snare.push({ t: bar(b) + 5, d: 0.5, n: "D2", v: 0.18 });
  }
}
// The music box echoes the tune where it holds (two octaves over the singers).
for (const tb of HOLDS) {
  const notes = TRIO_TUNE.filter((m) => m.tb === tb);
  const at = notes.find((m) => m.pos === 3)!.t;
  notes.forEach((m, i) => boxEcho.push({ t: at + 1 + i * 0.5, d: 2, n: m.n + 12, v: 0.42 - i * 0.03 }));
}
snareRoll(bar(TRIO + 7) + 3, bar(TRIO + 8), 0.2, 0.32, 2);
triangle.push(...cells(TRIO, [[0, 1, "C4", 0.5]]), ...cells(TRIO + 8, [[0, 1, "C4", 0.5]]));
glock.push(...cells(TRIO, [[0, 2, "D6", 0.24]]), ...cells(TRIO + 8, [[0, 2, "C6", 0.24]]));

// ---------------------------------------------------------------- bars 41–48: the toy battle

// The low brass call: the theme's head (3-5-8-7, 6-5-3) in G minor, then on E flat.
const CALL_G: Cell[][] = [
  [[0, 2, "Bb2", 0.62], [2, 1, "D3", 0.52], [3, 2, "G3", 0.64], [5, 1, "F#3", 0.52]],
  [[0, 2, "Eb3", 0.64], [2, 1, "D3", 0.52], [3, 3, "Bb2", 0.62]],
];
const CALL_EB: Cell[][] = [
  [[0, 2, "G2", 0.62], [2, 1, "Bb2", 0.52], [3, 2, "Eb3", 0.64], [5, 1, "D3", 0.52]],
  [[0, 2, "C3", 0.64], [2, 1, "Bb2", 0.52], [3, 3, "G2", 0.62]],
];
for (const [first, list] of [
  [BATTLE, CALL_G],
  [BATTLE + 4, CALL_EB],
] as const) {
  list.forEach((cl, i) => {
    const notes = cells(first + i, cl);
    euphCall.push(...notes);
    hornCall.push(...notes.map((n) => ({ ...n, v: (n.v ?? 0.6) - 0.1 })));
    bassoon.push(...notes.map((n) => ({ ...n, v: (n.v ?? 0.6) - 0.1 })));
    for (const n of notes.map((x) => ({ ...x, n: num(x.n) - 12 }))) {
      if (n.n === midi("Bb1")) tuba.push({ ...n, d: Math.min(n.d, 2) });
      else tubaOom.push(n);
    }
  });
  // A toy cannon on the call's last note.
  kick.push({ t: bar(first + 1) + 3, d: 1, n: "C2", v: 0.92 });
  cymbals.push({ t: bar(first + 1) + 3, d: 1, n: "C#3", v: 0.42 });
  // Tension under the call: the snare on every eighth, leaning on the pulses.
  for (let b = first; b < first + 2; b++) for (let p = 0; p < 6; p++) if (!(b === first + 1 && p === 3)) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: p % 3 === 0 ? 0.42 : 0.22 });
}
// The toys answer: the theme's third bar (4-6-8-6) and its turn (5-7-1-2) in G minor.
const ANSWER: Cell[][] = [
  [[0, 2, "C6", 0.56], [2, 1, "Eb6", 0.48], [3, 2, "G6", 0.56], [5, 1, "Eb6", 0.48]],
  [[0, 3, "D6", 0.56], [3, 1, "F#5", 0.46], [4, 1, "G5", 0.48], [5, 1, "A5", 0.52]],
];
ANSWER.forEach((cl, i) => {
  const notes = cells(BATTLE + 2 + i, cl);
  xylo.push(...notes.map((n) => ({ ...n, v: (n.v ?? 0.5) - 0.1 })));
  piccolo.push(...notes.map((n) => ({ ...n, v: 0.45 })));
  toyPiano.push(...notes.map((n) => ({ ...n, d: Math.min(n.d, 1.2), v: 0.56 })));
  rods.push(...notes.map((n) => ({ ...n, v: 0.5 })));
  glock.push(...notes.filter((n) => n.t % 3 === 0).map((n) => ({ ...n, n: num(n.n) + 12, v: 0.26 })));
});
for (let b = BATTLE + 2; b < BATTLE + 4; b++) {
  for (const h of [0, 1]) {
    const t = bar(b) + h * 3;
    tubaOom.push({ t, d: 1.5, n: low(chordAt(t).root, OOM), v: 0.5 });
    woodblock.push({ t, d: 1, n: h === 0 ? "G4" : "C4", v: 0.66 });
  }
}
// The toys giggle after the second cannon, up into E flat.
xylo.push(...cells(BATTLE + 5, [[4, 0.5, "G5", 0.38], [4.5, 0.5, "Bb5", 0.41], [5, 0.5, "C6", 0.44], [5.5, 0.5, "D6", 0.47]]));
// Bar 47: the toys tumble down E flat and E diminished; bar 48: they race up an F7 scale.
const TUMBLE: Cell[] = [[0, 1, "Bb5", 0.5], [1, 1, "G5", 0.46], [2, 1, "Eb5", 0.46], [3, 1, "Db5", 0.5], [4, 1, "Bb4", 0.46], [5, 1, "G4", 0.46]];
xylo.push(...cells(BATTLE + 6, TUMBLE).map((n) => ({ ...n, v: (n.v ?? 0.5) - 0.06 })));
toyPiano.push(...cells(BATTLE + 6, TUMBLE).map((n) => ({ ...n, d: 0.7, v: 0.52 })));
const RACE = runInto(midi("D6"), BB, 12, "below");
RACE.forEach((n, i) => {
  const t = bar(BATTLE + 7) + i * 0.5;
  xylo.push({ t, d: 0.5, n, v: 0.36 + i * 0.01 });
  if (i >= 6) piccolo.push({ t, d: 0.5, n, v: 0.4 + (i - 6) * 0.02 });
});
// The bass climbs E flat, E, F under them: a trombone holding, the tuba striking each pulse.
tromboneBass.push(...cells(BATTLE + 6, [[0, 2.8, "Eb2", 0.4], [3, 2.8, "E2", 0.42]]), ...cells(BATTLE + 7, [[0, 5.8, "F2", 0.46]]));
tubaOom.push(...cells(BATTLE + 6, [[0, 1.5, "Eb2", 0.56], [3, 1.5, "E2", 0.58]]), ...cells(BATTLE + 7, [[0, 1.5, "F2", 0.6], [3, 1.5, "F2", 0.62]]));
{
  let prev: number[] | null = null;
  for (let h = 0; h < 4; h++) {
    const t = bar(BATTLE + 6) + h * 3;
    prev = voicing(chordAt(t), "D3", "C4", prev, 2);
    for (const n of prev) hornHold.push({ t, d: h === 3 ? 2.8 : 3, n, v: 0.36 + h * 0.03 });
    euphHold.push({ t, d: h === 3 ? 2.8 : 3, n: low(chordAt(t).third, "G2"), v: 0.26 });
  }
}
ratchet.push(...cells(BATTLE + 6, [[0, 1, "C4", 0.6], [1.5, 1, "C4", 0.65]]));
for (let p = 0; p < 6; p++) snare.push({ t: bar(BATTLE + 6) + p, d: 0.5, n: "D2", v: 0.3 + p * 0.03 });
snareRoll(bar(BATTLE + 7), bar(GRAND), 0.3, 0.66, 3);
kick.push(...cells(BATTLE + 6, [[0, 1, "C2", 0.5]]), ...cells(BATTLE + 7, [[0, 1, "C2", 0.5], [3, 1, "C2", 0.55]]));

// ---------------------------------------------------------------- bars 49–64: the grandioso (B flat)

for (const m of GRAND_TUNE) {
  const len = m.d >= 3 ? m.d - 0.25 : m.d - 0.1;
  const stacc = m.d >= 3 ? 2.4 : m.d === 2 ? 1.3 : 0.7;
  euphGrand.push({ t: m.t, d: len, n: m.n - 24, v: 0.29 + (m.v - 0.55) * 0.2 });
  if (m.n - 24 >= HORN_LOW) hornGrand.push({ t: m.t, d: len, n: m.n - 24, v: 0.46 + (m.v - 0.55) * 0.2 });
  toyPiano.push({ t: m.t, d: stacc, n: m.n, v: 0.56 + (m.v - 0.55) * 0.6 });
  toyPianoHigh.push({ t: m.t, d: stacc, n: m.n + 12, v: 0.4 });
  rods.push({ t: m.t, d: stacc, n: m.n + 12, v: 0.45 });
  glock.push({ t: m.t, d: 1, n: m.n + 12, v: m.pos % 3 === 0 ? 0.3 : 0.24 });
}
// The piccolo (and the xylophone) run into the next phrase where the tune holds.
for (const tb of HOLDS) {
  const held = GRAND_TUNE.find((m) => m.tb === tb && m.pos === 3)!;
  const next = GRAND_TUNE.find((m) => m.tb === tb + 1 && m.pos === 0)!;
  const run = runInto(next.n + 12, BB, 4, next.n >= held.n ? "below" : "above");
  run.forEach((n, i) => {
    piccolo.push({ t: held.t + 1 + i * 0.5, d: 0.5, n, v: 0.42 + i * 0.03 });
    xylo.push({ t: held.t + 1 + i * 0.5, d: 0.5, n, v: 0.38 + i * 0.03 });
  });
}
// The trombones' after-beats share the horn and euphonium's register: they step aside from the tune.
oomPah(GRAND, GRAND + 15, 0.68, trombonePah, "D3", "Bb3", 0.46, 2, euphGrand);
marchDrums(GRAND, GRAND + 15, 1.1);
for (const b of [GRAND, GRAND + 4, GRAND + 8, GRAND + 12]) {
  for (const n of voicing(chordAt(bar(b)), "F4", "D5", null, 3)) trumpets.push({ t: bar(b), d: 1, n, v: 0.56 });
}
// A bugle echo of the drum call, over the tune's held B flat.
trumpets.push(...cells(GRAND + 7, [[1, 0.5, "D5", 0.5], [1.5, 0.5, "D5", 0.52], [2, 1, "F5", 0.56]]));
cymbals.push(...cells(GRAND, [[0, 1, "C#3", 0.62]]), ...cells(GRAND + 8, [[0, 1, "C#3", 0.55]]), ...cells(GRAND + 12, [[0, 1, "C#3", 0.62]]));
triangle.push(...cells(GRAND + 4, [[0, 1, "C4", 0.55]]));
// Bar 64: the band lands on B flat, and the stinger.
{
  const b = GRAND + 15;
  tuba.push(...cells(b, [[0, 1.5, "Bb1", 0.5], [3, 0.8, "Bb1", 0.55]]));
  tubaOom.push(...cells(b, [[0, 1.5, "Bb2", 0.7], [3, 1, "Bb2", 0.74]]));
  trombonePah.push(...cells(b, [[0, 1.5, "F3", 0.5], [0, 1.5, "Bb3", 0.5], [3, 0.8, "Bb2", 0.6], [3, 0.8, "F3", 0.6], [3, 0.8, "D4", 0.6]]));
  hornPah.push(...cells(b, [[3, 0.8, "F3", 0.5], [3, 0.8, "Bb3", 0.5]]));
  euphCall.push(...cells(b, [[3, 0.8, "Bb2", 0.6]]));
  trumpets.push(...cells(b, [[3, 0.8, "D5", 0.6], [3, 0.8, "F5", 0.6], [3, 0.8, "Bb5", 0.6]]));
  toyChords.push(...cells(b, [[3, 0.8, "Bb4", 0.56], [3, 0.8, "D5", 0.56], [3, 0.8, "F5", 0.56], [3, 0.8, "Bb5", 0.56]]));
  glock.push(...cells(b, [[3, 1, "Bb6", 0.3]]));
  xylo.push(...cells(b, [[3, 0.5, "Bb5", 0.48]]));
  piccolo.push(...cells(b, [[3, 0.5, "Bb6", 0.48]]));
  kick.push(...cells(b, [[0, 1, "C2", 0.7], [3, 1, "C2", 0.82]]));
  snare.push(...cells(b, [[0, 0.5, "D2", 0.75], [2.5, 0.5, "D2", 0.5], [3, 0.5, "D2", 0.85]]));
  cymbals.push(...cells(b, [[0, 1, "C#3", 0.5], [3, 1, "C#3", 0.62]]));
}

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at different levels from note to note, so a line played at one
// velocity comes out lumpy. These read the recording the sampler plays for a note (zoneFor) so a
// line can be evened out before its dynamics are applied (as in stpatricks.ts).

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
 */
function leveled(track: Omit<SampledTrack, "notes">, notes: Note[], typical = typicalDb(track.inst, notes)): Track[] {
  const groups = new Map<number, Note[]>();
  for (const n of notes) {
    const need = typical - noteDb(track.inst, n);
    const step = Math.max(-12, Math.min(12, Math.round(need / 3) * 3));
    const group = groups.get(step) ?? [];
    group.push({ ...n, v: nudge(track.inst, n.v ?? 0.7, need - step) });
    groups.set(step, group);
  }
  return [...groups].map(([step, group]) => ({ ...track, notes: group, gain: (track.gain ?? 1) * 10 ** (step / 20) }));
}

/** Brass recordings take 30–60 ms to speak: sustained brass starts this much early, as players do. */
const early = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: wrap(n.t - 0.04 / EIGHTH) }));

// ---------------------------------------------------------------- the music box

const env = (attack: number, decay: number, sustain: number, release: number) => ({ attack, decay, sustain, release });
/**
 * A music box's comb tine: the fundamental (two teeth a few cents apart, as a box doubles its
 * melody notes, so they shimmer), a faint octave, and the clamped tine's second mode (6.27 times
 * the pitch) that pings and is gone in a tenth of a second, plus the pin's tiny click.
 */
const MUSIC_BOX: VoicePatch = {
  kind: "voice",
  osc: [
    { wave: "sine", voices: 2, detune: 5, spread: 0.3 },
    { wave: "sine", semi: 12, level: 0.1, decay: 0.5 },
    { wave: "sine", semi: 31.77, level: 0.12, decay: 0.1 },
    { wave: "noise", level: 0.03, decay: 0.006 },
  ],
  amp: env(0.001, 1.6, 0, 0.35),
  highpass: 200,
  gain: 0.15,
  range: ["A3", "C7"],
  home: "C6",
};

// ---------------------------------------------------------------- the song

const tracks: Track[] = [
  // The toy box
  { inst: "ratchet", notes: ratchet, gain: 6, pan: 0.25, reverb: 0.2, humanize: 0, choke: true, lowpass: 6000, label: "wind-up key" },
  { inst: "bell", patch: MUSIC_BOX, notes: box, gain: 0.75, pan: 0.1, reverb: 0.35, humanize: 0.05, label: "music box" },
  { inst: "bell", patch: MUSIC_BOX, notes: boxEcho, gain: 1, pan: 0.15, reverb: 0.38, humanize: 0.05, label: "music box (echoes)" },
  { inst: "bell", patch: MUSIC_BOX, notes: rods, gain: 0.35, pan: -0.05, reverb: 0.3, humanize: 0.05, label: "toy piano rods" },
  ...leveled({ inst: "piano", gain: 0.3, pan: -0.05, reverb: 0.3, humanize: 0.1, lowpass: 6500, label: "toy piano" }, toyPiano),
  { inst: "piano", notes: toyPianoLow, gain: 0.2, pan: -0.05, reverb: 0.3, humanize: 0.1, lowpass: 6500, label: "toy piano (octaves)" },
  { inst: "piano", notes: toyPianoHigh, gain: 0.12, pan: -0.05, reverb: 0.3, humanize: 0.1, lowpass: 6500, label: "toy piano (octaves)" },
  { inst: "piano", notes: toyChords, gain: 0.12, pan: -0.15, reverb: 0.3, humanize: 0.1, lowpass: 5000, label: "toy piano (chords)" },
  { inst: "glockenspiel", notes: glock, gain: 8, pan: 0.3, reverb: 0.35, humanize: 0.1, lowpass: 5500, ring: 0.8 },
  { inst: "xylophone", notes: xylo, gain: 2.4, pan: -0.3, reverb: 0.3, humanize: 0.1, lowpass: 6000, ring: 0.5 },
  { inst: "flute", notes: flute, gain: 0.55, pan: 0.2, reverb: 0.3, humanize: 0.15, lowpass: 4000, label: "piccolo" },
  { inst: "fluteShort", notes: piccolo, gain: 0.55, pan: 0.2, reverb: 0.3, humanize: 0.1, lowpass: 4000, label: "piccolo (staccato)" },
  { inst: "woodblock", notes: woodblock, gain: 0.6, pan: -0.25, reverb: 0.2, humanize: 0.05, lowpass: 5000 },
  // The band
  { inst: "trumpetShort", notes: bugle, gain: 1.55, pan: 0.25, reverb: 0.3, humanize: 0.1, lowpass: 4500, label: "bugle" },
  { inst: "trumpetShort", notes: trumpets, gain: 0.8, pan: 0.25, reverb: 0.3, humanize: 0.15, lowpass: 4500, label: "trumpets" },
  { inst: "horn", notes: early(hornTrio), gain: 2.8, pan: -0.15, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (trio tune)" },
  { inst: "horn", notes: early(hornUnder), gain: 2, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (harmony)" },
  { inst: "horn", notes: early(hornGrand), gain: 2, pan: -0.15, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (grandioso tune)" },
  { inst: "horn", notes: early(hornHold), gain: 1.2, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horns (held chords)" },
  { inst: "hornShort", notes: hornPah, gain: 0.7, pan: -0.25, reverb: 0.3, humanize: 0.15, lowpass: 5000, label: "horns (after-beats)" },
  { inst: "hornShort", notes: hornCall, gain: 0.7, pan: -0.2, reverb: 0.3, humanize: 0.1, lowpass: 5000, label: "horns (call)" },
  ...euphonium(early(euphTrio), { gain: 14, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (trio tune)" }),
  ...euphonium(early(euphUnder), { gain: 7, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (harmony)" }),
  ...euphonium(early(euphCounter), { gain: 8, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (countermelody)" }),
  ...euphonium(early(euphGrand), { gain: 10, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (grandioso tune)" }),
  ...euphonium(early(euphHold), { gain: 6, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (held chords)" }),
  ...euphonium(euphCall, { short: true, gain: 0.8, pan: 0.1, reverb: 0.28, humanize: 0.1, label: "euphonium (call)" }),
  { inst: "bassoonShort", notes: bassoon, gain: 0.5, pan: 0.2, reverb: 0.28, humanize: 0.1, lowpass: 4000, label: "bassoon (call)" },
  { inst: "tuba", notes: early(tuba), gain: 1.1, pan: 0.05, reverb: 0.22, humanize: 0.15, highpass: 50 },
  { inst: "tubaShort", notes: tubaOom, gain: 0.45, pan: 0.05, reverb: 0.2, humanize: 0.1, highpass: 50, label: "tuba (oom)" },
  { inst: "tubaShort", notes: tubaTrio, gain: 0.26, pan: 0.05, reverb: 0.22, humanize: 0.1, highpass: 50, label: "tuba (trio oom)" },
  { inst: "trombone", notes: early(tromboneBass), gain: 0.5, pan: 0.1, reverb: 0.25, humanize: 0.1, lowpass: 3000, label: "trombone (bass line)" },
  { inst: "tromboneShort", notes: trombonePah, gain: 1, pan: 0.2, reverb: 0.28, humanize: 0.15, lowpass: 4000, label: "trombones (after-beats)" },
  // The drums
  { inst: "kick", notes: kick, gain: 1, pan: 0, reverb: 0.2, humanize: 0.1, highpass: 60, label: "bass drum" },
  { inst: "snareOn", notes: snare, gain: 0.7, pan: -0.1, reverb: 0.22, humanize: 0.15, lowpass: 6000, label: "snare" },
  { inst: "snareRoll", notes: roll, gain: 0.45, pan: -0.1, reverb: 0.25, humanize: 0, lowpass: 6000, label: "snare roll" },
  { inst: "cymbals", notes: cymbals, gain: 0.55, pan: 0.2, reverb: 0.35, humanize: 0.05, lowpass: 5000 },
  { inst: "triangle", notes: triangle, gain: 3, pan: -0.3, reverb: 0.4, humanize: 0 },
];

const song: Song = {
  name: "toyblock",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A nursery: a small, warm room.
  reverb: { room: 0.55, damp: 0.5, width: 0.9, level: 0.8 },
  tracks,
};

export default song;
