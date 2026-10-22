import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import { titleLayout } from "../../render";
import type { Scene } from "../skin";
import { barbecue, sparklerKids } from "./cast";
import { crowd, strollers } from "./crowd";
import { drifters } from "./drift";
import { bottomFence, front, lawnThings, picnic } from "./front";
import { backLine } from "./land";
import { church, courthouse } from "./landmarks";
import { bigTrees, fenceAndBeds, lampPosts, middleHedge, storeRow } from "./mainstreet";
import { drawUnit, paradeX, ROUTE, UNITS, type Unit } from "./parade";
import { sun, sunAt, SUN_REACH } from "./sky";
import { bandstand, inkW, LAWN_P, path } from "./square";
import { context, mask, overlap, sceneAt, SIZES, startScene, zoomedScene } from "./test-scene";
import { toneOf } from "./tone";

// The start view, on a tall and a short phone and two iPads, at a few animation times: each prop
// is drawn alone, and none touches a screen edge, the HUD at the top or the picnic lawn in front,
// none stands in the tower's column above its floor line, nothing on the lawn beside the base
// block rises above its top (the slider's first pass never sweeps over it), and no two overlap,
// except where that is the design: the parade passes in front of the bandstand, its steps and
// path, the barbecue corner and the kids; the big trees and the lampposts stand in front of Main
// Street, the church and the courthouse rise behind it.

/** The phones and two iPads: the start view must hold together on all of them. */
const SCREENS = [...SIZES, [768, 1024], [1024, 1366]] as const;

/** Moments of the scene's clock: the parade stepping in, passing the bandstand, Uncle Sam tipping his hat, the tail going out. */
const TIMES = [0, 1.2, 2.6, 4.1, 5.5, 7.2, 8.4, 9.6, 11, 14, 25] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `beside`:
 * stands on the lawn beside the base block, so must stay below its top, out of the slider's
 * first lane. `scenery`: runs off the screen's sides by design (Main Street's row, the hedge, the fence).
 */
const PROPS: { name: string; draw: Draw; above: boolean; beside?: boolean; scenery?: boolean }[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s)), above: true },
  { name: "lane", draw: (ctx, s) => drifters(ctx, s, toneOf(s)), above: true },
  { name: "main street", draw: (ctx, s) => storeRow(ctx, s, toneOf(s)), above: false, scenery: true },
  { name: "church", draw: (ctx, s) => church(ctx, s, toneOf(s), backLine(s)), above: true },
  { name: "courthouse", draw: (ctx, s) => courthouse(ctx, s, toneOf(s), backLine(s)), above: true },
  { name: "trees", draw: (ctx, s) => bigTrees(ctx, s, toneOf(s)), above: true },
  { name: "hedge", draw: (ctx, s) => middleHedge(ctx, s, toneOf(s)), above: false, scenery: true },
  { name: "fence", draw: (ctx, s) => fenceAndBeds(ctx, s, toneOf(s)), above: true, scenery: true },
  { name: "lamp posts", draw: (ctx, s) => lampPosts(ctx, s, toneOf(s)), above: true },
  // The townsfolk along Main Street: the crowd in front of the flower beds, the strollers behind the fence.
  { name: "crowd", draw: crowd, above: true },
  { name: "strollers", draw: strollers, above: true },
  { name: "path", draw: path, above: false },
  { name: "barbecue corner", draw: barbecue, above: true, beside: true },
  { name: "kids with sparklers", draw: sparklerKids, above: true, beside: true },
  // The deck's lip is the tower's floor; the fascia, lattice and steps hang below it.
  { name: "bandstand", draw: bandstand, above: true, beside: true },
];

/** The meetings that are the design. */
const ALLOWED = [
  ["main street", "trees"],
  ["main street", "church"],
  ["main street", "courthouse"],
  ["main street", "fence"],
  ["main street", "lamp posts"],
  ["trees", "church"],
  ["trees", "courthouse"],
  ["lamp posts", "church"],
  ["lamp posts", "courthouse"],
  ["hedge", "main street"],
  ["hedge", "fence"],
  ["trees", "fence"],
  ["lamp posts", "fence"],
  ["lamp posts", "hedge"],
  ["path", "bandstand"],
  // The townsfolk stand in front of Main Street's shops, its trees, lampposts and fence (the crowd
  // before the flower beds, the strollers behind the pickets), and among one another.
  ["main street", "crowd"],
  ["main street", "strollers"],
  ["fence", "crowd"],
  ["fence", "strollers"],
  ["lamp posts", "crowd"],
  ["lamp posts", "strollers"],
  ["trees", "crowd"],
  ["trees", "strollers"],
  ["crowd", "strollers"],
  // (The church and the courthouse stand behind Main Street: drawn alone, their feet run down behind the shops the townsfolk stand before.)
  ["church", "strollers"],
  ["courthouse", "strollers"],
  ["church", "crowd"],
  ["courthouse", "crowd"],
];

function allowed(a: string, b: string): boolean {
  return ALLOWED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** A parade unit drawn alone where it is at the scene's time. */
function unitMask(W: number, H: number, s: Scene, unit: Unit): Uint8Array {
  const back = UNITS.find((u) => u.unit === unit)!.back;
  return mask(W, H, (ctx) => drawUnit(ctx, s, unit, (paradeX(s.t) - back) * s.u, s.groundY + ROUTE * s.u, s.t));
}

describe("independence day layout", () => {
  it.each(SCREENS.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    // The picnic lawn and its props (the balloon floating off the lemonade stand passes in front of things by design).
    const street = mask(W, H, (ctx) => picnic(ctx, s));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The deck's lip is the floor line itself, an ink line thick (under the base block).
    const floor = Math.floor(s.groundY - inkW(s) / 2) - 1;
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
          if (prop.beside && y < baseTop) lane++;
        }
      }
      expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(20);
      if (!prop.scenery) expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(lane, `${prop.name}: pixels above the base block (in the slider's first lane)`).toBe(0);
      // The path runs out under the sidewalk by design.
      if (prop.name !== "path") expect(overlap(m, street), `${prop.name} reaches the picnic lawn in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop.name, PROPS[j]!.name)) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });

    // The parade: every unit on screen keeps below the floor line and off the picnic lawn, and
    // the units never run into each other; the sun, the lane and the town stay clear of it.
    const units = UNITS.map(({ unit }) => ({ unit, m: unitMask(W, H, s, unit) }));
    const far = masks.slice(0, 11).reduce((acc, m) => {
      for (let k = 0; k < acc.length; k++) acc[k] = acc[k]! | m[k]!;
      return acc;
    }, new Uint8Array(W * H));
    units.forEach(({ unit, m }, i) => {
      let above = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (y < floor) above++;
        }
      }
      if (!drawn) return;
      expect(above, `${unit}: pixels above the floor line`).toBe(0);
      expect(overlap(m, street), `${unit} reaches the picnic lawn`).toBe(0);
      expect(overlap(m, far), `${unit} reaches the sky or Main Street`).toBe(0);
      for (let j = i + 1; j < units.length; j++) {
        expect(overlap(m, units[j]!.m), `${unit} runs into ${units[j]!.unit}`).toBe(0);
      }
    });
  }, 90_000);

  it.each([...SCREENS, [1440, 900]] as const)("%ix%i: the sun hangs clear of the title's Slide / Drop cards and the HUD", (W, H) => {
    // The title lays its cards over the start view from titleLayout().top (title.css: 0.14 u
    // deep, a 0.012 u shadow under them; the chosen card's ring is inside that); the whole sun,
    // halo and all, hangs below them and below the HUD's lowest line, and never touches the left
    // edge, on phones, iPads and a wide desktop window.
    const s = startScene(W, H, 0);
    const { top, u } = titleLayout(W, H);
    const cardsBottom = top + u * (0.14 + 0.012);
    const { x, y, r } = sunAt(s, toneOf(s));
    expect(y - r * SUN_REACH, "the sun's halo under the title's cards").toBeGreaterThan(cardsBottom + 2);
    expect(y - r * SUN_REACH, "the sun's halo under the HUD").toBeGreaterThan(H * 0.14 + u * 0.192 + 2);
    expect(x - r * SUN_REACH, "the sun's halo inside the left edge").toBeGreaterThan(2);
  });

  it.each(SCREENS)("%ix%i: every unit of the parade is whole on screen as it passes the tower", (W, H) => {
    for (const { unit, back } of UNITS) {
      // The moment the unit is in front of the tower's center.
      const s0 = startScene(W, H, 0);
      const cx = s0.baseX + s0.baseW / 2;
      let at = 0;
      for (let t = 0; t < 20; t += 1 / 60) {
        if ((paradeX(t) - back) * s0.u >= cx) {
          at = t;
          break;
        }
      }
      const s = { ...s0, t: at };
      const m = unitMask(W, H, s, unit);
      let edge = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === H - 1) edge++;
        }
      }
      expect(drawn, `${unit} is drawn`).toBeGreaterThan(50);
      expect(edge, `${unit}: pixels on a screen edge`).toBe(0);
    }
  });
});

describe("independence day picnic lawn", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). On every phone that line falls on the picnic lawn in front (the sidewalk or
  // the grass; its props keep to the sides), never on the parade or the bandstand.
  it.each(SIZES)("%ix%i: the start line falls on the picnic lawn, clear of the square", (W, H) => {
    const s = startScene(W, H, 3);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    const y0 = Math.floor(H * 0.9 - s.u * 0.045);
    const y1 = Math.ceil(H * 0.9 + s.u * 0.016);
    const lawnMask = mask(W, H, (ctx) => front(ctx, s));
    let covered = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) covered += lawnMask[y * W + x]!;
    expect(covered, "the start line lies on the picnic lawn").toBe((y1 - y0) * (x1 - x0));
    // The bandstand and the parade must not reach it.
    const sq = context(W, H);
    bandstand(sq, s);
    for (const { unit, back } of UNITS) drawUnit(sq, s, unit, (paradeX(s.t) - back) * s.u, s.groundY + ROUTE * s.u, s.t);
    const data = sq.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let square = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) square++;
    expect(square, "the square's things behind the start line").toBe(0);
  });

  // The lawn's things (the blanket and its family, the lawn chair, the sign, the bed and its
  // pinwheels, the barrel and wheel, the lemonade stand and its balloons) stand whole: none
  // touches a side or the bottom of the screen, and none reaches the picket fence we look over
  // along the bottom (the short phone has the least room between the sidewalk and the fence).
  const LAWN_VIEWS = [...SCREENS.map(([W, H]) => [W, H, 1] as const), [834, 1194, 1], [390, 844, 0.6], [375, 667, 0.6]] as const;
  it.each(LAWN_VIEWS)("%ix%i at zoom %s: the lawn's things stand whole, clear of the screen's edges and the fence", (W0, H0, z) => {
    for (const t of [0, 3, 6.6, 9.2]) {
      const s = z === 1 ? startScene(W0, H0, t) : zoomedScene(W0, H0, z, 0, t);
      const W = Math.round(s.cssW);
      const H = Math.round(s.cssH);
      const things = mask(s.cssW, s.cssH, (ctx) => lawnThings(ctx, s));
      const fence = mask(s.cssW, s.cssH, (ctx) => bottomFence(ctx, s));
      let drawn = 0;
      let edge = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!things[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === H - 1) edge++;
        }
      }
      expect(drawn, `t=${t}: the lawn's things are drawn`).toBeGreaterThan(200);
      expect(edge, `t=${t}: pixels of the lawn's things on a screen edge`).toBe(0);
      expect(overlap(things, fence), `t=${t}: the fence cuts into the lawn's things`).toBe(0);
    }
  });

  // As the camera climbs the picnic lawn drops away (LAWN_P times the tower's pace), and all of it
  // goes with it: the frame at a level, lifted back by how far the lawn has dropped, is the start's
  // frame. (A thing kept off the screen's bottom by a clamp on the screen would stay behind,
  // standing on the sidewalk and then over the square, and vanish when the lawn was gone.)
  it.each([...SIZES, [834, 1194]] as const)("%ix%i: the picnic lawn rides down as the camera climbs, everything on it with it", (W, H) => {
    const t = 2.2;
    const rest = context(W, H);
    picnic(rest, sceneAt(W, H, 0, t));
    const a = rest.getImageData(0, 0, W, H).data;
    let checked = 0;
    for (let lvl = 0; lvl < 40; lvl += 0.25) {
      const s = sceneAt(W, H, lvl, t);
      const shift = s.rise * LAWN_P;
      if (shift <= 0) continue;
      if (shift > H * 0.3) break;
      const ctx = context(W, H);
      ctx.translate(0, -shift);
      picnic(ctx, s);
      // (The frame's last row is only partly covered by what runs off the bottom.)
      const rows = Math.floor(H - shift) - 2;
      const b = ctx.getImageData(0, 0, W, rows).data;
      let differ = 0;
      for (let i = 0; i < b.length; i += 4) {
        if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) + Math.abs(a[i + 3]! - b[i + 3]!) > 30) differ++;
      }
      checked++;
      expect(differ, `level ${lvl}: pixels of the lawn out of place`).toBe(0);
    }
    expect(checked, "levels as the lawn drops away").toBeGreaterThan(3);
  });
});
