import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, achievement, emptySave, record, type Achievement } from "./achievements";
import { announcement, medalLabel, progress } from "./achievements-sheet";
import { medalNumber, medalSvg, popScale, STRIP_MAX } from "./medals";
import { shots } from "./preview/shots";
import { render, titleLayout, type RenderOptions } from "./render";
import { SKINS } from "./skins";

const medals = (...ids: string[]): Achievement[] => ids.map((id) => achievement(id)!);
const MANY = medals("stack-5", "stack-10", "stack-15", "stack-20", "stack-25", "stack-30", "perfect-3", "perfect-6", "perfect-9");

describe("medal art", () => {
  it("stacks show the bars, perfect streaks the × of the PERFECT ×n pop", () => {
    expect(medalNumber(achievement("stack-25")!)).toBe("25");
    expect(medalNumber(achievement("perfect-9")!)).toBe("×9");
  });

  it("every medal draws as decorative SVG, earned and locked looking different", () => {
    for (const a of ACHIEVEMENTS) {
      const on = medalSvg(a, true);
      const off = medalSvg(a, false);
      expect(on).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(on).toContain(`>${medalNumber(a)}</text>`);
      expect(off).toContain(`>${medalNumber(a)}</text>`); // a locked medal still shows its goal
      expect(on).not.toBe(off);
    }
    // Coins for stacks, seals for perfect streaks: they differ by shape, not only color.
    expect(medalSvg(achievement("stack-5")!, true)).toContain(`<circle cx="24" cy="38" r="16.5"`);
    expect(medalSvg(achievement("perfect-3")!, true)).not.toContain(`r="16.5"`);
  });

  it("pop in one after another, overshoot, and settle", () => {
    expect(popScale(0, 0)).toBe(0);
    expect(popScale(1, 0.2)).toBe(0); // the second waits for the first
    expect(Math.max(...[0.3, 0.35, 0.4].map((t) => popScale(0, t)))).toBeGreaterThan(1);
    expect(popScale(STRIP_MAX, 5)).toBe(1);
    expect(popScale(0, Infinity)).toBe(1);
  });
});

describe("the Achievements screen's words", () => {
  it("progress toward the next medal, and done when the ladder is", () => {
    const save = emptySave();
    record(save, "normal", 37, 4, 1);
    const stack = progress(save, "stack");
    expect(stack).toMatchObject({ best: 37, caption: "Next: Stack 40", valueText: "37 of 40 bars, for Stack 40" });
    expect(stack.fraction).toBeCloseTo(37 / 40);
    expect(progress(save, "perfect")).toMatchObject({ caption: "Next: Perfect ×6", valueText: "4 of 6 in a row, for Perfect ×6" });
    record(save, "hard", 120, 31, 2);
    expect(progress(save, "stack")).toMatchObject({ next: null, fraction: 1, caption: "All 20 earned" });
    expect(progress(save, "perfect").caption).toBe("All 10 earned");
  });

  it("each medal says what it is, whether it's earned (in which mode) or what it takes", () => {
    const save = emptySave();
    record(save, "hard", 5, 0, 1);
    expect(medalLabel(achievement("stack-5")!, save)).toBe("Stack 5, earned in Hard, new.");
    save.fresh = [];
    expect(medalLabel(achievement("stack-5")!, save)).toBe("Stack 5, earned in Hard.");
    expect(medalLabel(achievement("perfect-9")!, save)).toBe("Perfect ×9, locked: 9 perfect drops in a row.");
  });

  it("the game-over card's medals are read out", () => {
    expect(announcement([])).toBe("");
    expect(announcement(medals("stack-25"))).toBe("New medal: Stack 25.");
    expect(announcement(medals("stack-5", "stack-10", "perfect-3"))).toBe("3 new medals: Stack 5, Stack 10 and Perfect ×3.");
  });
});

describe("medals on screen", () => {
  const draw = (shot: string, skinId: string, opts: RenderOptions, w = 390, h = 844) => {
    const s = shots().find((x) => x.name === shot)!;
    const skin = SKINS.find((x) => x.id === skinId)!;
    const ctx = createCanvas(w, h).getContext("2d");
    render(ctx as unknown as CanvasRenderingContext2D, w, h, s.state, s.view, s.best, skin, NaN, opts);
    return { ctx, data: Buffer.from(ctx.getImageData(0, 0, w, h).data) };
  };

  it.each(["start", "climb", "hard"])("nothing new draws while stacking (%s)", (shot) => {
    const plain = draw(shot, "neon", {}).data;
    expect(draw(shot, "neon", { newMedals: MANY, cardAge: 3 }).data.equals(plain)).toBe(true);
    expect(draw(shot, "neon", { newMedals: MANY, title: true }).data.equals(draw(shot, "neon", { title: true }).data)).toBe(true);
  });

  it("a game-over card with no new medals is drawn as before", () => {
    const plain = draw("over", "neon", {}).data;
    expect(draw("over", "neon", { newMedals: [], cardAge: 3 }).data.equals(plain)).toBe(true);
    // The moment the card comes up, before the first medal pops in.
    expect(draw("over", "neon", { newMedals: MANY, cardAge: 0 }).data.equals(plain)).toBe(true);
  });

  it.each([
    ["neon", 390, 844],
    ["neon", 320, 568],
    ["halloween", 1280, 720],
  ] as const)("%s %i×%i: new medals show above the card, leaving the card and what's under it alone", (skinId, w, h) => {
    const rows = (d: Buffer, from: number) => d.subarray(from * w * 4);
    // The card's top edge, from where render.ts puts "tap to play again"'s Menu under it.
    const { u, menuTop } = titleLayout(w, h);
    const cardTop = Math.floor(h * 0.42 - u * 0.31);
    expect(menuTop).toBeGreaterThan(cardTop);
    for (const set of [medals("stack-25"), MANY]) {
      const plain = draw("over", skinId, {}, w, h).data;
      const shown = draw("over", skinId, { newMedals: set }, w, h).data;
      expect(shown.equals(plain)).toBe(false);
      expect(rows(shown, cardTop).equals(rows(plain, cardTop))).toBe(true);
      // ...and not off the top of the screen: the first rows are untouched too.
      expect(shown.subarray(0, w * 4 * Math.floor(h * 0.05)).equals(plain.subarray(0, w * 4 * Math.floor(h * 0.05)))).toBe(true);
    }
  });
});
