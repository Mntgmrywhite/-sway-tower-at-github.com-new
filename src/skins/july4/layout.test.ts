import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import { titleLayout } from "../../render";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import { church, courthouse, floorTop, landmarkLine, townRow, trees } from "./far";
import { front } from "./front";
import { drawUnit, paradeX, ROUTE, UNITS, type Unit } from "./parade";
import { sun, sunAt, SUN_REACH } from "./sky";
import { bandstand, barbecue, hedge, inkW, lampPosts, path, sparklerKids } from "./square";
import { context, mask, overlap, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge, the HUD at the top or the street in front, none stands
// in the tower's column above its floor line, nothing on the lawn beside the base block rises
// above its top (the slider's first pass never sweeps over it), and no two overlap, except where
// that is the design: the parade passes in front of the bandstand, its steps and path, the
// barbecue corner and the kids, and the big trees stand in front of Main Street.

/** The phones and two iPads: the start view must hold together on all of them. */
const SCREENS = [...SIZES, [768, 1024], [1024, 1366]] as const;

/** Moments of the scene's clock: the parade stepping in, passing the bandstand, Uncle Sam tipping his hat, the tail going out. */
const TIMES = [0, 1.2, 2.6, 4.1, 5.5, 7.2, 8.4, 9.6, 11, 14, 25] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `beside`:
 * stands on the lawn beside the base block, so must stay below its top, out of the slider's
 * first lane. `scenery`: runs off the screen's sides by design (Main Street, the hedge).
 */
const PROPS: { name: string; draw: Draw; above: boolean; beside?: boolean; scenery?: boolean }[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s))), above: true },
  { name: "lane", draw: (ctx, s) => drifters(ctx, s, toneOf(s)), above: true },
  { name: "main street", draw: (ctx, s) => townRow(ctx, s, toneOf(s)), above: false, scenery: true },
  { name: "church", draw: (ctx, s) => church(ctx, s, toneOf(s), landmarkLine(s), true), above: true },
  { name: "courthouse", draw: (ctx, s) => courthouse(ctx, s, toneOf(s), landmarkLine(s), true), above: true },
  { name: "trees", draw: (ctx, s) => trees(ctx, s, toneOf(s)), above: false },
  { name: "hedge", draw: (ctx, s) => hedge(ctx, s, toneOf(s)), above: false, scenery: true },
  { name: "lamp posts", draw: (ctx, s) => lampPosts(ctx, s, toneOf(s)), above: false },
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
  ["trees", "church"],
  ["trees", "courthouse"],
  ["hedge", "main street"],
  ["hedge", "church"],
  ["hedge", "courthouse"],
  ["hedge", "trees"],
  ["lamp posts", "main street"],
  ["lamp posts", "hedge"],
  ["lamp posts", "church"],
  ["lamp posts", "courthouse"],
  ["lamp posts", "trees"],
  ["path", "bandstand"],
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
    const street = mask(W, H, (ctx) => front(ctx, s));
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
      if (prop.name !== "path") expect(overlap(m, street), `${prop.name} reaches the street in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop.name, PROPS[j]!.name)) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });

    // The parade: every unit on screen keeps below the floor line and off the street, and the
    // units never run into each other; the sun, the lane and the far town stay clear of it.
    const units = UNITS.map(({ unit }) => ({ unit, m: unitMask(W, H, s, unit) }));
    const far = masks.slice(0, 8).reduce((acc, m) => {
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
      expect(overlap(m, street), `${unit} reaches the street`).toBe(0);
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
    const { x, y, r } = sunAt(s, toneOf(s), floorTop(s, level(s)));
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

/** The street's asphalt and curb colors, as [r, g, b]. */
describe("independence day street", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). On every phone that line falls on the street: only the plain sidewalk, the
  // curb's paint and the asphalt there, never the parade or the lawn's props.
  it.each(SIZES)("%ix%i: the start line falls on the street, clear of the square", (W, H) => {
    const s = startScene(W, H, 3);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    const y0 = Math.floor(H * 0.9 - s.u * 0.045);
    const y1 = Math.ceil(H * 0.9 + s.u * 0.016);
    const street = mask(W, H, (ctx) => front(ctx, s));
    let covered = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) covered += street[y * W + x]!;
    expect(covered, "the start line lies on the street").toBe((y1 - y0) * (x1 - x0));
    // The path runs under the sidewalk by design; the bandstand and the parade must not.
    const ctx = context(W, H);
    bandstand(ctx, s);
    for (const { unit, back } of UNITS) drawUnit(ctx, s, unit, (paradeX(s.t) - back) * s.u, s.groundY + ROUTE * s.u, s.t);
    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let busy = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) busy++;
    expect(busy, "the square's things behind the start line").toBe(0);
  });
});
