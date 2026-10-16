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
import { centsHeardPartials, centsNear } from "./pitch";
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

export interface Zone {
  /** The recording's file name (for reports). */
  file: string;
  note: number;
  layer: number;
  rr: number;
  audio: Audio;
  /** Tuning correction for this recording, in cents. */
  detune: number;
  /**
   * Heard tuning of the notes this recording plays other than its own long note (see
   * detuneFor), by pitch played and length. Measured when first played.
   */
  played?: Map<string, number>;
  /** Gain that evens this recording with the rest of its layer (1 unless `even`). */
  level?: number;
}

export interface InstrumentOptions {
  /** Folder under ~/APP/samples (or absolute). */
  dir: string;
  /** Only files whose name matches. */
  match?: RegExp;
  /** Leave out files whose name matches (takes that can't be played in tune). */
  exclude?: RegExp;
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
   * the settled sustain: for plucks that start sharp and settle, and winds that scoop in. Every
   * other note a recording plays (shorter than LONG_NOTE, or at another pitch) is tuned on what
   * it sounds like as played (detuneFor).
   */
  autotune?: boolean | "heard";
  /** Harmonic overtones (winds, brass, strings): lets autotune measure low notes on a higher partial. */
  harmonic?: boolean;
  /**
   * Piano-like strings, whose overtones run progressively sharp: autotune reads the fundamental,
   * or partials 2-4 below 130 Hz where the fundamental is weak (that is how the low notes are
   * heard, and it keeps the natural stretch a tuner gives the bass).
   */
  stretched?: boolean;
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

/** A take reading within this many cents of its label is tuned even when its partials scatter. */
const NEAR = 15;
/**
 * A note sounding at least this long (seconds) is heard over the same frames as a whole
 * recording (pitch.ts centsHeard: 0.6 s of frame starts, plus a frame). Shorter notes are
 * measured at their length in steps of SHORT_STEP seconds.
 */
const LONG_NOTE = 0.8;
const SHORT_STEP = 0.01;

/** The two channels' average. */
function mono(left: Float32Array, right: Float32Array): Float32Array {
  return left.map((v, i) => (v + right[i]!) / 2);
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
  /** Good enough to tune by: the partials roughly agree (plucks' partials fade unevenly). */
  usable: boolean;
  /** The partials agree closely: a clean take (strictTuning keeps these). */
  steady: boolean;
}

/** How a set's pitch is read: see measure(). */
export type PitchKind = "harmonic" | "stretched" | "fundamental";

/**
 * How far a recording (or a rendered note) sits from `note`. Measured at the label (the set is
 * labelled right, just out of tune). Mallets and bells read their fundamental (their overtones
 * are inharmonic). Harmonic instruments read every partial from 150 Hz to 2.5 kHz (at least the
 * first four) and take the median; it is steady only when the partials agree, since short
 * staccato notes bend in pitch and their partials scatter. Offsets of 60+ cents are misreads.
 */
function measure(x: Float32Array, rate: number, note: number, kind: PitchKind, heard: boolean): Reading {
  const hz = 440 * 2 ** ((note - 69) / 12);
  const read = (hs: number[]) => (heard ? centsHeardPartials(x, rate, note, hs) : hs.map((h) => centsNear(x, rate, note, h)));
  if (kind === "fundamental" || (kind === "stretched" && hz >= 130)) {
    const cents = read([1])[0]!;
    const ok = Math.abs(cents) < 60;
    return { cents, usable: ok, steady: ok };
  }
  // Low and middle notes: partials up to 2.5 kHz; high notes: the first four.
  const partials = kind === "stretched" ? [2, 3, 4] : [1, 2, 3, 4, 5, 6, 7, 8].filter((h) => h * hz >= 150 && h * hz <= Math.max(2500, hz * 4.5));
  const reads = read(partials).filter(Number.isFinite);
  if (!reads.length) return { cents: NaN, usable: false, steady: false };
  reads.sort((a, b) => a - b);
  const cents = reads[Math.floor(reads.length / 2)]!;
  const spread = reads[Math.floor((reads.length * 3) / 4)]! - reads[Math.floor(reads.length / 4)]!;
  const ok = Math.abs(cents) < 60 && (kind === "stretched" || reads.length >= 3);
  return { cents, usable: ok && spread <= 25, steady: ok && spread <= 12 };
}

/** Cents a signal is heard off `note`, read the way autotune reads a set of `kind`; `usable` as autotune judges it. */
export function measureHeard(x: Float32Array, rate: number, note: number, kind: PitchKind): { cents: number; usable: boolean } {
  const { cents, usable } = measure(x, rate, note, kind, true);
  return { cents, usable };
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
  readonly opts: Required<Omit<InstrumentOptions, "match" | "exclude" | "fixedNote" | "layerBy">> & InstrumentOptions;
  private rrCounter = new Map<number, number>();

  constructor(opts: InstrumentOptions) {
    this.opts = { attack: 0.004, release: 0.25, oneShot: false, gain: 1, transpose: 0, cents: 0, autotune: false, harmonic: false, stretched: false, strictTuning: false, even: false, ...opts };
    const dir = opts.dir.startsWith("/") ? opts.dir : join(SAMPLES, opts.dir);
    const files = readdirSync(dir).filter((f) => /\.(wav|flac)$/i.test(f) && (!opts.match || opts.match.test(f)) && !opts.exclude?.test(f));
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
      this.zones.push({ ...parsed, file: f, note: parsed.note + this.opts.transpose, audio, detune: this.opts.cents });
    }
    if (!this.zones.length) throw new Error(`${dir}: no usable samples (match ${opts.match ?? "any"})`);
    if (this.opts.autotune) {
      const reading = new Map<Zone, Reading>();
      for (const z of this.zones) {
        // Both channels, as they sound together: stereo takes read up to 10 cents apart.
        const r = measure(mono(z.audio.left, z.audio.right), z.audio.rate, z.note, this.kind, this.opts.autotune === "heard");
        reading.set(z, r);
        // A take whose partials scatter (a bent pluck) is still tuned when it reads near the
        // pitch: the median of its partials is the best guess there.
        if (r.usable || Math.abs(r.cents) <= NEAR) z.detune = -r.cents;
      }
      // Bent staccato takes: keep a note's steady takes; if none is steady, the ones that are
      // at least near the pitch (tuned by their reading).
      if (this.opts.strictTuning) {
        const ok = (z: Zone, steadyOnly: boolean) => {
          const r = reading.get(z)!;
          return steadyOnly ? r.steady : Math.abs(r.cents) <= NEAR;
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

  /** How this set's pitch is read. */
  get kind(): PitchKind {
    return this.opts.harmonic ? "harmonic" : this.opts.stretched ? "stretched" : "fundamental";
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

  /**
   * The zone for a note at velocity 0..1: nearest pitch, matching layer, cycling round robins.
   * `held` is how long the note sounds before its release, in seconds.
   */
  pick(note: number, velocity: number, held = Infinity): { zone: Zone; ratio: number } {
    const best = this.zoneFor(note, velocity);
    const candidates = this.zones.filter((z) => z.layer === best.layer && z.note === best.note);
    const key = best.note * 10 + best.layer;
    const next = ((this.rrCounter.get(key) ?? 0) % candidates.length) + 1;
    this.rrCounter.set(key, next);
    const zone = candidates.find((z) => z.rr === next) ?? best;
    return { zone, ratio: Math.pow(2, (note - zone.note + this.detuneFor(zone, note, held) / 100) / 12) };
  }

  /**
   * Tuning for `note` played on a recording, sounding `held` seconds before its release. The
   * recording's own long note takes its `detune`. Any other is heard differently: a short note
   * is heard as the start of its take, and many takes start off their settled pitch (horns,
   * trombones, tubas and saxes scoop up into a note; plucks start sharp); a take played a step
   * or two away from its pitch reads other partials, and a pluck or vibrato over other frames.
   * So with "heard" autotune each such note is rendered once as played (its pitch, attack, hold
   * and release) and tuned on what that sounds like. One that can't be read keeps the detune.
   */
  private detuneFor(zone: Zone, note: number, held: number): number {
    const step = held < LONG_NOTE ? Math.max(1, Math.round(held / SHORT_STEP)) : 0;
    const shift = Math.round((note - zone.note) * 100);
    if (this.opts.autotune !== "heard" || (step === 0 && shift === 0)) return zone.detune;
    const key = `${shift}/${step}`;
    zone.played ??= new Map();
    let cents = zone.played.get(key);
    if (cents === undefined) {
      const { rate } = zone.audio;
      const hold = step ? step * SHORT_STEP : LONG_NOTE;
      const len = Math.ceil((hold + this.opts.release + 0.2) * rate);
      const left = new Float32Array(len);
      const right = new Float32Array(len);
      const ev = { time: 0, dur: hold, ring: hold, note, vel: 1 };
      renderNote(this, { zone, ratio: Math.pow(2, shift / 1200) }, ev, left, right, rate, 1, 0);
      const r = measure(mono(left, right), rate, zone.note + shift / 100, this.kind, true);
      cents = r.usable ? -r.cents : zone.detune;
      zone.played.set(key, cents);
    }
    return cents;
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

/** How long a note sounds before its release, in seconds: a one-shot rings until its `ring`. */
export function heldFor(inst: Instrument, ev: NoteEvent): number {
  return inst.opts.oneShot ? (ev.ring ?? Infinity) : ev.dur;
}

/**
 * Render notes into stereo buffers at `rate`. `pan` is -1..1 (equal-power). Anything ringing
 * past the end wraps to the start, for loops.
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
  for (const ev of events) renderNote(inst, inst.pick(ev.note, ev.vel, heldFor(inst, ev)), ev, outL, outR, rate, gain, pan);
}

/** Render one note on a picked recording (`ratio`: its playback speed), as renderNotes does. */
export function renderNote(
  inst: Instrument,
  { zone, ratio }: { zone: Zone; ratio: number },
  ev: NoteEvent,
  outL: Float32Array,
  outR: Float32Array,
  rate: number,
  gain: number,
  pan: number,
): void {
  const pl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const pr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const len = outL.length;
  const src = zone.audio;
  const step = ratio * (src.rate / rate);
  const start = Math.round(ev.time * rate);
  const attack = Math.max(1, Math.round(inst.opts.attack * rate));
  const held = heldFor(inst, ev);
  const holdFrames = Number.isFinite(held) ? Math.round(held * rate) : Infinity;
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
