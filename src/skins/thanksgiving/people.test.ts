import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { HOUSE, TABLE } from "./ground";
import { spot } from "./pen";
import { CAST, SUPPER_PERIOD, type Who } from "./supper";
import { supper } from "./table";
import { context, startScene, ZOOMED, sceneAt } from "./test-scene";

// The family around the supper table never bumps into each other (the owner's rule that nothing
// is cut off by anything else, for the people too): each person is drawn alone, just as the
// supper draws them, right through a whole round at a tenth of a second, and no two of them ever
// share a pixel: not walking down the garden path one behind another, not passing behind the
// table, not seated elbow to elbow, not holding up the cloth.

/** The part of the screen around the table and the garden path, in the table's local units. */
const AREA = { x0: -0.24, x1: 0.26, y0: -0.26, y1: 0.04 } as const;

interface Mask {
  bits: Uint8Array;
  w: number;
  /** Bounding box of the covered pixels (x1 < x0 when nothing is drawn). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Each person's pixels at scene time t, on a canvas cropped to the table's area. */
function masks(s: Scene): Map<Who, Mask> {
  const p = spot(s, TABLE.X, TABLE.z);
  const tbl = { x: p.x, y: p.y, k: p.k };
  const h = spot(s, HOUSE.X, HOUSE.z);
  const house = { x: h.x, y: h.y, k: h.k };
  const ts = s.u * tbl.k;
  const ox = Math.floor(tbl.x + AREA.x0 * ts);
  const oy = Math.floor(tbl.y + AREA.y0 * ts);
  const w = Math.ceil((AREA.x1 - AREA.x0) * ts);
  const hgt = Math.ceil((AREA.y1 - AREA.y0) * ts);
  const out = new Map<Who, Mask>();
  for (const who of CAST) {
    const ctx = context(w, hgt);
    ctx.translate(-ox, -oy);
    supper(ctx, s, tbl, house, who);
    const data = ctx.getImageData(0, 0, w, hgt).data;
    const m: Mask = { bits: new Uint8Array(w * hgt), w, x0: w, y0: hgt, x1: -1, y1: -1 };
    for (let i = 0; i < m.bits.length; i++) {
      if (data[i * 4 + 3]! <= 40) continue;
      m.bits[i] = 1;
      const x = i % w;
      const y = (i - x) / w;
      if (x < m.x0) m.x0 = x;
      if (x > m.x1) m.x1 = x;
      if (y < m.y0) m.y0 = y;
      if (y > m.y1) m.y1 = y;
    }
    out.set(who, m);
  }
  return out;
}

/** Pixels two masks share. */
function shared(a: Mask, b: Mask): number {
  const x0 = Math.max(a.x0, b.x0);
  const x1 = Math.min(a.x1, b.x1);
  const y0 = Math.max(a.y0, b.y0);
  const y1 = Math.min(a.y1, b.y1);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) n += a.bits[y * a.w + x]! & b.bits[y * b.w + x]!;
  return n;
}

const SCREENS = [
  [390, 844, 0.1, "tall phone"],
  [375, 667, 0.1, "short phone"],
  [768, 1024, 0.25, "tablet"],
  [ZOOMED.W, ZOOMED.H, 0.5, "zoomed out"],
] as const;

describe("thanksgiving supper: nobody bumps into anybody", () => {
  it.each(SCREENS)(
    "%ix%i (every %s s, %s): no two of the family ever overlap",
    (W, H, dt, view) => {
      const seen = new Set<Who>();
      for (let t = 0; t < SUPPER_PERIOD; t += dt) {
        const s = view === "zoomed out" ? sceneAt(W, H, 0, t, ZOOMED.u) : startScene(W, H, t);
        const m = masks(s);
        for (const [who, mk] of m) if (mk.x1 >= 0) seen.add(who);
        for (let i = 0; i < CAST.length; i++) {
          for (let j = i + 1; j < CAST.length; j++) {
            const a = CAST[i]!;
            const b = CAST[j]!;
            expect(shared(m.get(a)!, m.get(b)!), `${a} and ${b} at t=${t.toFixed(2)}`).toBe(0);
          }
        }
      }
      // Everyone was drawn (the check above is not vacuous).
      expect([...seen].sort()).toEqual([...CAST].sort());
    },
    240_000,
  );
});
