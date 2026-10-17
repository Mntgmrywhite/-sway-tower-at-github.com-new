// Where a rendered music loop starts and ends inside its decoded buffer.
//
// scripts/music/render.ts writes [last PAD frames][loop body L][first PAD frames] and AAC
// adds `priming` frames of encoder delay at the front. Some decoders trim the priming (via the
// MP4 edit list), some don't, and the context may resample (e.g. 48 kHz file, 44.1 kHz
// context). Detect which happened from the decoded length, then place the loop on the body.

export interface LoopInfo {
  /** Sample rate the loop was rendered at. */
  sr: number;
  /** Loop body length in frames at `sr`. */
  L: number;
  /** Padding frames on each side of the body. */
  PAD: number;
  /** Encoder priming frames AAC put in front. */
  priming: number;
  /** Tempo and length in bars, as written (the music switches tempo on bar lines). */
  bpm?: number;
  bars?: number;
}

/** Loop start/end in seconds within a decoded buffer of `bufferFrames` at `ctxRate`. */
export function loopPoints(info: LoopInfo, bufferFrames: number, ctxRate: number): { start: number; end: number } {
  const r = ctxRate / info.sr;
  const untrimmed = bufferFrames - (info.L + 2 * info.PAD) * r >= info.priming * r - 2;
  const offset = untrimmed ? info.priming / info.sr : 0;
  const start = offset + info.PAD / info.sr;
  return { start, end: start + info.L / info.sr };
}
