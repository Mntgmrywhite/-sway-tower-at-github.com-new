import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { fogPatches, front } from "./front";
import { crestTrees } from "./hollow";
import { isles } from "./isles";
import { perLevel } from "./lines";
import { shops } from "./shops";
import { bellTower, cathedral, chimneyStack, farCity, nearSpire, roofs } from "./skyline";
import { drowned } from "./drowned";
import { LAYERS } from "./stage";
import { stormClouds } from "./storm";
import { mask, sceneAt } from "./test-scene";
import { toneOf } from "./tone";
import { cemetery, village } from "./village";

// Layered parallax (the owner's guide): as you climb, the foreground's fog and the near things slide
// by faster than the town, the town faster than the floating isles, the isles faster than the far
// skyline, and the sky's clouds hardly move. Each layer's speed is measured from its drawing (how far
// it moves on screen between two heights, against how far the camera climbed) and must match its
// entry in LAYERS (stage.ts) within PLAY; and they keep their order.

const PLAY = 0.05;
const W = 390;
const H = 844;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;

/** The layers measured: name in LAYERS, how to draw it alone, a level where it is well in view, how many levels to climb. */
const MEASURED: [string, Draw, number, number][] = [
  ["storm", (ctx, s) => stormClouds(ctx, s, toneOf(s)), 75, 4],
  // (The hill's crest, by the tree on it: the hill's body runs on down to whatever lies below it.)
  ["hollow", (ctx, s) => crestTrees(ctx, s), 30, 8],
  ["farCity", (ctx, s) => farCity(ctx, s, toneOf(s)), 16, 6],
  ["village", (ctx, s) => village(ctx, s, toneOf(s)), 22, 6],
  ["cemetery", (ctx, s) => cemetery(ctx, s), 24, 6],
  ["cathedral", (ctx, s) => cathedral(ctx, s, toneOf(s)), 34, 6],
  ["roofs", (ctx, s) => roofs(ctx, s), 60, 4],
  ["isles", (ctx, s) => isles(ctx, s, 1), 133, 3],
  ["bellTower", (ctx, s) => bellTower(ctx, s), 72, 3],
  ["nearSpire", (ctx, s) => nearSpire(ctx, s), 52, 2],
  ["chimneyStack", (ctx, s) => chimneyStack(ctx, s), 61, 2],
  // (The lantern oak, its top well below the mist's line: the mist cuts nothing of it as it climbs.)
  ["drowned", (ctx, s) => drowned(ctx, s, toneOf(s)), 104, 6],
  ["town", (ctx, s) => shops(ctx, s), 15, 2],
  ["front", (ctx, s) => front(ctx, s), 13, 1],
  ["frontFog", (ctx, s) => fogPatches(ctx, s), 60, 1],
];

/** How far (px, down) a drawing moves on screen as the camera climbs `d` levels from `lvl`: the shift that best lines up its masks. */
function shift(draw: Draw, lvl: number, d: number, most: number): number {
  const a = mask(W, H, (ctx) => draw(ctx, sceneAt(W, H, lvl, 2)), 60);
  const b = mask(W, H, (ctx) => draw(ctx, sceneAt(W, H, lvl + d, 2)), 60);
  let best = 0;
  let bestMiss = Infinity;
  for (let k = 0; k <= most; k++) {
    let miss = 0;
    let both = 0;
    for (let y = 0; y < H - k; y++) {
      for (let x = 0; x < W; x++) {
        const p = a[y * W + x]!;
        const q = b[(y + k) * W + x]!;
        miss += p ^ q;
        both += p & q;
      }
    }
    // Rows shifted past the bottom don't count against a shift.
    const score = miss / Math.max(1, both);
    if (score < bestMiss) {
      bestMiss = score;
      best = k;
    }
  }
  return best;
}

describe("halloween parallax", () => {
  it.each(MEASURED)("%s moves as its layer says", (name, draw, lvl, d) => {
    const drawn = mask(W, H, (ctx) => draw(ctx, sceneAt(W, H, lvl, 2)), 60).reduce((a, b) => a + b, 0);
    expect(drawn, `${name} drawn at level ${lvl}`).toBeGreaterThan(100);
    const px = perLevel(sceneAt(W, H, lvl, 2)) * d;
    const p = shift(draw, lvl, d, Math.ceil(px * 1.8)) / px;
    expect(Math.abs(p - LAYERS[name]!), `${name}: measured ${p.toFixed(3)}, LAYERS ${LAYERS[name]}`).toBeLessThanOrEqual(PLAY);
  }, 60_000);

  it("keeps its layers in order: the fog nearest, then the town, the isles, the skyline, and the clouds far off", () => {
    const L = LAYERS;
    expect(L.frontFog!).toBeGreaterThanOrEqual(1.15);
    expect(L.frontFog!).toBeGreaterThan(L.town!);
    expect(L.town!).toBeGreaterThan(L.isles!);
    expect(L.isles!).toBeGreaterThan(L.cathedral!);
    expect(L.isles!).toBeGreaterThan(L.roofs!);
    // The drowned hollow's set pieces stand out in the sea of mist, beyond the isles, nearer than the far skyline.
    expect(L.drowned!).toBeLessThan(L.isles!);
    expect(L.drowned!).toBeGreaterThan(L.cathedral!);
    expect(L.cathedral!).toBeGreaterThan(L.storm!);
    expect(L.storm!).toBeLessThanOrEqual(0.12);
    expect(L.moonClouds!).toBeLessThanOrEqual(0.12);
    // Near things passing in the lanes move faster than the isles, slower than the fog.
    for (const k of ["nearSpire", "chimneyStack", "bellTower"]) {
      expect(L[k]!, k).toBeGreaterThan(L.isles!);
      expect(L[k]!, k).toBeLessThan(L.frontFog!);
    }
  });
});
