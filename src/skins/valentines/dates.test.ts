import { describe, expect, it } from "vitest";
import { AUTO, resolveSkin, skinForDate, SKINS } from "..";

// Auto picks Valentine's from February 7 to 15 (the week around the 14th), and Classic on
// either side of it. Mardi Gras moves with Easter, and in the years its days fall in that week
// it takes them, all but the 14th itself, which is always Valentine's (easter.ts).

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("valentine's by date", () => {
  // 2028: Fat Tuesday is February 29, clear of Valentine's week.
  it.each([
    [2, 6, "classic"],
    [2, 7, "valentines"],
    [2, 14, "valentines"],
    [2, 15, "valentines"],
    [2, 16, "classic"],
  ])("2028, %i/%i → %s", (m, d, id) => {
    expect(skinForDate(day(2028, m, d)).id).toBe(id);
  });

  it.each([2026, 2027, 2028, 2029, 2030, 2031, 2032])("%i: the 14th is always Valentine's, and the rest of the week Valentine's or Mardi Gras", (y) => {
    expect(skinForDate(day(y, 2, 14)).id).toBe("valentines");
    for (let d = 7; d <= 15; d++) expect(["valentines", "mardigras"], `2/${d}`).toContain(skinForDate(day(y, 2, d)).id);
    expect(skinForDate(day(y, 2, 6)).id).not.toBe("valentines");
    expect(skinForDate(day(y, 2, 16)).id).not.toBe("valentines");
  });

  it("is in the picker among the holidays, and an explicit choice overrides the date", () => {
    const ids = SKINS.map((s) => s.id);
    expect(ids).toContain("valentines");
    expect(ids.indexOf("valentines")).toBeGreaterThan(ids.indexOf("halloween"));
    expect(resolveSkin(AUTO, day(2028, 2, 14)).id).toBe("valentines");
    expect(resolveSkin("valentines", day(2028, 7, 4)).id).toBe("valentines");
  });
});
