import { describe, expect, it } from "vitest";
import { chimeStep, dropSounds } from "./sounds";

describe("drop sounds", () => {
  it("a perfect lands softly and rings a chime that climbs with the streak", () => {
    const r = { kind: "perfect", placed: { x: 0, w: 60 }, regained: 0, rebuilt: 0, steadied: false, grewLeft: 0, grewRight: 0 } as const;
    const first = dropSounds(r, 1);
    expect(first.map((c) => c.sound)).toEqual(["land", "chime"]);
    expect(first[1]!.semitones).toBe(0);
    expect(dropSounds(r, 3)[1]!.semitones).toBe(4); // do, re, mi
  });

  it("the chime climbs a major scale and stops at the top", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(chimeStep)).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
    expect(chimeStep(99)).toBe(chimeStep(12));
    expect(chimeStep(0)).toBe(0);
  });

  it("a slice lands and slices, louder for a bigger cut", () => {
    const slice = (w: number) => dropSounds({ kind: "sliced", placed: { x: 0, w: 40 }, cut: { x: 40, w }, armed: false }, 0);
    expect(slice(2).map((c) => c.sound)).toEqual(["land", "slice"]);
    expect(slice(2)[1]!.gain!).toBeLessThan(slice(30)[1]!.gain!);
    expect(slice(30)[1]!.gain).toBe(1);
  });

  it("a miss just misses", () => {
    expect(dropSounds({ kind: "miss", cut: { x: 0, w: 60 } }, 0)).toEqual([{ sound: "miss" }]);
  });
});
