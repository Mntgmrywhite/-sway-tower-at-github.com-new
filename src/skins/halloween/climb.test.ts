import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import type { Scene } from "../skin";
import { bridgeAt, crestTrees, hillOnly, hollow, riderAt, riderBox } from "./hollow";
import { horseman } from "./horseman";
import { mansion, mansionAt } from "./mansion";
import { street } from "./street";
import { breathe, context, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import { HOLLOW_FADE, LOOP_PERIOD, LOOP_START, MIST_GATHER, toneOf } from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The climb holds together at every height, on every screen and zoomed out: the far land moves as
// one piece and never shows an edge or a gap (the Horseman's hill runs down into the creek, never
// ends in a cut; the covered bridge stays where his road comes down to it; nothing of Main Street
// is left once the mist has swallowed it, so no bare floor shows between the hollow and the mist),
// the Horseman never rides on in the empty sky once his hill has faded, and the crooked mansion
// stands out of the mist sea all the way up.

const VIEWS = SCREENS.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const));
/** Up the first pass, through the hollow's fading, and two turns of the loop. */
const CLIMB = Array.from({ length: Math.ceil((LOOP_START + 2 * LOOP_PERIOD) / 4) + 1 }, (_, i) => i * 4);

/** Canvases kept per size and slot and cleared for reuse (a zoomed-out tablet's are big). */
const CANVASES = new Map<string, CanvasRenderingContext2D>();
function canvas(W: number, H: number, slot: number): CanvasRenderingContext2D {
  const key = `${Math.round(W)}x${Math.round(H)}:${slot}`;
  let ctx = CANVASES.get(key);
  if (!ctx) {
    ctx = context(W, H);
    CANVASES.set(key, ctx);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, Math.round(W), Math.round(H));
  return ctx;
}

/** A box of the screen, in whole pixels, clipped to it. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
function box(s: Scene, x0: number, y0: number, x1: number, y1: number): Box {
  const x = Math.max(0, Math.floor(x0));
  const y = Math.max(0, Math.floor(y0));
  return { x, y, w: Math.max(1, Math.min(Math.round(s.cssW), Math.ceil(x1)) - x), h: Math.max(1, Math.min(Math.round(s.cssH), Math.ceil(y1)) - y) };
}

/** A drawing's pixels (RGBA) inside box `b` of the screen, drawn on a reused canvas in `slot`. */
function pixels(s: Scene, b: Box, slot: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const ctx = canvas(s.cssW, s.cssH, slot);
  draw(ctx);
  return ctx.getImageData(b.x, b.y, b.w, b.h).data;
}

/** Which pixels of box `b` a drawing covers (alpha above `min`). */
function mask(s: Scene, b: Box, draw: (ctx: CanvasRenderingContext2D) => void, min = 40): Uint8Array {
  const data = pixels(s, b, 0, draw);
  const out = new Uint8Array(b.w * b.h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > min ? 1 : 0;
  return out;
}

describe.each(VIEWS)("halloween climb, %ix%i at zoom %s", (W, H, z) => {
  it("the Horseman's hill runs down into the creek past the bridge's portal, never ending in a cut edge", async () => {
    let checked = 0;
    for (let lvl = 0; lvl < HOLLOW_FADE[1]; lvl += 3) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      const s = sceneAt(W, H, lvl, 3, z);
      const b = bridgeAt(s);
      if (!b) continue;
      // Its right-hand edge, row by row, from the road at the portal down to the bottom of the hill.
      const area = box(s, 0, b.road + 2, b.portal + s.u * 0.4, s.cssH);
      const m = mask(s, area, (ctx) => hillOnly(ctx, s), 128);
      let run = 0;
      let longest = 0;
      let last = NaN;
      for (let y = 0; y < area.h; y++) {
        let edge = -1;
        for (let x = area.w - 1; x >= 0; x--) {
          if (m[y * area.w + x]) {
            edge = x;
            break;
          }
        }
        if (edge < 0) break;
        run = edge === last ? run + 1 : 0;
        longest = Math.max(longest, run);
        last = edge;
        checked++;
      }
      expect(longest, `level ${lvl}: rows of a sheer edge`).toBeLessThan(s.u * 0.03);
    }
    expect(checked, "the hill's flank is checked").toBeGreaterThan(200);
  });

  it("the covered bridge stays where the Horseman's road comes down to it", () => {
    for (let lvl = 0; lvl < HOLLOW_FADE[1]; lvl += 1) {
      const s = sceneAt(W, H, lvl, 3, z);
      const b = bridgeAt(s);
      if (!b) continue;
      expect(Math.abs(b.deck - b.road), `level ${lvl}: the deck off the road's end`).toBeLessThan(2);
    }
  });

  it("the Horseman never rides on without his hill: he fades with it", async () => {
    let seen = 0;
    for (let lvl = HOLLOW_FADE[0] - 4; lvl <= HOLLOW_FADE[1] + 2; lvl += 2) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      for (const t of [1.5, 2.5, 3.5, 10.5, 11.2]) {
        const s = sceneAt(W, H, lvl, t, z);
        const r = { ...riderAt(s) };
        const fade = toneOf(s).hollow;
        // Around him (riderBox is null once he has faded away: then around where he would be).
        const near = riderBox(s) ?? { x0: r.x - r.size * 3, x1: r.x + r.size * 3, y0: r.y - r.size * 5, y1: r.y + r.size };
        const area = box(s, near.x0 - 2, near.y0 - 2, near.x1 + 2, near.y1 + 2);
        // Where he is (drawn at full strength), off his hill; and how opaque he is drawn at his own
        // opacity (riderAt's: his ride's fade in and out of the mist, times the hollow's).
        const draw = (ctx: CanvasRenderingContext2D, vis: number) => horseman(ctx, r.x, r.y, r.size, s.t, r.tilt, vis, r.dir, r.charge);
        const him = mask(s, area, (ctx) => draw(ctx, 1), 200);
        // (The hill's trees, swaying, may stand behind him too: they fade with the hill.)
        const hill = mask(s, area, (ctx) => {
          hillOnly(ctx, s);
          crestTrees(ctx, s);
        }, 8);
        const ref = pixels(s, area, 1, (ctx) => draw(ctx, r.vis));
        const data = pixels(s, area, 2, (ctx) => hollow(ctx, s, toneOf(s)));
        let most = 0;
        let limit = 0;
        for (let i = 0; i < him.length; i++) {
          if (!him[i] || hill[i]) continue;
          most = Math.max(most, data[i * 4 + 3]!);
          limit = Math.max(limit, ref[i * 4 + 3]!);
        }
        if (most > 0) seen++;
        expect(most, `level ${lvl}, t ${t}: his opacity with the hollow faded to ${fade.toFixed(2)}`).toBeLessThanOrEqual(limit + 4);
      }
    }
    expect(seen, "he rides while the hollow fades").toBeGreaterThan(5);
  });

  it("nothing of Main Street is left once the mist has gathered over it", async () => {
    for (let lvl = MIST_GATHER[1]; lvl < LOOP_START + LOOP_PERIOD; lvl += 5) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      const s = sceneAt(W, H, lvl, 3, z);
      const m = mask(s, box(s, 0, 0, s.cssW, s.cssH), (ctx) => street(ctx, s, toneOf(s)), 0);
      expect(m.reduce((a, b) => a + b, 0), `level ${lvl}: the street drawn`).toBe(0);
    }
  });

  it("the crooked mansion stands out of the mist at every height: never hidden", async () => {
    const kit = kitFor(halloween);
    for (const lvl of CLIMB) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      const s: Scene = sceneAt(W, H, lvl, 2.7, z);
      const at = { ...mansionAt(s) };
      const area = box(s, at.x0 - 4, at.topY - 4, at.x1 + 4, at.y + s.u * 0.02);
      // The mansion alone (no ridge), and the whole scene: how much of it shows as itself.
      const tone = toneOf(s);
      const a = pixels(s, area, 1, (ctx) => mansion(ctx, s, tone.hill, false, tone.hollow, tone.swarm));
      const b = pixels(s, area, 2, (ctx) => {
        kit.world(ctx, s);
        kit.front(ctx, s);
      });
      let body = 0;
      let shows = 0;
      for (let i = 0; i < area.w * area.h; i++) {
        if (a[i * 4 + 3]! < 255) continue;
        body++;
        const d = Math.abs(a[i * 4]! - b[i * 4]!) + Math.abs(a[i * 4 + 1]! - b[i * 4 + 1]!) + Math.abs(a[i * 4 + 2]! - b[i * 4 + 2]!);
        if (d < 24) shows++;
      }
      expect(body, `level ${lvl}: the mansion drawn`).toBeGreaterThan(500);
      // (In the loop's mist its banks of fog drift past in front of it, covering up to about half.)
      expect(shows / body, `level ${lvl}: share of the mansion that shows (its crag at ${at.y.toFixed(0)})`).toBeGreaterThan(0.35);
    }
  }, 120_000);
});
