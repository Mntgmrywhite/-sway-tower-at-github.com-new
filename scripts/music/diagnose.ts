// Diagnose an instrument's tuning: for each zone, print its label and the strongest spectral
// peaks, so octave conventions or mislabels can be spotted.
//   npx tsx scripts/music/diagnose.ts <instrument> [maxZones]

import { INSTRUMENTS, instrument, type InstrumentName } from "./instruments";

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
        const ur = re[i + k]!;
        const ui = im[i + k]!;
        const vr = re[i + k + len / 2]! * wr - im[i + k + len / 2]! * wi;
        const vi = re[i + k + len / 2]! * wi + im[i + k + len / 2]! * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;
const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);

const name = process.argv[2] as InstrumentName;
if (!(name in INSTRUMENTS)) throw new Error(`unknown instrument ${name}`);
const inst = instrument(name);
const N = 16384;
for (const z of inst.zones.filter((z) => z.rr === 1).slice(0, Number(process.argv[3] ?? 40))) {
  const x = z.audio.left;
  const start = Math.min(Math.round(z.audio.rate * 0.03), Math.max(0, x.length - N));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N && start + i < x.length; i++) re[i] = x[start + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const mag = Array.from({ length: N / 2 }, (_, k) => Math.hypot(re[k]!, im[k]!));
  const peaks: { hz: number; m: number }[] = [];
  for (let k = 3; k < N / 2 - 1; k++) {
    if (mag[k]! > mag[k - 1]! && mag[k]! >= mag[k + 1]!) peaks.push({ hz: (k * z.audio.rate) / N, m: mag[k]! });
  }
  peaks.sort((a, b) => b.m - a.m);
  const top = peaks.slice(0, 4).map((p) => `${p.hz.toFixed(0)}Hz(${noteName(hzToMidi(p.hz))}${(((hzToMidi(p.hz) - Math.round(hzToMidi(p.hz))) * 100) | 0) >= 0 ? "+" : ""}${((hzToMidi(p.hz) - Math.round(hzToMidi(p.hz))) * 100) | 0}c)`);
  console.log(`label ${noteName(z.note).padEnd(4)} L${z.layer}  peaks: ${top.join("  ")}`);
}
