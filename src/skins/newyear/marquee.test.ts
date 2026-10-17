import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import { shots, type Shot } from "../../preview/shots";
import { render } from "../../render";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { COUNT_FROM, CYCLE, MIDNIGHT, readingAt, sceneTimeOf, START } from "./countdown";
import { TIMES_X } from "./landmarks";
import { marquee, SIGN } from "./marquee";

const W = 390;
const H = 844;
const u = W;

/** A phone-sized scene with the horizon at `hy`, `t` seconds into the tower's scene. */
function scene(t: number, hy = 620): Scene {
  return { cssW: W, cssH: H, u, scale: u / 150, t, rise: 0, altitude: 0, groundY: hy + 100, horizonY: hy, baseX: 0, baseW: 0, songTime: NaN };
}

/** The screen alone on a transparent canvas at cycle time p (on scene time, a pass into the tower's
 *  scene): its pixels, and the glass's box. */
function screenAt(p: number): { data: Uint8ClampedArray; x0: number; x1: number; y0: number; y1: number } {
  return screenOn(scene(sceneTimeOf(p, 1)));
}

/** The screen alone on a transparent canvas in scene `s`: its pixels, and the glass's box. */
function screenOn(s: Scene): { data: Uint8ClampedArray; x0: number; x1: number; y0: number; y1: number } {
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

/** Rows (top, bottom) and columns (left, right) holding the glass's lit text: bright gold or
 *  ivory pixels. */
function textRows(p: number, rowFrom = 0, rowTo = 1): { top: number; bottom: number; left: number; right: number; lit: number } {
  const g = screenAt(p);
  let top = H;
  let bottom = -1;
  let left = W;
  let right = -1;
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
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  return { top, bottom, left, right, lit };
}

describe("Times Tower screen", () => {
  it("is never dark: every moment of the cycle shows lit text on the glass", () => {
    for (let p = 0; p < CYCLE; p += 0.5) {
      expect(textRows(p).lit, `${p}s: ${JSON.stringify(readingAt(p))}`).toBeGreaterThan(60);
    }
  });

  it("is readable on a phone: the digits stand at least 18 px tall on a 390 px screen", () => {
    // The time left ("1:00" … "0:11"), whole on the glass
    for (const p of [0.5, START + 0.5, 10, 30.4, COUNT_FROM - 0.3]) {
      const r = textRows(p);
      expect(r.bottom - r.top + 1, `time left at ${p}s`).toBeGreaterThanOrEqual(18);
      const g = screenAt(p);
      expect(r.left, `time left at ${p}s`).toBeGreaterThan(g.x0 + 2);
      expect(r.right, `time left at ${p}s`).toBeLessThan(g.x1 - 2);
    }
    // "10" … "1", the first two digits whole on the glass once they have popped in
    for (const p of [COUNT_FROM + 0.5, COUNT_FROM + 4.5, MIDNIGHT - 0.5]) {
      const r = textRows(p);
      expect(r.bottom - r.top + 1, `count at ${p}s`).toBeGreaterThanOrEqual(28);
    }
    const ten = textRows(COUNT_FROM + 0.5);
    const g = screenAt(COUNT_FROM + 0.5);
    expect(ten.left).toBeGreaterThan(g.x0 + 2);
    expect(ten.right).toBeLessThan(g.x1 - 2);
    // MIDNIGHT (a word, squeezed to fit the glass), and the year on the greeting's lower line
    const m = textRows(MIDNIGHT + 1.3);
    expect(m.bottom - m.top + 1).toBeGreaterThanOrEqual(13);
    const y = textRows(MIDNIGHT + 10, 0.45, 1);
    expect(y.bottom - y.top + 1).toBeGreaterThanOrEqual(17);
  });

  it("shows 1:00 at a tower's first frame, and again as each pass of the song starts the minute over, the same each time", () => {
    const first = screenOn(scene(0)).data;
    expect(readingAt(START)).toMatchObject({ kind: "left", secs: 60 });
    for (const t of [CYCLE, 2 * CYCLE, 9 * CYCLE]) {
      const again = screenOn(scene(t)).data;
      let differ = 0;
      for (let i = 0; i < first.length; i++) if (first[i] !== again[i]) differ++;
      expect(differ, `${t}s`).toBe(0);
    }
    // ...and a second later, 0:59: the screen has changed.
    const next = screenOn(scene(1)).data;
    let differ = 0;
    for (let i = 0; i < first.length; i++) if (first[i] !== next[i]) differ++;
    expect(differ).toBeGreaterThan(200);
  });

  // The screen is the widest part of the Times Tower's crown: the clock, the ball and its rays stand
  // inside it, so all the countdown shows stays right of the tower column.
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

    function frame(shot: Shot, t: number, songTime: number): Uint8ClampedArray {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      render(ctx as unknown as CanvasRenderingContext2D, W, H, shot.state, { ...shot.view, t }, shot.best, newYear, songTime);
      return ctx.getImageData(0, 0, W, H).data;
    }

    it("keeps time with the song, changing only the right-hand lane, well clear of the tower column", () => {
      // The scene 20 s in, silent: the screen on 0:40.
      for (const shot of picks) {
        const silent = frame(shot, 20, NaN);
        for (const song of [0.6, COUNT_FROM - 20.5, COUNT_FROM + 0.05, COUNT_FROM + 4.6, MIDNIGHT + 12]) {
          const live = frame(shot, 20, song);
          let changed = 0;
          let minX = W;
          for (let i = 0; i < live.length; i += 4) {
            if (live[i] === silent[i] && live[i + 1] === silent[i + 1] && live[i + 2] === silent[i + 2]) continue;
            changed++;
            minX = Math.min(minX, (i / 4) % W);
          }
          expect(changed, `${shot.name}, song at ${song}s`).toBeGreaterThan(50);
          // The bars stand within the middle 60% of the screen; the screen, clock and ball sit right of it.
          expect(minX, `${shot.name}, song at ${song}s`).toBeGreaterThan(W * 0.8);
        }
      }
    });

    it("shows the very same frame, music or not, while the song is where a fresh tower put it", () => {
      for (const shot of picks) {
        for (const t of [0.05, 4.6, 51.3, 60.4, 63.2, 71, CYCLE - START + 0.7, CYCLE + 3.3]) {
          const silent = frame(shot, t, NaN);
          const live = frame(shot, t, (START + t) % CYCLE);
          let differ = 0;
          for (let i = 0; i < live.length; i++) if (live[i] !== silent[i]) differ++;
          expect(differ, `${shot.name} at ${t}s`).toBe(0);
        }
      }
    });
  });
});
