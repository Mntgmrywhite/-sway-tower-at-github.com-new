import { ImpactStyle } from "@capacitor/haptics";
import { describe, expect, it } from "vitest";
import { HAPTICS, taps } from "./haptics";

describe("native haptics", () => {
  it("turns each on-pulse of a vibration pattern into one tap at its start", () => {
    expect(taps([30, 40, 30])).toEqual([
      { at: 0, style: ImpactStyle.Medium },
      { at: 70, style: ImpactStyle.Medium },
    ]);
    expect(taps(8)).toEqual([{ at: 0, style: ImpactStyle.Light }]);
    expect(taps([90, 50, 180])).toEqual([
      { at: 0, style: ImpactStyle.Heavy },
      { at: 140, style: ImpactStyle.Heavy },
    ]);
  });

  it("gives every cue at least one tap", () => {
    for (const [kind, pattern] of Object.entries(HAPTICS)) expect(taps(pattern).length, kind).toBeGreaterThan(0);
  });
});
