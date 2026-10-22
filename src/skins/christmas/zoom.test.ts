import { describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { christmas } from "../christmas";
import { far, laneTop } from "./far";
import { CART_LAP, carriageBackProgress, carriageProgress, ground, props, streetTop } from "./ground";
import { hills } from "./hills";
import { bodies, ornaments, skyFill } from "./sky";
import { context, mask, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";
import { level, LOOP_PERIOD, LOOP_START, moonUp, sunUp, toneOf } from "./tone";

// Hard mode's camera zooms out (down to MIN_ZOOM) when a leaning tower's top would leave the
// screen: the scene is built for a virtual screen 1/z wider and taller at the same u, then drawn
// scaled by z. The skin must fill all of it, from the start to any height, and keep the street's
// props whole at its edges.

const ZOOMS = [1, 0.8, MIN_ZOOM] as const;
const LEVELS = [0, 4, 10, 18, 30, 50, 75, LOOP_START - 1, LOOP_START + 20, LOOP_START + 50, LOOP_START + 95, 260, 600, 2000];

describe("christmas zoomed out", () => {
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))("%ix%i at zoom %s: every pixel is covered", (W, H, z) => {
    const kit = kitFor(christmas);
    for (const lvl of LEVELS) {
      const s = sceneAt(W, H, lvl, lvl * 0.29, z);
      // Drawn as the renderer does: the virtual screen scaled down by z onto the phone's.
      const ctx = context(W, H);
      ctx.scale(z, z);
      kit.world(ctx, s);
      kit.front(ctx, s);
      const data = ctx.getImageData(0, 0, W, H).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}: uncovered pixels`).toBe(0);
    }
  });

  // (Unzoomed, only the gas lamps' soft glow reaches past a phone's side edges, by design.)
  it.each(SIZES.flatMap(([W, H]) => ZOOMS.filter((z) => z < 1).map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: at the start no street prop is cut off by a screen edge",
    (W, H, z) => {
      // Moments the carriage is round a corner, out of view (it drives in and out at the sides).
      const away = [5.1, 11.9, 5.1 + CART_LAP, 11.9 + 2 * CART_LAP];
      for (const t of away) {
        expect(carriageProgress(t) < 0 && carriageBackProgress(t) < 0, `t=${t}: the carriage is out of view`).toBe(true);
        const s = sceneAt(W, H, 0, t, z);
        const w = Math.round(s.cssW);
        const h = Math.round(s.cssH);
        const m = mask(s.cssW, s.cssH, (ctx) => props(ctx, s));
        let edge = 0;
        let seen = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!m[y * w + x]) continue;
            seen++;
            if (x === 0 || x === w - 1 || y === 0 || y === h - 1) edge++;
          }
        }
        expect(seen, "the street is drawn").toBeGreaterThan(1000);
        expect(edge, `t=${t}: prop pixels on the screen's edge`).toBe(0);
      }
    },
  );

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the sky's bands alone cover the whole screen at every hour",
    (W, H, z) => {
      // (The skin paints its own backdrop: nothing of the base's world is under it.)
      for (let lvl = 0; lvl < LOOP_START + 2 * LOOP_PERIOD; lvl += 7) {
        const s = sceneAt(W, H, lvl, 1, z);
        const ctx = context(W, H);
        ctx.scale(z, z);
        skyFill(ctx, s, toneOf(s));
        const data = ctx.getImageData(0, 0, W, H).data;
        let gaps = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
        expect(gaps, `level ${lvl}: pixels the sky leaves uncovered`).toBe(0);
      }
    },
  );

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the land covers everything under the horizon, so no sky (and no setting sun or moon) shows below the skyline",
    (W, H, z) => {
      let seen = 0;
      for (let lvl = 0; lvl <= LOOP_START + LOOP_PERIOD; lvl += 2.5) {
        const s = sceneAt(W, H, lvl, lvl * 0.29, z);
        // Whole pixels only (a zoomed-out virtual screen is a fraction of a pixel over).
        const w = Math.floor(s.cssW);
        const h = Math.floor(s.cssH);
        // The row under the horizon's own (anti-aliased) row, down to the bottom of the screen.
        const top = Math.ceil(s.horizonY) + 1;
        if (top >= h) continue;
        seen++;
        const ctx = context(s.cssW, s.cssH);
        far(ctx, s);
        hills(ctx, s);
        ground(ctx, s);
        const data = ctx.getImageData(0, top, w, h - top).data;
        let gaps = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
        expect(gaps, `level ${lvl}: pixels under the horizon the land leaves open`).toBe(0);
      }
      expect(seen).toBeGreaterThan(20);
    },
  );

  it.each(SIZES.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: the ornamental flakes in the sky keep clear of the roofs, the smoke, the towers and the hills",
    (W, H, z) => {
      // They are printed on the sky: none may pass over anything standing in their lane, nor be cut off behind it.
      let seen = 0;
      for (let lvl = 0; lvl <= 50; lvl += 5) {
        for (const t of [0, 15, 31, 47, 62, 78, 94, 109]) {
          const s = sceneAt(W, H, lvl, t, z);
          const flakes = mask(s.cssW, s.cssH, (ctx) => ornaments(ctx, s, Math.min(laneTop(s), streetTop(s))), 8);
          const land = mask(s.cssW, s.cssH, (ctx) => {
            far(ctx, s);
            hills(ctx, s);
            ground(ctx, s);
          }, 8);
          let over = 0;
          for (let i = 0; i < flakes.length; i++) {
            if (!flakes[i]) continue;
            seen++;
            if (land[i]) over++;
          }
          expect(over, `level ${lvl}, t ${t}: flake pixels over the land`).toBe(0);
        }
      }
      expect(seen, "the flakes are drawn").toBeGreaterThan(500);
    },
  );

  it.each([...SIZES, [834, 1194] as const].flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: nothing of the land stands over the sun or the moon while it is up",
    (W, H, z) => {
      // The city's spires, the column's urn, the hills and their firs: only the scene's own sunrise
      // and sunset (and the moon's) may sink behind the land.
      let up = 0;
      for (let lvl = 0; lvl <= LOOP_START + LOOP_PERIOD; lvl += 1.5) {
        const s = sceneAt(W, H, lvl, lvl * 0.37, z);
        const L = level(s);
        const m = moonUp(L);
        const sun = sunUp(L);
        if ((m > 0 && m < 1) || (sun > 0 && sun < 1) || (m <= 0 && sun <= 0)) continue;
        up++;
        const sky = mask(s.cssW, s.cssH, (ctx) => bodies(ctx, s), 8);
        const land = mask(s.cssW, s.cssH, (ctx) => {
          far(ctx, s);
          hills(ctx, s);
          ground(ctx, s);
        }, 8);
        let over = 0;
        for (let i = 0; i < sky.length; i++) if (sky[i] && land[i]) over++;
        expect(over, `level ${lvl}: land pixels over the sun or the moon`).toBe(0);
      }
      expect(up).toBeGreaterThan(50);
    },
  );

  it("the loop's sky fills a zoomed-out screen at every hour", () => {
    const kit = kitFor(christmas);
    const [W, H] = SIZES[0];
    for (let lvl = LOOP_START; lvl < LOOP_START + LOOP_PERIOD; lvl += 6) {
      const s = sceneAt(W, H, lvl + 3 * LOOP_PERIOD, 1, MIN_ZOOM);
      const ctx = context(W, H);
      ctx.scale(MIN_ZOOM, MIN_ZOOM);
      kit.world(ctx, s);
      const data = ctx.getImageData(0, 0, W, H).data;
      let gaps = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) gaps++;
      expect(gaps, `level ${lvl}`).toBe(0);
    }
  });
});
