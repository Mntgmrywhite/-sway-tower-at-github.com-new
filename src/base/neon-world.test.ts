import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { neon } from "../skins/neon";
import { neonCyber } from "../skins/neon-cyber";
import { sceneAt } from "../skins/neon/test-scene";
import type { Scene } from "../skins/skin";
import type { Ctx } from "./draw";
import { drawNeonWorld, floorGrid } from "./neon-world";

/** A scene high in the climb: the grid floor is a sliver at the bottom of the screen. */
function sliverScene(gap: number): Scene {
  const cssW = 390;
  const cssH = 844;
  const rise = 6000;
  return {
    cssW,
    cssH,
    u: cssW,
    scale: cssW / 100,
    t: 1.5,
    rise,
    altitude: 1300,
    groundY: cssH * 0.7 + rise,
    horizonY: cssH - gap,
    baseX: cssW * 0.2,
    baseW: cssW * 0.6,
  };
}

describe("neon grid floor", () => {
  it.each([neon, neonCyber])("$id draws a bounded number of grid lines however thin the floor gets", (skin) => {
    for (const gap of [40, 6, 1.5, 0.8, 0.3]) {
      const ctx = createCanvas(390, 844).getContext("2d");
      let lines = 0;
      const lineTo = ctx.lineTo.bind(ctx);
      ctx.lineTo = (x: number, y: number) => {
        lines++;
        lineTo(x, y);
      };
      drawNeonWorld(ctx as unknown as Ctx, sliverScene(gap), skin);
      // Thousands of converging lines once froze frames for seconds near level 160.
      expect(lines, `gap ${gap}px`).toBeLessThan(3000);
    }
  });

  it.each([
    [390, 844, 1],
    [375, 667, 1],
    [390, 844, 0.6],
  ])("%ix%i at zoom %s: keeps one grid all the way up, squeezed into whatever floor still shows", (W, H, zoom) => {
    // The start: the true projection (its depth at the bottom edge is about 1).
    expect(floorGrid(sceneAt(W, H, 0, 2, zoom)).zNear).toBeLessThan(1.3);
    // Climbing: from where the grid stops deepening until the floor has left the screen, the
    // same lines in the same places, relative to the strip of floor between the horizon and the
    // bottom edge; and no bare band under the horizon.
    let ref: { rows: number[]; xStep: number; zNear: number } | null = null;
    let levels = 0;
    for (let lvl = 0; lvl < 400; lvl++) {
      const s = sceneAt(W, H, lvl, 2, zoom);
      const band = s.cssH - s.horizonY;
      if (band < 40) break;
      const g = floorGrid(s);
      const rows = Array.from(g.rows.subarray(0, g.count), (y) => (y - s.horizonY) / band);
      expect(rows[rows.length - 1]! * band, `level ${lvl}: bare floor under the horizon, px`).toBeLessThan(Math.max(2.5, band * 0.03));
      if (g.zNear < 1.6 - 1e-9) {
        expect(ref, `level ${lvl}: the grid deepens again`).toBeNull();
        continue;
      }
      levels++;
      ref ??= { rows, xStep: g.xStep, zNear: g.zNear };
      expect(g.zNear).toBeCloseTo(ref.zNear, 9);
      expect(g.xStep).toBeCloseTo(ref.xStep, 9);
      // On a thinner strip the farthest rows fall within 1.5 px of the horizon and are left out.
      const n = Math.min(rows.length, ref.rows.length);
      for (let i = 0; i < n; i++) expect(rows[i], `level ${lvl}: row ${i}`).toBeCloseTo(ref.rows[i]!, 9);
    }
    expect(levels, "levels with the steady grid").toBeGreaterThan(20);
  });
});
