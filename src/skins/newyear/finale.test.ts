import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { altitude01 } from "../../base/world";
import type { Scene } from "../skin";
import { newYear } from "../newyear";
import { CYCLE, MIDNIGHT } from "./countdown";
import { FINALE_LEN, finaleBursting, finaleSpots } from "./sky";
import { toneOf } from "./story";
import { sceneAt } from "./test-scene";

// The owner: "The countdown needs to start at 10, with lots more fireworks, then reset after a
// minute." Every midnight the Times Tower counts down to (10 s into a tower's scene, then once a
// minute), the sky erupts: a volley on the stroke of twelve, then a grand finale of big bursts in
// quick succession, going where the sky's own bursts go.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
/** Masks are drawn at half size to keep this quick. */
const K = 0.5;

/** The sky layer alone (fireworks and drifters) at level `lvl`, `t` seconds into the scene. */
function skyMask(W: number, H: number, lvl: number, t: number): { data: Uint8ClampedArray; w: number; h: number; s: Scene } {
  const w = Math.round(W * K);
  const h = Math.round(H * K);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.scale(K, K);
  const s = sceneAt(W, H, lvl, t);
  newYear.sky!(ctx as unknown as CanvasRenderingContext2D, s);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, s };
}

/** The finale's bursts in bloom on a W x H screen with the camera at tower level `lvl`. */
function spots(W: number, H: number, lvl: number, t: number): ReturnType<typeof finaleSpots> {
  const s = sceneAt(W, H, lvl, t);
  return finaleSpots(s, altitude01(s) + toneOf(s).finale);
}

function litPixels(W: number, H: number, lvl: number, t: number): number {
  const { data } = skyMask(W, H, lvl, t);
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! > 40) n++;
  return n;
}

describe("New Year's midnight finale", () => {
  it("bursts on the stroke of midnight, every minute, and keeps bursting for several seconds", () => {
    for (const minute of [0, 1, 2, 9]) {
      const t0 = minute * CYCLE + MIDNIGHT;
      expect(finaleBursting({ t: t0 - 0.05 } as Scene), `minute ${minute}`).toBe(0);
      // The volley: half a dozen shells at once, as midnight strikes
      expect(finaleBursting({ t: t0 + 0.15 } as Scene)).toBeGreaterThanOrEqual(6);
      for (let m = 0.5; m < FINALE_LEN; m += 0.25) expect(finaleBursting({ t: t0 + m } as Scene), `${m}s after midnight`).toBeGreaterThanOrEqual(7);
      // ...and it's over well before the next count.
      expect(finaleBursting({ t: t0 + FINALE_LEN + 3 } as Scene)).toBe(0);
    }
  });

  it.each(SIZES)("%ix%i: fills the sky with far more fireworks than the count before it, low and high", (W, H) => {
    for (const lvl of [0, 20, 45]) {
      let count = 0;
      let finale = 0;
      for (const minute of [0, 1]) {
        for (let t = 0.25; t < MIDNIGHT; t += 0.5) count += litPixels(W, H, lvl, minute * CYCLE + t);
        for (let t = 0.25; t < MIDNIGHT; t += 0.5) finale += litPixels(W, H, lvl, minute * CYCLE + MIDNIGHT + t * (FINALE_LEN / MIDNIGHT));
      }
      expect(finale / count, `level ${lvl}`).toBeGreaterThan(1.9);
    }
  });

  it.each(SIZES)("%ix%i: once the camera follows the tower, slips no further behind the bars than the sky's own bursts", (W, H) => {
    /** How close (u from the screen's center) anything lit in the sky comes, under the HUD. */
    const innermost = (lvl: number, t: number): number => {
      const { data, w, h, s } = skyMask(W, H, lvl, t);
      let inner = Infinity;
      for (let y = Math.ceil(H * 0.32 * K); y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3]! < 40) continue;
          inner = Math.min(inner, Math.abs(x / K - W / 2) / s.u);
        }
      }
      return inner;
    };
    let everyday = Infinity;
    let finale = Infinity;
    for (const lvl of [20, 45, 90, 250]) {
      for (let t = 0.25; t < CYCLE; t += 0.5) {
        const i = innermost(lvl, t);
        if (t > MIDNIGHT && t < MIDNIGHT + FINALE_LEN + 2) finale = Math.min(finale, i);
        else everyday = Math.min(everyday, i);
      }
    }
    expect(finale).toBeLessThan(Infinity);
    expect(finale).toBeGreaterThanOrEqual(everyday - 0.01);
  });

  it.each(SIZES)("%ix%i: keeps the sky full: many bursts in bloom all through it, on a short tower and high", (W, H) => {
    for (const lvl of [0, 6, 20, 45, 90]) {
      let sum = 0;
      let n = 0;
      let fewest = Infinity;
      for (const minute of [0, 1, 4]) {
        for (let m = 0.5; m < FINALE_LEN; m += 0.1) {
          const k = spots(W, H, lvl, minute * CYCLE + MIDNIGHT + m).length;
          sum += k;
          n++;
          fewest = Math.min(fewest, k);
        }
      }
      expect(sum / n, `level ${lvl}`).toBeGreaterThanOrEqual(7.5);
      expect(fewest, `level ${lvl}`).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(SIZES)("%ix%i: a burst stays where it is all through its flight while the camera climbs", (W, H) => {
    // The first midnight comes 10 s into a run, when the camera starts to follow the tower; later
    // ones as the city sinks away under it. At moments all through the finale, the camera swept up
    // from the ground to high in the sky a twentieth of a bar at a time: no burst ever leaps.
    const leap = 0.1 * Math.min(W, H * 0.6);
    for (const minute of [0, 1, 3]) {
      for (let m = 0.3; m < FINALE_LEN + 1; m += 0.8) {
        let prev = new Map<number, { x: number; y: number; on: number }>();
        let seen = 0;
        for (let lvl = 0; lvl <= 140; lvl += 0.05) {
          const now = new Map(spots(W, H, lvl, minute * CYCLE + MIDNIGHT + m).map((b) => [b.k, b] as const));
          for (const [i, b] of now) {
            const p = prev.get(i);
            if (!p || p.on < 0.2 || b.on < 0.2) continue;
            seen++;
            expect(Math.hypot(b.x - p.x, b.y - p.y), `${m.toFixed(1)}s after midnight ${minute}, level ${lvl.toFixed(2)}: burst ${i}`).toBeLessThan(leap);
          }
          prev = now;
        }
        expect(seen).toBeGreaterThan(5000);
      }
    }
  });
});
