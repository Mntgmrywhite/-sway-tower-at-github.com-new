// Technical check of rendered loops: peak, loudness, clipping, loop seam, per-bar level.
//   npm run music:check -- <song> [<song> ...]   (reads preview/music/<song>.wav, two loops)

import { readWav } from "./wav";

for (const name of process.argv.slice(2)) {
  const a = readWav(`preview/music/${name}.wav`);
  const n = a.left.length;
  const L = n / 2;
  let peak = 0;
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(Math.abs(a.left[i]!), Math.abs(a.right[i]!));
    peak = Math.max(peak, v);
    sum += (a.left[i]! ** 2 + a.right[i]! ** 2) / 2;
    if (v > 0.99) clipped++;
  }
  const jump = (i: number) => Math.abs(a.left[i]! - a.left[i - 1]!) + Math.abs(a.right[i]! - a.right[i - 1]!);
  let typical = 0;
  for (let i = 1; i < n; i++) typical += jump(i);
  typical /= n;
  let seam = 0;
  for (let i = L - 4; i <= L + 4; i++) seam = Math.max(seam, jump(i));
  const db = (x: number) => (20 * Math.log10(x)).toFixed(1);
  const ok = clipped === 0 && seam < typical * 4;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: peak ${db(peak)} dBFS, loudness ${db(Math.sqrt(sum / n))} dBFS RMS, clipped ${clipped}, seam ${(seam / typical).toFixed(1)}x a normal step`);
  if (!ok) process.exitCode = 1;
}
