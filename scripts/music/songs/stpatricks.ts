// St. Patrick's Day: a pub session. The 6/8 theme is played as a jig, the way a session plays a
// set of tunes: each 8-bar part twice (AABB), then on into a second tune, then back to the first
// one, lifted a tone, with the whole room playing. 80 bars at a dotted quarter of 120 (360 eighths
// a minute: one bar a second, 80 s).
//
// Form (bars):
//   The theme, in D (the tin whistle's key)
//    1–8   A    the tin whistle alone over a strummed guitar (a bouzouki-style backing: open
//               drones, the jig strum DOWN-up-down) and a soft bodhran on the pulse
//    9–16  A    the fiddle joins in unison, both playing the A part's variation (passing notes
//               in the skips, rolls on the long notes); the button accordion vamps (a bass note
//               on each pulse, a chord on the eighth before the next) and the bodhran drives
//   17–24  B    the flute joins the whistle and fiddle; an Irish harp arpeggiates; the bass enters
//   25–32  B    the B part's variation; the accordion takes the tune an octave under the rest.
//               Bar 32 turns to D7: the last notes are the pickup into...
//   The Irish Washerwoman (traditional), in G
//   33–40  A    fiddle and accordion together, the classic duo
//   41–48  A    the whistle an octave above them (the whistle's own octave), the flute with the fiddle
//   49–56  B    the accordion an octave under the tune; the harp back
//   57–64  B    everyone; bar 64 turns to B7, and the band runs up into...
//   The theme again, lifted to E: the room cheers
//   65–72  A    the whole band (variation), accordion an octave under
//   73–80  B    the harp back in; bar 80 turns to A7, which leads home to the top in D.
//
// Ornaments are the session's own: the whistle and flute cut repeated notes apart (a quick grace
// note above rather than tonguing them), the whistle rolls the long notes (note, cut, note, tap,
// note) and tongues only the pickups into each part, which kicks the new part off; the fiddle
// plays bowed trebles (three quick strokes) into long notes. Everything lilts: the second and third
// eighths of each pulse sit a little late, as a jig is danced. A pub murmur sits under the set,
// glasses clink through the Washerwoman, and the room cheers the lift.
//
// The theme is the shared Sway Tower melody; the Washerwoman is a public-domain traditional jig,
// arranged here our own way.
//
// Register plan (low to high), so the parts don't fight:
//   bass pizz F#1–F2 · guitar strums F#2–F#4 (four strings) · accordion vamp B2–A#3 bass, A3–G#4
//   chords (9–16) · harp arpeggios D4–E5 (17–24, 49–64, 73–80) · accordion tune an octave under
//   the lead: E4–E5 (25–32), G3–B4 (49–64), B3–F#5 (65–80); at the lead's pitch D4–E5 (33–48) ·
//   the lead (whistle, fiddle, flute in unison): C#5–F#6 (theme in D), D#5–G#6 (in E), the
//   Washerwoman D4–B5 (fiddle, flute) with the whistle an octave above, D5–B6.
// The whistle stays on its own notes: where the theme dips low (the pickups into bars 9, 17 and 73,
// and the turn into the Washerwoman) it plays its own pickup above the others, a whistler's habit.
// Its tongued notes stay at E5 and up (the recorder's staccato C5 and D5 take 50-150 ms to speak),
// and its few held C#5s start a moment early, as the low C5 recording speaks late.
// Fiddle, whistle and flute are low-passed: the solo recordings are bright, and the owner hears
// that edge as harsh.

import { instrument, type InstrumentName } from "../instruments";
import { midi } from "../sampler";
import type { Note, SampledTrack, Song, Track } from "../song";
import { CHORDS, EIGHTHS_PER_BAR, melody, type Quality } from "../theme";

const BAR = EIGHTHS_PER_BAR;
/** Eighths per minute: a dotted quarter of 120. One bar = 48,000 frames at 48 kHz. */
const BPM = 360;
const BARS = 80;
const LOOP = BARS * BAR;
/** Seconds per eighth. */
const EIGHTH = 60 / BPM;
/** Bar indices (0-based) where the Washerwoman and the lifted theme start. */
const WASHER = 32;
const LIFT = 64;

const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;

// ---------------------------------------------------------------- keys and chords

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Tonic pitch class of each bar: D, then G, then E; bar 80 already leans back to D. */
const keyOf = (bar: number) => (bar < WASHER ? 2 : bar < LIFT ? 7 : bar === BARS - 1 ? 2 : 4);

/** The note `steps` scale steps away from `n` in the bar's key (graces: cuts above, taps below). */
function scaleStep(n: number, steps: number, key: number): number {
  let m = n;
  for (let k = 0; k < Math.abs(steps); ) {
    m += Math.sign(steps);
    if (MAJOR.includes((((m - key) % 12) + 12) % 12)) k++;
  }
  return m;
}

function symbol(root: string, quality: Quality, semis: number): string {
  const pc = (midi(`${root}4`) + semis) % 12;
  return NAMES[pc]! + (quality === "min" ? "m" : quality === "dom7" ? "7" : "");
}
const themeHalves = (semis: number) => CHORDS.map(([root, quality]) => symbol(root, quality, semis));

/** The Washerwoman's chords per half bar: A part, then B part. */
const WASH_HALVES = [
  ...["G", "G", "G", "G", "Am", "Am", "Am", "D7", "G", "G", "G", "G", "C", "D7", "G", "G"],
  ...["G", "G", "G", "G", "D", "D", "D", "D7", "C", "G", "C", "G", "C", "D7", "G", "G"],
];

/** The chord of every half bar of the loop. */
const HALVES: string[] = (() => {
  const d = themeHalves(2);
  const e = themeHalves(4);
  const out = [...d.slice(0, 16), ...d.slice(0, 16), ...d.slice(16), ...d.slice(16)];
  out.push(...WASH_HALVES.slice(0, 16), ...WASH_HALVES.slice(0, 16), ...WASH_HALVES.slice(16), ...WASH_HALVES.slice(16));
  out.push(...e);
  // The turns between tunes: D7 into the Washerwoman's G, B7 into the theme in E, A7 home to D.
  out[WASHER * 2 - 1] = "D7";
  out[LIFT * 2 - 1] = "B7";
  out[BARS * 2 - 2] = "A";
  out[BARS * 2 - 1] = "A7";
  return out;
})();
const chordAt = (t: number) => HALVES[Math.floor(wrap(t) / 3)]!;

const INTERVALS: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10] };
/** Root pitch class and chord-tone pitch classes of a symbol like "F#m" or "D7". */
function parseChord(sym: string): { root: number; pcs: number[] } {
  const m = /^([A-G]#?)(m|7)?$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const root = NAMES.indexOf(m[1]!);
  return { root, pcs: INTERVALS[m[2] ?? ""]!.map((i) => (root + i) % 12) };
}
/** Every tone of the chord from `lo` to `hi` (MIDI), ascending. */
function tonesIn(sym: string, lo: number, hi: number): number[] {
  const { pcs } = parseChord(sym);
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m);
  return out;
}

// ---------------------------------------------------------------- the tunes

/** One bar of a tune: [position in eighths, length in eighths, note]. */
type Bar = [number, number, string][];

/** The theme's bars as theme.ts writes them (C major). */
const THEME = melody();
const plainBar = (b: number): Bar => THEME.filter((n) => Math.floor(n.t / BAR) === b).map((n) => [n.t - b * BAR, n.d, String(n.n)]);

/**
 * The theme as a session plays it the second time round (C major, like theme.ts): the skips
 * filled with passing notes, the quarter-eighth pairs turned into running eighths. The long notes
 * are kept for the rolls.
 */
const VARIATION: Bar[] = [
  [[0, 1, "E5"], [1, 1, "F5"], [2, 1, "G5"], [3, 2, "C6"], [5, 1, "B5"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 3, "E5"]],
  [[0, 1, "F5"], [1, 1, "G5"], [2, 1, "A5"], [3, 2, "C6"], [5, 1, "A5"]],
  [[0, 3, "G5"], [3, 1, "B4"], [4, 1, "C5"], [5, 1, "D5"]],
  [[0, 1, "E5"], [1, 1, "F5"], [2, 1, "G5"], [3, 1, "C6"], [4, 1, "D6"], [5, 1, "E6"]],
  [[0, 2, "D6"], [2, 1, "C6"], [3, 3, "A5"]],
  [[0, 1, "F5"], [1, 1, "G5"], [2, 1, "A5"], [3, 2, "G5"], [5, 1, "B4"]],
  [[0, 3, "C5"], [3, 1, "G4"], [4, 1, "A4"], [5, 1, "B4"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 1, "F5"], [4, 1, "G5"], [5, 1, "A5"]],
  [[0, 2, "G5"], [2, 1, "F5"], [3, 3, "D5"]],
  [[0, 1, "G5"], [1, 1, "F5"], [2, 1, "E5"], [3, 1, "A5"], [4, 1, "B5"], [5, 1, "C6"]],
  [[0, 2, "D6"], [2, 1, "C6"], [3, 1, "B5"], [4, 1, "A5"], [5, 1, "G5"]],
  [[0, 1, "E5"], [1, 1, "F5"], [2, 1, "G5"], [3, 2, "C6"], [5, 1, "B5"]],
  [[0, 2, "A5"], [2, 1, "G5"], [3, 1, "E5"], [4, 1, "D5"], [5, 1, "C5"]],
  [[0, 2, "F5"], [2, 1, "E5"], [3, 1, "D5"], [4, 1, "E5"], [5, 1, "F5"]],
  [[0, 3, "G5"], [3, 1, "F5"], [4, 2, "D5"]],
];

/** "B4 G4 G4 D4 G4 G4": a bar of six eighths. */
const eighths = (s: string): Bar => s.split(" ").map((name, p) => [p, 1, name]);

/** The Irish Washerwoman (traditional jig, G major), at the fiddle's pitch. */
const WASH_A = [
  "B4 G4 G4 D4 G4 G4",
  "B4 G4 B4 D5 C5 B4",
  "C5 A4 A4 E4 A4 A4",
  "C5 B4 C5 E5 D5 C5",
  "B4 G4 G4 D4 G4 G4",
  "B4 G4 B4 D5 C5 B4",
  "C5 B4 C5 A4 D5 C5",
  "B4 G4 G4 G4 D5 C5", // first time: the pickup back to the top
].map(eighths);
const WASH_B = [
  "G5 D5 G5 G5 D5 G5",
  "G5 D5 G5 B5 A5 G5",
  "F#5 D5 F#5 F#5 D5 F#5",
  "F#5 D5 F#5 A5 G5 F#5",
  "E5 G5 G5 D5 G5 G5",
  "C5 G5 G5 B4 G5 G5",
  "C5 B4 C5 A4 D5 C5",
  "B4 G4 G4 G4 B4 D5", // up the G chord into the B part
].map(eighths);
/** Bar 64: the last B part ends on B7, the run up into the theme in E. */
const INTO_E = eighths("B4 G4 G4 D#5 E5 F#5");
/** Bar 32 (actual pitch): the theme's last bar in D turns to D7, the pickup into the Washerwoman. */
const INTO_G: Bar = [[0, 3, "A5"], [3, 1, "F#5"], [4, 1, "D5"], [5, 1, "C5"]];
/** Bar 80 (actual pitch): the theme's last bar in E turns to A7, which leads home to D. */
const HOME: Bar = [[0, 3, "A5"], [3, 1, "G5"], [4, 2, "E5"]];

/** A tune note: time and length in eighths from the loop start, MIDI note, accent before dynamics. */
interface Mel {
  t: number;
  d: number;
  n: number;
  v: number;
  bar: number;
}

/** Accents: the two pulses lean in, the eighths between are lighter. */
const accent = (pos: number) => (pos === 0 ? 0.74 : pos === 3 ? 0.68 : 0.56);

function place(bar: number, notes: Bar, semis: number): Mel[] {
  return notes.map(([p, d, name]) => ({ t: bar * BAR + p, d, n: midi(name) + semis, v: accent(p), bar }));
}

/** Which bar of which tune each loop bar plays, and in which key, at the lead's (fiddle's) pitch. */
function tuneBar(bar: number): { notes: Bar; semis: number; varied: boolean } {
  if (bar === WASHER - 1) return { notes: INTO_G, semis: 0, varied: true };
  if (bar === LIFT - 1) return { notes: INTO_E, semis: 0, varied: true };
  if (bar === BARS - 1) return { notes: HOME, semis: 0, varied: true };
  if (bar < WASHER) {
    // AABB: bars 1–16 the A part (bars 1–8 of the theme) twice, 17–32 the B part twice; the
    // second time through each part is the variation.
    const i = (bar < 16 ? 0 : 8) + (bar % 8);
    const varied = Math.floor(bar / 8) % 2 === 1;
    return { notes: varied ? VARIATION[i]! : plainBar(i), semis: 2, varied };
  }
  if (bar < LIFT) {
    const k = bar - WASHER;
    const part = k < 16 ? WASH_A : WASH_B;
    // The A part's second time ends up the G chord into the B part.
    const notes = k === 15 ? WASH_B[7]! : part[k % 8]!;
    return { notes, semis: 0, varied: k % 16 >= 8 };
  }
  return { notes: VARIATION[bar - LIFT]!, semis: 4, varied: true };
}

/** The whole loop's tune at the lead's pitch. */
const TUNE: Mel[] = [];
for (let bar = 0; bar < BARS; bar++) {
  const { notes, semis } = tuneBar(bar);
  TUNE.push(...place(bar, notes, semis));
}
const varied = (bar: number) => tuneBar(bar).varied;
const tuneIn = (from: number, to: number, shift = 0): Mel[] =>
  TUNE.filter((m) => m.bar >= from && m.bar < to).map((m) => ({ ...m, n: m.n + shift }));
/** A player coming in takes the pickup: the end of the bar before `bar`, from eighth `pos`. */
const pickupInto = (bar: number, pos: number, shift = 0): Mel[] =>
  TUNE.filter((m) => m.bar === bar - 1 && m.t - m.bar * BAR >= pos).map((m) => ({ ...m, n: m.n + shift }));

/**
 * The whistle's line: the lead's, but its own pickups (actual pitch) where the theme dips low: into
 * the A part the turn that leads home at bar 80 (A G E), into the B part a sixth above the others,
 * and into the Washerwoman up the D7 (F# A C) rather than down to the low C; and the Washerwoman an
 * octave up (where a D whistle plays it), but for the run up into the theme in E.
 */
const WHISTLE_PICKUP: Record<number, string[]> = {
  7: ["A5", "G5", "E5"],
  15: ["F#5", "G5", "A5"],
  [WASHER - 1]: ["F#5", "A5", "C6"],
  [LIFT + 7]: ["G#5", "A5", "B5"],
};
function whistleLine(): Mel[] {
  const out: Mel[] = [];
  for (const m of TUNE) {
    const pos = m.t - m.bar * BAR;
    // The fiddle and accordion's A part; the whistle comes in on the pickup into the repeat.
    if (m.bar >= WASHER && m.bar < WASHER + 8 && !(m.bar === WASHER + 7 && pos >= 4)) continue;
    const pickup = WHISTLE_PICKUP[m.bar];
    if (pickup && pos >= 3) {
      out.push({ ...m, n: midi(pickup[pos - 3]!) });
    } else if (m.bar >= WASHER && m.bar < LIFT && !(m.bar === LIFT - 1 && pos >= 3)) {
      out.push({ ...m, n: m.n + 12 });
    } else out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------- dynamics

/** The band builds through each tune, and the lifted theme is the top. Added to velocities. */
const SECTION_LIFT = [0, 0.02, 0.03, 0.05, 0.02, 0.04, 0.05, 0.07, 0.08, 0.08];
const lift = (bar: number) => SECTION_LIFT[Math.floor(bar / 8)]!;

// ---------------------------------------------------------------- the lilt

/** How late the second and third eighths of each pulse sit (eighths): the jig's lilt. */
const LILT = [0, 0.12, 0.06];
function liltAt(t: number): number {
  const pos = Math.floor((((t % 3) + 3) % 3) + 1e-6);
  return t + LILT[Math.min(2, pos)]!;
}
/** Lilt a note (its start and its end), start it `early` eighths ahead, and wrap it into the loop. */
function lilted(n: Note, early = 0): Note {
  const t = liltAt(n.t);
  const end = liltAt(n.t + n.d);
  return { ...n, t: wrap(t - early), d: Math.max(0.1, end - t) };
}

// ---------------------------------------------------------------- performing a line

type Ornament = "none" | "cut" | "roll" | "treble" | "tongue";

interface Style {
  /** Grace note length, eighths. */
  grace: number;
  /** Scale steps from a note up to its cut (whistle and flute cuts sit a third up, the fiddle's a step). */
  cutStep: number;
  /** Eighths a note starts early: a bow or a breath takes a moment to speak. */
  early: number;
  /** Eighths each note lets go before the next (a breath, a new bow). */
  gap: number;
  /** The ornament a note gets. */
  pick: (m: Mel, prev: Mel | undefined) => Ornament;
  /** Velocity of a tune note. */
  vel: (m: Mel) => number;
  /** Extra eighths a plain note starts early, for recordings that take a moment to speak. */
  speak?: (n: number) => number;
}

interface Voice {
  main: Note[];
  grace: Note[];
  /** Notes for the part's short recordings: bowed trebles (fiddle spiccato), tongued notes (whistle staccato). */
  short: Note[];
}

function perform(line: Mel[], s: Style): Voice {
  const main: Note[] = [];
  const grace: Note[] = [];
  const short: Note[] = [];
  /** Plain notes that start early by `speak`. */
  const slow = new Set<Note>();
  const G = s.grace;
  line.forEach((m, i) => {
    const prev = i > 0 && line[i - 1]!.t + line[i - 1]!.d >= m.t - 0.01 ? line[i - 1] : undefined;
    const key = keyOf(m.bar);
    const v = s.vel(m);
    const len = Math.max(0.5, m.d - s.gap);
    const up = scaleStep(m.n, s.cutStep, key);
    switch (s.pick(m, prev)) {
      case "cut":
        grace.push({ t: m.t, d: G, n: up, v: v * 0.85 });
        main.push({ t: m.t + G, d: len - G, n: m.n, v });
        break;
      case "roll": {
        // Note, cut, note, tap, note: three pulses of the same note, articulated by the graces.
        const down = scaleStep(m.n, -1, key);
        const roll = scaleStep(m.n, Math.min(s.cutStep, 1), key);
        main.push({ t: m.t, d: 1 - 0.02, n: m.n, v });
        grace.push({ t: m.t + 1, d: G, n: roll, v: v * 0.8 });
        main.push({ t: m.t + 1 + G, d: 1 - G - 0.02, n: m.n, v: v * 0.9 });
        grace.push({ t: m.t + 2, d: G, n: down, v: v * 0.8 });
        main.push({ t: m.t + 2 + G, d: len - 2 - G, n: m.n, v: v * 0.92 });
        break;
      }
      case "treble":
        // Three quick bow strokes on the first eighth, then the note held.
        [0.8, 0.6, 0.7].forEach((tv, k) => short.push({ t: m.t + k / 3, d: 1 / 3, n: m.n, v: Math.min(0.95, tv + lift(m.bar)) }));
        main.push({ t: m.t + 1, d: len - 1, n: m.n, v: v - 0.04 });
        break;
      case "tongue":
        short.push({ t: m.t, d: len, n: m.n, v });
        break;
      default:
        main.push({ t: m.t, d: len, n: m.n, v });
        if (s.speak?.(m.n)) slow.add(main[main.length - 1]!);
    }
  });
  const lead = (n: Note) => (slow.has(n) ? s.speak!(n.n as number) : 0);
  return {
    main: main.map((n) => {
      const l = lilted(n, s.early + lead(n));
      return { ...l, d: l.d + lead(n) };
    }),
    grace: grace.map((n) => lilted(n, s.early)),
    short: short.map((n) => lilted(n, s.early * 0.3)),
  };
}

const posOf = (m: Mel) => m.t - m.bar * BAR;
const repeated = (m: Mel, prev: Mel | undefined) => prev !== undefined && prev.n === m.n;

/** The last bar of each 8-bar part: its last eighths are the pickup into the next part. */
const partEnd = (bar: number) => bar % 8 === 7;

/**
 * Tin whistle: rolls on the long notes, cuts to part repeated notes and on every other quarter
 * note, and the pickups into each part tongued (its staccato recordings, E5 and up: the lower ones
 * speak late), which kicks the new part off.
 */
const WHISTLE: Style = {
  grace: 0.16,
  cutStep: 2,
  early: 0.05,
  gap: 0.08,
  pick: (m, prev) => {
    if (partEnd(m.bar) && m.d === 1 && posOf(m) >= 3 && m.n >= midi("E5")) return "tongue";
    if (m.d >= 3 && m.n >= midi("D5")) return "roll";
    if (repeated(m, prev)) return "cut";
    if (m.d === 2 && posOf(m) % 3 === 0 && (m.bar + posOf(m) / 3) % 2 === 0) return "cut";
    return "none";
  },
  vel: (m) => 0.62 + (m.v - 0.56) * 0.8 + lift(m.bar),
  // The low C5 recording (which C#5 plays) takes about 50 ms to speak.
  speak: (n) => (n < midi("D5") ? 0.3 : 0),
};

/** Flute: doubles the whistle and fiddle; cuts the quarter notes the whistle doesn't, and the long ones. */
const FLUTE: Style = {
  grace: 0.18,
  cutStep: 2,
  early: 0.08,
  gap: 0.1,
  pick: (m, prev) => {
    if (repeated(m, prev)) return "cut";
    if (m.d >= 3) return "cut";
    if (m.d === 2 && posOf(m) % 3 === 0 && (m.bar + posOf(m) / 3) % 2 === 1) return "cut";
    return "none";
  },
  vel: (m) => 0.6 + (m.v - 0.56) * 0.6 + lift(m.bar),
};

/**
 * Fiddle: bowed trebles into the long notes, and into the quarter notes on the beat in every other
 * bar of the variations, every bar in the lifted theme (the fiddler digging in at the top of the set).
 */
const FIDDLE: Style = {
  grace: 0.2,
  cutStep: 1,
  early: 0.15,
  gap: 0.08,
  pick: (m) => {
    if (m.d >= 3) return "treble";
    if (m.d === 2 && posOf(m) === 0 && varied(m.bar) && (m.bar % 2 === 0 || m.bar >= LIFT)) return "treble";
    return "none";
  },
  // The loud bowing layer (v >= 0.5) throughout: one even tone.
  vel: (m) => 0.6 + (m.v - 0.56) * 0.8 + lift(m.bar),
};

/** Button accordion: punchy and plain, a little detached. */
const ACCORDION: Style = {
  grace: 0.18,
  cutStep: 1,
  early: 0.03,
  gap: 0.12,
  pick: () => "none",
  vel: (m) => 0.6 + (m.v - 0.56) * 0.7 + lift(m.bar),
};

// ---------------------------------------------------------------- the lead

const whistle = perform(whistleLine(), WHISTLE);
// The fiddle comes in on the pickup into bar 9.
const fiddle = perform([...pickupInto(8, 3), ...tuneIn(8, BARS)], FIDDLE);
// The flute comes in on the pickup into bar 17, rests in the Washerwoman's first A part and comes
// back on the pickup into its repeat.
const flute = perform([...pickupInto(16, 3), ...tuneIn(16, WASHER), ...pickupInto(WASHER + 8, 4), ...tuneIn(WASHER + 8, BARS)], FLUTE);

// The accordion's tune: an octave under the lead in the theme's last B part (25–32), at the
// lead's pitch for the Washerwoman's A parts (33–48), an octave under for its B parts and for the
// theme in E. Bar 32 it plays at the lead's pitch, A, then C-D-C over the D7 into the Washerwoman.
// In bar 69 it holds the E under the others' run up to the top (its short F#5 there, played from
// its G5 recording, speaks sharp).
const accordionLine: Mel[] = [
  ...pickupInto(24, 3, -12),
  ...tuneIn(24, WASHER - 1, -12),
  ...place(WASHER - 1, [[0, 3, "A4"], [3, 1, "C5"], [4, 1, "D5"], [5, 1, "C5"]], 0),
  ...tuneIn(WASHER, WASHER + 16),
  ...tuneIn(WASHER + 16, BARS, -12).filter((m) => !(m.bar === LIFT + 4 && posOf(m) > 3)),
].map((m) => (m.bar === LIFT + 4 && posOf(m) === 3 ? { ...m, d: 3 } : m));
const accordion = perform(accordionLine, ACCORDION);

// ---------------------------------------------------------------- accordion vamp (9–16)

// The left hand's bass-and-chord: a bass note on each pulse, a chord on the eighth before the next.
const vamp: Note[] = [];
for (let bar = 8; bar < 16; bar++) {
  for (const half of [0, 1]) {
    const t = bar * BAR + half * 3;
    const sym = chordAt(t);
    const { root } = parseChord(sym);
    const bass = midi("B2") + ((((root - 11) % 12) + 12) % 12);
    vamp.push({ t, d: 1.4, n: bass, v: half === 0 ? 0.62 : 0.56 });
    for (const n of tonesIn(sym, midi("A3"), midi("G#4")).slice(0, 3)) vamp.push({ t: t + 2, d: 0.95, n, v: 0.5 });
  }
}

// ---------------------------------------------------------------- guitar

/** Bouzouki-style shapes on four strings, low to high: open drones where the chord allows. */
const GUITAR: Record<string, string[]> = {
  D: ["D3", "A3", "D4", "F#4"],
  D7: ["D3", "A3", "C4", "F#4"],
  Bm: ["B2", "F#3", "B3", "D4"],
  G: ["G2", "D3", "G3", "B3"],
  A: ["A2", "E3", "A3", "C#4"],
  A7: ["A2", "E3", "G3", "C#4"],
  Em: ["B2", "E3", "G3", "B3"],
  "F#m": ["F#2", "C#3", "F#3", "A3"],
  Am: ["A2", "E3", "A3", "C4"],
  C: ["C3", "E3", "G3", "C4"],
  B7: ["B2", "D#3", "A3", "B3"],
  E: ["E3", "G#3", "B3", "E4"],
  "C#m": ["C#3", "G#3", "C#4", "E4"],
  B: ["B2", "F#3", "B3", "D#4"],
  "G#m": ["G#2", "D#3", "G#3", "B3"],
};

/**
 * The guitar's four strings, low to high, each one choked track for the whole loop, so every
 * string stops when it is struck again, across the loop seam too: bar 80's A7 stops on the top's D
 * (as separate intro tracks it rang a third of a second into the whistle's solo opening).
 */
const guitar: Note[][] = [[], [], [], []];
/**
 * A strum: down strokes roll low to high across the four strings, up strokes catch the top three
 * (the top two in the light strum of bars 1–8).
 */
function strum(t: number, sym: string, v: number, up = false): void {
  const shape = GUITAR[sym];
  if (!shape) throw new Error(`no guitar shape for ${sym}`);
  const strings = up ? (t < 8 * BAR ? [3, 2] : [3, 2, 1]) : [0, 1, 2, 3];
  strings.forEach((s, i) => guitar[s]!.push(lilted({ t: t + i * 0.07, d: 2, n: midi(shape[s]!), v: v - i * 0.02 })));
}
// The jig strum: DOWN up down, DOWN up down (light in bars 1–8: DOWN . up, DOWN . up). The guitar
// has one velocity layer, so the light strum's softness is all velocity (about 4 dB under the full).
const STRUM_FULL: [number, number, boolean][] = [[0, 0.6, false], [1, 0.34, true], [2, 0.46, false], [3, 0.56, false], [4, 0.34, true], [5, 0.46, false]];
const STRUM_LIGHT: [number, number, boolean][] = [[0, 0.12, false], [2, 0.05, true], [3, 0.1, false], [5, 0.05, true]];
for (let bar = 0; bar < BARS; bar++) {
  for (const [pos, v, up] of bar < 8 ? STRUM_LIGHT : STRUM_FULL) {
    const t = bar * BAR + pos;
    strum(t, chordAt(t), v + lift(bar) * 0.5, up);
  }
}

// ---------------------------------------------------------------- bodhran

const bodhran: Note[] = [];
const bodhranMuted: Note[] = [];
const bodhranHigh: Note[] = [];
/** Bars 1–8's strokes, played softer (their own tracks). */
const bodhranIntro: Note[] = [];
const bodhranMutedIntro: Note[] = [];
const hit = (list: Note[], t: number, v: number, note: string) => {
  const intro = t < 8 * BAR ? (list === bodhran ? bodhranIntro : list === bodhranMuted ? bodhranMutedIntro : null) : null;
  (intro ?? list).push(lilted({ t, d: 0.5, n: note, v }));
};
const open = (t: number, v: number) => hit(bodhran, t, v, "D2");
const muted = (t: number, v: number) => hit(bodhranMuted, t, v, "D2");
const high = (t: number, v: number) => hit(bodhranHigh, t, v, "A2");
for (let bar = 0; bar < BARS; bar++) {
  const t = bar * BAR;
  const up = lift(bar);
  if (bar < 8) {
    // Bars 1–8: the pulse, soft, with a muted stroke leading into each.
    open(t, 0.56);
    muted(t + 2, 0.4);
    open(t + 3, 0.5);
    muted(t + 5, 0.44);
    continue;
  }
  // The jig: every eighth, down-up-down, the pulses open and accented, the up-strokes on the top
  // of the skin, the third eighth muted (the hand pressing the skin).
  open(t, 0.7 + up);
  high(t + 1, 0.36);
  muted(t + 2, 0.46);
  open(t + 3, 0.6 + up);
  high(t + 4, 0.32);
  if (partEnd(bar)) {
    // A roll into the next part: sixteenths up to the bar line.
    [4.5, 5, 5.5].forEach((p, i) => (i % 2 === 0 ? muted : high)(t + p, 0.4 + i * 0.06));
  } else if (bar % 2 === 1) {
    // Every other bar a double stroke at the end of the bar.
    muted(t + 5, 0.46);
    high(t + 5.5, 0.34);
  } else {
    muted(t + 5, 0.48);
  }
}

// ---------------------------------------------------------------- harp

const HARP_BARS = [
  [16, 24],
  [WASHER + 16, LIFT],
  [LIFT + 8, BARS],
];
const harp: Note[] = [];
for (const [from, to] of HARP_BARS) {
  for (let bar = from!; bar < to!; bar++) {
    const t0 = bar * BAR;
    // A broken chord up through the first half's chord, back down through the second's.
    const upTones = tonesIn(chordAt(t0), midi("D4"), midi("E5"));
    const downTones = tonesIn(chordAt(t0 + 3), midi("D4"), midi("E5"));
    const pattern = [upTones[0], upTones[1], upTones[2], downTones[3] ?? downTones[2], downTones[2], downTones[1]];
    const vels = [0.58, 0.44, 0.48, 0.54, 0.46, 0.42];
    pattern.forEach((n, i) => harp.push({ t: t0 + i, d: 1, n: n!, v: vels[i]! }));
  }
}
/**
 * A harp string rings for many seconds: each note rings until the chord moves to one it would
 * clash with (its pitch class isn't in the new chord), at most 1.5 s. One track per ring time.
 */
function damped(track: Omit<SampledTrack, "notes">, notes: Note[]): Track[] {
  const byRing = new Map<number, Note[]>();
  for (const n of notes) {
    const pc = (n.n as number) % 12;
    let ring = 1.5;
    for (let c = Math.floor(n.t / 3) + 1; (c * 3 - n.t) * EIGHTH < 1.5; c++) {
      if (!parseChord(chordAt(c * 3)).pcs.includes(pc)) {
        ring = Math.round((c * 3 - n.t) * EIGHTH * 100) / 100;
        break;
      }
    }
    byRing.set(ring, [...(byRing.get(ring) ?? []), lilted(n)]);
  }
  return [...byRing].map(([ring, group]) => ({ ...track, notes: group, ring }));
}

// ---------------------------------------------------------------- bass

/** Root (and fifth) in F#1–F2, where the pizzicato recordings live. */
const bassNote = (pc: number) => midi("F#1") + ((((pc - 6) % 12) + 12) % 12);
const bass: Note[] = [];
for (let bar = 16; bar < BARS; bar++) {
  const t = bar * BAR;
  const a = parseChord(chordAt(t));
  const b = parseChord(chordAt(t + 3));
  const second = a.root === b.root ? bassNote((a.root + 7) % 12) : bassNote(b.root);
  bass.push(lilted({ t, d: 2, n: bassNote(a.root), v: 0.66 + lift(bar) * 0.5 }));
  bass.push(lilted({ t: t + 3, d: 2, n: second, v: 0.6 + lift(bar) * 0.5 }));
}

// ---------------------------------------------------------------- the room

/**
 * The pub: a murmur under the whole set (one 108 s take, capped just before the loop's end so its
 * 0.25 s release overlaps the take starting again: no gap in the room at the seam).
 */
const crowd: Note[] = [{ t: 0, d: LOOP, n: "C4", v: 0.6 }];
/** The room cheers the lift into E (on the run up). */
const cheer: Note[] = [{ t: LIFT * BAR - 2, d: 1, n: "C4", v: 0.7 }];
/** Glasses here and there through the Washerwoman. */
const clinks: Note[] = [
  [WASHER + 1, 1.5],
  [WASHER + 6, 4],
  [WASHER + 13, 2.5],
  [WASHER + 22, 0.5],
  [WASHER + 27, 3.5],
].map(([bar, pos]) => ({ t: bar! * BAR + pos!, d: 1, n: "C4", v: 0.5 }));

// ---------------------------------------------------------------- evening out the recordings

// The solo recordings speak at different levels from note to note, so a line played at one
// velocity comes out lumpy. These read the recording the sampler plays for a note (zoneFor) so a
// line can be evened out before its dynamics are applied (as in thanksgiving.ts).

function layerRange(name: InstrumentName, vel: number): { lo: number; hi: number } {
  const n = new Set(instrument(name).zones.map((z) => z.layer)).size;
  const i = Math.min(n - 1, Math.floor(vel * n));
  return { lo: i / n, hi: i === n - 1 ? 1 : (i + 1) / n };
}

const zoneLevels = new Map<string, number>();
/** Peak 30 ms RMS (dB) of a note's recording over its first `seconds` (0.1–0.35), round robins averaged. */
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

/** How loud a note's recording plays at track gain 1 (its zoneDb plus the instrument's own gain), dB. */
function noteDb(name: InstrumentName, n: Note): number {
  const inst = instrument(name);
  const held = inst.opts.oneShot ? 0.35 : n.d * EIGHTH;
  return zoneDb(name, n.n as number, n.v ?? 0.7, held) + 20 * Math.log10(inst.opts.gain);
}

/** A part's typical note level (the median of noteDb). */
function typicalDb(name: InstrumentName, notes: Note[]): number {
  const sorted = notes.map((n) => noteDb(name, n)).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * A part as tracks with its notes evened out to one level (by default the part's typical one; a
 * part's graces and short notes are evened to its main line's): notes grouped by the correction
 * they need in 3 dB steps (a track each, with that gain), the rest made up by velocity.
 */
function leveled(track: Omit<SampledTrack, "notes">, notes: Note[], typical = typicalDb(track.inst, notes)): Track[] {
  const groups = new Map<number, Note[]>();
  for (const n of notes) {
    const need = typical - noteDb(track.inst, n);
    const step = Math.max(-12, Math.min(12, Math.round(need / 3) * 3));
    const group = groups.get(step) ?? [];
    group.push({ ...n, v: nudge(track.inst, n.v ?? 0.7, need - step) });
    groups.set(step, group);
  }
  return [...groups].map(([step, group]) => ({ ...track, notes: group, gain: (track.gain ?? 1) * 10 ** (step / 20) }));
}

const WHISTLE_DB = typicalDb("whistle", whistle.main);
const FIDDLE_DB = typicalDb("fiddle", fiddle.main);
const FLUTE_DB = typicalDb("flute", flute.main);

// ---------------------------------------------------------------- the song

const song: Song = {
  name: "stpatricks",
  bpm: BPM,
  beatsPerBar: BAR,
  bars: BARS,
  // A pub's back room: close and warm.
  reverb: { room: 0.5, damp: 0.6, width: 0.9, level: 0.8 },
  tracks: [
    // the lead
    ...leveled({ inst: "whistle", gain: 1.3, pan: 0.15, reverb: 0.25, humanize: 0.3, lowpass: 4500, label: "whistle" }, whistle.main),
    ...leveled({ inst: "whistleShort", gain: 1.3, pan: 0.15, reverb: 0.25, humanize: 0.3, lowpass: 4500, choke: true, ring: 0.16, label: "whistle tongued" }, whistle.short, WHISTLE_DB),
    ...leveled({ inst: "whistle", gain: 1.1, pan: 0.15, reverb: 0.2, humanize: 0.2, lowpass: 4500, label: "whistle graces" }, whistle.grace, WHISTLE_DB),
    ...leveled({ inst: "fiddle", gain: 0.8, pan: -0.2, reverb: 0.25, humanize: 0.3, lowpass: 3500, label: "fiddle" }, fiddle.main),
    ...leveled({ inst: "fiddleShort", gain: 0.7, pan: -0.2, reverb: 0.25, humanize: 0.3, lowpass: 3500, label: "fiddle trebles" }, fiddle.short, FIDDLE_DB),
    ...leveled({ inst: "flute", gain: 0.85, pan: 0.35, reverb: 0.3, humanize: 0.3, lowpass: 4000, label: "flute" }, flute.main),
    ...leveled({ inst: "flute", gain: 0.75, pan: 0.35, reverb: 0.25, humanize: 0.2, lowpass: 4000, label: "flute graces" }, flute.grace, FLUTE_DB),
    ...leveled({ inst: "accordion", gain: 0.21, pan: -0.35, reverb: 0.25, humanize: 0.3, label: "accordion" }, accordion.main),
    { inst: "accordion", notes: vamp.map((n) => lilted(n)), gain: 0.11, pan: -0.35, reverb: 0.25, humanize: 0.3, label: "accordion vamp" },
    // the backing
    // Each string rings until it is struck again (at most half a second).
    ...guitar.map((notes): Track => ({ inst: "guitar", notes, gain: 0.05, pan: 0.3, reverb: 0.2, humanize: 0.5, choke: true, ring: 0.5, label: "guitar" })),
    ...damped({ inst: "harp", gain: 0.45, pan: -0.45, reverb: 0.35, humanize: 0.25, label: "harp" }, harp),
    { inst: "bassPizz", notes: bass, gain: 0.7, pan: 0, reverb: 0.1, choke: true, highpass: 60 },
    // the bodhran: each stroke stops at the next on its part of the skin
    { inst: "bodhran", notes: bodhran, gain: 1, pan: 0.05, reverb: 0.15, humanize: 0.3, choke: true, ring: 0.6, highpass: 70, label: "bodhran" },
    { inst: "bodhranMuted", notes: bodhranMuted, gain: 1, pan: 0.05, reverb: 0.12, humanize: 0.3, choke: true, ring: 0.35, label: "bodhran" },
    { inst: "bodhran", notes: bodhranIntro, gain: 0.5, pan: 0.05, reverb: 0.15, humanize: 0.3, choke: true, ring: 0.6, highpass: 70, label: "bodhran" },
    { inst: "bodhranMuted", notes: bodhranMutedIntro, gain: 0.5, pan: 0.05, reverb: 0.12, humanize: 0.3, choke: true, ring: 0.35, label: "bodhran" },
    { inst: "bodhranHigh", notes: bodhranHigh, gain: 0.8, pan: 0.05, reverb: 0.12, humanize: 0.3, choke: true, ring: 0.3, label: "bodhran" },
    // the room
    { inst: "crowd", notes: crowd, gain: 0.1, pan: 0, reverb: 0, humanize: 0, ring: LOOP * EIGHTH - 0.05, highpass: 120, lowpass: 5000 },
    { inst: "cheer", notes: cheer, gain: 0.12, pan: 0.1, reverb: 0.2, humanize: 0, ring: 2.5, highpass: 150 },
    // Glass rings bright: low-passed like New Year's, so a clink never bites.
    { inst: "clink", notes: clinks, gain: 0.25, pan: -0.5, reverb: 0.2, humanize: 0.3, lowpass: 5000 },
  ],
};

export default song;
