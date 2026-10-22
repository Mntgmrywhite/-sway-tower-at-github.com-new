import { afterEach, describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { crowFlying } from "./crow";
import { CIRCLING, crowBox, crowPose, CYCLE, cycleTime, LAND, TAKE_OFF } from "./flight";
import { balloonBoxes } from "./balloon";
import { inkW } from "./common";
import { batSpot, BATS, crowSpot, CROWS } from "./flyers";
import { riderBox } from "./hollow";
import { kids } from "./kids";
import { shops } from "./shops";
import { breathe, column, mask, meets, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import { toneOf } from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The churchyard crow takes a turn round the moon every half minute and lands again. In its
// side lane: never in the tower's column above the floor line, never cut off by a screen edge,
// never over the Headless Horseman, the flock, the bats or the balloon, on both phones, a tablet
// and Hard mode's zoomed-out view; while the camera climbs it only ever leaves by the bottom, with
// the churchyard. It climbs on the tower's side of the trick-or-treaters and the sweet shop (the
// owner's beat): it only grazes them on its way up and down, and never circles or zigzags over them.

const ZOOMS = [1, 0.8, MIN_ZOOM] as const;
type Box = { x0: number; y0: number; x1: number; y1: number };

/** The flock crows and crossing bats on screen now, as boxes. */
function flyerBoxes(s: Scene): Box[] {
  const tone = toneOf(s);
  const out: Box[] = [];
  for (let i = 0; i < Math.ceil(tone.crows - 0.01) && i < CROWS.length; i++) {
    const c = crowSpot(s, i);
    out.push({ x0: c.x - c.s, x1: c.x + c.s, y0: c.y - c.s * 0.72, y1: c.y + c.s * 0.64 });
  }
  if (tone.bats > 0.01) {
    for (let i = 0; i < BATS.length; i++) {
      const b = batSpot(s, i);
      out.push({ x0: b.x - b.s, x1: b.x + b.s, y0: b.y - b.s * 0.46, y1: b.y + b.s * 0.46 });
    }
  }
  out.push(...balloonBoxes(s));
  return out;
}

function check(s: Scene, climbing: boolean): void {
  const box = crowBox(s);
  if (!box) return;
  const col = column(s);
  const at = `t=${s.t.toFixed(2)} rise=${s.rise.toFixed(0)} ${s.cssW.toFixed(0)}x${s.cssH.toFixed(0)}`;
  const inColumn = box.y0 < col.floor && box.x1 > col.x0 && box.x0 < col.x1;
  expect(inColumn, `${at}: the flying crow is in the tower's column above the floor`).toBe(false);
  expect(box.x0 > 0 && box.x1 < s.cssW && box.y0 > s.cssH * 0.32, `${at}: off the side or into the HUD`).toBe(true);
  if (!climbing) expect(box.y1 < s.cssH, `${at}: below the bottom`).toBe(true);
  const rider = riderBox(s);
  expect(rider !== null && meets(box, rider), `${at}: over the Horseman`).toBe(false);
  for (const f of flyerBoxes(s)) expect(meets(box, f), `${at}: over the flock, a bat or the balloon`).toBe(false);
}

describe("halloween crow flight", () => {
  it.each(SCREENS.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: in its lane, clear of everything, over several cycles",
    (W, H, z) => {
      for (let t = 0; t < CYCLE * 6; t += 1 / 30) check(sceneAt(W, H, 0, t, z), false);
    },
  );

  it.each(SCREENS.flatMap(([W, H]) => ZOOMS.map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: as the camera climbs it rides down with the churchyard",
    (W, H, z) => {
      for (let lvl = 0; lvl <= 40; lvl += 2) {
        for (let t = TAKE_OFF; t < LAND; t += 1 / 10) check(sceneAt(W, H, lvl, t + lvl * 0.37, z), true);
      }
    },
  );

  it.each(SCREENS.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const)))(
    "%ix%i at zoom %s: it only passes the kids and the sweet shop, briefly, on its way up and down, never while circling",
    (W, H, z) => {
      const dt = 1 / 20;
      let overKids = 0;
      let overHouse = 0;
      let circling = 0;
      for (let t = TAKE_OFF; t < LAND; t += dt) {
        const s = sceneAt(W, H, 0, t, z);
        const box = crowBox(s);
        if (!box) continue;
        const p = crowPose(s);
        const lw = inkW(s, 3 / p.z);
        // Only the crow's own box is looked at (the whole virtual screen would be slow).
        const x0 = Math.floor(box.x0) - 2;
        const y0 = Math.floor(box.y0) - 2;
        const w = Math.ceil(box.x1) + 2 - x0;
        const h = Math.ceil(box.y1) + 2 - y0;
        const near = (draw: (ctx: CanvasRenderingContext2D) => void) =>
          mask(w, h, (ctx) => {
            ctx.translate(-x0, -y0);
            draw(ctx);
          });
        const crow = near((ctx) => crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, lw));
        const people = near((ctx) => kids(ctx, s));
        const houses = near((ctx) => shops(ctx, s));
        let drawn = 0;
        let onKids = 0;
        let onHouse = 0;
        for (let i = 0; i < crow.length; i++) {
          if (!crow[i]) continue;
          drawn++;
          if (people[i]) onKids++;
          if (houses[i]) onHouse++;
        }
        // A wingtip grazing a porch corner doesn't count; being over it does.
        if (onKids > drawn * 0.04) overKids += dt;
        if (onHouse > drawn * 0.04) overHouse += dt;
        // It climbs beside the shop, never across its front: at most a wing over its eaves.
        expect(onHouse / drawn, `t=${t.toFixed(2)}: over the shop`).toBeLessThan(0.3);
        // Round the moon it is clear of them both.
        if (t > CIRCLING[0] + 0.3 && t < CIRCLING[1] - 0.3) {
          circling++;
          expect(onHouse / drawn, `t=${t.toFixed(2)}: circling over the shop`).toBeLessThan(0.04);
          expect(onKids / drawn, `t=${t.toFixed(2)}: circling over the kids`).toBeLessThan(0.04);
        }
      }
      expect(circling, "frames circling the moon").toBeGreaterThan(60);
      // Up past the kids and back down past them, and along the shop's side: a moment each way.
      expect(overKids, "time over the kids").toBeLessThan(0.9);
      expect(overHouse, "time over the shop").toBeLessThan(0.5);
    },
  );

  it("its box holds all of its drawing, which keeps out of the tower's column", () => {
    const [W, H] = SCREENS[0];
    for (let t = TAKE_OFF; t < LAND; t += 0.25) {
      const s = sceneAt(W, H, 0, t);
      const p = crowPose(s);
      const box = crowBox(s)!;
      const m = mask(W, H, (ctx) => crowFlying(ctx, p.x, p.y, p.size, p.dir, p.lift, p.pitch, p.legs, p.caw, inkW(s, 3 / p.z)));
      const col = column(s);
      let outside = 0;
      let inColumn = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x < box.x0 - 1 || x > box.x1 + 1 || y < box.y0 - 1 || y > box.y1 + 1) outside++;
          if (y < col.floor && x >= col.x0 && x <= col.x1) inColumn++;
        }
      }
      expect(drawn, `t=${t}: drawn`).toBeGreaterThan(40);
      expect(outside, `t=${t}: pixels outside its box`).toBe(0);
      expect(inColumn, `t=${t}: pixels in the tower's column`).toBe(0);
    }
  });

  it("flies smoothly: no jumps from the stone, in the air, or back onto it", () => {
    const [W, H] = SCREENS[0];
    let last: { x: number; y: number; size: number } | null = null;
    let flying = 0;
    const dt = 1 / 60;
    for (let t = 0; t < CYCLE * 6; t += dt) {
      const p = crowPose(sceneAt(W, H, 0, t));
      // The body's middle: perched, it sits this far above the feet.
      const now = { x: p.x, y: p.perched ? p.y - p.size * 0.42 : p.y, size: p.perched ? p.size * 0.7 : p.size };
      if (!p.perched) flying += dt;
      if (last) {
        expect(Math.hypot(now.x - last.x, now.y - last.y), `t=${t.toFixed(2)}: jump`).toBeLessThan(W * 0.03);
        expect(Math.abs(now.size - last.size), `t=${t.toFixed(2)}: size jump`).toBeLessThan(2);
      }
      last = now;
    }
    // It is up for a good stretch of every cycle, and back on its stone for the rest.
    expect(flying / 6).toBeGreaterThan((LAND - TAKE_OFF) * 0.98);
    expect(flying / 6).toBeLessThan((LAND - TAKE_OFF) * 1.02);
  });

  it("takes off soon after a run starts, then at varying moments", () => {
    expect(cycleTime(TAKE_OFF)).toBe(TAKE_OFF);
    const starts = new Set<number>();
    // At the start of cycle k the plan is that far before its own zero.
    for (let k = 1; k < 40; k++) starts.add(-cycleTime(k * CYCLE));
    expect(starts.size, "flights start early and late in their cycles").toBe(2);
  });

  it("is a pure function of the scene", () => {
    const s = sceneAt(390, 844, 3, 9.37);
    const a = { ...crowPose(s) };
    crowPose(sceneAt(375, 667, 20, 2.2));
    expect({ ...crowPose(s) }).toEqual(a);
  });
});
