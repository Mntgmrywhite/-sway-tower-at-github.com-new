import { describe, expect, it } from "vitest";
import { skyBottom, seaTop } from "./far";
import { skyFill } from "./sky";
import { context, sceneAt } from "./test-scene";
import { level, toneIndex, toneOf } from "./tone";

// The sky is painted in thin flat bands. At a fractional scale (Hard's zoomed-out frame, a 2.625
// or 1.5 device pixel ratio) the band edges fall inside pixel rows: the sky must still cover
// them fully, or whatever lies under it shows through as a hairline at every band edge.

/** Device pixels per CSS pixel: a phone at 1x, 2x and 3x zoomed out, and fractional ratios. */
const SCALES = [0.6, 0.77 * 2, 0.93 * 3, 2.625, 1.5] as const;
const LEVELS = [5, 40, 70, 110] as const;

describe("classic sky", () => {
  it.each(SCALES)("at %s device px per CSS px the bands leave no seam", (k) => {
    for (const lvl of LEVELS) {
      const W = 390;
      const H = 844;
      const s = sceneAt(W, H, lvl, 3);
      const tone = toneOf(s);
      const bottom = skyBottom(s, seaTop(s, level(s)), level(s));
      const ctx = context(W, H, k);
      // Something loud under the sky, so any gap shows.
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, W, H);
      skyFill(ctx, s, tone, toneIndex(s), bottom);
      const rows = Math.floor(Math.min(bottom, H) * k) - 2;
      const col = ctx.getImageData(Math.round(30 * k), 0, 1, rows).data;
      let seams = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let c = 0; c < 3; c++) {
          const mid = (col[(y - 1) * 4 + c]! + col[(y + 1) * 4 + c]!) / 2;
          if (Math.abs(col[y * 4 + c]! - mid) > 4) {
            seams++;
            break;
          }
        }
      }
      expect(seams, `level ${lvl}: rows unlike their neighbours`).toBe(0);
    }
  });
});
