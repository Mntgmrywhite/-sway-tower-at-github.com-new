import { describe, expect, it } from "vitest";
import { AUTO, resolveSkin, skinForDate, SKINS } from "..";

// Auto picks Independence Day from June 28 to July 7 (the week around the Fourth), and
// Classic on either side of it.

const day = (m: number, d: number) => new Date(2026, m - 1, d, 12);

describe("independence day by date", () => {
  it.each([
    [6, 27, "classic"],
    [6, 28, "july4"],
    [7, 4, "july4"],
    [7, 7, "july4"],
    [7, 8, "classic"],
  ])("%i/%i → %s", (m, d, id) => {
    expect(skinForDate(day(m, d)).id).toBe(id);
  });

  it("is in the picker among the holidays, and an explicit choice overrides the date", () => {
    const ids = SKINS.map((s) => s.id);
    expect(ids).toContain("july4");
    expect(ids.indexOf("july4")).toBeGreaterThan(ids.indexOf("stpatricks"));
    expect(resolveSkin(AUTO, day(7, 4)).id).toBe("july4");
    expect(resolveSkin("july4", day(12, 24)).id).toBe("july4");
  });
});
