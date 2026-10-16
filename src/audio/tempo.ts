// Hard mode's music tempo: which step of speed-up to play, and where the next bar starts.
// Pure, so it is unit-tested; engine.ts does the playing.

/**
 * The tempos the music moves through: whole "semitones" of speed (×2^(k/12)), 1.00 up to 1.33.
 * Steps a semitone apart feel like a deliberate gear change rather than a drift, and only six
 * versions of a song ever need stretching.
 */
export const TEMPO_STEPS: readonly number[] = [0, 1, 2, 3, 4, 5].map((k) => 2 ** (k / 12));

/** How far (in steps) past the midpoint between two steps the rate must go to change step. */
const HYSTERESIS = 0.1;

/**
 * Step index for a requested rate, given the step playing now. Nearest step in log space, but
 * the current one holds until the rate is clearly past the midpoint, so a rate sitting on a
 * boundary never flips the music back and forth.
 */
export function tempoStep(rate: number, current: number): number {
  const max = TEMPO_STEPS.length - 1;
  if (!(rate > 1)) return 0;
  const steps = 12 * Math.log2(rate);
  const held = Math.max(0, Math.min(max, current));
  if (Math.abs(steps - held) <= 0.5 + HYSTERESIS) return held;
  return Math.max(0, Math.min(max, Math.round(steps)));
}

/** A song's bar length in seconds as written (from the manifest; a 2 s grid if it has none). */
export function barSeconds(info: { sr: number; L: number; bars?: number; bpm?: number }): number {
  if (info.bars && info.bars > 0) return info.L / info.sr / info.bars;
  if (info.bpm && info.bpm > 0) return (4 * 60) / info.bpm;
  return 2;
}

/**
 * The first bar line at least `ahead` seconds after song position `pos` (seconds as written), in
 * [0, length): the loop's end is bar 0 of the next pass.
 */
export function nextBar(pos: number, bar: number, length: number, ahead: number): number {
  const b = Math.ceil((pos + ahead) / bar - 1e-9) * bar;
  const wrapped = ((b % length) + length) % length;
  return length - wrapped < 1e-6 ? 0 : wrapped;
}
