// New Year's: a 1920s British dance band (black tie, gold, a Long Island party that spills into
// Manhattan) playing the theme as a bouncy Charleston foxtrot, a party crowd around it, a ten-second
// countdown to midnight, and "Auld Lang Syne" (traditional, public domain) after the cheer.
//
// Time: 4/4 at 240 bpm, so a bar is exactly one second and the countdown's ten bars are ten real
// seconds ("10" ... "1"); the game reads the cues (Song.cues: countdownStart, midnight) from the
// manifest to show the numbers in sync. 82 bars = 82 s = 3,936,000 frames at 48 kHz.
//
// The 6/8 theme becomes a foxtrot: each 6/8 bar is one 4/4 bar, each dotted-quarter pulse a half
// note, and its long-short lilt a dotted quarter + eighth (beats 1 and the "and" of 2: the
// Charleston rhythm). In F major, which puts the tune (C4–A5) in the muted trumpet's, the soprano
// sax's and the clarinet's sweet spot. Harmony is the theme's in period colours: 6th chords on the
// tonic, a passing diminished (Bb6 – Bo7 – C7), D7 into Gm7, Bbm6 (the minor iv) before the last
// cadence. Offbeat eighths lilt a little late (our own swing, applied per part, so sixteenth runs
// stay even).
//
// Form (bars; one bar = one second):
//    1–4   Intro: Charleston stabs on a ragtime turnaround (F6 – D7 – G7 – C7, the top line falling
//          D – C – B – Bb), clarinet licks between them and a clarinet break into the tune.
//    5–20  Chorus 1: harmon-muted trumpet on the tune; tenor saxes on soft guide-tone pads; the
//          clarinet runs in the trumpet's long notes, the saxes answer in the others. Stride
//          piano, tuba oom-pah in two, ukulele "banjo" chops on 2 and 4, light snare.
//   21–36  Chorus 2: SAX SOLI, the owner's favourite: soprano sax on the tune, tenor in harmony
//          under it; brass kicks answer the long notes, the clarinet takes two. Banjo four to the
//          bar, choked cymbal on 2 and 4.
//   37–44  Piano solo (A A'): the tune in octaves with ragtime runs over a stride left hand.
//   45–52  Out-chorus (B A''): the muted trumpet back, the saxes in close harmony under it, the
//          clarinet's obbligato on top, the tuba walking; polite applause for the pianist.
//   53–62  THE COUNTDOWN, one hit a second: the bass climbs chromatically F – F# – G – G# – A –
//          Bb – B – C (F6, F#o7, Gm7, G#o7, Am7, Bb6, Bo7, F6/C) to the dominant (C7, C7b9) while
//          the band's top line climbs from A4 to Db6; a ticking clock under the first counts, a
//          snare roll and sustained saxes, horn and euphonium swelling through the last three, a
//          clarinet run up into...
//   63–66  MIDNIGHT: the full band on F6, crash and clash cymbals, the crowd's cheer and
//          applause, champagne corks, clinking glasses; a fanfare on the theme's first bar, a
//          final chord, and F7 turning to Bb.
//   67–82  "Auld Lang Syne" in Bb, a sentimental sax-section tag: soprano lead, tenor harmony, the
//          horn's counter-line, euphonium bass, rocking piano arpeggios; applause, and a drum
//          pickup (tuba C – E) back to the intro.
// The party is on all the time: a 50-60 person crowd recording as the bed (starting at midnight,
// so the loop's only seam in it hides under the cheer), glasses clinking now and then, one
// impatient cork in chorus 2.
//
// Register plan (so the parts don't fight):
//   tuba C2–D3 (oom-pah around F2; G1–A1 only in the intro; walking in the out-chorus)
//   euphonium Bb1–C3 (ALS bass, countdown swell) · horn F3–Eb4 · trombone kicks C3–F4
//   piano: stride bass E2–D3, chords F3–F4 under the lead; solo right hand A3–C6 in octaves
//   ukulele chops C4–B4 · tenor pads F3–E4
//   lead (muted trumpet, soprano sax) C4–A5; tenor harmony a 3rd–6th under it (F3–F5)
//   clarinet fills and obbligato G4–E6, above the lead
//   countdown hits: tenor C4–E5, soprano D4–G5, trumpets F4–Db6 (top line A4 → Db6)
// Comping voicings are chosen per half bar under the lead's long notes, voice-led, never a half
// step or a minor 9th under a lead or harmony note sounding with them, and not doubling one.
//
// Levels (mix.ts, dB vs the mix per phrase): the leads -1 to -7, the supporting saxes, horn and
// piano within about 10, the crowd bed -14 to -24, glasses and corks -16 to -25, the midnight cheer
// -7 to -12. The glassware and crowd effects are low-passed, which keeps the song's treble at the
// other songs' level (it was 13 dB brighter above 8 kHz with the clinks open). The kit is light
// but heard: the snare's backbeat within about 11 dB of the band in its own band (1.5-6 kHz) even
// in chorus 1, and the countdown's clock ticks stand 6-8 dB clear of the band's tail above 3 kHz
// (under the crowd's chatter they were 5-15 dB down, inaudible).

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type Song, type Track } from "../song";
import { melody } from "../theme";

const BEATS = 4;
const BPM = 240; // one bar = one second
const BARS = 82;
const LOOP = BARS * BEATS;
const SEC = 60 / BPM; // seconds per beat
const KEY = -7; // the theme's C major -> F major
const LILT = 0.1; // offbeat eighths land at 0.6 of the beat

// Sections (first bar of each).
const C1 = 5;
const C2 = 21;
const C3 = 37; // piano solo
const OUT = 45; // out-chorus
const COUNT = 53; // "10"; "1" is bar 62
const MIDNIGHT = 63;
const ALS = 67; // its pickup is on beat 3 of bar 66

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const bar = (b: number) => (b - 1) * BEATS; // start beat of bar b (1-based)
const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;
const dB = (x: number) => 10 ** (x / 20);
const frac = (t: number) => t - Math.floor(t);
/** The Charleston lilt: an offbeat eighth lands a little late. */
const lilt = (t: number) => (Math.abs(frac(t) - 0.5) < 1e-6 ? t + LILT : t);
const lilted = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: lilt(n.t) }));

/**
 * Split one part into tracks that differ only in gain (and ring), so each note gets its own level:
 * the sampler has no per-note gain, and velocity also picks the recording. `choke` stops each note
 * at the line's next note (and at most `ring` seconds), set from the whole line so the split
 * tracks don't ring into each other.
 */
function byGain(base: Omit<Track, "notes" | "gain">, notes: Note[], gainOf: (n: Note) => number, choke = false): Track[] {
  const starts = [...new Set(notes.map((n) => n.t))].sort((a, b) => a - b);
  const ringOf = (n: Note) => {
    // (Notes a few hundredths of a beat apart are one chord, spread like players landing.)
    const next = starts.find((t) => t > n.t + 0.1) ?? starts[0]! + LOOP;
    return Math.round((next - n.t) * SEC * 1000) / 1000;
  };
  const groups = new Map<string, { gain: number; ring?: number; notes: Note[] }>();
  for (const n of notes) {
    const gain = Math.round(gainOf(n) * 1000) / 1000;
    const ring = choke ? Math.min(ringOf(n), base.ring ?? Infinity) : base.ring;
    const key = `${gain}/${ring}`;
    const g = groups.get(key) ?? { gain, ring, notes: [] };
    g.notes.push(n);
    groups.set(key, g);
  }
  return [...groups.values()].map(({ gain, ring, notes: ns }) => ({ ...base, gain, notes: ns, ...(ring === undefined ? {} : { ring }) }));
}

// The clarinet's and the horn's recordings speak at quite different levels from note to note (the
// horn's F3 take 9 dB under its A3 in the same layer; the clarinet's sustained takes below A5
// swell in over 120-150 ms, so a sixteenth on them is 15-30 dB down). This reads the recording the
// sampler plays for a note so a line can be evened out (as thanksgiving.ts and stpatricks.ts do).
const zoneLevels = new Map<string, number>();
/** Peak 30 ms RMS (dB) of a note's recording over its first `seconds` (0.05–0.35), round robins averaged. */
function zoneDb(name: InstrumentName, note: number, vel: number, seconds = 0.35): number {
  const { note: zone, layer } = instrument(name).zoneFor(note, vel);
  const window = Math.min(0.35, Math.max(0.05, seconds));
  const key = `${name}/${zone}/${layer}/${window.toFixed(3)}`;
  let db = zoneLevels.get(key);
  if (db === undefined) {
    const peaks = instrument(name)
      .zones.filter((z) => z.layer === layer && z.note === zone)
      .map(({ audio: { left, right, rate }, level = 1 }) => {
        const w = Math.round(rate * 0.03);
        let peak = 0;
        for (let s = 0; s + w <= Math.max(w, Math.min(left.length, rate * window)); s += Math.round(w / 3)) {
          let sum = 0;
          for (let i = s; i < s + w; i++) sum += ((left[i] ?? 0) ** 2 + (right[i] ?? 0) ** 2) / 2;
          peak = Math.max(peak, sum / w);
        }
        return 10 * Math.log10(peak * level ** 2 + 1e-12);
      });
    db = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    zoneLevels.set(key, db);
  }
  return db;
}
/** dB that brings a note's recording level to `refDb`, capped at ±`cap`, in 0.5 dB steps (so byGain keeps few tracks). */
const evenDb = (refDb: number, levelDb: number, cap = 12) => Math.round(Math.max(-cap, Math.min(cap, refDb - levelDb)) * 2) / 2;

// ---------------------------------------------------------------- harmony (a chord per half bar)

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (s: string) => (LETTER[s[0]!]! + (s[1] === "#" ? 1 : s[1] === "b" ? -1 : 0) + 12) % 12;
const QUALITY: Record<string, number[]> = {
  "6": [0, 4, 7, 9],
  "7": [0, 4, 7, 10],
  "7b9": [0, 4, 7, 10, 1],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
  o7: [0, 3, 6, 9],
};
interface Chord {
  name: string;
  root: number;
  /** The bass's pitch class (the root, or a slash chord's bass). */
  bass: number;
  tones: number[];
  /** 3rd and 7th (6th): the guide tones pads and shells use. */
  guide: [number, number];
}
function chord(name: string): Chord {
  const [sym, over] = name.split("/") as [string, string | undefined];
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  const ints = m && QUALITY[m[2]!];
  if (!m || !ints) throw new Error(`bad chord ${name}`);
  const root = pcOf(m[1]!);
  const tones = ints.map((i) => (root + i) % 12);
  return { name, root, bass: over ? pcOf(over) : root, tones, guide: [tones[1]!, tones[3]!] };
}

const INTRO_CH = ["F6", "F6", "D7", "D7", "G7", "G7", "C7", "C7"];
const THEME_CH = [
  "F6", "F6", "Dm7", "Dm7", "Bb6", "Bo7", "C7", "C7", // A
  "F6", "F6", "Dm7", "D7", "Gm7", "C7", "F6", "F6", // A'
  "Bb6", "Bb6", "C7", "C7", "Am7", "Dm7", "Gm7", "C7", // B
  "F6", "F6", "Dm7", "Dm7", "Gm7", "Bbm6", "C7", "C7", // A''
];
// The countdown's chromatic climb, one chord a count.
const COUNT_CH = ["F6", "F#o7", "Gm7", "G#o7", "Am7", "Bb6", "Bo7", "F6/C", "C7", "C7b9"];
const MIDNIGHT_CH = ["F6", "F6", "F6", "C7", "F6", "F6", "F6", "F7"];
const ALS_CH = [
  "Bb6", "Bb6", "Bb6", "Bb6", "Cm7", "Cm7", "F7", "F7", // auld acquaintance be forgot, and
  "Bb6", "Bb6", "Bb7", "Bb7", "Eb6", "Eb6", "Eb6", "Eo7", // never brought to mind? Should
  "Bb6/F", "Bb6/F", "Gm7", "Gm7", "Cm7", "Cm7", "F7", "F7", // auld acquaintance be forgot, and
  "Eb6", "Eb6", "Cm7", "F7", "Bb6", "Bb6", "Bb6", "C7", // auld lang syne (and the pickup home)
];
const HALVES: Chord[] = [...INTRO_CH, ...THEME_CH, ...THEME_CH, ...THEME_CH, ...COUNT_CH.flatMap((c) => [c, c]), ...MIDNIGHT_CH, ...ALS_CH].map(chord);
if (HALVES.length !== BARS * 2) throw new Error(`newyear: ${HALVES.length} half-bar chords for ${BARS} bars`);
const chordAt = (t: number): Chord => HALVES[Math.floor((((t % LOOP) + LOOP) % LOOP) / 2)]!;

const F_SCALE = [5, 7, 9, 10, 0, 2, 4];
const BB_SCALE = [10, 0, 2, 3, 5, 7, 9];

/** The pitch class `p` placed in [lo, hi], nearest to `near`. */
function place(p: number, lo: number, hi: number, near: number): number {
  let best = lo;
  let bestD = Infinity;
  for (let m = lo; m <= hi; m++) if (pc(m) === p && Math.abs(m - near) < bestD) [best, bestD] = [m, Math.abs(m - near)];
  return best;
}

/**
 * `n` chord tones in [lo, hi] (each below `ceil`), distinct pitch classes, the guide tones first,
 * close to `prev` (voice leading), never a half step or minor 9th under (or a half step over) any
 * `avoid` note (the lead sounding with it), not doubling one if it can help it, and with no
 * seconds between neighbours.
 */
function voicing(ch: Chord, n: number, lo: number, hi: number, opts: { prev?: number[]; avoid?: number[]; ceil?: number } = {}): number[] {
  const cands: number[] = [];
  for (let m = lo; m <= hi; m++) if (ch.tones.includes(pc(m)) && (opts.ceil === undefined || m < opts.ceil)) cands.push(m);
  let best: number[] = [];
  let bestCost = Infinity;
  const consider = (v: number[]) => {
    if (new Set(v.map(pc)).size < v.length) return;
    let cost = 0;
    for (const g of ch.guide) if (!v.some((m) => pc(m) === g)) cost += 3;
    for (let i = 1; i < v.length; i++) {
      const gap = v[i]! - v[i - 1]!;
      if (gap === 1) cost += 6;
      else if (gap === 2) cost += 1;
    }
    for (const a of opts.avoid ?? []) {
      for (const m of v) {
        if (a - m === 1 || a - m === 13 || m - a === 1) cost += 20;
        else if (a === m) cost += 4;
      }
    }
    if (opts.prev?.length) {
      const p = opts.prev;
      for (let i = 0; i < v.length; i++) cost += 0.3 * Math.abs(v[i]! - p[Math.min(i, p.length - 1)]!);
    } else cost += 0.1 * Math.abs(v.reduce((a, b) => a + b, 0) / v.length - (lo + hi) / 2);
    if (cost < bestCost) [best, bestCost] = [v, cost];
  };
  const walk = (start: number, acc: number[]) => {
    if (acc.length === n) return consider(acc);
    for (let i = start; i < cands.length; i++) walk(i + 1, [...acc, cands[i]!]);
  };
  walk(0, []);
  if (!best.length && n > 1) return voicing(ch, n - 1, lo, hi, opts);
  return best;
}

// ---------------------------------------------------------------- the theme as a foxtrot

/** A 6/8 eighth (0..6 in the bar) as a beat of the 4/4 bar: pulses become half notes, long-short a dotted quarter + eighth. */
function foxBeat(e: number): number {
  if (e >= 6) return 4;
  const half = e >= 3 ? 1 : 0;
  return half * 2 + [0, 1, 1.5][e - half * 3]!;
}
/** Theme bars from..to-1 placed at bar `at`, in F (+ octaves); v carries the accent (1 first pulse, 0.6 second, 0.2 between). */
function theme(from: number, to: number, at: number, octave = 0): Note[] {
  return melody()
    .filter((n) => n.t >= (from - 1) * 6 && n.t < (to - 1) * 6)
    .map((n) => {
      const b = Math.floor(n.t / 6);
      const e = n.t - b * 6;
      const s = foxBeat(e);
      return { t: bar(at + b - (from - 1)) + s, d: foxBeat(e + n.d) - s, n: num(n.n) + KEY + 12 * octave, v: e === 0 ? 1 : e === 3 ? 0.6 : 0.2 };
    });
}
/** Articulation: played length per written length (eighth, quarter, dotted quarter, half). */
function artic(line: Note[], [e, q, dq, h]: [number, number, number, number]): Note[] {
  return line.map((n) => ({ ...n, d: n.d <= 0.5 ? e : n.d <= 1 ? q : n.d <= 1.5 ? dq : n.d - (2 - h) }));
}
/**
 * The harmony note under a lead note: a chord tone a third below, or where the chord has none a
 * sixth (or, `close`, a fourth), nearest the last harmony note. Under a note outside the chord (a
 * 9th, 11th or 13th, or a passing note) a chord tone a third or fourth below, so the harmony
 * agrees with the comping; failing that the scale's third below.
 */
function under(m: number, t: number, prev: number | undefined, close: boolean, scale: number[]): number {
  const tones = chordAt(t).tones;
  if (tones.includes(pc(m))) {
    const cost: [number, number][] = close ? [[3, 0], [4, 0], [5, 0.5], [8, 1.5], [9, 1.5]] : [[3, 0], [4, 0], [8, 1], [9, 1], [5, 1.75]];
    let best: number | undefined;
    let bestCost = Infinity;
    for (const [i, c] of cost) {
      if (!tones.includes(pc(m - i))) continue;
      const k = c + (prev === undefined ? 0 : 0.1 * Math.abs(m - i - prev));
      if (k < bestCost) [best, bestCost] = [m - i, k];
    }
    if (best !== undefined) return best;
  } else {
    for (const i of [3, 4, 5]) if (tones.includes(pc(m - i))) return m - i;
  }
  return scale.includes(pc(m - 3)) ? m - 3 : m - 4;
}
function harmonize(line: Note[], close = false, scale = F_SCALE): Note[] {
  let prev: number | undefined;
  return line.map((n) => {
    const m = under(num(n.n), n.t, prev, close, scale);
    prev = m;
    return { ...n, n: m };
  });
}

// ---------------------------------------------------------------- the tune: who plays it where

const TRUMPET_LENS: [number, number, number, number] = [0.4, 0.85, 1.3, 1.8];
const SAX_LENS: [number, number, number, number] = [0.45, 0.9, 1.4, 1.85];
// Chorus 1 and the out-chorus: harmon-muted trumpet.
const trumpet1 = artic(theme(1, 17, C1), TRUMPET_LENS);
const trumpetOut = artic(theme(9, 17, OUT), TRUMPET_LENS);
// The out-chorus's saxes in close harmony under the trumpet.
const outSoprano = harmonize(trumpetOut, true);
const outTenor = harmonize(outSoprano, true);
// Chorus 2: the sax soli, the soprano on the tune and the tenor under it.
const soli = artic(theme(1, 17, C2), SAX_LENS);
const soliTenor = harmonize(soli);
// The piano solo: the tune's first half, in octaves.
const pianoTune = artic(theme(1, 9, C3), [0.45, 0.9, 1.45, 1.9]);

// "Auld Lang Syne" (traditional), in Bb: [length in melody beats, note]. A melody beat is half a
// bar (two of our beats), so it sings at 120 a minute; the pickup is on beat 3 of bar 66.
const ALS_TUNE: [number, string][] = [
  [1, "F4"],
  [1.5, "Bb4"], [0.5, "Bb4"], [1, "Bb4"], [1, "D5"],
  [1.5, "C5"], [0.5, "Bb4"], [1, "C5"], [1, "D5"],
  [1.5, "Bb4"], [0.5, "Bb4"], [1, "D5"], [1, "F5"],
  [3, "G5"], [1, "G5"],
  [1.5, "F5"], [0.5, "D5"], [1, "D5"], [1, "Bb4"],
  [1.5, "C5"], [0.5, "Bb4"], [1, "C5"], [1, "D5"],
  [1.5, "Bb4"], [0.5, "G4"], [1, "G4"], [1, "F4"],
  [3, "Bb4"],
];
const alsTune: Note[] = [];
{
  let t = bar(ALS - 1) + 2;
  for (const [len, n] of ALS_TUNE) {
    const d = len * 2;
    // Accent each melody bar's downbeat (every 8 of our beats from bar 67).
    const down = Math.abs(((t - bar(ALS)) % 8 + 8) % 8) < 1e-6;
    alsTune.push({ t, d: d - (d >= 4 ? 0.3 : 0.12), n: midi(n), v: down ? 1 : 0.4 });
    t += d;
  }
}
const alsTenor = harmonize(alsTune, false, BB_SCALE);

/** Notes of `line` sounding in the half bar starting at beat half*2 (`longOnly`: held ones). */
function soundingIn(line: Note[], half: number, longOnly = false): number[] {
  const a = half * 2;
  return line.filter((n) => n.t < a + 2 && n.t + n.d > a && (!longOnly || n.d >= 0.8)).map((n) => num(n.n));
}
const LEADS: Note[] = [...trumpet1, ...trumpetOut, ...soli, ...pianoTune, ...alsTune];
const HARMONY: Note[] = [...soliTenor, ...outSoprano, ...outTenor, ...alsTenor];
/** The lead in a half bar: comping stays under its held notes. */
const leadIn = (half: number, longOnly = false) => soundingIn(LEADS, half, longOnly);
/** Everything a comping voicing must not rub against (a half step or minor 9th): the lead and its harmony. */
const avoidIn = (half: number) => [...soundingIn(LEADS, half), ...soundingIn(HARMONY, half)];

// ---------------------------------------------------------------- the muted trumpet lead

// The harmon-mute set has a soft and a loud take of each note. From Bb4 up the loud takes are
// piercing, so the upper half of the tune uses the soft takes (the classic intimate harmon sound)
// and the lower half the loud ones; velocity picks the take and shapes the accents, gain evens
// the recordings (measured per recording) and makes the dynamics.
const SOFT_FROM = midi("Bb4");
const leadNotes: Note[] = [...trumpet1, ...trumpetOut].map((n) => {
  const a = n.v ?? 0;
  const m = num(n.n);
  return { ...n, n: m, v: m >= SOFT_FROM ? Math.min(0.46, 0.34 + a * 0.1) : 0.6 + a * 0.15 };
});
function leadGainDb(m: number): number {
  if (m <= 59) return 4; // Bb3, loud take
  if (m <= 61) return 1.5; // C4, loud
  if (m <= 65) return 1.2; // Eb4 (D4–F4), loud
  if (m <= 69) return -1.3; // Ab4 (G4–A4), loud
  if (m <= 72) return 11.5; // Bb4 (Bb4–C5), soft
  if (m <= 75) return 7.5; // D5 (C#5–Eb5), soft
  return 5; // F5 and up, soft
}

// ---------------------------------------------------------------- parts

const clarinet: Note[] = [];
const sopStab: Note[] = [];
const tenStab: Note[] = [];
const tptStab: Note[] = [];
const tbnStab: Note[] = [];
const stabDb = new Map<Note, number>();
const tuba: Note[] = [];
const tubaDb = new Map<Note, number>();
const piano: Note[] = [];
const pianoSolo: Note[] = [];
const uke: Note[] = [];
const pads: Note[] = [];
const sopSus: Note[] = []; // sustained soprano/tenor outside the tune (countdown swell, fanfare)
const tenSus: Note[] = [];
const horn: Note[] = [];
const euph: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
const softSnare: Note[] = [];
const roll: Note[] = [];
const choke: Note[] = [];
const sock: Note[] = [];
const crash: Note[] = [];
const cymbals: Note[] = [];
const woodblock: Note[] = [];
const ticks: Note[] = [];
const toms: Note[] = [];
const tomsLow: Note[] = [];
// Drum levels in dB per note. Velocity picks the recording, and the kit's layers sit 6-15 dB
// apart, so each part keeps to one layer (KICK_V, SNARE_V, ...) and builds in gain.
const drumDb = new Map<Note, number>();
const KICK_V = 0.4; // the bass drum's second of four layers
const SNARE_V = 0.3; // snares on: the second of five
const SOFT_V = 0.22; // snares off: the softest
const BLOCK_V = 0.65; // the woodblock's forte take
const ROLL_V = 0.45;
function drum(list: Note[], t: number, n: string, v: number, db = 0): void {
  const note = { t, d: 1, n, v };
  list.push(note);
  drumDb.set(note, db);
}

/** One section hit: brass and saxes on a 4-voice voicing [tenor, soprano, 2nd trumpet, lead trumpet], trombones under. */
function hit(t: number, upper: (string | number)[], tbn: (string | number)[], db: number, opts: { tpt?: boolean; sax?: boolean } = {}): void {
  const at = lilt(t);
  const [ten, sop, tp2, tp1] = upper.map(num) as [number, number, number, number];
  const add = (list: Note[], n: number, dt: number, extraDb = 0) => {
    const note = { t: at + dt, d: 0.5, n, v: 0.6 };
    list.push(note);
    stabDb.set(note, db + extraDb);
  };
  if (opts.sax !== false) {
    add(tenStab, ten, 0.004);
    add(sopStab, sop, 0.012);
  }
  if (opts.tpt !== false) {
    add(tptStab, tp2, 0.02);
    add(tptStab, tp1, 0.008);
  }
  tbn.map(num).forEach((n, i) => add(tbnStab, n, i * 0.024));
}
/** A brass kick: trombones (and trumpets) only. */
function kickBrass(t: number, tbn: string[], tpt: string[], db: number): void {
  const at = lilt(t);
  for (const [i, n] of tbn.entries()) {
    const note = { t: at + i * 0.024, d: 0.5, n: num(n), v: 0.6 };
    tbnStab.push(note);
    stabDb.set(note, db);
  }
  for (const [i, n] of tpt.entries()) {
    const note = { t: at + 0.012 + i * 0.024, d: 0.5, n: num(n), v: 0.5 };
    tptStab.push(note);
    stabDb.set(note, db);
  }
}
/** A run or lick: [beat offset, length, note] from `t0` (eighths on the "and" lilt). */
function lick(list: Note[], t0: number, notes: [number, number, string][], v = 0.55): void {
  for (const [dt, d, n] of notes) list.push({ t: lilt(t0 + dt), d, n: midi(n), v });
}
/** A ukulele chop: the chord strummed low to high, a few ms apart. */
function chop(t: number, notes: number[], v: number): void {
  const at = lilt(t);
  notes.forEach((n, i) => uke.push({ t: at + i * 0.03, d: 0.5, n, v: v - i * 0.03 }));
}
/** A tuba note (staccato) at `t`, with a level offset in dB. */
function oom(t: number, n: string | number, db = 0): void {
  const note = { t: lilt(t), d: 0.6, n: num(n), v: 0.7 };
  tuba.push(note);
  tubaDb.set(note, db);
}

// ---------------------------------------------------------------- intro (bars 1–4)

// Charleston stabs (1 and the "and" of 2) down a ragtime turnaround, the top line falling D5 – C5 –
// B4 – Bb4; the clarinet answers each; on the C7 the band stops for the clarinet's break.
const INTRO_HITS: [string[], string[], string[]][] = [
  [["F4", "A4", "C5", "D5"], ["F3", "A3"], ["F2", "C2"]],
  [["D4", "F#4", "A4", "C5"], ["F#3", "C4"], ["D2", "A1"]],
  [["D4", "F4", "G4", "B4"], ["F3", "B3"], ["G1", "D2"]],
  [["C4", "E4", "G4", "Bb4"], ["E3", "Bb3"], ["C2"]],
];
INTRO_HITS.forEach(([upper, tbn, bass], i) => {
  const s = bar(1 + i);
  const beats = i < 3 ? [0, 1.5] : [0];
  for (const b of beats) hit(s + b, upper, tbn, b === 0 ? 0 : -1.5);
  oom(s, bass[0]!, 1);
  if (bass[1]) oom(s + 2, bass[1], -1);
  for (const b of beats) {
    const ch = chordAt(s);
    chop(s + b, voicing(ch, 3, midi("C4"), midi("B4")), 0.62);
    // The piano doubles the stab: bass and chord.
    piano.push({ t: lilt(s + b), d: 0.6, n: place(ch.bass, midi("E2"), midi("D3"), midi("A2")), v: 0.5 });
    for (const [k, n] of voicing(ch, 3, midi("F3"), midi("F4")).entries()) piano.push({ t: lilt(s + b) + 0.01 * k, d: 0.6, n, v: 0.5 });
    drum(woodblock, lilt(s + b), "C4", BLOCK_V, b === 0 ? 0 : -2);
    drum(kick, lilt(s + b), "C2", KICK_V, b === 0 ? 1 : -1);
  }
});
// The clarinet's answers, then its break.
lick(clarinet, bar(1), [[2, 0.45, "F5"], [2.5, 0.45, "A5"], [3, 0.45, "C6"], [3.5, 0.4, "A5"]]);
lick(clarinet, bar(2), [[2, 0.45, "C6"], [2.5, 0.45, "A5"], [3, 0.45, "F#5"], [3.5, 0.4, "D5"]]);
lick(clarinet, bar(3), [[2, 0.45, "B4"], [2.5, 0.45, "D5"], [3, 0.45, "F5"], [3.5, 0.4, "G5"]]);
lick(clarinet, bar(4), [
  [1, 0.3, "C6"], [1 + 1 / 3, 0.3, "Bb5"], [1 + 2 / 3, 0.3, "G5"],
  [2, 0.3, "E5"], [2 + 1 / 3, 0.3, "C5"], [2 + 2 / 3, 0.3, "Bb4"],
  [3, 0.45, "G4"], [3.5, 0.4, "E5"],
]);

// ---------------------------------------------------------------- the comping (choruses)

// Per bar of the three choruses: piano S stride (bass on 1 and 3, chord on 2 and 4), s the same
// with two-note chords (under the sax soli), - none (the solo has its own); ukulele: 2 chops on 2
// and 4, 4 four to the bar, 0 none; tuba: 2 in two, w walking (written below), 0 none.
interface Groove {
  piano: "S" | "s" | "-";
  uke: "2" | "4" | "0";
  tuba: "2" | "w" | "0";
}
function groove(b: number): Groove | null {
  if (b >= C1 && b < C2) return { piano: "S", uke: "2", tuba: "2" };
  if (b >= C2 && b < C3) return { piano: "s", uke: "4", tuba: "2" };
  if (b >= C3 && b < OUT) return { piano: "-", uke: "2", tuba: "0" };
  if (b >= OUT && b < COUNT) return { piano: "S", uke: "4", tuba: b < OUT + 4 ? "w" : "2" };
  return null;
}
let pianoPrev: number[] | undefined;
let ukePrev: number[] | undefined;
let tubaPrev = midi("F2");
for (let b = C1; b < COUNT; b++) {
  const g = groove(b)!;
  const s = bar(b);
  for (const beat of [0, 1, 2, 3]) {
    const t = s + beat;
    const ch = chordAt(t);
    const half = Math.floor(t / 2);
    const avoid = avoidIn(half);
    const long = leadIn(half, true);
    const ceil = long.length ? Math.min(...long) : undefined;
    const changed = beat === 2 && chordAt(s).name !== ch.name;
    // Bass on 1 and 3: the chord's bass, or its fifth when the chord carries on.
    if (beat % 2 === 0) {
      const bassPc = beat === 0 || changed ? ch.bass : (ch.root + 7) % 12;
      if (g.tuba === "2") {
        // Roots around F2 (G2, A2 and Bb2 rather than an octave down: the tuba's sweet spot, and
        // the staccato Bb1's first take reads 7 cents flat), the fifth below or above.
        tubaPrev = place(bassPc, midi("C2"), midi("D3"), beat === 0 ? midi("F2") : tubaPrev);
        oom(t, tubaPrev, beat === 0 ? 0 : -1.5);
      }
      if (g.piano !== "-") piano.push({ t, d: 0.9, n: place(bassPc, midi("E2"), midi("D3"), midi("A2")), v: 0.42 });
    } else if (g.piano !== "-") {
      const v = voicing(ch, g.piano === "S" ? 3 : 2, midi("F3"), midi("F4"), { prev: pianoPrev, avoid, ceil });
      pianoPrev = v;
      v.forEach((n, k) => piano.push({ t: t + 0.012 * k, d: 0.55, n, v: 0.38 - k * 0.02 }));
    }
    if (g.uke === "4" || (g.uke === "2" && beat % 2 === 1)) {
      const v = voicing(ch, 3, midi("C4"), midi("B4"), { prev: ukePrev, avoid });
      ukePrev = v;
      const accent = beat % 2 === 1 ? 0.06 : 0;
      chop(t, v, (b >= C3 && b < OUT ? 0.5 : 0.56) + accent);
    }
  }
}
// The out-chorus's walking tuba (B): root, chord tones, an approach into the next bar.
const WALK: string[][] = [
  ["Bb2", "F2", "D2", "B1"], // Bb6 -> C
  ["C2", "E2", "G2", "G#2"], // C7 -> A
  ["A2", "G2", "D2", "F2"], // Am7 | Dm7 -> G
  ["G2", "Bb2", "C2", "E2"], // Gm7 | C7 -> F
];
WALK.forEach((notes, i) => notes.forEach((n, beat) => oom(bar(OUT + i) + beat, n, beat === 0 ? 0 : -2)));

// Tenor pads under the trumpet in chorus 1: guide tones (3rd and 7th/6th), voice-led, held
// across the half bars that keep them; they rest where the saxes answer (bars 8 and 12).
{
  const voices: Note[][] = [[], []];
  let prev: number[] | undefined;
  for (let h = (C1 - 1) * 2; h < (C2 - 1) * 2; h++) {
    const b = Math.floor(h / 2) + 1;
    if (b === C1 + 3 || b === C1 + 7) {
      prev = undefined;
      continue;
    }
    const long = leadIn(h, true);
    const v = voicing(HALVES[h]!, 2, midi("F3"), midi("E4"), { prev, avoid: avoidIn(h), ceil: long.length ? Math.min(...long) : undefined });
    v.forEach((n, i) => {
      const line = voices[i]!;
      const last = line.at(-1);
      // Hold a note that carries on into this half bar.
      if (last && last.n === n && Math.abs(last.t + last.d + 0.15 - h * 2) < 1e-6) last.d += 2;
      else line.push({ t: h * 2, d: 1.85, n, v: 0.45 });
    });
    prev = v;
  }
  pads.push(...voices.flat());
}

// The clarinet in the trumpet's long notes (chorus 1), and into chorus 2.
lick(clarinet, bar(C1 + 1), [[2.5, 0.22, "D5"], [2.75, 0.22, "F5"], [3, 0.22, "A5"], [3.25, 0.45, "C6"], [3.75, 0.22, "A5"]]); // Dm7, over A4
lick(clarinet, bar(C1 + 5), [[2.25, 0.22, "F#5"], [2.5, 0.22, "A5"], [2.75, 0.22, "C6"], [3, 0.45, "D6"], [3.5, 0.22, "C6"], [3.75, 0.22, "A5"]]); // D7, over D5
lick(clarinet, bar(C1 + 9), [[2 + 1 / 3, 0.3, "C6"], [2 + 2 / 3, 0.3, "Bb5"], [3, 0.3, "G5"], [3 + 1 / 3, 0.3, "E5"], [3 + 2 / 3, 0.28, "D5"]]); // C7, over G4
lick(clarinet, bar(C1 + 15), [[3, 0.22, "E5"], [3.25, 0.22, "G5"], [3.5, 0.22, "Bb5"], [3.75, 0.25, "C6"]]); // C7: up into the soli
// The sax section's answers (chorus 1): [beat, tenor, soprano].
for (const [t, ten, sop] of [
  [bar(C1 + 3) + 0.5, "C4", "E4"], [bar(C1 + 3) + 1, "E4", "G4"], [bar(C1 + 3) + 1.5, "G4", "Bb4"], // C7, under the trumpet's C5
  [bar(C1 + 7) + 0.5, "C4", "A4"], [bar(C1 + 7) + 1, "F4", "C5"], [bar(C1 + 7) + 1.5, "A4", "D5"], // F6, over its F4
] as [number, string, string][]) {
  const at = lilt(t);
  const a = { t: at, d: 0.5, n: midi(ten), v: 0.6 };
  const b2 = { t: at + 0.01, d: 0.5, n: midi(sop), v: 0.6 };
  tenStab.push(a);
  sopStab.push(b2);
  stabDb.set(a, -1);
  stabDb.set(b2, -1);
}
// Chorus 2: brass kicks in the soli's long notes, the clarinet in two of them.
kickBrass(bar(C2 + 1) + 2.5, ["D3", "A3"], ["C4", "F4"], -1); // Dm7, under A4
kickBrass(bar(C2 + 1) + 3.5, ["D3", "A3"], ["C4", "F4"], -0.5);
kickBrass(bar(C2 + 3) + 0.5, ["C3", "Bb3"], ["G4", "Bb4"], -1); // C7, under C5
kickBrass(bar(C2 + 3) + 1.5, ["C3", "Bb3"], ["G4", "Bb4"], -0.5);
kickBrass(bar(C2 + 5) + 2.5, ["D3", "C4"], ["F#4", "A4"], -0.5); // D7, under D5
kickBrass(bar(C2 + 5) + 3.5, ["D3", "C4"], ["F#4", "A4"], 0);
lick(clarinet, bar(C2 + 7), [[0.5, 0.22, "A5"], [0.75, 0.22, "C6"], [1, 0.45, "D6"], [1.5, 0.22, "C6"], [1.75, 0.22, "A5"]]); // F6, over F4
lick(clarinet, bar(C2 + 9), [[2.25, 0.22, "E5"], [2.5, 0.22, "G5"], [2.75, 0.22, "Bb5"], [3, 0.45, "C6"], [3.5, 0.22, "Bb5"], [3.75, 0.22, "G5"]]); // C7, over G4
kickBrass(bar(C2 + 11) + 3.5, ["C3", "Bb3"], ["E4", "G4"], 0); // push into the last A
kickBrass(bar(C2 + 15) + 2, ["C3", "Bb3"], [], -1);

// ---------------------------------------------------------------- the piano solo (bars 37–44)

// The tune in octaves (the loud layer: brighter), ragtime runs in its long notes, over a stride
// left hand: a bass octave on 1 and 3, a chord on 2 and 4.
for (const n of pianoTune) {
  const m = num(n.n);
  const v = 0.6 + (n.v ?? 0) * 0.06;
  pianoSolo.push({ ...n, t: lilt(n.t), n: m, v }, { ...n, t: lilt(n.t) + 0.008, n: m - 12, v: v - 0.06 });
}
lick(pianoSolo, bar(C3 + 1), [[2.5, 0.22, "D5"], [2.75, 0.22, "F5"], [3, 0.22, "A5"], [3.25, 0.22, "G5"], [3.5, 0.22, "F5"], [3.75, 0.22, "D5"]], 0.58);
lick(pianoSolo, bar(C3 + 3), [[0.5, 0.22, "E5"], [0.75, 0.22, "G5"], [1, 0.22, "Bb5"], [1.25, 0.22, "G5"], [1.5, 0.22, "E5"], [1.75, 0.22, "C5"]], 0.58);
lick(pianoSolo, bar(C3 + 5), [[2.5, 0.22, "F#5"], [2.75, 0.22, "A5"], [3, 0.22, "C6"], [3.25, 0.22, "A5"], [3.5, 0.22, "F#5"], [3.75, 0.22, "D5"]], 0.58);
lick(pianoSolo, bar(C3 + 7), [[0.5, 0.22, "A4"], [0.75, 0.22, "C5"], [1, 0.22, "F5"], [1.25, 0.22, "A5"], [1.5, 0.4, "C6"]], 0.58);
{
  let prev: number[] | undefined;
  for (let b = C3; b < OUT; b++) {
    for (const beat of [0, 1, 2, 3]) {
      const t = bar(b) + beat;
      const ch = chordAt(t);
      if (beat % 2 === 0) {
        const bassPc = beat === 0 || chordAt(bar(b)).name !== ch.name ? ch.bass : (ch.root + 7) % 12;
        const low = place(bassPc, midi("E2"), midi("D3"), midi("A2"));
        pianoSolo.push({ t, d: 0.9, n: low, v: 0.56 }, { t: t + 0.006, d: 0.9, n: low - 12, v: 0.52 });
      } else {
        const ownLow = pianoSolo.filter((n) => n.t <= t && n.t + n.d > t && num(n.n) >= midi("C4")).map((n) => num(n.n));
        const ceil = Math.min(midi("E4"), ...ownLow);
        const own = pianoSolo.filter((n) => n.t <= t + 0.5 && n.t + n.d > t).map((n) => num(n.n));
        const v = voicing(ch, 3, midi("F3"), midi("E4"), { prev, avoid: [...avoidIn(Math.floor(t / 2)), ...own], ceil });
        prev = v;
        v.forEach((n, k) => pianoSolo.push({ t: t + 0.01 * k, d: 0.55, n, v: 0.54 - k * 0.02 }));
      }
    }
  }
}

// ---------------------------------------------------------------- the out-chorus (bars 45–52)

// The clarinet's obbligato above the trumpet: long notes, a run where the trumpet holds, and a
// chromatic descent (D6 – Db6 – C6) over Gm7 – Bbm6 – C7.
lick(clarinet, bar(OUT), [[0, 1.8, "F5"], [2, 1.8, "G5"]], 0.5);
lick(clarinet, bar(OUT + 1), [[0, 1.4, "E5"], [2.25, 0.22, "G5"], [2.5, 0.22, "Bb5"], [2.75, 0.22, "C6"], [3, 0.45, "E6"], [3.5, 0.45, "D6"]], 0.5);
lick(clarinet, bar(OUT + 2), [[0, 1.4, "E5"], [2, 1.8, "A5"]], 0.5);
lick(clarinet, bar(OUT + 3), [[0, 1.8, "Bb5"], [2, 0.9, "G5"], [3, 0.9, "A5"]], 0.5);
lick(clarinet, bar(OUT + 4), [[0, 1.3, "C6"], [1.5, 2.3, "A5"]], 0.5);
lick(clarinet, bar(OUT + 5), [[0, 1.4, "F5"], [2, 0.22, "F5"], [2.25, 0.22, "A5"], [2.5, 0.22, "C6"], [2.75, 1.1, "D6"]], 0.5);
lick(clarinet, bar(OUT + 6), [[0, 1.85, "D6"], [2, 1.85, "Db6"]], 0.5);
lick(clarinet, bar(OUT + 7), [[0, 1.4, "C6"], [2, 0.45, "Bb5"], [2.5, 0.45, "G5"], [3, 0.45, "E5"], [3.5, 0.6, "C5"]], 0.5);
kickBrass(bar(OUT + 1) + 2.5, ["E3", "Bb3"], [], -1); // C7, under the trumpet's G4
kickBrass(bar(OUT + 1) + 3.5, ["E3", "Bb3"], [], -0.5);

// ---------------------------------------------------------------- the countdown (bars 53–62)

// One hit a second on the count, the bass climbing chromatically, the top line from A4 to Db6.
const COUNT_UPPER: string[][] = [
  ["C4", "D4", "F4", "A4"], // 10 F6
  ["Eb4", "F#4", "A4", "C5"], // 9 F#o7
  ["F4", "G4", "Bb4", "D5"], // 8 Gm7
  ["F4", "G#4", "B4", "D5"], // 7 G#o7
  ["G4", "A4", "C5", "E5"], // 6 Am7
  ["G4", "Bb4", "D5", "F5"], // 5 Bb6
  ["B4", "D5", "F5", "Ab5"], // 4 Bo7
  ["A4", "C5", "F5", "A5"], // 3 F6/C
  ["C5", "E5", "G5", "Bb5"], // 2 C7
  ["E5", "G5", "Bb5", "Db6"], // 1 C7b9
];
const COUNT_TBN: string[][] = [
  ["F3", "A3"], ["F#3", "C4"], ["G3", "D4"], ["G#3", "D4"], ["A3", "E4"],
  ["Bb3", "F4"], ["B3", "F4"], ["C4", "F4"], ["E3", "Bb3"], ["E3", "Bb3"],
];
const COUNT_BASS = ["F2", "F#2", "G2", "G#2", "A2", "Bb2", "B2", "C3", "C2", "C2"];
for (let i = 0; i < 10; i++) {
  const b = COUNT + i;
  const s = bar(b);
  const ch = chordAt(s);
  const db = -1 + i * 0.5; // louder each count
  hit(s, COUNT_UPPER[i]!, COUNT_TBN[i]!, db);
  oom(s, COUNT_BASS[i]!, 1 + i * 0.3);
  const bass = midi(COUNT_BASS[i]!);
  const lo = bass < midi("E2") ? bass + 12 : bass;
  piano.push({ t: s, d: 1.5, n: lo, v: 0.5 }, { t: s + 0.006, d: 1.5, n: lo - 12, v: 0.46 });
  COUNT_UPPER[i]!.forEach((n, k) => piano.push({ t: s + 0.01 * k, d: 0.9, n: midi(n), v: 0.46 }));
  // (The ukulele leaves the b9 to the horns: Db against the bass's C is theirs to make.)
  chop(s, voicing(i === 9 ? chord("C7") : ch, 3, midi("C4"), midi("B4")), 0.64);
  drum(kick, s, "C2", KICK_V, 1 + i * 0.5);
  choke.push({ t: s, d: 1, n: "D#3", v: 0.7 });
  if (i === 0) crash.push({ t: s, d: 1, n: "C#3", v: 0.5 });
  if (i < 7) {
    // A ticking clock between the counts.
    for (const beat of [1, 2, 3]) ticks.push({ t: s + beat, d: 1, n: "C4", v: 0.5 + i * 0.03 });
  }
  if (i >= 4 && i < 7) {
    // Counts 6–4: a "pah" on 3 and the sock cymbal on 2 and 4.
    chop(s + 2, voicing(ch, 3, midi("C4"), midi("B4")), 0.56);
    oom(s + 2, place(ch.tones[2]!, midi("G1"), midi("D3"), bass), -1);
    sock.push({ t: s + 1, d: 1, n: "G#2", v: 0.5 }, { t: s + 3, d: 1, n: "G#2", v: 0.55 });
    drum(softSnare, s + 2, "D2", SOFT_V, -4);
  }
  if (i >= 7) {
    // Counts 3–1: the saxes, horn and euphonium hold the chord and swell, the snare rolls.
    const up = COUNT_UPPER[i]!.map(midi);
    sopSus.push({ t: s + 0.5, d: 3.4, n: up[1]!, v: 0.5 + (i - 7) * 0.1 });
    tenSus.push({ t: s + 0.5, d: 3.4, n: up[0]!, v: 0.5 + (i - 7) * 0.1 });
    for (const n of i === 7 ? ["A3", "C4"] : ["G3", "Bb3"]) horn.push({ t: s + 0.25, d: 3.6, n: midi(n), v: 0.42 + (i - 7) * 0.1 }); // (velocities clear of the layer split at 0.5)
    euph.push({ t: s + 0.25, d: 3.6, n: midi(i === 7 ? "C3" : "C2"), v: 0.45 + (i - 7) * 0.08 });
    roll.push({ t: s + 0.25, d: 3.75, n: "D2", v: ROLL_V });
    drumDb.set(roll.at(-1)!, (i - 7) * 2.5);
  }
}
// "1": the clarinet runs up the dominant to its b9 and holds it, resolving down to the fifth at
// midnight. (It stays at or under E6: its top recording, labelled F#6, sounds F6, so anything
// played from it would come out a half step flat.)
lick(clarinet, bar(COUNT + 9), [
  [1, 0.3, "C5"], [1 + 1 / 3, 0.3, "E5"], [1 + 2 / 3, 0.3, "G5"],
  [2, 0.3, "Bb5"], [2 + 1 / 3, 1.55, "Db6"],
], 0.62);

// ---------------------------------------------------------------- midnight (bars 63–66)

const M = bar(MIDNIGHT);
// "Happy New Year!": everyone on F6, the cymbals crashing.
hit(M, ["C5", "F5", "A5", "C6"], ["F3", "C4", "A3"], 3);
oom(M, "F2", 4);
piano.push({ t: M, d: 2, n: midi("F2"), v: 0.62 }, { t: M + 0.006, d: 2, n: midi("F1"), v: 0.58 });
for (const [k, n] of ["A4", "C5", "F5", "A5"].entries()) piano.push({ t: M + 0.01 * k, d: 2, n: midi(n), v: 0.6 });
chop(M, [midi("C4"), midi("F4"), midi("A4")], 0.7);
lick(clarinet, M, [[0, 1.6, "C6"]], 0.62);
sopSus.push({ t: M + 0.15, d: 1.8, n: midi("F5"), v: 0.62 });
tenSus.push({ t: M + 0.15, d: 1.8, n: midi("C5"), v: 0.62 });
for (const n of ["F3", "A3", "C4"]) horn.push({ t: M, d: 1.9, n: midi(n), v: 0.6 });
euph.push({ t: M, d: 1.9, n: midi("F2"), v: 0.62 });
drum(kick, M, "C2", 0.7); // the loud layer, once
crash.push({ t: M, d: 1, n: "C#3", v: 0.9 });
cymbals.push({ t: M + 0.06 / SEC, d: 1, n: "C#3", v: 0.8 });
drum(snare, M, "D2", 0.5); // an accent (a louder layer)
// A drum fanfare (sixteenths, growing) into the trumpets' fanfare.
for (let k = 0; k < 8; k++) drum(snare, M + 2 + k * 0.25, "D2", SNARE_V, -7 + k * 1.2);
// The fanfare: the theme's first bar (A C F E) in thirds, the saxes on it too, the clarinet's
// descant above.
const FANFARE: [number, number, string, string][] = [
  [0, 1.4, "A4", "F4"],
  [1.5, 0.45, "C5", "A4"],
  [2, 1.4, "F5", "C5"],
  [3.5, 0.45, "E5", "Bb4"],
];
const F2BAR = bar(MIDNIGHT + 1);
for (const [dt, d, top, second] of FANFARE) {
  const t = lilt(F2BAR + dt);
  for (const [n, extra] of [[top, 0.004], [second, 0.016]] as [string, number][]) {
    const note = { t: t + extra, d, n: midi(n), v: 0.6 };
    tptStab.push(note);
    stabDb.set(note, 4);
  }
  sopSus.push({ t: t + 0.01, d, n: midi(top), v: 0.6 });
  tenSus.push({ t: t + 0.01, d, n: midi(second), v: 0.58 });
}
lick(clarinet, F2BAR, [[0, 1.4, "A5"], [1.5, 0.45, "C6"], [2, 1.4, "C6"], [3.5, 0.45, "Bb5"]], 0.55);
for (const n of ["A3", "C4"]) horn.push({ t: F2BAR, d: 1.9, n: midi(n), v: 0.55 });
for (const n of ["G3", "Bb3"]) horn.push({ t: F2BAR + 2, d: 1.9, n: midi(n), v: 0.55 });
kickBrass(F2BAR, ["F3", "C4"], [], 1);
kickBrass(F2BAR + 2, ["C3", "Bb3"], [], 1); // (no E under the fanfare's F5, a suspension resolving to E5)
oom(F2BAR, "F2", 2);
oom(F2BAR + 2, "C2", 1);
for (const beat of [1, 3]) {
  const t = F2BAR + beat;
  const fanfare = FANFARE.filter(([dt, d]) => dt < beat + 0.6 && dt + d > beat).map(([, , top, second]) => [midi(top), midi(second)]).flat();
  voicing(chordAt(t), 3, midi("F3"), midi("F4"), { avoid: fanfare }).forEach((n, k) => piano.push({ t: t + 0.012 * k, d: 0.55, n, v: 0.45 }));
  drum(snare, t, "D2", SNARE_V, 1);
}
for (const beat of [0, 2]) piano.push({ t: F2BAR + beat, d: 0.9, n: midi(beat ? "C3" : "F2"), v: 0.48 });
drum(kick, F2BAR, "C2", KICK_V, 4);
drum(kick, F2BAR + 2, "C2", KICK_V, 3);
crash.push({ t: F2BAR, d: 1, n: "C#3", v: 0.55 });
// The final chord, and the pivot: F6 -> F7 (V of Bb) under the "Auld Lang Syne" pickup.
const F3BAR = bar(MIDNIGHT + 2);
hit(F3BAR, ["F4", "A4", "C5", "F5"], ["F3", "A3"], 2);
oom(F3BAR, "F2", 2);
lick(clarinet, F3BAR, [[0, 1.8, "A5"]], 0.55);
for (const n of ["F3", "A3", "C4"]) horn.push({ t: F3BAR, d: 3.6, n: midi(n), v: 0.53 });
sopSus.push({ t: F3BAR + 0.1, d: 3, n: midi("A4"), v: 0.5 });
tenSus.push({ t: F3BAR + 0.1, d: 3, n: midi("F4"), v: 0.5 });
euph.push({ t: F3BAR, d: 3.6, n: midi("F2"), v: 0.55 });
drum(kick, F3BAR, "C2", KICK_V, 5);
crash.push({ t: F3BAR, d: 1, n: "C#3", v: 0.6 });
piano.push({ t: F3BAR, d: 2.5, n: midi("F2"), v: 0.55 }, { t: F3BAR + 0.006, d: 2.5, n: midi("F1"), v: 0.5 });
for (const [k, n] of ["F4", "A4", "C5", "F5"].entries()) piano.push({ t: F3BAR + 0.01 * k, d: 2.5, n: midi(n), v: 0.55 });
const PIVOT = bar(MIDNIGHT + 3);
for (const n of ["A3", "C4"]) horn.push({ t: PIVOT, d: 1.9, n: midi(n), v: 0.4 });
for (const n of ["A3", "Eb4"]) horn.push({ t: PIVOT + 2, d: 1.9, n: midi(n), v: 0.42 });
euph.push({ t: PIVOT, d: 1.9, n: midi("F2"), v: 0.45 }, { t: PIVOT + 2, d: 1.9, n: midi("F2"), v: 0.45 });

// ---------------------------------------------------------------- "Auld Lang Syne" (bars 67–82)

// The euphonium's bass line, a note a bar (the melody's half notes).
const ALS_BASS = ["Bb1", "D2", "C2", "F2", "Bb1", "Ab2", "G2", "Eb2", "F2", "G2", "C2", "F2", "Eb2", "C2", "Bb1", "Bb1"];
ALS_BASS.forEach((n, i) => {
  const s = bar(ALS + i);
  if (i === 7) euph.push({ t: s, d: 1.9, n: midi("Eb2"), v: 0.5 }, { t: s + 2, d: 1.9, n: midi("E2"), v: 0.5 }); // Eb6 -> Eo7
  else if (i === 13) euph.push({ t: s, d: 1.9, n: midi("C2"), v: 0.5 }, { t: s + 2, d: 1.9, n: midi("F2"), v: 0.5 }); // Cm7 -> F7
  else if (i === 15) euph.push({ t: s, d: 1.9, n: midi("Bb1"), v: 0.48 });
  else euph.push({ t: s, d: 3.8, n: midi(n), v: 0.5 });
});
// The horn's counter-line: a guide tone of each chord, the nearest to the last, under the saxes.
{
  let prev = midi("A3");
  for (let h = (ALS - 1) * 2; h < (BARS - 1) * 2 + 1; h++) {
    const ch = HALVES[h]!;
    const avoid = avoidIn(h);
    let best = prev;
    let bestCost = Infinity;
    for (const g of ch.guide) {
      for (let m = midi("F3"); m <= midi("Eb4"); m++) {
        if (pc(m) !== g) continue;
        const clash = avoid.some((a) => a - m === 1 || a - m === 13 || m - a === 1);
        const cost = Math.abs(m - prev) + (clash ? 20 : 0);
        if (cost < bestCost) [best, bestCost] = [m, cost];
      }
    }
    const v = h >= (ALS + 7) * 2 ? 0.46 : 0.42; // the second line sings out a little more
    const last = horn.at(-1);
    if (last && num(last.n) === best && Math.abs(last.t + last.d + 0.1 - h * 2) < 1e-6) last.d += 2;
    else horn.push({ t: h * 2, d: 1.9, n: best, v });
    prev = best;
  }
}
// Rocking piano: the bass on 1, the chord broken upward on 2, 3 and 4, under the tune.
{
  let prev: number[] | undefined;
  for (let b = ALS; b <= BARS; b++) {
    const s = bar(b);
    const first = chordAt(s);
    const second = chordAt(s + 2);
    const bassOf = (ch: Chord) => place(ch.bass, midi("Bb1"), midi("A2"), midi("F2"));
    piano.push({ t: s, d: 1.8, n: bassOf(first) + 12, v: 0.42 }, { t: s + 0.006, d: 1.8, n: bassOf(first), v: 0.38 });
    if (b === BARS) break; // the last bar: the drum pickup
    const long = leadIn(Math.floor(s / 2), true);
    const v = voicing(first, 3, midi("F3"), midi("C5"), { prev, avoid: avoidIn(Math.floor(s / 2)), ceil: long.length ? Math.min(...long) : undefined });
    prev = v;
    if (second.name !== first.name) {
      piano.push({ t: s + 1, d: 0.9, n: v[1]!, v: 0.34 }, { t: s + 2, d: 0.9, n: bassOf(second) + 12, v: 0.38 });
      const v2 = voicing(second, 3, midi("F3"), midi("C5"), { prev: v, avoid: avoidIn(Math.floor(s / 2) + 1) });
      piano.push({ t: s + 3, d: 0.9, n: v2[1]!, v: 0.34 }, { t: s + 3.01, d: 0.9, n: v2[2]!, v: 0.32 });
    } else {
      v.forEach((n, k) => piano.push({ t: s + 1 + k, d: 3 - k, n, v: 0.36 - k * 0.02 }));
    }
  }
}
// Brushes: a soft bass drum on 1 and a snare tap on 3 (the melody's 2), a cymbal swell at each line.
for (let b = ALS; b < BARS; b++) {
  drum(kick, bar(b), "C2", KICK_V, -5);
  drum(softSnare, bar(b) + 2, "D2", SOFT_V, -2);
}
crash.push({ t: bar(ALS), d: 1, n: "C#3", v: 0.3 }, { t: bar(ALS + 8), d: 1, n: "C#3", v: 0.32 });
// The pickup home: the drummer's break and the tuba walking C – E to the intro's F.
for (const [beat, db] of [[2, -6], [2.5, -4], [3, -2], [3.5, 0]] as [number, number][]) drum(snare, lilt(bar(BARS) + beat), "D2", SNARE_V, db);
drum(woodblock, lilt(bar(BARS) + 3.5), "C4", BLOCK_V, -1);
oom(bar(BARS) + 2, "C2", -2);
oom(bar(BARS) + 3, "E2", -1);

// ---------------------------------------------------------------- the kit in the choruses

for (let b = C1; b < COUNT; b++) {
  const s = bar(b);
  const solo = b >= C3 && b < OUT;
  const hot = (b >= C2 && b < C3) || b >= OUT;
  drum(kick, s, "C2", KICK_V, solo ? -6 : -1);
  drum(kick, s + 2, "C2", KICK_V, solo ? -7 : -2);
  for (const beat of [1, 3]) {
    // Snare on 2 and 4: light (brush-like) under the trumpet and the piano, firmer when hot.
    drum(snare, s + beat, "D2", SNARE_V, solo ? -9 : hot ? 0 : -4);
    if (hot) choke.push({ t: s + beat, d: 1, n: "D#3", v: beat === 3 ? 0.62 : 0.56 });
    if (b >= OUT) sock.push({ t: s + beat, d: 1, n: "G#2", v: 0.5 });
  }
}
// Phrase-end fills: woodblock Charlestons, snare pickups.
for (const b of [C1 + 7, C2 + 7, OUT + 3]) for (const beat of [2, 2.5, 3, 3.5]) drum(woodblock, lilt(bar(b) + beat), "C4", BLOCK_V, -7 + (beat - 2) * 3);
for (const b of [C1 + 15, C2 + 15]) for (const [beat, db] of [[2.5, -6], [3, -3.5], [3.5, -1]] as [number, number][]) drum(snare, lilt(bar(b) + beat), "D2", SNARE_V, db);
for (const [beat, v] of [[2, 0.45], [2.5, 0.5]] as [number, number][]) toms.push({ t: lilt(bar(COUNT - 1) + beat), d: 1, n: "A2", v });
for (const [beat, v] of [[3, 0.55], [3.5, 0.62]] as [number, number][]) tomsLow.push({ t: lilt(bar(COUNT - 1) + beat), d: 1, n: "F2", v });
for (const b of [C2, C2 + 8, OUT, OUT + 4]) crash.push({ t: bar(b), d: 1, n: "C#3", v: b === OUT ? 0.55 : 0.45 });

// ---------------------------------------------------------------- the party

// The crowd bed starts at midnight, so its one seam (where it starts over) hides under the cheer.
const crowd: Note[] = [{ t: M, d: 1, n: "C4", v: 0.7 }];
const CROWD_RING = (LOOP * SEC) - 0.1;
// Glasses clink here and there (off the beat: people, not the band), a toast cluster at midnight.
const CLINKS: [number, number][] = [
  [C1 + 2, 1.3], [C1 + 10, 2.6], [C2 + 3, 3.2], [C2 + 12, 1.7], [C3 + 3, 2.2], [OUT + 3, 0.8],
  [MIDNIGHT + 1, 0.5], [MIDNIGHT + 1, 1.6], [MIDNIGHT + 1, 2.9], [MIDNIGHT + 2, 0.7], [MIDNIGHT + 2, 2.4], [MIDNIGHT + 3, 1.3],
  [ALS + 2, 2.6], [ALS + 5, 1.4], [ALS + 9, 3.1], [ALS + 12, 0.9],
];
const clinks: Note[] = CLINKS.map(([b, beat]) => ({ t: bar(b) + beat, d: 1, n: "C4", v: b >= MIDNIGHT && b < ALS ? 0.75 : 0.55 }));
// Champagne: one impatient cork in chorus 2, three at midnight.
const corks: Note[] = [
  { t: bar(C2 + 9) + 1.3, d: 1, n: "C4", v: 0.5 },
  { t: M + 1.2, d: 1, n: "C4", v: 0.8 },
  { t: M + 3.1, d: 1, n: "C4", v: 0.75 },
  { t: M + 5.6, d: 1, n: "C4", v: 0.7 },
];
// The cheer (two takes, left and right), big applause fading out, a table of glasses clinking.
const cheerL: Note[] = [{ t: M + 0.15, d: 1, n: "C4", v: 0.8 }];
const cheerR: Note[] = [{ t: M + 0.35, d: 1, n: "C4", v: 0.8 }];
// The cheer dies away (and the big applause fades, from 2.2 s) before the "Auld Lang Syne" pickup
// 3.5 s after midnight, so its first note isn't sung into a wall of noise.
const CHEER_RING = 3.3;
const ovation: Note[] = [{ t: M + 0.3, d: 1, n: "C4", v: 0.7 }];
const toast: Note[] = [{ t: M + 6, d: 1, n: "C4", v: 0.7 }];
// Applause for the pianist, and after "Auld Lang Syne".
const applause: Note[] = [
  { t: bar(OUT) + 0.4, d: 1, n: "C4", v: 0.5 },
  { t: bar(BARS - 1) + 1, d: 1, n: "C4", v: 0.6 },
];
/**
 * A one-shot faded out from `from` to `to` seconds: copies of the track whose rings step down
 * (the sampler has no envelope for a recording's length), each copy a share of the level.
 */
function fadeOut(track: Track, from: number, to: number, steps = 6): Track[] {
  return Array.from({ length: steps }, (_, i) => ({ ...track, gain: (track.gain ?? 1) / steps, ring: from + ((to - from) * (i + 1)) / steps }));
}

// ---------------------------------------------------------------- the song

const CLAR_V = 0.75; // the loud layer
const CLAR_RUN = 0.5; // beats: a note this short is part of a run or lick (the staccato takes)
const CLAR_REF = zoneDb("clarinet", midi("A5"), CLAR_V);
/** The clarinet's level: up front in the intro, chorus 1 and the countdown, an obbligato in the out-chorus. */
const clarLevel = (n: Note) => (n.t >= bar(OUT) && n.t < bar(COUNT) ? 0.25 : 0.63);
/** A horn note evened to the A3 of its own velocity layer (its F3 take sits 9 dB under the A3). */
const hornEven = (n: Note) => dB(evenDb(zoneDb("horn", midi("A3"), n.v ?? 0.7), zoneDb("horn", num(n.n), n.v ?? 0.7)));

const sopranoLine: Note[] =[...lilted(soli).map((n) => ({ ...n, v: 0.62 + (n.v ?? 0) * 0.08 })), ...lilted(outSoprano).map((n) => ({ ...n, v: 0.55 + (n.v ?? 0) * 0.06 })), ...alsTune.map((n) => ({ ...n, v: 0.6 + (n.v ?? 0) * 0.08 }))];
const tenorLine: Note[] = [...lilted(soliTenor).map((n) => ({ ...n, v: 0.55 + (n.v ?? 0) * 0.06 })), ...lilted(outTenor).map((n) => ({ ...n, v: 0.5 + (n.v ?? 0) * 0.06 })), ...alsTenor.map((n) => ({ ...n, v: 0.52 + (n.v ?? 0) * 0.06 }))];

const song: Song = {
  name: "newyear",
  bpm: BPM,
  beatsPerBar: BEATS,
  bars: BARS,
  reverb: { room: 0.5, damp: 0.5, width: 0.85, level: 0.8 },
  // The game shows "10" ... "1" from countdownStart, one a second; midnight is the cheer.
  cues: { countdownStart: bar(COUNT) * SEC, midnight: bar(MIDNIGHT) * SEC },
  tracks: [
    // The lead: harmon-muted trumpet, its buzz tamed by a low-pass (a hat-muted 1920s sound).
    ...byGain({ inst: "trumpetMute", pan: 0.05, reverb: 0.3, humanize: 0.35, lowpass: 1700, label: "trumpet (lead)" }, lilted(leadNotes), (n) => 6.5 * dB(leadGainDb(num(n.n)) + (n.t >= bar(OUT) ? 3 : 0))),
    // The sax section.
    { inst: "sopranoSax", notes: [...sopranoLine, ...sopSus], gain: 0.75, pan: 0.15, reverb: 0.3, humanize: 0.3, lowpass: 4500, label: "soprano sax" },
    // (The tenor 3 dB up in the out-chorus, where it is the inner voice of three under the trumpet.)
    ...byGain({ inst: "sax", pan: -0.15, reverb: 0.3, humanize: 0.3, lowpass: 5000, label: "tenor sax" }, [...tenorLine, ...tenSus], (n) => 0.5 * dB(n.t >= bar(OUT) && n.t < bar(COUNT) ? 3 : 0)),
    { inst: "sax", notes: pads, gain: 0.26, pan: -0.3, reverb: 0.35, humanize: 0.3, lowpass: 4000, label: "tenor pads" },
    ...byGain({ inst: "sopranoSaxShort", pan: 0.2, reverb: 0.25, humanize: 0.4, lowpass: 4500, ring: 0.32, label: "sax stabs (soprano)" }, sopStab, (n) => 0.36 * dB(stabDb.get(n) ?? 0)),
    ...byGain({ inst: "saxShort", pan: -0.2, reverb: 0.25, humanize: 0.4, lowpass: 4500, ring: 0.32, label: "sax stabs (tenor)" }, tenStab, (n) => 0.36 * dB(stabDb.get(n) ?? 0)),
    // The clarinet: runs, fills, the obbligato. All on the loud layer: the middle layer's F5 take
    // (which plays E5–G#5) is 16 dB quieter than its neighbours and sharp on short notes. Held
    // notes play the sustained takes; runs and licks (eighths and shorter) the staccato takes,
    // which speak at once (the sustained ones below A5 swell in over 120-150 ms, so a run on them
    // lost every note but its top). Each note is evened to the sustained A5's level.
    ...byGain(
      { inst: "clarinet", pan: 0.3, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "clarinet" },
      clarinet.filter((n) => n.d > CLAR_RUN).map((n) => ({ ...n, v: CLAR_V })),
      (n) => clarLevel(n) * dB(evenDb(CLAR_REF, zoneDb("clarinet", num(n.n), CLAR_V, n.d * SEC))),
    ),
    ...byGain(
      { inst: "clarinetShort", pan: 0.3, reverb: 0.3, humanize: 0.3, lowpass: 4000, ring: 0.3, label: "clarinet" },
      clarinet.filter((n) => n.d <= CLAR_RUN).map((n) => ({ ...n, v: CLAR_V })),
      (n) => clarLevel(n) * dB(evenDb(CLAR_REF, zoneDb("clarinetShort", num(n.n), CLAR_V, n.d * SEC))),
      true,
    ),
    // Brass.
    ...byGain({ inst: "trumpetShort", pan: -0.25, reverb: 0.25, humanize: 0.4, lowpass: 5000, ring: 0.6, label: "trumpets" }, tptStab, (n) => 0.8 * dB(stabDb.get(n) ?? 0), true),
    ...byGain({ inst: "tromboneShort", pan: 0.3, reverb: 0.25, humanize: 0.4, ring: 0.4, label: "trombones" }, tbnStab, (n) => 0.5 * dB(stabDb.get(n) ?? 0)),
    // (Each horn note evened to the A3 of its own layer, so velocity still swells it.)
    ...byGain({ inst: "horn", pan: -0.25, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn" }, horn, (n) => (n.t >= bar(ALS) ? 0.75 : 0.6) * hornEven(n)),
    ...euphonium(euph, { gain: 1.6, pan: 0.1, reverb: 0.3, humanize: 0.15 }),
    // Rhythm: tuba oom-pah, stride piano, ukulele "banjo".
    ...byGain({ inst: "tubaShort", pan: 0, reverb: 0.12, humanize: 0.25, ring: 0.4, label: "tuba" }, tuba, (n) => 0.5 * dB(tubaDb.get(n) ?? 0)),
    { inst: "piano", notes: lilted(piano), gain: 0.07, pan: -0.3, reverb: 0.2, humanize: 0.4, label: "piano" },
    { inst: "piano", notes: pianoSolo, gain: 0.07, pan: -0.2, reverb: 0.22, humanize: 0.3, label: "piano (solo)" },
    { inst: "ukulele", notes: uke, gain: 0.095, pan: 0.35, reverb: 0.15, humanize: 0.3, ring: 0.14, label: "ukulele (banjo)" },
    // The kit: a dark 1920s set.
    ...byGain({ inst: "kick", reverb: 0.05, humanize: 0.3, label: "kick" }, kick, (n) => 0.34 * dB(drumDb.get(n) ?? 0)),
    ...byGain({ inst: "snareOn", pan: 0.05, reverb: 0.18, humanize: 0.4, lowpass: 6000, label: "snare" }, snare, (n) => 2 * dB(drumDb.get(n) ?? 0)),
    ...byGain({ inst: "snare", pan: 0.05, reverb: 0.18, humanize: 0.4, label: "snare (brushes)" }, softSnare, (n) => 1.4 * dB(drumDb.get(n) ?? 0)),
    ...byGain({ inst: "snareRoll", pan: 0.05, reverb: 0.2, lowpass: 6000, label: "snare roll" }, roll, (n) => 0.4 * dB(drumDb.get(n) ?? 0)),
    { inst: "ride", notes: choke, gain: 1.6, pan: 0.3, reverb: 0.15, humanize: 0.4, lowpass: 4500, ring: 0.16, label: "cymbal (choked)" },
    { inst: "hatPedal", notes: sock, gain: 0.8, pan: 0.25, reverb: 0.1, humanize: 0.4, lowpass: 5000 },
    { inst: "crash", notes: crash, gain: 0.5, pan: -0.3, reverb: 0.2, lowpass: 6000 },
    { inst: "cymbals", notes: cymbals, gain: 0.2, pan: 0.2, reverb: 0.25, lowpass: 6000 },
    ...byGain({ inst: "woodblock", pan: 0.25, reverb: 0.15, humanize: 0.3, label: "woodblock" }, woodblock, (n) => 0.3 * dB(drumDb.get(n) ?? 0)),
    { inst: "triangleMuted", notes: ticks, gain: 2.4, pan: -0.25, reverb: 0.2, humanize: 0, lowpass: 7000 },
    { inst: "tomHigh", notes: toms, gain: 0.5, pan: 0.2, reverb: 0.15 },
    { inst: "tomLow", notes: tomsLow, gain: 0.4, pan: -0.15, reverb: 0.15 },
    // The party.
    { inst: "crowd", notes: crowd, gain: 0.16, reverb: 0.05, humanize: 0, ring: CROWD_RING, label: "crowd" },
    // Glass is the brightest thing in the song (it made the mix 13 dB brighter than the others
    // above 8 kHz): low-passed, the "ting" stays and the sizzle goes.
    { inst: "clink", notes: clinks, gain: 0.32, pan: 0.4, reverb: 0.25, humanize: 0, lowpass: 4500, label: "clinks" },
    { inst: "cork", notes: corks, gain: 0.32, pan: -0.35, reverb: 0.25, humanize: 0, label: "corks" },
    { inst: "cheer", notes: cheerL, gain: 0.2, pan: -0.45, reverb: 0.15, humanize: 0, lowpass: 6000, ring: CHEER_RING, label: "cheer" },
    { inst: "cheer", notes: cheerR, gain: 0.2, pan: 0.45, reverb: 0.15, humanize: 0, lowpass: 6000, ring: CHEER_RING, label: "cheer" },
    ...fadeOut({ inst: "applauseBig", notes: ovation, gain: 0.16, reverb: 0.1, humanize: 0, lowpass: 6000, label: "applause (midnight)" }, 2.2, 4.6),
    { inst: "clinking", notes: toast, gain: 0.18, pan: 0.3, reverb: 0.2, humanize: 0, ring: 12.5, lowpass: 3500, label: "clinking" },
    { inst: "applause", notes: applause, gain: 0.05, pan: -0.1, reverb: 0.1, humanize: 0, ring: 5, lowpass: 6000, label: "applause" },
  ],
};

export default song;
