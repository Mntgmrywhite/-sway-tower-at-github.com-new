import { ImpactStyle } from "@capacitor/haptics";
import { describe, expect, it } from "vitest";
import { dropHaptic, NATIVE, STREAK_STEP, VIBRATE } from "./haptics";

describe("drop haptics", () => {
  it("only a perfect hits: ordinary landings and misses are silent", () => {
    expect(dropHaptic("perfect", 1)).toBe("perfect");
    expect(dropHaptic("sliced", 0)).toBeNull();
    expect(dropHaptic("miss", 0)).toBeNull();
  });

  it("every STREAK_STEP perfects in a row lands harder", () => {
    expect(dropHaptic("perfect", STREAK_STEP - 1)).toBe("perfect");
    expect(dropHaptic("perfect", STREAK_STEP)).toBe("streak");
    expect(dropHaptic("perfect", STREAK_STEP * 2)).toBe("streak");
    expect(dropHaptic("perfect", STREAK_STEP + 1)).toBe("perfect");
  });

  it("the miss that takes the last life is silent; the blast after it lands a heavy thump and the debris rattles", () => {
    expect(dropHaptic("miss", 0)).toBeNull();
    expect(NATIVE.blast[0]).toEqual({ at: 0, impact: ImpactStyle.Heavy });
    expect(NATIVE.blast.slice(1).map((s) => ("impact" in s ? s.impact : null))).toEqual([ImpactStyle.Medium, ImpactStyle.Light]);
    const at = NATIVE.blast.map((s) => s.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(at.at(-1)!).toBeLessThan(400);
  });

  it("a perfect is iOS's Success notification; a streak adds a heavy tap after it", () => {
    expect(NATIVE.perfect).toEqual([{ at: 0, success: true }]);
    expect(NATIVE.streak[0]).toEqual({ at: 0, success: true });
    expect(NATIVE.streak[1]).toMatchObject({ impact: ImpactStyle.Heavy });
  });

  it("every cue also has a browser vibration", () => {
    for (const kind of Object.keys(NATIVE) as (keyof typeof NATIVE)[]) expect(VIBRATE[kind]).toBeTruthy();
  });
});
