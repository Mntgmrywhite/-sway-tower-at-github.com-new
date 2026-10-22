import { describe, expect, it } from "vitest";
import { FIREWORK, FLAG } from "./colors";
import { backLine } from "./land";
import { CANTON_W, stripesFor, usFlag, type FlagInks } from "./flag";
import { lanceAt, lancework } from "./fireworks";
import { courthouse, FLAG_H, FLAG_W, poleTop } from "./landmarks";
import { context, sceneAt, SIZES } from "./test-scene";
import { LOOP, LOOP_START, toneOf } from "./tone";

// The owner saw the courthouse flag at night read as Puerto Rico's: one star in a canton the
// night swallowed. Every flag in the skin must read as the Stars and Stripes at any size and
// hour: a rectangular blue canton in the upper hoist holding a field of white stars (many white
// specks, not one), and red and white stripes that start and end red. Checked on the pixels, at
// three times the scene's size (a phone's screen is 2x or 3x): the courthouse flag by day and by
// night (when its floodlight keeps it lit), every other flag at the size it is drawn, both ways
// it flies, and the finale's lancework flag of sparks.

const K = 3;

type Rgb = readonly [number, number, number];

function rgb(c: string): Rgb {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Which ink a pixel is nearest to, if it is drawn and clearly one of them. */
function inkAt(d: Uint8ClampedArray, i: number, inks: readonly [Rgb, Rgb, Rgb]): "r" | "w" | "b" | null {
  if (d[i + 3]! < 200) return null;
  let best = -1;
  let bestD = Infinity;
  inks.forEach((c, k) => {
    const dd = Math.hypot(d[i]! - c[0], d[i + 1]! - c[1], d[i + 2]! - c[2]);
    if (dd < bestD) {
      bestD = dd;
      best = k;
    }
  });
  return bestD > 60 ? null : (["r", "w", "b"] as const)[best]!;
}

interface Reading {
  /** The canton's width (px) along its upper and its lower rows, and how far its foot wanders across it. */
  topWidth: number;
  footWidth: number;
  footSpread: number;
  /** The white specks in the canton. */
  specks: number;
  /** The stripes down the fly, top to bottom, as runs of r and w. */
  stripes: string;
}

/**
 * Read a flag drawn in the box (x, y, w, h) (device px) with its hoist on the `hoist` side:
 * the canton (found by its blue: its width along a row is where the blue last shows from the
 * hoist, its foot down a column is where the blue last shows), its white specks, and the
 * stripes down the fly past it (along the column `flyAt` of the way from the hoist).
 */
function read(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hoist: "left" | "right", inks: FlagInks, flyAt = 0.72): Reading {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const W = Math.ceil(w) + 2;
  const H = Math.ceil(h) + 2;
  const d = ctx.getImageData(X, Y, W, H).data;
  const palette = [rgb(inks.red), rgb(inks.white), rgb(inks.blue)] as const;
  const at = (cx: number, cy: number) => (cx < 0 || cy < 0 || cx >= W || cy >= H ? null : inkAt(d, (cy * W + cx) * 4, palette));
  // A column `k` of the way along the fly from the hoist, in the box.
  const col = (k: number) => Math.round(hoist === "left" ? x - X + k * w : x - X + (1 - k) * w);
  const steps = Math.ceil(w);
  // How far along a row the blue reaches from the hoist (px).
  const reach = (row: number) => {
    let last = 0;
    for (let i = 1; i < steps; i++) if (at(col(i / steps), row) === "b") last = i;
    return last;
  };
  // Down a column: the first and the last row with blue.
  const blueRows = (cx: number) => {
    let first = -1;
    let last = -1;
    for (let row = 0; row < H; row++) {
      if (at(cx, row) !== "b") continue;
      if (first < 0) first = row;
      last = row;
    }
    return [first, last] as const;
  };
  const feet: number[] = [];
  let top = H;
  for (let k = 0.05; k < CANTON_W - 0.08; k += 1 / steps) {
    const [first, last] = blueRows(col(k));
    if (last < 0) continue;
    top = Math.min(top, first);
    feet.push(last);
  }
  const foot = feet.length ? feet.slice().sort((a, b) => a - b)[feet.length >> 1]! : 0;
  const quarter = Math.max(1, Math.round((foot - top) / 4));
  let topWidth = 0;
  let footWidth = 0;
  for (let row = top; row < top + quarter; row++) topWidth = Math.max(topWidth, reach(row));
  for (let row = foot - quarter + 1; row <= foot; row++) footWidth = Math.max(footWidth, reach(row));
  // White specks inside the canton: connected runs of white pixels, counted by flood fill.
  const x0 = Math.min(col(0.02), col(CANTON_W - 0.02));
  const x1 = Math.max(col(0.02), col(CANTON_W - 0.02));
  const seen = new Uint8Array(W * H);
  let specks = 0;
  for (let cy = top + 1; cy < foot; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (seen[cy * W + cx] || at(cx, cy) !== "w") continue;
      specks++;
      const stack = [[cx, cy]];
      seen[cy * W + cx] = 1;
      while (stack.length) {
        const [px, py] = stack.pop()!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = px! + dx;
          const ny = py! + dy;
          if (nx < x0 || nx > x1 || ny <= top || ny >= foot || seen[ny * W + nx] || at(nx, ny) !== "w") continue;
          seen[ny * W + nx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  }
  // The stripes down the fly, past the canton: runs of red and white.
  let stripes = "";
  const fly = col(flyAt);
  for (let row = 0; row < H; row++) {
    const c = at(fly, row);
    if (c !== "r" && c !== "w") continue;
    if (stripes[stripes.length - 1] !== c) stripes += c;
  }
  return { topWidth, footWidth, footSpread: feet.length ? Math.max(...feet) - Math.min(...feet) : Infinity, specks, stripes };
}

/** What every flag must read as: a rectangular canton with many white specks, and stripes starting and ending red. */
function expectStarsAndStripes(r: Reading, w: number, n: number, what: string): void {
  const cw = w * CANTON_W;
  expect(r.topWidth, `${what}: the canton's width along its top`).toBeGreaterThan(cw * 0.75);
  expect(r.footWidth, `${what}: the canton's width along its foot (a rectangle, not a triangle)`).toBeGreaterThan(cw * 0.75);
  expect(Math.abs(r.topWidth - r.footWidth), `${what}: the canton is as wide at its foot as at its top`).toBeLessThanOrEqual(Math.max(3, cw * 0.15));
  expect(r.footSpread, `${what}: the canton's foot runs straight across`).toBeLessThanOrEqual(K * 1.5 + 1);
  expect(r.specks, `${what}: white stars in the canton`).toBeGreaterThanOrEqual(9);
  expect(r.stripes.length, `${what}: stripes down the fly (${r.stripes})`).toBe(n);
  expect(r.stripes[0], `${what}: the top stripe`).toBe("r");
  expect(r.stripes[r.stripes.length - 1], `${what}: the bottom stripe`).toBe("r");
}

describe("independence day's flags", () => {
  // The day at the start, over the town; the golden evening, the dusk, the night of the show and
  // the night of a turn of the loop, the flag on the dome over the town under its floodlight.
  const HOURS = [
    ["day", 0],
    ["golden evening", 36],
    ["dusk", 60],
    ["night", 100],
    ["night in the loop", LOOP_START + LOOP - 10],
  ] as const;
  it.each(SIZES.flatMap(([W, H]) => HOURS.map(([hour, lvl]) => [W, H, hour, lvl] as const)))(
    "%ix%i, %s: the courthouse flag reads as the Stars and Stripes",
    (W, H, _hour, lvl) => {
      const s = sceneAt(W, H, lvl, 0);
      const tone = toneOf(s);
      const line = backLine(s);
      const ctx = context(W, H, K);
      courthouse(ctx, s, tone, line);
      const pole = poleTop(s, line);
      const w = FLAG_W * s.u;
      const h = FLAG_H * s.u;
      // It flies toward the square (left) from its pole: the hoist is on its right.
      const r = read(ctx, (pole.x - w - s.u * 0.003) * K, (pole.y - s.u * 0.003) * K, (w + s.u * 0.003) * K, (h + s.u * 0.008) * K, "right", {
        red: tone.flagRed,
        white: tone.flagWhite,
        blue: tone.flagBlue,
      });
      expectStarsAndStripes(r, w * K, stripesFor(h), `level ${lvl}`);
      expect(pole.y + h, `level ${lvl}: the flag is on screen`).toBeLessThan(H);
    },
  );

  // Every other flag, at the size it is drawn (u on a phone): the porch flags beyond Main Street,
  // Main Street's and its balcony's, the flagpoles' over the town, the barbecue table's little
  // flag in a jar, the kids' flag in the grass, the color guard's, the fire truck's, and a big one.
  const OTHERS = [
    ["a porch flag on a house beyond Main Street", 0.026, 0.017, 1],
    ["a flag from a Main Street upper floor", 0.034, 0.022, -1],
    ["the balcony's flag", 0.036, 0.024, 1],
    ["a flagpole's flag over the town", 0.07, 0.045, -1],
    ["the flag in a jar", 0.034, 0.022, 1],
    ["the kids' flag", 0.044, 0.029, 1],
    ["the color guard's flag", 0.06, 0.039, -1],
    ["the fire truck's flag", 0.064, 0.042, -1],
    ["a child's hand flag (the fire truck, the picnic)", 0.032, 0.021, -1],
    ["a child's hand flag waved the other way", 0.032, 0.021, 1],
    ["the boy's flag on his dad's shoulders, far off", 0.0264, 0.0174, 1],
    ["a big flag", 0.16, 0.1, 1],
  ] as const;
  it.each(OTHERS)("%s reads as the Stars and Stripes", (what, fw, fh, dir) => {
    const u = 390;
    const w = fw * u;
    const h = fh * u;
    const ctx = context(200, 200, K);
    const x = dir > 0 ? 20 : 20 + w;
    usFlag(ctx, x, 30, w, h, dir, h * 0.12, 0, FLAG);
    const r = read(ctx, (dir > 0 ? x : x - w) * K, 30 * K - K, w * K, h * K + 2 * K, dir > 0 ? "left" : "right", FLAG);
    expectStarsAndStripes(r, w * K, stripesFor(h), what);
  });

  it("the great flag hung down a Main Street front reads as the Stars and Stripes, its union at the top on the left", () => {
    // Drawn as Main Street hangs it (mainstreet.ts hungFlag): flying, then turned over its diagonal (stripes upright).
    const u = 390;
    const len = 0.126 * u;
    const fw = 0.067 * u;
    const hung = context(100, 100, K);
    hung.save();
    hung.transform(0, 1, 1, 0, 20, 20);
    usFlag(hung, 0, 0, len, fw, 1, 0, 0, FLAG);
    hung.restore();
    // The union: blue in the top left quarter of the hanging flag, none in the top right.
    const d = hung.getImageData(20 * K, 20 * K, fw * K, len * K).data;
    const blue = rgb(FLAG.blue);
    const isBlue = (x: number, y: number) => {
      const i = (Math.floor(y) * Math.floor(fw * K) + Math.floor(x)) * 4;
      return Math.hypot(d[i]! - blue[0], d[i + 1]! - blue[1], d[i + 2]! - blue[2]) < 40;
    };
    expect(isBlue(fw * K * 0.15, len * K * 0.15), "the union at the top left").toBe(true);
    expect(isBlue(fw * K * 0.85, len * K * 0.15), "no union at the top right").toBe(false);
    expect(isBlue(fw * K * 0.15, len * K * 0.85), "no union at the bottom left").toBe(false);
    // Turned back over its diagonal it is the flag flying, and reads as one.
    const flat = context(100, 100, K);
    flat.setTransform(0, 1, 1, 0, 0, 0);
    flat.drawImage(hung.canvas, 0, 0);
    flat.setTransform(K, 0, 0, K, 0, 0);
    const r = read(flat, 20 * K, 20 * K - K, len * K, fw * K + 2 * K, "left", FLAG);
    expectStarsAndStripes(r, len * K, stripesFor(fw), "the hung flag");
  });

  it.each(SIZES)("%ix%i: the finale's lancework flag reads as the Stars and Stripes", (W, H) => {
    // Find a moment of the finale when it burns bright.
    let found = false;
    for (let t = 0; t < 20 && !found; t += 0.25) {
      const s = sceneAt(W, H, 82, t);
      const tone = toneOf(s);
      const lance = lanceAt(s, tone);
      if (lance.on < 0.95) continue;
      found = true;
      const ctx = context(W, H, K);
      const { x, y, w, h } = { ...lance };
      lancework(ctx, s, tone);
      // Its stripes are rows of lances with dark gaps between them: read down the middle of a lance.
      const r = read(ctx, x * K, y * K - K, w * K, h * K + 2 * K, "left", { red: FIREWORK[0], white: FIREWORK[1], blue: FIREWORK[2] }, 13.5 / 18);
      expect(r.topWidth, "the canton's width along its top").toBeGreaterThan(w * K * CANTON_W * 0.75);
      expect(Math.abs(r.topWidth - r.footWidth), "the canton is as wide at its foot as at its top").toBeLessThanOrEqual(w * K * CANTON_W * 0.2);
      expect(r.specks, "white stars in the canton").toBeGreaterThanOrEqual(9);
      expect(r.stripes[0]).toBe("r");
      expect(r.stripes[r.stripes.length - 1]).toBe("r");
      expect(r.stripes.length, `stripes (${r.stripes})`).toBe(13);
    }
    expect(found, "the lancework flag burns in the finale").toBe(true);
  });
});
