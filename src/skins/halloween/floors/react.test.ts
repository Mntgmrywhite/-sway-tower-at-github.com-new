import { describe, expect, it } from "vitest";
import { BAR_RADIUS } from "../../../base/blocks";
import { OUTLINE } from "./floor";
import { noteTop, REACT_DEPTH, REACT_TIME, shudder } from "./react";
import { BASE_W, changed, H_PHONE, info, shoot, type Shot } from "./test-floor";

// A new floor lands and the house shudders (react.ts): the new top floor and the three under it
// rattle their shutters, swing their lanterns, blink their windows and shake dust down; floors
// further down don't stir. Only the details move: a floor's outline (its rectangle, which the game
// judges) never does. With reduce motion on there is no dust and no blink, and less of everything.

const TOPS = [5, 17, 30, 44, 61, 100, 131];

function copy(s: Shot): Shot {
  return { ...s, data: new Uint8ClampedArray(s.data) };
}

/** Paints `level` as the renderer would with the top floor at `top`, `since` seconds after a landing. */
function paint(level: number, top: number, t: number, since: number, still = false): Shot {
  // The renderer paints the top floor last: the floors under it read the top it saw last frame.
  noteTop(top);
  return shoot(level, BASE_W, H_PHONE, info(t, level === top ? "top" : "tower", since, still));
}

/** Pixels on the outline: within its half-width (and a pixel of anti-aliasing) of the edge. */
function onOutline(s: Shot): (px: number, py: number) => boolean {
  const band = Math.max(1.5, OUTLINE * s.h) / 2 + 0.5;
  const r = BAR_RADIUS * s.h;
  return (px, py) => {
    const cx = px + 0.5 - (s.x + s.w / 2);
    const cy = py + 0.5 - (s.y + s.h / 2);
    const qx = Math.abs(cx) - (s.w / 2 - r);
    const qy = Math.abs(cy) - (s.h / 2 - r);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    return Math.abs(d) <= band;
  };
}

describe("a new floor lands", () => {
  it("the top floor and the three under it shudder; the floors below them stay still", () => {
    for (const top of TOPS) {
      for (let d = 0; d <= 5; d++) {
        const level = top - d;
        for (const t of [1.3, 6.8]) {
          const calm = copy(paint(level, top, t, Infinity));
          const shaken = paint(level, top, t, 0.1);
          const n = changed(calm, shaken);
          if (d < REACT_DEPTH) expect(n, `top ${top}, ${d} down, at ${t}`).toBeGreaterThan(20);
          else expect(n, `top ${top}, ${d} down, at ${t}`).toBe(0);
        }
      }
    }
  });

  it("and settles: a second and a half later it is as before", () => {
    for (const top of TOPS) {
      for (let d = 0; d < REACT_DEPTH; d++) {
        const calm = copy(paint(top - d, top, 3.3, Infinity));
        expect(changed(calm, paint(top - d, top, 3.3, REACT_TIME))).toBe(0);
      }
    }
  });

  it("never moves a floor's outline", () => {
    for (const top of TOPS) {
      for (let d = 0; d < REACT_DEPTH; d++) {
        const calm = copy(paint(top - d, top, 2.2, Infinity));
        const ring = onOutline(calm);
        // The roof sits on the top floor's top edge (and lifts as it lands): there, only the edge itself and below.
        const keep = d === 0 ? (px: number, py: number) => py >= Math.ceil(calm.y) && ring(px, py) : ring;
        for (const since of [0.02, 0.06, 0.1, 0.2, 0.35, 0.6, 1.0, 1.4]) {
          const shaken = paint(top - d, top, 2.2, since);
          expect(changed(calm, shaken, 0, keep), `top ${top}, ${d} down, ${since} s after`).toBe(0);
        }
      }
    }
  });

  it("with reduce motion: no dust, no blink, and less shaking", () => {
    for (const top of TOPS) {
      let loud = 0;
      let quiet = 0;
      for (let d = 0; d < REACT_DEPTH; d++) {
        for (const since of [0.03, 0.08, 0.1, 0.3, 0.6, 1.0]) {
          noteTop(top);
          const r = shudder(top - d, info(4, d === 0 ? "top" : "tower", since, true));
          expect(r.dust).toBe(-1);
          expect(r.blink).toBe(false);
          const calm = copy(paint(top - d, top, 4, Infinity, true));
          quiet += changed(calm, paint(top - d, top, 4, since, true));
          const calmLoud = copy(paint(top - d, top, 4, Infinity, false));
          loud += changed(calmLoud, paint(top - d, top, 4, since, false));
        }
      }
      expect(quiet, `top ${top}`).toBeLessThan(loud * 0.6);
    }
    // Without it, the floors under the new one blink and gather dust.
    noteTop(40);
    expect(shudder(39, info(4, "tower", 0.1)).blink).toBe(true);
    expect(shudder(39, info(4, "tower", 0.1)).dust).toBeGreaterThan(0);
  });

  it("the slider and falling pieces never shudder", () => {
    noteTop(40);
    for (const role of ["slider", "loose"] as const) {
      for (const level of [38, 39, 40, 41]) {
        const r = shudder(level, info(4, role, 0.1));
        expect(r.depth).toBe(-1);
        expect(r.shake + r.swing + r.jx + r.jy + r.drop + r.jolt).toBe(0);
      }
    }
  });
});
