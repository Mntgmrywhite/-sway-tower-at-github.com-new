import { describe, expect, it } from "vitest";
import { centsNear } from "../../scripts/music/pitch";
import { inToOut, outToIn, outToInSmooth, plays, sharedFrame, STRETCH_DEFAULTS, stretchLoop } from "./stretch";

const SR = 48000;
const RATES = [1.06, 1.19, 1.33];
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** Deterministic noise in [-1, 1). */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

/** A sustained tone with a few harmonics, a whole number of cycles in the loop (so it loops). */
function tone(note: number, seconds: number): Float32Array {
  const n = Math.round(seconds * SR);
  const f = Math.round(hz(note) * seconds) / seconds;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * f * i) / SR;
    x[i] = 0.5 * Math.sin(t) + 0.2 * Math.sin(2 * t + 0.3) + 0.1 * Math.sin(3 * t + 1.1);
  }
  return x;
}

/**
 * A busy, seamless "mix": a bass line and a chord (whole cycles per loop) with a noisy drum
 * hit every beat that dies away before the next, so it loops like a rendered song.
 */
function mix(seconds: number, seed = 1, drums = true): Float32Array[] {
  const n = Math.round(seconds * SR);
  const rnd = noise(seed);
  const partials = [55, 110, 164.8, 220, 277.2, 329.6, 440].map((f) => Math.round(f * seconds) / seconds);
  const beat = Math.round(SR * 0.222);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let p = 0; p < partials.length; p++) v += (0.12 / (1 + p * 0.3)) * Math.sin((2 * Math.PI * partials[p]! * i) / SR + p);
    const sinceHit = i % beat;
    const lastHit = i - sinceHit;
    const hit = drums && lastHit + beat <= n ? 0.5 * Math.exp(-sinceHit / (SR * 0.02)) * rnd() : 0;
    left[i] = v + hit;
    right[i] = 0.9 * v - hit * 0.7;
  }
  return [left, right];
}

const maxStep = (x: Float32Array, from: number, to: number): number => {
  let m = 0;
  for (let i = from; i < to; i++) {
    const a = x[((i % x.length) + x.length) % x.length]!;
    const b = x[(((i + 1) % x.length) + x.length) % x.length]!;
    m = Math.max(m, Math.abs(b - a));
  }
  return m;
};
const rms = (x: Float32Array, from: number, to: number): number => {
  let s = 0;
  for (let i = from; i < to; i++) s += x[((i % x.length) + x.length) % x.length]! ** 2;
  return Math.sqrt(s / (to - from));
};

describe("stretchLoop (WSOLA, circular)", () => {
  it("output is input/rate long, to within a hop", () => {
    const input = mix(4);
    const hop = STRETCH_DEFAULTS.hop * SR;
    for (const rate of RATES) {
      const out = stretchLoop(input, rate, SR);
      expect(out.channels).toHaveLength(2);
      expect(out.channels[0]!.length).toBe(out.channels[1]!.length);
      expect(out.map.outLength).toBe(out.channels[0]!.length);
      expect(Math.abs(out.map.outLength - input[0]!.length / rate)).toBeLessThanOrEqual(hop);
    }
  });

  it("keeps the pitch of a sustained tone (within ±3 cents)", () => {
    for (const note of [45, 57, 69, 81]) {
      const x = tone(note, 3);
      // Below A3 the third partial is measured: three times finer than the fundamental.
      const partial = note < 57 ? 3 : 1;
      const before = centsNear(x, SR, note, partial);
      for (const rate of RATES) {
        const y = stretchLoop([x], rate, SR).channels[0]!;
        const after = centsNear(y, SR, note, partial);
        expect(Math.abs(after - before), `note ${note} at ${rate}×`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("stays seamless: no click and no dropout where the stretched loop wraps", () => {
    const input = mix(3);
    const inStep = Math.max(maxStep(input[0]!, 0, input[0]!.length), maxStep(input[1]!, 0, input[1]!.length));
    for (const rate of RATES) {
      const out = stretchLoop(input, rate, SR);
      const { hop, outLength } = out.map;
      for (const y of out.channels) {
        // The wrap (last sample -> first) is just another join: no jump bigger than the music has.
        expect(maxStep(y, outLength - 2 * hop, outLength + 2 * hop)).toBeLessThanOrEqual(inStep * 1.05);
        expect(Math.abs(y[0]! - y[outLength - 1]!)).toBeLessThanOrEqual(inStep * 1.05);
      }
    }
    // ...and no hole in the level across it: on a steady chord, every 10 ms window around the
    // seam is as loud as the quietest stretch of the input.
    const chord = mix(3, 1, false)[0]!;
    const win = Math.round(0.01 * SR);
    let quietest = Infinity;
    for (let at = 0; at < chord.length; at += 60) quietest = Math.min(quietest, rms(chord, at, at + win));
    for (const rate of RATES) {
      const y = stretchLoop([chord], rate, SR).channels[0]!;
      for (let at = -3000; at < 3000; at += 60) expect(rms(y, at, at + win) / quietest, `rate ${rate}, ${at}`).toBeGreaterThan(0.85);
    }
  });

  it("a stretched tone is still smooth at the seam (the last frame lines up with the first)", () => {
    const x = tone(57, 2);
    const inStep = maxStep(x, 0, x.length);
    for (const rate of RATES) {
      const y = stretchLoop([x], rate, SR).channels[0]!;
      expect(maxStep(y, y.length - 4000, y.length + 4000)).toBeLessThanOrEqual(inStep * 1.05);
    }
  });

  it("is deterministic", () => {
    const input = mix(2, 7);
    const a = stretchLoop(input, 1.26, SR);
    const b = stretchLoop(input, 1.26, SR);
    expect(Buffer.from(a.channels[0]!.buffer).equals(Buffer.from(b.channels[0]!.buffer))).toBe(true);
    expect(Buffer.from(a.channels[1]!.buffer).equals(Buffer.from(b.channels[1]!.buffer))).toBe(true);
    expect(Array.from(a.map.anchors)).toEqual(Array.from(b.map.anchors));
  });

  it("maps stretched time to time as written and back", () => {
    const input = mix(3, 3);
    for (const rate of RATES) {
      const { map } = stretchLoop(input, rate, SR);
      for (let k = 0; k < 200; k++) {
        const s = (k * 7919.37) % map.inLength;
        const n = inToOut(map, s);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(map.outLength);
        // Exact where the input is played; where it is skipped, off by at most the skip.
        expect(Math.abs(outToIn(map, n) - s)).toBeLessThanOrEqual((rate - 1) * map.hop + 2 * STRETCH_DEFAULTS.seek * SR + 1);
        // Nominally n ≈ s / rate (within the seek).
        const nominal = (s * map.outLength) / map.inLength;
        const off = Math.abs(n - nominal);
        expect(Math.min(off, map.outLength - off)).toBeLessThanOrEqual(STRETCH_DEFAULTS.seek * SR + map.hop);
      }
      // Output frames play the input in order: frame starts map to their anchors.
      expect(outToIn(map, 0)).toBe(map.anchors[0]);
      expect(outToIn(map, map.hop * 3 + 10)).toBeCloseTo(map.anchors[3]! + 10, 6);
    }
  });

  it("finds a switch point near any bar line that two tempos both play, so they are exactly in step", () => {
    const input = mix(3, 6);
    const maps = [null, ...[1.06, 1.12, 1.19, 1.26, 1.33].map((r) => stretchLoop(input, r, SR).map)];
    const reach = 0.04 * SR;
    let moved = 0;
    for (let a = 0; a < maps.length; a++) {
      for (let b = 0; b < maps.length; b++) {
        if (a === b) continue;
        const pair = [maps[a]!, maps[b]!];
        for (let k = 0; k < 60; k++) {
          const s = Math.round((k * 2399.71) % (3 * SR));
          const t = sharedFrame(pair, s, reach, SR / 1000);
          let d = Math.abs(t - s);
          d = Math.min(d, 3 * SR - d);
          expect(d).toBeLessThanOrEqual(reach);
          if (d > 0) moved++;
          // Both versions play frame t itself, so their positions there agree to the sample.
          for (const m of pair) {
            if (!m) continue;
            expect(plays(m, t)).toBe(true);
            expect(outToIn(m, inToOut(m, t))).toBeCloseTo(t, 6);
          }
        }
      }
    }
    // Some bar lines do fall in a skip (that is what the search is for).
    expect(moved).toBeGreaterThan(0);
    // The song as written plays everything: alone, it never moves the point.
    expect(sharedFrame([null, null], 1234, reach, 48)).toBe(1234);
  });

  it("has an even clock for visuals: a steady pace, close to the exact map", () => {
    const input = mix(3, 4);
    for (const rate of RATES) {
      const { map } = stretchLoop(input, rate, SR);
      const pace = map.inLength / map.outLength; // the rate, give or take the hop rounding
      const skip = (pace - 1) * map.hop + STRETCH_DEFAULTS.seek * SR + 1;
      let prev = outToInSmooth(map, 0);
      let travelled = 0;
      for (let n = 1; n <= map.outLength; n++) {
        const s = outToInSmooth(map, n);
        let d = s - prev;
        if (d < -map.inLength / 2) d += map.inLength; // wrapped to the top of the loop
        expect(d).toBeCloseTo(pace, 6);
        travelled += d;
        prev = s;
        const off = Math.abs(s - outToIn(map, n));
        expect(Math.min(off, map.inLength - off)).toBeLessThanOrEqual(skip);
      }
      // One pass of the stretched loop is exactly one pass of the song.
      expect(travelled).toBeCloseTo(map.inLength, 3);
    }
  });

  it("stretches a 60 s stereo 48 kHz loop well under 3 s", () => {
    const input = mix(60, 5);
    for (const rate of [1.06, 1.33]) {
      const t0 = performance.now();
      const out = stretchLoop(input, rate, SR);
      const ms = performance.now() - t0;
      console.log(`stretch 60 s stereo @ ${rate}×: ${ms.toFixed(0)} ms (${out.map.anchors.length} frames)`);
      expect(ms).toBeLessThan(3000);
    }
  });

  it("rejects what it cannot loop", () => {
    expect(() => stretchLoop([new Float32Array(1000)], 1.2, SR)).toThrow();
    expect(() => stretchLoop([new Float32Array(SR), new Float32Array(SR - 1)], 1.2, SR)).toThrow();
    expect(() => stretchLoop([new Float32Array(SR)], 3, SR)).toThrow();
  });
});
