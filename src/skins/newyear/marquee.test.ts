import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import { shots, type Shot } from "../../preview/shots";
import { render } from "../../render";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { COUNT_FROM, CYCLE, MIDNIGHT, readingAt } from "./countdown";
import { TIMES_X } from "./landmarks";
import { marquee, SIGN } from "./marquee";

const W = 390;
const H = 844;
const u = W;

/** A phone-sized scene with the horizon at `hy`, at cycle time `p` (as the song's position). */
function scene(p: number, hy = 620): Scene {
  return { cssW: W, cssH: H, u, scale: u / 150, t: 0, rise: 0, altitude: 0, groundY: hy + 100, horizonY: hy, baseX: 0, baseW: 0, songTime: p };
}

/** The screen alone on a transparent canvas at cycle time p: its pixels, and the glass's box. */
function screenAt(p: number): { data: Uint8ClampedArray; x0: number; x1: number; y0: number; y1: number } {
  const s = scene(p);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  marquee(ctx as unknown as CanvasRenderingContext2D, s, TIMES_X);
  const tx = W / 2 + TIMES_X * u;
  const inset = SIGN.rim + SIGN.band;
  return {
    data: ctx.getImageData(0, 0, W, H).data,
    x0: Math.ceil(tx - (SIGN.hw - SIGN.rim) * u),
    x1: Math.floor(tx + (SIGN.hw - SIGN.rim) * u),
    y0: Math.ceil(s.horizonY + 1 - (SIGN.y1 - inset) * u),
    y1: Math.floor(s.horizonY + 1 - (SIGN.y0 + inset) * u),
  };
}

/** Rows (top, bottom) holding the glass's lit text: bright gold or ivory pixels. */
function textRows(p: number, rowFrom = 0, rowTo = 1): { top: number; bottom: number; lit: number } {
  const g = screenAt(p);
  let top = H;
  let bottom = -1;
  let lit = 0;
  const ya = Math.round(g.y0 + (g.y1 - g.y0) * rowFrom);
  const yb = Math.round(g.y0 + (g.y1 - g.y0) * rowTo);
  for (let y = ya; y < yb; y++) {
    for (let x = g.x0; x < g.x1; x++) {
      const i = (y * W + x) * 4;
      if (g.data[i]! > 200 && g.data[i + 1]! > 170) {
        lit++;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { top, bottom, lit };
}

describe("Times Tower screen", () => {
  it("is never dark: every moment of the cycle shows lit text on the glass", () => {
    for (let p = 0; p < CYCLE; p += 0.5) {
      expect(textRows(p).lit, `${p}s: ${JSON.stringify(readingAt(p))}`).toBeGreaterThan(60);
    }
  });

  it("is readable on a phone: the digits stand at least 18 px tall on a 390 px screen", () => {
    for (const p of [10, 30.4, 49.7]) {
      const r = textRows(p);
      expect(r.bottom - r.top + 1, `time left at ${p}s`).toBeGreaterThanOrEqual(18);
    }
    for (const p of [COUNT_FROM + 0.5, MIDNIGHT - 0.5]) {
      const r = textRows(p);
      expect(r.bottom - r.top + 1, `count at ${p}s`).toBeGreaterThanOrEqual(28);
    }
    // The year, on the greeting's lower line
    const y = textRows(MIDNIGHT + 10, 0.45, 1);
    expect(y.bottom - y.top + 1).toBeGreaterThanOrEqual(17);
  });

  it("stays on the screen, right of the tower column", () => {
    const tx = W / 2 + TIMES_X * u;
    expect(tx - SIGN.hw * u).toBeGreaterThan(W / 2 + 0.3 * u);
    expect(tx + SIGN.hw * u).toBeLessThan(W - 2);
  });

  describe("in the game", () => {
    let picks: Shot[];
    beforeAll(() => {
      picks = shots().filter((s) => ["start", "climb", "high"].includes(s.name));
    });

    function frame(shot: Shot, songTime: number): Uint8ClampedArray {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      render(ctx as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, newYear, songTime);
      return ctx.getImageData(0, 0, W, H).data;
    }

    it("keeps time with the song, changing only the right-hand lane, well clear of the tower column", () => {
      for (const shot of picks) {
        const silent = frame(shot, NaN);
        for (const t of [COUNT_FROM - 20.5, COUNT_FROM + 0.05, COUNT_FROM + 4.6, MIDNIGHT + 1.2, MIDNIGHT + 12]) {
          const live = frame(shot, t);
          let changed = 0;
          let minX = W;
          for (let i = 0; i < live.length; i += 4) {
            if (live[i] === silent[i] && live[i + 1] === silent[i + 1] && live[i + 2] === silent[i + 2]) continue;
            changed++;
            minX = Math.min(minX, (i / 4) % W);
          }
          expect(changed, `${shot.name} at ${t}s`).toBeGreaterThan(50);
          // The bars stand within the middle 60% of the screen; the screen, clock and ball sit right of it.
          expect(minX, `${shot.name} at ${t}s`).toBeGreaterThan(W * 0.8);
        }
      }
    });
  });
});
