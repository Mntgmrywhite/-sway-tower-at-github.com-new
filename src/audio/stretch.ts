// Pitch-preserving time stretch for music loops: WSOLA (waveform-similarity overlap-add).
//
// The loop is cut into frames laid down `hop` apart in the output but read from the input
// `rate × hop` apart, so the music runs faster while each frame plays at its own speed (same
// pitch). Each frame may slide up to `seek` either way to the spot where its waveform lines up
// with the sound the previous frame would have gone on with, and the two are crossfaded over
// `overlap`. Between crossfades a frame is a verbatim copy of the input, which keeps a full mix's
// transients and tone clean at the modest rates the music speeds up to (<= 1.35). The slide also steers
// joins (and the few ms each frame skips) off drum hits, so most hits are played whole.
//
// Circular: reads and writes wrap around the loop, and the last frame is lined up with the first
// one as well as with its predecessor, so the stretched loop is still seamless. Frame 0 starts a
// hair before the loop's top, so a downbeat right on the top is not inside the seam's crossfade.
//
// Pure and deterministic (no randomness, no clock): stretch.worker.ts runs it in the game, Node
// runs it in the tests and in scripts.

export interface StretchOptions {
  /** Output seconds per frame. */
  hop?: number;
  /** Crossfade between neighbouring frames, seconds (at most `hop`). */
  overlap?: number;
  /** How far a frame may slide from its nominal place to line up, seconds either way. */
  seek?: number;
  /**
   * How hard a frame avoids putting a drum hit (an onset) in a crossfade or in the few ms a
   * frame skips, against how well its waveform lines up (0 = waveform only).
   */
  transients?: number;
}

/**
 * Tuned on the game's loops (fast, busy mixes at 216–320 bpm), measured by how well joins line
 * up and how many drum hits a frame plays whole: a short hop drops only a few ms of input per
 * frame at 1.33×; a 10 ms crossfade hides a join without smearing; 15 ms of seek covers a bass
 * period; steering joins off onsets lifts whole hits from about 63% to 75–80% at no cost in
 * alignment. A 50% Hann window (textbook WSOLA) lined up no better and kept far fewer hits.
 */
export const STRETCH_DEFAULTS: Readonly<Required<StretchOptions>> = { hop: 0.03, overlap: 0.01, seek: 0.015, transients: 1 };

/** Where each output frame reads the input: maps stretched time to time as written and back. */
export interface LoopMap {
  /** Output frames per WSOLA frame. */
  hop: number;
  /** Input frame (in [0, inLength)) that output frame k·hop is a copy of. */
  anchors: Float64Array;
  inLength: number;
  outLength: number;
}

export interface Stretched {
  channels: Float32Array[];
  map: LoopMap;
}

/** Message the engine posts to the worker (channel buffers are transferred). */
export interface StretchJob {
  id: number;
  rate: number;
  sampleRate: number;
  channels: Float32Array[];
}

export type StretchReply = { id: number; ok: true; channels: Float32Array[]; map: LoopMap } | { id: number; ok: false; error: string };

/** The coarse search runs on a mono copy averaged over this many samples. */
const COARSE = 4;
/** Onset detection: block length (s), and the energy jumps (natural log) that start to count and count fully. */
const ONSET_BLOCK = 0.0025;
const ONSET_MIN = 0.7;
const ONSET_FULL = 3;

/**
 * Stretch a seamless loop to `rate` times its tempo (rate > 1 is faster) at the same pitch.
 * The result is a seamless loop of about input/rate frames (a whole number of hops).
 */
export function stretchLoop(input: readonly Float32Array[], rate: number, sampleRate: number, options: StretchOptions = {}): Stretched {
  const opt = { ...STRETCH_DEFAULTS, ...options };
  const L = input[0]?.length ?? 0;
  if (input.length === 0 || input.some((c) => c.length !== L)) throw new Error("stretchLoop: need channels of equal length");
  if (!(rate >= 0.5 && rate <= 2)) throw new Error(`stretchLoop: rate ${rate} out of range`);
  const C = COARSE;
  const hop = C * Math.max(4, Math.round((opt.hop * sampleRate) / C));
  const overlap = C * Math.max(1, Math.min(hop / C, Math.round((opt.overlap * sampleRate) / C)));
  const seek = Math.max(0, Math.round(opt.seek * sampleRate));
  const frames = Math.round(L / rate / hop);
  if (frames < 4 || 2 * (hop + 2 * overlap + seek + 4 * C) >= L) throw new Error("stretchLoop: loop too short for these settings");
  const outLength = frames * hop;
  const step = L / frames; // input advance per frame

  // Mono copy for the search, padded at both ends with the loop's other end so reads wrap.
  // Virtual input position v (may be < 0 or >= L) lives at ext[v + E].
  const B = C * Math.max(1, Math.round((ONSET_BLOCK * sampleRate) / C)); // onset block
  const E = C * Math.ceil((hop + overlap + seek + B + 2 * C) / C);
  const ext = new Float32Array(L + 2 * E);
  const g = 1 / input.length;
  for (const ch of input) {
    for (let i = 0; i < E; i++) ext[i]! += ch[L - E + i]! * g;
    for (let i = 0; i < L; i++) ext[E + i]! += ch[i]! * g;
    for (let i = 0; i < E; i++) ext[E + L + i]! += ch[i]! * g;
  }
  // Coarse copy: block averages, dec[j] = mean(ext[jC .. jC + C)), plus running energy.
  const D = Math.floor(ext.length / C);
  const dec = new Float32Array(D);
  for (let j = 0; j < D; j++) {
    let s = 0;
    for (let i = 0; i < C; i++) s += ext[j * C + i]!;
    dec[j] = s / C;
  }
  const energy = new Float64Array(D + 1);
  for (let j = 0; j < D; j++) energy[j + 1] = energy[j]! + dec[j]! * dec[j]!;

  // Onsets: how sharply the (treble-weighted) energy jumps in each ~2.5 ms block, as 0..1.
  const blocks = Math.floor(ext.length / B);
  const level = new Float64Array(blocks);
  let total = 0;
  for (let b = 0; b < blocks; b++) {
    let e = 0;
    for (let i = b * B + 1; i < (b + 1) * B; i++) e += (ext[i]! - ext[i - 1]!) ** 2;
    level[b] = e;
    total += e;
  }
  const floor = (1e-3 * total) / blocks + 1e-12;
  for (let b = 0; b < blocks; b++) level[b] = Math.log(floor + level[b]!);
  const onset = new Float32Array(blocks);
  for (let b = 3; b < blocks; b++) {
    const jump = level[b]! - Math.max(level[b - 1]!, level[b - 2]!, level[b - 3]!);
    onset[b] = Math.min(1, Math.max(0, (jump - ONSET_MIN) / (ONSET_FULL - ONSET_MIN)));
  }
  /** Strongest onset in virtual input [from, to). */
  const onsetIn = (from: number, to: number): number => {
    let m = 0;
    const last = Math.min(blocks - 1, Math.floor((to - 1 + E) / B));
    for (let b = Math.max(0, Math.floor((from + E) / B)); b <= last; b++) m = Math.max(m, onset[b]!);
    return m;
  };
  /**
   * What placing a frame at `v`, after one that would go on at `cont`, costs onsets: input in
   * between is skipped (v > cont) or played twice (v < cont), the crossfade in softens what it
   * covers, and so will the frame's own crossfade out (the next frame cannot avoid that one).
   */
  const joinCost = (cont: number, v: number): number =>
    opt.transients * (onsetIn(Math.min(cont, v), Math.max(cont, v) + overlap) + onsetIn(v + hop, v + hop + overlap));

  // Bell weights: line up the middle of the crossfade best, where both frames are loud.
  const M = overlap / C;
  const wFull = new Float32Array(overlap);
  for (let i = 0; i < overlap; i++) wFull[i] = Math.sin((Math.PI * (i + 0.5)) / overlap);
  const wDec = new Float32Array(M);
  for (let m = 0; m < M; m++) wDec[m] = Math.sin((Math.PI * (m + 0.5)) / M);

  const refFull = (v: number): { r: Float32Array; norm: number } => {
    const r = new Float32Array(overlap);
    let n = 0;
    for (let i = 0; i < overlap; i++) {
      const x = wFull[i]! * ext[v + E + i]!;
      r[i] = x;
      n += x * x;
    }
    return { r, norm: Math.sqrt(n) };
  };
  const refDec = (v: number): { r: Float32Array; norm: number } => {
    const r = new Float32Array(M);
    let n = 0;
    for (let m = 0; m < M; m++) {
      let s = 0;
      for (let i = 0; i < C; i++) s += ext[v + E + m * C + i]!;
      const x = (wDec[m]! * s) / C;
      r[m] = x;
      n += x * x;
    }
    return { r, norm: Math.sqrt(n) };
  };
  // Correlation coefficient of a reference against the input at virtual position v.
  const corrFull = (ref: { r: Float32Array; norm: number }, v: number): number => {
    let dot = 0;
    let e = 0;
    const o = v + E;
    for (let i = 0; i < overlap; i++) {
      const x = ext[o + i]!;
      dot += ref.r[i]! * x;
      e += x * x;
    }
    const d = ref.norm * Math.sqrt(e);
    return d > 1e-12 ? dot / d : 0;
  };
  const corrDec = (ref: { r: Float32Array; norm: number }, j: number): number => {
    let dot = 0;
    for (let m = 0; m < M; m++) dot += ref.r[m]! * dec[j + m]!;
    const d = ref.norm * Math.sqrt(energy[j + M]! - energy[j]!);
    return d > 1e-12 ? dot / d : 0;
  };

  // Frame 0 starts just before the loop's top, so a downbeat right on it is played whole
  // rather than through the seam's crossfade.
  const pos = new Float64Array(frames); // virtual input position of each frame
  pos[0] = -(overlap + B);
  for (let k = 1; k < frames; k++) {
    const ideal = pos[0] + Math.round(k * step);
    const lo = ideal - seek;
    const hi = ideal + seek;
    const cont = pos[k - 1]! + hop; // where the previous frame would have gone on
    // The last frame's tail crossfades into frame 0 (output wraps), so it must line up with both.
    const last = k === frames - 1;
    const better = (score: number, v: number, best: number, bestV: number): boolean =>
      score > best + 1e-9 || (score > best - 1e-9 && Math.abs(v - ideal) < Math.abs(bestV - ideal));

    let centre = ideal;
    const jlo = Math.ceil((lo + E) / C);
    const jhi = Math.floor((hi + E) / C);
    if (jlo <= jhi) {
      const a = refDec(cont);
      const b = last ? refDec(pos[0]!) : null;
      let best = -Infinity;
      for (let j = jlo; j <= jhi; j++) {
        const v = j * C - E;
        const score = corrDec(a, j) - joinCost(cont, v) + (b ? corrDec(b, j + hop / C) - joinCost(v + hop, L + pos[0]!) : 0);
        if (better(score, v, best, centre)) {
          best = score;
          centre = v;
        }
      }
    }
    const a = refFull(cont);
    const b = last ? refFull(pos[0]!) : null;
    let best = -Infinity;
    let chosen = centre;
    for (let v = Math.max(lo, centre - C + 1); v <= Math.min(hi, centre + C - 1); v++) {
      const score = corrFull(a, v) - joinCost(cont, v) + (b ? corrFull(b, v + hop) - joinCost(v + hop, L + pos[0]!) : 0);
      if (better(score, v, best, chosen)) {
        best = score;
        chosen = v;
      }
    }
    pos[k] = chosen;
  }

  // Overlap-add: rise over `overlap`, flat to `hop`, fall over `overlap`; neighbours' rise and
  // fall sum to exactly 1, so the level never pumps.
  const rise = new Float32Array(overlap);
  for (let i = 0; i < overlap; i++) rise[i] = Math.sin((Math.PI / 2) * ((i + 0.5) / overlap)) ** 2;
  const span = hop + overlap;
  const window = new Float32Array(span);
  for (let i = 0; i < span; i++) window[i] = i < overlap ? rise[i]! : i < hop ? 1 : 1 - rise[i - hop]!;
  const channels = input.map(() => new Float32Array(outLength));
  const anchors = new Float64Array(frames);
  for (let k = 0; k < frames; k++) {
    let start = pos[k]! % L;
    if (start < 0) start += L;
    anchors[k] = start;
    for (let c = 0; c < input.length; c++) {
      const x = input[c]!;
      const y = channels[c]!;
      let j = start;
      let n = k * hop;
      for (let i = 0; i < span; i++) {
        y[n]! += window[i]! * x[j]!;
        if (++j === L) j = 0;
        if (++n === outLength) n = 0;
      }
    }
  }
  return { channels, map: { hop, anchors, inLength: L, outLength } };
}

const wrap = (x: number, n: number): number => ((x % n) + n) % n;

/** Input frame (as written) that output frame `n` plays. Fractional frames are fine. */
export function outToIn(map: LoopMap, n: number): number {
  const at = wrap(n, map.outLength);
  const k = Math.min(map.anchors.length - 1, Math.floor(at / map.hop));
  return wrap(map.anchors[k]! + (at - k * map.hop), map.inLength);
}

/**
 * Like outToIn, but even: stretched time scaled back by the rate (from frame 0's anchor), so time
 * as written runs at a steady pace instead of at 1× with a small skip every frame. Never off from
 * the exact map by more than a frame's seek plus its skip (~25 ms at 1.33×); for visuals that
 * keep time with the music.
 */
export function outToInSmooth(map: LoopMap, n: number): number {
  return wrap(map.anchors[0]! + (wrap(n, map.outLength) * map.inLength) / map.outLength, map.inLength);
}

/**
 * Output frame that plays input frame `s` (as written). If `s` fell between frames (a stretch
 * skips a few ms per frame), the start of the frame that comes next.
 */
export function inToOut(map: LoopMap, s: number): number {
  const K = map.anchors.length;
  const at = wrap(s, map.inLength);
  const nominal = (at * map.outLength) / map.inLength;
  const k0 = Math.floor(at / (map.inLength / K));
  let best = NaN;
  let bestErr = Infinity;
  let next = NaN;
  let nextGap = Infinity;
  for (let dk = -3; dk <= 3; dk++) {
    const k = wrap(k0 + dk, K);
    let d = wrap(at - map.anchors[k]!, map.inLength);
    if (d > map.inLength / 2) d -= map.inLength;
    if (d >= 0 && d < map.hop) {
      const n = k * map.hop + d;
      let err = Math.abs(n - nominal);
      err = Math.min(err, map.outLength - err);
      if (err < bestErr) {
        bestErr = err;
        best = n;
      }
    } else if (d < 0 && -d < nextGap) {
      nextGap = -d;
      next = k * map.hop;
    }
  }
  if (!Number.isNaN(best)) return best;
  return Number.isNaN(next) ? nominal : next;
}

/** True if the stretch really plays input frame `s` (a stretch skips a few ms between frames). */
export function plays(map: LoopMap, s: number): boolean {
  let d = wrap(outToIn(map, inToOut(map, s)) - s, map.inLength);
  if (d > map.inLength / 2) d -= map.inLength;
  return Math.abs(d) < 0.5;
}

/**
 * The input frame nearest `s` (searched every `step` frames, at most `reach` either way) that
 * every given version plays, so two versions switched there are exactly in step; `s` if there is
 * none. A null map is the song as written, which plays every frame. Two stretches of a loop skip
 * different bits, so a bar line one of them skips would otherwise put them up to ~30 ms apart
 * in the switch's crossfade (a flam on the downbeat).
 */
export function sharedFrame(maps: readonly (LoopMap | null)[], s: number, reach: number, step: number): number {
  const live = maps.filter((m): m is LoopMap => m !== null);
  const first = live[0];
  if (!first) return s;
  for (let i = 0; i * step <= reach; i++) {
    for (const t of i === 0 ? [s] : [s + i * step, s - i * step]) {
      const at = wrap(t, first.inLength);
      if (live.every((m) => plays(m, at))) return at;
    }
  }
  return s;
}
