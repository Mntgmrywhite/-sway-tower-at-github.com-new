import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { shops } from "./boulevard";
import { couple } from "./couple";
import { drawDrifter, eachVisible } from "./drift";
import { floorTop, latticeTower, wheel } from "./far";
import { floatingIn } from "./cupid";
import { cherubColumn, cherubShow, plazaProps, pool, roseBeds } from "./garden";
import { moon, sun } from "./sky";
import { mask, SIZES, zoomedScene } from "./test-scene";
import { level, LOOP, LOOP_START, toneOf } from "./tone";
import { waterway } from "./water";

// The zoomed-out view (render.ts: the frame camera.ts lays out for a virtual screen up to 1/0.6
// the phone's size at the same u, drawn shrunk): Valentine's must hold up there too. The whole
// virtual screen is painted at every height (loop.test.ts), the lanes keep clear of its sides
// (drift.test.ts), and here: nothing on the land, the plaza or in the sky is cut off by its
// sides, at the start (with the cherub's whole story, his balloon floating in included) and all
// the way up through a turn of the loop. (The far city's rows run off the sides on purpose, and
// the cloud floor spans the screen.)

const ZOOMS = [0.6, 0.8] as const;
const LEVELS = [0, 6, 14, 22, 30, 50, 80, LOOP_START, LOOP_START + 30, LOOP_START + LOOP - 10] as const;
/** Masks at half size. */
const K = 0.5;

describe("valentine's zoomed out", () => {
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: nothing is cut off by the virtual screen's sides", (W0, H0, z) => {
    for (const lvl of LEVELS) {
      for (const t of [0, 3.45, 21.5]) {
        const s: Scene = zoomedScene(W0, H0, z, lvl, t);
        const tone = toneOf(s);
        const w = Math.round(s.cssW * K);
        const draws: [string, (ctx: CanvasRenderingContext2D) => void][] = [
          ["sun", (ctx) => sun(ctx, s, tone, floorTop(s, level(s)))],
          ["moon", (ctx) => moon(ctx, s, tone)],
          ["lattice tower", (ctx) => latticeTower(ctx, s, tone)],
          ["wheel", (ctx) => wheel(ctx, s, tone)],
          ["boulevard", (ctx) => shops(ctx, s, tone)],
          ["couple", (ctx) => couple(ctx, s, tone)],
          ["waterway", (ctx) => waterway(ctx, s, tone)],
          ["pool", (ctx) => pool(ctx, s)],
          ["column", (ctx) => cherubColumn(ctx, s)],
          ["cherub", (ctx) => cherubShow(ctx, s)],
          ["rose beds", (ctx) => roseBeds(ctx, s)],
          ["gifts", (ctx) => plazaProps(ctx, s)],
        ];
        eachVisible(s, (d) => {
          const copy = { ...d };
          draws.push([`${d.kind} at ${Math.round(d.at)}`, (ctx) => drawDrifter(ctx, s, tone, copy)]);
        });
        for (const [what, draw] of draws) {
          const m = mask(s.cssW, s.cssH, draw, K);
          let sides = 0;
          for (let i = 0; i < m.length; i++) {
            if (!m[i]) continue;
            const x = i % w;
            // (A fresh balloon floats in to the cherub from off the left side: that is its way in.
            // Only then: the pop's flash and petals and the tumbling arrow keep in from it.)
            if ((x === 0 && !(what === "cherub" && floatingIn(t))) || x === w - 1) sides++;
          }
          expect(sides, `level ${lvl}, t=${t}: ${what} on a side`).toBe(0);
        }
      }
    }
  }, 120_000);
});
