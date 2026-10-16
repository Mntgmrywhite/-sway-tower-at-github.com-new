// The song format arrangements are written in, and the loop renderer.
//
// A song is a loop of `bars` bars. Notes are placed in beats from the loop start; anything
// that rings past the end wraps to the start, and the reverb is run over two passes, so the
// rendered loop is seamless. Pick tempos that give whole frames per bar at 48 kHz
// (e.g. 96, 100, 120, 125, 150 bpm in 4/4).
//
// A track plays a recording (instruments.ts) or, for the Neon song, a synth patch (synth.ts).
// Two effects serve the synths' genre and are loop-seamless like the reverb: sidechain pumping
// (a track's `pump` ducks it at every note of the song's pump key, the kick) and a tempo-synced
// delay bus (a track's `delay` send). A song that uses neither renders exactly as before.

import { instrument, type InstrumentName } from "./instruments";
import { loopReverb, type ReverbOptions } from "./reverb";
import { midi, renderNotes, type NoteEvent } from "./sampler";
import { beats, duck, isSynth, loopDelay, pumpEnvelope, renderSynth, type DelayOptions, type Patch, type SynthName } from "./synth";
import type { Audio } from "./wav";

export const RATE = 48000;

export interface Note {
  /** Start, in beats from the loop start. */
  t: number;
  /** Length in beats. */
  d: number;
  /** Note name ("C4", "F#3") or MIDI number. */
  n: string | number;
  /** Velocity 0..1. */
  v?: number;
}

export interface Track {
  /** A recording (instruments.ts) or a synth patch (synth.ts SYNTHS). */
  inst: InstrumentName | SynthName;
  /**
   * Synth tracks only: play this patch instead of SYNTHS[inst], e.g. a copy with a few fields
   * changed (a filter that opens over a build). `inst` still names the part in reports.
   */
  patch?: Patch;
  notes: Note[];
  /** Linear gain (default 1). */
  gain?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
  /** Reverb send 0..1. */
  reverb?: number;
  /** Small per-note timing/velocity variation, 0..1, so it doesn't sound quantized. */
  humanize?: number;
  /**
   * Darken a bright part: a gentle low-pass (12 dB/octave) from this frequency in Hz, e.g. 4000
   * to soften a fiddle's or harpsichord's edge, 2500 for a mellow, distant voice. Off by default.
   */
  lowpass?: number;
  /**
   * Thin a part's low end: a gentle high-pass (12 dB/octave) from this frequency in Hz. Phones
   * can't play much under ~120 Hz, and master() normalizes loudness, so deep kick and bass
   * energy only makes everything else quieter; 60-90 Hz keeps their punch for less.
   */
  highpass?: number;
  /** The part this track belongs to, for reports (mix.ts sums a part's tracks into one row). */
  label?: string;
  /**
   * One-shot instruments ring out their whole recording (a ride cymbal ~7 s, a guitar string
   * into the next chord). `choke` stops each note at the track's next note, as a drummer's or
   * guitarist's hand would; `ring` caps how many seconds any note rings. Both release through
   * the instrument's release time.
   */
  choke?: boolean;
  ring?: number;
  /**
   * Sidechain pumping, 0..1: how far the track ducks at each note of the song's pump key
   * (Song.pump, the kick) before it swells back, as a compressor keyed by the kick would.
   * Applied after lowpass/highpass and before the sends, so its reverb and delay pump too.
   */
  pump?: number;
  /** Send 0..1 into the song's tempo-synced delay (Song.delay). Off by default. */
  delay?: number;
}

/** A track that plays a recording (helpers that look into the recordings take these). */
export type SampledTrack = Track & { inst: InstrumentName };

/** The sidechain key: which notes duck the tracks that `pump`, and how they swell back. */
export interface Pump {
  /** The track(s) whose notes are the kick: every track with this label, or one track index. */
  from: string | number;
  /** Beats to swell back after each hit (default 0.75: full again by the beat's last sixteenth). */
  release?: number;
  /** Recovery shape: 1 linear, 2 (default) quick at first then easing in, the classic pump. */
  curve?: number;
}

/** The delay bus, beside the reverb: a loop-seamless echo synced to the tempo. */
export interface Delay extends Omit<DelayOptions, "time"> {
  /** Beats between echoes (0.75: a dotted eighth; 0.5: an eighth). */
  time: number;
  /** Return level (default 1). */
  level?: number;
}

export interface Song {
  name: string;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  /** 0 = straight; 0.33 ≈ triplet swing on eighth notes. */
  swing?: number;
  tracks: Track[];
  reverb?: ReverbOptions & { level?: number };
  /** The pump key, for tracks with `pump`. */
  pump?: Pump;
  /** The delay bus, for tracks with a `delay` send. */
  delay?: Delay;
  /**
   * Named moments the game syncs visuals to, in seconds from the loop start as written (before
   * Hard mode's tempo stretch), e.g. New Year's `countdownStart`. render.ts writes them into
   * src/audio/music/manifest.json next to the loop points.
   */
  cues?: Record<string, number>;
}

/**
 * The song's cues, checked (each a finite time inside the loop) and rounded to the microsecond so
 * float noise from beat arithmetic stays out of the manifest. Undefined when the song has none.
 */
export function loopCues(song: Song): Record<string, number> | undefined {
  if (!song.cues) return undefined;
  const length = loopFrames(song) / RATE;
  const out: Record<string, number> = {};
  for (const [name, s] of Object.entries(song.cues)) {
    if (!Number.isFinite(s) || s < 0 || s >= length) throw new Error(`${song.name}: cue ${name} at ${s} s is outside the ${length} s loop`);
    out[name] = Math.round(s * 1e6) / 1e6;
  }
  return out;
}

/** Deterministic pseudo-random for humanizing (same song renders identically every time). */
function rand(seed: number): number {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Total loop length in frames; throws if the tempo doesn't give whole frames. */
export function loopFrames(song: Song): number {
  const frames = (song.bars * song.beatsPerBar * 60 * RATE) / song.bpm;
  if (!Number.isInteger(frames)) throw new Error(`${song.name}: ${song.bpm} bpm doesn't give whole frames per loop at ${RATE} Hz`);
  return frames;
}

/**
 * Set each one-shot's ring time: until the track's next note starts (choke; notes struck
 * together don't choke each other, and the last note chokes on the loop's first), and at most
 * `ring` seconds.
 */
function ringLimits(events: NoteEvent[], loopSeconds: number, track: Track): void {
  const starts = [...new Set(events.map((e) => e.time))].sort((a, b) => a - b);
  for (const e of events) {
    let ring = track.ring ?? Infinity;
    if (track.choke && starts.length) {
      const next = starts.find((t) => t > e.time + 0.01) ?? starts[0]! + loopSeconds;
      ring = Math.min(ring, next - e.time);
    }
    if (Number.isFinite(ring)) e.ring = ring;
  }
}

/** The notes of track `ti` as the renderer plays them: swung, humanized, in seconds, with ring limits. */
export function trackEvents(song: Song, ti: number): NoteEvent[] {
  const track = song.tracks[ti]!;
  const beat = 60 / song.bpm;
  const h = track.humanize ?? 0.3;
  const events: NoteEvent[] = track.notes.map((n, ni) => {
    let t = n.t;
    // Swing: push offbeat eighths later.
    if (song.swing && Math.abs((t % 1) - 0.5) < 1e-6) t += song.swing * 0.5;
    const jitter = (rand(ti * 1000 + ni) - 0.5) * 0.012 * h;
    const vel = Math.min(1, Math.max(0.05, (n.v ?? 0.7) + (rand(ti * 2000 + ni) - 0.5) * 0.12 * h));
    return { time: Math.max(0, t * beat + jitter), dur: n.d * beat, note: typeof n.n === "number" ? n.n : midi(n.n), vel };
  });
  if (track.choke || track.ring !== undefined) ringLimits(events, loopFrames(song) / RATE, track);
  return events;
}

/** Note start times (seconds, as played) of the song's pump key. */
function pumpTimes(song: Song): number[] {
  const from = song.pump?.from;
  if (from === undefined) throw new Error(`${song.name}: a track pumps, but the song has no pump key (Song.pump)`);
  const keys = song.tracks.map((_, i) => i).filter((i) => (typeof from === "number" ? i === from : song.tracks[i]!.label === from));
  if (!keys.length) throw new Error(`${song.name}: no track ${typeof from === "number" ? `#${from}` : `labelled "${from}"`} for the pump key`);
  return keys.flatMap((i) => trackEvents(song, i).map((e) => e.time));
}

/**
 * Render one seamless loop of the song (before mastering). `only` renders just those tracks
 * (by index) as they sound in the full song: humanized as there, pumped by its kick.
 */
export function renderLoop(song: Song, only?: ReadonlySet<number>): Audio {
  const frames = loopFrames(song);
  const dryL = new Float32Array(frames);
  const dryR = new Float32Array(frames);
  const sendL = new Float32Array(frames);
  const sendR = new Float32Array(frames);
  const delays = song.tracks.some((t, ti) => (t.delay ?? 0) > 0 && (!only || only.has(ti)));
  const echoL = delays ? new Float32Array(frames) : null;
  const echoR = delays ? new Float32Array(frames) : null;
  // Round robins restart with every render, so a song sounds the same whatever rendered before.
  for (const track of song.tracks) if (!isSynth(track.inst)) instrument(track.inst).resetRoundRobin();
  // One gain curve per pump depth, keyed by the kick's notes.
  let kicks: number[] | null = null;
  const curves = new Map<number, Float32Array>();
  const pumpCurve = (depth: number): Float32Array => {
    let c = curves.get(depth);
    if (!c) {
      kicks ??= pumpTimes(song);
      const p = song.pump!;
      c = pumpEnvelope(frames, RATE, kicks, { depth, release: beats(song.bpm, p.release ?? 0.75), curve: p.curve });
      curves.set(depth, c);
    }
    return c;
  };
  song.tracks.forEach((track, ti) => {
    if (only && !only.has(ti)) return;
    const events = trackEvents(song, ti);
    const tL = new Float32Array(frames);
    const tR = new Float32Array(frames);
    if (isSynth(track.inst)) renderSynth(track.patch ?? track.inst, events, tL, tR, RATE, track.gain ?? 1, track.pan ?? 0);
    else renderNotes(instrument(track.inst), events, tL, tR, RATE, track.gain ?? 1, track.pan ?? 0);
    if (track.lowpass) {
      for (const ch of [tL, tR]) for (let pass = 0; pass < 2; pass++) onePoleLoop(ch, track.lowpass, RATE);
    }
    if (track.highpass) {
      for (const ch of [tL, tR]) {
        for (let pass = 0; pass < 2; pass++) {
          const low = ch.slice();
          onePoleLoop(low, track.highpass, RATE);
          for (let f = 0; f < frames; f++) ch[f] = ch[f]! - low[f]!;
        }
      }
    }
    if (track.pump) duck(tL, tR, pumpCurve(track.pump));
    const send = track.reverb ?? 0.25;
    for (let f = 0; f < frames; f++) {
      dryL[f] = dryL[f]! + tL[f]!;
      dryR[f] = dryR[f]! + tR[f]!;
      sendL[f] = sendL[f]! + tL[f]! * send;
      sendR[f] = sendR[f]! + tR[f]! * send;
    }
    const echo = track.delay ?? 0;
    if (echo > 0 && echoL && echoR) {
      for (let f = 0; f < frames; f++) {
        echoL[f] = echoL[f]! + tL[f]! * echo;
        echoR[f] = echoR[f]! + tR[f]! * echo;
      }
    }
  });
  const [wetL, wetR] = loopReverb(sendL, sendR, RATE, song.reverb);
  const level = song.reverb?.level ?? 1;
  for (let f = 0; f < frames; f++) {
    dryL[f] = dryL[f]! + wetL[f]! * level;
    dryR[f] = dryR[f]! + wetR[f]! * level;
  }
  if (echoL && echoR) {
    if (!song.delay) throw new Error(`${song.name}: a track sends to the delay, but the song has no delay bus (Song.delay)`);
    const { time, level: back = 1, ...opts } = song.delay;
    const [dL, dR] = loopDelay(echoL, echoR, RATE, { ...opts, time: beats(song.bpm, time) });
    for (let f = 0; f < frames; f++) {
      dryL[f] = dryL[f]! + dL[f]! * back;
      dryR[f] = dryR[f]! + dR[f]! * back;
    }
  }
  return { rate: RATE, left: dryL, right: dryR };
}

/**
 * One-pole low-pass at `hz`, in place, over a loop: the filter is warmed up on the loop's tail
 * first, so the start continues from the end and the seam stays seamless.
 */
function onePoleLoop(x: Float32Array, hz: number, rate: number): void {
  const a = Math.exp((-2 * Math.PI * hz) / rate);
  let lp = 0;
  for (let i = Math.max(0, x.length - Math.round(rate * 0.05)); i < x.length; i++) lp = (1 - a) * x[i]! + a * lp;
  for (let i = 0; i < x.length; i++) {
    lp = (1 - a) * x[i]! + a * lp;
    x[i] = lp;
  }
}

/** Bring a mix to a consistent loudness with a soft limiter (peaks stay under -1 dBFS). */
export function master(audio: Audio, targetRms = 0.16, soften = 0.35): Audio {
  // Gentle treble roll-off (about -3.5 dB above ~6 kHz) so bells and shakers don't bite.
  const tame = (x: Float32Array) => {
    const lp = x.slice();
    onePoleLoop(lp, 6000, audio.rate);
    return x.map((v, i) => v - soften * (v - lp[i]!));
  };
  audio = { rate: audio.rate, left: tame(audio.left), right: tame(audio.right) };
  const n = audio.left.length;
  let sum = 0;
  for (let f = 0; f < n; f++) sum += audio.left[f]! ** 2 + audio.right[f]! ** 2;
  const rms = Math.sqrt(sum / (2 * n)) || 1;
  const g = targetRms / rms;
  // tanh never exceeds 1, so peaks are guaranteed under the ceiling (-1 dBFS).
  const drive = 1.4;
  const ceiling = 0.89;
  const shape = (x: number) => Math.tanh(x * g * drive) * ceiling;
  return { rate: audio.rate, left: audio.left.map(shape), right: audio.right.map(shape) };
}

// ---------------------------------------------------------------- writing helpers

/** Repeat a pattern of notes every `every` beats, `times` times. */
export function repeat(notes: Note[], every: number, times: number): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < times; i++) for (const n of notes) out.push({ ...n, t: n.t + i * every });
  return out;
}

/** Shift notes later by `beats`. */
export function at(beats: number, notes: Note[]): Note[] {
  return notes.map((n) => ({ ...n, t: n.t + beats }));
}

/** Transpose notes by semitones. */
export function transpose(notes: Note[], semis: number): Note[] {
  return notes.map((n) => ({ ...n, n: (typeof n.n === "number" ? n.n : midi(n.n)) + semis }));
}

/**
 * A euphonium part. No CC0 euphonium recording exists, so it is voiced the way the instrument
 * sounds: a tenor trombone's line and a tuba's round body on the same notes, both mellowed.
 * Write it in the euphonium's singing range, Bb1 to F4 (a touch higher is stretched). `short`
 * uses the staccato recordings (oom-pah, fanfare stabs). Returns two tracks to spread into a song.
 * At gain 1 it sits level with the horn (about -30 dB RMS dry for a mid-velocity note).
 */
export function euphonium(notes: Note[], opts: Omit<Track, "inst" | "notes"> & { short?: boolean } = {}): Track[] {
  const { short, gain = 1, ...rest } = opts;
  rest.label ??= short ? "euphonium (short)" : "euphonium";
  return [
    { ...rest, inst: short ? "tromboneShort" : "trombone", notes, gain: gain * (short ? 2.2 : 0.6), lowpass: 2800 },
    { ...rest, inst: short ? "tubaShort" : "tuba", notes, gain: gain * (short ? 0.7 : 0.5), lowpass: 3500 },
  ];
}

/** A chord: several notes at once. */
export function chord(t: number, d: number, names: string[], v = 0.6): Note[] {
  return names.map((n) => ({ t, d, n, v }));
}
