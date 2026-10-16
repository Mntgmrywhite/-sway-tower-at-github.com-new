import { describe, expect, it } from "vitest";
import { horizonFor } from "../../base/world";
import { WORLD_WIDTH } from "../../config";
import { newGame } from "../../game";
import type { Scene } from "../skin";
import { gallery } from "./layout";
import { moon } from "./sky";

// The start view as render.ts frames it (portrait play area u, VIEW_WIDTH = 1.5 world widths,
// ground at 70% of the screen), so the gallery pieces can be checked without a canvas.
function startScene(cssW: number, cssH: number): Scene {
  const u = Math.min(cssW, cssH * 0.6);
  const scale = u / (WORLD_WIDTH * 1.5);
  const offsetX = (cssW - WORLD_WIDTH * scale) / 2;
  const base = newGame().blocks[0]!;
  const groundY = cssH * 0.7;
  return {
    cssW,
    cssH,
    u,
    scale,
    t: 0,
    rise: 0,
    altitude: 0,
    groundY,
    horizonY: horizonFor(groundY, 0, u),
    baseX: offsetX + base.x * scale,
    baseW: base.w * scale,
  };
}

/**
 * Does the box overlap the top-center HUD zone? On a phone that is y < 32% of the screen
 * within 20..80% of its width; on wider screens (letterboxed play area) the HUD stays u-sized
 * (title about 0.9u wide, tilt gauge at 0.14 cssH + 0.165u).
 */
function inHud(s: Scene, x0: number, x1: number, y0: number): boolean {
  if (s.cssW > s.u * 1.05) {
    const c = s.cssW / 2;
    return y0 < s.cssH * 0.14 + s.u * 0.215 && x1 > c - s.u * 0.45 && x0 < c + s.u * 0.45;
  }
  return y0 < s.cssH * 0.32 && x1 > s.cssW * 0.2 && x0 < s.cssW * 0.8;
}

describe("neon-minimal layout", () => {
  it.each([
    [390, 844],
    [375, 667],
    [768, 1024],
    [1280, 800],
  ])("%ix%i: pieces stay on screen, out of the tower column and the HUD", (w, h) => {
    const s = startScene(w, h);
    const g = gallery(s);
    const u = s.u;

    const archL = g.ax - g.plinthW / 2;
    const archR = g.ax + g.plinthW / 2;
    expect(archL).toBeGreaterThanOrEqual(u * 0.02);
    expect(archR).toBeLessThanOrEqual(g.colL);
    expect(g.hy - g.ah).toBeGreaterThan(0);
    expect(inHud(s, archL, archR, g.hy - g.ah)).toBe(false);

    expect(g.px).toBeGreaterThanOrEqual(g.colR);
    expect(g.px + g.pw).toBeLessThanOrEqual(w - u * 0.02);
    expect(inHud(s, g.px, g.px + g.pw, g.hy - g.ph)).toBe(false);

    const [mx, my, r] = moon(s);
    expect(mx + r).toBeLessThanOrEqual(w);
    expect(my - r).toBeGreaterThan(0);
    expect(inHud(s, mx - r, mx + r, my - r)).toBe(false);
    // Clear of the panel: either above its top or beside it.
    expect(my + r <= g.hy - g.ph || mx - r >= g.px + g.pw).toBe(true);
  });
});
