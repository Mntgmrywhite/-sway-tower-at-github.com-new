import { describe, expect, it } from "vitest";
import { easterSunday, mardiGras, mardiGrasWindows } from "./easter";

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("movable feasts", () => {
  it.each([
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2028, 4, 16],
    [2029, 4, 1],
    [2030, 4, 21],
    [2038, 4, 25],
  ])("Easter %i is %i/%i", (year, month, day) => {
    expect(ymd(easterSunday(year))).toEqual([year, month, day]);
  });

  it.each([
    [2026, 2, 17],
    [2027, 2, 9],
    [2028, 2, 29],
    [2029, 2, 13],
    [2030, 3, 5],
  ])("Mardi Gras %i is %i/%i", (year, month, day) => {
    expect(ymd(mardiGras(year))).toEqual([year, month, day]);
  });

  it("runs the six days up to Fat Tuesday, crossing a month when it must", () => {
    expect(mardiGrasWindows(2027)).toEqual([{ from: [2, 4], to: [2, 9] }]);
    expect(mardiGrasWindows(2030)).toEqual([{ from: [2, 28], to: [3, 5] }]);
  });

  it("leaves February 14 to Valentine's, splitting the season round it", () => {
    expect(mardiGrasWindows(2026)).toEqual([
      { from: [2, 12], to: [2, 13] },
      { from: [2, 15], to: [2, 17] },
    ]);
  });
});
