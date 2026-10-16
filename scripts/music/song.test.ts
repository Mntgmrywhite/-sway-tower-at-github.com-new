// The song renderer's synth integration: synth tracks render through synth.ts, a track's `pump`
// ducks it at the song's kick (named by label or index, also when only that track is rendered),
// the `delay` send echoes on the beat and wraps the loop, and a song without either is unaffected.

import { describe, expect, it } from "vitest";
import { renderLoop, type Song, type Track } from "./song";

const BPM = 120;
const BEAT = 60 / BPM;
const RATE = 48000;

/** One bar of 4/4 at 120 bpm (2 s) with these tracks, dry (no reverb). */
function song(tracks: Track[], extra: Partial<Song> = {}): Song {
  return { name: "test", bpm: BPM, beatsPerBar: 4, bars: 1, tracks, reverb: { level: 0 }, ...extra };
}

const kick: Track = { inst: "dmKick", notes: [0, 1, 2, 3].map((t) => ({ t, d: 0.5, n: "C2" })), reverb: 0, humanize: 0, label: "kick" };
/** A held note on a patch with full sustain, so its level only moves with the pump. */
const held = (extra: Partial<Track> = {}): Track => ({ inst: "subBass", notes: [{ t: 0, d: 4, n: "C3", v: 0.7 }], reverb: 0, humanize: 0, ...extra });

const rms = (x: Float32Array, from: number, to: number) => {
  let s = 0;
  const a = Math.round(from * RATE);
  const b = Math.round(to * RATE);
  for (let i = a; i < b; i++) s += x[i]! ** 2;
  return Math.sqrt(s / (b - a));
};

describe("renderLoop with synths", () => {
  it("renders a synth track, finite and audible", () => {
    const out = renderLoop(song([{ inst: "pluck", notes: [{ t: 0, d: 1, n: "C5" }], reverb: 0 }]));
    expect(out.left.every(Number.isFinite)).toBe(true);
    expect(rms(out.left, 0, 0.5)).toBeGreaterThan(0.005);
  });

  it("plays a track's own patch in place of the stock one", () => {
    const stock = renderLoop(song([held()]));
    const dark = renderLoop(song([held({ patch: { kind: "voice", osc: [{ wave: "sine" }], amp: { attack: 0.002, decay: 0.2, sustain: 1, release: 0.05 }, gain: 0.02, range: ["E1", "E3"], home: "C2" } })]));
    expect(rms(dark.left, 0.5, 1)).toBeLessThan(rms(stock.left, 0.5, 1) * 0.5);
  });

  it("pumps a track against the kick: down right after each hit, back by the next", () => {
    const keyed = (from: string | number) => song([kick, held({ pump: 0.8 })], { pump: { from, release: 0.75 } });
    const plain = renderLoop(song([kick, held()], { pump: { from: "kick" } }), new Set([1])).left;
    for (const from of ["kick", 0] as const) {
      // Only the held track, as mix.ts renders a part: the key still comes from the whole song.
      const pumped = renderLoop(keyed(from), new Set([1])).left;
      for (const beat of [1, 2, 3]) {
        const at = beat * BEAT;
        expect(rms(pumped, at + 0.01, at + 0.04) / rms(plain, at + 0.01, at + 0.04)).toBeLessThan(0.4);
        expect(rms(pumped, at + 0.42, at + 0.49) / rms(plain, at + 0.42, at + 0.49)).toBeGreaterThan(0.95);
      }
    }
  });

  it("echoes a delay send on the beat, ping-pong, and wraps the loop", () => {
    // A closed hat (gone in 60 ms) a sixteenth before the loop end; its echo half a beat later
    // lands a sixteenth into the next pass, on the left only (the first bounce).
    const hat: Track = { inst: "dmHat", notes: [{ t: 3.75, d: 0.25, n: "C4" }], reverb: 0, humanize: 0, delay: 1 };
    const out = renderLoop(song([hat], { delay: { time: 0.5, feedback: 0, lowCut: 20, damp: 20000 } }));
    const echo = 0.25 * BEAT;
    expect(rms(out.left, echo, echo + 0.03)).toBeGreaterThan(0.002);
    expect(rms(out.right, echo, echo + 0.03)).toBeLessThan(rms(out.left, echo, echo + 0.03) * 0.01);
    expect(rms(out.left, echo - 0.06, echo - 0.01)).toBeLessThan(rms(out.left, echo, echo + 0.03) * 0.05);
  });

  it("leaves a song without pump or delay sends as it was", () => {
    const a = renderLoop(song([kick, held()]));
    const b = renderLoop(song([kick, held({ pump: 0, delay: 0 })], { pump: { from: "kick" }, delay: { time: 0.75 } }));
    expect(b.left).toEqual(a.left);
    expect(b.right).toEqual(a.right);
  });

  it("names a missing pump key or delay bus", () => {
    expect(() => renderLoop(song([held({ pump: 0.5 })]))).toThrow(/pump key/);
    expect(() => renderLoop(song([held({ pump: 0.5 })], { pump: { from: "drums" } }))).toThrow(/labelled "drums"/);
    expect(() => renderLoop(song([held({ delay: 0.3 })]))).toThrow(/delay bus/);
  });
});
