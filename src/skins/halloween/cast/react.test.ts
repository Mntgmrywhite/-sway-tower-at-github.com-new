import { describe, expect, it } from "vitest";
import { kids } from "../kids";
import { sceneAt } from "../test-scene";
import { bonebirdAt } from "./bonebird";
import { blackCat, catAt } from "./cat";
import { ghost, graveGhostAt } from "./ghosts";
import { maskOf } from "./probe";
import { rat, ratAt } from "./rat";
import { raven, ravenAt } from "./raven";
import { spider, spiderAt } from "./spider";

// When a new floor lands on the tower, the creatures nearby react for a moment (the guide): the
// cat arches its back, the raven hops and flaps, the spider zips up its thread, the rat freezes,
// the ghost squashes in surprise, the bone bird flutters, the kids glance up at the tower. Then
// they go back to what they were doing: a second and a half later it is as if nothing landed.

const NONE = Infinity;

/** Moments (seconds) when the performer is out, for anchor 0. */
function out(test: (t: number) => boolean, from: number, to: number): number[] {
  const list: number[] = [];
  for (let t = from; t < to; t += 0.13) if (test(t)) list.push(t);
  return list;
}

const differs = (a: Uint8Array, b: Uint8Array) => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
};

describe("halloween cast reactions to a landing", () => {
  const cases: [string, (t: number) => boolean, (t: number, land: number) => unknown, number, (ctx: CanvasRenderingContext2D, t: number, land: number) => void][] = [
    ["the cat arches its back", (t) => catAt(t, 0, NONE).vis > 0.5, (t, l) => ({ ...catAt(t, 0, l) }), 0.2, (ctx, t, l) => blackCat(ctx, 300, 300, 120, -1, { ...catAt(t, 0, l) }, 0, 0, 3)],
    ["the raven hops and flaps", (t) => ravenAt(t, 0, NONE).vis > 0.99 && !ravenAt(t, 0, NONE).flying, (t, l) => ({ ...ravenAt(t, 0, l) }), 0.2, (ctx, t, l) => raven(ctx, 300, 300, 120, -1, { ...ravenAt(t, 0, l) }, 3)],
    ["the spider zips up its thread", (t) => spiderAt(t, 0, NONE).drop > 0.3, (t, l) => ({ ...spiderAt(t, 0, l) }), 0.2, (ctx, t, l) => spider(ctx, 300, 50, 400, 40, { ...spiderAt(t, 0, l) }, 2)],
    ["the rat freezes", (t) => ratAt(t, 0, NONE).vis > 0.5, (t, l) => ({ ...ratAt(t, 0, l) }), 0.2, (ctx, t, l) => rat(ctx, 300, 300, 120, 1, { ...ratAt(t, 0, l) }, 3)],
    ["the ghost squashes", (t) => graveGhostAt(t, 0, NONE).rise > 0.5, (t, l) => ({ ...graveGhostAt(t, 0, l) }), 0.1, (ctx, t, l) => {
      const p = graveGhostAt(t, 0, l);
      ghost(ctx, 300, 400, 200, 1, p.rise, p.bob, p.wave, p.squash, p.vis, 3);
    }],
    ["the bone bird flutters up", (t) => !bonebirdAt(t, 0, NONE).flying, (t, l) => ({ ...bonebirdAt(t, 0, l) }), 0.2, () => {}],
  ];

  it.each(cases)("%s, then carries on as before", (_name, isOut, pose, land, draw) => {
    const moments = out(isOut, 0, 120);
    expect(moments.length, "moments it is out").toBeGreaterThan(5);
    let changed = 0;
    for (const t of moments) {
      if (JSON.stringify(pose(t, land)) !== JSON.stringify(pose(t, NONE))) changed++;
      // A second and a half on, the landing is forgotten.
      expect(JSON.stringify(pose(t, 1.6)), `t=${t.toFixed(2)}: still reacting 1.6 s after`).toBe(JSON.stringify(pose(t, NONE)));
    }
    expect(changed / moments.length, "share of moments it reacts").toBeGreaterThan(0.9);
    // And it shows: the drawing changes.
    const t = moments[Math.floor(moments.length / 2)]!;
    const a = maskOf((ctx) => draw(ctx, t, land), 0, 0, 600, 600);
    const b = maskOf((ctx) => draw(ctx, t, NONE), 0, 0, 600, 600);
    if (_name !== "the bone bird flutters up") expect(differs(a, b), "pixels changed").toBeGreaterThan(20);
  });

  it("the kids glance up at the tower (less when motion is reduced)", () => {
    const W = 390;
    const H = 844;
    const at = (land: number, still = false) => {
      const s = { ...sceneAt(W, H, 0, 4.3), sinceLand: land, still };
      return maskOf((ctx) => kids(ctx, s), 0, 300, 390, 340);
    };
    const calm = at(NONE);
    const glance = differs(at(0.2), calm);
    expect(glance, "pixels changed by the glance").toBeGreaterThan(30);
    expect(differs(at(0.2, true), calm), "with reduced motion").toBeLessThan(glance);
    expect(differs(at(1.6), calm), "a second and a half on").toBe(0);
  });
});
