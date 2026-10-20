// MLK Day: the theme as a 1960s gospel hymn, a dignified, hopeful build in the spirit of the
// church and soul records of the civil-rights years (a sanctuary on a January morning, a march, a
// candlelight vigil). Only the style is evoked: every line here is the theme, its chords, or
// figures built from them. No gospel song, hymn or freedom song is quoted, not even a phrase; the
// harmonies are the public-domain hymn idiom (plagal "amens", the I-I/3-vi walk, the 7sus
// dominant, the major turning minor) in gospel voicings.
//
// Time: the 6/8 theme becomes a slow gospel 12/8 without changing a note: each pulse (a dotted
// quarter) is one beat of a 12/8 bar, its three eighths the triplet, 72 pulses a minute (216
// eighths; a bar of the theme lasts 1.667 s, 80,000 frames). The backbeat (12/8's 2 and 4) is the
// second pulse of every theme bar. In E flat, lifting to F for the chorus: the piano's tune
// Bb4-G6 (hymn sopranos), the tenor sax's an octave under it (Bb3-G5), the chorus's soprano sax
// C4-A5. The harmony is the theme's own, a chord a pulse: Eb Eb/G Cm7 Cm7 Ab Ab/C Bb7sus Bb7 (A),
// Eb Eb/G Cm7 Cm7 Fm7 Bb7 Eb Eb/G (A'), Ab Abmaj7 Bb7sus Bb7 Gm7 Cm7 Fm7 Bb7 (B), Eb Eb/G Cm7 Cm7
// Fm7 Fm7 Bb7sus Bb7 (A''); the same two steps up in F.
//
// 50 bars (83.3 s):
//    1-4   THE INTRO: the piano alone, on its soft touch, plays the hymn's last line (the theme's
//          bars 13-16) in gospel voicings: the tune on top, two or three chord tones under it,
//          the left hand in octaves with a walk-up into the verse, a rolled Bb7 at the end.
//    5-12  VERSE 1 (A A'): the piano leads the tune, gospel fills in its long notes (turns up the
//          sixth and ninth, a slip into the third); the reed organ's bed swells in under it, the
//          upright bass in one from bar 7, the kick and the hi-hat's foot from A' (bar 9).
//   13-28  VERSE 2 (the whole theme): the tenor sax sings it, laid back and legato, over the
//          piano's 12/8 chug (chords on 1 and 3 of each triplet), the organ and the bass. CALL AND
//          RESPONSE: the horn section (trumpet, tenor sax, trombone, euphonium under them) answers
//          the sax's long notes with two-note punches (bars 14, 18), the piano with rolling fills
//          up high (16, 20), the French horn with warm two-note answers (22, 26, 28). The kit grows:
//          a cross-stick and the shuffle hat in A, the tambourine from A', and from B (bar 21) the
//          full backbeat: snare, the congregation's handclaps (two or three claps a hit) and the
//          tambourine on every second pulse.
//   29-30  THE LIFT: the bass walks Bb - B - C (Bb7, Bdim7, C7sus, C7), the section swells on the
//          new dominant, the trumpet climbs G - Bb - C, the piano runs up the C9 to D6, claps
//          on every pulse under a snare roll and a cymbal swell into
//   31-46  THE CHORUS, in F, the "congregation": the theme in block harmony on the soprano sax
//          (the tune), the tenor sax a third or sixth under it, the French horn, the trombone and
//          the euphonium on the bass, the trumpet punching the tune's pulses; the piano in filled
//          octaves, the organ in four voices, the ride, the full backbeat. The B section (39-42)
//          thins to the two saxes and the piano's octaves; A'' brings everything back.
//   47-50  THE AMEN AND THE TAG: the whole band lands on F (a crash, the piano's rolled chord),
//          then the plagal amen (Bb/F - F) softer; the organ turns the F minor (Fm7) and leans to
//          Bb7, and the piano's tender fill, Ab5 falling to the intro's G5, loops.
//
// Register plan (low to high): bass F1-G2 (the firm pizzicato layer is recorded E1-E2) ·
// euphonium Bb1-F3, the short pair under the punches Bb2-Eb3 · trombone Bb2-Bb3 (the chorus's
// baritone voice) · piano left hand Eb2-Eb3 (octaves) · horn F3-Eb4 (the recorded horn has nothing
// between C4 and D5) · organ Bb3-Bb4 in the verses, C4-F5 in the chorus · tenor sax Bb3-G5 (the
// tune), A3-F5 (the chorus harmony) · soprano sax C4-A5 · trumpet C4-C6 · piano tune Bb4-G6, the
// chorus octaves C4-A6, fills F5-Eb6.
//
// Mix (mix.ts, dB vs the mix per 4-bar phrase): the leads within 6 (the piano's tune in the intro
// and verse 1, the tenor in verse 2, the soprano in the chorus); the organ, bass and the harmony
// voices 8-16; the kick and snare 7-13, the cymbals 23-31; the handclaps and tambourine heard but
// under the snare. No two parts sound a minor second or ninth together (the voicings dodge the
// tunes, fills and inner voices, and drop a voice rather than rub). Everything
// bright is low-passed (the saxes 3.5-4 kHz, the trumpet 4, the cymbals, claps and tambourine
// 3-4, the organ 1.5), so the 2-8 kHz band sits with the darker songs. Tuning as heard (tuning.ts): every
// favourite within 5 cents.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type Song, type Track } from "../song";
import { EIGHTHS_PER_BAR, melody } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths a minute: each eighth is a triplet of the 12/8, each pulse one of its beats (72 a minute). */
const BPM = 216;
const BARS = 50;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;
/** C -> E flat (the verses) and C -> F (the chorus). */
const VERSE_KEY = -9;
const CHORUS_KEY = -7;

// Sections (first bars).
const INTRO = 1;
const V1 = 5;
const V2 = 13;
const LIFT = 29;
const CHORUS = 31;
const TAG = 47;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const pc = (m: number): number => ((Math.round(m) % 12) + 12) % 12;
const wrap = (t: number): number => ((t % LOOP) + LOOP) % LOOP;
/** Start of a 1-based bar plus `e` eighths. */
const at = (bar: number, e = 0): number => (bar - 1) * BAR + e;
/** The 1-based bar a time falls in. */
const barOf = (t: number): number => Math.floor(wrap(t) / BAR + 1e-9) + 1;
const clampV = (v: number): number => Math.min(0.95, Math.max(0.08, v));
const dB = (x: number): number => 10 ** (x / 20);
/** Deterministic 0..1 (same render every time). */
const hash = (i: number): number => {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------- the theme

type TuneNote = Note & { n: number; tb: number };
const THEME: TuneNote[] = melody().map((n) => ({ ...n, n: num(n.n), tb: Math.floor(n.t / BAR) + 1 }));
/** Theme bars from..to, transposed by `key` semitones, placed so theme bar `from` starts at song bar `bar`. */
const tuneAt = (from: number, to: number, bar: number, key: number): TuneNote[] =>
  THEME.filter((n) => n.tb >= from && n.tb <= to).map((n) => ({ ...n, n: n.n + key, t: n.t - at(from) + at(bar) }));

// ---------------------------------------------------------------- harmony (a chord a pulse)

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Chord tones as intervals: the core, the gospel colours an inner voice may add, the guide tones. */
const QUALITY: Record<string, { core: number[]; color: number[]; guide: [number, number] }> = {
  "": { core: [0, 4, 7], color: [9, 2], guide: [4, 9] },
  maj7: { core: [0, 4, 7, 11], color: [2], guide: [4, 11] },
  m7: { core: [0, 3, 7, 10], color: [2], guide: [3, 10] },
  "7sus": { core: [0, 5, 7, 10], color: [2], guide: [5, 10] },
  "7": { core: [0, 4, 7, 10], color: [2, 9], guide: [4, 10] },
  dim7: { core: [0, 3, 6, 9], color: [], guide: [3, 9] },
};
interface Chord {
  name: string;
  root: number;
  /** The bass note's pitch class (a slash chord's). */
  bass: number;
  core: number[];
  color: number[];
  guide: [number, number];
}
function chord(sym: string, key = 0): Chord {
  const m = /^([A-G])(b|#)?(maj7|m7|7sus|7|dim7)?(?:\/([A-G])(b|#)?)?$/.exec(sym);
  const q = m && QUALITY[m[3] ?? ""];
  if (!m || !q) throw new Error(`mlk: bad chord ${sym}`);
  const acc = (a?: string) => (a === "b" ? -1 : a === "#" ? 1 : 0);
  const root = pc(LETTER[m[1]!]! + acc(m[2]) + key);
  const bass = m[4] ? pc(LETTER[m[4]]! + acc(m[5]) + key) : root;
  const rel = (i: number) => pc(root + i);
  return { name: `${sym}${key ? `(${key})` : ""}`, root, bass, core: q.core.map(rel), color: q.color.map(rel), guide: [rel(q.guide[0]), rel(q.guide[1])] };
}
/** The theme's chords in gospel colours, in C: a chord per pulse. */
const CHART = [
  "C", "C/E", "Am7", "Am7", "F", "F/A", "G7sus", "G7", // A
  "C", "C/E", "Am7", "Am7", "Dm7", "G7", "C", "C/E", // A'
  "F", "Fmaj7", "G7sus", "G7", "Em7", "Am7", "Dm7", "G7", // B
  "C", "C/E", "Am7", "Am7", "Dm7", "Dm7", "G7sus", "G7", // A''
];
/** The song's chord per pulse (two a bar). */
const PULSES: Chord[] = [];
const pushChords = (syms: string[], key: number) => syms.forEach((s) => PULSES.push(chord(s, key)));
pushChords(CHART.slice(24, 32), VERSE_KEY); // the intro: the hymn's last line
pushChords(CHART.slice(0, 16), VERSE_KEY); // verse 1: A A'
pushChords(CHART, VERSE_KEY); // verse 2
pushChords(["Bb7", "Bdim7", "C7sus", "C7"], 0); // the lift
pushChords(CHART, CHORUS_KEY); // the chorus
pushChords(["F", "F", "Bb/F", "F", "Fm7", "Fm7", "Bb7sus", "Bb7"], 0); // the amen and the tag
if (PULSES.length !== BARS * 2) throw new Error(`mlk: ${PULSES.length} chords for ${BARS * 2} pulses`);
const chordAt = (t: number): Chord => PULSES[Math.floor(wrap(t) / 3)]!;

interface VoiceOpts {
  prev?: number[];
  /** Notes sounding over the voicing: no half step or minor ninth under one, no unison. */
  avoid?: number[];
  /** Lines in other octaves: no semitone against them in any octave. */
  avoidClass?: number[];
  ceil?: number;
}
/**
 * `n` chord tones in [lo, hi], each below `ceil`: distinct pitch classes, the guide tones first,
 * the colours (sixths, ninths) only when they cost nothing, voice-led from `prev`, never a half
 * step or minor ninth under an `avoid` note, and for `avoidClass` notes no semitone in any
 * octave. No minor seconds inside, nothing close low down (mud).
 */
function voicing(ch: Chord, n: number, lo: number, hi: number, o: VoiceOpts = {}): number[] {
  const solved = solve(ch, n, lo, hi, o);
  // Where every voicing of n voices rubs something (a tune's passing note against the chord's
  // third), one voice fewer and clean beats it: a real organist lifts a finger.
  if (solved.cost >= CLASH && n > 2) {
    const thinner = solve(ch, n - 1, lo, hi, o);
    if (thinner.cost < solved.cost) return thinner.best;
  }
  if (!solved.best.length && n > 1) return voicing(ch, n - 1, lo, hi, o);
  return solved.best;
}
/** The cost a voicing pays for a note under an `avoidClass` line; `avoid` rubs cost more. */
const CLASH = 8;
function solve(ch: Chord, n: number, lo: number, hi: number, o: VoiceOpts): { best: number[]; cost: number } {
  const cands: number[] = [];
  for (let m = lo; m <= hi; m++) {
    if ((ch.core.includes(pc(m)) || ch.color.includes(pc(m))) && (o.ceil === undefined || m < o.ceil)) cands.push(m);
  }
  let best: number[] = [];
  let bestCost = Infinity;
  const consider = (v: number[]) => {
    if (new Set(v.map(pc)).size < v.length) return;
    let cost = 0;
    for (const g of ch.guide) if (!v.some((m) => pc(m) === g)) cost += 3;
    for (const m of v) if (ch.color.includes(pc(m))) cost += 0.9;
    for (let i = 1; i < v.length; i++) {
      const gap = v[i]! - v[i - 1]!;
      if (gap === 1) cost += 6;
      if (gap === 2 && v[i - 1]! < midi("C4")) cost += 1.5;
      if (v[i - 1]! < midi("E3") && gap < 5) cost += 2;
    }
    for (const a of o.avoid ?? []) {
      for (const m of v) {
        if (a - m === 1 || a - m === 13 || m - a === 1) cost += 20;
        else if (a === m) cost += 4;
      }
    }
    for (const a of o.avoidClass ?? []) for (const m of v) if ([1, 11].includes((pc(m) - pc(a) + 12) % 12)) cost += CLASH;
    if (o.prev?.length) {
      const p = o.prev;
      for (let i = 0; i < v.length; i++) cost += 0.3 * Math.abs(v[i]! - p[Math.min(i, p.length - 1)]!);
    } else cost += 0.1 * Math.abs(v.reduce((a, b) => a + b, 0) / v.length - (lo + hi) / 2);
    if (cost < bestCost) [best, bestCost] = [v, cost];
  };
  const walk = (start: number, acc: number[]) => {
    if (acc.length === n) return consider(acc);
    for (let i = start; i < cands.length; i++) walk(i + 1, [...acc, cands[i]!]);
  };
  walk(0, []);
  return { best, cost: bestCost };
}

/** The pitch class `p` placed in [lo, hi], nearest to `near`. */
function place(p: number, lo: number, hi: number, near: number): number {
  let best = lo;
  let bestD = Infinity;
  for (let m = lo; m <= hi; m++) if (pc(m) === p && Math.abs(m - near) < bestD) [best, bestD] = [m, Math.abs(m - near)];
  return best;
}

/** Notes of `lines` sounding at any point of [t, t + len). */
const sounding = (lines: Note[][], t: number, len: number): number[] =>
  lines.flat().filter((n) => n.t < t + len - 0.01 && n.t + n.d > t + 0.01).map((n) => num(n.n));

/** Whether a note would sound a minor second or ninth under (or a half step over) anything in `lines` during [t, t + len). */
const sour = (m: number, lines: Note[][], t: number, len: number): boolean =>
  sounding(lines, t + 0.08, Math.max(0.1, len - 0.08)).some((o) => {
    const i = (((o - m) % 12) + 12) % 12;
    return i === 1 || i === 11;
  });

// ---------------------------------------------------------------- the dynamics

/** Velocity lift per bar: hushed intro, the verses building, the lift and chorus full, the tag hushed. */
function lift(bar: number): number {
  if (bar < V1) return -0.12;
  if (bar < V1 + 4) return 0;
  if (bar < V2) return 0.03;
  if (bar < V2 + 8) return 0.05;
  if (bar < LIFT) return 0.09;
  if (bar < CHORUS) return 0.12;
  if (bar < CHORUS + 8) return 0.14;
  if (bar < CHORUS + 12) return 0.1;
  if (bar < TAG) return 0.16;
  if (bar === TAG) return 0.16;
  if (bar === TAG + 1) return 0;
  return -0.1;
}

// ================================================================ the piano

const pTune: Note[] = []; // the tune
const pInner: Note[] = []; // voicings under it, its octave, grace notes
const pComp: Note[] = []; // the 12/8 chug under the sax
const pLeft: Note[] = []; // the left hand
const pFills: Note[] = []; // fills, runs, the rolled chords
/** A grace note's length, in eighths (about 45 ms). */
const GRACE = 0.16;

interface Touch {
  /** Chord tones under each pulse's note (the hymn's inner voices). */
  voices: number;
  /** The tune's octave under it. */
  octaves?: boolean;
  /** Gospel slips: a half step into the key's third on a pulse, into its fifth on a long note. */
  grace?: boolean;
  /** The soft touch (the piano's quiet layer). */
  soft?: boolean;
  /** The key's tonic pitch class, for the slips. */
  key: number;
}

/** The tune on the piano an octave above the theme's transposition: theme bars from..to at song bar `bar`. */
function pianoTune(from: number, to: number, bar: number, key: number, touch: Touch): void {
  let prev: number[] | undefined;
  for (const n of tuneAt(from, to, bar, key)) {
    const t = n.t;
    const m = n.n + 12;
    const b = barOf(t);
    const v = touch.soft ? clampV(0.38 + ((n.v ?? 0.6) - 0.55) * 0.3) : clampV(0.62 + ((n.v ?? 0.6) - 0.55) * 0.5 + lift(b));
    const d = n.d >= 3 ? n.d - 0.05 : n.d - 0.1;
    pTune.push({ t, d, n: m, v });
    const ch = chordAt(t);
    if (touch.octaves) pInner.push({ t: t + 0.008, d, n: m - 12, v: v - 0.1 });
    if (t % 3 === 0 && touch.voices > 0) {
      // The inner voices move with the pulse and hold through it.
      const lo = touch.octaves ? m - 10 : m - 11;
      const hi = touch.octaves ? m - 2 : m - 2;
      const vv = voicing(ch, touch.voices, lo, hi, { prev, ceil: m - 1 }).filter((x) => !touch.octaves || x !== m - 12);
      vv.forEach((x, k) => pInner.push({ t: t + 0.012 * (k + 1), d: 2.85, n: x, v: v - 0.15 - k * 0.01 }));
      prev = vv;
    }
    if (touch.grace) {
      const third = pc(touch.key + 4);
      const fifth = pc(touch.key + 7);
      if ((pc(m) === third && t % 3 === 0) || (pc(m) === fifth && n.d >= 3)) pInner.push({ t: t - GRACE, d: GRACE, n: m - 1, v: v - 0.16 });
    }
  }
}

const EB = pc(VERSE_KEY);
const F = pc(CHORUS_KEY);
// The intro: the hymn's last line, hushed. Verse 1: the tune with three voices under it.
pianoTune(13, 16, INTRO, VERSE_KEY, { voices: 2, soft: true, key: EB });
pianoTune(1, 4, V1, VERSE_KEY, { voices: 3, grace: true, key: EB });
pianoTune(5, 8, V1 + 4, VERSE_KEY, { voices: 3, grace: true, key: EB });
// The chorus: the tune in filled octaves (two chord tones inside the octave on the pulses).
pianoTune(1, 16, CHORUS, CHORUS_KEY, { voices: 2, octaves: true, grace: true, key: F });

/**
 * Gospel fills in the long notes, up high: [bar, eighth, note] runs in half-eighths; turns up to
 * the sixth and ninth over the held note, and a rolling fill while the sax holds a note.
 */
const FILLS: [number, number, string][] = [
  // Verse 1: in the piano's own long notes.
  [6, 4, "Bb5"], [6, 4.5, "C6"], [6, 5, "Eb6"], // Cm7, over the held G5
  [8, 1, "F5"], [8, 1.5, "Ab5"], [8, 2, "C6"], // Bb7sus, under the held Bb5
  [10, 4, "Eb6"], [10, 4.5, "D6"], [10, 5, "Bb5"], // Cm7, over the held C6
  [12, 1, "G5"], [12, 1.5, "Bb5"], [12, 2, "C6"], // Eb, over the held Eb5
  // Verse 2: answering the sax's held notes (Bb4 in 16, Eb4 in 20).
  [16, 0.5, "F5"], [16, 1, "Ab5"], [16, 1.5, "Bb5"], [16, 2, "C6"],
  [20, 0.5, "G5"], [20, 1, "Bb5"], [20, 1.5, "C6"], [20, 2, "Eb6"],
  // Verse 2's last bar: up the Bb7 into the lift.
  [28, 3.5, "D5"], [28, 4, "F5"], [28, 4.5, "Ab5"], [28, 5, "Bb5"], [28, 5.5, "D6"],
];
for (const [bar, e, n] of FILLS) pFills.push({ t: at(bar, e), d: 0.9, n: num(n), v: clampV(0.5 + lift(bar) * 0.5) });
// The lift's run: up the C9 (C D E G Bb) in half-eighths, C4 to D6, landing on the chorus (no A:
// the section holds the Bb).
["C4", "D4", "E4", "G4", "Bb4", "C5", "D5", "E5", "G5", "Bb5", "C6", "D6"].forEach((n, i) => pFills.push({ t: at(LIFT + 1, i * 0.5), d: 0.8, n: num(n), v: 0.56 + i * 0.015 }));
// The lift's first bar: Bb7 and Bdim7 struck on the pulses, the top line F5 held over both.
for (const [e, notes] of [[0, ["D4", "F4", "Ab4", "D5", "F5"]], [3, ["D4", "F4", "Ab4", "B4", "F5"]]] as [number, string[]][]) {
  notes.forEach((n, k) => pFills.push({ t: at(LIFT, e) + 0.014 * k, d: 2.8, n: num(n), v: 0.6 - k * 0.01 }));
}
/** A rolled chord: notes staggered by `roll` eighths, bottom up. */
function rolled(list: Note[], t: number, d: number, notes: string[], v: number, roll = 0.09): void {
  notes.forEach((n, k) => list.push({ t: t + roll * k, d: d - roll * k, n: num(n), v: v - k * 0.012 }));
}
// The intro's end: a rolled Bb7 on the last pulse, under the tune's F5.
rolled(pFills, at(INTRO + 3, 3), 2.8, ["D4", "F4", "Ab4", "D5"], 0.4);
// The amen: F rolled big, then Bb/F and F softer.
rolled(pFills, at(TAG), 5.6, ["F3", "A3", "C4", "F4", "A4", "C5", "F5"], 0.76, 0.07);
rolled(pFills, at(TAG + 1), 2.8, ["F3", "Bb3", "D4", "F4", "Bb4", "D5"], 0.5);
rolled(pFills, at(TAG + 1, 3), 2.8, ["F3", "A3", "C4", "F4", "A4", "C5"], 0.46);
// The tag: Fm7 tender, then Bb7sus and the fill that leans into the intro's G5 (Ab5 falling to it).
rolled(pFills, at(TAG + 2), 2.8, ["Ab3", "C4", "Eb4", "Ab4"], 0.4);
rolled(pFills, at(TAG + 2, 3), 2.8, ["Ab3", "C4", "Eb4", "G4"], 0.36);
rolled(pFills, at(TAG + 3), 1.4, ["Ab3", "C4", "Eb4"], 0.38);
for (const [e, n] of [[1, "F4"], [1.5, "Ab4"], [2, "Bb4"], [2.5, "C5"], [3, "D5"], [4, "F5"], [5, "Ab5"]] as [number, string][]) {
  pFills.push({ t: at(TAG + 3, e), d: e >= 3 ? 0.95 : 0.6, n: num(n), v: 0.4 + (e >= 3 ? 0.02 : 0) });
}

// The left hand: the bass note in octaves (Eb2-Eb3) on the pulse when it changes, else alone;
// with no bass player (the intro, verse 1's A) a walk into the next bass note on the third
// triplet (a scale step from below, else a half step; from above if that would rub the tune).
{
  const over = () => [pTune, pInner, pFills];
  let cur = midi("Eb2");
  for (let p = 0; p < BARS * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    if (bar === LIFT || bar === LIFT + 1 || (bar >= TAG && bar < TAG + 2)) continue; // the lift and amen are written out
    const ch = chordAt(t);
    const prevCh = chordAt(t - 3);
    const changed = p === 0 || prevCh.bass !== ch.bass;
    const root = place(ch.bass, midi("Eb2"), midi("Eb3"), cur);
    const alone = bar < V1 + 2;
    const tagging = bar >= TAG;
    const v = clampV((bar < V1 ? 0.4 : bar >= CHORUS ? 0.56 : 0.48) + (tagging ? -0.08 : 0));
    const d = alone || tagging ? 2.8 : bar >= CHORUS ? 1.4 : 2.6;
    if (changed || p % 2 === 0 || bar >= CHORUS) {
      pLeft.push({ t, d, n: root, v });
      if (changed || bar >= CHORUS) pLeft.push({ t: t + 0.01, d, n: root + 12, v: v - 0.06 });
    } else pLeft.push({ t, d, n: root, v: v - 0.04 });
    cur = root;
    if (!alone) continue;
    const next = chordAt(t + 3);
    if (next.bass === ch.bass) {
      pLeft.push({ t: t + 2, d: 0.9, n: place(pc(ch.root + 7), midi("Bb1"), midi("Bb2"), root), v: v - 0.08 });
      continue;
    }
    const target = place(next.bass, midi("Eb2"), midi("Eb3"), root);
    const scale = (m: number) => [0, 2, 4, 5, 7, 9, 11].includes(pc(m - EB));
    const below = scale(target - 2) ? target - 2 : target - 1;
    const above = scale(target + 2) ? target + 2 : target + 1;
    const pick = [below, above].find((m) => m !== root && !sour(m, over(), t + 2, 0.9)) ?? below;
    pLeft.push({ t: t + 2, d: 0.9, n: pick, v: v - 0.06 });
  }
}

// ================================================================ the tenor sax (verse 2)

// The tenor sings the theme an octave under the piano (Bb3-G5), close and laid back: each phrase
// starts a touch late, the notes within it legato, the long notes leaned on, a breath before the
// next phrase.
const saxLine: Note[] = [];
{
  const line = tuneAt(1, 16, V2, VERSE_KEY);
  const layOf = (n: TuneNote): number => {
    const phraseStart = n.tb % 2 === 1 && n.t % BAR === 0;
    const pickup = n.tb % 4 === 0 && n.t % BAR >= 3 && n.d === 1;
    return phraseStart ? 0.15 : pickup ? 0.13 : n.t % 3 === 0 ? 0.06 : 0.1;
  };
  line.forEach((n, i) => {
    const next = line[i + 1];
    const breath = !next || (next.tb % 2 === 1 && next.t % BAR === 0 && n.tb % 2 === 0);
    const lay = layOf(n);
    const end = next ? next.t + layOf(next) + 0.1 : n.t + n.d;
    const d = breath ? n.d - 0.4 : end - (n.t + lay);
    const lean = n.d >= 3 ? 0.06 : n.d === 2 ? 0.03 : 0;
    saxLine.push({ t: n.t + lay, d, n: n.n, v: clampV(0.6 + ((n.v ?? 0.6) - 0.55) * 0.5 + lean + lift(barOf(n.t)) * 0.4) });
  });
}

// The 12/8 chug under the sax (verse 2): a soft chord on 1 and 3 of each triplet, above the sax
// and never a half step against it, voice-led; the loud layer only from B.
{
  let prev: number[] | undefined;
  for (let p = (V2 - 1) * 2; p < (LIFT - 1) * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    const ch = chordAt(t);
    const v0 = 0.44 + lift(bar) * 0.5;
    const sung = sounding([saxLine], t, 3);
    const vv = voicing(ch, 3, midi("C4"), midi("C6"), { prev, avoid: sung, avoidClass: sung });
    prev = vv;
    const hits: [number, number, number][] = [[0, 1.3, 0.03], [2, 0.7, -0.03]];
    for (const [e, d, dv] of hits) vv.forEach((n, k) => pComp.push({ t: t + e + 0.01 * k, d, n, v: clampV(v0 + dv - k * 0.012) }));
  }
}

// ================================================================ the horn section

// Verse 2's punches: two-note answers in the sax's long notes, "doo-DAT" (the second accented),
// in Eb: [bar, eighth, trumpet, tenor, trombone, euphonium]. The euphonium's short pair sits under.
const PUNCHES: [number, number, string, string, string, string][] = [
  [14, 4, "Bb4", "G4", "Eb4", "C3"], [14, 5, "C5", "G4", "Eb4", "C3"], // Cm7, under the held G4
  [18, 4, "Eb5", "Bb4", "G3", "C3"], [18, 5, "Bb4", "G4", "Eb4", "C3"], // Cm7, under the held C5
];
const tptShort: Note[] = [];
const saxShort: Note[] = [];
const tbnShort: Note[] = [];
const euphShort: Note[] = [];
function punch(bar: number, e: number, tpt: string, ten: string, tbn: string, eu: string, v: number): void {
  const t = at(bar, e);
  tptShort.push({ t, d: 0.8, n: num(tpt), v });
  saxShort.push({ t: t + 0.01, d: 0.8, n: num(ten), v: v - 0.05 });
  tbnShort.push({ t: t + 0.015, d: 0.8, n: num(tbn), v: v - 0.05 });
  euphShort.push({ t: t + 0.02, d: 0.8, n: num(eu), v: v - 0.08 });
}
PUNCHES.forEach(([bar, e, tpt, ten, tbn, eu]) => punch(bar, e, tpt, ten, tbn, eu, e === 5 ? 0.74 : 0.56));
// The lift: the trumpet climbs G - Bb - C over the C7 while the section swells.
for (const [e, n, v] of [[0, "G5", 0.6], [2, "Bb5", 0.66], [4, "C6", 0.74]] as [number, string, number][]) tptShort.push({ t: at(LIFT + 1, e), d: 0.8, n: num(n), v });

// The French horn answers the sax, warm, in A' and A'': [bar, eighth, length, note].
const HORN: [number, number, number, string][] = [
  [22, 4, 1, "Ab3"], [22, 5, 1.2, "D4"], // Bb7, under the held F4
  [26, 4, 1.9, "Bb3"], // Cm7, under G4 then Eb4
  [28, 0.5, 2.2, "Ab3"], [28, 3, 2.6, "D4"], // Bb7sus, Bb7: into the lift
];
const horn: Note[] = HORN.map(([bar, e, d, n]) => ({ t: at(bar, e), d, n: num(n), v: 0.48 + lift(bar) * 0.3 }));

// The chorus in block harmony: the soprano sax on the tune (C4-A5), the tenor a third or sixth
// under it on a chord tone (voice-led, never doubling it), the horn (F3-Eb4) and the trombone
// (Bb2-Bb3) a chord tone a pulse, the euphonium on the bass note (Bb1-F3). In B the horn,
// trombone and euphonium rest. The trumpet punches the tune's pulses and the pickups.
const soprano: Note[] = [];
const tenorHarm: Note[] = [];
const hornPad: Note[] = [];
const tbnPad: Note[] = [];
const euph: Note[] = [];
{
  const line = tuneAt(1, 16, CHORUS, CHORUS_KEY);
  let prevA: number | undefined;
  line.forEach((n, i) => {
    const next = line[i + 1];
    const b = barOf(n.t);
    const inB = b >= CHORUS + 8 && b < CHORUS + 12;
    const v = clampV(0.62 + ((n.v ?? 0.6) - 0.55) * 0.5 + lift(b) * 0.5);
    const legato = next && next.t - n.t <= n.d + 0.01;
    const d = legato ? n.d + 0.06 : n.d - 0.15;
    soprano.push({ t: n.t, d, n: n.n, v });
    const ch = chordAt(n.t);
    // The tenor's harmony note: a chord tone 3-9 semitones under, voice-led, a third or sixth preferred.
    let bestA = n.n - 4;
    let bestCost = Infinity;
    for (let k = 3; k <= 9; k++) {
      const m = n.n - k;
      if (!ch.core.includes(pc(m)) || pc(m) === pc(n.n)) continue;
      const cost = (prevA === undefined ? 0 : 0.5 * Math.abs(m - prevA)) + (ch.guide.includes(pc(m)) ? 0 : 1) + ([3, 4, 8, 9].includes(k) ? 0 : 0.6);
      if (cost < bestCost) [bestA, bestCost] = [m, cost];
    }
    prevA = bestA;
    tenorHarm.push({ t: n.t + 0.01, d, n: bestA, v: v - 0.06 });
    if (!inB && (n.t % 3 === 0 || (n.tb % 4 === 0 && n.d === 1 && n.t % BAR >= 3))) tptShort.push({ t: n.t, d: 0.8, n: n.n, v: v - 0.02 });
  });
  // The pads, a chord tone a pulse, tied across pulses that keep the note.
  const tie = (list: Note[], t: number, len: number, m: number, v: number) => {
    const held = list.find((o) => o.n === m && Math.abs(o.t + o.d - t) < 0.15 && t + len - o.t <= 12);
    if (held) held.d = t + len - held.t;
    else list.push({ t, d: len, n: m, v });
  };
  let prevT: number[] | undefined;
  let prevB: number[] | undefined;
  let curE = midi("F2");
  for (let p = (CHORUS - 1) * 2; p < (TAG - 1) * 2; p++) {
    const t = p * 3;
    const b = barOf(t);
    if (b >= CHORUS + 8 && b < CHORUS + 12) {
      prevT = prevB = undefined;
      continue;
    }
    const ch = chordAt(t);
    const sung = sounding([soprano, tenorHarm], t, 3);
    const v = 0.5 + lift(b) * 0.5;
    const tv = voicing(ch, 1, midi("F3"), midi("Eb4"), { prev: prevT, avoidClass: sung });
    prevT = tv;
    if (tv[0] !== undefined) tie(hornPad, t, 2.9, tv[0], v);
    const bv = voicing(ch, 1, midi("Bb2"), midi("Bb3"), { prev: prevB, avoidClass: [...sung, ...tv] });
    prevB = bv;
    if (bv[0] !== undefined) tie(tbnPad, t, 2.9, bv[0], v - 0.02);
    const e = place(ch.bass, midi("Bb1"), midi("F3"), curE);
    curE = e;
    tie(euph, t, 2.9, e, v - 0.02);
  }
}
// The lift's swell: the section holds Bb7, Bdim7, C7sus, C7, re-struck louder each pulse.
for (const [i, [s, a, h, b, e]] of [["F5", "D5", "Ab3", "Bb2", "Bb1"], ["F5", "D5", "Ab3", "B2", "B1"], ["G5", "Bb4", "G3", "C3", "C2"], ["G5", "E5", "Bb3", "C3", "C2"]].entries()) {
  const t = at(LIFT) + i * 3;
  const v = 0.5 + i * 0.07;
  soprano.push({ t, d: 2.9, n: num(s!), v });
  tenorHarm.push({ t: t + 0.01, d: 2.9, n: num(a!), v: v - 0.04 });
  hornPad.push({ t: t + 0.02, d: 2.9, n: num(h!), v: v - 0.02 });
  tbnPad.push({ t: t + 0.02, d: 2.9, n: num(b!), v: v - 0.04 });
  euph.push({ t: t + 0.03, d: 2.9, n: num(e!), v: v - 0.04 });
}
// The amen: F, then the plagal Bb/F - F, the soprano C5 - D5 - C5 over the held F.
for (const [t, d, s, a, h, b, v] of [
  [at(TAG), 5.8, "C5", "A4", "C4", "F3", 0.78],
  [at(TAG + 1), 2.9, "D5", "Bb4", "Bb3", "F3", 0.56],
  [at(TAG + 1, 3), 2.7, "C5", "A4", "A3", "F3", 0.5],
] as [number, number, string, string, string, string, number][]) {
  soprano.push({ t, d, n: num(s), v });
  tenorHarm.push({ t: t + 0.01, d, n: num(a), v: v - 0.06 });
  hornPad.push({ t: t + 0.02, d, n: num(h), v: v - 0.06 });
  tbnPad.push({ t: t + 0.02, d, n: num(b), v: v - 0.08 });
}
euph.push({ t: at(TAG) + 0.03, d: 5.8, n: midi("F2"), v: 0.72 }, { t: at(TAG + 1) + 0.03, d: 5.7, n: midi("F2"), v: 0.46 });
tptShort.push({ t: at(TAG), d: 0.8, n: midi("F5"), v: 0.78 }, { t: at(TAG + 1, 3), d: 0.8, n: midi("F5"), v: 0.5 });

// ================================================================ the reed organ

// A bed of three voices (four in the chorus), re-struck each pulse (the takes stop dead past a
// second), voice-led, never a semitone against the tune in any octave, nor a half step or minor
// ninth under the piano's inner voices and fills or the tenor's harmony (one voice fewer instead).
// Each chord holds to the next strike (`ORGAN_HOLD`), and the instrument's 0.45 s release (its
// entry in instruments.ts) carries the old chord down through the new one's 90 ms attack, so the
// bed crossfades (with the recordings' quick release it dipped 9 dB at every strike: a tremolo,
// not a bed; held on past the strike instead, the old chord rubbed the next pulse's notes).
const organ: Note[] = [];
const ORGAN_HOLD = 3.05;
{
  let prev: number[] | undefined;
  const tunes = [saxLine, soprano, pTune, pFills];
  const inner = [pInner, pFills, tenorHarm];
  for (let p = (V1 - 1) * 2; p < BARS * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    const ch = chordAt(t);
    const chorus = bar >= LIFT && bar < TAG + 2;
    const n = chorus ? 4 : 3;
    const [lo, hi] = chorus ? [midi("C4"), midi("F5")] : [midi("Bb3"), midi("C5")];
    const v = bar < V1 + 4 ? 0.4 : bar < V2 ? 0.44 : bar < LIFT ? 0.5 : bar < TAG + 2 ? 0.58 : 0.38;
    const vv = voicing(ch, n, lo, hi, { prev, avoid: sounding(inner, t, 3), avoidClass: sounding(tunes, t, 3) });
    prev = vv;
    vv.forEach((m, k) => organ.push({ t: t + 0.02 * k, d: ORGAN_HOLD, n: m, v: v - k * 0.015 }));
  }
}

// ================================================================ the bass

const bass: Note[] = [];
const BASS_LO = midi("F1");
const BASS_HI = midi("G2");
{
  const over = [pTune, pInner, pComp, pFills, saxLine, soprano, tenorHarm, hornPad, tbnPad, horn, organ];
  let cur = midi("Eb2");
  const EB_SCALE = (m: number) => [0, 2, 4, 5, 7, 9, 11].includes(pc(m - EB));
  for (let p = (V1 + 1) * 2; p < (TAG + 3) * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    const ch = chordAt(t);
    const next = chordAt(t + 3);
    const up = lift(bar) * 0.4;
    if (bar === LIFT || bar === LIFT + 1 || bar >= TAG) continue; // written out below
    const root = place(ch.bass, BASS_LO, BASS_HI, cur);
    const busy = bar >= V2;
    const walkOn = bar >= V2 + 8;
    bass.push({ t, d: busy ? 1.9 : 2.8, n: root, v: 0.74 + up });
    cur = root;
    if (!busy) continue;
    // The third triplet: the fifth when the bass note stays, else a step into the next one
    // (a scale step from below, else a half step; from above where that would rub).
    if (next.bass === ch.bass) {
      if (walkOn || p % 2 === 1) bass.push({ t: t + 2, d: 0.9, n: place(pc(ch.root + 7), midi("A1"), BASS_HI, root), v: 0.62 + up });
      continue;
    }
    const target = place(next.bass, BASS_LO, BASS_HI, root);
    const below = EB_SCALE(target - 2) && walkOn ? target - 2 : target - 1;
    const above = EB_SCALE(target + 2) ? target + 2 : target + 1;
    const pick = [below, above].map((m) => Math.max(BASS_LO - 1, m)).find((m) => m !== root && !sour(m, over, t + 2, 0.9)) ?? target - 1;
    bass.push({ t: t + 2, d: 0.9, n: pick, v: 0.64 + up });
  }
  // The lift: Bb - B - C, and the walk C D E into F.
  bass.push({ t: at(LIFT), d: 2.8, n: midi("Bb1"), v: 0.8 }, { t: at(LIFT, 3), d: 2.8, n: midi("B1"), v: 0.8 });
  bass.push({ t: at(LIFT + 1), d: 2.8, n: midi("C2"), v: 0.82 }, { t: at(LIFT + 1, 3), d: 0.9, n: midi("C2"), v: 0.8 }, { t: at(LIFT + 1, 4), d: 0.9, n: midi("D2"), v: 0.78 }, { t: at(LIFT + 1, 5), d: 0.9, n: midi("E2"), v: 0.8 });
  // The amen and the tag: F held, the plagal, Fm7, then Bb under the piano's fill.
  bass.push({ t: at(TAG), d: 5.6, n: midi("F2"), v: 0.86 }, { t: at(TAG + 1), d: 2.8, n: midi("F2"), v: 0.64 }, { t: at(TAG + 1, 3), d: 2.8, n: midi("F2"), v: 0.56 });
  bass.push({ t: at(TAG + 2), d: 5.6, n: midi("F2"), v: 0.56 }, { t: at(TAG + 3), d: 5.6, n: midi("Bb1"), v: 0.5 });
}

// ================================================================ the drums

const kick: Note[] = [];
const snare: Note[] = [];
const rim: Note[] = [];
const hat: Note[] = [];
const hatFoot: Note[] = [];
const hatOpen: Note[] = [];
const ride: Note[] = [];
const crash: Note[] = [];
const swells: Note[] = [];
const roll: Note[] = [];
const claps: Note[] = [];
const tamb: Note[] = [];
const drumDb = new Map<Note, number>();
function hit(list: Note[], t: number, v: number, db = 0, n = "C4", d = 1): void {
  const note = { t, d, n, v };
  list.push(note);
  drumDb.set(note, db);
}
/** The congregation's handclaps: two or three claps a hit, a few ms apart, on the group-clap takes (the soft layer). */
function clap(t: number, db: number, count = 2): void {
  for (let i = 0; i < count; i++) hit(claps, t + (i ? 0.03 + 0.05 * hash(t * 7 + i) : 0), 0.2, db - i * 2.5);
}
type Feel = "none" | "soft" | "shuffle" | "backbeat" | "lift" | "chorus" | "amen";
function feelOf(bar: number): Feel {
  if (bar < V1 + 4) return "none";
  if (bar < V2) return "soft";
  if (bar < V2 + 8) return "shuffle";
  if (bar < LIFT) return "backbeat";
  if (bar < CHORUS) return "lift";
  if (bar < TAG) return "chorus";
  if (bar === TAG) return "amen";
  return "none";
}
for (let bar = 1; bar <= BARS; bar++) {
  const t = at(bar);
  const feel = feelOf(bar);
  const vary = (k: number) => Math.round((hash(bar * 11 + k) - 0.5) * 3) * 0.5;
  if (feel === "none") continue;
  if (feel === "amen") {
    hit(kick, t, 0.8, 0, "C2");
    hit(crash, t, 0.8, 0, "C#3");
    hit(kick, at(bar + 1, 3), 0.5, -6, "C2");
    continue;
  }
  if (feel === "soft") {
    hit(kick, t, 0.35, -6, "C2");
    hit(hatFoot, t + 3, 0.5, -3, "G#2");
    if (bar === V2 - 1) for (const [e, db] of [[4, -8], [5, -5]] as [number, number][]) hit(rim, t + e, 0.5, db, "D2");
    continue;
  }
  if (feel === "lift") {
    for (const e of [0, 3]) {
      hit(kick, t + e, 0.7, 0, "C2");
      clap(t + e, 0, 3);
    }
    if (bar === LIFT + 1) {
      for (const [e, db] of [[3, -6], [4, -3], [5, 0]] as [number, number][]) hit(snare, t + e, 0.75, db, "D2");
      hit(tamb, t + 2, 0.7, -2);
      hit(tamb, t + 4, 0.7, -1);
    } else hit(tamb, t + 3, 0.7, -2);
    continue;
  }
  const chorus = feel === "chorus";
  const back = feel === "backbeat" || chorus;
  const inB = chorus && bar >= CHORUS + 8 && bar < CHORUS + 12;
  /** B thins to the saxes and the piano: the kit sits back with them, so A'' lands harder. */
  const thin = inB ? -3 : 0;
  // The kick: one, and the third triplet of the first pulse (lightly) from the backbeat on.
  hit(kick, t, chorus ? 0.75 : 0.55, (chorus ? 0 : -2) + thin, "C2");
  if (back) hit(kick, t + 2, 0.4, -9 + vary(1), "C2");
  if (chorus && hash(bar * 3) < 0.5) hit(kick, t + 5, 0.4, -10, "C2");
  // The backbeat: a cross-stick in the shuffle, the snare and handclaps from B; the tambourine from A'.
  if (feel === "shuffle") hit(rim, t + 3, 0.5, -1 + vary(2), "D2");
  else {
    hit(snare, t + 3, chorus ? 0.72 : 0.6, (chorus ? 0 : -3) + thin + vary(2), "D2");
    clap(t + 3, (chorus ? 0 : -3) + thin, chorus ? 3 : 2);
    if (hash(bar * 5 + 1) < (chorus ? 0.45 : 0.25)) clap(t + 5, (chorus ? -6 : -8) + thin, 2);
  }
  if (bar >= V2 + 4) hit(tamb, t + 3, chorus ? 0.7 : 0.4, (chorus ? 4 : 6) + thin + vary(3));
  // The shuffle on the hat (1 and 3 of each triplet), the ride in the chorus's A sections; the
  // hat opens on the last triplet of a phrase.
  const cymbal = chorus && !inB ? ride : hat;
  for (const [e, db] of [[0, 0], [2, -7], [3, -2], [5, -6]] as [number, number][]) hit(cymbal, t + e, chorus ? 0.65 : 0.45, db + vary(4 + e) + (chorus ? 0 : -2) + thin * 2, cymbal === ride ? "D#3" : "F#2");
  if (bar % 4 === 0 && back && !inB) hit(hatOpen, t + 5, 0.5, -4, "A#2");
  // Fills into the lift and the amen.
  if (bar === LIFT - 1) for (const [e, db] of [[3, -5], [3.5, -8], [4, -3], [4.5, -6], [5, 0], [5.5, -4]] as [number, number][]) hit(snare, t + e, 0.7, db, "D2");
  if (bar === TAG - 1) for (const [e, db] of [[3, -4], [4, -2], [4.5, -5], [5, 0], [5.5, -3]] as [number, number][]) hit(snare, t + e, 0.75, db, "D2");
  if (bar === CHORUS || bar === CHORUS + 4 || bar === CHORUS + 12) hit(crash, t, 0.7, bar === CHORUS ? 0 : -4, "C#3");
}
// The snare roll under the lift, swelling; the cymbal swell peaks on the chorus's downbeat.
for (let i = 0; i < 4; i++) hit(roll, at(LIFT) + i * 3, 0.45 + i * 0.1, -9 + i * 3, "D2", 2.95);
const SWELL_PEAK = 1.1 / EIGHTH;
swells.push({ t: at(CHORUS) - SWELL_PEAK, d: 1, n: "C#3", v: 0.6 });

// ================================================================ evening out the bass

const zoneLevels = new Map<string, number>();
/** Peak 30 ms RMS (dB) of a note's recording over its first 0.35 s, round robins averaged. */
function zoneDb(name: InstrumentName, note: number, vel: number): number {
  const { note: zone, layer } = instrument(name).zoneFor(note, vel);
  const key = `${name}/${zone}/${layer}`;
  let level = zoneLevels.get(key);
  if (level === undefined) {
    const peaks = instrument(name)
      .zones.filter((z) => z.layer === layer && z.note === zone)
      .map(({ audio: { left, right, rate }, level: lv = 1 }) => {
        const w = Math.round(rate * 0.03);
        let peak = 0;
        for (let s = 0; s + w < Math.min(left.length, rate * 0.35); s += Math.round(w / 3)) {
          let sum = 0;
          for (let i = s; i < s + w; i++) sum += (left[i]! ** 2 + right[i]! ** 2) / 2;
          peak = Math.max(peak, sum / w);
        }
        return 10 * Math.log10(peak * lv ** 2 + 1e-12);
      });
    level = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    zoneLevels.set(key, level);
  }
  return level;
}

/**
 * Split a part into tracks that differ only in gain (the sampler has no per-note gain). `choke`
 * stops each note at the line's next note (at most the base's `ring`).
 */
function split(base: Omit<Track, "notes" | "gain">, notes: Note[], gainOf: (n: Note) => number, choke = false): Track[] {
  const starts = [...new Set(notes.map((n) => Math.round(wrap(n.t) * 1000) / 1000))].sort((a, b) => a - b);
  const ringOf = (n: Note) => {
    const t = wrap(n.t);
    const next = starts.find((s) => s > t + 0.1) ?? starts[0]! + LOOP;
    return Math.round((next - t) * EIGHTH * 1000) / 1000;
  };
  const groups = new Map<string, { gain: number; ring?: number; notes: Note[] }>();
  for (const n of notes) {
    const gain = Math.round(gainOf(n) * 1000) / 1000;
    const ring = choke ? Math.min(ringOf(n), base.ring ?? Infinity) : base.ring;
    const key = `${gain}/${ring}`;
    const g = groups.get(key) ?? { gain, ring, notes: [] };
    g.notes.push({ ...n, t: wrap(n.t) });
    groups.set(key, g);
  }
  return [...groups.values()].map(({ gain, ring, notes: ns }) => ({ ...base, gain, notes: ns, ...(ring === undefined ? {} : { ring }) }));
}

/** The bass evened to its typical recording level, in 1.5 dB steps. */
const bassRef = (() => {
  const levels = bass.map((n) => zoneDb("bassPizz", num(n.n), n.v ?? 0.7)).sort((a, b) => a - b);
  return levels[Math.floor(levels.length / 2)]!;
})();
const bassGain = (n: Note) => dB(Math.round((bassRef - zoneDb("bassPizz", num(n.n), n.v ?? 0.7)) / 1.5) * 1.5);
const drumGain = (base: number) => (n: Note) => base * dB(drumDb.get(n) ?? 0);
/** The intro's lift in dB (bars 1-4 played at -25 dBFS RMS without it, every other song's quietest stretch is -19 to -21; now -22, the verse's own start). */
const INTRO_DB = 3;
const introGain = (n: Note) => (barOf(n.t) < V1 ? dB(INTRO_DB) : 1);

// ================================================================ the song

const song: Song = {
  name: "mlk",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.8, damp: 0.5, width: 0.95, level: 0.9 },
  tracks: ([
    // The piano. The intro's four bars, the piano alone on its soft layer, sit INTRO_DB louder
    // than the same touch would later: hushed, but still the music (not a near-silent loop point).
    ...split({ inst: "piano", pan: 0.05, reverb: 0.28, humanize: 0.3, lowpass: 5000, label: "piano (tune)" }, pTune, (n) => 0.09 * introGain(n)),
    ...split({ inst: "piano", pan: 0.05, reverb: 0.28, humanize: 0.3, lowpass: 5000, label: "piano (voices)" }, pInner, (n) => 0.05 * introGain(n)),
    { inst: "piano", notes: pComp, gain: 0.045, pan: 0.1, reverb: 0.25, humanize: 0.3, lowpass: 4800, label: "piano (chug)" },
    ...split({ inst: "piano", pan: -0.12, reverb: 0.22, humanize: 0.3, lowpass: 4500, label: "piano (left hand)" }, pLeft, (n) => 0.035 * introGain(n)),
    ...split({ inst: "piano", pan: 0.2, reverb: 0.32, humanize: 0.3, lowpass: 4500, label: "piano (fills)" }, pFills, (n) => 0.07 * introGain(n)),
    // The reed organ.
    ...split({ inst: "reedOrgan", pan: -0.25, reverb: 0.35, humanize: 0.15, lowpass: 1500, label: "reed organ" }, organ, (n) => (barOf(n.t) < V2 ? 0.042 : 0.06)),
    // The upright bass.
    ...split({ inst: "bassPizz", pan: 0, reverb: 0.1, humanize: 0.3, highpass: 70, ring: 1.6, label: "bass" }, bass, (n) => (barOf(n.t) >= LIFT ? 0.8 : 0.63) * bassGain(n), true),
    // The tenor sax: the tune (verse 2), the chorus harmony and the punches.
    { inst: "sax", notes: saxLine, gain: 0.55, pan: 0, reverb: 0.25, humanize: 0.25, lowpass: 3500, label: "tenor sax (tune)" },
    { inst: "sax", notes: tenorHarm, gain: 0.4, pan: -0.15, reverb: 0.28, humanize: 0.2, lowpass: 3500, label: "tenor sax (harmony)" },
    { inst: "saxShort", notes: saxShort, gain: 0.4, pan: -0.15, reverb: 0.25, humanize: 0.3, lowpass: 4500, ring: 0.35, label: "tenor sax (punches)" },
    // The soprano sax: the chorus's tune.
    { inst: "sopranoSax", notes: soprano, gain: 0.75, pan: 0.1, reverb: 0.28, humanize: 0.2, lowpass: 4000, label: "soprano sax" },
    // The brass.
    { inst: "trumpetShort", notes: tptShort, gain: 0.8, pan: 0.25, reverb: 0.3, humanize: 0.3, lowpass: 4000, ring: 0.28, choke: true, label: "trumpet" },
    { inst: "tromboneShort", notes: tbnShort, gain: 0.5, pan: 0.3, reverb: 0.25, humanize: 0.3, ring: 0.4, label: "trombone (punches)" },
    { inst: "trombone", notes: tbnPad, gain: 0.7, pan: 0.3, reverb: 0.3, humanize: 0.15, lowpass: 3500, label: "trombone" },
    { inst: "horn", notes: [...horn, ...hornPad], gain: 0.6, pan: -0.25, reverb: 0.35, humanize: 0.15, lowpass: 4000, label: "horn" },
    ...euphonium(euphShort, { short: true, gain: 0.5, pan: 0.1, reverb: 0.2, humanize: 0.3, ring: 0.4 }),
    ...euphonium(euph, { gain: 1, pan: 0.1, reverb: 0.3, humanize: 0.15 }),
    // The kit.
    ...split({ inst: "kick", pan: 0, reverb: 0.06, humanize: 0.3, highpass: 70, label: "kick" }, kick, drumGain(1)),
    ...split({ inst: "snareOn", pan: -0.08, reverb: 0.2, humanize: 0.35, lowpass: 3500, label: "snare" }, snare, drumGain(1.15)),
    ...split({ inst: "rim", pan: -0.08, reverb: 0.2, humanize: 0.35, lowpass: 3500, label: "cross-stick" }, rim, drumGain(2.2)),
    ...split({ inst: "hatClosed", pan: 0.25, reverb: 0.12, humanize: 0.4, lowpass: 3000, label: "hi-hat" }, hat, drumGain(7)),
    ...split({ inst: "hatPedal", pan: 0.2, reverb: 0.1, humanize: 0.4, lowpass: 3000, label: "hi-hat (foot)" }, hatFoot, drumGain(3)),
    ...split({ inst: "hatOpen", pan: 0.25, reverb: 0.12, humanize: 0.4, lowpass: 3000, ring: 0.8, label: "hi-hat (open)" }, hatOpen, drumGain(2)),
    ...split({ inst: "ride", pan: 0.3, reverb: 0.15, humanize: 0.4, lowpass: 3500, ring: 1.2, label: "ride" }, ride, drumGain(3.5)),
    { inst: "crash", notes: crash.map((n) => ({ ...n })), gain: 0.5, pan: -0.25, reverb: 0.3, humanize: 0, lowpass: 4000, ring: 2.5, label: "crash" },
    { inst: "cymbalSwell", notes: swells, gain: 0.2, pan: -0.2, reverb: 0.3, humanize: 0, lowpass: 4000, ring: 3, label: "cymbal swell" },
    ...split({ inst: "snareRoll", pan: -0.08, reverb: 0.2, humanize: 0, lowpass: 3500, label: "snare roll" }, roll, drumGain(0.4)),
    ...split({ inst: "claps", pan: 0.15, reverb: 0.3, humanize: 0.5, lowpass: 3500, label: "handclaps" }, claps, drumGain(1.6)),
    ...split({ inst: "tambourineHit", pan: -0.3, reverb: 0.25, humanize: 0.4, lowpass: 3500, ring: 0.6, label: "tambourine" }, tamb, drumGain(4)),
  ] as Track[]).map((tr) => ({ ...tr, notes: tr.notes.map((n) => ({ ...n, t: wrap(n.t) })) })),
};

export default song;
