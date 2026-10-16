// Fundamental-frequency estimation for checking sample tuning, octave included.
// Harmonic product spectrum over a log-magnitude FFT: it scores each candidate f by the
// energy at f, 2f, 3f and 4f, which finds the true fundamental even when an overtone is the
// loudest partial (the trap that hid octave errors in a plain autocorrelation check).

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

const N = 32768;

/** Estimated fundamental in Hz, searching 40–2600 Hz. */
export function fundamental(x: Float32Array, rate: number): number {
  const start = Math.min(Math.round(rate * 0.04), Math.max(0, x.length - N));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N && start + i < x.length; i++) re[i] = x[start + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const mag = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) mag[k] = Math.log(1e-9 + Math.hypot(re[k]!, im[k]!));
  const kmin = Math.ceil((40 * N) / rate);
  const kmax = Math.floor((2600 * N) / rate);
  let best = kmin;
  let bestScore = -Infinity;
  for (let k = kmin; k <= kmax; k++) {
    let score = 0;
    for (let h = 1; h <= 4; h++) score += mag[Math.min(N / 2 - 1, k * h)]!;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return refine(mag, best, rate);
}

/**
 * The HPS bin is only good to ~1.5 Hz (15-20 cents for low brass). Refine it from the
 * partials: find each of the first 8 harmonics' peak near h·k, interpolate it to a fraction
 * of a bin (parabola through the log magnitudes), divide by h, and average weighted by
 * loudness. High partials are h times finer, so low notes measure to a few cents.
 */
function refine(mag: Float64Array, k: number, rate: number): number {
  let sum = 0;
  let weight = 0;
  for (let h = 1; h <= 8; h++) {
    const center = k * h;
    const reach = Math.max(1, Math.round(h * 0.75));
    if (center + reach >= mag.length - 1) break;
    let p = center;
    for (let i = center - reach; i <= center + reach; i++) if (mag[i]! > mag[p]!) p = i;
    // A partial must stand out of the floor, or it is noise and would drag the average.
    if (mag[p]! < mag[k]! - 6 || p <= 0) continue;
    const a = mag[p - 1]!;
    const b = mag[p]!;
    const c = mag[p + 1]!;
    const denom = a - 2 * b + c;
    const shift = denom < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
    const w = Math.exp(b);
    sum += (w * (p + shift)) / h;
    weight += w;
  }
  return ((weight > 0 ? sum / weight : k) * rate) / N;
}

/**
 * Cents off `note` for a recording known to be (near) that note: the loudest spectral peak
 * within ±80 cents of its `partial`-th harmonic, interpolated to a fraction of a bin. Bells and
 * mallets use the fundamental (partial 1: their overtones are inharmonic); low notes of
 * harmonic instruments measure a higher partial, which is that many times more precise.
 */
export function centsNear(x: Float32Array, rate: number, note: number, partial = 1): number {
  const start = Math.min(Math.round(rate * 0.02), Math.max(0, x.length - N));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N && start + i < x.length; i++) re[i] = x[start + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const hz = 440 * 2 ** ((note - 69) / 12) * partial;
  const lo = Math.max(1, Math.floor((hz * 2 ** (-80 / 1200) * N) / rate));
  const hi = Math.min(N / 2 - 2, Math.ceil((hz * 2 ** (80 / 1200) * N) / rate));
  const mag = (k: number) => Math.log(1e-9 + Math.hypot(re[k]!, im[k]!));
  let p = lo;
  for (let k = lo; k <= hi; k++) if (mag(k) > mag(p)) p = k;
  if (p === lo || p === hi) return NaN;
  const a = mag(p - 1);
  const b = mag(p);
  const c = mag(p + 1);
  const denom = a - 2 * b + c;
  const shift = denom < 0 ? (0.5 * (a - c)) / denom : 0;
  return centsFrom(((p + shift) * rate) / N / partial, note);
}

const HEARD_N = 8192;
const HEARD_SPAN = 0.6;
const HEARD_HOP = 0.05;

/**
 * Like centsNear, but the pitch you hear: the partial is read in short frames (about 170 ms,
 * every 50 ms) over the note's first 0.6 s and averaged weighted by each frame's loudness. A
 * pluck that starts sharp and settles, or a horn that scoops in, is judged by its sounding
 * part, not by a late, quiet sustain. NaN if the partial never stands out.
 */
export function centsHeard(x: Float32Array, rate: number, note: number, partial = 1): number {
  const hz = 440 * 2 ** ((note - 69) / 12) * partial;
  const lo = Math.max(1, Math.floor((hz * 2 ** (-80 / 1200) * HEARD_N) / rate));
  const hi = Math.min(HEARD_N / 2 - 2, Math.ceil((hz * 2 ** (80 / 1200) * HEARD_N) / rate));
  if (hi - lo < 2) return NaN;
  const re = new Float64Array(HEARD_N);
  const im = new Float64Array(HEARD_N);
  let sum = 0;
  let weight = 0;
  for (let start = 0; start + HEARD_N <= x.length && start <= rate * HEARD_SPAN; start += Math.round(rate * HEARD_HOP)) {
    let energy = 0;
    for (let i = 0; i < HEARD_N; i++) {
      const v = x[start + i]!;
      energy += v * v;
      re[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / HEARD_N));
      im[i] = 0;
    }
    fft(re, im);
    const mag = (k: number) => Math.log(1e-9 + Math.hypot(re[k]!, im[k]!));
    let p = lo;
    for (let k = lo; k <= hi; k++) if (mag(k) > mag(p)) p = k;
    if (p === lo || p === hi) continue;
    const a = mag(p - 1);
    const b = mag(p);
    const c = mag(p + 1);
    const denom = a - 2 * b + c;
    const shift = denom < 0 ? (0.5 * (a - c)) / denom : 0;
    sum += energy * centsFrom(((p + shift) * rate) / HEARD_N / partial, note);
    weight += energy;
  }
  return weight > 0 ? sum / weight : NaN;
}

/** Cents from the equal-tempered pitch of MIDI note `note` (A4 = 440). */
export function centsFrom(hz: number, note: number): number {
  return 1200 * Math.log2(hz / (440 * 2 ** ((note - 69) / 12)));
}
