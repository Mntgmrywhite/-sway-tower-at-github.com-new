import { afterEach, describe, expect, it } from "vitest";
import { BAR_RADIUS } from "../../../base/blocks";
import type { BarInfo } from "../../skin";
import { OUTLINE } from "./floor";
import { noteTop } from "./react";
import { ROOF_MAX } from "./roof";
import { BASE_W, H_PHONE, H_TABLET, info, shoot, type Shot } from "./test-floor";
import { breathe } from "../test-scene";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// R1 and R2: a floor is its bar's rectangle. The game judges x..x+w, y..y+h, so a floor fills it
// edge to edge with the bar's rounded corners and paints nothing outside it, but for its ink
// outline, which sits on the edge as every bar's does (half of it outside, plus a pixel of
// anti-aliasing). Only the top floor may wear something above it: its roof, inside x..x+w and at
// most ROOF_MAX floor heights up. Every level of two full cycles, every role, five widths from the
// base bar down to a sliver, a phone's and a tablet's floor height, and thirty moments, some of
// them while the house shudders from a landing.

const ROLES: BarInfo["role"][] = ["tower", "top", "slider", "loose"];
// (Five of them, so with the top one to three floors up every pairing comes round; 0.62 s is the
// dust near the bottom of its fall.)
const SINCE = [Infinity, 0.05, 0.3, 0.62, 1.0];

/** How far outside the rounded rectangle (x, y, w, h) a pixel center lies (negative inside). */
function outside(px: number, py: number, s: Shot): number {
  const r = Math.max(0, Math.min(BAR_RADIUS * s.h, s.w / 2, s.h / 2));
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const qx = Math.abs(px - cx) - (s.w / 2 - r);
  const qy = Math.abs(py - cy) - (s.h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** The pixels painted where nothing may be (alpha above a faint edge). */
function strays(s: Shot, role: BarInfo["role"]): string[] {
  const grow = Math.max(1.5, OUTLINE * s.h) / 2 + 1;
  const out: string[] = [];
  for (let py = 0; py < s.H; py++) {
    for (let px = 0; px < s.W; px++) {
      if (s.data[(py * s.W + px) * 4 + 3]! <= 24) continue;
      const cx = px + 0.5;
      const cy = py + 0.5;
      if (outside(cx, cy, s) <= grow) continue;
      // The roof: above the top floor, within its ends, at most ROOF_MAX up.
      if (role === "top" && cy < s.y && cx >= s.x - 1 && cx <= s.x + s.w + 1 && cy >= s.y - ROOF_MAX * s.h - 1) continue;
      out.push(`(${px}, ${py})`);
      if (out.length > 4) return out;
    }
  }
  return out;
}

/** A pixel just inside the middle of each edge is solid: the floor fills its rectangle. */
function solidEdges(s: Shot): boolean {
  const at = (x: number, y: number) => s.data[(Math.floor(y) * s.W + Math.floor(x)) * 4 + 3]!;
  const mx = s.x + s.w / 2;
  const my = s.y + s.h / 2;
  return at(mx, s.y + 1) === 255 && at(mx, s.y + s.h - 1) === 255 && at(s.x + 1, my) === 255 && at(s.x + s.w - 1, my) === 255;
}

describe("a floor stays in its bar's rectangle (R1, R2)", () => {
  for (const [name, h, moments] of [
    ["phone", H_PHONE, 30],
    ["tablet", H_TABLET, 12],
  ] as const) {
    it(`on a ${name}: every level, role and width, at ${moments} moments`, () => {
      const widths = [BASE_W * (h / H_PHONE), 3 * h, 1.5 * h, 0.6 * h, 0.2 * h];
      const bad: string[] = [];
      for (let level = 0; level < 24; level++) {
        for (const role of ROLES) {
          for (const w of widths) {
            for (let k = 0; k < moments; k++) {
              const t = 0.37 + k * 1.93;
              const since = SINCE[k % SINCE.length]!;
              // The floors under the top shudder too: the top is one to three floors up.
              if (role === "tower") noteTop(level + 1 + (k % 3));
              const s = shoot(level, w, h, info(t, role, since));
              const stray = strays(s, role);
              if (stray.length) bad.push(`level ${level} ${role} w ${(w / h).toFixed(1)}h t ${t.toFixed(2)} since ${since}: ${stray.join(" ")}`);
              if (!solidEdges(s)) bad.push(`level ${level} ${role} w ${(w / h).toFixed(1)}h t ${t.toFixed(2)}: an edge is not solid`);
              if (bad.length > 6) break;
            }
          }
        }
      }
      expect(bad).toEqual([]);
    }, 120_000);
  }
});
