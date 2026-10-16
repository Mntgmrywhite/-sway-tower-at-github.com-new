// Thanksgiving: Turkey Hollow's barn dance, then the same tune as a cool-jazz trio by the fire.
// The theme in G major, played twice (32 bars, 36 s):
//
//   1–16   The hoedown: warm acoustic folk, the 6/8 as a jig. A fiddle carries the tune over a nylon
//          guitar strumming the jig lilt (DUM-da DUM-da), a contrabass plucking root and fifth on
//          the pulse, and a barn-dance groove (shaker, woodblock clip-clop, foot stomps, claps). A
//          strumstick (a dulcimer-like stick) plays a countermelody under the tune in A' (5–8) and
//          a harmonica answers the fiddle at the end of it. Then the town band joins: a euphonium
//          sings the countermelody through B and A'' (9–16), the French horn a third under it from
//          bar 13 while the room claps along. Bar 16 is the break: the band stops on the downbeat,
//          horn and euphonium hold the D7, and the piano takes the tune's last two notes as the
//          pickup into...
//   17–32  ...a warm cool-jazz piano trio, in the spirit of a 1970s TV holiday special. The 6/8 is
//          felt in 2: a dotted quarter is one swing beat, so the tune's quarter-eighth pairs are
//          swung eighths, played a little lighter than the jig's triplets. The piano plays the tune
//          over left-hand rootless voicings (sevenths and ninths on the theme's chords); the
//          contrabass plays in 2 (17–24), then walks (25–32); the drums play a stick ride (ding,
//          ding-a), the hi-hat's foot chick on the backbeat pulse, a feathered kick and ghosted
//          snare, and a soft crash lifts B. A tenor sax joins: doubling the tune an octave below in A' (21–24, leaving
//          the pickup run into B to the piano), a tenth below in B (25–28), then taking the tune in
//          A'' (29–32) with the horn in harmony under it while the piano comps above. The bass walks
//          up D-E-F#, the drums fill and the guitar's pickup strum hand back to the hoedown at bar 1.
//
// Register plan (low to high), so parts don't fight:
//   hoedown  bass pizz G1–G2 · guitar strums A2–F#4 · horn (13–16) E3–B3 · euphonium E3–D4 ·
//            strumstick B3–E5 (5–8) · harmonica F#4–E5 (7–8) · fiddle D4–B5
//   trio     bass G1–F#2 · piano left hand D3–E4 (A), B2–A3 shells under the sax (A', B) ·
//            horn D3–B3 (29–32) · sax F#3–B4 · piano right hand: tune D4–B5, comping A4–F#5 (29–32)
// The fiddle, harmonica, strumstick, sax, cymbals and hi-hat are low-passed: the solo recordings
// are bright, and the owner hears that edge as harsh.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import { euphonium, transpose, type Note, type SampledTrack, type Song, type Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, THEME_BARS, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One time through the tune, in eighths. */
const PASS = THEME_BARS * BAR;
const LOOP = 2 * PASS;
/** The trio starts at bar 17. */
const TRIO = PASS;
/** C -> G major: the tune sits on the fiddle's D, A and E strings and the guitar gets open chords. */
const KEY = -5;
/** Eighths per minute: a dotted quarter of ~107, a lively jig. 32 bars = 1,728,000 frames at 48 kHz. */
const BPM = 320;

const wrap = (t: number) => (t + LOOP) % LOOP;

// ---------------------------------------------------------------- harmony

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function symbol(root: string, quality: Quality): string {
  const pc = (((midi(`${root}4`) + KEY) % 12) + 12) % 12;
  return NAMES[pc]! + (quality === "min" ? "m" : quality === "dom7" ? "7" : "");
}
/** The chord of every half bar (dotted quarter), in G: G Em C D D7 Am Bm. */
const HALVES = CHORDS.map(([root, quality]) => symbol(root, quality));

/** Open-position guitar shapes on the middle four strings, low to high. */
const GUITAR: Record<string, string[]> = {
  G: ["B2", "D3", "G3", "B3"],
  Em: ["B2", "E3", "G3", "B3"],
  C: ["C3", "E3", "G3", "C4"],
  D: ["D3", "A3", "D4", "F#4"],
  D7: ["D3", "A3", "C4", "F#4"],
  Am: ["A2", "E3", "A3", "C4"],
  Bm: ["B2", "F#3", "B3", "D4"],
};

/** Contrabass root and fifth, in the low register where the pizzicato recordings live. */
const BASS: Record<string, [string, string]> = {
  G: ["G2", "D2"],
  Em: ["E2", "B1"],
  C: ["C2", "G1"],
  D: ["D2", "A1"],
  D7: ["D2", "A1"],
  Am: ["A1", "E2"],
  Bm: ["B1", "F#2"],
};

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at quite different levels from note to note (the fiddle's by up to
// 10 dB, the strumstick's more), so a line played at one velocity comes out lumpy, with some
// notes of the tune ducking under the band. These read the recording the sampler plays for a
// note (zoneFor) so a line can be evened out before its dynamics are applied.

/** The velocity range of the layer a velocity plays (the sampler's rule). */
function layerRange(name: InstrumentName, vel: number): { lo: number; hi: number } {
  const n = new Set(instrument(name).zones.map((z) => z.layer)).size;
  const i = Math.min(n - 1, Math.floor(vel * n));
  return { lo: i / n, hi: i === n - 1 ? 1 : (i + 1) / n };
}

const zoneLevels = new Map<string, number>();
/**
 * How loud a note's recording gets while it's held (peak 30 ms RMS over its first `seconds`,
 * at most 0.35 s; dB, round robins averaged, after the sampler's evening-out). Some bowed
 * recordings swell in slowly, so a short note on them never reaches the level a long one does.
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

/** The hoedown's dynamics: rising through A' into the B section's peak (bar 12), the band full in A''. */
const ARC = [0, 0, 0.02, 0.02, 0.02, 0.04, 0.03, 0, 0.05, 0.06, 0.08, 0.1, 0.08, 0.07, 0.06, 0.05];
const lift = (t: number) => ARC[Math.floor((t % PASS) / BAR)]!;

const tune = transpose(melody(), KEY);

// ================================================================ 1–16: the hoedown

// ---------------------------------------------------------------- the fiddle, and the harmonica's answer

const fiddle: Note[] = [];
const spiccato: Note[] = [];
const harmonica: Note[] = [];

/** A bowed note takes ~30 ms to speak, a harmonica reed longer: start them early so they sit on the beat. */
const BOW = 0.15;
const reed = (n: number) => (n >= midi("A4") ? 0.3 : 0.1);

/** Once the groove is in, quarter notes played as a bowed treble (three quick strokes, then the note). */
const TREBLES = new Set([48, 63, 75, 84]);
/** The harmonica answers with the end of the A' phrase (bar 7 and the first half of bar 8). */
const answered = (t: number) => {
  const bar = Math.floor(t / BAR);
  return bar === 6 || (bar === 7 && t % BAR < 3);
};
/** The three-eighth pickups into bars 5 and 9 are bounced (spiccato). */
const pickup = (t: number) => {
  const bar = Math.floor(t / BAR);
  return (bar === 3 || bar === 7) && t % BAR >= 3;
};
/** Bar 16's last two notes (C5, A4) are the piano's: the pickup into the trio. */
const HANDOFF = 93;

for (const n of tune) {
  if (n.t >= HANDOFF) continue;
  const note = n.n as number;
  // The theme's lilt (strong pulse, lighter between), kept in the fiddle's loud bowing layer.
  const v = 0.6 + ((n.v ?? 0.6) - 0.55) * 0.8 + lift(n.t);
  if (pickup(n.t)) {
    spiccato.push({ t: n.t, d: 1, n: note, v: 0.8 + lift(n.t) });
  } else if (answered(n.t)) {
    const hv = 0.62 + ((n.v ?? 0.6) - 0.55) * 0.6 + lift(n.t);
    harmonica.push({ t: n.t - reed(note), d: n.d - 0.15, n: note, v: hv });
  } else if (TREBLES.has(n.t)) {
    [0.82, 0.62, 0.72].forEach((tv, i) => spiccato.push({ t: n.t + i / 3, d: 1, n: note, v: tv }));
    fiddle.push({ t: n.t + 1 - BOW, d: n.d - 1.2, n: note, v: v - 0.04 });
  } else {
    fiddle.push({ t: wrap(n.t - BOW), d: n.d >= 2 ? n.d - 0.25 : 0.8, n: note, v });
  }
}

// ---------------------------------------------------------------- strumstick countermelody (A')

// A slower line under the tune: chord tones a third or sixth below its strong notes, moving when
// the fiddle holds (bar 6) and resolving down by step at the cadence. [time, length, note]
const COUNTER: [number, number, string][] = [
  [24, 3, "G4"], [27, 3, "D5"], [30, 3, "E5"], [34, 1, "B4"], [35, 1, "G4"],
  [36, 3, "A4"], [39, 3, "C4"], [42, 6, "B3"],
];
const strumstick: Note[] = [];
for (const [t, d, name] of COUNTER) {
  // Plucked medium (the middle layer): warmer than the firm plucks, which carry far more pick
  // click and treble. Its uneven levels from note to note are evened out by `leveled`.
  const v = (d >= 3 ? 0.56 : 0.52) + lift(t) * 0.5;
  strumstick.push({ t, d, n: midi(name), v });
}

// ---------------------------------------------------------------- the town band: euphonium, horn (B, A'')

// The euphonium takes over the countermelody, the band's classic role for it: a singing tenor
// line in long notes that rises to the B section's peak (the C held from Am into D7, bar 12) and
// resolves down a step into A''; the horn joins a third under it for A''. Both hold the D7 (C over
// F#) through the break in bar 16; the euphonium's C resolves to B on the trio's first chord.
// [time, length, note]
const EUPH: [number, number, string][] = [
  [48, 3, "G3"], [51, 3, "E3"], [54, 3, "A3"], [57, 1, "F#3"], [58, 1, "G3"], [59, 1, "A3"],
  [60, 3, "B3"], [63, 3, "G3"], [66, 6, "C4"],
  [72, 3, "B3"], [75, 3, "D4"], [78, 3, "B3"], [81, 3, "G3"],
  [84, 3, "A3"], [87, 3, "C4"], [90, 3, "A3"], [93, 3, "C4"], [96, 2.5, "B3"],
];
/**
 * The horn's line, here under the euphonium and again under the sax at the end of the trio
 * (bars 29–32). There it takes D (Em7) under the sax's B in bar 30, since E3 would follow the
 * tune's D-B in parallel fifths in the bare two-voice texture, then climbs D-E-F#, reaching the
 * F# a pulse early and holding it through bar 32.
 */
const HORN_LINE: [number, number, string][] = [[72, 3, "G3"], [75, 3, "B3"], [78, 3, "G3"]];
const HORN_HOEDOWN: [number, number, string][] = [...HORN_LINE, [81, 3, "E3"], [84, 3, "E3"], [87, 3, "A3"], [90, 7.5, "F#3"]];
const HORN_TRIO: [number, number, string][] = [...HORN_LINE, [81, 3, "D3"], [84, 3, "E3"], [87, 8.5, "F#3"]];
const euph: Note[] = EUPH.map(([t, d, name]) => ({ t: t - 0.1, d: d - 0.2, n: midi(name), v: t >= TRIO ? 0.45 : 0.55 + lift(t) * 0.5 }));
/**
 * The euphonium's tracks. The tuba's louder takes stop at A#3, so the line's D4 (bar 13) would
 * stretch it a major third: the tuba plays that note from its soft take (the only D4), brought up
 * to the level the loud take would have had.
 */
function euphoniumTracks(opts: Parameters<typeof euphonium>[1]): Track[] {
  const SOFT = 0.3;
  const amp = (v: number) => 0.35 + 0.65 * v;
  const [trombone, tuba] = euphonium(euph, opts) as [Track, Track];
  const high = (n: Note) => (n.n as number) - instrument("tuba").zoneFor(n.n as number, n.v ?? 0.7).note > 3;
  const soft = tuba.notes.filter(high).map((n): Track => {
    const up = zoneDb("tuba", n.n as number, n.v ?? 0.7) - zoneDb("tuba", n.n as number, SOFT);
    return { ...tuba, notes: [{ ...n, v: SOFT }], gain: (tuba.gain ?? 1) * 10 ** (up / 20) * (amp(n.v ?? 0.7) / amp(SOFT)) };
  });
  return [trombone, { ...tuba, notes: tuba.notes.filter((n) => !high(n)) }, ...soft];
}
// The horn plays its mezzo-piano takes (velocity layer 2): in the louder layer the F3, which would
// play most of this line (E3, F#3, G3), speaks a quarter tone flat for its first 150 ms before it
// blooms. Their levels differ from note to note (the A3 7–11 dB hotter), so `leveled` evens them.
const hornPart = (start: number, line: [number, number, string][]): Note[] =>
  line.map(([t, d, name]) => ({ t: start + t - 0.1, d: d - 0.2, n: midi(name), v: 0.42 }));
const hornBand = hornPart(0, HORN_HOEDOWN);
const hornTrio = hornPart(TRIO, HORN_TRIO);

// ---------------------------------------------------------------- guitar, bass

/**
 * The guitar's four strings, low to high, each its own (choked) track: a string rings until it is
 * struck again, so every down stroke stops the last chord instead of ringing into the next one.
 */
const guitar: Note[][] = [[], [], [], []];
/** A strum: down strokes roll low to high across four strings, up strokes catch the top three. */
function strum(t: number, chord: string, v: number, up = false): void {
  const notes = GUITAR[chord]!.map((n) => midi(n));
  const strings = up ? [3, 2, 1] : [0, 1, 2, 3];
  strings.forEach((s, i) => guitar[s]!.push({ t: t + i * 0.07, d: 2, n: notes[s]!, v: v - i * 0.02 }));
}

const bass: Note[] = [];
const pluck = (t: number, d: number, name: string, v: number) => {
  bass.push({ t, d, n: midi(name), v });
};
for (let bar = 0; bar < THEME_BARS; bar++) {
  const t = bar * BAR;
  const a = HALVES[bar * 2]!;
  const b = HALVES[bar * 2 + 1]!;
  const up = lift(t);
  // The jig strum: DOWN (1) up (3) DOWN (4) up (6), filling in as the band builds; in bar 16 it
  // stops after the downbeat (the break).
  strum(t, a, 0.6 + up);
  if (bar >= 12 && bar < 15) strum(t + 2, a, 0.38 + up, true);
  if (bar < 15) {
    strum(t + 3, b, 0.5 + up);
    if (bar >= 8) strum(t + 5, b, 0.36 + up, true);
  }

  // Bass on the pulse: root, then the fifth (or the next root when the chord changes).
  const second = a === b || (a === "D" && b === "D7") ? BASS[a]![1] : BASS[b]![0];
  pluck(t, 2, BASS[a]![0], 0.78 + up * 0.5);
  if (bar === 7) {
    // Walk up from G to the C of the B section.
    ["G1", "A1", "B1"].forEach((n, i) => pluck(t + 3 + i, 1, n, 0.64 + i * 0.03));
  } else if (bar === 15) {
    // Walk up from D into the trio's G.
    ["D2", "E2", "F#2"].forEach((n, i) => pluck(t + 3 + i, 1, n, 0.66 + i * 0.03));
  } else {
    pluck(t + 3, 2, second, 0.66 + up * 0.5);
  }
}

// ---------------------------------------------------------------- barn-dance groove

const shaker: Note[] = [];
const woodblock: Note[] = [];
const stomp: Note[] = [];
const claps: Note[] = [];
const SHAKE = [0.5, 0.25, 0.33, 0.42, 0.25, 0.33];
for (let t = 0; t <= 90; t++) {
  const bar = Math.floor(t / BAR);
  const inBar = t % BAR;
  shaker.push({ t, d: 1, n: "C4", v: SHAKE[inBar]! - (bar < 4 ? 0.08 : 0) + (bar >= 12 ? 0.04 : 0) });
  // Woodblock clip-clop on the short beat of each DUM-da in B and A''.
  if (bar >= 8 && (inBar === 2 || inBar === 5)) woodblock.push({ t, d: 1, n: "C4", v: inBar === 2 ? 0.46 : 0.52 });
  // Foot stomps on the pulse once the groove is in, both pulses in A''.
  if (bar >= 8 && (inBar === 0 || (bar >= 12 && inBar === 3))) stomp.push({ t, d: 1, n: "C2", v: inBar === 0 ? 0.42 : 0.3 });
  // Claps on the second pulse through A''. Each clap is two hands' worth (two recordings), which
  // also keeps the occasional soft solo clap in the recording set from ever landing alone.
  if (bar >= 12 && inBar === 3) claps.push({ t, d: 1, n: "C4", v: 0.18 }, { t: t + 0.05, d: 1, n: "C4", v: 0.16 });
}

// ================================================================ 17–32: the trio

// Felt in 2, the theme's eighths are swung eighths. The jig's lilt is an even triplet (long-short
// 2:1); the trio plays its offbeat eighths a little earlier (60:40), a lighter swing, except inside
// the tune's triplet runs (bars 4, 8).
const LIGHT = 0.2;
const pulsePos = (t: number) => (((t % 3) + 3) % 3);
const offbeat = (t: number) => Math.abs(pulsePos(t) - 2) < 1e-6;
const sw = (t: number) => (offbeat(t) ? t - LIGHT : t);

/** The tune with the trio's swing: offbeat eighths moved earlier unless they finish a triplet run. */
const swungTune: Note[] = tune.map((n) => {
  const pulse = n.t - pulsePos(n.t);
  const inTriplet = tune.some((o) => Math.abs(o.t - (pulse + 1)) < 1e-6);
  return { ...n, t: offbeat(n.t) && !inTriplet ? n.t - LIGHT : n.t };
});
swungTune.forEach((n, i) => {
  const next = swungTune[i + 1]?.t ?? PASS;
  n.d = next - n.t;
});

// ---------------------------------------------------------------- piano: the tune (17–28)

// Jazz articulation: eighths a little detached, longer notes held nearly full; the pulse notes
// lean in, the in-between eighths lighter. A few long notes are approached by a crushed grace note
// a half step below (a bluesy touch). All in the louder layer, for one even tone.
const GRACES = new Set([0, 24, 48, 60]);
const pianoTune: Note[] = [];
for (const n of swungTune) {
  if (n.t >= 72) break;
  const pulse = Math.abs(pulsePos(n.t)) < 1e-6;
  const v = (pulse ? 0.66 : 0.56) + ((n.v ?? 0.6) - 0.55) * 0.5 + (n.t >= 48 ? 0.03 : 0);
  const d = n.d < 1.5 ? n.d * 0.75 : n.d - 0.3;
  pianoTune.push({ t: TRIO + n.t, d, n: n.n, v });
  if (GRACES.has(n.t)) pianoTune.push({ t: TRIO + n.t - 0.12, d: 0.14, n: (n.n as number) - 1, v: v - 0.08 });
}
// The pickup into the trio: the tune's last two notes of bar 16, taken from the fiddle.
for (const n of tune.filter((o) => o.t >= HANDOFF)) pianoTune.push({ t: n.t, d: n.d * 0.8, n: n.n, v: 0.6 });

// ---------------------------------------------------------------- piano: comping

// Rootless voicings (two of 3rd, 7th, 9th, 11th), between D3 and E4 under the tune in A;
// two-note shells under the sax in A' and B (B2–A3); in A'' the right hand comps above the sax.
const V: Record<string, string[]> = {
  Gmaj9: ["F#3", "A3", "B3"],
  Em9: ["D3", "F#3", "G3"],
  C69: ["E3", "A3", "D4"], // no maj7: B3 would sit a minor ninth under the tune's C5
  D9sus: ["G3", "C4", "E4"],
  D9: ["A3", "C4", "E4"], // no 3rd: the tune's F#4 is the 3rd, and its passing G4 would rub a minor ninth on an F#3
  // shells
  G: ["B2", "F#3"],
  G6: ["B2", "E3"],
  Em: ["D3", "G3"],
  Am: ["C3", "G3"],
  D7: ["C3", "F#3"],
  C: ["E3", "A3"], // C6: a maj7 would sit a minor ninth under the tune's C5
  Bm: ["D3", "A3"],
  // right hand, above the sax
  rG: ["A4", "B4", "E5"],
  rEm: ["B4", "D5", "F#5"],
  rAm: ["A4", "C5", "E5"],
  rD7: ["C5", "E5", "F#5"],
};
/** [position in the bar (eighths, swung), length, velocity, voicing] per trio bar. */
type Hit = [number, number, number, string];
const COMP: Hit[][] = [
  // A (17–20): the hand alone with the tune, Charleston-like pushes into the next bar
  [[0, 1.8, 0.4, "Gmaj9"], [4.8, 1.2, 0.38, "Em9"]],
  [[3, 1, 0.34, "Em9"]],
  [[0, 1.4, 0.39, "C69"], [1.8, 0.9, 0.34, "C69"], [4.8, 1.2, 0.38, "D9sus"]],
  [[3, 0.9, 0.38, "D9"]], // a short stab under the tune's pickup run
  // A' (21–24): shells under the sax
  [[0, 2.4, 0.44, "G"]],
  [[1.8, 1, 0.4, "Em"], [4.8, 1.4, 0.42, "Am"]],
  [[3, 1.6, 0.42, "D7"]],
  [[0, 2.4, 0.42, "G6"], [4.8, 1.4, 0.44, "C"]],
  // B (25–28): shells under the sax's harmony
  [[3, 1.2, 0.4, "C"]],
  [[1.8, 1, 0.42, "D7"], [4.8, 1.4, 0.42, "Bm"]],
  [[3, 1.6, 0.42, "Em"]],
  [[0, 1.6, 0.44, "Am"], [3, 2.2, 0.44, "D7"]], // let go before the horn's G3 enters (a semitone above its F#3)
  // A'' (29–32): right-hand chords above the sax, on the offbeats
  [[1.8, 1, 0.42, "rG"], [4.8, 1, 0.4, "rG"]],
  [[1.8, 1, 0.4, "rEm"], [3, 1.2, 0.4, "rEm"]],
  [[3, 1, 0.42, "rAm"], [4.8, 1, 0.42, "rAm"]], // not on 1.8: the sax passes through B3 there
  [[0, 2.4, 0.44, "rD7"]],
];
const comp: Note[] = [];
COMP.forEach((hits, i) => {
  for (const [pos, d, v, name] of hits) {
    // A hand landing on the keys: the notes roll very slightly, bottom up.
    V[name]!.forEach((n, k) => comp.push({ t: TRIO + i * BAR + pos + k * 0.03, d, n: midi(n), v: v - k * 0.02 }));
  }
});

// ---------------------------------------------------------------- tenor sax

// A' doubles the piano's tune an octave below; B harmonizes a tenth below it; A'' takes the tune
// (an octave below its written pitch, the tenor's warm middle). The reed takes a moment to speak,
// so notes start a touch early; legato, with a breath before each phrase.
const SAX_B: [number, number, string][] = [
  [48, 2, "C4"], [50, 1, "B3"], [51, 2, "A3"], [53, 1, "C4"],
  [54, 2, "B3"], [56, 1, "A3"], [57, 3, "F#3"],
  [60, 2, "B3"], [62, 1, "G3"], [63, 2, "B3"], [65, 1, "E4"],
  [66, 3, "E4"], [69, 2, "C4"], [71, 1, "A3"],
];
const REED = 0.1;
const saxDouble: Note[] = [];
const saxHarmony: Note[] = [];
const saxLead: Note[] = [];
for (const n of swungTune) {
  // In bar 24 the sax leaves the tune's pickup run (D-E-F#) to the piano and breathes before its
  // harmony line: the tenor's low recordings scoop up from ~30 cents flat over their first 0.1 s,
  // which in quick eighths an octave under the piano sounds out of tune.
  const inA1 = n.t >= 24 && n.t < 45;
  const inA3 = n.t >= 72;
  if (!inA1 && !inA3) continue;
  const v = 0.62 + ((n.v ?? 0.6) - 0.55) * 0.6;
  // Phrase ends (bars 24 and 32's held notes) breathe; everything else is legato.
  const d = n.d >= 2.5 ? n.d - 0.4 : n.d - 0.05;
  (inA3 ? saxLead : saxDouble).push({ t: TRIO + n.t - REED, d, n: (n.n as number) - 12, v });
}
// Held until the next (swung) note, like the other sax lines, so one note never overlaps the next.
for (const [t, d, name] of SAX_B) saxHarmony.push({ t: TRIO + sw(t) - REED, d: sw(t + d) - sw(t) - 0.05, n: midi(name), v: 0.62 });

// ---------------------------------------------------------------- bass in 2, then walking

// [bar of the trio (0-based), position, note]. In 2 (half notes, here one per bar, two where the
// chord changes) with a skip note before the next bar's root; walking from B (two per bar, with
// chromatic and stepwise approaches), up D-E-F# into the hoedown's G.
const WALK: [number, number, string][] = [
  [0, 0, "G1"], [0, 4.8, "D2"], [1, 0, "E2"], [2, 0, "C2"], [2, 4.8, "G1"], [3, 0, "D2"], [3, 3, "A1"],
  [4, 0, "G1"], [4, 4.8, "D2"], [5, 0, "E2"], [6, 0, "A1"], [6, 3, "D2"], [7, 0, "G1"], [7, 3, "B1"],
  [8, 0, "C2"], [8, 3, "E2"], [9, 0, "D2"], [9, 3, "C2"], [10, 0, "B1"], [10, 3, "E2"], [11, 0, "A1"], [11, 3, "D2"],
  [12, 0, "G1"], [12, 3, "B1"], [13, 0, "E2"], [13, 3, "B1"], [14, 0, "A1"], [14, 3, "C2"],
  [15, 0, "D2"], [15, 3, "D2"], [15, 4, "E2"], [15, 5, "F#2"],
];
for (const [b, pos, name] of WALK) {
  const skip = pos % 3 !== 0;
  const v = (pos === 0 ? 0.74 : 0.68) - (skip && b < 15 ? 0.06 : 0) + (b >= 8 ? 0.03 : 0);
  pluck(TRIO + b * BAR + pos, 2, name, v);
}

// ---------------------------------------------------------------- drums

// Stick ride: ding (1), ding (the backbeat pulse), -a (the skip, just before the next bar).
// The ride has a firm and a medium stroke (its velocity layers: 0.5 and up plays the firm one,
// ~5 dB louder): firm on the backbeat and on 1 of the first bar of each pair (a lean on 1 of each
// 4/4 bar, harder into B at bar 25), medium on the skips and on the second bar's 1.
/** The skip lands a hair after the piano's offbeats, nearer the triplet, as drummers play it. */
const SKIP = 4.9;
const FIRM = 0.53;
const ride: Note[] = [];
for (let b = 0; b < 16; b++) {
  const s = TRIO + b * BAR;
  ride.push({ t: s, d: 1, n: "D#3", v: b === 8 ? 0.66 : b % 2 === 0 ? FIRM : 0.46 });
  // In bar 32 the sticks leave the ride after the downbeat for the fill.
  if (b < 15) ride.push({ t: s + 3, d: 1, n: "D#3", v: FIRM }, { t: s + SKIP, d: 1, n: "D#3", v: 0.38 });
}
const hat: Note[] = [];
const kick: Note[] = [];
const snare: Note[] = [];
for (let b = 0; b < 16; b++) {
  const s = TRIO + b * BAR;
  // The hi-hat's foot chick on the backbeat pulse (jazz's 2 and 4); feathered kick on both pulses.
  hat.push({ t: s + 3, d: 1, n: "F#2", v: 0.36 });
  kick.push({ t: s, d: 1, n: "C2", v: 0.16 }, { t: s + 3, d: 1, n: "C2", v: 0.1 });
}
// Ghosted snare on the swung offbeats, varying bar to bar; triplet fills into each phrase.
const GHOSTS: number[][] = [[], [4.8], [1.8], [], [4.8], [], [1.8, 4.8], [], [1.8], [4.8], [1.8, 4.8], [], [4.8], [1.8], [1.8, 4.8], []];
GHOSTS.forEach((g, b) => g.forEach((pos) => snare.push({ t: TRIO + b * BAR + pos, d: 1, n: "D2", v: 0.1 })));
for (const b of [3, 7, 11, 15]) [0.09, 0.12, 0.16].forEach((v, i) => snare.push({ t: TRIO + b * BAR + 3 + i, d: 1, n: "D2", v: v + (b === 15 ? 0.02 : 0) }));
// The kick answers the piano's pushes into bars 18, 20, 23 and 25.
for (const b of [0, 2, 5, 7]) kick.push({ t: TRIO + b * BAR + 4.8, d: 1, n: "C2", v: 0.2 });
// The hand-off into the trio: two ghost strokes under the piano's pickup (bar 16).
snare.push({ t: 94, d: 1, n: "D2", v: 0.08 }, { t: 95, d: 1, n: "D2", v: 0.12 });
// A soft crash lifts the B section (bar 25).
const crash: Note[] = [{ t: TRIO + 48, d: 1, n: "C#3", v: 0.3 }];

// The guitar's pickup strum hands back to the hoedown (end of bar 32, on the D7).
strum(LOOP - 1, "D7", 0.42, true);

// ---------------------------------------------------------------- the song

const song: Song = {
  name: "thanksgiving",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: 2 * THEME_BARS,
  reverb: { room: 0.6, damp: 0.7, width: 0.9, level: 0.85 },
  tracks: [
    // hoedown
    ...leveled({ inst: "fiddle", gain: 1, pan: -0.05, reverb: 0.3, lowpass: 3500 }, fiddle),
    ...leveled({ inst: "fiddleShort", gain: 1.15, pan: -0.05, reverb: 0.3, lowpass: 3500 }, spiccato),
    { inst: "harmonica", notes: harmonica, gain: 1, pan: 0.25, reverb: 0.25, lowpass: 2400 },
    ...leveled({ inst: "strumstick", gain: 0.75, pan: 0.4, reverb: 0.3, lowpass: 6000 }, strumstick),
    ...euphoniumTracks({ gain: 2.2, pan: 0.3, reverb: 0.3, humanize: 0.2 }),
    ...leveled({ inst: "horn", gain: 2.6, pan: -0.3, reverb: 0.35, humanize: 0.2 }, hornBand),
    // Each string rings until it is struck again; the break's chord (bar 16) lets go as the trio starts.
    ...guitar.map((notes): Track => ({ inst: "guitar", notes, gain: 0.039, pan: -0.35, reverb: 0.2, humanize: 0.5, choke: true, ring: 1.1, label: "guitar" })),
    // The bass and kicks are high-passed: phones can't play their lowest octave, and it only costs loudness.
    { inst: "bassPizz", notes: bass, gain: 0.42, pan: 0, reverb: 0.1, choke: true, highpass: 60 },
    // Each shake stops at the next (the recording set mixes single shakes with long rolls).
    { inst: "shaker", notes: shaker, gain: 1.05, pan: 0.45, reverb: 0.1, humanize: 0.4, choke: true },
    { inst: "woodblock", notes: woodblock, gain: 1, pan: -0.25, reverb: 0.15 },
    { inst: "kick", notes: stomp, gain: 0.52, pan: 0, reverb: 0.1, highpass: 80, label: "stomp" },
    { inst: "claps", notes: claps, gain: 0.29, pan: 0.1, reverb: 0.25, humanize: 0.5 },
    // trio
    { inst: "piano", notes: pianoTune, gain: 0.18, pan: -0.1, reverb: 0.25, humanize: 0.3 },
    { inst: "piano", notes: comp, gain: 0.1, pan: -0.15, reverb: 0.25, humanize: 0.4 },
    // The sax under the piano in A' (doubling), level with it in B (harmony), out front in A''.
    { inst: "sax", notes: saxDouble, gain: 0.55, pan: 0.2, reverb: 0.3, humanize: 0.2, lowpass: 3500 },
    { inst: "sax", notes: saxHarmony, gain: 0.85, pan: 0.2, reverb: 0.3, humanize: 0.2, lowpass: 3500 },
    { inst: "sax", notes: saxLead, gain: 1, pan: 0.15, reverb: 0.3, humanize: 0.2, lowpass: 3500 },
    ...leveled({ inst: "horn", gain: 3.5, pan: -0.3, reverb: 0.35, humanize: 0.2 }, hornTrio),
    // The kit: a dark ride (its wash carried the trio's whole top end; each stroke rings at most
    // 1.1 s, so bar 32's last one is gone by the hoedown's first beat), the hi-hat's foot chick
    // darkened and up where it reads under the ride, the crash a soft swell into B.
    { inst: "ride", notes: ride, gain: 5.4, pan: 0.3, reverb: 0.15, humanize: 0.3, lowpass: 4500, ring: 1.1 },
    { inst: "hatPedal", notes: hat, gain: 3, pan: 0.35, reverb: 0.1, humanize: 0.3, lowpass: 5000 },
    { inst: "snareOn", notes: snare, gain: 3, pan: 0.05, reverb: 0.15, humanize: 0.3 },
    { inst: "kick", notes: kick, gain: 1.5, pan: 0, reverb: 0.05, humanize: 0.2, highpass: 80 },
    { inst: "crash", notes: crash, gain: 1.1, pan: 0.3, reverb: 0.2, lowpass: 5000 },
  ],
};

export default song;
