import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import { shots, type Shot } from "../../preview/shots";
import { render } from "../../render";
import { newYear } from "../newyear";
import { COUNT_FROM, MIDNIGHT, marqueeAt } from "./marquee";

describe("Times Tower marquee", () => {
  it("reads its cues from the New Year's song: ten seconds from the countdown to midnight", () => {
    expect(Number.isFinite(COUNT_FROM)).toBe(true);
    expect(MIDNIGHT - COUNT_FROM).toBe(10);
  });

  it("counts 10 down to 1 a second at a time, then greets the new year, then goes dark", () => {
    expect(marqueeAt(NaN)).toEqual({ kind: "dark" });
    expect(marqueeAt(COUNT_FROM - 0.01)).toEqual({ kind: "dark" });
    expect(marqueeAt(COUNT_FROM)).toMatchObject({ kind: "count", n: 10 });
    expect(marqueeAt(COUNT_FROM + 0.99)).toMatchObject({ kind: "count", n: 10 });
    expect(marqueeAt(COUNT_FROM + 4.5)).toMatchObject({ kind: "count", n: 6 });
    expect(marqueeAt(MIDNIGHT - 0.01)).toMatchObject({ kind: "count", n: 1 });
    expect(marqueeAt(MIDNIGHT)).toMatchObject({ kind: "midnight", into: 0 });
    expect(marqueeAt(MIDNIGHT + 30)).toEqual({ kind: "dark" });
  });

  describe("on screen", () => {
    const W = 390;
    const H = 844;
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

    it("changes only the right-hand lane, well clear of the tower column", () => {
      for (const shot of picks) {
        const silent = frame(shot, NaN);
        for (const t of [COUNT_FROM + 0.05, COUNT_FROM + 4.6, MIDNIGHT + 1.2, MIDNIGHT + 4]) {
          const live = frame(shot, t);
          let changed = 0;
          let minX = W;
          for (let i = 0; i < live.length; i += 4) {
            if (live[i] === silent[i] && live[i + 1] === silent[i + 1] && live[i + 2] === silent[i + 2]) continue;
            changed++;
            minX = Math.min(minX, (i / 4) % W);
          }
          expect(changed, `${shot.name} at ${t}s`).toBeGreaterThan(50);
          // The bars stand within the middle 60% of the screen; the marquee and clock sit right of it.
          expect(minX, `${shot.name} at ${t}s`).toBeGreaterThan(W * 0.8);
        }
      }
    });
  });
});
