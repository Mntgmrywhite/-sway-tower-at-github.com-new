import { describe, expect, it } from "vitest";
import { GAP, Throttle, gameOverWords, landingWords, numberWords } from "./announce";

describe("numbers in words", () => {
  it.each<[number, string]>([
    [0, "zero"],
    [1, "one"],
    [12, "twelve"],
    [13, "thirteen"],
    [20, "twenty"],
    [24, "twenty-four"],
    [99, "ninety-nine"],
    [100, "one hundred"],
    [112, "one hundred twelve"],
    [131, "one hundred thirty-one"],
    [999, "nine hundred ninety-nine"],
    [1000, "one thousand"],
    [2004, "two thousand four"],
    [1_000_000, "1000000"],
  ])("%i → %s", (n, words) => {
    expect(numberWords(n)).toBe(words);
  });
});

describe("what a landing says", () => {
  it("the score, with Perfect or the lives left", () => {
    expect(landingWords("sliced", 12, 3)).toBe("Twelve");
    expect(landingWords("perfect", 13, 3)).toBe("Perfect, thirteen");
    expect(landingWords("miss", 13, 2)).toBe("Miss, two lives left");
    expect(landingWords("miss", 13, 1)).toBe("Miss, one life left");
    // The miss that ends the run: the card's words follow it.
    expect(landingWords("miss", 13, 0)).toBe("Miss");
  });

  it("the game-over card, with the new best", () => {
    expect(gameOverWords(24, true)).toBe("Game over, twenty-four, new best");
    expect(gameOverWords(24, false)).toBe("Game over, twenty-four");
  });
});

describe("the throttle", () => {
  it("says the first at once, holds the rest and keeps only the newest", () => {
    const t = new Throttle();
    expect(t.offer("One", 0)).toBe("One");
    expect(t.offer("Two", 0.4)).toBeNull();
    expect(t.offer("Three", 0.8)).toBeNull();
    expect(t.due()).toBe(GAP);
    expect(t.flush(1.2)).toBeNull();
    expect(t.flush(GAP)).toBe("Three");
    expect(t.due()).toBeNull();
    expect(t.flush(10)).toBeNull();
  });

  it("speaks again once the gap has passed, and the flush starts a new gap", () => {
    const t = new Throttle(1);
    expect(t.offer("One", 0)).toBe("One");
    expect(t.offer("Two", 1)).toBe("Two");
    expect(t.offer("Three", 1.5)).toBeNull();
    expect(t.flush(2)).toBe("Three");
    expect(t.offer("Four", 2.5)).toBeNull();
    expect(t.offer("Five", 3)).toBe("Five");
  });

  it("an urgent one (a miss, the game over) goes through at once and drops what was held", () => {
    const t = new Throttle();
    expect(t.offer("Twelve", 0)).toBe("Twelve");
    expect(t.offer("Thirteen", 0.3)).toBeNull();
    expect(t.offer("Miss, two lives left", 0.6, true)).toBe("Miss, two lives left");
    expect(t.due()).toBeNull();
    // The next routine one waits out a gap from the urgent one.
    expect(t.offer("Fourteen", 1)).toBeNull();
    expect(t.flush(0.6 + GAP)).toBe("Fourteen");
  });
});
