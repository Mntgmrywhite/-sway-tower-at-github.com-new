// New Year's: a 1920s hot dance band playing a swinging jazz waltz at the countdown party.
//
// The 6/8 theme is stretched into 3/4: every eighth becomes a quarter, so each dotted-quarter
// pulse of the tune becomes one waltz bar (32 bars a chorus, one chord per bar, the jazz-waltz
// norm). The loop is two choruses (64 bars), so the band can pass the tune around: muted trumpet,
// piano, then the sax section. It's in Eb, which puts the tune (Bb3–G5) in the harmon-muted
// trumpet's and the soprano sax's sweet spot. Harmony is the theme's, coloured for jazz: maj7/6
// on I, m7/m9 on vi and ii, maj7(13)/6 on IV, the V bars as Bb9sus -> Bb7/Bb9, plus one
// secondary dominant (C9 -> Fm7) in bar 12 of each chorus.
//
// Form (bars):
//   Chorus 1   1–8   A    muted trumpet lead; stride piano (bass note on 1, chord on 2 and 3), the
//                         bass in two, closed hi-hat time and a cross-stick on 3. The sax section
//                         (soprano + tenor, staccato) answers the trumpet's held note in bar 4.
//              9–16  A'   the bass starts walking; the saxes answer again in bar 12
//             17–24  B    ride cymbal; brass (trombones + open trumpets) and saxes kick the held notes
//             25–28  A''  (first four bars)
//             29–32       piano break: one stop-time hit, then the piano alone (the tune's last
//                         phrase in octaves over a stride left hand, a triplet run), the drummer's
//                         pickup into...
//   Chorus 2  33–48  A A' SAX SOLI: soprano sax on the tune, tenor sax a third under it (a sixth or
//                         a fourth where the chord asks), the brass answering under the held notes
//             49–56  B    muted trumpet back; the tenor saxes hold guide-tone pads under it
//             57–60  A''  everyone: trumpet lead, soprano and tenor in close harmony under it, crash
//             61–64       countdown 4-3-2-1: claps on 2 and 3, a hit on every downbeat with a crash,
//                         a tom fill into the "Happy New Year" hit (crash + clash cymbals) on bar 1.
//
// Register plan (so the parts don't fight): bass pizz F1–C3; piano "oom" Eb2–D3 and chords C3–F4
// (only the lowest two notes while the saxes hold harmony); trombone hits D3–C4, trumpet hits C4–G4,
// sax stabs Eb4–D5, all voiced under the lead (top note at most doubling it) except the bar-1 hit;
// tenor sax Eb3–Eb5 in the soli, G3–Eb4 in the pads; lead Bb3–G5 (muted trumpet, soprano sax, piano
// right hand Ab4–Bb5 in the break).

import { midi } from "../sampler";
import type { Note, Song, Track } from "../song";
import { melody } from "../theme";

const BEATS = 3; // 3/4, counted in quarter notes
const CHORUS = 32; // bars: the theme once through
const BARS = 2 * CHORUS;
// 64 bars x 3 beats at 216 bpm = 53.33 s = exactly 2,560,000 frames at 48 kHz.
const BPM = 216;
const KEY = -9; // C -> Eb (down a major 6th)

const num = (n: string | number): number => (typeof n === "number" ? n : midi(n));
const bar = (b: number) => (b - 1) * BEATS; // start beat of bar b (1-based)
const barAt = (t: number) => Math.floor(t / BEATS + 1e-9) + 1;
/** The bar's place in its chorus (1..32), to index the theme's harmony. */
const inChorus = (b: number) => ((b - 1) % CHORUS) + 1;
const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;

// Swung eighths: the renderer pushes notes that sit exactly on an "&" later by SWING / 2 beats.
const SWING = 0.3; // offbeat eighths land at ~0.65 of the beat (medium-up jazz swing)
/**
 * Where a note at `t` actually lands once swung. Chords that are rolled or spread by a few ms
 * must be swung here first: the renderer only swings notes exactly on the "&", so otherwise only
 * the chord's first note would move and the rest would sound ~40 ms early.
 */
const swung = (t: number) => (Math.abs((t % 1) - 0.5) < 1e-6 ? t + SWING / 2 : t);

/**
 * Split one part into several tracks that differ only in gain, so each note can get its own
 * level (the sampler has no per-note gain). Used to even out recordings whose zones were
 * captured at very different levels, and for dynamics that must not change velocity layer
 * (the lead's build, the brass hits).
 */
function byGain(base: Omit<Track, "notes" | "gain">, notes: Note[], gainOf: (n: Note) => number): Track[] {
  const groups = new Map<number, Note[]>();
  for (const n of notes) {
    const g = Math.round(gainOf(n) * 1000) / 1000;
    groups.set(g, [...(groups.get(g) ?? []), n]);
  }
  return [...groups].map(([gain, ns]) => ({ ...base, gain, notes: ns }));
}
const dB = (x: number) => 10 ** (x / 20);

/**
 * The form's energy, 0..1, at beat t: chorus 1 builds from a calm A to its B and last A; the
 * piano break drops back; the sax soli and the trumpet's B build again; the countdown tops it.
 */
function energy(t: number): number {
  const b = barAt(t);
  if (b >= 61) return 1;
  if (b >= 57) return 0.85;
  if (b >= 49) return 0.6 + (0.2 * (b - 49)) / 7;
  if (b >= 33) return 0.5;
  if (b >= 29) return 0.35;
  if (b >= 25) return 0.5;
  if (b >= 17) return 0.2 + (0.3 * (b - 17)) / 7;
  return b >= 9 ? 0.15 : 0;
}
/** The form's build as a gain (0..maxDb), in whole-dB terraces so byGain makes few tracks. */
const buildDb = (t: number, maxDb: number) => Math.round(maxDb * energy(t));

// ---------------------------------------------------------------- harmony (one chord per bar)

// Piano voicings: rootless shells (3rd + 7th, or 7th + 3rd), sometimes a 9th/13th/6th on top,
// kept between C3 and F4 so they sit under the trumpet and clear of the bass.
const PIANO: string[][] = [
  ["G3", "D4"], // 1  Ebmaj7
  ["G3", "C4", "F4"], // 2  Eb6/9 (no 7th under the tune's Eb5)
  ["Eb3", "Bb3", "D4"], // 3  Cm9
  ["Eb3", "Bb3", "D4"], // 4  Cm9
  ["F3", "C4", "Eb4"], // 5  Ab6 (no G under the tune's Ab4)
  ["G3", "C4", "F4"], // 6  Abmaj7(13)
  ["Eb3", "Ab3", "C4"], // 7  Bb9sus
  ["D3", "Ab3"], // 8  Bb7 (low: the tune dips to D4 here)
  ["G3", "C4"], // 9  Eb6 (no maj7 D4: it would sit a b9 under the Eb5 pushed into bar 10)
  ["G3", "C4", "F4"], // 10 Eb6/9
  ["Eb3", "Bb3", "F4"], // 11 Cm11
  ["E3", "Bb3", "D4"], // 12 C9 (V of ii)
  ["Eb3", "Ab3", "C4"], // 13 Fm7
  ["D3", "Ab3", "C4"], // 14 Bb9
  ["G3", "Bb3", "C4"], // 15 Eb6 (tune on Eb4)
  ["C3", "G3"], // 16 Eb6 (tune on Bb3–D4)
  ["G3", "C4", "F4"], // 17 Abmaj7(13)
  ["F3", "C4", "Eb4"], // 18 Ab6
  ["Eb3", "Ab3", "C4"], // 19 Bb9sus
  ["D3", "Ab3"], // 20 Bb7
  ["F3", "Bb3", "D4"], // 21 Gm7
  ["Eb3", "Bb3", "D4"], // 22 Cm9
  ["Eb3", "Ab3", "C4"], // 23 Fm7
  ["D3", "Ab3", "C4"], // 24 Bb9
  ["D3", "G3", "C4"], // 25 Ebmaj7(13)
  ["G3", "C4", "F4"], // 26 Eb6/9
  ["Eb3", "Bb3", "D4"], // 27 Cm9
  ["Eb3", "Bb3"], // 28 Cm7 (tune on G4/Eb4)
  ["Eb3", "Ab3", "C4"], // 29 Fm7      countdown "4"
  ["Eb3", "Ab3", "C4"], // 30 Fm7      "3"
  ["Eb3", "Ab3", "C4"], // 31 Bb9sus   "2"
  ["D3", "Ab3", "C4"], // 32 Bb9      "1"
];

/** Each bar's chord as pitch classes (the voicing's colour tones included), for the sax harmony. */
const CHORD_TONES: string[] = [
  "Eb G Bb D", "Eb G Bb C F", "C Eb G Bb D", "C Eb G Bb D", "Ab C Eb F", "Ab C Eb G F", "Bb Eb F Ab C", "Bb D F Ab",
  "Eb G Bb C", "Eb G Bb C F", "C Eb G Bb D F", "C E G Bb D", "F Ab C Eb", "Bb D F Ab C", "Eb G Bb C", "Eb G Bb C",
  "Ab C Eb G F", "Ab C Eb F", "Bb Eb F Ab C", "Bb D F Ab", "G Bb D F", "C Eb G Bb D", "F Ab C Eb", "Bb D F Ab C",
  "Eb G Bb D C", "Eb G Bb C F", "C Eb G Bb D", "C Eb G Bb", "F Ab C Eb", "F Ab C Eb", "Bb Eb F Ab C", "Bb D F Ab C",
];
const TONES = CHORD_TONES.map((s) => s.split(" ").map((n) => pc(midi(`${n}4`))));
const ROOTS = CHORD_TONES.map((s) => s.split(" ")[0]!);
/** Eb major, with bar 12's E natural (its C9 is V of ii). */
const scaleOf = (h: number) => (h === 12 ? [3, 5, 7, 8, 10, 0, 2, 4].filter((p) => p !== 3) : [3, 5, 7, 8, 10, 0, 2]);

/**
 * The harmony note under a melody note: a chord tone a third below, or where the chord has no
 * third there a sixth (two-part soli) or a fourth (`close`, for three-part close harmony),
 * choosing the one nearest the last harmony note so the line moves smoothly; a passing note
 * gets the scale's third below.
 */
function under(m: number, b: number, prev: number | undefined, close: boolean): number {
  const h = inChorus(b);
  const tones = TONES[h - 1]!;
  if (tones.includes(pc(m))) {
    const cost: [number, number][] = close ? [[3, 0], [4, 0], [5, 0.5], [8, 1.5], [9, 1.5]] : [[3, 0], [4, 0], [8, 1], [9, 1], [5, 1.75]];
    let best: number | undefined;
    let bestCost = Infinity;
    for (const [i, c] of cost) {
      if (!tones.includes(pc(m - i))) continue;
      const k = c + (prev === undefined ? 0 : 0.1 * Math.abs(m - i - prev));
      if (k < bestCost) {
        bestCost = k;
        best = m - i;
      }
    }
    if (best !== undefined) return best;
  }
  const scale = scaleOf(h);
  return scale.includes(pc(m - 3)) ? m - 3 : m - 4;
}
/** A harmony line under `line` (same rhythm), from the notes' bars before any push. */
function harmonize(line: Note[], close = false): Note[] {
  let prev: number | undefined;
  return line.map((n) => {
    const m = under(num(n.n), barAt(n.t), prev, close);
    prev = m;
    return { ...n, n: m };
  });
}

// Walking bass, three quarters a bar: root on the downbeat, chord tones and passing notes,
// and the last beat leading by step (or from the 5th) into the next bar's root.
const WALK: string[][] = [
  ["Eb2", "F2", "G2"], ["Bb2", "G2", "D2"], ["C2", "Eb2", "G2"], ["Bb2", "G2", "Eb2"],
  ["Ab2", "Eb2", "C2"], ["Ab1", "C2", "F2"], ["Bb1", "Eb2", "F2"], ["Bb1", "C2", "D2"],
  ["Eb2", "G2", "Bb2"], ["G2", "Eb2", "D2"], ["C2", "G1", "Bb1"], ["C2", "E2", "G2"],
  ["F2", "Eb2", "C2"], ["Bb1", "D2", "F2"], ["Eb2", "G2", "Bb2"], ["C3", "Bb2", "G2"],
  ["Ab2", "Eb2", "C2"], ["Ab1", "Eb2", "C2"], ["Bb1", "Eb2", "F2"], ["Bb1", "D2", "F2"],
  // (bar 24 approaches from the 5th, F2: a D2 would sit a b9 under the band's push on &3)
  ["G2", "F2", "D2"], ["C2", "G2", "Eb2"], ["F2", "Ab2", "C3"], ["Bb2", "Ab2", "F2"],
  ["Eb2", "G2", "Bb2"], ["G2", "Eb2", "D2"], ["C2", "Eb2", "G2"], ["Bb2", "G2", "C2"],
  ["F1", "Ab1", "C2"], ["F2", "Eb2", "C2"], ["Bb1", "Eb2", "F2"], ["Bb1", "C2", "D2"],
];

// ---------------------------------------------------------------- the tune

/**
 * The theme's bars `from`..`to - 1` (3/4 bars of a chorus), placed at bar `atBar`. Eighths become
 * quarters, so t and d carry over unchanged as beats. Jazz articulation: quarters a little
 * detached, half notes held; the dotted halves are let go a little early, which is where the
 * player breathes while the band answers. v carries the accent (0 = plain, ~0.23 = strongest).
 */
function tune(from: number, to: number, atBar: number, lens: [number, number, number]): Note[] {
  const shift = bar(atBar) - bar(from);
  return melody()
    .filter((n) => n.t >= bar(from) && n.t < bar(to))
    .map((n) => ({ t: n.t + shift, d: n.d === 1 ? lens[0] : n.d === 2 ? lens[1] : lens[2], n: num(n.n) + KEY, v: (n.v ?? 0.55) - 0.55 }));
}

/** Jazz phrasing: play the note at `t` an eighth early (swung), clipping the note before it. */
function push(line: Note[], t: number): void {
  const target = line.find((n) => n.t === t);
  const before = line.find((n) => n.t < t && n.t + n.d > t - 1.01 && n !== target);
  if (!target) throw new Error(`no note at ${t}`);
  if (before) before.d = Math.min(before.d, t - 0.5 - before.t - 0.05);
  target.t = t - 0.5;
  target.d += 0.5;
  target.v = (target.v ?? 0) + 0.05;
}

// ---------------------------------------------------------------- lead: harmon-muted trumpet

const TRUMPET_LENS: [number, number, number] = [0.8, 1.8, 2.4];
// Chorus 1 up to the piano break, chorus 2 from the B (after the sax soli).
const trumpetC1 = tune(1, 29, 1, TRUMPET_LENS);
const trumpetC2 = tune(17, 33, 49, TRUMPET_LENS);
// The last A's ensemble: soprano sax in close harmony under the trumpet, tenor under that.
const tuttiTrumpet = trumpetC2.filter((n) => n.t >= bar(57));
const tuttiSoprano = harmonize(tuttiTrumpet, true);
const tuttiTenor = harmonize(tuttiSoprano, true);
push(trumpetC1, bar(10)); // A': Eb5 anticipated
push(trumpetC1, bar(22)); // B: C5 anticipated
push(trumpetC1, bar(25)); // into the last A, with the whole band
push(trumpetC2, bar(54));
for (const line of [trumpetC2, tuttiSoprano, tuttiTenor]) push(line, bar(57));

// The harmon-mute set has a soft and a loud take of each note. From Bb4 up the loud takes are
// piercing (spectral centroid 4.4–5 kHz), so the tune's upper half uses the soft takes
// (centroid ~2.5 kHz, the classic intimate harmon sound) and its lower half the loud ones
// (their soft takes are dull and slow to speak). That keeps the tone even across the range.
// Velocity only picks the take and shapes the accents (soft takes stay well under 0.5, the layer
// split, even after humanizing); the build through the form is done in gain (see the tracks).
const SOFT_FROM = midi("Bb4");
const lead: Note[] = [...trumpetC1, ...trumpetC2].map((n) => {
  const a = n.v ?? 0;
  const v = num(n.n) >= SOFT_FROM ? Math.min(0.46, 0.34 + a * 0.4) : 0.6 + a * 0.75;
  return { ...n, v };
});
/**
 * Gain per recording (dB) so the line is even, with a natural gentle rise to the top: the
 * recordings' own levels differ by up to 14 dB (A-weighted), soft takes being much quieter.
 * Set by measuring each rendered note over its own length.
 */
function leadGainDb(m: number): number {
  if (m <= 59) return 4; // Bb3, loud take
  if (m <= 61) return 1.5; // C4, loud
  if (m <= 65) return 1.2; // Eb4 (D4–F4), loud
  if (m <= 69) return -1.3; // Ab4 (G4–A4), loud
  if (m <= 72) return 11.5; // Bb4 (Bb4–C5), soft
  if (m <= 75) return 7.5; // D5 (C#5–Eb5), soft
  return 5; // F5 and up, soft
}

// ---------------------------------------------------------------- the sax section

// Soli (chorus 2, A and A'): soprano sax on the tune, tenor sax in close harmony under it. A sax
// section phrases a touch more legato than the muted trumpet.
const SAX_LENS: [number, number, number] = [0.85, 1.85, 2.5];
const soliSoprano = tune(1, 17, 33, SAX_LENS);
const soliTenor = harmonize(soliSoprano);
for (const line of [soliSoprano, soliTenor]) push(line, bar(42));

// Pads (chorus 2, B): two tenors on each chord's guide tones (3rd and 7th), voice-led, under the
// trumpet's lowest note (F4) and above the bass.
const PADS: [string, string][] = [
  ["C4", "G3"], ["C4", "F3"], ["Eb4", "Ab3"], ["D4", "Ab3"], // Abmaj7 Ab6 Bb9sus Bb7
  ["D4", "Bb3"], ["Eb4", "Bb3"], ["Eb4", "Ab3"], ["D4", "Ab3"], // Gm7 Cm9 Fm7 Bb9
];
const pads: Note[] = PADS.flatMap(([hi, lo], i) => [hi, lo].map((n) => ({ t: bar(49 + i), d: 2.85, n, v: 0.45 + 0.1 * energy(bar(49 + i)) })));

// Answers (chorus 1): the section's reply under the trumpet's held notes, staccato, in sixths and
// thirds. [beat, soprano, tenor]
const ANSWERS: [number, string, string][] = [
  [bar(4) + 1, "Bb4", "D4"], [bar(4) + 1.5, "C5", "Eb4"], [bar(4) + 2, "Eb5", "G4"], // Cm9 under G4
  [bar(12) + 1, "E5", "C5"], [bar(12) + 1.5, "D5", "Bb4"], [bar(12) + 2, "Bb4", "G4"], // C9 under C5
];

// ---------------------------------------------------------------- brass (and sax) section kicks

interface Hit {
  t: number;
  tbn: string[];
  tpt?: string[];
  /** Sax stab: [soprano, tenor]. */
  sax?: [string, string];
  /** Level in dB (0 = an ordinary kick under a held note). */
  db: number;
  /** Use the trombones' fortissimo take (the "Happy New Year" hit only). */
  ff?: boolean;
}
// Every hit is voiced under the lead (its top note at most doubles the lead's note), so the
// open, brighter trumpets never take the tune over. Only the bar-1 hit puts the saxes on top.
const CM9 = { tbn: ["Eb3", "Bb3"], tpt: ["D4", "G4"] };
const SUS = { tbn: ["Eb3", "Ab3"], tpt: ["C4", "F4"] }; // Bb9sus
const BB9 = { tbn: ["D3", "Ab3"], tpt: ["C4", "F4"] };
const TBN_EB6 = ["Eb3", "G3", "C4"];
const HITS: Hit[] = [
  // "Happy New Year!": lands on bar 1 after the countdown, the trumpets doubling the tune's G4.
  { t: 0, tbn: ["Eb3", "Bb3"], tpt: ["D4", "G4"], sax: ["D5", "Bb4"], db: 6, ff: true },
  { t: bar(7) + 1, ...SUS, db: -1.5 }, // under the held Bb4
  { t: bar(7) + 2, ...SUS, db: -1 },
  { t: bar(15) + 1, tbn: TBN_EB6, db: -2 }, // trombones only under the low Eb4
  { t: bar(15) + 2, tbn: TBN_EB6, db: -1.5 },
  // B builds: the section answers under each held note.
  { t: bar(17) + 1.5, tbn: TBN_EB6, sax: ["G4", "Eb4"], db: -0.5 }, // Abmaj7 under C5
  { t: bar(20) + 1, ...BB9, db: 0 }, // Bb9 with the held F4
  { t: bar(20) + 2, ...BB9, db: 0.5 },
  { t: bar(21) + 1.5, tbn: ["F3", "Bb3"], tpt: ["D4", "F4"], db: 0 }, // Gm7 under Bb4
  { t: bar(23) + 1.5, tbn: ["Eb3", "Ab3"], tpt: ["C4", "G4"], sax: ["C5", "Eb4"], db: 0.5 }, // Fm9 under F5
  { t: bar(24) + 2.5, tbn: ["Eb3", "Bb3"], tpt: ["D4", "F4"], sax: ["G4", "D4"], db: 1.5 }, // push into the last A
  { t: bar(28) + 1, ...CM9, db: 0 },
  // The break: one stop-time hit (Fm9, the saxes on the piano's Ab4), then the piano alone.
  { t: bar(29), tbn: ["Eb3", "Ab3"], tpt: ["C4", "G4"], sax: ["Ab4", "Eb4"], db: 1 },
  // Chorus 2: the band lands with the sax soli, and the brass answer its held notes.
  { t: bar(33), tbn: ["Eb3", "Bb3"], db: 0 },
  { t: bar(36) + 1.5, ...CM9, db: -1 },
  { t: bar(39) + 1, ...SUS, db: -1 },
  { t: bar(39) + 2, ...SUS, db: -0.5 },
  { t: bar(44) + 1.5, tbn: ["E3", "Bb3"], tpt: ["D4", "G4"], db: -0.5 }, // C9 under C5
  { t: bar(47) + 1, tbn: TBN_EB6, db: -1.5 },
  { t: bar(47) + 2, tbn: TBN_EB6, db: -1 },
  // B: kicks under the trumpet and the sax pads.
  { t: bar(49) + 1.5, tbn: TBN_EB6, db: 0 },
  { t: bar(52) + 1, ...BB9, db: 0.5 },
  { t: bar(52) + 2, ...BB9, db: 1 },
  { t: bar(53) + 1.5, tbn: ["F3", "Bb3"], tpt: ["D4", "F4"], db: 0.5 },
  { t: bar(55) + 1.5, tbn: ["Eb3", "Ab3"], tpt: ["C4", "G4"], db: 1 },
  { t: bar(56) + 2.5, tbn: ["Eb3", "Bb3"], tpt: ["D4", "F4"], db: 2 },
  { t: bar(60) + 1, ...CM9, db: 0.5 },
  // Countdown 4-3-2-1: a hit on every downbeat, louder each time, trumpets joining for the last two.
  { t: bar(61), tbn: ["Eb3", "Ab3", "C4"], db: -2 },
  { t: bar(62), tbn: ["Eb3", "Ab3", "C4"], db: -0.5 },
  { t: bar(63), ...SUS, db: 2 },
  { t: bar(64), ...BB9, db: 4 },
];
// One velocity per instrument picks the recording (trombones' third of four layers, trumpets'
// middle one, as their top layers are much brighter); the dynamics are in gain, since the
// trombones' fortissimo layer is ~10 dB hotter than the next and would jump, not build.
const TBN_V = 0.62;
const TBN_FF_V = 0.88;
const TBN_FF_TRIM_DB = -11; // brings the fortissimo take back in line; its brassier tone remains
const TPT_V = 0.5;
const SAX_STAB_V = 0.6; // the staccato saxes' loud layer: the soft one barely speaks
const trombones: Note[] = [];
const trumpets: Note[] = [];
const sopranoStabs: Note[] = [];
const tenorStabs: Note[] = [];
const hitDb = new Map<Note, number>();
for (const h of HITS) {
  // A section never lands exactly together: a few ms between the players, after the swing.
  const t = swung(h.t);
  h.tbn.forEach((n, i) => {
    const note = { t: t + i * 0.006, d: 0.5, n, v: h.ff ? TBN_FF_V : TBN_V };
    trombones.push(note);
    hitDb.set(note, h.db + (h.ff ? TBN_FF_TRIM_DB : 0));
  });
  h.tpt?.forEach((n, i) => {
    const note = { t: t + 0.004 + i * 0.006, d: 0.5, n, v: TPT_V };
    trumpets.push(note);
    hitDb.set(note, h.db);
  });
  if (h.sax) {
    const sop = { t: t + 0.008, d: 0.5, n: h.sax[0], v: SAX_STAB_V };
    const ten = { t: t + 0.002, d: 0.5, n: h.sax[1], v: SAX_STAB_V };
    sopranoStabs.push(sop);
    tenorStabs.push(ten);
    // The saxes follow the hit's dynamics only up to +1 dB: on the big hits the brass carry the
    // weight, and staccato saxes on top of them drove the master's limiter.
    hitDb.set(sop, Math.min(h.db, 1));
    hitDb.set(ten, Math.min(h.db, 1));
  }
}
for (const [t, sop, ten] of ANSWERS) {
  const at = swung(t);
  const sopNote = { t: at + 0.006, d: 0.5, n: sop, v: SAX_STAB_V };
  const tenNote = { t: at, d: 0.5, n: ten, v: SAX_STAB_V };
  sopranoStabs.push(sopNote);
  tenorStabs.push(tenNote);
  hitDb.set(sopNote, -1);
  hitDb.set(tenNote, -1);
}
const hitTimes = new Set(HITS.map((h) => h.t));

// ---------------------------------------------------------------- piano: stride comping, a break

// The warm upright (in tune; the honky-tonk's detuned unisons read as sour next to the saxes).
// Stride: the left hand's bass note ("oom") on 1, the chord ("pah") on 2 and 3.
//   S  oom-pah-pah        P  oom, pah on 2, pah on &3 anticipating the next chord
//   C  Charleston: oom + chord on 1, chord on &2      L  light: oom, pah on 2      -  tacet
const STRIDE =
  "SSSSSPSS" + "SSSPSSSS" + "CSCSCSCP" + "SSSS" + "----" + // chorus 1 (29–32: the break)
  "SSSSSPSS" + "SSSPSSSS" + "LLLLLLLP" + "SSSS" + "CCCC"; // chorus 2
/** The oom: the root (the 5th when the chord repeats), between Eb2 and D3. */
function oom(b: number): number {
  const h = inChorus(b);
  const root = ROOTS[h - 1]!;
  const same = h > 1 && ROOTS[h - 2] === root;
  let m = midi(`${root}2`) + (same ? 7 : 0);
  while (m > midi("D3")) m -= 12;
  while (m < midi("Eb2")) m += 12;
  return m;
}
// The upright's bass zones measure flat (a piano's stretch tuning; the median of their partials):
// C2 -21, Eb2 -8, F#2 -12, A2 -4 cents; C3 and up are within 2 cents. Notes played from those
// zones are pulled up so the oom sits in tune with the pizz bass.
const PIANO_FLAT: Record<number, number> = { [midi("C2")]: 21, [midi("Eb2")]: 8, [midi("F#2")]: 12, [midi("A2")]: 4 };
/** The recorded zones up to C3 in each velocity layer (the loud one has a B2 instead of an A2). */
const PIANO_ZONES = { soft: ["C2", "Eb2", "F#2", "A2", "C3"].map(midi), loud: ["C2", "Eb2", "F#2", "B2", "C3"].map(midi) };
/** Cents to add to a piano note: finds its zone the way the sampler does (at or below, else up). */
function pianoCents(m: number, loud: boolean): number {
  let zone = 0;
  let best = Infinity;
  for (const z of PIANO_ZONES[loud ? "loud" : "soft"]) {
    const d = m - z;
    const cost = d >= 0 ? d : -1.3 * d;
    if (cost < best) {
      best = cost;
      zone = z;
    }
  }
  return PIANO_FLAT[zone] ?? 0;
}
const tuned = (n: string | number, loud = false) => num(n) + pianoCents(num(n), loud) / 100;

const piano: Note[] = [];
for (let b = 1; b <= BARS; b++) {
  const kind = STRIDE[b - 1]!;
  if (kind === "-") continue;
  const s = bar(b);
  const h = inChorus(b);
  // While the saxes hold harmony (the soli, the pads, the last A), only the shell's lowest two notes.
  const thin = b > CHORUS;
  const voicing = (i: number) => (thin ? PIANO[i]!.slice(0, 2) : PIANO[i]!);
  const lift = 0.08 * energy(s);
  const chordAt = (beat: number, d: number, v: number, next = false) => {
    const t = swung(s + beat);
    // Shells roll very slightly, bottom up, like a hand landing on the keys (after the swing).
    voicing(next ? h % CHORUS : h - 1).forEach((n, k) => piano.push({ t: t + k * 0.012, d, n: tuned(n), v: v + lift - k * 0.02 }));
  };
  piano.push({ t: s, d: 0.9, n: tuned(oom(b)), v: 0.4 + 0.06 * energy(s) });
  if (kind === "S" || kind === "P" || kind === "L") chordAt(1, 0.6, 0.36);
  if (kind === "S") chordAt(2, 0.6, 0.34);
  if (kind === "P") chordAt(2.5, 1.0, 0.38, true);
  if (kind === "C") {
    chordAt(0, 0.7, 0.38);
    chordAt(1.5, 0.9, 0.36);
  }
}

// The break (bars 29–32): the tune's last phrase in octaves, a triplet run down the Bb9sus while
// the tune holds its Bb4, and the stride left hand (oom on 1, pah on 2 and 3).
const breakNotes: Note[] = [];
const BREAK_RH: [number, number, string][] = [
  [bar(29), 1.8, "Ab4"], [bar(29) + 2, 0.8, "G4"],
  [bar(30), 1.8, "F4"], [bar(30) + 2, 0.8, "Ab4"],
  [bar(31), 0.9, "Bb4"],
  [bar(32), 0.9, "Ab4"], [bar(32) + 1, 1.6, "F4"],
];
for (const [t, d, n] of BREAK_RH) {
  breakNotes.push({ t, d, n, v: 0.62 }, { t: t + 0.01, d, n: num(n) + 12, v: 0.56 });
}
["F5", "Eb5", "C5", "Bb4", "Ab4", "F4"].forEach((n, i) => breakNotes.push({ t: bar(31) + 1 + i / 3, d: 0.4, n, v: 0.6 - i * 0.02 }));
const BREAK_LH: [number, string, string[]][] = [
  [29, "F2", ["Eb3", "Ab3", "C4"]], [30, "C3", ["Eb3", "Ab3", "C4"]],
  [31, "Bb2", ["Eb3", "Ab3", "C4"]], [32, "F2", ["D3", "Ab3", "C4"]],
];
for (const [b, low, chordNotes] of BREAK_LH) {
  breakNotes.push({ t: bar(b), d: 0.9, n: tuned(low, true), v: 0.6 });
  for (const beat of b === 32 ? [1] : [1, 2]) chordNotes.forEach((n, k) => breakNotes.push({ t: bar(b) + beat + k * 0.012, d: 0.6, n: tuned(n, true), v: 0.58 - k * 0.02 }));
}

// ---------------------------------------------------------------- walking bass

const bassNotes: Note[] = [];
for (let b = 1; b <= BARS; b++) {
  const walk = WALK[inChorus(b) - 1]!;
  // Bars 1–8: in two (1 and 3); the break: only the stop-time hit; elsewhere walking quarters.
  const beats = b <= 8 ? [0, 2] : b === 29 ? [0] : b >= 30 && b <= 32 ? [] : [0, 1, 2];
  for (const beat of beats) {
    const t = bar(b) + beat;
    // Downbeats a touch firmer, building through the form, the band's hits stronger still.
    const accent = (beat === 0 ? 0.05 : 0) + 0.2 * energy(t) + (hitTimes.has(t) ? 0.04 : 0);
    bassNotes.push({ t, d: 1, n: num(walk[beat]!), v: accent });
  }
}
// Below F#2 the loud layer has a recording within a semitone or two; above it, it would stretch
// the E2 note up to 8 semitones (thin and boxy), so those notes use the soft layer's own F#2–C#3
// recordings, which are quieter and get that back in gain. Soft-layer velocities stay under
// 0.5 (the layer split) even after humanizing.
const BASS_SPLIT = midi("F#2");
// Level: 5 dB under the first draft, which put ~10 dB more energy below 120 Hz than any other
// arrangement and, as the master normalizes RMS, made everything else quieter.
const BASS_GAIN = 0.24;
// The recordings also vary note to note; these trims (dB) even out the walking line, from
// measuring each rendered note's level (A-weighted, first 250 ms).
const BASS_TRIM = new Map(
  Object.entries({ G1: 3.5, Ab1: 2, C2: 3.5, D2: 3.5, F2: -1, G2: 7, Ab2: -1.5, Bb2: -1, C3: 1 }).map(([k, db]) => [midi(k), db]),
);
// Bb2 is played from the A2 recording, which measures ~10 cents sharp even after the
// instrument's correction (YIN and harmonic-peak estimates agree), so it is pulled down.
const BASS_CENTS = new Map([[midi("Bb2"), -10]]);
const bass = byGain(
  { inst: "bassPizz", pan: 0, reverb: 0.1, humanize: 0.25 },
  bassNotes.map((n) => {
    const m = num(n.n);
    const a = n.v ?? 0;
    return { ...n, n: m + (BASS_CENTS.get(m) ?? 0) / 100, v: m < BASS_SPLIT ? 0.7 + a : 0.3 + a * 0.6 };
  }),
  (n) => {
    const m = Math.round(num(n.n));
    return BASS_GAIN * dB((m < BASS_SPLIT ? 0 : 8) + (BASS_TRIM.get(m) ?? 0));
  },
);

// ---------------------------------------------------------------- drums: a 1920s kit

const hat: Note[] = [];
const ride: Note[] = [];
const rim: Note[] = [];
const snare: Note[] = [];
const kick: Note[] = [];
const crash: Note[] = [];
const toms: Note[] = [];
const tomsLow: Note[] = [];
for (let b = 1; b <= BARS; b++) {
  const s = bar(b);
  if (b >= 29 && b <= 32) continue; // the piano break (its hit and pickup are below)
  const lift = 0.06 * energy(s);
  // Jazz-waltz time, "1  2-a 3 | 1  2  3-a": on the closed hat for the first A sections, then on
  // the ride with the hat "chick" on 2.
  const skips = b >= 57 ? [1.5, 2.5] : b % 2 ? [1.5] : [2.5];
  if (b <= 16) {
    for (const beat of [0, 1, 2]) hat.push({ t: s + beat, d: 1, n: "F#2", v: (beat === 0 ? 0.66 : 0.6) + lift });
    for (const beat of skips) hat.push({ t: s + beat, d: 1, n: "F#2", v: 0.54 + lift });
    // Cross-stick on 3.
    rim.push({ t: s + 2, d: 1, n: "D2", v: 0.5 + lift });
  } else {
    for (const beat of [0, 1, 2]) ride.push({ t: s + beat, d: 1, n: "D#3", v: (beat === 0 ? 0.8 : 0.7) + lift });
    for (const beat of skips) ride.push({ t: s + beat, d: 1, n: "D#3", v: 0.55 + lift });
    hat.push({ t: s + 1, d: 1, n: "F#2", v: 0.4 });
    // Snare comping: a ghost note on the "&" here and there.
    if (b % 2 === 0) snare.push({ t: s + 1.5, d: 1, n: "D2", v: 0.12 });
    if (b % 4 === 3) snare.push({ t: s + 2.5, d: 1, n: "D2", v: 0.14 });
  }
  // Feathered kick on 1.
  if (b < 61 && b !== 1 && b !== 33) kick.push({ t: s, d: 1, n: "C2", v: 0.3 });
}
// Phrase-end fills into each section.
for (const [t, v] of [
  [bar(8) + 1.5, 0.14], [bar(8) + 2.5, 0.22],
  [bar(16) + 1, 0.16], [bar(16) + 2.5, 0.26],
  [bar(24) + 1.5, 0.18],
  [bar(48) + 1.5, 0.16], [bar(48) + 2.5, 0.24],
  [bar(56) + 1.5, 0.2],
]) snare.push({ t: t!, d: 1, n: "D2", v: v! });
// The drummer kicks the band's hits: a snare + kick under each one (a real accent on the pushes).
for (const h of HITS) {
  if (h.t === 0) continue;
  const isPush = h.t === bar(24) + 2.5 || h.t === bar(56) + 2.5;
  snare.push({ t: h.t, d: 1, n: "D2", v: isPush ? 0.42 : 0.24 });
  kick.push({ t: h.t, d: 1, n: "C2", v: h.t >= bar(61) ? 0.4 + (h.t - bar(61)) * 0.025 : 0.42 });
}
// The break's pickup: swung eighths on 2-&-3-& of bar 32, into the soli's crash.
for (const [beat, v] of [[1, 0.22], [1.5, 0.26], [2, 0.32], [2.5, 0.42]]) snare.push({ t: bar(32) + beat!, d: 1, n: "D2", v: v! });
// Crashes: the soli's entrance, the last A, the countdown's downbeats (growing), and the big one.
for (const [t, v] of [[bar(33), 0.6], [bar(57), 0.65], [bar(61), 0.35], [bar(62), 0.42], [bar(63), 0.5], [bar(64), 0.6], [0, 0.9]]) {
  crash.push({ t: t!, d: 1, n: "C#3", v: v! });
}
// "Happy New Year": big downbeat, with the clash cymbals.
kick.push({ t: 0, d: 1, n: "C2", v: 0.66 });
const cymbals: Note[] = [{ t: 0, d: 1, n: "C#3", v: 0.8 }];
// Tom fill into the top of the loop: high tom on 2-&, low tom on 3-&, getting louder.
for (const [beat, v] of [[1, 0.5], [1.5, 0.58]]) toms.push({ t: bar(64) + beat!, d: 1, n: "A2", v: v! });
for (const [beat, v] of [[2, 0.62], [2.5, 0.72]]) tomsLow.push({ t: bar(64) + beat!, d: 1, n: "F2", v: v! });

// Countdown claps on 2 and 3 of the last four bars (a small crowd: two clappers, left and right).
const clapsL: Note[] = [];
const clapsR: Note[] = [];
for (let b = 61; b <= 64; b++) {
  const v = 0.08 + (b - 61) * 0.04;
  for (const beat of [1, 2]) {
    clapsL.push({ t: bar(b) + beat, d: 1, n: "C4", v });
    clapsR.push({ t: bar(b) + beat + 0.015, d: 1, n: "C4", v: v + 0.01 });
  }
}

// ---------------------------------------------------------------- the song

const sopranoLine = [...soliSoprano.map((n) => ({ ...n, v: 0.62 + (n.v ?? 0) })), ...tuttiSoprano.map((n) => ({ ...n, v: 0.5 + (n.v ?? 0) }))];
const tenorLine = [...soliTenor.map((n) => ({ ...n, v: 0.55 + (n.v ?? 0) })), ...tuttiTenor.map((n) => ({ ...n, v: 0.45 + (n.v ?? 0) }))];

const song: Song = {
  name: "newyear",
  bpm: BPM,
  beatsPerBar: BEATS,
  bars: BARS,
  swing: SWING,
  reverb: { room: 0.55, damp: 0.5, width: 0.85, level: 0.85 },
  tracks: [
    // The lead rises ~3 dB from the first A to the countdown.
    // A gentle low-pass takes the fizz off the harmon mute (-1 dB at 2.5 kHz, -6 dB at 5.5 kHz).
    ...byGain({ inst: "trumpetMute", pan: 0.05, reverb: 0.3, humanize: 0.35, lowpass: 5500 }, lead, (n) => 2.7 * dB(leadGainDb(num(n.n)) + buildDb(n.t, 3))),
    // The sax section: soprano on top (the soli's lead), tenor under it, both darkened a little.
    { inst: "sopranoSax", notes: sopranoLine, gain: 0.5, pan: 0.15, reverb: 0.28, humanize: 0.3, lowpass: 4500 },
    { inst: "sax", notes: tenorLine, gain: 0.38, pan: -0.15, reverb: 0.28, humanize: 0.3, lowpass: 5000 },
    { inst: "sax", notes: pads, gain: 0.24, pan: -0.3, reverb: 0.35, humanize: 0.3, lowpass: 4000 },
    ...byGain({ inst: "sopranoSaxShort", pan: 0.2, reverb: 0.25, humanize: 0.4, lowpass: 4500 }, sopranoStabs, (n) => 0.36 * dB(hitDb.get(n)!)),
    ...byGain({ inst: "saxShort", pan: -0.2, reverb: 0.25, humanize: 0.4, lowpass: 4500 }, tenorStabs, (n) => 0.36 * dB(hitDb.get(n)!)),
    ...byGain({ inst: "tromboneShort", pan: 0.3, reverb: 0.25, humanize: 0.4 }, trombones, (n) => 0.5 * dB(hitDb.get(n)!)),
    ...byGain({ inst: "trumpetShort", pan: -0.25, reverb: 0.25, humanize: 0.4 }, trumpets, (n) => 0.9 * dB(hitDb.get(n)!)),
    // The comping a little louder in chorus 2, where it plays only two-note shells.
    ...byGain({ inst: "piano", pan: -0.3, reverb: 0.2, humanize: 0.4 }, piano, (n) => (n.t < bar(33) ? 0.058 : 0.068)),
    { inst: "piano", notes: breakNotes, gain: 0.08, pan: -0.3, reverb: 0.25, humanize: 0.3 },
    ...bass,
    // The hat is kept back: it is the only thing above 8 kHz and already the mix's brightest part.
    { inst: "hatClosed", notes: hat, gain: 0.47, pan: 0.25, reverb: 0.1, humanize: 0.4 },
    { inst: "ride", notes: ride, gain: 0.9, pan: 0.3, reverb: 0.15, humanize: 0.4 },
    { inst: "rim", notes: rim, gain: 1.0, pan: 0.05, reverb: 0.15, humanize: 0.4 },
    { inst: "snareOn", notes: snare, gain: 0.85, pan: 0.05, reverb: 0.18, humanize: 0.4 },
    { inst: "kick", notes: kick, gain: 0.33, reverb: 0.05 },
    { inst: "crash", notes: crash, gain: 0.5, pan: -0.3, reverb: 0.2 },
    { inst: "cymbals", notes: cymbals, gain: 0.18, pan: 0.2, reverb: 0.25 },
    { inst: "tomHigh", notes: toms, gain: 0.6, pan: 0.2, reverb: 0.15 },
    { inst: "tomLow", notes: tomsLow, gain: 0.6, pan: -0.15, reverb: 0.15 },
    { inst: "claps", notes: clapsL, gain: 0.3, pan: -0.35, reverb: 0.25, humanize: 0.5 },
    { inst: "claps", notes: clapsR, gain: 0.3, pan: 0.35, reverb: 0.25, humanize: 0.5 },
  ],
};

export default song;
