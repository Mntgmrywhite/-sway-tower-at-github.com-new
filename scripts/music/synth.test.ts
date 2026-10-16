// The synth's checks: every pitched patch in tune across its range (pitch.ts, as the sampled
// sets are checked), level conventions (means over start frames), the presets' character (a
// bright stack, an acid squelch, a pluck's snap, electro grit, a punchy kick), finite and
// bounded output, clean note starts and ends, loop wrap (mono lines across the seam too),
// determinism and per-patch noise, the drums' spectra, band-limited oscillators, the
// loop-seamless pump and delay, and the sound effects (a howl that holds its note, wind that
// whistles up into its gust, snakes and chains where they belong in the spectrum).

import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./instruments";
import { centsFrom, centsHeard, centsNear } from "./pitch";
import { midi, type NoteEvent } from "./sampler";
import {
  beatHz,
  beats,
  duck,
  isEffect,
  isSynth,
  loopDelay,
  pumpEnvelope,
  renderSynth,
  SYNTHS,
  type HowlPatch,
  type Patch,
  type SynthName,
  type VoicePatch,
  type Wave,
  type WindPatch,
} from "./synth";

const RATE = 48000;
const NAMES = Object.keys(SYNTHS) as SynthName[];
const voice = (n: SynthName) => SYNTHS[n] as Patch as VoicePatch;
const VOICES = NAMES.filter((n) => SYNTHS[n].kind === "voice");
/** Sound effects (howl, wind, snakes, chains): held for the note's length, checked in their own block. */
const EFFECTS = NAMES.filter((n) => isEffect(SYNTHS[n]));
const DRUMS = NAMES.filter((n) => SYNTHS[n].kind !== "voice" && !EFFECTS.includes(n));
/** Risers and downlifters sweep their pitch or are noise: no pitch to hold. */
const PITCHED = VOICES.filter((n) => !voice(n).ramp);
/** Patches with a detuned unison stack. */
const STACKS = PITCHED.filter((n) => voice(n).osc.some((o) => (o.voices ?? 1) > 1 && (o.detune ?? 0) > 0));

const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
/** The lowest partial at or above `min` Hz: low notes are read on a partial, as the sampler's autotune does. */
const partial = (note: number, min: number) => Math.min(8, Math.max(1, Math.ceil(min / hz(note))));
const mono = (L: Float32Array, R: Float32Array) => L.map((v, i) => (v + R[i]!) / 2);

function render(patch: Patch | SynthName, events: NoteEvent[], seconds: number): [Float32Array, Float32Array] {
  const n = Math.round(seconds * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  renderSynth(patch, events, L, R, RATE, 1, 0);
  return [L, R];
}

/** Start frames for the effects' levels (their noise is seeded per note). */
const STARTS_FX = [0, 0.0137, 0.0274, 0.0411, 0.0548, 0.0685];

/** Fundamental (Hz) of a near-sinusoidal tone around `at` seconds: normalized autocorrelation, lo..hi Hz. */
function fundamentalNear(x: Float32Array, at: number, lo: number, hi: number): number {
  const a = Math.round(at * RATE);
  const n = 2048;
  let best = -1;
  let bestLag = 0;
  for (let lag = Math.floor(RATE / hi); lag <= Math.ceil(RATE / lo); lag++) {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < n; i++) {
      const u = x[a + i]!;
      const v = x[a + i + lag]!;
      s += u * v;
      e1 += u * u;
      e2 += v * v;
    }
    const c = s / Math.sqrt(e1 * e2 + 1e-20);
    // The first strong peak, not a later octave-down one.
    if (c > best + 1e-9) {
      best = c;
      bestLag = lag;
    } else if (best > 0.8 && c < best - 0.2) break;
  }
  return RATE / bestLag;
}

const peakOf = (...xs: Float32Array[]) => xs.reduce((m, x) => x.reduce((a, v) => Math.max(a, Math.abs(v)), m), 0);

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const h = i + k + len / 2;
        const vr = re[h]! * wr - im[h]! * wi;
        const vi = re[h]! * wi + im[h]! * wr;
        re[h] = re[i + k]! - vr;
        im[h] = im[i + k]! - vi;
        re[i + k] = re[i + k]! + vr;
        im[i + k] = im[i + k]! + vi;
      }
    }
  }
}

/** Power spectrum of `x` from frame `start` (Hann window of n, a power of two); bin k is k * RATE / n Hz. */
function power(x: Float32Array, n: number, start = 0, window = true): Float64Array {
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n && start + i < x.length; i++) re[i] = x[start + i]! * (window ? 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n) : 1);
  fft(re, im);
  const p = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) p[k] = re[k]! ** 2 + im[k]! ** 2;
  return p;
}

/** Share of a signal's energy between lo and hi Hz. */
function bandShare(x: Float32Array, lo: number, hi: number): number {
  const n = 2 ** Math.ceil(Math.log2(x.length));
  const p = power(x, n, 0, false);
  let band = 0;
  let total = 0;
  for (let k = 1; k < p.length; k++) {
    const f = (k * RATE) / n;
    total += p[k]!;
    if (f >= lo && f < hi) band += p[k]!;
  }
  return band / total;
}

/** Cents of the power-weighted mean frequency within ±60 cents of partial `h` of `note`. */
function centroidCents(x: Float32Array, note: number, h: number): number {
  const n = 65536;
  const p = power(x, n, Math.round(RATE * 0.02));
  const f = hz(note) * h;
  let sum = 0;
  let weight = 0;
  for (let k = Math.floor((f * 2 ** (-60 / 1200) * n) / RATE); k <= Math.ceil((f * 2 ** (60 / 1200) * n) / RATE); k++) {
    sum += p[k]! * k;
    weight += p[k]!;
  }
  return centsFrom((sum / weight / h) * (RATE / n), note);
}

describe("synth names", () => {
  it("never collide with an instrument (a song can tell them apart by name)", () => {
    for (const name of NAMES) expect(Object.hasOwn(INSTRUMENTS, name), name).toBe(false);
    expect(isSynth("superSaw")).toBe(true);
    expect(isSynth("piano")).toBe(false);
  });
});

describe("tuning", () => {
  // A detuned stack has no single spectral peak (its voices beat), so its tuning is checked as a
  // single voice here, with everything else as played: filter, envelopes, LFOs, drive. That the
  // stack itself is centered on the pitch is the next test.
  const single = (p: VoicePatch): VoicePatch => ({ ...p, osc: p.osc.map((o) => ({ ...o, voices: 1 })) });

  it.each(PITCHED)("%s plays in tune across its range (within 2 cents, as read and as heard)", (name) => {
    const p = voice(name);
    for (const n of [p.range[0], p.home, p.range[1]]) {
      const note = midi(n);
      const x = mono(...render(single(p), [{ time: 0, dur: 2, note, vel: 0.7 }], 2.5));
      const read = centsNear(x, RATE, note, partial(note, 100));
      const heard = centsHeard(x, RATE, note, partial(note, 160));
      expect(Math.abs(read), `${name} ${n} reads ${read.toFixed(2)} cents`).toBeLessThanOrEqual(2);
      expect(Math.abs(heard), `${name} ${n} is heard ${heard.toFixed(2)} cents`).toBeLessThanOrEqual(2);
    }
  });

  it.each(STACKS)("%s's unison stack is centered on the pitch", (name) => {
    // Vibrato off (it is a deliberate wobble around the pitch); several seeds (start frames).
    const p = voice(name);
    const still: VoicePatch = { ...p, lfos: (p.lfos ?? []).map((l) => ({ ...l, pitch: 0 })) };
    for (const n of [p.range[0], p.home, p.range[1]]) {
      const note = midi(n);
      for (const t of [0, 0.013, 0.031]) {
        const [L, R] = render(still, [{ time: t, dur: 2, note, vel: 0.7 }], 2.6);
        const x = mono(L, R).subarray(Math.round(t * RATE));
        const c = centroidCents(x, note, partial(note, 100));
        expect(Math.abs(c), `${name} ${n} centered ${c.toFixed(2)} cents`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("a mono legato phrase glides to each note without retriggering", () => {
    const g5 = midi("G5");
    // The lead without its (delayed) vibrato, so the settled pitch reads exactly.
    const lead: VoicePatch = { ...voice("sawLead"), lfos: [] };
    const [L, R] = render(lead, [
      { time: 0, dur: 0.55, note: midi("C5"), vel: 0.7 },
      { time: 0.5, dur: 2, note: g5, vel: 0.7 },
    ], 3);
    const x = mono(L, R);
    // Settled on the second note once the glide is over.
    const tail = x.subarray(Math.round(0.6 * RATE));
    expect(Math.abs(centsNear(tail, RATE, g5))).toBeLessThanOrEqual(2);
    // The slide itself, on a bare sine with the lead's glide: 20 ms windows hold about 10.5
    // cycles on C5, 12.8 halfway (C5 + 3.5 semitones, 30 ms into the 60 ms slide), 15.7 on G5.
    const sine: VoicePatch = { kind: "voice", mono: true, glide: voice("sawLead").glide, osc: [{ wave: "sine" }], amp: { attack: 0.002, decay: 1, sustain: 1, release: 0.05 }, range: ["C5", "G5"], home: "C5" };
    const s = mono(...render(sine, [{ time: 0, dur: 0.55, note: midi("C5"), vel: 0.7 }, { time: 0.5, dur: 1, note: g5, vel: 0.7 }], 2));
    const cycles = (from: number) => {
      let n = 0;
      for (let i = Math.round(from * RATE) + 1; i < Math.round((from + 0.02) * RATE); i++) if (s[i - 1]! < 0 && s[i]! >= 0) n++;
      return n;
    };
    expect(cycles(0.3)).toBeLessThanOrEqual(11);
    expect(cycles(0.52)).toBeGreaterThanOrEqual(12);
    expect(cycles(0.52)).toBeLessThanOrEqual(14);
    expect(cycles(0.7)).toBeGreaterThanOrEqual(15);
    // No retrigger: the sine's level holds through the second note (a new attack would start
    // from silence).
    const rms = (a: number) => {
      let sum = 0;
      for (let i = a; i < a + 480; i++) sum += s[i]! ** 2;
      return Math.sqrt(sum / 480);
    };
    const before = rms(Math.round(0.4 * RATE));
    for (let t = 0.45; t < 0.7; t += 0.005) expect(rms(Math.round(t * RATE))).toBeGreaterThan(before * 0.95);
  });
});

describe("levels", () => {
  // Gain 1, velocity 0.7: pitched patches about -28 dB RMS at their home note over its first
  // half second (like the horn in instruments.ts; risers over the last half second of a 2 s
  // sweep); drum peaks near the sampled kit's. Each note's unison phases and noise are seeded by
  // its start frame, and a detuned stack beats slowly, so one note's first half second can sit
  // several dB above or below another's (a reese or a pad by up to 6 dB): levels are the mean
  // over many start frames (gains were set on 96), never one lucky note.
  const STARTS = Array.from({ length: 32 }, (_, k) => k * 0.0137);
  it.each(VOICES)("%s plays its home note at about -28 dB RMS (mean over start frames)", (name) => {
    const p = voice(name);
    let power = 0;
    for (const t of STARTS) {
      const [L, R] = render(name, [{ time: t, dur: p.ramp ? 2 : 0.6, note: midi(p.home), vel: 0.7 }], 3.5);
      const s0 = Math.round(t * RATE);
      const [a, b] = p.ramp?.amp ? [s0 + 1.5 * RATE, s0 + 2 * RATE] : [s0, s0 + 0.5 * RATE];
      let s = 0;
      for (let i = a; i < b; i++) s += L[i]! ** 2 + R[i]! ** 2;
      power += s / (2 * (b - a)) / STARTS.length;
    }
    expect(Math.abs(10 * Math.log10(power) + 28)).toBeLessThan(0.75);
  });

  const PEAKS: Record<string, number> = { dmKick: -10, dmSnare: -10, dmClap: -10, dmTomHigh: -12, dmTomMid: -12, dmTomLow: -12, dmHat: -20, dmHatOpen: -20, dmRide: -22, dmCrash: -22 };
  it.each(DRUMS)("%s peaks near the sampled kit (mean over hits)", (name) => {
    let sum = 0;
    for (const t of STARTS) sum += 20 * Math.log10(peakOf(...render(name, [{ time: t, dur: 0.1, note: 60, vel: 0.7 }], 3.5))) / STARTS.length;
    expect(Math.abs(sum - PEAKS[name]!)).toBeLessThan(1);
  });
});

describe("character", () => {
  // The genre's sounds, not toy synths: these lock in what the presets are voiced for.
  /** dB of a stretch's energy at or above `lo` Hz (Hann-windowed unless `windowed` is false). */
  const share = (x: Float32Array, start: number, n: number, lo: number, windowed = true) => {
    const p = power(x, n, start, windowed);
    let hi = 0;
    let all = 0;
    for (let k = 1; k < p.length; k++) {
      all += p[k]!;
      if ((k * RATE) / n >= lo) hi += p[k]!;
    }
    return 10 * Math.log10(hi / all);
  };

  it("the super saw is bright (fizz above 5 kHz), the pad dark", () => {
    const at = (name: SynthName) => share(mono(...render(name, [{ time: 0, dur: 1.5, note: midi("C4"), vel: 0.8 }], 2)), Math.round(0.05 * RATE), 32768, 5000);
    expect(at("superSaw")).toBeGreaterThan(-24);
    expect(at("superSawPad")).toBeLessThan(at("superSaw") - 15);
  });

  it("the acid filter squelches: still open 30 ms into a note, closed by 300 ms", () => {
    const x = mono(...render("acidBass", [{ time: 0, dur: 1, note: midi("A2"), vel: 0.7 }], 1.5));
    expect(share(x, Math.round(0.03 * RATE), 1024, 1000)).toBeGreaterThan(-20);
    expect(share(x, Math.round(0.3 * RATE), 1024, 1000)).toBeLessThan(-40);
  });

  it("the pluck snaps: bright at the attack, closed as it dies", () => {
    // (It closes to about six times the pitch, so the snap is read above 6 kHz.)
    const x = mono(...render("pluck", [{ time: 0, dur: 0.5, note: midi("C5"), vel: 0.8 }], 1));
    expect(share(x, 0, 1024, 6000) - share(x, Math.round(0.25 * RATE), 1024, 6000)).toBeGreaterThan(10);
  });

  it("the electro bass is gritty: its held tone keeps energy above 3 kHz", () => {
    const x = mono(...render("electroBass", [{ time: 0, dur: 1, note: midi("A2"), vel: 0.7 }], 1.5));
    expect(share(x, Math.round(0.3 * RATE), 8192, 3000)).toBeGreaterThan(-40);
  });

  it("the kick punches: its pitch drops fast and its first 10 ms carry a click", () => {
    const x = mono(...render("dmKick", [{ time: 0, dur: 0.1, note: 60, vel: 0.8 }], 1));
    // Half-cycle length around 40 ms: the body is within half an octave of its 50 Hz.
    let a = Math.round(0.04 * RATE);
    while (Math.sign(x[a]!) === Math.sign(x[a - 1]!)) a++;
    let b = a + 1;
    while (Math.sign(x[b]!) === Math.sign(x[b - 1]!)) b++;
    expect(RATE / (2 * (b - a))).toBeLessThan(50 * Math.SQRT2);
    // Unwindowed: the click is over in a few ms, which a window centered at 5 ms would hide.
    expect(share(x.slice(0, 480), 0, 512, 1000, false)).toBeGreaterThan(-24);
  });
});

/** A busy, loud part for each patch: chords at the range ends, a mono line with slides and leaps, a fast drum figure with chokes. */
function busy(name: SynthName): NoteEvent[] {
  const p = SYNTHS[name];
  if (p.kind !== "voice") return Array.from({ length: 12 }, (_, i) => ({ time: i * 0.12, dur: 0.1, note: 60, vel: 1, ...(i % 3 === 2 ? { ring: 0.05 } : {}) }));
  const v = p as Patch as VoicePatch;
  const [lo, hi] = v.range.map(midi) as [number, number];
  const mid = Math.round((lo + hi) / 2);
  if (v.mono) {
    return [lo, lo + 12, mid, hi, hi - 5, lo, mid + 7, hi].map((note, i) => ({ time: i * 0.2, dur: i % 2 ? 0.26 : 0.15, note, vel: i % 3 ? 0.6 : 1 }));
  }
  return [lo, mid, hi - 7].flatMap((root, i) => [0, 3, 7, 12].map((iv) => ({ time: i * 0.7, dur: 0.6, note: root + iv, vel: 1 })));
}

describe("safety", () => {
  // At gain 1: a single full-velocity note peaks below 1, a busy part (four-note chords at full
  // velocity) below 2. A pluck's snap peaks highest: levels match energy (-28 dB RMS), not peaks.
  it.each(NAMES)("%s renders finite, bounded audio", (name) => {
    const [L, R] = render(name, busy(name), 6);
    expect(L.every(Number.isFinite) && R.every(Number.isFinite)).toBe(true);
    expect(peakOf(L, R)).toBeGreaterThan(0.01);
    expect(peakOf(L, R)).toBeLessThan(2);
    const p = SYNTHS[name];
    const notes = p.kind === "voice" ? (p as Patch as VoicePatch).range.map(midi) : [60];
    for (const note of notes) expect(peakOf(...render(name, [{ time: 0, dur: 1, note, vel: 1 }], 4)), `${name} ${note}`).toBeLessThan(1);
  });

  it.each(VOICES)("%s notes start from silence and end in silence (no clicks)", (name) => {
    const p = voice(name);
    for (const n of [p.range[0], p.home, p.range[1]]) {
      const [L, R] = render(name, [{ time: 0, dur: 0.5, note: midi(n), vel: 1 }], 8);
      const peak = peakOf(L, R);
      let last = 0;
      for (let i = 0; i < L.length; i++) if (L[i] !== 0 || R[i] !== 0) last = i;
      // The first frames are a fade-in, not a step; the last is far below the note.
      expect(Math.max(Math.abs(L[0]!), Math.abs(R[0]!), Math.abs(L[1]!), Math.abs(R[1]!)) / peak).toBeLessThan(0.05);
      expect(Math.max(Math.abs(L[last]!), Math.abs(R[last]!)) / peak).toBeLessThan(1e-3);
      expect(last).toBeLessThan(L.length - 1);
    }
  });

  it("drum hits fade in and ring out (and a choke stops them)", () => {
    for (const name of DRUMS) {
      const [L, R] = render(name, [{ time: 0, dur: 0.1, note: 60, vel: 1 }], 5);
      const peak = peakOf(L, R);
      expect(Math.max(Math.abs(L[0]!), Math.abs(R[0]!)) / peak, name).toBeLessThan(0.05);
    }
    const [L, R] = render("dmHatOpen", [{ time: 0, dur: 0.1, note: 60, vel: 1, ring: 0.05 }], 1);
    const [OL, OR] = render("dmHatOpen", [{ time: 0, dur: 0.1, note: 60, vel: 1 }], 1);
    const after = Math.round(0.25 * RATE);
    expect(peakOf(L.subarray(after), R.subarray(after))).toBeLessThan(peakOf(L, R) * 1e-3);
    expect(peakOf(OL.subarray(after), OR.subarray(after))).toBeGreaterThan(peakOf(OL, OR) * 1e-2);
  });
});

describe("loops", () => {
  // In a 1 s loop, notes that start 0.7 s in and ring past the end must continue at the start:
  // the loop render equals a long render folded onto the loop.
  it.each(["superSaw", "pluck", "acidBass", "riser", "dmHatOpen", "dmCrash", "dmKick"] as SynthName[])("%s: a note crossing the loop end continues at its start", (name) => {
    const events: NoteEvent[] = [
      { time: 0.7, dur: 0.25, note: 57, vel: 0.9 },
      { time: 0.9, dur: 0.4, note: 60, vel: 0.8 },
    ];
    const [L, R] = render(name, events, 1);
    const [LL, LR] = render(name, events, 6);
    let worst = 0;
    for (let i = 0; i < RATE; i++) {
      let l = 0;
      let r = 0;
      for (let k = i; k < LL.length; k += RATE) {
        l += LL[k]!;
        r += LR[k]!;
      }
      worst = Math.max(worst, Math.abs(L[i]! - l), Math.abs(R[i]! - r));
    }
    expect(peakOf(L.subarray(0, Math.round(0.2 * RATE)))).toBeGreaterThan(0);
    expect(worst).toBeLessThan(1e-6);
  });

  it("a mono line runs on across the loop end as it does inside the loop (slides, no double voice)", () => {
    // The last note reaches the first one's next pass: inside a long render of the line repeated,
    // it slides into it without a retrigger; the 1 s loop must sound the same at its seam.
    // (subBass: single-voice oscillators, so every pass renders bit-alike.)
    const line = (offset: number): NoteEvent[] => [
      { time: offset + 0.1, dur: 0.3, note: midi("C2"), vel: 0.8 },
      { time: offset + 0.5, dur: 0.2, note: midi("E2"), vel: 0.8 },
      { time: offset + 0.8, dur: 0.3, note: midi("G2"), vel: 0.8 },
    ];
    const [L] = render("subBass", line(0), 1);
    const [LL] = render("subBass", [0, 1, 2, 3, 4, 5].flatMap(line), 6);
    let worst = 0;
    for (let i = 0; i < RATE; i++) worst = Math.max(worst, Math.abs(L[i]! - LL[2 * RATE + i]!));
    expect(worst).toBeLessThan(1e-6);
    // A note held longer than the loop is cut by its own next pass (mono: one voice), not
    // stacked on itself: the loop holds its head once, and its tail once up to that next pass.
    const long: NoteEvent = { time: 0.5, dur: 2, note: midi("C2"), vel: 0.8 };
    const [S] = render("subBass", [long], 1);
    const [U] = render("subBass", [long], 4);
    let off = 0;
    for (let i = Math.round(0.6 * RATE); i < RATE; i++) off = Math.max(off, Math.abs(S[i]! - U[i]!));
    for (let i = Math.round(0.1 * RATE); i < Math.round(0.49 * RATE); i++) off = Math.max(off, Math.abs(S[i]! - U[RATE + i]!));
    expect(off).toBeLessThan(1e-6);
  });

  it("different patches struck together get their own noise and phases", () => {
    // Same moment, same note: a closed hat on an open one must not be the same noise twice.
    const a = mono(...render("dmHat", [{ time: 0.1, dur: 0.1, note: 60, vel: 0.8 }], 0.5));
    const b = mono(...render("dmHatOpen", [{ time: 0.1, dur: 0.1, note: 60, vel: 0.8 }], 0.5));
    let ab = 0;
    let aa = 0;
    let bb = 0;
    for (let i = Math.round(0.1 * RATE); i < Math.round(0.13 * RATE); i++) {
      ab += a[i]! * b[i]!;
      aa += a[i]! ** 2;
      bb += b[i]! ** 2;
    }
    expect(Math.abs(ab / Math.sqrt(aa * bb))).toBeLessThan(0.5);
  });

  it.each(NAMES)("%s renders the same every time", (name) => {
    const [L1, R1] = render(name, busy(name), 3);
    const [L2, R2] = render(name, busy(name), 3);
    // Bit for bit.
    const bytes = (x: Float32Array) => Buffer.from(x.buffer, x.byteOffset, x.byteLength);
    expect(bytes(L1).equals(bytes(L2)) && bytes(R1).equals(bytes(R2))).toBe(true);
  });

  it("a note sounds the same whatever else plays", () => {
    for (const name of ["superSaw", "dmClap"] as SynthName[]) {
      const a: NoteEvent = { time: 0.1, dur: 0.5, note: 60, vel: 0.8 };
      const b: NoteEvent = { time: 0.4, dur: 0.5, note: 64, vel: 0.6 };
      const [AL] = render(name, [a], 3);
      const [BL] = render(name, [b], 3);
      const [BothL] = render(name, [b, a], 3);
      let worst = 0;
      for (let i = 0; i < AL.length; i++) worst = Math.max(worst, Math.abs(BothL[i]! - AL[i]! - BL[i]!));
      expect(worst, name).toBeLessThan(1e-6);
    }
  });
});

describe("drums", () => {
  const hit = (name: SynthName, note = 60) => mono(...render(name, [{ time: 0, dur: 0.1, note, vel: 0.8 }], 4));

  it("the kick sits below 150 Hz", () => {
    expect(bandShare(hit("dmKick"), 0, 150)).toBeGreaterThan(0.65);
  });
  it("the hats sit above 5 kHz, the cymbals mostly", () => {
    for (const name of ["dmHat", "dmHatOpen"] as SynthName[]) expect(bandShare(hit(name), 5000, 24000), name).toBeGreaterThan(0.9);
    for (const name of ["dmRide", "dmCrash"] as SynthName[]) expect(bandShare(hit(name), 5000, 24000), name).toBeGreaterThan(0.6);
  });
  it("the clap is a midrange crack, the snare a body plus a bright snap", () => {
    expect(bandShare(hit("dmClap"), 500, 5000)).toBeGreaterThan(0.75);
    expect(bandShare(hit("dmSnare"), 150, 500)).toBeGreaterThan(0.2);
    expect(bandShare(hit("dmSnare"), 2000, 24000)).toBeGreaterThan(0.35);
  });
  it("the toms step down in pitch, and a keyed tom follows the note", () => {
    const peakHz = (x: Float32Array) => {
      const n = 65536;
      const p = power(x, n);
      let best = 1;
      for (let k = 1; k < p.length; k++) if (p[k]! > p[best]!) best = k;
      return (best * RATE) / n;
    };
    const [hi, mid, lo] = (["dmTomHigh", "dmTomMid", "dmTomLow"] as SynthName[]).map((n) => peakHz(hit(n)));
    expect(hi).toBeGreaterThan(mid!);
    expect(mid).toBeGreaterThan(lo!);
    // Unkeyed, every note is the same hit; keyed, an octave up sounds an octave up.
    expect(peakHz(hit("dmTomMid", 72))).toBeCloseTo(mid!, 0);
    const keyed = { ...SYNTHS.dmTomMid, keyed: true };
    const up = peakHz(mono(...render(keyed, [{ time: 0, dur: 0.1, note: 72, vel: 0.8 }], 4)));
    expect(Math.abs(1200 * Math.log2(up / mid! / 2))).toBeLessThan(25);
  });
});

describe("oscillators", () => {
  // Band-limited (polyBLEP saw and pulse, polyBLAMP triangle): at high notes, far less energy
  // away from the harmonics (aliases) than the naive waveform.
  const aliasDb = (x: Float32Array, f0: number, maxHz = RATE / 2) => {
    const n = 32768;
    const p = power(x, n, 4800);
    let alias = 0;
    let total = 0;
    for (let k = 1; k < p.length && (k * RATE) / n <= maxHz; k++) {
      const h = (k * RATE) / n / f0;
      total += p[k]!;
      if (Math.round(h) === 0 || Math.abs(h - Math.round(h)) * f0 > 25) alias += p[k]!;
    }
    return 10 * Math.log10(alias / total);
  };
  const naive = (wave: Wave, f0: number) => {
    const x = new Float32Array(RATE * 2);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      x[i] = wave === "saw" ? 2 * ph - 1 : wave === "pulse" ? (ph < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(ph - 0.5);
      ph = (ph + f0 / RATE) % 1;
    }
    return x;
  };
  // And in absolute terms, where it is heard (up to 16 kHz; polyBLEP leaves its residue mostly
  // just under Nyquist): at C7 and G7 about -40 dB for the saw and pulse, -60 dB for the triangle.
  const CEILING: Record<string, number> = { saw: -35, pulse: -35, triangle: -52 };
  it.each(["saw", "pulse", "triangle"] as Wave[])("%s is band-limited", (wave) => {
    const bare: VoicePatch = { kind: "voice", osc: [{ wave }], amp: { attack: 0.001, decay: 1, sustain: 1, release: 0.1 }, range: ["C4", "C8"], home: "C6" };
    for (const note of [96, 103]) {
      const f0 = hz(note);
      const [L] = render(bare, [{ time: 0, dur: 1.9, note, vel: 1 }], 2);
      expect(aliasDb(L, f0), `${wave} ${note}`).toBeLessThan(aliasDb(naive(wave, f0), f0) - 12);
      expect(aliasDb(L, f0, 16000), `${wave} ${note} up to 16 kHz`).toBeLessThan(CEILING[wave]!);
    }
  });
});

describe("pump", () => {
  it("dips at each kick and swells back by its release", () => {
    const frames = RATE * 2;
    const curve = pumpEnvelope(frames, RATE, [0.5, 1], { depth: 0.6, attack: 0.005, release: 0.2 });
    const at = (t: number) => curve[Math.round(t * RATE)]!;
    expect(at(0.4)).toBe(1);
    expect(at(0.505)).toBeCloseTo(0.4, 2);
    expect(at(0.6)).toBeGreaterThan(at(0.55));
    expect(at(0.71)).toBe(1);
    // No steps: the gain never jumps by more than an attack's share per frame.
    for (let i = 1; i < frames; i++) expect(Math.abs(curve[i]! - curve[i - 1]!)).toBeLessThanOrEqual(0.6 / (0.005 * RATE) + 1e-6);
  });

  it("is loop-seamless: a kick just before the loop end ducks its start", () => {
    const frames = RATE;
    const curve = pumpEnvelope(frames, RATE, [0.99], { depth: 0.8, release: 0.1 });
    expect(curve[0]!).toBeLessThan(0.5);
    expect(Math.abs(curve[0]! - curve[frames - 1]!)).toBeLessThan(0.01);
    expect(curve[Math.round(0.2 * RATE)]).toBe(1);
    const L = new Float32Array(frames).fill(1);
    const R = new Float32Array(frames).fill(0.5);
    duck(L, R, curve);
    expect(L[0]).toBeCloseTo(curve[0]!, 6);
    expect(R[0]).toBeCloseTo(curve[0]! / 2, 6);
  });
});

describe("delay", () => {
  it("is tempo-synced", () => {
    expect(beats(124, 0.75)).toBeCloseTo((0.75 * 60) / 124, 12);
    expect(beatHz(120, 2)).toBe(1);
  });

  it("ping-pongs: left, then right, each echo quieter", () => {
    const n = RATE * 2;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    L[1000] = 1;
    R[1000] = 1;
    const time = 0.25;
    const [wl, wr] = loopDelay(L, R, RATE, { time, feedback: 0.5, damp: 20000, lowCut: 20 });
    const near = (x: Float32Array, at: number) => peakOf(x.subarray(at - 200, at + 200));
    const D = Math.round(time * RATE);
    expect(near(wl, 1000 + D)).toBeGreaterThan(0.5);
    expect(near(wr, 1000 + D)).toBeLessThan(0.01);
    expect(near(wr, 1000 + 2 * D)).toBeGreaterThan(0.2);
    expect(near(wl, 1000 + 3 * D)).toBeLessThan(near(wl, 1000 + D));
  });

  it("is loop-seamless: echoes of the loop's end come back at its start", () => {
    // A loop delay equals the delay of one long (silent-padded) pass folded onto the loop.
    const n = RATE;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    for (let i = Math.round(0.8 * RATE); i < Math.round(0.85 * RATE); i++) {
      L[i] = Math.sin(i * 0.05);
      R[i] = Math.sin(i * 0.07);
    }
    const opts = { time: beats(124, 0.75), feedback: 0.45 };
    const [wl, wr] = loopDelay(L, R, RATE, opts);
    const long = 30;
    const PL = new Float32Array(n * long);
    const PR = new Float32Array(n * long);
    PL.set(L);
    PR.set(R);
    const [pl, pr] = loopDelay(PL, PR, RATE, opts);
    let worst = 0;
    for (let i = 0; i < n; i++) {
      let l = 0;
      let r = 0;
      for (let k = i; k < PL.length; k += n) {
        l += pl[k]!;
        r += pr[k]!;
      }
      worst = Math.max(worst, Math.abs(wl[i]! - l), Math.abs(wr[i]! - r));
    }
    expect(peakOf(wl.subarray(0, Math.round(0.5 * RATE)), wr.subarray(0, Math.round(0.5 * RATE)))).toBeGreaterThan(0.01);
    expect(worst).toBeLessThan(1e-4);
  });
});

describe("effects", () => {
  /** The note each effect is leveled at (the unpitched ones ignore it). */
  const HOME: Record<string, string> = { howl: "A4", wind: "E5" };
  const home = (name: SynthName) => midi(HOME[name] ?? "C4");

  it.each(EFFECTS)("%s plays a 2 s note at about -28 dB RMS (mean over start frames)", (name) => {
    let power = 0;
    const starts = STARTS_FX;
    for (const t of starts) {
      const [L, R] = render(name, [{ time: t, dur: 2, note: home(name), vel: 0.7 }], 4.5);
      const a = Math.round(t * RATE);
      const b = a + 2 * RATE;
      let s = 0;
      for (let i = a; i < b; i++) s += L[i]! ** 2 + R[i]! ** 2;
      power += s / (2 * (b - a)) / starts.length;
    }
    expect(Math.abs(10 * Math.log10(power) + 28)).toBeLessThan(0.75);
  });

  it.each(EFFECTS)("%s starts from silence and ends in silence", (name) => {
    for (const dur of [0.3, 2]) {
      const [L, R] = render(name, [{ time: 0, dur, note: home(name), vel: 1 }], 6);
      const peak = peakOf(L, R);
      let last = 0;
      for (let i = 0; i < L.length; i++) if (L[i] !== 0 || R[i] !== 0) last = i;
      expect(Math.max(Math.abs(L[0]!), Math.abs(R[0]!), Math.abs(L[1]!), Math.abs(R[1]!)) / peak).toBeLessThan(0.05);
      expect(Math.max(Math.abs(L[last]!), Math.abs(R[last]!)) / peak).toBeLessThan(1e-3);
      expect(last).toBeLessThan(L.length - 1);
    }
  });

  it.each(EFFECTS)("%s: a note crossing the loop end continues at its start", (name) => {
    const events: NoteEvent[] = [{ time: 0.6, dur: 0.7, note: home(name), vel: 0.9 }];
    const [L, R] = render(name, events, 1);
    const [LL, LR] = render(name, events, 6);
    let worst = 0;
    for (let i = 0; i < RATE; i++) {
      let l = 0;
      let r = 0;
      for (let k = i; k < LL.length; k += RATE) {
        l += LL[k]!;
        r += LR[k]!;
      }
      worst = Math.max(worst, Math.abs(L[i]! - l), Math.abs(R[i]! - r));
    }
    expect(peakOf(L.subarray(0, Math.round(0.2 * RATE)))).toBeGreaterThan(0);
    expect(worst).toBeLessThan(1e-6);
  });

  /** Cents of `x` from `note` over a stretch, read on its first harmonic in consecutive frames. */
  const heldCents = (x: Float32Array, note: number, from: number, to: number) => {
    const reads: number[] = [];
    for (let t = from; t + 0.75 <= to; t += 0.25) reads.push(centsHeard(x.subarray(Math.round(t * RATE)), RATE, note, 1));
    return reads.reduce((a, b) => a + b, 0) / reads.length;
  };

  it("the howl scoops up into its note, holds it in tune and falls away after", () => {
    for (const n of ["E4", "A4", "C5"]) {
      const note = midi(n);
      for (const t0 of [0, 0.37]) {
        const x = mono(...render("howl", [{ time: t0, dur: 3, note, vel: 0.7 }], 7)).subarray(Math.round(t0 * RATE));
        // Held, past the scoop: in tune as heard, vibrato and wander included.
        const held = heldCents(x, note, 1, 3);
        expect(Math.abs(held), `${n} held ${held.toFixed(1)} cents`).toBeLessThanOrEqual(5);
        // From below: well under the note at first; most of an octave down near the end of the fall.
        const lo = (440 * 2 ** ((note - 69) / 12)) / 2.2;
        const early = fundamentalNear(x, 0.08, lo, 1.2 * hz(note));
        expect(1200 * Math.log2(early / hz(note))).toBeLessThan(-250);
        const late = fundamentalNear(x, 3 + 1, lo, 1.2 * hz(note));
        expect(1200 * Math.log2(late / hz(note))).toBeLessThan(-300);
      }
    }
    // Without its wander, jitter and vibrato it holds the note within 2 cents.
    const still: HowlPatch = { ...(SYNTHS.howl as HowlPatch), wander: 0, jitter: 0, vibrato: [5, 0] };
    const x = mono(...render(still, [{ time: 0, dur: 3, note: midi("A4"), vel: 0.7 }], 7));
    expect(Math.abs(heldCents(x, midi("A4"), 1.2, 3))).toBeLessThanOrEqual(2);
  });

  it("the howl opens bright on the scoop (\"a-\") and closes into a round \"-WOOO\"", () => {
    const note = midi("A4");
    const x = mono(...render("howl", [{ time: 0, dur: 3, note, vel: 0.7 }], 7));
    // Share of energy above 1.6 times the pitch (the 2nd harmonic and up).
    const upper = (from: number, len: number) => {
      const seg = x.subarray(Math.round(from * RATE), Math.round((from + len) * RATE));
      return bandShare(seg, 1.6 * hz(note) * (from < 0.5 ? 0.75 : 1), 24000);
    };
    expect(upper(0.12, 0.2)).toBeGreaterThan(upper(1.5, 1) * 2);
    // Mostly where a howl lives: 300 Hz to 2.5 kHz for an A4.
    expect(bandShare(x.subarray(0, 3 * RATE), 300, 2500)).toBeGreaterThan(0.9);
  });

  it("the wind whistles up toward its note as the gust swells, and blows across", () => {
    const p = SYNTHS.wind as WindPatch;
    const note = midi("E5");
    const [L, R] = render("wind", [{ time: 0, dur: 4, note, vel: 0.7 }], 7);
    const x = mono(L, R);
    const rms = (from: number, len: number) => {
      let s = 0;
      for (let i = Math.round(from * RATE); i < Math.round((from + len) * RATE); i++) s += x[i]! ** 2;
      return Math.sqrt(s / (len * RATE));
    };
    // Loudest around its peak, quiet at the start.
    expect(rms(4 * p.peak - 0.25, 0.5)).toBeGreaterThan(rms(0.05, 0.3) * 4);
    // The whistle: a clear spectral peak near the note at the gust's peak, lower early on.
    const peakHz = (from: number) => {
      const n = 8192;
      const pw = power(x, n, Math.round(from * RATE));
      let best = 1;
      for (let k = Math.ceil((200 * n) / RATE); k < (2000 * n) / RATE; k++) if (pw[k]! > pw[best]!) best = k;
      return (best * RATE) / n;
    };
    const atPeak = 1200 * Math.log2(peakHz(4 * p.peak - 0.08) / hz(note));
    const early = 1200 * Math.log2(peakHz(0.35) / hz(note));
    expect(Math.abs(atPeak)).toBeLessThan(250);
    expect(early).toBeLessThan(atPeak - 150);
    // Blowing across: louder on the left early, on the right late (sweep -0.6 to 0.6).
    const side = (from: number) => {
      let l = 0;
      let r = 0;
      for (let i = Math.round(from * RATE); i < Math.round((from + 0.4) * RATE); i++) {
        l += L[i]! ** 2;
        r += R[i]! ** 2;
      }
      return 10 * Math.log10(r / l);
    };
    expect(side(0.6)).toBeLessThan(-2);
    expect(side(3.6)).toBeGreaterThan(2);
  });

  it("the snakes hiss and rattle high (2.5-12 kHz), the rattle at about its click rate", () => {
    for (const name of ["hiss", "rattle"] as SynthName[]) {
      const x = mono(...render(name, [{ time: 0, dur: 1.5, note: 60, vel: 0.7 }], 2));
      expect(bandShare(x, 2500, 12000), name).toBeGreaterThan(0.85);
    }
    // The rattle's level envelope repeats at its rate (58 clicks a second, give or take).
    const x = mono(...render("rattle", [{ time: 0, dur: 2, note: 60, vel: 0.7 }], 2.5));
    const hop = 48;
    const env: number[] = [];
    for (let a = Math.round(0.1 * RATE); a + hop < 1.9 * RATE; a += hop) {
      let s = 0;
      for (let i = a; i < a + hop; i++) s += x[i]! ** 2;
      env.push(Math.sqrt(s / hop));
    }
    const mean = env.reduce((a, b) => a + b, 0) / env.length;
    const ac = (lag: number) => env.slice(lag).reduce((s, v, i) => s + (v - mean) * (env[i]! - mean), 0);
    const minLag = Math.round(RATE / hop / 90);
    let best = minLag;
    for (let lag = minLag; lag <= Math.round(RATE / hop / 35); lag++) if (ac(lag) > ac(best)) best = lag;
    const rate = RATE / hop / best;
    expect(rate).toBeGreaterThan(45);
    expect(rate).toBeLessThan(72);
  });

  it("the chains clink: many separate strikes, mostly above 1 kHz", () => {
    const x = mono(...render("chains", [{ time: 0, dur: 1.5, note: 60, vel: 0.7 }], 2));
    expect(bandShare(x, 1000, 12000)).toBeGreaterThan(0.55);
    // Count the strikes: 2 ms frames whose level jumps 6 dB over the previous frame's.
    const hop = 96;
    let strikes = 0;
    let prev = 0;
    for (let a = 0; a + hop < 1.5 * RATE; a += hop) {
      let s = 0;
      for (let i = a; i < a + hop; i++) s += x[i]! ** 2;
      if (s > prev * 4 && s > 1e-7) strikes++;
      prev = s;
    }
    expect(strikes).toBeGreaterThan(10);
  });
});
