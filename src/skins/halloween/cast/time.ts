import { hash } from "../../../base/draw";

// The cast's clocks. Every performer comes and goes on its own rhythm: a first visit at a fixed
// moment of the opening (shifted a little by its anchor's id, so two of a kind on screen never
// start in step), then gaps drawn by hash from its own range, so the visits never settle into an
// obvious loop and no two kinds keep step. Pure functions of time and seed, memoized forward the
// way graves.ts is (and rebuilt from the first visit when time runs backward), nothing random,
// nothing allocated.

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
/** 0..1 smoothstep from a to b. */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** 0 → 1 → 0 over [a, d]: up by b, down from c. */
export function bump(a: number, b: number, c: number, d: number, x: number): number {
  return smooth(a, b, x) * (1 - smooth(c, d, x));
}
/** A damped shake after a landing: 1 at the landing, dying away over `tau` seconds (0 before any). */
export function jolt(sinceLand: number, tau: number): number {
  return sinceLand >= 0 && sinceLand < tau * 4 ? Math.exp(-sinceLand / tau) : 0;
}
/** seed mod 3, for any seed. */
export function third(seed: number): number {
  return ((Math.floor(seed) % 3) + 3) % 3;
}

const SLOTS = 512;
const memoSeed = new Float64Array(SLOTS).fill(NaN);
const memoK = new Float64Array(SLOTS);
const memoT = new Float64Array(SLOTS);
let rhythms = 0;

/** What `Rhythm.at` found: the latest visit's index (-1 before the first), when it began and when the next one will. */
export const VISIT = { k: -1, t0: 0, next: 0 };

/**
 * Visits that start at `first + step * (seed mod 3)` and then every `lo`..`hi` seconds (by hash
 * of the visit and the seed).
 */
export class Rhythm {
  private readonly id: number;
  constructor(
    readonly first: number,
    readonly step: number,
    readonly lo: number,
    readonly hi: number,
    private readonly salt: number,
  ) {
    this.id = rhythms++;
  }

  start(seed: number): number {
    return this.first + this.step * third(seed);
  }

  gap(k: number, seed: number): number {
    return this.lo + (this.hi - this.lo) * hash(seed * 977 + k * 131 + this.salt);
  }

  /** The visit under way (or last begun) at time t: fills VISIT and returns seconds since it began (-Infinity before the first). */
  at(t: number, seed: number): number {
    const slot = (this.id * 16 + (Math.abs(Math.floor(seed)) & 15)) % SLOTS;
    let k: number;
    let t0: number;
    if (memoSeed[slot] === seed && memoT[slot]! <= t) {
      k = memoK[slot]!;
      t0 = memoT[slot]!;
    } else {
      k = 0;
      t0 = this.start(seed);
      if (t < t0) {
        VISIT.k = -1;
        VISIT.t0 = t0;
        VISIT.next = t0;
        return -Infinity;
      }
    }
    let next = t0 + this.gap(k + 1, seed);
    while (next <= t) {
      k++;
      t0 = next;
      next = t0 + this.gap(k + 1, seed);
    }
    memoSeed[slot] = seed;
    memoK[slot] = k;
    memoT[slot] = t0;
    VISIT.k = k;
    VISIT.t0 = t0;
    VISIT.next = next;
    return t - t0;
  }
}
