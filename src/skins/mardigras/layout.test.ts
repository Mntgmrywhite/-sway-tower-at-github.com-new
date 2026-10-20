import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { beadsInFlight, familyOnDeck, sidewalkKids, TOSS_EVERY } from "./balcony";
import { CURB } from "./colors";
import { farLayer, floorTop } from "./far";
import { curbTop, front, GAP } from "./front";
import { parade } from "./parade";
import { inkW } from "./place";
import { sun } from "./sky";
import { square } from "./square";
import { reviewingStand } from "./stand";
import { cafe, cakeCart, centerBlock, deckY, lamppost, leftHouse } from "./street";
import { context, mask, overlap, sceneAt, SIZES, startScene, zoomedScene } from "./test-scene";
import { level, toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge, the HUD at the top or the curb in front, none stands
// in the tower's column above its floor line (but the houses straight ahead, which stand still
// there), and no two overlap, except where that is the design: the far city stands behind the
// roofs and the lamppost, the parade passes in front of the stand and behind the folks at the
// curb, and the float's riders throw beads up to the kids on the sidewalk and the ladder.

/**
 * Moments of the scene's clock: before the parade, the marshal passing the stand, the band,
 * the float's throws on the left and the right, the stilt walker, the dancer, the parade gone,
 * and the family's tosses in between; then the second pass.
 */
const TIMES = [0, 1.2, 2.4, 3.6, 4.6, 5.8, 6.6, 7.4, 8.4, 9.6, 11, 14, 22, 41.5, 46] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `scenery`:
 * runs off the screen's sides by design (the river and the far street).
 */
const PROPS: { name: string; draw: Draw; above: boolean; scenery?: boolean }[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s))), above: true },
  { name: "far city", draw: (ctx, s) => farLayer(ctx, s, toneOf(s), floorTop(s, level(s))), above: false, scenery: true },
  { name: "center block", draw: centerBlock, above: false },
  {
    name: "left house",
    draw: (ctx, s) => {
      leftHouse(ctx, s, (c, deck) => familyOnDeck(c, s, deck));
      cakeCart(ctx, s);
      sidewalkKids(ctx, s);
      beadsInFlight(ctx, s);
    },
    above: true,
  },
  { name: "cafe", draw: cafe, above: true },
  { name: "lamppost", draw: lamppost, above: true },
  { name: "stand", draw: reviewingStand, above: true },
  { name: "parade", draw: parade, above: true },
];

/** The meetings that are the design. */
const ALLOWED = [
  // The far city stands behind the roofs, the lamppost and the café's parapet.
  ["far city", "center block"],
  ["far city", "left house"],
  ["far city", "cafe"],
  ["far city", "lamppost"],
  // The parade passes in front of the stand, and throws beads up to the kids on the sidewalk,
  // past the cathedral's square (square.ts), which lies behind the houses at the start.
  ["parade", "stand"],
  ["parade", "left house"],
  ["parade", "far city"],
  // The houses of the terrace share their party walls and their galleries' rails.
  ["center block", "left house"],
  ["center block", "cafe"],
];

function allowed(a: string, b: string): boolean {
  return ALLOWED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

describe("mardi gras layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const curb = mask(W, H, (ctx) => front(ctx, s));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The floor line, less half an ink line (the stand's rail outline straddles it).
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    // The HUD (title, best, lives) at the top.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;

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
          // The stand never rises above the floor line, not even to the base block's height beside it.
          if (y >= baseTop && y < floor && prop.name === "stand") lane++;
        }
      }
      if (prop.name !== "parade" || (t > 1.2 && t < 10)) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(20);
      if (!prop.scenery && !(prop.name === "parade")) expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(lane, `${prop.name}: pixels above the floor line`).toBe(0);
      if (prop.name !== "parade") expect(overlap(m, curb), `${prop.name} reaches the curb in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop.name, PROPS[j]!.name)) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  }, 60_000);

  it.each(SIZES)("%ix%i: the parade keeps below the floor line but for its throws, which keep to the lanes", (W, H) => {
    for (const t of [2, 3.5, 5, 5.9, 6.4, 7, 8, 9, 9.5]) {
      const s = startScene(W, H, t);
      const m = mask(W, H, (ctx) => parade(ctx, s));
      const floor = Math.floor(s.groundY);
      const x0 = Math.ceil(s.baseX - s.u * 0.05);
      const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
      let over = 0;
      for (let y = 0; y < floor; y++) for (let x = x0; x <= x1; x++) if (m[y * W + x]) over++;
      expect(over, `t=${t}: parade pixels above the floor in the tower's column`).toBe(0);
    }
  });
});

describe("mardi gras gallery", () => {
  // The family stands on the left house's gallery right under its eave: the feathers and the
  // plume on their Carnival masks, the little one's jester's hat and his hands up for the
  // skeletons' beads all keep under the roof's edge, through every pose of their tosses.
  it.each(SIZES)("%ix%i: the family on the gallery keeps under the eave", (W, H) => {
    const K = 4;
    for (let t = 0; t < TOSS_EVERY * 2 + 1; t += 0.05) {
      const s = sceneAt(W, H, 0, t);
      const ctx = context(W, H, K);
      familyOnDeck(ctx, s, deckY(s, 1));
      // The band just over the lower edge of the eave's ink line, where a feather would poke through.
      const eave = Math.floor((deckY(s, 2) + inkW(s) / 2) * K);
      const top = eave - Math.ceil(s.u * 0.08 * K);
      const data = ctx.getImageData(0, top, Math.round(W * K), eave - top).data;
      let over = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) over++;
      expect(over, `t=${t.toFixed(2)}: pixels over the eave`).toBe(0);
    }
  });
});

/** The curb's own colors, as [r, g, b]. */
const CURB_COLORS = [CURB.body, CURB.light, CURB.shade].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));

function curbPixels(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (CURB_COLORS.some(([r, g, b]) => Math.abs(data[i]! - r!) + Math.abs(data[i + 1]! - g!) + Math.abs(data[i + 2]! - b!) < 24)) n++;
  }
  return n;
}

describe("mardi gras curb", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). The curb keeps that stretch clear of props: only the curb's stone there.
  it.each(SIZES)("%ix%i: the middle of the curb is clear for the start line", (W, H) => {
    for (const t of [0, 3, 7.5]) {
      const s = startScene(W, H, t);
      const ctx = context(W, H);
      front(ctx, s);
      const x0 = Math.floor(W / 2 - GAP * s.u);
      const x1 = Math.ceil(W / 2 + GAP * s.u);
      const y0 = Math.floor(curbTop(s) - s.u * 0.4);
      const y1 = Math.floor(curbTop(s) - inkW(s));
      const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let drawn = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) drawn++;
      expect(drawn, `t=${t}: pixels above the curb's middle`).toBe(0);
      // And the curb is there, across the start line.
      const row = Math.round(curbTop(s) + s.u * 0.016);
      expect(curbPixels(ctx.getImageData(0, row, W, 1).data), "curb across the width").toBeGreaterThan(W * 0.9);
    }
  });
});

describe("mardi gras on wider screens", () => {
  // The zoomed-out view (a virtual screen up to 1/0.6 the phone's size at the same u) and a
  // tablet show more of the street either side: the props of the start view are still whole
  // there, none touching a side of the screen.
  const SCREENS = [
    [390, 844, 0.6],
    [390, 844, 0.8],
    [375, 667, 0.6],
    [768, 1024, 1],
  ] as const;
  const WHOLE: { name: string; draw: Draw }[] = [
    {
      name: "left house",
      draw: (ctx, s) => {
        leftHouse(ctx, s, (c, deck) => familyOnDeck(c, s, deck));
        cakeCart(ctx, s);
        sidewalkKids(ctx, s);
      },
    },
    { name: "cafe", draw: cafe },
    { name: "lamppost", draw: lamppost },
    { name: "stand", draw: reviewingStand },
    { name: "curb's folk", draw: front },
  ];
  it.each(SCREENS)("%ix%i at zoom %s: nothing is cut off at the sides", (W, H, z) => {
    const K = 0.5;
    for (const t of [0, 1.9, 6.3]) {
      const s = z === 1 ? sceneAt(W, H, 0, t) : zoomedScene(W, H, z, 0, t);
      const w = Math.round(s.cssW * K);
      for (const { name, draw } of WHOLE) {
        const m = mask(s.cssW, s.cssH, (ctx) => draw(ctx, s), K);
        let edge = 0;
        let drawn = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          drawn++;
          const x = i % w;
          // The curb itself runs edge to edge: only its folk and ladder count, above it.
          if (name === "curb's folk" && Math.floor(i / w) >= Math.floor(curbTop(s) * K) - 1) continue;
          if (x === 0 || x === w - 1) edge++;
        }
        expect(drawn, `t=${t}: ${name} is drawn`).toBeGreaterThan(20);
        expect(edge, `t=${t}: ${name} touches a side`).toBe(0);
      }
    }
  });
});

describe("mardi gras square", () => {
  // The cathedral's square shows between the river and the street as the townhouses drop away;
  // all of it lies below the horizon on every screen, so none of it ever stands against the
  // sky, the river, the riverboat, the streetcar or the live oak.
  const SCREENS = [
    [390, 844, 1],
    [375, 667, 1],
    [1024, 1366, 1],
    [1440, 900, 1],
    [390, 844, 0.6],
  ] as const;
  it.each(SCREENS)("%ix%i at zoom %s: below the horizon at every height", (W, H, z) => {
    let seen = 0;
    for (let lvl = 0; lvl <= 36; lvl += 2) {
      const s = z === 1 ? sceneAt(W, H, lvl, 0) : zoomedScene(W, H, z, lvl, 0);
      const m = mask(s.cssW, s.cssH, (ctx) => square(ctx, s, toneOf(s)));
      const w = Math.round(s.cssW);
      const hz = Math.floor(s.horizonY);
      let above = 0;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        seen++;
        if (Math.floor(i / w) < hz) above++;
      }
      expect(above, `level ${lvl}: square pixels above the horizon`).toBe(0);
    }
    expect(seen, "the square is drawn").toBeGreaterThan(1000);
  }, 60_000);
});
