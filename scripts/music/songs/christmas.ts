// Christmas: a sleigh-ride waltz in F major, bright and cozy, that a Victorian street band joins
// in the second pass. 32 bars = the theme twice.
//
// Pass 1: the flute sings the tune over harp arpeggios, a soft violin pad and a pizzicato bass,
// with sleigh bells on every eighth; the glockenspiel twinkles on the pulse notes in A' and A''.
// In the B section the bass turns legato (cellos), a horn sings a countermelody and a parlor
// piano (an upright) takes over from the harp with soft rolled chords.
// Pass 2: the glockenspiel takes the first phrase alone over soft vibraphone bell dyads (a celesta
// stand-in), like a music box, and hands the tune on bar 20's pickup to the parlor piano, which
// plays A' an octave below the flute over its own arpeggiated left hand while the band rests.
// The flute takes the tune back on bar 24's pickup and a street brass band arrives, the kind that
// played with the carolers: in B a hymn-like chorale under the tune (the horn's countermelody on
// top, the euphonium mostly a sixth below it, the tuba on the roots) over a soft bass drum on the
// pulse. A snare roll swells into the last phrase, a clash of cymbals marks it, and the euphonium
// sings the tune two octaves under the flute (the glockenspiel an octave above it), the horn in
// thirds and sixths below it, with the harp and strings back in and the snare keeping the lilt.
// A harp sweep up the dominant seventh and a triangle "tk-tk-ting" lead each pass back into the
// top.
//
// Register plan, so no two harmony parts fight in the same octave:
//   tuba G1–F2 · bass pizz G1–F2 · cellos (B) G2–D3 · piano left hand C2–Bb3
//   euphonium (B) C3–F3, (A'') the tune F3–F4 · horn (B) F3–D4, (A'') Bb2–C4 under the euphonium
//   harp Bb3–D5 · piano chords (B) F4–E5, tune E4–A5 · violins E4–D5 (A), G4–F5 (B, last A'')
//   vibraphone G4–F5 · flute C5–A6 (glockenspiel solo A5–F6) · glockenspiel twinkles C6–G7
// All parts sit inside their instruments' recorded ranges. The horn stays at or below D4: above
// C4 it has only a soft D5 and F5, so its higher notes would be stretched recordings. The
// euphonium (trombone + tuba) has recordings up to F4, which is why it, not the horn, sings the
// tune in the last phrase.
//
// Tuning is the sampler's: it tunes every note as heard, at its pitch and length (instruments.ts).
// This file only has the harp damp strings that would rub against the next chord (damped).

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, type Note, type SampledTrack, type Song, type Track } from "../song";
import { chordNotes, EIGHTHS_PER_BAR, harmony, melody, THEME_BARS, THEME_BPM, type Quality } from "../theme";

const KEY = 5; // C major -> F major
const BAR = EIGHTHS_PER_BAR;
const PASS = THEME_BARS * BAR;
const BARS = THEME_BARS * 2;
/** Start of `bar` (1-based, counted over the whole loop) plus `eighth` eighths. */
const at = (bar: number, eighth = 0) => (bar - 1) * BAR + eighth;

type Section = "A" | "A'" | "B" | "A''";
/** Section of a bar (0-based, counted over the whole loop). */
const sectionOf = (bar: number): Section => (["A", "A'", "B", "A''"] as const)[Math.floor((bar % THEME_BARS) / 4)]!;

// ---------------------------------------------------------------- harmony helpers

interface Chord {
  root: number;
  quality: Quality;
  /** Pitch classes: root, 3rd, 5th (, 7th). */
  pcs: number[];
}
const CHORDS: Chord[] = harmony().map((c) => {
  const notes = chordNotes(c.root, c.quality, 4).map((n) => n + KEY);
  return { root: notes[0]! % 12, quality: c.quality, pcs: notes.map((n) => n % 12) };
});
const chordAt = (t: number): Chord => CHORDS[Math.floor((t % PASS) / 3)]!;

/** Chord tones from `lo` to `hi` (inclusive), ascending. */
function tonesIn(c: Chord, lo: string, hi: string): number[] {
  const out: number[] = [];
  for (let m = midi(lo); m <= midi(hi); m++) if (c.pcs.includes(m % 12)) out.push(m);
  return out;
}

/** The lowest note at or above `lo` (a name or MIDI number) with pitch class `pc`. */
function above(pc: number, lo: string | number): number {
  const m = typeof lo === "number" ? lo : midi(lo);
  return m + ((((pc - m) % 12) + 12) % 12);
}

/** True when two pitches rub: a semitone apart, give or take octaves (a minor 2nd, major 7th or minor 9th). */
const rubs = (a: number, b: number) => [1, 11].includes((((a - b) % 12) + 12) % 12);

/**
 * A three-voice voicing of `c` within [lo, hi] that moves as little as possible from `prev`
 * (so common tones hold, the way a string section or a pianist would voice it).
 */
function voicing(c: Chord, lo: string, hi: string, prev: number[] | null): number[] {
  const tones = tonesIn(c, lo, hi);
  const options: number[][] = [];
  for (let i = 0; i < tones.length; i++)
    for (let j = i + 1; j < tones.length; j++)
      for (let k = j + 1; k < tones.length; k++) {
        const v = [tones[i]!, tones[j]!, tones[k]!];
        const pcs = new Set(v.map((n) => n % 12));
        // Always the 3rd (and the 7th on a dominant seventh); three different notes.
        if (pcs.size === 3 && pcs.has(c.pcs[1]!) && (c.pcs.length < 4 || pcs.has(c.pcs[3]!))) options.push(v);
      }
  const centre = (midi(lo) + midi(hi)) / 2;
  const cost = (v: number[]) => (prev ? v.reduce((s, n, i) => s + Math.abs(n - prev[i]!), 0) : Math.abs(v[1]! - centre));
  return options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}

// ---------------------------------------------------------------- level helpers

/** Velocity that plays `db` louder (or quieter) than velocity `v` (the sampler plays 0.35 + 0.65 v). */
function trim(v: number, db: number, lo = 0.05, hi = 1): number {
  const amp = (0.35 + 0.65 * v) * 10 ** (db / 20);
  return Math.min(hi, Math.max(lo, (amp - 0.35) / 0.65));
}

/**
 * Measured sustain level (dB) of the recording a note will play, choosing the zone the way the
 * sampler does (nearest, preferring to shift up). Used to even out sets whose recordings differ
 * in loudness from note to note.
 */
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

// Sustain levels (dB) of each set's recordings, measured over 0.25–1 s.
const FLUTE_LEVELS: [string, number][] = [["A4", -29], ["C5", -30], ["E5", -23], ["A5", -23], ["C6", -22], ["E6", -16], ["A6", -16], ["C7", -10]];
const VIOLIN_LEVELS: [string, number][] = [["F#4", -30], ["A4", -30], ["C5", -23.5], ["E5", -29.5], ["G5", -27]];
const HORN_LEVELS: [string, number][] = [["F3", -24], ["A3", -20], ["C4", -24.5]];
const VIBES_LEVELS: [string, number][] = [["E4", -21], ["G4", -22.5], ["B4", -22], ["D5", -18.5], ["F5", -18.5]];

/**
 * Level (dB RMS over its first 0.05–0.6 s, after the sampler's `even` scaling) of the recording
 * the sampler plays for `note` at velocity `v`. Measured from the recording itself, so parts
 * evened with it stay even if instruments.ts changes.
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

const num = (n: Note) => (typeof n.n === "number" ? n.n : midi(n.n));

/**
 * A part split into one track per recording it plays, each with the gain that brings that
 * recording to `db` (as recordingDb() measures it): for sets whose recordings differ in loudness
 * by more than a velocity layer's range can even out.
 */
function evenTracks(track: SampledTrack, db: number): Track[] {
  const byZone = new Map<number, Note[]>();
  for (const n of track.notes) {
    const z = instrument(track.inst).zoneFor(num(n), n.v ?? 0.7).note;
    byZone.set(z, [...(byZone.get(z) ?? []), n]);
  }
  return [...byZone.values()].map((notes) => {
    const level = recordingDb(track.inst, num(notes[0]!), notes[0]!.v ?? 0.7);
    return { ...track, notes, gain: (track.gain ?? 1) * 10 ** ((db - level) / 20) };
  });
}

/** How far ahead (in eighths) damped() looks for a chord a ringing harp string would rub against. */
const DAMP_SPAN = 24;

/**
 * The harp's strings ring for ten seconds. A harpist damps a string when the harmony moves to a
 * chord it would rub against (a semitone from one of that chord's notes, like the A of F under B
 * flat, or the E of C under F), and stops all its strings on the bar line where the harp hands
 * over and rests (bars 9 and 21). Each note rings until the first of those; the rest ring out.
 * One track per ring time (a track's `ring` is the same for all its notes).
 */
function damped(track: Track): Track[] {
  const loop = BARS * BAR;
  const byRing = new Map<number, Note[]>();
  for (const n of track.notes) {
    let ring = Infinity;
    for (let c = Math.floor(n.t / 3) + 1; c * 3 - n.t <= DAMP_SPAN; c++) {
      if (chordAt(c * 3).pcs.some((pc) => rubs(num(n), pc))) {
        ring = c * 3 - n.t;
        break;
      }
    }
    for (let line = (Math.floor(n.t / BAR) + 1) * BAR; line - n.t <= DAMP_SPAN; line += BAR) {
      const rests = !track.notes.some((o) => (((o.t - line) % loop) + loop) % loop < BAR);
      if (rests) {
        ring = Math.min(ring, line - n.t);
        break;
      }
    }
    byRing.set(ring, [...(byRing.get(ring) ?? []), n]);
  }
  const eighth = 60 / THEME_BPM;
  return [...byRing].map(([ring, notes]) => ({ ...track, notes, ...(Number.isFinite(ring) ? { ring: ring * eighth } : {}) }));
}

// ---------------------------------------------------------------- the tune

const tune = melody().map((n) => ({ ...n, n: midi(String(n.n)) + KEY, v: n.v ?? 0.7 }));

/** recordingDb() of the upright's recordings the parlor piano's tune is evened to (their median). */
const PIANO_TUNE_DB = -15;

/** Phrase shape per bar of a pass, in dB: rise to the A' peak, ease into B, climb to its top, settle. */
const ARC = [0, 0, 0.5, 0, 0.5, 1.5, 1, 0, -1, -0.5, 0.5, 1.5, 1, 0.5, 0, -0.5];

const flute: Note[] = [];
const glockSolo: Note[] = [];
const twinkle: Note[] = [];
const pianoTune: Note[] = [];
const euphTune: Note[] = [];
for (let pass = 0; pass < 2; pass++) {
  for (const n of tune) {
    const bar = Math.floor(n.t / BAR);
    const sec = sectionOf(bar);
    const t = n.t + pass * PASS;
    const pulse = n.t % 3 === 0;
    const up = n.n + 12;
    // Pass 2 hands the tune around: the music box (the glockenspiel, at the flute's pitch, the
    // bottom of its range and its warmest) up to bar 20's pickup, the parlor piano from there to
    // bar 24's pickup, then the flute again.
    const musicBox = pass === 1 && n.t < 3 * BAR + 3;
    const parlor = pass === 1 && !musicBox && n.t < 7 * BAR + 3;
    // Held notes close the phrases (all but the final cadence): clip them so the player breathes.
    const d = n.d >= 3 && bar < THEME_BARS - 1 ? n.d - 0.35 : n.d;
    // The flute's high recordings are much louder than its low ones: even most of that out. Over
    // the brass hymn, and in the last phrase where it shares the tune with the euphonium and the
    // glockenspiel, a little softer.
    const share = pass === 1 && sec === "B" ? -1 : pass === 1 && sec === "A''" ? -1.5 : 0;
    if (!musicBox && !parlor) flute.push({ t, d, n: n.n, v: trim(n.v * 0.85, ARC[bar]! + share - (zoneLevel(FLUTE_LEVELS, n.n) + 22) * 0.75) });
    // Soft strokes (layer 1, v < 1/3 even after humanizing) throughout: hard ones are mostly
    // 5 kHz+ ping.
    if (musicBox) glockSolo.push({ t, d: n.d, n: n.n, v: pulse ? 0.3 : 0.2 });
    // The piano sings it an octave below the flute, legato, in its louder layer (v >= 0.5), evened
    // out by velocity: its F#5 recording (which plays F5 and G5, the phrase's peak) is about 4 dB
    // softer than its neighbours.
    else if (parlor) {
      const v = 0.53 + (n.v - 0.55) * 0.4 + ARC[bar]! * 0.01;
      pianoTune.push({ t, d: n.d, n: n.n - 12, v: trim(v, PIANO_TUNE_DB - recordingDb("piano", n.n - 12, v), 0.52, 1) });
    }
    // Elsewhere the glockenspiel twinkles an octave up, softly: the pulse notes in pass 1's A' and
    // A'', the whole tune in the last phrase.
    else if (pass === 1 && sec === "A''") twinkle.push({ t, d: n.d, n: up, v: pulse ? 0.3 : 0.18 });
    else if (pass === 0 && (sec === "A'" || sec === "A''") && pulse) twinkle.push({ t, d: n.d, n: up, v: 0.26 });
    // The street band's euphonium sings the last phrase two octaves under the flute, in its soft
    // layer (v < 1/3: the round, unforced recordings, and the tuba's that reach D4).
    if (pass === 1 && sec === "A''") euphTune.push({ t, d, n: n.n - 24, v: 0.25 + (n.v - 0.55) * 0.25 });
  }
}

// ---------------------------------------------------------------- accompaniment

const harp: Note[] = [];
const bass: Note[] = [];
const tuba: Note[] = [];
const cellos: Note[] = [];
const pianoChords: Note[] = [];
const pianoLeft: Note[] = [];
let pianoVoicing: number[] | null = null;
for (let bar = 0; bar < BARS; bar++) {
  const t0 = bar * BAR;
  const sec = sectionOf(bar);
  const pass = bar < THEME_BARS ? 0 : 1;
  const first = chordAt(t0);
  const second = chordAt(t0 + 3);
  const lastBar = bar % THEME_BARS === THEME_BARS - 1;
  // Pass 2's A' is the parlor piano's alone; its B is the brass band's.
  const parlor = pass === 1 && sec === "A'";
  const hymn = pass === 1 && sec === "B";

  // Harp. A sections: a broken chord up and back down (Bb3–D5), each half on its own chord.
  // Last bar of each pass: a sweep up the dominant seventh into the top of the tune. It rests in
  // the B sections (the piano, then the brass) and under the parlor piano, and in bar 20 it stops
  // at the half bar to let the piano's pickup through. Under the euphonium's tune it leaves out a
  // string that would rub a semitone against the note the euphonium starts with it.
  if (sec !== "B" && !parlor) {
    const up = tonesIn(first, "Bb3", "D5");
    const down = tonesIn(second, "Bb3", "D5");
    const handoff = pass === 1 && sec === "A" && bar % 4 === 3;
    const pattern = lastBar || handoff ? [up[0], up[1], up[2]] : [up[0], up[1], up[2], down[3], down[2], down[1]];
    const vels = [0.6, 0.44, 0.48, 0.56, 0.46, 0.42];
    pattern.forEach((n, i) => {
      const sung = euphTune.find((e) => e.t === t0 + i)?.n as number | undefined;
      if (sung !== undefined && rubs(n!, sung) && Math.abs(n! - sung) <= 13) return;
      harp.push({ t: t0 + i, d: 1, n: n!, v: vels[i]! });
    });
    if (lastBar) {
      // Starts above the arpeggio's top note, so no string is plucked twice in a row.
      tonesIn(second, "G4", "B5")
        .filter((n) => n > up[2]!)
        .forEach((n, i) => harp.push({ t: t0 + 3 + i * 0.5, d: 1, n, v: 0.44 + i * 0.03 }));
    }
  }

  // Parlor piano in pass 1's B: a soft rolled chord on each pulse (F4–E5, voiced with held
  // common tones), and its top note again on the pulse's last eighth, so it lilts like a waltz.
  if (pass === 0 && sec === "B") {
    for (const half of [0, 3]) {
      pianoVoicing = voicing(chordAt(t0 + half), "F4", "E5", pianoVoicing);
      const v = half ? 0.36 : 0.42;
      pianoVoicing.forEach((n, i) => pianoChords.push({ t: t0 + half + i * 0.06, d: 3 - i * 0.06, n, v }));
      pianoChords.push({ t: t0 + half + 2, d: 1, n: pianoVoicing[2]!, v: 0.3 });
    }
  }

  // Parlor piano's left hand in pass 2's A': root, fifth (or the 7th of a dominant seventh) and
  // tenth broken across each pulse and held as if pedalled, C2–Bb3.
  if (parlor) {
    for (const half of [0, 3]) {
      const c = chordAt(t0 + half);
      const root = above(c.root, "C2");
      const mid = c.quality === "dom7" ? above(c.pcs[3]!, root) : above(c.pcs[2]!, root);
      const tenth = above(c.pcs[1]!, root + 12);
      [root, mid, tenth].forEach((n, i) => pianoLeft.push({ t: t0 + half + i, d: 3 - i, n, v: [0.42, 0.3, 0.34][i]! - (half ? 0.04 : 0) }));
    }
  }

  // Bass. A sections: pizzicato on the pulse, root then fifth (or the next root when the chord
  // changes mid-bar, or the 3rd of a dominant seventh, walking up into the tonic).
  // B: the cellos hold the roots legato and the pizz only marks the root.
  const root = above(first.root, "G1");
  let pulse2: number | null;
  if (second.root !== first.root) pulse2 = above(second.root, "G1");
  else if (sec === "B") pulse2 = null;
  else if (second.quality === "dom7") pulse2 = above(second.pcs[1]!, "G1");
  else pulse2 = root - 5 >= midi("G1") ? root - 5 : root + 7;
  // The pizz rests under the parlor piano (it plays its own bass) and the brass hymn (the tuba
  // has the bass); in the last phrase the tuba doubles it, legato.
  if (!parlor && !hymn) {
    bass.push({ t: t0, d: 2, n: root, v: 0.82 });
    if (pulse2 !== null) bass.push({ t: t0 + 3, d: 2, n: pulse2, v: 0.64 });
  }
  if (pass === 1 && sec === "A''") {
    tuba.push({ t: t0, d: 3, n: root, v: 0.5 });
    if (pulse2 !== null) tuba.push({ t: t0 + 3, d: 3, n: pulse2, v: 0.44 });
  }
  // In the hymn the tuba holds the roots: a bar, or a half bar when the chord changes.
  if (hymn) {
    if (second.root === first.root) tuba.push({ t: t0, d: 6, n: root, v: 0.5 });
    else {
      tuba.push({ t: t0, d: 3, n: root, v: 0.5 });
      tuba.push({ t: t0 + 3, d: 3, n: above(second.root, "G1"), v: 0.48 });
    }
  }

  if (pass === 0 && sec === "B") {
    const swell = 0.6 + (bar % 4) * 0.03;
    if (first.root === second.root) cellos.push({ t: t0, d: 6, n: above(first.root, "G2"), v: swell });
    else {
      cellos.push({ t: t0, d: 3, n: above(first.root, "G2"), v: swell });
      cellos.push({ t: t0 + 3, d: 3, n: above(second.root, "G2"), v: swell });
    }
  }
}

// Violins: a sustained pad, one voicing per half bar with held common tones. Below the tune in
// the A sections (E4–D5), a little higher in B and the last phrase (G4–F5) to leave the horn and
// the euphonium room; hushed under the music box and the parlor piano, a little softer under the
// brass hymn.
const violins: Note[] = [];
{
  const halves = CHORDS.length * 2;
  const voicings: number[][] = [];
  let last: number[] | null = null;
  for (let h = 0; h < halves; h++) {
    const bar = Math.floor(h / 2);
    const high = sectionOf(bar) === "B" || (bar >= THEME_BARS && sectionOf(bar) === "A''");
    const [lo, hi] = high ? ["G4", "F5"] : ["E4", "D5"];
    last = voicing(chordAt(h * 3), lo, hi, last);
    voicings.push(last);
  }
  // Hold a voice while its note stays the same; restart it when the note moves.
  for (let voice = 0; voice < 3; voice++) {
    let cur: Note | null = null;
    for (let h = 0; h < halves; h++) {
      const n = voicings[h]![voice]!;
      if (cur && n === cur.n) {
        cur.d += 3;
        continue;
      }
      if (cur) violins.push(cur);
      const bar = Math.floor(h / 2);
      const pass = Math.floor(bar / THEME_BARS);
      const sec = sectionOf(bar);
      const dyn = (pass === 1 ? 1 : 0) + ARC[bar % THEME_BARS]! * 0.7 - (pass === 1 && sec === "B" ? 2 : 0);
      // Layer 2 (v >= 0.5) speaks quickly enough for chord changes; the C5 recordings are ~6 dB
      // louder than their neighbours, so they get the bottom of that layer. Under the music box
      // and the parlor piano, layer 1: a pianissimo that swells in slowly.
      const hushed = pass === 1 && (sec === "A" || sec === "A'");
      const v: number = hushed ? 0.4 : trim(0.86, dyn - (zoneLevel(VIOLIN_LEVELS, n) + 29.5) * 0.6, 0.52, 0.98);
      cur = { t: h * 3, d: 3, n, v };
    }
    if (cur) violins.push(cur);
  }
}

// Vibraphone (celesta stand-in): soft bell dyads on the bar under pass 2's music box. These
// recordings can't be damped: a note is still only ~4 dB down a bar later and ~9 dB down two bars
// later. So it strikes only the chord tones that won't rub against any chord of the next two bars
// (no A of F or Dm ringing into B flat, no F into C, no E or B flat of C7 into the F at the top),
// as a vibraphonist without a pedal would choose them.
const vibes: Note[] = [];
for (let bar = THEME_BARS; bar < THEME_BARS + 4; bar++) {
  const t = bar * BAR;
  const later = [3, 6, 9, 12].map((d) => chordAt(t + d));
  const safe = tonesIn(chordAt(t), "G4", "F5").filter((n) => later.every((c) => c.pcs.every((pc) => !rubs(n, pc))));
  for (const n of safe.slice(-2)) vibes.push({ t: t + 0.04, d: 3, n, v: trim(0.6, -(zoneLevel(VIBES_LEVELS, n) + 22) * 0.7, 0.52, 0.7) });
}

// ---------------------------------------------------------------- horn and street band

/**
 * The brass recordings take 30–110 ms to speak (most about 50), against the drum's and the
 * piano's instant attacks: start brass notes this many eighths early, as players do.
 */
const SPEAK = 0.15;
const early = (notes: Note[]): Note[] => notes.map((n) => ({ ...n, t: n.t - SPEAK }));

// Horn countermelody in each B section: it climbs while the tune falls, holding its D over the
// change to C (a 9-8 suspension, resolving down to C), falls while the tune climbs, and holds the
// 7th of C7 (B flat) resolving to A as the tune comes home. In pass 2 it is the top of the brass
// hymn, and it resolves into its harmony line under the euphonium (below). It peaks on D4: this
// layer's top recording is C4, and further above a recording a horn sounds stretched.
const HORN_LINE: [number, number, string][] = [
  [0, 3, "Bb3"], [3, 6, "D4"],
  [9, 2, "C4"], [11, 1, "Bb3"],
  [12, 3, "A3"], [15, 2, "F3"], [17, 1, "A3"],
  [18, 6, "Bb3"],
  [24, 4, "A3"],
];
const HORN_SWELL = [0.62, 0.68, 0.66, 0.6, 0.62, 0.6, 0.58, 0.64, 0.56];
const horn: Note[] = [];
for (let pass = 0; pass < 2; pass++) {
  HORN_LINE.forEach(([t, d, n], i) => {
    if (pass === 1 && i === HORN_LINE.length - 1) return;
    const m = midi(n);
    // Layer 3 only (0.5 <= v < 0.75): layer 4 has just two recordings.
    const v = trim(HORN_SWELL[i]! + pass * 0.03, -(zoneLevel(HORN_LEVELS, m) + 23) * 0.6, 0.52, 0.72);
    horn.push({ t: pass * PASS + 8 * BAR + t, d, n: m, v });
  });
}

// The euphonium in the hymn: the horn's line mostly a sixth below (thirds where the horn dips to
// F3, the tritone of C7 at the end), so the two sing as a pair over the tuba. From B flat to C
// (bar 26) it falls to C3 instead, under the horn's suspended D: rising F3 to G3 there with the
// tuba's B flat to C would be parallel fifths, the whole band moving up as one block.
// Its middle layer (1/3 <= v < 2/3).
const EUPH_LINE: [number, number, string][] = [
  [0, 3, "D3"], [3, 3, "F3"],
  [6, 3, "C3"], [9, 3, "E3"],
  [12, 3, "C3"], [15, 2, "D3"], [17, 1, "F3"],
  [18, 3, "D3"], [21, 3, "E3"],
];
const euphHymn: Note[] = EUPH_LINE.map(([t, d, n], i) => ({ t: at(25) + t, d, n, v: [0.44, 0.47, 0.5, 0.46, 0.44, 0.46, 0.42, 0.47, 0.5][i]! }));

// The horn under the euphonium's tune in the last phrase: thirds and sixths below it (Bb2–C4),
// starting from the A its countermelody resolves to, ending on the 3rd of C7. Its second layer
// (1/4 <= v < 1/2), softer than the countermelody's.
const HORN_HARMONY: [number, number, string][] = [
  [0, 5, "A3"], [5, 1, "C4"],
  [6, 2, "F3"], [8, 1, "A3"], [9, 2, "F3"], [11, 1, "D3"],
  [12, 2, "G3"], [14, 1, "F3"], [15, 2, "Bb2"], [17, 1, "D3"],
  [18, 6, "E3"],
];
const hornLow: Note[] = HORN_HARMONY.map(([t, d, n]) => ({ t: at(29) + t, d, n, v: t % 3 === 0 ? 0.44 : 0.38 }));
/**
 * recordingDb() the horn's harmony is evened to, one track per recording (evenTracks): that
 * layer's recordings differ by 14 dB (its A3 hot, its B flat 2 and D3 weak), which left the line
 * fading out under the tune.
 */
const HORN_LOW_DB = -30.5;

// ---------------------------------------------------------------- percussion

// Sleigh bells on every eighth, accented on the two pulses; lighter in B, in the music box and
// under the parlor piano, lightest under the brass hymn.
const bells: Note[] = [];
for (let t = 0; t < BARS * BAR; t++) {
  const bar = Math.floor(t / BAR);
  const inBar = t % BAR;
  const base = inBar === 0 ? 0.92 : inBar === 3 ? 0.78 : inBar % 3 === 1 ? 0.36 : 0.28;
  const sec = sectionOf(bar);
  const pass2 = bar >= THEME_BARS;
  const db = sec === "B" ? (pass2 ? -3 : -1.5) : pass2 && sec === "A" ? -1 : pass2 && sec === "A'" ? -2 : 0;
  bells.push({ t, d: 1, n: "C4", v: trim(base, db) });
}

// Triangle: open strokes ("ting") on section tops, fully muted ones ("tk") at phrase ends and
// the "tk-tk" into the top of each pass. Layer 2 (v >= 0.5) for the loud ones.
const triangle: Note[] = [
  { t: at(1), d: 1, n: "C4", v: 0.74 }, // top of the loop
  { t: at(17), d: 1, n: "C4", v: 0.66 }, // top of pass 2
  { t: at(13), d: 1, n: "C4", v: 0.66 }, // pass 1's A''
  { t: at(5), d: 1, n: "C4", v: 0.4 }, // soft: A', B
  { t: at(9), d: 1, n: "C4", v: 0.4 },
  { t: at(21), d: 1, n: "C4", v: 0.4 },
  { t: at(25), d: 1, n: "C4", v: 0.4 },
];
const triangleTicks: Note[] = [
  { t: at(16, 4), d: 1, n: "C4", v: 0.66 }, // "tk-tk" into bar 17
  { t: at(16, 5), d: 1, n: "C4", v: 0.66 },
  { t: at(32, 4), d: 1, n: "C4", v: 0.66 }, // "tk-tk" into bar 1
  { t: at(32, 5), d: 1, n: "C4", v: 0.66 },
  { t: at(4, 3), d: 1, n: "C4", v: 0.4 }, // soft ticks at phrase ends
  { t: at(12, 3), d: 1, n: "C4", v: 0.4 },
  { t: at(20, 3), d: 1, n: "C4", v: 0.4 },
];

// The street band's drummer: a soft bass drum on the pulse while the band plays (the second
// pulse lighter), a snare roll swelling over the last half of bar 28 into a stroke on bar 29,
// where the cymbals clash once and the bass drum hits harder, then light snare strokes (below).
const kick: Note[] = [];
for (let bar = 25; bar <= 32; bar++) {
  // Its second layer (1/4 <= v < 1/2) throughout: the louder hits are peaky enough to drive the
  // master's limiter.
  const hymn = bar < 29;
  kick.push({ t: at(bar), d: 1, n: "C2", v: bar === 29 ? 0.48 : hymn ? 0.34 : 0.38 });
  kick.push({ t: at(bar, 3), d: 1, n: "C2", v: hymn ? 0.27 : 0.29 });
}
// The roll rises in three steps on its two louder recordings (each restarts with a small accent,
// like a drummer's crescendo); the softest recording is 13 dB down and would only rustle.
const roll: Note[] = [
  { t: at(28, 3), d: 1, n: "D2", v: 0.36 },
  { t: at(28, 4), d: 1, n: "D2", v: 0.6 },
  { t: at(28, 5), d: 1, n: "D2", v: 0.85 },
];
// In the last phrase the drummer keeps the lilt on the snare, a light stroke on the last eighth of
// each pulse ("boom . chk"), and leaves the last one to the triangle's "tk-tk" into the top. The
// bass drum is felt more than heard (almost all of it is below 150 Hz, which a phone's speaker
// doesn't play), so on a phone these strokes are the drummer.
const snare: Note[] = [{ t: at(29), d: 1, n: "D2", v: 0.5 }];
for (let bar = 29; bar <= 32; bar++) for (const e of bar < 32 ? [2, 5] : [2]) snare.push({ t: at(bar, e), d: 1, n: "D2", v: 0.44 });
// The clash in the pair's ff layer (v >= 0.5; the mf one is under 0.5).
const cymbals: Note[] = [{ t: at(29), d: 1, n: "C#3", v: 0.6 }];

const song: Song = {
  name: "christmas",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.76, damp: 0.45, width: 0.95, level: 0.95 },
  tracks: [
    { inst: "flute", notes: flute, gain: 1.0, pan: 0, reverb: 0.3, humanize: 0.25, lowpass: 7000 },
    { inst: "glockenspiel", notes: glockSolo, gain: 19, pan: 0.1, reverb: 0.35 },
    { inst: "glockenspiel", notes: twinkle, gain: 0.8, pan: 0.25, reverb: 0.4 },
    { inst: "piano", notes: pianoTune, gain: 0.27, pan: 0.05, reverb: 0.32, humanize: 0.2, lowpass: 5000, label: "piano (tune)" },
    { inst: "piano", notes: pianoLeft, gain: 0.09, pan: 0.05, reverb: 0.32, humanize: 0.2, lowpass: 5000, label: "piano (left hand)" },
    { inst: "piano", notes: pianoChords, gain: 0.13, pan: 0.15, reverb: 0.32, humanize: 0.2, lowpass: 5000, label: "piano (chords)" },
    ...damped({ inst: "harp", notes: harp, gain: 0.9, pan: 0.35, reverb: 0.35, humanize: 0.25, label: "harp" }),
    { inst: "violins", notes: violins, gain: 0.27, pan: -0.3, reverb: 0.4, humanize: 0.15 },
    { inst: "vibraphone", notes: vibes, gain: 0.24, pan: -0.2, reverb: 0.4, humanize: 0.15 },
    { inst: "horn", notes: early(horn), gain: 0.75, pan: -0.15, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (countermelody)" },
    ...evenTracks({ inst: "horn", notes: early(hornLow), gain: 2, pan: -0.2, reverb: 0.35, humanize: 0.15, lowpass: 4500, label: "horn (harmony)" }, HORN_LOW_DB),
    ...euphonium(early(euphHymn), { gain: 2.9, pan: 0.15, reverb: 0.32, humanize: 0.15, label: "euphonium (hymn)" }),
    ...euphonium(early(euphTune), { gain: 12, pan: 0.1, reverb: 0.32, humanize: 0.15, label: "euphonium (tune)" }),
    { inst: "tuba", notes: early(tuba), gain: 1, pan: 0.05, reverb: 0.2, humanize: 0.15 },
    { inst: "cellos", notes: cellos, gain: 0.18, pan: 0.3, reverb: 0.25, humanize: 0.15 },
    { inst: "bassPizz", notes: bass, gain: 0.45, pan: 0.15, reverb: 0.12 },
    { inst: "kick", notes: kick, gain: 2, pan: 0, reverb: 0.2 },
    { inst: "snareRoll", notes: roll, gain: 0.5, pan: -0.1, reverb: 0.3, humanize: 0, lowpass: 6000 },
    { inst: "snareOn", notes: snare, gain: 0.9, pan: -0.1, reverb: 0.3, lowpass: 6000 },
    { inst: "cymbals", notes: cymbals, gain: 0.9, pan: 0.2, reverb: 0.4, lowpass: 5000 },
    { inst: "sleighBells", notes: bells, gain: 0.135, pan: 0.25, reverb: 0.2, humanize: 0.5 },
    { inst: "triangle", notes: triangle, gain: 0.8, pan: -0.3, reverb: 0.45, humanize: 0 },
    { inst: "triangleMuted", notes: triangleTicks, gain: 0.8, pan: -0.3, reverb: 0.45, humanize: 0 },
  ],
};

export default song;
