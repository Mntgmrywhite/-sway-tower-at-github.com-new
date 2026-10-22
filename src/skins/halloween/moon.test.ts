import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import type { Scene } from "../skin";
import { skyBack } from "./backdrop";
import { moonCrossers } from "./cast";
import { inkW } from "./common";
import { crowFlying } from "./crow";
import { crowPose } from "./flight";
import { hillOnly, riderAt } from "./hollow";
import { horseman } from "./horseman";
import { moonAt } from "./sky";
import { breathe, context, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import { LOOP_PERIOD, LOOP_START, toneOf } from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The owner's rule: nothing passes over the moon, at any height, size or zoom. The moon rises
// behind the Horseman's hill (the hill and the fence along his road cover its lower face, as a
// horizon would), and only these ever cross its face: the Headless Horseman galloping along that
// hill, the churchyard crow's two turns round it, and the cast's moon crossers (the ring of bats
// circling it, the rare great shadow crossing it: cast.ts moonCrossers). Checked on the whole
// frame (the backdrop and the foreground): every pixel of the moon's disc is as the sky and the
// moon alone paint it, except where the hill, the Horseman, the flying crow or a crosser is drawn.

const VIEWS = [...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const, [834, 1194, MIN_ZOOM] as const];
/** Over the climb and two turns of the loop. */
const LEVELS = Array.from({ length: Math.ceil((LOOP_START + 2 * LOOP_PERIOD) / 3) + 1 }, (_, i) => i * 3);

/** Pixels of the disc (inside its rim by a pixel and a half) changed by what is drawn after the moon, outside the allowed shapes. */
function overMoon(W: number, H: number, z: number, lvl: number, t: number): { changed: number; disc: number } {
  const s: Scene = sceneAt(W, H, lvl, t, z);
  const tone = toneOf(s);
  const m = { ...moonAt(s, tone) };
  const x0 = Math.floor(m.x - m.r) - 2;
  const y0 = Math.floor(m.y - m.r) - 2;
  const side = Math.ceil(m.r * 2) + 4;
  const crop = (draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray => {
    const ctx = context(side, side);
    ctx.translate(-x0, -y0);
    draw(ctx);
    return ctx.getImageData(0, 0, side, side).data;
  };
  const kit = kitFor(halloween);
  const all = crop((ctx) => {
    kit.world(ctx, s);
    kit.front(ctx, s);
  });
  // The sky as it is painted up to the moon (its stars, clouds and lightning's wash all behind it).
  const sky = crop((ctx) => skyBack(ctx, s, tone));
  const r = { ...riderAt(s) };
  const p = { ...crowPose(s) };
  const allowed = crop((ctx) => {
    hillOnly(ctx, s, tone);
    if (r.vis > 0.004) horseman(ctx, r.x, r.y, r.size, s.t, r.tilt, 1, r.dir, r.charge);
    if (!p.perched) crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, inkW(s, 3 / p.z));
    // The cast's moon crossers: the ring of bats round it, a great shadow crossing it now and then.
    moonCrossers(ctx, s);
  });
  let changed = 0;
  let disc = 0;
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      if (Math.hypot(x0 + px + 0.5 - m.x, y0 + py + 0.5 - m.y) > m.r - 1.5) continue;
      disc++;
      const i = (py * side + px) * 4;
      // Allowed within two pixels of the hill, the Horseman or the crow (their anti-aliased edges).
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) {
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const qx = px + dx;
          const qy = py + dy;
          if (qx >= 0 && qy >= 0 && qx < side && qy < side && allowed[(qy * side + qx) * 4 + 3]! > 8) near = true;
        }
      }
      if (near) continue;
      const d = Math.abs(all[i]! - sky[i]!) + Math.abs(all[i + 1]! - sky[i + 1]!) + Math.abs(all[i + 2]! - sky[i + 2]!);
      if (d > 6) changed++;
    }
  }
  return { changed, disc };
}

describe("halloween moon", () => {
  it.each(VIEWS)("%ix%i at zoom %s: nothing but the hill, the Horseman, the crow and the moon crossers ever crosses its disc", async (W, H, z) => {
    let checked = 0;
    for (const lvl of LEVELS) {
      // Let the pixel reads be freed now and then (see breathe).
      if (lvl % 15 === 0) await breathe();
      // A few moments at each height, the first ten seconds' among them (the Horseman and the crow on their turns).
      for (const t of [1.2, 3.4, 6.1, 9.9, 10.7, (lvl * 0.37) % 30]) {
        const { changed, disc } = overMoon(W, H, z, lvl, t);
        expect(changed, `level ${lvl}, t ${t.toFixed(2)}: pixels of the moon's disc covered`).toBe(0);
        checked += disc;
      }
    }
    expect(checked, "the moon's disc is checked").toBeGreaterThan(LEVELS.length * 1000);
  }, 120_000);
});
