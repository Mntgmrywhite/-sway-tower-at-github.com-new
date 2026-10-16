// A subtractive synthesizer and drum machine for offline rendering: the Neon skins' French
// electro house (bright detuned saws, plucky arps, a deep sub, four-on-the-floor drums that
// pump). Only Neon plays synths as instruments; every other song plays real recordings through
// sampler.ts, and may add the sound effects no recording covers (Halloween's haunted fun house).
// Our own synthesis, so there is nothing to license.
//
// Patches are plain data (SYNTHS below, or a copy with a few fields changed). renderSynth()
// mirrors sampler.ts renderNotes(): the same NoteEvents, velocity curve and equal-power pan,
// and anything ringing past the end of the buffer wraps to its start, so loop renders are
// seamless. A note's `ring` (song.ts sets it for `choke` and `ring`) ends it early, as it does
// a one-shot recording.
//
// Voices: band-limited oscillators (polyBLEP saw and pulse, polyBLAMP triangle, sine, noise)
// with unison (detune in cents, stereo spread) and an optional sub-oscillator, drive, a TPT
// state-variable filter (low/high/band-pass, 12 or 24 dB, resonance, envelope, key tracking,
// velocity), amp and filter ADSRs, LFOs (vibrato, filter wobble, PWM, tremolo), a fixed
// high-pass, mono legato with glide, and ramps that sweep pitch, cutoff and level over a
// note's held length (risers). Drums: a membrane model (kick, snare, toms: a sine body with a
// pitch drop, a filtered noise skin and a beater click), a clap (noise bursts and a tail) and a
// metal model (hats, ride, crash: six square partials, as in the analog machines, plus noise).
// Effects, each held for its note's length: a howl (additive harmonics through morphing vowel
// formants, a scoop, vibrato and a fall, with breath), wind (a whoosh and a rising resonant
// whistle that blows across), a snake's hiss, a rattlesnake's click train, and clinking chains.
//
// Helpers for the genre: pumpEnvelope() + duck() for sidechain pumping and loopDelay() for a
// tempo-synced stereo or ping-pong delay, both loop-seamless; beats() and beatHz() for tempo.
//
// Deterministic: unison phases and noise come from a seeded generator keyed by each note's
// start frame and pitch and by the patch (never Math.random), so a song renders the same every
// time, a note sounds the same whatever else plays, and two patches struck together never share
// their noise. A mono line is loop-seamless too: its last note slides into (or is cut by) its
// first note's next pass, as between any two of its notes.
//
// In tune (synth.test.ts, read with pitch.ts like the sampled sets): every pitched patch within
// 2 cents across its `range`, as read and as heard. A unison stack's detuned pairs sit
// symmetrically about the pitch, so it sums to the pitch with a beating level. Sweeps that would
// drag the pitch are voiced around: filters close no lower than about twice the pitch, and
// pulse-width modulation moves both edges.
//
// Levels (gain 1, velocity 0.7): a pitched patch plays its `home` note at about -28 dB RMS over
// the first half second (like the horn in instruments.ts; a riser over the last half second of
// a 2 s sweep). A pluck's snap peaks well above a pad at that level. Drum peaks sit near the
// sampled kit's (kick, snare, clap about -10 dBFS, toms -12, hats -20, cymbals -22). All are
// means over many start frames (gains set on 96): a detuned stack beats slowly, so a single
// note's first half second can sit several dB off (a pad or a reese by up to 6 dB).

import type { NoteEvent } from "./sampler";

const TAU = 2 * Math.PI;
/** Control rate: pitch, cutoff and LFOs update every this many frames (0.17 ms at 48 kHz). */
const BLOCK = 8;
/** A note ends once its envelope has fallen this far (-80 dB). */
const SILENT = 1e-4;
/** Shortest amp attack, in seconds: a saw or pulse can start mid-swing, so it fades in. */
const MIN_ATTACK = 0.001;
/** Mono patches: a note starting within this long after the previous one ends is legato. */
const LEGATO = 0.01;
/** Drum hits fade in over this long (seconds), so no hit starts with a step. */
const DRUM_ATTACK = 0.0005;
/** Mono patches: a new (non-legato) note cuts the previous one's tail this fast (seconds to -60 dB). */
const CUT = 0.006;
/** Coefficient of an exponential fall of 60 dB over `seconds`. */
const t60 = (seconds: number, rate: number) => Math.exp(Math.log(0.001) / Math.max(1, seconds * rate));
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

// ---------------------------------------------------------------- patches

export type Wave = "saw" | "pulse" | "triangle" | "sine" | "noise";

export interface Osc {
  wave: Wave;
  /** Level (default 1). */
  level?: number;
  /** Pitch offset in semitones; fractional for inharmonic partials (bells). */
  semi?: number;
  /** Fine tune in cents. */
  cents?: number;
  /** Pulse width 0..1 (pulse only, default 0.5: a square). */
  width?: number;
  /** Unison voices (default 1). */
  voices?: number;
  /** Unison detune: cents from the lowest voice to the highest (spaced wider toward the outside, like a super saw). */
  detune?: number;
  /** Unison stereo spread 0..1 (0: every voice centered). */
  spread?: number;
  /** Extra decay on this oscillator alone, seconds to fall 60 dB (bell partials, an organ's key click). */
  decay?: number;
  /** Start phase 0..1. Default: seeded random per unison voice; a single voice starts at its zero crossing. */
  phase?: number;
}

export interface Adsr {
  /** Seconds (linear). */
  attack: number;
  /** Seconds to fall 60 dB toward the sustain level. */
  decay: number;
  /** 0..1 */
  sustain: number;
  /** Seconds to fall 60 dB once the note's held length is over. */
  release: number;
}

export interface Filter {
  mode?: "lowpass" | "highpass" | "bandpass";
  /** dB per octave (default 24). */
  slope?: 12 | 24;
  /** Cutoff in Hz, at C4 when key tracking. */
  cutoff: number;
  /** 0..1: none to a sharp, singing peak (default 0). */
  resonance?: number;
  /** 0..1: how far the cutoff follows the note, from C4 (1: it moves with the pitch). */
  keyTrack?: number;
  /** Octaves the filter envelope adds at its peak (negative sweeps down). */
  envAmount?: number;
  env?: Adsr;
  /** Octaves added at velocity 1 (taken away below 0.7): accents open the filter. */
  velocity?: number;
}

export interface Lfo {
  /** Hz (beatHz() gives tempo-synced rates). */
  rate: number;
  shape?: "sine" | "triangle" | "square" | "saw";
  /** Where in its cycle it starts, 0..1 (default 0; 0.25 starts a sine at its peak, where it moves slowest). */
  phase?: number;
  /** Seconds before it starts, then seconds to fade in (delayed vibrato). */
  delay?: number;
  fade?: number;
  /** Vibrato depth, cents. */
  pitch?: number;
  /** Filter wobble depth, octaves. */
  cutoff?: number;
  /** Pulse-width modulation depth (added to each pulse's width, ±). */
  pwm?: number;
  /** Tremolo depth 0..1. */
  amp?: number;
}

/** Sweeps over the note's held length, for risers and downlifters. */
export interface Ramp {
  /** Semitones the pitch moves by the end of the held length. */
  pitch?: number;
  /** Octaves the cutoff moves. */
  cutoff?: number;
  /** 0..1: the level rises from 1 - amp to 1. */
  amp?: number;
  /** Exponent on the ramp's progress (default 1; 2 starts slow and rushes at the end). */
  curve?: number;
}

export interface VoicePatch {
  kind: "voice";
  osc: Osc[];
  /** A centered sub-oscillator one or two octaves down. */
  sub?: { level: number; octave?: 1 | 2; wave?: "sine" | "square" };
  /** Saturation before the filter (tanh; 1 = gentle, 4 = gritty). */
  drive?: number;
  filter?: Filter;
  /**
   * Saturation after the filter (tanh, scaled like `drive`): the swept, resonant tone itself
   * distorts, the French-electro grit that a drive before the filter would have filtered away.
   */
  fuzz?: number;
  amp: Adsr;
  lfos?: Lfo[];
  ramp?: Ramp;
  /** A fixed 12 dB high-pass after the filter, in Hz (keeps pads and plucks out of the bass). */
  highpass?: number;
  /** One voice at a time: overlapping or touching notes play legato (no retrigger) and glide. */
  mono?: boolean;
  /** Mono only: seconds a legato note takes to slide to its pitch. */
  glide?: number;
  gain?: number;
  /** The register the patch is voiced for, and the note its level and tuning are checked at. */
  range: [string, string];
  home: string;
}

/** Kick, snare and toms: a sine body whose pitch drops, a filtered noise skin and a beater click. */
export interface MembranePatch {
  kind: "membrane";
  /** Settled body pitch in Hz. */
  freq: number;
  /** The pitch starts this many times higher and falls with time constant `sweepTime` (seconds). */
  sweep: number;
  sweepTime: number;
  /** Seconds the body holds full level before it decays. */
  hold?: number;
  /** Body: seconds to fall 60 dB. */
  decay: number;
  /** A second body mode (snare shell, tom overtone): [ratio to the body pitch, level]. */
  mode2?: [number, number];
  /** Noise skin level, its decay (seconds to -60 dB) and band [high-pass Hz, low-pass Hz]. */
  noise?: number;
  noiseDecay?: number;
  noiseBand?: [number, number];
  /** Beater click level (a few ms of bright noise). */
  click?: number;
  drive?: number;
}

/** Hand clap: a few noise bursts a few ms apart, then a short room tail. */
export interface ClapPatch {
  kind: "clap";
  /** Band-pass center Hz and Q. */
  tone: number;
  q: number;
  bursts: number;
  /** Seconds between bursts. */
  spacing: number;
  /** Tail level and its decay (seconds to -60 dB). */
  tail: number;
  decay: number;
  /** 0..1: how differently the two channels clap. */
  width?: number;
}

/** Hats and cymbals: six square partials (the analog machines' metal) plus noise, band-passed. */
export interface MetalPatch {
  kind: "metal";
  /** Scales the square partials' pitches. */
  tune: number;
  /** Band-pass center Hz and Q, then a 24 dB high-pass. */
  tone: number;
  q?: number;
  hp: number;
  /** 0..1: noise against the square partials. */
  noise: number;
  /** Seconds to fall 60 dB. */
  decay: number;
  /** 0..1: stereo width (each side gets its own noise). */
  width?: number;
}

export type DrumPatch = (MembranePatch | ClapPatch | MetalPatch) & {
  gain?: number;
  /** Seconds the hit fades in (default 0.5 ms: as sharp as a hit gets without a digital click). */
  attack?: number;
  /** Seconds to fall 60 dB when choked (the note's `ring` ends). Default 0.05. */
  release?: number;
  /** Follow the note's pitch from C4 (tuned toms or kicks). Otherwise every note sounds the same. */
  keyed?: boolean;
};

// ---- Sound effects (Halloween's haunted fun house): sounds no recording covers, each rendered
// whole per note like a drum hit, but held for the note's length (or its `ring`). Unpitched
// ones ignore the note unless they say otherwise; all are deterministic from the note's start.

/** A vowel formant: center Hz, bandwidth in octaves, level. */
export type Formant = [number, number, number];

/**
 * A howl (a wolf's, a werewolf's): a voice-like tone, additive harmonics shaped by vowel
 * formants, that scoops up into the note, holds it with a slow wander and a vibrato that grows,
 * and falls away over its release as the mouth closes again, with breath noise through the same
 * formants. The note is the pitch it holds; the held length is the howl before the fall.
 */
export interface HowlPatch {
  kind: "howl";
  /**
   * Semitones below the note it starts from, and seconds to rise most of the way; the last
   * `climb` share of the scoop (0..1, default 0.15) comes twice as slowly, a howl's last creep
   * up into its note.
   */
  scoop: number;
  rise: number;
  climb?: number;
  /** Semitones it falls by the end of its release, and the release in seconds. */
  fall: number;
  release: number;
  /** Seconds to swell in. */
  attack: number;
  /** Vibrato rate (Hz) and depth (cents), growing in from `vibratoDelay` over 0.8 s. */
  vibrato: [number, number];
  vibratoDelay?: number;
  /** Slow pitch wander, cents (three slow, seeded sines). */
  wander?: number;
  /** Cycle-to-cycle roughness: pitch jitter in cents and level shimmer 0..1. */
  jitter?: number;
  /** Vowel formants with the mouth closed ("oo") and open ("aw"); the same number of each. */
  closed: Formant[];
  open: Formant[];
  /**
   * How open the mouth is (0..1) while it holds the note: it starts a little open, opens wide
   * early in the scoop ("a-"), closes to this into the held "-WOOO" and shuts through the fall.
   */
  hold?: number;
  /** Harmonic roll-off: harmonic k's level is k^-tilt before the formants. */
  tilt: number;
  /** Breath noise through the first two formants, against the voice; louder at the onset and in the fall. */
  breath: number;
  /** A rough growl at the onset: level modulation depth 0..1 at about 30 Hz, gone in half a second. */
  growl?: number;
}

/** Wind: a whoosh of band-limited noise and a resonant whistle that rises as the gust swells. */
export interface WindPatch {
  kind: "wind";
  /** The whistle: resonance Q and level against the whoosh; a second resonance [ratio, level]. */
  q: number;
  whistle: number;
  overtone?: [number, number];
  /** Semitones the whistle sits under the note at the gust's start and end (it reaches the note at the peak). */
  rise: number;
  /** The whoosh's band: [high-pass Hz, low-pass Hz]. */
  band: [number, number];
  /** Where in the held length the gust peaks, 0..1. */
  peak: number;
  /** Slow gusting of level and pitch inside the swell, 0..1. */
  flutter: number;
  /** The gust blows across: pan at its start and at its end (-1..1). */
  sweep?: [number, number];
  release: number;
}

/** A snake's hiss: high-passed noise with a peak, a quick onset, a breathy flutter, fading as the breath runs out. */
export interface HissPatch {
  kind: "hiss";
  /** Peak Hz and Q, the high-pass under it (24 dB), the low-pass over it (12 dB), and the peak's share (0..1) against the broad noise. */
  tone: number;
  q: number;
  hp: number;
  lp: number;
  peak: number;
  attack: number;
  release: number;
  /** Level at the end of the held length against its start. */
  fade?: number;
  /** Random level flutter, 0..1. */
  flutter?: number;
  /** Semitones the peak rises over the held length. */
  bend?: number;
  /** 0..1: how differently the two channels hiss. */
  width?: number;
}

/** A rattlesnake's rattle: a fast, irregular train of dry clicks through a bright band. */
export interface RattlePatch {
  kind: "rattle";
  /** Clicks per second, each interval's random variation (0..1) and the rate's slow drift (0..1). */
  rate: number;
  jitter: number;
  drift?: number;
  /** Each click's decay (seconds to fall 60 dB). */
  click: number;
  /** Band-pass Hz and Q, between a high-pass (24 dB) and a low-pass (12 dB). */
  tone: number;
  q: number;
  hp: number;
  lp: number;
  attack: number;
  release: number;
  width?: number;
}

/** Chains: a shake of metal links clinking, small inharmonic rings at random pitches and times. */
export interface ChainsPatch {
  kind: "chains";
  /** Clinks per second over the held length; `cluster` (0..1) bunches them into rattles. */
  density: number;
  cluster: number;
  /** Each clink's lowest ring, between these Hz, its partials (ratios, levels) and decay (seconds to -60 dB). */
  pitch: [number, number];
  partials: [number, number][];
  decay: number;
  /** Share of heavy links (clanks two octaves down, ringing longer). */
  heavy?: number;
  /** Stereo spread of the links, 0..1. */
  width?: number;
}

export type EffectPatch = (HowlPatch | WindPatch | HissPatch | RattlePatch | ChainsPatch) & { gain?: number };

export type Patch = VoicePatch | DrumPatch | EffectPatch;

const EFFECT_KINDS = new Set<string>(["howl", "wind", "hiss", "rattle", "chains"]);
/** True for a sound-effect patch (rendered per note, held for the note's length). */
export function isEffect(p: Patch): p is EffectPatch {
  return EFFECT_KINDS.has(p.kind);
}

const env = (attack: number, decay: number, sustain: number, release: number): Adsr => ({ attack, decay, sustain, release });

/** The square partials of the analog hats and cymbals (Hz). */
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

export const SYNTHS = {
  // ---- Leads, pads, chords
  /** The big detuned stack: pumping chords and anthem leads. */
  superSaw: {
    kind: "voice",
    osc: [
      { wave: "saw", voices: 7, detune: 40, spread: 0.85 },
      { wave: "saw", voices: 3, detune: 22, spread: 0.6, semi: 12, level: 0.25 },
    ],
    // Open (6.5 kHz at C4): the stack keeps its fizz above 5 kHz, as the genre's chords and
    // anthem leads do; superSawPad is the dark, filtered one.
    filter: { cutoff: 6500, resonance: 0.1, keyTrack: 0.3, envAmount: 0.5, env: env(0.004, 0.9, 0.3, 0.3) },
    amp: env(0.006, 0.4, 0.85, 0.3),
    highpass: 140,
    gain: 0.0963,
    range: ["C3", "C6"],
    home: "C4",
  },
  /** The super saw as a slow, dark pad that breathes. */
  superSawPad: {
    kind: "voice",
    osc: [
      { wave: "saw", voices: 7, detune: 34, spread: 0.9 },
      { wave: "saw", voices: 3, detune: 18, spread: 0.7, semi: 12, level: 0.2 },
    ],
    filter: { cutoff: 1500, resonance: 0.12, keyTrack: 0.3, envAmount: 0.5, env: env(0.6, 1.5, 0.4, 1.2) },
    lfos: [{ rate: 0.15, cutoff: 0.35, shape: "triangle" }],
    amp: env(0.35, 1, 0.9, 1.2),
    highpass: 180,
    gain: 0.129,
    range: ["C3", "C6"],
    home: "C4",
  },
  /** A singing mono saw lead: glides on legato notes, delayed vibrato. */
  sawLead: {
    kind: "voice",
    mono: true,
    glide: 0.06,
    osc: [
      { wave: "saw", voices: 3, detune: 16, spread: 0.35 },
      { wave: "pulse", semi: -12, level: 0.4 },
    ],
    filter: { cutoff: 1600, resonance: 0.2, keyTrack: 0.7, envAmount: 1.6, env: env(0.002, 0.35, 0.35, 0.2), velocity: 0.5 },
    lfos: [{ rate: 5.2, pitch: 14, delay: 0.4, fade: 0.4 }],
    amp: env(0.003, 0.3, 0.85, 0.12),
    gain: 0.0821,
    range: ["C4", "C6"],
    home: "C5",
  },
  /** A hollow pulse lead, the width slowly turning (PWM). */
  squareLead: {
    kind: "voice",
    mono: true,
    glide: 0.04,
    osc: [
      { wave: "pulse", width: 0.5 },
      { wave: "pulse", width: 0.3, voices: 2, detune: 12, spread: 0.5, level: 0.6 },
    ],
    filter: { cutoff: 2600, resonance: 0.1, keyTrack: 0.6, envAmount: 1, env: env(0.002, 0.4, 0.5, 0.2) },
    lfos: [
      { rate: 0.6, pwm: 0.3, shape: "triangle" },
      { rate: 5.5, pitch: 12, delay: 0.4, fade: 0.4 },
    ],
    amp: env(0.003, 0.2, 0.8, 0.15),
    gain: 0.0561,
    range: ["C4", "C6"],
    home: "C5",
  },
  /** The arp pluck: a bright snap that closes fast. */
  pluck: {
    kind: "voice",
    osc: [
      { wave: "saw", voices: 3, detune: 14, spread: 0.6 },
      { wave: "pulse", width: 0.3, level: 0.4 },
    ],
    // 12 dB, and closing no lower than about 5x the pitch: a steeper or deeper sweep drags the
    // fundamental's phase as it passes, and the snap is heard a few cents flat.
    filter: { slope: 12, cutoff: 1300, resonance: 0.2, keyTrack: 1, envAmount: 3, env: env(0, 0.28, 0, 0.2), velocity: 0.8 },
    amp: env(0.001, 0.55, 0, 0.2),
    highpass: 180,
    gain: 0.298,
    range: ["C4", "C6"],
    home: "C5",
  },
  /** A house organ stab (drawbar sines, a key click): offbeat chords. */
  chordStab: {
    kind: "voice",
    osc: [
      { wave: "sine" },
      { wave: "sine", semi: 12, level: 0.55 },
      { wave: "sine", semi: 19.02, level: 0.35 },
      { wave: "sine", semi: 24, level: 0.25 },
      { wave: "triangle", semi: 36, level: 0.15, decay: 0.03 },
      { wave: "saw", level: 0.1 },
    ],
    filter: { slope: 12, cutoff: 4000, keyTrack: 0.4 },
    amp: env(0.002, 0.5, 0.2, 0.12),
    gain: 0.168,
    range: ["C3", "C5"],
    home: "C4",
  },
  /** Bell sparkle on top: inharmonic sine partials that die away faster the higher they are. */
  bell: {
    kind: "voice",
    osc: [
      { wave: "sine" },
      { wave: "sine", semi: 12, level: 0.45, decay: 0.9 },
      { wave: "sine", semi: 17.55, level: 0.3, decay: 0.45 },
      { wave: "sine", semi: 27.94, level: 0.18, decay: 0.18 },
      { wave: "triangle", semi: 24, level: 0.1, decay: 0.06 },
    ],
    amp: env(0.001, 1.6, 0, 0.35),
    highpass: 250,
    gain: 0.14,
    range: ["C5", "C7"],
    home: "C6",
  },

  // ---- Basses
  /** The deep sub: a sine with a little filtered saw, so phones still hear it. */
  subBass: {
    kind: "voice",
    mono: true,
    glide: 0.03,
    osc: [{ wave: "sine" }, { wave: "saw", level: 0.25 }],
    filter: { cutoff: 780, keyTrack: 1 },
    amp: env(0.002, 0.2, 1, 0.05),
    gain: 0.083,
    range: ["E1", "E3"],
    home: "C2",
  },
  /** Reese: detuned saws beating against each other, the filter slowly turning. */
  reeseBass: {
    kind: "voice",
    mono: true,
    osc: [{ wave: "saw", voices: 2, detune: 24 }, { wave: "sine", level: 0.6 }],
    drive: 1.8,
    filter: { cutoff: 1500, resonance: 0.25, keyTrack: 0.8 },
    lfos: [{ rate: 0.25, cutoff: 0.5, phase: 0.25 }],
    amp: env(0.004, 0.3, 1, 0.08),
    gain: 0.141,
    range: ["C1", "C3"],
    home: "E2",
  },
  /** Acid: one saw into a squelchy resonant filter; accents (velocity) open it, legato slides. */
  acidBass: {
    kind: "voice",
    mono: true,
    glide: 0.05,
    osc: [{ wave: "saw" }],
    drive: 2,
    // A deep sweep (3.4 octaves, 0.5 s to -60 dB: the resonant peak is still singing 30 ms into
    // a sixteenth) that ends at about three times the pitch. A slower one, or one closing lower,
    // drags the partials' phase as it passes and the note is heard flat (the tuning test).
    filter: { cutoff: 450, resonance: 0.72, keyTrack: 0.4, envAmount: 3.4, env: env(0, 0.5, 0, 0.1), velocity: 1.4 },
    amp: env(0.002, 0.4, 0.8, 0.05),
    gain: 0.141,
    range: ["A1", "A3"],
    home: "A2",
  },
  /** French electro bass: detuned saws driven into a snappy resonant filter, then fuzzed (the grit lives above 3 kHz). */
  electroBass: {
    kind: "voice",
    mono: true,
    osc: [
      { wave: "saw", voices: 2, detune: 14 },
      { wave: "saw", semi: 12, level: 0.3 },
    ],
    drive: 4,
    filter: { cutoff: 1300, resonance: 0.45, keyTrack: 0.5, envAmount: 2.2, env: env(0.001, 0.3, 0.35, 0.1) },
    fuzz: 5,
    amp: env(0.002, 0.25, 0.7, 0.06),
    gain: 0.483,
    range: ["A1", "A3"],
    home: "A2",
  },

  // ---- Effects
  /** Riser: noise and saws sweeping up over the note's held length (write it as long as the build). */
  riser: {
    kind: "voice",
    osc: [
      { wave: "noise", level: 0.8 },
      { wave: "saw", voices: 5, detune: 50, spread: 0.9, level: 0.35 },
    ],
    filter: { slope: 12, cutoff: 300, resonance: 0.45 },
    ramp: { cutoff: 5.2, pitch: 12, amp: 0.95, curve: 2 },
    amp: env(0.01, 0.1, 1, 0.3),
    highpass: 250,
    gain: 0.123,
    range: ["C3", "C5"],
    home: "C4",
  },
  /** Downlifter: a noise wash falling away after the drop (its held length sets the sweep). */
  downlifter: {
    kind: "voice",
    osc: [{ wave: "noise" }],
    filter: { slope: 12, cutoff: 9000, resonance: 0.3 },
    ramp: { cutoff: -5.5, curve: 0.6 },
    amp: env(0.002, 2.5, 0, 0.3),
    highpass: 200,
    gain: 0.207,
    range: ["C4", "C4"],
    home: "C4",
  },

  // ---- Drum machine ("dm"): one sound per patch, the note is ignored unless `keyed`
  // A house kick: the body drops from 325 Hz to 50 Hz in a few tens of ms (time constant 12 ms;
  // a slower drop booms like a tom), with a beater click a phone speaker can play.
  dmKick: { kind: "membrane", freq: 50, sweep: 6.5, sweepTime: 0.012, hold: 0.012, decay: 0.42, click: 0.7, drive: 1.8, gain: 0.38 },
  dmSnare: {
    kind: "membrane", freq: 185, sweep: 1.3, sweepTime: 0.015, decay: 0.11, mode2: [1.72, 0.5],
    noise: 1.6, noiseDecay: 0.24, noiseBand: [1200, 9500], click: 0.25, drive: 1.3, gain: 0.34,
  },
  dmClap: { kind: "clap", tone: 1150, q: 1.4, bursts: 4, spacing: 0.0095, tail: 0.55, decay: 0.32, width: 0.6, gain: 0.938 },
  dmHat: { kind: "metal", tune: 1, tone: 9500, q: 0.9, hp: 7000, noise: 0.45, decay: 0.055, attack: 0.0003, width: 0.3, gain: 0.417 },
  dmHatOpen: { kind: "metal", tune: 1, tone: 9500, q: 0.9, hp: 7000, noise: 0.45, decay: 0.42, attack: 0.0003, width: 0.3, gain: 0.334 },
  dmRide: { kind: "metal", tune: 1.32, tone: 7200, q: 1.1, hp: 4000, noise: 0.22, decay: 1.5, attack: 0.0003, width: 0.35, gain: 0.382 },
  dmCrash: { kind: "metal", tune: 1.08, tone: 5200, q: 0.6, hp: 2400, noise: 0.7, decay: 2.4, attack: 0.0015, width: 0.7, gain: 0.139 },
  dmTomHigh: {
    kind: "membrane", freq: 190, sweep: 1.6, sweepTime: 0.04, decay: 0.42, mode2: [1.5, 0.2],
    noise: 0.12, noiseDecay: 0.05, noiseBand: [400, 5000], click: 0.12, gain: 0.263,
  },
  dmTomMid: {
    kind: "membrane", freq: 145, sweep: 1.6, sweepTime: 0.045, decay: 0.5, mode2: [1.5, 0.2],
    noise: 0.12, noiseDecay: 0.05, noiseBand: [350, 4500], click: 0.12, gain: 0.264,
  },
  dmTomLow: {
    kind: "membrane", freq: 105, sweep: 1.6, sweepTime: 0.05, decay: 0.6, mode2: [1.5, 0.2],
    noise: 0.12, noiseDecay: 0.05, noiseBand: [300, 4000], click: 0.12, gain: 0.268,
  },

  // ---- Sound effects (the haunted fun house). Levels (gain 1, velocity 0.7): about -28 dB RMS
  // over a 2 s note (the howl over its held part), like the voices.
  /**
   * The werewolf: "hoo-AWOOOO-oo". A breathy, growling onset scooping up a fifth into the note,
   * the mouth opening from "oo" to "aw" as it climbs (the 2nd harmonic comes up), a vibrato that
   * grows while it holds, then a long fall of most of an octave as the mouth closes. Write the
   * note it holds and the length it holds it; the fall rings on for `release` after.
   */
  howl: {
    kind: "howl",
    scoop: 7,
    rise: 0.45,
    climb: 0.12,
    fall: 10,
    release: 1.6,
    attack: 0.16,
    vibrato: [5.3, 22],
    vibratoDelay: 0.5,
    wander: 8,
    jitter: 3,
    closed: [[350, 0.7, 1], [850, 0.6, 0.6], [2500, 0.6, 0.18]],
    open: [[680, 0.6, 1], [1100, 0.5, 0.7], [2600, 0.5, 0.2]],
    hold: 0.25,
    tilt: 0.9,
    breath: 3,
    growl: 0.35,
    gain: 0.0835,
  },
  /** A gust of wind: a whoosh and a whistle that rises to the note at the gust's peak, blowing across. */
  wind: {
    kind: "wind",
    q: 22,
    whistle: 1.6,
    overtone: [1.51, 0.3],
    rise: 7,
    band: [150, 900],
    peak: 0.5,
    flutter: 0.6,
    sweep: [-0.6, 0.6],
    release: 1,
    gain: 0.378,
  },
  /** A snake's hiss: "sssss" around 5.5 kHz, fading as its breath runs out. */
  hiss: {
    kind: "hiss",
    tone: 5500,
    q: 1.8,
    hp: 2800,
    lp: 8000,
    peak: 0.5,
    attack: 0.05,
    release: 0.25,
    fade: 0.6,
    flutter: 0.25,
    bend: 1.5,
    width: 0.25,
    gain: 0.318,
  },
  /** A rattlesnake's rattle: about 58 dry clicks a second, never quite even. */
  rattle: {
    kind: "rattle",
    rate: 58,
    jitter: 0.35,
    drift: 0.3,
    click: 0.012,
    tone: 6000,
    q: 1.5,
    hp: 3000,
    lp: 9000,
    attack: 0.04,
    release: 0.15,
    width: 0.3,
    gain: 1.51,
  },
  /** Chains shaken in the dark: small iron links clinking, now and then a heavy one. */
  chains: {
    kind: "chains",
    density: 18,
    cluster: 0.6,
    pitch: [1800, 3600],
    partials: [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.15]],
    decay: 0.09,
    heavy: 0.12,
    width: 0.6,
    gain: 0.163,
  },
} satisfies Record<string, Patch>;

export type SynthName = keyof typeof SYNTHS;

/** True for a synth patch name (none collide with instruments.ts names). */
export function isSynth(name: string): name is SynthName {
  return Object.hasOwn(SYNTHS, name);
}

export function synth(name: SynthName): Patch {
  return SYNTHS[name];
}

// ---------------------------------------------------------------- tempo

/** Seconds in `n` beats at `bpm` (delay times: beats(bpm, 0.75) is a dotted eighth). */
export const beats = (bpm: number, n: number): number => (n * 60) / bpm;
/** An LFO rate that cycles once every `n` beats. */
export const beatHz = (bpm: number, n: number): number => bpm / 60 / n;

// ---------------------------------------------------------------- building blocks

/** A 32-bit hash of integers (seeds). Never 0. */
function hash(...xs: number[]): number {
  let h = 0x811c9dc5;
  for (const x of xs) {
    h = Math.imul(h ^ (x | 0), 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  return h >>> 0 || 1;
}

/** Seeded white noise in [-1, 1) (xorshift32). */
class Noise {
  private s: number;
  constructor(seed: number) {
    this.s = seed | 0 || 1;
  }
  next(): number {
    let s = this.s;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.s = s;
    return s / 2147483648;
  }
  /** Uniform in [0, 1). */
  unit(): number {
    return this.next() * 0.5 + 0.5;
  }
}

/** PolyBLEP residual for a unit-phase oscillator at phase t (step of +2 at t = 0). */
function blep(t: number, dt: number): number {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** PolyBLAMP residual (the integrated polyBLEP) for a corner at phase 0, per unit slope change per sample. */
function blamp(t: number, dt: number): number {
  if (t < dt) {
    const x = 1 - t / dt;
    return (x * x * x) / 6;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt + 1;
    return (x * x * x) / 6;
  }
  return 0;
}

const LOW = 0;
const HIGH = 1;
const BAND = 2;

/** Topology-preserving state-variable filter (Zavalishin / Simper): stable under fast modulation. */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private k = 1;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  /** g = tan(pi * fc / rate); k = 1 / Q. */
  set(g: number, k: number): void {
    this.k = k;
    this.a1 = 1 / (1 + g * (g + k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  setHz(fc: number, q: number, rate: number): void {
    this.set(Math.tan((Math.PI * Math.min(fc, rate * 0.45)) / rate), 1 / q);
  }
  run(x: number, mode: number): number {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    return mode === LOW ? v2 : mode === HIGH ? x - this.k * v1 - v2 : this.k * v1;
  }
}

/** Q at resonance 0 and 1: a 12 dB stage, and the two stages of a 24 dB (Butterworth at 0). */
const Q12 = [Math.SQRT1_2, 16];
const Q24A = 0.5412;
const Q24B = [1.3066, 16];

/** One channel of a patch's filter (one or two SVF stages). */
class Vcf {
  private a = new Svf();
  private b = new Svf();
  private readonly mode: number;
  private readonly two: boolean;
  private readonly kA: number;
  private readonly kB: number;
  constructor(f: Filter) {
    this.mode = f.mode === "highpass" ? HIGH : f.mode === "bandpass" ? BAND : LOW;
    this.two = (f.slope ?? 24) === 24;
    const res = Math.min(1, Math.max(0, f.resonance ?? 0));
    const q = (range: number[]) => range[0]! * (range[1]! / range[0]!) ** res;
    // A 24 dB band-pass is two equal stages; its resonance lives in both.
    this.kA = 1 / (this.two ? (this.mode === BAND ? q(Q12) : Q24A) : q(Q12));
    this.kB = 1 / (this.mode === BAND ? q(Q12) : q(Q24B));
  }
  set(g: number): void {
    this.a.set(g, this.kA);
    if (this.two) this.b.set(g, this.kB);
  }
  run(x: number): number {
    const y = this.a.run(x, this.mode);
    return this.two ? this.b.run(y, this.mode) : y;
  }
}

/** ADSR, advanced one frame per next(). Linear attack, exponential decay and release. */
class Env {
  level = 0;
  /** 0 attack, 1 decay/sustain, 2 release. */
  stage = 0;
  private readonly up: number;
  private readonly down: number;
  private rel: number;
  readonly sustain: number;
  constructor(e: Adsr, rate: number, minAttack: number) {
    this.up = 1 / Math.max(1, Math.max(minAttack, e.attack) * rate);
    this.down = t60(e.decay, rate);
    this.rel = t60(e.release, rate);
    this.sustain = e.sustain;
  }
  next(): number {
    if (this.stage === 0) {
      this.level += this.up;
      if (this.level >= 1) {
        this.level = 1;
        this.stage = 1;
      }
    } else if (this.stage === 1) this.level = this.sustain + (this.level - this.sustain) * this.down;
    else this.level *= this.rel;
    return this.level;
  }
  release(): void {
    this.stage = 2;
  }
  /** Release now, at this coefficient (faster than the patch's). */
  cut(coef: number): void {
    this.stage = 2;
    this.rel = Math.min(this.rel, coef);
  }
  /** Silent from here on: released (or decayed to a zero sustain) below -80 dB. */
  get done(): boolean {
    return (this.stage === 2 || (this.stage === 1 && this.sustain === 0)) && this.level < SILENT;
  }
}

function lfoValue(shape: Lfo["shape"], phase: number): number {
  switch (shape) {
    case "triangle":
      return phase < 0.25 ? 4 * phase : phase < 0.75 ? 2 - 4 * phase : 4 * phase - 4;
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "saw":
      return 1 - 2 * phase;
    default:
      return Math.sin(TAU * phase);
  }
}

/** Unison voice positions in -1..1, spaced wider toward the outside (like the JP-8000 super saw). */
function unison(n: number): number[] {
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => {
    const x = -1 + (2 * i) / (n - 1);
    return Math.sign(x) * Math.abs(x) ** 1.4;
  });
}

/** Equal-power gains for pan -1..1, 1 each at center (as sampler.ts pans). */
function panGains(pan: number): [number, number] {
  return [Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2];
}

// ---------------------------------------------------------------- rendering

/**
 * Render notes into stereo buffers at `rate`, as sampler.ts renderNotes() does: `pan` is -1..1
 * (equal-power), velocity scales level by 0.35 + 0.65 * vel, and anything ringing past the end
 * wraps to the start, for loops. Drum patches ring out (a note's `dur` is ignored) unless its
 * `ring` chokes them; voices hold for `dur` (or `ring`, if shorter) and then release.
 */
export function renderSynth(
  patch: Patch | SynthName,
  events: NoteEvent[],
  outL: Float32Array,
  outR: Float32Array,
  rate: number,
  gain: number,
  pan: number,
): void {
  const p: Patch = typeof patch === "string" ? SYNTHS[patch] : patch;
  const [pl, pr] = panGains(pan);
  const salt = saltOf(p);
  if (p.kind === "voice") {
    for (const ph of phrases(p, events, outL.length / rate)) renderPhrase(p, ph, outL, outR, rate, gain * pl, gain * pr, salt);
  } else if (isEffect(p)) {
    for (const ev of events) renderEffect(p, ev, outL, outR, rate, gain * pl, gain * pr, salt);
  } else {
    for (const ev of events) renderHit(p, ev, outL, outR, rate, gain * pl, gain * pr, salt);
  }
}

const salts = new WeakMap<Patch, number>();
/**
 * A seed per patch (from its settings, leaving out its gain so re-leveling it doesn't change its
 * sound), so two different patches struck on the same note at the same moment (a clap on a
 * snare, a pluck layered on a stack) get their own noise and unison phases instead of identical,
 * fully correlated ones.
 */
function saltOf(p: Patch): number {
  let s = salts.get(p);
  if (s === undefined) {
    const text = JSON.stringify(p, (key, value: unknown) => (key === "gain" ? undefined : value));
    s = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) s = Math.imul(s ^ text.charCodeAt(i), 0x01000193);
    s >>>= 0;
    salts.set(p, s);
  }
  return s;
}

interface Step {
  /** Seconds from the phrase start. */
  at: number;
  note: number;
  vel: number;
}

/** What one voice plays: a note, or (mono) a legato run of notes. Times in seconds. */
interface Phrase {
  time: number;
  /** How long the gate is held. */
  held: number;
  steps: Step[];
  /** Mono: the next phrase starts here, cutting this one's tail. */
  cut: number;
}

const heldOf = (e: NoteEvent) => Math.max(0, Math.min(e.dur, e.ring ?? Infinity));

/**
 * Group notes into voices: one per note, or for mono patches legato runs, each cut by the next.
 * A mono line also runs on across the loop end (`loop` seconds, the buffer's length) into its
 * own start, as it does between any two of its notes: a last phrase that reaches the first
 * one's next pass slides into it (the first is then played as its continuation, through the
 * wrap), and otherwise that next pass cuts it. A line that is one unbroken legato phrase
 * retriggers at the loop start.
 */
function phrases(p: VoicePatch, events: NoteEvent[], loop: number): Phrase[] {
  if (!p.mono) return events.map((e) => ({ time: e.time, held: heldOf(e), steps: [{ at: 0, note: e.note, vel: e.vel }], cut: Infinity }));
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const out: Phrase[] = [];
  let cur: Phrase | null = null;
  const legato = (ph: Phrase, at: number) => at > ph.steps[ph.steps.length - 1]!.at && at <= ph.held + LEGATO;
  for (const e of sorted) {
    if (cur && legato(cur, e.time - cur.time)) {
      cur.steps.push({ at: e.time - cur.time, note: e.note, vel: e.vel });
      cur.held = e.time - cur.time + heldOf(e);
      continue;
    }
    if (cur) cur.cut = e.time - cur.time;
    cur = { time: e.time, held: heldOf(e), steps: [{ at: 0, note: e.note, vel: e.vel }], cut: Infinity };
    out.push(cur);
  }
  // The loop seam (only when every note lies inside the loop, as a song's do).
  if (out.length && sorted[0]!.time >= 0 && sorted[sorted.length - 1]!.time < loop) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    const next = first.time + loop - last.time;
    if (out.length > 1 && legato(last, next)) {
      for (const s of first.steps) last.steps.push({ ...s, at: s.at + next });
      last.held = next + first.held;
      last.cut = next + first.cut;
      out.shift();
    } else {
      last.cut = Math.min(last.cut, next);
    }
  }
  return out;
}

const SAW = 0;
const PULSE = 1;
const TRI = 2;
const SINE = 3;
const NOISE = 4;
const WAVE: Record<Wave, number> = { saw: SAW, pulse: PULSE, triangle: TRI, sine: SINE, noise: NOISE };

/** Render one voice (a note, or a mono legato run) into the buffers with wrap; gl/gr include gain and pan. */
function renderPhrase(p: VoicePatch, ph: Phrase, outL: Float32Array, outR: Float32Array, rate: number, gl: number, gr: number, salt: number): void {
  const len = outL.length;
  const startAbs = Math.round(ph.time * rate);
  let o = ((startAbs % len) + len) % len;
  const first = ph.steps[0]!;
  const rnd = new Noise(hash(startAbs, Math.round(first.note * 1000), 0x5157, salt));

  // Oscillators, flattened to one entry per unison voice.
  const oscs: Osc[] = [...p.osc];
  if (p.sub) oscs.push({ wave: p.sub.wave === "square" ? "pulse" : "sine", semi: -12 * (p.sub.octave ?? 1), level: p.sub.level });
  const waves: number[] = [];
  const ratio: number[] = [];
  const phase: number[] = [];
  const vgl: number[] = [];
  const vgr: number[] = [];
  const width: number[] = [];
  const fall: number[] = [];
  let stereo = false;
  // Every oscillator starts as if they all began at one moment (a shared offset, in cycles of
  // the note): on a zero crossing for patches without unison, at a seeded point for stacks.
  // Each detuned pair then sits symmetrically about its center, in Hz and in start phase, so a
  // stack sums (in mono) to the center pitch with a beating level, never a wavering pitch: it
  // reads and is heard in tune. Each stereo side, holding half of each pair, still swirls.
  const stack = oscs.some((o) => o.wave !== "noise" && (o.voices ?? 1) > 1);
  const together = stack ? rnd.unit() : 0;
  for (const osc of oscs) {
    const n = osc.wave === "noise" ? 1 : Math.max(1, Math.round(osc.voices ?? 1));
    const pos = unison(n);
    const spread = n > 1 ? (osc.spread ?? 0) : 0;
    if (spread > 0) stereo = true;
    const level = (osc.level ?? 1) / Math.sqrt(n);
    const spreadHz = 2 ** ((osc.detune ?? 0) / 2400) - 1;
    const tune = 2 ** (((osc.semi ?? 0) * 100 + (osc.cents ?? 0)) / 1200);
    const center = osc.phase ?? tune * together;
    const offsets = Array.from({ length: Math.floor(n / 2) }, () => rnd.unit());
    for (let i = 0; i < n; i++) {
      const x = pos[i]!;
      // Detuned pairs go to opposite sides, alternating which side gets the sharp one.
      const j = Math.ceil(Math.abs(i - (n - 1) / 2));
      const side = x === 0 ? 0 : (j % 2 ? 1 : -1) * Math.sign(x);
      const [l, r] = panGains(spread * side * (n > 1 ? j / Math.floor(n / 2) : 0));
      waves.push(WAVE[osc.wave]);
      ratio.push(tune * (1 + x * spreadHz));
      const ph = x === 0 ? center : center + Math.sign(x) * offsets[j - 1]!;
      phase.push(ph - Math.floor(ph));
      vgl.push(l * level);
      vgr.push(r * level);
      width.push(osc.width ?? 0.5);
      fall.push(osc.decay ? t60(osc.decay, rate) : 1);
    }
  }
  const nv = waves.length;
  const dts = new Float64Array(nv);
  const widths = new Float64Array(width);
  const ph0 = new Float64Array(phase);
  const lv = new Float64Array(nv).fill(1);

  const amp = new Env(p.amp, rate, MIN_ATTACK);
  const f = p.filter;
  const fenv = f?.env ? new Env(f.env, rate, 0) : null;
  const vcfL = f ? new Vcf(f) : null;
  const vcfR = f && stereo ? new Vcf(f) : null;
  const hpL = p.highpass ? new Svf() : null;
  const hpR = p.highpass && stereo ? new Svf() : null;
  if (p.highpass) for (const h of [hpL, hpR]) h?.setHz(p.highpass, Math.SQRT1_2, rate);
  const drive = p.drive ?? 0;
  const fuzz = p.fuzz ?? 0;
  const lfos = p.lfos ?? [];
  const ramp = p.ramp;
  const gate = Math.max(1, Math.round(ph.held * rate));
  const cut = Number.isFinite(ph.cut) ? Math.max(0, Math.round(ph.cut * rate)) : Infinity;
  const cutCoef = t60(CUT, rate);
  const stepAt = ph.steps.map((s) => Math.round(s.at * rate));
  const glideFrames = Math.max(1, (p.glide ?? 0) * rate);
  const level = p.gain ?? 1;
  const maxFrames = gate + Math.round((p.amp.release * 2 + 30) * rate);

  let note = first.note;
  let target = note;
  let slide = 0;
  let vel = first.vel;
  let velNow = vel;
  let next = 1;

  for (let fr = 0; fr < maxFrames; fr += BLOCK) {
    // Legato steps: no retrigger; slide to the new pitch over the glide time.
    while (next < ph.steps.length && fr >= stepAt[next]!) {
      const s = ph.steps[next++]!;
      target = s.note;
      slide = p.glide ? Math.abs(target - note) / glideFrames : Infinity;
      vel = s.vel;
    }
    if (note !== target) {
      const d = slide * BLOCK;
      note = Math.abs(target - note) <= d ? target : note + Math.sign(target - note) * d;
    }
    velNow += (vel - velNow) * 0.2;

    const t = fr / rate;
    let cents = 0;
    let octs = 0;
    let pwm = 0;
    let trem = 1;
    for (const lfo of lfos) {
      const since = t - (lfo.delay ?? 0);
      if (since < 0) continue;
      const depth = lfo.fade ? Math.min(1, since / lfo.fade) : 1;
      const v = lfoValue(lfo.shape, (t * lfo.rate + (lfo.phase ?? 0)) % 1) * depth;
      cents += (lfo.pitch ?? 0) * v;
      octs += (lfo.cutoff ?? 0) * v;
      pwm += (lfo.pwm ?? 0) * v;
      if (lfo.amp) trem *= 1 - lfo.amp * depth * (0.5 - 0.5 * v);
    }
    let rampAmp = 1;
    let pitch = note + cents / 100;
    if (ramp) {
      const x = Math.min(1, t / Math.max(1e-6, ph.held)) ** (ramp.curve ?? 1);
      pitch += (ramp.pitch ?? 0) * x;
      octs += (ramp.cutoff ?? 0) * x;
      rampAmp = 1 - (ramp.amp ?? 0) * (1 - x);
    }
    const base = hz(pitch) / rate;
    for (let v = 0; v < nv; v++) {
      dts[v] = Math.min(0.45, base * ratio[v]!);
      widths[v] = Math.min(0.95, Math.max(0.05, width[v]! + pwm));
    }
    if (f && vcfL) {
      octs += (f.keyTrack ?? 0) * ((note - 60) / 12) + (f.envAmount ?? 0) * (fenv ? fenv.level : 0) + ((f.velocity ?? 0) * (velNow - 0.7)) / 0.3;
      const fc = Math.min(rate * 0.45, Math.max(16, f.cutoff * 2 ** octs));
      const g = Math.tan((Math.PI * fc) / rate);
      vcfL.set(g);
      vcfR?.set(g);
    }
    const gain = level * (0.35 + 0.65 * velNow) * trem * rampAmp;

    const end = Math.min(BLOCK, maxFrames - fr);
    for (let i = 0; i < end; i++) {
      const at = fr + i;
      if (at === gate) {
        amp.release();
        fenv?.release();
      }
      if (at === cut) amp.cut(cutCoef);
      let l = 0;
      let r = 0;
      for (let v = 0; v < nv; v++) {
        const pv = ph0[v]!;
        const dt = dts[v]!;
        const w = waves[v]!;
        let s: number;
        if (w === SAW) s = 2 * pv - 1 - blep(pv, dt);
        else if (w === PULSE) {
          // The high part is centered on a quarter cycle (a square's place), so changing the
          // width moves both edges and never the pitch (PWM doesn't wobble the tuning).
          const pw = widths[v]!;
          let t1 = pv - 0.25 + pw / 2;
          if (t1 < 0) t1 += 1;
          else if (t1 >= 1) t1 -= 1;
          let t2 = t1 - pw;
          if (t2 < 0) t2 += 1;
          s = (t1 < pw ? 1 : -1) + blep(t1, dt) - blep(t2, dt) + 1 - 2 * pw;
        } else if (w === TRI) {
          let t2 = pv + 0.5;
          if (t2 >= 1) t2 -= 1;
          s = 1 - 4 * Math.abs(pv - 0.5) + 8 * dt * (blamp(pv, dt) - blamp(t2, dt));
        } else if (w === SINE) s = Math.sin(TAU * pv);
        else s = rnd.next();
        let np = pv + dt;
        if (np >= 1) np -= 1;
        ph0[v] = np;
        const fl = fall[v]!;
        if (fl !== 1) {
          const k = lv[v]! * fl;
          lv[v] = k;
          s *= k;
        }
        l += s * vgl[v]!;
        r += s * vgr[v]!;
      }
      if (drive) {
        l = Math.tanh(l * drive) / drive;
        r = Math.tanh(r * drive) / drive;
      }
      if (vcfL) {
        l = vcfL.run(l);
        r = vcfR ? vcfR.run(r) : l;
      } else if (!stereo) r = l;
      if (fuzz) {
        l = Math.tanh(l * fuzz) / fuzz;
        r = Math.tanh(r * fuzz) / fuzz;
      }
      if (hpL) {
        l = hpL.run(l, HIGH);
        r = hpR ? hpR.run(r, HIGH) : l;
      }
      const a = amp.next() * gain;
      fenv?.next();
      outL[o] = outL[o]! + l * a * gl;
      outR[o] = outR[o]! + r * a * gr;
      if (++o === len) o = 0;
    }
    if (amp.done) break;
  }
}

/** Render one drum hit with wrap, velocity and choke; gl/gr include gain and pan. */
function renderHit(p: DrumPatch, ev: NoteEvent, outL: Float32Array, outR: Float32Array, rate: number, gl: number, gr: number, salt: number): void {
  const len = outL.length;
  const startAbs = Math.round(ev.time * rate);
  let o = ((startAbs % len) + len) % len;
  const seed = hash(startAbs, Math.round(ev.note * 1000), 0xd2, salt);
  const key = p.keyed ? 2 ** ((ev.note - 60) / 12) : 1;
  const [hl, hr] = p.kind === "membrane" ? membrane(p, rate, seed, key) : p.kind === "clap" ? clap(p, rate, seed) : metal(p, rate, seed, key);
  const amp = (p.gain ?? 1) * (0.35 + 0.65 * ev.vel);
  const ring = ev.ring !== undefined && Number.isFinite(ev.ring) ? Math.round(ev.ring * rate) : Infinity;
  const rel = t60(p.release ?? 0.05, rate);
  const attack = Math.max(1, Math.round((p.attack ?? DRUM_ATTACK) * rate));
  let g = amp;
  for (let i = 0; i < hl.length; i++) {
    if (i >= ring) {
      g *= rel;
      if (g < SILENT * amp) break;
    }
    const a = i < attack ? (g * i) / attack : g;
    outL[o] = outL[o]! + hl[i]! * a * gl;
    outR[o] = outR[o]! + hr[i]! * a * gr;
    if (++o === len) o = 0;
  }
}

/** Seconds a decay of `t60s` takes to reach -80 dB (where a hit is cut off). */
const tail = (t60s: number) => t60s * (4 / 3);

function membrane(p: MembranePatch, rate: number, seed: number, key: number): [Float32Array, Float32Array] {
  const noiseLevel = p.noise ?? 0;
  const click = p.click ?? 0;
  const n = Math.ceil((Math.max(tail(p.decay) + (p.hold ?? 0), noiseLevel ? tail(p.noiseDecay ?? 0.1) : 0, 0.01) + 0.002) * rate);
  const out = new Float32Array(n);
  const rnd = new Noise(seed);
  const [lo, hi] = p.noiseBand ?? [200, 8000];
  const nHp = new Svf();
  const nLp = new Svf();
  const cHp = new Svf();
  nHp.setHz(lo, Math.SQRT1_2, rate);
  nLp.setHz(hi, Math.SQRT1_2, rate);
  cHp.setHz(1500, Math.SQRT1_2, rate);
  const f0 = p.freq * key;
  const sweepK = Math.exp(-1 / (p.sweepTime * rate));
  const bodyK = t60(p.decay, rate);
  const mode2K = t60(p.decay * 0.6, rate);
  const noiseK = t60(p.noiseDecay ?? 0.1, rate);
  const clickK = t60(0.006, rate);
  const hold = Math.round((p.hold ?? 0) * rate);
  const [ratio2, level2] = p.mode2 ?? [0, 0];
  const drive = p.drive ?? 0;
  const norm = drive ? 1 / Math.tanh(drive) : 1;
  let sweep = p.sweep - 1;
  let body = 1;
  let body2 = level2;
  let noise = noiseLevel;
  let clk = click;
  let ph1 = 0;
  let ph2 = 0;
  for (let i = 0; i < n; i++) {
    const fr = f0 * (1 + sweep);
    sweep *= sweepK;
    let y = Math.sin(TAU * ph1) * body;
    ph1 += fr / rate;
    if (ph1 >= 1) ph1 -= 1;
    if (level2) {
      y += Math.sin(TAU * ph2) * body2;
      ph2 += (fr * ratio2) / rate;
      if (ph2 >= 1) ph2 -= 1;
      body2 *= mode2K;
    }
    if (i >= hold) body *= bodyK;
    const w = rnd.next();
    if (noiseLevel) {
      y += nLp.run(nHp.run(w, HIGH), LOW) * noise;
      noise *= noiseK;
    }
    if (click) {
      y += cHp.run(w, HIGH) * clk;
      clk *= clickK;
    }
    out[i] = drive ? Math.tanh(y * drive) * norm : y;
  }
  return [out, out];
}

function clap(p: ClapPatch, rate: number, seed: number): [Float32Array, Float32Array] {
  const n = Math.ceil((p.spacing * (p.bursts - 1) + tail(p.decay) + 0.004) * rate);
  const width = p.width ?? 0;
  const chans: Float32Array[] = [];
  for (let c = 0; c < 2; c++) {
    const out = new Float32Array(n);
    const rnd = new Noise(hash(seed, c));
    const bp = new Svf();
    const hp = new Svf();
    bp.setHz(p.tone, p.q, rate);
    hp.setHz(400, Math.SQRT1_2, rate);
    // Burst onsets, each side's a little different (two hands, two ears).
    const starts = Array.from({ length: p.bursts }, (_, i) => Math.round((i * p.spacing + (i ? (rnd.unit() - 0.5) * 0.003 * width : 0)) * rate));
    const burstK = t60(p.spacing * 1.6, rate);
    const tailK = t60(p.decay, rate);
    const last = starts[starts.length - 1]!;
    let burst = 0;
    let tl = 0;
    let k = 0;
    for (let i = 0; i < n; i++) {
      while (k < starts.length && i >= starts[k]!) {
        burst = 1;
        k++;
        if (k === starts.length) tl = p.tail;
      }
      const e = burst + tl;
      burst *= burstK;
      if (i >= last) tl *= tailK;
      out[i] = hp.run(bp.run(rnd.next(), BAND), HIGH) * e;
    }
    chans.push(out);
  }
  return [chans[0]!, chans[1]!];
}

function metal(p: MetalPatch, rate: number, seed: number, key: number): [Float32Array, Float32Array] {
  const n = Math.ceil((tail(p.decay) + 0.002) * rate);
  const width = p.width ?? 0;
  const rnd = new Noise(seed);
  const freqs = METAL.map((f) => (f * p.tune * key) / rate);
  const phases = METAL.map(() => rnd.unit());
  const noises = [new Noise(hash(seed, 1)), new Noise(hash(seed, 2))];
  const filters = [0, 1].map(() => {
    const bp = new Svf();
    const h1 = new Svf();
    const h2 = new Svf();
    bp.setHz(p.tone, p.q ?? 1, rate);
    h1.setHz(p.hp, Q24A, rate);
    h2.setHz(p.hp, Q24B[0]!, rate);
    return [bp, h1, h2] as const;
  });
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const down = t60(p.decay, rate);
  let e = 1;
  for (let i = 0; i < n; i++) {
    let sq = 0;
    for (let j = 0; j < 6; j++) {
      const pv = phases[j]!;
      const dt = freqs[j]!;
      let t2 = pv - 0.5;
      if (t2 < 0) t2 += 1;
      sq += (pv < 0.5 ? 1 : -1) + blep(pv, dt) - blep(t2, dt);
      const np = pv + dt;
      phases[j] = np >= 1 ? np - 1 : np;
    }
    sq /= 6;
    const nl = noises[0]!.next();
    // The right side's noise is partly its own: `width` decorrelates the channels.
    const nr = nl * (1 - width) + noises[1]!.next() * width;
    for (let c = 0; c < 2; c++) {
      const [bp, h1, h2] = filters[c]!;
      const x = sq * (1 - p.noise) + (c ? nr : nl) * p.noise;
      const y = h2.run(h1.run(bp.run(x, BAND), HIGH), HIGH) * e;
      if (c) R[i] = y;
      else L[i] = y;
    }
    e *= down;
  }
  return [L, R];
}

// ---------------------------------------------------------------- sound effects

/** Render one effect note with wrap and velocity; gl/gr include gain and pan. Held for the note's length (or its ring). */
function renderEffect(p: EffectPatch, ev: NoteEvent, outL: Float32Array, outR: Float32Array, rate: number, gl: number, gr: number, salt: number): void {
  const len = outL.length;
  const startAbs = Math.round(ev.time * rate);
  let o = ((startAbs % len) + len) % len;
  const seed = hash(startAbs, Math.round(ev.note * 1000), 0xef, salt);
  const held = Math.max(0.02, heldOf(ev));
  const [hl, hr] =
    p.kind === "howl" ? howl(p, ev.note, held, rate, seed)
    : p.kind === "wind" ? wind(p, ev.note, held, rate, seed)
    : p.kind === "hiss" ? hiss(p, ev.note, held, rate, seed)
    : p.kind === "rattle" ? rattle(p, held, rate, seed)
    : chains(p, held, rate, seed);
  const amp = (p.gain ?? 1) * (0.35 + 0.65 * ev.vel);
  for (let i = 0; i < hl.length; i++) {
    outL[o] = outL[o]! + hl[i]! * amp * gl;
    outR[o] = outR[o]! + hr[i]! * amp * gr;
    if (++o === len) o = 0;
  }
}

/** 0 -> 1 with zero slope at both ends. */
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** A smooth swell in over `attack` and a fade over the last `release` seconds of `total` (exactly 0 at the ends). */
function fadeInOut(t: number, attack: number, total: number, release: number): number {
  const a = attack > 0 ? smooth(t / attack) : 1;
  const r = release > 0 ? smooth((total - t) / release) : 1;
  return a * r;
}
/** Slow seeded wobble in about -1..1: three sines at rates around `rate` Hz. */
function wobbler(rnd: Noise, rate: number): (t: number) => number {
  const rates = [0.53, 1, 1.87].map((r) => r * rate * (0.8 + 0.4 * rnd.unit()));
  const phases = rates.map(() => rnd.unit());
  return (t) => (Math.sin(TAU * (rates[0]! * t + phases[0]!)) + Math.sin(TAU * (rates[1]! * t + phases[1]!)) * 0.7 + Math.sin(TAU * (rates[2]! * t + phases[2]!)) * 0.45) / 1.6;
}

/** Control rate of the effects' slow curves (pitch, formants, levels): every 16 frames. */
const FX_BLOCK = 16;

function howl(p: HowlPatch, note: number, held: number, rate: number, seed: number): [Float32Array, Float32Array] {
  const total = held + p.release;
  const n = Math.ceil(total * rate) + 1;
  const out = new Float32Array(n);
  const rnd = new Noise(seed);
  const wander = wobbler(rnd, 0.45);
  const f0 = hz(note);
  const nf = Math.min(p.closed.length, p.open.length);
  const vibDelay = p.vibratoDelay ?? 0.35;
  const [vibRate, vibDepth] = p.vibrato;
  const vibWobble = wobbler(rnd, 0.3);
  // The wander drifts around the note, never off it: centered on its mean over the held part
  // after the scoop, so the note held is the note written.
  let wanderMean = 0;
  {
    const from = Math.min(held, p.rise * 2);
    const steps = Math.max(1, Math.round((held - from) / 0.01));
    for (let s = 0; s < steps; s++) wanderMean += wander(from + ((s + 0.5) * (held - from)) / steps) / steps;
  }
  // Harmonic levels and the formants now (updated at the control rate).
  const maxK = 48;
  const amps = new Float64Array(maxK);
  const breathA = new Svf();
  const breathB = new Svf();
  const breathHp = new Svf();
  breathHp.setHz(180, Math.SQRT1_2, rate);
  let phase = 0;
  let vib = 0;
  let jit = 0;
  let shim = 0;
  let f = f0;
  let level = 0;
  let breathLevel = 0;
  let growl = 0;
  let growlPhase = 0;
  let k = 1;
  const tilt = p.tilt;
  for (let i = 0; i < n; i++) {
    if (i % FX_BLOCK === 0) {
      const t = i / rate;
      // Pitch: scoop up from below (exponential, 95% by `rise`), a slow climb while held, a fall
      // that speeds up through the release; vibrato grows in, the wander and jitter keep it alive.
      const climb = p.climb ?? 0.15;
      let semis = -p.scoop * ((1 - climb) * Math.exp((-3 * t) / p.rise) + climb * Math.exp((-1.5 * t) / p.rise));
      const u = t > held ? (t - held) / p.release : 0;
      semis -= p.fall * u ** 1.7;
      const vibOn = smooth((t - vibDelay) / 0.8);
      vib += (vibRate * (1 + 0.08 * vibWobble(t)) * FX_BLOCK) / rate;
      jit = 0.85 * jit + 0.15 * rnd.next();
      shim = 0.85 * shim + 0.15 * rnd.next();
      const cents = vibDepth * vibOn * Math.sin(TAU * vib) + (p.wander ?? 0) * (wander(t) - wanderMean) + (p.jitter ?? 0) * jit * 2.5;
      f = f0 * 2 ** (semis / 12 + cents / 1200);
      // The mouth: a little open at the breath, wide early in the scoop ("a-"), closing into the
      // held "-WOOO" (moving a little with the wander), and shut through the fall.
      const hold = p.hold ?? 0.3;
      const wide = p.rise * 0.35;
      const settle = p.rise * 1.6;
      let o = t < wide ? 0.35 + 0.65 * smooth(t / wide) : 1 - (1 - hold) * smooth((t - wide) / (settle - wide));
      o = Math.min(1, Math.max(0, o + 0.08 * wander(t * 0.7 + 3)));
      if (t > held) o *= 1 - smooth(u * 1.3);
      // Formants, interpolated in log frequency; harmonic k (1-based) sits at k * f.
      const formants: Formant[] = [];
      for (let j = 0; j < nf; j++) {
        const [c1, b1, l1] = p.closed[j]!;
        const [c2, b2, l2] = p.open[j]!;
        formants.push([c1 * (c2 / c1) ** o, b1 + (b2 - b1) * o, l1 + (l2 - l1) * o]);
      }
      const F1 = formants[0]![0];
      const F2 = (formants[1] ?? formants[0]!)[0];
      k = Math.max(1, Math.min(maxK, Math.floor(Math.min(9000, rate * 0.45) / f)));
      for (let h = 1; h <= maxK; h++) {
        if (h > k) {
          amps[h - 1] = 0;
          continue;
        }
        const fh = h * f;
        let resp = 0.03;
        for (const [fc, bw, lv] of formants) {
          const x = Math.log2(fh / fc) / (bw / 2);
          resp += lv / (1 + x * x);
        }
        amps[h - 1] = h ** -tilt * resp;
      }
      // Level: swell in, louder as the mouth opens, a smooth fade through the fall.
      const env = fadeInOut(t, p.attack, total, p.release * 0.9) * (1 - 0.7 * smooth(u));
      level = env * (0.8 + 0.2 * o) * (1 + (p.jitter ?? 0) * 0.02 * shim);
      // Breath: in before the voice ("hhoo"), under it while held, a little more through the fall.
      breathLevel = p.breath * fadeInOut(t, 0.03, total, p.release * 0.9) * (1 - 0.7 * smooth(u)) * ((0.25 + 0.75 * Math.exp(-t / 0.15)) * (0.5 + 0.5 * (1 - o)) + 0.2 * smooth(u));
      growl = (p.growl ?? 0) * Math.exp(-t / 0.22);
      breathA.setHz(F1, 3, rate);
      breathB.setHz(F2, 4, rate);
    }
    // The harmonics from one phase (Chebyshev recurrence: sin((h+1)x) = 2 cos x sin(hx) - sin((h-1)x)).
    phase += f / rate;
    if (phase >= 1) phase -= 1;
    const x = TAU * phase;
    const c2 = 2 * Math.cos(x);
    let sPrev = 0;
    let s = Math.sin(x);
    let y = 0;
    for (let h = 0; h < k; h++) {
      y += amps[h]! * s;
      const sNext = c2 * s - sPrev;
      sPrev = s;
      s = sNext;
    }
    if (growl > 1e-4) {
      growlPhase += (31 * (1 + 0.2 * jit)) / rate;
      if (growlPhase >= 1) growlPhase -= 1;
      y *= 1 - growl * (0.5 + 0.5 * Math.sin(TAU * growlPhase));
    }
    const w = breathHp.run(rnd.next(), HIGH);
    const b = breathA.run(w, BAND) + 0.6 * breathB.run(w, BAND);
    out[i] = y * level + b * breathLevel;
  }
  return [out, out];
}

/** A one-pole low-passed noise source (a slow random level), seeded. */
function flutterer(rnd: Noise, hzCut: number, rate: number): () => number {
  const a = Math.exp((-TAU * hzCut * FX_BLOCK) / rate);
  let v = 0;
  // Normalized so its spread is about ±1.
  const norm = Math.sqrt((1 + a) / (1 - a)) / 1.7;
  return () => {
    v = a * v + (1 - a) * rnd.next();
    return v * norm;
  };
}

function wind(p: WindPatch, note: number, held: number, rate: number, seed: number): [Float32Array, Float32Array] {
  const total = held + p.release;
  const n = Math.ceil(total * rate) + 1;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = new Noise(seed);
  const gusting = wobbler(rnd, 0.6);
  const fwob = wobbler(rnd, 0.25);
  const f0 = hz(note);
  const [ratio, over] = p.overtone ?? [1, 0];
  const noise = [new Noise(hash(seed, 1)), new Noise(hash(seed, 2))];
  const chans = [0, 1].map(() => ({ whistle: new Svf(), over: new Svf(), hp: new Svf(), lp: new Svf() }));
  for (const c of chans) {
    c.hp.setHz(p.band[0], Math.SQRT1_2, rate);
    c.lp.setHz(p.band[1], Math.SQRT1_2, rate);
  }
  // White noise through a band-pass of Q keeps about bandwidth / (rate / 2) of its power:
  // normalize the whistle and the whoosh so the patch's levels don't depend on the note.
  const whooshNorm = Math.sqrt(rate / 2 / Math.max(50, p.band[1] - p.band[0]));
  let gust = 0;
  let wl = 1;
  let wr = 1;
  let wn = 1;
  const [from, to] = p.sweep ?? [0, 0];
  for (let i = 0; i < n; i++) {
    if (i % FX_BLOCK === 0) {
      const t = i / rate;
      // The gust: a smooth swell to its peak and away again over the held length, gusting inside.
      const x = Math.min(1, t / held);
      const shape = x < p.peak ? smooth(x / p.peak) : 1 - smooth((x - p.peak) / (1 - p.peak)) * 0.85;
      const tailFade = t > held ? 1 - smooth((t - held) / p.release) : 1;
      gust = Math.max(0, shape * tailFade * (1 + p.flutter * 0.45 * gusting(t)));
      const fc = f0 * 2 ** ((-p.rise * (1 - Math.min(1, gust)) + 0.6 * p.flutter * fwob(t)) / 12);
      chans[0]!.whistle.setHz(fc * 0.994, p.q, rate);
      chans[1]!.whistle.setHz(fc * 1.006, p.q, rate);
      for (const c of chans) c.over.setHz(fc * ratio, p.q * 1.2, rate);
      wn = Math.sqrt(rate / 2 / (fc / p.q));
      const pan = from + (to - from) * smooth(t / total);
      [wl, wr] = panGains(pan);
    }
    for (let c = 0; c < 2; c++) {
      const ch = chans[c]!;
      const w = noise[c]!.next();
      const whistle = (ch.whistle.run(w, BAND) + over * ch.over.run(w, BAND)) * wn * 0.15;
      const whoosh = ch.lp.run(ch.hp.run(w, HIGH), LOW) * whooshNorm * 0.15;
      const y = (whistle * p.whistle * gust * Math.sqrt(gust) + whoosh * gust) * (c ? wr : wl);
      if (c) R[i] = y;
      else L[i] = y;
    }
  }
  return [L, R];
}

function hiss(p: HissPatch, note: number, held: number, rate: number, seed: number): [Float32Array, Float32Array] {
  const total = held + p.release;
  const n = Math.ceil(total * rate) + 1;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = new Noise(seed);
  const flutter = flutterer(rnd, 9, rate);
  const width = p.width ?? 0.3;
  const noise = [new Noise(hash(seed, 1)), new Noise(hash(seed, 2))];
  const chans = [0, 1].map(() => ({ h1: new Svf(), h2: new Svf(), bp: new Svf(), lp: new Svf() }));
  for (const c of chans) {
    c.h1.setHz(p.hp, Q24A, rate);
    c.h2.setHz(p.hp, Q24B[0]!, rate);
    c.lp.setHz(p.lp, Math.SQRT1_2, rate);
  }
  const key = 2 ** ((note - 60) / 12);
  const bandNorm = Math.sqrt(p.q * 0.6);
  let level = 0;
  for (let i = 0; i < n; i++) {
    if (i % FX_BLOCK === 0) {
      const t = i / rate;
      const x = Math.min(1, t / held);
      const fc = p.tone * key * 2 ** (((p.bend ?? 0) * x) / 12);
      for (const c of chans) c.bp.setHz(fc, p.q, rate);
      level = fadeInOut(t, p.attack, total, p.release) * (1 - (1 - (p.fade ?? 1)) * x) * Math.max(0, 1 + (p.flutter ?? 0) * flutter());
    }
    const a = noise[0]!.next();
    const b = a * (1 - width) + noise[1]!.next() * width;
    for (let c = 0; c < 2; c++) {
      const ch = chans[c]!;
      const hp = ch.lp.run(ch.h2.run(ch.h1.run(c ? b : a, HIGH), HIGH), LOW);
      const y = (hp * (1 - p.peak) + ch.bp.run(hp, BAND) * p.peak * bandNorm) * level;
      if (c) R[i] = y;
      else L[i] = y;
    }
  }
  return [L, R];
}

function rattle(p: RattlePatch, held: number, rate: number, seed: number): [Float32Array, Float32Array] {
  const total = held + p.release;
  const n = Math.ceil(total * rate) + 1;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = new Noise(seed);
  const drift = wobbler(rnd, 1.2);
  const width = p.width ?? 0.3;
  const noise = [new Noise(hash(seed, 1)), new Noise(hash(seed, 2))];
  const chans = [0, 1].map(() => ({ bp: new Svf(), h1: new Svf(), h2: new Svf(), lp: new Svf() }));
  for (const c of chans) {
    c.bp.setHz(p.tone, p.q, rate);
    c.h1.setHz(p.hp, Q24A, rate);
    c.h2.setHz(p.hp, Q24B[0]!, rate);
    c.lp.setHz(p.lp, Math.SQRT1_2, rate);
  }
  const clickK = t60(p.click, rate);
  let next = 0;
  let burst = 0;
  let level = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    if (i % FX_BLOCK === 0) level = fadeInOut(t, p.attack, total, p.release);
    // The next click: the rate drifts slowly; each interval varies at random.
    if (t >= next && t < held) {
      burst = 0.55 + 0.45 * rnd.unit();
      const r = p.rate * (1 + (p.drift ?? 0) * 0.5 * drift(t));
      next += (1 + p.jitter * (rnd.unit() - 0.5)) / r;
    }
    const a = noise[0]!.next();
    const b = a * (1 - width) + noise[1]!.next() * width;
    for (let c = 0; c < 2; c++) {
      const ch = chans[c]!;
      const x = (c ? b : a) * burst;
      const y = ch.lp.run(ch.h2.run(ch.h1.run(ch.bp.run(x, BAND), HIGH), HIGH), LOW) * level;
      if (c) R[i] = y;
      else L[i] = y;
    }
    burst *= clickK;
  }
  return [L, R];
}

function chains(p: ChainsPatch, held: number, rate: number, seed: number): [Float32Array, Float32Array] {
  const rnd = new Noise(seed);
  const heavyDecay = p.decay * 2.5;
  const n = Math.ceil((held + tail(heavyDecay) + 0.01) * rate);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const width = p.width ?? 0.5;
  const click = new Svf();
  click.setHz(4000, Math.SQRT1_2, rate);
  // When the links strike: bunched into short rattles (`cluster`), the rest spread out.
  const times: number[] = [];
  for (let t = 0.004 + rnd.unit() * 0.02; t < held; ) {
    times.push(t);
    t += rnd.unit() < p.cluster ? 0.012 + rnd.unit() * 0.04 : (-Math.log(1 - rnd.unit() * 0.98) / p.density) * (1 - p.cluster * 0.6);
  }
  const [lo, hi] = p.pitch;
  for (const t0 of times) {
    const heavy = rnd.unit() < (p.heavy ?? 0);
    const base = lo * (hi / lo) ** rnd.unit() * (heavy ? 0.25 : 1);
    const decay = heavy ? heavyDecay : p.decay * (0.7 + 0.6 * rnd.unit());
    const v = (0.45 + 0.55 * rnd.unit()) * (heavy ? 1.3 : 1);
    const [gl, gr] = panGains((rnd.unit() * 2 - 1) * width);
    const start = Math.round(t0 * rate);
    const parts = p.partials.map(([ratio, lv], j) => ({
      dt: (base * ratio * (1 + (rnd.unit() - 0.5) * 0.02)) / rate,
      lv: lv * v,
      k: t60(decay / (1 + j * 0.6), rate),
      ph: rnd.unit(),
    })).filter((q) => q.dt < 0.45);
    const len = Math.min(n - start, Math.ceil(tail(decay) * rate));
    // The strike: a few ms of bright noise, then the rings.
    let clk = 0.6 * v;
    const clkK = t60(0.004, rate);
    const attack = Math.round(0.0004 * rate);
    for (let i = 0; i < len; i++) {
      let y = click.run(rnd.next(), HIGH) * clk;
      clk *= clkK;
      for (const q of parts) {
        y += Math.sin(TAU * q.ph) * q.lv;
        q.ph += q.dt;
        if (q.ph >= 1) q.ph -= 1;
        q.lv *= q.k;
      }
      if (i < attack) y *= i / attack;
      L[start + i] = L[start + i]! + y * gl;
      R[start + i] = R[start + i]! + y * gr;
    }
  }
  return [L, R];
}

// ---------------------------------------------------------------- mix helpers

export interface PumpOptions {
  /** How far the level dips at each kick, 0..1 (default 0.6: down to 40%). */
  depth?: number;
  /** Seconds to duck (short, so nothing clicks; default 0.005). */
  attack?: number;
  /** Seconds to recover (default 0.22, about an eighth note at 124 bpm). */
  release?: number;
  /** Recovery shape: 1 linear, 2 (default) quick at first then easing in, the classic pump. */
  curve?: number;
}

/**
 * Sidechain "pumping" as a gain curve over a loop of `frames`: 1, dipping at each kick time
 * (seconds) and swelling back. Times past the loop end wrap, and a recovery that runs past the
 * end continues at the start, so the curve is loop-seamless. Apply it with duck().
 */
export function pumpEnvelope(frames: number, rate: number, times: number[], opts: PumpOptions = {}): Float32Array {
  const depth = Math.min(1, Math.max(0, opts.depth ?? 0.6));
  const a = Math.max(1, Math.round((opts.attack ?? 0.005) * rate));
  const r = Math.max(1, Math.round((opts.release ?? 0.22) * rate));
  const curve = opts.curve ?? 2;
  const shape = new Float32Array(a + r);
  for (let i = 0; i < a + r; i++) shape[i] = i < a ? 1 - (depth * i) / a : 1 - depth * (1 - (i - a) / r) ** curve;
  const out = new Float32Array(frames).fill(1);
  for (const time of times) {
    let o = ((Math.round(time * rate) % frames) + frames) % frames;
    for (let i = 0; i < shape.length; i++) {
      if (shape[i]! < out[o]!) out[o] = shape[i]!;
      if (++o === frames) o = 0;
    }
  }
  return out;
}

/** Multiply both channels by a gain curve (pumpEnvelope), in place. */
export function duck(left: Float32Array, right: Float32Array, curve: Float32Array): void {
  for (let i = 0; i < left.length; i++) {
    left[i] = left[i]! * curve[i]!;
    right[i] = right[i]! * curve[i]!;
  }
}

export interface DelayOptions {
  /** Seconds between echoes (beats() converts tempo-synced times). */
  time: number;
  /** Level of each echo against the one before, 0..0.95 (default 0.4). */
  feedback?: number;
  /** Echoes bounce left, right, left... from a mono sum (default true); otherwise each side echoes itself. */
  pingPong?: boolean;
  /** Echoes darken through a low-pass at this Hz (default 6000). */
  damp?: number;
  /** And thin through a high-pass at this Hz (default 250), so they don't muddy the bass. */
  lowCut?: number;
}

/**
 * Wet-only delay of a looped signal, like reverb.ts loopReverb(): the loop runs through the
 * delay until the echoes of its end have died away (-80 dB), and the last pass is kept, so the
 * echoes that would ring past the loop end are already present at its start.
 */
export function loopDelay(inL: Float32Array, inR: Float32Array, rate: number, opts: DelayOptions): [Float32Array, Float32Array] {
  const n = inL.length;
  const D = Math.max(1, Math.round(opts.time * rate));
  const fb = Math.min(0.95, Math.max(0, opts.feedback ?? 0.4));
  const ping = opts.pingPong ?? true;
  const echoes = fb > 0 ? Math.ceil(Math.log(SILENT) / Math.log(fb)) + 1 : 1;
  const passes = Math.min(64, 1 + Math.max(1, Math.ceil((echoes * D) / n)));
  const lines = [new Float32Array(D), new Float32Array(D)];
  const lp = [new Svf(), new Svf()];
  const hp = [new Svf(), new Svf()];
  for (const f of lp) f.setHz(opts.damp ?? 6000, Math.SQRT1_2, rate);
  for (const f of hp) f.setHz(opts.lowCut ?? 250, Math.SQRT1_2, rate);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const [bufL, bufR] = lines as [Float32Array, Float32Array];
  let w = 0;
  for (let pass = 0; pass < passes; pass++) {
    const keep = pass === passes - 1;
    for (let i = 0; i < n; i++) {
      const dl = bufL[w]!;
      const dr = bufR[w]!;
      let xl: number;
      let xr: number;
      if (ping) {
        xl = (inL[i]! + inR[i]!) * 0.5 + dr * fb;
        xr = dl * fb;
      } else {
        xl = inL[i]! + dl * fb;
        xr = inR[i]! + dr * fb;
      }
      bufL[w] = hp[0]!.run(lp[0]!.run(xl, LOW), HIGH);
      bufR[w] = hp[1]!.run(lp[1]!.run(xr, LOW), HIGH);
      if (++w === D) w = 0;
      if (keep) {
        outL[i] = dl;
        outR[i] = dr;
      }
    }
  }
  return [outL, outR];
}
