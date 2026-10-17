// Thanksgiving: the theme as a 1960s jazz piano trio and a 1950s autumn ballad, in the spirit of
// two records: the cozy piano trio of the Peanuts Thanksgiving special (a singing right hand with
// bluesy grace notes and crushed seconds, block-chord answers, a jazz waltz on an upright bass and
// soft drums) and Nat King Cole's "Autumn Leaves" (a warm, close crooner over a lush string bed,
// golden and wistful). Both records are copyrighted, so only their style, instruments and feel are
// evoked: every line here is the theme, its chords, or figures built from the theme's own steps.
// No Guaraldi melody, riff or ostinato, no "Autumn Leaves" melody and none of its chain of ii-V
// chords (the B section's iii-vi-ii-V is the theme's own harmony, IV V iii vi ii V).
//
// Time: the 6/8 theme becomes a jazz waltz without changing a note. Each eighth is a beat of the
// waltz and each pulse (a dotted quarter) a bar of it, played "in one": the theme's long-short
// (quarter, eighth) is the waltz tune's half note and quarter. 216 eighths a minute, a pulse of 72;
// a bar of the theme lasts 1.667 s (80,000 frames). The waltz's own eighths (our sixteenths, on the
// x.5s) swing to a triplet's last third (x.67). The ballad keeps the tempo and feels each pulse as
// one slow beat, a 12/8 ballad at 72. In B flat: the piano's tune F4-D6, the sax's an octave under
// it (F3-D5, the tenor's warm middle). The harmony is the theme's own, a chord per pulse in jazz
// colours (maj9, 6/9, m9, m11, 9sus4, 13), with the minor iv (Ebm6) before the last cadence.
//
// 48 bars (80 s):
//    1-16  THE TRIO. A: the piano's tune alone in the right hand, with bluesy grace notes (a half
//          step into the key's 3rd, the "blue" fifth into F), rootless left-hand voicings a chord
//          a pulse, the bass in one, the ride's jazz-waltz pattern (ONE, two-and, three, varied
//          stroke by stroke as a hand would) with the hi-hat's foot on two. A': crushed seconds
//          on the held notes and block-chord answers in the long ones. B: block chords, the left
//          hand doubling the tune an octave down (locked hands); the bass walks, ghost notes on
//          the snare. A'': the tune in octaves over the
//          jazz-waltz comp ("one, and-of-two"); its last bar answers up into a harp sweep and a
//          soft-mallet cymbal swell.
//   17-32  THE BALLAD. The tenor sax sings the theme an octave down, close and laid back: each
//          phrase a touch late, legato (each note held until the next, laid back too, has
//          started), the long notes leaned on, a breath between phrases. Under it a soft string
//          bed bowed legato (a tone the next chord keeps is tied, not re-bowed each pulse),
//          violins a third or more above whatever it sings, the cellos' guide tones below; the
//          piano's fills from up high in the sax's long notes (A, B), the French horn's answers
//          (A', the last bar), and in B the euphonium's guide-tone line where the cellos rest.
//          The bass plays a note a pulse, the hi-hat's foot marks the second pulse, the ride's
//          tip each bar from A'; a harp sweep and a cymbal swell lead into A'', and the snare and
//          a piano pickup into
//   33-48  THE TRIO BACK, warmer: the tune in filled octaves (a fourth or fifth inside them on the
//          pulses), the answers, the walking bass. THE BREAK (41-42): one hit together, then the
//          piano alone, its run up the dominant answered by the snare calling the band back in for
//          the B section's block chords (43-44). THE TAG (45-48): the piano's soft layer, crushed
//          seconds, the bass in one, the ride's tip on one and three, ending on the dominant that
//          leans back into bar 1.
//
// No brushes: the sample library has no brush recordings, and a synthesized swish would be a noise
// bed (the owner hears those as crackle). The soft kit is the ride cymbal's two softest stick tips
// (instruments.ts rideSoft), the hi-hat's foot, the snare's softest stroke as ghost notes
// (low-passed), a feathered kick, and the suspended cymbal's soft-mallet crescendo for the swells
// (cymbalSwell). With one take per dynamic, the ride is varied the way a hand varies it: each
// stroke up to 1 dB louder or softer, and now and then the skip moved to the "and" of three or
// left out; its lone strokes (the ballad's, the break's hit) ring on until the next instead of
// being cut.
//
// Register plan (low to high): bass F1-G2 (the firm pizzicato layer is recorded E1-E2, so the line
// stays within three semitones of it; fifths go above A1, where a phone can play them) · piano
// left hand Bb2-F4 under octaves, D3-Bb4 under a single line, always under the tune's lowest note
// sounding · piano tune F4-D6, its octave Bb3-Bb5, answers F4-G5 under the phrase's peak · ballad:
// cellos F2-Eb3 · euphonium D3-G3 · horn Bb3-D4 · sax F3-D5 · violins a third over the sax, up to
// D6 · the piano's fills F5-D6 · harp sweeps F3-C6. The tune is on the piano's loud layer (it
// sings over a left hand on the soft one), the tag on the soft layer (hushed, darker).
//
// Mix (mix.ts, dB vs the mix per 4-bar phrase): the leads 1-4 down where they play (the piano's
// tune 2-4, the sax 1); the piano's left hand 10-13, its answers 7-11, the block chords' inner
// notes 8-11; the bass 7-10 in the trio and 12-13 in the ballad; the ride 16-20, the hi-hat 16-19,
// the ghost notes 18-23, the kick 20-25; in the ballad the violins 12-14, the cellos 12-13, the
// piano's fills 13-16, the horn and the euphonium 13-14 in their phrases. In the band of the tune
// (250-3500 Hz) the left hand stays 8-12 dB under it, the answers and block chords 5-10 (the
// octave under the tune, part of it, 4-5); in the ballad nothing comes within 11 dB of the sax.
// No note sounds a minor second or ninth under another part: the bass's pickups, and the walking
// line's chromatic steps, come in from the other side or by a whole step where they would rub
// under the tune or a held note, and the strings steer clear of the sax. (Left as they are: the
// left hand's major seventh two octaves under the tune's root in the A sections, as a maj7 voicing
// has it, and the break's chromatic run.) Loudness per phrase rises from the first trio's A
// (-15.7 dB RMS) to the ballad (-13.5) and the trio's return (-14.0) and falls to the tag (-18.0),
// so the loop starts again softly. Bright parts are low-passed (the cymbals at 4 kHz, the snare
// at 3.5, the violins and the piano's inner parts at 4.5-5, the sax at 3.2), so the 2-8 kHz band
// is -17.7 dB of the whole, among the darker songs (they run -11.9 to -19.1; the string-band
// version was -11.3).
// Tuning as heard (tuning.ts): the piano within 2.2 cents, the sax 0.5, the horn 2.7, the
// euphonium 0.3, everything else within 2.6.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, transpose, type Note, type Song, type Track } from "../song";
import { EIGHTHS_PER_BAR, melody } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths a minute: each eighth is a beat of the waltz (216), each pulse a bar of it (72 a minute). */
const BPM = 216;
const BARS = 48;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;
/** C -> Bb major. */
const KEY = -2;
/** The waltz's swung eighths: an offbeat sixteenth of our grid (x.5) lands at x.67, a triplet's last third. */
const SWING = 0.17;

// Sections (first bars).
const BALLAD = 17;
const TRIO = 33;
const BREAK = 41;
const TAG = 45;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const pc = (m: number): number => ((Math.round(m) % 12) + 12) % 12;
const wrap = (t: number): number => ((t % LOOP) + LOOP) % LOOP;
/** Start of a 1-based bar plus `e` eighths. */
const at = (bar: number, e = 0): number => (bar - 1) * BAR + e;
/** The 1-based bar a time falls in. */
const barOf = (t: number): number => Math.floor(wrap(t) / BAR + 1e-9) + 1;
const clampV = (v: number): number => Math.min(0.95, Math.max(0.08, v));
const dB = (x: number): number => 10 ** (x / 20);
/** The swing: an offbeat sixteenth lands late. */
const swing = (t: number): number => (Math.abs(t - Math.floor(t) - 0.5) < 1e-6 ? t + SWING : t);
/** Deterministic 0..1 (same render every time). */
const hash = (i: number): number => {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------- the theme in B flat

type TuneNote = Note & { n: number; tb: number };
const TUNE: TuneNote[] = transpose(melody(), KEY).map((n) => ({ ...n, n: num(n.n), tb: Math.floor(n.t / BAR) + 1 }));
/** Theme bars from..to, placed so theme bar `from` starts at song bar `bar`. */
const tuneAt = (from: number, to: number, bar: number): TuneNote[] =>
  TUNE.filter((n) => n.tb >= from && n.tb <= to).map((n) => ({ ...n, t: n.t - at(from) + at(bar) }));

// ---------------------------------------------------------------- harmony (a chord per pulse)

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY: Record<string, { ints: number[]; guide: [number, number] }> = {
  maj9: { ints: [0, 4, 7, 11, 2], guide: [4, 11] },
  maj7: { ints: [0, 4, 7, 11], guide: [4, 11] },
  "6/9": { ints: [0, 4, 7, 9, 2], guide: [4, 9] },
  "6": { ints: [0, 4, 7, 9], guide: [4, 9] },
  m9: { ints: [0, 3, 7, 10, 2], guide: [3, 10] },
  m11: { ints: [0, 3, 7, 10, 2, 5], guide: [3, 10] },
  m7: { ints: [0, 3, 7, 10], guide: [3, 10] },
  m6: { ints: [0, 3, 7, 9], guide: [3, 9] },
  "9sus": { ints: [0, 5, 7, 10, 2], guide: [5, 10] },
  "9": { ints: [0, 4, 7, 10, 2], guide: [4, 10] },
  "13": { ints: [0, 4, 10, 2, 9, 7], guide: [4, 10] },
};
interface Chord {
  name: string;
  root: number;
  /** Every pitch class a voicing may use (extensions included). */
  tones: number[];
  /** 3rd (or 4th) and 7th (or 6th). */
  guide: [number, number];
  /** Root, third, fifth, seventh: what the bass walks through. */
  arp: number[];
}
function chord(name: string): Chord {
  const m = /^([A-G])([b#]?)(.*)$/.exec(name);
  const q = m && QUALITY[m[3]!];
  if (!m || !q) throw new Error(`thanksgiving: bad chord ${name}`);
  const root = (LETTER[m[1]!]! + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + 12) % 12;
  const rel = (i: number) => (root + i) % 12;
  const third = q.ints.includes(4) ? 4 : q.ints.includes(3) ? 3 : 5;
  const seventh = q.ints.find((i) => i === 10 || i === 11) ?? 9;
  return { name, root, tones: q.ints.map(rel), guide: [rel(q.guide[0]), rel(q.guide[1])], arp: [0, third, 7, seventh].map(rel) };
}
/**
 * The theme's chords in jazz colours, a chord per pulse: Bb Gm Eb F in the A sections, the B
 * section's Eb F Dm Gm Cm F, and the minor iv (Ebm6) before the last cadence.
 */
const CHART = [
  "Bbmaj9", "Bbmaj7", "Gm9", "Gm7", "Ebmaj9", "Eb6", "F9sus", "F13", // A
  "Bb6/9", "Bbmaj7", "Gm11", "Gm9", "Cm9", "F13", "Bb6/9", "Bbmaj7", // A'
  "Ebmaj9", "Ebmaj7", "F9", "F13", "Dm7", "Gm9", "Cm9", "F13", // B
  "Bbmaj9", "Bbmaj7", "Gm9", "Gm7", "Cm9", "Ebm6", "F9sus", "F13", // A''
].map(chord);
const chordAt = (t: number): Chord => CHART[Math.floor(wrap(t) / 3) % CHART.length]!;

interface VoiceOpts {
  prev?: number[];
  avoid?: number[];
  avoidClass?: number[];
  ceil?: number;
}
/**
 * `n` chord tones in [lo, hi], each below `ceil`: distinct pitch classes, the guide tones first,
 * rootless where it can be (the bass has the root), voice-led from `prev`, never a half step or
 * minor ninth under (or a half step over) an `avoid` note (the tune), and, for `avoidClass` notes
 * (a line in another octave), no semitone against them in any octave. No minor seconds inside,
 * and no close intervals low down (mud).
 */
function voicing(ch: Chord, n: number, lo: number, hi: number, o: VoiceOpts = {}): number[] {
  const cands: number[] = [];
  for (let m = lo; m <= hi; m++) if (ch.tones.includes(pc(m)) && (o.ceil === undefined || m < o.ceil)) cands.push(m);
  let best: number[] = [];
  let bestCost = Infinity;
  const consider = (v: number[]) => {
    if (new Set(v.map(pc)).size < v.length) return;
    let cost = 0;
    for (const g of ch.guide) if (!v.some((m) => pc(m) === g)) cost += 3;
    if (v.some((m) => pc(m) === ch.root)) cost += 1.5;
    for (let i = 1; i < v.length; i++) {
      const gap = v[i]! - v[i - 1]!;
      if (gap === 1) cost += 6;
      if (gap === 2 && v[i - 1]! < midi("C4")) cost += 1.5;
      if (v[i - 1]! < midi("E3") && gap < 5) cost += 2;
    }
    if (v.length >= 2 && v[v.length - 1]! - v[v.length - 2]! <= 2) cost += 1;
    for (const a of o.avoid ?? []) {
      for (const m of v) {
        if (a - m === 1 || a - m === 13 || m - a === 1) cost += 20;
        else if (a === m) cost += 4;
      }
    }
    for (const a of o.avoidClass ?? []) for (const m of v) if ([1, 11].includes((pc(m) - pc(a) + 12) % 12)) cost += 8;
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
  if (!best.length && n > 1) return voicing(ch, n - 1, lo, hi, o);
  return best;
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

// ---------------------------------------------------------------- the dynamics

/** Velocity lift per section: the first trio easing in, the second warmer, the tag hushed. */
function lift(bar: number): number {
  if (bar < 5) return -0.04;
  if (bar < 9) return -0.01;
  if (bar < BALLAD) return 0.02;
  if (bar < TRIO) return 0;
  if (bar < BREAK) return 0.04;
  if (bar < TAG) return 0.05;
  return -0.05;
}

// ================================================================ the piano

const rh: Note[] = []; // the tune
const rhIn: Note[] = []; // its octave, crushed seconds, grace notes
const blockIn: Note[] = []; // the block chords' inner notes
const answers: Note[] = []; // block-chord answers in the tune's long notes
const lh: Note[] = []; // the left hand
const lhTag: Note[] = []; // the left hand in the tag, hushed under the tune's soft touch
const fills: Note[] = []; // the ballad's fills, up high
/** A grace note's length, in eighths (about 45 ms). */
const GRACE = 0.16;

interface Touch {
  /** The tune in octaves (the octave under it, softer). */
  octaves?: boolean;
  /** Filled octaves: on the pulse notes a chord tone a fourth or fifth under the top sounds inside the octave. */
  filled?: boolean;
  /** Bluesy grace notes: a half step into the key's 3rd on a pulse, into its 5th on a long note. */
  grace?: boolean;
  /** Crushed seconds: a chord tone a whole step under a held note, struck with it. */
  crush?: boolean;
  /** Block chords: three chord tones under each note, the left hand doubling the tune an octave down. */
  block?: boolean;
}

/**
 * Up to three chord tones under `m` for a block chord, within its octave (the left hand doubles
 * the tune at the octave under them): none a half step under its neighbour, the top a third or
 * more under `m`.
 */
function blockUnder(m: number, ch: Chord, count = 3): number[] {
  const out: number[] = [];
  for (let k = m - 3; k >= m - 11 && out.length < count; k--) {
    if (!ch.tones.includes(pc(k)) || pc(k) === pc(m)) continue;
    const above = out.length ? out[out.length - 1]! : m;
    if (above - k === 1) continue;
    out.push(k);
  }
  return out;
}

const graceable = (n: TuneNote) => (pc(n.n) === 2 && n.t % 3 === 0) || (pc(n.n) === 5 && n.d >= 3);

/** The tune on the piano: theme bars from..to at song bar `bar`. */
function pianoTune(from: number, to: number, bar: number, touch: Touch): void {
  for (const n of tuneAt(from, to, bar)) {
    const { t, n: m } = n;
    // (The tag is played on the piano's soft layer: a darker, hushed touch.)
    const v = barOf(t) >= TAG ? 0.4 + ((n.v ?? 0.6) - 0.55) * 0.3 : clampV(0.62 + ((n.v ?? 0.6) - 0.55) * 0.5 + lift(barOf(t)));
    const d = n.d >= 3 ? n.d - 0.05 : n.d - 0.12;
    rh.push({ t, d, n: m, v });
    const ch = chordAt(t);
    if (touch.block) {
      blockUnder(m, ch).forEach((b, i) => blockIn.push({ t: t + 0.012 * (i + 1), d, n: b, v: v - 0.12 }));
      lh.push({ t: t + 0.006, d, n: m - 12, v: v - 0.14 });
    } else if (touch.octaves && m - 12 >= midi("Bb3")) {
      rhIn.push({ t: t + 0.008, d, n: m - 12, v: v - 0.1 });
      const inside = [5, 7, 4, 8].map((k) => m - k).find((k) => ch.tones.includes(pc(k)) && pc(k) !== pc(m));
      if (touch.filled && t % 3 === 0 && inside !== undefined) rhIn.push({ t: t + 0.014, d, n: inside, v: v - 0.16 });
    }
    if (touch.grace && graceable(n)) rhIn.push({ t: t - GRACE, d: GRACE, n: m - 1, v: v - 0.14 });
    else if (touch.crush && n.d >= 2 && !touch.block && ch.tones.includes(pc(m - 2))) rhIn.push({ t: t + 0.012, d: d - 0.4, n: m - 2, v: v - 0.2 });
  }
}

// Pass 1: the trio.
pianoTune(1, 4, 1, { grace: true });
pianoTune(5, 8, 5, { crush: true, grace: true });
pianoTune(9, 12, 9, { block: true });
pianoTune(13, 16, 13, { octaves: true, grace: true });
// Pass 3: the trio back, the tune in octaves; the break (41-42) alone; block chords; the tag.
pianoTune(1, 8, TRIO, { octaves: true, filled: true, grace: true });
pianoTune(9, 10, BREAK, { octaves: true, grace: true });
pianoTune(11, 12, BREAK + 2, { block: true });
pianoTune(13, 16, TAG, { crush: true, grace: true });

/**
 * Block-chord answers in the tune's long notes: [song bar, eighth, top] chords, each the top and
 * two chord tones under it, short and swung, the second a little longer. Built from the tune's own
 * steps (falling thirds and seconds), in its register, under its phrase's peak.
 */
const ANSWERS: [number, number, string][][] = [
  [[2, 4.5, "F5"], [2, 5, "D5"]], // Gm7, over the held D5
  [[4, 1.5, "Eb5"], [4, 2, "C5"]], // F9sus, over F5
  [[6, 4.5, "D5"], [6, 5, "F5"]], // Gm9, over G5
  [[8, 1.5, "D5"], [8, 2, "C5"]], // Bb6/9, over Bb4
  [[16, 1, "C5"], [16, 1.5, "Eb5"], [16, 2, "G5"]], // F9sus: up into the ballad
  [[34, 4.5, "F5"], [34, 5, "D5"]],
  [[36, 1.5, "Eb5"], [36, 2, "C5"]],
  [[38, 4.5, "D5"], [38, 5, "F5"]],
  [[40, 1.5, "D5"], [40, 2, "C5"]],
  [[48, 1.5, "C5"], [48, 2, "Bb4"]], // the tag, softly
];
for (const figure of ANSWERS) {
  figure.forEach(([bar, e, top], i) => {
    const t = swing(at(bar, e));
    const m = num(top);
    const last = i === figure.length - 1;
    const v = bar >= TAG ? 0.42 : clampV(0.58 + lift(bar) * 0.5 + (last ? 0.03 : 0));
    const d = last ? 0.9 : 0.4;
    answers.push({ t, d, n: m, v });
    blockUnder(m, chordAt(at(bar, e)), 2).forEach((b, k) => answers.push({ t: t + 0.01 * (k + 1), d, n: b, v: v - 0.1 }));
  });
}
// The break's run: up the dominant into the B section's next phrase (bar 43's F5), swung.
for (const [e, n] of [[3.5, "D5"], [4, "Eb5"], [4.5, "E5"], [5, "F5"], [5.5, "A5"]] as [number, string][]) {
  rh.push({ t: swing(at(BREAK + 1, e)), d: 0.4, n: num(n), v: 0.58 });
}

// The left hand: rootless voicings. Under a single line ("hold") a chord a pulse, held until the
// harmony moves (3-4 notes, D3-Bb4, under the tune); under octaves ("comp") the jazz waltz's
// "one, and-of-two" on every pulse, lower (Bb2-F4).
type Comp = "hold" | "comp" | "none";
function compOf(bar: number): Comp {
  if (bar >= 9 && bar <= 12) return "none"; // block chords
  if (bar >= BALLAD && bar < TRIO) return "none"; // the strings
  if (bar >= BREAK + 2 && bar < TAG) return "none"; // block chords
  if (bar <= 8 || bar >= TAG || (bar >= BREAK && bar < BREAK + 2)) return "hold";
  return "comp";
}
{
  let prev: number[] | undefined;
  const rhLines = [rh, rhIn, blockIn, answers];
  for (let p = 0; p < BARS * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    const style = compOf(bar);
    if (style === "none") {
      prev = undefined;
      continue;
    }
    const ch = chordAt(t);
    const changed = p % 2 === 0 || chordAt(t - 3).name !== ch.name;
    const above = sounding(rhLines, t, 3);
    const ceil = above.length ? Math.min(...above) : undefined;
    const v0 = clampV(0.4 + lift(bar) * 0.5);
    if (style === "hold") {
      if (!changed) continue;
      const hold = chordAt(t + 3).name === ch.name && p % 2 === 0 ? 5.7 : 2.75;
      const v = voicing(ch, ceil !== undefined && ceil < midi("C5") ? 3 : 4, midi("D3"), midi("Bb4"), { prev, avoid: sounding(rhLines, t, hold), ceil });
      v.forEach((n, k) => (bar >= TAG ? lhTag : lh).push({ t: t + 0.015 * k, d: hold, n, v: v0 - k * 0.015 }));
      prev = v;
    } else {
      const v = voicing(ch, 3, midi("Bb2"), midi("F4"), { prev, avoid: above, ceil });
      const answered = answers.some((a) => a.t >= t && a.t < t + 3);
      v.forEach((n, k) => lh.push({ t: t + 0.012 * k, d: answered ? 2.7 : 1.3, n, v: v0 + 0.02 - k * 0.015 }));
      if (!answered) v.forEach((n, k) => lh.push({ t: swing(t + 1.5) + 0.01 * k, d: 0.35, n, v: v0 - 0.04 - k * 0.015 }));
      prev = v;
    }
  }
}

// ================================================================ the drums

const rideNotes: Note[] = [];
/** The ride's lone strokes (the ballad's, the break's hit): they ring on until the next one. */
const rideLong: Note[] = [];
const hat: Note[] = [];
const ghost: Note[] = [];
const kick: Note[] = [];
const swells: Note[] = [];
const drumDb = new Map<Note, number>();
function hit(list: Note[], t: number, v: number, db = 0, n = "C4"): void {
  const note = { t, d: 1, n, v };
  list.push(note);
  drumDb.set(note, db);
}
/** pp and mp: the ride's two layers. */
const PP = 0.3;
const MP = 0.7;
type Feel = "light" | "groove" | "ballad" | "tag" | "break" | "into";
function feelOf(bar: number): Feel {
  if (bar <= 8) return "light";
  if (bar < BALLAD - 1) return "groove";
  if (bar === BALLAD - 1) return "into";
  if (bar < TRIO) return "ballad";
  if (bar === BREAK || bar === BREAK + 1) return "break";
  if (bar < TAG) return "groove";
  return "tag";
}
for (let p = 0; p < BARS * 2; p++) {
  const t = p * 3;
  const bar = barOf(t);
  const feel = feelOf(bar);
  const first = p % 2 === 0;
  if (feel === "light" || feel === "groove" || (feel === "into" && first)) {
    // The jazz waltz ride: ONE, two, (and), three; the hat's foot on two. A drummer's hand varies
    // it: each stroke a little louder or softer, and the skip now and then moved to the "and" of
    // three (into the next pulse) or left out.
    const groove = feel !== "light";
    const vary = (k: number) => Math.round((hash(p * 5 + k + 300) - 0.5) * 4) * 0.5;
    const skip = hash(p + 500);
    hit(rideNotes, t, groove ? MP : PP, (groove ? -2 : 0) + vary(0));
    hit(rideNotes, t + 1, PP, -2.5 + vary(1));
    if (skip < 0.8) hit(rideNotes, swing(t + 1.5), PP, -6 + vary(2));
    hit(rideNotes, t + 2, PP, -2 + vary(3));
    if (skip >= 0.8 && skip < 0.9) hit(rideNotes, swing(t + 2.5), PP, -7 + vary(4));
    hit(hat, t + 1, 0.5, groove ? 0 : -3, "G#2");
    if (groove) hit(hat, t + 2, 0.5, -7, "G#2");
    // Ghost notes on the snare: the "and" of three into the next pulse, now and then the "and" of two.
    if (groove && hash(p) < 0.55) hit(ghost, swing(t + 2.5), 0.1, -3 + hash(p + 99) * 3, "D2");
    if (groove && hash(p + 7) < 0.2) hit(ghost, swing(t + 1.5), 0.1, -6, "D2");
    if (!groove && bar >= 5 && hash(p) < 0.3) hit(ghost, swing(t + 2.5), 0.1, -7, "D2");
    if (first) hit(kick, t, 0.2, groove ? 0 : -4, "C2");
  } else if (feel === "tag") {
    hit(rideNotes, t, PP, -1);
    hit(rideNotes, t + 2, PP, -4);
    hit(hat, t + 1, 0.5, -4, "G#2");
  } else if (feel === "ballad") {
    // The ballad: the hat's foot on each bar's second pulse; the ride's tip once a bar from A'.
    if (!first) hit(hat, t, 0.5, -3, "G#2");
    if (first && bar >= BALLAD + 4) hit(rideLong, t, PP, -2);
  } else if (feel === "break" && bar === BREAK && first) {
    // The break: one hit together, then the piano alone; the snare calls the band back in.
    hit(rideLong, t, MP, 0);
    hit(kick, t, 0.2, 0, "C2");
  }
}
// The snare calls the band back after the break, and into the trio after the ballad.
for (const [e, db] of [[4.5, -6], [5, -4], [5.5, -2]] as [number, number][]) hit(ghost, swing(at(BREAK + 1, e)), 0.1, db, "D2");
for (const [e, db] of [[3.5, -9], [4, -7], [4.5, -5], [5, -4], [5.5, -2]] as [number, number][]) hit(ghost, swing(at(TRIO - 1, e)), 0.1, db, "D2");
// Soft-mallet cymbal swells into the ballad and its last A (peaking on the downbeat).
const SWELL_PEAK = 1.1 / EIGHTH;
for (const bar of [BALLAD, BALLAD + 12]) swells.push({ t: at(bar) - SWELL_PEAK, d: 1, n: "C#3", v: 0.6 });

// ================================================================ the ballad

// The tenor sax sings the theme an octave below the piano (F3-D5 in B flat: its warm middle),
// close and breathy, laid back: each phrase starts a touch late, the notes within it legato, the
// long notes leaned on, a breath before the next phrase.
const sax: Note[] = [];
{
  const line = tuneAt(1, 16, BALLAD).map((n) => ({ ...n, n: n.n - 12 }));
  /** How late a note starts: phrase starts most, then the pickups, the offbeats, the pulses. */
  const layOf = (n: TuneNote): number => {
    const phraseStart = n.tb % 2 === 1 && n.t % BAR === 0;
    // (A pickup into the next phrase, the bar's last three eighths of theme bars 4, 8, 12 and 16, drags most.)
    const pickup = n.tb % 4 === 0 && n.t % BAR >= 3 && n.d === 1;
    return phraseStart ? 0.16 : pickup ? 0.14 : n.t % 3 === 0 ? 0.07 : 0.11;
  };
  line.forEach((n, i) => {
    const next = line[i + 1];
    const breath = !next || (next.tb % 2 === 1 && next.t % BAR === 0 && n.tb % 2 === 0);
    const lay = layOf(n);
    // Legato: each note lasts until the next one (laid back too) has started.
    const end = next ? next.t + layOf(next) + 0.12 : n.t + n.d;
    const d = breath ? n.d - 0.45 : end - (n.t + lay);
    const lean = n.d >= 3 ? 0.06 : n.d === 2 ? 0.03 : 0;
    sax.push({ t: n.t + lay, d, n: n.n, v: clampV(0.6 + ((n.v ?? 0.6) - 0.55) * 0.5 + lean) });
  });
}

// The strings: a soft pad, the violins a third or more above whatever the sax sings under the
// chord (up to D6), the cellos' guide tones under it (F2-Eb3), each chord held as long as it lasts
// and voice-led, none a semitone against any of the sax's notes; the cellos rest in B, where the
// euphonium sings its line.
const violins: Note[] = [];
const cellos: Note[] = [];
/** The longest a tied string note holds, in eighths (4.4 s: the recordings run 6.4 s or more). */
const MAX_TIE = 16;
/**
 * Bow a chord legato: a note the last chord already holds is tied on (a section doesn't re-bow a
 * common tone each pulse), the others start, staggered, as the last chord's moving notes end.
 */
function bow(list: Note[], t: number, len: number, notes: number[], v: number, stagger: number): void {
  notes.forEach((n, k) => {
    const held = list.find((o) => o.n === n && Math.abs(o.t + o.d - t) < 0.2 && t + len - o.t <= MAX_TIE);
    if (held) held.d = t + len - held.t;
    else list.push({ t: t + stagger * k, d: len - stagger * k, n, v });
  });
}
{
  let pv: number[] | undefined;
  let pc2: number[] | undefined;
  for (let p = (BALLAD - 1) * 2; p < (TRIO - 1) * 2; p++) {
    const t = p * 3;
    const ch = chordAt(t);
    let len = 3;
    while (p + 1 < (TRIO - 1) * 2 && chordAt(t + len).name === ch.name && (p + 1) % 2 === 1 && len < 6) {
      len += 3;
      p++;
    }
    const sung = sounding([sax], t, len);
    const bar = barOf(t);
    const inB = bar >= BALLAD + 8 && bar < BALLAD + 12;
    const top = Math.max(...sung);
    const vv = voicing(ch, 3, Math.max(midi("Bb4"), top + 3), midi("D6"), { prev: pv, avoidClass: sung });
    bow(violins, t, len, vv, inB ? 0.4 : 0.34, 0.03);
    pv = vv;
    if (!inB) {
      const cv = voicing(ch, 2, midi("F2"), midi("Eb3"), { prev: pc2, avoidClass: sung });
      bow(cellos, t, len, cv, 0.4, 0.02);
      pc2 = cv;
    } else pc2 = undefined;
  }
}

// The French horn answers the sax's long notes in A' and at the end; the piano's fills (up high,
// soft, swung) answer it in A and B. [bar, eighth, length, note]
const HORN: [number, number, number, string][] = [
  [22, 4, 0.9, "D4"], [22, 5, 0.9, "C4"], [23, 0, 1.8, "Bb3"], // Gm9 -> Cm9, under the sax's G4 and Eb4
  [24, 1, 0.9, "D4"], [24, 2, 0.8, "C4"], // Bb6/9, over its Bb3
  [32, 1, 0.9, "C4"], [32, 2, 0.8, "Bb3"], // F9sus, under its F4
];
const horn: Note[] = HORN.map(([bar, e, d, n]) => ({ t: at(bar, e), d, n: num(n), v: 0.46 }));
const FILLS: [number, number, string][] = [
  [18, 4, "D6"], [18, 4.5, "Bb5"], [18, 5, "G5"], [18, 5.5, "F5"], // Gm7, over the sax's held D4
  [20, 1, "C6"], [20, 1.5, "Bb5"], [20, 2, "G5"], // F9sus, over its F4
  [26, 4, "A5"], [26, 4.5, "G5"], [26, 5, "F5"], [26, 5.5, "C5"], // F13, over its C4 (C, not D: the violins hold the Eb)
];
for (const [bar, e, n] of FILLS) fills.push({ t: swing(at(bar, e)), d: 0.9, n: num(n), v: 0.42 });
// The pickup back into the trio: the piano up the F13 into bar 33.
for (const [e, n] of [[4.5, "F4"], [5, "A4"], [5.5, "C5"]] as [number, string][]) fills.push({ t: swing(at(TRIO - 1, e)), d: 0.5, n: num(n), v: 0.46 });

// The euphonium's guide-tone line in B, where the cellos rest: G-F | Eb | F-D | Eb, resolving to
// the D of A''.
const EUPH: [number, number, number, string][] = [
  [25, 0, 2.8, "G3"], [25, 3, 2.8, "F3"], [26, 0, 5.7, "Eb3"], [27, 0, 2.8, "F3"], [27, 3, 2.8, "D3"], [28, 0, 5.7, "Eb3"], [29, 0, 2.6, "D3"],
];
const euph: Note[] = EUPH.map(([bar, e, d, n]) => ({ t: at(bar, e) + 0.05, d, n: num(n), v: 0.5 }));

// The harp sweeps up the dominant into the ballad, and into its last A: chord tones in sixteenths,
// each string damped on the downbeat it leads to.
const harp: Note[] = [];
for (const bar of [BALLAD, BALLAD + 12]) {
  const notes = ["F3", "A3", "C4", "Eb4", "G4", "A4", "C5", "Eb5", "F5", "A5", "C6"].map(num);
  const start = at(bar) - notes.length * 0.25;
  notes.forEach((n, i) => harp.push({ t: start + i * 0.25, d: 1, n, v: 0.45 + i * 0.02 }));
}

// ================================================================ the bass

const bass: Note[] = [];
const BASS_LO = midi("F1");
const BASS_HI = midi("G2");
/** The bass under each pulse: "one" (the waltz in one: a note a pulse), "walk" (three), the break's "hit", or "rest". */
type BassStyle = "one" | "walk" | "rest" | "hit";
function bassOf(bar: number): BassStyle {
  if (bar <= 8) return "one";
  if (bar === 16) return "one";
  if (bar < BALLAD) return "walk";
  if (bar < TRIO) return bar === TRIO - 1 ? "walk" : "one";
  if (bar === BREAK) return "hit";
  if (bar === BREAK + 1) return "rest";
  if (bar < TAG) return "walk";
  return "one";
}
{
  /** Every pitched part that rings over the bass. */
  const over = [rh, rhIn, blockIn, answers, lh, lhTag, fills, sax, violins, cellos, horn, euph, harp];
  /**
   * A bass note a minor second (ninth) under a note sounding over it in [t, t + len), or (strict)
   * a major seventh under one. (A stab whose tail just overlaps the note's first 20 ms is not heard as one.)
   */
  const sour = (m: number, t: number, len: number, strict: boolean): boolean =>
    sounding(over, t + 0.08, len - 0.08).some((o) => {
      const i = (((o - m) % 12) + 12) % 12;
      return i === 1 || (strict && i === 11);
    });
  let cur = midi("Bb1");
  for (let p = 0; p < BARS * 2; p++) {
    const t = p * 3;
    const bar = barOf(t);
    const style = bassOf(bar);
    const ch = chordAt(t);
    const next = chordAt(t + 3);
    const up = lift(bar) * 0.5;
    if (style === "rest") continue;
    if (style === "hit") {
      if (p % 2 === 0) bass.push({ t, d: 1.5, n: place(ch.root, BASS_LO, BASS_HI, cur), v: 0.8 });
      continue;
    }
    // The pulse's note: the root when the chord moves, else its fifth.
    const moved = p === 0 || chordAt(t - 3).root !== ch.root;
    // (A fifth goes above A1, where a phone can still play it.)
    const root = moved ? place(ch.root, BASS_LO, BASS_HI, cur) : place(ch.arp[2]!, midi("A1"), BASS_HI, cur);
    if (style === "one") {
      // The tune's two-bar phrases end with a pickup into the next (the walk's last step).
      const pickup = p % 4 === 3 && bar !== 16 && bar !== BALLAD - 1;
      if (bar === 16 && p % 2 === 1) continue; // bar 16's F rings under the harp
      const d = bar === 16 ? 5.7 : pickup ? 1.9 : 2.8;
      bass.push({ t, d, n: root, v: 0.76 + up });
      cur = root;
      if (pickup) {
        // A half step into the next root, from below or above, else a whole step: never a semitone
        // against anything ringing over it (in the ballad that is held: the sax, the strings).
        // (Failing that, a major seventh under one is the lesser rub.)
        const target = place(next.root, BASS_LO, BASS_HI, cur);
        const side = target > cur ? -1 : 1;
        const picks = [side, -side, 2 * side, -2 * side].map((k) => target + k).filter((m) => m !== cur && m >= BASS_LO - 1);
        const pick = picks.find((m) => !sour(m, t + 2, 0.95, true)) ?? picks.find((m) => !sour(m, t + 2, 0.95, false));
        bass.push({ t: t + 2, d: 0.95, n: pick ?? target + side, v: 0.66 + up });
      }
      continue;
    }
    // Walking: the root, a chord tone on the way, a half step into the next pulse's note (from
    // the other side, else a whole step, when the way in would rub a minor ninth under the tune or
    // a held note).
    const nextMoved = next.root !== ch.root;
    const target = nextMoved ? place(next.root, BASS_LO, BASS_HI, root) : place(next.arp[2]!, midi("A1"), BASS_HI, root);
    const dir = target === root ? (root > midi("C2") ? -1 : 1) : Math.sign(target - root);
    const approach =
      [target - dir, target + dir, target - 2 * dir, target + 2 * dir].find((m) => m !== root && m >= BASS_LO - 1 && m <= BASS_HI + 1 && !sour(m, t + 2, 0.95, false)) ??
      target - dir;
    let mid = root;
    let midCost = Infinity;
    for (const c of ch.arp.slice(1)) {
      for (let m = BASS_LO; m <= BASS_HI; m++) {
        if (pc(m) !== c || m === root || m === approach) continue;
        const between = (m - root) * dir > 0 && (approach - m) * dir > 0 ? 0 : 3;
        const cost = between + Math.abs(m - (root + approach) / 2) * 0.5 + (sour(m, t + 1, 0.95, false) ? 4 : 0);
        if (cost < midCost) [mid, midCost] = [m, cost];
      }
    }
    bass.push({ t, d: 0.95, n: root, v: 0.78 + up }, { t: t + 1, d: 0.95, n: mid, v: 0.66 + up }, { t: t + 2, d: 0.95, n: approach, v: 0.68 + up });
    cur = approach;
  }
}

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
 * stops each note at the line's next note (at most the base's `ring`), worked out on the whole
 * line, so the split tracks don't ring into each other.
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

/** The harp strings ring until the downbeat they lead to (plus a little). */
const harpRing = (n: Note) => Math.round(((Math.ceil(n.t / BAR + 1e-6) * BAR - n.t) * EIGHTH + 0.25) * 100) / 100;

// ================================================================ the song

const song: Song = {
  name: "thanksgiving",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.62, damp: 0.6, width: 0.9, level: 0.85 },
  tracks: ([
    // The piano.
    { inst: "piano", notes: rh, gain: 0.09, pan: 0.05, reverb: 0.25, humanize: 0.3, lowpass: 5500, label: "piano (tune)" },
    { inst: "piano", notes: rhIn, gain: 0.05, pan: 0.05, reverb: 0.25, humanize: 0.3, lowpass: 5000, label: "piano (right hand)" },
    { inst: "piano", notes: blockIn, gain: 0.03, pan: 0.05, reverb: 0.25, humanize: 0.3, lowpass: 5000, label: "piano (block chords)" },
    { inst: "piano", notes: answers, gain: 0.06, pan: 0.1, reverb: 0.25, humanize: 0.3, lowpass: 5000, label: "piano (answers)" },
    { inst: "piano", notes: lh, gain: 0.028, pan: -0.12, reverb: 0.22, humanize: 0.3, lowpass: 4500, label: "piano (left hand)" },
    { inst: "piano", notes: lhTag, gain: 0.019, pan: -0.12, reverb: 0.22, humanize: 0.3, lowpass: 4500, label: "piano (left hand)" },
    { inst: "piano", notes: fills, gain: 0.07, pan: 0.25, reverb: 0.35, humanize: 0.3, lowpass: 4500, label: "piano (fills)" },
    // The upright bass, its firm pizzicato (E1-E2 recorded, so the line stays F1-G2).
    ...split({ inst: "bassPizz", pan: 0, reverb: 0.1, humanize: 0.3, highpass: 70, ring: 1.6, label: "bass" }, bass, (n) => 0.5 * bassGain(n) * (n.t >= at(BALLAD) && n.t < at(TRIO - 1) ? 0.9 : 1), true),
    // The drums, soft.
    ...split({ inst: "rideSoft", pan: 0.3, reverb: 0.15, humanize: 0.4, lowpass: 4000, ring: 1.2, label: "ride" }, rideNotes, (n) => 4 * dB(drumDb.get(n) ?? 0)),
    ...split({ inst: "rideSoft", pan: 0.3, reverb: 0.15, humanize: 0.4, lowpass: 4000, ring: 2.5, label: "ride" }, rideLong, (n) => 4 * dB(drumDb.get(n) ?? 0), true),
    ...split({ inst: "hatPedal", pan: 0.2, reverb: 0.1, humanize: 0.4, lowpass: 4000, label: "hi-hat" }, hat, (n) => 3 * dB(drumDb.get(n) ?? 0)),
    ...split({ inst: "snareOn", pan: -0.1, reverb: 0.15, humanize: 0.4, lowpass: 3500, label: "snare (ghosts)" }, ghost, (n) => 4.5 * dB(drumDb.get(n) ?? 0)),
    ...split({ inst: "kick", pan: 0, reverb: 0.05, humanize: 0.3, highpass: 70, label: "kick" }, kick, (n) => 1 * dB(drumDb.get(n) ?? 0)),
    { inst: "cymbalSwell", notes: swells, gain: 0.18, pan: -0.25, reverb: 0.3, humanize: 0, lowpass: 5000, ring: 3, label: "cymbal swell" },
    // The ballad.
    { inst: "sax", notes: sax, gain: 0.55, pan: 0, reverb: 0.22, humanize: 0.25, lowpass: 3200, label: "tenor sax" },
    { inst: "violins", notes: violins, gain: 0.65, pan: -0.3, reverb: 0.45, humanize: 0.15, lowpass: 4500, label: "violins" },
    { inst: "cellos", notes: cellos, gain: 0.32, pan: 0.3, reverb: 0.4, humanize: 0.15, label: "cellos" },
    { inst: "horn", notes: horn, gain: 0.55, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4000, label: "horn" },
    ...euphonium(euph, { gain: 0.55, pan: 0.15, reverb: 0.35, humanize: 0.15 }),
    ...split({ inst: "harp", pan: 0.3, reverb: 0.4, humanize: 0, lowpass: 5000, label: "harp" }, harp, () => 0.3).flatMap((tr) =>
      [...new Set(tr.notes.map(harpRing))].map((ring) => ({ ...tr, ring, notes: tr.notes.filter((n) => harpRing(n) === ring) })),
    ),
  ] as Track[]).map((tr) => ({ ...tr, notes: tr.notes.map((n) => ({ ...n, t: wrap(n.t) })) })),
};

export default song;

