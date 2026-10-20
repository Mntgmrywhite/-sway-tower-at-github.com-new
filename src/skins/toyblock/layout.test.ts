import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { farDrifters, nearDrifters } from "./drift";
import { bridge, castle, farTrees, launchPad, portals } from "./far";
import { fort, inkW, lollipopTree, ringTree, windUpMouse } from "./fort";
import { BLUE, GREEN, ORANGE, PURPLE, RED, YELLOW } from "./colors";
import { blocksTop, front } from "./front";
import { rocketSky } from "./launch";
import { guards, MARCH, rockingHorse, spinningTop } from "./meadow";
import { seaTop } from "./place";
import { sun } from "./sky";
import { context, mask, overlap, SIZES, startScene } from "./test-scene";
import { toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge, the HUD at the top or the letter blocks in front, none
// stands in the tower's column above its floor line, nothing beside the base block rises above
// its top (the slider's first pass never sweeps over it), and no two overlap — except within the
// far land, whose pieces stand in front of one another (the railway hills' trees and tunnel
// mouths before the castle's foot), as hills do. The rocket's corkscrew of smoke is the one thing
// that runs out through the top of the screen: it leads on up to the cloud the rocket flew into.

/**
 * Scene times: through the actions of the first 10 s (the mouse's run-down, its waddle leaning
 * both ways), the rocket's launch after them (the countdown, ignition, lift-off, the corkscrew),
 * its way back down and its landing (legs out, the landing burn, the bounce, the legs folding,
 * the vent's wisp), the next trip's start (the old trail clearing) and its launch, then at rest.
 */
const TIMES = [
  0, 0.17, 0.52, 1.3, 2.7, 4.3, 5.7, 7.1, 9.6, 10.6, 11.9, 12.4, 13.6, 14.7, 16.7, 21.3, 23.4, 24.9, 26.4, 27.42, 29.1, 30.7, 34.6, 40, 42.6, 44.3,
  48.1,
] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `beside`:
 * stands beside the base block, so must stay below its top, out of the slider's first lane.
 * `land`: a piece of the far land (may overlap other pieces of it). `drifts`: comes down a sky
 * lane, so at the start it may be anywhere above the screen (or not drawn at all) and may sit
 * beside the HUD; but none is cut by the screen's top edge on the still title screen. `exits`:
 * runs on up out of the top of the screen (the rocket's smoke, on up to its cloud).
 */
interface Prop {
  name: string;
  draw: Draw;
  above: boolean;
  beside?: boolean;
  land?: boolean;
  drifts?: boolean;
  exits?: boolean;
}
const PROPS: Prop[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), seaTop(s)), above: true },
  { name: "far clouds", draw: (ctx, s) => farDrifters(ctx, s, toneOf(s)), above: true, drifts: true },
  { name: "near lanes", draw: (ctx, s) => nearDrifters(ctx, s, toneOf(s)), above: true, drifts: true },
  { name: "castle", draw: (ctx, s) => castle(ctx, s, toneOf(s)), above: true, land: true },
  { name: "launch pad", draw: (ctx, s) => launchPad(ctx, s, toneOf(s)), above: true, land: true },
  // The rocket in the sky, its corkscrew of smoke and the cloud it flies into: it rises from the
  // land (so may meet the launch pad's smoke), passes behind the title and leaves through the top.
  { name: "rocket's sky", draw: (ctx, s) => rocketSky(ctx, s, toneOf(s)), above: true, land: true, drifts: true, exits: true },
  { name: "far trees", draw: (ctx, s) => farTrees(ctx, s, toneOf(s)), above: true, land: true },
  { name: "bridge", draw: (ctx, s) => bridge(ctx, s, toneOf(s)), above: true, land: true },
  { name: "tunnels", draw: (ctx, s) => portals(ctx, s, toneOf(s)), above: true, land: true },
  { name: "rocking horse", draw: rockingHorse, above: true },
  { name: "spinning top", draw: spinningTop, above: true },
  // The fort's plank is the tower's floor; its turret roofs rise beside the base block.
  { name: "fort", draw: fort, above: true, beside: true },
  { name: "lollipop tree", draw: lollipopTree, above: true, beside: true },
  { name: "ring tree", draw: ringTree, above: true, beside: true },
  { name: "wind-up mouse", draw: windUpMouse, above: true, beside: true },
  { name: "guards", draw: guards, above: true, beside: true },
];

describe("toy kingdom layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t=%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The floor line, less half an ink line (the plank's outline straddles it).
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    // The HUD (title, best, lives) at the top, and the letter blocks in front.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const shelf = Math.floor(blocksTop(s)) - 2;
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;
    // The slider's first lane (one bar above the base block): nothing further back stands in it either.
    const lane0 = baseTop - BLOCK_HEIGHT * s.scale;

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let low = 0;
      let lane = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || (y === 0 && !prop.exits)) edge++;
          if (prop.above && y < floor && x >= x0 && x <= x1) column++;
          if (y < hud && !prop.drifts) top++;
          if (y >= shelf) low++;
          if (prop.beside ? y < baseTop : y > lane0 && y < baseTop) lane++;
        }
      }
      if (!prop.drifts) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(50);
      expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(low, `${prop.name}: pixels reaching the letter blocks`).toBe(0);
      expect(lane, `${prop.name}: pixels in the slider's first lane`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (prop.land && PROPS[j]!.land) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  });
});

describe("toy kingdom guards", () => {
  // The two soldiers march and drum all the time, so the moments above can miss a knee at the top
  // of its step or a stick at the top of its swing: through one whole march, finely, they keep
  // off the screen's edge, out of the slider's lane and the HUD, above the letter blocks, and clear
  // of the lollipop tree, the fort, the rocking horse and the mouse.
  it.each(SIZES)("%ix%i: every moment of the march stays clear", (W, H) => {
    const s0 = startScene(W, H, 0);
    const others = mask(W, H, (ctx) => {
      lollipopTree(ctx, s0);
      fort(ctx, s0);
      rockingHorse(ctx, s0);
      for (const t of [0, 2, 4, 6, 8, 12]) windUpMouse(ctx, { ...s0, t });
    });
    const shelf = Math.floor(blocksTop(s0)) - 2;
    const baseTop = s0.groundY - BLOCK_HEIGHT * s0.scale;
    for (let i = 0; i < 48; i++) {
      const s = { ...s0, t: (i / 48) * MARCH };
      const m = mask(W, H, (ctx) => guards(ctx, s));
      let edge = 0;
      let low = 0;
      let high = 0;
      for (let p = 0; p < m.length; p++) {
        if (!m[p]) continue;
        const x = p % W;
        const y = Math.floor(p / W);
        if (x <= 1 || x >= W - 2) edge++;
        if (y >= shelf) low++;
        if (y < baseTop) high++;
      }
      const what = `t=${s.t.toFixed(3)}`;
      expect(edge, `${what}: guards' pixels at a screen edge`).toBe(0);
      expect(low, `${what}: guards' pixels on the letter blocks`).toBe(0);
      expect(high, `${what}: guards' pixels up in the slider's lane`).toBe(0);
      expect(overlap(m, others), `${what}: the guards overlap another toy`).toBe(0);
    }
  });
});

/** The letter blocks' face and shade colors, as [r, g, b]. */
const BLOCK_COLORS = [RED, YELLOW, BLUE, GREEN, ORANGE, PURPLE].flatMap((c) =>
  [c.body, c.shade].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))),
);

describe("toy kingdom shelf", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide in Fredoka). On every phone that line falls somewhere across the letter blocks'
  // height, so the blocks keep the middle of the shelf clear: only shelf, meadow and ink there.
  it.each(SIZES)("%ix%i: the letter blocks leave the start line clear", (W, H) => {
    const s = startScene(W, H, 0);
    const ctx = context(W, H);
    front(ctx, s);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    const y0 = Math.floor(H * 0.9 - s.u * 0.05);
    const y1 = Math.ceil(H * 0.9 + s.u * 0.016);
    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let block = 0;
    for (let i = 0; i < data.length; i += 4) {
      const near = BLOCK_COLORS.some(([r, g, b]) => Math.abs(data[i]! - r!) + Math.abs(data[i + 1]! - g!) + Math.abs(data[i + 2]! - b!) < 30);
      if (near) block++;
    }
    expect(block, "letter-block pixels behind the start line").toBe(0);
    // And the blocks are there, either side of it.
    const row = Math.round(blocksTop(s) + s.u * 0.04);
    const side = ctx.getImageData(0, row, Math.round(W / 2 - s.u * 0.2), 1).data;
    let colored = 0;
    for (let i = 0; i < side.length; i += 4) {
      if (BLOCK_COLORS.some(([r, g, b]) => Math.abs(side[i]! - r!) + Math.abs(side[i + 1]! - g!) + Math.abs(side[i + 2]! - b!) < 30)) colored++;
    }
    expect(colored, "letter blocks on the left of the shelf").toBeGreaterThan(s.u * 0.15);
  });
});
