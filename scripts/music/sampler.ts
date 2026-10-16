// A small sample-playback instrument for offline rendering. Each instrument is a folder of
// recordings whose filenames carry the note (A#2, C4, ...), optionally a velocity layer
// (v1..v4, vL/vH, p/mf/f) and a round-robin index (rr1, rr2). A note plays the nearest
// recorded pitch (preferring a zone at or below so repitching is mostly upward), resampled
// with 4-point Hermite interpolation, through a short attack and exponential release.
// Recordings are trimmed of the room tone before the note so every note lands on time.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { centsHeard, centsNear } from "./pitch";
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
  /** Tuning correction for this recording, in cents. */
  detune: number;
  /** Gain that evens this recording with the rest of its layer (1 unless `even`). */
  level?: number;
}

export interface InstrumentOptions {
  /** Folder under ~/APP/samples (or absolute). */
  dir: string;
  /** Only files whose name matches. */
  match?: RegExp;
  /** Fallback note for unpitched one-shots (drums), e.g. "C4". */
  fixedNote?: string;
  /**
   * Velocity layers by filename, softest first, for sets whose names carry dynamics the parser
   * can't read (e.g. "hit_stick_mp1" vs "hit_stick_f1": "f1" also reads as a note). A file gets
   * the layer of the first pattern it matches.
   */
  layerBy?: RegExp[];
  /** Attack and release in seconds. */
  attack?: number;
  release?: number;
  /** One-shots ring out for their natural length and ignore note duration (pizz, mallets, drums). */
  oneShot?: boolean;
  /** Overall gain for this instrument's samples. */
  gain?: number;
  /** Semitones to add to every parsed note (fix mislabelled sets). */
  transpose?: number;
  /** Fine tuning for the whole instrument, in cents (measured; see pitch.test.ts). */
  cents?: number;
  /**
   * Measure each recording's pitch on load and correct it individually (sets that drift per note).
   * "heard" tunes the pitch you hear (loudness-weighted over the first half second) rather than
   * the settled sustain: for plucks that start sharp and settle, and winds that scoop in.
   */
  autotune?: boolean | "heard";
  /** Harmonic overtones (winds, brass, strings): lets autotune measure low notes on a higher partial. */
  harmonic?: boolean;
  /** With autotune: drop takes whose pitch can't be measured reliably (bent staccato notes). */
  strictTuning?: boolean;
  /**
   * Even out loudness across the range: scale each recording to its layer's median level
   * (sets recorded with one dynamic whose low notes came out much softer, e.g. the tenor sax).
   * Layers keep their soft/loud difference.
   */
  even?: boolean;
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

/** A recording whose note starts later than this (seconds) is broken, not a slow attack. */
const MAX_LEAD = 0.5;

/**
 * Cut the near-silence before the note (many Versilian recordings have 50-250 ms of room tone
 * first, which made their notes land late), keeping 3 ms before the first sample above -40 dB
 * of the peak so the attack is intact. Null for a silent or broken recording.
 */
export function trimLead(audio: Audio): Audio | null {
  const { left, right, rate } = audio;
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  if (peak < 1e-4) return null;
  const floor = peak * 0.01;
  let i = 0;
  while (i < left.length && Math.abs(left[i]!) <= floor && Math.abs(right[i]!) <= floor) i++;
  if (i / rate > MAX_LEAD) return null;
  const start = Math.max(0, i - Math.round(rate * 0.003));
  return { rate, left: left.subarray(start), right: right.subarray(start) };
}

interface Reading {
  /** Cents above the label (NaN when nothing could be read). */
  cents: number;
  /** The reading is trustworthy enough to tune by. */
  steady: boolean;
}

/**
 * How far a recording sits from its label. Measured at the label (the set is labelled right,
 * just out of tune). Mallets and bells read their fundamental (their overtones are
 * inharmonic). Harmonic instruments read every partial from 150 Hz to 2.5 kHz (at least the
 * first four) and take the median; it is steady only when the partials agree, since short
 * staccato notes bend in pitch and their partials scatter. Offsets of 60+ cents are misreads.
 */
function measurePitch(z: Zone, harmonic: boolean, heard: boolean): Reading {
  const hz = 440 * 2 ** ((z.note - 69) / 12);
  const read = (h: number) => (heard ? centsHeard : centsNear)(z.audio.left, z.audio.rate, z.note, h);
  if (!harmonic) {
    const cents = read(1);
    return { cents, steady: Math.abs(cents) < 60 };
  }
  const reads: number[] = [];
  for (let h = 1; h <= 8; h++) {
    // Low and middle notes: partials up to 2.5 kHz; high notes: the first four.
    if (h * hz < 150 || h * hz > Math.max(2500, hz * 4.5)) continue;
    const c = read(h);
    if (Number.isFinite(c)) reads.push(c);
  }
  if (!reads.length) return { cents: NaN, steady: false };
  reads.sort((a, b) => a - b);
  const cents = reads[Math.floor(reads.length / 2)]!;
  const spread = reads[Math.floor((reads.length * 3) / 4)]! - reads[Math.floor(reads.length / 4)]!;
  return { cents, steady: reads.length >= 3 && spread <= 12 && Math.abs(cents) < 60 };
}

/** RMS of the first `seconds` of a recording (both channels). */
function rms(audio: Audio, seconds: number): number {
  const n = Math.min(audio.left.length, Math.round(audio.rate * seconds));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += audio.left[i]! ** 2 + audio.right[i]! ** 2;
  return Math.sqrt(sum / (2 * Math.max(1, n)));
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
  readonly opts: Required<Omit<InstrumentOptions, "match" | "fixedNote" | "layerBy">> & InstrumentOptions;
  private rrCounter = new Map<number, number>();

  constructor(opts: InstrumentOptions) {
    this.opts = { attack: 0.004, release: 0.25, oneShot: false, gain: 1, transpose: 0, cents: 0, autotune: false, harmonic: false, strictTuning: false, even: false, ...opts };
    const dir = opts.dir.startsWith("/") ? opts.dir : join(SAMPLES, opts.dir);
    const files = readdirSync(dir).filter((f) => /\.(wav|flac)$/i.test(f) && (!opts.match || opts.match.test(f)));
    for (const f of files.sort()) {
      const parsed = parseName(f);
      if (opts.fixedNote) parsed.note = midi(opts.fixedNote);
      if (opts.layerBy) {
        const i = opts.layerBy.findIndex((re) => re.test(f));
        if (i >= 0) parsed.layer = i + 1;
      }
      if (Number.isNaN(parsed.note)) continue;
      const audio = trimLead(readWav(wavPath(join(dir, f))));
      if (!audio) {
        console.warn(`${dir}/${f}: skipped (silent, or more than ${MAX_LEAD} s before the note starts)`);
        continue;
      }
      this.zones.push({ ...parsed, note: parsed.note + this.opts.transpose, audio, detune: this.opts.cents });
    }
    if (!this.zones.length) throw new Error(`${dir}: no usable samples (match ${opts.match ?? "any"})`);
    if (this.opts.autotune) {
      const reading = new Map<Zone, Reading>();
      for (const z of this.zones) {
        const r = measurePitch(z, this.opts.harmonic, this.opts.autotune === "heard");
        reading.set(z, r);
        if (r.steady) z.detune = -r.cents;
      }
      // Bent staccato takes: keep a note's steady takes; if none is steady, the ones that are
      // at least near the pitch (within 15 cents).
      if (this.opts.strictTuning) {
        const ok = (z: Zone, steadyOnly: boolean) => {
          const r = reading.get(z)!;
          return steadyOnly ? r.steady : Math.abs(r.cents) <= 15;
        };
        const keep = this.zones.filter((z) => {
          const takes = this.zones.filter((o) => o.note === z.note && o.layer === z.layer);
          if (takes.some((o) => ok(o, true))) return ok(z, true);
          if (takes.some((o) => ok(o, false))) return ok(z, false);
          return true;
        });
        this.zones.splice(0, this.zones.length, ...keep);
      }
    }
    if (this.opts.even) {
      const level = new Map<Zone, number>(this.zones.map((z) => [z, rms(z.audio, 1)]));
      for (const layer of new Set(this.zones.map((z) => z.layer))) {
        const inLayer = this.zones.filter((z) => z.layer === layer);
        const sorted = inLayer.map((z) => level.get(z)!).sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)]!;
        for (const z of inLayer) z.level = median / Math.max(1e-6, level.get(z)!);
      }
    }
    // Number the round-robins per (note, layer) by order, so rr1/rr2 or repeated hits cycle.
    const seen = new Map<string, number>();
    for (const z of this.zones) {
      const key = `${z.note}/${z.layer}`;
      const k = (seen.get(key) ?? 0) + 1;
      seen.set(key, k);
      z.rr = k;
    }
  }

  /** The layer and the nearest recording a note at velocity 0..1 plays (before round robins). */
  zoneFor(note: number, velocity: number): Zone {
    const layers = [...new Set(this.zones.map((z) => z.layer))].sort((a, b) => a - b);
    const layer = layers[Math.min(layers.length - 1, Math.floor(velocity * layers.length))]!;
    let best: Zone | null = null;
    let bestCost = Infinity;
    for (const z of this.zones) {
      if (z.layer !== layer) continue;
      const d = note - z.note;
      // Prefer shifting up (d >= 0) and small shifts; down-shifts cost a little more.
      const cost = d >= 0 ? d : -d * 1.3;
      if (cost < bestCost) {
        bestCost = cost;
        best = z;
      }
    }
    return best!;
  }

  /** The zone for a note at velocity 0..1: nearest pitch, matching layer, cycling round robins. */
  pick(note: number, velocity: number): { zone: Zone; ratio: number } {
    const best = this.zoneFor(note, velocity);
    const candidates = this.zones.filter((z) => z.layer === best.layer && z.note === best.note);
    const key = best.note * 10 + best.layer;
    const next = ((this.rrCounter.get(key) ?? 0) % candidates.length) + 1;
    this.rrCounter.set(key, next);
    const zone = candidates.find((z) => z.rr === next) ?? best;
    return { zone, ratio: Math.pow(2, (note - zone.note + zone.detune / 100) / 12) };
  }

  /** Start every note's round robin from its first take again, so each render stands alone. */
  resetRoundRobin(): void {
    this.rrCounter.clear();
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
  /** One-shots only: seconds it rings before its release starts (default: the whole recording). */
  ring?: number;
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
    const holdFrames = inst.opts.oneShot ? (ev.ring === undefined ? Infinity : Math.round(ev.ring * rate)) : Math.round(ev.dur * rate);
    const releaseFrames = Math.max(1, Math.round(inst.opts.release * rate));
    const srcFrames = src.left.length;
    const amp = gain * inst.opts.gain * (zone.level ?? 1) * (0.35 + 0.65 * ev.vel);
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
