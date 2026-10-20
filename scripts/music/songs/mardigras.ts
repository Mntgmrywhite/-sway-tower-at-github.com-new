// Mardi Gras: the theme as a New Orleans second-line brass band, the street parade that follows
// the floats through the French Quarter (in that spirit only: our theme, our own arrangement). One
// public-domain traditional is woven in the way the Christmas carols are: "When the Saints Go
// Marching In" (its first line) is the stop-time chorus's call, and the band answers it with our
// theme's head. Every link is our own.
//
// 72 bars of the theme's 6/8 at 320 eighths a minute (a dotted quarter of 106.7, the second line's
// strut: one bar 1.125 s = 54,000 frames; 81 s). The 6/8 is the second line's swing: each pulse
// a beat, its eighths the long-short shuffle.
//
// Form (bars):
//    1–2   the sousaphone's riff over the drums (bass drum with its cymbal, snare, tambourine);
//    3–4   the band's call: two hits on F and C7 (the banjo in on the second beats), a clarinet
//          run, the trumpet's pickup into
//    5–20  THE HEAD, the theme in F: the front line. The TRUMPET leads it (staccato, evened out
//          note by note), the CLARINET weaves an obbligato above (arpeggios where the tune holds,
//          long notes where it moves, a new one each beat), the TROMBONE's tailgate under it
//          (guide tones with a smear up into every other bar, its own fills where the tune holds).
//          The sousaphone walks the oom-pah (the root and fifth on the beats, an approach note on
//          each beat's last eighth), the banjo (ukulele) chops on the beats and the shuffle, the
//          second-line drums. The tune lands on F and the band sends the sax off on F7.
//   21–36  THE SAX CHORUS, the theme in B flat: the TENOR SAX sings it (A3–D5, a blue-note scoop
//          into its long thirds), the trombone and the EUPHONIUM in unison on a countermelody under
//          it (moving where the sax holds), muted-trumpet "doo-wah" riffs behind it from the bridge,
//          the clarinet's obbligato back for the last phrase. Ends on F7.
//   37–44  THE PIANO BREAK (A A'), honky-tonk: an upright piano doubled 4 cents sharp and 4 flat
//          (the honky-tonk's chorus, gentle: each voice heard within 5 cents), the tune in octaves with a third
//          or sixth under the beats, crushed blue notes, an octave tremolo and runs where it holds,
//          a stride left hand; the sousaphone and the drums light under it.
//   45–52  THE STOP-TIME, call and response: the band stops on one hit and the trumpet calls "Oh
//          when the saints" alone over the crowd's backbeat claps; the band answers with the theme's
//          head; again, to "go marching in", which lands on C7 with the band's hit, a cheer, and the
//          drums' break (the marshal's whistle, the trombone's big smear) into
//   53–68  THE OUT-CHORUS, the theme in F with everyone: the trumpet lead with a second trumpet
//          under it from A', the clarinet's obbligato higher and busier, the tailgate trombone, the
//          SAX and the EUPHONIUM together on the countermelody, the crowd clapping the backbeat. The
//          tune lands on F with the band's stinger.
//   69–72  the band's tag riff (two bars, in octaves, a last smear into F) and two bars of the
//          drums alone with the crowd's cheer and the whistle, into the sousaphone's riff at bar 1.
//
// Register plan (low to high): sousaphone C2–Eb3 (the staccato tuba's low B flat take reads flat,
// and its C2 an eighth long 5 cents flat, so the walk's approach notes stay above it) · trombone
// tailgate Bb2–Bb3 (its smears from up to a fifth below), its countermelody C3–Bb3 · euphonium
// countermelody C3–Bb3 (the tuba's soft takes; the out-chorus line never moves through E3, which
// that take plays flat an eighth long) · tenor sax counter C3–Bb3, its chorus A3–D5 · banjo chops
// C4–Bb4 · trumpet lead C4–A5, second trumpet a third or a sixth under it from A3 · muted riffs
// A4–C5 · clarinet obbligato C5–D6 (the head), C5–F6 (the out-chorus) · piano: stride bass Bb1–A2
// with chords D3–D4, the tune A3–D6. Every chop, stride chord, approach note and counter note steps
// aside from a note it would rub against (a semitone, a major seventh or a minor ninth) in the lines
// over it.
//
// Mix (scripts/music/mix.ts, dB against the mix per 4-bar phrase): the trumpet lead at -4 to -6, the
// sax's chorus at -4, the piano's break at -1 to -2; the tailgate trombone -10 to -12, the
// countermelodies -10 to -12, the clarinet's obbligato -9 to -15, the muted riffs -14 to -16, the
// sousaphone -6 to -10, bass drum -8 to -10, snare -12 to -15; the cheer -12 to -16 and the whistle
// -23, both only where no tune plays. The piano break eases to the sax chorus's level; the
// out-chorus is the loudest. Everything bright is low-passed (trumpets 3 kHz, muted riffs 2.4,
// clarinet 4, the bass drum's cymbal 4, claps 4, tambourine and snare 4.5), so the 2–8 kHz band
// sits between Oktoberfest's and Independence Day's. Tuning (scripts/music/tuning.ts): every sax,
// trombone, tuba, euphonium and piano note within 5 cents as heard (the honky-tonk's two voices at
// +4 and -4 cents included; its crushed grace notes play once, at pitch).

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import type { VoicePatch } from "../synth";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths per minute: a dotted quarter of 106.7. One bar = 54,000 frames at 48 kHz. */
const BPM = 320;
const BARS = 72;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;

// The sections' first bars (1-based).
const INTRO = 1;
const HEAD = 5;
const SAX = 21;
const PIANO = 37;
const STOP = 45;
const OUT = 53;
const TAG = 69;

/** Start of bar b (1-based), in eighths. */
const bar = (b: number) => (b - 1) * BAR;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
/** Notes of one bar written as [eighth in the bar, length in eighths, note, velocity]. */
type Cell = [number, number, string | number, number];
const cells = (b: number, list: Cell[]): Note[] => list.map(([p, d, n, v]) => ({ t: bar(b) + p, d, n: num(n), v }));
/** Seconds as eighths (for grace notes and strums, which are timed in milliseconds). */
const ms = (s: number) => s / EIGHTH;

// ---------------------------------------------------------------- harmony

const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SUFFIX: Record<Quality, string> = { maj: "", min: "m", dom7: "7", min7: "m7", dim: "dim" };
const pcOf = (name: string) => midi(`${name}4`) % 12;
const F = pcOf("F");
const BB = pcOf("Bb");
/** The theme's chord for half bar i, moved by `semis`. */
const themeHalf = (i: number, semis: number) => {
  const [root, q] = CHORDS[i]!;
  return FLAT[(pcOf(root) + semis + 24) % 12]! + SUFFIX[q];
};
const themeHalves = (semis: number) => Array.from({ length: 32 }, (_, i) => themeHalf(i, semis));

/** The chord of every half bar of the loop. */
const HALVES: string[] = [
  ...["F", "F", "F7", "F7", "F", "F", "C7", "C7"], // 1–4: the riff and the call
  ...themeHalves(5), // 5–20: the head (F)
  ...themeHalves(-2), // 21–36: the sax chorus (B flat), ending on its dominant
  ...themeHalves(-2).slice(0, 16), // 37–44: the piano break (A A')
  ...["Bb", "Bb", "Bb", "Bb", "Bb", "Bb", "Gm", "Gm", "Bb", "Bb", "Bb", "Bb", "C7", "C7", "C7", "C7"], // 45–52: the stop-time
  ...themeHalves(5), // 53–68: the out-chorus (F)
  ...["F", "F7", "Bb", "F", "F", "F", "F", "F"], // 69–72: the tag and the drums
];
const halfOf = (b: number, h: number) => (b - 1) * 2 + h;
// The head and the out-chorus cadence home to F (C7 under the tune's last pickup); the head then
// turns to F7, the send-off into B flat.
for (const b of [HEAD, OUT]) {
  HALVES[halfOf(b + 14, 1)] = "C7";
  HALVES[halfOf(b + 15, 0)] = "F";
  HALVES[halfOf(b + 15, 1)] = b === HEAD ? "F7" : "F";
}
if (HALVES.length !== BARS * 2) throw new Error(`${HALVES.length} half bars of chords, not ${BARS * 2}`);

interface Chord {
  root: number;
  /** Pitch classes: root, 3rd, 5th (and 7th). */
  pcs: number[];
  third: number;
  fifth: number;
  seventh?: number;
}
const QUALITY: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], dim: [0, 3, 6, 9] };
function chord(sym: string): Chord {
  const m = /^([A-G]b?)(m|7|dim)?$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const root = FLAT.indexOf(m[1]!);
  const ints = QUALITY[m[2] ?? ""]!;
  return { root, pcs: ints.map((i) => (root + i) % 12), third: (root + ints[1]!) % 12, fifth: (root + ints[2]!) % 12, seventh: m[2] === "7" ? (root + 10) % 12 : undefined };
}
const chordAt = (t: number) => chord(HALVES[Math.floor(wrap(t) / 3)]!);
/** The key a moment is in: B flat from the sax chorus through the stop-time's calls, else F. */
const keyAt = (t: number) => {
  const b = Math.floor(wrap(t) / BAR) + 1;
  return b >= SAX && b < STOP + 6 ? BB : F;
};

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

/** Two notes rub: a semitone, a major seventh or a minor ninth apart. */
const rub = (a: number, b: number) => [1, 11, 13].includes(Math.abs(a - b));

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

/** The head and the out-chorus land on the tonic, F5 (theme.ts writes C major: C6 - 7). */
const HEAD_TUNE = tuneAt(HEAD, -7, 16, [[0, 3, "C6", 0.8]]);
const SAX_TUNE = tuneAt(SAX, -14);
const PIANO_TUNE = tuneAt(PIANO, -2, 8);
const OUT_TUNE = tuneAt(OUT, -7, 16, [[0, 3, "C6", 0.84]]);

/** The tune's notes sounding at any moment from `t` up to `t + d`. */
const soundingIn = (tune: Mel[], t: number, d: number) => tune.filter((m) => m.t < t + d - 0.01 && m.t + m.d > t + 0.01).map((m) => m.n);
/** The tune holds through the half bar from `t`: no note of it starts inside the half after its first eighth. */
const holds = (tune: Mel[], t: number) => !tune.some((m) => m.t > t + 0.01 && m.t < t + 2.99);

// ---------------------------------------------------------------- the parts

const trumpet: Note[] = [];
const trumpet2: Note[] = [];
const muted: Note[] = [];
const clarinet: Note[] = [];
const clarinetShort: Note[] = [];
const sax: Note[] = [];
const saxCounter: Note[] = [];
const saxShort: Note[] = [];
const tailgate: Note[] = [];
const tromboneCounter: Note[] = [];
const tromboneShort: Note[] = [];
const euphCounter: Note[] = [];
const euphCounterOut: Note[] = [];
const euphShort: Note[] = [];
const sousaphone: Note[] = [];
const pianoHigh: Note[] = [];
const pianoGrace: Note[] = [];
const pianoLow: Note[] = [];
const uke: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const drumCymbal: Note[] = [];
const tambourine: Note[] = [];
const crash: Note[] = [];
const claps: Note[] = [];
const stopClaps: Note[] = [];
const cheer: Note[] = [];
const whistle: Note[] = [];

// ---------------------------------------------------------------- the rhythm section

/** A held snare roll from eighth `from` to `to`, swelling in steps (each restart a small accent). */
function snareRoll(from: number, to: number, v0: number, v1: number, steps = 3): void {
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    roll.push({ t: a, d: (to - from) / steps, n: "D2", v: v0 + ((v1 - v0) * i) / Math.max(1, steps - 1) });
  }
}

/**
 * The second-line groove from bar `from` up to bar `to`: the bass drum on the beats with a push on
 * the last eighth, its cymbal on the shuffle's off-beats, the snare's backbeat on the second pulse
 * with ghost notes, a press roll and a fill into every fourth bar; the tambourine on the beats.
 * `level` scales it; `fills` false keeps it plain (under the piano).
 */
function secondLine(from: number, to: number, level: number, fills = true): void {
  for (let b = from; b < to; b++) {
    const k = (b - from) % 4;
    const s = bar(b);
    const kicks: [number, number][] = k === 3 && fills ? [[0, 0.64], [3, 0.5], [4, 0.44], [5, 0.58]] : k % 2 === 0 ? [[0, 0.68], [3, 0.48], [5, 0.54]] : [[0, 0.64], [2, 0.4], [3, 0.52]];
    const snares: [number, number][] =
      k === 3 && fills
        ? [[0, 0.3], [1, 0.24], [2, 0.4], [3, 0.7], [3.5, 0.32], [4, 0.42], [4.5, 0.46], [5, 0.52], [5.5, 0.58]]
        : k === 1
          ? [[0, 0.26], [1, 0.2], [2, 0.36], [3, 0.72], [4, 0.24], [5, 0.42]]
          : [[0, 0.24], [2, 0.34], [3, 0.7], [5, 0.38]];
    for (const [p, v] of kicks) kick.push({ t: s + p, d: 1, n: "C2", v: v * level });
    for (const [p, v] of snares) snare.push({ t: s + p, d: 0.5, n: "D2", v: v * level });
    // The press roll: a buzz into the backbeat's after-beat, every other bar.
    if (k === 2 && fills) snareRoll(s + 4, s + 5, 0.2 * level, 0.26 * level, 1);
    if (fills) for (const [p, v] of [[2, 0.42], [5, 0.38]] as const) drumCymbal.push({ t: s + p, d: 0.5, n: "D#3", v: v * level });
    for (const [p, v] of [[0, 0.3], [2, 0.22], [3, 0.48], [5, 0.26]] as const) tambourine.push({ t: s + p, d: 0.5, n: "C4", v: v * level });
  }
}

/** The sousaphone's target note per half bar: the root, or the fifth while the chord holds, near `prev`. */
function bassTarget(t: number, prev: number): number {
  const c = chordAt(t);
  const held = t % BAR !== 0 && chordAt(t - 3).root === c.root;
  const pc = held ? c.fifth : c.root;
  const options = [low(pc, "C2"), low(pc, "C2") + 12].filter((m) => m <= midi("Eb3"));
  return options.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
}

/**
 * The sousaphone walking the oom-pah from bar `from` up to bar `to`: the target on each beat (two
 * eighths), and on the beat's last eighth an approach into the next: a semitone below it, or a
 * scale step above when it falls, a neighbour when it repeats; another of those where the first
 * would rub against a line moving over it. Never C2 for an eighth: the staccato take that plays it
 * is heard 5 cents flat that short (its beats are in tune). `approach` false plays the beats
 * only (under the stride piano, whose chords take those eighths).
 */
function walk(from: number, to: number, v: number, approach = true): void {
  let prev = midi("F2");
  const targets: number[] = [];
  for (let h = 0; h <= (to - from) * 2; h++) {
    prev = bassTarget(bar(from) + h * 3, prev);
    targets.push(prev);
  }
  for (let h = 0; h < (to - from) * 2; h++) {
    const t = bar(from) + h * 3;
    const a = targets[h]!;
    const b = targets[h + 1]!;
    const key = keyAt(t);
    sousaphone.push({ t, d: 2, n: a, v: v - (h % 2) * 0.04 });
    if (!approach) continue;
    const over = leadsAt(t + 2, [trumpet, trumpet2, sax, saxCounter, tromboneCounter]);
    const ways = (b > a ? [b - 1, step(b, key, -1), step(b, key, 1)] : b < a ? [step(b, key, 1), b + 1, step(b, key, -1)] : [step(a, key, 1), step(a, key, -1)]).filter((x) => x > midi("C2"));
    // Where every approach would rub, the beat's own note again (a chord tone).
    const way = [...ways, ...(a > midi("C2") ? [a] : [])].find((x) => !over.some((m) => rub(x, m))) ?? ways[0] ?? a;
    sousaphone.push({ t: t + 2, d: 1, n: way, v: v - 0.14 });
  }
}

/** The leads' notes (not their grace notes) sounding at `t`: the chops and the stride step aside from them. */
const leadsAt = (t: number, lists: Note[][]) => lists.flatMap((l) => l.filter((n) => n.d >= 0.5 && n.t < t + 0.5 && n.t + n.d > t + 0.05).map((n) => num(n.n)));

/**
 * A banjo chop on the ukulele: the chord strummed down (low to high) or up, a few ms apart,
 * leaving out a string that would rub against a lead's note.
 */
let chopPrev: number[] | null = null;
function chop(t: number, v: number, up = false): void {
  const c = chordAt(t);
  const voiced = voicing(c, "C4", "A4", chopPrev, 3);
  chopPrev = voiced;
  const lead = leadsAt(t, [trumpet, trumpet2, sax]);
  const clear = voiced.filter((x) => !lead.some((m) => rub(x, m)));
  const notes = clear.length ? clear : voiced.slice(0, 1);
  const order = up ? [...notes].reverse().slice(0, 2) : notes;
  order.forEach((n, i) => uke.push({ t: t + ms(0.018) * i, d: 0.5, n, v: v - i * 0.03 }));
}

/** The banjo's shuffle from bar `from` up to bar `to`: down on the beats, up on their last eighths. */
function banjo(from: number, to: number, level: number): void {
  for (let b = from; b < to; b++) {
    for (const [p, v, up] of [[0, 0.56, false], [2, 0.36, true], [3, 0.5, false], [5, 0.36, true]] as const) chop(bar(b) + p, v * level, up);
  }
}

// ---------------------------------------------------------------- the front line

/** A trumpet line, detached as a brass band plays it; the long notes ring. */
const tptLen = (d: number) => (d >= 3 ? 2.6 : d === 2 ? 1.6 : 0.85);

/**
 * The clarinet's obbligato over `tune` from bar `start` for `bars` bars, within [lo, hi], clear of
 * the tune and of the notes in `also` (the harmony trumpet, the muted riffs).
 */
function obbligato(tune: Mel[], start: number, bars: number, lo: string, hi: string, v: number, busy: boolean, fromBar = 0, also: Note[] = []): void {
  let prev = num(lo) + 7;
  let dir: 1 | -1 = 1;
  for (let h = fromBar * 2; h < bars * 2; h++) {
    const t = bar(start) + h * 3;
    const c = chordAt(t);
    const lead = soundingIn(tune, t, 3);
    const top = Math.max(...lead, num(lo) - 3);
    const others = also.filter((n) => n.t < t + 2.99 && n.t + n.d > t + 0.01).map((n) => num(n.n));
    const tones = tonesIn(c, Math.max(num(lo), top + 3), hi).filter((x) => ![...lead, ...others].some((m) => rub(x, m)));
    if (!tones.length) continue;
    const near = tones.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
    const tb = Math.floor(h / 2);
    if (holds(tune, t)) {
      // Where the tune holds: an arpeggio through the chord (a sixteenth run when busy, at a phrase's end).
      const i0 = tones.indexOf(near);
      const run = busy && (tb % 4 === 3 || tb % 4 === 1) && h % 2 === 1;
      const count = run ? 6 : 3;
      const fig: number[] = [];
      let i = i0;
      for (let k = 0; k < count; k++) {
        if (i < 0 || i >= tones.length) {
          dir = dir === 1 ? -1 : 1;
          i += dir * 2;
        }
        fig.push(tones[Math.max(0, Math.min(tones.length - 1, i))]!);
        i += dir;
      }
      const len = run ? 0.5 : 1;
      fig.forEach((n, k) => clarinet.push({ t: t + k * len, d: len - 0.05, n, v: v - (k === 0 ? 0 : 0.04) }));
      prev = fig[fig.length - 1]!;
      dir = dir === 1 ? -1 : 1;
    } else {
      // Where it moves: a long note above it, voice-led, and a new one each beat (the same note
      // struck again would only mark time): the next chord tone toward the middle of the range,
      // so the long notes weave there and the top is left to the runs.
      let pick = near;
      if (near === prev && tones.length > 1) {
        const i = tones.indexOf(near);
        const toward = near > (num(lo) + num(hi)) / 2 ? -1 : 1;
        pick = tones[i + toward] ?? tones[i - toward]!;
      }
      clarinet.push({ t, d: 2.7, n: pick, v: v - 0.02 });
      prev = pick;
    }
  }
}

/** A smear: the trombone slides up into `target` at `t` from `span` semitones below (quick chromatic grace notes). */
function smear(list: Note[], t: number, target: number, v: number, span = 4): void {
  const each = ms(0.04);
  for (let i = 0; i < span; i++) list.push({ t: t - each * (span - i), d: each * 1.6, n: target - span + i, v: v - 0.2 + i * 0.03 });
  list.push({ t, d: 2.5, n: target, v });
}

/**
 * The tailgate trombone under `tune` from bar `start` for `bars` bars: a guide tone (the third, the
 * seventh, else the root) near the last, within Bb2–Bb3, smeared into every other bar; on the second
 * beat a new tone where the chord moves, and where the tune holds its own fill down the chord into
 * the next bar. The first smear rises `firstSpan` semitones (the out-chorus's big one: one
 * trombone, one smear).
 */
function tailgateLine(tune: Mel[], start: number, bars: number, v: number, firstSpan = 4): void {
  let prev = midi("A2");
  const guide = (t: number) => {
    const c = chordAt(t);
    const lead = soundingIn(tune, t, 3);
    const all = tonesIn(c, "Bb2", "Bb3");
    const clear = all.filter((x) => !lead.some((m) => rub(x, m)));
    const tones = clear.length ? clear : all;
    const rank = (x: number) => (x % 12 === c.third || x % 12 === c.seventh ? 0 : x % 12 === c.root ? 1.5 : 2.5);
    return tones.reduce((a, b) => (Math.abs(b - prev) + rank(b) < Math.abs(a - prev) + rank(a) ? b : a));
  };
  for (let tb = 0; tb < bars; tb++) {
    const s = bar(start + tb);
    const g = guide(s);
    if (tb % 2 === 0) smear(tailgate, s, g, v, tb === 0 ? firstSpan : 4);
    else tailgate.push({ t: s, d: 2.5, n: g, v: v - 0.04 });
    prev = g;
    const t2 = s + 3;
    const c2 = chordAt(t2);
    if (holds(tune, t2) && tb < bars - 1) {
      // The fill: down the chord from its fifth, then a semitone into the next bar's guide tone.
      const lead = soundingIn(tune, t2, 3);
      const top = tonesIn(c2, "D3", "Bb3").filter((x) => !lead.some((m) => rub(x, m)));
      const a = top[top.length - 1] ?? g;
      const b = top[top.length - 2] ?? a - 3;
      tailgate.push({ t: t2, d: 0.9, n: a, v: v - 0.06 }, { t: t2 + 1, d: 0.9, n: b, v: v - 0.1 });
      prev = b;
    } else if (chordAt(s).root !== c2.root) {
      const g2 = guide(t2);
      tailgate.push({ t: t2, d: 2.5, n: g2, v: v - 0.06 });
      prev = g2;
    }
  }
}

/**
 * A countermelody under `tune` from bar `start` for `bars` bars, within [lo, hi]: guide tones that
 * move by step, held where the tune moves; where it holds, three eighths walking to the next. The
 * eighths never use the notes in `avoid` (the euphonium doubles the line, and its soft tuba take
 * on E3 is heard 5-6 cents flat when it is an eighth long), nor rub against the notes in `also`.
 */
function counterLine(tune: Mel[], start: number, bars: number, lo: string, hi: string, v: number, avoid: string[] = [], also: Note[] = []): Note[] {
  const shun = new Set(avoid.map(num));
  const out: Note[] = [];
  const targets: number[] = [];
  let prev = (num(lo) + num(hi)) / 2;
  for (let h = 0; h < bars * 2; h++) {
    const t = bar(start) + h * 3;
    const c = chordAt(t);
    const lead = [...soundingIn(tune, t, 3), ...also.filter((n) => n.t < t + 2.99 && n.t + n.d > t + 0.01).map((n) => num(n.n))];
    const moving = holds(tune, t);
    const tones = tonesIn(c, lo, hi).filter((x) => !lead.some((m) => rub(x, m) || m === x) && !(moving && shun.has(x)));
    const rank = (x: number) => (x % 12 === c.third || x % 12 === c.seventh ? 0 : x % 12 === c.root ? 1.5 : 2);
    // A countermelody moves: staying put costs a little, staying a third time more.
    const same = (x: number) => (h >= 1 && targets[h - 1] === x ? (h >= 2 && targets[h - 2] === x ? 3.5 : 2) : 0);
    const pick = tones.length ? tones.reduce((a, b) => (Math.abs(b - prev) + rank(b) + same(b) < Math.abs(a - prev) + rank(a) + same(a) ? b : a)) : Math.round(prev);
    targets.push(pick);
    prev = pick;
  }
  for (let h = 0; h < bars * 2; h++) {
    const t = bar(start) + h * 3;
    const a = targets[h]!;
    const b = targets[h + 1];
    const key = keyAt(t);
    const lead = [...soundingIn(tune, t, 3), ...also.filter((n) => n.t < t + 2.99 && n.t + n.d > t + 0.01).map((n) => num(n.n))];
    if (b !== undefined && holds(tune, t)) {
      const fits = (n: number) => !lead.some((m) => rub(n, m)) && !shun.has(n);
      const dir: 1 | -1 = b >= a ? 1 : -1;
      let fig: number[];
      if (Math.abs(b - a) >= 3) {
        const p1 = step(a, key, dir);
        fig = [a, p1, b - dir === p1 ? step(p1, key, dir) : b - dir];
      } else {
        // A turn about the note: away from the next one (up before the same one), else the other way.
        const away: 1 | -1 = b === a ? 1 : dir === 1 ? -1 : 1;
        fig = [a, [step(a, key, away), step(a, key, away === 1 ? -1 : 1)].find(fits) ?? a, a];
      }
      fig = fig.map((n, i) => (i > 0 && !fits(n) ? fig[i - 1]! : n));
      // An eighth that would only strike the last note again holds it on instead.
      fig.forEach((n, i) => {
        const last = out[out.length - 1];
        if (i > 0 && last && last.n === n) last.d += 1;
        else out.push({ t: t + i, d: 1, n, v: v - (i === 0 ? 0 : 0.03) });
      });
    } else out.push({ t, d: 2.8, n: a, v });
  }
  return out;
}

/** A band hit at `t` (the chord short and together), with the bass drum and, `big`, the crash. */
function hit(t: number, d: number, v: number, big = false): void {
  const c = chordAt(t);
  for (const n of voicing(c, "A4", "F5", null, 3)) trumpet2.push({ t, d, n, v });
  for (const n of voicing(c, "F5", "C6", null, 1)) clarinetShort.push({ t, d, n, v: v - 0.06 });
  for (const n of voicing(c, "F3", "D4", null, 2)) saxShort.push({ t, d, n, v: v - 0.04 });
  for (const n of voicing(c, "Bb2", "Bb3", null, 2)) tromboneShort.push({ t, d, n, v });
  // The euphonium's root sits above the sousaphone's (on B flat they'd share a tuba take).
  euphShort.push({ t, d, n: low(c.root, "C3"), v });
  sousaphone.push({ t, d: Math.max(1.5, d), n: low(c.root, "C2"), v: v + 0.06 });
  chop(t, v);
  kick.push({ t, d: 1, n: "C2", v: v + 0.1 });
  if (big) crash.push({ t, d: 1, n: "C#3", v: v - 0.1 });
}

// ---------------------------------------------------------------- bars 1–4: the riff and the call

sousaphone.push(
  ...cells(INTRO, [[0, 2, "F2", 0.72], [2, 1, "F2", 0.52], [3, 1, "A2", 0.62], [4, 1, "C3", 0.58], [5, 1, "D3", 0.62]]),
  ...cells(INTRO + 1, [[0, 2, "Eb3", 0.7], [2, 1, "D3", 0.54], [3, 1, "C3", 0.62], [4, 1, "A2", 0.56], [5, 1, "E2", 0.6]]),
  ...cells(INTRO + 2, [[3, 2, "A2", 0.62], [5, 1, "Db2", 0.56]]),
  ...cells(INTRO + 3, [[3, 2, "G2", 0.62], [5, 1, "E2", 0.56]]),
);
secondLine(INTRO, HEAD, 0.95);
// The call: "BAP-ba" on F, a clarinet run up; "BAP-ba" on C7, the trumpet's pickup into the tune.
hit(bar(INTRO + 2), 1.5, 0.62, true);
hit(bar(INTRO + 2) + 2, 0.9, 0.54);
hit(bar(INTRO + 3), 1.5, 0.62);
hit(bar(INTRO + 3) + 2, 0.9, 0.54);
clarinet.push(...cells(INTRO + 2, [[3, 0.95, "C5", 0.44], [4, 0.95, "F5", 0.46], [5, 0.95, "A5", 0.48]]), ...cells(INTRO + 3, [[3, 0.95, "Bb5", 0.42], [4, 0.95, "G5", 0.4], [5, 0.95, "E5", 0.4]]));
trumpet.push(...cells(INTRO + 3, [[3, 0.85, "E4", 0.56], [4, 0.85, "F4", 0.58], [5, 0.85, "G4", 0.6]]));
smear(tailgate, bar(INTRO + 2), midi("A2"), 0.5, 5);
// The banjo comes in under the call on each bar's second beat (the hits strum the first).
for (const b of [INTRO + 2, INTRO + 3]) {
  chop(bar(b) + 3, 0.4);
  chop(bar(b) + 5, 0.29, true);
}

// ---------------------------------------------------------------- bars 5–20: the head (F)

for (const m of HEAD_TUNE) trumpet.push({ t: m.t, d: tptLen(m.d), n: m.n, v: 0.58 + (m.v - 0.55) * 0.5 });
obbligato(HEAD_TUNE, HEAD, 15, "C5", "D6", 0.38, false);
tailgateLine(HEAD_TUNE, HEAD, 15, 0.5);
walk(HEAD, HEAD + 15, 0.66);
banjo(HEAD, HEAD + 15, 1);
secondLine(HEAD, HEAD + 15, 1);
crash.push(...cells(HEAD, [[0, 1, "C#3", 0.5]]), ...cells(HEAD + 8, [[0, 1, "C#3", 0.44]]));
// Bar 20: the tune lands on F; the band's F7 sends the sax off, its pickup up the chord.
{
  const b = HEAD + 15;
  smear(tailgate, bar(b), midi("A2"), 0.52);
  hit(bar(b) + 3, 0.9, 0.56);
  clarinet.push(...cells(b, [[0, 2.7, "A5", 0.4]]));
  sousaphone.push(...cells(b, [[0, 2, "F2", 0.68], [2, 1, "F2", 0.5], [5, 1, "A2", 0.54]]));
  for (const [p, v] of [[0, 0.68], [3, 0.6]] as const) kick.push({ t: bar(b) + p, d: 1, n: "C2", v });
  snare.push(...cells(b, [[0, 0.5, "D2", 0.34], [3, 0.5, "D2", 0.72]]));
  for (const [p, v] of [[0, 0.3], [3, 0.46]] as const) tambourine.push({ t: bar(b) + p, d: 0.5, n: "C4", v });
  chop(bar(b), 0.54);
  sax.push(...cells(b, [[3, 0.9, "F3", 0.44], [4, 0.9, "A3", 0.46], [5, 0.9, "C4", 0.48]]));
}

// ---------------------------------------------------------------- bars 21–36: the sax chorus (B flat)

for (const m of SAX_TUNE) {
  const c = chordAt(m.t);
  const len = m.d >= 3 ? m.d - 0.3 : m.d - 0.12;
  // A blue-note scoop into the long thirds on the beat.
  if (m.d >= 2 && m.pos % 3 === 0 && m.n % 12 === c.third) sax.push({ t: m.t - ms(0.07), d: ms(0.07), n: m.n - 1, v: 0.34 });
  sax.push({ t: m.t, d: len, n: m.n, v: 0.4 + (m.v - 0.55) * 0.3 });
}
{
  const counter = counterLine(SAX_TUNE, SAX, 16, "D3", "Bb3", 0.34);
  // The trombone on its middle layer, the euphonium's trombone on its soft one: never the same
  // recording at once (a hollow, comb-filtered unison).
  tromboneCounter.push(...counter.map((n) => ({ ...n, v: (n.v ?? 0.34) + 0.1 })));
  euphCounter.push(...counter);
}
// The muted trumpets' riffs behind the sax from the bridge on: "doo-wah" where it holds.
for (let h = 16; h < 31; h++) {
  const t = bar(SAX) + h * 3;
  if (!holds(SAX_TUNE, t)) continue;
  const c = chordAt(t);
  const lead = soundingIn(SAX_TUNE, t, 3);
  const counter = leadsAt(t + 1, [tromboneCounter]);
  const notes = voicing(c, "F4", "D5", null, 2).filter((x) => !lead.some((m) => rub(x, m) || m === x) && !counter.some((m) => rub(x, m)));
  for (const n of notes) muted.push({ t: t + 1, d: 0.8, n, v: 0.52 }, { t: t + 2, d: 1.6, n, v: 0.58 });
}
obbligato(SAX_TUNE, SAX, 16, "C5", "C6", 0.32, false, 12, muted);
walk(SAX, PIANO, 0.6);
banjo(SAX, PIANO, 0.8);
secondLine(SAX, PIANO, 0.85);
crash.push(...cells(SAX, [[0, 1, "C#3", 0.4]]));

// ---------------------------------------------------------------- bars 37–44: the piano break (B flat)

{
  // The right hand: the tune in octaves, a third or sixth under it on the beats; a crushed blue
  // note into its thirds; where it holds the first beat an octave tremolo, the second a run down.
  for (const m of PIANO_TUNE) {
    const c = chordAt(m.t);
    const v = 0.5 + (m.v - 0.55) * 0.4;
    if (m.n % 12 === c.third && m.pos % 3 === 0) pianoGrace.push({ t: m.t - ms(0.05), d: ms(0.05), n: m.n - 1, v: v - 0.12 });
    if (m.d === 3 && m.pos === 0) {
      for (let k = 0; k < 6; k++) pianoHigh.push({ t: m.t + k * 0.5, d: 0.5, n: k % 2 ? m.n - 12 : m.n, v: v - (k ? 0.1 : 0) });
      continue;
    }
    pianoHigh.push({ t: m.t, d: m.d, n: m.n, v }, { t: m.t, d: m.d, n: m.n - 12, v: v - 0.08 });
    const harm = m.pos % 3 === 0 ? under(m.n, c, BB, m.n - 10) : null;
    if (harm !== null) pianoHigh.push({ t: m.t, d: m.d, n: harm, v: v - 0.12 });
    if (m.d === 3 && m.pos === 3) {
      const next = PIANO_TUNE.find((x) => x.tb === m.tb + 1 && x.pos === 0);
      const tones = tonesIn(c, m.n - 12, m.n - 1).reverse();
      tones.slice(0, 4).forEach((n, k) => pianoHigh.push({ t: m.t + 1 + k * 0.5, d: 0.5, n, v: v - 0.08 - k * 0.02 }));
      if (next) pianoHigh.push({ t: m.t + 2.5, d: 0.5, n: next.n - 1, v: v - 0.1 });
    }
  }
  // The stride left hand: the bass in octaves on the beat (root, then the fifth while the chord
  // holds), the chord on the beat's last eighth (without a note that rubs against the right hand's).
  let prevChord: number[] | null = null;
  for (let h = 0; h < 16; h++) {
    const t = bar(PIANO) + h * 3;
    const c = chordAt(t);
    const held = h % 2 === 1 && chordAt(t - 3).root === c.root;
    const bass = low(held ? c.fifth : c.root, "Bb1");
    pianoLow.push({ t, d: 1.8, n: bass, v: 0.48 }, { t, d: 1.8, n: bass + 12, v: 0.42 });
    const ch = voicing(c, "D3", "D4", prevChord, 3);
    prevChord = ch;
    const rh = leadsAt(t + 2, [pianoHigh]);
    for (const n of ch) if (!rh.some((m) => rub(n, m))) pianoLow.push({ t: t + 2, d: 0.8, n, v: 0.36 });
  }
  walk(PIANO, STOP, 0.52, false);
  secondLine(PIANO, STOP, 0.6, false);
}

// ---------------------------------------------------------------- bars 45–52: the stop-time (B flat to C7)

/** "When the Saints Go Marching In" (traditional), in B flat on the 6/8 grid: the pickups as three eighths. */
const CALL: Cell[] = [[3, 1, "Bb4", 0.6], [4, 1, "D5", 0.6], [5, 1, "Eb5", 0.62]];
const SAINTS: Cell[] = [[0, 3, "F5", 0.7]];
const MARCHING: Cell[] = [[0, 2, "F5", 0.68], [2, 1, "D5", 0.58], [3, 2, "Bb4", 0.62], [5, 1, "D5", 0.58]];
const IN: Cell[] = [[0, 3, "C5", 0.7]];
for (const [b, list] of [
  [STOP, CALL],
  [STOP + 1, SAINTS],
  [STOP + 4, CALL],
  [STOP + 5, MARCHING],
  [STOP + 6, IN],
] as const) {
  for (const n of cells(b, list)) trumpet.push({ ...n, d: tptLen(n.d) });
}
// The stops: one hit each, the crowd clapping the backbeat in the silence.
hit(bar(STOP), 1.4, 0.64, true);
hit(bar(STOP + 4), 1.4, 0.64, true);
hit(bar(STOP + 6), 2.2, 0.68, true);
for (const b of [STOP, STOP + 1, STOP + 4, STOP + 5]) stopClaps.push({ t: bar(b) + 3, d: 1, n: "C4", v: 0.7 });
for (const b of [STOP + 1, STOP + 5]) stopClaps.push({ t: bar(b), d: 1, n: "C4", v: 0.5 });
// The answers: the theme's head, the whole band (trumpet and clarinet on it, the sax in harmony,
// trombone and euphonium two octaves down), the rhythm section back in.
{
  const first = STOP + 2;
  const answer = tuneAt(first, -2, 2);
  for (const m of answer) {
    const c = chordAt(m.t);
    const len = tptLen(m.d);
    trumpet2.push({ t: m.t, d: len, n: m.n, v: 0.66 });
    clarinetShort.push({ t: m.t, d: len, n: m.n, v: 0.5 });
    const h = under(m.n, c, BB, midi("F4"));
    if (h !== null) saxShort.push({ t: m.t, d: len, n: h, v: 0.5 });
    // Trombone and euphonium on the same notes: each on its own velocity layer, so the two never
    // play the same recording at once (which would sound hollow, like a comb filter).
    tromboneShort.push({ t: m.t, d: len, n: m.n - 24, v: 0.56 });
    euphShort.push({ t: m.t, d: len, n: m.n - 24, v: 0.44 });
  }
  walk(first, first + 2, 0.64);
  banjo(first, first + 2, 0.9);
  secondLine(first, first + 2, 1);
}
// "...marching IN": the band hits C7 under the trumpet's C, the crowd cheers, the marshal's whistle,
// and the drums' break: a snare roll swelling, the sousaphone down the C7 chord, into the trombone's
// big smear (the out-chorus's first, below).
{
  const b = STOP + 6;
  cheer.push({ t: bar(b) + 2.5, d: 1, n: "C4", v: 0.8 });
  claps.push({ t: bar(b) + 3, d: 1, n: "C4", v: 0.5 }, { t: bar(b + 1) + 3, d: 1, n: "C4", v: 0.56 });
  whistle.push({ t: bar(b + 1), d: 2, n: "C7", v: 0.6 });
  snare.push(...cells(b, [[3, 0.5, "D2", 0.5], [4, 0.5, "D2", 0.36], [5, 0.5, "D2", 0.44]]));
  snareRoll(bar(b + 1), bar(OUT), 0.3, 0.62, 3);
  kick.push(...cells(b, [[3, 1, "C2", 0.5]]), ...cells(b + 1, [[0, 1, "C2", 0.6], [3, 1, "C2", 0.56], [5, 1, "C2", 0.62]]));
  sousaphone.push(...cells(b + 1, [[0, 2, "C3", 0.62], [3, 1, "Bb2", 0.6], [4, 1, "G2", 0.62], [5, 1, "E2", 0.64]]));
}

// ---------------------------------------------------------------- bars 53–68: the out-chorus (F)

for (const m of OUT_TUNE) {
  const len = tptLen(m.d);
  trumpet.push({ t: m.t, d: len, n: m.n, v: 0.62 + (m.v - 0.55) * 0.5 });
  if (m.tb >= 4 && m.tb < 15) {
    const harm = under(m.n, chordAt(m.t), F, midi("A3"));
    if (harm !== null) trumpet2.push({ t: m.t, d: len, n: harm, v: 0.5 });
  }
}
obbligato(OUT_TUNE, OUT, 15, "C5", "F6", 0.42, true, 0, trumpet2);
tailgateLine(OUT_TUNE, OUT, 15, 0.54, 7);
{
  const counter = counterLine(OUT_TUNE, OUT, 15, "C3", "C4", 0.36, ["E3"], trumpet2);
  saxCounter.push(...counter);
  euphCounterOut.push(...counter);
}
walk(OUT, OUT + 15, 0.7);
banjo(OUT, OUT + 15, 1);
secondLine(OUT, OUT + 15, 1.08);
for (let b = OUT; b < OUT + 15; b++) claps.push({ t: bar(b) + 3, d: 1, n: "C4", v: 0.42 });
crash.push(...cells(OUT, [[0, 1, "C#3", 0.56]]), ...cells(OUT + 8, [[0, 1, "C#3", 0.5]]), ...cells(OUT + 12, [[0, 1, "C#3", 0.54]]));
// Bar 68: the tune lands on F, the band's stinger on the second beat.
{
  const b = OUT + 15;
  sousaphone.push(...cells(b, [[0, 2, "F2", 0.7]]));
  clarinet.push(...cells(b, [[0, 2.7, "C6", 0.42]]));
  smear(tailgate, bar(b), midi("A2"), 0.54);
  hit(bar(b) + 3, 0.9, 0.66, true);
  snare.push(...cells(b, [[0, 0.5, "D2", 0.4], [2, 0.5, "D2", 0.44], [3, 0.5, "D2", 0.8]]));
  kick.push(...cells(b, [[0, 1, "C2", 0.68]]));
  chop(bar(b), 0.56);
}

// ---------------------------------------------------------------- bars 69–72: the tag and the drums

/** The tag riff (our own), the band in octaves: trumpet, clarinet an octave up, sax an octave down, the low brass two. */
const RIFF: [number, Cell[]][] = [
  [TAG, [[0, 2, "C5", 0.64], [2, 1, "F5", 0.6], [3, 2, "Eb5", 0.64], [5, 1, "C5", 0.58]]],
  [TAG + 1, [[0, 2, "D5", 0.64], [2, 1, "Bb4", 0.6]]],
];
for (const [b, list] of RIFF) {
  for (const n of cells(b, list)) {
    const len = tptLen(n.d);
    trumpet.push({ ...n, d: len });
    clarinetShort.push({ ...n, d: len, n: num(n.n) + 12, v: (n.v ?? 0.6) - 0.12 });
    saxShort.push({ ...n, d: len, n: num(n.n) - 12, v: (n.v ?? 0.6) - 0.06 });
    tromboneShort.push({ ...n, d: len, n: num(n.n) - 24, v: (n.v ?? 0.6) - 0.04 });
    euphShort.push({ ...n, d: len, n: num(n.n) - 24, v: (n.v ?? 0.6) - 0.18 });
  }
}
walk(TAG, TAG + 1, 0.68);
sousaphone.push(...cells(TAG + 1, [[0, 2, "Bb2", 0.68], [2, 1, "G2", 0.52]]));
secondLine(TAG, TAG + 1, 1.05);
snare.push(...cells(TAG + 1, [[0, 0.5, "D2", 0.4], [1, 0.5, "D2", 0.3], [2, 0.5, "D2", 0.46]]));
kick.push(...cells(TAG + 1, [[0, 1, "C2", 0.66]]));
banjo(TAG, TAG + 1, 1);
chop(bar(TAG + 1), 0.56);
// The last hit: F, held, the trombone smearing up into it.
smear(tailgate, bar(TAG + 1) + 3, midi("A2"), 0.58, 6);
hit(bar(TAG + 1) + 3, 2.4, 0.7, true);
trumpet.push(...cells(TAG + 1, [[3, 2.6, "F5", 0.7]]));
// Two bars of the drums alone: the crowd's cheer, the marshal's whistle in time, the crowd clapping.
cheer.push({ t: bar(TAG + 2) + 0.5, d: 1, n: "C4", v: 0.8 });
whistle.push(...cells(TAG + 2, [[3, 0.6, "C7", 0.5]]), ...cells(TAG + 3, [[0, 0.6, "C7", 0.5], [3, 1.6, "C7", 0.56]]));
claps.push(...cells(TAG + 2, [[3, 1, "C4", 0.56]]), ...cells(TAG + 3, [[3, 1, "C4", 0.6]]));
secondLine(TAG + 2, TAG + 4, 1);
snare.push(...cells(TAG + 3, [[4, 0.5, "D2", 0.44], [4.5, 0.5, "D2", 0.5], [5, 0.5, "D2", 0.56], [5.5, 0.5, "D2", 0.62]]));

// ---------------------------------------------------------------- one player, one note

/**
 * Where a band hit lands on the banjo's or the drums' own beat, or doubles the lead trumpet's note,
 * the part would strike the same note twice at once: the same recording on top of itself, which
 * only sounds hollow (a comb filter). Keep the louder of such twins (or the lead's), in order.
 */
function single(list: Note[], over: Note[] = []): void {
  const twin = (a: Note, b: Note) => Math.abs(a.t - b.t) < 0.05 && Math.round(num(a.n)) === Math.round(num(b.n));
  const drop = new Set<Note>();
  list.forEach((a, i) => {
    if (over.some((o) => twin(o, a))) drop.add(a);
    for (const b of list.slice(i + 1)) if (twin(a, b)) drop.add((a.v ?? 0.7) < (b.v ?? 0.7) ? a : b);
  });
  const kept = list.filter((n) => !drop.has(n));
  list.splice(0, list.length, ...kept);
}
single(uke);
single(kick);
single(snare);
single(trumpet2, trumpet);

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at different levels from note to note, so a line played at one
// velocity comes out lumpy. These read the recording the sampler plays for a note (zoneFor) so a
// line can be evened out before its dynamics are applied (as in july4.ts).

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
 * A part as tracks with its notes evened out to one level (the part's typical one): notes grouped
 * by the correction they need in 3 dB steps (a track each, with that gain), the rest made up by
 * velocity; the velocity each note was written with is kept on top, as dynamics. With `choke`, a
 * one-shot note rings only until the part's next note, set from the whole part before the split
 * (a track's own choke only sees its own notes); `ring` caps it, else 1.2 s.
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
 * third) is recorded up to D4 (as in july4.ts).
 */
const SOFT_LAYER = 0.31;
const softLayer = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, v: Math.min(SOFT_LAYER, n.v ?? 0.7) }));

/** The honky-tonk: the upright played twice, `cents` apart each way (each voice still in tune within 5). */
const detuned = (notes: Note[], cents: number): Note[] => notes.map((n) => ({ ...n, n: num(n.n) + cents / 100 }));

/**
 * A one-shot faded out from `from` to `to` seconds: copies of the track whose rings step down
 * (the sampler has no envelope for a recording's length), each copy a share of the level.
 */
function fadeOut(track: Track, from: number, to: number, steps = 6): Track[] {
  return Array.from({ length: steps }, (_, i) => ({ ...track, gain: (track.gain ?? 1) / steps, ring: from + ((to - from) * (i + 1)) / steps }));
}

// ---------------------------------------------------------------- the marshal's whistle

/**
 * A pea whistle, soft and low for one: a sine near 2 kHz trilled by its pea (a quick, deep wobble
 * of pitch and level), no overtones to speak of; the track's low-pass keeps it round.
 */
const PEA_WHISTLE: VoicePatch = {
  kind: "voice",
  osc: [{ wave: "sine" }, { wave: "sine", semi: 12, level: 0.04 }],
  amp: { attack: 0.012, decay: 0.4, sustain: 0.75, release: 0.05 },
  lfos: [
    { rate: 26, pitch: 60 },
    { rate: 26, amp: 0.3, phase: 0.25 },
  ],
  highpass: 500,
  gain: 0.05,
  range: ["C7", "G7"],
  home: "C7",
};

// ---------------------------------------------------------------- the song

const tracks: Track[] = [
  // The front line
  ...leveled({ inst: "trumpetShort", gain: 2.2, pan: 0.1, reverb: 0.3, humanize: 0.12, lowpass: 3000, choke: true, label: "trumpet (lead)" }, trumpet),
  { inst: "trumpetShort", notes: trumpet2, gain: 1.8, pan: 0.3, reverb: 0.3, humanize: 0.12, lowpass: 3000, choke: true, label: "trumpet 2 (harmony, hits)" },
  { inst: "trumpetMute", notes: muted, gain: 3.4, pan: 0.35, reverb: 0.35, humanize: 0.12, lowpass: 2400, label: "trumpets (muted riffs)" },
  { inst: "clarinet", notes: clarinet, gain: 0.62, pan: -0.25, reverb: 0.32, humanize: 0.15, lowpass: 4000, label: "clarinet (obbligato)" },
  { inst: "clarinetShort", notes: clarinetShort, gain: 0.8, pan: -0.25, reverb: 0.3, humanize: 0.12, lowpass: 4000, choke: true, label: "clarinet (hits)" },
  { inst: "trombone", notes: early(tailgate), gain: 1.9, pan: -0.1, reverb: 0.3, humanize: 0.12, lowpass: 3000, label: "trombone (tailgate)" },
  // The sax and the low brass
  ...leveled({ inst: "sax", gain: 1, pan: 0.05, reverb: 0.35, humanize: 0.15, lowpass: 3600, label: "tenor sax (chorus)" }, sax),
  { inst: "sax", notes: saxCounter, gain: 0.7, pan: 0.2, reverb: 0.32, humanize: 0.15, lowpass: 3400, label: "tenor sax (countermelody)" },
  { inst: "saxShort", notes: saxShort, gain: 0.8, pan: 0.2, reverb: 0.3, humanize: 0.12, lowpass: 3600, choke: true, label: "tenor sax (hits)" },
  { inst: "trombone", notes: early(tromboneCounter), gain: 1.4, pan: -0.1, reverb: 0.3, humanize: 0.12, lowpass: 3000, label: "trombone (countermelody)" },
  { inst: "tromboneShort", notes: tromboneShort, gain: 1, pan: -0.1, reverb: 0.28, humanize: 0.12, lowpass: 4000, choke: true, label: "trombone (hits)" },
  ...euphonium(early(softLayer(euphCounter)), { gain: 4.5, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (counter, sax chorus)" }),
  ...euphonium(early(softLayer(euphCounterOut)), { gain: 6, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (counter, out-chorus)" }),
  ...euphonium(euphShort, { short: true, gain: 0.8, pan: 0.15, reverb: 0.28, humanize: 0.1, choke: true, label: "euphonium (hits)" }),
  { inst: "tubaShort", notes: sousaphone, gain: 0.4, pan: 0, reverb: 0.2, humanize: 0.1, highpass: 60, choke: true, label: "sousaphone" },
  // The piano break: the upright twice, a few cents apart.
  { inst: "piano", notes: detuned(pianoHigh, 4), gain: 0.085, pan: -0.2, reverb: 0.28, humanize: 0.2, lowpass: 5000, label: "piano (honky-tonk)" },
  { inst: "piano", notes: detuned(pianoHigh, -4), gain: 0.085, pan: 0.2, reverb: 0.28, humanize: 0.25, lowpass: 5000, label: "piano (honky-tonk)" },
  // Its crushed blue notes are too short to beat: one voice, at pitch.
  { inst: "piano", notes: pianoGrace, gain: 0.12, pan: 0, reverb: 0.28, humanize: 0.2, lowpass: 5000, label: "piano (honky-tonk)" },
  { inst: "piano", notes: pianoLow, gain: 0.07, pan: 0, reverb: 0.25, humanize: 0.2, lowpass: 4500, label: "piano (stride)" },
  // The rhythm section
  { inst: "ukulele", notes: uke, gain: 0.1, pan: 0.35, reverb: 0.18, humanize: 0.3, ring: 0.2, lowpass: 4500, label: "banjo (ukulele)" },
  { inst: "kick", notes: kick, gain: 0.75, pan: 0, reverb: 0.2, humanize: 0.1, highpass: 70, label: "bass drum" },
  { inst: "ride", notes: drumCymbal, gain: 5, pan: 0.05, reverb: 0.2, humanize: 0.2, lowpass: 4000, ring: 0.3, label: "bass drum's cymbal" },
  { inst: "snareOn", notes: snare, gain: 0.55, pan: -0.1, reverb: 0.22, humanize: 0.2, lowpass: 4500, label: "snare" },
  { inst: "snareRoll", notes: roll, gain: 0.45, pan: -0.1, reverb: 0.25, humanize: 0, lowpass: 4500, label: "snare roll" },
  { inst: "tambourineHit", notes: tambourine, gain: 4, pan: 0.25, reverb: 0.22, humanize: 0.2, lowpass: 4500, label: "tambourine" },
  { inst: "crash", notes: crash, gain: 0.5, pan: -0.25, reverb: 0.3, humanize: 0.05, lowpass: 5000, ring: 1.6 },
  // The crowd
  { inst: "claps", notes: claps, gain: 0.8, pan: -0.15, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "crowd (claps)" },
  // In the stop-time's silences the crowd keeps the beat, close and clear.
  { inst: "claps", notes: stopClaps, gain: 2, pan: 0.1, reverb: 0.35, humanize: 0.3, lowpass: 4000, label: "crowd (claps, stop-time)" },
  ...fadeOut({ inst: "cheer", notes: cheer, gain: 0.16, pan: 0.3, reverb: 0.15, humanize: 0, lowpass: 5000, label: "cheer" }, 1.2, 2.4, 4),
  { inst: "sawLead", patch: PEA_WHISTLE, notes: whistle, gain: 1, pan: 0.4, reverb: 0.35, humanize: 0, lowpass: 4000, label: "whistle" },
];

const song: Song = {
  name: "mardigras",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A street between balconies: open air, a little slap off the walls.
  reverb: { room: 0.5, damp: 0.5, width: 0.9, level: 0.65 },
  tracks,
};

export default song;
