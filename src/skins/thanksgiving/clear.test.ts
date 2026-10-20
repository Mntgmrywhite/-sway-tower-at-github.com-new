import { describe, expect, it } from "vitest";
import type { Scene } from "../skin";
import { cloudBank, heightClouds } from "./backdrop";
import { hollow } from "./hollow";
import { driftingLeaves, flockAt, flockBox, geese, GEESE_FLIGHT, GEESE_PERIOD, moonSpot, sunSpot, type Body } from "./sky";
import { LOOP_LEVELS, LOOP_START } from "./story";
import { context, sceneAt, SCREENS } from "./test-scene";

// The owner's rule: nothing passes over the sun or the moon, at any height, on any screen. The
// skin's own sky layers are checked here through the first pass and two whole loops of the day:
// the leaves blowing about near us swing round the bodies, never inside a body's light where it
// shows (above the cloud bank the bodies rise from and set into, which hides both the body and
// any leaf behind it), the V of geese glides down to pass under their light, without a jump,
// and the clouds you climb past melt away near them (the base world's drift straight over
// them, which is why the skin paints its own backdrop). The clouds and the geese are checked
// against the light where it shows: not behind the far hills, the cloud bank or the field.

const LEVELS = Array.from({ length: Math.ceil((LOOP_START + 2 * LOOP_LEVELS) / 1.5) + 1 }, (_, i) => i * 1.5);
const TIMES = [0, 2.6, 5.2, 7.8, 10.4, 15.1, 21.7] as const;
/** Below this far above the horizon, the cloud bank covers the side lanes. */
const CLOUD_TOP = 0.2;
/** How far round a body's light (u) a drawing counts as coming close to it. */
const NEAR = 0.1;

// Every check draws only the square around a body, on a canvas just that size (reused from one
// check to the next: see test-scene.ts). Drawing and reading back the whole screen for each of
// thousands of frames grew a test worker by gigabytes and ran the machine out of memory.

/** A body's square: its light and NEAR round it, in whole screen px (it may run off the screen). */
function square(s: Scene, b: Body): { x0: number; y0: number; n: number } {
  const half = Math.ceil(b.reach + s.u * NEAR) + 1;
  return { x0: Math.floor(b.x) - half, y0: Math.floor(b.y) - half, n: 2 * half + 1 };
}

/** The alpha of every pixel of a drawing in a body's square, row by row. */
function alphasIn(sq: { x0: number; y0: number; n: number }, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const ctx = context(sq.n, sq.n);
  ctx.translate(-sq.x0, -sq.y0);
  draw(ctx);
  const data = ctx.getImageData(0, 0, sq.n, sq.n).data;
  const out = new Uint8Array(sq.n * sq.n);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]!;
  return out;
}

/** How many on-screen pixels of a drawing fall inside a body's light, above screen y `below`. */
function inside(s: Scene, b: Body, draw: (ctx: CanvasRenderingContext2D) => void, below = Infinity): { px: number; covered: number } {
  const sq = square(s, b);
  const a = alphasIn(sq, draw);
  let px = 0;
  let covered = 0;
  for (let j = 0; j < sq.n; j++) {
    const y = sq.y0 + j;
    if (y < 0 || y >= s.cssH || y > below) continue;
    for (let i = 0; i < sq.n; i++) {
      const x = sq.x0 + i;
      if (x < 0 || x >= s.cssW || Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) > b.reach) continue;
      px++;
      if (a[j * sq.n + i]! > 0) covered++;
    }
  }
  return { px, covered };
}

/** What a drawing does to the sun's and the moon's light where it shows. */
interface Over {
  name: string;
  at: string;
  /** Pixels of the light that show (in front of it no hills, cloud bank or field). */
  shows: number;
  /** Of those, the ones the drawing covers. */
  covered: number;
  /** Whether the drawing comes within NEAR of the light at all. */
  close: boolean;
}

/** The bodies showing this frame (opacity at least 0.15, as the leaves allow): copies, named. */
function showing(s: Scene): (readonly [string, Body])[] {
  const out: (readonly [string, Body])[] = [];
  for (const [name, b] of [
    ["sun", copy(sunSpot(s))],
    ["moon", copy(moonSpot(s))],
  ] as const) {
    if (b.on && b.alpha >= 0.15) out.push([name, b]);
  }
  return out;
}

/**
 * How much of a body's light a drawing covers where the light shows (not behind what stands in
 * front of it: the far hills, the cloud bank, from the horizon down the field); null if the
 * drawing does not come into the body's square at all.
 */
function over(s: Scene, name: string, b: Body, draw: (ctx: CanvasRenderingContext2D) => void): Over | null {
  const sq = square(s, b);
  const drawn = alphasIn(sq, draw);
  if (!drawn.some((a) => a > 0)) return null;
  const front = alphasIn(sq, (ctx) => {
    hollow(ctx, s);
    cloudBank(ctx, s);
  });
  const o: Over = { name, at: `${Math.round(b.x)},${Math.round(b.y)}`, shows: 0, covered: 0, close: false };
  for (let j = 0; j < sq.n; j++) {
    const y = sq.y0 + j;
    if (y < 0 || y >= s.cssH) continue;
    for (let i = 0; i < sq.n; i++) {
      const x = sq.x0 + i;
      if (x < 0 || x >= s.cssW) continue;
      const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y);
      const k = j * sq.n + i;
      if (d <= b.reach + s.u * NEAR && drawn[k]! > 0) o.close = true;
      if (d > b.reach || front[k] === 255 || y >= s.horizonY) continue;
      o.shows++;
      if (drawn[k]! > 0) o.covered++;
    }
  }
  return o;
}

/** A copy of a body (the spots are reused objects). */
const copy = (b: Body): Body => ({ ...b });

describe("thanksgiving: nothing passes over the sun or the moon", () => {
  it.each(SCREENS)(
    "%ix%i (u %i): the leaves never come within a body's light",
    (W, H, u) => {
      let seen = 0;
      for (const lvl of LEVELS) {
        for (const t of TIMES) {
          const s = sceneAt(W, H, lvl, t, u);
          for (const b of [copy(sunSpot(s)), copy(moonSpot(s))]) {
            // (A body only just fading in at the low end of its lane, all but clear, may have one go by.)
            if (!b.on || b.alpha < 0.15) continue;
            const { px, covered } = inside(s, b, (ctx) => driftingLeaves(ctx, s), s.horizonY - s.u * CLOUD_TOP);
            if (px) seen++;
            expect(covered, `level ${lvl}, t=${t}: leaf pixels in the light of the body at ${Math.round(b.x)},${Math.round(b.y)}`).toBe(0);
          }
        }
      }
      expect(seen, "bodies checked").toBeGreaterThan(200);
    },
    60_000,
  );

  it.each(SCREENS)(
    "%ix%i (u %i): the clouds you climb past never come over a body's light where it shows",
    (W, H, u) => {
      let seen = 0;
      let near = 0;
      for (let lvl = 0; lvl <= LOOP_START + 2 * LOOP_LEVELS; lvl += 1.5) {
        for (const t of [0, 9.3, 23, 41.6, 77.2]) {
          const s = sceneAt(W, H, lvl, t, u);
          for (const [name, b] of showing(s)) {
            seen++;
            const o = over(s, name, b, (ctx) => heightClouds(ctx, s));
            if (!o) continue;
            if (o.close) near++;
            expect(o.covered, `level ${lvl}, t=${t}: cloud pixels on the light of the ${o.name} at ${o.at}`).toBe(0);
          }
        }
      }
      expect(seen, "bodies showing").toBeGreaterThan(300);
      // A cloud comes by close often (so the check is not vacuous).
      expect(near, "times a cloud came by a body").toBeGreaterThan(30);
    },
    180_000,
  );

  it.each(SCREENS)(
    "%ix%i (u %i): the V of geese passes under a body's light where it shows",
    (W, H, u) => {
      let seen = 0;
      let near = 0;
      for (let lvl = 0; lvl <= LOOP_START + 2 * LOOP_LEVELS; lvl += 3) {
        // Four flights (both ways across, at their different heights), every half second.
        for (let f = 0; f < 4; f++) {
          for (let k = 0; k <= GEESE_FLIGHT; k += 0.5) {
            const t = f * GEESE_PERIOD + k;
            const s = sceneAt(W, H, lvl, t, u);
            const flock = flockAt(s);
            if (!flock.on) continue;
            const v = { ...flockBox(flock.lx, flock.ly, flock.dir, flock.g) };
            for (const [name, b] of showing(s)) {
              seen++;
              // (Drawn only where the V's box comes into the body's square: drawing every frame
              // whole would cost far more memory than the check is worth.)
              const sq = square(s, b);
              if (v.x1 < sq.x0 - 2 || v.x0 > sq.x0 + sq.n + 2 || v.y1 < sq.y0 - 2 || v.y0 > sq.y0 + sq.n + 2) continue;
              const o = over(s, name, b, (ctx) => geese(ctx, s));
              if (!o) continue;
              if (o.close) near++;
              expect(o.covered, `level ${lvl}, t=${t}: geese on the light of the ${o.name} at ${o.at}`).toBe(0);
            }
          }
        }
      }
      expect(seen, "bodies showing").toBeGreaterThan(400);
      expect(near, "times the V came by a body").toBeGreaterThan(20);
    },
    180_000,
  );

  it.each(SCREENS)(
    "%ix%i (u %i): going under a body, the V glides: it never jumps, flying or climbing",
    (W, H, u) => {
      const s0 = sceneAt(W, H, 0, 0, u);
      // The V's line moves at most this far in a 30th of a second (bobbing, gliding down under a
      // body and back up), or in a 30th of a level as the camera climbs.
      const most = s0.u * 0.02;
      let moved = 0;
      let dipped = 0;
      for (let lvl = 0; lvl <= LOOP_START + LOOP_LEVELS; lvl += 2) {
        for (let f = 0; f < 4; f++) {
          let was: number | null = null;
          for (let k = 0; k <= GEESE_FLIGHT; k += 1 / 30) {
            const s = sceneAt(W, H, lvl, f * GEESE_PERIOD + k, u);
            const v = flockAt(s);
            const y = v.on ? v.ly : null;
            if (y !== null && was !== null) {
              const d = Math.abs(y - was);
              moved = Math.max(moved, d);
              expect(d, `level ${lvl}, flight ${f}, ${k.toFixed(2)} s in`).toBeLessThan(most);
            }
            if (y !== null && y > s.horizonY - s.u * 0.4) dipped++;
            was = y;
          }
        }
      }
      // ...and climbing through a flight, a 30th of a level at a time.
      for (let f = 0; f < 4; f++) {
        for (const k of [3, 6.5, 10]) {
          let was: number | null = null;
          for (let lvl = 0; lvl <= LOOP_START + LOOP_LEVELS; lvl += 1 / 30) {
            const v = flockAt(sceneAt(W, H, lvl, f * GEESE_PERIOD + k, u));
            const y = v.on ? v.ly : null;
            if (y !== null && was !== null) expect(Math.abs(y - was), `flight ${f}, ${k} s in, level ${lvl.toFixed(2)}`).toBeLessThan(most);
            was = y;
          }
        }
      }
      expect(moved, "the V moves at all").toBeGreaterThan(0.5);
      expect(dipped, "frames the V glides low to pass under a body").toBeGreaterThan(30);
    },
    60_000,
  );
});
