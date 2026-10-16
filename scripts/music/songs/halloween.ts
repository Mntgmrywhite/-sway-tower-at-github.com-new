// Halloween: a spooky but playful minor waltz, Danse Macabre style, that turns into a ride. Pass 1
// is the town on Halloween night (Trick 'r Treat); pass 2 is the hollow, where the Headless
// Horseman's hunt gallops in (The Legend of Sleepy Hollow). The theme goes to A minor (minorize,
// keeping the leading tone G# where the tune cadences on the dominant). A harpsichord carries it
// over a pizzicato waltz: contrabass and cellos on the pulse, violas and violins on the off-beats.
// Around them are a comic staccato bassoon, xylophone "bones", a woodblock clock, tubular bells
// tolling the phrase starts and timpani on the dominant.
//
// 32 bars (42.7 s), the theme twice; each B section is sung two octaves down by a low soloist.
// Pass 1 tiptoes through town. A haunted-parlor piano booms low octaves and creeps down
// chromatically in the tune's held notes (bars 1–4, again in 13–16); a sly low tenor sax answers
// "trick-or-TREAT" (two staccato syllables and a held note, bars 6–8); the bassoon grumbles a
// pickup into its B solo (9–12) over a light harpsichord continuo. Pass 2 dances into the hollow:
// the harpsichord rolls spread chords into the phrase starts, the xylophone doubles it, the
// bassoon oom-pahs, and French horn hunting calls (rising long-short-long, like the gallop) answer
// the tune from the woods. At bar 21 the woodblock clock gives way to the Horseman's gallop (toms,
// long-short: the 6/8 canter) and the euphonium enters on ominous open fifths over the bass; the
// gallop builds while the euphonium sings the B section (25–28) under a horn call, and a snare
// roll throws it into the tutti (29–32): clash cymbals and crash, the kick and the buzzy snare on
// the pulses, horn and euphonium on the tune two octaves under the harpsichord. It ends on the
// dominant, so it falls back into the tiptoe at bar 1.
//
// Register plan (the harpsichord tune is E4–C6, mostly C5–A5):
//   xylophone A5–B6 (an octave over the tune) · harpsichord continuo D4–C5
//   pizz violins C4–F4 and violas E3–D4 on the off-beats · horn calls E3–D4, under them
//   sax answers D3–A3 · bassoon and euphonium solos B2–B3, euphonium fifths A2–E3, horn and
//   euphonium tutti tune A2–A3 (the cellos rest wherever these play)
//   piano octaves A1–F3 · pizz bass G#1–G2 · toms tuned to E2 and A2 · kick E1

import { midi } from "../sampler";
import { euphonium, transpose, type Note, type Song } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, minorize, THEME_BARS, THEME_BPM } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** One statement of the theme, in eighths. */
const PASS = THEME_BARS * BAR;
const BARS = THEME_BARS * 2;

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
/** Start of a 1-based bar, in eighths. */
const bar = (b: number): number => (b - 1) * BAR;
/** 1-based bar that time t falls in. */
const barOf = (t: number): number => Math.floor(t / BAR) + 1;
const clampV = (v: number): number => Math.min(0.95, Math.max(0.1, v));

/**
 * The theme in A minor. minorize() flattens every B, but over the dominant (G) the B is the
 * leading tone the tune cadences on, so it stays natural (it becomes G# in A minor).
 */
const theme: Note[] = (() => {
  const major = melody();
  const minor = minorize(major).map((n, i) => {
    const orig = num(major[i]!.n);
    const onDominant = CHORDS[Math.floor(n.t / 3)]![0] === "G";
    return orig % 12 === 11 && onDominant ? { ...n, n: orig } : n;
  });
  return transpose(minor, -3);
})();
/** The theme's notes in bars from..to of either pass (1-based loop bars), shifted by `semis`. */
const tuneIn = (from: number, to: number, semis: number, vel: (v: number) => number): Note[] =>
  theme
    .map((n) => ({ ...n, t: n.t + (from > 16 ? PASS : 0) }))
    .filter((n) => barOf(n.t) >= from && barOf(n.t) <= to)
    .map((n) => ({ ...n, n: num(n.n) + semis, v: vel(n.v ?? 0.7) }));

// ------------------------------------------------------------------ harmony

// Off-beat voicings, kept between E3 and F4 so they sit under the tune (mostly C5 to A5).
const Am = ["A3", "C4", "E4"];
const AmLow = ["E3", "A3", "C4"]; // bar 8: the tune's pickup dips to E4–G4
const Dm = ["A3", "D4", "F4"];
const F = ["A3", "C4", "F4"];
const C = ["G3", "C4", "E4"];
const G = ["G3", "B3", "D4"];
const E = ["G#3", "B3", "E4"];
const E7 = ["G#3", "D4", "E4"]; // the G#–D tritone: the devil's interval, on cue
const Bdim = ["B3", "D4", "F4"];

/**
 * Bass note and off-beat chord per half bar (dotted quarter). The major theme's I, vi, IV, V,
 * ii and iii become i, VI, iv, V(7), iiø and III; bar 6 walks down G–F (VII–VI) to the iv–V–i.
 */
const HALVES: [string, string[]][] = [
  ["A1", Am], ["E2", Am], ["F2", F], ["C2", F], ["D2", Dm], ["A1", Dm], ["E2", E], ["B1", E7], // A
  ["A1", Am], ["E2", Am], ["G2", G], ["F2", F], ["D2", Dm], ["E2", E7], ["A1", Am], ["E2", AmLow], // A'
  ["D2", Dm], ["A1", Dm], ["E2", E], ["B1", E7], ["C2", C], ["F2", F], ["D2", Bdim], ["E2", E7], // B
  ["A1", Am], ["E2", Am], ["F2", F], ["C2", F], ["D2", Dm], ["B1", Bdim], ["E2", E], ["G#1", E7], // A''
];
const half = (t: number) => HALVES[Math.floor((t % PASS) / 3)]!;

// Sections of the 32-bar loop (1-based bars).
const between = (t: number, from: number, to: number) => barOf(t) >= from && barOf(t) <= to;
/** The B sections, sung two octaves down: by the bassoon in pass 1, by the euphonium in pass 2. */
const bassoonSolo = (t: number) => between(t, 9, 12);
const euphSolo = (t: number) => between(t, 25, 28);
const lowSolo = (t: number) => bassoonSolo(t) || euphSolo(t);
/** The pickups into them (the second half of bars 8 and 24), which the soloists play. */
const soloPickup = (t: number) => (barOf(t) === 8 || barOf(t) === 24) && t % BAR >= 3;
/** The piano's "E–F–E" answers (first half of bars 4 and 16), which the pizz off-beats leave alone. */
const pianoNeighbour = (t: number) => (barOf(t) === 4 || barOf(t) === 16) && t % BAR < 3;

// ------------------------------------------------------------------ harpsichord

/**
 * Pass 2 accents the phrase starts and the held dominants the way a harpsichordist does (the
 * instrument has no dynamics): a quick spread chord rolled up into the tune's note, so the tune
 * still lands on the beat with the bass and the xylophone. The spread uses the chord tones within
 * an octave below the note. Neighbour-note ornaments (mordents, trills) don't work with these
 * samples: a one-shot can't be damped when the key is released, so the neighbour would ring on
 * under the main note as a semitone smear (and a trill's upper F would clash with the E7 chord).
 */
const SPREAD_BARS = new Set([17, 19, 20, 21, 23, 29, 31, 32]);
const spreadUnder = (t: number, m: number): number[] => {
  const tones = new Set(half(t)[1].map((c) => num(c) % 12));
  const out: number[] = [];
  for (let k = m - 11; k < m; k++) if (tones.has(k % 12)) out.push(k);
  return out;
};

const lead: Note[] = [];
for (const n of theme) {
  for (const t of [n.t, n.t + PASS]) {
    // The soloists take the B sections and the pickups into them.
    if (lowSolo(t) || soloPickup(t)) continue;
    const m = num(n.n);
    if (t < PASS) {
      // Pass 1: plain, a touch lighter (lightest in the first eight bars).
      lead.push({ t, d: n.d, n: m, v: clampV((n.v ?? 0.7) * (t < bar(9) ? 0.9 : 0.95)) });
      continue;
    }
    const v = clampV((n.v ?? 0.7) * 1.02);
    if (t % BAR === 0 && SPREAD_BARS.has(barOf(t))) {
      const grace = spreadUnder(t, m);
      grace.forEach((g, i) => lead.push({ t: t - (grace.length - i) * 0.1, d: 1, n: g, v: v * 0.6 }));
    }
    lead.push({ t, d: n.d, n: m, v });
  }
}

// Harpsichord continuo under both solos: light off-beat chords, above the soloist. Kept well down
// (a real bassoon outplays a harpsichord): the quill attack is much brighter than the staccato
// bassoon, so above 1 kHz (all a phone speaker plays) louder chords would cover the tune.
const CONTINUO = new Map<string[], string[]>([
  [Dm, ["D4", "F4", "A4"]],
  [E, ["E4", "G#4", "B4"]],
  [E7, ["D4", "E4", "G#4"]],
  [C, ["E4", "G4", "C5"]],
  [F, ["F4", "A4", "C5"]],
  [Bdim, ["D4", "F4", "B4"]],
]);
const continuo: Note[] = [];
for (const from of [9, 25]) {
  for (let t = bar(from); t < bar(from + 4); t += 3) {
    const voicing = CONTINUO.get(half(t)[1])!;
    for (const off of [1, 2]) for (const n of voicing) continuo.push({ t: t + off, d: 1, n, v: off === 1 ? 0.5 : 0.4 });
  }
}

// ------------------------------------------------------------------ xylophone (bones)

// Soft hits (the gentler recorded layer) for the doubling, hard ones only in the final tutti; on
// separate tracks because the two layers differ in level by about 14 dB.
const bones: Note[] = [];
const bonesTutti: Note[] = [];
for (const n of theme) {
  const up = num(n.n) + 12;
  const pulse = n.t % 3 === 0;
  // Pass 2: pulse notes through A and A' (not the pickup the euphonium takes), every note in A''.
  const t = n.t + PASS;
  if (between(t, 17, 24) && pulse && !soloPickup(t)) bones.push({ t, d: n.d, n: up, v: 0.42 });
  if (between(t, 29, 32)) bonesTutti.push({ t, d: n.d, n: up, v: pulse ? 0.66 : 0.56 });
}
// A rattle of bones while the bassoon holds its B (bar 10), down the E7 chord.
["E6", "D6", "B5", "G#5"].forEach((n, i) => bones.push({ t: bar(10) + 4 + i * 0.5, d: 0.5, n, v: i === 0 ? 0.44 : 0.36 }));

// ------------------------------------------------------------------ bassoon (comic staccato)

const bassoon: Note[] = [];
const bsn = (t: number, n: string | number, v = 0.62) => bassoon.push({ t, d: 1, n, v });
// Bar 16: a run down to the dominant, into the dance.
bsn(bar(16) + 3, "E3", 0.66); bsn(bar(16) + 4, "D3", 0.6); bsn(bar(16) + 5, "B2", 0.62);
// Pass 2, bars 17–20: a soft oom-pah an octave over the bass, stepping chromatically into each
// bar: from a semitone below, or from above when that would rub against the chord being played.
// It stops when the Horseman comes (bar 21), where the euphonium takes over its register.
for (let b = 17; b <= 20; b++) {
  const t = bar(b);
  const one = num(half(t)[0]) + 12;
  const two = num(half(t + 3)[0]) + 12;
  const next = num(half(t + BAR)[0]) + 12;
  const rubs = (p: number) => half(t + 3)[1].some((c) => [1, 11].includes((((num(c) - p) % 12) + 12) % 12));
  const below = next - 1;
  bsn(t, one, 0.46);
  bsn(t + 3, two, 0.4);
  if (b < 20) bsn(t + 5, below === two || rubs(below) ? next + 1 : below, 0.38);
}

// Its solo (its own track, so it can stand out as the lead): a grumpy low pickup in bar 8 that
// hops up into the B section, sung two octaves under the harpsichord's register.
const bassoonTune: Note[] = [
  { t: bar(8) + 3, d: 1, n: "E2", v: 0.6 },
  { t: bar(8) + 4, d: 1, n: "F2", v: 0.64 },
  { t: bar(8) + 5, d: 1, n: "G2", v: 0.68 },
  ...tuneIn(9, 12, -24, (v) => Math.min(0.8, v * 1.05)),
];

// ------------------------------------------------------------------ piano (the haunted parlor)

// Low octaves on an upright: a boom on the tonic, then a chromatic creep down F–E–Eb–D into the
// iv while the tune holds its C, and an E–F–E (the Phrygian half step over the dominant) in the
// held E of bars 4 and 16. Pass 1 only: bars 1–4 and 13–16, with the pizz waltz.
const piano: Note[] = [];
const octave = (t: number, low: string, d: number, v: number) => piano.push({ t, d, n: num(low), v }, { t, d, n: num(low) + 12, v: v - 0.02 });
for (const from of [1, 13]) {
  const t = bar(from);
  octave(t, "A1", 6, 0.66);
  octave(t + BAR, "F2", 4, 0.6);
  octave(t + BAR + 4, "E2", 1, 0.56);
  octave(t + BAR + 5, "Eb2", 1, 0.58);
  octave(t + 2 * BAR, "D2", 3, 0.62);
  if (from === 13) octave(t + 2 * BAR + 3, "B1", 3, 0.56);
  octave(t + 3 * BAR, "E2", 1, 0.62);
  octave(t + 3 * BAR + 1, "F2", 1, 0.56);
  octave(t + 3 * BAR + 2, "E2", 1.5, 0.58);
}

// ------------------------------------------------------------------ sax (trick-or-treat)

// A sly low tenor in pass 1's A' answers the tune's held notes "trick-or-TREAT": two staccato
// syllables and a held, vibrato note. First it slinks down E–Eb into D (bar 7, the iv), then
// pops up D–E onto the tonic (bar 8), just before the bassoon's pickup.
const saxTrick: Note[] = [
  { t: bar(6) + 4, d: 1, n: "E3", v: 0.62 },
  { t: bar(6) + 5, d: 1, n: "Eb3", v: 0.58 },
  { t: bar(7) + 4, d: 1, n: "D3", v: 0.58 },
  { t: bar(7) + 5, d: 1, n: "E3", v: 0.62 },
];
const saxTreat: Note[] = [
  { t: bar(7), d: 3, n: "D3", v: 0.62 },
  { t: bar(8), d: 2.6, n: "A3", v: 0.64 },
];

// ------------------------------------------------------------------ horn (the Horseman's hunt)

// Hunting calls in the tune's held notes, rising long-short-long like the gallop: from the woods
// at first (bars 18–20, the softer recorded layer), closer as he comes (bars 22–28, the brassier
// one). Kept to the horn's well-recorded middle (E3–D4); its loud top layer has only two notes.
const call = (t: number, [a, b, c]: [string, string, string], v: number, last = 3): Note[] => [
  { t, d: 2, n: a, v },
  { t: t + 2, d: 1, n: b, v: v - 0.03 },
  { t: t + 3, d: last, n: c, v: v + 0.03 },
];
const hornFar: Note[] = [
  ...call(bar(18) + 3, ["A3", "C4", "D4"], 0.55, 5), // F into Dm
  ...call(bar(20), ["E3", "G#3", "B3"], 0.56), // up the dominant
];
const hornCalls: Note[] = [
  ...call(bar(22) + 3, ["A3", "C4", "D4"], 0.58),
  ...call(bar(24), ["E3", "A3", "C4"], 0.6), // over the euphonium's pickup
  ...call(bar(26) + 3, ["G#3", "B3", "C4"], 0.56), // over its held B, into C
  // Bar 28: the 7th of E7, swelling into the tutti.
  { t: bar(28), d: 3, n: "D4", v: 0.52 },
  { t: bar(28) + 3, d: 3, n: "D4", v: 0.62 },
];
// The tutti: the tune two octaves under the harpsichord, in unison with the euphonium.
const hornTune = tuneIn(29, 32, -24, (v) => Math.min(0.72, v * 0.9));

// ------------------------------------------------------------------ euphonium (low brass)

// Ominous open fifths over the bass as the gallop starts (bars 21–24), its own pickup a step under
// the solo, the B section (25–28) as the Horseman rides, then the tune with the horn in the tutti.
const euphLine: Note[] = [
  { t: bar(21), d: 6, n: "E3", v: 0.46 },
  { t: bar(22), d: 3, n: "D3", v: 0.48 },
  { t: bar(22) + 3, d: 3, n: "C3", v: 0.5 },
  { t: bar(23), d: 3, n: "A2", v: 0.52 },
  { t: bar(23) + 3, d: 3, n: "B2", v: 0.54 },
  { t: bar(24), d: 3, n: "C3", v: 0.56 },
  { t: bar(24) + 3, d: 1, n: "E3", v: 0.56 },
  { t: bar(24) + 4, d: 1, n: "F3", v: 0.58 },
  { t: bar(24) + 5, d: 1, n: "G3", v: 0.6 },
];
const euphTune = tuneIn(25, 28, -24, (v) => Math.min(0.64, v * 0.9));
const euphTutti = tuneIn(29, 32, -24, (v) => Math.min(0.64, v * 0.85));

// ------------------------------------------------------------------ pizzicato waltz

const bass: Note[] = [];
const cellos: Note[] = [];
const violas: Note[] = [];
const violins: Note[] = [];
for (let t = 0; t < BARS * BAR; t += 3) {
  const [b, chord] = half(t);
  const first = t % BAR === 0;
  const pass2 = t >= PASS;
  // Contrabass on every pulse; cellos double it an octave up except where the bassoon solo, the
  // oom-pah and the low brass take that register (bars 9–12 and 17–32). The bass drops out
  // under the bassoon's pickup (bar 8), which plays the E itself: a pizz E2 still ringing under
  // its F2 would beat as a semitone in the lowest octave.
  if (!(soloPickup(t) && !pass2)) bass.push({ t, d: 3, n: b, v: first ? 0.84 : 0.72 });
  if (!bassoonSolo(t) && t < bar(17)) cellos.push({ t, d: 3, n: num(b) + 12, v: first ? 0.64 : 0.56 });
  if (lowSolo(t) || soloPickup(t) || pianoNeighbour(t)) continue;
  // "Pah-pah": violas take the lower two notes, violins (from bar 5) the top one.
  const lift = pass2 ? 1 : between(t, 1, 4) ? 0.9 : 0.95;
  for (const off of [1, 2]) {
    const v = (off === 1 ? 0.62 : 0.42) * lift;
    violas.push({ t: t + off, d: 1, n: chord[0]!, v }, { t: t + off, d: 1, n: chord[1]!, v });
    if (t >= bar(5)) violins.push({ t: t + off, d: 1, n: chord[2]!, v });
  }
}

// ------------------------------------------------------------------ bells, timpani, woodblock

// Tubular bells toll the tonic at the top of each pass (struck hard) and the iv at each B
// section (struck softly: a mellower recording, on its own track to set its level).
// Velocities avoid 0.5–0.75, where the only recorded bell is a C4.
const bells: Note[] = [
  { t: bar(1), d: 6, n: "A4", v: 0.85 },
  { t: bar(17), d: 6, n: "A4", v: 0.88 },
];
const softBells: Note[] = [
  { t: bar(9), d: 6, n: "D5", v: 0.42 },
  { t: bar(25), d: 6, n: "D5", v: 0.42 },
];

// Timpani accents on the dominant only. The recorded drums are tuned to odd pitches and the
// sampler rotates through them (two takes each), but the loud layer's four drums (v >= 0.67;
// kept at 0.72 and up so humanizing can't drop a hit into a softer layer), played 2.56
// semitones down, land on G#, B, D and E (measured principal tones: +25, +4, +2 and +20 cents):
// the notes of E7, whichever drum comes up.
const TIMPANI = num("C3") - 2.56;
const timpani: Note[] = [bar(4) + 3, bar(12) + 3, bar(16), bar(16) + 3, bar(20) + 3, bar(28) + 3, bar(32), bar(32) + 3].map((t) => ({
  t,
  d: 3,
  n: TIMPANI,
  v: barOf(t) === 16 || barOf(t) === 32 ? 0.9 : 0.78,
}));

// The woodblock is a clock: a low tock on the bar, a tick on the second pulse; pass 2 adds ghost
// ticks before each pulse so the skeletons skip. It stops when the gallop takes over (bar 25).
const woodblock: Note[] = [];
for (let t = 0; t < bar(25); t++) {
  const inBar = t % BAR;
  if (inBar === 0) woodblock.push({ t, d: 1, n: "G3", v: 0.5 });
  if (inBar === 3) woodblock.push({ t, d: 1, n: "C4", v: 0.44 });
  if (t >= PASS && inBar % 3 === 2) woodblock.push({ t, d: 1, n: "D4", v: 0.12 });
}

// ------------------------------------------------------------------ drums (the Horseman's gallop)

// 6/8 as a canter, long-short: the low tom on each pulse, the high tom on the short eighth before
// the next. Toms are pitched, so they are tuned per recorded layer (measured): the low tom to E2
// (its layers ring at 89.2, 90.6 and 91.6 Hz), the high tom to A2 (106.4, 108.8 and 109.9 Hz).
// Bars 21–22: distant hoofbeats; 23–28: closer and louder, the kick joining on the pulse (its
// middle layer rings on E1); bar 28: a snare roll into the tutti, where the buzzy snare takes the
// second pulse and the clash cymbals and crash mark bar 29. The last hit is the dominant on bar
// 32's second pulse; the tiptoe at bar 1 comes in on its own.
const tomLowNote = (v: number) => num("F2") - (v < 0.33 ? 1.37 : v < 0.67 ? 1.64 : 1.83);
const tomHighNote = (v: number) => num("A2") + (v < 0.33 ? 0.57 : v < 0.67 ? 0.19 : 0.02);
const kick: Note[] = [];
const tomLow: Note[] = [];
const tomHigh: Note[] = [];
const snare: Note[] = [];
const roll: Note[] = [];
const cymbals: Note[] = [{ t: bar(29), d: 6, n: "C#3", v: 0.85 }];
const crash: Note[] = [
  { t: bar(29), d: 6, n: "C#3", v: 0.8 },
  { t: bar(31), d: 6, n: "C#3", v: 0.55 },
];
// Per bar: [low tom, high tom, kick] velocities (0 = silent) through the build.
const BUILD: Record<number, [number, number, number]> = {
  21: [0.22, 0, 0],
  22: [0.26, 0.24, 0],
  23: [0.4, 0.38, 0.3],
  24: [0.44, 0.42, 0.36],
  25: [0.5, 0.46, 0.56],
  26: [0.54, 0.5, 0.58],
  27: [0.58, 0.54, 0.6],
  28: [0.62, 0.58, 0.62],
};
const hit = (track: Note[], t: number, n: number | string, v: number) => track.push({ t, d: 1, n, v });
for (let b = 21; b <= 32; b++) {
  const t = bar(b);
  if (b <= 28) {
    const [lo, hi, k] = BUILD[b]!;
    for (const p of [0, 3]) hit(tomLow, t + p, tomLowNote(lo), lo - (p ? 0.02 : 0));
    if (hi) for (const p of [2, 5]) hit(tomHigh, t + p, tomHighNote(hi), hi - (p === 2 ? 0.02 : 0));
    if (k) {
      hit(kick, t, "C2", k);
      if (b >= 27) hit(kick, t + 3, "C2", k - 0.04);
    }
    continue;
  }
  // The tutti: kick on both pulses, snare on the second, the gallop's shorts on the high tom.
  const last = b === 32;
  hit(kick, t, "C2", 0.66);
  hit(kick, t + 3, "C2", 0.62);
  hit(tomLow, t, tomLowNote(0.7), 0.7);
  hit(tomLow, t + 3, tomLowNote(0.68), 0.68);
  hit(tomHigh, t + 2, tomHighNote(0.68), 0.68);
  hit(snare, t + 3, "D2", last ? 0.7 : 0.62);
  if (!last) hit(tomHigh, t + 5, tomHighNote(0.7), 0.7);
}
// The roll: a mid-level roll through bar 28 and a louder one over its second half (a crescendo).
roll.push({ t: bar(28), d: 6, n: "D2", v: 0.5 }, { t: bar(28) + 3, d: 3, n: "D2", v: 0.72 });

const song: Song = {
  name: "halloween",
  bpm: THEME_BPM,
  beatsPerBar: BAR,
  bars: BARS,
  reverb: { room: 0.8, damp: 0.6, width: 1, level: 0.95 },
  tracks: [
    // The quill attack is the brightest thing in the mix: a low-pass takes its edge off.
    { inst: "harpsichord", notes: lead, gain: 1, pan: -0.08, reverb: 0.36, humanize: 0.25, lowpass: 5500 },
    { inst: "harpsichord", notes: continuo, gain: 0.2, pan: -0.15, reverb: 0.36, lowpass: 5500 },
    { inst: "xylophone", notes: bones, gain: 1.3, pan: 0.3, reverb: 0.32 },
    { inst: "xylophone", notes: bonesTutti, gain: 0.28, pan: 0.3, reverb: 0.32 },
    { inst: "piano", notes: piano, gain: 0.36, pan: -0.15, reverb: 0.3 },
    { inst: "saxShort", notes: saxTrick, gain: 1.3, pan: 0.2, reverb: 0.25, lowpass: 4500 },
    { inst: "sax", notes: saxTreat, gain: 1.6, pan: 0.2, reverb: 0.25, lowpass: 4500 },
    { inst: "bassoonShort", notes: bassoon, gain: 0.65, pan: 0.05, reverb: 0.25 },
    { inst: "bassoonShort", notes: bassoonTune, gain: 1.1, pan: 0.05, reverb: 0.25 },
    { inst: "horn", notes: hornFar, gain: 1.2, pan: -0.45, reverb: 0.55, humanize: 0.15 },
    { inst: "horn", notes: hornCalls, gain: 1.2, pan: -0.25, reverb: 0.4, humanize: 0.15 },
    { inst: "horn", notes: hornTune, gain: 1.6, pan: -0.2, reverb: 0.3, humanize: 0.15 },
    ...euphonium([...euphLine, ...euphTune], { gain: 3.5, pan: 0.15, reverb: 0.28, humanize: 0.15 }),
    ...euphonium(euphTutti, { gain: 4, pan: 0.15, reverb: 0.28, humanize: 0.15 }),
    { inst: "bassPizz", notes: bass, gain: 0.62, pan: 0.1, reverb: 0.12 },
    { inst: "cellosPizz", notes: cellos, gain: 0.4, pan: 0.3, reverb: 0.2 },
    { inst: "violasPizz", notes: violas, gain: 0.3, pan: 0.2, reverb: 0.3, humanize: 0.4 },
    { inst: "violinsPizz", notes: violins, gain: 0.6, pan: -0.35, reverb: 0.3, humanize: 0.4 },
    { inst: "tubularBells", notes: bells, gain: 0.16, pan: -0.25, reverb: 0.45 },
    { inst: "tubularBells", notes: softBells, gain: 0.75, pan: -0.25, reverb: 0.45 },
    { inst: "timpani", notes: timpani, gain: 0.62, pan: -0.05, reverb: 0.25 },
    { inst: "woodblock", notes: woodblock, gain: 0.55, pan: 0.25, reverb: 0.18 },
    { inst: "tomLow", notes: tomLow, gain: 1.1, pan: -0.15, reverb: 0.2, humanize: 0.2 },
    { inst: "tomHigh", notes: tomHigh, gain: 1, pan: 0.2, reverb: 0.2, humanize: 0.2 },
    { inst: "kick", notes: kick, gain: 0.3, pan: 0, reverb: 0.1, humanize: 0.2 },
    { inst: "snareRoll", notes: roll, gain: 0.5, pan: 0.05, reverb: 0.2 },
    { inst: "snareOn", notes: snare, gain: 1.1, pan: 0.05, reverb: 0.2, humanize: 0.2 },
    { inst: "cymbals", notes: cymbals, gain: 0.6, pan: -0.1, reverb: 0.35 },
    { inst: "crash", notes: crash, gain: 0.6, pan: 0.3, reverb: 0.3 },
  ],
};

export default song;
