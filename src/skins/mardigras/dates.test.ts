import { describe, expect, it } from "vitest";
import { AUTO, resolveSkin, skinForDate, SKINS } from "..";
import { mardiGras as fatTuesday } from "../easter";

// Auto picks Mardi Gras for the six days up to Fat Tuesday (which moves with Easter), leaving
// February 14 to Valentine's, and Classic on either side of the season.

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("mardi gras by date", () => {
  it.each([
    [2027, 2, 3, "classic"],
    [2027, 2, 4, "mardigras"],
    [2027, 2, 9, "mardigras"],
    [2027, 2, 10, "valentines"],
    [2026, 2, 13, "mardigras"],
    [2026, 2, 14, "valentines"],
    [2026, 2, 17, "mardigras"],
    [2026, 2, 18, "classic"],
    [2030, 3, 5, "mardigras"],
  ])("%i/%i/%i → %s", (y, m, d, id) => {
    expect(skinForDate(day(y, m, d)).id).toBe(id);
  });

  it("ends on Fat Tuesday every year (unless that is Valentine's Day, which keeps its own skin)", () => {
    for (let y = 2025; y <= 2045; y++) {
      const ft = fatTuesday(y);
      const valentines = ft.getMonth() === 1 && ft.getDate() === 14;
      expect(skinForDate(ft).id, `${y}`).toBe(valentines ? "valentines" : "mardigras");
      expect(skinForDate(new Date(ft.getFullYear(), ft.getMonth(), ft.getDate() + 1, 12)).id, `${y}: Ash Wednesday`).not.toBe("mardigras");
    }
  });

  it("is in the picker among the holidays, between New Year's and Valentine's, and an explicit choice overrides the date", () => {
    const ids = SKINS.map((s) => s.id);
    expect(ids.indexOf("mardigras")).toBeGreaterThan(ids.indexOf("newyear"));
    expect(ids.indexOf("mardigras")).toBeLessThan(ids.indexOf("valentines"));
    expect(resolveSkin(AUTO, day(2027, 2, 9)).id).toBe("mardigras");
    expect(resolveSkin("mardigras", day(2026, 12, 24)).id).toBe("mardigras");
  });
});
