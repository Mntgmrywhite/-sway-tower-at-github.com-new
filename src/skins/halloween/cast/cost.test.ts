import { describe, expect, it } from "vitest";
import { HIGH, median, START } from "./bench";

// The cast runs on a phone every frame: printed here (median over the moments each drawing is out,
// at 390 x 844 at 2x), with limits generous enough for a busy test machine. The real budget is
// checked with preview's bench (start view: all of it 1.3 ms, each creature 0.12 ms; at height
// 0.4 ms).

describe("halloween cast frame cost", () => {
  it.each([
    ["start view", START, 12],
    ["at height", HIGH, 8],
  ] as const)("%s", (_name, set, limit) => {
    let total = 0;
    const lines: string[] = [];
    for (const [name, times, draw] of set) {
      const ms = median(times, draw, 0, 3);
      total += ms;
      lines.push(`${name.padEnd(16)} ${ms.toFixed(3)} ms`);
      expect(ms, name).toBeLessThan(limit / 3);
    }
    lines.push(`${"total".padEnd(16)} ${total.toFixed(3)} ms`);
    console.log(`halloween cast, ${_name}:\n` + lines.join("\n"));
    expect(total).toBeLessThan(limit);
  });
});
