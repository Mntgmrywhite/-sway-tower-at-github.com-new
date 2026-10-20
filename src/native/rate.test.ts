import { describe, expect, it } from "vitest";
import { EMPTY_RATE, MIN_RUNS, RATE_KEY, asked, parseRateState, reviewUrl, runEnded, serializeRateState, shouldAskForReview } from "./rate";

const moment = { newBest: true, version: "1.0.0", native: true };

describe("the review ask", () => {
  it("comes on the game-over card after a new best, from the third run on", () => {
    let s = { ...EMPTY_RATE };
    for (let run = 1; run < MIN_RUNS; run++) {
      s = runEnded(s);
      expect(shouldAskForReview(s, moment), `run ${run}`).toBe(false);
    }
    s = runEnded(s);
    expect(s.runs).toBe(MIN_RUNS);
    expect(shouldAskForReview(s, moment)).toBe(true);
  });

  it("never without a new best, and never on the web", () => {
    const s = { runs: 10, askedIn: null };
    expect(shouldAskForReview(s, { ...moment, newBest: false })).toBe(false);
    expect(shouldAskForReview(s, { ...moment, native: false })).toBe(false);
    expect(shouldAskForReview(s, moment)).toBe(true);
  });

  it("asks at most once per app version", () => {
    let s = { runs: 10, askedIn: null as string | null };
    expect(shouldAskForReview(s, moment)).toBe(true);
    s = asked(s, "1.0.0");
    expect(shouldAskForReview(s, moment)).toBe(false);
    expect(shouldAskForReview(runEnded(s), moment)).toBe(false);
    expect(shouldAskForReview(s, { ...moment, version: "1.1.0" })).toBe(true);
  });

  it("saves under a mirrored sway-stack key and reads damaged saves safely", () => {
    expect(RATE_KEY.startsWith("sway-stack:")).toBe(true);
    const s = asked(runEnded(runEnded(EMPTY_RATE)), "1.0.0");
    expect(parseRateState(serializeRateState(s))).toEqual({ runs: 2, askedIn: "1.0.0" });
    expect(parseRateState(null)).toEqual(EMPTY_RATE);
    expect(parseRateState("nope")).toEqual(EMPTY_RATE);
    expect(parseRateState('{"runs":-3,"askedIn":7}')).toEqual(EMPTY_RATE);
    expect(parseRateState('{"runs":2.7}')).toEqual({ runs: 2, askedIn: null });
  });

  it("has a store review link only once the app has an id", () => {
    expect(reviewUrl("")).toBeNull();
    expect(reviewUrl("id123")).toBeNull();
    expect(reviewUrl("123456789")).toBe("https://apps.apple.com/app/id123456789?action=write-review");
  });
});
