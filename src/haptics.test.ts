import { ImpactStyle } from "@capacitor/haptics";
import { describe, expect, it } from "vitest";
import { dropHaptic, NATIVE, STREAK_STEP, VIBRATE } from "./haptics";

describe("drop haptics", () => {
  it("only a perfect hits: ordinary landings and misses are silent", () => {
    expect(dropHaptic("perfect", 1, false)).toBe("perfect");
    expect(dropHaptic("sliced", 0, false)).toBeNull();
    expect(dropHaptic("miss", 0, false)).toBeNull();
  });

  it("every STREAK_STEP perfects in a row lands harder", () => {
    expect(dropHaptic("perfect", STREAK_STEP - 1, false)).toBe("perfect");
    expect(dropHaptic("perfect", STREAK_STEP, false)).toBe("streak");
    expect(dropHaptic("perfect", STREAK_STEP * 2, false)).toBe("streak");
    expect(dropHaptic("perfect", STREAK_STEP + 1, false)).toBe("perfect");
  });

  it("the drop that takes the last life gets one heavy tap", () => {
    expect(dropHaptic("miss", 0, true)).toBe("over");
    expect(NATIVE.over).toEqual([{ at: 0, impact: ImpactStyle.Heavy }]);
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
