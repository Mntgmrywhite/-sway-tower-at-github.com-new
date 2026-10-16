// Freeverb-style stereo reverb (8 lowpass-feedback combs + 4 allpasses per side).
// Algorithmic, so no impulse-response files (and no licenses) are needed. Tunings are the
// classic Freeverb ones at 44.1 kHz, scaled to the render rate.

const COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS = [556, 441, 341, 225];
const STEREO_SPREAD = 23;

class Comb {
  private buf: Float32Array;
  private i = 0;
  private store = 0;
  constructor(size: number, private feedback: number, private damp: number) {
    this.buf = new Float32Array(size);
  }
  process(x: number): number {
    const y = this.buf[this.i]!;
    this.store = y * (1 - this.damp) + this.store * this.damp;
    this.buf[this.i] = x + this.store * this.feedback;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
}

class Allpass {
  private buf: Float32Array;
  private i = 0;
  constructor(size: number) {
    this.buf = new Float32Array(size);
  }
  process(x: number): number {
    const b = this.buf[this.i]!;
    const y = -x + b;
    this.buf[this.i] = x + b * 0.5;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
}

export interface ReverbOptions {
  /** 0..1, how long the tail is. */
  room?: number;
  /** 0..1, high-frequency damping. */
  damp?: number;
  /** 0..1 stereo width. */
  width?: number;
}

/**
 * Wet-only reverb of a looped signal. Runs the loop twice and keeps the second pass, so the
 * tail that would ring past the loop end is already present at the loop start.
 */
export function loopReverb(inL: Float32Array, inR: Float32Array, rate: number, opts: ReverbOptions = {}): [Float32Array, Float32Array] {
  const room = opts.room ?? 0.78;
  const damp = opts.damp ?? 0.35;
  const width = opts.width ?? 0.9;
  const scale = rate / 44100;
  const feedback = room * 0.28 + 0.7;
  const make = (spread: number) => ({
    combs: COMB.map((c) => new Comb(Math.round((c + spread) * scale), feedback, damp * 0.4)),
    alls: ALLPASS.map((a) => new Allpass(Math.round((a + spread) * scale))),
  });
  const L = make(0);
  const R = make(STEREO_SPREAD);
  const n = inL.length;
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const wet1 = width / 2 + 0.5;
  const wet2 = (1 - width) / 2;
  for (let pass = 0; pass < 2; pass++) {
    for (let f = 0; f < n; f++) {
      const x = (inL[f]! + inR[f]!) * 0.015;
      let l = 0;
      let r = 0;
      for (const c of L.combs) l += c.process(x);
      for (const c of R.combs) r += c.process(x);
      for (const a of L.alls) l = a.process(l);
      for (const a of R.alls) r = a.process(r);
      if (pass === 1) {
        outL[f] = l * wet1 + r * wet2;
        outR[f] = r * wet1 + l * wet2;
      }
    }
  }
  return [outL, outR];
}
