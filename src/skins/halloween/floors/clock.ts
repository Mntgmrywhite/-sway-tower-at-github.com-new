import { hash } from "../../../base/draw";

// The floors' timetables: things that happen now and then, on a rhythm that never repeats. An event
// stream is a jittered grid: event k starts at first + k * period, nudged up to `jitter` either way
// by a hash of (seed, k) (all but the first, which lands exactly at `first`, so a stream whose
// `first` is within 10 s always shows itself in a run's first 10 s), and lasts a hashed d0..d1
// seconds. So the gaps between events vary, two streams with different seeds never run in step,
// and the answer for any moment is a pure function of it (a few hashes, no memory, no allocation).
// The gaps between starts run period - 2 * jitter to period + 2 * jitter; keep d1 below the
// shortest so events never overlap. Scale a room's periods by its floor's pace() so floors twelve
// apart (the same room) drift apart instead of keeping in step.

/** Where the event stream answered by `eventAt` stands: its index and its length. */
export const EV = { k: 0, dur: 0 };

/** When event k of a stream starts. */
export function beat(seed: number, k: number, first: number, period: number, jitter: number): number {
  return first + k * period + (k === 0 ? 0 : (hash(seed * 7.13 + k * 31.7 + 17) * 2 - 1) * jitter);
}

/**
 * Seconds into the event of a stream running at time `t`, or -1 between events. EV says which
 * event it is (EV.k) and how long it lasts (EV.dur).
 */
export function eventAt(t: number, seed: number, first: number, period: number, jitter: number, d0: number, d1: number): number {
  const k0 = Math.floor((t - first) / period);
  for (let k = k0 + 1; k >= k0 - 1; k--) {
    const start = beat(seed, k, first, period, jitter);
    if (start > t) continue;
    const dur = d0 + (d1 - d0) * hash(seed * 3.37 + k * 13.1 + 5);
    if (t >= start + dur) return -1;
    EV.k = k;
    EV.dur = dur;
    return t - start;
  }
  return -1;
}

/** Index of the latest event of a stream that has started by `t` (it may be over). */
export function lastBeat(t: number, seed: number, first: number, period: number, jitter: number): number {
  const k0 = Math.floor((t - first) / period);
  for (let k = k0 + 1; k >= k0 - 1; k--) if (beat(seed, k, first, period, jitter) <= t) return k;
  return k0 - 2;
}

/** A value 0..1 that holds, then glides to a new hashed value, every `period` seconds. */
export function glide(t: number, seed: number, period: number, move = 0.3): number {
  const p = t / period + hash(seed * 1.7 + 3) * 7;
  const k = Math.floor(p);
  const f = Math.min(1, Math.max(0, (p - k - (1 - move)) / move));
  const a = hash(seed * 5.3 + k * 19.7);
  const b = hash(seed * 5.3 + (k + 1) * 19.7);
  return a + (b - a) * f * f * (3 - 2 * f);
}

/** Ramps 0 → 1 over `ramp` seconds at an event's start and back to 0 over its end. */
export function envelope(since: number, dur: number, ramp: number): number {
  if (since < 0) return 0;
  const a = Math.min(1, since / ramp, (dur - since) / ramp);
  return a <= 0 ? 0 : a * a * (3 - 2 * a);
}

/**
 * A floor's own pace for one of its rhythms: a factor 0.93..1.07 to scale a period by. Floors
 * twelve apart (the same room) always differ by at least 5.8%, so their rhythms drift apart.
 */
export function pace(level: number, salt: number): number {
  const f = (level + salt * 0.37) * 0.6180339887;
  return 0.93 + 0.14 * (f - Math.floor(f));
}

/** Per-floor phase in seconds, so floors of a kind never move together. */
export function phase(level: number, salt: number, span: number): number {
  return hash(level * 12.7 + salt * 3.1) * span;
}
