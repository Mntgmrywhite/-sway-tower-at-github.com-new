import { describe, expect, it } from "vitest";
import { AUTO, resolveSkin, skinForDate, SKINS } from "..";

// Auto picks St. Patrick's from March 10 to 18 (the week around the 17th), and Classic on
// either side of it.

const day = (m: number, d: number) => new Date(2026, m - 1, d, 12);

describe("st. patrick's by date", () => {
  it.each([
    [3, 9, "classic"],
    [3, 10, "stpatricks"],
    [3, 17, "stpatricks"],
    [3, 18, "stpatricks"],
    [3, 19, "classic"],
  ])("%i/%i → %s", (m, d, id) => {
    expect(skinForDate(day(m, d)).id).toBe(id);
  });

  it("is in the picker among the holidays, and an explicit choice overrides the date", () => {
    const ids = SKINS.map((s) => s.id);
    expect(ids).toContain("stpatricks");
    expect(ids.indexOf("stpatricks")).toBeGreaterThan(ids.indexOf("halloween"));
    expect(resolveSkin(AUTO, day(3, 17)).id).toBe("stpatricks");
    expect(resolveSkin("stpatricks", day(12, 24)).id).toBe("stpatricks");
  });
});
