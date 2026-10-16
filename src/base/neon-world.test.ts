import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { neon } from "../skins/neon";
import { neonCyber } from "../skins/neon-cyber";
import type { Scene } from "../skins/skin";
import type { Ctx } from "./draw";
import { drawNeonWorld } from "./neon-world";

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
});
