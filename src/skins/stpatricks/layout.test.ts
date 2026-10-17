import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { WALL_GAP, WALL_STONES } from "./colors";
import { drifters } from "./drift";
import { bridge, farmhouses, farSheep, floorTop, monastery, mountains } from "./far";
import { front, wallFoot, wallTop } from "./front";
import { plan, potAndLeprechaun } from "./gold";
import { cottage, rainbowArc, smoke, toadstool } from "./meadow";
import { flock } from "./pasture";
import { sun } from "./sky";
import { context, mask, overlap, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";
import { inkW, roundTower } from "./tower";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge, the HUD at the top or the wall in front, none stands
// in the tower's column above its floor line, nothing on the meadow beside the base block rises
// above its top (the slider's first pass never sweeps over it), and no two overlap, except where
// that is the design: the rainbow's right foot comes down behind the pot of gold (where the
// leprechaun hides), he brings the pot out from behind the round tower, and the rainbow (the
// owner asked for it bigger) stands in a big arch behind the round tower, the base block and the
// first bars, still once it has formed (gold.test.ts keeps its feet in view either side of the
// drum, and calm.test.ts its forming sweep to the first seconds).

/**
 * Moments of the scene's clock: the rainbow forming over bare grass, the leprechaun lugging the
 * pot out from behind the round tower, under the arch, setting it down and slipping behind it,
 * then peeking round its left side, over its rim (toward the tower, and away), round its right.
 */
const TIMES = [0, 0.8, 1.6, 2.2, 3, 3.8, 4.6, 5, 6.6, 8.2, 10.6, 17.4, 37.5] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `beside`:
 * stands on the meadow beside the base block, so must stay below its top, out of the slider's
 * first lane. `away`: may be missing at times (the pot before he brings it, the rainbow before
 * it forms).
 */
const PROPS: { name: string; draw: Draw; above: boolean; beside?: boolean; away?: boolean }[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s))), above: true },
  { name: "swallows", draw: (ctx, s) => drifters(ctx, s, toneOf(s)), above: true },
  { name: "mountains", draw: (ctx, s) => mountains(ctx, s, toneOf(s)), above: false },
  { name: "round tower and high cross", draw: (ctx, s) => monastery(ctx, s, toneOf(s)), above: true },
  { name: "far sheep", draw: (ctx, s) => farSheep(ctx, s, toneOf(s)), above: true },
  { name: "farmhouses", draw: (ctx, s) => farmhouses(ctx, s, toneOf(s)), above: true },
  { name: "bridge", draw: (ctx, s) => bridge(ctx, s, toneOf(s)), above: true },
  { name: "flock", draw: flock, above: true },
  { name: "smoke", draw: smoke, above: true },
  { name: "cottage", draw: cottage, above: true, beside: true },
  { name: "rainbow", draw: rainbowArc, above: false, away: true },
  { name: "pot of gold and leprechaun", draw: potAndLeprechaun, above: true, beside: true, away: true },
  { name: "toadstool", draw: toadstool, above: true, beside: true },
  // The drum's top course is the tower's floor; the mound, ladder and doorway hang below it.
  { name: "round tower base", draw: roundTower, above: true, beside: true },
];

/** The meetings that are the design. */
const ALLOWED = [
  // The rainbow's right foot comes down behind the pot, and he carries it out under the arch.
  ["rainbow", "pot of gold and leprechaun"],
  // He comes out from behind the round tower.
  ["pot of gold and leprechaun", "round tower base"],
  // The rainbow's arch passes behind the round tower's top: its floor course and the drum's shoulder.
  ["rainbow", "round tower base"],
  // The far range of mountains stands behind everything on the horizon.
  ["mountains", "round tower and high cross"],
  ["mountains", "far sheep"],
  ["mountains", "farmhouses"],
  ["mountains", "bridge"],
  ["mountains", "sun"],
  ["mountains", "swallows"],
];

function allowed(a: string, b: string): boolean {
  return ALLOWED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

describe("st. patrick's layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const wall = mask(W, H, (ctx) => front(ctx, s));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The floor line, less half an ink line (the top course's outline straddles it).
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    // The HUD (title, best, lives) at the top.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;
    const potHome = plan(s.t).potShown;
    const formed = s.t > 0.4;

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let lane = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === 0) edge++;
          if (prop.above && y < floor && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (prop.beside && y < baseTop) lane++;
        }
      }
      if (!prop.away || (prop.name === "rainbow" ? formed : potHome)) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(20);
      // The mountains are scenery: their flanks run off the screen's sides like the hills'.
      if (prop.name !== "mountains") expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(lane, `${prop.name}: pixels above the base block (in the slider's first lane)`).toBe(0);
      expect(overlap(m, wall), `${prop.name} reaches the wall in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop.name, PROPS[j]!.name)) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  }, 60_000);
});

/** The wall's stone and shadow colors, as [r, g, b]. */
const WALL_COLORS = [WALL_GAP, ...WALL_STONES.flatMap((c) => [c.body, c.light, c.shade])].map((hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
);

function wallPixels(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (WALL_COLORS.some(([r, g, b]) => Math.abs(data[i]! - r!) + Math.abs(data[i + 1]! - g!) + Math.abs(data[i + 2]! - b!) < 24)) n++;
  }
  return n;
}

describe("st. patrick's wall", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). On every phone that line falls somewhere across the wall, so the wall keeps a
  // gateway open in the middle: only meadow, path and ink there.
  it.each(SIZES)("%ix%i: the gateway leaves the start line clear", (W, H) => {
    const s = startScene(W, H, 0);
    const ctx = context(W, H);
    front(ctx, s);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    const y0 = Math.floor(H * 0.9 - s.u * 0.05);
    const y1 = Math.ceil(H * 0.9 + s.u * 0.016);
    expect(wallPixels(ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data), "wall pixels behind the start line").toBe(0);
    // And the wall is there, either side of it (sampled across its middle course).
    const row = Math.round((wallTop(s) + wallFoot(s)) / 2 + s.u * 0.012);
    const side = Math.round(W / 2 - s.u * 0.22);
    expect(wallPixels(ctx.getImageData(0, row, side, 1).data), "wall on the left").toBeGreaterThan(s.u * 0.15);
    expect(wallPixels(ctx.getImageData(W - side, row, side, 1).data), "wall on the right").toBeGreaterThan(s.u * 0.15);
  });
});
