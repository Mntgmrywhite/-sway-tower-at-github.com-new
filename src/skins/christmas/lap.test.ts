import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import { CART, CART_LAP, carriageBackProgress, carriageProgress, pigeonLift, placeCarriage, props, rig, street, townsfolk } from "./ground";
import { PIGEONS } from "./street";
import { context, MIN_ZOOM, sceneAt, SIZES } from "./test-scene";

// The carriage lopes round and round the tower (the owner: "the horse and carriage needs to
// lope around back as well"): past it in front, left to right, round the corner out of view,
// back the other way further up the street (behind the townsfolk, low behind the tower's base),
// round again, and so on. The first lap is done within seconds of the scene's start (the
// owner's rule: actions come early, before the player climbs away).

const DT = 1 / 120;
const CONFIGS = SIZES.flatMap(([W, H]) => [1, MIN_ZOOM].map((z) => [W, H, z] as const));

type Phase = "front" | "back" | "away";
function phase(t: number): Phase {
  if (carriageProgress(t) >= 0) return "front";
  if (carriageBackProgress(t) >= 0) return "back";
  return "away";
}

/** The first time in [from, to] at which `f` holds, or Infinity. */
function first(f: (t: number) => boolean, from: number, to = 60): number {
  for (let t = from; t <= to; t += DT) if (f(t)) return t;
  return Infinity;
}

/** Pixels the carriage covers (alpha above a faint edge), and their bounding box. */
function rigPixels(W: number, H: number, z: number, t: number, back: boolean) {
  const s = sceneAt(W, H, 0, t, z);
  const w = Math.round(s.cssW);
  const h = Math.round(s.cssH);
  const ctx = context(w, h);
  rig(ctx, s, back);
  const data = ctx.getImageData(0, 0, w, h).data;
  let n = 0;
  let sx = 0;
  let top = h;
  let bottom = -1;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! <= 40) continue;
    const p = (i - 3) / 4;
    const y = Math.floor(p / w);
    n++;
    sx += p % w;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { n, x: sx / Math.max(1, n), top, bottom };
}

describe("christmas carriage lap", () => {
  it("laps the tower: in front left to right, round a corner, back right to left, round again", () => {
    const order: Phase[] = [];
    for (let t = 0; t < 3 * CART_LAP; t += DT) {
      const p = phase(t);
      if (order[order.length - 1] !== p) order.push(p);
    }
    expect(order.slice(0, 9)).toEqual(["front", "away", "back", "away", "front", "away", "back", "away", "front"]);
    // Every lap the same.
    for (let t = 0; t < CART_LAP; t += 0.37) {
      expect(carriageProgress(t + 3 * CART_LAP)).toBeCloseTo(carriageProgress(t), 6);
      expect(carriageBackProgress(t + 3 * CART_LAP)).toBeCloseTo(carriageBackProgress(t), 6);
    }
  });

  it("the first lap is done by 12 s: past the tower early, behind it on the way back, then round again", () => {
    // At the start it is just driving in from the left, the horse in view.
    expect(carriageProgress(0)).toBeGreaterThan(0);
    expect(carriageProgress(0)).toBeLessThan(0.15);
    const pastTower = first((t) => carriageProgress(t) >= 0.5, 0);
    expect(pastTower).toBeLessThanOrEqual(3);
    const frontGone = first((t) => carriageProgress(t) < 0, pastTower);
    const backIn = first((t) => carriageBackProgress(t) >= 0, frontGone);
    // Round the corner briefly, out of view.
    expect(backIn - frontGone).toBeGreaterThan(0.5);
    expect(backIn - frontGone).toBeLessThan(2);
    const behindTower = first((t) => carriageBackProgress(t) >= 0.5, backIn);
    expect(behindTower).toBeLessThanOrEqual(10);
    const backGone = first((t) => carriageBackProgress(t) < 0, behindTower);
    expect(backGone).toBeLessThanOrEqual(12);
    const round = first((t) => carriageProgress(t) >= 0, backGone);
    expect(round - backGone).toBeLessThan(2);
  });

  it.each(CONFIGS)("%ix%i at zoom %s: on the way back it is further up the street, smaller and going the other way", (W, H, z) => {
    // Moments in the middle of each pass.
    const front = first((t) => carriageProgress(t) >= 0.5, 0);
    const back = first((t) => carriageBackProgress(t) >= 0.5, 0);
    const a = rigPixels(W, H, z, front, false);
    const b = rigPixels(W, H, z, back, true);
    // Each pass draws only on its own pass.
    expect(rigPixels(W, H, z, front, true).n).toBe(0);
    expect(rigPixels(W, H, z, back, false).n).toBe(0);
    // Smaller with distance (the lanes are at depths 1.55 and 1.95), standing higher on the street.
    const ratio = (b.bottom - b.top) / (a.bottom - a.top);
    expect(ratio).toBeGreaterThan(0.72);
    expect(ratio).toBeLessThan(0.86);
    expect(b.bottom).toBeLessThan(a.bottom - 0.05 * Math.min(W, H * 0.6));
    // In front it goes left to right; at the back right to left.
    expect(rigPixels(W, H, z, front + 0.25, false).x).toBeGreaterThan(a.x);
    expect(rigPixels(W, H, z, back + 0.25, true).x).toBeLessThan(b.x);
  });

  it.each(CONFIGS)("%ix%i at zoom %s: it faces the way it goes, the horse leading and the coach's wheels trailing", (W, H, z) => {
    // Low down (the wheels and the hooves) the big spoked wheels outweigh the slim legs: more of
    // that ink lies behind the rig's middle than ahead of it, whichever way it's going.
    let checked = 0;
    for (let t = 0; t < CART_LAP; t += 0.25) {
      const s = sceneAt(W, H, 0, t, z);
      if (!placeCarriage(s)) continue;
      const { x: mid, y: ground, U, back } = CART;
      const w = Math.round(s.cssW);
      const h = Math.round(s.cssH);
      // Only while the whole rig is on screen.
      if (mid - 0.15 * U < 0 || mid + 0.15 * U > w) continue;
      const ctx = context(w, h);
      rig(ctx, s, back);
      const data = ctx.getImageData(0, 0, w, h).data;
      const dir = back ? -1 : 1;
      let ahead = 0;
      let behind = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i]! <= 40) continue;
        const p = (i - 3) / 4;
        if (Math.floor(p / w) < ground - 0.05 * U) continue;
        if (((p % w) - mid) * dir > 0) ahead++;
        else behind++;
      }
      expect(behind, `t=${t.toFixed(2)} ${back ? "going left" : "going right"}: the wheels should trail`).toBeGreaterThan(ahead * 1.3);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it.each(CONFIGS)("%ix%i at zoom %s: a lope, at the same pace both ways", (W, H, z) => {
    const speeds = { front: [] as number[], back: [] as number[] };
    for (let t = 0; t < CART_LAP; t += 0.2) {
      const s = sceneAt(W, H, 0, t, z);
      if (!placeCarriage(s)) continue;
      const { x, U, back, dist } = CART;
      if (!placeCarriage(sceneAt(W, H, 0, t + 0.05, z)) || CART.back !== back) continue;
      // Units of ground covered per second, at its own depth.
      speeds[back ? "back" : "front"].push(Math.abs(CART.x - x) / U / 0.05);
      // The wheels roll and the legs step forward the same way: the distance it has gone (which
      // turns them) grows as fast as it covers the ground, both ways.
      expect((CART.dist - dist) / (Math.abs(CART.x - x) / U), `t=${t.toFixed(2)}: wheels and legs keep pace`).toBeCloseTo(1, 6);
    }
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const front = mean(speeds.front);
    const back = mean(speeds.back);
    // Brisker than a walk, gentler than a gallop: about two thirds of the rig's length a second
    // on a phone (a little more on Hard's wider zoomed-out street).
    for (const v of [front, back]) {
      expect(v).toBeGreaterThan(0.12);
      expect(v).toBeLessThan(0.28);
    }
    expect(back / front).toBeGreaterThan(0.85);
    expect(back / front).toBeLessThan(1.18);
  });

  it.each(CONFIGS)(
    "%ix%i at zoom %s: in the tower's column it stays under the floor line in front, and under the base block's top behind",
    (W, H, z) => {
      const s0 = sceneAt(W, H, 0, 0, z);
      const w = Math.round(s0.cssW);
      const h = Math.round(s0.cssH);
      const x0 = Math.ceil(s0.baseX - s0.u * 0.05);
      const x1 = Math.floor(s0.baseX + s0.baseW + s0.u * 0.05);
      const floor = Math.floor(s0.groundY);
      const baseTop = Math.floor(s0.groundY - BLOCK_HEIGHT * s0.scale);
      const ctx = context(w, h);
      let behind = 0;
      for (let t = 0; t < CART_LAP; t += 0.05) {
        const s = sceneAt(W, H, 0, t, z);
        for (const back of [false, true]) {
          ctx.clearRect(0, 0, w, h);
          rig(ctx, s, back);
          const limit = back ? baseTop : floor;
          const data = ctx.getImageData(x0, 0, x1 - x0 + 1, floor).data;
          let above = 0;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i]! <= 40) continue;
            const y = Math.floor((i - 3) / 4 / (x1 - x0 + 1));
            if (y < limit) above++;
            else if (back) behind++;
          }
          expect(above, `t=${t.toFixed(2)} ${back ? "behind" : "in front"}: carriage pixels too high in the tower's column`).toBe(0);
        }
      }
      // It does pass low behind the tower's base on the way back.
      expect(behind).toBeGreaterThan(0);
    },
  );

  it.each(SIZES)("%ix%i: on the way back it passes behind the townsfolk, in front of the lamps and the pigeons", (W, H) => {
    let hidden = 0;
    let over = 0;
    // Through the whole pass back, so it crosses the carolers, the pigeons, the lamplighter and the lamps.
    for (let k = 0.04; k < 1; k += 0.06) {
      const t = first((u) => carriageBackProgress(u) >= k, 0);
      const s = sceneAt(W, H, 0, t);
      const draw = (f: (ctx: CanvasRenderingContext2D) => void) => {
        const ctx = context(W, H);
        f(ctx);
        return ctx.getImageData(0, 0, W, H).data;
      };
      const all = draw((ctx) => props(ctx, s));
      const folk = draw((ctx) => townsfolk(ctx, s));
      const carriage = draw((ctx) => rig(ctx, s, true));
      const behindIt = draw((ctx) => street(ctx, s));
      const same = (a: Uint8ClampedArray, i: number) => Math.max(...[0, 1, 2, 3].map((c) => Math.abs(all[i + c]! - a[i + c]!))) <= 2;
      for (let i = 0; i < all.length; i += 4) {
        if (carriage[i + 3] !== 255) continue;
        if (folk[i + 3] === 255) {
          // The townsfolk stand in front of it.
          expect(same(folk, i), `t=${t.toFixed(2)}: a townsfolk pixel at ${(i / 4) % W},${Math.floor(i / 4 / W)}`).toBe(true);
          hidden++;
        } else if (folk[i + 3] === 0 && behindIt[i + 3]! > 0) {
          // The houses, the lamps and the pigeons are behind it.
          expect(same(carriage, i), `t=${t.toFixed(2)}: a carriage pixel at ${(i / 4) % W},${Math.floor(i / 4 / W)}`).toBe(true);
          over++;
        }
      }
    }
    expect(hidden).toBeGreaterThan(500);
    expect(over).toBeGreaterThan(500);
  });

  it("the pigeons flutter up as it passes on the way back too", () => {
    const [W, H] = SIZES[0];
    let most = 0;
    for (let t = 0; t < CART_LAP; t += 0.05) {
      if (carriageBackProgress(t) < 0) continue;
      const s = sceneAt(W, H, 0, t);
      for (let i = 0; i < PIGEONS.length; i++) most = Math.max(most, pigeonLift(s, i));
    }
    expect(most).toBe(1);
  });
});
