import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import { farBalloons, groves, lowClouds, river, seaTop, village, windmill } from "./far";
import { front } from "./front";
import { islandBody, islandTree, islet, kite, waterfall } from "./island";
import { context, mask, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";
import { roundTime, tractor, tractorAt, TRACTORS, TURN_TIME } from "./tractors";

// Red and green tractors plod over the fields far below (the owner: "red and green tractors
// going across the fields"). Through a whole round of each, on a tall and a short phone, every
// tractor keeps to its own strip of field: none enters the tower's column, touches a screen
// edge, reaches the cloud bank, or touches another tractor or anything else in the start view
// (the kite and its string, the island and its waterfall, its tree, the islet, the groves, the
// low clouds, the village, the windmill, the balloons, the river). Their red and green read on
// the fields, they are moving from the first moment, and they go opposite ways.

/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
const PROPS: [string, Draw][] = [
  ["kite", kite],
  ["island", islandBody],
  ["waterfall", waterfall],
  ["tree", islandTree],
  ["islet", islet],
  ["groves", (ctx, s) => groves(ctx, s, toneOf(s))],
  ["low clouds", (ctx, s) => lowClouds(ctx, s, toneOf(s))],
  ["village", (ctx, s) => village(ctx, s, toneOf(s))],
  ["windmill", (ctx, s) => windmill(ctx, s, toneOf(s))],
  ["far balloons", (ctx, s) => farBalloons(ctx, s, toneOf(s))],
  ["balloon", (ctx, s) => drifters(ctx, s, toneOf(s))],
  ["river", (ctx, s) => river(ctx, s, toneOf(s), s.horizonY + s.u * 0.034, Math.min(s.cssH + 1, seaTop(s, level(s)) + s.u * 0.06))],
];

/** The longest round of any tractor, sampled finely enough to catch every turn. */
const ROUND = Math.max(...TRACTORS.map(roundTime));
const SAMPLES = Array.from({ length: Math.ceil(ROUND / 0.3) + 1 }, (_, i) => i * 0.3);

describe("classic tractors", () => {
  it.each(SIZES)(
    "%ix%i: through a whole round, each keeps to its strip of field",
    (W, H) => {
      const s0 = startScene(W, H, 0);
      const at = (t: number): Scene => ({ ...s0, t });
      const w = Math.round(W * K);
      const h = Math.round(H * K);
      // Where each prop goes over the round (it bobs, drifts and turns a little), as one mask.
      const swept = PROPS.map(([name, draw]) => {
        const m = new Uint8Array(w * h);
        for (let t = 0; t <= ROUND; t += 0.9) {
          const n = mask(W, H, (ctx) => draw(ctx, at(t)), K);
          for (let i = 0; i < m.length; i++) m[i]! |= n[i]!;
        }
        return [name, m] as const;
      });
      // The tower's column above the floor, the HUD, and the cloud bank's top in each column.
      const x0 = (s0.baseX - s0.u * 0.05) * K;
      const x1 = (s0.baseX + s0.baseW + s0.u * 0.05) * K;
      const floor = s0.groundY * K;
      const hud = (H * 0.14 + s0.u * 0.13) * K;
      const bank = mask(W, H, (ctx) => front(ctx, s0), K);
      const lip = Array.from({ length: w }, (_, x) => {
        let y = 0;
        while (y < h && !bank[y * w + x]) y++;
        return y - 1;
      });
      for (const t of SAMPLES) {
        const s = at(t);
        const masks = TRACTORS.map((_, i) => mask(W, H, (ctx) => tractor(ctx, s, toneOf(s), i), K));
        masks.forEach((m, i) => {
          const what = `t=${t.toFixed(1)}: tractor ${i} (${TRACTORS[i]!.color})`;
          let drawn = 0;
          let column = 0;
          let edge = 0;
          let top = 0;
          let low = 0;
          for (let k = 0; k < m.length; k++) {
            if (!m[k]) continue;
            drawn++;
            const x = k % w;
            const y = Math.floor(k / w);
            if (y < floor && x >= x0 && x <= x1) column++;
            if (x === 0 || x === w - 1 || y === 0 || y === h - 1) edge++;
            if (y < hud) top++;
            if (y >= lip[x]!) low++;
          }
          // (Mid-turn it narrows to a sliver.)
          if (Math.abs(tractorAt(i, t).facing) > 0.3) expect(drawn, `${what} is drawn`).toBeGreaterThan(8);
          expect(column, `${what}: pixels in the tower's column`).toBe(0);
          expect(edge, `${what}: pixels on a screen edge`).toBe(0);
          expect(top, `${what}: pixels in the HUD`).toBe(0);
          expect(low, `${what}: pixels reaching the cloud bank`).toBe(0);
          for (const [name, p] of swept) {
            let both = 0;
            for (let k = 0; k < m.length; k++) both += m[k]! & p[k]!;
            expect(both, `${what} touches the ${name}`).toBe(0);
          }
          for (let j = i + 1; j < masks.length; j++) {
            let both = 0;
            for (let k = 0; k < m.length; k++) both += m[k]! & masks[j]![k]!;
            expect(both, `${what} touches tractor ${j}`).toBe(0);
          }
        });
      }
    },
    120_000,
  );

  it("there are red ones and green ones, and their colors read on the fields", () => {
    const [W, H] = SIZES[0];
    const s = { ...startScene(W, H, 0), t: 0 };
    const tone = toneOf(s);
    const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
    // The darkest field in the patchwork.
    const fields = Math.min(...tone.fields.map((c) => lum(...rgb(c))));
    expect(new Set(TRACTORS.map((t) => t.color))).toEqual(new Set(["red", "green"]));
    TRACTORS.forEach((tr, i) => {
      const k = 3;
      const ctx = context(W, H, k);
      tractor(ctx, s, tone, i);
      const data = ctx.getImageData(0, 0, Math.round(W * k), Math.round(H * k)).data;
      let solid = 0;
      let colored = 0;
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3]! < 230) continue;
        solid++;
        const [r, g, b] = [data[p]!, data[p + 1]!, data[p + 2]!];
        if (tr.color === "red" ? r - Math.max(g, b) > 80 : g - Math.max(r, b) > 40 && lum(r, g, b) < fields - 40) colored++;
      }
      expect(solid, `tractor ${i} is drawn`).toBeGreaterThan(200);
      // Its coat is a good part of the rig (tyres, cab glass, roof and the tow take the rest).
      expect(colored / solid, `tractor ${i}: share of it that reads ${tr.color}`).toBeGreaterThan(0.2);
      expect(colored / (k * k), `tractor ${i}: pixels that read ${tr.color} on a phone`).toBeGreaterThan(20);
    });
  });

  it("they are working from the first moment, going opposite ways, and each turns at an end of its strip by 10 s", () => {
    const facing = TRACTORS.map((_, i) => tractorAt(i, 0).facing);
    expect(facing.some((f) => f > 0.99) && facing.some((f) => f < -0.99), "some head left and some right").toBe(true);
    TRACTORS.forEach((tr, i) => {
      const a = tractorAt(i, 0);
      expect(a.turn, `tractor ${i} is driving at the start`).toBe(-1);
      expect(Math.abs(tractorAt(i, 1).x - a.x), `tractor ${i} moves in the first second`).toBeGreaterThan(tr.speed * 0.99);
      // Out along its strip and turning: it covers a good stretch of field in the opening.
      let lo = a.x;
      let hi = a.x;
      let turned = false;
      for (let t = 0; t <= 10; t += 0.05) {
        const p = tractorAt(i, t);
        lo = Math.min(lo, p.x);
        hi = Math.max(hi, p.x);
        if (p.turn >= 0.5) turned = true;
      }
      expect(turned, `tractor ${i} turns by 10 s`).toBe(true);
      expect(hi - lo, `tractor ${i}: field covered in 10 s (u)`).toBeGreaterThan(0.045);
    });
  });

  it("they plod: slow and steady, no jumps", () => {
    TRACTORS.forEach((tr, i) => {
      expect(tr.speed, `tractor ${i}: speed (u/s)`).toBeLessThan(0.015);
      const round = roundTime(tr);
      let prev = tractorAt(i, 0);
      for (let t = 0.02; t <= round + 1; t += 0.02) {
        const p = tractorAt(i, t);
        expect(Math.abs(p.x - prev.x), `tractor ${i} at ${t.toFixed(2)}: step`).toBeLessThan(tr.speed * 0.02 + 1e-9);
        // Turning, it swings round smoothly (no flip from one way to the other in a frame).
        expect(Math.abs(p.facing - prev.facing), `tractor ${i} at ${t.toFixed(2)}: turn step`).toBeLessThan((Math.PI * 1.5 * 0.02) / TURN_TIME + 1e-9);
        prev = p;
      }
    });
  });
});
