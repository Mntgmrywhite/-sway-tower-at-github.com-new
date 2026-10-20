import { describe, expect, it } from "vitest";
import { AUTO, resolveSkin, skinForDate, SKINS } from "..";

// Auto picks Oktoberfest from September 12 to 30 (the festival's fortnight into early
// October is the owner's window), and Classic on either side of it.

const day = (m: number, d: number) => new Date(2026, m - 1, d, 12);

describe("oktoberfest by date", () => {
  it.each([
    [9, 11, "classic"],
    [9, 12, "oktoberfest"],
    [9, 20, "oktoberfest"],
    [9, 30, "oktoberfest"],
    [10, 1, "halloween"],
  ])("%i/%i → %s", (m, d, id) => {
    expect(skinForDate(day(m, d)).id).toBe(id);
  });

  it("is in the picker among the holidays, and an explicit choice overrides the date", () => {
    const ids = SKINS.map((s) => s.id);
    expect(ids).toContain("oktoberfest");
    expect(ids.indexOf("oktoberfest")).toBeGreaterThan(ids.indexOf("halloween"));
    expect(resolveSkin(AUTO, day(9, 20)).id).toBe("oktoberfest");
    expect(resolveSkin("oktoberfest", day(12, 24)).id).toBe("oktoberfest");
  });
});
