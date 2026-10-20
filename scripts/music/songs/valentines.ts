// Valentine's Day: a Parisian valse musette with a romantic heart, for the candy-box boulevard
// (a café, a flower stall, the kissing bridge with its swans, a Ferris wheel at dusk). In the
// spirit of the café-musette records (a button accordion leading the valse, a violin and a
// clarinet answering it, a guitar's "pompe" and a plucked bass under them, a glockenspiel's
// sparkle) and of the 1950s romantic ballads (a crooning tenor sax over lush strings and a harp,
// the piano's fills, a French horn's answer): style only. Every line here is the theme, its
// chords, or figures built from the theme's own steps; no quoted melody.
//
// Time: the 6/8 theme becomes a valse without changing a note: each eighth is a beat of the waltz
// and each pulse (a dotted quarter) one waltz bar, "oom pah pah". The grid runs 240 eighths a
// minute (a waltz bar 0.75 s; a theme bar 1.5 s, 72,000 frames at 48 kHz). The slow dance in the
// middle stretches every theme eighth to 4/3 grid eighths: a 12/8 ballad at a pulse of 60, each
// theme bar 2 s, its eighths the triplet feel of a slow dance.
//
// 52 grid bars (78 s):
//    1–2    INTRO: the pompe (the guitar's bass note and chords, the plucked bass, the accordion's
//           left hand) on F Dm Gm C7; the accordion steps up E F G into the tune.
//    3–18   THE VALSE, the theme in F. A: the accordion sings the tune over the pompe, the
//           glockenspiel on its pulse notes two octaves up, the clarinet answering in the long
//           notes and taking the pickup in thirds under it. A': the violin answers, the
//           accordion's left hand joins the pompe. B: the violin takes the tune, the accordion
//           holding harmony under it on the pulses. A'': accordion and violin together, the
//           clarinet climbing C7 under the last held note. The valse lands home on F at bar 19's
//           downbeat: one chord, a bell, and
//    19     THE HOLD (one ballad pulse, 1 s): the harp sweeps up F7, the strings come in on it,
//           and F7 turns to B flat for
//    19⅔–40 THE SLOW DANCE, the theme in B flat: the tenor sax croons it an octave down (F3–D5,
//           the tenor's warm middle), each phrase a touch late, legato, the long notes leaned on,
//           a breath after each phrase's last long note (its pickups carried into the next
//           phrase); under it a soft string bed bowed legato (violins a third or more above
//           whatever it sings and clear of the piano's fills, the cellos' guide tones below), the
//           harp rolling in twelve-eight (clear of the sax, the horn and the euphonium), the bass
//           in one, a soft bass drum on the bar and the hi-hat's foot on
//           the slow backbeat (a rim click with it from A'). The piano's fills from high up in
//           the sax's long notes (A, A', B), the French horn's answers (A', A'' and the end),
//           the euphonium's counter-line in B where the cellos rest; a harp sweep into A''.
//           The last pulse turns F13 to C9, the valse's dominant, and the accordion steps up F G
//           into...
//   41–48   THE VALSE AGAIN (A A'), the whole café: accordion and violin on the tune (the violin
//           an octave up in A'), the clarinet in harmony under the long notes, the glockenspiel,
//           the pompe and a light kit (bass drum on one, a soft snare and the hat on two and
//           three).
//   49–52   THE TAG (A''), tender: the accordion on the tune with the glockenspiel and the clarinet
//           low under it, the pompe soft and no kit; it ends on C7, which leans back into the
//           intro's F.
//
// Register plan (low to high): bass F1–G2 (the firm pizzicato layer is recorded E1–E2; the soft
// one, used in the ballad, E1–B3) · guitar F2–F4 (four strings; the bass string F2–D3) · cellos
// F2–Eb3 · euphonium Eb3–Bb3 · horn G3–C4 (the recorded horn has nothing between C4 and D5) ·
// accordion left hand B2–A3 bass, A3–G#4 chords · accordion tune C4–A5, its B-section harmony
// under the violin F4–F5 · clarinet A3–Bb4 (answers), harmony under the tune in the second valse
// and the tag · sax F3–D5 · violin at the tune's pitch C4–A5, an octave up (C5–A6) in the second
// valse's A' · violins (section) Bb4–D6 · harp Bb2–C5, its sweeps F2–F5 · piano fills Eb5–D6 ·
// glockenspiel C6–A7.
//
// Mix (scripts/music/mix.ts, dB against the dry mix per 4-bar phrase): the lead within about 4 dB
// wherever it plays (the accordion 1-4; the violin's B section and its octave in the second valse
// 5; the sax 1-2); the answers 10-16 over a phrase (the clarinet, the violin), 6-12 in their own
// band while they play; the accordion's harmony under the violin 13; the pompe 8-17 (the guitar
// 8-13, the bass 13-18, the left hand 14-17); the glockenspiel 20-25 (5-11 in its own band, up
// where nothing else plays); in the slow dance the strings 10-14, the harp 13-16, the horn 11,
// the euphonium 12-13 and the piano's fills 12-13 (nothing within 9 dB of the sax; the horn and
// euphonium 9-10 under it in their own bands, so they read as answers, not shadows), its kit
// 28-33; the second valse's kit 23-30. Loudness per phrase (mastered, dBFS RMS): the valse -13
// to -15, the slow dance -15 to -17 (a step down of about 4 dB, as Thanksgiving's sax ballad
// sits against its trio), the whole cafe -11 to -13, the tag about -17, so the loop starts again
// softly. The accordion carries nearly all of the 2-8 kHz energy, so it is low-passed (the tune
// at 3 kHz, the tag 2.8, its harmony and left hand 2.6); the sax at 3.2, the violin at 3.5, the
// clarinet, horn, section violins and glockenspiel at 4, the harp and the cymbals at 3.5-5: the
// 2-8 kHz band is about -14.8 dB of the whole, among the darker songs (they run -12.2 to -20.2),
// and no one-second window of it is brighter than the brightest of theirs. Tuning as heard
// (scripts/music/tuning.ts): the sax within 0.2 cents, the piano 0.4, the horn 2.0, the euphonium
// 0.3; a few of the accordion's and the violin's one-eighth notes read 7-10 cents off over their
// first 0.2 s (those takes' attacks), which the sampler's per-length tuning does not reach.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Grid eighths a minute: the valse's beat (a waltz bar = 0.75 s; a theme bar = 72,000 frames). */
const BPM = 240;
const BARS = 52;
const LOOP = BARS * BAR;
/** Seconds per grid eighth. */
const EIGHTH = 60 / BPM;
/** C -> F for the valse, C -> B flat for the slow dance. */
const VALSE_KEY = -7;
const BALLAD_KEY = -2;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const pc = (m: number): number => ((Math.round(m) % 12) + 12) % 12;
const wrap = (t: number): number => ((t % LOOP) + LOOP) % LOOP;
const clampV = (v: number): number => Math.min(0.95, Math.max(0.08, v));

// ---------------------------------------------------------------- time

/**
 * A section of the song: the theme's eighths from theme bar `from` on, placed on the grid from
 * `start`, each lasting `per` grid eighths (1 in the valse, 4/3 in the slow dance).
 */
class Sec {
  constructor(
    readonly start: number,
    readonly per: number,
    readonly from = 1,
  ) {}

  /** Grid time of theme eighth b (0 = the first eighth of theme bar `from`). */
  at(b: number): number {
    return this.start + b * this.per;
  }

  /** Grid time of theme bar tb, eighth e. */
  bar(tb: number, e = 0): number {
    return this.at((tb - this.from) * BAR + e);
  }

  /** A note at theme bar tb, eighth e, lasting d theme eighths. */
  n(tb: number, e: number, d: number, n: string | number, v: number): Note {
    const t = this.bar(tb, e);
    return { t, d: this.bar(tb, e + d) - t, n: num(n), v };
  }
}

const VALSE1 = new Sec(12, 1); // theme bars 1–16
const HOLD = 108; // the cadence, one ballad pulse long
const BALLAD = new Sec(112, 4 / 3); // theme bars 1–16, slow
const VALSE2 = new Sec(240, 1); // theme bars 1–8
const TAG = new Sec(288, 1, 13); // theme bars 13–16

// ---------------------------------------------------------------- harmony

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const QUAL: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  "6": [0, 4, 7, 9],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  maj9: [0, 4, 7, 11, 2],
  "6/9": [0, 4, 7, 9, 2],
  m9: [0, 3, 7, 10, 2],
  "9": [0, 4, 7, 10, 2],
  "9sus": [0, 5, 7, 10, 2],
  "13": [0, 4, 7, 10, 2, 9],
};
interface Chord {
  name: string;
  root: number;
  /** Every pitch class a voicing may use (extensions included). */
  tones: number[];
  /** Root, third, fifth, seventh (or sixth): what the harp rolls through. */
  arp: number[];
  /** 3rd (or 4th) and 7th (or 6th, or the 5th of a plain triad). */
  guide: [number, number];
}
const chords = new Map<string, Chord>();
function chord(name: string): Chord {
  let c = chords.get(name);
  if (c) return c;
  const m = /^([A-G])(b|#)?(.*)$/.exec(name);
  const ints = m && QUAL[m[3]!];
  if (!m || !ints) throw new Error(`valentines: bad chord ${name}`);
  const root = (LETTER[m[1]!]! + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + 12) % 12;
  const rel = (i: number) => (root + i) % 12;
  const third = ints.includes(4) ? 4 : ints.includes(3) ? 3 : 5;
  const seventh = ints.find((i) => i === 10 || i === 11) ?? (ints.includes(9) ? 9 : 7);
  c = { name, root, tones: ints.map(rel), arp: [...new Set([0, third, 7, seventh].map(rel))], guide: [rel(third), rel(seventh)] };
  chords.set(name, c);
  return c;
}

const SUFFIX: Record<Quality, string> = { maj: "", min: "m", dom7: "7", min7: "m7", dim: "dim" };
/** The theme's chord for half bar h (0–31), moved by `semis`. */
const themeHalf = (h: number, semis: number): string => {
  const [root, q] = CHORDS[h]!;
  return FLAT[(LETTER[root]! + semis + 24) % 12]! + SUFFIX[q];
};

/** The chord of every stretch of the loop, in grid eighths. */
interface Seg {
  a: number;
  b: number;
  ch: Chord;
}
const SEGS: Seg[] = [];
const seg = (a: number, b: number, name: string) => SEGS.push({ a, b, ch: chord(name) });
/** A valse section's halves: the theme's chord per half bar. */
function themeSegs(sec: Sec, from: number, to: number, semis: number): void {
  for (let h = (from - 1) * 2; h < to * 2; h++) {
    const b = (h - (from - 1) * 2) * 3;
    seg(sec.at(b), sec.at(b + 3), themeHalf(h, semis));
  }
}
["F", "Dm", "Gm", "C7"].forEach((n, h) => seg(h * 3, h * 3 + 3, n)); // the intro's turnaround
themeSegs(VALSE1, 1, 16, VALSE_KEY);
seg(HOLD, BALLAD.start, "F7");
/**
 * The slow dance's chart, a chord per pulse in ballad colours: the theme's Bb Gm Eb F in the A
 * sections (maj7, 6, m7, m9, 9sus, 13), its Eb F Dm Gm Cm F in B. The last pulse turns to C9,
 * the valse's dominant, for its last two eighths.
 */
const CHART = [
  "Bbmaj7", "Bb6", "Gm7", "Gm9", "Ebmaj7", "Eb6", "F9sus", "F13", // A
  "Bb6/9", "Bbmaj7", "Gm9", "Gm7", "Cm9", "F13", "Bb6", "Bbmaj7", // A'
  "Ebmaj9", "Ebmaj7", "F9", "F13", "Dm7", "Gm9", "Cm9", "F13", // B
  "Bbmaj9", "Bbmaj7", "Gm9", "Gm7", "Cm9", "Cm7", "F13", "F13", // A''
];
CHART.forEach((n, p) => seg(BALLAD.at(p * 3), BALLAD.at(p === 31 ? 94 : p * 3 + 3), n));
seg(BALLAD.at(94), BALLAD.at(96), "C9");
themeSegs(VALSE2, 1, 8, VALSE_KEY);
themeSegs(TAG, 13, 16, VALSE_KEY);

function chordAt(t: number): Chord {
  const w = wrap(t);
  const s = SEGS.find((s) => w >= s.a - 1e-6 && w < s.b - 1e-6);
  if (!s) throw new Error(`valentines: no chord at ${t}`);
  return s.ch;
}

/** The pitch class `p` placed in [lo, hi], nearest to `near`. */
function place(p: number, lo: number, hi: number, near: number): number {
  let best = lo;
  let bestD = Infinity;
  for (let m = lo; m <= hi; m++) if (pc(m) === p && Math.abs(m - near) < bestD) [best, bestD] = [m, Math.abs(m - near)];
  return best;
}
/** Every tone of the chord from lo to hi (MIDI), ascending. */
function tonesIn(ch: Chord, lo: number, hi: number, classes = ch.tones): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (classes.includes(pc(m))) out.push(m);
  return out;
}
/**
 * Notes of `lines` sounding in [t, t + len), apart from one that only ends there: the sax's
 * legato lets each note run 0.15 past the next one's laid-back start, and that tail is not a
 * note the harmony has to make way for.
 */
const sounding = (lines: Note[][], t: number, len: number): number[] =>
  lines.flat().filter((n) => n.t < t + len - 0.01 && n.t + n.d > t + 0.4).map((n) => num(n.n));
/** A semitone (in any octave) between m and one of `others`. */
const rubs = (m: number, others: number[]): boolean => others.some((o) => [1, 11].includes((pc(m) - pc(o) + 12) % 12));

/**
 * `n` chord tones in [lo, hi]: distinct pitch classes, the guide tones first, rootless where it
 * can be (the bass has the root), no semitone inside and no close intervals low down, voice-led
 * from `prev`, and never a semitone in any octave against an `avoid` note (the tune).
 */
function voicing(ch: Chord, n: number, lo: number, hi: number, o: { prev?: number[]; avoid?: number[] } = {}): number[] {
  const cands = tonesIn(ch, lo, hi);
  let best: number[] = [];
  let bestCost = Infinity;
  const consider = (v: number[]) => {
    if (new Set(v.map(pc)).size < v.length) return;
    let cost = 0;
    for (const g of ch.guide) if (!v.some((m) => pc(m) === g)) cost += 3;
    if (v.some((m) => pc(m) === ch.root)) cost += 1;
    for (let i = 1; i < v.length; i++) {
      const gap = v[i]! - v[i - 1]!;
      if (gap === 1) cost += 6;
      if (gap === 2 && v[i - 1]! < midi("C4")) cost += 2;
      if (v[i - 1]! < midi("E3") && gap < 5) cost += 2;
    }
    for (const m of v) if (rubs(m, o.avoid ?? [])) cost += 10;
    if (o.prev?.length) {
      for (let i = 0; i < v.length; i++) cost += 0.3 * Math.abs(v[i]! - o.prev[Math.min(i, o.prev.length - 1)]!);
    } else cost += 0.1 * Math.abs(v.reduce((a, b) => a + b, 0) / v.length - (lo + hi) / 2);
    if (cost < bestCost) [best, bestCost] = [v, cost];
  };
  const walk = (start: number, acc: number[]) => {
    if (acc.length === n) return consider(acc);
    for (let i = start; i < cands.length; i++) walk(i + 1, [...acc, cands[i]!]);
  };
  walk(0, []);
  if (!best.length && n > 1) return voicing(ch, n - 1, lo, hi, o);
  return best;
}

/** A chord tone under `m` by one of `steps` semitones, the first that fits (never the same class). */
function under(m: number, ch: Chord, steps: number[]): number {
  for (const k of steps) {
    const c = m - k;
    if (ch.tones.includes(pc(c)) && pc(c) !== pc(m)) return c;
  }
  return m - 12;
}
/** Thirds first, then sixths (the accordion's harmony under the violin). */
const THIRDS = [3, 4, 8, 9, 5, 7];
/** Sixths first (the clarinet's warmer harmony under the tune). */
const SIXTHS = [8, 9, 3, 4, 5, 7];

// ---------------------------------------------------------------- the theme

interface Mel {
  t: number;
  d: number;
  n: number;
  v: number;
  tb: number;
  pos: number;
}
const THEME = melody();
/** Theme bars from..to in a section, transposed: grid time and length, theme bar and eighth. */
function tune(sec: Sec, from: number, to: number, semis: number): Mel[] {
  const out: Mel[] = [];
  for (const n of THEME) {
    const tb = Math.floor(n.t / BAR) + 1;
    if (tb < from || tb > to) continue;
    const pos = n.t - (tb - 1) * BAR;
    const t = sec.bar(tb, pos);
    out.push({ t, d: sec.bar(tb, pos + n.d) - t, n: num(n.n) + semis, v: n.v ?? 0.6, tb, pos });
  }
  return out;
}
/** A valse lead's touch: notes start `early` grid eighths ahead and let go `gap` before the next. */
function play(line: Mel[], early: number, gap: number, vel: (m: Mel) => number): Note[] {
  return line.map((m) => ({ t: m.t - early, d: Math.max(0.3, m.d - gap), n: m.n, v: clampV(vel(m)) }));
}
const pulse = (m: Mel) => m.pos % 3 === 0;

// ================================================================ the valse

// The accordion: the tune in A A' and A'' of the first valse, all of the second, the tag softly;
// in B it holds harmony under the violin on the pulses. Punchy and a little detached.
const accordion: Note[] = [];
const accordionSoft: Note[] = [];
const accordionHarmony: Note[] = [];
const accVel = (m: Mel, base: number) => base + (m.v - 0.55) * 0.6;
accordion.push(...play(tune(VALSE1, 1, 8, VALSE_KEY), 0.03, 0.12, (m) => accVel(m, 0.64)));
accordion.push(...play(tune(VALSE1, 13, 16, VALSE_KEY), 0.03, 0.12, (m) => accVel(m, 0.68)));
accordion.push(...play(tune(VALSE2, 1, 8, VALSE_KEY), 0.03, 0.12, (m) => accVel(m, 0.7)));
accordionSoft.push(...play(tune(TAG, 13, 16, VALSE_KEY), 0.03, 0.14, (m) => accVel(m, 0.52)));
// The pickups: up E F G into the first valse, F G into the second (over the ballad's C9).
accordion.push({ t: 9, d: 0.88, n: midi("E4"), v: 0.56 }, { t: 10, d: 0.88, n: midi("F4"), v: 0.58 }, { t: 11, d: 0.88, n: midi("G4"), v: 0.62 });
accordion.push({ t: 238, d: 0.88, n: midi("F4"), v: 0.6 }, { t: 239, d: 0.88, n: midi("G4"), v: 0.64 });
// B: harmony under the violin's tune, a third or a sixth below each pulse note, held to the next pulse.
for (const m of tune(VALSE1, 9, 12, VALSE_KEY).filter(pulse)) {
  accordionHarmony.push({ t: m.t - 0.02, d: 3 - 0.15, n: under(m.n, chordAt(m.t), THIRDS), v: clampV(accVel(m, 0.56)) });
}
// The cadence: the valse lands on F with one chord (the tune's C5 resolves up to the F above it).
accordion.push(...["F4", "A4", "C5", "F5"].map((n, k) => ({ t: HOLD + 0.01 * k, d: 2.6, n: midi(n), v: 0.66 - k * 0.03 })));

// The violin: answers in A', the tune in B, with the accordion in A''; the second valse's tune
// (an octave up in A'). A bow takes a moment to speak, so it starts a touch early.
const violin: Note[] = [];
const violinLoud: Note[] = [];
violin.push(
  VALSE1.n(6, 3, 1, "F5", 0.42), VALSE1.n(6, 4, 0.5, "E5", 0.4), VALSE1.n(6, 4.5, 0.5, "F5", 0.4), VALSE1.n(6, 5, 1, "A5", 0.44),
  VALSE1.n(8, 0, 1, "A4", 0.4), VALSE1.n(8, 1, 1, "C5", 0.42), VALSE1.n(8, 2, 1, "F5", 0.44),
  VALSE1.n(8, 3, 1, "C5", 0.42), VALSE1.n(8, 4, 1, "D5", 0.44), VALSE1.n(8, 5, 1, "E5", 0.46),
);
violinLoud.push(...play(tune(VALSE1, 9, 12, VALSE_KEY), 0.1, 0.1, (m) => 0.6 + (m.v - 0.55) * 0.5));
violin.push(...play(tune(VALSE1, 13, 16, VALSE_KEY), 0.1, 0.1, (m) => 0.42 + (m.v - 0.55) * 0.3));
violin.push({ t: HOLD - 0.08, d: 1.6, n: midi("A5"), v: 0.44 });
violin.push(...play(tune(VALSE2, 1, 4, VALSE_KEY), 0.1, 0.1, (m) => 0.44 + (m.v - 0.55) * 0.3));
violinLoud.push(...play(tune(VALSE2, 5, 8, VALSE_KEY).map((m) => ({ ...m, n: m.n + 12 })), 0.1, 0.1, (m) => 0.58 + (m.v - 0.55) * 0.4));

// The clarinet: answers in A, the pickups in thirds under the tune, the climb under the last
// held note; harmony a sixth or a third under the long notes in the second valse and the tag.
const clarinet: Note[] = [];
const clarinetUnder: Note[] = [];
const clarinetSoft: Note[] = [];
clarinet.push(
  VALSE1.n(2, 4, 1, "F4", 0.5), VALSE1.n(2, 5, 1, "E4", 0.48), VALSE1.n(3, 0, 2, "D4", 0.5),
  VALSE1.n(4, 3, 1, "C4", 0.48), VALSE1.n(4, 4, 1, "D4", 0.48), VALSE1.n(4, 5, 1, "E4", 0.5), VALSE1.n(5, 0, 2, "F4", 0.5),
  VALSE1.n(8, 3, 1, "A3", 0.48), VALSE1.n(8, 4, 1, "Bb3", 0.48), VALSE1.n(8, 5, 1, "C4", 0.5),
  VALSE1.n(16, 0, 1, "E4", 0.5), VALSE1.n(16, 1, 1, "G4", 0.5), VALSE1.n(16, 2, 1, "Bb4", 0.52),
  { t: HOLD - 0.05, d: 2.4, n: midi("A4"), v: 0.52 },
);
for (const m of tune(VALSE2, 1, 8, VALSE_KEY).filter((m) => m.d >= 2)) {
  clarinetUnder.push({ t: m.t - 0.05, d: m.d - 0.12, n: under(m.n, chordAt(m.t), SIXTHS), v: clampV(0.5 + (m.v - 0.55) * 0.4) });
}
for (const m of tune(TAG, 13, 16, VALSE_KEY).filter((m) => m.d >= 2)) {
  clarinetSoft.push({ t: m.t - 0.05, d: m.d - 0.12, n: under(m.n, chordAt(m.t), SIXTHS), v: clampV(0.4 + (m.v - 0.55) * 0.3) });
}

// The glockenspiel: the tune's pulse notes two octaves up, soft; a bell on the cadence.
const glock: Note[] = [];
for (const [sec, from, to, v] of [
  [VALSE1, 1, 8, 0.3],
  [VALSE1, 13, 16, 0.3],
  [VALSE2, 1, 8, 0.32],
  [TAG, 13, 16, 0.24],
] as [Sec, number, number, number][]) {
  for (const m of tune(sec, from, to, VALSE_KEY).filter(pulse)) glock.push({ t: m.t, d: 1, n: m.n + 24, v: v + (m.pos === 0 ? 0.03 : 0) });
}
glock.push({ t: HOLD, d: 1, n: midi("F7"), v: 0.4 });

// ---------------------------------------------------------------- the pompe

/** Every waltz bar of the valse sections, with its level (the first valse's A lighter, the tag soft). */
const waltzBars: { t: number; level: number }[] = [];
for (let h = 0; h < 36; h++) waltzBars.push({ t: h * 3, level: h < 4 ? 0.9 : h < 12 ? 0.85 : h < 28 ? 0.95 : 1 });
for (let h = 80; h < 104; h++) waltzBars.push({ t: h * 3, level: h < 96 ? 1.1 : 0.72 });

/** Guitar shapes on four strings, low to high: the bass string, then the chord. */
const SHAPES: Record<string, string[]> = {
  F: ["F2", "C3", "F3", "A3"],
  F7: ["F2", "C3", "Eb3", "A3"],
  Dm: ["D3", "A3", "D4", "F4"],
  Bb: ["Bb2", "F3", "Bb3", "D4"],
  C: ["C3", "G3", "C4", "E4"],
  C7: ["C3", "G3", "Bb3", "E4"],
  Gm: ["G2", "D3", "G3", "Bb3"],
  Am: ["A2", "E3", "A3", "C4"],
};
/** One choked track per string, so a string stops when it is struck again (across the seam too). */
const guitar: Note[][] = [[], [], [], []];
function strum(t: number, strings: number[], v: number): void {
  const sym = chordAt(t).name;
  const shape = SHAPES[sym];
  if (!shape) throw new Error(`valentines: no guitar shape for ${sym}`);
  strings.forEach((s, i) => guitar[s]!.push({ t: t + i * 0.035, d: 1, n: midi(shape[s]!), v: v - i * 0.02 }));
}
for (const { t, level } of waltzBars) {
  strum(t, [0], 0.56 * level);
  strum(t + 1, [1, 2, 3], 0.44 * level);
  strum(t + 2, [1, 2, 3], 0.38 * level);
}
strum(HOLD, [0, 1, 2, 3], 0.6); // the cadence

// The bass: the root on each pulse of the valse, the fifth on the second waltz bar where the chord
// holds; a note a pulse in the slow dance, soft.
const BASS_LO = midi("F1");
const BASS_HI = midi("G2");
const bass: Note[] = [];
const bassSoft: Note[] = [];
{
  let cur = midi("F1");
  for (const { t, level } of waltzBars) {
    const ch = chordAt(t);
    const prev = chordAt(t - 3);
    const moved = ch.root !== prev.root || t % 6 === 0;
    const n = moved ? place(ch.root, BASS_LO, BASS_HI, cur) : place((ch.root + 7) % 12, BASS_LO, BASS_HI, cur);
    bass.push({ t, d: 2.6, n, v: clampV(0.62 * level) });
    cur = n;
  }
  bass.push({ t: HOLD, d: 3.6, n: midi("F1"), v: 0.7 });
  for (let p = 0; p < 32; p++) {
    const t = BALLAD.at(p * 3);
    const ch = chordAt(t);
    const moved = p === 0 || chordAt(t - 1).root !== ch.root;
    const n = moved ? place(ch.root, BASS_LO, BASS_HI, cur) : place((ch.root + 7) % 12, midi("A1"), BASS_HI, cur);
    const last = p === 31;
    bassSoft.push({ t, d: last ? 1.8 : 3.8, n, v: 0.4 });
    if (last) bassSoft.push({ t: BALLAD.at(94), d: 2.4, n: place(0, BASS_LO, BASS_HI, n), v: 0.4 });
    cur = n;
  }
}

// The accordion's left hand: a bass note on each waltz bar, the chord on two and three (from the
// first valse's A' on, the second valse, the intro and the tag).
const vamp: Note[] = [];
for (const { t, level } of waltzBars) {
  if (t >= VALSE1.start && t < VALSE1.bar(5)) continue;
  const ch = chordAt(t);
  vamp.push({ t, d: 1.3, n: midi("B2") + ((ch.root - 11 + 24) % 12), v: clampV(0.54 * level) });
  for (const n of tonesIn(ch, midi("A3"), midi("G#4")).slice(0, 3)) {
    vamp.push({ t: t + 1, d: 0.75, n, v: clampV(0.44 * level) }, { t: t + 2, d: 0.75, n, v: clampV(0.4 * level) });
  }
}

// The kit, in the second valse only: bass drum on one, a soft snare and the closed hat on two and three.
const kick: Note[] = [];
const snare: Note[] = [];
const hat: Note[] = [];
for (const { t } of waltzBars.filter((w) => w.t >= VALSE2.start && w.t < TAG.start)) {
  kick.push({ t, d: 1, n: "C2", v: 0.3 });
  snare.push({ t: t + 1, d: 1, n: "D2", v: 0.26 }, { t: t + 2, d: 1, n: "D2", v: 0.3 });
  hat.push({ t: t + 1, d: 1, n: "F#2", v: 0.3 }, { t: t + 2, d: 1, n: "F#2", v: 0.27 });
}

// ================================================================ the slow dance

// The tenor sax: the theme an octave under the tune (F3–D5), close and laid back: each phrase a
// touch late, the notes within it legato (each held until the next, laid back too, has started),
// the long notes leaned on, a breath between the two-bar phrases: after the phrase's last long
// note, so the short pickups that follow it (bars 4, 8, 12, 14) carry into the next phrase as a
// singer's would, never chopped off before the downbeat.
const sax: Note[] = [];
{
  const line = tune(BALLAD, 1, 16, BALLAD_KEY).map((n) => ({ ...n, n: n.n - 12 }));
  const one = BALLAD.per;
  /** How late a note starts (grid eighths): phrase starts most, then the pickups, the offbeats, the pulses. */
  const layOf = (n: Mel): number => {
    const phraseStart = n.tb % 2 === 1 && n.pos === 0;
    const pickup = n.tb % 4 === 0 && n.pos >= 3 && n.d < one * 1.5;
    return phraseStart ? 0.2 : pickup ? 0.18 : n.pos % 3 === 0 ? 0.09 : 0.14;
  };
  const long = (n: Mel) => n.d >= 2 * one - 0.01;
  line.forEach((n, i) => {
    const next = line[i + 1];
    const restOfBar = line.slice(i + 1).filter((m) => m.tb === n.tb);
    const breath = !next || (n.tb % 2 === 0 && long(n) && !restOfBar.some(long));
    const lay = layOf(n);
    const end = next ? next.t + layOf(next) + 0.15 : n.t + n.d;
    const d = breath ? n.d - 0.6 : end - (n.t + lay);
    const lean = n.d >= 3 * one - 0.01 ? 0.06 : n.d >= 2 * one - 0.01 ? 0.03 : 0;
    sax.push({ t: n.t + lay, d, n: n.n, v: clampV(0.6 + (n.v - 0.55) * 0.5 + lean) });
  });
}

// The piano's fills from high up in the sax's long notes, on the chord: [theme bar, eighth, length, note].
const FILLS: [number, number, number, string][] = [
  [2, 3, 1, "D6"], [2, 4, 1, "Bb5"], [2, 5, 1, "A5"], [3, 0, 1.5, "G5"], // Gm9, over the held D4, into Eb
  [4, 0, 1, "C6"], [4, 1, 1, "Bb5"], [4, 2, 1.5, "G5"], // F9sus, over the held Bb3
  [8, 0, 1, "F5"], [8, 1, 1, "G5"], [8, 2, 1, "Bb5"], [8, 3, 2, "D6"], // Bb6, over the held Bb3
  [10, 3, 1, "A5"], [10, 4, 1, "G5"], [10, 5, 1.5, "Eb5"], // F13, over the held C4
];
const fills: Note[] = FILLS.map(([tb, e, d, n]) => BALLAD.n(tb, e, d, n, 0.42));

// The strings: a soft bed bowed legato (a tone the next chord keeps is tied, not re-bowed), the
// violins a third or more above whatever the sax sings (up to D6), the cellos' guide tones under
// it (F2–Eb3), none a semitone against any of its notes (the violins clear of the piano's fills
// too, which pass through their register); the cellos rest in B, where the euphonium sings. They
// come in on the hold's F7, under the harp's sweep.
const violins: Note[] = [];
const cellos: Note[] = [];
/** The longest a tied string note holds, in grid eighths (4 s: the recordings run 6 s or more). */
const MAX_TIE = 16;
function bow(list: Note[], t: number, len: number, notes: number[], v: number, stagger: number): void {
  notes.forEach((n, k) => {
    const held = list.find((o) => o.n === n && Math.abs(o.t + o.d - t) < 0.2 && t + len - o.t <= MAX_TIE);
    if (held) held.d = t + len - held.t;
    else list.push({ t: t + stagger * k, d: len - stagger * k, n, v });
  });
}
{
  // A stretch per bar, split where the root moves at the second pulse, plus the hold and the C9.
  const stretches: [number, number][] = [[HOLD, BALLAD.start]];
  for (let tb = 1; tb <= 16; tb++) {
    const a = BALLAD.bar(tb);
    const mid = BALLAD.bar(tb, 3);
    const b = tb === 16 ? BALLAD.at(94) : BALLAD.bar(tb + 1);
    if (chordAt(a).root !== chordAt(mid).root) stretches.push([a, mid], [mid, b]);
    else stretches.push([a, b]);
  }
  stretches.push([BALLAD.at(94), VALSE2.start]);
  let pv: number[] | undefined;
  let pcl: number[] | undefined;
  for (const [a, b] of stretches) {
    const ch = chordAt(a);
    const len = b - a;
    const tb = Math.floor((a - BALLAD.start) / (BAR * BALLAD.per)) + 1;
    const sung = sounding([sax], a, len);
    const top = sung.length ? Math.max(...sung) : midi("A4");
    const vv = voicing(ch, 3, Math.max(midi("Bb4"), top + 3), midi("D6"), { prev: pv, avoid: [...sung, ...sounding([fills], a, len)] });
    const v = a < BALLAD.start ? 0.3 : tb <= 4 ? 0.34 : tb <= 8 ? 0.38 : tb <= 12 ? 0.42 : 0.46;
    bow(violins, a, len, vv, v, 0.04);
    pv = vv;
    const inB = tb >= 9 && tb <= 12 && a >= BALLAD.start;
    if (!inB) {
      const cv = voicing(ch, 2, midi("F2"), midi("Eb3"), { prev: pcl, avoid: sung });
      bow(cellos, a, len, cv, a < BALLAD.start ? 0.34 : 0.4, 0.03);
      pcl = cv;
    } else pcl = undefined;
  }
}

/**
 * A harp string rings for many seconds: each note rings until the harmony moves to a chord it
 * would clash with (its pitch class isn't in the new chord), at most `max` seconds. One track per
 * ring time.
 */
function damped(track: Omit<SampledTrack, "notes">, notes: Note[], max: number): Track[] {
  const byRing = new Map<number, Note[]>();
  for (const n of notes) {
    let ring = max;
    for (const s of SEGS) {
      if (s.a <= n.t + 0.01 || (s.a - n.t) * EIGHTH >= max) continue;
      if (!s.ch.tones.includes(pc(num(n.n)))) {
        ring = Math.round((s.a - n.t) * EIGHTH * 100) / 100;
        break;
      }
    }
    byRing.set(ring, [...(byRing.get(ring) ?? []), n]);
  }
  return [...byRing].map(([ring, group]) => ({ ...track, notes: group, ring }));
}

// The French horn answers the sax's long notes in A', A'' and at the end, under them (G3–C4).
const HORN: [number, number, number, string][] = [
  [6, 3, 1, "Bb3"], [6, 4, 1, "A3"], [6, 5, 2, "G3"], // Gm7, under the held D4, into Cm9
  [14, 3, 1, "Bb3"], [14, 4, 2, "G3"], // Gm7, under D4 and Bb3
  [16, 1, 1, "C4"], [16, 2, 1, "A3"], [16, 3, 2.6, "G3"], // F13, under the held F4; G under the C9
];
const horn: Note[] = HORN.map(([tb, e, d, n]) => BALLAD.n(tb, e, d, n, 0.46));

// The euphonium's counter-line in B, where the cellos rest: the guide tones, Eb3–Bb3, resolving
// to Bb under A''.
const EUPH: [number, number, number, string][] = [
  [9, 0, 5.8, "G3"], [10, 0, 2.8, "A3"], [10, 3, 2.8, "Eb3"], [11, 0, 2.8, "F3"], [11, 3, 2.8, "Bb3"], [12, 0, 2.8, "Eb3"], [12, 3, 2.8, "A3"], [13, 0, 2.6, "Bb3"],
];
const euph: Note[] = EUPH.map(([tb, e, d, n]) => ({ ...BALLAD.n(tb, e, d, n, 0.5), t: BALLAD.bar(tb, e) + 0.05 }));

// The harp: rolling twelve-eight under the sax, a note each theme eighth: up from a low root
// through the chord, down again where the chord holds. Its tones are picked at each pulse, and
// again where the chord turns inside one (the C9 at the end): never a semitone against the sax,
// the horn, the euphonium or the accordion's pickups into the valse, and never doubling the sax's
// note. Sweeps up F7 into the slow dance and up F13 into its A''.
const harp: Note[] = [];
const harpSweeps: Note[] = [];
{
  let lastRoot = -1;
  let lastCh: Chord | undefined;
  let tones: number[] = [];
  let low = midi("Bb2");
  for (let e = 0; e < 96; e++) {
    const t = BALLAD.at(e);
    const ch = chordAt(t);
    const k = e % 3;
    if (k === 0 || ch !== lastCh) {
      const rest = (3 - k) * BALLAD.per;
      const sung = sounding([sax], t, rest);
      const avoid = [...sung, ...sounding([horn, euph, accordion], t, rest)];
      low = place(ch.root, midi("Bb2"), midi("A3"), low);
      const ok = (m: number) => !rubs(m, avoid) && !sung.some((s) => pc(s) === pc(m));
      tones = tonesIn(ch, low + 3, midi("C5"), ch.arp).filter(ok);
      if (tones.length < 2) tones = tonesIn(ch, low + 3, midi("C5"), ch.arp).filter((m) => !rubs(m, avoid));
      lastCh = ch;
    }
    const rising = k === 0 || ch.root !== lastRoot || e % 6 < 3;
    if (k === 0) lastRoot = ch.root;
    const n = rising ? (k === 0 ? low : (tones[k - 1] ?? tones[0] ?? low + 7)) : (tones[2 - k] ?? tones[0] ?? low + 7);
    harp.push({ t, d: BALLAD.per, n, v: k === 0 ? 0.54 : 0.46 });
  }
  const sweep = (end: number, names: string[]) => {
    const start = end - names.length * 0.25;
    names.forEach((n, i) => harpSweeps.push({ t: start + i * 0.25, d: 1, n: midi(n), v: 0.46 + i * 0.012 }));
  };
  sweep(BALLAD.start, ["F2", "A2", "C3", "Eb3", "F3", "A3", "C4", "Eb4", "F4", "A4", "C5", "Eb5", "F5"]);
  sweep(BALLAD.bar(13), ["F2", "A2", "C3", "Eb3", "G3", "A3", "C4", "Eb4", "G4", "A4", "C5", "D5", "F5"]);
}

// The slow dance's kit: a soft bass drum on each bar, the hi-hat's foot on the slow backbeat, a rim click with it from A'.
const kickSoft: Note[] = [];
const hatPedal: Note[] = [];
const rim: Note[] = [];
for (let tb = 1; tb <= 16; tb++) {
  kickSoft.push({ t: BALLAD.bar(tb), d: 1, n: "C2", v: 0.2 });
  hatPedal.push({ t: BALLAD.bar(tb, 3), d: 1, n: "G#2", v: 0.5 });
  if (tb >= 5) rim.push({ t: BALLAD.bar(tb, 3), d: 1, n: "D2", v: 0.3 });
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
 * rest made up by velocity.
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

const ACCORDION_DB = typicalDb("accordion", accordion);
const VIOLIN_DB = typicalDb("fiddle", [...violin, ...violinLoud]);
const CLARINET_DB = typicalDb("clarinet", clarinet);
const BASS_DB = typicalDb("bassPizz", bass);

// ================================================================ the song

const song: Song = {
  name: "valentines",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A café's back room, warm; the strings' sends make the slow dance lusher.
  reverb: { room: 0.6, damp: 0.6, width: 0.9, level: 0.85 },
  tracks: (
    [
      // The valse.
      ...leveled({ inst: "accordion", gain: 0.3, pan: -0.2, reverb: 0.25, humanize: 0.3, lowpass: 3000, label: "accordion" }, accordion),
      ...leveled({ inst: "accordion", gain: 0.2, pan: -0.2, reverb: 0.3, humanize: 0.3, lowpass: 2800, label: "accordion (tag)" }, accordionSoft, ACCORDION_DB),
      ...leveled({ inst: "accordion", gain: 0.11, pan: -0.2, reverb: 0.25, humanize: 0.3, lowpass: 2600, label: "accordion (harmony)" }, accordionHarmony, ACCORDION_DB),
      { inst: "accordion", notes: vamp, gain: 0.1, pan: -0.3, reverb: 0.2, humanize: 0.3, lowpass: 2600, label: "accordion (left hand)" },
      ...leveled({ inst: "fiddle", gain: 8, pan: 0.25, reverb: 0.3, humanize: 0.3, lowpass: 3500, label: "violin" }, violin),
      ...leveled({ inst: "fiddle", gain: 4.5, pan: 0.25, reverb: 0.3, humanize: 0.3, lowpass: 3500, label: "violin (tune)" }, violinLoud, VIOLIN_DB),
      ...leveled({ inst: "clarinet", gain: 1.6, pan: -0.35, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "clarinet" }, clarinet),
      ...leveled({ inst: "clarinet", gain: 0.7, pan: -0.35, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "clarinet (harmony)" }, clarinetUnder, CLARINET_DB),
      ...leveled({ inst: "clarinet", gain: 0.5, pan: -0.35, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "clarinet (tag)" }, clarinetSoft, CLARINET_DB),
      { inst: "glockenspiel", notes: glock, gain: 6, pan: 0.4, reverb: 0.35, humanize: 0.3, lowpass: 4000, ring: 1.2, label: "glockenspiel" },
      // The pompe: each guitar string rings until it is struck again.
      ...guitar.map((notes, s): Track => ({ inst: "guitar", notes, gain: 0.06, pan: 0.3, reverb: 0.2, humanize: 0.5, choke: true, ring: s === 0 ? 0.7 : 0.45, label: "guitar" })),
      ...leveled({ inst: "bassPizz", gain: 1.2, pan: 0, reverb: 0.1, humanize: 0.3, choke: true, highpass: 60, label: "bass" }, bass),
      ...leveled({ inst: "bassPizz", gain: 1.35, pan: 0, reverb: 0.15, humanize: 0.3, choke: true, ring: 1.6, highpass: 60, label: "bass (slow dance)" }, bassSoft, BASS_DB),
      { inst: "kick", notes: kick, gain: 0.7, pan: 0, reverb: 0.05, humanize: 0.3, highpass: 70, label: "kick" },
      { inst: "snare", notes: snare, gain: 0.22, pan: -0.1, reverb: 0.15, humanize: 0.4, lowpass: 3500, label: "snare" },
      { inst: "hatClosed", notes: hat, gain: 5, pan: 0.2, reverb: 0.1, humanize: 0.4, lowpass: 4500, label: "hi-hat" },
      // The slow dance.
      { inst: "sax", notes: sax, gain: 1.2, pan: 0, reverb: 0.25, humanize: 0.25, lowpass: 3200, label: "tenor sax" },
      { inst: "violins", notes: violins.filter((n) => n.t < BALLAD.bar(13)), gain: 1.4, pan: -0.3, reverb: 0.45, humanize: 0.15, lowpass: 4000, label: "violins" },
      { inst: "violins", notes: violins.filter((n) => n.t >= BALLAD.bar(13)), gain: 1.55, pan: -0.3, reverb: 0.45, humanize: 0.15, lowpass: 4000, label: "violins" },
      { inst: "cellos", notes: cellos, gain: 0.7, pan: 0.3, reverb: 0.4, humanize: 0.15, label: "cellos" },
      ...damped({ inst: "harp", gain: 0.68, pan: 0.35, reverb: 0.4, humanize: 0.2, lowpass: 5000, label: "harp" }, harp, 1.5),
      ...damped({ inst: "harp", gain: 0.85, pan: 0.35, reverb: 0.45, humanize: 0, lowpass: 5000, label: "harp (sweeps)" }, harpSweeps, 2),
      { inst: "piano", notes: fills, gain: 0.155, pan: 0.25, reverb: 0.35, humanize: 0.3, lowpass: 4500, label: "piano (fills)" },
      { inst: "horn", notes: horn, gain: 1.7, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4000, label: "horn" },
      ...euphonium(euph, { gain: 1.5, pan: 0.15, reverb: 0.35, humanize: 0.15 }),
      { inst: "kick", notes: kickSoft, gain: 1.27, pan: 0, reverb: 0.05, humanize: 0.3, highpass: 70, label: "kick (slow dance)" },
      { inst: "hatPedal", notes: hatPedal, gain: 3.1, pan: 0.2, reverb: 0.1, humanize: 0.4, lowpass: 4000, label: "hi-hat (foot)" },
      { inst: "rim", notes: rim, gain: 2, pan: -0.1, reverb: 0.2, humanize: 0.4, lowpass: 3500, label: "rim" },
    ] as Track[]
  ).map((tr) => ({ ...tr, notes: tr.notes.map((n) => ({ ...n, t: wrap(n.t) })) })),
};

export default song;
