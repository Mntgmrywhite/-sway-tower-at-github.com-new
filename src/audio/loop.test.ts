import { describe, expect, it } from "vitest";
import { loopPoints, type LoopInfo } from "./loop";

const info: LoopInfo = { sr: 48000, L: 1_024_000, PAD: 12000, priming: 2112 };
const body = info.L + 2 * info.PAD;

describe("music loop points", () => {
  it("decoder trimmed the priming: the loop starts right after the front pad", () => {
    const p = loopPoints(info, body, 48000);
    expect(p.start).toBeCloseTo(12000 / 48000, 9);
    expect(p.end - p.start).toBeCloseTo(info.L / 48000, 9);
  });

  it("decoder kept the priming (and the AAC remainder): skip it too", () => {
    const p = loopPoints(info, body + 2112 + 512, 48000);
    expect(p.start).toBeCloseTo((2112 + 12000) / 48000, 9);
  });

  it("context resampled to 44.1 kHz: times stay in seconds", () => {
    const r = 44100 / 48000;
    const trimmed = loopPoints(info, Math.round(body * r), 44100);
    expect(trimmed.start).toBeCloseTo(12000 / 48000, 9);
    const untrimmed = loopPoints(info, Math.round((body + 2112) * r), 44100);
    expect(untrimmed.start).toBeCloseTo((2112 + 12000) / 48000, 9);
  });
});
