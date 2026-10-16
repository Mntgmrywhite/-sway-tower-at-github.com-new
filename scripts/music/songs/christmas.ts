// Christmas: a Christmas festival for the Victorian London skin (A Christmas Carol). A symphonic
// pops medley of public-domain carols on the spine of our theme, in the spirit of the concert
// hall's Christmas pops: the full orchestra, carols passed from section to section, festive
// modulations and a grand finale. The carols are traditional tunes in our own arrangement and our
// own order, joined by our own links; no two carols are ever combined against each other.
//
// 68 bars of the theme's 6/8 (90.7 s); each carol keeps its own metre and tempo on that grid:
//   bars  1–8   the theme's A A' (F major, 6/8): the flute and the violins sing it over the harp,
//               horns, a pizzicato bass and sleigh bells; handbells ring in the top.
//         9–15  Deck the Halls (B flat, 4/4, quarter = 154): the clarinet and the flute over
//               pizzicato strings, the xylophone on the fa-la-las; the trumpets and horns answer
//               with the last fa-la-la.
//           16  a clarinet and flute run tumbles down over a timpani roll on D into
//        17–24  God Rest Ye Merry, Gentlemen (G minor), the carol at Scrooge's keyhole: a minor
//               march, the clarinet with the cellos and a horn an octave under it, over staccato
//               tuba, viola pizzicato, snare and timpani; "O tidings of comfort and joy" goes to the
//               violins and the flute over the brass, and its last chord turns to G major (a
//               Picardy third) as the sleigh bells shake in.
//        25–32  Jingle Bells (G major, cut time, half = 90): the parlor piano in octaves over a
//               sleigh, the band joining for its second line: flute, violins, glockenspiel, horns,
//               trumpet stabs.
//        33–37  Good King Wenceslas (G major, quarter = 154): a street brass band, the euphonium
//               on the tune, a horn a third above, trombone after-beats, tuba, snare and bass drum.
//               Its held last note becomes the ninth of an F chord, and a harp sweep turns to
//        37–49  Silent Night (B flat, 6/8, dotted quarter = 60): the French horn sings the first
//               phrase over the harp (Scrooge's niece plays the harp at Fred's party), the violins
//               and the flute the last, the horn below them; it eases into its last bar.
//        50–60  O Come, All Ye Faithful (E flat, quarter about 104): after a swell on the
//               dominant, a brass choir (horns, euphonium, tuba) sings "O come, let us adore Him";
//               the whole orchestra the next line, broadening into "Christ the Lord".
//        61–68  the theme's B A'' (F major) as the grand finale: the horn countermelody and the
//               euphonium's hymn under the flute and violins, a clarinet run, then the euphonium on
//               the tune two octaves under them, handbells, clash cymbals, and a harp sweep up
//               the dominant seventh back to bar 1.
//
// Register plan (each section keeps its parts in separate octaves):
//   bass pizz G1–G2 · tuba G1–G2, staccato tuba D2–C3 · cellos D2–G3 (bass), F3–D4 (God Rest's
//   tune) · piano left hand D2–G4 · euphonium F2–F3 (hymn, chorale, harmony), D3–A3
//   (Wenceslas), F3–F4 (the finale's tune) · horns Bb2–D4 (D4 at most: the recorded horn has
//   nothing between C4 and D5) · trombone after-beats F#3–C4 · harp F2–Bb5 · clarinet D4–Bb5 ·
//   violins C4–D6 (tunes), Bb3–Eb5 (Silent Night), D5–Bb5 (pads) · trumpets F4–G5 · flute D4–A6
//   · glockenspiel and xylophone Bb5–G7.
//
// Mix (scripts/music/mix.ts, dB against the mix per 4-bar phrase): each section's lead sits
// within about 6 dB (the flute and violins, the clarinet, the horn, the piano, the euphonium);
// the horns, euphonium and drums that support it within about 10 to 15. Measured as heard
// (scripts/music/tuning.ts), every note of the piano, horns, trombone, tuba and euphonium is
// within 5 cents. The bells are hand chimes (handbells, as the Victorian ringers carried round at
// Christmas), tuned as heard like every pitched set: the tubular bells' loudest partials sit 25-40
// cents off true (their fifth partial is flat on every take, the octave above often sharp).
//
// Tuning is the sampler's (every note tuned as heard at its length, instruments.ts), except the
// timpani: the recorded drums sit at odd pitches and the sampler rotates through them, so this
// file works out which drum each stroke lands on and plays it at the note the harmony wants
// (timpani()).

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import { CHORDS as THEME_CHORDS, EIGHTHS_PER_BAR, melody, THEME_BPM, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** The loop, in eighths at the theme's tempo: 68 bars of 6/8. */
const LOOP = 68 * BAR;
const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));

// ---------------------------------------------------------------- time

/**
 * A section of the medley, written in its own beats (a quarter, a half or an eighth) and placed on
 * the loop's eighths: beat b falls at start + b * per. With `rit` it slows from beat `from`, until
 * a beat from `to` on lasts `factor` times as long (a ritardando).
 */
class Sec {
  constructor(
    readonly start: number,
    readonly per: number,
    readonly rit?: { from: number; to: number; factor: number },
  ) {}

  at(b: number): number {
    const { start, per, rit } = this;
    if (!rit || b <= rit.from) return start + b * per;
    const span = rit.to - rit.from;
    const x = Math.min(b, rit.to) - rit.from;
    const eased = start + rit.from * per + per * (x + ((rit.factor - 1) * x * x) / (2 * span));
    return eased + Math.max(0, b - rit.to) * per * rit.factor;
  }

  /** A note at beat b lasting d beats. */
  n(b: number, d: number, n: string | number, v: number): Note {
    const t = this.at(b);
    return { t, d: this.at(b + d) - t, n: num(n), v };
  }
}

const OPEN = new Sec(0, 1); // the theme's A A', in eighths
const DECK = new Sec(48, 1.75); // Deck the Halls, in quarters
const LINK = new Sec(90, 1.75); // one bar on D, into G minor
const GREST = new Sec(97, 1.75); // God Rest Ye Merry, Gentlemen
const JINGLE = new Sec(144.25, 3); // Jingle Bells, in halves
const WENC = new Sec(192.25, 1.75); // Good King Wenceslas
const SILENT = new Sec(220.25, 1.5, { from: 42, to: 48, factor: 1.5 }); // Silent Night, in eighths
const FINALE = new Sec(360, 1); // the theme's B A''
/** O Come, All Ye Faithful fills the rest: from beat -2 (the swell into E flat) to the end of its last chord (beat 22). */
const ADESTE = (() => {
  const rit = { from: 16, to: 22, factor: 1.45 };
  const from = SILENT.at(48);
  const unit = new Sec(0, 1, rit);
  const per = (FINALE.start - from) / (unit.at(22) - unit.at(-2));
  return new Sec(from + 2 * per, per, rit);
})();

/** A tune written as "F5:1.5 Eb5:.5 D5 C5 | ...": note[:beats] (a missing length repeats the last), "r" rests, "|" bar lines (checked against `bar` beats, but for a pickup and the last bar). */
interface Tone {
  t: number;
  d: number;
  n: number;
}
function line(src: string, from = 0, bar = 0): Tone[] {
  const out: Tone[] = [];
  let t = from;
  let d = 1;
  let barStart = from;
  let first = true;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === "|") {
      if (bar && !first && Math.abs(t - barStart - bar) > 1e-9) throw new Error(`a bar of ${t - barStart} beats in "${src}"`);
      first = false;
      barStart = t;
      continue;
    }
    const [name, len] = tok.split(":");
    if (len !== undefined) d = Number(len);
    if (name !== "r") out.push({ t, d, n: midi(name!) });
    t += d;
  }
  return out;
}

// ---------------------------------------------------------------- harmony

interface Chord {
  root: number;
  /** Pitch class in the bass (the root, or a slash chord's bass). */
  bass: number;
  /** Pitch classes: root, 3rd, 5th, 7th, 9th as the chord has them. */
  pcs: number[];
  third?: number;
  seventh?: number;
}
const QUALITY: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], "9": [0, 4, 7, 10, 2], dim: [0, 3, 6] };
const pcOf = (name: string) => midi(`${name}0`) % 12;

function chord(sym: string): Chord {
  const m = /^([A-G][b#]?)(m7|m|7|9|dim)?(?:\/([A-G][b#]?))?$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const root = pcOf(m[1]!);
  const ints = QUALITY[m[2] ?? ""]!;
  const pcs = ints.map((i) => (root + i) % 12);
  return { root, bass: m[3] ? pcOf(m[3]) : root, pcs, third: pcs[1], seventh: ints.includes(10) ? (root + 10) % 12 : undefined };
}

/** The chord of every stretch of the loop, in eighths. */
const HARMONY: { t: number; d: number; c: Chord }[] = [];
/**
 * Chords written like a tune ("Bb:3 F | Gm F Bb Bb"), from beat `from` of a section, bar lines
 * checked against `bar` beats; `beats` is the section's whole length, checked too.
 */
function harmonize(sec: Sec, src: string, beats: number, from = 0, bar = 0): void {
  let b = from;
  let d = 1;
  let barStart = from;
  let first = true;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === "|") {
      if (bar && !first && Math.abs(b - barStart - bar) > 1e-9) throw new Error(`a bar of ${b - barStart} beats in "${src}"`);
      first = false;
      barStart = b;
      continue;
    }
    const [sym, len] = tok.split(":");
    if (len !== undefined) d = Number(len);
    const t = sec.at(b);
    HARMONY.push({ t, d: sec.at(b + d) - t, c: chord(sym!) });
    b += d;
  }
  if (Math.abs(b - from - beats) > 1e-9) throw new Error(`${b - from} beats of chords, not ${beats}, in "${src}"`);
}
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SUFFIX: Record<Quality, string> = { maj: "", min: "m", dom7: "7", min7: "m7", dim: "dim" };
/** The theme's chord for half bar i, in F major. */
const themeChord = (i: number) => {
  const [root, q] = THEME_CHORDS[i]!;
  return `${FLAT[(pcOf(root) + 5) % 12]}${SUFFIX[q]}:3`;
};
harmonize(OPEN, Array.from({ length: 16 }, (_, i) => themeChord(i)).join(" "), 48);
harmonize(DECK, "Bb:3 F:1 | Gm F Bb Bb | F:2 Bb:1 Gm | Bb/F:1 F Bb:2 | Eb:2 Bb:2 | Bb/F:1 F7 Bb:2", 24, 0, 4);
harmonize(LINK, "D7:4", 4);
harmonize(GREST, "Gm:2 D:2 | Gm:1 Dm Eb Bb | Gm F Eb F7/C | Bb:2 Gm:1 F:1 | Bb Eb/G F Eb | Bb F7/C Gm/D D7 | Gm:2 G:1", 27, 0, 4);
harmonize(JINGLE, "G:8 | C:2 G:2 | D7:2 G:2", 16);
harmonize(WENC, "G G Em D7 | G:2 D7:2 | C:1 G C D7 | G:2 F9:2", 16, 0, 4);
harmonize(SILENT, "Bb:6 | Bb:6 | F7:6 | Bb:6 | F7:6 | Bb:6 | Bb/F:3 F7:3 | Bb:6", 48, 0, 6);
harmonize(ADESTE, "Bb7:1 Eb:1 | Eb Bb/D Cm Ab | Eb/Bb:2 Bb7:1 Eb | Fm Eb/G Bb Cm | Bb Bb7/Ab Eb/G Ab | Eb/Bb:2 Bb7:1.5 Eb:.5 | Eb:2", 24, -2, 4);
harmonize(FINALE, Array.from({ length: 16 }, (_, i) => themeChord(i + 16)).join(" "), 48);

HARMONY.sort((a, b) => a.t - b.t).reduce((end, h) => {
  if (Math.abs(h.t - end) > 1e-6) throw new Error(`the chords jump from eighth ${end} to ${h.t}`);
  return h.t + h.d;
}, 0);
if (Math.abs(HARMONY.at(-1)!.t + HARMONY.at(-1)!.d - LOOP) > 1e-6) throw new Error("the chords don't fill the loop");

function chordAt(t: number): Chord {
  const u = ((t % LOOP) + LOOP) % LOOP;
  const span = HARMONY.find((h) => u >= h.t - 1e-9 && u < h.t + h.d - 1e-9);
  if (!span) throw new Error(`no chord at eighth ${u}`);
  return span.c;
}

/** Chord tones from `lo` to `hi` (inclusive), ascending. */
function tonesIn(c: Chord, lo: string | number, hi: string | number): number[] {
  const out: number[] = [];
  for (let m = num(lo); m <= num(hi); m++) if (c.pcs.includes(m % 12)) out.push(m);
  return out;
}

/** The lowest note at or above `lo` with pitch class `pc`. */
function low(pc: number, lo: string | number): number {
  const m = num(lo);
  return m + ((((pc - m) % 12) + 12) % 12);
}

/** True when two pitches rub: a semitone apart, give or take octaves. */
const rubs = (a: number, b: number) => [1, 11].includes((((a - b) % 12) + 12) % 12);

/**
 * An n-voice voicing of `c` within [lo, hi] that moves as little as possible from `prev` (common
 * tones hold, the way a section voices it): different notes, always the 3rd, and the 7th of a
 * seventh chord.
 */
function voicing(c: Chord, lo: string | number, hi: string | number, prev: number[] | null, n = 3): number[] {
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
    if (c.third !== undefined && !pcs.has(c.third)) return false;
    return !strict || c.seventh === undefined || n < 3 || pcs.has(c.seventh);
  };
  let fit = options.filter((v) => fits(v, true));
  if (!fit.length) fit = options.filter((v) => fits(v, false));
  // Too narrow a range for this chord: widen it a semitone each way.
  if (!fit.length) return voicing(c, num(lo) - 1, num(hi) + 1, prev, n);
  const centre = (num(lo) + num(hi)) / 2;
  const cost = (v: number[]) => (prev && prev.length === n ? v.reduce((s, x, i) => s + Math.abs(x - prev[i]!), 0) : Math.abs(v.reduce((a, b) => a + b, 0) / n - centre));
  return fit.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}

/**
 * Sustained chords for a part: one voicing per chord of the harmony from eighth `from` to `to`,
 * a voice holding while its note stays the same.
 */
function pads(from: number, to: number, lo: string, hi: string, n: number, v: number | ((t: number) => number)): Note[] {
  const spans = HARMONY.filter((h) => h.t >= from - 1e-9 && h.t < to - 1e-9).sort((a, b) => a.t - b.t);
  const out: Note[] = [];
  let prev: number[] | null = null;
  const held: (Note | null)[] = Array.from({ length: n }, () => null);
  for (const s of spans) {
    const vc = voicing(s.c, lo, hi, prev, n);
    const end = Math.min(to, s.t + s.d);
    vc.forEach((m, i) => {
      const h = held[i];
      if (h && h.n === m && Math.abs(h.t + h.d - s.t) < 1e-6) h.d = end - h.t;
      else {
        const note: Note = { t: s.t, d: end - s.t, n: m, v: typeof v === "number" ? v : v(s.t) };
        out.push(note);
        held[i] = note;
      }
    });
    prev = vc;
  }
  return out;
}

// ---------------------------------------------------------------- level helpers

/** Velocity that plays `db` louder (or quieter) than velocity `v` (the sampler plays 0.35 + 0.65 v). */
function trim(v: number, db: number, lo = 0.05, hi = 1): number {
  const amp = (0.35 + 0.65 * v) * 10 ** (db / 20);
  return Math.min(hi, Math.max(lo, (amp - 0.35) / 0.65));
}

/** Measured sustain level (dB) of the recording a note plays, choosing the zone the way the sampler does. */
function zoneLevel(zones: [string, number][], note: number): number {
  let best = zones[0]!;
  let bestCost = Infinity;
  for (const z of zones) {
    const d = note - midi(z[0]);
    const cost = d >= 0 ? d : -d * 1.3;
    if (cost < bestCost) {
      bestCost = cost;
      best = z;
    }
  }
  return best[1];
}

/** The flute's sustain levels (dB) per recording: its high recordings are much louder than its low ones. */
const FLUTE_LEVELS: [string, number][] = [["A4", -29], ["C5", -30], ["E5", -23], ["A5", -23], ["C6", -22], ["E6", -16], ["A6", -16], ["C7", -10]];
/** A flute velocity that evens most of that out, `db` louder or softer. */
const fluteV = (n: number, v: number, db = 0) => trim(v, db - (zoneLevel(FLUTE_LEVELS, n) + 22) * 0.75);

/**
 * Level (dB RMS over its first 0.05–0.6 s, after the sampler's `even` scaling) of the recording the
 * sampler plays for `note` at velocity `v`.
 */
function recordingDb(name: InstrumentName, note: number, v: number): number {
  const z = instrument(name).zoneFor(note, v);
  const { left, right, rate } = z.audio;
  const a = Math.round(rate * 0.05);
  const b = Math.min(left.length, Math.round(rate * 0.6));
  let sum = 0;
  for (let i = a; i < b; i++) sum += left[i]! ** 2 + right[i]! ** 2;
  return 10 * Math.log10(sum / (2 * Math.max(1, b - a))) + 20 * Math.log10(z.level ?? 1);
}

/**
 * A part split into one track per recording it plays, each with the gain that brings that
 * recording to `db` (as recordingDb() measures it): for sets whose recordings differ in loudness
 * by more than a velocity layer's range can even out.
 */
function evenTracks(track: SampledTrack, db: number): Track[] {
  const byZone = new Map<string, Note[]>();
  for (const n of track.notes) {
    const z = instrument(track.inst).zoneFor(num(n.n), n.v ?? 0.7);
    const key = `${z.note}/${z.layer}`;
    byZone.set(key, [...(byZone.get(key) ?? []), n]);
  }
  return [...byZone.values()].map((notes) => {
    const level = recordingDb(track.inst, num(notes[0]!.n), notes[0]!.v ?? 0.7);
    return { ...track, notes, gain: (track.gain ?? 1) * 10 ** ((db - level) / 20) };
  });
}

/**
 * The harp's strings ring for ten seconds. A harpist damps a string when the harmony moves to a
 * chord it would rub against (a semitone from one of its notes). Each note rings until the first
 * such chord within two bars, else at most 3 s; one track per ring time.
 */
function damped(track: SampledTrack): Track[] {
  const byRing = new Map<number, Note[]>();
  const seconds = 60 / THEME_BPM;
  for (const n of track.notes) {
    let ring = 3 / seconds;
    for (const h of HARMONY) {
      const ahead = (((h.t - n.t) % LOOP) + LOOP) % LOOP;
      if (ahead < 0.01 || ahead > 2 * BAR) continue;
      if (h.c.pcs.some((pc) => rubs(num(n.n), pc))) ring = Math.min(ring, ahead);
    }
    const key = Math.round(ring * seconds * 100) / 100;
    byRing.set(key, [...(byRing.get(key) ?? []), n]);
  }
  return [...byRing].map(([ring, notes]) => ({ ...track, notes, ring }));
}

/**
 * The brass recordings take 30–110 ms to speak (most about 50), against the drums' and the
 * pizzicato's instant attacks: start sustained brass this many eighths early, as players do.
 */
const SPEAK = 0.15;
const early = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: Math.max(0, n.t - SPEAK) }));

// ---------------------------------------------------------------- the parts

const flute: Note[] = [];
const fluteSoft: Note[] = []; // Silent Night
const clarinet: Note[] = [];
const violins: Note[] = []; // the tunes
const violinsSoft: Note[] = []; // Silent Night's tune
const violinsPad: Note[] = [];
const cellos: Note[] = [];
const cellosTune: Note[] = [];
const vlnPizz: Note[] = [];
const vlaPizz: Note[] = [];
const bassPizz: Note[] = [];
const hornPad: Note[] = [];
const hornTune: Note[] = []; // God Rest's line, O Come's chorale melody
const hornSilent: Note[] = []; // Silent Night: the solo, then the line under the violins
const hornLine: Note[] = []; // the finale's countermelody and harmony, Wenceslas's harmony
const hornShort: Note[] = [];
const trumpets: Note[] = [];
const tromboneShort: Note[] = [];
const euphTune: Note[] = []; // Wenceslas
const euphLow: Note[] = []; // God Rest's refrain, O Come's tenor
const euphHymn: Note[] = []; // the finale's hymn under the horn's countermelody
const euphFinale: Note[] = []; // the finale's tune
const tuba: Note[] = [];
const tubaShort: Note[] = [];
const piano: Note[] = [];
const pianoLeft: Note[] = [];
const harp: Note[] = [];
const harpSilent: Note[] = []; // Silent Night's accompaniment
const glock: Note[] = [];
const xylo: Note[] = [];
const bells: Note[] = [];
interface Hit {
  t: number;
  d: number;
  /** The pitch it should sound. */
  n: string;
  v: number;
}
const timpHits: Hit[] = [];
const timpRolls: Hit[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const kick: Note[] = [];
const cymbals: Note[] = [];
const crash: Note[] = [];
const triangle: Note[] = [];
const triangleTicks: Note[] = [];
const sleigh: Note[] = [];

/**
 * A timpani roll: strokes `rate` per eighth from `from` to `to` (eighths), swelling from v0 to v1,
 * the two sticks a little uneven (the second a touch late and lighter) so it doesn't machine-gun.
 */
function timpRoll(from: number, to: number, n: string, v0: number, v1: number, rate = 4): void {
  const count = Math.max(2, Math.round((to - from) * rate));
  const step = (to - from) / count;
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    const t = from + step * (i + (left ? 0 : 0.12));
    timpRolls.push({ t, d: 1, n, v: v0 + ((v1 - v0) * i) / (count - 1) - (left ? 0 : 0.03) });
  }
}

/** A snare roll held from eighth `from` to `to`, swelling in steps (each restart a small accent). */
function snareRoll(from: number, to: number, v0: number, v1: number, steps = 3): void {
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    roll.push({ t: a, d: (to - from) / steps, n: "D2", v: v0 + ((v1 - v0) * i) / Math.max(1, steps - 1) });
  }
}

// ---------------------------------------------------------------- the theme (bars 1–8 and 61–68)

/** The theme in F major, in eighths over its 16 bars; bars 1–8 open the loop, 9–16 close it. */
const THEME = melody().map((n) => ({ t: n.t, d: n.d, n: num(n.n) + 5, v: n.v ?? 0.7 }));
const themeAt = (t: number) => (t < 8 * BAR ? t : FINALE.start + t - 8 * BAR);
/** Phrase shape per theme bar, in dB: rise to the A' peak, ease into B, climb to its top, settle. */
const ARC = [0, 0, 0.5, 0, 0.5, 1.5, 1, 0, -1, -0.5, 0.5, 1.5, 1, 0.5, 0, -0.5];

for (const n of THEME) {
  const bar = Math.floor(n.t / BAR);
  const t = themeAt(n.t);
  const pulse = n.t % 3 === 0;
  // Held notes close the phrases: clip them so the players breathe (not into the loop's top).
  const d = n.d >= 3 && bar !== 15 ? n.d - 0.35 : n.d;
  const finale = bar >= 8;
  flute.push({ t, d, n: n.n, v: fluteV(n.n, n.v * 0.85, ARC[bar]! + (finale ? 0.5 : 0)) });
  violins.push({ t, d, n: n.n - 12, v: 0.6 + (n.v - 0.55) * 0.5 + ARC[bar]! * 0.01 + (finale ? 0.04 : 0) });
  // The glockenspiel twinkles an octave up on the pulse notes; the whole tune in the reprise.
  if (pulse || bar >= 12) glock.push({ t, d: n.d, n: n.n + 12, v: pulse ? 0.28 : 0.2 });
  // The reprise: the euphonium two octaves under the flute, in its soft layer.
  if (bar >= 12) euphFinale.push({ t, d, n: n.n - 24, v: 0.25 + (n.v - 0.55) * 0.25 });
}

for (const [from, to, sweepAt] of [
  [0, 8, 7],
  [12, 16, 15],
]) {
  for (let bar = from!; bar < to!; bar++) {
    const t0 = themeAt(bar * BAR);
    const first = chordAt(t0);
    const second = chordAt(t0 + 3);
    // Harp: a broken chord up and back down (Bb3–D5), each half on its own chord; a sweep up the
    // chord to close the phrase (bar 8 into Deck the Halls, bar 68 into the top).
    const up = tonesIn(first, "Bb3", "D5");
    const down = tonesIn(second, "Bb3", "D5");
    const sweep = bar === sweepAt;
    const pattern = sweep ? [up[0], up[1], up[2]] : [up[0], up[1], up[2], down[3], down[2], down[1]];
    const vels = [0.56, 0.44, 0.48, 0.54, 0.46, 0.42];
    pattern.forEach((n, i) => harp.push({ t: t0 + i, d: 1, n: n!, v: vels[i]! }));
    if (sweep) tonesIn(second, "G4", "B5").filter((n) => n > up[2]!).forEach((n, i) => harp.push({ t: t0 + 3 + i * 0.5, d: 1, n, v: 0.44 + i * 0.02 }));
    // Bass: pizzicato on the pulse, root then fifth (or the next root, or the 3rd of a dominant
    // seventh, walking up into the tonic).
    const root = low(first.root, "G1");
    const pulse2 = second.root !== first.root ? low(second.root, "G1") : second.seventh !== undefined ? low(second.third!, "G1") : root - 5 >= midi("G1") ? root - 5 : root + 7;
    bassPizz.push({ t: t0, d: 2, n: root, v: 0.8 }, { t: t0 + 3, d: 2, n: pulse2, v: 0.64 });
  }
}
// Bass in the finale's B: the tuba holds the roots (below), the pizz rests.

// Horns in the opening: two horns hold the harmony (D3–C4), whole or half bars.
hornPad.push(...pads(OPEN.at(0), OPEN.at(48), "D3", "C4", 2, 0.4));

// Sleigh bells on every eighth of the theme, accented on the two pulses.
for (const [from, to, db] of [
  [0, 48, 0],
  [FINALE.start, FINALE.start + 24, -2],
  [FINALE.start + 24, LOOP, 0],
] as const) {
  for (let t = from; t < to; t++) {
    const inBar = (t - from) % BAR;
    const base = inBar === 0 ? 0.92 : inBar === 3 ? 0.78 : inBar % 3 === 1 ? 0.36 : 0.28;
    sleigh.push({ t, d: 1, n: "C4", v: trim(base, db) });
  }
}
// Handbells ring the tonic at the top of the loop and the dominant at the second phrase, each a
// pair an octave apart.
bells.push({ t: 0, d: 6, n: "F4", v: 0.8 }, { t: 0, d: 6, n: "F5", v: 0.8 }, { t: 24, d: 6, n: "C5", v: 0.75 }, { t: 24, d: 6, n: "C6", v: 0.75 });
timpHits.push({ t: 0, d: 3, n: "F2", v: 0.5 }, { t: 21, d: 3, n: "C3", v: 0.42 }, { t: 42, d: 3, n: "F2", v: 0.45 });
crash.push({ t: 0, d: 1, n: "C#3", v: 0.6 });
triangle.push({ t: 0, d: 1, n: "C4", v: 0.7 }, { t: 24, d: 1, n: "C4", v: 0.42 });

// ---------------------------------------------------------------- Deck the Halls (bars 9–15)

const DECK_TUNE = line("F5:1.5 Eb5:.5 D5:1 C5 | Bb4 C5 D5 Bb4 | C5:.5 D5 Eb5 C5 D5:1.5 C5:.5 | Bb4:1 A4 Bb4:2 | G5:.5 G5 G5 G5 F5:1.5 Eb5:.5 | D5:1 C5 Bb4:2", 0, 4);
for (const x of DECK_TUNE) {
  const accent = x.t % 2 === 0 ? 0.06 : 0;
  if (x.t < 16) {
    clarinet.push(DECK.n(x.t, x.d, x.n, 0.5 + accent));
    flute.push(DECK.n(x.t, x.d, x.n + 12, fluteV(x.n + 12, 0.55 + accent, -6)));
    // The xylophone on the fa-la-las.
    if (x.t >= 8 && x.t < 11) xylo.push(DECK.n(x.t, x.d, x.n + 12, 0.42));
  } else {
    // The last fa-la-la: trumpets, and the horns two octaves down.
    trumpets.push(DECK.n(x.t, Math.min(x.d, 1), x.n, 0.5 + accent));
    hornShort.push(DECK.n(x.t, x.d, x.n - 24, 0.45 + accent));
    if (x.t < 18) glock.push(DECK.n(x.t, x.d, x.n + 12, 0.26));
  }
}
// Pizzicato: the bass and the cellos on beats 1 and 3, the violins' chords on 2 and 4.
{
  let prev: number[] | null = null;
  for (let b = 0; b < 24; b++) {
    const c = chordAt(DECK.at(b));
    if (b % 2 === 0) {
      bassPizz.push(DECK.n(b, 1, low(c.bass, "G1"), 0.72));
      vlaPizz.push(DECK.n(b, 1, low(c.bass, "Bb2"), 0.55));
    } else {
      prev = voicing(c, "Bb3", "Bb4", prev, 3);
      for (const n of prev) vlnPizz.push(DECK.n(b, 1, n, 0.52));
    }
    sleigh.push(DECK.n(b, 1, "C4", b % 4 === 0 ? 0.55 : 0.4));
    if (b % 2 === 1) snare.push(DECK.n(b, 1, "D2", b >= 16 ? 0.42 : 0.3));
    if (b >= 16 && b % 2 === 0) kick.push(DECK.n(b, 1, "C2", 0.32));
  }
}
hornPad.push(...pads(DECK.at(0), DECK.at(16), "D3", "C4", 2, 0.34));
timpHits.push({ t: DECK.at(14), d: 2, n: "Bb2", v: 0.45 }, { t: DECK.at(22), d: 2, n: "Bb2", v: 0.6 });
cymbals.push(DECK.n(22, 1, "C#3", 0.55));
triangle.push(DECK.n(0, 1, "C4", 0.6));

// ---------------------------------------------------------------- the link: a run down into G minor

for (const [i, x] of line("Bb5:.25 A5 G5 F#5 Eb5 D5 C5 Bb4 A4 G4 F#4 D4").entries()) {
  clarinet.push(LINK.n(x.t, 0.3, x.n, 0.55 - i * 0.01));
  flute.push(LINK.n(x.t, 0.3, x.n, fluteV(x.n, 0.5, -3)));
}
cellos.push(LINK.n(0, 3.9, "D3", 0.55), LINK.n(0, 3.9, "D2", 0.55));
hornPad.push(LINK.n(0, 3.6, "D3", 0.42), LINK.n(0, 3.6, "A3", 0.42));
bassPizz.push(LINK.n(0, 1, "D2", 0.7));
timpRoll(LINK.at(0.5), LINK.at(3), "D3", 0.3, 0.62);
snareRoll(LINK.at(1.5), LINK.at(3), 0.36, 0.6, 2);

// ---------------------------------------------------------------- God Rest Ye Merry, Gentlemen (bars 16–24)

const GR_TUNE = line("G4 | G4 D5 D5 C5 | Bb4 A4 G4 F4 | G4 A4 Bb4 C5 | D5:2 Bb4:1 C5 | D5 Eb5 F5 G5 | D5 C5 Bb4 A4 | G4:3", -1, 4);
for (const x of GR_TUNE) {
  const strong = ((x.t % 2) + 2) % 2 === 0;
  if (x.t < 14) {
    // The march: detached, the cellos and a horn an octave under the clarinet.
    const d = x.d * 0.9;
    clarinet.push(GREST.n(x.t, d, x.n, strong ? 0.6 : 0.52));
    cellosTune.push(GREST.n(x.t, d, x.n - 12, strong ? 0.62 : 0.56));
    hornTune.push(GREST.n(x.t, d, x.n - 12, strong ? 0.44 : 0.4));
  } else {
    violins.push(GREST.n(x.t, x.d, x.n, strong ? 0.72 : 0.64));
    flute.push(GREST.n(x.t, x.d, x.n + 12, fluteV(x.n + 12, strong ? 0.6 : 0.52, -1)));
  }
}
{
  let prev: number[] | null = null;
  for (let b = 0; b < 27; b++) {
    const c = chordAt(GREST.at(b));
    const refrain = b >= 14;
    if (b % 2 === 0) {
      bassPizz.push(GREST.n(b, 1, low(c.bass, "G1"), 0.72));
      if (!refrain) tubaShort.push(GREST.n(b, 1, low(c.bass, "D2"), 0.6));
      kick.push(GREST.n(b, 1, "C2", refrain ? 0.38 : 0.3));
    } else if (!refrain) {
      prev = voicing(c, "F3", "E4", prev, 3);
      for (const n of prev) vlaPizz.push(GREST.n(b, 1, n, 0.55));
    }
    if (b % 2 === 1 && b < 26) snare.push(GREST.n(b, 1, "D2", refrain ? 0.5 : 0.42));
    if (b % 4 === 3 && b < 23) snare.push(GREST.n(b + 0.5, 0.5, "D2", 0.26));
  }
}
// The refrain: the horns and the euphonium hold the harmony, the tuba and the cellos the bass;
// trumpet stabs on its downbeats.
hornPad.push(...pads(GREST.at(14), GREST.at(27), "D3", "C4", 2, 0.44));
for (const h of HARMONY.filter((s) => s.t >= GREST.at(14) - 1e-9 && s.t < GREST.at(27) - 1e-9)) {
  euphLow.push({ t: h.t, d: h.d, n: low(h.c.bass, "G2"), v: 0.42 });
  tuba.push({ t: h.t, d: h.d, n: low(h.c.bass, "G1"), v: 0.45 });
  cellos.push({ t: h.t, d: h.d, n: low(h.c.bass, "G2"), v: 0.6 });
}
{
  let prev: number[] | null = null;
  for (const b of [16, 20, 24, 26]) {
    prev = voicing(chordAt(GREST.at(b)), "F4", "D5", prev, 3);
    for (const n of prev) trumpets.push(GREST.n(b, b === 26 ? 1 : 0.5, n, b === 26 ? 0.62 : 0.56));
  }
}
cymbals.push(GREST.n(16, 1, "C#3", 0.6));
snareRoll(GREST.at(12), GREST.at(14), 0.4, 0.62);
for (const [b, n, v] of [
  [0, "G2", 0.5], [2, "D3", 0.42], [4, "G2", 0.45], [8, "G2", 0.45], [12, "D3", 0.5],
  [16, "Bb2", 0.6], [20, "Bb2", 0.55], [23, "D3", 0.55],
] as const) timpHits.push({ t: GREST.at(b), d: 2, n, v });
timpRoll(GREST.at(24), GREST.at(26), "G2", 0.4, 0.62);
// The Picardy third: G major, and the sleigh shakes in.
for (const [i, b] of [26, 26.25, 26.5, 26.75].entries()) sleigh.push(GREST.n(b, 0.25, "C4", 0.4 + i * 0.1));
triangle.push(GREST.n(26, 1, "C4", 0.6));
timpHits.push({ t: GREST.at(26), d: 1, n: "G2", v: 0.62 });

// ---------------------------------------------------------------- Jingle Bells (bars 25–32)

const JB_TUNE = line("B4:.5 B4 B4:1 B4:.5 B4 B4:1 | B4:.5 D5 G4:.75 A4:.25 B4:2 | C5:.5 C5 C5:.75 C5:.25 C5:.5 B4 B4 B4:.25 B4 | D5:.5 D5 C5 A4 G4:2", 0, 4);
for (const x of JB_TUNE) {
  const on = x.t % 1 === 0 ? 0.62 : 0.56;
  piano.push(JINGLE.n(x.t, x.d, x.n, on), JINGLE.n(x.t, x.d, x.n + 12, on - 0.04));
  if (x.t >= 8) {
    flute.push(JINGLE.n(x.t, x.d, x.n + 12, fluteV(x.n + 12, 0.55, -2)));
    violins.push(JINGLE.n(x.t, x.d, x.n + 12, 0.66));
    if (x.t % 1 === 0) glock.push(JINGLE.n(x.t, 1, x.n + 24, 0.2));
  }
}
{
  let prevL: number[] | null = null;
  let prevP: number[] | null = null;
  let prevH: number[] | null = null;
  for (let h = 0; h < 16; h++) {
    const c = chordAt(JINGLE.at(h));
    const root = low(c.root, "G2");
    // The piano's left hand: root and fifth on the halves, a chord on the off-beat quarters.
    const bassNote = h % 2 === 0 || h >= 14 ? root : low(c.pcs[2]!, "D2");
    pianoLeft.push(JINGLE.n(h, 0.5, bassNote, 0.45));
    if (h < 15) {
      prevL = voicing(chordAt(JINGLE.at(h + 0.5)), "B3", "A4", prevL, 3);
      for (const n of prevL) pianoLeft.push(JINGLE.n(h + 0.5, 0.4, n, 0.4));
    }
    bassPizz.push(JINGLE.n(h, 0.5, h % 2 === 1 && h < 14 ? low(c.pcs[2]!, "G1") : low(c.root, "G1"), 0.7));
    sleigh.push(JINGLE.n(h, 0.5, "C4", h % 4 === 0 ? 0.85 : 0.7), JINGLE.n(h + 0.5, 0.5, "C4", 0.45));
    if (h >= 8) {
      sleigh.push(JINGLE.n(h + 0.25, 0.25, "C4", 0.18), JINGLE.n(h + 0.75, 0.25, "C4", 0.18));
      if (h < 15) {
        prevP = voicing(chordAt(JINGLE.at(h + 0.5)), "D4", "B4", prevP, 3);
        for (const n of prevP) vlnPizz.push(JINGLE.n(h + 0.5, 0.5, n, 0.45));
        prevH = voicing(chordAt(JINGLE.at(h + 0.5)), "D3", "C4", prevH, 2);
        for (const n of prevH) hornShort.push(JINGLE.n(h + 0.5, 0.4, n, 0.42));
        snare.push(JINGLE.n(h + 0.5, 0.5, "D2", 0.3));
      }
      kick.push(JINGLE.n(h, 0.5, "C2", 0.3));
    }
  }
}
for (const [h, d] of [
  [6, 0.6],
  [14, 1],
] as const) {
  for (const n of voicing(chordAt(JINGLE.at(h)), "G4", "G5", null, 3)) trumpets.push(JINGLE.n(h, d, n, 0.58));
}
triangle.push(JINGLE.n(0, 1, "C4", 0.62), JINGLE.n(8, 1, "C4", 0.62));
crash.push(JINGLE.n(8, 1, "C#3", 0.4));
for (const [h, n, v] of [
  [0, "G2", 0.45], [6, "G2", 0.5], [8, "C3", 0.5], [12, "D3", 0.5], [14, "G2", 0.55],
] as const) timpHits.push({ t: JINGLE.at(h), d: 2, n, v });
snareRoll(JINGLE.at(15), JINGLE.at(16), 0.4, 0.58, 2);

// ---------------------------------------------------------------- Good King Wenceslas (bars 33–37)

const WK_TUNE = line("G3 G3 G3 A3 | G3 G3 D3:2 | E3:1 D3 E3 F#3 | G3:2 G3:2", 0, 4);
const WK_HORN = line("B3 B3 B3 C4 | B3 B3 F#3:2 | G3:1 B3 G3 A3 | B3:2 A3:2", 0, 4);
for (const x of WK_TUNE) euphTune.push(WENC.n(x.t, x.d < 2 ? x.d * 0.9 : x.d, x.n, x.t % 2 === 0 ? 0.3 : 0.27));
for (const x of WK_HORN) hornLine.push(WENC.n(x.t, x.d < 2 ? x.d * 0.9 : x.d, x.n, 0.36));
{
  let prev: number[] | null = null;
  for (let b = 0; b < 14; b++) {
    const c = chordAt(WENC.at(b));
    if (b % 2 === 0) {
      tubaShort.push(WENC.n(b, 1, low(c.bass, "D2"), 0.6));
      kick.push(WENC.n(b, 1, "C2", b === 12 ? 0.45 : 0.36));
    } else {
      prev = voicing(c, "E3", "D4", prev, 2);
      for (const n of prev) tromboneShort.push(WENC.n(b, 0.5, n, 0.45));
    }
    // A street drummer: eighths, accented on the beats.
    if (b < 12) snare.push(WENC.n(b, 0.5, "D2", b % 2 === 1 ? 0.5 : 0.36), WENC.n(b + 0.5, 0.5, "D2", 0.22));
  }
}
snare.push(WENC.n(12, 1, "D2", 0.5));
cymbals.push(WENC.n(0, 1, "C#3", 0.42), WENC.n(8, 1, "C#3", 0.42), WENC.n(12, 1, "C#3", 0.45));
tubaShort.push(WENC.n(12, 1, "G2", 0.6));
// The pivot: the euphonium's G held over an F ninth, a harp sweep up it into Silent Night.
for (const [i, n] of ["F2", "A2", "C3", "Eb3", "G3", "A3", "C4", "Eb4"].entries()) harp.push(WENC.n(14 + i * 0.25, 1, n, 0.42 + i * 0.015));
cellos.push(WENC.n(14, 2, "F2", 0.42));
violinsPad.push(WENC.n(14, 2, "Eb5", 0.4), WENC.n(14, 2, "A5", 0.4));

// ---------------------------------------------------------------- Silent Night (bars 37–49)

const SN_SOLO = line("F3:1.5 G3:.5 F3:1 D3:3 | F3:1.5 G3:.5 F3:1 D3:3 | C4:2 C4:1 A3:3 | Bb3:2 Bb3:1 F3:3", 0, 6);
const SN_TUNE = line("C5:2 C5:1 Eb5:1.5 C5:.5 A4:1 | Bb4:3 D5:2 r:1 | Bb4:1 F4:1 D4:1 F4:1.5 Eb4:.5 C4:1 | Bb3:5", 24, 6);
const SN_HORN = line("A3:2 A3:1 C4:1.5 A3:.5 F3:1 | F3:3 Bb3:2 r:1 | D3:3 Eb3:3 | D3:5", 24, 6);
for (const x of SN_SOLO) hornSilent.push(SILENT.n(x.t, x.d >= 3 ? x.d - 0.3 : x.d, x.n, x.t % 3 === 0 ? 0.46 : 0.42));
for (const x of SN_HORN) hornSilent.push(SILENT.n(x.t, x.d, x.n, 0.34));
for (const x of SN_TUNE) {
  violinsSoft.push(SILENT.n(x.t, x.d, x.n, x.d <= 1 ? 0.45 : x.t % 3 === 0 ? 0.6 : 0.55));
  fluteSoft.push(SILENT.n(x.t, x.d, x.n + 12, fluteV(x.n + 12, 0.5, -1)));
}
for (let g = 0; g < 16; g++) {
  const b = g * 3;
  const c = chordAt(SILENT.at(b));
  if (g >= 14) continue;
  const root = low(c.bass, "F2");
  const upper = c.seventh !== undefined ? [low(c.seventh, "D4"), low(c.third!, "D4")].sort((p, q) => p - q) : tonesIn(c, "D4", "A4").slice(0, 2);
  harpSilent.push(SILENT.n(b, 1, root, 0.5), SILENT.n(b + 1, 1, upper[0]!, 0.42), SILENT.n(b + 2, 1, upper[1]!, 0.44));
}
// Its last bar: one rolled chord.
for (const [i, n] of ["Bb2", "F3", "D4", "F4", "Bb4"].entries()) harpSilent.push(SILENT.n(42 + i * 0.25, 4, n, 0.46));
for (let bar = 0; bar < 8; bar++) {
  const c = chordAt(SILENT.at(bar * 6));
  cellos.push(SILENT.n(bar * 6, 6, low(c.bass, "F2"), 0.5));
}
violinsPad.push(...pads(SILENT.at(0), SILENT.at(24), "D5", "Bb5", 2, 0.4));
for (const x of SN_TUNE.filter((n) => n.t % 6 === 0)) glock.push(SILENT.n(x.t, 3, x.n + 24, 0.18));

// ---------------------------------------------------------------- O Come, All Ye Faithful (bars 49–60)

// A swell on the dominant seventh into E flat.
hornPad.push(...[ADESTE.n(-2, 1, "D3", 0.44), ADESTE.n(-2, 1, "Ab3", 0.44)]);
cellos.push(ADESTE.n(-2, 1, "Bb2", 0.55));
timpRoll(ADESTE.at(-2), ADESTE.at(-1.1), "Bb2", 0.3, 0.55, 3);

// The chorale (written two octaves under the violins): soprano, alto (the brass choir's line only), tenor, bass.
const OC_MEL = line("G4:1 | G4 F4 G4 Ab4 | G4:2 F4:1 G4 | Ab4 G4 F4 Eb4 | D4:2 Eb4:1 Ab4 | G4:2 F4:1.5 Eb4:.5 | Eb4:2", -1, 4);
const OC_ALTO = line("Eb3:1 | Eb3 D3 Eb3 Eb3 | Eb3:2 D3:1 Eb3", -1, 4);
const OC_TENOR = line("Bb2:1 | Bb2 Bb2 G2 C3 | Bb2:2 Ab2:1 Bb2 | C3 Bb2 Bb2 G2 | F2 F2 Bb2 C3 | Eb3:2 D3:1.5 Eb3:.5 | Bb2:2", -1, 4);
const OC_BASS = line("Eb2:1 | Eb2 D2 C2 Ab1 | Bb1:2 Bb1:1 Eb2 | F2 G2 Bb1 C2 | Bb1 Ab1 G1 Ab1 | Bb1:2 Bb1:1.5 Eb2:.5 | Eb2:2", -1, 4);
for (const x of OC_MEL) {
  const tutti = x.t >= 8;
  hornTune.push(ADESTE.n(x.t, x.d, x.n - 12, tutti ? 0.46 : 0.42));
  if (tutti) {
    violins.push(ADESTE.n(x.t, x.d, x.n + 12, 0.74));
    flute.push(ADESTE.n(x.t, x.d, x.n + 12, fluteV(x.n + 12, 0.6, 0)));
    if (x.t % 1 === 0) glock.push(ADESTE.n(x.t, x.d, x.n + 24, 0.26));
  }
}
for (const x of OC_ALTO) hornLine.push(ADESTE.n(x.t, x.d, x.n, 0.38));
for (const x of OC_TENOR) euphLow.push(ADESTE.n(x.t, x.d, x.n, x.t >= 8 ? 0.46 : 0.42));
for (const x of OC_BASS) {
  tuba.push(ADESTE.n(x.t, x.d, x.n, x.t >= 8 ? 0.48 : 0.42));
  if (x.t >= 8) {
    cellos.push(ADESTE.n(x.t, x.d, x.n + 12, 0.6));
    bassPizz.push(ADESTE.n(x.t, 1, x.n < midi("G1") ? x.n + 12 : x.n, 0.45));
  }
}
// Line 3: the clarinets fill the middle; trumpets on "Christ the Lord"; timpani, cymbals, a roll
// and a harp sweep up into the finale.
clarinet.push(...pads(ADESTE.at(8), ADESTE.at(22), "Eb4", "C5", 2, 0.3));
for (const [b, d, v] of [
  [15, 0.8, 0.62],
  [16, 1.5, 0.6],
  [20, 1.5, 0.66],
] as const) {
  for (const n of voicing(chordAt(ADESTE.at(b)), "G4", "Eb5", null, 3)) trumpets.push(ADESTE.n(b, d, n, v));
}
cymbals.push(ADESTE.n(15, 1, "C#3", 0.6));
kick.push(ADESTE.n(16, 1, "C2", 0.42), ADESTE.n(20, 1, "C2", 0.4));
for (const [b, n, v] of [
  [0, "Eb2", 0.4], [4, "Bb2", 0.4], [12, "Bb2", 0.55], [15, "Eb2", 0.6], [16, "Bb2", 0.6], [18, "Bb2", 0.55],
] as const) timpHits.push({ t: ADESTE.at(b), d: 2, n, v });
timpRoll(ADESTE.at(20), ADESTE.at(21.8), "Eb2", 0.4, 0.72, 4);
snareRoll(ADESTE.at(20), ADESTE.at(22), 0.36, 0.62);
for (const [i, n] of ["Eb3", "G3", "Bb3", "Eb4", "G4", "Bb4", "Eb5", "G5"].entries()) harp.push(ADESTE.n(20 + i * 0.25, 1, n, 0.42 + i * 0.02));

// ---------------------------------------------------------------- the finale (bars 61–68)

const fu = (bar: number, eighth = 0) => FINALE.start + (bar - 9) * BAR + eighth; // theme bars 9–16

// Horn countermelody in B: it climbs while the tune falls, holds its D over the change to C (a 9-8
// suspension), falls while the tune climbs, and resolves into its harmony line under the
// euphonium. It peaks on D4: further above a recording a horn sounds stretched.
const HORN_COUNTER: [number, number, string][] = [
  [0, 3, "Bb3"], [3, 6, "D4"], [9, 2, "C4"], [11, 1, "Bb3"], [12, 3, "A3"], [15, 2, "F3"], [17, 1, "A3"], [18, 6, "Bb3"],
];
const COUNTER_SWELL = [0.62, 0.68, 0.66, 0.6, 0.62, 0.6, 0.58, 0.64];
HORN_COUNTER.forEach(([t, d, n], i) => hornLine.push({ t: fu(9) + t, d, n: midi(n), v: COUNTER_SWELL[i]! }));
// The horn under the euphonium's tune in A'': thirds and sixths below it (Bb2–C4).
const HORN_HARMONY: [number, number, string][] = [
  [0, 5, "A3"], [5, 1, "C4"], [6, 2, "F3"], [8, 1, "A3"], [9, 2, "F3"], [11, 1, "D3"],
  [12, 2, "G3"], [14, 1, "F3"], [15, 2, "Bb2"], [17, 1, "D3"], [18, 6, "E3"],
];
HORN_HARMONY.forEach(([t, d, n]) => hornLine.push({ t: fu(13) + t, d, n: midi(n), v: t % 3 === 0 ? 0.44 : 0.4 }));
// The euphonium's hymn in B: the horn's line mostly a sixth below, so the two sing as a pair.
const EUPH_HYMN: [number, number, string][] = [
  [0, 3, "D3"], [3, 3, "F3"], [6, 3, "C3"], [9, 3, "E3"], [12, 3, "C3"], [15, 2, "D3"], [17, 1, "F3"], [18, 3, "D3"], [21, 3, "E3"],
];
EUPH_HYMN.forEach(([t, d, n], i) => euphHymn.push({ t: fu(9) + t, d, n: midi(n), v: [0.44, 0.47, 0.5, 0.46, 0.44, 0.46, 0.42, 0.47, 0.5][i]! }));
// The tuba: roots held through B, the pulse through A''.
for (let bar = 9; bar <= 16; bar++) {
  const first = chordAt(fu(bar));
  const second = chordAt(fu(bar, 3));
  const root = low(first.root, "G1");
  if (bar <= 12) {
    if (second.root === first.root) tuba.push({ t: fu(bar), d: 6, n: root, v: 0.5 });
    else tuba.push({ t: fu(bar), d: 3, n: root, v: 0.5 }, { t: fu(bar, 3), d: 3, n: low(second.root, "G1"), v: 0.48 });
  } else {
    const pulse2 = second.root !== first.root ? low(second.root, "G1") : second.seventh !== undefined ? low(second.third!, "G1") : root - 5 >= midi("G1") ? root - 5 : root + 7;
    tuba.push({ t: fu(bar), d: 3, n: root, v: 0.5 }, { t: fu(bar, 3), d: 3, n: pulse2, v: 0.44 });
  }
  kick.push({ t: fu(bar), d: 1, n: "C2", v: bar === 13 ? 0.48 : bar < 13 ? 0.34 : 0.38 }, { t: fu(bar, 3), d: 1, n: "C2", v: bar < 13 ? 0.27 : 0.29 });
}
// The drummer: a roll swelling into the reprise, then a light stroke on the last eighth of each pulse.
snareRoll(fu(12, 3), fu(13), 0.36, 0.85);
snare.push({ t: fu(13), d: 1, n: "D2", v: 0.5 });
for (let bar = 13; bar <= 16; bar++) for (const e of bar < 16 ? [2, 5] : [2]) snare.push({ t: fu(bar, e), d: 1, n: "D2", v: 0.44 });
cymbals.push({ t: fu(9), d: 1, n: "C#3", v: 0.62 }, { t: fu(13), d: 1, n: "C#3", v: 0.62 });
bells.push({ t: fu(13), d: 6, n: "F4", v: 0.85 }, { t: fu(13), d: 6, n: "F5", v: 0.85 });
for (const [t, n, v] of [
  [fu(9), "Bb2", 0.6], [fu(12, 3), "C3", 0.5], [fu(13), "F2", 0.66], [fu(16, 3), "C3", 0.5],
] as const) timpHits.push({ t, d: 3, n, v });
for (const n of voicing(chordAt(fu(13)), "F4", "F5", null, 3)) trumpets.push({ t: fu(13), d: 1.5, n, v: 0.6 });
for (const n of voicing(chordAt(fu(9)), "F4", "F5", null, 3)) trumpets.push({ t: fu(9), d: 1.5, n, v: 0.58 });
// A clarinet run up the dominant seventh into the reprise.
for (const [i, n] of ["C5", "D5", "E5", "F5", "G5", "Bb5"].entries()) clarinet.push({ t: fu(12, 3 + i * 0.5), d: 0.55, n: midi(n), v: 0.48 + i * 0.02 });
// Triangle: an open stroke at the reprise, the muted "tk-tk" into the top of the loop.
triangle.push({ t: fu(13), d: 1, n: "C4", v: 0.66 });
triangleTicks.push({ t: fu(16, 4), d: 1, n: "C4", v: 0.66 }, { t: fu(16, 5), d: 1, n: "C4", v: 0.66 });

// ---------------------------------------------------------------- timpani

/**
 * The timpani: five drums at odd pitches (their principal tones, measured), which the sampler
 * plays in turn, two strokes each, per velocity layer. So each stroke is given to a drum near the
 * note it should sound (the order of a track's notes sets which drum plays which), and played
 * that far off its recorded pitch: within about four semitones, in whichever octave is nearer.
 */
const DRUMS = [41.47, 46.76, 49.48, 52.43, 54.57];
function timpani(hits: Hit[], counters: Map<number, number>): Note[] {
  const inst = instrument("timpani");
  const layers = [...new Set(inst.zones.map((z) => z.layer))].sort((a, b) => a - b);
  const layerOf = (v: number) => layers[Math.min(layers.length - 1, Math.floor(v * layers.length))]!;
  const out: Note[] = [];
  for (const layer of layers) {
    const mine = hits.filter((h) => layerOf(h.v) === layer);
    if (!mine.length) continue;
    const zones = inst.zones.filter((z) => z.layer === layer).sort((a, b) => a.rr - b.rr);
    const pitch = (slot: number) => DRUMS[Number(/Timpani(\d)/.exec(zones[slot % zones.length]!.file)![1]) - 1]!;
    const start = counters.get(layer) ?? 0;
    const slots = mine.map((_, j) => pitch(start + j));
    /** Semitones a drum of pitch p is moved to sound note n's pitch class (nearest octave). */
    const shift = (n: number, p: number) => {
      const s = (((n - p) % 12) + 12) % 12;
      return s > 6 ? s - 12 : s;
    };
    // Assign strokes to slots: start in order, then swap any pair that lowers the total shift.
    const order = mine.map((_, j) => j);
    const cost = (h: number, s: number) => Math.abs(shift(num(mine[h]!.n), slots[s]!));
    for (let pass = 0, better = true; better && pass < 50; pass++) {
      better = false;
      for (let a = 0; a < order.length; a++)
        for (let b = a + 1; b < order.length; b++) {
          const now = cost(order[a]!, a) + cost(order[b]!, b);
          const swapped = cost(order[b]!, a) + cost(order[a]!, b);
          if (swapped < now - 1e-9) {
            [order[a], order[b]] = [order[b]!, order[a]!];
            better = true;
          }
        }
    }
    order.forEach((h, s) => {
      const hit = mine[h]!;
      out.push({ t: hit.t, d: hit.d, n: midi("C3") + shift(num(hit.n), slots[s]!), v: hit.v });
    });
    counters.set(layer, start + mine.length);
  }
  return out;
}
const timpCounters = new Map<number, number>();
const timpaniHits = timpani(timpHits, timpCounters);
const timpaniRolls = timpani(timpRolls, timpCounters);

// ---------------------------------------------------------------- the song

const tracks: Track[] = [
  // Tunes
  { inst: "flute", notes: flute, gain: 1, pan: 0.05, reverb: 0.3, humanize: 0.25, lowpass: 6000 },
  { inst: "flute", notes: fluteSoft, gain: 0.6, pan: 0.05, reverb: 0.4, humanize: 0.2, lowpass: 6000, label: "flute (Silent Night)" },
  { inst: "clarinet", notes: clarinet, gain: 0.78, pan: 0.15, reverb: 0.3, humanize: 0.2, lowpass: 6000 },
  ...evenTracks({ inst: "violins", notes: violins, gain: 0.5, pan: -0.25, reverb: 0.35, humanize: 0.15, lowpass: 8000, label: "violins (tune)" }, -20),
  ...evenTracks({ inst: "violins", notes: violinsSoft, gain: 0.7, pan: -0.25, reverb: 0.42, humanize: 0.15, label: "violins (Silent Night)" }, -25.5),
  { inst: "violins", notes: violinsPad, gain: 0.22, pan: -0.35, reverb: 0.45, humanize: 0.15, label: "violins (pad)" },
  { inst: "cellos", notes: cellosTune, gain: 0.3, pan: 0.3, reverb: 0.3, humanize: 0.15, label: "cellos (tune)" },
  { inst: "piano", notes: piano, gain: 0.22, pan: -0.05, reverb: 0.3, humanize: 0.2, lowpass: 5500, label: "piano (tune)" },
  { inst: "piano", notes: pianoLeft, gain: 0.09, pan: -0.05, reverb: 0.3, humanize: 0.2, lowpass: 5000, label: "piano (left hand)" },
  ...euphonium(early(euphTune), { gain: 9, pan: 0.1, reverb: 0.3, humanize: 0.15, label: "euphonium (Wenceslas)" }),
  ...euphonium(early(euphFinale), { gain: 12, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (finale tune)" }),
  { inst: "horn", notes: early(hornTune), gain: 2, pan: -0.15, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (tune)" },
  // Silent Night sits 2 dB up on the rest, so the tender interlude doesn't drop out under the game.
  { inst: "horn", notes: early(hornSilent), gain: 2.5, pan: -0.15, reverb: 0.4, humanize: 0.15, lowpass: 4500, label: "horn (Silent Night)" },
  // Harmony and countermelodies
  { inst: "horn", notes: early(hornLine), gain: 1.2, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (counter)" },
  { inst: "horn", notes: early(hornPad), gain: 1, pan: -0.3, reverb: 0.38, humanize: 0.15, lowpass: 4500, label: "horns (pads)" },
  { inst: "hornShort", notes: hornShort, gain: 0.7, pan: -0.25, reverb: 0.3, humanize: 0.15, lowpass: 5000 },
  { inst: "trumpetShort", notes: trumpets, gain: 1.2, pan: 0.2, reverb: 0.35, humanize: 0.15, lowpass: 5000 },
  { inst: "tromboneShort", notes: tromboneShort, gain: 1.2, pan: 0.2, reverb: 0.25, humanize: 0.15, lowpass: 4000 },
  ...euphonium(early(euphLow), { gain: 2.4, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (low)" }),
  ...euphonium(early(euphHymn), { gain: 4, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (hymn)" }),
  { inst: "tuba", notes: early(tuba), gain: 1, pan: 0.05, reverb: 0.22, humanize: 0.15 },
  { inst: "tubaShort", notes: tubaShort, gain: 0.4, pan: 0.05, reverb: 0.2, humanize: 0.15 },
  { inst: "cellos", notes: cellos, gain: 0.2, pan: 0.3, reverb: 0.3, humanize: 0.15 },
  ...damped({ inst: "harp", notes: harp, gain: 0.9, pan: 0.35, reverb: 0.38, humanize: 0.25, label: "harp" }),
  ...damped({ inst: "harp", notes: harpSilent, gain: 1.13, pan: 0.35, reverb: 0.4, humanize: 0.25, label: "harp (Silent Night)" }),
  { inst: "violinsPizz", notes: vlnPizz, gain: 0.3, pan: -0.3, reverb: 0.25, humanize: 0.2 },
  { inst: "violasPizz", notes: vlaPizz, gain: 0.35, pan: 0.1, reverb: 0.25, humanize: 0.2 },
  { inst: "bassPizz", notes: bassPizz, gain: 0.45, pan: 0.15, reverb: 0.12 },
  // Bells and mallets
  { inst: "glockenspiel", notes: glock, gain: 4.8, pan: 0.25, reverb: 0.4, lowpass: 4000, ring: 0.8 },
  { inst: "xylophone", notes: xylo, gain: 1.25, pan: 0.2, reverb: 0.3, lowpass: 5000, ring: 0.4 },
  { inst: "handChimes", notes: bells, gain: 0.38, pan: -0.1, reverb: 0.45, ring: 3.5, label: "handbells" },
  // Drums
  { inst: "timpani", notes: timpaniHits, gain: 0.6, pan: -0.05, reverb: 0.3, humanize: 0, label: "timpani" },
  { inst: "timpani", notes: timpaniRolls, gain: 0.5, pan: -0.05, reverb: 0.3, humanize: 0, ring: 0.35, label: "timpani" },
  { inst: "kick", notes: kick, gain: 1, pan: 0, reverb: 0.2 },
  { inst: "snareOn", notes: snare, gain: 0.8, pan: -0.1, reverb: 0.25, lowpass: 6000 },
  { inst: "snareRoll", notes: roll, gain: 0.5, pan: -0.1, reverb: 0.3, humanize: 0, lowpass: 6000 },
  { inst: "cymbals", notes: cymbals, gain: 0.8, pan: 0.2, reverb: 0.4, lowpass: 5000 },
  { inst: "crash", notes: crash, gain: 0.5, pan: -0.2, reverb: 0.4, lowpass: 5000 },
  { inst: "sleighBells", notes: sleigh, gain: 0.5, pan: 0.25, reverb: 0.2, humanize: 0.5, lowpass: 9000 },
  { inst: "triangle", notes: triangle, gain: 1.1, pan: -0.3, reverb: 0.45, humanize: 0 },
  { inst: "triangleMuted", notes: triangleTicks, gain: 1.1, pan: -0.3, reverb: 0.45, humanize: 0 },
];

const song: Song = {
  name: "christmas",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: LOOP / BAR,
  reverb: { room: 0.8, damp: 0.45, width: 0.95, level: 0.95 },
  tracks,
};

export default song;
