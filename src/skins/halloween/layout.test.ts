import { describe, expect, it } from "vitest";
import { TOWER_DEPTH } from "../../base/world";
import type { Scene } from "../skin";
import { balloons } from "./balloon";
import { flyers } from "./flyers";
import { bandTop, front, frontProps } from "./front";
import { churchyard } from "./graveyard";
import { kids } from "./kids";
import { mansion } from "./mansion";
import { shops } from "./shops";
import { stars, swirls } from "./sky";
import { CENTERPIECE, centerpiece } from "./square";
import { column, mask, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import { toneOf } from "./tone";

// The owner's layout rules for the square and the street, on two phones and a tablet (and the
// zoomed-out view): no prop is cut off by the screen's edges or by the foreground band, none
// cuts into another (the giant jack-o'-lantern's bed and the kids beside it, the kids and the
// skeleton parts coming up out of the graves), and nothing in the side lanes reaches into the
// tower's column above its floor line. The giant jack-o'-lantern stands behind the tower.

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;

/** The props drawn alone, each a group that must stay whole on screen. */
const PROPS: [string, Draw][] = [
  ["the shops", (ctx, s) => shops(ctx, s)],
  ["the jack-o'-lantern's bed", (ctx, s) => centerpiece(ctx, s)],
  ["the kids", (ctx, s) => kids(ctx, s)],
  ["the churchyard", (ctx, s) => churchyard(ctx, s)],
  ["the mansion", (ctx, s) => mansion(ctx, s, "#000000", false)],
  ["the hay bales and lanterns", (ctx, s) => frontProps(ctx, s)],
  ["the crows and bats", (ctx, s) => flyers(ctx, s, toneOf(s))],
];
/** Those standing in (or flying over) the side lanes, which keep out of the tower's column above its floor. */
const LANE: [string, Draw][] = [
  ...PROPS.filter(([name]) => !["the churchyard", "the hay bales and lanterns"].includes(name)),
  ["the swirls and stars", (ctx, s) => {
    swirls(ctx, s, toneOf(s), "#000000");
    stars(ctx, s, toneOf(s));
  }],
  ["the balloon", (ctx, s) => balloons(ctx, s)],
];
const VIEWS = [...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const];
/** Moments of the opening (the kids hopping, the parts coming up out of the graves). */
const MOMENTS = [0.4, 1.7, 3.1, 4.6, 6.2, 7.9, 9.3];
/** Alpha above which a pixel is solid paint (not a soft shadow or a pool of light). */
const SOLID = 120;

function count(m: Uint8Array, test: (x: number, y: number) => boolean, w: number): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) if (m[i] && test(i % w, Math.floor(i / w))) n++;
  return n;
}

describe.each(VIEWS)("halloween layout, %ix%i at zoom %s", (W, H, z) => {
  const at = (lvl: number, t: number) => sceneAt(W, H, lvl, t, z);

  it("no prop is cut off by the screen's edges", () => {
    for (const t of MOMENTS) {
      const s = at(0, t);
      const w = Math.round(s.cssW);
      const h = Math.round(s.cssH);
      for (const [name, draw] of PROPS) {
        const m = mask(s.cssW, s.cssH, (ctx) => draw(ctx, s));
        expect(count(m, () => true, w), `${name} drawn`).toBeGreaterThan(100);
        expect(count(m, (x, y) => x === 0 || y === 0 || x === w - 1 || y === h - 1, w), `t=${t}: ${name} on the screen's edge`).toBe(0);
      }
    }
  });

  it("nothing in the side lanes reaches into the tower's column above its floor", () => {
    // The start, the climb past the shops, the balloon's stretch, the loop's mist and witching hour.
    for (const lvl of [0, 12, 30, 48, 130, 170, 200]) {
      for (const t of [1.7, 6.2]) {
        const s = at(lvl, t);
        const w = Math.round(s.cssW);
        const col = column(s);
        for (const [name, draw] of LANE) {
          const m = mask(s.cssW, s.cssH, (ctx) => draw(ctx, s));
          const inside = count(m, (x, y) => x >= col.x0 && x <= col.x1 && y < col.floor, w);
          expect(inside, `level ${lvl}, t=${t}: ${name} in the tower's column`).toBe(0);
        }
      }
    }
  });

  it("the foreground band cuts off nothing behind it in the start view", () => {
    // (Climbing, the churchyard's nearest rows sink a little faster than the band and slip behind
    // it: they leave the view by parallax. The start view holds until the tower is a dozen high.)
    for (const lvl of [0, 4, 8, 12]) {
      for (const t of MOMENTS) {
        const s = at(lvl, t);
        if (bandTop(s) === null || s.rise > 0) continue;
        const band = mask(s.cssW, s.cssH, (ctx) => front(ctx, s));
        const behind = mask(s.cssW, s.cssH, (ctx) => {
          churchyard(ctx, s);
          kids(ctx, s);
          centerpiece(ctx, s);
        });
        let both = 0;
        for (let i = 0; i < band.length; i++) both += band[i]! & behind[i]!;
        expect(both, `level ${lvl}, t=${t}: the band over the churchyard or the square`).toBe(0);
      }
    }
  });

  it("no prop cuts into another: the jack-o'-lantern's bed and the kids, the kids and the graves", () => {
    for (let t = 0; t < 12; t += 0.25) {
      const s = at(0, t);
      // Solid paint only: the light pooled round the bed and the kids' soft shadows are only light on the ground.
      const bed = mask(s.cssW, s.cssH, (ctx) => centerpiece(ctx, s), SOLID);
      const people = mask(s.cssW, s.cssH, (ctx) => kids(ctx, s), SOLID);
      const graves = mask(s.cssW, s.cssH, (ctx) => churchyard(ctx, s), SOLID);
      let a = 0;
      let b = 0;
      for (let i = 0; i < bed.length; i++) {
        a += bed[i]! & people[i]!;
        b += people[i]! & graves[i]!;
      }
      expect(a, `t=${t.toFixed(2)}: the kids over the jack-o'-lantern's bed`).toBe(0);
      expect(b, `t=${t.toFixed(2)}: the kids and the churchyard`).toBe(0);
    }
  });
});

describe("halloween's giant jack-o'-lantern", () => {
  it("is giant: on its pile it stands well above the trick-or-treater beside it", () => {
    for (const [W, H] of SCREENS) {
      const s = sceneAt(W, H, 0, 2);
      const w = Math.round(s.cssW);
      const tall = (m: Uint8Array) => {
        let top = Infinity;
        let bottom = -Infinity;
        for (let i = 0; i < m.length; i++) {
          if (!m[i] || i % w < w / 2) continue;
          const y = Math.floor(i / w);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
        return bottom - top;
      };
      const jack = tall(mask(s.cssW, s.cssH, (ctx) => centerpiece(ctx, s), SOLID));
      const kid = tall(mask(s.cssW, s.cssH, (ctx) => kids(ctx, s), SOLID));
      expect(kid, `${W}x${H}: the kid on the right drawn`).toBeGreaterThan(20);
      expect(jack / kid, `${W}x${H}: the pile and its jack-o'-lantern against the kid`).toBeGreaterThan(1.2);
    }
  });

  it("stands behind the tower, beside its column", () => {
    expect(CENTERPIECE.z).toBeGreaterThan(TOWER_DEPTH);
    for (const [W, H] of SCREENS) {
      const s = sceneAt(W, H, 0, 2);
      const col = column(s);
      const w = Math.round(s.cssW);
      const m = mask(s.cssW, s.cssH, (ctx) => centerpiece(ctx, s));
      expect(count(m, (x) => x >= col.x0 && x <= col.x1, w), `${W}x${H}: in the column`).toBe(0);
      expect(count(m, () => true, w), `${W}x${H}: drawn`).toBeGreaterThan(500);
    }
  });
});
