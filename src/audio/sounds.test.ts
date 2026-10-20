import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLAST_VARIANTS } from "../fx/topple";
import { BLAST_SOUND, blastSounds, chimeStep, dropSounds, unlockSounds } from "./sounds";

describe("drop sounds", () => {
  it("a perfect lands softly and rings a chime that climbs with the streak", () => {
    const r = { kind: "perfect", placed: { x: 0, w: 60 }, regained: 0 } as const;
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
    const slice = (w: number) => dropSounds({ kind: "sliced", placed: { x: 0, w: 40 }, cut: { x: 40, w } }, 0);
    expect(slice(2).map((c) => c.sound)).toEqual(["land", "slice"]);
    expect(slice(2)[1]!.gain!).toBeLessThan(slice(30)[1]!.gain!);
    expect(slice(30)[1]!.gain).toBe(1);
  });

  it("a miss just misses", () => {
    expect(dropSounds({ kind: "miss", cut: { x: 0, w: 60 } }, 0)).toEqual([{ sound: "miss" }]);
  });
});

describe("game over", () => {
  it("the toppling tower blows up with the starburst's boom (the debris rattling after it) unless told which blast", () => {
    expect(blastSounds()).toEqual([{ sound: "boom" }]);
    expect(blastSounds("starburst")).toEqual([{ sound: "boom" }]);
  });

  it.each(BLAST_VARIANTS)("%s: one sound of its own, from a file that ships", (variant) => {
    const cues = blastSounds(variant);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.sound).toBe(BLAST_SOUND[variant]);
    expect(cues[0]!.delay ?? 0).toBe(0);
    expect(existsSync(new URL(`./sfx/${cues[0]!.sound}.mp4`, import.meta.url))).toBe(true);
  });

  it("every blast sounds different", () => {
    expect(new Set(BLAST_VARIANTS.map((v) => blastSounds(v)[0]!.sound)).size).toBe(BLAST_VARIANTS.length);
  });
});

describe("medal unlock sound", () => {
  it("rolls three soft notes up a major chord, after the drop's own sounds", () => {
    const cues = unlockSounds();
    expect(cues.map((c) => c.semitones)).toEqual([7, 12, 16]);
    const delays = cues.map((c) => c.delay!);
    expect(delays[0]).toBeGreaterThan(0.15);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
  });

  it("is quieter than the perfect chime and unlike it (a chord, not one note)", () => {
    const perfect = dropSounds({ kind: "perfect", placed: { x: 0, w: 60 }, regained: 0 }, 1).find((c) => c.sound === "chime")!;
    for (const c of unlockSounds()) expect(c.gain!).toBeLessThan(perfect.gain ?? 1);
    expect(new Set(unlockSounds().map((c) => c.semitones)).size).toBe(3);
  });
});
