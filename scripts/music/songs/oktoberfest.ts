// Oktoberfest: the theme as Bavarian Blasmusik for the festival meadow under the Alps: the beer
// tent's band on its bandstand. A waltz (a Ländler at a brisk one-in-a-bar) led by the clarinet
// with a trumpet duet, the tuba's oom with the euphonium and trombone on the pah, French horn
// harmonies, the accordion and the glockenspiel, snare and bass drum; then the band turns to a
// polka (2/4 at the same pulse), stops for a toast (the crowd cheers, steins clink, a trumpet's
// call, three "Prost" hits of our own with the crowd clapping along) and strikes the waltz up
// again. Our theme only, our own arrangement: no drinking song is quoted.
//
// 38 bars of the theme's 6/8 at 192 eighths a minute (one bar 1.875 s = 90,000 frames; 71.25 s).
// Each half bar (a pulse of 64 a minute) is a bar of the waltz, played in one: the oom on its first
// eighth, pah pah on the other two. The polka keeps that pulse: each half bar is a 2/4 polka bar
// (a quarter of 128), its eighths three quarters of the grid's, so the bar lines the game switches
// tempo on stay the band's.
//
// Form (bars):
//    1–2   the band strikes up under the crowd's cheer: oom-pah-pah on F and C7, the clarinet's pickup
//    3–18  THE WALTZ, the theme in F. A: the clarinet, the glockenspiel on its pulse notes, soft horn
//          chords. A': the clarinet with a trumpet in thirds under it (the duet), the accordion along.
//          B: the euphonium's solo two octaves down (the baritone solo of a Bohemian band) with the
//          horns and accordion on the pah; the clarinet runs up into A'': everyone, the clarinet an
//          octave up, the trumpet duet on the tune, the horns, the whole glockenspiel. Its last bar
//          the band stops on C7 and the snare picks up the polka's beat.
//   19–34  THE POLKA, the theme in B flat as a 2/4 polka (each pulse of the theme a polka bar, its
//          short notes bounced: "ta ta-ta"). A: the clarinet and the accordion; A': the trumpet duet
//          joins; B: the trumpets over the horns' harmonies, euphonium runs where the tune holds;
//          A'': tutti with the glockenspiel. The tuba on one and two, the euphonium, trombone and
//          accordion on the off-beats, bass drum and snare, fills at the phrase ends.
//   35–38  THE TOAST: the band stops on B flat; the crowd cheers, steins clink, applause; a trumpet's
//          toast call over a snare roll; three hits with the crowd clapping and clinking along (B
//          flat, F, C7), a cheer, and the snare's pickup into the waltz at bar 1.
//
// Register plan (low to high): tuba oom C2–B2 (the staccato tuba's low B flat take reads flat) ·
// euphonium pah A2–A3 under the trombone's, its B solo Bb2–G3, its runs D2–A2 · horns Bb2–D4 (the
// recorded horn has nothing between C4 and D5) · accordion chords A3–A4, its tune at the lead's
// pitch · trumpet 2 a third or a sixth under trumpet 1, from C4 · the lead (clarinet, trumpet 1)
// C4–A5 in the waltz, F4–D6 in the polka; the clarinet an octave up for the waltz's last two bars
// (to C6) · glockenspiel an octave over the lead.

import { midi } from "../sampler";
import { euphonium, type Note, type Song, type Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths per minute: a pulse (dotted quarter) of 64. One bar = 90,000 frames at 48 kHz. */
const BPM = 192;
const BARS = 38;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;

// The sections' first bars (1-based).
const WALTZ = 3;
const POLKA = 19;
const TOAST = 35;

/** Start of bar b (1-based), in eighths. */
const bar = (b: number) => (b - 1) * BAR;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
/** Notes of one bar written as [eighth in the bar, length in eighths, note, velocity]. */
type Cell = [number, number, string | number, number];
const cells = (b: number, list: Cell[]): Note[] => list.map(([p, d, n, v]) => ({ t: bar(b) + p, d, n: num(n), v }));

// ---------------------------------------------------------------- the polka's time

/** Grid eighths per polka eighth: a polka bar (two quarters) is one pulse, three grid eighths. */
const PE = 0.75;
/** Polka bar `pb` (0–31 from the polka's start), polka eighth `pe` into it, in grid eighths. */
const polkaT = (pb: number, pe: number) => bar(POLKA) + pb * 3 + pe * PE;

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
  ...["F", "F", "C7", "C7"], // 1–2: the band strikes up
  ...themeHalves(-7), // 3–18: the waltz in F
  ...themeHalves(-2), // 19–34: the polka in B flat
  ...["Bb", "Bb", "Bb", "Bb", "Bb", "Bb", "Bb", "C7"], // 35–38: the toast
];
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

/** Chord tones from `lo` to `hi` (inclusive), ascending, but for `avoid` (notes an instrument plays out of tune). */
function tonesIn(c: Chord, lo: string | number, hi: string | number, avoid: number[] = []): number[] {
  const out: number[] = [];
  for (let m = num(lo); m <= num(hi); m++) if (c.pcs.includes(m % 12) && !avoid.includes(m)) out.push(m);
  return out;
}

/** The lowest note at or above `lo` with pitch class `pc`. */
const low = (pc: number, lo: string | number) => num(lo) + ((((pc - num(lo)) % 12) + 12) % 12);

/**
 * An n-voice voicing of `c` within [lo, hi] that moves as little as possible from `prev`: different
 * notes, always the 3rd, and the 7th of a seventh chord when there is room.
 */
function voicing(c: Chord, lo: string | number, hi: string | number, prev: number[] | null, n: number, avoid: number[] = []): number[] {
  const tones = tonesIn(c, lo, hi, avoid);
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
  if (!fit.length) return voicing(c, num(lo) - 1, num(hi) + 1, prev, n, avoid);
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

/** The theme from bar `start`, moved by `semis`. */
function tuneAt(start: number, semis: number): Mel[] {
  return THEME.map((n) => {
    const tb = Math.floor(n.t / BAR);
    return { t: bar(start + tb) + (n.t - tb * BAR), d: n.d, n: num(n.n) + semis, v: n.v ?? 0.7, tb, pos: n.t - tb * BAR };
  });
}

const WALTZ_TUNE = tuneAt(WALTZ, -7);

/** A note of the polka's tune: polka bar (0–31) and polka eighth in it (0–3); `d` in grid eighths. */
interface PNote {
  t: number;
  d: number;
  n: number;
  v: number;
  tb: number;
  pb: number;
  pe: number;
}

/**
 * The theme as a polka, moved by `semis`: each pulse (three eighths) becomes a 2/4 bar of four polka
 * eighths. Long-short becomes a quarter and a bounced pair of eighths ("ta ta-ta"), a held note a
 * half note, three eighths two eighths and a quarter, short-long an eighth and a dotted quarter.
 */
function polkaTune(semis: number): PNote[] {
  const out: PNote[] = [];
  for (let pb = 0; pb < 32; pb++) {
    const tb = Math.floor(pb / 2);
    const notes = THEME.filter((n) => Math.floor(n.t / 3) === pb).map((n) => ({ pos: n.t - pb * 3, d: n.d, n: num(n.n) + semis }));
    const shape = notes.map((n) => `${n.pos},${n.d}`).join(" ");
    const put = (pe: number, d: number, n: number) => out.push({ t: polkaT(pb, pe), d: d * PE, n, v: pe === 0 ? 0.74 : pe === 2 ? 0.64 : 0.54, tb, pb, pe });
    const [a, b, c] = notes.map((n) => n.n) as [number, number?, number?];
    switch (shape) {
      case "0,2 2,1":
        put(0, 2, a);
        put(2, 1, b!);
        put(3, 1, b!);
        break;
      case "0,3":
        put(0, 4, a);
        break;
      case "0,1 1,1 2,1":
        put(0, 1, a);
        put(1, 1, b!);
        put(2, 2, c!);
        break;
      case "0,1 1,2":
        put(0, 1, a);
        put(1, 3, b!);
        break;
      default:
        throw new Error(`polka: pulse ${pb} has the shape "${shape}"`);
    }
  }
  return out;
}

const POLKA_TUNE = polkaTune(-2);

/**
 * Registers that play in tune: the staccato tuba's oom from C2 (its low B flat take reads 7 cents
 * flat); the horns' chords F3–D4 (the recorded horn has nothing between C4 and D5, and its takes
 * blur below B flat 2).
 */
const OOM = "C2";
const HORN_HI = "D4";
/** The accordion's G4 (its take named G5) speaks 7 cents flat in a short chord: its chords leave it out. */
const ACCORDION_AVOID = [midi("G4")];
/** The glockenspiel is recorded from G5: a note under that goes up an octave. */
const bell = (n: number) => (n < midi("G5") ? n + 12 : n);

// ---------------------------------------------------------------- the parts

const clarinet: Note[] = [];
const clarinetShort: Note[] = [];
const trumpet1: Note[] = [];
const trumpet2: Note[] = [];
const trumpetCall: Note[] = [];
const hornPad: Note[] = [];
const hornPah: Note[] = [];
const hornHit: Note[] = [];
const euphSolo: Note[] = [];
const euphPah: Note[] = [];
const euphRun: Note[] = [];
const trombonePah: Note[] = [];
const tubaOom: Note[] = [];
const accordionTune: Note[] = [];
const accordionPah: Note[] = [];
const glock: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const cymbals: Note[] = [];
const claps: Note[] = [];

/** The notes of `tune` sounding at eighth `t`. */
const sounding = (tune: Note[], t: number) => tune.filter((m) => m.t <= t + 0.01 && m.t + m.d > t + 0.01).map((m) => num(m.n));
/** A pah note a semitone, a major seventh or a minor ninth from a tune note moves to another chord tone, or drops out. */
function unrubbed(notes: number[], c: Chord, lo: string, hi: string, tune: number[], avoid: number[] = []): number[] {
  const rubs = (n: number) => tune.some((m) => [1, 11, 13].includes(Math.abs(n - m)));
  return notes.map((n) => (rubs(n) ? tonesIn(c, lo, hi, avoid).find((x) => !rubs(x) && !notes.includes(x)) : n)).filter((n): n is number => n !== undefined);
}

/**
 * The waltz's oom-pah-pah from bar `from` up to (not including) bar `to`: the tuba's oom on each
 * pulse (the root, then the fifth while the chord holds), and on the two eighths after it the pah:
 * the euphonium and trombone (2 voices in [A2, A3], the euphonium under the trombone) unless
 * `horns` take it (2 horns in [F3, D4]), and the accordion (3 voices in [A3, A4]). Pah notes step
 * aside from the tune sounding then.
 */
function waltzOomPah(from: number, to: number, vOom: number, vPah: number, horns: boolean, tune: Note[]): void {
  let prevLow: number[] | null = null;
  let prevHorn: number[] | null = null;
  let prevAcc: number[] | null = null;
  for (let b = from; b < to; b++) {
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      const c = chordAt(t);
      const held = h === 1 && chordAt(t - 3).root === c.root;
      tubaOom.push({ t, d: 1.5, n: low(held ? (c.root + 7) % 12 : c.root, OOM), v: vOom - h * 0.04 });
      for (const p of [1, 2]) {
        const at = t + p;
        const v = vPah - (p - 1) * 0.04 - h * 0.02;
        const now = sounding(tune, at);
        if (horns) {
          prevHorn = voicing(c, "F3", HORN_HI, prevHorn, 2);
          for (const n of unrubbed(prevHorn, c, "F3", HORN_HI, now)) hornPah.push({ t: at, d: 0.7, n, v: v + 0.04 });
        } else {
          prevLow = voicing(c, "A2", "A3", prevLow, 2);
          const [lo, hi] = unrubbed(prevLow, c, "A2", "A3", now);
          if (lo !== undefined) euphPah.push({ t: at, d: 0.7, n: lo, v });
          if (hi !== undefined) trombonePah.push({ t: at, d: 0.7, n: hi, v });
        }
        prevAcc = voicing(c, "A3", "A4", prevAcc, 3, ACCORDION_AVOID);
        for (const n of unrubbed(prevAcc, c, "A3", "A4", now, ACCORDION_AVOID)) accordionPah.push({ t: at, d: 0.7, n, v: v - 0.1 });
      }
    }
  }
}

/** The waltz's drums: the bass drum on each pulse, the snare light on the pahs, a fill into every fourth bar. */
function waltzDrums(from: number, to: number, level: number): void {
  for (let b = from; b < to; b++) {
    kick.push({ t: bar(b), d: 1, n: "C2", v: 0.58 * level }, { t: bar(b) + 3, d: 1, n: "C2", v: 0.46 * level });
    const fill = (b - from) % 4 === 3;
    for (const p of [1, 2, 4, 5]) if (!(fill && p === 5)) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: (p % 3 === 1 ? 0.32 : 0.36) * level });
    if (fill) for (const [p, v] of [[4.5, 0.3], [5, 0.4], [5.5, 0.48]] as const) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v: v * level });
  }
}

/**
 * The polka's oom-pah, polka bars `from` up to `to` (0–31): the tuba on one (the root) and two (the
 * fifth), the euphonium and trombone, the accordion and, with `horns`, two horns on the off-beats.
 * Bars in `rest` leave the euphonium out of the second off-beat (it runs there).
 */
function polkaOomPah(from: number, to: number, vOom: number, vPah: number, horns: boolean, tune: Note[], rest: Set<number>): void {
  let prevLow: number[] | null = null;
  let prevHorn: number[] | null = null;
  let prevAcc: number[] | null = null;
  for (let pb = from; pb < to; pb++) {
    const c = chordAt(polkaT(pb, 0));
    tubaOom.push({ t: polkaT(pb, 0), d: 1, n: low(c.root, OOM), v: vOom }, { t: polkaT(pb, 2), d: 1, n: low((c.root + 7) % 12, OOM), v: vOom - 0.06 });
    for (const pe of [1, 3]) {
      const at = polkaT(pb, pe);
      const v = vPah - (pe === 3 ? 0.03 : 0);
      const now = sounding(tune, at);
      prevLow = voicing(c, "A2", "A3", prevLow, 2);
      const [lo, hi] = unrubbed(prevLow, c, "A2", "A3", now);
      if (lo !== undefined && !(pe === 3 && rest.has(pb))) euphPah.push({ t: at, d: 0.5, n: lo, v });
      if (hi !== undefined) trombonePah.push({ t: at, d: 0.5, n: hi, v });
      prevAcc = voicing(c, "A3", "A4", prevAcc, 3, ACCORDION_AVOID);
      for (const n of unrubbed(prevAcc, c, "A3", "A4", now, ACCORDION_AVOID)) accordionPah.push({ t: at, d: 0.5, n, v: v - 0.1 });
      if (horns) {
        prevHorn = voicing(c, "F3", HORN_HI, prevHorn, 2);
        for (const n of unrubbed(prevHorn, c, "F3", HORN_HI, now)) hornPah.push({ t: at, d: 0.5, n, v: v + 0.02 });
      }
    }
  }
}

/** The polka's drums: bass drum on one and two, the snare on the off-beats, a fill into every fourth polka bar... */
function polkaDrums(from: number, to: number, level: number): void {
  for (let pb = from; pb < to; pb++) {
    kick.push({ t: polkaT(pb, 0), d: 1, n: "C2", v: 0.58 * level }, { t: polkaT(pb, 2), d: 1, n: "C2", v: 0.46 * level });
    const fill = (pb - from) % 8 === 7;
    snare.push({ t: polkaT(pb, 1), d: 0.5, n: "D2", v: 0.44 * level });
    if (fill) for (const [pe, v] of [[2, 0.34], [2.5, 0.38], [3, 0.44], [3.5, 0.52]] as const) snare.push({ t: polkaT(pb, pe), d: 0.5, n: "D2", v: v * level });
    else snare.push({ t: polkaT(pb, 3), d: 0.5, n: "D2", v: 0.4 * level });
  }
}

// ---------------------------------------------------------------- bars 1–2: the band strikes up

// The clarinet's pickup: up the scale into the tune's first note (first, so the C7 pah steps aside from its F).
clarinet.push(...cells(WALTZ - 1, [[4, 1, "F4", 0.5], [5, 1, "G4", 0.54]]));
waltzOomPah(1, WALTZ, 0.6, 0.5, false, clarinet);
waltzDrums(1, WALTZ, 0.9);

// ---------------------------------------------------------------- bars 3–18: the waltz (F)

for (const m of WALTZ_TUNE) {
  const phrase = Math.floor(m.tb / 4); // A, A', B, A''
  const len = m.d >= 3 ? m.d - 0.3 : m.d - 0.12;
  const v = 0.58 + (m.v - 0.55) * 0.6;
  const c = chordAt(m.t);
  if (phrase <= 1) {
    clarinet.push({ t: m.t, d: len, n: m.n, v });
    if (m.pos % 3 === 0) glock.push({ t: m.t, d: 1, n: bell(m.n + 12), v: 0.3 });
  }
  if (phrase === 1) {
    // The duet: a trumpet in thirds (or sixths) under the clarinet; the accordion along with the tune.
    const harm = under(m.n, c, F, midi("C4"));
    if (harm !== null) trumpet2.push({ t: m.t, d: len, n: harm, v: v - 0.06 });
    accordionTune.push({ t: m.t, d: len - 0.05, n: m.n, v: v - 0.06 });
  }
  if (phrase === 2) {
    // The euphonium's solo, two octaves down.
    euphSolo.push({ t: m.t, d: m.d >= 3 ? m.d - 0.35 : m.d - 0.1, n: m.n - 24, v: 0.3 + (m.v - 0.55) * 0.2 });
    if (m.pos % 3 === 0) glock.push({ t: m.t, d: 1, n: bell(m.n + 12), v: 0.24 });
  }
  if (phrase === 3) {
    // Tutti: the trumpet duet on the tune with the clarinet, which goes up an octave for the last two
    // bars (no higher than E6: the clarinet's top take is unsteady), the glockenspiel on every note.
    clarinet.push({ t: m.t, d: len, n: m.tb >= 14 ? m.n + 12 : m.n, v: v + 0.02 });
    trumpet1.push({ t: m.t, d: len, n: m.n, v: v + 0.04 });
    const harm = under(m.n, c, F, midi("C4"));
    if (harm !== null) trumpet2.push({ t: m.t, d: len, n: harm, v: v - 0.04 });
    glock.push({ t: m.t, d: 1, n: bell(m.n + 12), v: m.pos % 3 === 0 ? 0.32 : 0.24 });
  }
}
// Horn chords: soft in A, fuller in A' and A''; the pah in B. Each held through its half bar.
{
  let prev: number[] | null = null;
  for (let b = WALTZ; b < WALTZ + 16; b++) {
    const phrase = Math.floor((b - WALTZ) / 4);
    if (phrase === 2) continue;
    for (const h of [0, 1]) {
      const t = bar(b) + h * 3;
      prev = voicing(chordAt(t), "F3", HORN_HI, prev, 2);
      const last = b === WALTZ + 15;
      for (const n of prev) hornPad.push({ t, d: last && h === 1 ? 1.4 : 2.85, n, v: phrase === 0 ? 0.26 : 0.34 });
    }
  }
}
// The clarinet's run up into A'' where the tune lands at the end of B.
{
  const first = WALTZ_TUNE.find((m) => m.tb === 12)!;
  runInto(first.n + 12, F, 4, "below").forEach((n, i) => clarinet.push({ t: bar(WALTZ + 11) + 4 + i * 0.5, d: 0.5, n, v: 0.46 + i * 0.03 }));
}
// The waltz's oom-pah-pah: the low brass on the pah, the horns in B under the euphonium's solo.
waltzOomPah(WALTZ, WALTZ + 8, 0.62, 0.5, false, clarinet);
waltzOomPah(WALTZ + 8, WALTZ + 12, 0.6, 0.48, true, euphSolo);
waltzOomPah(WALTZ + 12, WALTZ + 15, 0.66, 0.54, false, trumpet1);
waltzDrums(WALTZ, WALTZ + 15, 1);
cymbals.push(...cells(WALTZ, [[0, 1, "C#3", 0.5]]), ...cells(WALTZ + 12, [[0, 1, "C#3", 0.55]]));
// Bar 18: the band's last oom-pah on C7, then it stops; the snare picks up the polka's beat.
{
  const b = WALTZ + 15;
  waltzOomPah(b, b + 1, 0.64, 0.52, false, trumpet1);
  tubaOom.splice(tubaOom.findIndex((n) => n.t === bar(b) + 3), 1);
  for (const part of [euphPah, trombonePah, accordionPah]) for (let i = part.length - 1; i >= 0; i--) if (part[i]!.t >= bar(b) + 3) part.splice(i, 1);
  kick.push({ t: bar(b), d: 1, n: "C2", v: 0.6 });
  for (const [p, v] of [[1, 0.34], [2, 0.36]] as const) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v });
  for (const [p, v] of [[3, 0.42], [3.75, 0.36], [4.5, 0.46], [5.25, 0.52]] as const) snare.push({ t: bar(b) + p, d: 0.5, n: "D2", v });
}

// ---------------------------------------------------------------- bars 19–34: the polka (B flat)

/** The polka's clarinet: tongued (the staccato takes) but for the half notes. */
function clarinetPolka(m: PNote, semis: number, v: number): void {
  const n = m.n + semis;
  if (m.d > 2 * PE) clarinet.push({ t: m.t, d: m.d - 0.25, n, v });
  else clarinetShort.push({ t: m.t, d: m.d, n, v });
}

const EUPH_RUNS = new Set([3, 11, 19]);
/** The staccato trumpet's loud A4 take reads 7 cents flat when A5 is held a quarter: A5 takes the middle layer. */
const TRUMPET_MID = new Set([midi("A5")]);
for (const m of POLKA_TUNE) {
  const phrase = Math.floor(m.tb / 4); // A, A', B, A''
  const v = 0.62 + (m.v - 0.62) * 0.6;
  const c = chordAt(m.t);
  if (phrase !== 2) clarinetPolka(m, 0, phrase === 3 ? v + 0.02 : v);
  if (phrase === 0 || phrase === 3) accordionTune.push({ t: m.t, d: m.d - 0.08, n: m.n, v: v - 0.06 });
  if (phrase >= 1) {
    trumpet1.push({ t: m.t, d: m.d, n: m.n, v: TRUMPET_MID.has(m.n) ? Math.min(v + 0.04, 0.64) : v + 0.04 });
    const harm = under(m.n, c, BB, midi("C4"));
    if (harm !== null) trumpet2.push({ t: m.t, d: m.d, n: harm, v: v - 0.04 });
  }
  if (phrase === 3) glock.push({ t: m.t, d: 1, n: bell(m.n + 12), v: m.pe === 0 ? 0.32 : 0.24 });
  else if (m.pe === 0) glock.push({ t: m.t, d: 1, n: bell(m.n + 12), v: 0.26 });
}
// The horns' harmonies in B: two horns held through each polka bar.
{
  let prev: number[] | null = null;
  for (let pb = 16; pb < 24; pb++) {
    prev = voicing(chordAt(polkaT(pb, 0)), "F3", HORN_HI, prev, 2);
    for (const n of prev) hornPad.push({ t: polkaT(pb, 0), d: 2.8, n, v: 0.32 });
  }
}
// Where the tune holds a half note, the euphonium runs up the scale into the next bar's root.
for (const pb of EUPH_RUNS) {
  const next = chordAt(polkaT(pb + 1, 0));
  runInto(low(next.root, "D2") + 12, BB, 4, "below").forEach((n, i) => euphRun.push({ t: polkaT(pb, 2 + i * 0.5), d: 0.5 * PE, n, v: 0.5 + i * 0.03 }));
}
polkaOomPah(0, 16, 0.64, 0.52, false, clarinetShort, EUPH_RUNS);
polkaOomPah(16, 24, 0.62, 0.5, false, trumpet1, EUPH_RUNS);
polkaOomPah(24, 32, 0.66, 0.54, false, trumpet1, EUPH_RUNS);
polkaDrums(0, 32, 1);
cymbals.push({ t: polkaT(0, 0), d: 1, n: "C#3", v: 0.55 }, { t: polkaT(16, 0), d: 1, n: "C#3", v: 0.5 }, { t: polkaT(24, 0), d: 1, n: "C#3", v: 0.52 });
// The polka's last bar leans into the toast: the whole band lands on B flat at bar 35.
{
  const t = bar(TOAST);
  tubaOom.push({ t, d: 1.5, n: "Bb2", v: 0.72 });
  euphPah.push({ t, d: 1.5, n: "Bb2", v: 0.6 });
  trombonePah.push({ t, d: 1.5, n: "F3", v: 0.6 });
  hornHit.push({ t, d: 1.5, n: "F3", v: 0.56 }, { t, d: 1.5, n: "Bb3", v: 0.56 }, { t, d: 1.5, n: "D4", v: 0.56 });
  trumpet1.push({ t, d: 1.5, n: "Bb5", v: 0.68 });
  trumpet2.push({ t, d: 1.5, n: "F5", v: 0.6 }, { t, d: 1.5, n: "D5", v: 0.6 });
  clarinetShort.push({ t, d: 1.5, n: "Bb5", v: 0.7 });
  accordionPah.push({ t, d: 1.5, n: "Bb3", v: 0.5 }, { t, d: 1.5, n: "D4", v: 0.5 }, { t, d: 1.5, n: "F4", v: 0.5 });
  glock.push({ t, d: 1, n: "Bb6", v: 0.34 });
  kick.push({ t, d: 1, n: "C2", v: 0.8 });
  snare.push({ t, d: 0.5, n: "D2", v: 0.7 });
  cymbals.push({ t, d: 1, n: "C#3", v: 0.62 });
}

// ---------------------------------------------------------------- bars 35–38: the toast

/** The toast's hits: [grid eighth in bar 38, chord symbol, trumpets, horns, euphonium, trombone, tuba, accordion, clarinet, glockenspiel]. */
const HITS: [number, string, string[], string[], string, string, string, string[], string, string][] = [
  [0, "Bb", ["Bb4", "D5", "F5"], ["F3", "Bb3", "D4"], "Bb2", "F3", "Bb2", ["Bb3", "D4", "F4"], "Bb5", "Bb6"],
  [1.5, "F", ["A4", "C5", "F5"], ["F3", "A3", "C4"], "A2", "F3", "F2", ["A3", "C4", "F4"], "A5", "A6"],
  [3, "C7", ["G4", "Bb4", "E5"], ["E3", "G3", "Bb3"], "G2", "E3", "C2", ["G3", "Bb3", "E4"], "G5", "G6"],
];
for (const [p, , tpts, horns, euph, tbn, tuba, acc, clar, bell] of HITS) {
  const t = bar(TOAST + 3) + p;
  const last = p === 3;
  const d = last ? 1.4 : 1;
  trumpet1.push({ t, d, n: tpts[2]!, v: 0.68 });
  trumpet2.push(...tpts.slice(0, 2).map((n) => ({ t, d, n: num(n), v: 0.6 })));
  hornHit.push(...horns.map((n) => ({ t, d, n: num(n), v: 0.56 })));
  euphPah.push({ t, d, n: num(euph), v: 0.62 });
  trombonePah.push({ t, d, n: num(tbn), v: 0.62 });
  tubaOom.push({ t, d, n: num(tuba), v: 0.72 });
  accordionPah.push(...acc.map((n) => ({ t, d, n: num(n), v: 0.5 })));
  // The loud layer: the tongued clarinet's middle B flat take reads 5 cents flat, and these hits are exposed.
  clarinetShort.push({ t, d, n: num(clar), v: 0.7 });
  glock.push({ t, d: 1, n: num(bell), v: 0.32 });
  kick.push({ t, d: 1, n: "C2", v: 0.78 });
  snare.push({ t, d: 0.5, n: "D2", v: 0.66 });
  cymbals.push({ t, d: 1, n: "C#3", v: last ? 0.6 : 0.5 });
  claps.push({ t: t + 0.08, d: 1, n: "C4", v: 0.7 }, { t: t + 0.16, d: 1, n: "C4", v: 0.6 });
}
// The trumpet's toast call: up the B flat chord and held, over a snare roll that swells into the hits.
trumpetCall.push(...cells(TOAST + 2, [[0, 1, "F4", 0.58], [1, 1, "Bb4", 0.6], [2, 1, "D5", 0.62], [3, 3, "F5", 0.68]]));
for (const [i, v] of [0.26, 0.36, 0.5].entries()) roll.push({ t: bar(TOAST + 2) + 3 + i, d: 1, n: "D2", v });
// The snare's pickup into the waltz: two polka eighths, "und!".
for (const [p, v] of [[4.5, 0.44], [5.25, 0.5]] as const) snare.push({ t: bar(TOAST + 3) + p, d: 0.5, n: "D2", v });

// ---------------------------------------------------------------- the crowd

/** The tent: a murmur under the whole set (one 108 s take, capped just before the loop's end so its release overlaps its restart). */
const crowd: Note[] = [{ t: 0, d: LOOP, n: "C4", v: 0.6 }];
/** The cheer as the band stops (two takes, left and right), and after the third hit. */
const cheerL: Note[] = [{ t: bar(TOAST) + 0.3, d: 1, n: "C4", v: 0.8 }];
const cheerR: Note[] = [{ t: bar(TOAST) + 0.9, d: 1, n: "C4", v: 0.8 }, { t: bar(TOAST + 3) + 3.5, d: 1, n: "C4", v: 0.78 }];
/** Applause while the steins are raised. */
const applause: Note[] = [{ t: bar(TOAST) + 1.2, d: 1, n: "C4", v: 0.6 }];
/** Steins: a table of them clinking as the band stops, and single clinks here and there and on each hit. */
const clinking: Note[] = [{ t: bar(TOAST) + 0.8, d: 1, n: "C4", v: 0.7 }];
const clinks: Note[] = [
  ...[1.6, 2.7, 3.9, 5.1].map((p) => ({ t: bar(TOAST) + p, d: 1, n: "C4", v: 0.6 })),
  ...[0.4, 1.9, 3.2, 4.6].map((p) => ({ t: bar(TOAST + 1) + p, d: 1, n: "C4", v: 0.55 })),
  ...[0.9, 2.6].map((p) => ({ t: bar(TOAST + 2) + p, d: 1, n: "C4", v: 0.5 })),
  ...HITS.map(([p]) => ({ t: bar(TOAST + 3) + p + 0.12, d: 1, n: "C4", v: 0.7 })),
  // A glass or two during the polka.
  { t: polkaT(5, 1.5), d: 1, n: "C4", v: 0.42 },
  { t: polkaT(13, 0.5), d: 1, n: "C4", v: 0.4 },
  { t: polkaT(22, 2.5), d: 1, n: "C4", v: 0.42 },
];

/**
 * A one-shot faded out from `from` to `to` seconds: copies of the track whose rings step down
 * (the sampler has no envelope for a recording's length), each copy a share of the level.
 */
function fadeOut(track: Track, from: number, to: number, steps = 6): Track[] {
  return Array.from({ length: steps }, (_, i) => ({ ...track, gain: (track.gain ?? 1) / steps, ring: from + ((to - from) * (i + 1)) / steps }));
}

/** Brass recordings take 30–60 ms to speak: sustained brass starts this much early, as players do. */
const early = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: wrap(n.t - 0.04 / EIGHTH) }));

// ---------------------------------------------------------------- the song

const tracks: Track[] = [
  // The lead
  { inst: "clarinet", notes: clarinet, gain: 0.95, pan: 0.1, reverb: 0.3, humanize: 0.2, lowpass: 3500, label: "clarinet" },
  { inst: "clarinetShort", notes: clarinetShort, gain: 1.25, pan: 0.1, reverb: 0.3, humanize: 0.15, lowpass: 3200, choke: true, ring: 0.5, label: "clarinet (tongued)" },
  // A duet: the second trumpet within about 6 dB of the first (its lower register and softer layer play quieter).
  { inst: "trumpetShort", notes: trumpet1, gain: 1.5, pan: 0.25, reverb: 0.32, humanize: 0.15, lowpass: 3000, choke: true, ring: 1, label: "trumpet 1" },
  { inst: "trumpetShort", notes: trumpet2, gain: 2.2, pan: 0.35, reverb: 0.32, humanize: 0.15, lowpass: 3000, choke: true, ring: 1, label: "trumpet 2" },
  { inst: "trumpetShort", notes: trumpetCall, gain: 1.8, pan: 0.2, reverb: 0.4, humanize: 0.1, lowpass: 3500, choke: true, ring: 1.2, label: "trumpet (toast call)" },
  { inst: "accordion", notes: accordionTune, gain: 0.15, pan: -0.35, reverb: 0.25, humanize: 0.25, lowpass: 3200, label: "accordion (tune)" },
  { inst: "glockenspiel", notes: glock, gain: 9, pan: 0.3, reverb: 0.35, humanize: 0.1, lowpass: 4000, ring: 0.8 },
  // The horns
  { inst: "horn", notes: early(hornPad), gain: 0.85, pan: -0.25, reverb: 0.38, humanize: 0.15, lowpass: 4500, label: "horns (chords)" },
  { inst: "hornShort", notes: hornPah, gain: 1.2, pan: -0.25, reverb: 0.3, humanize: 0.15, lowpass: 4500, ring: 0.35, label: "horns (pah)" },
  { inst: "hornShort", notes: hornHit, gain: 0.8, pan: -0.25, reverb: 0.32, humanize: 0.1, lowpass: 4500, label: "horns (hits)" },
  // The low brass
  ...euphonium(early(euphSolo), { gain: 12, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (solo)" }),
  ...euphonium(euphPah, { short: true, gain: 0.7, pan: 0.1, reverb: 0.25, humanize: 0.12, ring: 0.35, label: "euphonium (pah)" }),
  ...euphonium(euphRun, { short: true, gain: 0.8, pan: 0.1, reverb: 0.25, humanize: 0.1, ring: 0.3, label: "euphonium (runs)" }),
  { inst: "tromboneShort", notes: trombonePah, gain: 2.3, pan: 0.2, reverb: 0.25, humanize: 0.12, lowpass: 4000, ring: 0.35, label: "trombone (pah)" },
  { inst: "tubaShort", notes: tubaOom, gain: 0.5, pan: 0.05, reverb: 0.2, humanize: 0.1, highpass: 50, ring: 0.5, label: "tuba (oom)" },
  { inst: "accordion", notes: accordionPah, gain: 0.1, pan: -0.35, reverb: 0.25, humanize: 0.2, lowpass: 3000, label: "accordion (chords)" },
  // The drums
  { inst: "kick", notes: kick, gain: 1, pan: 0, reverb: 0.2, humanize: 0.1, highpass: 60, label: "bass drum" },
  { inst: "snareOn", notes: snare, gain: 0.85, pan: -0.1, reverb: 0.22, humanize: 0.15, lowpass: 5000, label: "snare" },
  { inst: "snareRoll", notes: roll, gain: 0.45, pan: -0.1, reverb: 0.25, humanize: 0, lowpass: 5000, label: "snare roll" },
  { inst: "cymbals", notes: cymbals, gain: 0.5, pan: 0.2, reverb: 0.35, humanize: 0.05, lowpass: 3500 },
  { inst: "claps", notes: claps, gain: 1, pan: -0.2, reverb: 0.3, humanize: 0.3, lowpass: 4500, label: "crowd (claps)" },
  // The tent
  { inst: "crowd", notes: crowd, gain: 0.1, pan: 0, reverb: 0, humanize: 0, ring: LOOP * EIGHTH - 0.05, highpass: 120, lowpass: 4500, label: "crowd" },
  { inst: "cheer", notes: cheerL, gain: 0.22, pan: -0.45, reverb: 0.15, humanize: 0, lowpass: 5000, ring: 3.6, label: "cheer" },
  { inst: "cheer", notes: cheerR, gain: 0.22, pan: 0.45, reverb: 0.15, humanize: 0, lowpass: 5000, ring: 3.6, label: "cheer" },
  ...fadeOut({ inst: "applause", notes: applause, gain: 0.08, pan: -0.1, reverb: 0.1, humanize: 0, lowpass: 5000, label: "applause" }, 2.5, 5),
  ...fadeOut({ inst: "clinking", notes: clinking, gain: 0.3, pan: 0.3, reverb: 0.2, humanize: 0, lowpass: 3500, label: "steins (clinking)" }, 3, 5.5),
  { inst: "clink", notes: clinks, gain: 0.35, pan: 0.4, reverb: 0.25, humanize: 0.2, lowpass: 3000, label: "steins (clinks)" },
];

const song: Song = {
  name: "oktoberfest",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A big tent: lively, a little boomy.
  reverb: { room: 0.6, damp: 0.5, width: 0.9, level: 0.8 },
  // The skin can keep time with the band: where the polka starts, and where it stops for the toast.
  cues: { polka: bar(POLKA) * EIGHTH, toast: bar(TOAST) * EIGHTH },
  tracks,
};

export default song;
