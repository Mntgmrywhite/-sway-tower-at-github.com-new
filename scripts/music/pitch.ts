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
  return (best * rate) / N;
}

/** Cents from the equal-tempered pitch of MIDI note `note` (A4 = 440). */
export function centsFrom(hz: number, note: number): number {
  return 1200 * Math.log2(hz / (440 * 2 ** ((note - 69) / 12)));
}
