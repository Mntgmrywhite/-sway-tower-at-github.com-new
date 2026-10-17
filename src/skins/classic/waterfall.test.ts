import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { front } from "./front";
import { bankLine, fallBottom, waterfall } from "./island";
import { mask, sceneAt, SIZES, startScene } from "./test-scene";

// The spring spilling off the home island's side never ends in mid-air (the owner: it was
// "emptying into a weird empty space"): it falls all the way down behind the cloud bank in
// front and pours into it. As the camera climbs, the bank drops away faster than the island and
// the water falls on out past the screen's bottom. From the start through the climb, for as long
// as the spring is on screen, wherever the falling water ends it is out of sight.

/** Levels from the start until the island has gone below the screen, on both phones. */
const LEVELS = Array.from({ length: 31 }, (_, i) => i);
const TIMES = [0, 2.9] as const;

/** Columns where the falling water ends in view: not behind the bank and not at the screen's bottom. */
function endsInView(W: number, H: number, s: Scene): { fall: number; open: number } {
  const water = mask(W, H, (ctx) => waterfall(ctx, s));
  const bank = mask(W, H, (ctx) => front(ctx, s));
  // Below this the water is falling (the gush out of the crack stays above it).
  const falling = s.groundY + s.u * 0.12;
  let fall = 0;
  let open = 0;
  for (let x = 0; x < W; x++) {
    let y = H - 1;
    while (y >= 0 && !water[y * W + x]) y--;
    if (y < falling) continue;
    fall++;
    if (y < H - 1 && !bank[y * W + x]) open++;
  }
  return { fall, open };
}

describe("classic waterfall", () => {
  it.each(SIZES)("%ix%i at the start: it pours into the cloud bank", (W, H) => {
    for (const t of TIMES) {
      const s = { ...startScene(W, H, 0), t };
      expect(fallBottom(s), "it ends below the bank's line").toBeGreaterThan(bankLine(s));
      expect(fallBottom(s), "...on screen, so the bank hides it").toBeLessThan(H);
      const { fall, open } = endsInView(W, H, s);
      expect(fall, "the water falls").toBeGreaterThan(4);
      expect(open, "columns where the water ends in plain view").toBe(0);
    }
  });

  it.each(SIZES)("%ix%i through the climb: the water never ends in mid-air", (W, H) => {
    let shown = 0;
    for (const lvl of LEVELS) {
      for (const t of TIMES) {
        const s = sceneAt(W, H, lvl, t);
        // Only while the falling water is on screen (below the crack and the gush).
        if (s.groundY + s.u * 0.13 > H) continue;
        shown++;
        const { fall, open } = endsInView(W, H, s);
        expect(fall, `level ${lvl}: the water falls`).toBeGreaterThan(4);
        expect(open, `level ${lvl}: columns where the water ends in plain view`).toBe(0);
      }
    }
    expect(shown, "levels checked with the waterfall on screen").toBeGreaterThan(20);
  }, 60_000);
});
