// Thanksgiving: an old-time Appalachian string band on a farmhouse porch, warm, cozy and
// unhurried, in the spirit of an old-time country holiday record: a hammered dulcimer, a fiddle,
// a guitar's boom-chuck, a mandolin's chop, an upright bass and a harmonica, with an upright
// piano for one hymn-like phrase. The theme in D major (an old-time fiddle key) at its own lilt
// (a dotted quarter = 90), three times through (48 bars, 64 s):
//
//   1–16   The dulcimer's tune. The psaltery is played as a hammered dulcimer: quarter notes get a
//          lighter second stroke on the next eighth (rolling eighths), held notes are rolls (the
//          hammers alternating in sixteenths), each phrase's pickup is a double and, from A', the
//          peaks are struck in octaves. Under it the guitar plays boom-chuck (a bass note on each
//          pulse, a short strum on the swung "and"), the upright bass root and fifth with walks
//          into each phrase, and from A' the mandolin (a strumstick) chops with the strums. In B
//          the fiddle enters with a slow countermelody in thirds and sixths under the tune.
//   17–32  The fiddle's turn: the tune an octave lower, bowed legato, the open D and A strings
//          sounding under it as double stops where they belong to the chord. The dulcimer backs
//          it with ringing arpeggios above (D5–F#6), the harmonica answers the fiddle's three long
//          notes (bars 18, 22, 26) and a foot keeps time on the porch boards.
//   33–48  Everyone home: dulcimer and fiddle play the tune in octaves, the dulcimer's second
//          hammer now in thirds and sixths under its pulse notes and its long notes ringing while
//          the hammers walk down the chord. In B (41–44) the band hushes: the harmonica sings the
//          tune with a parlor piano's soft hymn chords under it (the tune's note on top) and the
//          dulcimer's arpeggios above; the guitar stops strumming (the piano's chords are the
//          harmony, in the strums' register) and only booms softly, and the mandolin rests. The
//          last phrase brings the band back and the bass walks up into the top of the loop.
//
// The psaltery behaves like the instrument it stands in for, which has no dampers: each strike
// rings until its string is struck again, for at most 1.6 s, and stops before a chord it would
// rub against (dulcimerTracks).
//
// Register plan (low to high), so parts don't fight:
//   bass F#1–E2 · guitar booms E2–D3, strums G3–G4 · mandolin chop C#4–B4 · piano (41–44) A3–E5 ·
//   fiddle: tune A3–F#5 (pass 2–3), countermelody F#4–D5 (pass 1), drones D4/A4 ·
//   harmonica: fills A4–F#5, tune E4–E5 (41–44) · dulcimer: tune A4–F#6, arpeggios D5–E6
// Everything plays inside its instrument's recordings (the psaltery's run A#4–F#6, whole tones
// apart, is why the song is in D: the tune's A4–F#6 fits it exactly). The fiddle, the harmonica,
// the dulcimer and the mandolin are low-passed: the solo recordings are bright and the owner
// hears that edge as harsh. The harmonica most of all: its reeds put as much into 2.5–5 kHz as
// into 1–2.5 kHz, so at 2400 Hz the hush (41–44) was the brightest moment of the song; at 1600
// it is a mellow harp across the porch and the hush sits with the rest of the song.
//
// No hymn tune is quoted: the theme carries the song, as the reference record's carols carry it.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { transpose, type Note, type SampledTrack, type Song, type Track } from "../song";
import { chordNotes, CHORDS, EIGHTHS_PER_BAR, melody, THEME_BARS, THEME_BPM, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One time through the tune, in eighths. */
const PASS = THEME_BARS * BAR;
const PASSES = 3;
const BARS = PASSES * THEME_BARS;
const LOOP = BARS * BAR;
/** C -> D major: the psaltery's range and the fiddle's open D and A strings. */
const KEY = 2;
/** The theme's lilt: a dotted quarter of 90. 48 bars = 3,072,000 frames at 48 kHz. */
const BPM = THEME_BPM;

const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
/** Start of `bar` (1-based, over the whole loop) plus `eighth` eighths. */
const at = (bar: number, eighth = 0) => (bar - 1) * BAR + eighth;
/** Bar (1-based, over the loop) a time falls in. */
const barOf = (t: number) => Math.floor(wrap(t) / BAR) + 1;
const passOf = (bar: number) => Math.floor((bar - 1) / THEME_BARS) + 1;
type Section = "A" | "A'" | "B" | "A''";
const sectionOf = (bar: number): Section => (["A", "A'", "B", "A''"] as const)[Math.floor(((bar - 1) % THEME_BARS) / 4)]!;
const clamp = (v: number) => Math.min(1, Math.max(0.05, v));

// ---------------------------------------------------------------- harmony

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const symbol = (root: string, quality: Quality) => {
  const pc = (((midi(`${root}4`) + KEY) % 12) + 12) % 12;
  return NAMES[pc]! + (quality === "min" ? "m" : quality === "dom7" ? "7" : "");
};
/** The chord of every half bar (dotted quarter), in D: D Bm G A A7 Em F#m. */
const HALVES = CHORDS.map(([root, quality]) => symbol(root, quality));
/** Pitch classes of each chord. */
const TONES = new Map<string, number[]>(CHORDS.map(([root, quality]) => [symbol(root, quality), chordNotes(root, quality, 4).map((n) => (n + KEY) % 12)]));
const chordAt = (t: number) => HALVES[Math.floor((wrap(t) % PASS) / 3)]!;
const inChord = (note: number, chord: string) => TONES.get(chord)!.includes(((note % 12) + 12) % 12);

/** The dynamics: the first pass gentle, the fiddle's pass fuller, the last hushing in B and full in A''. */
const LIFT: Record<string, number> = {
  "1A": -0.06, "1A'": -0.03, "1B": 0, "1A''": 0.01,
  "2A": 0, "2A'": 0.02, "2B": 0.04, "2A''": 0.04,
  "3A": 0.04, "3A'": 0.05, "3B": -0.03, "3A''": 0.07,
};
const lift = (t: number) => {
  const bar = barOf(t);
  return LIFT[`${passOf(bar)}${sectionOf(bar)}`]!;
};

const tune = transpose(melody(), KEY);
const tuneBar = (n: Note) => Math.floor(n.t / BAR) + 1;

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at quite different levels from note to note (the fiddle's by up to
// 10 dB), so a line played at one velocity comes out lumpy. These read the recording the sampler
// plays for a note (zoneFor) so a line can be evened out before its dynamics are applied.

/** The velocity range of the layer a velocity plays (the sampler's rule). */
function layerRange(name: InstrumentName, vel: number): { lo: number; hi: number } {
  const n = new Set(instrument(name).zones.map((z) => z.layer)).size;
  const i = Math.min(n - 1, Math.floor(vel * n));
  return { lo: i / n, hi: i === n - 1 ? 1 : (i + 1) / n };
}

const zoneLevels = new Map<string, number>();
/**
 * How loud a note's recording gets while it's held (peak 30 ms RMS over its first `seconds`,
 * at most 0.35 s; dB, round robins averaged, after the sampler's evening-out).
 */
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

/**
 * One part as tracks with its notes evened out to the part's typical recording level. Gain is
 * per track, so notes are grouped by the correction they need in 3 dB steps (each group a track
 * with that much more or less gain) and the remainder is made up with velocity.
 */
function leveled(track: Omit<SampledTrack, "notes">, notes: Note[]): Track[] {
  const held = (n: Note) => (instrument(track.inst).opts.oneShot ? 0.35 : (n.d * 60) / BPM);
  const level = (n: Note) => zoneDb(track.inst, n.n as number, n.v ?? 0.7, held(n));
  const sorted = notes.map(level).sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)]!;
  const groups = new Map<number, Note[]>();
  for (const n of notes) {
    const need = typical - level(n);
    const step = Math.max(-12, Math.min(12, Math.round(need / 3) * 3));
    const group = groups.get(step) ?? [];
    group.push({ ...n, v: nudge(track.inst, n.v ?? 0.7, need - step) });
    groups.set(step, group);
  }
  return [...groups].map(([step, group]) => ({ ...track, notes: group, gain: (track.gain ?? 1) * 10 ** (step / 20) }));
}

/** A part's notes evened toward its typical recording level by velocity alone (one track, so it can choke). */
function evened(name: InstrumentName, notes: Note[]): Note[] {
  const level = (n: Note) => zoneDb(name, n.n as number, n.v ?? 0.7);
  const typical = notes.map(level).sort((a, b) => a - b)[Math.floor(notes.length / 2)]!;
  return notes.map((n) => ({ ...n, v: nudge(name, n.v ?? 0.7, typical - level(n)) }));
}

// ================================================================ the hammered dulcimer

// Every strike, by role: the tune ("lead") or the arpeggios behind the fiddle and harmonica
// ("back"). dulcimerTracks turns them into tracks at the end, once every strike's ring is known.
interface Strike extends Note {
  role: "lead" | "back";
}
const strikes: Strike[] = [];
const strike = (t: number, n: number, v: number, role: Strike["role"] = "lead") => {
  strikes.push({ t: wrap(t), d: 1, n, v: clamp(v), role });
};

interface DulcimerStyle {
  /** A held note is rolled: the two hammers alternate in sixteenths. */
  rolls?: boolean;
  /**
   * A note held over the bar's second pulse rings while the hammers walk down the chord under it
   * on the next two eighths (a ringing arpeggio), instead of a roll.
   */
  arpeggios?: boolean;
  /** The pickup into each phrase is struck twice, a sixteenth apart (a double). */
  doubles?: boolean;
  /** A quarter note gets a lighter second stroke on the next eighth (rolling eighths). */
  restrike?: boolean;
  /** The second hammer strikes a chord tone a third or sixth under each pulse note. */
  harmony?: boolean;
  /** Notes from D6 up are struck in octaves. */
  octaves?: boolean;
}

/** A chord tone a third or sixth under `note` within the dulcimer's range, if there is one. */
function under(note: number, chord: string): number | null {
  for (const k of [3, 4, 8, 9]) if (note - k >= midi("A4") && inChord(note - k, chord)) return note - k;
  return null;
}

/** The next `count` chord tones under `note`, walking down, within the dulcimer's range. */
function belowIn(note: number, chord: string, count: number): number[] {
  const out: number[] = [];
  for (let m = note - 1; m >= midi("A4") && out.length < count; m--) if (inChord(m, chord)) out.push(m);
  return out;
}

/** Roll strokes after the first: lighter, the alternate hammer a little lighter still. */
const ROLL = [0.36, 0.26, 0.34, 0.24];

/** The tune on the dulcimer, bars `from`–`to` (1–16) of pass `pass`, at written pitch (A4–F#6). */
function dulcimerTune(pass: number, from: number, to: number, style: DulcimerStyle): void {
  const base = (pass - 1) * PASS;
  for (const n of tune) {
    const bar = tuneBar(n);
    if (bar < from || bar > to) continue;
    const t = base + n.t;
    const note = n.n as number;
    // The theme's lilt: the pulse notes lean in, the in-between eighths lighter.
    const v = 0.62 + ((n.v ?? 0.6) - 0.55) + lift(t);
    strike(t, note, v);
    const ringing = n.d === 3 && n.t % BAR === 3 && style.arpeggios;
    if (ringing) {
      const below = belowIn(note, chordAt(t), 2);
      below.forEach((b, i) => strike(t + 1 + i, b, v - 0.18 - i * 0.06));
    } else if (n.d === 3 && style.rolls) {
      ROLL.forEach((drop, i) => strike(t + (i + 1) * 0.5, note, v - drop));
    } else if (n.d === 2 && style.restrike) {
      strike(t + 1, note, v - 0.3);
    } else if (n.d === 1 && n.t % BAR === 5 && bar % 4 === 0 && style.doubles) {
      strike(t + 0.5, note, v - 0.22);
    }
    // The second hammer: the octave under a peak note, or else a chord tone under a pulse note
    // (a ringing arpeggio brings its own).
    const pulse = n.t % 3 === 0;
    if (pulse && style.octaves && note >= midi("D6")) strike(t, note - 12, v - 0.22);
    else if (pulse && style.harmony && !ringing) {
      const h = under(note, chordAt(t));
      if (h !== null) strike(t, h, v - 0.3);
    }
  }
}

/** Arpeggio voicings above the fiddle and the harmonica: root position or close, D5–C#6. */
const ARP: Record<string, string[]> = {
  D: ["D5", "F#5", "A5"],
  Bm: ["D5", "F#5", "B5"],
  G: ["D5", "G5", "B5"],
  A: ["E5", "A5", "C#6"],
  A7: ["E5", "G5", "C#6"],
  Em: ["E5", "G5", "B5"],
  "F#m": ["F#5", "A5", "C#6"],
};
/**
 * Ringing arpeggios, bars `from`–`to` (over the loop): up the chord in the first half of a bar,
 * from its octave back down in the second (a rocking six-eighth figure), leaning on each pulse.
 */
function dulcimerArpeggios(from: number, to: number, v: number): void {
  for (let bar = from; bar <= to; bar++) {
    for (const half of [0, 1]) {
      const t = at(bar, half * 3);
      const [lo, mid, hi] = ARP[chordAt(t)]!.map(midi) as [number, number, number];
      const notes = half === 0 ? [lo, mid, hi] : [lo + 12, hi, mid];
      notes.forEach((n, i) => strike(t + i, n, v + (i === 0 ? 0.1 : 0) + lift(t), "back"));
    }
  }
}

// Pass 1: the tune, rolling eighths, rolls and doubles; octaves on the peaks once the band is in (A').
dulcimerTune(1, 1, 4, { rolls: true, restrike: true, doubles: true });
dulcimerTune(1, 5, 16, { rolls: true, restrike: true, doubles: true, octaves: true });
// Pass 2: arpeggios behind the fiddle.
dulcimerArpeggios(17, 32, 0.3);
// Pass 3: the tune with the fiddle, the second hammer in harmony; arpeggios behind the harmonica.
const FULL: DulcimerStyle = { rolls: true, arpeggios: true, restrike: true, doubles: true, harmony: true, octaves: true };
dulcimerTune(3, 1, 8, FULL);
dulcimerArpeggios(41, 44, 0.22);
dulcimerTune(3, 13, 16, FULL);

/** Each string's level evened out to the typical one (one recording per note, one layer). */
const STRINGS = [...new Set(strikes.map((s) => s.n as number))];
const stringDb = new Map(STRINGS.map((n) => [n, zoneDb("psaltery", n, 0.7)]));
const typicalString = [...stringDb.values()].sort((a, b) => a - b)[Math.floor(STRINGS.length / 2)]!;
/** The courses spread across the instrument: low strings a little left, high ones right. */
const stringPan = (n: number) => -0.1 + ((n - midi("A4")) / 21) * 0.45;

/** Seconds per eighth. */
const EIGHTH = 60 / BPM;
/** Ring times a strike can be given (seconds), up to the role's cap. */
const RINGS = [0.1, 0.2, 0.3, 0.45, 0.65, 0.9, 1.2, 1.6];

/**
 * How long a strike may ring before the harmony moves to a chord with a note a semitone from it
 * (a player would let it sound, but the owner hears that rub as sour), at most `cap` seconds.
 */
function ringFor(s: Strike, cap: number): number {
  for (let b = Math.floor(s.t / 3) * 3 + 3; (b - s.t) * EIGHTH < cap; b += 3) {
    const chord = chordAt(b);
    const rubs = !inChord(s.n as number, chord) && (inChord((s.n as number) + 1, chord) || inChord((s.n as number) - 1, chord));
    if (rubs) return (b - s.t) * EIGHTH - 0.03;
  }
  return cap;
}

/**
 * The dulcimer's tracks for one role. Each strike rings until its string is struck again (a
 * hammer re-striking a ringing string damps it), until the chords move somewhere it would rub, or
 * for at most `cap` seconds: the strikes are grouped by string and by that ring time, rounded
 * down to RINGS (each then fades over the instrument's release).
 */
function dulcimerTracks(role: Strike["role"], gain: number, cap: number): Track[] {
  const rings = [...RINGS.filter((x) => x < cap), cap];
  const tracks = new Map<string, Track>();
  for (const n of STRINGS) {
    const hits = strikes.filter((s) => s.role === role && s.n === n).sort((a, b) => a.t - b.t);
    hits.forEach((h, i) => {
      const next = hits[i + 1]?.t ?? hits[0]!.t + LOOP;
      const r = Math.min((next - h.t) * EIGHTH, ringFor(h, cap));
      const ring = rings.filter((x) => x <= r).pop() ?? rings[0]!;
      const key = `${n}/${ring}`;
      const track = tracks.get(key) ?? {
        inst: "psaltery",
        notes: [],
        gain: gain * 10 ** ((typicalString - stringDb.get(n)!) / 20),
        pan: stringPan(n),
        reverb: 0.3,
        humanize: 0.5,
        ring,
        lowpass: n >= midi("C6") ? 3000 : 3400,
        label: role === "lead" ? "dulcimer" : "dulcimer (arpeggios)",
      };
      track.notes.push({ t: h.t, d: h.d, n, v: h.v });
      tracks.set(key, track);
    });
  }
  return [...tracks.values()];
}

// ================================================================ the fiddle

const fiddle: Note[] = [];
/** Pass 3's tune: under the dulcimer, a little softer. */
const fiddleUnder: Note[] = [];
/** The double-stop drones and pass 1's countermelody: the softer bowing layer. */
const drones: Note[] = [];
const counter: Note[] = [];
/** A bowed note takes ~30 ms to speak: start it early so it sits on the beat. */
const BOW = 0.15;

/** An open string (D4, A4) under `note` as a double stop, when both belong to the chord. */
function drone(note: number, chord: string): number | null {
  for (const open of [midi("A4"), midi("D4")]) {
    const k = note - open;
    if (k >= 3 && [0, 3, 4, 5, 7, 8, 9].includes(k % 12) && inChord(open, chord)) return open;
  }
  return null;
}

/** The tune on the fiddle an octave below written pitch (A3–F#5), legato, with open-string double stops. */
function fiddleTune(pass: number, from: number, to: number): void {
  const base = (pass - 1) * PASS;
  for (const n of tune) {
    const bar = tuneBar(n);
    if (bar < from || bar > to) continue;
    const t = base + n.t;
    const note = (n.n as number) - 12;
    const v = 0.6 + ((n.v ?? 0.6) - 0.55) * 0.6 + lift(t);
    const d = n.d >= 2 ? n.d - 0.15 : 0.9;
    (pass === 3 ? fiddleUnder : fiddle).push({ t: wrap(t - BOW), d, n: note, v: Math.max(0.52, v) });
    const open = drone(note, chordAt(t));
    if (open !== null) drones.push({ t: wrap(t - BOW), d, n: open, v: 0.36 });
  }
}

/**
 * Pass 1's countermelody (B and A''): long notes a third or sixth under the dulcimer's tune,
 * rising to the C# held under bar 10 and bar 16's dominant. [bar, eighth, length, note]
 */
const COUNTER: [number, number, number, string][] = [
  [9, 0, 3, "D5"], [9, 3, 3, "B4"], [10, 0, 6, "C#5"],
  [11, 0, 3, "C#5"], [11, 3, 3, "D5"], [12, 0, 3, "B4"], [12, 3, 3, "G4"],
  [13, 0, 3, "F#4"], [13, 3, 3, "A4"], [14, 0, 3, "D5"], [14, 3, 3, "B4"],
  [15, 0, 3, "B4"], [15, 3, 3, "G4"], [16, 0, 6, "C#5"],
];
for (const [bar, e, d, name] of COUNTER) counter.push({ t: wrap(at(bar, e) - BOW), d: d - 0.2, n: midi(name), v: 0.44 + lift(at(bar, e)) * 0.5 });

fiddleTune(2, 1, 16);
fiddleTune(3, 1, 8);
fiddleTune(3, 13, 16);

// ================================================================ the harmonica

const harmonica: Note[] = [];
const fills: Note[] = [];
/** A harmonica reed takes a moment to speak. */
const REED = 0.1;

/** Answers to the fiddle's three long notes in pass 2. [bar, eighth, length, note] */
const FILLS: [number, number, number, string][] = [
  [18, 4, 1, "F#5"], [18, 5, 1, "D5"], [19, 0, 2, "B4"],
  [22, 4, 1, "F#5"], [22, 5, 1, "E5"], [23, 0, 2, "B4"],
  [26, 4, 1, "A4"], [26, 5, 1, "B4"], [27, 0, 2, "C#5"],
];
for (const [bar, e, d, name] of FILLS) fills.push({ t: at(bar, e) - REED, d: d - 0.1, n: midi(name), v: e === 0 ? 0.6 : 0.52 });
// Pass 3's B: the harmonica sings the tune an octave below written pitch (E4–E5), legato.
for (const n of tune) {
  const bar = tuneBar(n);
  if (bar < 9 || bar > 12) continue;
  const t = 2 * PASS + n.t;
  harmonica.push({ t: t - REED, d: n.d - 0.08, n: (n.n as number) - 12, v: 0.6 + ((n.v ?? 0.6) - 0.55) * 0.7 });
}

// ================================================================ the parlor piano

// In the hush (41–44) an upright piano joins the harmonica as a family would around a hymn:
// soft chords on each pulse with the tune's note on top, held under the harmonica's line.
// [bar, eighth, chord notes low to high (the top one is the tune's)]
const HYMN: [number, number, string[]][] = [
  [41, 0, ["D4", "G4", "B4"]], [41, 3, ["B3", "D4", "G4"]],
  [42, 0, ["C#4", "E4", "A4"]], [42, 3, ["A3", "C#4", "E4"]],
  [43, 0, ["C#4", "F#4", "A4"]], [43, 3, ["D4", "F#4", "B4"]],
  [44, 0, ["G4", "B4", "E5"]], [44, 3, ["E4", "G4", "C#5"]],
];
const piano: Note[] = [];
for (const [bar, e, notes] of HYMN) {
  // Rolled gently from the bottom, the tune's note a little louder than the rest.
  notes.forEach((n, i) => piano.push({ t: at(bar, e) + i * 0.05, d: 2.8 - i * 0.05, n: midi(n), v: i === notes.length - 1 ? 0.46 : 0.36 }));
}

// ================================================================ the rhythm section

/** The guitar's boom: root and alternate bass. */
const BOOM: Record<string, [string, string]> = {
  D: ["D3", "A2"], Bm: ["B2", "F#2"], G: ["G2", "D3"], A: ["A2", "E2"], A7: ["A2", "E2"], Em: ["E2", "B2"], "F#m": ["F#2", "C#3"],
};
/** The guitar's chuck: open-position chords on the top three strings it strums. */
const CHUCK: Record<string, string[]> = {
  D: ["A3", "D4", "F#4"], Bm: ["B3", "D4", "F#4"], G: ["B3", "D4", "G4"], A: ["A3", "C#4", "E4"], A7: ["G3", "C#4", "E4"], Em: ["G3", "B3", "E4"], "F#m": ["A3", "C#4", "F#4"],
};
/** The upright bass: root and fifth. */
const BASS: Record<string, [string, string]> = {
  D: ["D2", "A1"], Bm: ["B1", "F#1"], G: ["G1", "D2"], A: ["A1", "E2"], A7: ["A1", "E2"], Em: ["E2", "B1"], "F#m": ["F#1", "C#2"],
};
/** The mandolin's chop chords. */
const CHOP: Record<string, string[]> = {
  D: ["D4", "F#4", "A4"], Bm: ["D4", "F#4", "B4"], G: ["D4", "G4", "B4"], A: ["C#4", "E4", "A4"], A7: ["C#4", "E4", "G4"], Em: ["E4", "G4", "B4"], "F#m": ["C#4", "F#4", "A4"],
};
/**
 * Walks into the next phrase, on the bar's last three eighths: up A-B-C# into D, and in bar 8
 * down D-B-A into the B section's G. [bass, guitar]
 */
const WALKS: Record<number, [string[], string[]]> = {
  4: [["A1", "B1", "C#2"], ["A2", "B2", "C#3"]],
  8: [["D2", "B1", "A1"], ["D3", "B2", "A2"]],
  12: [["A1", "B1", "C#2"], ["A2", "B2", "C#3"]],
  16: [["A1", "B1", "C#2"], ["A2", "B2", "C#3"]],
};

const boom: Note[] = [];
const chuck: Note[] = [];
/**
 * The upright bass plucks firmly (the louder pizzicato layer: the soft one's notes range over
 * 17 dB, its low F# and G barely sounding), each note evened toward the typical level by velocity.
 */
const bass: Note[] = [];
const chop: Note[] = [];
const stomp: Note[] = [];

for (let bar = 1; bar <= BARS; bar++) {
  const t = at(bar);
  const pass = passOf(bar);
  const section = sectionOf(bar);
  const up = lift(t);
  const a = chordAt(t);
  const b = chordAt(t + 3);
  const hush = pass === 3 && section === "B";
  const walk = WALKS[((bar - 1) % THEME_BARS) + 1];

  // Bass and the guitar's boom on the pulses: the root, then the fifth (or the new chord's root).
  const second = (map: Record<string, [string, string]>) => (a === b || (a === "A" && b === "A7") ? map[a]![1] : map[b]![0]);
  const bv = (hush ? 0.64 : 0.72) + up * 0.5;
  const gv = (hush ? 0.54 : 0.62) + up;
  bass.push({ t, d: 2.6, n: midi(BASS[a]![0]), v: bv });
  boom.push({ t, d: 2, n: midi(BOOM[a]![0]), v: gv });
  if (walk) {
    walk[0].forEach((n, i) => bass.push({ t: t + 3 + i, d: 1, n: midi(n), v: bv - 0.06 + i * 0.02 }));
    walk[1].forEach((n, i) => boom.push({ t: t + 3 + i, d: 1, n: midi(n), v: gv - 0.07 + i * 0.03 }));
  } else {
    bass.push({ t: t + 3, d: 2.6, n: midi(second(BASS)), v: bv - 0.06 });
    boom.push({ t: t + 3, d: 2, n: midi(second(BOOM)), v: gv - 0.07 });
  }

  // The chuck: a short strum on the swung "and" of each pulse, rolled low to high. Not in the
  // hush, where the piano's hymn chords hold the harmony in the same register.
  const strum = (when: number, chord: string, v: number) =>
    CHUCK[chord]!.forEach((n, i) => chuck.push({ t: when + i * 0.06, d: 1, n: midi(n), v: v - i * 0.03 }));
  const cv = (pass === 1 && section === "A" ? 0.42 : 0.5) + up;
  if (!hush) {
    strum(t + 2, a, cv);
    if (!walk) strum(t + 5, b, cv - 0.04);
  }

  // The mandolin chops with the strums from the first pass's A', except in the hush.
  if (bar >= 5 && !hush) {
    const cut = (when: number, chord: string, v: number) =>
      CHOP[chord]!.forEach((n, i) => chop.push({ t: when + i * 0.04, d: 1, n: midi(n), v: v - i * 0.02 }));
    cut(t + 2, a, 0.5 + up * 0.5);
    if (!walk) cut(t + 5, b, 0.52 + up * 0.5);
  }

  // A foot on the porch boards, from the fiddle's pass: both pulses, only the first in the hush.
  if (pass >= 2) {
    stomp.push({ t, d: 1, n: "C2", v: hush ? 0.3 : 0.4 });
    if (!hush) stomp.push({ t: t + 3, d: 1, n: "C2", v: 0.3 });
  }
}

// ================================================================ the song

const song: Song = {
  name: "thanksgiving",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.6, damp: 0.7, width: 0.9, level: 0.85 },
  tracks: [
    // Each string rings until struck again, at most 1.6 s (some recordings pick up room noise later).
    ...dulcimerTracks("lead", 0.5, 1.6),
    ...dulcimerTracks("back", 0.48, 1.2),
    ...leveled({ inst: "fiddle", gain: 0.24, pan: -0.2, reverb: 0.3, lowpass: 3000, label: "fiddle" }, fiddle),
    ...leveled({ inst: "fiddle", gain: 0.18, pan: -0.2, reverb: 0.3, lowpass: 3000, label: "fiddle" }, fiddleUnder),
    ...leveled({ inst: "fiddle", gain: 2, pan: -0.15, reverb: 0.3, lowpass: 3200, label: "fiddle (drones)" }, drones),
    ...leveled({ inst: "fiddle", gain: 0.5, pan: -0.25, reverb: 0.3, lowpass: 3200, label: "fiddle (counter)" }, counter),
    { inst: "harmonica", notes: harmonica, gain: 0.31, pan: 0.2, reverb: 0.3, lowpass: 1600, humanize: 0.3, label: "harmonica" },
    { inst: "piano", notes: piano, gain: 0.034, pan: 0.05, reverb: 0.3, humanize: 0.3, label: "piano" },
    { inst: "harmonica", notes: fills, gain: 0.54, pan: 0.3, reverb: 0.3, lowpass: 1600, humanize: 0.3, label: "harmonica (fills)" },
    // Each boom rings until the next; a strum is a short chuck, damped by the fretting hand.
    { inst: "guitar", notes: boom, gain: 0.032, pan: -0.3, reverb: 0.2, humanize: 0.4, choke: true, ring: 1.2, highpass: 90, label: "guitar (boom)" },
    { inst: "guitar", notes: chuck, gain: 0.025, pan: -0.35, reverb: 0.2, humanize: 0.5, ring: 0.2, label: "guitar (chuck)" },
    ...leveled({ inst: "strumstick", gain: 0.38, pan: 0.4, reverb: 0.2, humanize: 0.4, ring: 0.07, lowpass: 4500, label: "mandolin chop" }, chop),
    // The bass is high-passed: phones can't play its lowest octave. The foot is a bass drum with
    // its boom taken off (high-passed at 200 Hz, its tail cut): a knock on the porch boards that
    // a phone plays, not a low thump it can't.
    { inst: "bassPizz", notes: evened("bassPizz", bass), gain: 0.3, pan: 0, reverb: 0.1, choke: true, highpass: 80 },
    { inst: "kick", notes: stomp, gain: 1.2, pan: 0, reverb: 0.1, highpass: 200, ring: 0.35, label: "stomp" },
  ],
};

export default song;
