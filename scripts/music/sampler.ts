// A small sample-playback instrument for offline rendering. Each instrument is a folder of
// recordings whose filenames carry the note (A#2, C4, ...), optionally a velocity layer
// (v1..v4, vL/vH, p/mf/f) and a round-robin index (rr1, rr2). A note plays the nearest
// recorded pitch (preferring a zone at or below so repitching is mostly upward), resampled
// with 4-point Hermite interpolation, through a short attack and exponential release.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { readWav, type Audio } from "./wav";

export const SAMPLES = join(homedir(), "APP", "samples");
const CACHE = join(SAMPLES, ".cache");

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number for a name like "C4", "A#2", "Bb3" (C4 = 60). */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + NOTE_INDEX[m[1]!]! + acc;
}

interface Zone {
  note: number;
  layer: number;
  rr: number;
  audio: Audio;
}

export interface InstrumentOptions {
  /** Folder under ~/APP/samples (or absolute). */
  dir: string;
  /** Only files whose name matches. */
  match?: RegExp;
  /** Fallback note for unpitched one-shots (drums), e.g. "C4". */
  fixedNote?: string;
  /** Attack and release in seconds. */
  attack?: number;
  release?: number;
  /** One-shots ring out for their natural length and ignore note duration (pizz, mallets, drums). */
  oneShot?: boolean;
  /** Overall gain for this instrument's samples. */
  gain?: number;
  /** Semitones to add to every parsed note (fix mislabelled sets). */
  transpose?: number;
}

const LAYER_WORDS: Record<string, number> = { pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6, soft: 1, medium: 2, loud: 3 };

/** Note (NaN when the name has none, e.g. drums), velocity layer and round robin from a filename. */
function parseName(file: string): { note: number; layer: number; rr: number } {
  const stem = basename(file).replace(/\.(wav|flac)$/i, "");
  const tokens = stem.split(/[_\s-]+/);
  let note = NaN;
  let layer = 1;
  let rr = 1;
  for (const tok of tokens) {
    const n = /^([A-G][#b]?-?\d)(v[LH])?$/i.exec(tok);
    if (n && Number.isNaN(note)) {
      note = midi(n[1]!.charAt(0).toUpperCase() + n[1]!.slice(1));
      if (n[2]) layer = n[2].toUpperCase() === "VH" ? 3 : 1;
      continue;
    }
    const v = /^vl?(\d)$/i.exec(tok);
    if (v) layer = Number(v[1]);
    const r = /^rr?(\d+)$/i.exec(tok);
    if (r) rr = Number(r[1]);
    const w = LAYER_WORDS[tok.toLowerCase()];
    if (w) layer = w;
  }
  return { note, layer, rr };
}

/** Decode a FLAC through afconvert into a cached WAV. */
function wavPath(file: string): string {
  if (!/\.flac$/i.test(file)) return file;
  mkdirSync(CACHE, { recursive: true });
  const out = join(CACHE, basename(file).replace(/\.flac$/i, "") + "-" + Buffer.from(file).toString("base64url").slice(-16) + ".wav");
  if (!existsSync(out)) execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16", file, out]);
  return out;
}

export class Instrument {
  readonly zones: Zone[] = [];
  readonly opts: Required<Omit<InstrumentOptions, "match" | "fixedNote">> & InstrumentOptions;
  private rrCounter = new Map<number, number>();

  constructor(opts: InstrumentOptions) {
    this.opts = { attack: 0.004, release: 0.25, oneShot: false, gain: 1, transpose: 0, ...opts };
    const dir = opts.dir.startsWith("/") ? opts.dir : join(SAMPLES, opts.dir);
    const files = readdirSync(dir).filter((f) => /\.(wav|flac)$/i.test(f) && (!opts.match || opts.match.test(f)));
    for (const f of files.sort()) {
      const parsed = parseName(f);
      if (opts.fixedNote) parsed.note = midi(opts.fixedNote);
      if (Number.isNaN(parsed.note)) continue;
      this.zones.push({ ...parsed, note: parsed.note + this.opts.transpose, audio: readWav(wavPath(join(dir, f))) });
    }
    if (!this.zones.length) throw new Error(`${dir}: no usable samples (match ${opts.match ?? "any"})`);
    // Number the round-robins per (note, layer) by order, so rr1/rr2 or repeated hits cycle.
    const seen = new Map<string, number>();
    for (const z of this.zones) {
      const key = `${z.note}/${z.layer}`;
      const k = (seen.get(key) ?? 0) + 1;
      seen.set(key, k);
      z.rr = k;
    }
  }

  /** The zone for a note at velocity 0..1: nearest pitch, matching layer, cycling round robins. */
  pick(note: number, velocity: number): { zone: Zone; ratio: number } {
    const layers = [...new Set(this.zones.map((z) => z.layer))].sort((a, b) => a - b);
    const layer = layers[Math.min(layers.length - 1, Math.floor(velocity * layers.length))]!;
    const inLayer = this.zones.filter((z) => z.layer === layer);
    let best = inLayer[0]!;
    let bestCost = Infinity;
    for (const z of inLayer) {
      const d = note - z.note;
      // Prefer shifting up (d >= 0) and small shifts; down-shifts cost a little more.
      const cost = d >= 0 ? d : -d * 1.3;
      if (cost < bestCost) {
        bestCost = cost;
        best = z;
      }
    }
    const candidates = inLayer.filter((z) => z.note === best.note);
    const key = best.note * 10 + layer;
    const next = ((this.rrCounter.get(key) ?? 0) % candidates.length) + 1;
    this.rrCounter.set(key, next);
    const zone = candidates.find((z) => z.rr === next) ?? best;
    return { zone, ratio: Math.pow(2, (note - zone.note) / 12) };
  }
}

/** Hermite interpolation of x[i-1..i+2] at fractional position t. */
function hermite(x: Float32Array, i: number, t: number): number {
  const xm1 = x[i - 1] ?? 0;
  const x0 = x[i] ?? 0;
  const x1 = x[i + 1] ?? 0;
  const x2 = x[i + 2] ?? 0;
  const c = (x1 - xm1) * 0.5;
  const v = x0 - x1;
  const w = c + v;
  const a = w + v + (x2 - x0) * 0.5;
  const b = w + a;
  return ((a * t - b) * t + c) * t + x0;
}

export interface NoteEvent {
  /** Start time in seconds. */
  time: number;
  /** Held length in seconds (ignored for one-shots, which ring out). */
  dur: number;
  note: number;
  /** 0..1 */
  vel: number;
}

/**
 * Render notes into stereo buffers at `rate`. `pan` is -1..1 (equal-power).
 * Returns the frames written past the end (tails), which callers may wrap for loops.
 */
export function renderNotes(
  inst: Instrument,
  events: NoteEvent[],
  outL: Float32Array,
  outR: Float32Array,
  rate: number,
  gain: number,
  pan: number,
): void {
  const pl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const pr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const len = outL.length;
  for (const ev of events) {
    const { zone, ratio } = inst.pick(ev.note, ev.vel);
    const src = zone.audio;
    const step = ratio * (src.rate / rate);
    const start = Math.round(ev.time * rate);
    const attack = Math.max(1, Math.round(inst.opts.attack * rate));
    const holdFrames = inst.opts.oneShot ? Infinity : Math.round(ev.dur * rate);
    const releaseFrames = Math.max(1, Math.round(inst.opts.release * rate));
    const srcFrames = src.left.length;
    const amp = gain * inst.opts.gain * (0.35 + 0.65 * ev.vel);
    let relGain = 1;
    const relCoef = Math.exp(Math.log(0.001) / releaseFrames);
    for (let f = 0; ; f++) {
      const pos = f * step;
      const i = Math.floor(pos);
      if (i + 2 >= srcFrames) break;
      if (f >= holdFrames) {
        relGain *= relCoef;
        if (relGain < 0.001) break;
      }
      const env = (f < attack ? f / attack : 1) * relGain * amp;
      const t = pos - i;
      // Wrap into the buffer so loop renders keep their tails.
      const o = (start + f) % len;
      outL[o] = outL[o]! + hermite(src.left, i, t) * env * pl;
      outR[o] = outR[o]! + hermite(src.right, i, t) * env * pr;
    }
  }
}
