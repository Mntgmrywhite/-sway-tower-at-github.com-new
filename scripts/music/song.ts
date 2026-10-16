// The song format arrangements are written in, and the loop renderer.
//
// A song is a loop of `bars` bars. Notes are placed in beats from the loop start; anything
// that rings past the end wraps to the start, and the reverb is run over two passes, so the
// rendered loop is seamless. Pick tempos that give whole frames per bar at 48 kHz
// (e.g. 96, 100, 120, 125, 150 bpm in 4/4).

import { instrument, type InstrumentName } from "./instruments";
import { loopReverb, type ReverbOptions } from "./reverb";
import { midi, renderNotes, type NoteEvent } from "./sampler";
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
  inst: InstrumentName;
  notes: Note[];
  /** Linear gain (default 1). */
  gain?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
  /** Reverb send 0..1. */
  reverb?: number;
  /** Small per-note timing/velocity variation, 0..1, so it doesn't sound quantized. */
  humanize?: number;
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

/** Render one seamless loop of the song (before mastering). */
export function renderLoop(song: Song): Audio {
  const frames = loopFrames(song);
  const beat = 60 / song.bpm;
  const dryL = new Float32Array(frames);
  const dryR = new Float32Array(frames);
  const sendL = new Float32Array(frames);
  const sendR = new Float32Array(frames);
  song.tracks.forEach((track, ti) => {
    const inst = instrument(track.inst);
    const h = track.humanize ?? 0.3;
    const events: NoteEvent[] = track.notes.map((n, ni) => {
      let t = n.t;
      // Swing: push offbeat eighths later.
      if (song.swing && Math.abs((t % 1) - 0.5) < 1e-6) t += song.swing * 0.5;
      const jitter = (rand(ti * 1000 + ni) - 0.5) * 0.012 * h;
      const vel = Math.min(1, Math.max(0.05, (n.v ?? 0.7) + (rand(ti * 2000 + ni) - 0.5) * 0.12 * h));
      return { time: Math.max(0, t * beat + jitter), dur: n.d * beat, note: typeof n.n === "number" ? n.n : midi(n.n), vel };
    });
    const tL = new Float32Array(frames);
    const tR = new Float32Array(frames);
    renderNotes(inst, events, tL, tR, RATE, track.gain ?? 1, track.pan ?? 0);
    const send = track.reverb ?? 0.25;
    for (let f = 0; f < frames; f++) {
      dryL[f] = dryL[f]! + tL[f]!;
      dryR[f] = dryR[f]! + tR[f]!;
      sendL[f] = sendL[f]! + tL[f]! * send;
      sendR[f] = sendR[f]! + tR[f]! * send;
    }
  });
  const [wetL, wetR] = loopReverb(sendL, sendR, RATE, song.reverb);
  const level = song.reverb?.level ?? 1;
  for (let f = 0; f < frames; f++) {
    dryL[f] = dryL[f]! + wetL[f]! * level;
    dryR[f] = dryR[f]! + wetR[f]! * level;
  }
  return { rate: RATE, left: dryL, right: dryR };
}

/** Bring a mix to a consistent loudness with a soft limiter (peaks stay under -1 dBFS). */
export function master(audio: Audio, targetRms = 0.16, soften = 0.35): Audio {
  // Gentle treble roll-off (about -3.5 dB above ~6 kHz) so bells and shakers don't bite.
  const a = Math.exp((-2 * Math.PI * 6000) / audio.rate);
  const tame = (x: Float32Array) => {
    const out = new Float32Array(x.length);
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      lp = (1 - a) * x[i]! + a * lp;
      out[i] = x[i]! - soften * (x[i]! - lp);
    }
    return out;
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

/** A chord: several notes at once. */
export function chord(t: number, d: number, names: string[], v = 0.6): Note[] {
  return names.map((n) => ({ t, d, n, v }));
}
